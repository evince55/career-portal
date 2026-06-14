import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

describe('Phase 3 — Sitemap', () => {
  it('sitemap.xml exists in project root', async () => {
    const sitemapPath = '/home/eugene/career-portal/sitemap.xml';
    assert.ok(fs.existsSync(sitemapPath), 'sitemap.xml should exist');
  });

  it('sitemap.xml contains all 5 page URLs', async () => {
    const sitemap = fs.readFileSync('/home/eugene/career-portal/sitemap.xml', 'utf8');
    assert.ok(/chai-homelab\.com\/</.test(sitemap), 'Should have homepage URL');
    assert.ok(/project-explorer\.html/.test(sitemap), 'Should have project-explorer URL');
    assert.ok(/dashboard\.html/.test(sitemap), 'Should have dashboard URL');
    assert.ok(/writeups\.html/.test(sitemap), 'Should have writeups URL');
    assert.ok(/contact\.html/.test(sitemap), 'Should have contact URL');
  });

  it('sitemap.xml has valid XML structure', async () => {
    const sitemap = fs.readFileSync('/home/eugene/career-portal/sitemap.xml', 'utf8');
    assert.ok(sitemap.startsWith('<?xml'), 'Should start with XML declaration');
    assert.ok(/<urlset/.test(sitemap), 'Should have urlset root element');
    assert.ok(sitemap.includes('</urlset>'), 'Should close urlset');
  });

  it('sitemap.xml has changefreq and priority elements', async () => {
    const sitemap = fs.readFileSync('/home/eugene/career-portal/sitemap.xml', 'utf8');
    assert.ok(/<changefreq>/.test(sitemap), 'Should have changefreq elements');
    assert.ok(/<priority>/.test(sitemap), 'Should have priority elements');
  });
});

describe('Phase 3 — Writeups JSON CMS', () => {
  it('writeups.json exists in config directory', async () => {
    const writeupsPath = '/home/eugene/career-portal/config/writeups.json';
    assert.ok(fs.existsSync(writeupsPath), 'writeups.json should exist');
  });

  it('writeups.json is valid JSON with 6 articles', async () => {
    const writeupsPath = '/home/eugene/career-portal/config/writeups.json';
    const content = fs.readFileSync(writeupsPath, 'utf8');
    const writeups = JSON.parse(content);
    assert.ok(Array.isArray(writeups), 'Should be an array');
    assert.strictEqual(writeups.length, 6, 'Should have 6 articles');
  });

  it('writeups.json entries have required fields', async () => {
    const writeupsPath = '/home/eugene/career-portal/config/writeups.json';
    const content = fs.readFileSync(writeupsPath, 'utf8');
    const writeups = JSON.parse(content);

    writeups.forEach((w, i) => {
      assert.ok(w.title, `Article ${i} should have title`);
      assert.ok(w.slug, `Article ${i} should have slug`);
      assert.ok(w.category, `Article ${i} should have category`);
      assert.ok(w.excerpt, `Article ${i} should have excerpt`);
      assert.ok(w.tags, `Article ${i} should have tags array`);
      assert.ok(w.date, `Article ${i} should have date`);
      assert.ok(w.readTime, `Article ${i} should have readTime`);
      assert.ok(w.content, `Article ${i} should have content`);
    });
  });

  it('writeups.json slugs are URL-safe', async () => {
    const writeupsPath = '/home/eugene/career-portal/config/writeups.json';
    const content = fs.readFileSync(writeupsPath, 'utf8');
    const writeups = JSON.parse(content);

    writeups.forEach((w) => {
      assert.ok(/^[a-z0-9-]+$/.test(w.slug), `Slug "${w.slug}" should be URL-safe`);
    });
  });

  it('writeups.html loads from JSON with fallback', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/writeups.html', 'utf8');
    assert.ok(html.includes("fetch('/config/writeups.json"), 'Should fetch writeups.json');
    assert.ok(html.includes('DEFAULT_WRITEUPS'), 'Should have fallback data');
    assert.ok(html.includes('loadWriteups'), 'Should have loadWriteups function');
  });
});

describe('Phase 3 — JSON-LD Structured Data', () => {
  it('index.html contains JSON-LD structured data', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/index.html', 'utf8');
    assert.ok(/application\/ld\+json/.test(html), 'Should have JSON-LD script type');
    assert.ok(/"@type":\s*"Person"/.test(html), 'Should have Person schema');
    assert.ok(/"name":\s*"Eugene Vincent"/.test(html), 'Should have name field');
  });

  it('project-explorer.html contains JSON-LD', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/project-explorer.html', 'utf8');
    assert.ok(/application\/ld\+json/.test(html), 'Should have JSON-LD script type');
  });

  it('dashboard.html contains JSON-LD', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/dashboard.html', 'utf8');
    assert.ok(/application\/ld\+json/.test(html), 'Should have JSON-LD script type');
  });

  it('writeups.html contains JSON-LD', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/writeups.html', 'utf8');
    assert.ok(/application\/ld\+json/.test(html), 'Should have JSON-LD script type');
  });

  it('contact.html contains JSON-LD', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/contact.html', 'utf8');
    assert.ok(/application\/ld\+json/.test(html), 'Should have JSON-LD script type');
  });

  it('JSON-LD includes GitHub profile link', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/index.html', 'utf8');
    assert.ok(/github\.com\/chaitea321/.test(html), 'Should include GitHub profile');
  });

  it('JSON-LD includes LinkedIn profile link', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/index.html', 'utf8');
    assert.ok(/linkedin\.com\/in\/eugene-vincent/.test(html), 'Should include LinkedIn profile');
  });

  it('JSON-LD includes email field', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/index.html', 'utf8');
    assert.ok(/eugene\.vince55@/.test(html), 'Should include email field');
  });

  it('JSON-LD includes University of Illinois alumniOf', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/index.html', 'utf8');
    assert.ok(/University of Illinois/.test(html), 'Should include university');
  });

  it('JSON-LD includes knowsAbout technical skills', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/index.html', 'utf8');
    assert.ok(/"Kubernetes"/.test(html), 'Should include Kubernetes in knowsAbout');
    assert.ok(/"Azure"/.test(html), 'Should include Azure in knowsAbout');
    assert.ok(/"DevOps"/.test(html), 'Should include DevOps in knowsAbout');
  });
});

describe('Service Worker — New Assets', () => {
  it('service-worker.js includes writeups.json in cache list', async () => {
    const sw = fs.readFileSync('/home/eugene/career-portal/js/service-worker.js', 'utf8');
    assert.ok(/writeups\.json/.test(sw), 'Should include writeups.json');
  });

  it('service-worker.js includes sitemap.xml in cache list', async () => {
    const sw = fs.readFileSync('/home/eugene/career-portal/js/service-worker.js', 'utf8');
    assert.ok(/sitemap\.xml/.test(sw), 'Should include sitemap.xml');
  });
});
