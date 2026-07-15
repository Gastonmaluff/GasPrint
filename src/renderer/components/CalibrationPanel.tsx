import { useEffect, useMemo, useState } from 'react';
import { Printer, RotateCcw, Save } from 'lucide-react';
import { DEFAULT_PRINTER_PROFILE, FTX_PROFILE_NAME } from '../../shared/constants/app';
import type { PaperWidth, PrinterProfile } from '../../shared/types/printing';

interface CalibrationPanelProps {
  profiles: PrinterProfile[];
  printerName: string;
  busy?: boolean;
  onSaveProfile: (profile: PrinterProfile) => void;
  onPrintCalibration: (profile: PrinterProfile) => void;
}

type FormState = {
  paperWidthMm: number;
  printableWidthMm: number;
  leftOffsetMm: number;
  rightMarginMm: number;
  feedAfterPrintMm: number;
  charactersPerLine: number;
};

function baseProfile(printerName: string, profiles: PrinterProfile[]): PrinterProfile {
  const existing = profiles.find((item) => item.printerName === printerName);
  if (existing) {
    return existing;
  }
  return {
    ...DEFAULT_PRINTER_PROFILE,
    printerName: printerName || FTX_PROFILE_NAME
  };
}

function toForm(profile: PrinterProfile): FormState {
  return {
    paperWidthMm: profile.paperWidthMm ?? profile.paperWidth ?? 58,
    printableWidthMm: profile.printableWidthMm ?? 49,
    leftOffsetMm: profile.leftOffsetMm ?? 0,
    rightMarginMm: profile.rightMarginMm ?? 3,
    feedAfterPrintMm: profile.feedAfterPrintMm ?? 18,
    charactersPerLine: profile.charactersPerLine ?? 30
  };
}

/**
 * Physical thermal-calibration panel, reimplemented as a controlled React component.
 * (The compiled build injected this UI into the DOM from preload; here it lives in the renderer.)
 */
export function CalibrationPanel({ profiles, printerName, busy, onSaveProfile, onPrintCalibration }: CalibrationPanelProps) {
  const base = useMemo(() => baseProfile(printerName, profiles), [printerName, profiles]);
  const [form, setForm] = useState<FormState>(() => toForm(base));
  const [message, setMessage] = useState('');

  // Reset the form whenever the target printer (or its stored profile) changes.
  useEffect(() => {
    setForm(toForm(base));
    setMessage('');
  }, [base]);

  function buildProfile(): PrinterProfile {
    const paperWidthMm = form.paperWidthMm;
    const paperWidth: PaperWidth = paperWidthMm >= 80 ? 80 : 58;
    return {
      ...base,
      printerName: printerName || base.printerName,
      paperWidth,
      paperWidthMm,
      printableWidthMm: form.printableWidthMm,
      leftOffsetMm: form.leftOffsetMm,
      rightMarginMm: form.rightMarginMm,
      feedAfterPrintMm: form.feedAfterPrintMm,
      charactersPerLine: form.charactersPerLine,
      updatedAt: new Date().toISOString()
    };
  }

  function update<K extends keyof FormState>(key: K, value: string) {
    const numeric = Number(value);
    setForm((current) => ({ ...current, [key]: Number.isFinite(numeric) ? numeric : current[key] }));
  }

  const disabled = !printerName || busy;

  return (
    <section className="settings-panel">
      <h2>Calibracion de impresion</h2>
      <p className="muted-text">
        Ajustes fisicos por impresora, en milimetros. El desplazamiento horizontal negativo mueve hacia la izquierda; el
        positivo, hacia la derecha.
      </p>

      <div className="field-grid two">
        <label>
          Impresora
          <input readOnly value={printerName || 'Sin impresora seleccionada'} />
        </label>
        <label>
          Ancho de papel (mm)
          <input
            type="number"
            step={1}
            min={58}
            max={80}
            value={form.paperWidthMm}
            onChange={(event) => update('paperWidthMm', event.target.value)}
          />
        </label>
      </div>

      <div className="field-grid three">
        <label>
          Ancho util (mm)
          <input
            type="number"
            step={0.5}
            min={35}
            max={80}
            value={form.printableWidthMm}
            onChange={(event) => update('printableWidthMm', event.target.value)}
          />
        </label>
        <label>
          Desplazamiento horizontal (mm)
          <input
            type="number"
            step={0.5}
            min={-5}
            max={5}
            value={form.leftOffsetMm}
            onChange={(event) => update('leftOffsetMm', event.target.value)}
          />
        </label>
        <label>
          Margen derecho (mm)
          <input
            type="number"
            step={0.5}
            min={0}
            max={10}
            value={form.rightMarginMm}
            onChange={(event) => update('rightMarginMm', event.target.value)}
          />
        </label>
      </div>

      <div className="field-grid two">
        <label>
          Avance final (mm)
          <input
            type="number"
            step={0.5}
            min={0}
            max={40}
            value={form.feedAfterPrintMm}
            onChange={(event) => update('feedAfterPrintMm', event.target.value)}
          />
        </label>
        <label>
          Caracteres por linea
          <input
            type="number"
            step={1}
            min={20}
            max={64}
            value={form.charactersPerLine}
            onChange={(event) => update('charactersPerLine', event.target.value)}
          />
        </label>
      </div>

      <div className="quick-actions">
        <button
          className="primary-button"
          type="button"
          disabled={disabled}
          onClick={() => {
            onPrintCalibration(buildProfile());
            setMessage('Ticket de calibracion enviado con los valores actuales.');
          }}
        >
          <Printer size={18} />
          Imprimir calibracion
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={disabled}
          onClick={() => {
            onSaveProfile(buildProfile());
            setMessage('Perfil guardado.');
          }}
        >
          <Save size={18} />
          Guardar
        </button>
        <button
          className="danger-button"
          type="button"
          disabled={disabled}
          onClick={() => {
            const reset: PrinterProfile = {
              ...DEFAULT_PRINTER_PROFILE,
              printerName: printerName || base.printerName,
              feedLines: 5,
              updatedAt: new Date().toISOString()
            };
            setForm(toForm(reset));
            onSaveProfile(reset);
            setMessage('Perfil restablecido a los valores de referencia.');
          }}
        >
          <RotateCcw size={18} />
          Restablecer perfil
        </button>
      </div>
      {message && <p className="muted-text">{message}</p>}
    </section>
  );
}
