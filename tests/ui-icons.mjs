import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const STUDIES = [
  'projects/aria.html', 'projects/audio.html', 'projects/azure-functions.html',
  'projects/career-portal.html', 'projects/homelab.html', 'projects/llm-orchestrator.html',
  'projects/meshwatch.html', 'projects/minecraft-monitoring.html', 'projects/monitoring-stack.html'
];
const PAGES = ['index.html', 'projects.html', 'dashboard.html', 'contact.html', ...STUDIES];

// v3 replaced the CSS-mask `.ico--NAME` classes with an inline SVG sprite: each
// page carries <symbol id="i-NAME"> defs and renders icons via
// <svg class="ico"><use href="#i-NAME">. A bare "#id" ref resolves within the
// same document, so every used symbol must be inlined on that page or the icon
// renders blank.
const usedSymbols = (html) =>
  new Set([...html.matchAll(/href="#(i-[a-z0-9-]+)"/g)].map((m) => m[1]));
const definedSymbols = (html) =>
  new Set([...html.matchAll(/<symbol id="(i-[a-z0-9-]+)"/g)].map((m) => m[1]));

describe('ui icons (inline sprite)', () => {
  it('every <use href="#i-…"> resolves to a symbol inlined on the same page', () => {
    for (const page of PAGES) {
      const html = read(page);
      const defined = definedSymbols(html);
      for (const id of usedSymbols(html)) {
        assert.ok(defined.has(id), `${page}: uses #${id} but no <symbol id="${id}"> is inlined`);
      }
    }
  });

  it('every inline icon <svg class="ico"> is decorative (aria-hidden)', () => {
    for (const page of PAGES) {
      const html = read(page);
      for (const m of html.matchAll(/<svg class="ico[^"]*"([^>]*)>/g)) {
        assert.ok(/aria-hidden="true"/.test(m[1]), `${page}: an .ico svg is missing aria-hidden`);
      }
    }
  });

  it('every page keeps its skip link, main landmark and palette root', () => {
    for (const page of PAGES) {
      const html = read(page);
      assert.ok(html.includes('class="skip-link"'), `${page}: skip link missing`);
      assert.ok(/<main[\s>]/.test(html), `${page}: <main> missing`);
      assert.ok(html.includes('id="palette-root"'), `${page}: palette root missing`);
    }
  });

  it('projects.html exposes a filter control for every category', () => {
    const html = read('projects.html');
    for (const cat of ['all', 'ai', 'infra', 'ios', 'web', 'writing']) {
      assert.ok(new RegExp(`data-proj-filter="${cat}"`).test(html),
        `projects.html: missing filter for "${cat}"`);
    }
  });

  it('every case study has its sections and a next-project pager', () => {
    for (const page of STUDIES) {
      const html = read(page);
      const sections = [...html.matchAll(/class="cs-section"/g)].length;
      assert.ok(sections >= 4, `${page}: expected >=4 cs-section blocks, found ${sections}`);
      assert.ok(/class="cs-next"/.test(html), `${page}: next-project pager missing`);
    }
  });
});
