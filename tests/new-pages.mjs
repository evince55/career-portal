import { describe, it, before } from 'node:test';
import assert from 'assert/strict';
import Terminal from '../js/terminal.js';
import { COMMAND_ICONS, COMMAND_DESCS } from '../js/utils/helpers.js';

describe('New Pages Navigation Tests', () => {
  let terminal;

  before(() => {
    terminal = new Terminal();
  });

  describe('explorer command', () => {
    it('explorer is in commandHistory', () => {
      assert.ok(terminal.commandHistory.includes('explorer'), 'explorer should be in command history');
    });

    it('has icon in COMMAND_ICONS', () => {
      assert.ok(COMMAND_ICONS['explorer'], 'should have icon for explorer');
    });

    it('has description in COMMAND_DESCS', () => {
      assert.strictEqual(typeof COMMAND_DESCS['explorer'], 'string', 'explorer should have description');
      assert.ok(COMMAND_DESCS['explorer'].length > 0, 'explorer description should not be empty');
    });

    it('openPage method exists', () => {
      assert.strictEqual(typeof terminal.openPage, 'function', 'openPage should be a method');
    });

    it('explorer command does not throw in Node.js context', () => {
      assert.doesNotThrow(() => terminal.executeCommand('explorer'), 'explorer should not throw in Node.js');
    });
  });

  describe('dashboard command', () => {
    it('dashboard is in commandHistory', () => {
      assert.ok(terminal.commandHistory.includes('dashboard'), 'dashboard should be in command history');
    });

    it('has icon in COMMAND_ICONS', () => {
      assert.ok(COMMAND_ICONS['dashboard'], 'should have icon for dashboard');
    });

    it('has description in COMMAND_DESCS', () => {
      assert.strictEqual(typeof COMMAND_DESCS['dashboard'], 'string', 'dashboard should have description');
      assert.ok(COMMAND_DESCS['dashboard'].length > 0, 'dashboard description should not be empty');
    });

    it('dashboard command does not throw in Node.js context', () => {
      assert.doesNotThrow(() => terminal.executeCommand('dashboard'), 'dashboard should not throw in Node.js');
    });
  });

  describe('openPage method', () => {
    it('openPage method does not throw in Node.js context', () => {
      assert.doesNotThrow(() => terminal.openPage('/test.html', 'Test Page'), 'openPage should not throw in Node.js');
    });

    it('openPage method accepts URL and title parameters', () => {
      assert.doesNotThrow(() => terminal.openPage('/test.html', 'Test Page'), 'openPage should accept URL and title');
    });
  });

  describe('help text includes new commands', () => {
    it('showHelp method exists', () => {
      assert.strictEqual(typeof terminal.showHelp, 'function', 'showHelp should be a method');
    });

    it('help text includes explorer', () => {
      assert.doesNotThrow(() => terminal.showHelp(), 'showHelp should not throw in Node.js');
    });

    it('help text includes dashboard', () => {
      assert.doesNotThrow(() => terminal.showHelp(), 'showHelp should not throw in Node.js');
    });
  });
});
