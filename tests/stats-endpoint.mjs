import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { validateStats, onRequestGet, onRequestPost } from '../functions/api/stats.js';

const REAL = readFileSync(new URL('../config/minecraft-stats.json', import.meta.url), 'utf8');

function mockKV(initial = null) {
  let store = initial;
  return { get: async () => store, put: async (_k, v) => { store = v; }, _peek: () => store };
}
function postReq(body, token) {
  const headers = new Map();
  if (token !== undefined) headers.set('Authorization', `Bearer ${token}`);
  return { headers: { get: (k) => headers.get(k) || null }, text: async () => body };
}

describe('validateStats', () => {
  it('accepts the real stats file', () => {
    const o = validateStats(REAL);
    assert.equal(typeof o.metrics, 'object');
  });
  it('rejects non-JSON, non-object, and missing fields', () => {
    assert.throws(() => validateStats('nope'));
    assert.throws(() => validateStats('42'));
    assert.throws(() => validateStats('{"lastUpdated":"x"}'));
    assert.throws(() => validateStats('{"metrics":{}}'));
    assert.throws(() => validateStats('{"metrics":1,"lastUpdated":"x"}'));
  });
});

describe('onRequestGet', () => {
  it('404 when KV empty', async () => {
    const res = await onRequestGet({ env: { STATS_KV: mockKV(null) } });
    assert.equal(res.status, 404);
  });
  it('404 when KV binding is missing (pre-config)', async () => {
    const res = await onRequestGet({ env: {} });
    assert.equal(res.status, 404);
  });
  it('200 + 60s cache when present', async () => {
    const res = await onRequestGet({ env: { STATS_KV: mockKV(REAL) } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('Cache-Control'), /max-age=60/);
    assert.equal((await res.json()).metrics.maxPlayers, 20);
  });
});

describe('onRequestPost', () => {
  const env = () => ({ STATS_KV: mockKV(null), STATS_TOKEN: 'secret' });
  it('401 on bad token', async () => {
    const e = env();
    assert.equal((await onRequestPost({ request: postReq(REAL, 'wrong'), env: e })).status, 401);
  });
  it('503 when server token unset', async () => {
    const res = await onRequestPost({ request: postReq(REAL, 'x'), env: { STATS_KV: mockKV(), STATS_TOKEN: '' } });
    assert.equal(res.status, 503);
  });
  it('400 on invalid body', async () => {
    assert.equal((await onRequestPost({ request: postReq('nope', 'secret'), env: env() })).status, 400);
  });
  it('413 on oversize body', async () => {
    const big = JSON.stringify({ metrics: { x: 'a'.repeat(20000) }, lastUpdated: 'x' });
    assert.equal((await onRequestPost({ request: postReq(big, 'secret'), env: env() })).status, 413);
  });
  it('204 + writes KV on success', async () => {
    const e = env();
    const res = await onRequestPost({ request: postReq(REAL, 'secret'), env: e });
    assert.equal(res.status, 204);
    assert.equal(e.STATS_KV._peek(), REAL);
  });
});
