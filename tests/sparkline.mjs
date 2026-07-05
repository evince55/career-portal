import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sparklinePath } from '../js/sparkline.js';

describe('sparklinePath', () => {
  it('empty / single point → empty string', () => {
    assert.equal(sparklinePath([]), '');
    assert.equal(sparklinePath([5]), '');
  });
  it('ascending values rise (last y above first y in SVG coords)', () => {
    const d = sparklinePath([0, 1, 2, 3], 120, 28, 2);
    assert.match(d, /^M/);
    const ys = [...d.matchAll(/[ML]\s*[\d.]+\s+([\d.]+)/g)].map((m) => parseFloat(m[1]));
    assert.ok(ys[0] > ys[ys.length - 1]); // SVG y grows downward, so rising data = decreasing y
  });
  it('constant values → flat mid-line', () => {
    const d = sparklinePath([7, 7, 7], 120, 28, 2);
    const ys = [...d.matchAll(/[ML]\s*[\d.]+\s+([\d.]+)/g)].map((m) => parseFloat(m[1]));
    assert.ok(ys.every((y) => Math.abs(y - 14) < 0.01)); // mid of h=28
  });
  it('stays within the box', () => {
    const d = sparklinePath([3, 9, 1, 8, 2], 120, 28, 2);
    const pts = [...d.matchAll(/[ML]\s*([\d.]+)\s+([\d.]+)/g)];
    for (const [, x, y] of pts) {
      assert.ok(parseFloat(x) >= 0 && parseFloat(x) <= 120);
      assert.ok(parseFloat(y) >= 0 && parseFloat(y) <= 28);
    }
  });
});
