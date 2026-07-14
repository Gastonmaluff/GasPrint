import { BrowserWindow, Menu, Tray, app, nativeImage, nativeTheme } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { DataStore } from './storage/dataStore.js';
import { WindowsPrintEngine } from './printing/windowsPrintEngine.js';
import { registerIpcHandlers } from './ipc/registerHandlers.js';
import { createTestJob } from './printing/jobFactory.js';
import { LocalApiServer } from './api/localApiServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isSmokeTest = process.argv.includes('--smoke-test');
const isApiSelfTest = process.argv.includes('--api-self-test');
const smokePrintPrinter = getArgValue('--print-test');
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const store = new DataStore();
const printEngine = new WindowsPrintEngine(() => mainWindow?.webContents ?? null);
const apiServer = new LocalApiServer(store, printEngine);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

registerIpcHandlers(store, printEngine, apiServer);

async function createWindow(): Promise<void> {
  const data = await store.getData();
  nativeTheme.themeSource = data.settings.theme === 'light' ? 'light' : 'dark';

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: 'GasPrint',
    show: true,
    backgroundColor: data.settings.theme === 'light' ? '#f5f2ec' : '#111416',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.on('console-message', (details) => {
    if (isSmokeTest) {
      console.log(`[renderer:${details.level}] ${details.message}`);
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (isQuitting || isSmokeTest) {
      return;
    }
    event.preventDefault();
    void store.getData().then((data) => {
      if (data.settings.minimizeToTray) {
        mainWindow?.hide();
        return;
      }
      isQuitting = true;
      mainWindow?.close();
    });
  });
}

app.whenReady().then(async () => {
  await createWindow();
  createTray();
  await apiServer.start();
  setInterval(updateTrayMenu, 3000);

  if (isSmokeTest) {
    try {
      const printers = await withTimeout(printEngine.listPrinters(), 10000, 'La enumeracion de impresoras no respondio en 10 segundos.');
      const printResult = smokePrintPrinter
        ? await withTimeout(printEngine.print(createTestJob(smokePrintPrinter)), 15000, 'La impresion de prueba no respondio en 15 segundos.')
        : null;
      const apiTests = isApiSelfTest ? await runApiSelfTests() : null;
      console.log(
        JSON.stringify(
          {
            ok: true,
            printResult,
            apiTests,
            printers: printers.map((printer) => ({
              name: printer.name,
              displayName: printer.displayName,
              isDefault: printer.isDefault,
              kind: printer.kind,
              status: printer.status
            }))
          },
          null,
          2
        )
      );
      app.quit();
    } catch (error) {
      console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
      app.exit(1);
    }
    return;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('second-instance', () => {
  showMainWindow();
});

app.on('before-quit', () => {
  isQuitting = true;
});

function getArgValue(name: string): string {
  const prefixed = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefixed));
  return match ? match.slice(prefixed.length) : '';
}

function showMainWindow(): void {
  if (!mainWindow) {
    void createWindow();
    return;
  }
  mainWindow.show();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function createTray(): void {
  if (tray || isSmokeTest) {
    return;
  }

  const image = nativeImage.createFromDataURL(createTrayIconDataUrl(apiServer.getStatus().active));
  tray = new Tray(image);
  tray.setToolTip('GasPrint');
  updateTrayMenu();
  tray.on('click', showMainWindow);
}

function updateTrayMenu(): void {
  if (!tray) {
    return;
  }
  const status = apiServer.getStatus();
  tray.setImage(nativeImage.createFromDataURL(createTrayIconDataUrl(status.active)));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: status.active ? `Servicio local activo (${status.port})` : 'Servicio local detenido', enabled: false },
      { label: 'Abrir GasPrint', click: showMainWindow },
      {
        label: status.active ? 'Detener API local' : 'Iniciar API local',
        click: async () => {
          if (status.active) {
            await store.updateApi({ enabled: false });
            await apiServer.stop();
          } else {
            await store.updateApi({ enabled: true });
            await apiServer.start();
          }
          updateTrayMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Salir completamente',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );
}

function createTrayIconDataUrl(active: boolean): string {
  const fill = active ? '%2343c6b6' : '%23888888';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect x="6" y="6" width="52" height="52" rx="12" fill="${fill}"/><text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="white">GP</text></svg>`;
  return `data:image/svg+xml,${svg}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function runApiSelfTests(): Promise<Record<string, number>> {
  const data = await store.getData();
  const port = data.api.port;
  const token = data.api.token;
  const validHeaders = { Authorization: `Bearer ${token}` };
  const printPayload = {
    printer: 'IMPRESORA_INEXISTENTE_GASPRINT',
    type: 'receipt',
    paperWidth: 58,
    source: 'smoke-api',
    content: {
      title: 'GasPrint',
      lines: [{ text: 'Hola Mundo', align: 'center', bold: true, size: 'normal' }],
      feedLines: 2
    }
  };

  return {
    health: (await apiRequest(port, 'GET', '/api/v1/health', validHeaders)).status,
    printers: (await apiRequest(port, 'GET', '/api/v1/printers', validHeaders)).status,
    missingToken: (await apiRequest(port, 'GET', '/api/v1/health')).status,
    invalidToken: (await apiRequest(port, 'GET', '/api/v1/health', { Authorization: 'Bearer invalid' })).status,
    deniedOrigin: (await apiRequest(port, 'GET', '/api/v1/health', { ...validHeaders, Origin: 'https://example.com' })).status,
    oversizedBody: (
      await apiRequest(port, 'POST', '/api/v1/print', { ...validHeaders, 'Content-Type': 'application/json' }, JSON.stringify({ padding: 'x'.repeat(40000) }))
    ).status,
    missingPrinter: (
      await apiRequest(port, 'POST', '/api/v1/print', { ...validHeaders, 'Content-Type': 'application/json' }, JSON.stringify(printPayload))
    ).status
  };
}

async function apiRequest(
  port: number,
  method: 'GET' | 'POST',
  path: string,
  headers: Record<string, string> = {},
  body = ''
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          ...headers,
          ...(body ? { 'Content-Length': Buffer.byteLength(body).toString() } : {})
        },
        timeout: 10000
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      }
    );
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy(new Error('API self-test timeout.'));
    });
    if (body) {
      request.write(body);
    }
    request.end();
  });
}