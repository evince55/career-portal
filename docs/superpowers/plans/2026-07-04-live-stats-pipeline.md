# Live Homelab Stats Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make chai-homelab.com's homelab stats actually live in production via a Cloudflare KV + Pages Function push pipeline, with a static-file fallback.

**Architecture:** Homelab cron POSTs the stats JSON to an authenticated `/api/stats` Pages Function that stores it in Cloudflare KV; the page reads `/api/stats` (60s edge cache) through a shared `fetchStats()` helper that falls back to the committed `/config/minecraft-stats.json`.

**Tech Stack:** Cloudflare Pages Functions + KV, vanilla JS ES modules, `node --test`, ESLint v8, bash cron.

## Global Constraints (from spec)

- No bundler/transpiler/framework. Single quotes, semicolons, 2-space indent, ES modules.
- All dynamic text via `textContent`/`escapeHtml` (no innerHTML for feed data).
- `npm test` green; `npx eslint .` 0 errors. (`.eslintrc.json` env includes browser+node, so Workers globals `Response`/`Request`/`crypto` are already allowed.)
- No secret in git. Agent does NOT touch the Cloudflare account or handle the token.
- KV key: `minecraft`. Binding name: `STATS_KV`. Secret env: `STATS_TOKEN`. Route: `/api/stats`.
- Do NOT precache `/api/stats` in the service worker; keep `/config/minecraft-stats.json` precached as fallback.
- Deploying the code before the CF setup is done must be safe (GET 404 → static fallback).

## File map

- **Create:** `js/stats-source.js` (shared fetch-with-fallback), `functions/api/stats.js` (Pages Function), `tests/stats-source.mjs`, `tests/stats-endpoint.mjs`, `docs/cloudflare-live-stats-setup.md` (owner checklist).
- **Modify:** `js/home-live.js` (use `fetchStats`), `dashboard.html` (use `fetchStats`), `scripts/update-minecraft-stats.sh` (add POST step; repo copy), `AGENTS.md` (document the pipeline).
- **Homelab ops (SSH, not a repo change):** update the deployed cron script + create `~/.aria-stats-token` — owner sets the token value.

---

### Task 1: Shared `fetchStats()` with fallback (TDD)

**Files:** Create `js/stats-source.js`, `tests/stats-source.mjs`

**Produces:** `export async function fetchStats({ timeoutMs = 3000, fetchImpl } = {})` → resolves to the parsed stats object from `/api/stats`, or from `/config/minecraft-stats.json` if the first is non-OK/throws; rejects if both fail.

- [ ] **Step 1: Write the failing test**

```js
// tests/stats-source.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fetchStats } from '../js/stats-source.js';

const jsonRes = (obj, ok = true) => ({ ok, json: async () => obj });

describe('fetchStats', () => {
  it('returns /api/stats when it is OK', async () => {
    const calls = [];
    const fetchImpl = async (url) => { calls.push(url); return jsonRes({ src: 'kv' }); };
    const out = await fetchStats({ fetchImpl });
    assert.deepEqual(out, { src: 'kv' });
    assert.match(calls[0], /^\/api\/stats/);
  });

  it('falls back to the static file when /api/stats is non-OK', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      if (url.startsWith('/api/stats')) return jsonRes({}, false);
      return jsonRes({ src: 'static' });
    };
    const out = await fetchStats({ fetchImpl });
    assert.deepEqual(out, { src: 'static' });
    assert.equal(calls.length, 2);
    assert.match(calls[1], /minecraft-stats\.json/);
  });

  it('falls back when /api/stats throws', async () => {
    const fetchImpl = async (url) => {
      if (url.startsWith('/api/stats')) throw new Error('network');
      return jsonRes({ src: 'static' });
    };
    assert.deepEqual(await fetchStats({ fetchImpl }), { src: 'static' });
  });

  it('rejects when both sources fail', async () => {
    const fetchImpl = async () => { throw new Error('down'); };
    await assert.rejects(fetchStats({ fetchImpl }));
  });
});
```

- [ ] **Step 2:** `node --test tests/stats-source.mjs` → FAIL (module missing).
- [ ] **Step 3: Implement**

```js
// js/stats-source.js
// Fetches homelab stats from the live edge endpoint, falling back to the
// committed static snapshot. Shared by js/home-live.js and dashboard.html so
// the fallback logic lives in exactly one place. fetchImpl is injectable for tests.
const PRIMARY = '/api/stats';
const FALLBACK = '/config/minecraft-stats.json';

async function getJson(url, timeoutMs, fetchImpl) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(url, {
      cache: 'no-store',
      signal: controller ? controller.signal : undefined
    });
    if (!res.ok) throw new Error(`stats ${url} → ${res.status}`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchStats({ timeoutMs = 3000, fetchImpl } = {}) {
  const impl = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!impl) throw new Error('no fetch available');
  try {
    return await getJson(`${PRIMARY}?t=${Date.now()}`, timeoutMs, impl);
  } catch {
    return getJson(`${FALLBACK}?t=${Date.now()}`, timeoutMs, impl);
  }
}
```

- [ ] **Step 4:** `node --test tests/stats-source.mjs` → PASS. `npx eslint js/stats-source.js` → clean.
- [ ] **Step 5: Commit**

```bash
git add js/stats-source.js tests/stats-source.mjs
git commit -m "feat: shared fetchStats() with /api/stats → static fallback"
```

---

### Task 2: `/api/stats` Pages Function (TDD)

**Files:** Create `functions/api/stats.js`, `tests/stats-endpoint.mjs`

**Produces:** `export function validateStats(text)` (throws on invalid, returns parsed object on valid); `export async function onRequestGet(context)`; `export async function onRequestPost(context)`. Cloudflare invokes the `onRequest*` handlers by route; `context = { request, env }`, `env.STATS_KV` is a KV namespace (`get`/`put`), `env.STATS_TOKEN` is the shared secret.

- [ ] **Step 1: Write the failing test**

```js
// tests/stats-endpoint.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { validateStats, onRequestGet, onRequestPost } from '../functions/api/stats.js';

const REAL = readFileSync(new URL('../config/minecraft-stats.json', import.meta.url), 'utf8');

function mockKV(initial = null) {
  let store = initial;
  return { get: async () => store, put: async (_k, v) => { store = v; }, _peek: () => store };
}
function postReq(body, token) {
  const headers = new Map();
  if (token !== undefined) headers.set('Authorization', `Bearer ${token}`);
  return { headers: { get: (k) => headers.get(k) || null }, text: async () => body };
}

describe('validateStats', () => {
  it('accepts the real stats file', () => {
    const o = validateStats(REAL);
    assert.equal(typeof o.metrics, 'object');
  });
  it('rejects non-JSON, non-object, and missing fields', () => {
    assert.throws(() => validateStats('nope'));
    assert.throws(() => validateStats('42'));
    assert.throws(() => validateStats('{"lastUpdated":"x"}'));           // no metrics
    assert.throws(() => validateStats('{"metrics":{}}'));                // no lastUpdated
    assert.throws(() => validateStats('{"metrics":1,"lastUpdated":"x"}'));
  });
});

describe('onRequestGet', () => {
  it('404 when KV empty', async () => {
    const res = await onRequestGet({ env: { STATS_KV: mockKV(null) } });
    assert.equal(res.status, 404);
  });
  it('200 + 60s cache when present', async () => {
    const res = await onRequestGet({ env: { STATS_KV: mockKV(REAL) } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('Cache-Control'), /max-age=60/);
    assert.equal((await res.json()).metrics.maxPlayers, 20);
  });
});

describe('onRequestPost', () => {
  const env = () => ({ STATS_KV: mockKV(null), STATS_TOKEN: 'secret' });
  it('401 on bad token', async () => {
    const e = env();
    assert.equal((await onRequestPost({ request: postReq(REAL, 'wrong'), env: e })).status, 401);
  });
  it('503 when server token unset', async () => {
    const res = await onRequestPost({ request: postReq(REAL, 'x'), env: { STATS_KV: mockKV(), STATS_TOKEN: '' } });
    assert.equal(res.status, 503);
  });
  it('400 on invalid body', async () => {
    assert.equal((await onRequestPost({ request: postReq('nope', 'secret'), env: env() })).status, 400);
  });
  it('413 on oversize body', async () => {
    const big = JSON.stringify({ metrics: { x: 'a'.repeat(20000) }, lastUpdated: 'x' });
    assert.equal((await onRequestPost({ request: postReq(big, 'secret'), env: env() })).status, 413);
  });
  it('204 + writes KV on success', async () => {
    const e = env();
    const res = await onRequestPost({ request: postReq(REAL, 'secret'), env: e });
    assert.equal(res.status, 204);
    assert.equal(e.STATS_KV._peek(), REAL);
  });
});
```

- [ ] **Step 2:** `node --test tests/stats-endpoint.mjs` → FAIL (module missing).
- [ ] **Step 3: Implement**

```js
// functions/api/stats.js
// Cloudflare Pages Function at /api/stats.
//   GET  → return the latest stats JSON from KV (60s edge cache), 404 if none.
//   POST → bearer-authenticated write of the stats JSON into KV (from the homelab cron).
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
```

- [ ] **Step 4:** `node --test tests/stats-endpoint.mjs` → PASS. `npx eslint functions/api/stats.js` → clean.
- [ ] **Step 5: Commit**

```bash
git add functions/api/stats.js tests/stats-endpoint.mjs
git commit -m "feat: /api/stats Pages Function (KV read + bearer-auth write)"
```

---

### Task 3: Wire the two clients to `fetchStats`

**Files:** Modify `js/home-live.js`, `dashboard.html`

**Consumes:** `fetchStats` from Task 1.

- [ ] **Step 1:** In `js/home-live.js`, add the import at the top and replace the inner `fetch`.
  Change the import block to include:

```js
import { fetchStats } from '/js/stats-source.js?v=18';
```

  In `initHomeLive()`, replace the `fetch(STATS_URL, …)` + `res.ok` + `res.json()` lines with:

```js
    const json = await fetchStats({ timeoutMs: FETCH_TIMEOUT_MS });
    stats = formatStats(json);
    stale = isStale(json);
```

  Remove the now-unused `STATS_URL` const and the AbortController/timer block inside the `try`
  (fetchStats owns the timeout). Keep everything else (dropLiveClaim, badges) unchanged.

- [ ] **Step 2:** In `dashboard.html`, change the inline module: replace `const STATS_URL = '/config/minecraft-stats.json';` by importing the helper at the top of that `<script type="module">`:

```js
    import { fetchStats } from '/js/stats-source.js?v=18';
```

  Replace the whole `loadStats()` body with:

```js
    async function loadStats() {
      return fetchStats({ timeoutMs: 5000 });
    }
```

  Keep `FALLBACK_STATS`, `renderMinecraft`, `renderFreshness`, and the error UI unchanged.

- [ ] **Step 3: Verify**

Run: `npm test` → still green (home-live tests unaffected — they call `initHomeLive` with a mocked global `fetch`, and `fetchStats` uses global `fetch` when no `fetchImpl` is passed).
Run: `npx eslint .` → 0 errors.
Manual (local server): `npx serve -l 3111 .`, load `/` and `/dashboard.html`; with no `/api/stats` route locally, both must fall back to `/config/minecraft-stats.json` and render (Playwright: stat values non-empty, no console errors).

- [ ] **Step 4: Commit**

```bash
git add js/home-live.js dashboard.html
git commit -m "feat: home + dashboard read /api/stats via shared fetchStats (static fallback)"
```

---

### Task 4: Cron push step (repo copy) + docs

**Files:** Modify `scripts/update-minecraft-stats.sh`, `AGENTS.md`; Create `docs/cloudflare-live-stats-setup.md`

- [ ] **Step 1:** Append to `scripts/update-minecraft-stats.sh` (after the final `EOF` that closes the JSON heredoc; the script's cwd is `config/`):

```bash

# Push the fresh stats to the live edge endpoint (Cloudflare KV via Pages Function).
# Token lives outside git; the local write above already succeeded, so a push
# failure must never fail the cron.
STATS_TOKEN_FILE="${STATS_TOKEN_FILE:-$HOME/.aria-stats-token}"
if [ -f "$STATS_TOKEN_FILE" ]; then
  TOKEN="$(cat "$STATS_TOKEN_FILE")"
  if curl -sf --max-time 10 -X POST 'https://chai-homelab.com/api/stats' \
       -H "Authorization: Bearer $TOKEN" \
       -H 'Content-Type: application/json' \
       --data-binary @minecraft-stats.json > /dev/null; then
    echo "[stats] pushed to edge OK"
  else
    echo "[stats] edge push failed (kept local copy)" >&2
  fi
else
  echo "[stats] no token file at $STATS_TOKEN_FILE — skipping edge push" >&2
fi
```

- [ ] **Step 2:** Create `docs/cloudflare-live-stats-setup.md` — the owner checklist (verbatim from spec §4): generate `openssl rand -hex 32`; create KV namespace; bind `STATS_KV` to Pages project `career-portal`; add encrypted env var `STATS_TOKEN`; on homelab `printf '%s' '<token>' > ~/.aria-stats-token && chmod 600 ~/.aria-stats-token`; redeploy once; verify `curl https://chai-homelab.com/api/stats` returns live JSON after the next cron run.

- [ ] **Step 3:** Add an "AGENTS.md → Live stats" note: the pipeline (cron → `/api/stats` → KV → page), that `/api/stats` is NOT service-worker-precached, and to keep `/config/minecraft-stats.json` as the committed fallback seed.

- [ ] **Step 4: Verify** `bash -n scripts/update-minecraft-stats.sh` (syntax OK). `npm test` green.

- [ ] **Step 5: Commit**

```bash
git add scripts/update-minecraft-stats.sh docs/cloudflare-live-stats-setup.md AGENTS.md
git commit -m "feat: cron pushes stats to /api/stats; add CF setup + AGENTS docs"
```

---

### Task 5: Deploy + homelab wiring (ops)

- [ ] **Step 1:** Confirm SW does NOT precache `/api/stats` (grep `js/service-worker.js` for `/api/stats` → none). No SW change needed (static fallback stays precached).
- [ ] **Step 2:** Merge `redesign/v2` → `master`, push → Cloudflare deploy (CI runs tests first). Code is safe pre-CF-config: `/api/stats` 404 → static fallback.
- [ ] **Step 3 (owner):** Complete `docs/cloudflare-live-stats-setup.md` (KV namespace, binding, `STATS_TOKEN`, homelab token file).
- [ ] **Step 4:** Update the homelab's deployed `~/career-portal` copy of the cron script to match the repo (via SSH), so it starts pushing. (No secret handled by the agent.)
- [ ] **Step 5:** After the owner finishes CF setup + first cron run, verify: `curl https://chai-homelab.com/api/stats` → 200 live JSON with a recent `lastUpdated`; dashboard shows "Live" (not stale).

## Self-review

- **Spec coverage:** §Components 1 → Task 2; §2 client + shared module → Tasks 1, 3; §3 cron → Task 4; §4 CF setup → Task 4 doc + Task 5; §Testing → Tasks 1, 2 (home-live untouched, its tests still pass since fetchStats uses global fetch); §Cost/limits → design only; §error handling → Task 2 status codes + Task 1 fallback. No gaps.
- **Placeholder scan:** none — all steps have real code/commands.
- **Type consistency:** `fetchStats({ timeoutMs, fetchImpl })` used identically in Tasks 1/3; `validateStats`/`onRequestGet`/`onRequestPost` signatures match between Task 2 impl and tests; KV `get`/`put` + `env.STATS_TOKEN` consistent; KV key `minecraft` and binding `STATS_KV` consistent across function, tests, and docs.
