import { RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PrinterInfo } from '../../shared/types/printing';
import { PrinterCard } from '../components/PrinterCard';

interface PrintersPageProps {
  printers: PrinterInfo[];
  selectedPrinterName: string;
  onRefresh: () => void;
  onSelect: (name: string) => void;
  onPrintTest: (name: string) => void;
}

type FilterMode = 'all' | 'physical' | 'virtual';

export function PrintersPage({ printers, selectedPrinterName, onRefresh, onSelect, onPrintTest }: PrintersPageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [detail, setDetail] = useState<PrinterInfo | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return printers.filter((printer) => {
      const matchesQuery = !normalizedQuery || `${printer.name} ${printer.description}`.toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === 'all' || printer.kind === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, printers, query]);

  return (
    <div className="page-stack">
      <div className="section-heading">
        <div>
          <h1>Impresoras</h1>
          <p>Listado obtenido desde Windows. Los datos no informados por el sistema se muestran como no disponibles.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh}>
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      <section className="toolbar">
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar impresora" />
        </label>
        <div className="segmented">
          <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>Todas</button>
          <button className={filter === 'physical' ? 'active' : ''} type="button" onClick={() => setFilter('physical')}>Fisicas</button>
          <button className={filter === 'virtual' ? 'active' : ''} type="button" onClick={() => setFilter('virtual')}>Virtuales</button>
        </div>
      </section>

      <section className="printer-grid">
        {filtered.map((printer) => (
          <PrinterCard
            key={printer.name}
            printer={printer}
            selected={printer.name === selectedPrinterName}
            onSelect={onSelect}
            onPrintTest={onPrintTest}
            onDetails={setDetail}
          />
        ))}
      </section>

      {filtered.length === 0 && <p className="empty-state">No hay impresoras para los filtros actuales.</p>}

      {detail && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDetail(null)}>
          <section className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <h2>{detail.displayName}</h2>
                <p>Detalle tecnico informado por Windows y clasificacion local.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setDetail(null)} title="Cerrar">x</button>
            </div>
            <dl className="detail-list">
              <div><dt>Nombre</dt><dd>{detail.name}</dd></div>
              <div><dt>Descripcion</dt><dd>{detail.description || 'No disponible'}</dd></div>
              <div><dt>Estado</dt><dd>{detail.status}</dd></div>
              <div><dt>Estado bruto Windows</dt><dd>{detail.rawStatus ?? 'No disponible'}</dd></div>
              <div><dt>Predeterminada</dt><dd>{detail.isDefault ? 'Si' : 'No'}</dd></div>
              <div><dt>Clasificacion</dt><dd>{detail.kind}</dd></div>
              <div><dt>Razon</dt><dd>{detail.reasons.join('. ')}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}