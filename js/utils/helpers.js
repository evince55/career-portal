/** Escape HTML entities to prevent XSS attacks (Node.js & browser compatible) */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);

  // Prevent null byte injection attacks
  let escaped = str.replace(/\0/g, '');

  // Order matters: & must be first to avoid double-escaping
  // Note: / escaping removed — unnecessary with textContent, corrupts URL display
  return escaped
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Normalize a search slug: lowercase, convert spaces to hyphens, collapse multiple hyphens */
export function normalizeSlug(str) {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-');
}

/** Validate URL - only allow safe protocols, return fallback for unsafe values */
export function validateUrl(url, fallback = '#') {
  if (!url || typeof url !== 'string' || url.trim() === '') return fallback;
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return url;
    }
  } catch { /* invalid URL */ }
  return fallback;
}

/** Skills data for visualization — single source of truth */
export const SKILLS_DATA = Object.freeze({
  cloud: { label: '[Cloud]', items: ['Azure (Blob Storage, Functions, AKS)', 'Cloudflare (DNS, CDN, Workers)', 'Docker & Kubernetes (k3s, Istio)'], level: 50 },
  frontend: { label: '[Frontend]', items: ['React.js / Next.js', 'TypeScript / JavaScript (ES6+)', 'CSS3 / Tailwind / Material UI', 'Progressive Web Apps'], level: 40 },
  backend: { label: '[Backend]', items: ['Node.js / Express / NestJS', 'Python (FastAPI, Django)', 'GraphQL / REST APIs', 'PostgreSQL / MongoDB / Redis'], level: 60 },
  devops: { label: '[DevOps]', items: ['GitHub Actions / CI/CD Pipelines', 'Terraform / Infrastructure as Code', 'Prometheus / Grafana / Loki', 'OpenTelemetry / Distributed Tracing'], level: 70 }
});

/** Performance grading thresholds: [A, B, C, D] in milliseconds */
export const PERF_THRESHOLDS = Object.freeze({
  ttfb: { a: 200, b: 400, c: 800, d: 1500 },
  domContentLoaded: { a: 500, b: 1000, c: 2000, d: 3000 },
  fullLoad: { a: 1000, b: 2000, c: 4000, d: 6000 }
});

/** Grade a single metric against thresholds */
export function gradePerf(ms, thresholds) {
  if (ms === null || ms <= 0) return { letter: '?', color: 'warning' };
  if (ms < thresholds.a) return { letter: 'A', color: 'success' };
  if (ms < thresholds.b) return { letter: 'B', color: 'success' };
  if (ms < thresholds.c) return { letter: 'C', color: 'info' };
  if (ms < thresholds.d) return { letter: 'D', color: 'warning' };
  return { letter: 'F', color: 'warning' };
}

/** Compute overall grade from individual grades */
export function computeOverallGrade(grades) {
  const letters = Object.values(grades).map(g => g.letter);
  if (letters.includes('F')) return { grade: 'F', color: 'warning' };
  if (letters.includes('D')) return { grade: 'D', color: 'warning' };
  if (letters.includes('C')) return { grade: 'C', color: 'info' };
  if (letters.includes('B')) return { grade: 'B', color: 'success' };
  return { grade: 'A', color: 'success' };
}

/**
 * Split a stat display string into { prefix, value, decimals, suffix } so the
 * numeric part can be animated (count-up) and re-rendered faithfully.
 * Examples: '99.8%' → {prefix:'', value:99.8, decimals:1, suffix:'%'}
 *           '$5.12/mo' → {prefix:'$', value:5.12, decimals:2, suffix:'/mo'}
 *           '894k' → {prefix:'', value:894, decimals:0, suffix:'k'}
 *           '3 / 20' → {prefix:'', value:3, decimals:0, suffix:' / 20'}
 * Returns null when no number is present (caller should skip animating).
 */
export function parseStatValue(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/^(.*?)(\d+(?:\.\d+)?)(.*)$/s);
  if (!m) return null;
  const [, prefix, num, suffix] = m;
  const decimals = num.includes('.') ? num.split('.')[1].length : 0;
  return { prefix, value: parseFloat(num), decimals, suffix };
}

/**
 * Map a human tech-stack name ('Kubernetes (k3s)', 'ArgoCD', 'Discord.py Bot')
 * to a vendored Simple Icons slug in /icons/tech/, or null when we have no
 * icon for it. Keyword order matters: more specific slugs first.
 */
const TECH_ICON_KEYWORDS = [
  ['k3s', 'k3s'],
  ['kubernetes', 'kubernetes'],
  ['istio', 'istio'],
  ['prometheus', 'prometheus'],
  ['grafana', 'grafana'],
  ['cloudflare', 'cloudflare'],
  ['discord', 'discord'],
  ['argo', 'argo'],
  ['github', 'github'],
  ['python', 'python'],
  ['node', 'nodedotjs']
];

export function techIconSlug(name) {
  if (typeof name !== 'string') return null;
  const n = name.toLowerCase();
  for (const [keyword, slug] of TECH_ICON_KEYWORDS) {
    if (n.includes(keyword)) return slug;
  }
  return null;
}
