import { useEffect, useMemo, useState } from 'react';
import type { AppData, AppSettings, DiagnosticsInfo, LabState, PrinterInfo, PrinterProfile } from '../shared/types/printing';
import { DEFAULT_LAB, DEFAULT_SETTINGS } from '../shared/constants/app';
import { Sidebar, type PageId } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { PrintersPage } from './pages/PrintersPage';
import { LabPage } from './pages/LabPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { createLabPrintPayload, gasPrintApi } from './services/gasPrintApi';
import { useAsyncAction } from './hooks/useAsyncAction';
import { GasPrintLogo } from './components/branding/GasPrintLogo';

const initialData: AppData = {
  settings: { ...DEFAULT_SETTINGS },
  history: [],
  lab: { ...DEFAULT_LAB },
  printerProfiles: [],
  api: {
    enabled: true,
    port: 38472,
    token: '',
    allowedOrigins: [],
    lastClientOrigin: '',
    lastRequestAt: '',
    lastApiJobAt: ''
  }
};

export function App() {
  const [page, setPage] = useState<PageId>('home');
  const [data, setData] = useState<AppData>(initialData);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo>();
  const [loaded, setLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { busy, message, setMessage, run } = useAsyncAction();

  const effectivePrinterName = useMemo(() => {
    const selectedExists = printers.some((printer) => printer.name === data.settings.selectedPrinterName);
    if (selectedExists) {
      return data.settings.selectedPrinterName;
    }
    return printers.find((printer) => printer.isDefault)?.name ?? data.settings.selectedPrinterName;
  }, [data.settings.selectedPrinterName, printers]);

  const selectedPrinter = printers.find((printer) => printer.name === effectivePrinterName);
  const lastJob = data.history[0];

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  async function loadInitial() {
    await run(async () => {
      const [nextData, nextPrinters, nextDiagnostics] = await Promise.all([
        gasPrintApi.getData(),
        gasPrintApi.listPrinters(),
        gasPrintApi.getDiagnostics()
      ]);
      setData(nextData);
      setPrinters(nextPrinters);
      setDiagnostics(nextDiagnostics);
      setLoaded(true);
      return nextData;
    });
  }

  async function refreshPrinters() {
    await run(async () => {
      const nextPrinters = await gasPrintApi.refreshPrinters();
      setPrinters(nextPrinters);
      return nextPrinters;
    }, 'Lista de impresoras actualizada.');
  }

  async function updateSettings(settings: Partial<AppSettings>) {
    await run(async () => {
      const nextData = await gasPrintApi.updateSettings(settings);
      setData(nextData);
      return nextData;
    });
  }

  async function updateApi(settings: Partial<AppData['api']>) {
    await run(async () => {
      const nextData = await gasPrintApi.updateApi(settings);
      const nextDiagnostics = await gasPrintApi.getDiagnostics();
      setData(nextData);
      setDiagnostics(nextDiagnostics);
      return nextData;
    });
  }

  async function regenerateToken() {
    await run(async () => {
      const nextData = await gasPrintApi.regenerateApiToken();
      setData(nextData);
      return nextData;
    }, 'Token local regenerado.');
  }

  async function startApi() {
    await run(async () => {
      const nextData = await gasPrintApi.startApi();
      const nextDiagnostics = await gasPrintApi.getDiagnostics();
      setData(nextData);
      setDiagnostics(nextDiagnostics);
      return nextData;
    }, 'API local iniciada.');
  }

  async function stopApi() {
    await run(async () => {
      const nextData = await gasPrintApi.stopApi();
      const nextDiagnostics = await gasPrintApi.getDiagnostics();
      setData(nextData);
      setDiagnostics(nextDiagnostics);
      return nextData;
    }, 'API local detenida.');
  }

  async function selectPrinter(printerName: string) {
    await updateSettings({ selectedPrinterName: printerName });
    setMessage(`Impresora seleccionada: ${printerName}`);
  }

  async function saveProfile(profile: PrinterProfile) {
    await run(async () => {
      const nextData = await gasPrintApi.updatePrinterProfile(profile);
      setData(nextData);
      return nextData;
    }, 'Perfil de impresora guardado.');
  }

  async function printCalibration(profile: PrinterProfile) {
    if (!profile.printerName) {
      setMessage('Selecciona una impresora antes de imprimir.');
      return;
    }
    await run(async () => {
      // Validar y guardar primero; el handler de calibracion vuelve a leer el perfil efectivo persistido.
      await gasPrintApi.updatePrinterProfile(profile);
      const result = await gasPrintApi.printCalibration(profile.printerName);
      const nextData = await gasPrintApi.getData();
      setData(nextData);
      return result;
    }, 'Ticket de calibracion enviado al sistema de impresion de Windows.');
  }

  function updateLab(lab: LabState) {
    setData((current) => ({ ...current, lab }));
    void gasPrintApi.updateLab(lab).then(setData).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : String(error));
    });
  }

  async function printTest(printerName = effectivePrinterName) {
    if (!printerName) {
      setMessage('Selecciona una impresora antes de imprimir.');
      return;
    }
    await run(async () => {
      const result = await gasPrintApi.printTest(printerName);
      const nextData = await gasPrintApi.getData();
      setData(nextData);
      return result;
    }, 'Trabajo de prueba enviado al sistema de impresion de Windows.');
  }

  async function printLab() {
    if (!effectivePrinterName) {
      setMessage('Selecciona una impresora antes de imprimir.');
      return;
    }
    await run(async () => {
      await gasPrintApi.updateLab(data.lab);
      const result = await gasPrintApi.printLab(createLabPrintPayload(effectivePrinterName, data.lab));
      const nextData = await gasPrintApi.getData();
      setData(nextData);
      return result;
    }, 'Trabajo del laboratorio enviado al sistema de impresion de Windows.');
  }

  async function repeatJob(jobId: string) {
    await run(async () => {
      const result = await gasPrintApi.repeatJob(jobId);
      const nextData = await gasPrintApi.getData();
      setData(nextData);
      return result;
    }, 'Trabajo reenviado al sistema de impresion.');
  }

  async function clearHistory() {
    await run(async () => {
      const nextData = await gasPrintApi.clearHistory();
      setData(nextData);
      return nextData;
    }, 'Historial borrado.');
  }

  async function resetSettings() {
    await run(async () => {
      const nextData = await gasPrintApi.resetSettings();
      setData(nextData);
      return nextData;
    }, 'Configuracion restablecida.');
  }

  async function openDataFolder() {
    await run(async () => gasPrintApi.openDataFolder(), 'Carpeta de datos abierta.');
  }

  const content = renderPage();

  return (
    <div className={collapsed ? 'app-shell collapsed' : 'app-shell'}>
      <Sidebar
        active={page}
        collapsed={collapsed}
        onChange={setPage}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
      <main className="content-shell">
        <header className="topbar">
          <div className="topbar-status">
            <span className={`status-dot ${loaded ? 'good' : 'warn'}`} aria-hidden="true" />
            <div>
              <span className="eyebrow">{loaded ? 'Entorno local conectado' : 'Cargando entorno local'}</span>
              <strong>{selectedPrinter?.displayName ?? 'Sin impresora seleccionada'}</strong>
            </div>
          </div>
          {busy && <span className="activity">Procesando</span>}
        </header>
        {message && (
          <div className="notice" role="status">
            {message}
            <button type="button" onClick={() => setMessage('')}>Cerrar</button>
          </div>
        )}
        {content}
      </main>
    </div>
  );

  function renderPage() {
    if (!loaded) {
      return (
        <div className="empty-state">
          <GasPrintLogo height={34} />
          <span>Inicializando el entorno local...</span>
        </div>
      );
    }

    if (page === 'home') {
      return (
        <HomePage
          data={data}
          printers={printers}
          selectedPrinter={selectedPrinter}
          lastJob={lastJob}
          diagnostics={diagnostics}
          onPrintTest={() => void printTest()}
          onNavigate={setPage}
        />
      );
    }

    if (page === 'printers') {
      return (
        <PrintersPage
          printers={printers}
          selectedPrinterName={effectivePrinterName}
          onRefresh={() => void refreshPrinters()}
          onSelect={(name) => void selectPrinter(name)}
          onPrintTest={(name) => void printTest(name)}
        />
      );
    }

    if (page === 'lab') {
      return (
        <LabPage
          lab={data.lab}
          printers={printers}
          selectedPrinterName={effectivePrinterName}
          onLabChange={updateLab}
          onPrinterChange={(name) => void selectPrinter(name)}
          onPrint={() => void printLab()}
        />
      );
    }

    if (page === 'history') {
      return <HistoryPage history={data.history} onClear={() => void clearHistory()} onRepeat={(jobId) => void repeatJob(jobId)} />;
    }

    return (
      <SettingsPage
        data={data}
        printers={printers}
        diagnostics={diagnostics}
        selectedPrinterName={effectivePrinterName}
        busy={busy}
        onSettingsChange={(settings) => void updateSettings(settings)}
        onApiChange={(settings) => void updateApi(settings)}
        onRegenerateToken={() => void regenerateToken()}
        onStartApi={() => void startApi()}
        onStopApi={() => void stopApi()}
        onReset={() => void resetSettings()}
        onOpenDataFolder={() => void openDataFolder()}
        onSaveProfile={(profile) => void saveProfile(profile)}
        onPrintCalibration={(profile) => void printCalibration(profile)}
      />
    );
  }
}