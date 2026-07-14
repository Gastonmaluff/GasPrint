import type { PrintJob, PrintResult, PrinterInfo } from '../../shared/types/printing.js';
import type { PrintEngine } from './printEngine.js';

export class EscPosPrintEngine implements PrintEngine {
  async listPrinters(): Promise<PrinterInfo[]> {
    return [];
  }

  async print(job: PrintJob): Promise<PrintResult> {
    return {
      jobId: job.id,
      status: 'error',
      message: 'El motor ESC/POS directo esta reservado para una etapa posterior.',
      durationMs: 0,
      spoolerAcknowledged: false,
      physicallyConfirmed: false,
      engine: 'none',
      electronAttempted: false,
      fallbackUsed: false,
      technicalMessage: 'EscPosPrintEngine no implementado en la version 0.1.0.'
    };
  }
}