import { app } from 'electron';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { DEFAULT_API_SETTINGS, DEFAULT_LAB, DEFAULT_PRINTER_PROFILE, DEFAULT_SETTINGS } from '../../shared/constants/app.js';
import type { ApiSettings, AppData, AppSettings, LabState, PrintHistoryEntry, PrinterProfile } from '../../shared/types/printing.js';
import { sanitizeApiSettings, sanitizeLabState, sanitizePrinterProfile, sanitizeSettings } from '../../shared/validation/printing.js';

const MAX_HISTORY_ITEMS = 500;

export class DataStore {
  private readonly filePath: string;
  private data: AppData | null = null;

  constructor() {
    this.filePath = join(app.getPath('userData'), 'gasprint-data.json');
  }

  get dataPath(): string {
    return this.filePath;
  }

  async getData(): Promise<AppData> {
    if (this.data) {
      return this.data;
    }

    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AppData>;
      this.data = normalizeData(parsed);
    } catch {
      this.data = normalizeData({});
      await this.persist();
    }

    return this.data;
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<AppData> {
    const data = await this.getData();
    data.settings = sanitizeSettings({ ...data.settings, ...partial });
    await this.persist();
    return data;
  }

  async updateApi(partial: Partial<ApiSettings>): Promise<AppData> {
    const data = await this.getData();
    data.api = sanitizeApiSettings({ ...data.api, ...partial });
    if (!data.api.token) {
      data.api.token = createToken();
    }
    await this.persist();
    return data;
  }

  async regenerateApiToken(): Promise<AppData> {
    const data = await this.getData();
    data.api.token = createToken();
    await this.persist();
    return data;
  }

  async touchApiClient(origin: string, jobReceived: boolean): Promise<AppData> {
    const data = await this.getData();
    const now = new Date().toISOString();
    data.api.lastClientOrigin = origin;
    data.api.lastRequestAt = now;
    if (jobReceived) {
      data.api.lastApiJobAt = now;
    }
    await this.persist();
    return data;
  }

  async updatePrinterProfile(profile: PrinterProfile): Promise<AppData> {
    const data = await this.getData();
    const sanitized = sanitizePrinterProfile(profile);
    if (!sanitized.printerName) {
      throw new Error('Perfil de impresora sin nombre valido.');
    }
    const existing = data.printerProfiles.filter((item) => item.printerName !== sanitized.printerName);
    data.printerProfiles = [sanitized, ...existing].slice(0, 100);
    await this.persist();
    return data;
  }

  async updateLab(lab: LabState): Promise<AppData> {
    const data = await this.getData();
    data.lab = sanitizeLabState(lab);
    await this.persist();
    return data;
  }

  async addHistory(entry: PrintHistoryEntry): Promise<AppData> {
    const data = await this.getData();
    data.history = [entry, ...data.history].slice(0, MAX_HISTORY_ITEMS);
    await this.persist();
    return data;
  }

  async updateHistory(entry: PrintHistoryEntry): Promise<AppData> {
    const data = await this.getData();
    data.history = data.history.map((item) => (item.id === entry.id ? entry : item));
    await this.persist();
    return data;
  }

  async clearHistory(): Promise<AppData> {
    const data = await this.getData();
    data.history = [];
    await this.persist();
    return data;
  }

  async reset(): Promise<AppData> {
    this.data = normalizeData({});
    await this.persist();
    return this.data;
  }

  private async persist(): Promise<void> {
    if (!this.data) {
      return;
    }

    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
  }
}

function normalizeData(data: Partial<AppData>): AppData {
  const api = sanitizeApiSettings({ ...DEFAULT_API_SETTINGS, allowedOrigins: [...DEFAULT_API_SETTINGS.allowedOrigins], ...data.api });
  if (!api.token) {
    api.token = createToken();
  }

  return {
    settings: sanitizeSettings({ ...DEFAULT_SETTINGS, ...data.settings }),
    history: Array.isArray(data.history) ? data.history.filter(isHistoryEntry).slice(0, MAX_HISTORY_ITEMS) : [],
    lab: sanitizeLabState({ ...DEFAULT_LAB, ...data.lab }),
    printerProfiles: normalizeProfiles(data.printerProfiles),
    api
  };
}

function normalizeProfiles(value: unknown): PrinterProfile[] {
  const profiles = Array.isArray(value) ? value : [];
  const sanitized = profiles.map((profile) => sanitizePrinterProfile(profile as Partial<PrinterProfile>)).filter((profile) => profile.printerName);
  if (!sanitized.some((profile) => profile.printerName === 'FTX TDR058U')) {
    sanitized.unshift({
      ...DEFAULT_PRINTER_PROFILE,
      printerName: 'FTX TDR058U',
      charactersPerLine: 30,
      marginLeftChars: 1,
      marginRightChars: 1,
      feedLines: 4
    });
  }
  return sanitized.slice(0, 100);
}

function createToken(): string {
  return randomBytes(32).toString('base64url');
}

function isHistoryEntry(value: unknown): value is PrintHistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Partial<PrintHistoryEntry>;
  return typeof entry.id === 'string' && typeof entry.createdAt === 'string' && typeof entry.printerName === 'string';
}