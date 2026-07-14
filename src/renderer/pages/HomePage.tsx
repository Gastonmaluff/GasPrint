import { FlaskConical, Printer, Send } from 'lucide-react';
import type { AppData, DiagnosticsInfo, PrintHistoryEntry, PrinterInfo } from '../../shared/types/printing';
import type { PageId } from '../components/Sidebar';
import { StatusPill } from '../components/StatusPill';

interface HomePageProps {
  data: AppData;
  printers: PrinterInfo[];
  selectedPrinter?: PrinterInfo;
  lastJob?: PrintHistoryEntry;
  diagnostics?: DiagnosticsInfo;
  onPrintTest: () => void;
  onNavigate: (page: PageId) => void;
}

export function HomePage({ data, printers, selectedPrinter, lastJob, diagnostics, onPrintTest, onNavigate }: HomePageProps) {
  const defaultPrinter = printers.find((printer) => printer.isDefault);

  return (
    <div className="page-stack">
      <section className="intro-band">
        <div>
          <span className="eyebrow">Puente local de impresion</span>
          <h1>GasPrint</h1>
          <p>
            Aplicacion de escritorio para enviar recibos y pruebas a las impresoras instaladas en Windows,
            con configuracion e historial guardados localmente.
          </p>
        </div>
        <div className="service-card">
          <span>Servicio</span>
          <strong>Listo en escritorio</strong>
          <StatusPill label="API local preparada, no expuesta" tone="neutral" />
        </div>
      </section>

      <section className="metrics-grid">
        <Metric title="Impresoras detectadas" value={String(printers.length)} detail="Reconocidas por Windows" />
        <Metric title="Predeterminada Windows" value={defaultPrinter?.displayName ?? 'No disponible'} detail="Lectura del spooler" />
        <Metric title="Seleccionada GasPrint" value={selectedPrinter?.displayName ?? (data.settings.selectedPrinterName || 'No seleccionada')} detail="Persistida localmente" />
        <Metric title="Ultimo trabajo" value={lastJob?.status ?? 'Sin historial'} detail={lastJob?.summary ?? 'Todavia no se enviaron trabajos'} />
        <Metric title="Servicio local" value={diagnostics?.localApiActive ? 'Activo' : 'Detenido'} detail={`Puerto ${diagnostics?.localApiPort || data.api.port}`} />
        <Metric title="Ultimo cliente API" value={data.api.lastClientOrigin || 'Sin clientes'} detail={data.api.lastApiJobAt ? `Ultimo trabajo ${new Date(data.api.lastApiJobAt).toLocaleString()}` : 'Sin trabajos externos'} />
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

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}