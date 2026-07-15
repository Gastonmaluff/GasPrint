export type PaperWidth = 58 | 80;
export type TextAlign = 'left' | 'center' | 'right';
export type TextSize = 'normal' | 'large' | 'double';
export type PrinterKind = 'physical' | 'virtual' | 'unknown';
export type PrinterAvailability = 'available' | 'unknown' | 'offline' | 'error';
export type PrintJobType = 'test' | 'lab' | 'repeat' | 'external';
export type PrintJobOrigin = 'app' | 'api' | 'system';
export type PrintJobStatus = 'pending' | 'sent' | 'completed' | 'error';

export interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  status: string;
  rawStatus?: number;
  kind: PrinterKind;
  availability: PrinterAvailability;
  source: 'windows';
  lastCheckedAt: string;
  reasons: string[];
}

export interface ReceiptLine {
  text: string;
  align: TextAlign;
  bold: boolean;
  size: TextSize;
  separator?: boolean;
}

export interface PrintJob {
  id: string;
  printerName: string;
  type: PrintJobType;
  origin: PrintJobOrigin;
  paperWidth: PaperWidth;
  charactersPerLine: number;
  feedLines: number;
  marginLeftChars?: number;
  marginRightChars?: number;
  /** Physical thermal-calibration fields (millimetres). Optional for backward compatibility. */
  paperWidthMm?: number;
  printableWidthMm?: number;
  leftOffsetMm?: number;
  rightMarginMm?: number;
  feedAfterPrintMm?: number;
  title?: string;
  lines: ReceiptLine[];
  createdAt: string;
  summary: string;
}

export interface PrintResult {
  jobId: string;
  status: 'sent' | 'error';
  message: string;
  durationMs: number;
  spoolerAcknowledged: boolean;
  physicallyConfirmed: false;
  engine: 'electron' | 'windows-spooler' | 'none';
  electronAttempted: boolean;
  fallbackUsed: boolean;
  technicalMessage?: string;
}

export interface PrintHistoryEntry {
  id: string;
  createdAt: string;
  completedAt?: string;
  printerName: string;
  type: PrintJobType;
  origin: PrintJobOrigin;
  status: PrintJobStatus;
  durationMs?: number;
  technicalMessage: string;
  summary: string;
  engine?: PrintResult['engine'];
  electronAttempted?: boolean;
  fallbackUsed?: boolean;
  spoolerAcknowledged?: boolean;
  requestId?: string;
  clientOrigin?: string;
  job?: PrintJob;
  /** Physical calibration values requested by the job (millimetres). */
  requestedProfile?: RequestedProfile;
  /** Printer profile actually applied when printing. */
  effectiveProfile?: PrinterProfile;
}

export interface RequestedProfile {
  paperWidthMm?: number;
  printableWidthMm?: number;
  leftOffsetMm?: number;
  rightMarginMm?: number;
  feedAfterPrintMm?: number;
  charactersPerLine?: number;
}

export interface LabState {
  title: string;
  body: string;
  align: TextAlign;
  bold: boolean;
  size: TextSize;
  includeSeparator: boolean;
  paperWidth: PaperWidth;
  charactersPerLine: number;
  feedLines: number;
}

export interface AppSettings {
  selectedPrinterName: string;
  paperWidth: PaperWidth;
  charactersPerLine: number;
  feedLines: number;
  theme: 'light' | 'dark';
  startWithWindows: boolean;
  minimizeToTray: boolean;
}

export interface PrinterProfile {
  printerName: string;
  paperWidth: PaperWidth;
  /** Physical width of the paper in millimetres (mirrors paperWidth). */
  paperWidthMm: number;
  /** Usable/printable horizontal width in millimetres. */
  printableWidthMm: number;
  /** Horizontal offset in millimetres. Negative = left, positive = right. */
  leftOffsetMm: number;
  /** Right margin in millimetres. */
  rightMarginMm: number;
  /** Physical paper advance after printing, in millimetres. */
  feedAfterPrintMm: number;
  charactersPerLine: number;
  marginLeftChars: number;
  marginRightChars: number;
  feedLines: number;
  /** ISO timestamp of the last profile update. */
  updatedAt: string;
}

export interface ApiSettings {
  enabled: boolean;
  port: number;
  token: string;
  allowedOrigins: string[];
  lastClientOrigin: string;
  lastRequestAt: string;
  lastApiJobAt: string;
}

export interface AppData {
  settings: AppSettings;
  history: PrintHistoryEntry[];
  lab: LabState;
  printerProfiles: PrinterProfile[];
  api: ApiSettings;
}

export interface DiagnosticsInfo {
  appName: string;
  version: string;
  platform: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  dataPath: string;
  localApiPrepared: boolean;
  localApiActive: boolean;
  localApiPort: number;
}