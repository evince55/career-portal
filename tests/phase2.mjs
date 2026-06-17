import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Phase 2 — Dashboard Smooth Transitions', () => {
  it('dashboard.html contains animate parameter in renderMinecraft', async () => {
    const fs = await import('fs');
    const html = fs.readFileSync('./dashboard.html', 'utf8');

    // renderMinecraft should accept an animate parameter
    assert.ok(
      /renderMinecraft\(stats,\s*animate\s*=\s*false?\)/.test(html),
      'renderMinecraft should accept animate parameter'
    );

    // refreshDashboard should pass true for animate
    assert.ok(
      /renderMinecraft\(stats,\s*true?\)/.test(html),
      'refreshDashboard should call renderMinecraft with animate=true'
    );
  });

  it('dashboard.html uses direct gauge element updates for transitions', async () => {
    const fs = await import('fs');
    const html = fs.readFileSync('./dashboard.html', 'utf8');

    // Should query existing gauge-fill elements for animation
    assert.ok(
      /querySelector.*db-gauge-fill/.test(html),
      'Should query existing gauge-fill elements for smooth transitions'
    );
  });

  it('dashboard.html has CSS transition on gauge-fill', async () => {
    const fs = await import('fs');
    const html = fs.readFileSync('./dashboard.html', 'utf8');

    assert.ok(
      /transition:\s*width/.test(html),
      'Gauge fill should have width transition for smooth animation'
    );
  });
});

describe('Phase 2 — Terminal Command History Persistence', () => {
  it('terminal.js has _saveExecutionHistory method', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    assert.ok(
      /_saveExecutionHistory/.test(content),
      'Should have _saveExecutionHistory method'
    );
  });

  it('terminal.js has _loadCommandHistory method', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    assert.ok(
      /_loadCommandHistory/.test(content),
      'Should have _loadCommandHistory method'
    );
  });

  it('terminal.js has _recordCommand method', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    assert.ok(
      /_recordCommand/.test(content),
      'Should have _recordCommand method'
    );
  });

  it('terminal.js has _executionHistory array', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    assert.ok(
      /_executionHistory/.test(content),
      'Should have _executionHistory property'
    );
  });

  it('executeCommand calls _recordCommand at start', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    // Find executeCommand and check _recordCommand is called at the top
    const match = content.match(/executeCommand\(command\)\s*\{[^}]*_recordCommand/);
    assert.ok(
      match !== null,
      'executeCommand should call _recordCommand'
    );
  });

  it('init calls _loadCommandHistory', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    // Find init method and check _loadCommandHistory is called
    const initMatch = content.match(/init\(\)\s*\{[^}]*_loadCommandHistory/);
    assert.ok(
      initMatch !== null,
      'init should call _loadCommandHistory'
    );
  });

  it('saves to terminal-execution-history key in localStorage', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    assert.ok(
      /localStorage\.setItem\(['"]terminal-execution-history['"]/.test(content),
      'Should save to terminal-execution-history localStorage key'
    );
  });

  it('saves to terminal-command-history key in localStorage', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    assert.ok(
      /localStorage\.setItem\(['"]terminal-command-history['"]/.test(content),
      'Should save to terminal-command-history localStorage key'
    );
  });
});

describe('Phase 2 — Help Overlay (?) Shortcut', () => {
  it('terminal.js has showHelpOverlay method', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    assert.ok(
      /showHelpOverlay/.test(content),
      'Should have showHelpOverlay method'
    );
  });

  it('? key triggers showHelpOverlay in bindEvents', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    assert.ok(
      /e\.key\s*===\s*['"]\?['"]/.test(content),
      '? key should trigger help overlay'
    );
  });

  it('help overlay has proper ARIA attributes', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    assert.ok(
      /role.*dialog/.test(content) && /aria-label.*help/i.test(content),
      'Help overlay should have dialog role and aria-label'
    );
  });

  it('help text includes Shift + ? shortcut in showHelp', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./js/terminal.js', 'utf8');

    // Find showHelp method and check for Shift + ? shortcut
    const showHelpMatch = content.match(/showHelp\(\)\s*\{[\s\S]*?Shift \+ \?/);
    assert.ok(
      showHelpMatch !== null,
      'showHelp should include Shift + ? shortcut in keyboard shortcuts list'
    );
  });

  it('CSS has help-overlay styles', async () => {
    const fs = await import('fs');
    const css = fs.readFileSync('./css/styles.css', 'utf8');

    assert.ok(
      /\.help-overlay/.test(css),
      'Should have .help-overlay CSS class'
    );
    assert.ok(
      /\.help-overlay-content/.test(css),
      'Should have .help-overlay-content CSS class'
    );
  });

  it('help overlay respects reduced motion', async () => {
    const fs = await import('fs');
    const css = fs.readFileSync('./css/styles.css', 'utf8');

    assert.ok(
      /@media.*prefers-reduced-motion[\s\S]*\.help-overlay/.test(css),
      'Help overlay should have reduced motion media query'
    );
  });
});
