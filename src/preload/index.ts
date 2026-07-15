import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type GasPrintApi } from '../shared/types/ipc.js';
import type { AppSettings, LabState, PrintJob } from '../shared/types/printing.js';

const api: GasPrintApi = {
  listPrinters: () => ipcRenderer.invoke(IPC_CHANNELS.printersList),
  refreshPrinters: () => ipcRenderer.invoke(IPC_CHANNELS.printersRefresh),
  printTest: (printerName: string) => ipcRenderer.invoke(IPC_CHANNELS.printTest, printerName),
  printCalibration: (printerName: string) => ipcRenderer.invoke(IPC_CHANNELS.printCalibration, printerName),
  printLab: (job: Omit<PrintJob, 'id' | 'createdAt' | 'summary' | 'origin' | 'type'>) =>
    ipcRenderer.invoke(IPC_CHANNELS.printLab, job),
  repeatJob: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.printRepeat, jobId),
  getData: () => ipcRenderer.invoke(IPC_CHANNELS.dataGet),
  updateSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, settings),
  resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.settingsReset),
  updateApi: (settings) => ipcRenderer.invoke(IPC_CHANNELS.apiUpdate, settings),
  regenerateApiToken: () => ipcRenderer.invoke(IPC_CHANNELS.apiRegenerateToken),
  startApi: () => ipcRenderer.invoke(IPC_CHANNELS.apiStart),
  stopApi: () => ipcRenderer.invoke(IPC_CHANNELS.apiStop),
  updatePrinterProfile: (profile) => ipcRenderer.invoke(IPC_CHANNELS.profileUpdate, profile),
  updateLab: (lab: LabState) => ipcRenderer.invoke(IPC_CHANNELS.labUpdate, lab),
  clearHistory: () => ipcRenderer.invoke(IPC_CHANNELS.historyClear),
  getDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.diagnosticsGet),
  openDataFolder: () => ipcRenderer.invoke(IPC_CHANNELS.appOpenDataFolder)
};

contextBridge.exposeInMainWorld('gasPrint', api);