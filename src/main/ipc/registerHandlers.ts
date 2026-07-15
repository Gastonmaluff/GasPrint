import { ipcMain, shell } from 'electron';
import type { DataStore } from '../storage/dataStore.js';
import type { PrintEngine } from '../printing/printEngine.js';
import { IPC_CHANNELS } from '../../shared/types/ipc.js';
import type { ApiSettings, AppSettings, PrintJob } from '../../shared/types/printing.js';
import { parseLabState, parsePrinterName, parsePrinterProfile, parsePrintJob } from '../../shared/validation/ipc.js';
import { sanitizePrinterProfile } from '../../shared/validation/printing.js';
import { createCalibrationJob, createTestJob } from '../printing/jobFactory.js';
import { configureStartup, getDiagnostics } from '../diagnostics/diagnostics.js';
import { printAndRecord } from '../printing/printCoordinator.js';
import type { LocalApiServer } from '../api/localApiServer.js';

export function registerIpcHandlers(store: DataStore, engine: PrintEngine, apiServer: LocalApiServer): void {
  ipcMain.handle(IPC_CHANNELS.printersList, async () => engine.listPrinters());
  ipcMain.handle(IPC_CHANNELS.printersRefresh, async () => engine.listPrinters());

  ipcMain.handle(IPC_CHANNELS.dataGet, async () => store.getData());

  ipcMain.handle(IPC_CHANNELS.settingsUpdate, async (_event, value: unknown) => {
    if (!value || typeof value !== 'object') {
      throw new Error('Configuracion invalida.');
    }
    const next = await store.updateSettings(value as Partial<AppSettings>);
    configureStartup(next.settings.startWithWindows);
    return next;
  });

  ipcMain.handle(IPC_CHANNELS.apiUpdate, async (_event, value: unknown) => {
    if (!value || typeof value !== 'object') {
      throw new Error('Configuracion de API invalida.');
    }
    const next = await store.updateApi(value as Partial<ApiSettings>);
    await apiServer.restart();
    return next;
  });

  ipcMain.handle(IPC_CHANNELS.apiRegenerateToken, async () => store.regenerateApiToken());

  ipcMain.handle(IPC_CHANNELS.apiStart, async () => {
    const next = await store.updateApi({ enabled: true });
    await apiServer.start();
    return next;
  });

  ipcMain.handle(IPC_CHANNELS.apiStop, async () => {
    const next = await store.updateApi({ enabled: false });
    await apiServer.stop();
    return next;
  });

  ipcMain.handle(IPC_CHANNELS.profileUpdate, async (_event, value: unknown) => {
    return store.updatePrinterProfile(parsePrinterProfile(value));
  });

  ipcMain.handle(IPC_CHANNELS.settingsReset, async () => store.reset());

  ipcMain.handle(IPC_CHANNELS.labUpdate, async (_event, value: unknown) => {
    const lab = parseLabState(value);
    return store.updateLab(lab);
  });

  ipcMain.handle(IPC_CHANNELS.historyClear, async () => store.clearHistory());

  ipcMain.handle(IPC_CHANNELS.diagnosticsGet, async () => getDiagnostics(store.dataPath, apiServer.getStatus()));

  ipcMain.handle(IPC_CHANNELS.appOpenDataFolder, async () => {
    const result = await shell.showItemInFolder(store.dataPath);
    return result === undefined;
  });

  ipcMain.handle(IPC_CHANNELS.printTest, async (_event, value: unknown) => {
    const data = await store.getData();
    const printerName = parsePrinterName(value);
    const job = createTestJob(printerName, data.settings.charactersPerLine, data.settings.feedLines);
    return printAndRecord(store, engine, job);
  });

  ipcMain.handle(IPC_CHANNELS.printCalibration, async (_event, value: unknown) => {
    const data = await store.getData();
    const printerName = parsePrinterName(value);
    const profile =
      data.printerProfiles.find((item) => item.printerName === printerName) ??
      sanitizePrinterProfile({ printerName });
    const job = createCalibrationJob(printerName, profile);
    return printAndRecord(store, engine, job);
  });

  ipcMain.handle(IPC_CHANNELS.printLab, async (_event, value: unknown) => {
    const parsed = parsePrintJob(value);
    const job: PrintJob = { ...parsed, type: 'lab', origin: 'app' };
    return printAndRecord(store, engine, job);
  });

  ipcMain.handle(IPC_CHANNELS.printRepeat, async (_event, value: unknown) => {
    const jobId = typeof value === 'string' ? value : '';
    const data = await store.getData();
    const entry = data.history.find((item) => item.id === jobId);
    if (!entry?.job) {
      throw new Error('No se encontro un trabajo compatible para repetir.');
    }
    const repeatedJob: PrintJob = {
      ...entry.job,
      id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'repeat',
      createdAt: new Date().toISOString()
    };
    return printAndRecord(store, engine, repeatedJob);
  });
}
