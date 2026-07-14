import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { APP_NAME, APP_VERSION } from '../../shared/constants/app.js';
import type { DataStore } from '../storage/dataStore.js';
import type { PrintEngine } from '../printing/printEngine.js';
import type { PaperWidth, PrintJob, ReceiptLine, TextAlign, TextSize } from '../../shared/types/printing.js';
import { clampInteger, isPaperWidth, sanitizePrinterName, sanitizeText, summarizeLines } from '../../shared/validation/printing.js';
import { printAndRecord } from '../printing/printCoordinator.js';

const BODY_LIMIT_BYTES = 32 * 1024;
const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const MAX_LINES = 80;
const MAX_TEXT_LENGTH = 500;

interface RateRecord {
  count: number;
  resetAt: number;
}

export class LocalApiServer {
  private server: Server | null = null;
  private activePort = 0;
  private readonly rate = new Map<string, RateRecord>();

  constructor(
    private readonly store: DataStore,
    private readonly engine: PrintEngine
  ) {}

  getStatus(): { active: boolean; port: number } {
    return {
      active: Boolean(this.server?.listening),
      port: this.activePort
    };
  }

  async start(): Promise<void> {
    const data = await this.store.getData();
    if (!data.api.enabled) {
      return;
    }
    if (this.server?.listening && this.activePort === data.api.port) {
      return;
    }
    await this.stop();

    this.server = createServer((request, response) => {
      void this.handle(request, response);
    });
    this.server.requestTimeout = REQUEST_TIMEOUT_MS;

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(data.api.port, '127.0.0.1', () => {
        this.server?.off('error', reject);
        this.activePort = data.api.port;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      this.activePort = 0;
      return;
    }

    const server = this.server;
    this.server = null;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    this.activePort = 0;
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);

    try {
      const data = await this.store.getData();
      const origin = getOrigin(request);
      if (!applyCors(request, response, origin, data.api.allowedOrigins)) {
        sendJson(response, 403, { error: 'Origen no permitido.', requestId });
        return;
      }

      if (request.method === 'OPTIONS') {
        response.statusCode = 204;
        response.end();
        return;
      }

      if (!this.consumeRate(origin || request.socket.remoteAddress || 'local')) {
        sendJson(response, 429, { error: 'Demasiadas solicitudes.', requestId });
        return;
      }

      const url = new URL(request.url || '/', `http://127.0.0.1:${data.api.port}`);
      if (!['GET', 'POST'].includes(request.method || '')) {
        sendJson(response, 405, { error: 'Metodo no admitido.', requestId });
        return;
      }

      if (!isAuthorized(request, data.api.token)) {
        sendJson(response, 401, { error: 'Token invalido o ausente.', requestId });
        return;
      }

      await this.store.touchApiClient(origin || 'local', false);

      if (request.method === 'GET' && url.pathname === '/api/v1/health') {
        await this.handleHealth(response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/printers') {
        await this.handlePrinters(response);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/print') {
        await this.handlePrint(request, response, requestId, origin || 'local');
        return;
      }

      sendJson(response, 404, { error: 'Endpoint no encontrado.', requestId });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Error interno.',
        requestId
      }, error instanceof ApiError ? error.status : 500);
    }
  }

  private async handleHealth(response: ServerResponse): Promise<void> {
    const data = await this.store.getData();
    const printers = await this.engine.listPrinters();
    sendJson(response, 200, {
      status: 'ok',
      app: APP_NAME,
      version: APP_VERSION,
      now: new Date().toISOString(),
      serviceActive: this.getStatus().active,
      port: this.activePort || data.api.port,
      printerCount: printers.length,
      selectedPrinter: data.settings.selectedPrinterName
    });
  }

  private async handlePrinters(response: ServerResponse): Promise<void> {
    const printers = await this.engine.listPrinters();
    sendJson(response, 200, { printers });
  }

  private async handlePrint(request: IncomingMessage, response: ServerResponse, requestId: string, origin: string): Promise<void> {
    const body = await readJsonBody(request);
    const job = parseApiPrintPayload(body);
    await this.store.touchApiClient(origin, true);
    try {
      const result = await printAndRecord(this.store, this.engine, job, { requestId, clientOrigin: origin });
      sendJson(response, result.status === 'sent' ? 202 : 500, { requestId, result });
    } catch (error) {
      sendJson(response, 400, { requestId, error: error instanceof Error ? error.message : 'Trabajo rechazado.' });
    }
  }

  private consumeRate(key: string): boolean {
    const now = Date.now();
    const current = this.rate.get(key);
    if (!current || current.resetAt <= now) {
      this.rate.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }
    current.count += 1;
    return current.count <= RATE_LIMIT_MAX;
  }
}

function parseApiPrintPayload(value: unknown): PrintJob {
  const object = expectObject(value, ['printer', 'type', 'paperWidth', 'source', 'content']);
  if (object.type !== 'receipt') {
    throw new ApiError(400, 'Tipo de trabajo no permitido.');
  }

  const printerName = sanitizePrinterName(object.printer);
  if (!printerName) {
    throw new ApiError(400, 'Nombre de impresora invalido.');
  }
  if (!isPaperWidth(object.paperWidth)) {
    throw new ApiError(400, 'Ancho de papel no permitido.');
  }

  const source = sanitizeText(object.source, 80) || 'api';
  const content = expectObject(object.content, ['title', 'lines', 'feedLines']);
  const title = sanitizeText(content.title, 120);
  if (!Array.isArray(content.lines) || content.lines.length === 0 || content.lines.length > MAX_LINES) {
    throw new ApiError(400, 'Cantidad de lineas invalida.');
  }

  const lines: ReceiptLine[] = [];
  if (title) {
    lines.push({ text: title, align: 'center', bold: true, size: 'normal' });
  }

  content.lines.forEach((line) => {
    const parsed = parseApiLine(line);
    if (parsed.text.trim() || parsed.separator) {
      lines.push(parsed);
    }
  });

  if (lines.length === 0) {
    throw new ApiError(400, 'Contenido vacio.');
  }

  const feedLines = clampInteger(content.feedLines, 0, 10, 4);
  const paperWidth = object.paperWidth as PaperWidth;
  return {
    id: `api-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
    printerName,
    type: 'external',
    origin: 'api',
    paperWidth,
    charactersPerLine: paperWidth === 58 ? 30 : 42,
    feedLines,
    lines,
    createdAt: new Date().toISOString(),
    summary: `${source}: ${summarizeLines(lines)}`
  };
}

function parseApiLine(value: unknown): ReceiptLine {
  const object = expectObject(value, ['text', 'align', 'bold', 'size', 'separator']);
  const align = parseEnum<TextAlign>(object.align, ['left', 'center', 'right'], 'left');
  const size = parseEnum<TextSize>(object.size, ['normal', 'large', 'double'], 'normal');
  return {
    text: sanitizeText(object.text, MAX_TEXT_LENGTH),
    align,
    bold: Boolean(object.bold),
    size,
    separator: Boolean(object.separator)
  };
}

function expectObject(value: unknown, allowedKeys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'Payload invalido.');
  }
  const object = value as Record<string, unknown>;
  const unexpected = Object.keys(object).filter((key) => !allowedKeys.includes(key));
  if (unexpected.length > 0) {
    throw new ApiError(400, `Propiedades inesperadas: ${unexpected.join(', ')}`);
  }
  return object;
}

function parseEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  if (typeof value === 'undefined') {
    return fallback;
  }
  if (typeof value === 'string' && allowed.includes(value as T)) {
    return value as T;
  }
  throw new ApiError(400, 'Valor no permitido en payload.');
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > BODY_LIMIT_BYTES) {
      throw new ApiError(413, 'Body demasiado grande.');
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    throw new ApiError(400, 'Body vacio.');
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, 'JSON invalido.');
  }
}

function getOrigin(request: IncomingMessage): string {
  const origin = request.headers.origin;
  return typeof origin === 'string' ? origin : '';
}

function applyCors(request: IncomingMessage, response: ServerResponse, origin: string, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true;
  }
  if (!allowedOrigins.includes(origin)) {
    return false;
  }
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Max-Age', '600');
  return request.method !== 'OPTIONS' || true;
}

function isAuthorized(request: IncomingMessage, token: string): boolean {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return false;
  }
  const received = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function sendJson(response: ServerResponse, status: number, payload: unknown, overrideStatus?: number): void {
  if (typeof overrideStatus === 'number') {
    status = overrideStatus;
  }
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}