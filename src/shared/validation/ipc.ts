import type { LabState, PrinterProfile, PrintJob } from '../types/printing.js';
import { sanitizeLabState, sanitizePrinterName, sanitizePrinterProfile, validatePrintJob } from './printing.js';

export function parsePrinterName(value: unknown): string {
  const printerName = sanitizePrinterName(value);
  if (!printerName) {
    throw new Error('Debe seleccionar una impresora.');
  }
  return printerName;
}

export function parseLabState(value: unknown): LabState {
  if (!value || typeof value !== 'object') {
    throw new Error('Estado de laboratorio invalido.');
  }
  return sanitizeLabState(value as Partial<LabState>);
}

export function parsePrintJob(value: unknown): PrintJob {
  if (!value || typeof value !== 'object') {
    throw new Error('Trabajo de impresion invalido.');
  }
  return validatePrintJob(value as Partial<PrintJob>);
}

export function parsePrinterProfile(value: unknown): PrinterProfile {
  if (!value || typeof value !== 'object') {
    throw new Error('Perfil de impresora invalido.');
  }
  return sanitizePrinterProfile(value as Partial<PrinterProfile>);
}