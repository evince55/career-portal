import { describe, it } from 'node:test';
import assert from 'assert/strict';
import Terminal from '../js/terminal.js';

describe('Terminal', () => {
  it('instantiates without crashing when document is undefined', () => {
    const t = new Terminal();
    assert.ok(t instanceof Terminal);
  });

  it('executeCommand does not throw for known commands', () => {
    const t = new Terminal();
    assert.doesNotThrow(() => t.executeCommand('help'));
    assert.doesNotThrow(() => t.executeCommand('clear'));
    assert.doesNotThrow(() => t.executeCommand('about'));
  });

  it('executeCommand does not throw for unknown commands', () => {
    const t = new Terminal();
    assert.doesNotThrow(() => t.executeCommand('nonexistent'));
  });

  it('executeCommand does not throw for commands with args', () => {
    const t = new Terminal();
    assert.doesNotThrow(() => t.executeCommand('theme retro'));
    assert.doesNotThrow(() => t.executeCommand('project test-monorepo'));
    assert.doesNotThrow(() => t.executeCommand('ai "what is this?"'));
  });
});
