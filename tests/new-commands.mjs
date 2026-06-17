import { describe, it } from 'node:test';
import assert from 'assert/strict';
import Terminal from '../js/terminal.js';

describe('New Terminal Commands', () => {
  it('instantiates without crashing', () => {
    const t = new Terminal();
    assert.ok(t instanceof Terminal);
  });

  // Note: 'git' excluded — makes real fetch to GitHub API. Test separately with mocking.
  // Note: 'demo' excluded from loop — creates chained setTimeout that keeps event loop alive.
  // Tested inline with start+stop cycle below.
  const commands = [
    'experience', 'education', 'resume',
    'projects', 'skills', 'contact',
    'neofetch', 'fortune', 'cowsay',
    'achievements', 'perf',
    'explorer', 'dashboard', 'writeups',
    'status', 'minecraft', 'timeline',
    'skills-visual'
  ];

  for (const cmd of commands) {
    it(`executeCommand handles "${cmd}" without throwing`, () => {
      const t = new Terminal();
      assert.doesNotThrow(() => t.executeCommand(cmd));
    });
  }

  it('executeCommand handles demo start/stop cycle without leaking timers', () => {
    const t = new Terminal();
    t.executeCommand('demo');
    assert.ok(t.isDemoMode);
    t.executeCommand('demo stop');
    assert.strictEqual(t.isDemoMode, false);
    assert.strictEqual(t.demoInterval, null);
  });

  it('executeCommand handles "cowsay hello" with args without throwing', () => {
    const t = new Terminal();
    assert.doesNotThrow(() => t.executeCommand('cowsay Hello World'));
  });

  it('executeCommand handles "project" with project name without throwing', () => {
    const t = new Terminal();
    assert.doesNotThrow(() => t.executeCommand('project career-portal'));
  });
});
