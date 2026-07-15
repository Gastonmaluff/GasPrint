import { spawn } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PrintJob } from '../../shared/types/printing.js';

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
$paperWidthHundredths = 228
if ($paperWidth -eq 80) {
  $paperWidthHundredths = 315
}

$doc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('Receipt', $paperWidthHundredths, 1400)
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController

$script:lines = @($json.lines)
$script:index = 0
$script:charactersPerLine = [int]$json.charactersPerLine
$script:feedLines = [int]$json.feedLines

$doc.add_PrintPage({
  param($sender, $event)

  $pageBounds = $event.PageBounds
  $mmToHundredths = 100 / 25.4
  $x = [Math]::Max(0, [Math]::Round(($leftOffsetMm * $mmToHundredths) - $event.PageSettings.HardMarginX))
  $y = [Math]::Max(0, [Math]::Round(1 * $mmToHundredths - $event.PageSettings.HardMarginY))
  $usableWidth = [Math]::Max(40, [Math]::Round(($printableWidthMm - $rightMarginMm) * $mmToHundredths))
  $bottom = $pageBounds.Height - 10

  while ($script:index -lt $script:lines.Count) {
    $line = $script:lines[$script:index]
    $text = [string]$line.text
    if ($line.separator -eq $true) {
      $text = ''.PadLeft($script:charactersPerLine, '=')
    }

    $baseSize = 8.5
    if ($paperWidth -eq 80) {
      $baseSize = 9.5
    }
    if ([string]$line.size -eq 'large') {
      $baseSize = $baseSize * 1.25
    }
    if ([string]$line.size -eq 'double') {
      $baseSize = $baseSize * 1.65
    }

    $style = [System.Drawing.FontStyle]::Regular
    if ($line.bold -eq $true) {
      $style = [System.Drawing.FontStyle]::Bold
    }

    $font = New-Object System.Drawing.Font('Courier New', $baseSize, $style)
    $format = New-Object System.Drawing.StringFormat
    $format.Trimming = [System.Drawing.StringTrimming]::None
    $format.FormatFlags = [System.Drawing.StringFormatFlags]::LineLimit
    if ([string]$line.align -eq 'center') {
      $format.Alignment = [System.Drawing.StringAlignment]::Center
    } elseif ([string]$line.align -eq 'right') {
      $format.Alignment = [System.Drawing.StringAlignment]::Far
    } else {
      $format.Alignment = [System.Drawing.StringAlignment]::Near
    }

    $rect = New-Object System.Drawing.RectangleF($x, $y, $usableWidth, 1000)
    $event.Graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, $rect, $format)
    $lineHeight = [Math]::Ceiling($font.GetHeight($event.Graphics) * 1.25)
    $font.Dispose()
    $format.Dispose()

    $y += $lineHeight
    $script:index += 1

    if ($y -gt $bottom) {
      $event.HasMorePages = $true
      return
    }
  }

  $feedPx = [Math]::Round($feedAfterPrintMm * $mmToHundredths)
  if ($feedPx -lt ($script:feedLines * 16)) {
    $feedPx = $script:feedLines * 16
  }
  $y += $feedPx
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