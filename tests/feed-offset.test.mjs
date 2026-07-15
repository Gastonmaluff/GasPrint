import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceiptHtml } from '../dist/main/printing/receiptHtml.js';
import { computePageHeightMm, mmToHundredths, xOffsetHundredths } from '../dist/main/printing/thermalMetrics.js';

function jobWith(overrides) {
  return {
    id: 'j',
    printerName: 'FTX TDR058U',
    type: 'test',
    origin: 'app',
    paperWidth: 58,
    paperWidthMm: 58,
    printableWidthMm: 49,
    leftOffsetMm: 0,
    rightMarginMm: 3,
    feedAfterPrintMm: 18,
    charactersPerLine: 30,
    feedLines: 5,
    lines: [
      { text: 'Linea 1', align: 'left', bold: false, size: 'normal' },
      { text: 'Linea 2', align: 'left', bold: false, size: 'normal' }
    ],
    createdAt: '',
    summary: '',
    ...overrides
  };
}

test('feed value changes the HTML feed height for identical content', () => {
  const h10 = buildReceiptHtml(jobWith({ feedAfterPrintMm: 10 }));
  const h20 = buildReceiptHtml(jobWith({ feedAfterPrintMm: 20 }));
  const h40 = buildReceiptHtml(jobWith({ feedAfterPrintMm: 40 }));
  assert.ok(h10.includes('.feed { height: 10mm'), 'feed 10mm expected');
  assert.ok(h20.includes('.feed { height: 20mm'), 'feed 20mm expected');
  assert.ok(h40.includes('.feed { height: 40mm'), 'feed 40mm expected');
});

test('computePageHeightMm: identical content, feed difference is exact', () => {
  const content = 120;
  assert.equal(computePageHeightMm(content, 40) - computePageHeightMm(content, 10), 30);
  assert.equal(computePageHeightMm(content, 20) - computePageHeightMm(content, 10), 10);
});

test('mmToHundredths converts correctly', () => {
  assert.equal(mmToHundredths(25.4), 100);
  assert.equal(mmToHundredths(0), 0);
});

test('left offset is applied exactly once in HTML and honours sign', () => {
  const html = buildReceiptHtml(jobWith({ leftOffsetMm: 1.5 }));
  const matches = html.match(/margin-left:\s*[-\d.]+mm/g) ?? [];
  assert.equal(matches.length, 1, 'exactly one margin-left declaration');
  assert.ok(matches[0].includes('1.5mm'), 'offset value applied once');

  // Negative offset moves left, positive moves right (sign preserved, not auto-altered).
  assert.equal(xOffsetHundredths(-1), -Math.round((1 / 25.4) * 100));
  assert.ok(xOffsetHundredths(1) > 0);
  assert.ok(xOffsetHundredths(-1) < 0);
});
