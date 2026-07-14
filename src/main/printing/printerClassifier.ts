import type { PrinterAvailability, PrinterKind } from '../../shared/types/printing.js';

const VIRTUAL_MARKERS = [
  'pdf',
  'xps',
  'onenote',
  'fax',
  'send to',
  'document writer',
  'snagit',
  'adobe',
  'nitro',
  'cute',
  'doPDF'.toLowerCase()
];

const PHYSICAL_HINTS = ['usb', 'epson', 'star', 'bixolon', 'zebra', 'ftx', 'tdr', 'pos', 'thermal', 'receipt'];

export function classifyPrinter(name: string, description: string): { kind: PrinterKind; reasons: string[] } {
  const haystack = `${name} ${description}`.toLowerCase();
  const virtualHit = VIRTUAL_MARKERS.find((marker) => haystack.includes(marker));
  if (virtualHit) {
    return { kind: 'virtual', reasons: [`Coincide con marcador virtual: ${virtualHit}`] };
  }

  const physicalHit = PHYSICAL_HINTS.find((marker) => haystack.includes(marker));
  if (physicalHit) {
    return { kind: 'physical', reasons: [`Coincide con marcador fisico: ${physicalHit}`] };
  }

  return { kind: 'unknown', reasons: ['Windows no informa suficiente informacion para clasificarla con certeza'] };
}

export function describeStatus(rawStatus?: number): { status: string; availability: PrinterAvailability } {
  if (typeof rawStatus !== 'number') {
    return { status: 'Estado no informado', availability: 'unknown' };
  }

  if (rawStatus === 0) {
    return { status: 'Estado no informado', availability: 'unknown' };
  }

  const flags: string[] = [];
  if (rawStatus & 0x00000002) flags.push('Error');
  if (rawStatus & 0x00000080) flags.push('Sin conexion');
  if (rawStatus & 0x00000400) flags.push('Imprimiendo');
  if (rawStatus & 0x00002000) flags.push('Puerta abierta');
  if (rawStatus & 0x00000010) flags.push('Sin papel');
  if (rawStatus & 0x00000020) flags.push('Intervencion requerida');
  if (rawStatus & 0x00000040) flags.push('Problema de papel');
  if (rawStatus & 0x00000200) flags.push('Ocupada');

  if (flags.length === 0) {
    return { status: `Estado Windows ${rawStatus}`, availability: 'unknown' };
  }

  const availability = flags.some((flag) => ['Error', 'Sin conexion', 'Sin papel', 'Intervencion requerida'].includes(flag))
    ? 'error'
    : 'unknown';

  return { status: flags.join(', '), availability };
}