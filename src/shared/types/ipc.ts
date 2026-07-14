import type {
  AppData,
  AppSettings,
  DiagnosticsInfo,
  LabState,
  PrintHistoryEntry,
  PrintJob,
  PrintResult,
  PrinterInfo
} from './printing.js';

export const IPC_CHANNELS = {
  printersList: 'printers:list',
  printersRefresh: 'printers:refresh',
  printTest: 'print:test',
  printLab: 'print:lab',
  printRepeat: 'print:repeat',
  dataGet: 'data:get',
  settingsUpdate: 'settings:update',
  settingsReset: 'settings:reset',
  apiUpdate: 'api:update',
  apiRegenerateToken: 'api:regenerate-token',
  apiStart: 'api:start',
  apiStop: 'api:stop',
  profileUpdate: 'profile:update',
  labUpdate: 'lab:update',
  historyClear: 'history:clear',
  diagnosticsGet: 'diagnostics:get',
  appOpenDataFolder: 'app:open-data-folder'
} as const;

export interface GasPrintApi {
  listPrinters(): Promise<PrinterInfo[]>;
  refreshPrinters(): Promise<PrinterInfo[]>;
  printTest(printerName: string): Promise<PrintResult>;
  printLab(job: Omit<PrintJob, 'id' | 'createdAt' | 'summary' | 'origin' | 'type'>): Promise<PrintResult>;
  repeatJob(jobId: string): Promise<PrintResult>;
  getData(): Promise<AppData>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppData>;
  resetSettings(): Promise<AppData>;
  updateApi(settings: Partial<AppData['api']>): Promise<AppData>;
  regenerateApiToken(): Promise<AppData>;
  startApi(): Promise<AppData>;
  stopApi(): Promise<AppData>;
  updatePrinterProfile(profile: AppData['printerProfiles'][number]): Promise<AppData>;
  updateLab(lab: LabState): Promise<AppData>;
  clearHistory(): Promise<AppData>;
  getDiagnostics(): Promise<DiagnosticsInfo>;
  openDataFolder(): Promise<boolean>;
}

export type IpcResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type HistoryFilter = PrintHistoryEntry['status'] | 'all';