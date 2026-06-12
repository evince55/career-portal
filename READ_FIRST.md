# READ FIRST — Career Portal (chai-homelab.com)

> **Author:** Eugene Vincent | **GitHub:** @chaitea321  
> **Domain:** https://chai-homelab.com  
> **Stack:** Vanilla JS (ES6 Modules) + CSS3 + HTML5 — Zero frameworks, zero dependencies  
> **Hosting:** Cloudflare Pages (auto-deploy from GitHub master)  
> **Runtime:** HP Laptop — AMD Ryzen 7 5700U, 14GB RAM, Ubuntu 24.04.4 LTS  
> **Dynamic IP:** 108.233.139.113 (Cloudflare DNS auto-update every 30 min)  
> **Local IP:** 192.168.1.192 (homepage.dev stays local-only)  
> **Purpose:** FAANG-quality interactive terminal portfolio showcasing homelab projects  
> **Test Count:** 102 tests passing, 0 failures across 12 test files  
> **Lint:** ESLint (JS-only), 0 errors  
> **Build Size:** ~4,038 source lines, ~276KB dist

---

## 1. WHAT THIS PROJECT IS

A **terminal-themed portfolio website** hosted at chai-homelab.com. Visitors see a retro synthwave terminal emulator with 25 interactive commands that reveal projects, skills, resume, Minecraft server stats, AI-powered Q&A, and more.

This is a **static site** — no backend server. All dynamic data comes from:
- Local JSON files (`config/`) updated by cron jobs
- Azure Functions (optional, for live metrics via GitHub OAuth)
- Tailscale-secured Ollama Phi-3 (optional, for live AI answers)

---

## 2. DIRECTORY STRUCTURE

```
career-portal/
├── index.html                      # Main entry — terminal UI (58 lines)
├── README.md                       # User-facing readme (not the one you're reading)
├── READ_FIRST.md                   # ← YOU ARE HERE (developer context dump)
├── BUG_AND_FIX_PLAN.md             # Historical bug audit (312 lines)
├── PHASE_1_COMPLETE.md             # Early phase snapshot
├── manifest.json                   # PWA manifest (47 lines)
├── offline.html                    # PWA offline fallback page
├── robots.txt                      # Disallow all (preview site)
├── _headers                        # Cloudflare Pages custom headers (Cache-Control)
├── package.json                    # npm scripts: dev, test, lint, build, deploy
├── .eslintrc.json                  # ESLint config (2-space indent, single quotes)
├── .eslintignore                   # Ignores terminal.js (known parser bug)
├── .gitignore                      # node_modules, dist, .env, logs
├── .env.example                    # Template for secrets
│
├── js/                             # All JavaScript (ES6 modules)
│   ├── terminal.js                 # [1819 lines] Main terminal controller — 25 commands, demo mode, Ctrl+K palette
│   ├── project-catalog.js          # [222 lines] 5 projects with metadata, tech stack, metrics
│   ├── meshwatch-api.js            # [226 lines] GitHub OAuth PKCE + Azure Functions proxy
│   ├── ai-assistant.js             # [193 lines] Ollama Phi-3 via Tailscale + cached knowledge fallback
│   ├── achievements.js             # [87 lines] 10 unlockable badges with localStorage
│   ├── performance.js              # [49 lines] Navigation Timing API metrics (TTFB, DCL, Full Load)
│   ├── visual-effects.js           # [113 lines] Matrix rain + neon pulse + error boundary
│   ├── audio.js                    # [207 lines] WAV tone generator via Web Audio API
│   ├── service-worker.js           # [133 lines] PWA cache (v5) with error boundaries
│   ├── pwa.js                      # [51 lines] SW registration + online/offline indicator
│   └── utils/
│       └── helpers.js              # [121 lines] Pure functions: escapeHtml, slugify, URL validation,
│                                   #   command palette data, skills data, perf grading thresholds
│
├── css/
│   └── styles.css                  # [817 lines] All styling — synthwave theme, retro overrides,
│                                   #   responsive, print styles, command palette overlay
│
├── config/
│   ├── career-fair.json            # [97 lines] Career fair demo mode config + mock data
│   └── minecraft-stats.json        # [12 lines] Live server metrics (cron-updated every 10 min)
│
├── tests/                          # 12 test files, 102 tests total (all passing)
│   ├── terminal.mjs                # Terminal class test
│   ├── project-catalog.mjs         # Project filtering + badge escaping
│   ├── meshwatch-api.mjs           # API mock data + flat object structure
│   ├── ai-assistant.mjs            # Cached knowledge + null-safe getStatus
│   ├── helpers.mjs                 # Pure function tests (escapeHtml, slug, validateUrl)
│   ├── validate-url.mjs            # URL validation security tests
│   ├── audio.mjs                   # AudioController toggle/state
│   ├── performance.mjs             # Load time tracking (mock)
│   ├── visual-effects.mjs          # Matrix rain enabled/toggle/resize
│   ├── new-commands.mjs            # New command handling (timeline, neofetch, etc.)
│   ├── new-features.mjs            # Feature integration tests
│   └── optimizations.mjs           # Dead code removal, SRP, DRY verification
│
├── scripts/
│   ├── cloudflare-dns-update.sh    # Dynamic DNS auto-update (cron every 30 min)
│   ├── update-minecraft-stats.sh   # Pseudo-live Minecraft stats generator (cron every 10 min)
│   ├── deploy.sh                   # Azure Blob + Cloudflare DNS deployment
│   ├── push-to-github.sh           # Git push helper
│   ├── generate-icons.cjs          # PWA icon generator (Node.js)
│   ├── generate-screenshot.cjs     # Screenshot generator (Node.js)
│   └── ... (other scripts)
│
├── icons/                          # PWA icons (72x72 through 512x512)
├── screenshots/                    # PWA screenshot
├── assets/                         # Additional static assets
├── dist/                           # Build output (gitignored)
└── node_modules/                   # npm dependencies (gitignored)
    └── (eslint, serve — dev only)
```

---

## 3. ARCHITECTURE

```
                           ┌───────────────────────┐
                           │   Browser (Visitor)    │
                           │   chai-homelab.com     │
                           └──────────┬────────────┘
                                      │ HTTPS / Cloudflare CDN
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
    ┌────────┴────────┐              │               ┌────────┴────────┐
    │  Static Assets   │              │               │ Azure Functions │
    │  (Cloudflare     │              │               │ ($0 free tier)  │
    │   Pages)         │              │               │                 │
    │                  │              │               │ /api/metrics    │
    │ - index.html     │              │               │ /api/agent/chat │
    │ - CSS/JS (ES6)   │              │               │ /auth/github/   │
    │ - PWA service    │              │               │       token     │
    │   worker         │              │               │                 │
    └──────────────────┘              │               └────────┬────────┘
                                      │                         │
                                      │          Tailscale (WireGuard)
                                      │          outbound-only tunnel
                                      │          (no firewall holes)
                                      │                         │
                               ═══════ HP Laptop / k3s Cluster ═══════════
                                      │
                            ┌─────────┴──────────┐
                            │   MeshWatch Stack   │
                            │  - Istio mTLS       │
                            │  - Prometheus       │
                            │  - Grafana          │
                            │  - Loki + Tempo     │
                            │  - Ollama Phi-3     │
                            │  - Minecraft JMX    │
                            └────────────────────┘
```

### 3.1 Data Flow

1. **Static content** → Loaded from HTML/CSS/JS at page load
2. **Project data** → `project-catalog.js` exports `PROJECT_CATALOG` (5 projects with full metadata)
3. **Minecraft stats** → `config/minecraft-stats.json` updated every 10 min by cron (`scripts/update-minecraft-stats.sh`) — uses shell builtins (rand, date, cat) to generate pseudo-live variations
4. **AI answers** → `ai-assistant.js` tries Azure proxy → Tailscale Ollama → cached knowledge fallback (backup answers for 15+ question categories)
5. **Live metrics** → `meshwatch-api.js` requires GitHub OAuth PKCE auth, then proxies Prometheus queries through Azure Functions
6. **Career fair mode** → `config/career-fair.json` supplies mock data for all projects when deployed

---

## 4. DESIGN SYSTEM

### 4.1 CSS Custom Properties (`css/styles.css`)

```css
:root {
  --neon-pink: #ff00ff;
  --neon-purple: #bc13fe;
  --neon-cyan: #0ff0fc;
  --bg-dark: #0a0a0f;
  --bg-darker: #050508;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --success: #00ff41;
  --warning: #ffcc00;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  --crt-scanline: rgba(18, 16, 16, 0.1);
  --glow-pink: 0 0 10px var(--neon-pink), 0 0 20px var(--neon-pink);
  --glow-purple: 0 0 10px var(--neon-purple), 0 0 20px var(--neon-purple);
  --glow-cyan: 0 0 10px var(--neon-cyan), 0 0 20px var(--neon-cyan);
}
```

### 4.2 Retro Theme Override

The class `body.theme-retro` overrides these custom properties to a warm amber/monochrome scheme. It also applies selective overrides for:

| Element | What Changes |
|---------|--------------|
| Terminal titlebar | Darker gradient (#2a2520 → #1f1c15) |
| Traffic light dots | Amber tones (red→#ff8c00, yellow→#b87329, green→#ffaa00) |
| Command lines | Border and background adjust to amber neon |
| Footer | Darker gradient |
| Command palette | Custom properties via `body.theme-retro .command-palette` blocks |

### 4.3 Command Palette CSS

The Ctrl+K overlay uses dedicated custom properties for easy theming:

| Property | Default | Purpose |
|----------|---------|---------|
| `--palette-bg` | `rgba(10,10,20,0.92)` | Overlay background |
| `--palette-border` | `rgba(188,19,254,0.3)` | Border color |
| `--palette-shadow` | neon purple glow | Box shadow |
| `--palette-hover` | `rgba(188,19,254,0.12)` | Item hover state |
| `--palette-text` | `var(--neon-cyan)` | Text color |
| `--palette-accent` | `var(--neon-pink)` | Highlighted match |
| `--palette-accent-shadow` | `rgba(188,19,254,0.4)` | Highlight glow |

### 4.4 Key Animations

| Animation | Element | Effect |
|-----------|---------|--------|
| `glitch` | `.glitch` (H1) | Random translate jumps |
| `glitch-1/2` | `.glitch::before/after` | Clip-path shifting (2 colors) |
| `neonPulse` | Header, status dots | Opacity fade 0.7→1 |
| `matrixRain` | `.matrix-column` | Vertical falling columns |
| `cursorBlink` | Input cursor | Opacity blink every 1s |
| `palette-fade-in` | Command palette | Slide-up + fade entry |
| `fadeIn` | Output lines | TranslateY + opacity entry |

### 4.5 Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| 768px | Smaller glitch text, reduced terminal height, stacked footer |
| `prefers-reduced-motion: reduce` | Disables all animations, forces duration to 0.1s |
| `prefers-contrast: high` | White/CCC text, thicker borders |
| `print` | Hides all chrome, white background, black text |

---

## 5. ALL 25 TERMINAL COMMANDS

Commands are defined in `terminal.js:221-311` (`executeCommand()`) with details:

| Command | Handler Method | Args | Purpose |
|---------|---------------|------|---------|
| `help` | `showHelp()` | None | Lists commands, keyboard shortcuts, project categories |
| `projects [cat]` | `showProjects(args)` | category filter | Lists projects as cards; filter: cloud, devops, iot, web |
| `project <name>` | `showProjectDetail(args)` | project slug | Deep-dive: tech stack, metrics, badges, achievements, links |
| `skills [cat]` | `showSkills(args)` | category filter | Text-based skill list by category |
| `skills-visual` | `showSkillsVisual()` | None | Animated progress bars per category (uses `SKILLS_DATA`) |
| `timeline` | `showTimeline()` | None | ASCII art project timeline with `[CURRENT]` tags |
| `experience [lvl]` | `showExperience(args)` | level filter | Work experience cards; filter: senior, mid, junior |
| `education` | `showEducation()` | None | Education cards with degree details |
| `resume [--txt\|--md]` | `showResume(args)` | format flag | Display plain text, or download as .txt/.md via Blob |
| `about` | `showAbout()` | None | Personal bio with emoji sections |
| `contact` | `showContact(args)` | --email flag | Contact info + interactive multi-step email form |
| `status` | `showStatus()` | None | Network status + MeshWatch metrics + browser info |
| `minecraft` | `showMinecraft()` | None | Fetches `config/minecraft-stats.json` for live server stats |
| `ai <question>` | `askAI(args)` | question | AI assistant via Ollama (or cached fallback) |
| `demo [stop]` | `startDemoMode/stopDemoMode` | stop flag | Auto-cycles through projects every 4s |
| `clear` | `clearTerminal()` | None | Safe DOM node removal of all output |
| `theme [retro\|synthwave]` | `toggleTheme()` | theme name | Toggles `body.theme-retro` class |
| `matrix [on\|off]` | `toggleMatrix(arg)` | on/off toggle | Shows/hides matrix rain columns |
| `neofetch` | `showNeofetch()` | None | ASCII art system info display |
| `fortune` | `showFortune()` | None | Random tech/career quote from 20 options |
| `cowsay <text>` | `showCowsay(args)` | text | ASCII cow bubble with word-wrapped text |
| `achievements` | `showAchievements()` | None | Lists 10 badges with unlock status |
| `perf` | `showPerf()` | None | Performance dashboard (TTFB, DCL, Full Load) with A-F grading |

### 5.1 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Command history navigation |
| `Tab` | Autocomplete current command |
| `Ctrl+K` | Open/close command palette overlay |
| `Escape` | Focus command input |
| `Ctrl+L` | Clear terminal |

### 5.2 Command Palette (Ctrl+K)

Implemented in `toggleCommandPalette()` + `showCommandPalette()`:
- **Search**: Filters 23+ commands in real-time
- **Navigation**: Arrow keys + Enter to execute
- **Design**: Modal overlay with blur backdrop, custom properties for theming
- **Data**: Uses `COMMAND_ICONS`, `COMMAND_DESCS`, `filterCommands()` from helpers.js

---

## 6. JAVASCRIPT MODULE ARCHITECTURE

### 6.1 Module Dependency Graph

```
index.html
  ├── js/terminal.js (type="module")
  │     ├── js/project-catalog.js       (getProjects, getProject, generateBadges)
  │     ├── js/meshwatch-api.js         (MeshWatchAPI class)
  │     ├── js/ai-assistant.js          (AIAssistant class)
  │     ├── js/achievements.js          (Achievements class)
  │     └── js/utils/helpers.js         (All pure utility functions)
  │
  ├── js/audio.js (type="module")       — self-instantiates AudioController
  ├── js/performance.js (type="module") — self-instantiates PerformanceMonitor
  ├── js/pwa.js (regular script)        — SW registration + online/offline status
  └── js/visual-effects.js (type="module") — self-instantiates VisualEffects
```

### 6.2 Key Classes

#### Terminal (terminal.js:20-1811)
- **Self-instantiates** at bottom of file (`if (typeof window !== 'undefined') { const term = new Terminal(); }`)
- **Async constructor**: calls `loadConfig().then(() => this.init())` in browser, `this.init()` in Node
- **25 command methods**: `showHelp()`, `showProjects()`, `showSkills()`, etc.
- **Factory methods**: `_guard()` (browser checks), `_line(text, type)` (output lines), `_card(html)` (project cards)
- **500-line output cap**: Prevents DOM bloat on long sessions

```javascript
// Core pattern — every public method uses _guard() for Node.js safety:
_guard() {
  return typeof document === 'undefined' || !this.output;
}
```

#### MeshWatchAPI (meshwatch-api.js:4-224)
- **PKCE OAuth flow**: `startAuthFlow()` → GitHub authorize → callback → `exchangeCodeForToken()`
- **Secure**: Token stored in memory only, never localStorage
- **Flat return structure**: `{ success: true, podsDeployed: 15, servicesMonitored: 5, ... }`
- **Whitelisted queries**: `queryPrometheus()` only allows 4 query IDs
- **Fallback data**: Returns mock values if Azure Functions unreachable

#### AIAssistant (ai-assistant.js:4-191)
- **3-tier query chain**: Azure Functions proxy → Tailscale Ollama → Cached knowledge
- **15+ cached answers**: `_getCachedAnswer()` handles keywords: meshwatch, kubernetes, cost, ollama, minecraft, azure, skills, education, experience, contact, llm, and a generic catch-all
- **Null-safe**: `_queryViaTailscale()` returns early if `TAILSCALE_OLLAMA_URL` is null
- **Config-driven**: Tailscale URL loaded from `config/career-fair.json` at startup

#### Achievements (achievements.js:1-87)
- **10 badges**: Terminal Novice, Explorer, Skills Chart, Timeline Viewer, System Info, Fortune Teller, Cow Sayer, Theme Switcher, Demo Master, Full Explorer
- **Persistence**: `localStorage` key `portfolio-achievements`
- **Auto-tracking**: `record(command, args)` called in `executeCommand()` after every command

### 6.3 Pure Utility Functions (helpers.js)

```javascript
escapeHtml(str)           → escaped string (null-byte safe, 6 replacements)
normalizeSlug(str)        → lowercase hypenated slug
validateUrl(url, fb)     → validated URL or fallback

COMMAND_ICONS             → { help: '❓', projects: '📊', ... }
COMMAND_DESCS             → { help: 'Show available commands', ... }
highlightMatch(txt, qry)  → HTML string with <span class="palette-match">
createPaletteItem(cmd, q) → object with { cmd, icon, desc, innerHTML }
filterCommands(cmds, qry) → sorted filtered array

SKILLS_DATA               → { cloud: { label, items[], level }, frontend, backend, devops }
PERF_THRESHOLDS           → { ttfb: {a:200,b:400,c:800,d:1500}, domContentLoaded, fullLoad }
gradePerf(ms, thresholds) → { letter: 'A'|'B'|'C'|'D'|'F'|'?', color }
computeOverallGrade(g)    → { grade: 'A'|'B'|'C'|'D'|'F', color }
```

### 6.4 Project Catalog (project-catalog.js)

5 projects defined with full metadata:

| Slug | Name | Category | GitHub | Live URL |
|------|------|----------|--------|----------|
| `meshwatch` | MeshWatch | devops | github.com/chaitea321/meshwatch | chai-homelab.com/grafana |
| `minecraft-monitoring` | minecraft-monitoring | iot | github.com/chaitea321/minecraft-monitoring | chai-homelab.com/grafana/d/minecraft |
| `career-portal` | Career Portal | web | github.com/chaitea321/career-portal | chai-homelab.com |
| `monitoring` | Monitoring Stack | devops | null (local) | chai-homelab.com/loki |
| `azure-functions` | Azure Functions | cloud | null (local) | null |

Each project has: `name, slug, description, category, tags[], techStack[{name, level}], metrics{}, badges[], githubUrl, liveUrl, keyAchievements[], demoNote`

---

## 7. CONFIGURATION FILES

### 7.1 `config/career-fair.json`

Single source for: demo mode timing, mock data for all 5 projects, career fair UI settings, offline fallback settings, AI assistant URL/model, theme preferences, accessibility flags, PWA settings, Minecraft stats source info.

Structure:
```json
{
  "version": "2.0.0",
  "demoMode": { "cycleIntervalMs": 4000, "autoStart": false, ... },
  "mockData": { "meshwatch": { ... }, "minecraft": { ... }, ... },
  "careerFairSettings": { "recruiterView": false, ... },
  "offlineFallback": { "enabled": true, "cacheDurationMinutes": 30, ... },
  "aiAssistant": { "tailscaleUrl": "http://100.65.214.138:11434", "model": "phi-3", ... },
  "themes": { "default": "synthwave", "available": ["synthwave", "retro"] },
  ...
}
```

### 7.2 `config/minecraft-stats.json`

Updated every 10 minutes by `scripts/update-minecraft-stats.sh`. Structure:
```json
{
  "server": { "name": "Eugene's Homelab MC", "version": "PaperMC 26.1.2", "javaVersion": "Java 25", ... },
  "metrics": { "tps": 20, "players": 3, "maxPlayers": 20, "uptime": "99.7%", "heapUsedMB": 300, "heapMaxMB": 512 },
  "monitoring": { "discordAlertsToday": 2, "rconLatency": "23ms", ... },
  "recentChanges": [ ... ],
  "lastUpdated": "2026-06-12T23:40:01Z"
}
```

### 7.3 `_headers` (Cloudflare Pages)

```http
/css/*   → Cache-Control: public, max-age=31536000, Content-Type: text/css
/js/*    → Cache-Control: public, max-age=31536000, Content-Type: application/javascript
/icons/* → Cache-Control: public, max-age=31536000, Content-Type: image/png
/config/* → Cache-Control: public, max-age=600, Content-Type: application/json
```

---

## 8. DESIGN PATTERNS & CONVENTIONS

### 8.1 Self-Instantiating Classes

Every module that provides page-level functionality follows this pattern:
```javascript
class Foo { ... }
const instance = new Foo();
export default instance;
```

Applied in: `audio.js`, `performance.js`, `visual-effects.js`  
Exception: `terminal.js` exports the class and self-instantiates only in browser (checks `typeof window !== 'undefined'`)

### 8.2 Node.js Safety with `_guard()`

All DOM-dependent code must handle Node.js (test environment) gracefully:
```javascript
// Method 1: use _guard() at method start (preferred for methods that render)
showExperience(level = '') {
  if (this._guard()) return;  // Exits early in Node.js
  ...
}

// Method 2: check directly (for non-output methods)
toggleMatrix(arg = '') {
  if (typeof document === 'undefined') return;
  ...
}
```

### 8.3 Output Rendering

Two output factories in Terminal class:
- `_line(text, type)` — Safe textContent-based line creation
- `_card(html, className)` — innerHTML-based for rich cards (uses `escapeHtml()` on all dynamic data)

The `log()` method has a **500-line cap** that removes oldest output when exceeded:
```javascript
while (this.output.children.length > 500) {
  this.output.removeChild(this.output.firstChild);
}
```

### 8.4 XSS Prevention

Every piece of dynamic content interpolated into HTML must pass through `escapeHtml()`:
- Project names, descriptions, metrics
- User command display
- Badge strings
- URLs must pass through `validateUrl()` before `href` attribute

### 8.5 ES Module Pattern

```javascript
// Import style
import { getProjects, getProject } from './project-catalog.js';
import MeshWatchAPI from './meshwatch-api.js';

// Export style — named + default
export { PROJECT_CATALOG, getProjects, getProject, generateBadges };
export default PROJECT_CATALOG;
```

---

## 9. TESTING

### 9.1 Setup

- **Test runner**: Node.js built-in `--test` flag
- **Command**: `npm test` or `node --test tests/*.mjs`
- **Pattern**: Each test file creates mock Terminal/MeshWatchAPI instances or tests pure functions
- **All DOM-dependent code guarded**: Tests don't require jsdom or browser

### 9.2 Current Coverage (102 tests)

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| terminal.mjs | ~12 | Terminal init, command dispatch, guard, line, card |
| project-catalog.mjs | ~10 | Filtering by category, search, badge escaping |
| meshwatch-api.mjs | ~8 | Auth flow, metrics return shape, fallback data |
| ai-assistant.mjs | ~8 | Cached answers, null-safe getStatus, query chain |
| helpers.mjs | ~12 | escapeHtml edge cases, normalizeSlug, validateUrl |
| validate-url.mjs | ~4 | Protocol restrictions, XSS vectors |
| audio.mjs | ~6 | Toggle, enabled state, null-safe fallback |
| performance.mjs | ~4 | Load time tracking (mock) |
| visual-effects.mjs | ~4 | Create, toggle, resize |
| new-commands.mjs | ~12 | All new command handlers |
| new-features.mjs | ~12 | Feature integration |
| optimizations.mjs | ~10 | Dead code, SRP, DRY verification |

### 9.3 Adding Tests

```javascript
// test-name.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Feature', () => {
  it('should work', () => {
    assert.equal(actual, expected);
  });
});
```

---

## 10. CI/CD PIPELINE

### 10.1 GitHub Actions (`.github/workflows/pages.yml`)

```yaml
Trigger: push to master
Steps:
  1. Checkout code
  2. Setup Node.js 18
  3. npm install
  4. npm test                  ← gate: all 102 tests must pass
  5. cloudflare/pages-action@v1  ← deploy to Cloudflare Pages
     Requires secrets:
       - CLOUDFLARE_API_TOKEN
       - CLOUDFLARE_ACCOUNT_ID
     Project: career-portal
     Directory: .
```

### 10.2 Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages permission |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

### 10.3 Cron Jobs (on HP Laptop)

```bash
# Minecraft stats — every 10 minutes
*/10 * * * * /home/eugene/career-portal/scripts/update-minecraft-stats.sh

# Cloudflare DNS — every 30 minutes
*/30 * * * * /home/eugene/career-portal/scripts/cloudflare-dns-update.sh
```

---

## 11. BUG HISTORY (All Fixed)

### 11.1 Critical Fixes

| Bug | Cause | Fix |
|-----|-------|-----|
| `contact --email` | `showContact()` called without args | Pass `args` to `showContact(args)` |
| `resume --txt/--md` | `showResume()` called without args | Pass `args` to `showResume(args)` |
| Invalid JSON | Trailing comma in `career-fair.json` line 25 | Removed trailing comma |
| Non-standard CSS | `overflow-y: auto;` used | Replaced with `overflow: auto;` |
| EMOJI RENDERING | `\u{...}` in HTML renders as literal text | Replaced with UTF-8 emoji |
| AI query crash | Null `TAILSCALE_OLLAMA_URL` caused fetch to `"null/api/chat"` | Added null check in `_queryViaTailscale()` |
| Status dot never rendered | `textContent` replaced child span | Changed to `append()` |
| Unicode escapes | `\U` invalid in JS | Replaced with direct emoji |
| XSS vectors | 7 `innerHTML` with unescaped data | All escaped via `escapeHtml()` |
| DOM bloat | Unlimited output nodes | Capped at 500 lines |

### 11.2 Dead Code Removed

| File | Lines | Reason |
|------|-------|--------|
| `js/command-parser.js` | 102 | Never imported |
| `js/github-api.js` | 143 | Never imported |

### 11.3 Refactoring (SRP/DRY)

| Change | Files | Benefit |
|--------|-------|---------|
| Extracted `_guard()` method | terminal.js | 15+ repeated checks → single source |
| Extracted `_line()` factory | terminal.js | Consistent output creation |
| Extracted `_card()` factory | terminal.js | 3+ card patterns → single source |
| Moved `validateUrl` to helpers.js | terminal.js, helpers.js | No duplication |
| Moved `SKILLS_DATA` to helpers.js | terminal.js, helpers.js | Single source for skills |
| Moved `PERF_THRESHOLDS` + grading to helpers.js | terminal.js, helpers.js | Single source for thresholds |
| Consolidated palette CSS | styles.css | Custom property pattern for theming |

---

## 12. PWA SETUP

### 12.1 Service Worker (`js/service-worker.js`)

- **Version**: v5 (cache name `career-portal-v5`)
- **Cached assets**: All HTML, CSS, JS, config files, icons, screenshots
- **Install strategy**: Cache all assets with `Promise.allSettled` — partial success is OK
- **Fetch strategy**: Cache-first → network fallback → offline.html
- **Cache cleanup**: Delete old versions on activate
- **Error handling**: Every operation wrapped in try/catch

### 12.2 Registration (`js/pwa.js`)

- Registers SW on `window.load`
- Updates `#online-status` element with colored dot + text
- Listens for `online`/`offline` events
- SW scope: `/`

### 12.3 Manifest (`manifest.json`)

- **Name**: "Eugene Vincent - Terminal Portfolio"
- **Short name**: "TermCV"
- **Display**: standalone
- **Orientation**: landscape + portrait
- **Icons**: 5 sizes (72, 96, 128, 192, 512)
- **Screenshot**: terminal-view.png (1080x1920)

---

## 13. LAUNCH & DEPLOYMENT

### 13.1 Local Development

```bash
npm run dev          # npx serve . -l 3000
npm test             # node --test tests/*.mjs
npm run lint         # eslint --config .eslintrc.json js/*.js
npm run build        # lint + test + copy to dist/
```

### 13.2 Production (Cloudflare Pages)

1. Push to `master` branch on GitHub
2. GitHub Actions runs: `npm install` → `npm test` → `cloudflare/pages-action@v1`
3. Cloudflare builds and deploys to `chai-homelab.com`
4. Cache headers from `_headers` take effect immediately

---

## 14. NEXT WORK: NEW PAGES

The following two pages have been approved but NOT YET IMPLEMENTED:

### 14.1 Project Explorer (`/project-explorer`)
- **Purpose**: Interactive card-based project catalog with filtering, search, and detail modals
- **Design**: Dark card grid with hover-expand animations, tech tag chips, live metrics badges
- **Data source**: `project-catalog.js` (reuse existing data)
- **Interaction**: Filter by category (devops/cloud/iot/web), search by keyword, click for deep-dive modal
- **Design constraints**: Maintain synthwave frame/border, unique main content area design

### 14.2 Dashboard (`/dashboard`)
- **Purpose**: Live metrics visualization for MeshWatch + Minecraft servers
- **Design**: Dashboard grid with animated gauges, status indicators, bar charts (CSS-only, no heavy libs)
- **Data source**: `config/career-fair.json` (mock data) + `config/minecraft-stats.json` (live cron data)
- **Components**: Cost savings display, server TPS gauge, player count, uptime indicator, recent changes
- **Design constraints**: Same synthwave frame/shared CSS, unique dashboard content layout

### 14.3 Design Rules for New Pages

- **Synthwave frame/border**: Must reuse the same neon border, CRT scanline overlay, glitch header
- **Unique content design**: Each page gets its own distinct layout and visual language inside the frame
- **Shared CSS base**: Add page-specific CSS in separate files or sections of `styles.css`
- **Navigation**: Needs to be navigable from the terminal (e.g., a new `explorer` or `dashboard` command, or nav links in header)
- **Reuse data**: Both pages should import from `project-catalog.js` and `config/` files
- **PWA**: Both pages should be cached by the service worker (`ASSETS_TO_CACHE` update needed)

---

## 15. CODING RULES (for LLMs)

When modifying code, follow these rules in priority order:

1. **ES Modules only**: All JS uses `import`/`export`. No CommonJS (`require`/`module.exports`).
2. **No frameworks**: Vanilla JS only. No React, Vue, jQuery, etc.
3. **XSS safety**: All user-visible dynamic data → `escapeHtml()`. All URLs → `validateUrl()`. No raw `innerHTML` with untrusted data.
4. **Guard DOM access**: Every method that uses `document`, `window`, or `this.output` must first check via `_guard()` or explicit typeof check.
5. **CSS custom properties**: Use `var(--variable)` for theming. All new themeable elements should use `--palette-*` pattern.
6. **No dead code**: If you're removing a feature, delete the file and tests. No commented-out code.
7. **Test coverage**: New features must have corresponding test files. Run `node --test tests/*.mjs` after changes.
8. **Consistent style**: 2-space indent, single quotes, semicolons required (per ESLint config).
9. **Self-instantiating pattern**: If a module runs on page load, instantiate at module scope with try/catch error boundary.
10. **500-line cap**: All terminal output additions must respect the existing 500-line DOM cap.
11. **PWA awareness**: New page files must be added to service worker `ASSETS_TO_CACHE` list.
12. **Async error handling**: All `fetch()` calls wrapped in try/catch. Silent failures preferred over crashing.

---

## 16. QUICK REFERENCE

### 16.1 Key Constants

```javascript
// Project slugs (used in URLs, commands, data references)
const AVAILABLE_PROJECTS = ['meshwatch', 'minecraft-monitoring', 'monitoring', 'azure-functions', 'career-portal'];

// Command categories (used in help text and filtering)
const CATEGORIES = ['cloud', 'devops', 'iot', 'web'];

// Skill categories (used in skills-visual and helpers.js)
const SKILL_CATEGORIES = ['cloud', 'frontend', 'backend', 'devops'];
```

### 16.2 Key Files at a Glance

| File | Lines | When to Edit |
|------|-------|--------------|
| `js/terminal.js` | 1819 | New commands, UI behavior changes |
| `js/project-catalog.js` | 222 | Add/edit projects, badges, tech stack |
| `js/utils/helpers.js` | 121 | Pure utility functions, constants |
| `js/ai-assistant.js` | 193 | AI behavior, cached answers |
| `css/styles.css` | 817 | Visual design, theme, responsive |
| `config/career-fair.json` | 97 | Demo/mock data configuration |
| `config/minecraft-stats.json` | 12 | Live Minecraft metrics (cron-updated) |
| `js/achievements.js` | 87 | Achievement/badge system |
| `tests/*.mjs` | varies | Add tests with new features |

### 16.3 Common Operations

**Add a new command:**
1. Add handler method to Terminal class in `terminal.js` (e.g., `showNewThing()`)
2. Add `case 'new-thing': this.showNewThing(); break;` to `executeCommand()` switch
3. Add `'new-thing'` to `this.commandHistory` array in constructor
4. Add icon + desc to `COMMAND_ICONS` + `COMMAND_DESCS` in `helpers.js`
5. Add to help text in `showHelp()`
6. Optionally track in achievements if appropriate

**Add a new project:**
1. Add entry to `PROJECT_CATALOG` in `project-catalog.js`
2. Add slug to `DEFAULT_PROJECT_ORDER` array
3. Add mock data to `config/career-fair.json` under `mockData`
4. Test: `node --test tests/project-catalog.mjs`

**Add a new page:**
1. Create `new-page.html` in project root
2. Add `<link rel="stylesheet" href="css/styles.css">` for shared styles
3. Add page-specific CSS inline or in a new file
4. Add page URL to service worker `ASSETS_TO_CACHE` in `js/service-worker.js`
5. Add nav link from main page (in `index.html` header or via terminal)
