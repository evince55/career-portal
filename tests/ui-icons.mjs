import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const onDisk = (p) => existsSync(new URL(`../${p}`, import.meta.url));

// Pages touched in the rich UI-icon pass.
const PAGES = [
  'dashboard.html',
  'projects.html',
  'projects/meshwatch.html',
  'projects/minecraft-monitoring.html',
  'projects/monitoring-stack.html',
  'projects/azure-functions.html',
  'projects/career-portal.html'
];

// Map every `.ico--NAME { --ico: url('/icons/...') }` declaration in base.css
// to the file it points at, so we can resolve any ico--NAME used in markup.
function icoMap() {
  const css = read('css/base.css');
  const map = new Map();
  for (const m of css.matchAll(/\.ico--([a-z0-9-]+)\s*\{\s*--ico:\s*url\('([^']+)'\)/g)) {
    map.set(m[1], m[2]);
  }
  return map;
}

describe('ui icons', () => {
  const map = icoMap();

  it('base.css defines the new UI-icon-pass classes', () => {
    for (const name of ['gauge', 'network', 'database', 'cpu', 'cog', 'cloud', 'globe',
      'grid', 'box', 'chart', 'branch', 'scale', 'link', 'info', 'book',
      'chevron-left', 'chevron-right']) {
      assert.ok(map.has(name), `base.css missing .ico--${name}`);
    }
  });

  it('every ico-- class in base.css points at an SVG that exists on disk', () => {
    for (const [name, url] of map) {
      assert.ok(onDisk(url.replace(/^\//, '')), `.ico--${name} -> ${url} not on disk`);
    }
  });

  it('every ico--NAME used in a touched page has a matching class + SVG on disk', () => {
    for (const page of PAGES) {
      const html = read(page);
      for (const m of html.matchAll(/class="ico ico--([a-z0-9-]+)"/g)) {
        const name = m[1];
        assert.ok(map.has(name), `${page}: uses ico--${name} but base.css has no such class`);
        assert.ok(onDisk(map.get(name).replace(/^\//, '')), `${page}: ico--${name} SVG missing on disk`);
      }
    }
  });

  it('all vendored UI SVGs used here are real <svg> files', () => {
    // Lucide files open with a license comment, so match on the tag, not the first byte.
    for (const [name, url] of map) {
      if (!url.startsWith('/icons/ui/')) continue;
      const svg = read(url.replace(/^\//, ''));
      assert.ok(svg.includes('<svg'), `${name}: ${url} is not a valid SVG`);
    }
  });

  it('decorative icons stay aria-hidden and never replace a text label', () => {
    for (const page of PAGES) {
      const html = read(page);
      // Every inline mask icon must carry aria-hidden.
      for (const m of html.matchAll(/<span class="ico ico--[a-z0-9-]+"([^>]*)>/g)) {
        assert.ok(/aria-hidden="true"/.test(m[1]), `${page}: an ico span is missing aria-hidden`);
      }
    }
  });

  it('touched pages keep their skip link, main landmark and palette root', () => {
    for (const page of PAGES) {
      const html = read(page);
      assert.ok(html.includes('class="skip-link"'), `${page}: skip link missing`);
      assert.ok(/<main[\s>]/.test(html), `${page}: <main> missing`);
      assert.ok(html.includes('id="palette-root"'), `${page}: palette root missing`);
    }
  });

  it('projects filter chips keep their aria-pressed buttons intact', () => {
    const html = read('projects.html');
    for (const cat of ['', 'cloud', 'devops', 'iot', 'web']) {
      const re = new RegExp(`data-category="${cat}"[^>]*aria-pressed=`);
      assert.ok(re.test(html), `projects.html: filter chip for "${cat || 'all'}" lost aria-pressed`);
    }
  });

  it('every case study keeps its five section headers and both pager links', () => {
    const studies = PAGES.filter((p) => p.startsWith('projects/'));
    for (const page of studies) {
      const html = read(page);
      for (const label of ['Context', 'Architecture', 'Key decisions', 'Measured outcomes', 'Links']) {
        assert.ok(html.includes(label), `${page}: section header "${label}" missing`);
      }
      assert.ok(/rel="prev"/.test(html), `${page}: prev pager link missing`);
      assert.ok(/rel="next"/.test(html), `${page}: next pager link missing`);
    }
  });
});
