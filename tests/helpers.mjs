import { describe, it } from 'node:test';
import assert from 'assert/strict';
import { existsSync } from 'node:fs';
import { escapeHtml, normalizeSlug, parseStatValue, techIconSlug } from '../js/utils/helpers.js';

describe('Helper Utilities', () => {
  describe('escapeHtml', () => {
    it('escapes ampersands', () => {
      assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
    });

    it('escapes angle brackets', () => {
      assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
    });

    it('escapes double quotes', () => {
      assert.strictEqual(escapeHtml('"test"'), '&quot;test&quot;');
    });

    it('escapes single quotes', () => {
      assert.strictEqual(escapeHtml("'test'"), '&#x27;test&#x27;');
    });

    it('handles null/undefined safely', () => {
      assert.strictEqual(escapeHtml(null), '');
      assert.strictEqual(escapeHtml(undefined), '');
    });

    it('strips null bytes to prevent injection', () => {
      assert.strictEqual(escapeHtml('test\0ing'), 'testing');
    });

    it('handles numbers by converting to string', () => {
      assert.strictEqual(escapeHtml(123), '123');
    });

    it('does not double-escape', () => {
      assert.strictEqual(escapeHtml('&amp;'), '&amp;amp;');
    });
  });

  describe('normalizeSlug', () => {
    it('preserves existing hyphens in slugs', () => {
      assert.strictEqual(normalizeSlug('minecraft-monitoring'), 'minecraft-monitoring');
      assert.strictEqual(normalizeSlug('azure-functions'), 'azure-functions');
      assert.strictEqual(normalizeSlug('my-super-project'), 'my-super-project');
    });

    it('converts spaces to hyphens', () => {
      assert.strictEqual(normalizeSlug('mesh watch'), 'mesh-watch');
      assert.strictEqual(normalizeSlug('career  portal'), 'career-portal');
    });

    it('collapses multiple consecutive hyphens to one', () => {
      assert.strictEqual(normalizeSlug('some---slug'), 'some-slug');
      assert.strictEqual(normalizeSlug('a--b-c'), 'a-b-c');
    });

    it('lowercases input', () => {
      assert.strictEqual(normalizeSlug('MESHWATCH'), 'meshwatch');
      assert.strictEqual(normalizeSlug('MixedCaseSlug'), 'mixedcaseslug');
    });

    it('handles non-string gracefully', () => {
      assert.strictEqual(normalizeSlug(null), '');
      assert.strictEqual(normalizeSlug(undefined), '');
    });

    it('handles already-normalized slugs unchanged', () => {
      assert.strictEqual(normalizeSlug('already-normalized'), 'already-normalized');
    });
  });
});

describe('parseStatValue', () => {
  it('parses plain percentages', () => {
    assert.deepEqual(parseStatValue('99.8%'), { prefix: '', value: 99.8, decimals: 1, suffix: '%' });
  });
  it('parses currency with suffix', () => {
    assert.deepEqual(parseStatValue('$5.12/mo'), { prefix: '$', value: 5.12, decimals: 2, suffix: '/mo' });
  });
  it('parses count abbreviations and ratios', () => {
    assert.deepEqual(parseStatValue('894k'), { prefix: '', value: 894, decimals: 0, suffix: 'k' });
    assert.deepEqual(parseStatValue('3 / 20'), { prefix: '', value: 3, decimals: 0, suffix: ' / 20' });
    assert.deepEqual(parseStatValue('~2 s'), { prefix: '~', value: 2, decimals: 0, suffix: ' s' });
    assert.deepEqual(parseStatValue('90+'), { prefix: '', value: 90, decimals: 0, suffix: '+' });
  });
  it('returns null when no number exists', () => {
    assert.equal(parseStatValue('n/a'), null);
    assert.equal(parseStatValue(''), null);
    assert.equal(parseStatValue(null), null);
  });
});

describe('techIconSlug', () => {
  it('maps catalog names to vendored icon slugs', () => {
    assert.equal(techIconSlug('Kubernetes (k3s)'), 'k3s');
    assert.equal(techIconSlug('Istio Service Mesh'), 'istio');
    assert.equal(techIconSlug('Prometheus + Grafana'), 'prometheus');
    assert.equal(techIconSlug('ArgoCD'), 'argo');
    assert.equal(techIconSlug('Discord.py Bot'), 'discord');
  });
  it('returns null for unknown tech', () => {
    assert.equal(techIconSlug('cert-manager'), null);
    assert.equal(techIconSlug(null), null);
  });
  it('every mapped slug has its SVG on disk', () => {
    for (const name of ['k3s', 'kubernetes', 'istio', 'prometheus', 'grafana', 'cloudflare', 'discord', 'argo', 'github', 'python', 'node']) {
      const slug = techIconSlug(name);
      assert.ok(existsSync(new URL(`../icons/tech/${slug}.svg`, import.meta.url)), `missing icons/tech/${slug}.svg`);
    }
  });
});
