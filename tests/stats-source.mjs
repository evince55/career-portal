import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fetchStats } from '../js/stats-source.js';

const jsonRes = (obj, ok = true) => ({ ok, json: async () => obj });

describe('fetchStats', () => {
  it('returns /api/stats when it is OK', async () => {
    const calls = [];
    const fetchImpl = async (url) => { calls.push(url); return jsonRes({ src: 'kv' }); };
    const out = await fetchStats({ fetchImpl });
    assert.deepEqual(out, { src: 'kv' });
    assert.match(calls[0], /^api\/stats/);
  });

  it('falls back to the static file when /api/stats is non-OK', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      if (url.startsWith('api/stats')) return jsonRes({}, false);
      return jsonRes({ src: 'static' });
    };
    const out = await fetchStats({ fetchImpl });
    assert.deepEqual(out, { src: 'static' });
    assert.equal(calls.length, 2);
    assert.match(calls[1], /minecraft-stats\.json/);
  });

  it('falls back when /api/stats throws', async () => {
    const fetchImpl = async (url) => {
      if (url.startsWith('api/stats')) throw new Error('network');
      return jsonRes({ src: 'static' });
    };
    assert.deepEqual(await fetchStats({ fetchImpl }), { src: 'static' });
  });

  it('rejects when both sources fail', async () => {
    const fetchImpl = async () => { throw new Error('down'); };
    await assert.rejects(fetchStats({ fetchImpl }));
  });
});
