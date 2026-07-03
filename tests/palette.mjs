import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PALETTE_COMMANDS, filterCommands } from '../js/palette.js';

describe('command palette', () => {
  it('has nav commands for all pages', () => {
    const ids = PALETTE_COMMANDS.map((c) => c.id);
    for (const p of ['go-home', 'go-projects', 'go-dashboard', 'go-contact']) {
      assert.ok(ids.includes(p), `missing ${p}`);
    }
  });

  it('includes personality commands', () => {
    const ids = PALETTE_COMMANDS.map((c) => c.id);
    for (const p of ['whoami', 'uptime', 'hire-me']) {
      assert.ok(ids.includes(p), `missing ${p}`);
    }
  });

  it('every command has label, hint and run handler', () => {
    for (const c of PALETTE_COMMANDS) {
      assert.equal(typeof c.id, 'string');
      assert.equal(typeof c.label, 'string');
      assert.equal(typeof c.hint, 'string');
      assert.equal(typeof c.run, 'function');
    }
  });

  it('filters by label, case-insensitive', () => {
    assert.ok(filterCommands('PROJ', PALETTE_COMMANDS).some((c) => c.id === 'go-projects'));
  });

  it('filters by keywords', () => {
    assert.ok(filterCommands('email', PALETTE_COMMANDS).some((c) => c.id === 'copy-email'));
  });

  it('empty query returns all commands', () => {
    assert.equal(filterCommands('', PALETTE_COMMANDS).length, PALETTE_COMMANDS.length);
  });

  it('nonsense query returns empty list', () => {
    assert.equal(filterCommands('zzzqqqxxx', PALETTE_COMMANDS).length, 0);
  });
});
