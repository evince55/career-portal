// Tests for js/home-live.js (formatStats + initHomeLive guards) and the
// static-content contracts of index.html (SKILLS_DATA parity, live hooks,
// lazy-only Three.js).
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { formatStats, initHomeLive, isStale, LIVE_FIELDS } from '../js/home-live.js';
import { SKILLS_DATA } from '../js/utils/helpers.js';

const REAL = JSON.parse(
  readFileSync(new URL('../config/minecraft-stats.json', import.meta.url), 'utf8')
);

describe('formatStats', () => {
  it('formats the real minecraft-stats.json shape', () => {
    const now = Date.parse(REAL.lastUpdated) + 5 * 60000;
    const s = formatStats(REAL, now);
    assert.equal(s.uptime, '100.0%');
    assert.equal(s.tps, '20'); // clamped to Minecraft's 20 TPS cap
    assert.equal(s.players, '1 / 20');
    assert.equal(s.mspt, '3.4 ms');
    assert.equal(s.updated, 'updated 5m ago');
  });

  it('returns null for every field on an empty object', () => {
    const s = formatStats({});
    for (const key of LIVE_FIELDS) {
      assert.equal(s[key], null, `${key} should be null`);
    }
  });

  it('returns null fields for null, undefined, and non-object input', () => {
    for (const input of [null, undefined, 'nope', 42, []]) {
      const s = formatStats(input);
      for (const key of LIVE_FIELDS) {
        assert.equal(s[key], null, `${key} should be null for ${JSON.stringify(input)}`);
      }
    }
  });

  it('keeps present fields and nulls the missing ones (partial metrics)', () => {
    const s = formatStats({ metrics: { tps: 18 } });
    assert.equal(s.tps, '18');
    assert.equal(s.uptime, null);
    assert.equal(s.players, null);
    assert.equal(s.mspt, null);
    assert.equal(s.updated, null);
  });

  it('accepts numeric uptime and renders it as a percentage', () => {
    assert.equal(formatStats({ metrics: { uptime: 99.95 } }).uptime, '99.95%');
  });

  it('rejects blank-string and non-numeric metric values', () => {
    const s = formatStats({ metrics: { uptime: '  ', tps: 'twenty', players: '3' } });
    assert.equal(s.uptime, null);
    assert.equal(s.tps, null);
    assert.equal(s.players, null);
  });

  it('renders players without maxPlayers as a bare count', () => {
    assert.equal(formatStats({ metrics: { players: 4 } }).players, '4');
  });

  it('formats MSPT (server tick time) with a ms suffix', () => {
    assert.equal(formatStats({ metrics: { mspt: 3.4 } }).mspt, '3.4 ms');
    assert.equal(formatStats({ metrics: { mspt: 18 } }).mspt, '18 ms');
    assert.equal(formatStats({ metrics: {} }).mspt, null);
    assert.equal(formatStats({ metrics: { mspt: 'x' } }).mspt, null);
  });

  it('formats relative update times (minutes, hours, days, clamped future)', () => {
    const base = Date.parse('2026-07-03T12:00:00Z');
    const at = (iso) => formatStats({ lastUpdated: iso }, base).updated;
    assert.equal(at('2026-07-03T11:59:40Z'), 'updated just now');
    assert.equal(at('2026-07-03T11:35:00Z'), 'updated 25m ago');
    assert.equal(at('2026-07-03T09:00:00Z'), 'updated 3h ago');
    assert.equal(at('2026-06-30T12:00:00Z'), 'updated 3d ago');
    assert.equal(at('2026-07-03T12:30:00Z'), 'updated just now');
  });

  it('nulls updated for malformed timestamps', () => {
    assert.equal(formatStats({ lastUpdated: 'not-a-date' }).updated, null);
    assert.equal(formatStats({ lastUpdated: 12345 }).updated, null);
  });
});

describe('initHomeLive', () => {
  it('no-ops safely without a DOM (Node import)', async () => {
    assert.equal(await initHomeLive(), null);
    assert.equal(await initHomeLive(null), null);
  });
});

describe('index.html static content', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const text = html.replaceAll('&amp;', '&');

  it('lists every SKILLS_DATA item verbatim (single source of truth)', () => {
    for (const group of Object.values(SKILLS_DATA)) {
      for (const item of group.items) {
        assert.ok(text.includes(item), `missing skill item: ${item}`);
      }
    }
  });

  it('has a live hook for each formatStats field', () => {
    for (const key of LIVE_FIELDS) {
      assert.ok(html.includes(`data-live-${key}`), `missing data-live-${key}`);
    }
  });

  it('never loads Three.js eagerly (dynamic import only)', () => {
    assert.ok(!/<script[^>]*src="[^"]*three/.test(html), 'three must not be a script src');
    assert.ok(/import\(['"]\/js\/three-hero\.js(\?[^'"]*)?['"]\)/.test(html), 'three-hero must load via dynamic import');
  });

  it('bails out of Three.js on constrained clients before importing', () => {
    for (const guard of ['prefers-reduced-motion: reduce', 'saveData', 'innerWidth < 768', 'webgl']) {
      assert.ok(html.includes(guard), `missing bail-out guard: ${guard}`);
    }
  });
});

describe('isStale', () => {
  const NOW = Date.parse('2026-07-03T12:00:00Z');
  it('fresh payloads are not stale', () => {
    assert.equal(isStale({ lastUpdated: '2026-07-03T11:55:00Z' }, NOW), false);
  });
  it('payloads older than the threshold are stale', () => {
    assert.equal(isStale({ lastUpdated: '2026-07-01T12:00:00Z' }, NOW), true);
  });
  it('missing or malformed timestamps are stale', () => {
    assert.equal(isStale({}, NOW), true);
    assert.equal(isStale({ lastUpdated: 'not-a-date' }, NOW), true);
    assert.equal(isStale(null, NOW), true);
  });
  it('threshold is configurable', () => {
    assert.equal(isStale({ lastUpdated: '2026-07-03T11:00:00Z' }, NOW, 30 * 60000), true);
    assert.equal(isStale({ lastUpdated: '2026-07-03T11:00:00Z' }, NOW, 2 * 3600000), false);
  });
});

describe('TPS clamping', () => {
  it('over-reported TPS clamps to the 20 cap', () => {
    assert.equal(formatStats({ metrics: { tps: 21 } }).tps, '20');
  });
  it('normal TPS passes through', () => {
    assert.equal(formatStats({ metrics: { tps: 19.8 } }).tps, '19.8');
  });
});
