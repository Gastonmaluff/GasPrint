import type { PrintJob, PrinterProfile, ReceiptLine } from '../../shared/types/printing.js';

export interface LayoutResult {
  job: PrintJob;
  profile: PrinterProfile;
}

export function applyThermalLayout(job: PrintJob, profiles: PrinterProfile[]): LayoutResult {
  const profile = getProfileForJob(job, profiles);
  const contentWidth = Math.max(16, profile.charactersPerLine - profile.marginLeftChars - profile.marginRightChars);
  const laidOutLines = job.lines.flatMap((line) => layoutLine(line, contentWidth, profile));

  return {
    profile,
    job: {
      ...job,
      paperWidth: profile.paperWidth ?? profile.paperWidthMm,
      paperWidthMm: profile.paperWidthMm ?? profile.paperWidth,
      printableWidthMm: profile.printableWidthMm,
      leftOffsetMm: profile.leftOffsetMm,
      rightMarginMm: profile.rightMarginMm,
      feedAfterPrintMm: profile.feedAfterPrintMm,
      charactersPerLine: profile.charactersPerLine,
      marginLeftChars: profile.marginLeftChars,
      marginRightChars: profile.marginRightChars,
      feedLines: job.feedLines ?? profile.feedLines,
      lines: laidOutLines
    }
  };
}

export function getProfileForJob(job: PrintJob, profiles: PrinterProfile[]): PrinterProfile {
  const existing = profiles.find((profile) => profile.printerName === job.printerName);
  if (existing) {
    return existing;
  }

  const paperWidth = job.paperWidth;
  return {
    printerName: job.printerName,
    paperWidth,
    paperWidthMm: paperWidth,
    printableWidthMm: paperWidth === 58 ? 49 : 72,
    leftOffsetMm: 0,
    rightMarginMm: paperWidth === 58 ? 3 : 4,
    feedAfterPrintMm: 18,
    charactersPerLine: paperWidth === 58 ? Math.min(job.charactersPerLine, 30) : Math.min(job.charactersPerLine, 42),
    marginLeftChars: paperWidth === 58 ? 1 : 1,
    marginRightChars: paperWidth === 58 ? 1 : 1,
    feedLines: job.feedLines,
    updatedAt: ''
  };
}

function layoutLine(line: ReceiptLine, contentWidth: number, profile: PrinterProfile): ReceiptLine[] {
  if (line.separator) {
    // A separator is a block; engines draw one physical rule. Never expand to a string of '='.
    return [{ ...line, text: '', separator: true }];
  }

  const wrapped = wrapWords(line.text, contentWidth);
  if (wrapped.length === 0) {
    return [{ ...line, text: '' }];
  }

  return wrapped.map((text) => ({ ...line, text: withMargins(text, profile) }));
}

function wrapWords(text: string, width: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [''];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const chunks = splitLongWord(word, width);
    for (const chunk of chunks) {
      const candidate = current ? `${current} ${chunk}` : chunk;
      if (candidate.length <= width) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
        }
        current = chunk;
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function splitLongWord(word: string, width: number): string[] {
  if (word.length <= width) {
    return [word];
  }

  const chunks: string[] = [];
  for (let index = 0; index < word.length; index += width) {
    chunks.push(word.slice(index, index + width));
  }
  return chunks;
}

function withMargins(text: string, profile: PrinterProfile): string {
  return `${' '.repeat(profile.marginLeftChars)}${text}${' '.repeat(profile.marginRightChars)}`;
}