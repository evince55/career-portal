import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

describe('Accessibility — ARIA Live Regions for Dynamic Content', () => {
  it('project-explorer.html has pe-live-region with aria-live="polite"', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/project-explorer.html', 'utf8');
    assert.ok(/id="pe-live-region"/.test(html), 'Should have pe-live-region element');
    assert.ok(/aria-live="polite"/.test(html), 'Should have aria-live="polite" attribute');
    assert.ok(/aria-atomic="true"/.test(html), 'Should have aria-atomic="true" attribute');
  });

  it('writeups.html has wp-live-region with aria-live="polite"', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/writeups.html', 'utf8');
    assert.ok(/id="wp-live-region"/.test(html), 'Should have wp-live-region element');
    assert.ok(/aria-live="polite"/.test(html), 'Should have aria-live="polite" attribute');
    assert.ok(/aria-atomic="true"/.test(html), 'Should have aria-atomic="true" attribute');
  });

  it('project-explorer.html renderProjects updates live region', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/project-explorer.html', 'utf8');
    assert.ok(/getElementById\('pe-live-region'\)/.test(html), 'Should get live region element by ID');
    assert.ok(/textContent.*filtered\.length/.test(html) || /textContent.*projects shown/.test(html), 'Should update textContent with filtered count');
  });

  it('writeups.html renderWriteups updates live region', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/writeups.html', 'utf8');
    assert.ok(/getElementById\('wp-live-region'\)/.test(html), 'Should get live region element by ID');
    assert.ok(/textContent.*filtered\.length/.test(html) || /textContent.*articles shown/.test(html), 'Should update textContent with filtered count');
  });

  it('project-explorer.html uses sr-only class for live region', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/project-explorer.html', 'utf8');
    assert.ok(/sr-only.*pe-live-region/.test(html) || /pe-live-region[^>]*sr-only/.test(html), 'Should have sr-only class on live region');
  });

  it('writeups.html uses sr-only class for live region', async () => {
    const html = fs.readFileSync('/home/eugene/career-portal/writeups.html', 'utf8');
    assert.ok(/sr-only.*wp-live-region/.test(html) || /wp-live-region[^>]*sr-only/.test(html), 'Should have sr-only class on live region');
  });

  it('CSS has .sr-only utility class', async () => {
    const css = fs.readFileSync('/home/eugene/career-portal/css/styles.css', 'utf8');
    assert.ok(/\.sr-only/.test(css), 'Should have .sr-only CSS class');
    assert.ok(/position:\s*absolute/.test(css) && /clip:\s*rect/.test(css), 'Should use clip rect technique for sr-only');
  });
});
