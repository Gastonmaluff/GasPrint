import { APP_NAME } from '../../shared/constants/app.js';
import type { PrintJob, ReceiptLine } from '../../shared/types/printing.js';

export function buildReceiptHtml(job: PrintJob): string {
  const widthMm = job.paperWidth;
  const body = job.lines.map((line) => renderLine(line, job.charactersPerLine)).join('');
  const feed = Array.from({ length: job.feedLines }, () => '<div class="feed">&nbsp;</div>').join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'" />
    <title>${escapeHtml(APP_NAME)}</title>
    <style>
      @page { size: ${widthMm}mm auto; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        background: white;
        color: black;
      }
      body {
        width: ${widthMm}mm;
        font-family: "Consolas", "Courier New", monospace;
        font-size: ${widthMm === 58 ? '10px' : '12px'};
        line-height: 1.28;
      }
      .receipt {
        box-sizing: border-box;
        width: ${widthMm}mm;
        padding: 2mm 2mm 0;
      }
      .line {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .left { text-align: left; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: 700; }
      .large { font-size: 1.25em; line-height: 1.25; }
      .double { font-size: 1.65em; line-height: 1.2; }
      .feed { height: 4mm; }
    </style>
  </head>
  <body>
    <main class="receipt">${body}${feed}</main>
  </body>
</html>`;
}

function renderLine(line: ReceiptLine, charactersPerLine: number): string {
  const classNames = ['line', line.align, line.bold ? 'bold' : '', line.size !== 'normal' ? line.size : '']
    .filter(Boolean)
    .join(' ');
  const text = line.separator ? '='.repeat(charactersPerLine) : line.text;
  return `<div class="${classNames}">${escapeHtml(text || ' ')}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}