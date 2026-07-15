import test from 'node:test';
import assert from 'node:assert/strict';
import { stackBlocks } from '../dist/main/printing/thermalMetrics.js';
import { clampDecimal, sanitizePrinterProfile } from '../dist/shared/validation/printing.js';

test('stackBlocks never overlaps: nextTop >= previousBottom + spacing', () => {
  const heights = [12, 8, 20, 0, 15, 7];
  const spacing = 2;
  const stacked = stackBlocks(heights, spacing, 3);
  for (let i = 1; i < stacked.length; i += 1) {
    assert.ok(
      stacked[i].top >= stacked[i - 1].bottom + spacing,
      `block ${i} overlaps block ${i - 1}`
    );
  }
  // Each block's bottom is strictly its top + height (no shared coordinate).
  assert.equal(stacked[0].top, 3);
  assert.equal(stacked[0].bottom, 15);
  assert.equal(stacked[1].top, 17);
});

test('clampDecimal clamps and snaps to step', () => {
  assert.equal(clampDecimal(3.14, 0, 10, 0, 0.5), 3);
  assert.equal(clampDecimal(100, 0, 10, 0, 0.5), 10);
  assert.equal(clampDecimal(-100, -5, 5, 0, 0.5), -5);
  assert.equal(clampDecimal('not a number', 0, 10, 7, 0.5), 7);
});

test('printer profile persists mm fields (round-trip) and clamps out-of-range', () => {
  const input = {
    printerName: 'FTX TDR058U',
    paperWidth: 58,
    printableWidthMm: 49,
    leftOffsetMm: -1,
    rightMarginMm: 3,
    feedAfterPrintMm: 18,
    charactersPerLine: 30
  };
  const profile = sanitizePrinterProfile(input);
  assert.equal(profile.paperWidthMm, 58);
  assert.equal(profile.printableWidthMm, 49);
  assert.equal(profile.leftOffsetMm, -1);
  assert.equal(profile.rightMarginMm, 3);
  assert.equal(profile.feedAfterPrintMm, 18);
  assert.equal(profile.charactersPerLine, 30);
  assert.equal(typeof profile.updatedAt, 'string');

  // Out-of-range values are clamped, not accepted verbatim.
  const clamped = sanitizePrinterProfile({ printerName: 'X', leftOffsetMm: 999, feedAfterPrintMm: 999 });
  assert.ok(clamped.leftOffsetMm <= 5);
  assert.ok(clamped.feedAfterPrintMm <= 40);
});
