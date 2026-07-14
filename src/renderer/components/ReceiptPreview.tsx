import type { LabState, ReceiptLine } from '../../shared/types/printing';
import { buildLabLines } from '../services/gasPrintApi';

interface ReceiptPreviewProps {
  lab: LabState;
}

export function ReceiptPreview({ lab }: ReceiptPreviewProps) {
  const lines = buildLabLines(lab);
  return (
    <section className="preview-panel">
      <div className="section-heading">
        <div>
          <h2>Vista previa</h2>
          <p>Aproximada; puede variar segun driver, fuente y firmware.</p>
        </div>
      </div>
      <div className="receipt-preview" style={{ maxWidth: lab.paperWidth === 58 ? 300 : 380 }}>
        {lines.map((line, index) => (
          <PreviewLine key={`${line.text}-${index}`} line={line} charactersPerLine={lab.charactersPerLine} />
        ))}
        {Array.from({ length: lab.feedLines }).map((_, index) => (
          <div key={`feed-${index}`} className="preview-feed">&nbsp;</div>
        ))}
      </div>
    </section>
  );
}

function PreviewLine({ line, charactersPerLine }: { line: ReceiptLine; charactersPerLine: number }) {
  const text = line.separator ? '='.repeat(charactersPerLine) : line.text || ' ';
  const classes = ['preview-line', line.align, line.bold ? 'bold' : '', line.size !== 'normal' ? line.size : '']
    .filter(Boolean)
    .join(' ');
  return <div className={classes}>{text}</div>;
}