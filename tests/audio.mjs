import { describe, it } from 'node:test';
import assert from 'assert/strict';
import audioController from '../js/audio.js';

describe('AudioController', () => {
  it('exports a singleton instance', () => {
    assert.ok(audioController);
    assert.strictEqual(typeof audioController, 'object');
  });

  it('starts with audio disabled', () => {
    assert.strictEqual(audioController.enabled, false);
  });

  it('handleInput does not throw without DOM', () => {
    assert.doesNotThrow(() => audioController.handleInput('a'));
    assert.doesNotThrow(() => audioController.handleInput('Enter'));
    assert.doesNotThrow(() => audioController.handleInput('Backspace'));
  });

  it('toggle flips enabled state', () => {
    const before = audioController.enabled;
    audioController.toggle();
    assert.strictEqual(audioController.enabled, !before);
    audioController.toggle();
    assert.strictEqual(audioController.enabled, before);
  });

  it('playSound does not throw without DOM', () => {
    assert.doesNotThrow(() => audioController.playSound('keydown'));
    assert.doesNotThrow(() => audioController.playSound('enter'));
    assert.doesNotThrow(() => audioController.playSound('backspace'));
    assert.doesNotThrow(() => audioController.playSound('error'));
  });

  it('loadPreference does not throw without localStorage', () => {
    assert.doesNotThrow(() => audioController.loadPreference());
  });
});
