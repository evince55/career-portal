import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { PROJECT_CATALOG, getProjects } from '../js/project-catalog.js?v=3';

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

  it('redirect stubs point old URLs at projects.html', () => {
    for (const stub of ['project-explorer.html', 'writeups.html']) {
      const html = read(stub);
      assert.ok(/http-equiv="refresh"[^>]*url=\/projects\.html/.test(html), `${stub}: refresh redirect missing`);
      assert.ok(html.includes('noindex'), `${stub}: noindex missing`);
    }
  });

  it('service worker cache is v14 and every precached asset exists on disk', () => {
    const sw = read('js/service-worker.js');
    assert.ok(sw.includes("'career-portal-v18'"), 'cache name must be career-portal-v18');
    const listMatch = sw.match(/ASSETS_TO_CACHE = \[([\s\S]*?)\]/);
    assert.ok(listMatch, 'ASSETS_TO_CACHE not found');
    const assets = [...listMatch[1].matchAll(/'(\/[^']*)'/g)].map((m) => m[1]).filter((a) => a !== '/');
    assert.ok(assets.length > 20, `implausibly short precache list (${assets.length})`);
    for (const a of assets) {
      assert.ok(onDisk(a.replace(/^\//, '').split('?')[0]), `SW precaches missing file: ${a}`);
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
