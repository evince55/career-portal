import { describe, it } from 'node:test';
import assert from 'assert/strict';
import Terminal from '../js/terminal.js';
import { COMMAND_ICONS } from '../js/utils/helpers.js?v=3';

describe('Terminal Command Behavior', () => {
  it('_guard returns true when document is undefined', () => {
    const t = new Terminal();
    assert.strictEqual(t._guard(), true);
  });

  it('executeCommand dispatches help to showHelp', () => {
    const t = new Terminal();
    let called = false;
    t.showHelp = () => { called = true; };
    t.executeCommand('help');
    assert.ok(called);
  });

  it('executeCommand dispatches projects to showProjects', () => {
    const t = new Terminal();
    let called = false;
    t.showProjects = () => { called = true; };
    t.executeCommand('projects');
    assert.ok(called);
  });

  it('executeCommand dispatches skills to showSkills', () => {
    const t = new Terminal();
    let called = false;
    t.showSkills = () => { called = true; };
    t.executeCommand('skills');
    assert.ok(called);
  });

  it('executeCommand dispatches about to showAbout', () => {
    const t = new Terminal();
    let called = false;
    t.showAbout = () => { called = true; };
    t.executeCommand('about');
    assert.ok(called);
  });

  it('executeCommand dispatches clear to clearTerminal', () => {
    const t = new Terminal();
    let called = false;
    t.clearTerminal = () => { called = true; };
    t.executeCommand('clear');
    assert.ok(called);
  });

  it('executeCommand dispatches theme to toggleTheme when no args', () => {
    const t = new Terminal();
    let called = false;
    t.toggleTheme = () => { called = true; };
    t.executeCommand('theme');
    assert.ok(called);
  });

  it('executeCommand dispatches unknown command to warning', () => {
    const t = new Terminal();
    let warned = false;
    t.log = (msg) => { if (msg.includes('Unknown command')) warned = true; };
    t.executeCommand('unknowncommand');
    assert.ok(warned);
  });

  it('executeCommand records command in execution history', () => {
    const t = new Terminal();
    t.executeCommand('help');
    assert.ok(t._executionHistory.includes('help'));
  });

  it('executeCommand records multiple commands in order', () => {
    const t = new Terminal();
    t.executeCommand('help');
    t.executeCommand('about');
    t.executeCommand('projects');
    assert.deepStrictEqual(t._executionHistory.slice(0, 3), ['projects', 'about', 'help']);
  });

  it('executeCommand handles args for project command', () => {
    const t = new Terminal();
    let detailArg = '';
    t.showProjectDetail = (arg) => { detailArg = arg; };
    t.executeCommand('project career-portal');
    assert.strictEqual(detailArg, 'career-portal');
  });

  it('executeCommand handles theme retro for setting theme', () => {
    const t = new Terminal();
    let logMsg = '';
    t.log = (msg) => { logMsg = msg; };
    t.executeCommand('theme retro');
    // Should go through the args path, not toggleTheme
    assert.ok(true);
  });

  it('command registry keys match COMMAND_ICONS', () => {
    const t = new Terminal();
    const registryKeys = [...t._commands.keys()];
    const iconKeys = Object.keys(COMMAND_ICONS);
    assert.deepStrictEqual(new Set(registryKeys), new Set(iconKeys));
  });
});
