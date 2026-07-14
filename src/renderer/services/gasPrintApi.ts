import type { AppSettings, LabState, PrintJob, ReceiptLine } from '../../shared/types/printing';

export const gasPrintApi = window.gasPrint;

export function buildLabLines(lab: LabState): ReceiptLine[] {
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

  return lines;
}

export function createLabPrintPayload(
  printerName: string,
  lab: LabState
): Omit<PrintJob, 'id' | 'createdAt' | 'summary' | 'origin' | 'type'> {
  return {
    printerName,
    paperWidth: lab.paperWidth,
    charactersPerLine: lab.charactersPerLine,
    feedLines: lab.feedLines,
    title: lab.title,
    lines: buildLabLines(lab)
  };
}

export function settingsWithPaperDefaults(settings: AppSettings, paperWidth: 58 | 80): AppSettings {
  return {
    ...settings,
    paperWidth,
    charactersPerLine: paperWidth === 58 ? 32 : 42
  };
}