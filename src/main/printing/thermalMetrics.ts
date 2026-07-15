/**
 * Pure geometry helpers for thermal printing (no Electron / no I/O), so they can be
 * unit-tested directly. The PowerShell/.NET spooler consumes the values produced here.
 */

/** Convert millimetres to hundredths of an inch (the unit used by System.Drawing.Printing). */
export function mmToHundredths(mm: number): number {
  return Math.round((mm / 25.4) * 100);
}

/**
 * Horizontal offset in hundredths of an inch. Applied exactly once by the engine.
 * Negative moves left, positive moves right.
 */
export function xOffsetHundredths(leftOffsetMm: number): number {
  return mmToHundredths(leftOffsetMm);
}

/**
 * Physical page height in millimetres: printed content plus the requested final feed.
 * Identical content with a larger feed yields a proportionally longer page.
 */
export function computePageHeightMm(contentHeightMm: number, feedAfterPrintMm: number): number {
  const content = Number.isFinite(contentHeightMm) ? Math.max(0, contentHeightMm) : 0;
  const feed = Number.isFinite(feedAfterPrintMm) ? Math.max(0, feedAfterPrintMm) : 0;
  return content + feed;
}

export interface StackedBlock {
  top: number;
  bottom: number;
}

/**
 * Stack blocks vertically so that each block starts at the previous block's bottom plus
 * `spacing`. Guarantees no two consecutive blocks share vertical space (no overlap).
 */
export function stackBlocks(heights: number[], spacing: number, top = 0): StackedBlock[] {
  const result: StackedBlock[] = [];
  let cursor = top;
  for (const rawHeight of heights) {
    const height = Number.isFinite(rawHeight) ? Math.max(0, rawHeight) : 0;
    const blockTop = cursor;
    const blockBottom = blockTop + height;
    result.push({ top: blockTop, bottom: blockBottom });
    cursor = blockBottom + spacing;
  }
  return result;
}
