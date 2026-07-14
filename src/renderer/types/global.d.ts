import type { GasPrintApi } from '../../shared/types/ipc';

declare global {
  interface Window {
    gasPrint: GasPrintApi;
  }
}

export {};