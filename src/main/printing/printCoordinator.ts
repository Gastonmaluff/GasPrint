import type { DataStore } from '../storage/dataStore.js';
import type { PrintEngine } from './printEngine.js';
import type { PrintHistoryEntry, PrintJob, PrintResult } from '../../shared/types/printing.js';

export interface PrintContext {
  requestId?: string;
  clientOrigin?: string;
}

export async function printAndRecord(store: DataStore, engine: PrintEngine, job: PrintJob, context: PrintContext = {}): Promise<PrintResult> {
  const data = await store.getData();
  engine.setProfiles?.(data.printerProfiles);

  const printers = await engine.listPrinters();
  if (!printers.some((printer) => printer.name === job.printerName)) {
    throw new Error(`La impresora no existe o no esta disponible en Windows: ${job.printerName}`);
  }

  const effectiveProfile = data.printerProfiles.find((profile) => profile.printerName === job.printerName);
  const pendingEntry: PrintHistoryEntry = {
    id: job.id,
    createdAt: job.createdAt,
    printerName: job.printerName,
    type: job.type,
    origin: job.origin,
    status: 'pending',
    technicalMessage: 'Trabajo creado y pendiente de envio al spooler de Windows.',
    summary: job.summary,
    requestId: context.requestId,
    clientOrigin: context.clientOrigin,
    job,
    requestedProfile: {
      paperWidthMm: job.paperWidthMm ?? job.paperWidth,
      printableWidthMm: job.printableWidthMm,
      leftOffsetMm: job.leftOffsetMm,
      rightMarginMm: job.rightMarginMm,
      feedAfterPrintMm: job.feedAfterPrintMm,
      charactersPerLine: job.charactersPerLine
    },
    effectiveProfile
  };

  await store.addHistory(pendingEntry);
  const result = await engine.print(job);
  const completedAt = new Date().toISOString();
  await store.updateHistory({
    ...pendingEntry,
    completedAt,
    status: result.status === 'sent' ? 'sent' : 'error',
    durationMs: result.durationMs,
    technicalMessage: result.technicalMessage ?? result.message,
    engine: result.engine,
    electronAttempted: result.electronAttempted,
    fallbackUsed: result.fallbackUsed,
    spoolerAcknowledged: result.spoolerAcknowledged
  });

  return result;
}