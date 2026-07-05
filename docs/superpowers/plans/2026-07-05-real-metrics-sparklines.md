# Real Metrics + Sparklines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the remaining fabricated dashboard/homepage fields with real Prometheus metrics and add SVG sparkline trends, per `docs/superpowers/specs/2026-07-05-real-metrics-sparklines-design.md`.

**Architecture:** `scripts/prom_stats.py` gains extra instant metrics + a `runtime` block + `monitoring` targets + a `trends` block from Prometheus **range** queries; a pure `js/sparkline.js` turns value-arrays into inline-SVG paths; `dashboard.html`/`js/home-live.js`/`index.html` render the real values + sparklines. The Pages Function is unchanged.

**Tech Stack:** Python 3 (stdlib urllib), vanilla JS ES modules, inline SVG, `node --test`, ESLint.

## Global Constraints (from spec)

- No bundler/frameworks. Single quotes, semicolons, 2-space JS; ES modules.
- All dynamic text via `textContent` (never innerHTML for feed data). Sparklines are `aria-hidden="true"` decorative; every trend also shows its current value as text.
- Every metric field falls back to its previous (base-file) value on query failure — never write garbage.
- KV/`/api/stats` body stays < 16 KB (new payload ≈ 2 KB). Function unchanged.
- `npm test` green; `npx eslint .` 0 errors.
- Field names (exact): `metrics.{mspt,rconMs,systemLoad,threads,gcCount,processUptimeDays}`, `runtime.{classesLoaded,gcTimeSec,cpuHours,threadPeak}`, `monitoring.{targetsHealthy,targetsTotal}`, `trends.{heap,mspt,load,cpu}`.
- Metric queries all use `job="minecraft-metrics"`.

## File map

- **Modify:** `scripts/prom_stats.py` (metrics + runtime + monitoring + trends + parse_range + selftest), `js/home-live.js` (scrapes→mspt), `index.html` (homepage stat), `dashboard.html` (real rows, Runtime card, targets, sparklines), `tests/home-live.mjs` (scrapes→mspt), `config/minecraft-stats.json` (seed → new shape).
- **Create:** `js/sparkline.js`, `tests/sparkline.mjs`.

---

### Task 1: sparkline helper (TDD)

**Files:** Create `js/sparkline.js`, `tests/sparkline.mjs`
**Produces:** `export function sparklinePath(values, w = 120, h = 28, pad = 2)` → SVG path `d` string (`''` when fewer than 2 points).

- [ ] **Step 1: failing test** `tests/sparkline.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sparklinePath } from '../js/sparkline.js';

describe('sparklinePath', () => {
  it('empty / single point → empty string', () => {
    assert.equal(sparklinePath([]), '');
    assert.equal(sparklinePath([5]), '');
  });
  it('ascending values rise (last y above first y in SVG coords)', () => {
    const d = sparklinePath([0, 1, 2, 3], 120, 28, 2);
    assert.match(d, /^M/);
    const ys = [...d.matchAll(/[ML]\s*[\d.]+\s+([\d.]+)/g)].map((m) => parseFloat(m[1]));
    assert.ok(ys[0] > ys[ys.length - 1]); // SVG y grows downward, so rising data = decreasing y
  });
  it('constant values → flat mid-line', () => {
    const d = sparklinePath([7, 7, 7], 120, 28, 2);
    const ys = [...d.matchAll(/[ML]\s*[\d.]+\s+([\d.]+)/g)].map((m) => parseFloat(m[1]));
    assert.ok(ys.every((y) => Math.abs(y - 14) < 0.01)); // mid of h=28
  });
  it('stays within the box', () => {
    const d = sparklinePath([3, 9, 1, 8, 2], 120, 28, 2);
    const pts = [...d.matchAll(/[ML]\s*([\d.]+)\s+([\d.]+)/g)];
    for (const [, x, y] of pts) {
      assert.ok(parseFloat(x) >= 0 && parseFloat(x) <= 120);
      assert.ok(parseFloat(y) >= 0 && parseFloat(y) <= 28);
    }
  });
});
```

- [ ] **Step 2:** `node --test tests/sparkline.mjs` → FAIL (module missing).
- [ ] **Step 3: implement** `js/sparkline.js`:

```js
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
```

- [ ] **Step 4:** `node --test tests/sparkline.mjs` → PASS. `npx eslint js/sparkline.js` → clean.
- [ ] **Step 5:** `git add js/sparkline.js tests/sparkline.mjs && git commit -m "feat: pure SVG sparkline path helper"`

---

### Task 2: prom_stats.py — real metrics, runtime, targets, trends (TDD on parsers)

**Files:** Modify `scripts/prom_stats.py`
**Consumes:** existing `parse_instant`, `fetch`, `load_base`, `build`.
**Produces:** `parse_range(text) -> list[float]`; `build()` output gains `metrics.{mspt,rconMs,systemLoad,threads,gcCount,processUptimeDays}`, `runtime`, `monitoring.{targetsHealthy,targetsTotal}`, `trends.{heap,mspt,load,cpu}`.

- [ ] **Step 1:** add `parse_range` + a `fetch_range` + selftest cases. Insert after `parse_instant`:

```python
def parse_range(text):
    """Value array of a Prometheus range-query response (data.result[0].values), or []."""
    d = json.loads(text)
    if d.get("status") != "success":
        return []
    result = d.get("data", {}).get("result", [])
    if not result:
        return []
    return [round(float(v[1]), 2) for v in result[0].get("values", [])]


def fetch_range(expr, hours=24, step=3600, timeout=15):
    import time
    end = int(time.time())
    start = end - hours * 3600
    qs = urllib.parse.urlencode({"query": expr, "start": start, "end": end, "step": step})
    url = PROM.replace("/query", "/query_range") + "?" + qs
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return parse_range(resp.read().decode())
    except Exception:
        return []
```

- [ ] **Step 2:** extend `selftest()` (before the final `print`):

```python
    assert parse_range(
        '{"status":"success","data":{"result":[{"metric":{},'
        '"values":[[1,"3.1"],[2,"3.4"],[3,"3.2"]]}]}}') == [3.1, 3.4, 3.2]
    assert parse_range('{"status":"success","data":{"result":[]}}') == []
    assert parse_range('{"status":"error"}') == []
```

- [ ] **Step 3:** in `build()`, after the existing heap/uptime block and before `base["lastUpdated"]`, add the real metrics + runtime + targets + trends:

```python
    mspt = fetch(f'minecraft_tick_average{{{JOB}}}')
    if mspt is not None and mspt >= 0:
        m["mspt"] = round(mspt, 1)
    rcon = fetch(f'scrape_duration_seconds{{{JOB},endpoint="rcon-metrics"}}')
    if rcon is not None and rcon >= 0:
        m["rconMs"] = round(rcon * 1000)
    load = fetch(f'java_lang_OperatingSystem_SystemLoadAverage{{{JOB}}}')
    if load is not None and load >= 0:
        m["systemLoad"] = round(load, 2)
    threads = fetch(f'jvm_threads_current{{{JOB}}}')
    if threads is not None and threads >= 0:
        m["threads"] = round(threads)
    gc = fetch(f'sum(jvm_gc_collection_seconds_count{{{JOB}}})')
    if gc is not None and gc >= 0:
        m["gcCount"] = round(gc)
    upsec = fetch(f'time() - process_start_time_seconds{{{JOB},endpoint="jmx-metrics"}}')
    if upsec is not None and upsec > 0:
        m["processUptimeDays"] = round(upsec / 86400, 1)

    runtime = base.setdefault("runtime", {})
    classes = fetch(f'jvm_classes_currently_loaded{{{JOB}}}')
    if classes is not None and classes >= 0:
        runtime["classesLoaded"] = round(classes)
    gct = fetch(f'sum(jvm_gc_collection_seconds_sum{{{JOB}}})')
    if gct is not None and gct >= 0:
        runtime["gcTimeSec"] = round(gct, 1)
    cpu = fetch(f'process_cpu_seconds_total{{{JOB},endpoint="jmx-metrics"}}')
    if cpu is not None and cpu >= 0:
        runtime["cpuHours"] = round(cpu / 3600, 1)
    tpk = fetch(f'jvm_threads_peak{{{JOB}}}')
    if tpk is not None and tpk >= 0:
        runtime["threadPeak"] = round(tpk)

    mon = base.setdefault("monitoring", {})
    healthy = fetch(f'sum(up{{{JOB}}})')
    total = fetch(f'count(up{{{JOB}}})')
    if healthy is not None:
        mon["targetsHealthy"] = round(healthy)
    if total is not None:
        mon["targetsTotal"] = round(total)
    for dead in ("prometheusScrapes", "rconLatency", "discordAlertsToday", "grafanaPanels"):
        mon.pop(dead, None)

    base["trends"] = {
        "heap": fetch_range(f'sum(jvm_memory_used_bytes{{{JOB},area="heap"}})/1048576'),
        "mspt": fetch_range(f'minecraft_tick_average{{{JOB}}}'),
        "load": fetch_range(f'java_lang_OperatingSystem_SystemLoadAverage{{{JOB}}}'),
        "cpu": fetch_range(f'rate(process_cpu_seconds_total{{{JOB},endpoint="jmx-metrics"}}[10m])*100'),
    }
    base.pop("recentChanges", None)
```

- [ ] **Step 4:** `python3 scripts/prom_stats.py --selftest` → `prom_stats selftest OK`. `npm test` → green (tests/stats-cron.mjs runs the selftest).
- [ ] **Step 5:** `git add scripts/prom_stats.py && git commit -m "feat: prom_stats emits real metrics, runtime, targets, and 24h trends"`

---

### Task 3: homepage stat (scrapes → MSPT)

**Files:** Modify `js/home-live.js`, `index.html`, `tests/home-live.mjs`

- [ ] **Step 1:** `tests/home-live.mjs` — replace the `scrapes` expectations with `mspt`:
  - line ~21 `assert.equal(s.scrapes, '894k');` → `assert.equal(s.mspt, '3.4 ms');` (use a real-shaped input: the "formats the real minecraft-stats.json" test builds from REAL; after Task 5 the seed has `mspt`. For now assert on a crafted input in the dedicated test below.)
  - Replace the `formatCount`/scrapes block (lines ~66-70) with:

```js
    assert.equal(formatStats({ metrics: { mspt: 3.4 } }).mspt, '3.4 ms');
    assert.equal(formatStats({ metrics: { mspt: 18 } }).mspt, '18 ms');
    assert.equal(formatStats({ metrics: {} }).mspt, null);
```
  - In the "formats the real…" test, change `assert.equal(s.scrapes, '894k');` to `assert.equal(typeof s.mspt === 'string' || s.mspt === null, true);` (seed-shape-agnostic).

- [ ] **Step 2:** `node --test tests/home-live.mjs` → FAIL (`mspt` undefined).
- [ ] **Step 3:** `js/home-live.js`:
  - `LIVE_FIELDS` (line 17): replace `'scrapes'` with `'mspt'`.
  - In `formatStats` (line ~81): replace `scrapes: formatCount(monitoring.prometheusScrapes),` with:

```js
    mspt: Number.isFinite(metrics.mspt) ? `${metrics.mspt} ms` : null,
```
  - Remove the now-unused `formatCount` function (lines ~23-27) **only if** nothing else uses it (grep first; `scrapes` was its only caller).

- [ ] **Step 4:** `index.html` — the homepage 4th live stat (line ~184):

```html
            <span class="stat__value" data-live-mspt>3.4 ms</span>
            <span class="stat__label">Avg tick time (MSPT)</span>
```
  (replace the `data-live-scrapes` value span and its label; keep the surrounding `.stat` wrapper.)

- [ ] **Step 5:** `node --test tests/home-live.mjs` → PASS. `npx eslint .` → clean.
- [ ] **Step 6:** `git add js/home-live.js index.html tests/home-live.mjs && git commit -m "feat: homepage shows real MSPT instead of fabricated scrape count"`

---

### Task 4: dashboard — real Server card, Runtime card, targets, sparklines

**Files:** Modify `dashboard.html`
**Consumes:** `sparklinePath` from Task 1; the new JSON fields from Task 2.

- [ ] **Step 1:** at the top of the dashboard inline module, import the helper:

```js
    import { sparklinePath } from '/js/sparkline.js?v=18';
```

- [ ] **Step 2:** read the current Server-detail and "Recent changes" card markup (`grep -n 'db-meta-\|Recent changes\|db-changes\|renderChanges' dashboard.html`). Server card: keep Name + Version rows; replace the RCON + Discord rows' value spans with ids `db-meta-rcon` (RCON round-trip), `db-meta-load` (System load), and add rows `db-meta-uptime` (Process uptime), `db-meta-threads` (JVM threads), `db-meta-gc` (GC collections). Replace the "Recent changes" card body with a "Runtime" list holding value spans `db-rt-classes`, `db-rt-gctime`, `db-rt-cpu`, `db-rt-threadpeak`. Add `<svg class="sparkline" aria-hidden="true" viewBox="0 0 120 28"><path id="db-spark-heap"/></svg>` under the heap bar, and similarly `db-spark-mspt`, `db-spark-load` under new MSPT/load stat blocks (or the Runtime card). CSS: `.sparkline{width:100%;max-width:140px;height:28px} .sparkline path{fill:none;stroke:var(--accent-cyan);stroke-width:1.5;opacity:.8}` in `css/pages/dashboard.css`.

- [ ] **Step 3:** in `renderMinecraft`, replace the RCON/Discord/renderChanges block with real fields + sparklines:

```js
      const mon = stats.monitoring || {};
      const rt = stats.runtime || {};
      const trends = stats.trends || {};

      setText('db-meta-rcon', Number.isFinite(metrics.rconMs) ? `${metrics.rconMs} ms` : '—');
      setText('db-meta-load', Number.isFinite(metrics.systemLoad) ? String(metrics.systemLoad) : '—');
      setText('db-meta-uptime', Number.isFinite(metrics.processUptimeDays) ? `${metrics.processUptimeDays} d` : '—');
      setText('db-meta-threads', Number.isFinite(metrics.threads) ? String(metrics.threads) : '—');
      setText('db-meta-gc', Number.isFinite(metrics.gcCount) ? metrics.gcCount.toLocaleString() : '—');

      setText('db-rt-classes', Number.isFinite(rt.classesLoaded) ? rt.classesLoaded.toLocaleString() : '—');
      setText('db-rt-gctime', Number.isFinite(rt.gcTimeSec) ? `${rt.gcTimeSec} s` : '—');
      setText('db-rt-cpu', Number.isFinite(rt.cpuHours) ? `${rt.cpuHours} h` : '—');
      setText('db-rt-threadpeak', Number.isFinite(rt.threadPeak) ? String(rt.threadPeak) : '—');

      setText('db-meta-targets', (Number.isFinite(mon.targetsHealthy) && Number.isFinite(mon.targetsTotal))
        ? `${mon.targetsHealthy}/${mon.targetsTotal} healthy` : '—');

      const spark = (id, arr) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('d', sparklinePath(Array.isArray(arr) ? arr : [], 120, 28, 2));
      };
      spark('db-spark-heap', trends.heap);
      spark('db-spark-mspt', trends.mspt);
      spark('db-spark-load', trends.load);
```
  Delete the old `renderChanges(stats.recentChanges)` call and the `renderChanges` function if now unused (grep).

- [ ] **Step 4:** update `FALLBACK_STATS` (dashboard.html ~line 218) to the new shape: drop `rconLatency`/`discordAlertsToday`/`recentChanges`; add `metrics.mspt/rconMs/systemLoad/threads/gcCount/processUptimeDays`, `runtime`, `monitoring.targetsHealthy/Total`, `trends` (small arrays). Keep it a plausible last-known snapshot.

- [ ] **Step 5:** serve locally (`npx serve -l 3111 .`), load `/dashboard.html`; Playwright: real values render, sparkline paths non-empty (given seed trends), no console errors, keyboard/labels intact. `npm test` green, `npx eslint .` clean.
- [ ] **Step 6:** `git add dashboard.html css/pages/dashboard.css && git commit -m "feat: dashboard real Server + Runtime cards, targets, and heap/MSPT/load sparklines"`

---

### Task 5: seed JSON, deploy, homelab run, verify

- [ ] **Step 1:** regenerate the committed seed to the new shape: `cd config && PROM_URL=http://127.0.0.1:1/nope python3 ../scripts/prom_stats.py > /tmp/seed.json` won't reach Prometheus locally — instead hand-write `config/minecraft-stats.json` to the new shape using representative real values (mspt 3.4, rconMs 864, systemLoad 2.7, threads 43, gcCount 1822, processUptimeDays 5.9, runtime{classesLoaded 35854,gcTimeSec 77.3,cpuHours 6.5,threadPeak 47}, monitoring{targetsHealthy 2,targetsTotal 2}, trends with ~8 sample points each). This is the fallback seed; the cron overwrites it with live data on the homelab.
- [ ] **Step 2:** `npm test` green, `npx eslint .` clean. Commit: `chore: update stats seed to real-metrics + trends shape`.
- [ ] **Step 3:** deploy: `git push origin redesign/v2:refs/heads/redesign/v2-incoming`; on homelab ff preview + ff master + `git push origin master` (masked). CI must pass (tests gate deploy).
- [ ] **Step 4:** on homelab, run `~/career-portal/scripts/update-minecraft-stats.sh` → `[stats] pushed to edge OK`; inspect the written JSON has real metrics + non-empty trends.
- [ ] **Step 5:** verify prod: `curl -s https://chai-homelab.com/api/stats | python3 -m json.tool` shows real `metrics`/`runtime`/`monitoring`/`trends`; Playwright on `/dashboard.html` (real Server + Runtime cards, sparklines drawn) and `/` (homepage 4th stat = MSPT). No console errors.

## Self-review

- **Spec coverage:** mapping table → Tasks 2 (prom_stats), 3 (homepage), 4 (dashboard); sparklines → Tasks 1 (helper), 2 (trends data), 4 (render); data shape → Tasks 2, 5; testing → Tasks 1-4; error handling/fallback → Task 2 (per-field guards) + Task 4 (`—` on missing) + sparkline `''`. No gaps.
- **Placeholders:** none — full code for the testable units; Task 4 HTML wiring references a grep-then-edit because the card markup must be read live, with exact element ids + render code given.
- **Type consistency:** field names match the spec's Global Constraints across prom_stats output, dashboard render, home-live, and tests (`mspt`, `rconMs`, `systemLoad`, `threads`, `gcCount`, `processUptimeDays`, `runtime.*`, `monitoring.targets*`, `trends.{heap,mspt,load,cpu}`); `sparklinePath(values,w,h,pad)` signature identical in Task 1 def and Task 4 use.
