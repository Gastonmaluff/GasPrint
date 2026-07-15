import logoUrl from '../../assets/branding/gasprint-logo.svg';

/** Source SVG viewBox is 2508 x 627 (horizontal "Gasprint+" wordmark on purple). */
const LOGO_RATIO = 2508 / 627;

interface GasPrintLogoProps {
  /** Rendered height in px; width follows the original aspect ratio. */
  height?: number;
  className?: string;
  title?: string;
}

/**
 * Full horizontal GasPrint wordmark, rendered from the original vector asset.
 * The SVG is self-contained (its own purple background), so it sits on any surface.
 */
export function GasPrintLogo({ height = 34, className, title = 'GasPrint' }: GasPrintLogoProps) {
  return (
    <img
      src={logoUrl}
      alt={title}
      className={className ? `gp-logo ${className}` : 'gp-logo'}
      style={{ height, width: Math.round(height * LOGO_RATIO) }}
      draggable={false}
    />
  );
}

interface GasPrintMarkProps {
  /** Square side in px. */
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Compact square mark for tight spaces (collapsed sidebar, window/tray).
 * It reuses the original vector and frames the leftmost glyph (the "G") by cropping
 * the viewport — no geometry is edited or redrawn.
 */
export function GasPrintMark({ size = 36, className, title = 'GasPrint' }: GasPrintMarkProps) {
  return (
    <span
      className={className ? `gp-mark ${className}` : 'gp-mark'}
      style={{ width: size, height: size }}
      role="img"
      aria-label={title}
    >
      <img src={logoUrl} alt="" style={{ height: size, width: Math.round(size * LOGO_RATIO) }} draggable={false} />
    </span>
  );
}
