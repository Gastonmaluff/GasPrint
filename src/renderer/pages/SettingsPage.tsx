import { useState } from 'react';
import {
  Copy,
  Database,
  FolderOpen,
  KeyRound,
  Network,
  Palette,
  Play,
  Power,
  Printer,
  RotateCcw,
  Square,
  TriangleAlert
} from 'lucide-react';
import type { AppData, AppSettings, DiagnosticsInfo, PaperWidth, PrinterInfo, PrinterProfile } from '../../shared/types/printing';
import { CalibrationPanel } from '../components/CalibrationPanel';
import { ConfirmationDialog } from '../components/ConfirmationDialog';

interface SettingsPageProps {
  data: AppData;
  printers: PrinterInfo[];
  diagnostics?: DiagnosticsInfo;
  selectedPrinterName: string;
  busy?: boolean;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onApiChange: (settings: Partial<AppData['api']>) => void;
  onRegenerateToken: () => void;
  onStartApi: () => void;
  onStopApi: () => void;
  onReset: () => void;
  onOpenDataFolder: () => void;
  onSaveProfile: (profile: PrinterProfile) => void;
  onPrintCalibration: (profile: PrinterProfile) => void;
}

export function SettingsPage({
  data,
  printers,
  diagnostics,
  selectedPrinterName,
  busy,
  onSettingsChange,
  onApiChange,
  onRegenerateToken,
  onStartApi,
  onStopApi,
  onReset,
  onOpenDataFolder,
  onSaveProfile,
  onPrintCalibration
}: SettingsPageProps) {
  const settings = data.settings;
  const tokenPreview = data.api.token ? `${data.api.token.slice(0, 6)}...${data.api.token.slice(-6)}` : 'No generado';
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="settings-layout">
      {/* Apariencia */}
      <section className="settings-panel">
        <span className="settings-section-label"><Palette size={15} /> Apariencia</span>
        <div className="field-grid two">
          <label>
            Impresora predeterminada GasPrint
            <select value={settings.selectedPrinterName} onChange={(event) => onSettingsChange({ selectedPrinterName: event.target.value })}>
              <option value="">No seleccionada</option>
              {printers.map((printer) => (
                <option key={printer.name} value={printer.name}>{printer.displayName}</option>
              ))}
            </select>
            <span className="field-hint">Se usa por defecto para pruebas y calibracion.</span>
          </label>
          <label>
            Tema
            <select value={settings.theme} onChange={(event) => onSettingsChange({ theme: event.target.value as AppSettings['theme'] })}>
              <option value="dark">Oscuro</option>
              <option value="light">Claro</option>
            </select>
            <span className="field-hint">Cambia la apariencia clara u oscura de la interfaz.</span>
          </label>
        </div>
      </section>

      {/* Impresion */}
      <section className="settings-panel">
        <span className="settings-section-label"><Printer size={15} /> Impresion</span>
        <div className="field-grid three">
          <label>
            Ancho predeterminado
            <select
              value={settings.paperWidth}
              onChange={(event) => {
                const paperWidth = Number(event.target.value) as PaperWidth;
                onSettingsChange({ paperWidth, charactersPerLine: paperWidth === 58 ? 32 : 42 });
              }}
            >
              <option value={58}>58 mm</option>
              <option value={80}>80 mm</option>
            </select>
          </label>
          <label>
            Caracteres por linea
            <input type="number" min={24} max={64} value={settings.charactersPerLine} onChange={(event) => onSettingsChange({ charactersPerLine: Number(event.target.value) })} />
          </label>
          <label>
            Lineas de avance
            <input type="number" min={0} max={10} value={settings.feedLines} onChange={(event) => onSettingsChange({ feedLines: Number(event.target.value) })} />
          </label>
        </div>
      </section>

      {/* Inicio y comportamiento */}
      <section className="settings-panel">
        <span className="settings-section-label"><Power size={15} /> Inicio y comportamiento</span>
        <label className="toggle wide">
          <input
            type="checkbox"
            checked={settings.startWithWindows}
            onChange={(event) => onSettingsChange({ startWithWindows: event.target.checked })}
          />
          Iniciar GasPrint con Windows
        </label>
        <label className="toggle wide">
          <input
            type="checkbox"
            checked={settings.minimizeToTray}
            onChange={(event) => onSettingsChange({ minimizeToTray: event.target.checked })}
          />
          Cerrar ventana minimizando a la bandeja
        </label>
        <div className="quick-actions">
          <button className="secondary-button" type="button" onClick={onOpenDataFolder}>
            <FolderOpen size={18} />
            Abrir carpeta de datos
          </button>
        </div>
      </section>

      {/* Calibracion */}
      <CalibrationPanel
        profiles={data.printerProfiles}
        printerName={selectedPrinterName}
        busy={busy}
        onSaveProfile={onSaveProfile}
        onPrintCalibration={onPrintCalibration}
      />

      {/* API local */}
      <section className="settings-panel">
        <span className="settings-section-label"><Network size={15} /> API local</span>
        <p className="muted-text">Escucha solo en 127.0.0.1. No compartas el token en logs, repositorios ni interfaces publicas.</p>
        <div className="field-grid two">
          <label>
            Estado
            <input readOnly value={diagnostics?.localApiActive ? 'Activa' : 'Detenida'} />
          </label>
          <label>
            Puerto
            <input type="number" min={1024} max={65535} value={data.api.port} onChange={(event) => onApiChange({ port: Number(event.target.value) })} />
          </label>
        </div>
        <label>
          Token local
          <input readOnly value={tokenPreview} />
        </label>
        <div className="quick-actions">
          <button className="secondary-button" type="button" onClick={() => void navigator.clipboard.writeText(data.api.token)} disabled={!data.api.token}>
            <Copy size={18} />
            Copiar token
          </button>
          <button className="secondary-button" type="button" onClick={onRegenerateToken}>
            <KeyRound size={18} />
            Regenerar token
          </button>
          {diagnostics?.localApiActive ? (
            <button className="danger-button" type="button" onClick={onStopApi}>
              <Square size={18} />
              Detener servicio
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={onStartApi}>
              <Play size={18} />
              Iniciar servicio
            </button>
          )}
        </div>
        <label>
          Origenes permitidos
          <textarea
            rows={4}
            value={data.api.allowedOrigins.join('\n')}
            onChange={(event) => onApiChange({ allowedOrigins: event.target.value.split(/\r?\n/) })}
          />
        </label>
        <dl className="detail-list">
          <div><dt>Ultimo cliente</dt><dd>{data.api.lastClientOrigin || 'No disponible'}</dd></div>
          <div><dt>Ultima solicitud</dt><dd>{data.api.lastRequestAt ? new Date(data.api.lastRequestAt).toLocaleString() : 'No disponible'}</dd></div>
          <div><dt>Ultimo trabajo API</dt><dd>{data.api.lastApiJobAt ? new Date(data.api.lastApiJobAt).toLocaleString() : 'No disponible'}</dd></div>
        </dl>
      </section>

      {/* Datos y diagnostico */}
      <section className="settings-panel">
        <span className="settings-section-label"><Database size={15} /> Datos y diagnostico</span>
        <dl className="detail-list">
          <div><dt>Version</dt><dd>{diagnostics?.version ?? '0.2.0'}</dd></div>
          <div><dt>Electron</dt><dd>{diagnostics?.electronVersion ?? 'No disponible'}</dd></div>
          <div><dt>Chrome</dt><dd>{diagnostics?.chromeVersion ?? 'No disponible'}</dd></div>
          <div><dt>Node</dt><dd>{diagnostics?.nodeVersion ?? 'No disponible'}</dd></div>
          <div><dt>Plataforma</dt><dd>{diagnostics?.platform ?? 'No disponible'}</dd></div>
          <div><dt>Datos</dt><dd>{diagnostics?.dataPath ?? 'No disponible'}</dd></div>
          <div><dt>API local</dt><dd>{diagnostics?.localApiPrepared ? 'Arquitectura preparada' : 'No preparada'}</dd></div>
        </dl>
      </section>

      {/* Zona de peligro */}
      <section className="settings-panel danger-zone">
        <span className="settings-section-label" style={{ color: 'var(--bad)' }}><TriangleAlert size={15} /> Zona de peligro</span>
        <p className="muted-text">Acciones sensibles. La configuracion local no se comparte y estas acciones no se pueden deshacer.</p>
        <div className="quick-actions">
          <button className="danger-button" type="button" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={18} />
            Restablecer configuracion
          </button>
        </div>
      </section>

      <ConfirmationDialog
        open={confirmReset}
        title="Restablecer configuracion"
        message="Se restauraran los valores por defecto de la aplicacion (tema, impresion, API e inicio). Los perfiles de calibracion y el historial se regeneran. Esta accion no se puede deshacer."
        confirmLabel="Restablecer"
        onConfirm={() => {
          setConfirmReset(false);
          onReset();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
