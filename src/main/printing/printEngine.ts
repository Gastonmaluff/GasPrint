import type { PrintJob, PrintResult, PrinterInfo, PrinterProfile } from '../../shared/types/printing.js';

export interface PrintEngine {
  listPrinters(): Promise<PrinterInfo[]>;
  print(job: PrintJob): Promise<PrintResult>;
  setProfiles?(profiles: PrinterProfile[]): void;
}