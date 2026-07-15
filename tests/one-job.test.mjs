import test from 'node:test';
import assert from 'node:assert/strict';
import { printAndRecord } from '../dist/main/printing/printCoordinator.js';
import { createTestJob } from '../dist/main/printing/jobFactory.js';

function fakes() {
  const calls = { print: 0, addHistory: 0, updateHistory: 0, setProfiles: 0, listPrinters: 0 };
  const store = {
    async getData() {
      return { printerProfiles: [] };
    },
    async addHistory() {
      calls.addHistory += 1;
    },
    async updateHistory() {
      calls.updateHistory += 1;
    }
  };
  const engine = {
    setProfiles() {
      calls.setProfiles += 1;
    },
    async listPrinters() {
      calls.listPrinters += 1;
      return [{ name: 'FTX TDR058U' }];
    },
    async print(job) {
      calls.print += 1;
      return {
        jobId: job.id,
        status: 'sent',
        message: 'ok',
        durationMs: 1,
        spoolerAcknowledged: true,
        physicallyConfirmed: false,
        engine: 'electron',
        electronAttempted: true,
        fallbackUsed: false
      };
    }
  };
  return { calls, store, engine };
}

test('one click = one job = exactly one print call', async () => {
  const { calls, store, engine } = fakes();
  const job = createTestJob('FTX TDR058U', 30, 5);
  const result = await printAndRecord(store, engine, job);
  assert.equal(result.status, 'sent');
  assert.equal(calls.print, 1, 'engine.print must be called exactly once');
  assert.equal(calls.addHistory, 1, 'exactly one pending history entry');
  assert.equal(calls.updateHistory, 1, 'exactly one history completion');
});

test('missing printer produces an error before any print call', async () => {
  const { calls, store, engine } = fakes();
  engine.listPrinters = async () => [{ name: 'OTRA' }];
  const job = createTestJob('FTX TDR058U', 30, 5);
  await assert.rejects(() => printAndRecord(store, engine, job));
  assert.equal(calls.print, 0, 'no print attempt when printer is absent');
});
