import { APP_NAME } from '../../shared/constants/app.js';
import type { PrintJob, ReceiptLine } from '../../shared/types/printing.js';

export function buildReceiptHtml(job: PrintJob): string {
  const widthMm = job.paperWidthMm ?? job.paperWidth;
  const printableWidthMm = job.printableWidthMm ?? (widthMm === 58 ? 49 : 72);
  const leftOffsetMm = job.leftOffsetMm ?? 0;
  const rightMarginMm = job.rightMarginMm ?? 0;
  const feedAfterPrintMm = job.feedAfterPrintMm ?? Math.max(0, (job.feedLines ?? 0) * 4);
  const body = job.lines.map((line) => renderLine(line, job.charactersPerLine)).join('');
  const feed = `<div class="feed" aria-hidden="true"></div>`;

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
        box-sizing: border-box;
      }
      *, *::before, *::after { box-sizing: border-box; }
      body {
        width: ${widthMm}mm;
        font-family: "Consolas", "Courier New", monospace;
        font-size: ${widthMm === 58 ? '10px' : '12px'};
        line-height: 1.28;
      }
      .receipt {
        box-sizing: border-box;
        width: ${printableWidthMm}mm;
        max-width: ${Math.max(20, widthMm - rightMarginMm)}mm;
        margin-left: ${leftOffsetMm}mm;
        margin-right: ${rightMarginMm}mm;
        padding: 0;
      }
      .line {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .sep {
        width: 100%;
        height: 0;
        border-top: 1px solid black;
        margin: 1mm 0;
      }
      .left { text-align: left; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: 700; }
      .large { font-size: 1.25em; line-height: 1.25; }
      .double { font-size: 1.65em; line-height: 1.2; }
      .feed { height: ${feedAfterPrintMm}mm; min-height: ${feedAfterPrintMm}mm; }
    </style>
  </head>
  <body>
    <main class="receipt">${body}${feed}</main>
  </body>
</html>`;
}

function renderLine(line: ReceiptLine, _charactersPerLine: number): string {
  // A separator renders as a single physical rule (one line), never a wrapping string of characters.
  if (line.separator) {
    return '<div class="sep" aria-hidden="true"></div>';
  }
  const classNames = ['line', line.align, line.bold ? 'bold' : '', line.size !== 'normal' ? line.size : '']
    .filter(Boolean)
    .join(' ');
  return `<div class="${classNames}">${escapeHtml(line.text || ' ')}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}