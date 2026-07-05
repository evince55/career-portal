// Pure SVG sparkline path builder — no dependencies. Values map left→right across
// w; min→max maps to bottom→top within [pad, h-pad]. Constant series → flat mid-line.
// Returns '' for fewer than 2 points (caller renders no sparkline).
export function sparklinePath(values, w = 120, h = 28, pad = 2) {
  if (!Array.isArray(values) || values.length < 2) return '';
  const nums = values.map(Number).filter((n) => Number.isFinite(n));
  if (nums.length < 2) return '';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min;
  const innerH = h - pad * 2;
  const stepX = w / (nums.length - 1);
  const y = (v) => (span === 0 ? h / 2 : pad + innerH * (1 - (v - min) / span));
  return nums
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)} ${y(v).toFixed(2)}`)
    .join(' ');
}
