import type { PrinterAvailability, PrinterKind } from '../../shared/types/printing';

interface StatusPillProps {
  label: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
}

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return <span className={`pill ${tone}`}>{label}</span>;
}

export function printerKindLabel(kind: PrinterKind): string {
  if (kind === 'physical') return 'Fisica probable';
  if (kind === 'virtual') return 'Virtual';
  return 'No clasificada';
}

export function availabilityTone(availability: PrinterAvailability): StatusPillProps['tone'] {
  if (availability === 'available') return 'good';
  if (availability === 'error' || availability === 'offline') return 'bad';
  return 'neutral';
}