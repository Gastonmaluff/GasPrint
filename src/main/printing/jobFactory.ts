import type { LabState, PrinterProfile, PrintJob, ReceiptLine, TextAlign } from '../../shared/types/printing.js';
import { summarizeLines, validatePrintJob } from '../../shared/validation/printing.js';

interface LineOptions {
  bold?: boolean;
  align?: TextAlign;
}

export function createTestJob(printerName: string, charactersPerLine = 32, feedLines = 4): PrintJob {
  const now = new Date();
  const width = Math.min(29, Math.max(20, charactersPerLine - 1));
  const line = createTestTicketLineFactory(width);
  const lines: ReceiptLine[] = [
    line.separator(),
    line.center('GASPRINT', { bold: true }),
    line.center('Ticket de prueba'),
    line.separator(),
    line.blank(),
    line.left(`Imp: ${compactPrinterName(printerName, width - 5)}`),
    line.left(`Fecha: ${formatDate(now)}`),
    line.left(`Hora : ${formatTime(now)}`),
    line.blank(),
    line.columns('Producto', 'Total'),
    line.separator(),
    line.columns('Texto normal', 'OK'),
    line.columns('Texto negrita', 'OK', { bold: true }),
    line.separator(),
    line.center('Windows recibio'),
    line.center('el trabajo'),
    line.blank(),
    line.center('GasPrint operativo'),
    line.separator()
  ];

  return validatePrintJob({
    id: makeJobId(),
    printerName,
    type: 'test',
    origin: 'app',
    paperWidth: 58,
    charactersPerLine: width,
    feedLines,
    lines,
    createdAt: now.toISOString(),
    summary: summarizeLines(lines)
  });
}

export function createCalibrationJob(printerName: string, profile: PrinterProfile): PrintJob {
  const now = new Date();
  const width = Math.max(20, profile.charactersPerLine ?? 30);
  const rule = buildCalibrationRule(width);
  const cross = buildCenterCross(width);
  const values: Array<[string, string]> = [
    ['Offset horizontal', `${formatMm(profile.leftOffsetMm ?? 0)} mm`],
    ['Ancho util', `${formatMm(profile.printableWidthMm ?? 49)} mm`],
    ['Margen derecho', `${formatMm(profile.rightMarginMm ?? 0)} mm`],
    ['Avance final', `${formatMm(profile.feedAfterPrintMm ?? 18)} mm`],
    ['Caracteres/linea', `${profile.charactersPerLine ?? 30}`]
  ];
  const lines: ReceiptLine[] = [
    { text: '', align: 'left', bold: false, size: 'normal', separator: true },
    { text: 'GASPRINT', align: 'center', bold: true, size: 'normal' },
    { text: 'Ticket de Calibracion', align: 'center', bold: false, size: 'normal' },
    { text: '', align: 'left', bold: false, size: 'normal', separator: true },
    { text: '', align: 'left', bold: false, size: 'normal' },
    { text: rule, align: 'center', bold: false, size: 'normal' },
    { text: '', align: 'left', bold: false, size: 'normal' },
    { text: cross.top, align: 'left', bold: false, size: 'normal' },
    { text: cross.middle, align: 'left', bold: false, size: 'normal' },
    { text: cross.bottom, align: 'left', bold: false, size: 'normal' },
    { text: '', align: 'left', bold: false, size: 'normal' },
    { text: 'IZQUIERDA', align: 'left', bold: false, size: 'normal' },
    { text: 'CENTRO', align: 'center', bold: true, size: 'normal' },
    { text: 'DERECHA', align: 'right', bold: false, size: 'normal' },
    { text: '', align: 'left', bold: false, size: 'normal' },
    ...values.map(([label, value]): ReceiptLine => ({
      text: formatValueLine(label, value),
      align: 'left',
      bold: false,
      size: 'normal'
    })),
    { text: '', align: 'left', bold: false, size: 'normal' },
    { text: `Fecha: ${formatDate(now)}`, align: 'left', bold: false, size: 'normal' },
    { text: `Hora : ${formatTime(now)}`, align: 'left', bold: false, size: 'normal' },
    { text: '', align: 'left', bold: false, size: 'normal' },
    { text: '', align: 'left', bold: false, size: 'normal', separator: true },
    { text: 'Cortar debajo de esta linea', align: 'center', bold: false, size: 'normal' },
    { text: '', align: 'left', bold: false, size: 'normal', separator: true }
  ];

  return validatePrintJob({
    id: makeJobId(),
    printerName,
    type: 'test',
    origin: 'app',
    paperWidth: profile.paperWidth ?? profile.paperWidthMm ?? 58,
    charactersPerLine: profile.charactersPerLine ?? 30,
    feedLines: profile.feedLines ?? 5,
    paperWidthMm: profile.paperWidthMm ?? profile.paperWidth ?? 58,
    printableWidthMm: profile.printableWidthMm ?? 49,
    leftOffsetMm: profile.leftOffsetMm ?? 0,
    rightMarginMm: profile.rightMarginMm ?? 0,
    feedAfterPrintMm: profile.feedAfterPrintMm ?? 18,
    lines,
    createdAt: now.toISOString(),
    summary: summarizeLines(lines)
  });
}

export function createLabJob(printerName: string, lab: LabState): PrintJob {
  const now = new Date();
  const lines: ReceiptLine[] = [];

  if (lab.title.trim()) {
    lines.push({ text: lab.title.trim(), align: 'center', bold: true, size: lab.size });
  }

  if (lab.includeSeparator) {
    lines.push({ text: '', align: 'left', bold: false, size: 'normal', separator: true });
  }

  lab.body.split(/\r?\n/).forEach((text) => {
    lines.push({ text, align: lab.align, bold: lab.bold, size: lab.size });
  });

  return validatePrintJob({
    id: makeJobId(),
    printerName,
    type: 'lab',
    origin: 'app',
    paperWidth: lab.paperWidth,
    charactersPerLine: lab.charactersPerLine,
    feedLines: lab.feedLines,
    title: lab.title,
    lines,
    createdAt: now.toISOString(),
    summary: summarizeLines(lines)
  });
}

interface TestTicketLineFactory {
  blank(): ReceiptLine;
  separator(): ReceiptLine;
  left(text: string, options?: LineOptions): ReceiptLine;
  center(text: string, options?: LineOptions): ReceiptLine;
  right(text: string, options?: LineOptions): ReceiptLine;
  columns(left: string, right: string, options?: LineOptions): ReceiptLine;
}

function createTestTicketLineFactory(width: number): TestTicketLineFactory {
  const make = (text: string, options: LineOptions = {}): ReceiptLine => ({
    text,
    align: options.align ?? 'left',
    bold: Boolean(options.bold),
    size: 'normal'
  });
  return {
    blank: () => make(''),
    // A separator is a semantic block; each engine draws exactly one physical rule (never a string of '=').
    separator: () => ({ text: '', align: 'left', bold: false, size: 'normal', separator: true }),
    left: (text: string, options: LineOptions = {}) => make(fitText(text, width), { ...options, align: 'left' }),
    center: (text: string, options: LineOptions = {}) => make(fitText(text, width), { ...options, align: 'center' }),
    right: (text: string, options: LineOptions = {}) => make(fitText(text, width), { ...options, align: 'right' }),
    columns: (left: string, right: string, options: LineOptions = {}) => {
      const rightText = fitText(right, Math.max(2, Math.floor(width / 3)));
      const leftText = fitText(left, Math.max(1, width - rightText.length - 1));
      const fill = '.'.repeat(Math.max(1, width - leftText.length - rightText.length));
      return make(`${leftText}${fill}${rightText}`, { ...options, align: 'left' });
    }
  };
}

function fitText(text: string, width: number): string {
  const value = String(text ?? '');
  if (value.length <= width) {
    return value;
  }
  return value.slice(0, Math.max(0, width));
}

function compactPrinterName(printerName: string, width: number): string {
  return fitText(printerName, width);
}

function buildCalibrationRule(width: number): string {
  const preferred = '0---10---20---30---40---50';
  if (preferred.length <= width) {
    return preferred;
  }
  const compact = '0--10--20--30--40--50';
  if (compact.length <= width) {
    return compact;
  }
  return '0-10-20-30-40-50'.slice(0, width);
}

function buildCenterCross(width: number): { top: string; middle: string; bottom: string } {
  const center = Math.max(1, Math.floor(width / 2));
  const top = `${' '.repeat(center)}|`.slice(0, width);
  const middle = `${'-'.repeat(center)}+${'-'.repeat(Math.max(0, width - center - 1))}`.slice(0, width);
  return { top, middle, bottom: top };
}

function formatValueLine(label: string, value: string): string {
  return `${label.padEnd(17, ' ')}: ${value}`;
}

function formatMm(value: number): string {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return '0.0';
  }
  return numberValue.toFixed(1);
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function makeJobId(): string {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
