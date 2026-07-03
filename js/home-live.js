// Home page live stats — fetches /config/minecraft-stats.json (refreshed by a
// 10-minute cron on the homelab) and fills [data-live-*] elements on index.html.
// Pure formatting lives in formatStats()/isStale() so tests/home-live.mjs can
// cover them without a DOM. All values are written with textContent (never innerHTML).
//
// Honesty contract: the markup ships with static seed values that stay visible
// no matter what. The "live" affordances (pulse dot, "updated Xm ago" line) are
// shown ONLY when the fetch succeeds AND the data is fresh. Stale or failed
// feeds keep the numbers but drop the live claim.

const STATS_URL = '/config/minecraft-stats.json';
const FETCH_TIMEOUT_MS = 3000;
const STALE_AFTER_MS = 60 * 60 * 1000; // 1 hour — well past the 10-min cron cadence
const MAX_TPS = 20; // Minecraft's hard tick-rate cap; exporters can briefly over-report

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

/** True when the payload's lastUpdated is missing, unparsable, or older than the threshold. */
export function isStale(json, now = Date.now(), thresholdMs = STALE_AFTER_MS) {
  const iso = asObject(json).lastUpdated;
  if (typeof iso !== 'string') return true;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return true;
  return now - then > thresholdMs;
}

/**
 * Turn the raw stats JSON into display strings.
 * Resilient to missing/partial/garbage input: each field is null when its
 * source data is absent or malformed, so callers can skip that update only.
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

  const tps = Number.isFinite(metrics.tps) ? String(Math.min(metrics.tps, MAX_TPS)) : null;

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

/** Drop every live-only affordance (pulse dot, updated line); static values stay. */
function dropLiveClaim(doc, noteText) {
  for (const el of doc.querySelectorAll('[data-live-badge]')) {
    el.hidden = true;
  }
  const note = doc.querySelector('[data-live-note]');
  if (note) {
    note.textContent = noteText;
    note.hidden = false;
  }
}

/**
 * Fetch the stats (3s timeout) and populate [data-live-*] elements.
 * Static seed values are never hidden; only the live affordances change:
 *  - fresh fetch  → values updated, pulse + "updated Xm ago" shown
 *  - stale fetch  → values updated, live claim dropped, snapshot note shown
 *  - failed fetch → seeds kept, live claim dropped, unavailable note shown
 * Returns the formatted stats on success, null otherwise.
 */
export async function initHomeLive(doc = typeof document === 'undefined' ? null : document) {
  if (!doc || typeof fetch !== 'function') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let stats;
  let stale;
  try {
    const res = await fetch(STATS_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`stats fetch failed: ${res.status}`);
    const json = await res.json();
    stats = formatStats(json);
    stale = isStale(json);
  } catch {
    dropLiveClaim(doc, 'Live feed unavailable right now — typical figures shown.');
    return null;
  } finally {
    clearTimeout(timer);
  }

  for (const key of LIVE_FIELDS) {
    for (const el of doc.querySelectorAll(`[data-live-${key}]`)) {
      if (stats[key] != null) {
        el.textContent = stats[key];
      }
    }
  }

  if (stale) {
    dropLiveClaim(doc, `Not live right now — last snapshot from the rack: ${stats.updated || 'unknown'}.`);
  } else {
    for (const el of doc.querySelectorAll('[data-live-badge]')) {
      el.hidden = false;
    }
  }
  return stats;
}
