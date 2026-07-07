// Fetches homelab stats from the live edge endpoint, falling back to the
// committed static snapshot. Shared by js/home-live.js and dashboard.html so
// the fallback logic lives in exactly one place. fetchImpl is injectable for tests.
const PRIMARY = 'api/stats';
const FALLBACK = 'config/minecraft-stats.json';

async function getJson(url, timeoutMs, fetchImpl) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(url, {
      cache: 'no-store',
      signal: controller ? controller.signal : undefined
    });
    if (!res.ok) throw new Error(`stats ${url} -> ${res.status}`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchStats({ timeoutMs = 3000, fetchImpl } = {}) {
  const impl = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!impl) throw new Error('no fetch available');
  // No cache-buster query — `cache: 'no-store'` already prevents caching, and a
  // ?t= param trips some static hosts (403). Endpoints are relative so they work
  // from the site root in the browser and in the deploy preview alike.
  try {
    return await getJson(PRIMARY, timeoutMs, impl);
  } catch {
    return getJson(FALLBACK, timeoutMs, impl);
  }
}
