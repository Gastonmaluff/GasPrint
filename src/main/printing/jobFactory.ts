import type { LabState, PrintJob, ReceiptLine } from '../../shared/types/printing.js';
import { summarizeLines, validatePrintJob } from '../../shared/validation/printing.js';

export function createTestJob(printerName: string, charactersPerLine = 32, feedLines = 4): PrintJob {
  const now = new Date();
  const lines: ReceiptLine[] = [
    { text: 'GASPRINT', align: 'center', bold: true, size: 'large' },
    { text: '', align: 'left', bold: false, size: 'normal', separator: true },
    { text: `Impresora: ${printerName}`, align: 'left', bold: false, size: 'normal' },
    { text: `Fecha: ${now.toLocaleDateString()}`, align: 'left', bold: false, size: 'normal' },
    { text: `Hora: ${now.toLocaleTimeString()}`, align: 'left', bold: false, size: 'normal' },
    { text: '', align: 'left', bold: false, size: 'normal' },
    { text: 'Texto normal de prueba', align: 'left', bold: false, size: 'normal' },
    { text: 'Texto en negrita', align: 'left', bold: true, size: 'normal' },
    { text: '', align: 'left', bold: false, size: 'normal', separator: true },
    { text: 'Trabajo enviado a Windows.', align: 'center', bold: false, size: 'normal' },
    { text: 'Confirmacion fisica no disponible.', align: 'center', bold: false, size: 'normal' }
  ];

  return validatePrintJob({
    id: makeJobId(),
    printerName,
    type: 'test',
    origin: 'app',
    paperWidth: 58,
    charactersPerLine,
    feedLines,
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

export function makeJobId(): string {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}