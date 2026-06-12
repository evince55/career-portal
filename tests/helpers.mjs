import { describe, it } from 'node:test';
import assert from 'assert/strict';
import { escapeHtml, normalizeSlug } from '../js/utils/helpers.js';

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
