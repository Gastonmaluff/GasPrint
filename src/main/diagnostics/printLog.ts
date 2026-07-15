import type { PrintJob, PrintResult, PrinterProfile } from '../../shared/types/printing.js';

/**
 * Structured technical logging for tracing a print job end-to-end.
 * Enabled only when the GASPRINT_DEBUG environment variable is truthy, so it is
 * inert in normal operation but available when diagnosing the physical bugs.
 */
export function isPrintDebugEnabled(): boolean {
  const value = process.env.GASPRINT_DEBUG;
  return value === '1' || value === 'true' || value === 'yes';
}

export interface PrintTraceStart {
  jobId: string;
  template: PrintJob['type'];
  source: PrintJob['origin'];
  printerName: string;
  requestedProfile: {
    paperWidthMm?: number;
    printableWidthMm?: number;
    leftOffsetMm?: number;
    rightMarginMm?: number;
    feedAfterPrintMm?: number;
    charactersPerLine?: number;
  };
  effectiveProfile?: PrinterProfile;
  blockCount: number;
  requestedFeedAfterPrintMm?: number;
}

export function logPrintStart(trace: PrintTraceStart): void {
  if (!isPrintDebugEnabled()) {
    return;
  }
  console.log('[gasprint:print:start]', JSON.stringify(trace));
}

export interface PrintTraceEnd {
  jobId: string;
  engineRequested: 'electron';
  engineUsed: PrintResult['engine'];
  fallbackUsed: boolean;
  spoolerAcknowledged: boolean;
  printAttemptCount: number;
  durationMs: number;
  status: PrintResult['status'];
}

export function logPrintEnd(trace: PrintTraceEnd): void {
  if (!isPrintDebugEnabled()) {
    return;
  }
  console.log('[gasprint:print:end]', JSON.stringify(trace));
}
