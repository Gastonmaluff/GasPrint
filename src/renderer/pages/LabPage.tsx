import { Eraser, FileText, Send } from 'lucide-react';
import type { LabState, PaperWidth, PrinterInfo, TextAlign, TextSize } from '../../shared/types/printing';
import { ReceiptPreview } from '../components/ReceiptPreview';

interface LabPageProps {
  lab: LabState;
  printers: PrinterInfo[];
  selectedPrinterName: string;
  onLabChange: (lab: LabState) => void;
  onPrinterChange: (name: string) => void;
  onPrint: () => void;
}

const exampleBody = `Prueba de impresion correcta

Impresora: [nombre]
Fecha: [fecha]
Hora: [hora]

Hola Mundo

GasPrint esta funcionando.`;

export function LabPage({ lab, printers, selectedPrinterName, onLabChange, onPrinterChange, onPrint }: LabPageProps) {
  const update = (partial: Partial<LabState>) => onLabChange({ ...lab, ...partial });

  return (
    <div className="lab-layout">
      <section className="lab-panel">
        <div className="section-heading">
          <div>
            <h1>Laboratorio</h1>
            <p>Construye una prueba real y enviala a una impresora de Windows sin abrir el dialogo del sistema.</p>
          </div>
        </div>

        <div className="field-grid two">
          <label>
            Impresora
            <select value={selectedPrinterName} onChange={(event) => onPrinterChange(event.target.value)}>
              <option value="">Seleccionar</option>
              {printers.map((printer) => (
                <option key={printer.name} value={printer.name}>{printer.displayName}</option>
              ))}
            </select>
          </label>
          <label>
            Titulo
            <input value={lab.title} onChange={(event) => update({ title: event.target.value })} />
          </label>
        </div>

        <label className="full-field">
          Texto
          <textarea value={lab.body} onChange={(event) => update({ body: event.target.value })} rows={10} />
        </label>

        <div className="control-row">
          <div className="segmented">
            {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
              <button key={align} className={lab.align === align ? 'active' : ''} type="button" onClick={() => update({ align })}>
                {align}
              </button>
            ))}
          </div>
          <label className="toggle">
            <input type="checkbox" checked={lab.bold} onChange={(event) => update({ bold: event.target.checked })} />
            Negrita
          </label>
          <label className="toggle">
            <input type="checkbox" checked={lab.includeSeparator} onChange={(event) => update({ includeSeparator: event.target.checked })} />
            Separador
          </label>
        </div>

        <div className="field-grid four">
          <label>
            Tamano
            <select value={lab.size} onChange={(event) => update({ size: event.target.value as TextSize })}>
              <option value="normal">Normal</option>
              <option value="large">Grande</option>
              <option value="double">Doble</option>
            </select>
          </label>
          <label>
            Papel
            <select
              value={lab.paperWidth}
              onChange={(event) => {
                const paperWidth = Number(event.target.value) as PaperWidth;
                update({ paperWidth, charactersPerLine: paperWidth === 58 ? 32 : 42 });
              }}
            >
              <option value={58}>58 mm</option>
              <option value={80}>80 mm</option>
            </select>
          </label>
          <label>
            Caracteres
            <input
              type="number"
              min={24}
              max={64}
              value={lab.charactersPerLine}
              onChange={(event) => update({ charactersPerLine: Number(event.target.value) })}
            />
          </label>
          <label>
            Lineas finales
            <input
              type="number"
              min={0}
              max={10}
              value={lab.feedLines}
              onChange={(event) => update({ feedLines: Number(event.target.value) })}
            />
          </label>
        </div>

        <div className="quick-actions">
          <button className="primary-button" type="button" onClick={onPrint} disabled={!selectedPrinterName}>
            <Send size={18} />
            Imprimir
          </button>
          <button className="secondary-button" type="button" onClick={() => update({ title: '', body: '' })}>
            <Eraser size={18} />
            Limpiar
          </button>
          <button className="secondary-button" type="button" onClick={() => update({ title: 'GASPRINT', body: exampleBody, align: 'left', bold: false, size: 'normal', includeSeparator: true })}>
            <FileText size={18} />
            Cargar ejemplo
          </button>
        </div>
      </section>

      <ReceiptPreview lab={lab} />
    </div>
  );
}