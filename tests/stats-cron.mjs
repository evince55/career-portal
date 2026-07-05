// Guards scripts/prom_stats.py — the homelab cron's Prometheus parser. The old
// bash/python version read d['result'] instead of d['data']['result'] and
// r['values'] (range) instead of r['value'] (instant), so every parse silently
// failed and the "live" stats were frozen seed values. The python self-test
// encodes the correct instant-vector parsing; this runs it in CI.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const script = new URL('../scripts/prom_stats.py', import.meta.url);

describe('prom_stats.py', () => {
  it('exists', () => {
    assert.ok(existsSync(script));
  });

  it('passes its instant-vector parse self-test', () => {
    const out = execFileSync('python3', [script.pathname, '--selftest'], { encoding: 'utf8' });
    assert.match(out, /selftest OK/);
  });
});
