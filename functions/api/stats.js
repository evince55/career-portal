// Cloudflare Pages Function at /api/stats.
//   GET  -> return the latest stats JSON from KV (60s edge cache), 404 if none.
//   POST -> bearer-authenticated write of the stats JSON into KV (from the homelab cron).
// Bindings: env.STATS_KV (KV namespace), env.STATS_TOKEN (secret). See
// docs/cloudflare-live-stats-setup.md. Pure validateStats() is unit-tested.
const KEY = 'minecraft';
const MAX_BODY = 16384;

export function validateStats(text) {
  const obj = JSON.parse(text); // throws on non-JSON
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('not an object');
  if (!obj.metrics || typeof obj.metrics !== 'object') throw new Error('missing metrics');
  if (typeof obj.lastUpdated !== 'string') throw new Error('missing lastUpdated');
  return obj;
}

// Constant-time string compare (avoids leaking the token via timing).
function safeEqual(a, b) {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

const json = (obj, status, extra) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...(extra || {}) }
  });

export async function onRequestGet(context) {
  const value = await context.env.STATS_KV.get(KEY);
  if (value == null) return json({ error: 'no data' }, 404);
  return new Response(value, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
  });
}

export async function onRequestPost(context) {
  const token = context.env.STATS_TOKEN;
  if (!token) return json({ error: 'server not configured' }, 503);
  const auth = (context.request.headers.get('Authorization') || '');
  if (!safeEqual(auth, `Bearer ${token}`)) return json({ error: 'unauthorized' }, 401);

  const body = await context.request.text();
  if (body.length > MAX_BODY) return json({ error: 'too large' }, 413);
  try {
    validateStats(body);
  } catch {
    return json({ error: 'invalid stats' }, 400);
  }
  await context.env.STATS_KV.put(KEY, body);
  return new Response(null, { status: 204 });
}
