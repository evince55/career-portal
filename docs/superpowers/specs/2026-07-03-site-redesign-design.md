# chai-homelab.com v2 — Full Redesign Design Spec

**Date:** 2026-07-03 · **Branch:** `redesign/v2` · **Status:** Approved direction (owner chose: evolve identity, recruiter-first, dark-only, dashboard must-keep)

## 1. Goal & positioning

Rebuild the portfolio so a recruiter skimming for 30 seconds immediately sees who Eugene is,
what he can do, and live proof — while keeping the synthwave/homelab identity as refinement
rather than costume.

- **Primary audience:** recruiters & hiring managers (30-second skim). Secondary: engineers deep-diving.
- **Core differentiator:** a CS student who designs, runs, and monitors production-grade
  infrastructure at home (k3s, Istio, Prometheus/Grafana, GitOps, Azure) — and the site proves
  it with live metrics.
- **Honest framing:** early-career (B.S. CS 2024–2028, AZ-900 certified) seeking
  internships/early roles. Confident, specific, never fake-senior.
- **Tone of copy:** plain, concrete, outcome-led ("Cut monitoring cost 60% — $5.12/mo", not
  "passionate about cloud-native excellence").

## 2. What changes at a glance

| Area | v1 (current) | v2 (this spec) |
|------|--------------|----------------|
| Homepage | Empty terminal; content requires typing `help` | Content-first landing: hero, proof strip, featured projects, live homelab teaser |
| Terminal | 2,015-line `terminal.js`, 28 commands, homepage | Ctrl+K command palette (~300 lines): nav + ~6 personality commands |
| Writeups | Separate `writeups.html` blog page | Per-project **case studies** (`projects/<slug>.html`); writeups.html redirects |
| Achievements / audio / AI assistant | Present | **Removed** |
| Dashboard | Terminal-chrome gauges | Kept (must-keep), restyled on new design system |
| Theme | Neon-on-black everywhere, glow-heavy | Dark-only refined system; neon as disciplined accent; AA contrast |
| Fonts | Google Fonts CDN | Self-hosted woff2 (Space Grotesk display, JetBrains Mono data) + system body stack |

## 3. Information architecture

```
index.html            Landing (hero + proof + featured work + homelab teaser + skills + about + contact CTA)
projects.html         All 5 projects; filter chips + search  (project-explorer.html → redirect stub)
projects/meshwatch.html
projects/minecraft-monitoring.html
projects/monitoring-stack.html
projects/azure-functions.html
projects/career-portal.html
dashboard.html        Live homelab metrics (must-keep, restyled)
contact.html          Contact form (same Azure Function endpoint + mailto fallback)
offline.html          PWA offline fallback (restyled)
404.html              New; Cloudflare Pages serves it automatically
writeups.html         Redirect stub → projects.html (preserve inbound links)
```

Global nav (all pages): Home · Projects · Dashboard · Contact + Ctrl+K palette button.
Footer: GitHub, LinkedIn, email, "built with vanilla JS — view source" nudge.

### index.html section order
1. **Hero** — name; positioning line ("Full-stack engineer with SRE/DevOps depth. I build and
   run production-grade infrastructure — at home."); two CTAs (View projects / Contact); proof
   strip of 3–4 live/static chips (e.g. homelab uptime from stats JSON, AZ-900, "5 systems in
   production", GitHub). Three.js background behind hero only.
2. **Featured projects** — 3 cards (MeshWatch, Minecraft Monitoring, Monitoring Stack), each
   with a one-line outcome number and case-study link.
3. **The homelab, live** — 3–4 real numbers pulled client-side from `config/minecraft-stats.json`
   (already updated every 10 min by cron) + link to dashboard. Graceful static fallback if fetch fails.
4. **Skills** — grouped scannable columns (Cloud/DevOps, Backend, Frontend) from `SKILLS_DATA`.
5. **About** — 3–4 sentences + education/cert line.
6. **Contact CTA** — one-liner + button; footer.

### Case-study template (all 5 pages share structure)
Header (title, one-line outcome, stack chips) → Context/problem → Architecture (diagram where
content exists; SVG preferred) → Key decisions & tradeoffs → Measured outcomes (numbers) →
Links (GitHub, live dashboard where relevant) → next/prev project nav.
Content source: `js/writeups-data.js` (5 articles map 1:1 to projects) + `js/project-catalog.js`.

## 4. Design system (new files: `css/tokens.css`, `css/base.css`)

- **Color tokens** (dark only): layered surfaces `--bg-0/-1/-2` (near-black family, subtle
  elevation steps); text `--text-1/-2/-3` (all ≥ 4.5:1 on their surfaces); accents
  `--accent-cyan` (primary interactive), `--accent-magenta` (brand moments only);
  status `--ok/--warn/--err` (dashboard); borders `--line` (low-alpha white).
  Every token pair used for text MUST pass WCAG AA; a unit test computes contrast ratios from
  tokens.css and fails under 4.5:1 (3:1 for large text/UI).
- **Type**: display = Space Grotesk (self-hosted woff2, weights via variable file);
  data/code = JetBrains Mono (self-hosted); body/UI = system-ui stack. Modular scale
  (~1.25 ratio) as `--fs-*` tokens; fluid clamp() for display sizes.
  Fonts preloaded, `font-display: swap`. If self-host download is impossible at build time,
  fallback = system stack everywhere (note it in the report); no render-blocking CDN CSS.
- **Space/radius/borders**: 4px-base scale `--sp-1..-12`; radius `--r-1/-2/-3`; 1px lines.
- **Motion tokens**: `--t-fast: 150ms`, `--t-med: 250ms`, `--t-slow: 400ms`, one easing pair.
  Scroll-reveal on section entry. **Everything animated is disabled/reduced under
  `prefers-reduced-motion: reduce`.** Glow (box/text-shadow) allowed only on: hero title accent,
  interactive hover/focus states, live-status dot.
- **Components**: nav bar, footer, button (primary/ghost), card, chip/tag, stat block, gauge,
  form field (+error state), palette modal, section header. Defined once in base.css, reused per page.

## 5. Behavior & modules (`js/`)

| Module | Status | Notes |
|--------|--------|-------|
| `palette.js` | **new** | Ctrl+K + button. Nav commands, copy-email, personality cmds (`whoami`, `uptime`, `sudo hire-me`, `coffee`). Listbox ARIA pattern, focus trap, Esc closes, fully keyboard operable. Command registry exported for tests. |
| `home-live.js` | **new** | Fetches minecraft-stats.json for hero chip + homelab section; timeouts + static fallback. |
| `three-hero.js` | **new (adapts three-*.js)** | Lazy-loaded post-LCP on index only; synthwave wireframe/particle field; DPR capped; pauses on `visibilitychange`/offscreen; skipped entirely for reduced-motion, `saveData`, or no WebGL → static CSS gradient. Check current Three.js docs (Context7) for import/init patterns; keep current vendored/CDN approach consistent with PWA offline. |
| `project-catalog.js` | keep | + `slug`, `outcome`, `caseStudyUrl` fields. |
| `writeups-data.js` | keep (source) | Feeds case-study pages (content may be inlined into HTML at authoring time; keep data file as source of truth for tests). |
| `contact-api.js`, `pwa.js`, `performance.js`, `utils/helpers.js` | keep | helpers keeps `escapeHtml` etc.; remove `COMMAND_ICONS/DESCS/COUNT` if terminal-only. |
| `service-worker.js` | update | Cache name → `career-portal-v7`; ASSETS_TO_CACHE = new page/asset list; same fetch-first + offline.html strategy. Verify against current SW best practices (Context7/MDN). |
| `terminal.js`, `achievements.js`, `audio.js`, `ai-assistant.js`, `meshwatch-api.js`* | **remove** | *meshwatch-api.js: keep only if dashboard actually uses it (verify); otherwise remove with its tests. |
| `mobile-nav.js`, `scroll-reveal.js` | rewrite-or-keep | Fold into small `nav.js` / keep scroll-reveal if clean. |

Security convention unchanged: all dynamic text through `escapeHtml()` before `innerHTML`.

## 6. Accessibility (WCAG 2.1 AA — hard requirement)

Skip link on every page; landmark structure (`header/nav/main/footer`) + correct heading
hierarchy; visible `:focus-visible` rings everywhere; palette = ARIA combobox/listbox with
keyboard + focus trap; form fields labeled, errors `aria-live` announced; gauges/stats have
text equivalents (`role="img"` + label or visually-hidden text); contrast enforced by token
test; reduced-motion honored globally (including Three.js and scroll-reveal); touch targets
≥ 44px; no keyboard traps. Verified with Playwright keyboard-walk + axe-style checks.

## 7. Performance (targets, verified before "done")

- Lighthouse ≥ 95 Performance/A11y/Best-Practices/SEO on home + one case study (mobile emulation).
- Initial JS on index < 50KB (Three.js excluded — lazy post-LCP); no render-blocking third-party CSS.
- Fonts: ≤ 2 self-hosted woff2 files, preloaded, swap.
- SW v7 precaches all pages/assets; `_headers` caching kept; add `sitemap.xml`, refresh
  `json-ld.json` + meta/OG tags per page (unique titles/descriptions).

## 8. Testing & quality gates

- `node --test` suite green; ESLint 0 errors. Tests for dropped modules removed with them;
  new tests added for: palette registry/filtering/actions, token contrast (parse tokens.css,
  compute ratios), catalog↔case-study integrity (5 projects, each slug page exists on disk),
  SW asset list ↔ files-on-disk parity, home-live fallback behavior, helpers (kept).
  Net coverage must not regress (≥ ~115 test count as rough floor).
- Playwright verification at 375px / 768px / 1280px: every page renders, nav works, palette
  keyboard flow, contact validation, dashboard fallback. Screenshots archived as evidence.
- Design-critique + ux-copy pass per page; fresh-context verifier checks build vs this spec.

## 9. Rollout & compat

- All work on `redesign/v2`; pushed to the homelab repo remote (NOT GitHub) for preview at
  `http://100.76.103.1:3000`. Owner decides merge + production deploy (Cloudflare Pages on
  `master` push). No production deploy, DNS, or secret changes by the agent.
- Redirect stubs preserve `project-explorer.html` and `writeups.html` inbound links.
- `manifest.json` (name/colors) refreshed; icons kept as-is (out of scope).
- `README.md` + `AGENTS.md` updated to the new architecture (modules table, gotchas: palette,
  SW v7, removed terminal-era gotchas).
- Out of scope: light theme, new icon set, blog platform, i18n, analytics, contact backend changes.

## 10. Risks

- **Removing the terminal changes the site's "hook"** → mitigated: palette keeps personality;
  case studies + live data become the hook.
- **Three.js perf on low-end mobile** → lazy + DPR cap + kill-switch fallbacks; measured in verification.
- **stats JSON staleness/CORS** → client fetch is same-origin; fallback text on failure.
- **Test-count regression from deleting terminal tests** → new module tests must restore coverage; gate on suite ≥ green baseline semantics, not raw count alone.
