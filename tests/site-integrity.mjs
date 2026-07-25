import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { HONEYPOT } from '../functions/api/contact.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const onDisk = (p) => existsSync(new URL(`../${p}`, import.meta.url));

// Case studies come from disk, not from the catalog: the catalog only describes
// 5 of the 9 case-study pages, which silently left the other 4 — including the
// flagship llm-orchestrator — out of every integrity check below.
const CASE_STUDIES = readdirSync(new URL('../projects', import.meta.url))
  .filter((f) => f.endsWith('.html'))
  .map((f) => `projects/${f}`)
  .sort();
const PAGES = [
  'index.html', 'projects.html', 'dashboard.html', 'contact.html', 'resume.html', '404.html',
  ...CASE_STUDIES
];
// Pages a search engine or link unfurler will actually reach. 404/offline opt
// out with robots noindex, so canonical and social-card rules don't apply.
const INDEXABLE = PAGES.filter((p) => !/<meta name="robots" content="noindex">/.test(read(p)));

describe('site integrity', () => {
  it('every page has skip link, main landmark, unique title, meta description and palette root', () => {
    const titles = new Set();
    for (const page of PAGES) {
      const html = read(page);
      assert.ok(html.includes('class="skip-link"'), `${page}: skip link missing`);
      assert.ok(/<main[\s>]/.test(html), `${page}: <main> missing`);
      const t = html.match(/<title>([^<]+)<\/title>/)?.[1];
      assert.ok(t, `${page}: <title> missing`);
      assert.ok(!titles.has(t), `${page}: duplicate title "${t}"`);
      titles.add(t);
      assert.ok(/<meta name="description"/.test(html), `${page}: meta description missing`);
      assert.ok(html.includes('id="palette-root"'), `${page}: palette root missing`);
      assert.ok(html.includes('lang='), `${page}: html lang missing`);
    }
  });

  it('contact form honeypot matches the name /api/contact drops on, and is hidden from people', () => {
    const html = read('contact.html');
    const input = html.match(new RegExp(`<input[^>]*name="${HONEYPOT}"[^>]*>`))?.[0];
    assert.ok(input, `contact.html: no honeypot input named "${HONEYPOT}" (the Function drops on that name)`);
    assert.match(input, /tabindex="-1"/, 'honeypot: keyboard users must not be able to tab into it');
    assert.match(input, /autocomplete="off"/, 'honeypot: autofill would trip it for real people');
    assert.ok(!/required/.test(input), 'honeypot: must not be required');
    // The wrapper hides it off-screen AND from assistive tech.
    const wrapper = html.match(/<div class="visually-hidden" aria-hidden="true">[\s\S]*?<\/div>/)?.[0];
    assert.ok(wrapper?.includes(`name="${HONEYPOT}"`), 'honeypot: must sit in a visually-hidden, aria-hidden wrapper');
    // The real fields stay untouched and visible.
    for (const name of ['name', 'email', 'message']) {
      assert.ok(new RegExp(`name="${name}"[^>]*required|required[^>]*name="${name}"`).test(html), `contact.html: real field "${name}" missing or no longer required`);
    }
  });

  it('every indexable page has a social preview card', () => {
    // A portfolio link gets pasted into LinkedIn, Slack and email. Without
    // og:image those unfurl as a bare grey box, which is the first impression
    // a recruiter gets of the work. noindex utility pages (404, offline) are
    // never shared deliberately, so they are exempt.
    for (const page of INDEXABLE) {
      const html = read(page);
      assert.ok(/<meta property="og:title"/.test(html), `${page}: og:title missing`);
      assert.ok(/<meta property="og:description"/.test(html), `${page}: og:description missing`);
      const img = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
      assert.ok(img, `${page}: og:image missing`);
      assert.ok(img.startsWith('https://'), `${page}: og:image must be absolute (got ${img})`);
      assert.ok(onDisk(img.replace('https://chai-homelab.com/', '')), `${page}: og:image not on disk: ${img}`);
      assert.ok(/<meta name="twitter:card"/.test(html), `${page}: twitter:card missing`);
    }
  });

  it('every page declares a canonical URL, extensionless like the live site serves it', () => {
    // Cloudflare Pages 308-redirects /foo.html -> /foo, so the canonical must be
    // the extensionless form or it points at a URL that immediately redirects.
    for (const page of INDEXABLE) {
      const html = read(page);
      const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      assert.ok(canon, `${page}: canonical missing`);
      assert.ok(canon.startsWith('https://chai-homelab.com'), `${page}: canonical must be absolute`);
      assert.ok(!canon.endsWith('.html'), `${page}: canonical should be extensionless, got ${canon}`);
    }
  });

  it('meta descriptions fit in a search result', () => {
    for (const page of PAGES) {
      const d = read(page).match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
      assert.ok(d.length >= 50, `${page}: description too short (${d.length})`);
      assert.ok(d.length <= 165, `${page}: description ${d.length} chars, truncated in search results`);
    }
  });

  it('redirect stubs point old URLs at projects.html', () => {
    for (const stub of ['project-explorer.html', 'writeups.html']) {
      const html = read(stub);
      assert.ok(/http-equiv="refresh"[^>]*url=\/projects\.html/.test(html), `${stub}: refresh redirect missing`);
      assert.ok(html.includes('noindex'), `${stub}: noindex missing`);
    }
  });

  it('service worker cache is v23 and every precached asset exists on disk', () => {
    const sw = read('service-worker.js');
    assert.ok(sw.includes("'career-portal-v23'"), 'cache name must be career-portal-v23');
    const listMatch = sw.match(/ASSETS_TO_CACHE = \[([\s\S]*?)\]/);
    assert.ok(listMatch, 'ASSETS_TO_CACHE not found');
    const assets = [...listMatch[1].matchAll(/'(\/[^']*)'/g)].map((m) => m[1]).filter((a) => a !== '/');
    assert.ok(assets.length > 20, `implausibly short precache list (${assets.length})`);
    for (const a of assets) {
      assert.ok(onDisk(a.replace(/^\//, '').split('?')[0]), `SW precaches missing file: ${a}`);
    }
  });

  it('service worker sits at the site root so its default scope covers every page', () => {
    // A worker served from /js/ can only ever control /js/* — it never sees a
    // page navigation, so offline.html can never fire. Root placement gives it
    // scope '/' with no reliance on a Service-Worker-Allowed header.
    assert.ok(onDisk('service-worker.js'), 'service-worker.js must live at the site root');
  });

  it('the old /js/ path keeps a tombstone worker that retires itself', () => {
    // Returning visitors hold a /js/-scoped registration whose cache-first rule
    // covers /js/*, so it would keep serving its own stale pwa.js — the very
    // file carrying the cleanup code. Deleting the script instead 404s its
    // update check, stranding it. A tombstone is the one path that reliably
    // retires it: the update check installs this, and it unregisters itself.
    assert.ok(onDisk('js/service-worker.js'), 'old path must keep a tombstone, not 404');
    const tomb = read('js/service-worker.js');
    assert.ok(tomb.includes('registration.unregister()'), 'tombstone must unregister itself');
    assert.ok(!tomb.includes('ASSETS_TO_CACHE'), 'tombstone must not precache anything');
    assert.ok(!tomb.includes("addEventListener('fetch'"), 'tombstone must not intercept requests');
    // It must not delete caches: they are origin-wide, so it would wipe the
    // live root worker's precache along with its own.
    assert.ok(!tomb.includes('caches.delete'), 'tombstone must leave the root worker cache alone');
  });

  it('pwa.js registers the root worker and retires the legacy /js/-scoped one', () => {
    const pwa = read('js/pwa.js');
    assert.ok(pwa.includes("register('/service-worker.js"), 'must register the root worker');
    assert.ok(!pwa.includes("'/js/service-worker.js"), 'must not register the /js/ path any more');
    // Overlapping scopes resolve most-specific-first, so a leftover /js/
    // registration would keep intercepting /js/* even once a root one exists.
    assert.ok(pwa.includes('getRegistrations'), 'must clean up stale narrower registrations');
  });

  it('_headers keeps both worker scripts out of every cache', () => {
    const lines = read('_headers').split('\n');
    // The tombstone needs this as much as the live worker does: if the edge
    // serves a stale copy of the old script, the update check never sees the
    // tombstone and the retired worker is never retired.
    for (const path of ['/service-worker.js', '/js/service-worker.js']) {
      const at = lines.findIndex((l) => l.trim() === path);
      assert.ok(at !== -1, `_headers needs a ${path} rule`);
      assert.ok(
        lines[at + 1].includes('no-store'),
        `${path} must be served no-store so clients are never stuck on an old copy`
      );
    }
  });

  it('no page references removed terminal-era modules', () => {
    for (const page of PAGES) {
      const html = read(page);
      for (const dead of ['terminal.js', 'achievements.js', 'audio.js', 'ai-assistant.js', 'mobile-nav.js', 'styles.css']) {
        assert.ok(!html.includes(dead), `${page} references removed ${dead}`);
      }
    }
  });

  it('every data-tech chip has its vendored icon on disk', () => {
    for (const page of PAGES) {
      const html = read(page);
      for (const m of html.matchAll(/data-tech="([a-z0-9]+)"/g)) {
        assert.ok(onDisk(`icons/tech/${m[1]}.svg`), `${page}: missing icons/tech/${m[1]}.svg`);
      }
    }
  });

  it('sitemap lists every canonical page, and lists it at its canonical URL', () => {
    const sm = read('sitemap.xml');
    for (const page of INDEXABLE) {
      // Must match the page's own <link rel="canonical">, not the .html path —
      // Cloudflare 308-redirects /foo.html to /foo, so listing .html would fill
      // the sitemap with URLs that redirect.
      const canon = read(page).match(/<link rel="canonical" href="([^"]+)"/)[1];
      assert.ok(sm.includes(`<loc>${canon}</loc>`), `sitemap missing canonical URL ${canon}`);
      assert.ok(!sm.includes(`${canon}.html`), `sitemap still lists the redirecting ${canon}.html`);
    }
  });

  it('every case study on disk is linked from the projects index', () => {
    // Replaces the old PROJECT_CATALOG consistency check. The catalog was never
    // rendered and covered only 5 of 9 projects; what actually matters is that
    // no case study becomes unreachable from the page that indexes them.
    const index = read('projects.html');
    for (const page of CASE_STUDIES) {
      assert.ok(index.includes(page), `${page} exists but nothing links to it from projects.html`);
    }
  });
});
