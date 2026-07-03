# chai-homelab.com v2 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the portfolio as a recruiter-first, content-first site on a new dark design system, per `docs/superpowers/specs/2026-07-03-site-redesign-design.md` (the spec — read it first; it is the contract).

**Architecture:** Phase 1 builds the shared foundation (tokens, base components, palette, fonts) that every page consumes. Phase 2 runs 5 parallel page lanes with disjoint write-sets against the frozen foundation. Phase 3 integrates (SW, metadata, dead-code removal, suite reconciliation). Phase 4 verifies (Playwright breakpoints, design critique, a11y, copy, spec verifier) and fixes. Phase 5 delivers a preview on the homelab.

**Tech Stack:** Vanilla JS ES modules, CSS custom properties, `node --test`, ESLint v8, Playwright (via MCP, orchestrator-only), Three.js (vendored, pinned), Cloudflare Pages (deploy unchanged, owner-gated).

## Global Constraints (verbatim from spec)

- Vanilla JS + CSS static PWA, ES modules, **no bundler or transpiler**. No new build tooling.
- `node --test` suite green; ESLint 0 errors, before anything is "done".
- Service-worker cache name → `career-portal-v7`; ASSETS_TO_CACHE must match new files.
- WCAG 2.1 AA hard requirement (contrast ≥4.5:1 normal text / 3:1 large+UI; keyboard complete; reduced-motion honored globally).
- Lighthouse ≥95 all categories target; initial JS on index <50KB (Three.js lazy, post-LCP).
- All dynamic text through `escapeHtml()` before any `innerHTML`.
- Single quotes, semicolons, 2-space indent. Dark theme only.
- No production deploy / push to GitHub / DNS / secret changes — preview goes to the homelab repo remote only.
- Copy tone: plain, concrete, outcome-led, early-career-honest.

## File map

**Create:** `css/tokens.css`, `css/base.css`, `css/pages/{home,projects,case-study,dashboard,contact,misc}.css`, `js/palette.js`, `js/home-live.js`, `js/three-hero.js`, `js/vendor/three.module.min.js`, `fonts/space-grotesk.woff2`, `fonts/jetbrains-mono.woff2`, `projects.html`, `projects/{meshwatch,minecraft-monitoring,monitoring-stack,azure-functions,career-portal}.html`, `404.html`, `sitemap.xml`, `tests/{design-tokens,palette,site-integrity,home-live}.mjs`
**Rewrite:** `index.html`, `dashboard.html`, `contact.html`, `offline.html`, `project-explorer.html` (redirect stub), `writeups.html` (redirect stub), `js/service-worker.js` (v7), `manifest.json`, `json-ld.json`, `README.md`, `AGENTS.md`
**Keep (edit lightly):** `js/project-catalog.js` (+slug/outcome/caseStudyUrl), `js/writeups-data.js` (content source), `js/contact-api.js`, `js/pwa.js`, `js/performance.js`, `js/utils/helpers.js` (drop COMMAND_* exports), `js/scroll-reveal.js`
**Delete:** `js/terminal.js`, `js/achievements.js`, `js/audio.js`, `js/ai-assistant.js`, `js/mobile-nav.js`, `js/three-{init,grid,geometries,manager}.js` (superseded by three-hero.js), `js/meshwatch-api.js` **iff** dashboard.html doesn't use it (verify: `grep meshwatch dashboard.html`), `css/styles.css` (superseded), tests: `terminal*.mjs`, `new-commands.mjs`, `new-features.mjs`, `new-pages.mjs`, `phase{2,3,4}.mjs`, `audio.mjs`, `ai-assistant.mjs`, `writeups.mjs`, `three-integration.mjs`, `optimizations.mjs`, `accessibility-live-regions.mjs`, `meshwatch-api.mjs` (with module)

---

## Phase 1 — Foundation (sequential, orchestrator-owned)

### Task 1: Design tokens + contrast test (TDD)

**Files:** Create `css/tokens.css`, `tests/design-tokens.mjs`

- [ ] **Step 1: Write the failing contrast test** — parses tokens.css, computes WCAG ratios:

```js
// tests/design-tokens.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
const token = (name) => {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `token ${name} must be a 6-digit hex in tokens.css`);
  return m[1];
};
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe('design tokens meet WCAG AA', () => {
  const pairs = [
    ['--text-1', '--bg-0', 4.5], ['--text-1', '--bg-1', 4.5], ['--text-1', '--bg-2', 4.5],
    ['--text-2', '--bg-0', 4.5], ['--text-2', '--bg-1', 4.5], ['--text-2', '--bg-2', 4.5],
    ['--text-3', '--bg-0', 4.5], ['--text-3', '--bg-1', 4.5],
    ['--accent-cyan', '--bg-0', 4.5], ['--accent-cyan', '--bg-1', 4.5],
    ['--accent-magenta', '--bg-0', 4.5],
    ['--ok', '--bg-1', 3], ['--warn', '--bg-1', 3], ['--err', '--bg-1', 4.5],
  ];
  for (const [fg, bg, min] of pairs) {
    it(`${fg} on ${bg} ≥ ${min}:1`, () => {
      assert.ok(ratio(token(fg), token(bg)) >= min,
        `${fg} ${token(fg)} on ${bg} ${token(bg)} = ${ratio(token(fg), token(bg)).toFixed(2)}`);
    });
  }
});
```

- [ ] **Step 2:** `node --test tests/design-tokens.mjs` → FAIL (no tokens.css)
- [ ] **Step 3: Write tokens.css** with starting values (adjust VALUES if a ratio fails, never the test):

```css
:root {
  /* surfaces */
  --bg-0: #08080d; --bg-1: #10101a; --bg-2: #181826;
  --line: rgba(255, 255, 255, 0.08);
  /* text */
  --text-1: #eceaf4; --text-2: #b4b2c9; --text-3: #8b89a3;
  /* accents (evolved synthwave) */
  --accent-cyan: #3fd8e8; --accent-cyan-dim: rgba(63, 216, 232, 0.35);
  --accent-magenta: #f45fd0; --accent-magenta-dim: rgba(244, 95, 208, 0.3);
  --ok: #4ade80; --warn: #fbbf24; --err: #ff8a8a;
  /* type */
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-body: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
  --fs-0: 0.8125rem; --fs-1: 0.9375rem; --fs-2: 1.125rem; --fs-3: 1.375rem;
  --fs-4: 1.75rem; --fs-5: clamp(2.25rem, 1.2rem + 4.5vw, 3.5rem);
  /* space (4px base) */
  --sp-1: 0.25rem; --sp-2: 0.5rem; --sp-3: 0.75rem; --sp-4: 1rem; --sp-5: 1.5rem;
  --sp-6: 2rem; --sp-8: 3rem; --sp-10: 4rem; --sp-12: 6rem;
  /* radius, motion */
  --r-1: 6px; --r-2: 10px; --r-3: 16px;
  --t-fast: 150ms; --t-med: 250ms; --t-slow: 400ms;
  --ease: cubic-bezier(0.2, 0.7, 0.3, 1);
}
```

- [ ] **Step 4:** `node --test tests/design-tokens.mjs` → PASS (tweak hexes until true; verify --text-3, --err ratios especially)
- [ ] **Step 5:** `git add css/tokens.css tests/design-tokens.mjs && git commit -m "feat: v2 design tokens with AA contrast enforced by test"`

### Task 2: Fonts (self-hosted)

- [ ] Download via curl to `fonts/` (variable, latin subset), from fontsource CDN:
  - `https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk:vf@latest/latin-wght-normal.woff2` → `fonts/space-grotesk.woff2`
  - `https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono:vf@latest/latin-wght-normal.woff2` → `fonts/jetbrains-mono.woff2`
- [ ] Verify both are woff2 (`file fonts/*.woff2`, size 20–120KB each). If download fails: use system stacks only (delete --font-display/--font-mono custom names), note in report, skip @font-face.
- [ ] `@font-face` rules go at top of `css/base.css` (Task 3): `font-display: swap`, `font-weight: 300 700` (variable range). Pages preload both files.
- [ ] Commit: `feat: self-host Space Grotesk + JetBrains Mono`

### Task 3: base.css — components + a11y primitives

**Files:** Create `css/base.css`. **Produces the class contract all page lanes consume** (exact names):
`.container` (max-width 1080px, --sp-5 side padding) · `.skip-link` · `.site-nav` / `.site-nav__links` / `.nav-link` / `[aria-current="page"]` styling · `.btn`, `.btn--primary`, `.btn--ghost` · `.card`, `.card__title`, `.card__meta` · `.chip` · `.stat`, `.stat__value` (mono), `.stat__label` · `.section`, `.section__title`, `.kicker` (mono, cyan, uppercase micro-label) · `.field`, `.field__label`, `.field__input`, `.field__error` · `.footer` · `.visually-hidden` · `.mono` · `.reveal` (scroll-reveal target) · `.palette` (modal), `.palette__input`, `.palette__list`, `.palette__item`, `[aria-selected="true"]`

- [ ] Reset + body defaults (bg-0, text-2, font-body, line-height 1.6); headings font-display/text-1; `:focus-visible` visible 2px cyan outline w/ offset globally; selection color; `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } .reveal { opacity: 1 !important; transform: none !important; } }`
- [ ] Components above; glow ONLY: `.btn--primary:hover/:focus-visible`, hero title accent class `.glow-text`, live-dot `.pulse`. Touch targets ≥44px for nav links/buttons on coarse pointers.
- [ ] Lint check: `npx eslint .` unaffected; visual smoke via a scratch HTML is fine but do not commit scratch files.
- [ ] Commit: `feat: base component styles + a11y primitives`

### Task 4: Command palette (TDD)

**Files:** Create `js/palette.js`, `tests/palette.mjs`
**Interfaces produced:** `export const PALETTE_COMMANDS` (array of `{ id, label, hint, keywords, run }`), `export function filterCommands(query, commands)` (pure), `export function initPalette(doc = document)` (installs Ctrl+K/Cmd+K listener + builds DOM into `#palette-root` if present). Every page includes `<div id="palette-root"></div>` + `<script type="module">import { initPalette } from '/js/palette.js?v=7'; initPalette();</script>` and a visible nav button `<button class="nav-link" data-palette-open aria-label="Open command palette (Ctrl+K)">⌘K</button>`.

- [ ] **Step 1: failing test** (registry + filter — pure parts):

```js
// tests/palette.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PALETTE_COMMANDS, filterCommands } from '../js/palette.js';

describe('command palette', () => {
  it('has nav commands for all pages', () => {
    const ids = PALETTE_COMMANDS.map((c) => c.id);
    for (const p of ['go-home', 'go-projects', 'go-dashboard', 'go-contact']) {
      assert.ok(ids.includes(p), `missing ${p}`);
    }
  });
  it('includes personality commands', () => {
    const ids = PALETTE_COMMANDS.map((c) => c.id);
    for (const p of ['whoami', 'uptime', 'hire-me']) assert.ok(ids.includes(p));
  });
  it('filters by label and keywords, case-insensitive', () => {
    assert.ok(filterCommands('PROJ', PALETTE_COMMANDS).some((c) => c.id === 'go-projects'));
    assert.ok(filterCommands('resume', PALETTE_COMMANDS).length >= 1);
  });
  it('empty query returns all commands', () => {
    assert.equal(filterCommands('', PALETTE_COMMANDS).length, PALETTE_COMMANDS.length);
  });
  it('never returns undefined run handlers', () => {
    for (const c of PALETTE_COMMANDS) assert.equal(typeof c.run, 'function');
  });
});
```

- [ ] **Step 2:** run → FAIL. **Step 3:** implement palette.js — module-level guard `if (typeof document !== 'undefined')` so Node import is safe; DOM part: dialog with `role="dialog"` + `aria-modal`, input `role="combobox"` + `aria-expanded/aria-controls/aria-activedescendant`, list `role="listbox"`, items `role="option"`; ArrowUp/Down/Enter/Esc; focus trap; restores focus on close; commands: go-home/projects/dashboard/contact, copy-email (navigator.clipboard + fallback), view-source (GitHub repo), whoami / uptime (days since 2024-01-01 "homelab uptime") / hire-me (opens contact) / coffee — outputs rendered as a transient line inside the palette, all text through `escapeHtml` from helpers.
- [ ] **Step 4:** `node --test tests/palette.mjs` → PASS. `npx eslint js/palette.js` → clean.
- [ ] **Step 5:** commit `feat: Ctrl+K command palette replacing terminal`.

### Task 5: Nav/footer markup contract + shared page skeleton

Canonical nav (pages copy verbatim; `aria-current` set per page; brand `EV_` mono in cyan):

```html
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-nav" data-nav>
  <nav class="container site-nav__inner" aria-label="Primary">
    <a class="site-nav__brand mono" href="/">EV_</a>
    <div class="site-nav__links">
      <a class="nav-link" href="/" >Home</a>
      <a class="nav-link" href="/projects.html">Projects</a>
      <a class="nav-link" href="/dashboard.html">Dashboard</a>
      <a class="nav-link" href="/contact.html">Contact</a>
      <button class="nav-link" data-palette-open aria-label="Open command palette (Ctrl+K)"><span class="mono">⌘K</span></button>
    </div>
  </nav>
</header>
<main id="main"> …page content… </main>
<footer class="footer"> GitHub · LinkedIn · email · "Vanilla JS, no framework — view source" </footer>
<div id="palette-root"></div>
```

Head contract per page: unique `<title>` + meta description, `<link rel="stylesheet" href="/css/tokens.css?v=7">`, `base.css?v=7`, own page css `?v=7`, font preloads, `theme-color #08080d`, manifest link, OG/twitter tags, pwa.js include. Commit with Task 3/4 if not already.

---

## Phase 2 — Page lanes (parallel subagents; disjoint write-sets)

**Freeze rule:** lanes MUST NOT edit `css/tokens.css`, `css/base.css`, `js/palette.js`, or another lane's files. Needed foundation changes go in the lane's final report as "foundation change requests". Every lane: read spec §3 (its section) + this plan's contracts; run `npm test` + `npx eslint .` before finishing; commit per page with `feat(<page>): …`; copy follows spec tone rules; verify rendering yourself via the orchestrator-provided static server (curl the page, check structure) — visual sign-off happens in Phase 4.

### Lane A: Home (`index.html`, `css/pages/home.css`, `js/home-live.js`, `js/three-hero.js`, `js/vendor/three.module.min.js`, `tests/home-live.mjs`)
Sections per spec §3 order. Live chips: `home-live.js` exports pure `formatStats(json)` (tested: returns `{ uptime, tps, players }` display strings; graceful on missing fields → test with `{}`) + `initHomeLive()` DOM part; fetch `/config/minecraft-stats.json` with 3s AbortController timeout; on failure hide live chips (static chips remain). Three.js: vendor current stable minified module (check version via Context7/npm registry; pin exact); `three-hero.js` lazy-imported from an inline module script AFTER `load` event + `requestIdleCallback`; skip on `matchMedia('(prefers-reduced-motion: reduce)')`, `navigator.connection?.saveData`, no WebGL, or viewport <768px; DPR ≤1.5 cap; pause on `visibilitychange`; scene = sparse synthwave particle field / wireframe horizon in cyan-magenta at low opacity behind hero, CSS gradient `.hero__bg-fallback` always painted underneath.

### Lane B: Projects index + redirects (`projects.html`, `css/pages/projects.css`, `js/project-catalog.js`, `project-explorer.html`, `writeups.html`)
Catalog gains `slug`, `outcome` (one measurable line), `caseStudyUrl: '/projects/<slug>.html'` per project; update `tests/project-catalog.mjs` expectations accordingly (5 projects, new required fields — add assertions). Filter chips (All/Cloud/DevOps/IoT/Web) + text search, client-side, accessible (chips are buttons with `aria-pressed`; results count in `aria-live="polite"` region). Cards = `.card` with outcome line + stack chips + "Read case study →". Redirect stubs: minimal valid HTML, `<meta http-equiv="refresh" content="0; url=/projects.html">` + canonical link + fallback anchor.

### Lane C: Case studies ×5 (`projects/*.html`, `css/pages/case-study.css`)
Template per spec §3; content from `js/writeups-data.js` + `js/project-catalog.js` (read them; rewrite prose into the template voice — outcome-led, honest). Numbers must come from existing content (no invented metrics). Architecture diagrams: simple inline SVG (boxes/arrows, tokens' colors) where the writeup describes topology; skip if it would be decoration. Next/prev nav across the 5. Heading hierarchy h1→h2 strict.

### Lane D: Dashboard (`dashboard.html`, `css/pages/dashboard.css`)
Keep all live behavior fed by `config/minecraft-stats.json` (10-min cron). First: `grep -n meshwatch dashboard.html` — if used, keep `js/meshwatch-api.js` + its test and restyle around it; if not, note "meshwatch-api removable" in report (Phase 3 deletes). Gauges → `.stat` blocks + semantic `<meter>` or SVG arcs with `role="img"` + `aria-label` text equivalents; staleness indicator ("updated Xm ago", `--warn` past 20m); auto-refresh every 60s with visible pause under reduced-motion.

### Lane E: Contact + fallbacks (`contact.html`, `css/pages/contact.css`, `offline.html`, `404.html`, `css/pages/misc.css`)
Form posts via existing `js/contact-api.js` (do not change endpoint); labeled fields, client validation with inline `.field__error` + `aria-describedby` + `aria-live="polite"` status region; success/failure states with mailto fallback link. Honest microcopy ("I read everything; replies within a day or two"). offline.html/404.html: minimal, on-system, 404 links home/projects.

---

## Phase 3 — Integration (orchestrator, sequential)

- [ ] Reconcile lanes' foundation change requests (edit tokens/base once, centrally).
- [ ] Delete dead modules + their tests (list in File map; confirm meshwatch decision from Lane D report). `grep -rn "terminal\|achievements\|audio\.js\|ai-assistant" *.html js/ tests/` → no stale references.
- [ ] `js/utils/helpers.js`: remove `COMMAND_ICONS/COMMAND_DESCS/COMMAND_COUNT` and their test blocks in `tests/helpers.mjs`; keep `escapeHtml`, `normalizeSlug`, `validateUrl`, `SKILLS_DATA`, perf helpers. Update `tests/new-*.mjs` refs — those files are deleted; ensure remaining tests import nothing dead.
- [ ] Service worker v7: cache name `career-portal-v7`; ASSETS_TO_CACHE = all HTML pages, css (tokens, base, 6 page files), js (palette, home-live, contact-api, pwa, performance, helpers, project-catalog, writeups-data, scroll-reveal), fonts ×2, icons, manifest, offline.html. Three vendor file: runtime cache-on-first-use (fetch handler: cache-put successful same-origin GETs of `/js/vendor/`), NOT precached.
- [ ] `tests/site-integrity.mjs` (write it now):

```js
// tests/site-integrity.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { PROJECTS } from '../js/project-catalog.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const PAGES = ['index.html', 'projects.html', 'dashboard.html', 'contact.html', '404.html',
  ...PROJECTS.map((p) => p.caseStudyUrl.slice(1))];

describe('site integrity', () => {
  it('catalog: 5 projects with slug/outcome/caseStudyUrl', () => {
    assert.equal(PROJECTS.length, 5);
    for (const p of PROJECTS) {
      assert.ok(p.slug && p.outcome && p.caseStudyUrl, `${p.name} missing v2 fields`);
      assert.ok(existsSync(new URL(`../${p.caseStudyUrl.slice(1)}`, import.meta.url)));
    }
  });
  it('every page has skip link, main landmark, unique title, meta description, palette root', () => {
    const titles = new Set();
    for (const page of PAGES) {
      const html = read(page);
      assert.ok(html.includes('class="skip-link"'), `${page}: skip link`);
      assert.ok(/<main[\s>]/.test(html), `${page}: <main>`);
      const t = html.match(/<title>([^<]+)<\/title>/)?.[1];
      assert.ok(t && !titles.has(t), `${page}: unique title`);
      titles.add(t);
      assert.ok(/<meta name="description"/.test(html), `${page}: meta description`);
      assert.ok(html.includes('id="palette-root"'), `${page}: palette root`);
    }
  });
  it('service worker v7 precache entries exist on disk', () => {
    const sw = read('js/service-worker.js');
    assert.ok(sw.includes("career-portal-v7"), 'cache name bumped');
    const assets = [...sw.matchAll(/'(\/[^']+)'/g)].map((m) => m[1])
      .filter((a) => !a.includes('googleapis') && a !== '/');
    for (const a of assets) {
      assert.ok(existsSync(new URL(`..${a.split('?')[0]}`, import.meta.url)), `SW asset missing: ${a}`);
    }
  });
});
```

- [ ] `manifest.json` (name "Eugene Vincent — Portfolio", colors #08080d/#3fd8e8), `json-ld.json` (Person + sameAs), `sitemap.xml` (all canonical pages), robots.txt verify.
- [ ] `README.md` + `AGENTS.md` rewrite: new module table, new gotchas (palette, SW v7, tokens contract, vendored three), removed terminal-era gotchas, test commands unchanged.
- [ ] Full gate: `npm test` green, `npx eslint .` 0 errors, `git status` clean tree, commit `chore: integrate v2 — SW v7, metadata, dead code removal`.

## Phase 4 — Verification & fix (parallel critics; orchestrator drives Playwright)

- [ ] Orchestrator: serve locally (`npx serve -l 3111 .`), Playwright walk each page at 375/768/1280: screenshot full-page each; keyboard walk (Tab order, skip link, palette open→filter→run→Esc→focus restore, form errors announced); console must be error-free; archive to `docs/superpowers/evidence/v2/`.
- [ ] Parallel fresh-context critics (subagents, artifacts + source only — no browser): design-critique per page group (screenshots → hierarchy/spacing/consistency findings); ux-copy pass (all HTML copy vs tone rules); a11y static review (markup semantics, ARIA correctness vs WAI-APG for combobox/listbox, contrast spot-check vs tokens); spec verifier (spec §§2–9 vs repo — every claim checked).
- [ ] Triage findings (must-fix = spec violations, AA failures, broken flows; nice = taste), fix, re-run suite + targeted Playwright, one re-critique round on changed pages.
- [ ] Lighthouse (Playwright-driven or `npx lighthouse` if available) on `/` + one case study, mobile emulation: record scores in evidence; investigate any category <95.

## Phase 5 — Deliver

- [ ] Push: `git push origin redesign/v2` from the clone → wait, origin = homelab. Verify `git remote -v` in clone points at homelab (clone source), then push branch.
- [ ] On homelab: `ssh homelab 'cd ~/career-portal && git fetch && git worktree add /tmp/cp-v2 redesign/v2 2>/dev/null || (cd /tmp/cp-v2 && git pull)'` then serve `/tmp/cp-v2` on :3000 (`nohup npx serve -l 3000 -H 0.0.0.0 /tmp/cp-v2`) so master stays untouched.
- [ ] Final report: before/after screenshots, test/lint output, Lighthouse numbers, flagged items (GitHub token in remote URL), what needs owner decision (merge/deploy).

## Self-review notes

- Spec coverage: §3 IA → Lanes A–E + Task 5; §4 → Tasks 1–3; §5 modules → Tasks 4, Lanes A/B/D, Phase 3; §6 a11y → Task 3 primitives + lane requirements + Phase 4; §7 perf → Lane A budgets + Phase 4 Lighthouse; §8 tests → Tasks 1/4, lane test updates, Phase 3 integrity suite; §9 rollout → Phase 5. No gaps found.
- Deleted-test coverage restored by: design-tokens, palette, site-integrity, home-live + updated catalog tests.
- Type consistency: class names in Task 3 contract match lane usage; `PROJECTS` export name must match actual export in project-catalog.js — Lane B verifies and keeps existing export name (adjust integrity test import accordingly).
