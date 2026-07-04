# Live Homelab Stats Pipeline — Design Spec

**Date:** 2026-07-04 · **Status:** Approved (KV + Pages Function push model)

## Problem

The homelab cron (`scripts/update-minecraft-stats.sh`) queries Prometheus and writes
`config/minecraft-stats.json` in the repo working tree every 10 minutes, but Cloudflare Pages
only serves the copy from the last `master` deploy — so production stats are stale (days old).
The site already detects staleness and honestly drops the "live" claim; this makes the data
actually live. The homelab is Tailscale-only (not publicly reachable), so a direct browser fetch
of the homelab is not an option.

## Approach (chosen)

Push model via Cloudflare KV + a Pages Function. The homelab pushes fresh JSON to an
authenticated endpoint that stores it in KV; the page reads that endpoint (edge-cached), with the
committed static JSON as a graceful fallback.

Rejected: git-commit-per-update (blows the Pages 500 builds/month free cap, spams history);
Cloudflare Tunnel from the homelab (exposes a homelab endpoint, couples site data to homelab
uptime).

## Data flow

```
homelab cron ──writes──> config/minecraft-stats.json (local, source for the POST)
     │
     └── curl POST /api/stats  (Authorization: Bearer <STATS_TOKEN>)
                │
        functions/api/stats.js  onRequestPost → validate → STATS_KV.put('minecraft', json)
                                 onRequestGet  → STATS_KV.get('minecraft') → 60s edge cache

browser (home-live.js, dashboard.html):
     fetch('/api/stats')  ──(404 / error)──>  fetch('/config/minecraft-stats.json')  (static seed)
```

## Components

### 1. `functions/api/stats.js` (new — Cloudflare Pages Function, route `/api/stats`)
Deploys automatically (repo root `functions/` dir is compiled by Pages; the existing
`cloudflare/pages-action` deploy needs no change). Exports:

- `export function validateStats(text)` — pure. Parses `text` as JSON; returns the parsed object
  if it is an object with a `metrics` object and a string `lastUpdated`; throws `Error` otherwise.
  Node-testable without any Cloudflare runtime.
- `export async function onRequestGet(context)` — `const v = await context.env.STATS_KV.get('minecraft')`.
  If `v` is null → `404` (`{ error: 'no data' }`). Else → `200` with body `v`, headers
  `Content-Type: application/json` and `Cache-Control: public, max-age=60`.
- `export async function onRequestPost(context)`:
  1. `const auth = context.request.headers.get('Authorization') || ''`. Require
     `auth === 'Bearer ' + context.env.STATS_TOKEN` via a constant-time compare
     (`timingSafeEqualStr`, a small helper that compares byte-by-byte, always full length).
     Missing/empty `STATS_TOKEN` env → `503` (misconfigured). Mismatch → `401`.
  2. Read body with a size cap: reject bodies > 16384 bytes → `413`.
  3. `validateStats(body)`; on throw → `400` (`{ error: 'invalid stats' }`).
  4. `await context.env.STATS_KV.put('minecraft', body)`. → `204`.
- CORS: none needed. GET is same-origin (page + function both on chai-homelab.com); POST is
  server-to-server (curl), not a browser request.

### 2. Client — shared `js/stats-source.js` (new) + two consumers
DRY the fallback into one small module both pages import:
- `js/stats-source.js` exports `async function fetchStats({ timeoutMs = 3000, fetchImpl = fetch } = {})`:
  tries `GET /api/stats`; on non-OK or throw, retries `GET /config/minecraft-stats.json`; returns
  the parsed JSON object, or throws if both fail. Uses an `AbortController` timeout per attempt.
  `fetchImpl` injection makes it node-testable.
- `js/home-live.js`: `initHomeLive()` calls `fetchStats()` instead of its inline
  `fetch(STATS_URL)`; keeps `formatStats`/`isStale`/staleness UI unchanged (it already keys off
  `lastUpdated`).
- `dashboard.html`: its inline module imports `fetchStats` from `/js/stats-source.js` and replaces
  the single `STATS_URL` fetch; keeps its existing render / staleness / error UI.
- The 60s edge cache on `/api/stats` is the freshness control; the fetch itself may pass
  `cache: 'no-store'` so the browser always revalidates with the edge.

### 3. Cron (`scripts/update-minecraft-stats.sh` — edited on the homelab via SSH)
- After the existing local write of `config/minecraft-stats.json`, append a push step:
  read the token from `${STATS_TOKEN_FILE:-$HOME/.aria-stats-token}` (a non-git file, `chmod 600`);
  if present, `curl -sf --max-time 10 -X POST https://chai-homelab.com/api/stats
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
  --data-binary @minecraft-stats.json`. Log success/failure; never fail the cron on push error
  (local write already succeeded). No secret enters git.
- The repo copy of the script gets the same change (source of truth); the homelab's deployed copy
  is updated to match.

### 4. One-time Cloudflare setup (owner action — documented, not automated)
The agent has no Cloudflare account access and will not handle the secret. Checklist to hand over:
1. Generate a token: `openssl rand -hex 32`.
2. Cloudflare dashboard → Workers & Pages → KV → Create namespace (e.g. `career-portal-stats`).
3. Pages project `career-portal` → Settings → Functions → KV namespace bindings → add binding
   `STATS_KV` → the new namespace (for Production, and Preview if desired).
4. Same project → Settings → Environment variables → add `STATS_TOKEN` (encrypted) = the token,
   for Production.
5. On the homelab: `printf '%s' '<token>' > ~/.aria-stats-token && chmod 600 ~/.aria-stats-token`.
6. Redeploy once (any push to master) so the Function picks up the binding, then confirm the next
   cron run makes `/api/stats` serve live data.

## Error handling

- GET before first push / KV empty → 404 → client falls back to static file (site still renders).
- POST bad/missing token → 401 / 503; malformed or oversized body → 400 / 413; KV write failure →
  propagate 500 (cron logs it, retries next cycle). None of these affect what visitors see (they
  read GET, which serves last-good KV or the static fallback).
- Client: `/api/stats` unreachable → static fallback → existing stale/failed handling.

## Testing

- `tests/stats-endpoint.mjs` (new, node:test):
  - `validateStats`: accepts the real `config/minecraft-stats.json`; rejects non-JSON, non-object,
    missing `metrics`, missing/`non-string` `lastUpdated`, oversized (caller-enforced) cases.
  - `onRequestGet`: with a mock `env.STATS_KV` (Map-backed `get`), returns 200 + `max-age=60` when
    present, 404 when empty.
  - `onRequestPost`: mock `env` (`STATS_KV` Map, `STATS_TOKEN`), mock `Request` with headers/body;
    asserts 401 on bad token, 503 on missing token, 400 on bad body, 413 on oversize, 204 + KV
    written on success.
- `tests/stats-source.mjs` (new): `fetchStats` with an injected `fetchImpl` — returns `/api/stats`
  body when OK; falls back to the static file when `/api/stats` is non-OK or throws; throws when
  both fail; honors the timeout.
- Gate: `npm test` green, `npx eslint .` 0 errors. Service worker: `/api/stats` is dynamic — do
  NOT precache it; the static `/config/minecraft-stats.json` stays precached as the fallback.

## Cost & limits

144 KV writes/day (free cap 1,000/day). Reads bounded by the 60s edge cache (free cap
100k/day). Storage: one ~1KB value. Pages Functions share the Workers 100k req/day free tier.
Net: $0.

## Out of scope

- Historical stats / charts over time (KV holds only the latest snapshot).
- Auth rotation UI (rotate by changing both the Pages env var and the homelab token file).
- Fixing the SW `/js/` scope (tracked separately).
