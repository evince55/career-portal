# Career Portal — chai-homelab.com

Terminal-themed portfolio with synthwave aesthetic, PWA support, and career fair demo mode.

## Quick Start

```bash
npm run dev        # serve on :3000
npm test           # run full suite (277 tests)
npm run lint       # ESLint check
npm run build      # lint + test, copy to ../dist/
```

## Architecture

Static site — no build step. Files are copied as-is to `../dist/` or deployed via Cloudflare Pages.

```
Browser (chai-homelab.com)
  │ HTTPS / CDN
Cloudflare Pages (auto-deploy on push to master)
  │
├── Static assets: HTML, CSS, JS, icons, config
├── PWA service worker (offline cache v6)
└── Azure Functions (optional backend)
    └── portfolio-contact → Resend API / console log fallback
```

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Terminal | `/` | Main terminal UI with 28 commands |
| Project Explorer | `/project-explorer.html` | Card grid with category filters and search |
| Dashboard | `/dashboard.html` | Live metrics gauges (Minecraft TPS, players, heap) |
| Writeups | `/writeups.html` | Technical articles with tag filtering |
| Contact | `/contact.html` | Email form (posts to Azure Function, falls back to mailto:) |
| Offline | `/offline.html` | PWA fallback page |

## Terminal Commands

| Command | Description |
|---------|-------------|
| `help` | Show all commands + keyboard shortcuts |
| `projects [category]` | List projects (cloud, devops, iot, web) |
| `project <name>` | Deep-dive: tech stack, metrics, badges, achievements |
| `skills [category]` | Show technical skills by category |
| `skills-visual` | Animated skill progress bars |
| `timeline` | Project timeline with active period chart |
| `experience [level]` | Show experience (senior/mid/junior) |
| `education` | Show education background |
| `resume [--txt|--md]` | Display or download resume (text/markdown) |
| `about` | About Eugene Vincent |
| `contact` | Contact information |
| `contact --email` | Interactive email form (API → mailto: fallback) |
| `status` | Online/offline, MeshWatch metrics, browser info |
| `minecraft` | Minecraft server stats (TPS, players, heap) |
| `ai <question>` | Portfolio Q&A with cached knowledge fallback |
| `demo [stop]` | Auto-cycling project showcase |
| `clear` | Clear terminal |
| `theme [retro|synthwave]` | Toggle synthwave/retro theme (persists in localStorage) |
| `matrix [on|off]` | Toggle matrix rain animation |
| `neofetch` | System info display |
| `fortune` | Random tech/career fortune |
| `cowsay <text>` | ASCII cow says your text |
| `achievements` | View earned badges |
| `perf` | Performance dashboard (A-F grading) |
| `explorer` | Open Project Explorer page |
| `dashboard` | Open Live Dashboard page |
| `writeups` | Open Writeups page |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Autocomplete command |
| `↑/↓` | Command history |
| `Ctrl+K` | Command palette overlay |
| `Esc` | Focus input field |
| `Ctrl+L` | Clear terminal |

## JS Modules

| Module | Role |
|--------|------|
| `terminal.js` | Main controller — commands, palette, demo mode, achievements |
| `project-catalog.js` | Project metadata (5 projects). `COMMAND_COUNT` derived from helpers |
| `meshwatch-api.js` | GitHub OAuth PKCE + Azure Functions proxy for Prometheus metrics |
| `ai-assistant.js` | Ollama Phi-3 via Tailscale; cached knowledge fallback |
| `contact-api.js` | Contact form client — POSTs to `/api/contact`, falls back to mailto: |
| `achievements.js` | 10 unlockable badges, localStorage persistence |
| `audio.js` | Web Audio API keystroke sounds |
| `performance.js` | Navigation Timing API metrics (TTFB, DCL, FullLoad) |
| `visual-effects.js` | Matrix rain + neon pulse (respects reduced motion and mobile) |
| `service-worker.js` | PWA offline cache, fetch-first strategy |
| `pwa.js` | Service worker registration + online/offline status |
| `utils/helpers.js` | `escapeHtml`, `normalizeSlug`, `validateUrl`, `COMMAND_COUNT`, `SKILLS_DATA`, `gradePerf` |

## Azure Functions

- `portfolio-contact/func.js` — Contact form handler (Resend API, falls back to console log)
  - Env vars: `RESEND_API_KEY`, `RECIPIENT_EMAIL`, `RESEND_DOMAIN`
  - Without env vars: logs to console and returns success (career-fair offline mode)

## Config Files

- `config/career-fair.json` — demo mode settings, AI assistant config, mock data
- `config/minecraft-stats.json` — updated every 10 min by cron (real Prometheus API)
- `_headers` — Cloudflare Pages cache headers (31536000s static assets, 600s config)

## Gotchas

- **No build step** — files are copied as-is. Do not add a bundler or transpiler.
- **ESLint ignores `js/terminal.js`** — import+comment patterns trigger ESLint parse bugs. If you fix it, update `.eslintignore`.
- **Tests use native `node --test`** — no mocha/jest. Tests run in pure Node.
- **`terminal.js` self-instantiates** — `new Terminal()` runs on import. Test files get a live instance.
- **Theme persists via localStorage** — terminal saves `portfolio-theme`; other pages read it on load.
- **`COMMAND_COUNT`** is derived from `Object.keys(COMMAND_ICONS).length`. Do not hardcode elsewhere.
- **Service worker cache name** is `career-portal-v7`. New assets must be added to `ASSETS_TO_CACHE`.
- **Google Fonts URL** uses `css2?family=` path (not `css?family=`).

## Testing

```bash
npm test                    # run all (277 tests)
node --test tests/terminal.mjs   # single file
```

## Deployment

- **Local**: `npm run dev` → http://localhost:3000
- **Cloudflare Pages**: push to `master` → GitHub Actions runs `npm test` then deploys root dir via `cloudflare/pages-action@v1`
  - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- **Azure Functions**: deploy `azure-functions/` with Azure CLI; requires `.env` for API keys

## Style Conventions

- Single quotes, semicolons, 2-space indent (ESLint enforced)
- ES modules only (`"type": "module"`)
- All user-facing text goes through `escapeHtml()` before `innerHTML`
- CSS custom properties for theming (`--neon-*`, `--bg-*`). Retro theme via `body.theme-retro`.

## Costs

| Service | Cost/Month |
|---------|------------|
| Cloudflare Pages + DNS | $0 (free tier) |
| Azure Functions | $0 (free tier) |
| Tailscale | $0 (personal plan) |
| **Total** | **$0/mo** |
