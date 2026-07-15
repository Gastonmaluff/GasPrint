import { spawn } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PrintJob } from '../../shared/types/printing.js';
import { mmToHundredths, xOffsetHundredths } from './thermalMetrics.js';

const POWERSHELL_PRINT_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$PayloadPath = [Environment]::GetEnvironmentVariable('GASPRINT_PAYLOAD_PATH', 'Process')
if ([string]::IsNullOrWhiteSpace($PayloadPath)) {
  throw 'GASPRINT_PAYLOAD_PATH no fue informado.'
}
$json = Get-Content -LiteralPath $PayloadPath -Raw | ConvertFrom-Json

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = [string]$json.printerName
if (-not $doc.PrinterSettings.IsValid) {
  throw "Impresora no valida para Windows: $($json.printerName)"
}

$paperWidth = [int]$json.paperWidth
$paperWidthMm = [double]$json.paperWidthMm
if ($paperWidthMm -le 0) { $paperWidthMm = [double]$paperWidth }
$printableWidthMm = [double]$json.printableWidthMm
if ($printableWidthMm -le 0) {
  if ($paperWidth -eq 80) { $printableWidthMm = 72 } else { $printableWidthMm = 49 }
}
$leftOffsetMm = [double]$json.leftOffsetMm
$rightMarginMm = [double]$json.rightMarginMm
$feedAfterPrintMm = [double]$json.feedAfterPrintMm
if ($feedAfterPrintMm -lt 0) { $feedAfterPrintMm = 0 }
$mmToHundredths = 100.0 / 25.4
$paperWidthHundredths = [int][Math]::Round($paperWidthMm * $mmToHundredths)
$usableWidth = [Math]::Max(40, [int][Math]::Round(($printableWidthMm - $rightMarginMm) * $mmToHundredths))
$sepHeight = [Math]::Max(6, [int][Math]::Round(2 * $mmToHundredths))
$lineSpacing = 2
$topMargin = [int][Math]::Round(1 * $mmToHundredths)

$script:lines = @($json.lines)

# Font/format builders shared by the measurement pass and the print pass.
function New-LineFont($line) {
  $baseSize = 8.5
  if ($paperWidth -eq 80) { $baseSize = 9.5 }
  if ([string]$line.size -eq 'large') { $baseSize = $baseSize * 1.25 }
  if ([string]$line.size -eq 'double') { $baseSize = $baseSize * 1.65 }
  $style = [System.Drawing.FontStyle]::Regular
  if ($line.bold -eq $true) { $style = [System.Drawing.FontStyle]::Bold }
  return New-Object System.Drawing.Font('Courier New', $baseSize, $style)
}
function New-LineFormat($line) {
  $format = New-Object System.Drawing.StringFormat
  $format.Trimming = [System.Drawing.StringTrimming]::None
  if ([string]$line.align -eq 'center') {
    $format.Alignment = [System.Drawing.StringAlignment]::Center
  } elseif ([string]$line.align -eq 'right') {
    $format.Alignment = [System.Drawing.StringAlignment]::Far
  } else {
    $format.Alignment = [System.Drawing.StringAlignment]::Near
  }
  return $format
}
function Measure-LineHeight($graphics, $line) {
  if ($line.separator -eq $true) { return $sepHeight }
  $text = [string]$line.text
  if ([string]::IsNullOrEmpty($text)) { $text = ' ' }
  $font = New-LineFont $line
  $format = New-LineFormat $line
  $size = $graphics.MeasureString($text, $font, [int]$usableWidth, $format)
  $font.Dispose()
  $format.Dispose()
  return [int][Math]::Ceiling($size.Height)
}

# --- Measurement pass: total content height so the physical page length follows the feed ---
$measureBmp = New-Object System.Drawing.Bitmap 1, 1
$measureGraphics = [System.Drawing.Graphics]::FromImage($measureBmp)
$measureGraphics.PageUnit = [System.Drawing.GraphicsUnit]::Display
$contentHeight = 0
foreach ($line in $script:lines) {
  $contentHeight += (Measure-LineHeight $measureGraphics $line) + $lineSpacing
}
$measureGraphics.Dispose()
$measureBmp.Dispose()

$feedHundredths = [int]$json.feedHundredths
if ($feedHundredths -lt 0) { $feedHundredths = [int][Math]::Round($feedAfterPrintMm * $mmToHundredths) }
$pageHeightHundredths = [Math]::Max(120, $topMargin + $contentHeight + $feedHundredths)

$doc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('GasPrintReceipt', $paperWidthHundredths, [int]$pageHeightHundredths)
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$doc.OriginAtMargins = $false
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController

$script:index = 0
$script:xOffset = [int]$json.xOffsetHundredths
$script:yStart = $topMargin

$doc.add_PrintPage({
  param($sender, $event)
  $event.Graphics.PageUnit = [System.Drawing.GraphicsUnit]::Display
  $x = $script:xOffset
  $y = $script:yStart
  $bottom = $event.PageBounds.Height

  while ($script:index -lt $script:lines.Count) {
    $line = $script:lines[$script:index]

    if ($line.separator -eq $true) {
      $penY = $y + [int]($sepHeight / 2)
      $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 1)
      $event.Graphics.DrawLine($pen, [float]$x, [float]$penY, [float]($x + $usableWidth), [float]$penY)
      $pen.Dispose()
      $y += $sepHeight + $lineSpacing
      $script:index += 1
      continue
    }

    $text = [string]$line.text
    if ([string]::IsNullOrEmpty($text)) { $text = ' ' }
    $font = New-LineFont $line
    $format = New-LineFormat $line
    $measured = $event.Graphics.MeasureString($text, $font, [int]$usableWidth, $format)
    $blockHeight = [int][Math]::Ceiling($measured.Height)
    $rect = New-Object System.Drawing.RectangleF([float]$x, [float]$y, [float]$usableWidth, [float]$blockHeight)
    $event.Graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, $rect, $format)
    $font.Dispose()
    $format.Dispose()

    $y += $blockHeight + $lineSpacing
    $script:index += 1

    if ($y -gt $bottom) {
      $event.HasMorePages = $true
      return
    }
  }

  $event.HasMorePages = $false
})

$doc.Print()
$doc.Dispose()
`;

export async function printWithWindowsSpooler(job: PrintJob): Promise<void> {
  const payloadPath = join(tmpdir(), `gasprint-${job.id}.json`);
  await writeFile(
    payloadPath,
    JSON.stringify({
      printerName: job.printerName,
      paperWidth: job.paperWidth,
      paperWidthMm: job.paperWidthMm ?? job.paperWidth,
      printableWidthMm: job.printableWidthMm,
      leftOffsetMm: job.leftOffsetMm,
      rightMarginMm: job.rightMarginMm,
      feedAfterPrintMm: job.feedAfterPrintMm,
      // Precomputed geometry (single source of truth, unit-tested in thermalMetrics).
      xOffsetHundredths: xOffsetHundredths(job.leftOffsetMm ?? 0),
      feedHundredths: mmToHundredths(Math.max(0, job.feedAfterPrintMm ?? 0)),
      charactersPerLine: job.charactersPerLine,
      feedLines: job.feedLines,
      lines: job.lines
    }),
    'utf8'
  );

  try {
    await runPowerShell(payloadPath);
  } finally {
    await rm(payloadPath, { force: true });
  }
}

async function runPowerShell(payloadPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', POWERSHELL_PRINT_SCRIPT], {
      windowsHide: true,
      env: {
        ...process.env,
        GASPRINT_PAYLOAD_PATH: payloadPath
      }
    });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Timeout del fallback de impresion despues de 20 segundos.'));
    }, 20000);

    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk.toString('utf8')));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk.toString('utf8')));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      const message = [...stderr, ...stdout].join('').trim() || `powershell.exe finalizo con codigo ${code}`;
      reject(new Error(message));
    });
  });
}