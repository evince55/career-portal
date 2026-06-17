import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

describe('Phase 4 — Visible Theme Toggle Button', () => {
  it('index.html has theme-toggle-btn in header', async () => {
    const html = fs.readFileSync('./index.html', 'utf8');
    assert.ok(/id="theme-toggle-btn"/.test(html), 'Should have theme-toggle-btn element');
    assert.ok(/theme-icon-synthwave/.test(html), 'Should have synthwave icon');
    assert.ok(/theme-icon-retro/.test(html), 'Should have retro icon');
  });

  it('project-explorer.html has theme-toggle-btn in header', async () => {
    const html = fs.readFileSync('./project-explorer.html', 'utf8');
    assert.ok(/id="theme-toggle-btn"/.test(html), 'Should have theme-toggle-btn element');
  });

  it('dashboard.html has theme-toggle-btn in header', async () => {
    const html = fs.readFileSync('./dashboard.html', 'utf8');
    assert.ok(/id="theme-toggle-btn"/.test(html), 'Should have theme-toggle-btn element');
  });

  it('writeups.html has theme-toggle-btn in header', async () => {
    const html = fs.readFileSync('./writeups.html', 'utf8');
    assert.ok(/id="theme-toggle-btn"/.test(html), 'Should have theme-toggle-btn element');
  });

  it('contact.html has theme-toggle-btn in header', async () => {
    const html = fs.readFileSync('./contact.html', 'utf8');
    assert.ok(/id="theme-toggle-btn"/.test(html), 'Should have theme-toggle-btn element');
  });

  it('index.html has theme toggle click handler', async () => {
    const html = fs.readFileSync('./index.html', 'utf8');
    assert.ok(/themeBtn\.addEventListener/.test(html), 'Should have click event listener');
    assert.ok(/classList\.toggle\('theme-retro'\)/.test(html), 'Should toggle theme-retro class');
    assert.ok(/localStorage\.setItem/.test(html), 'Should save theme to localStorage');
  });

  it('CSS has theme-toggle-btn styles', async () => {
    const css = fs.readFileSync('./css/styles.css', 'utf8');
    assert.ok(/\.theme-toggle-btn/.test(css), 'Should have .theme-toggle-btn class');
  });

  it('CSS has retro theme overrides for toggle button', async () => {
    const css = fs.readFileSync('./css/styles.css', 'utf8');
    assert.ok(/body\.theme-retro.*theme-toggle-btn/.test(css) || /theme-retro[\s\S]*theme-toggle-btn/.test(css), 'Should have retro theme overrides');
  });
});

describe('Phase 4 — Git Command with GitHub Stats', () => {
  it('terminal.js has showGitHubStats method', async () => {
    const content = fs.readFileSync('./js/terminal.js', 'utf8');
    assert.ok(/showGitHubStats/.test(content), 'Should have showGitHubStats method');
  });

  it('git is in commandHistory array', async () => {
    const content = fs.readFileSync('./js/terminal.js', 'utf8');
    assert.ok(/'git'/.test(content), 'Should have git in commandHistory');
  });

  it('git command is in command registry', async () => {
    const content = fs.readFileSync('./js/terminal.js', 'utf8');
    assert.ok(/\['git',/.test(content), 'Should have git in command registry');
  });

  it('git command calls showGitHubStats', async () => {
    const content = fs.readFileSync('./js/terminal.js', 'utf8');
    assert.ok(/\['git'.*showGitHubStats/.test(content), 'Git entry should call showGitHubStats');
  });

  it('git command is in help text', async () => {
    const content = fs.readFileSync('./js/terminal.js', 'utf8');
    assert.ok(/github\.com\/chaitea321/.test(content), 'Should reference GitHub profile');
  });

  it('helpers.js has git in COMMAND_ICONS', async () => {
    const content = fs.readFileSync('./js/utils/helpers.js', 'utf8');
    assert.ok(/git:\s*'\\u\{1f552\}'/.test(content), 'Should have git icon in COMMAND_ICONS');
  });

  it('helpers.js has git in COMMAND_DESCS', async () => {
    const content = fs.readFileSync('./js/utils/helpers.js', 'utf8');
    assert.ok(/git:\s*'GitHub profile stats'/.test(content), 'Should have git description in COMMAND_DESCS');
  });

  it('showGitHubStats fetches from GitHub API', async () => {
    const content = fs.readFileSync('./js/terminal.js', 'utf8');
    assert.ok(/api\.github\.com\/users\/chaitea321/.test(content), 'Should fetch from GitHub API');
  });

  it('showGitHubStats has fallback for API failures', async () => {
    const content = fs.readFileSync('./js/terminal.js', 'utf8');
    assert.ok(/catch\s*\(/.test(content), 'Should have error handling');
    assert.ok(/GitHub API unavailable/.test(content), 'Should have fallback message');
  });
});
