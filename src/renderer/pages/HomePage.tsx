import type { ComponentType } from 'react';
import { Activity, FlaskConical, Network, Plug, Printer, PrinterCheck, Send, Server } from 'lucide-react';
import type { AppData, DiagnosticsInfo, PrintHistoryEntry, PrinterInfo } from '../../shared/types/printing';
import type { PageId } from '../components/Sidebar';
import { GasPrintLogo } from '../components/branding/GasPrintLogo';

interface HomePageProps {
  data: AppData;
  printers: PrinterInfo[];
  selectedPrinter?: PrinterInfo;
  lastJob?: PrintHistoryEntry;
  diagnostics?: DiagnosticsInfo;
  onPrintTest: () => void;
  onNavigate: (page: PageId) => void;
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

export function HomePage({ data, printers, selectedPrinter, lastJob, diagnostics, onPrintTest, onNavigate }: HomePageProps) {
  const apiActive = Boolean(diagnostics?.localApiActive);
  const selectedName = selectedPrinter?.displayName ?? (data.settings.selectedPrinterName || 'No seleccionada');
  const lastStatus = lastJob?.status ?? 'Sin historial';
  const lastTone: Tone = lastJob?.status === 'error' ? 'bad' : lastJob?.status === 'sent' || lastJob?.status === 'completed' ? 'good' : 'neutral';

  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero-body">
          <span className="eyebrow">Puente local de impresion</span>
          <GasPrintLogo height={40} className="hero-logo" />
          <p>
            Envia recibos y pruebas a las impresoras de Windows sin abrir el dialogo del sistema.
            Configuracion, calibracion e historial guardados localmente en tu equipo.
          </p>
        </div>
        <div className="hero-service">
          <span className="eyebrow">Servicio local</span>
          <strong>{apiActive ? 'Operativo' : 'Detenido'}</strong>
          <span className="svc-row">
            <span className={`status-dot ${apiActive ? 'good' : 'warn'}`} />
            {apiActive ? `Escuchando en 127.0.0.1:${diagnostics?.localApiPort || data.api.port}` : 'API local en pausa'}
          </span>
          <span className="svc-row">
            <Printer size={15} />
            {selectedName}
          </span>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard icon={Printer} label="Impresoras detectadas" value={String(printers.length)} detail="Reconocidas por Windows" />
        <MetricCard icon={PrinterCheck} label="Seleccionada GasPrint" value={selectedName} detail="Persistida localmente" tone={selectedPrinter ? 'good' : 'neutral'} />
        <MetricCard icon={Server} label="Servicio local" value={apiActive ? 'Activo' : 'Detenido'} detail="API en 127.0.0.1" tone={apiActive ? 'good' : 'warn'} />
        <MetricCard icon={Activity} label="Ultimo trabajo" value={lastStatus} detail={lastJob?.summary ?? 'Todavia no se enviaron trabajos'} tone={lastTone} />
        <MetricCard icon={Plug} label="Puerto local" value={String(diagnostics?.localApiPort || data.api.port)} detail="Solo loopback, no expuesto" />
        <MetricCard icon={Network} label="Estado de API" value={apiActive ? 'Escuchando' : 'En pausa'} detail={data.api.lastClientOrigin ? `Ultimo cliente ${data.api.lastClientOrigin}` : 'Sin clientes recientes'} tone={apiActive ? 'good' : 'neutral'} />
      </section>

      <section className="quick-actions">
        <button className="primary-button" type="button" onClick={onPrintTest} disabled={!selectedPrinter}>
          <Send size={18} />
          Imprimir prueba
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate('lab')}>
          <FlaskConical size={18} />
          Abrir laboratorio
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate('printers')}>
          <Printer size={18} />
          Ver impresoras
        </button>
      </section>
    </div>
  );
}

interface MetricCardProps {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className="metric">
      <div className="metric-head">
        <span className="metric-icon">
          <Icon size={18} />
        </span>
        <span className="metric-label">{label}</span>
      </div>
      <strong>
        {tone !== 'neutral' && <span className={`status-dot ${tone}`} style={{ display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />}
        {value}
      </strong>
      <p>{detail}</p>
    </article>
  );
}
