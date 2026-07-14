import { BrowserWindow, type WebContents, type WebContentsPrintOptions } from 'electron';
import type { PrintJob, PrintResult, PrinterInfo, PrinterProfile } from '../../shared/types/printing.js';
import { classifyPrinter, describeStatus } from './printerClassifier.js';
import type { PrintEngine } from './printEngine.js';
import { buildReceiptHtml } from './receiptHtml.js';
import { applyThermalLayout } from './thermalLayout.js';
import { printWithWindowsSpooler } from './windowsPowerShellSpooler.js';

interface ElectronPrinterLike {
  name: string;
  displayName?: string;
  description?: string;
  status?: number;
  isDefault?: boolean;
}

export class WindowsPrintEngine implements PrintEngine {
  private profiles: PrinterProfile[] = [];

  constructor(private readonly getHostWebContents: () => WebContents | null) {}

  setProfiles(profiles: PrinterProfile[]): void {
    this.profiles = profiles;
  }

  async listPrinters(): Promise<PrinterInfo[]> {
    const host = this.getHostWebContents();
    if (!host) {
      return [];
    }

    const checkedAt = new Date().toISOString();
    const printers = (await host.getPrintersAsync()) as ElectronPrinterLike[];
    return printers.map((printer) => mapPrinter(printer, checkedAt));
  }

  async print(job: PrintJob): Promise<PrintResult> {
    const startedAt = Date.now();
    const { job: laidOutJob } = applyThermalLayout(job, this.profiles);
    const html = buildReceiptHtml(laidOutJob);
    const printWindow = new BrowserWindow({
      width: 420,
      height: 640,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    try {
      await printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
      const engine = await printWithFallbacks(printWindow, laidOutJob);

      return {
        jobId: job.id,
        status: 'sent',
        message: 'Trabajo enviado al sistema de impresion de Windows. La confirmacion fisica no esta disponible.',
        durationMs: Date.now() - startedAt,
        spoolerAcknowledged: true,
        physicallyConfirmed: false,
        engine,
        electronAttempted: true,
        fallbackUsed: engine === 'windows-spooler'
      };
    } catch (error) {
      return {
        jobId: job.id,
        status: 'error',
        message: 'No se pudo enviar el trabajo al sistema de impresion.',
        durationMs: Date.now() - startedAt,
        spoolerAcknowledged: false,
        physicallyConfirmed: false,
        engine: 'none',
        electronAttempted: true,
        fallbackUsed: false,
        technicalMessage: error instanceof Error ? error.message : String(error)
      };
    } finally {
      if (!printWindow.isDestroyed()) {
        printWindow.close();
      }
    }
  }
}

async function printWithFallbacks(printWindow: BrowserWindow, job: PrintJob): Promise<PrintResult['engine']> {
  const baseOptions = {
    silent: true,
    deviceName: job.printerName
  } satisfies WebContentsPrintOptions;

  const attempts: WebContentsPrintOptions[] = [
    { ...baseOptions, printBackground: true, usePrinterDefaultPageSize: true },
    { ...baseOptions, printBackground: true },
    { ...baseOptions, printBackground: false },
    {
      ...baseOptions,
      printBackground: false,
      pageSize: { width: job.paperWidth * 1000, height: 200000 }
    }
  ];

  const failures: string[] = [];
  for (const options of attempts) {
    try {
      await printOnce(printWindow, options);
      return 'electron';
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  try {
    await printWithWindowsSpooler(job);
    return 'windows-spooler';
  } catch (error) {
    failures.push(`PowerShell spooler: ${error instanceof Error ? error.message : String(error)}`);
  }

  throw new Error(failures.join(' | '));
}

async function printOnce(printWindow: BrowserWindow, options: WebContentsPrintOptions): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    printWindow.webContents.print(options, (success, failureReason) => {
      if (success) {
        resolve();
        return;
      }
      reject(new Error(failureReason || 'Windows no acepto el trabajo de impresion.'));
    });
  });
}

function mapPrinter(printer: ElectronPrinterLike, checkedAt: string): PrinterInfo {
  const name = printer.name;
  const displayName = printer.displayName || printer.name;
  const description = printer.description || '';
  const rawStatus = typeof printer.status === 'number' ? printer.status : undefined;
  const { status, availability } = describeStatus(rawStatus);
  const classification = classifyPrinter(name, description);

  return {
    name,
    displayName,
    description,
    isDefault: Boolean(printer.isDefault),
    status,
    rawStatus,
    kind: classification.kind,
    availability,
    source: 'windows',
    lastCheckedAt: checkedAt,
    reasons: classification.reasons
  };
}