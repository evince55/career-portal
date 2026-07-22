import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { PROJECT_CATALOG, getProjects } from '../js/project-catalog.js?v=3';
import { HONEYPOT } from '../functions/api/contact.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const onDisk = (p) => existsSync(new URL(`../${p}`, import.meta.url));

const projects = getProjects();
const PAGES = [
  'index.html', 'projects.html', 'dashboard.html', 'contact.html', '404.html',
  ...projects.map((p) => p.caseStudyUrl.replace(/^\//, ''))
];

describe('site integrity', () => {
  it('catalog has 5 projects, each with slug, outcome and an existing case-study page', () => {
    assert.equal(projects.length, 5);
    for (const p of projects) {
      assert.ok(p.slug, `${p.name}: missing slug`);
      assert.ok(p.outcome, `${p.name}: missing outcome`);
      assert.ok(p.caseStudyUrl, `${p.name}: missing caseStudyUrl`);
      assert.ok(onDisk(p.caseStudyUrl.replace(/^\//, '')), `${p.name}: ${p.caseStudyUrl} not on disk`);
    }
  });

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

  it('redirect stubs point old URLs at projects.html', () => {
    for (const stub of ['project-explorer.html', 'writeups.html']) {
      const html = read(stub);
      assert.ok(/http-equiv="refresh"[^>]*url=\/projects\.html/.test(html), `${stub}: refresh redirect missing`);
      assert.ok(html.includes('noindex'), `${stub}: noindex missing`);
    }
  });

  it('service worker cache is v22 and every precached asset exists on disk', () => {
    const sw = read('service-worker.js');
    assert.ok(sw.includes("'career-portal-v22'"), 'cache name must be career-portal-v22');
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

  it('sitemap lists every canonical page', () => {
    const sm = read('sitemap.xml');
    for (const page of PAGES.filter((p) => p !== '404.html')) {
      const url = page === 'index.html' ? 'https://chai-homelab.com/' : `https://chai-homelab.com/${page}`;
      assert.ok(sm.includes(url), `sitemap missing ${url}`);
    }
  });

  it('PROJECT_CATALOG object and helpers stay consistent', () => {
    for (const p of projects) {
      assert.ok(PROJECT_CATALOG[p.slug] || Object.values(PROJECT_CATALOG).some((v) => v.slug === p.slug),
        `catalog lookup broken for ${p.slug}`);
    }
  });
});
