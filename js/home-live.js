// Home page live stats — fetches /config/minecraft-stats.json (refreshed by a
// 10-minute cron on the homelab) and fills [data-live-*] elements on index.html.
// Pure formatting lives in formatStats() so tests/home-live.mjs can cover it
// without a DOM. All values are written with textContent (never innerHTML).

const STATS_URL = '/config/minecraft-stats.json';
const FETCH_TIMEOUT_MS = 3000;

export const LIVE_FIELDS = ['uptime', 'tps', 'players', 'scrapes', 'updated'];

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function formatCount(n) {
  if (!Number.isFinite(n) || n < 0) return null;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

function relativeTime(iso, now) {
  if (typeof iso !== 'string') return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return 'updated just now';
  if (mins < 60) return `updated ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `updated ${hours}h ago`;
  return `updated ${Math.round(hours / 24)}d ago`;
}

/**
 * Turn the raw stats JSON into display strings.
 * Resilient to missing/partial/garbage input: each field is null when its
 * source data is absent or malformed, so callers can hide that chip only.
 */
export function formatStats(json, now = Date.now()) {
  const data = asObject(json);
  const metrics = asObject(data.metrics);
  const monitoring = asObject(data.monitoring);

  let uptime = null;
  if (typeof metrics.uptime === 'string' && metrics.uptime.trim() !== '') {
    uptime = metrics.uptime.trim();
  } else if (Number.isFinite(metrics.uptime)) {
    uptime = `${metrics.uptime}%`;
  }

  const tps = Number.isFinite(metrics.tps) ? `${metrics.tps} TPS` : null;

  let players = null;
  if (Number.isFinite(metrics.players)) {
    players = Number.isFinite(metrics.maxPlayers)
      ? `${metrics.players} / ${metrics.maxPlayers}`
      : String(metrics.players);
  }

  return {
    uptime,
    tps,
    players,
    scrapes: formatCount(monitoring.prometheusScrapes),
    updated: relativeTime(data.lastUpdated, now)
  };
}

function hideAllLive(doc) {
  for (const item of doc.querySelectorAll('[data-live-item]')) {
    item.hidden = true;
  }
}

/**
 * Fetch the stats (3s timeout) and populate [data-live-*] elements.
 * On any failure every [data-live-item] is hidden; static copy remains.
 * Returns the formatted stats on success, null otherwise.
 */
export async function initHomeLive(doc = typeof document === 'undefined' ? null : document) {
  if (!doc || typeof fetch !== 'function') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let stats;
  try {
    const res = await fetch(STATS_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`stats fetch failed: ${res.status}`);
    stats = formatStats(await res.json());
  } catch {
    hideAllLive(doc);
    return null;
  } finally {
    clearTimeout(timer);
  }

  for (const key of LIVE_FIELDS) {
    for (const el of doc.querySelectorAll(`[data-live-${key}]`)) {
      const item = el.closest('[data-live-item]') || el;
      if (stats[key] == null) {
        item.hidden = true;
      } else {
        el.textContent = stats[key];
        item.hidden = false;
      }
    }
  }
  return stats;
}
