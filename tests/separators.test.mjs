import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestJob, createCalibrationJob } from '../dist/main/printing/jobFactory.js';
import { buildReceiptHtml } from '../dist/main/printing/receiptHtml.js';
import { applyThermalLayout } from '../dist/main/printing/thermalLayout.js';

const FTX = {
  printerName: 'FTX TDR058U',
  paperWidth: 58,
  paperWidthMm: 58,
  printableWidthMm: 49,
  leftOffsetMm: -1,
  rightMarginMm: 3,
  feedAfterPrintMm: 18,
  charactersPerLine: 30,
  marginLeftChars: 0,
  marginRightChars: 1,
  feedLines: 5,
  updatedAt: ''
};

test('separators are semantic blocks, not strings of "="', () => {
  for (const job of [createTestJob('FTX TDR058U', 30, 5), createCalibrationJob('FTX TDR058U', FTX)]) {
    const separators = job.lines.filter((line) => line.separator === true);
    assert.ok(separators.length > 0, 'expected at least one separator block');
    for (const sep of separators) {
      assert.equal(sep.text, '', 'separator block must carry no text');
    }
    // No line should be a run of repeated "=" or "-" characters.
    for (const line of job.lines) {
      assert.ok(!/^[=]{4,}$/.test(line.text), `unexpected "=" run: ${line.text}`);
      assert.ok(!/^[-]{4,}$/.test(line.text), `unexpected "-" run: ${line.text}`);
    }
  }
});

test('thermalLayout keeps separators as blocks (never expands to "=")', () => {
  const job = createTestJob('FTX TDR058U', 30, 5);
  const { job: laidOut } = applyThermalLayout(job, [FTX]);
  const separators = laidOut.lines.filter((line) => line.separator === true);
  assert.ok(separators.length > 0);
  for (const sep of separators) {
    assert.equal(sep.text, '');
  }
});

test('one separator block renders exactly one physical rule in HTML', () => {
  const job = createCalibrationJob('FTX TDR058U', FTX);
  const html = buildReceiptHtml(job);
  const separatorCount = job.lines.filter((line) => line.separator === true).length;
  const sepDivs = (html.match(/class="sep"/g) ?? []).length;
  assert.equal(sepDivs, separatorCount, 'one <div class="sep"> per separator block');
  assert.ok(!/={4,}/.test(html), 'HTML must not contain a run of "=" characters');
});
