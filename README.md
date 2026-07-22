# Career Portal — chai-homelab.com

Eugene Vincent's portfolio: a content-first, recruiter-friendly site with a live homelab
dashboard, built as a zero-dependency vanilla JS + CSS PWA. Redesigned 2026-07 (v2).

## Quick Start

```bash
npm run dev        # serve on :3000
npm test           # run full suite (node --test)
npm run lint       # ESLint check
npm run build      # lint + test, copy to ../dist/
```

## Architecture

Static site — **no build step, no framework, no bundler**. Deployed to Cloudflare Pages via
GitHub Actions on push to `master`.

```
Browser (chai-homelab.com)
  │ HTTPS / CDN
Cloudflare Pages (auto-deploy on push to master)
  │
├── Pages: index, projects (+5 case studies), dashboard, contact, offline, 404
├── Design system: css/tokens.css (AA contrast, test-enforced) + css/base.css + css/pages/*
├── PWA service worker (career-portal-v18): network-first pages, cache-first assets
├── Self-hosted fonts (Space Grotesk, JetBrains Mono — variable woff2)
├── Lazy Three.js hero (vendored, bails out on reduced-motion/saveData/mobile/no-WebGL)
└── Azure Function backend for the contact form (Resend API / console fallback)
```

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero, live proof strip, featured projects, skills, about |
| Projects | `/projects.html` | All projects with category filters and search |
| Case studies | `/projects/<slug>.html` | Problem → architecture → decisions → measured outcomes |
| Dashboard | `/dashboard.html` | Live homelab metrics (TPS, players, heap, staleness indicator) |
| Contact | `/contact.html` | Email form (Azure Function → mailto: fallback) |
| Offline / 404 | `/offline.html`, `/404.html` | PWA fallback / not-found |

`/project-explorer.html` and `/writeups.html` are redirect stubs preserving v1 inbound links.

## Highlights

- **Live proof**: the dashboard and home page read real metrics from the k3s homelab
  (`config/minecraft-stats.json`, cron-updated every 10 minutes).
- **Ctrl+K command palette**: keyboard-first navigation plus a few personality commands
  (`whoami`, `uptime`, `sudo hire-me`) — the spiritual successor of v1's 28-command terminal.
- **Accessibility as a gate**: WCAG AA contrast is enforced by a unit test that parses
  `css/tokens.css` and computes contrast ratios; keyboard nav, reduced-motion, and ARIA
  patterns are verified, not assumed.
- **Integrity suite**: `tests/site-integrity.mjs` keeps pages ↔ project catalog ↔ service-worker
  precache ↔ sitemap in lockstep — a missing file fails the suite.

## JS Modules

| Module | Role |
|--------|------|
| `palette.js` | Ctrl+K command palette (WAI-APG combobox pattern) |
| `project-catalog.js` | Project metadata + v2 fields (`slug`, `outcome`, `caseStudyUrl`) |
| `home-live.js` | Landing-page live chips (3s timeout, graceful fallback) |
| `three-hero.js` + `js/vendor/` | Lazy synthwave hero background (index only, vendored Three.js) |
| `contact.js` | Contact page terminal + form — POSTs to `/api/contact`, falls back to mailto: |
| `service-worker.js` | PWA cache `career-portal-v18` |
| `pwa.js`, `performance.js`, `scroll-reveal.js`, `utils/helpers.js` | registration, timing metrics, reveal-on-scroll, shared utils |

## Cloudflare Pages Functions

Server code lives in `functions/api/` and is deployed with the site — no separate deploy step.

- `stats.js` — `/api/stats`; GET reads the homelab stats from KV, POST writes them (bearer auth)
  - Bindings: `STATS_KV`, `STATS_TOKEN`
- `contact.js` — `/api/contact`; POST validates a submission and relays it via the Resend API
  - Bindings: `RESEND_API_KEY` (secret), optional `CONTACT_TO`, `CONTACT_DOMAIN`
  - Without `RESEND_API_KEY` it returns 503 and the form falls back to its mailto: link

## Config Files

- `config/minecraft-stats.json` — updated every 10 min by cron (real Prometheus API)
- `_headers` — Cloudflare Pages cache headers (31536000s static assets, 600s config)

## Gotchas

See [AGENTS.md](AGENTS.md) for the full list. Headlines:

- **No build step** — files are copied as-is. Do not add a bundler or transpiler.
- **Tests use native `node --test`** — no mocha/jest. Tests run in pure Node.
- **Service worker cache name** is `career-portal-v18` — bump it and `ASSETS_TO_CACHE`
  whenever cached assets change (`tests/site-integrity.mjs` enforces file parity).
- **Fonts are self-hosted** — no Google Fonts CDN; don't reintroduce render-blocking font CSS.
- **robots.txt must stay `Allow: /`** — it was accidentally `Disallow: /` until v2.

## Testing

```bash
npm test                        # run all
node --test tests/palette.mjs  # single file
```

## Deployment

- **Local**: `npm run dev` → http://localhost:3000
- **Cloudflare Pages**: push to `master` → GitHub Actions runs `npm test` then deploys root dir via `cloudflare/pages-action@v1`
  - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- **Pages Functions**: `functions/api/` ships with the site; set its bindings in the Cloudflare Pages dashboard

## Style Conventions

- Single quotes, semicolons, 2-space indent (ESLint enforced)
- ES modules only (`"type": "module"`)
- All user-facing text goes through `escapeHtml()` before `innerHTML` (or use `textContent`)
- CSS custom properties from `css/tokens.css`; component classes from `css/base.css`

## Costs

| Service | Cost/Month |
|---------|------------|
| Cloudflare Pages + DNS | $0 (free tier) |
| Azure Functions | $0 (free tier) |
| Tailscale | $0 (personal plan) |
| **Total** | **$0/mo** |
