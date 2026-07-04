# Career Portal — Agent Instructions

## Quick Start
```bash
npm run dev        # serve on :3000
npm test           # run full suite (node --test)
npm run lint       # ESLint rules in .eslintrc.json
npm run build      # lint + test, then copy to ../dist/
```

## Architecture (v2, redesigned 2026-07)
Vanilla JS + CSS static site. **No build step** — `npm run build` just copies files to `../dist/`. Deployed to Cloudflare Pages via GitHub Actions (`.github/workflows/pages.yml`), which runs `npm test` then deploys the root directory.

Design contract: `docs/superpowers/specs/2026-07-03-site-redesign-design.md` (spec) and
`docs/superpowers/plans/2026-07-03-site-redesign-v2.md` (plan + CSS class contract).

### Entry points
- `index.html` — content-first landing page (hero, featured projects, live homelab stats, skills)
- `projects.html` — all projects with filter chips + search
- `projects/<slug>.html` — 5 case-study pages (meshwatch, minecraft-monitoring, monitoring-stack, azure-functions, career-portal)
- `dashboard.html` — live metrics (reads `config/minecraft-stats.json`, cron-updated every 10 min)
- `contact.html` — contact form (posts to Azure Function)
- `offline.html` / `404.html` — PWA fallback / not-found
- `project-explorer.html`, `writeups.html` — **redirect stubs** to projects.html (preserve inbound links; do not add content)

### Design system (`css/`)
- `css/tokens.css` — single source of truth for color/type/space/motion tokens. **WCAG AA contrast
  is enforced by `tests/design-tokens.mjs`** — change values only if that test stays green.
- `css/base.css` — component classes shared by all pages (nav, cards, chips, stats, forms, palette).
  The class contract is documented in the plan (Task 3/5). Pages copy the canonical nav/footer markup.
- `css/pages/*.css` — one file per page family. Page CSS may use tokens; it must not redefine them.
- Fonts are **self-hosted** in `fonts/` (Space Grotesk display, JetBrains Mono data; body = system stack).
  No Google Fonts CDN.

### JS modules (`js/`)
| Module | Role |
|--------|------|
| `palette.js` | Ctrl+K command palette (nav + personality commands). WAI-APG combobox pattern. Pure parts unit-tested. |
| `project-catalog.js` | Project metadata + v2 fields (`slug`, `outcome`, `caseStudyUrl`) |
| `motion.js` + `js/vendor/anime.esm.min.js` | anime.js v4 motion layer (hero entrance, count-ups, staggered reveals, diagram line-drawing). Loaded only when motion is allowed; progressive-enhancement contract — never hides content unless the reveal is guaranteed. |
| `home-live.js` | Fetches minecraft-stats.json for the landing page live chips (3s timeout, graceful fallback) |
| `three-hero.js` + `js/vendor/three.module.min.js` | Lazy synthwave hero background on index only. Never loads under reduced-motion/saveData/mobile/no-WebGL. Vendored, version pinned in the file header. |
| `contact-api.js` | Contact form client — POSTs to Azure Function, falls back to mailto: |
| `service-worker.js` | PWA cache **`career-portal-v18`**. Network-first for navigations, cache-first (ignoreSearch) for assets. Precache list is validated against disk by `tests/site-integrity.mjs`. |
| `pwa.js`, `performance.js`, `scroll-reveal.js`, `utils/helpers.js` | unchanged roles from v1 |

Removed in v2 (do not resurrect): `terminal.js`, `achievements.js`, `audio.js`, `ai-assistant.js`, `mobile-nav.js`,
`three-{init,grid,geometries,manager}.js`, `css/styles.css`, `writeups-data.js` (case-study
prose now lives directly in `projects/*.html`), `config/{career-fair,writeups,resume-content}.json`.

## Gotchas
- **No build step** — do not add a bundler, transpiler, or framework.
- **Tests use the Node.js native test runner** (`node --test`), pure Node, no DOM library.
- **Service worker cache name must be bumped** (`career-portal-v19`, …) whenever cached assets
  change; update ASSETS_TO_CACHE and `tests/site-integrity.mjs` will catch missing files.
- **`?v=` suffixes in HTML** are cache-busters; the SW matches with `ignoreSearch`, so they don't
  need to stay in lockstep with the SW cache name, but keep them consistent across pages.
- **robots.txt must stay `Allow: /`** — it was accidentally `Disallow: /` for months (fixed in v2).
- **All dynamic text goes through `escapeHtml()`** (from `js/utils/helpers.js`) before any
  `innerHTML` assignment, or use `textContent`.
- **Azure Functions** require `RESEND_API_KEY` and `RECIPIENT_EMAIL` env vars; without them the
  contact function logs to console and returns success.
- **Google Fonts is gone** — don't reintroduce render-blocking font CSS; fonts are local woff2.

## Testing
```bash
npm test                          # run all
node --test tests/palette.mjs    # single file
```
Tests live in `tests/*.mjs`. **Re-baseline note (2026-07):** v1's 277 assertions were mostly
terminal-implementation detail and were removed with the terminal; v2's ~100 assertions gate
behavior that matters (AA contrast, palette, site integrity, live-stats formatting). The quality
gate is 'suite green + integrity/token suites present', not raw assertion count. Key suites: `design-tokens.mjs` (AA contrast — the design system's
guardrail), `site-integrity.mjs` (pages ↔ catalog ↔ service worker ↔ sitemap parity),
`palette.mjs`, `home-live.mjs`, `project-catalog.mjs`, `contact-api.mjs`, `helpers.mjs`.

## Deployment
- **Local**: `npm run dev` → http://localhost:3000
- **Cloudflare Pages**: push to `master` → GitHub Actions runs `npm test` then deploys root dir
- **Azure Functions**: deploy `azure-functions/` folder separately with Azure CLI

## Style Conventions
- Single quotes, semicolons, 2-space indent (enforced by ESLint)
- ES modules only (`"type": "module"` in package.json)
- No framework — vanilla JS; inline module scripts in HTML pages are OK
- CSS custom properties from `tokens.css` only; component classes from `base.css`; page-specific
  styles in `css/pages/`
- Copy tone: plain, concrete, outcome-led, early-career-honest

## Hero backdrop & media drop-in

The home hero backdrop is a single full-screen fragment shader (`js/three-hero.js`,
synthwave sun + perspective grid + starfield), loaded lazily and only for motion-safe,
non-saveData, ≥768px, WebGL-capable clients; otherwise the CSS gradient `.hero__bg-fallback`
shows. `.ico` UI glyphs come from `/icons/ui` (Lucide, ISC) and brand logos from `/icons/tech`
(Simple Icons CC0 + an authored LinkedIn mark), all tinted via the `.ico` / `.chip[data-tech]`
CSS masks.

**To use a Higgsfield (or any) hero video/image:** drop a `.hero__media` element with
`data-hero-media` inside `.hero__bg` in `index.html` — e.g.
`<video class="hero__media" data-hero-media autoplay muted loop playsinline poster="/img/hero-poster.jpg"><source src="/img/hero.webm" type="video/webm"></video>`
(a plain `<img class="hero__media" data-hero-media>` also works). It takes over automatically:
the WebGL shader is skipped, and a left scrim (`.hero:has(.hero__media)::after`) keeps the copy
legible. Add the media file(s) to the service-worker precache and bump the cache name. Keep a
poster for reduced-motion / no-autoplay clients.

## Live homelab stats pipeline

The dashboard + home page show live Minecraft/homelab metrics. Flow:
homelab cron (`scripts/update-minecraft-stats.sh`, every 10 min) queries Prometheus, writes
`config/minecraft-stats.json` locally, then POSTs it to **`/api/stats`** (a Cloudflare Pages
Function, `functions/api/stats.js`) which stores it in **Cloudflare KV** (binding `STATS_KV`,
key `minecraft`, bearer secret `STATS_TOKEN`). The client reads `/api/stats` (60s edge cache)
through the shared `js/stats-source.js` `fetchStats()`, which **falls back to the committed
`config/minecraft-stats.json`** if the endpoint is unavailable.

- `/api/stats` is dynamic — **do NOT precache it** in the service worker. Keep
  `config/minecraft-stats.json` precached as the fallback seed.
- One-time Cloudflare config (KV namespace + binding + secret) is owner-run: see
  `docs/cloudflare-live-stats-setup.md`. The repo/agent never holds the token.
- `functions/` deploys automatically with the Pages project (repo-root directory); no workflow
  change needed.
