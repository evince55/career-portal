// Command palette (Ctrl+K) — v2's evolution of the old terminal.
// Navigation + a few personality commands, WAI-APG combobox/listbox pattern.
// Pure parts (PALETTE_COMMANDS, filterCommands) are unit-tested in tests/palette.mjs;
// DOM code only runs in the browser (guarded), so Node can import this module safely.

const HOMELAB_EPOCH = Date.UTC(2024, 0, 15); // first k3s node went live

export const PALETTE_COMMANDS = [
  { id: 'go-home', label: 'Go to Home', hint: 'nav', keywords: ['index', 'start'], run: (ctx) => ctx.navigate('/') },
  { id: 'go-projects', label: 'Go to Projects', hint: 'nav', keywords: ['work', 'case studies', 'portfolio'], run: (ctx) => ctx.navigate('/projects.html') },
  { id: 'go-dashboard', label: 'Go to Live Dashboard', hint: 'nav', keywords: ['metrics', 'homelab', 'grafana'], run: (ctx) => ctx.navigate('/dashboard.html') },
  { id: 'go-contact', label: 'Go to Contact', hint: 'nav', keywords: ['hire', 'message', 'form'], run: (ctx) => ctx.navigate('/contact.html') },
  { id: 'copy-email', label: 'Copy email address', hint: 'action', keywords: ['mail', 'reach'], run: async (ctx) => {
    const email = 'eugene.vince55@gmail.com';
    try {
      await navigator.clipboard.writeText(email);
      ctx.print(`copied ${email}`);
    } catch {
      ctx.print(email);
    }
  } },
  { id: 'view-source', label: 'View source on GitHub', hint: 'action', keywords: ['github', 'repo', 'code'], run: (ctx) => ctx.open('https://github.com/evince55/career-portal') },
  { id: 'whoami', label: 'whoami', hint: 'fun', keywords: ['about', 'eugene'], run: (ctx) => ctx.print('eugene — full-stack engineer, runs production-grade infra at home') },
  { id: 'uptime', label: 'uptime', hint: 'fun', keywords: ['homelab', 'days'], run: (ctx) => {
    const days = Math.floor((Date.now() - HOMELAB_EPOCH) / 86400000);
    ctx.print(`homelab project: day ${days} (k3s · Istio · Prometheus — rebooted more than once, monitored the whole time)`);
  } },
  { id: 'hire-me', label: 'sudo hire-me', hint: 'fun', keywords: ['job', 'recruit', 'contact'], run: (ctx) => ctx.navigate('/contact.html') },
  { id: 'coffee', label: 'brew coffee', hint: 'fun', keywords: ['break', '418'], run: (ctx) => ctx.print('418 I\'m a teapot — but the cluster never sleeps') }
];

export function filterCommands(query, commands) {
  const q = query.toLowerCase().trim();
  if (!q) return [...commands];
  return commands.filter((c) =>
    c.label.toLowerCase().includes(q) ||
    c.id.includes(q) ||
    (c.keywords || []).some((k) => k.toLowerCase().includes(q))
  );
}

export function initPalette(doc = typeof document === 'undefined' ? null : document) {
  if (!doc) return null;
  const root = doc.getElementById('palette-root');
  if (!root) return null;
  if (root.querySelector('.palette')) return null; // idempotent — pages may call this after auto-init

  // The binding is Ctrl+K everywhere (Cmd+K also works on Mac); show the right glyph
  const isMac = /Mac|iP(hone|ad|od)/.test(navigator.platform || '');
  const keyHint = isMac ? '⌘K' : 'Ctrl K';
  for (const el of doc.querySelectorAll('[data-palette-open]')) {
    el.setAttribute('aria-label', `Open command palette (${isMac ? '⌘K' : 'Ctrl+K'})`);
    const span = el.querySelector('.mono');
    if (span) span.textContent = keyHint;
  }

  let openerEl = null;
  let items = PALETTE_COMMANDS;
  let active = 0;

  const overlay = doc.createElement('div');
  overlay.className = 'palette';
  overlay.hidden = true;

  const panel = doc.createElement('div');
  panel.className = 'palette__panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Command palette');

  const input = doc.createElement('input');
  input.className = 'palette__input';
  input.type = 'text';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', 'palette-list');
  input.setAttribute('aria-label', 'Type a command');
  input.placeholder = 'Type a command… (↑↓ to move, Enter to run, Esc to close)';

  const list = doc.createElement('ul');
  list.className = 'palette__list';
  list.id = 'palette-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Commands');

  // Permanently in the accessibility tree so screen readers reliably announce
  // updates; base.css collapses it visually while empty (.palette__output:empty).
  const output = doc.createElement('div');
  output.className = 'palette__output';
  output.setAttribute('role', 'status');
  output.setAttribute('aria-live', 'polite');

  panel.append(input, list, output);
  overlay.append(panel);
  root.append(overlay);

  const ctx = {
    navigate: (url) => { close(); window.location.assign(url); },
    open: (url) => { close(); window.open(url, '_blank', 'noopener'); },
    print: (text) => {
      output.textContent = text;
    }
  };

  function render() {
    list.textContent = '';
    if (!items.length) {
      const li = doc.createElement('li');
      li.className = 'palette__item palette__item--empty';
      li.textContent = 'No matching commands';
      list.append(li);
      ctx.print('No matching commands');
      input.setAttribute('aria-activedescendant', '');
      return;
    }
    items.forEach((cmd, i) => {
      const li = doc.createElement('li');
      li.className = 'palette__item';
      li.id = `palette-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === active ? 'true' : 'false');
      const label = doc.createElement('span');
      label.textContent = cmd.label;
      const hint = doc.createElement('span');
      hint.className = 'palette__hint';
      hint.textContent = cmd.hint;
      li.append(label, hint);
      li.addEventListener('click', () => runCommand(cmd));
      list.append(li);
    });
    input.setAttribute('aria-activedescendant', items.length ? `palette-opt-${active}` : '');
  }

  function runCommand(cmd) {
    output.textContent = '';
    cmd.run(ctx);
  }

  function openPalette(opener) {
    openerEl = opener || null;
    overlay.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.value = '';
    output.textContent = '';
    items = PALETTE_COMMANDS;
    active = 0;
    render();
    input.focus();
  }

  function close() {
    overlay.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    if (openerEl && doc.contains(openerEl)) openerEl.focus();
    openerEl = null;
  }

  input.addEventListener('input', () => {
    items = filterCommands(input.value, PALETTE_COMMANDS);
    active = 0;
    render();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length) { active = (active + 1) % items.length; render(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) { active = (active - 1 + items.length) % items.length; render(); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[active]) runCommand(items[active]);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // focus stays on the combobox input while open
    }
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close();
  });

  doc.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (overlay.hidden) openPalette(doc.activeElement);
      else close();
    }
  });

  for (const btn of doc.querySelectorAll('[data-palette-open]')) {
    btn.addEventListener('click', () => openPalette(btn));
  }

  return { open: openPalette, close };
}

if (typeof document !== 'undefined' && document.readyState !== 'loading') {
  initPalette();
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => initPalette());
}
