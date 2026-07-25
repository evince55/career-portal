import { describe, it } from 'node:test';
import assert from 'assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

// This file used to validate URLs inside js/project-catalog.js. That catalog was
// never imported by any page — it described 5 of the 9 projects and had drifted
// out of sync with the cards that actually shipped — so it was deleted. These
// checks now run against the real HTML instead, which is what visitors and
// recruiters actually click.

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const onDisk = (p) => existsSync(new URL(`../${p}`, import.meta.url));
const PAGES = [
  'index.html', 'projects.html', 'dashboard.html', 'contact.html', 'resume.html', '404.html',
  ...readdirSync(new URL('../projects', import.meta.url))
    .filter((f) => f.endsWith('.html')).map((f) => `projects/${f}`)
];

const linksIn = (html) => [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);

describe('URL validation', () => {
  it('every internal link resolves to a file on disk', () => {
    for (const page of PAGES) {
      const dir = page.includes('/') ? page.slice(0, page.lastIndexOf('/') + 1) : '';
      for (const url of linksIn(read(page))) {
        if (/^(https?:|mailto:|tel:|data:|#|\/\/|javascript:)/.test(url)) continue;
        const clean = url.split('?')[0].split('#')[0];
        if (!clean || clean === '/') continue;
        const target = clean.startsWith('/')
          ? clean.slice(1)
          : new URL(clean, `file:///${dir}`).pathname.slice(1);
        assert.ok(onDisk(target), `${page}: dead internal link ${url}`);
      }
    }
  });

  it('every external link is https, never bare http', () => {
    for (const page of PAGES) {
      for (const url of linksIn(read(page))) {
        if (!url.startsWith('http:')) continue;
        // the SVG xmlns namespace is an identifier, not a followable link
        assert.ok(url.startsWith('http://www.w3.org/'), `${page}: insecure http link ${url}`);
      }
    }
  });

  it('internal navigation never hardcodes the production domain', () => {
    // An absolute chai-homelab.com href in a nav/card link bypasses the local
    // dev server and the deploy preview, silently sending a visitor to prod.
    // Canonical/og/schema tags legitimately use it, so only <a href> counts.
    for (const page of PAGES) {
      const anchors = [...read(page).matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
      for (const url of anchors) {
        assert.ok(
          !url.startsWith('https://chai-homelab.com'),
          `${page}: internal link should be relative, got ${url}`
        );
      }
    }
  });
});
