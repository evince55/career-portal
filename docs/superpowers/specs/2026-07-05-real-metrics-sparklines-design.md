# Real Metrics + Sparklines — Design Spec

**Date:** 2026-07-05 · **Status:** Approved (real values + sparkline trends; Recent-changes card → real Runtime card)

## Problem

After fixing the Prometheus parse, the four gauges (TPS, players, heap, uptime) are live — but several
displayed fields are still fabricated/static: `prometheusScrapes` ("894k" on the homepage),
`rconLatency` ("15ms"), `discordAlertsToday`, `grafanaPanels`, and the editorial `recentChanges`
list. Replace them with real, meaningful Prometheus metrics, and add trend sparklines to the
metrics that vary.

## Real-metric mapping (all `job="minecraft-metrics"`)

| Field / display | Real metric | Notes |
|---|---|---|
| homepage 4th stat `prometheusScrapes` "894k" | `minecraft_tick_average` → **MSPT** (ms) | server tick time; pairs with TPS. Field `mspt`. |
| dashboard `rconLatency` "15ms" | `scrape_duration_seconds{endpoint="rcon-metrics"}`×1000 → **RCON round-trip ms** | Field `rconMs`. Relabel "RCON round-trip". |
| dashboard `discordAlertsToday` | `java_lang_OperatingSystem_SystemLoadAverage` → **System load** | Field `systemLoad`. |
| `grafanaPanels` | — remove (rendered nowhere) | drop from JSON. |
| (enrich Server card) | `time()-process_start_time_seconds{endpoint="jmx-metrics"}` → **process uptime (days)** | Field `processUptimeDays`. |
| (enrich Server card) | `jvm_threads_current` → **JVM threads** | Field `threads`. |
| (enrich Server card) | `sum(jvm_gc_collection_seconds_count)` → **GC collections** | Field `gcCount`. |
| "Recent changes" card → **Runtime** card | classes `jvm_classes_currently_loaded`; GC time `sum(jvm_gc_collection_seconds_sum)`; CPU `process_cpu_seconds_total`/3600 h; thread peak `jvm_threads_peak` | replaces `recentChanges` with a `runtime` object. |
| dashboard "Monitoring bill" / status | `count(up)` / `sum(up)` → **targets healthy X/Y** | `monitoring` gains `targetsHealthy`/`targetsTotal`; replaces discord/grafana. |

Every field falls back to its previous value on query failure (existing pattern).

## Sparklines ("graphify")

`prom_stats.py` runs Prometheus **range queries** (last 24h, 3600s step ≈ 24 points) for the
metrics that move and adds a `trends` object of value-arrays:
- `heap` = `sum(jvm_memory_used_bytes{area="heap"})/1048576` (MB)
- `mspt` = `minecraft_tick_average`
- `load` = `java_lang_OperatingSystem_SystemLoadAverage`
- `cpu`  = `rate(process_cpu_seconds_total[10m])*100` (CPU %, so the line varies rather than being a monotone cumulative)

Rendered as tiny inline-SVG sparklines via a new pure helper `js/sparkline.js`
`sparklinePath(values, w, h) → string` (an SVG polyline `points`/path scaled to the value range).
Sparklines attach under: heap gauge, MSPT stat, system-load stat, CPU (Runtime card). Flat series
render a centered flat line; empty/one-point series render nothing (`aria-hidden`, decorative — the
numbers remain the accessible source of truth). No libraries — same inline-SVG approach as the
existing gauges/diagrams. KV payload grows ≈ 1 KB (4 arrays × ≤24 floats), well under the 16 KB cap.

## Data shape (new `config/minecraft-stats.json`)

```json
{
  "server": { "name": "...", "version": "...", "javaVersion": "...", "lastRestart": "..." },
  "metrics": {
    "tps": 20, "players": 1, "maxPlayers": 20, "uptime": "100.0%",
    "heapUsedMB": 1576, "heapMaxMB": 3072,
    "mspt": 3.4, "rconMs": 864, "systemLoad": 2.74,
    "threads": 43, "gcCount": 1822, "processUptimeDays": 5.9
  },
  "runtime": { "classesLoaded": 35854, "gcTimeSec": 77.3, "cpuHours": 6.46, "threadPeak": 47 },
  "monitoring": { "targetsHealthy": 2, "targetsTotal": 2 },
  "trends": { "heap": [1490, 1512, ...], "mspt": [3.1, 3.4, ...], "load": [2.6, 2.7, ...], "cpu": [11, 13, ...] },
  "lastUpdated": "..."
}
```

The committed seed `config/minecraft-stats.json` is updated to this shape (fallback source).

## Components

- **`scripts/prom_stats.py`** — add `parse_range(text)` (returns `[float,…]` from a range response),
  the extra instant metrics, `runtime`, `monitoring` (targets), and `trends`. Per-field fallback to
  the loaded base. Extend `--selftest` to cover `parse_range`.
- **`js/sparkline.js`** (new) — pure `sparklinePath(values, w=120, h=28, pad=2)`; returns an SVG
  `<path d="…">` string (normalized to min/max, flat line when constant). Exported for node tests.
- **`dashboard.html`** — Server card: real RCON round-trip, system load, process uptime, threads,
  GC collections. "Recent changes" card → "Runtime" card (classes, GC time, CPU hours, thread peak).
  Status/targets from `monitoring`. Sparklines under heap/MSPT/load via `sparkline.js`. All values via
  `textContent`.
- **`js/home-live.js`** — `formatStats`: replace `scrapes` (from `monitoring.prometheusScrapes`) with
  `mspt` (from `metrics.mspt`, formatted "3.4 ms"); update `LIVE_FIELDS`.
- **`index.html`** — homepage 4th stat: `data-live-scrapes`/"894k" → `data-live-mspt`, label
  "avg tick time (ms)".
- **`functions/api/stats.js`** — unchanged (validates `metrics` + `lastUpdated`; `runtime`/`trends`
  ride along). MAX_BODY (16 KB) unchanged — new payload ≈ 2 KB.

## Error handling

- Any instant/range query failing → keep the base (previous) value for that field; never write
  garbage (existing `prom_stats.build()` fallback contract).
- Empty/short trend array → dashboard renders no sparkline for that metric (numbers still show).
- Sparklines are decorative (`aria-hidden="true"`); every trend has its current value shown as text
  (a11y: charts are never the only representation).

## Testing

- `prom_stats.py --selftest`: existing instant-parse cases + new `parse_range` cases (extracts the
  value array from a fixture; empty result → `[]`). Run in CI by `tests/stats-cron.mjs`.
- `tests/sparkline.mjs` (new, node): `sparklinePath` — ascending values → a rising path within the
  box; constant values → a flat mid-line; `[]`/one point → empty string; output stays within `w`×`h`.
- `tests/home-live.mjs`: update `formatStats` expectations (`mspt` replaces `scrapes`); `LIVE_FIELDS`.
- `tests/site-integrity.mjs`: unaffected (`/api/stats` still not precached; static seed still present).
- Gate: `npm test` green, `npx eslint .` 0 errors. Verify live on the homelab (real values + trends)
  then on production (`/api/stats` + dashboard + homepage).

## Out of scope

- Historical storage beyond Prometheus's own retention (range queries read Prometheus directly each
  push — no extra store).
- Charting library / interactive charts (sparklines are static SVG).
- The player-count-reads-1-when-0 exporter quirk (separate; a stale rcon player series).
