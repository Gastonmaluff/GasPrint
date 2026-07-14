import { app } from 'electron';
import { APP_NAME, APP_VERSION } from '../../shared/constants/app.js';
import type { DiagnosticsInfo } from '../../shared/types/printing.js';

export function getDiagnostics(dataPath: string, apiStatus: { active: boolean; port: number }): DiagnosticsInfo {
  return {
    appName: APP_NAME,
    version: APP_VERSION,
    platform: process.platform,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    dataPath,
    localApiPrepared: true,
    localApiActive: apiStatus.active,
    localApiPort: apiStatus.port
  };
}

export function configureStartup(enabled: boolean): void {
  if (!app.isPackaged) {
    return;
  }

  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath
  });
}