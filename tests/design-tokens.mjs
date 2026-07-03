import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');

const token = (name) => {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `token ${name} must be a 6-digit hex in tokens.css`);
  return m[1];
};

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe('design tokens meet WCAG AA', () => {
  const pairs = [
    ['--text-1', '--bg-0', 4.5],
    ['--text-1', '--bg-1', 4.5],
    ['--text-1', '--bg-2', 4.5],
    ['--text-2', '--bg-0', 4.5],
    ['--text-2', '--bg-1', 4.5],
    ['--text-2', '--bg-2', 4.5],
    ['--text-3', '--bg-0', 4.5],
    ['--text-3', '--bg-1', 4.5],
    ['--accent-cyan', '--bg-0', 4.5],
    ['--accent-cyan', '--bg-1', 4.5],
    ['--accent-magenta', '--bg-0', 4.5],
    ['--ok', '--bg-1', 3],
    ['--warn', '--bg-1', 3],
    ['--err', '--bg-1', 4.5],
  ];
  for (const [fg, bg, min] of pairs) {
    it(`${fg} on ${bg} >= ${min}:1`, () => {
      const r = ratio(token(fg), token(bg));
      assert.ok(r >= min, `${fg} ${token(fg)} on ${bg} ${token(bg)} = ${r.toFixed(2)}`);
    });
  }

  it('defines type, space, radius and motion scales', () => {
    for (const t of ['--font-display', '--font-body', '--font-mono', '--fs-0', '--fs-5',
      '--sp-1', '--sp-12', '--r-1', '--t-fast', '--t-slow', '--ease']) {
      assert.ok(css.includes(`${t}:`), `missing token ${t}`);
    }
  });
});
