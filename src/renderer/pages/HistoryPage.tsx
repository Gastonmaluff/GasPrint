import { Cpu, RotateCcw, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { HistoryFilter } from '../../shared/types/ipc';
import type { PrintHistoryEntry } from '../../shared/types/printing';
import { StatusPill } from '../components/StatusPill';
import { ConfirmationDialog } from '../components/ConfirmationDialog';

interface HistoryPageProps {
  history: PrintHistoryEntry[];
  onClear: () => void;
  onRepeat: (jobId: string) => void;
}

const FILTERS: Array<{ id: HistoryFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'sent', label: 'Enviado' },
  { id: 'completed', label: 'Completado' },
  { id: 'error', label: 'Error' }
];

function statusTone(status: PrintHistoryEntry['status']): 'good' | 'warn' | 'bad' | 'neutral' {
  if (status === 'error') return 'bad';
  if (status === 'sent' || status === 'completed') return 'good';
  if (status === 'pending') return 'warn';
  return 'neutral';
}

export function HistoryPage({ history, onClear, onRepeat }: HistoryPageProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [confirming, setConfirming] = useState(false);
  const filtered = useMemo(() => (filter === 'all' ? history : history.filter((job) => job.status === filter)), [filter, history]);

  return (
    <div className="page-stack">
      <div className="section-heading">
        <div>
          <h1>Historial de actividad</h1>
          <p>Registra intentos, resultados del spooler y errores. No confirma impresion fisica si Windows no lo informa.</p>
        </div>
        <button className="danger-button" type="button" onClick={() => setConfirming(true)} disabled={history.length === 0}>
          <Trash2 size={16} />
          Borrar historial
        </button>
      </div>

      <div className="toolbar">
        <div className="segmented compact">
          {FILTERS.map((item) => (
            <button key={item.id} className={filter === item.id ? 'active' : ''} type="button" onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <span className="result-count">{filtered.length} de {history.length} trabajos</span>
      </div>

      <section className="history-list">
        {filtered.map((job) => (
          <article key={job.id} className="history-item">
            <div>
              <div className="history-title">
                <strong>{job.type}</strong>
                <StatusPill label={job.status} tone={statusTone(job.status)} />
                <span className="pill">{job.origin}</span>
              </div>
              <p>{job.summary}</p>
              <span>{new Date(job.createdAt).toLocaleString()} &middot; {job.printerName}</span>
            </div>
            <div className="history-meta">
              <span className="pill-row" style={{ justifyContent: 'flex-end' }}>
                {job.engine && (
                  <span className="pill">
                    <Cpu size={13} /> {job.engine}
                  </span>
                )}
                {job.fallbackUsed && (
                  <span className="pill warn">
                    <Zap size={13} /> fallback
                  </span>
                )}
              </span>
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

      {filtered.length === 0 && (
        <div className="empty-state">
          <strong>Sin trabajos para mostrar</strong>
          <span>Los trabajos que envies apareceran aqui con su estado y motor.</span>
        </div>
      )}

      <ConfirmationDialog
        open={confirming}
        title="Borrar historial"
        message="Se eliminaran todos los registros de trabajos. Esta accion no se puede deshacer."
        confirmLabel="Borrar todo"
        onConfirm={() => {
          setConfirming(false);
          onClear();
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
