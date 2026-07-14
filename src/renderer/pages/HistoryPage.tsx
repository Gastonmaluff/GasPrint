import { RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { HistoryFilter } from '../../shared/types/ipc';
import type { PrintHistoryEntry } from '../../shared/types/printing';
import { StatusPill } from '../components/StatusPill';

interface HistoryPageProps {
  history: PrintHistoryEntry[];
  onClear: () => void;
  onRepeat: (jobId: string) => void;
}

export function HistoryPage({ history, onClear, onRepeat }: HistoryPageProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const filtered = useMemo(() => (filter === 'all' ? history : history.filter((job) => job.status === filter)), [filter, history]);

  return (
    <div className="page-stack">
      <div className="section-heading">
        <div>
          <h1>Historial</h1>
          <p>Registra intentos, resultados del spooler y errores. No confirma impresion fisica si Windows no lo informa.</p>
        </div>
        <button className="danger-button" type="button" onClick={onClear} disabled={history.length === 0}>
          <Trash2 size={16} />
          Borrar historial
        </button>
      </div>

      <div className="segmented compact">
        {(['all', 'pending', 'sent', 'completed', 'error'] as HistoryFilter[]).map((item) => (
          <button key={item} className={filter === item ? 'active' : ''} type="button" onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>

      <section className="history-list">
        {filtered.map((job) => (
          <article key={job.id} className="history-item">
            <div>
              <div className="history-title">
                <strong>{job.type}</strong>
                <StatusPill label={job.status} tone={job.status === 'error' ? 'bad' : job.status === 'sent' ? 'good' : 'neutral'} />
              </div>
              <p>{job.summary}</p>
              <span>{new Date(job.createdAt).toLocaleString()} · {job.printerName}</span>
            </div>
            <div className="history-meta">
              <span>{job.durationMs ? `${job.durationMs} ms` : 'Duracion no disponible'}</span>
              <small>{job.technicalMessage}</small>
              <button className="secondary-button" type="button" onClick={() => onRepeat(job.id)} disabled={!job.job}>
                <RotateCcw size={15} />
                Repetir
              </button>
            </div>
          </article>
        ))}
      </section>

      {filtered.length === 0 && <p className="empty-state">No hay trabajos para mostrar.</p>}
    </div>
  );
}