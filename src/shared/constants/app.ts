export const APP_NAME = 'GasPrint';
export const APP_VERSION = '0.1.0';
export const DEFAULT_API_PORT = 38472;

export const DEFAULT_SETTINGS = {
  selectedPrinterName: '',
  paperWidth: 58,
  charactersPerLine: 32,
  feedLines: 4,
  theme: 'dark',
  startWithWindows: false,
  minimizeToTray: true
} as const;

export const DEFAULT_LAB = {
  title: 'GASPRINT',
  body: 'Prueba de impresion correcta\n\nHola Mundo\n\nGasPrint esta funcionando.',
  align: 'left',
  bold: false,
  size: 'normal',
  includeSeparator: true,
  paperWidth: 58,
  charactersPerLine: 32,
  feedLines: 4
} as const;

export const FUTURE_LOCAL_API = {
  host: '127.0.0.1',
  suggestedPort: DEFAULT_API_PORT,
  printPath: '/api/v1/print'
} as const;

export const DEFAULT_API_SETTINGS = {
  enabled: true,
  port: DEFAULT_API_PORT,
  token: '',
  allowedOrigins: ['http://127.0.0.1:5173', 'http://localhost:5173'],
  lastClientOrigin: '',
  lastRequestAt: '',
  lastApiJobAt: ''
} as const;

export const DEFAULT_PRINTER_PROFILE = {
  paperWidth: 58,
  charactersPerLine: 32,
  marginLeftChars: 1,
  marginRightChars: 1,
  feedLines: 4
} as const;