import { DEFAULT_API_SETTINGS, DEFAULT_LAB, DEFAULT_PRINTER_PROFILE, DEFAULT_SETTINGS } from '../constants/app.js';
import type {
  ApiSettings,
  AppSettings,
  LabState,
  PaperWidth,
  PrintJob,
  PrinterProfile,
  ReceiptLine,
  TextAlign,
  TextSize
} from '../types/printing.js';

const ALIGN_VALUES: TextAlign[] = ['left', 'center', 'right'];
const SIZE_VALUES: TextSize[] = ['normal', 'large', 'double'];

export function isPaperWidth(value: unknown): value is PaperWidth {
  return value === 58 || value === 80;
}

export function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

/**
 * Clamp a decimal value to [min, max] and snap it to the nearest `step`.
 * Used for the physical thermal-calibration fields (millimetres).
 */
export function clampDecimal(value: unknown, min: number, max: number, fallback: number, step = 0.5): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  const clamped = Math.min(max, Math.max(min, numberValue));
  return Math.round(clamped / step) * step;
}

export function sanitizeText(value: unknown, maxLength = 4000): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replaceAll('\0', '').slice(0, maxLength);
}

export function sanitizePrinterName(value: unknown): string {
  return sanitizeText(value, 300).trim();
}

export function sanitizeReceiptLine(line: Partial<ReceiptLine>): ReceiptLine {
  const align = ALIGN_VALUES.includes(line.align as TextAlign) ? (line.align as TextAlign) : 'left';
  const size = SIZE_VALUES.includes(line.size as TextSize) ? (line.size as TextSize) : 'normal';

  return {
    text: sanitizeText(line.text, 1000),
    align,
    bold: Boolean(line.bold),
    size,
    separator: Boolean(line.separator)
  };
}

export function sanitizeSettings(settings: Partial<AppSettings>): AppSettings {
  const paperWidth = isPaperWidth(settings.paperWidth) ? settings.paperWidth : DEFAULT_SETTINGS.paperWidth;
  const fallbackCharacters = paperWidth === 58 ? 32 : 42;

  return {
    selectedPrinterName: sanitizePrinterName(settings.selectedPrinterName),
    paperWidth,
    charactersPerLine: clampInteger(settings.charactersPerLine, 24, 64, fallbackCharacters),
    feedLines: clampInteger(settings.feedLines, 0, 10, DEFAULT_SETTINGS.feedLines),
    theme: settings.theme === 'light' ? 'light' : 'dark',
    startWithWindows: Boolean(settings.startWithWindows),
    minimizeToTray: settings.minimizeToTray !== false
  };
}

export function sanitizeApiSettings(settings: Partial<ApiSettings>): ApiSettings {
  const allowedOrigins = Array.isArray(settings.allowedOrigins)
    ? settings.allowedOrigins.map((origin) => sanitizeOrigin(origin)).filter(Boolean).slice(0, 20)
    : [...DEFAULT_API_SETTINGS.allowedOrigins];

  return {
    enabled: settings.enabled !== false,
    port: clampInteger(settings.port, 1024, 65535, DEFAULT_API_SETTINGS.port),
    token: typeof settings.token === 'string' ? settings.token : '',
    allowedOrigins,
    lastClientOrigin: sanitizeText(settings.lastClientOrigin, 300),
    lastRequestAt: sanitizeText(settings.lastRequestAt, 60),
    lastApiJobAt: sanitizeText(settings.lastApiJobAt, 60)
  };
}

export function sanitizePrinterProfile(profile: Partial<PrinterProfile>): PrinterProfile {
  const paperWidthCandidate = profile.paperWidth ?? profile.paperWidthMm;
  const paperWidth = isPaperWidth(paperWidthCandidate) ? paperWidthCandidate : DEFAULT_PRINTER_PROFILE.paperWidth;
  const printableWidthMm = clampDecimal(profile.printableWidthMm, 35, paperWidth, paperWidth === 58 ? 49 : 72, 0.5);
  const leftOffsetMm = clampDecimal(profile.leftOffsetMm, -5, 5, DEFAULT_PRINTER_PROFILE.leftOffsetMm, 0.5);
  const rightMarginMm = clampDecimal(profile.rightMarginMm, 0, 10, DEFAULT_PRINTER_PROFILE.rightMarginMm, 0.5);
  return {
    printerName: sanitizePrinterName(profile.printerName),
    paperWidth,
    paperWidthMm: paperWidth,
    printableWidthMm,
    leftOffsetMm,
    rightMarginMm,
    feedAfterPrintMm: clampDecimal(profile.feedAfterPrintMm, 0, 40, DEFAULT_PRINTER_PROFILE.feedAfterPrintMm, 0.5),
    charactersPerLine: clampInteger(profile.charactersPerLine, 20, 64, paperWidth === 58 ? 30 : 42),
    marginLeftChars: clampInteger(profile.marginLeftChars, 0, 8, DEFAULT_PRINTER_PROFILE.marginLeftChars),
    marginRightChars: clampInteger(profile.marginRightChars, 0, 8, DEFAULT_PRINTER_PROFILE.marginRightChars),
    feedLines: clampInteger(profile.feedLines, 0, 12, DEFAULT_PRINTER_PROFILE.feedLines),
    updatedAt: typeof profile.updatedAt === 'string' && profile.updatedAt ? profile.updatedAt : new Date().toISOString()
  };
}

export function sanitizeOrigin(value: unknown): string {
  const origin = sanitizeText(value, 300).trim();
  if (!origin) {
    return '';
  }

  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    return url.origin;
  } catch {
    return '';
  }
}

export function sanitizeLabState(lab: Partial<LabState>): LabState {
  const paperWidth = isPaperWidth(lab.paperWidth) ? lab.paperWidth : DEFAULT_LAB.paperWidth;
  return {
    title: sanitizeText(lab.title, 120),
    body: sanitizeText(lab.body, 4000),
    align: ALIGN_VALUES.includes(lab.align as TextAlign) ? (lab.align as TextAlign) : DEFAULT_LAB.align,
    bold: Boolean(lab.bold),
    size: SIZE_VALUES.includes(lab.size as TextSize) ? (lab.size as TextSize) : DEFAULT_LAB.size,
    includeSeparator: Boolean(lab.includeSeparator),
    paperWidth,
    charactersPerLine: clampInteger(lab.charactersPerLine, 24, 64, paperWidth === 58 ? 32 : 42),
    feedLines: clampInteger(lab.feedLines, 0, 10, DEFAULT_LAB.feedLines)
  };
}

export function validatePrintJob(job: Partial<PrintJob>): PrintJob {
  const printerName = sanitizePrinterName(job.printerName);
  if (!printerName) {
    throw new Error('No se selecciono una impresora valida.');
  }

  const paperWidth = isPaperWidth(job.paperWidth) ? job.paperWidth : DEFAULT_SETTINGS.paperWidth;
  const lines = Array.isArray(job.lines) ? job.lines.map((line) => sanitizeReceiptLine(line)) : [];
  if (lines.length === 0) {
    throw new Error('El trabajo no contiene lineas para imprimir.');
  }

  const id = typeof job.id === 'string' && job.id.trim() ? job.id : cryptoLikeId();
  const createdAt = typeof job.createdAt === 'string' && job.createdAt ? job.createdAt : new Date().toISOString();
  const type = job.type ?? 'lab';
  const origin = job.origin ?? 'app';

  return {
    id,
    printerName,
    type,
    origin,
    paperWidth,
    paperWidthMm: paperWidth,
    printableWidthMm: clampDecimal(job.printableWidthMm, 35, paperWidth, paperWidth === 58 ? 49 : 72, 0.5),
    leftOffsetMm: clampDecimal(job.leftOffsetMm, -5, 5, 0, 0.5),
    rightMarginMm: clampDecimal(job.rightMarginMm, 0, 10, 0, 0.5),
    feedAfterPrintMm: clampDecimal(job.feedAfterPrintMm, 0, 40, 0, 0.5),
    charactersPerLine: clampInteger(job.charactersPerLine, 24, 64, paperWidth === 58 ? 32 : 42),
    feedLines: clampInteger(job.feedLines, 0, 10, DEFAULT_SETTINGS.feedLines),
    marginLeftChars: clampInteger(job.marginLeftChars, 0, 8, 0),
    marginRightChars: clampInteger(job.marginRightChars, 0, 8, 0),
    title: sanitizeText(job.title, 120),
    lines,
    createdAt,
    summary: summarizeLines(lines)
  };
}

export function summarizeLines(lines: ReceiptLine[]): string {
  const text = lines
    .filter((line) => !line.separator)
    .map((line) => line.text.trim())
    .filter(Boolean)
    .join(' ');
  return text.slice(0, 140) || 'Trabajo de impresion';
}

function cryptoLikeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}