import { Check, Info, Printer, Send } from 'lucide-react';
import type { PrinterInfo } from '../../shared/types/printing';
import { availabilityTone, printerKindLabel, StatusPill } from './StatusPill';

interface PrinterCardProps {
  printer: PrinterInfo;
  selected: boolean;
  onSelect: (name: string) => void;
  onPrintTest: (name: string) => void;
  onDetails: (printer: PrinterInfo) => void;
}

export function PrinterCard({ printer, selected, onSelect, onPrintTest, onDetails }: PrinterCardProps) {
  return (
    <article className={selected ? 'printer-card selected' : 'printer-card'}>
      <div className="printer-card-head">
        <div className={`printer-dot ${printer.kind}`} />
        <div>
          <h3>{printer.displayName}</h3>
          <p>{printer.name}</p>
        </div>
      </div>

      <div className="pill-row">
        {printer.isDefault ? <StatusPill label="Predeterminada Windows" tone="good" /> : <StatusPill label="No predeterminada" />}
        <StatusPill label={printerKindLabel(printer.kind)} tone={printer.kind === 'virtual' ? 'warn' : 'neutral'} />
        <StatusPill label={printer.availability === 'unknown' ? 'Disponibilidad no informada' : printer.availability} tone={availabilityTone(printer.availability)} />
      </div>

      <dl className="compact-list">
        <div>
          <dt>Estado</dt>
          <dd>{printer.status}</dd>
        </div>
        <div>
          <dt>Ultima comprobacion</dt>
          <dd>{new Date(printer.lastCheckedAt).toLocaleString()}</dd>
        </div>
      </dl>

      <div className="card-actions">
        <button className="secondary-button" type="button" onClick={() => onSelect(printer.name)}>
          <Check size={16} />
          Seleccionar
        </button>
        <button className="secondary-button" type="button" onClick={() => onPrintTest(printer.name)}>
          <Send size={16} />
          Prueba
        </button>
        <button className="icon-button" type="button" onClick={() => onDetails(printer)} title="Ver detalles">
          <Info size={17} />
        </button>
      </div>

      {selected && (
        <div className="selected-ribbon">
          <Printer size={15} />
          Impresora activa en GasPrint
        </div>
      )}
    </article>
  );
}