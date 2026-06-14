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

/** Command palette data: icons and descriptions for all known commands */
export const COMMAND_ICONS = Object.freeze({
  help: '\u2753', projects: '\u{1f4ca}', project: '\u{1f4be}', skills: '\u{1f3af}',
  'skills-visual': '\u{1f4ca}', timeline: '\u{1f5d3}', experience: '\u{1f4bc}',
  education: '\u{1f393}', resume: '\u{1f4c4}', about: '\u{1f464}', contact: '\u{1f4e7}',
  status: '\u{1f504}', minecraft: '\u{1f3ae}', ai: '\u{1f916}', demo: '\u{1f3ac}',
  clear: '\u274c', theme: '\u{1f3b3}', matrix: '\u25a0', neofetch: '\u{1f5a1}',
  fortune: '\u{1f3ae}', cowsay: '\u{1f42e}', achievements: '\u{1f3af}', perf: '\u2699',
  explorer: '\u{1f4b1}', dashboard: '\u{1f4ca}', writeups: '\u{1f4dd}', git: '\u{1f552}'
});

export const COMMAND_DESCS = Object.freeze({
  help: 'Show available commands', projects: 'List all projects', project: 'View project details',
  skills: 'Show technical skills', 'skills-visual': 'Animated skill bars', timeline: 'Project timeline',
  experience: 'Work experience', education: 'Education background', resume: 'Resume text',
  about: 'About Eugene', contact: 'Contact info', status: 'System metrics',
  minecraft: 'Minecraft server stats', ai: 'AI assistant', demo: 'Auto showcase',
  clear: 'Clear terminal', theme: 'Toggle theme', matrix: 'Matrix rain',
  neofetch: 'System info display', fortune: 'Random fortune', cowsay: 'ASCII cow',
  achievements: 'Earned badges', perf: 'Performance dashboard',
  explorer: 'Open Project Explorer page', dashboard: 'Open Live Dashboard page', writeups: 'Open Writeups page',
  git: 'GitHub profile stats'
});

/** Derived count of all registered terminal commands */
export const COMMAND_COUNT = Object.freeze(Object.keys(COMMAND_ICONS).length);

/** Highlight a query match within text, returning escaped HTML string */
export function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return escapeHtml(text);
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return `${escapeHtml(before)}<span class="palette-match">${escapeHtml(match)}</span>${escapeHtml(after)}`;
}

/** Build a single palette row item */
export function createPaletteItem(cmd, query) {
  const icon = COMMAND_ICONS[cmd] || '\u25aa';
  const desc = COMMAND_DESCS[cmd] || '';
  const highlightedCmd = highlightMatch(cmd, query);
  return { cmd, icon, desc, innerHTML: `
    <span class="palette-icon">${icon}</span>
    <span class="palette-cmd">${highlightedCmd}</span>
    <span class="palette-desc">${escapeHtml(desc)}</span>
  `};
}

/** Filter commands by query, sorted alphabetically */
export function filterCommands(commands, query) {
  const q = query.toLowerCase().trim();
  if (!q) return [...commands].sort();
  return commands.filter(cmd => cmd.includes(q)).sort();
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
