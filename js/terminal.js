/* eslint-disable no-unused-vars */
// Main terminal UI controller — FAANG-quality terminal autocomplete & polished UX.

import { getProjects, getProject, generateBadges } from './project-catalog.js';
import MeshWatchAPI from './meshwatch-api.js';
import AIAssistant from './ai-assistant.js';
import Achievements from './achievements.js';
import ContactAPI from './contact-api.js';
import { escapeHtml, normalizeSlug, validateUrl, COMMAND_ICONS, COMMAND_DESCS, highlightMatch, createPaletteItem, filterCommands, SKILLS_DATA, PERF_THRESHOLDS, gradePerf, computeOverallGrade } from './utils/helpers.js?v=3';

// Argument suggestions for commands that accept sub-arguments.
const ARG_SUGGESTIONS = {
  theme:  [{ value: 'retro', label: 'set retro theme' }, { value: 'synthwave', label: 'set synthwave theme' }],
  resume: [{ value: '--txt', label: 'download as text' }, { value: '--md', label: 'download as markdown' }],
  contact: [{ value: '--email', label: 'interactive email form' }, { value: '-e', label: 'interactive email form' }],
  demo:   [{ value: 'stop', label: 'stop demo mode' }],
  project:[],
  projects:[]
};

// Populate project names as argument suggestions lazily.
function _projectNames() {
  return getProjects().map(p => ({ value: p.slug, label: p.name }));
}

class Terminal {
  constructor() {
    this.output = typeof document !== 'undefined' ? document.getElementById('terminal-output') : null;
    this.input = typeof document !== 'undefined' ? document.getElementById('command-input') : null;
    this.history = [];
    this.historyIndex = -1;
    this.commandHistory = [
      'help', 'projects', 'project', 'skills', 'skills-visual',
      'experience', 'education', 'resume', 'about', 'contact',
      'status', 'minecraft', 'ai', 'demo', 'clear', 'theme',
      'timeline', 'neofetch', 'fortune', 'cowsay',
      'achievements', 'perf', 'explorer', 'dashboard', 'writeups', 'git'
    ];
    this._executionHistory = [];
    this.announcementEl = null;
    this._announcementTimeout = null;
    this.isDemoMode = false;
    this.demoInterval = null;
    this.currentProjectIndex = 0;
    this._meshwatchAPI = null;
    this._aiAssistant = null;
    this.achievements = new Achievements();
    this.config = { demoMode: { cycleIntervalMs: 4000 } };
    this._autocompletePopup = null;
    this._autocompleteSelectedIndex = -1;
    // Debounce timer for autocomplete input
    this._autocompleteTimer = null;

    if (typeof window !== 'undefined') {
      this.loadConfig().then(() => this.init());
    } else {
      this.init();
    }
  }

  _saveCommandHistory() {
    try {
      localStorage.setItem('terminal-command-history', JSON.stringify(this.commandHistory));
    } catch (e) { /* storage unavailable */ }
  }

  _saveExecutionHistory() {
    try {
      localStorage.setItem('terminal-execution-history', JSON.stringify(this._executionHistory.slice(-100)));
    } catch (e) { /* storage unavailable */ }
  }

  _loadCommandHistory() {
    try {
      const saved = localStorage.getItem('terminal-command-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existing = new Set(this.commandHistory);
          for (const cmd of parsed) {
            if (typeof cmd === 'string' && cmd.trim()) {
              existing.add(cmd.trim().toLowerCase().split(/\s+/)[0]);
            }
          }
          this.commandHistory = Array.from(existing);
        }
      }
    } catch (e) { /* storage unavailable */ }

    try {
      const savedExec = localStorage.getItem('terminal-execution-history');
      if (savedExec) {
        const parsed = JSON.parse(savedExec);
        if (Array.isArray(parsed)) {
          this._executionHistory = parsed.slice(-100);
        }
      }
    } catch (e) { /* storage unavailable */ }
  }

  _recordCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return;
    const trimmed = cmd.trim().toLowerCase();
    if (!trimmed) return;

    this._executionHistory = this._executionHistory.filter(c => c !== trimmed);
    this._executionHistory.unshift(trimmed);
    if (this._executionHistory.length > 100) {
      this._executionHistory = this._executionHistory.slice(0, 100);
    }
    this._saveExecutionHistory();
  }

  async loadConfig() {
    try {
      const resp = await fetch('/config/career-fair.json');
      if (resp.ok) {
        const cfg = await resp.json();
        this.config = cfg;
        if (cfg.demoMode?.cycleIntervalMs) {
          this.config.demoMode.cycleIntervalMs = cfg.demoMode.cycleIntervalMs;
        }
      }
    } catch (e) {
      console.warn('[Terminal] Config load failed, using defaults');
    }
  }

  get meshwatchAPI() {
    if (!this._meshwatchAPI) {
      this._meshwatchAPI = new MeshWatchAPI();
    }
    return this._meshwatchAPI;
  }

  get aiAssistant() {
    if (!this._aiAssistant) {
      this._aiAssistant = new AIAssistant();
    }
    return this._aiAssistant;
  }

  init() {
    this._loadCommandHistory();

    if (this.output) {
      while (this.output.firstChild) {
        this.output.removeChild(this.output.firstChild);
      }
    }
    this.setupAccessibility();

    // Clean welcome — no ASCII box art, no typewriter
    if (typeof document !== 'undefined' && this.output) {
      const welcome = document.createElement('div');
      welcome.className = 'output-line welcome';
      welcome.textContent = 'Welcome to Eugene Vincent\'s Portfolio Terminal. Type "help" to get started.';
      this.output.appendChild(welcome);
      this.scrollToBottom();
    }

    if (typeof document !== 'undefined') {
      this.bindEvents();
    }
  }

  setupAccessibility() {
    if (typeof document !== 'undefined') {
      this.announcementEl = document.createElement('div');
      this.announcementEl.setAttribute('aria-live', 'polite');
      this.announcementEl.setAttribute('aria-atomic', 'true');
      this.announcementEl.className = 'sr-only';
      this.announcementEl.id = 'a11y-announcements';
      document.body.appendChild(this.announcementEl);

      if (this.output) {
        this.output.addEventListener('keydown', (e) => this.handleTerminalKeydown(e));
      }
    }
  }

  handleTerminalKeydown(e) {
    if (e.key === 'Tab') return;
    if (document.activeElement === this.input) return;

    if (e.key === 'ArrowUp' && this.history.length > 0) {
      e.preventDefault();
      this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
      this.input.value = this.history[this.history.length - 1 - this.historyIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex >= 0 && this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.input.value = this.history[this.history.length - 1 - this.historyIndex];
      } else {
        this.historyIndex = -1;
        this.input.value = '';
      }
    }
  }

  bindEvents() {
    if (typeof document !== 'undefined') {
      if (this.input) {
        this.input.addEventListener('keydown', (e) => this.handleInput(e));
        this.input.addEventListener('focus', () => this.input.scrollIntoView({ behavior: 'smooth' }));
        // Trigger autocomplete suggestions on each keystroke
        this.input.addEventListener('input', () => this._onInputChange());

        this.input.addEventListener('blur', () => {
          // Hide autocomplete on blur with a small delay to allow click on item
          setTimeout(() => this._hideAutocompletePopup(), 200);
          setTimeout(() => {
            this.scrollToBottom();
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }, 150);
        });

        document.addEventListener('keydown', (e) => {
          const isInputFocused = document.activeElement === this.input;
          const isQuestion = e.key === '?' || (e.shiftKey && e.key === '?');

          if (e.key === 'Escape') {
            if (this._autocompletePopup && this._autocompletePopup.style.display !== 'none') {
              this._hideAutocompletePopup();
              return;
            }
            if (!isInputFocused) {
              e.preventDefault();
              this.input.focus();
              this.announceMessage('Command input focused');
            }
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            this.clearTerminal();
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.showHelpOverlay();
          } else if (isQuestion) {
            e.preventDefault();
            this.showHelpOverlay();
          }
        });

        // Help button (mobile + accessible desktop trigger)
        const helpBtn = document.getElementById('terminal-help-btn');
        if (helpBtn) {
          helpBtn.addEventListener('click', () => this.showHelpOverlay());
        }

        // Close autocomplete when clicking outside the input or popup
        document.addEventListener('mousedown', (e) => {
          if (!this._autocompletePopup || this._autocompletePopup.style.display === 'none') return;
          const target = e.target;
          if (target !== this.input && !this._autocompletePopup.contains(target)) {
            this._hideAutocompletePopup();
          }
        });
      }
      window.addEventListener('resize', () => {
        this.scrollToBottom();
        this._hideAutocompletePopup();
      });
      window.addEventListener('scroll', () => {
        this._positionAutocompletePopup();
      }, { passive: true });
    }
  }

  // ---- Autocomplete Dropdown System ----

  _onInputChange() {
    clearTimeout(this._autocompleteTimer);
    this._autocompleteTimer = setTimeout(() => this._updateAutocomplete(), 80);
  }

  _updateAutocomplete() {
    if (!this.input) return;
    const value = this.input.value.trim();

    if (!value) {
      this._hideAutocompletePopup();
      return;
    }

    // Check if we should show argument suggestions
    const parts = value.split(/\s+/);
    if (parts.length > 1) {
      const cmd = parts[0].toLowerCase();
      const argPrefix = parts.slice(1).join(' ');
      if (ARG_SUGGESTIONS[cmd] || cmd === 'project') {
        this._showArgSuggestions(cmd, argPrefix);
        return;
      }
      // If no arg suggestions, show command completions based on the full input
      this._showCommandSuggestions(value);
      return;
    }

    this._showCommandSuggestions(value);
  }

  _showCommandSuggestions(prefix) {
    const q = prefix.toLowerCase().trim();
    const matches = this.commandHistory.filter(cmd => cmd.startsWith(q));

    if (matches.length === 0) {
      this._hideAutocompletePopup();
      return;
    }

    const items = matches.slice(0, 10).map(cmd => ({
      value: cmd,
      display: cmd,
      desc: COMMAND_DESCS[cmd] || '',
      icon: COMMAND_ICONS[cmd] || '\u25aa',
      isArg: false
    }));

    this._renderAutocomplete(items, prefix);
  }

  _showArgSuggestions(cmd, argPrefix) {
    let suggestions = [];

    if (cmd === 'project') {
      suggestions = _projectNames();
    } else if (ARG_SUGGESTIONS[cmd]) {
      suggestions = ARG_SUGGESTIONS[cmd];
    }

    if (!suggestions.length) {
      this._hideAutocompletePopup();
      return;
    }

    const q = argPrefix.toLowerCase();
    const filtered = suggestions.filter(s => s.value.toLowerCase().startsWith(q));

    if (filtered.length === 0) {
      this._hideAutocompletePopup();
      return;
    }

    const items = filtered.slice(0, 8).map(s => ({
      value: cmd + ' ' + s.value,
      display: s.value,
      desc: s.label || '',
      icon: '\u25b8',
      isArg: true
    }));

    this._renderAutocomplete(items, argPrefix);
  }

  _renderAutocomplete(items, query) {
    if (!this.input) return;

    let popup = this._autocompletePopup;
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'autocomplete-popup';
      popup.className = 'autocomplete-popup';
      popup.style.display = 'none';
      // Append to body so it is not clipped by terminal overflow
      document.body.appendChild(popup);
      this._autocompletePopup = popup;

      // One delegated click listener; element is re-used
      popup.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item) {
          this._acceptAutocomplete(item.dataset.value);
        }
      });
    }

    const q = query.toLowerCase();
    popup.innerHTML = items.map((item, i) => {
      const highlighted = this._highlightMatch(item.display, q);
      return `<div class="autocomplete-item ${i === 0 ? 'focused' : ''} ${item.isArg ? 'ac-arg' : ''}" data-value="${escapeHtml(item.value)}" data-index="${i}">
        <span class="ac-icon">${item.icon}</span>
        <span class="ac-cmd">${highlighted}</span>
        ${item.isArg ? '<span class="ac-arg-label">arg</span>' : ''}
        <span class="ac-desc">${escapeHtml(item.desc)}</span>
      </div>`;
    }).join('');

    popup.style.display = 'block';
    this._autocompleteSelectedIndex = 0;
    this._positionAutocompletePopup();
  }

  _positionAutocompletePopup() {
    if (!this._autocompletePopup || !this.input) return;

    const inputRect = this.input.getBoundingClientRect();
    const popup = this._autocompletePopup;
    const popupHeight = Math.min(popup.offsetHeight || 220, 260);

    // Default: show above the input line
    let top = inputRect.top + window.scrollY - popupHeight;
    let bottom = 'auto';

    // If there is not enough room above, show below the input line
    if (top < window.scrollY + 8) {
      const cmdLine = this.input.closest('.command-line');
      const cmdLineRect = cmdLine ? cmdLine.getBoundingClientRect() : inputRect;
      top = cmdLineRect.bottom + window.scrollY;
      bottom = 'auto';
    }

    popup.style.position = 'absolute';
    popup.style.top = `${top}px`;
    popup.style.bottom = bottom;
    popup.style.left = `${inputRect.left + window.scrollX}px`;
    popup.style.width = `${inputRect.width}px`;
    popup.style.zIndex = '10000';
  }

  _highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return escapeHtml(text);
    const before = escapeHtml(text.slice(0, idx));
    const match = escapeHtml(text.slice(idx, idx + query.length));
    const after = escapeHtml(text.slice(idx + query.length));
    return `${before}<span class="ac-highlight">${match}</span>${after}`;
  }

  _acceptAutocomplete(value) {
    if (!this.input) return;
    this.input.value = value;
    this.input.focus();
    this._hideAutocompletePopup();
    // Brief flash feedback
    this.input.style.boxShadow = '0 0 8px var(--neon-cyan)';
    setTimeout(() => { this.input.style.boxShadow = ''; }, 250);
  }

  _hideAutocompletePopup() {
    if (this._autocompletePopup) {
      this._autocompletePopup.style.display = 'none';
    }
    this._autocompleteSelectedIndex = -1;
  }

  _autocompleteNavigate(direction) {
    if (!this._autocompletePopup || this._autocompletePopup.style.display === 'none') return;
    const items = this._autocompletePopup.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    // Remove focused from current
    items.forEach(i => i.classList.remove('focused'));

    if (direction === 'down') {
      this._autocompleteSelectedIndex = Math.min(
        this._autocompleteSelectedIndex + 1,
        items.length - 1
      );
    } else if (direction === 'up') {
      this._autocompleteSelectedIndex = Math.max(
        this._autocompleteSelectedIndex - 1,
        0
      );
    }

    items[this._autocompleteSelectedIndex].classList.add('focused');
    items[this._autocompleteSelectedIndex].scrollIntoView({ block: 'nearest' });
  }

  _autocompleteAccept() {
    if (!this._autocompletePopup || this._autocompletePopup.style.display === 'none') return;
    const focused = this._autocompletePopup.querySelector('.autocomplete-item.focused');
    if (focused) {
      this._acceptAutocomplete(focused.dataset.value);
      return true;
    }
    // Fallback: accept first item
    const first = this._autocompletePopup.querySelector('.autocomplete-item');
    if (first) {
      this._acceptAutocomplete(first.dataset.value);
      return true;
    }
    return false;
  }

  // ---- Input Handling ----

  handleInput(e) {
    const isEnter = e.key === 'Enter' || e.keyCode === 13 || e.charCode === 13;

    if (isEnter) {
      // Accept autocomplete if open and focused
      if (this._autocompletePopup && this._autocompletePopup.style.display !== 'none') {
        if (this._autocompleteAccept()) {
          this._hideAutocompletePopup();
          // Now execute the completed command
          const command = this.input.value.trim();
          if (command) {
            this.history.push(command);
            this.historyIndex = this.history.length;
            this.displayCommand(command);
            this.executeCommand(command);
          }
          this.input.value = '';
          this.scrollToBottom();
          return;
        }
      }

      const command = this.input.value.trim();
      this._hideAutocompletePopup();
      if (command) {
        this.history.push(command);
        this.historyIndex = this.history.length;
        this.displayCommand(command);
        this.executeCommand(command);
      }
      this.input.value = '';
      this.scrollToBottom();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this._autocompletePopup && this._autocompletePopup.style.display !== 'none') {
        this._autocompleteNavigate('up');
        return;
      }
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.input.value = this.history[this.historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this._autocompletePopup && this._autocompletePopup.style.display !== 'none') {
        this._autocompleteNavigate('down');
        return;
      }
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.input.value = this.history[this.historyIndex];
      } else {
        this.historyIndex = this.history.length;
        this.input.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (this._autocompletePopup && this._autocompletePopup.style.display !== 'none') {
        this._autocompleteAccept();
      } else {
        // First Tab: show autocomplete for current prefix
        this._updateAutocomplete();
        // If popup is now shown, focus first item
        if (this._autocompletePopup && this._autocompletePopup.style.display !== 'none') {
          const first = this._autocompletePopup.querySelector('.autocomplete-item');
          if (first) first.classList.add('focused');
        }
      }
    } else if (e.key === 'Escape') {
      if (this._autocompletePopup && this._autocompletePopup.style.display !== 'none') {
        e.preventDefault();
        this._hideAutocompletePopup();
      }
    }
  }

  displayCommand(command) {
    if (typeof document === 'undefined' || !this.output) return;
    const line = document.createElement('div');
    line.className = 'output-line command';
    line.setAttribute('data-prompt', '[eugene@homelab ~]$');
    line.textContent = command;
    this.output.appendChild(line);
  }

  executeCommand(command) {
    this._recordCommand(command);

    try {
      const parts = command.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      switch (cmd) {
        case 'help':
          this.showHelp();
          break;
        case 'projects':
          this.showProjects(args);
          break;
        case 'project':
          this.showProjectDetail(args);
          break;
        case 'skills':
          this.showSkills(args);
          break;
        case 'about':
          this.showAbout();
          break;
        case 'contact':
          this.showContact(args);
          break;
        case 'clear':
          this.clearTerminal();
          break;
        case 'theme':
          if (args === 'retro') {
            document.body.classList.add('theme-retro');
            localStorage.setItem('portfolio-theme', 'retro');
            this.log('\u2705 Theme set to retro mode', 'success');
          } else if (args === 'synthwave') {
            document.body.classList.remove('theme-retro');
            localStorage.setItem('portfolio-theme', 'synthwave');
            this.log('\u266F Theme set to synthwave mode', 'success');
          } else {
            this.toggleTheme();
          }
          break;
        case 'experience':
          this.showExperience(args);
          break;
        case 'education':
          this.showEducation(args);
          break;
        case 'resume':
          this.showResume(args);
          break;
        case 'status':
          this.showStatus();
          break;
        case 'minecraft':
          this.showMinecraft();
          break;
        case 'ai':
          this.askAI(args);
          break;
        case 'demo':
          if (args === 'stop') {
            this.stopDemoMode();
          } else {
            this.startDemoMode();
          }
          break;
        case 'skills-visual':
          this.showSkillsVisual();
          break;
        case 'timeline':
          this.showTimeline();
          break;
        case 'neofetch':
          this.showNeofetch();
          break;
        case 'fortune':
          this.showFortune();
          break;
        case 'cowsay':
          this.showCowsay(args);
          break;
        case 'achievements':
          this.showAchievements();
          break;
        case 'perf':
          this.showPerf();
          break;
        case 'explorer':
          this.openPage('/project-explorer.html', 'Project Explorer');
          break;
        case 'dashboard':
          this.openPage('/dashboard.html', 'Live Dashboard');
          break;
        case 'writeups':
          this.openPage('/writeups.html', 'Writeups');
          break;
        case 'git':
          this.showGitHubStats();
          break;
        default:
          this.log(`Unknown command: ${cmd}`, 'warning');
      }

      // Track achievements for valid commands
      if (typeof document !== 'undefined' && cmd !== 'clear' && cmd !== 'help' && this.commandHistory.includes(cmd)) {
        const newUnlocks = this.achievements.record(cmd, args);
        newUnlocks.forEach(a => {
          this.log(`\n${'\u{1f3af}'} Achievement Unlocked: ${a.icon} ${a.name} — ${a.desc}`, 'success');
        });
      }
    } catch (error) {
      console.error('[Terminal] Command error:', error.name, '-', error.message);
      this.log(`System error: ${error.message || 'Unexpected error'}`, 'warning');
      this.log('Type "help" for navigation tips. Press Shift + ? for the command reference.', 'info');
    }
  }

  // ---- Help ----

  showHelp() {
    this.log('');
    this.log('TERMINAL NAVIGATION', 'info');
    this.log('');
    this.log('Keyboard shortcuts', 'success');
    this.log('  Tab              Autocomplete commands and arguments', 'info');
    this.log('  \u2191 / \u2193           Browse command history', 'info');
    this.log('  Shift + ?        Open command reference overlay', 'info');
    this.log('  Esc              Close overlays / focus input', 'info');
    this.log('');
    this.log('Autocomplete', 'success');
    this.log('  Start typing a command to see matching suggestions.', 'info');
    this.log('  Press Tab or Enter to accept the highlighted suggestion.', 'info');
    this.log('  Use \u2191 / \u2193 to navigate the suggestion list.', 'info');
    this.log('');
    this.log('For a full list of commands, open the reference with Shift + ?.', 'info');
    this.log('');
  }

  showHelpOverlay() {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('help-overlay');
    if (existing) { existing.remove(); return; }

    const helpText = [
      { cmd: 'help', desc: 'Show this help message' },
      { cmd: 'projects [category]', desc: 'List projects (optional: cloud, devops, iot, web)' },
      { cmd: 'project <name>', desc: 'Deep-dive into a specific project' },
      { cmd: 'skills [category]', desc: 'Show technical skills (optional: category)' },
      { cmd: 'skills-visual', desc: 'Animated skill progress bars by category' },
      { cmd: 'timeline', desc: 'Project timeline with active period chart' },
      { cmd: 'experience [level]', desc: 'Show work experience (senior/mid/junior)' },
      { cmd: 'education', desc: 'Show education background' },
      { cmd: 'resume [--txt|--md]', desc: 'Display or download resume (text/markdown)' },
      { cmd: 'about', desc: 'About Eugene Vincent' },
      { cmd: 'contact', desc: 'Contact information' },
      { cmd: 'status', desc: 'Show system/live metrics status' },
      { cmd: 'minecraft', desc: 'Show Minecraft server live stats' },
      { cmd: 'ai <question>', desc: 'Ask AI about your portfolio' },
      { cmd: 'demo [stop]', desc: 'Start/stop auto-cycling project showcase' },
      { cmd: 'clear', desc: 'Clear terminal output' },
      { cmd: 'theme [retro|synthwave]', desc: 'Set or toggle theme (default: toggle)' },
      { cmd: 'neofetch', desc: 'System information display' },
      { cmd: 'fortune', desc: 'Random tech/career fortune' },
      { cmd: 'cowsay <text>', desc: 'ASCII cow says your text' },
      { cmd: 'achievements', desc: 'View earned achievements' },
      { cmd: 'perf', desc: 'Performance dashboard (A-F grading)' },
      { cmd: 'contact --email', desc: 'Interactive email form' },
      { cmd: 'explorer', desc: 'Open Project Explorer page' },
      { cmd: 'dashboard', desc: 'Open Live Dashboard page' },
      { cmd: 'writeups', desc: 'Open Writeups/blog page' },
      { cmd: 'git', desc: 'GitHub profile stats' }
    ];

    const shortcuts = [
      { key: 'Tab', desc: 'Autocomplete command' },
      { key: '\u2191/\u2193', desc: 'Command history / autocomplete' },
      { key: 'Shift + ?', desc: 'Open help overlay' },
      { key: 'Esc', desc: 'Close overlay / Focus input' }
    ];

    const overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.className = 'help-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Help overlay');
    overlay.innerHTML = `
      <div class="help-overlay-content">
        <button class="help-overlay-close" aria-label="Close help">&times;</button>
        <h3 class="help-overlay-title">&#x1f507; Help</h3>
        <div class="help-section">
          <h4 class="help-section-title">Commands</h4>
          <ul class="help-command-list">
            ${helpText.map(({ cmd, desc }) => `<li><code>${escapeHtml(cmd)}</code> — ${escapeHtml(desc)}</li>`).join('')}
          </ul>
        </div>
        <div class="help-section">
          <h4 class="help-section-title">Shortcuts</h4>
          <ul class="help-shortcut-list">
            ${shortcuts.map(({ key, desc }) => `<li><kbd>${escapeHtml(key)}</kbd> — ${escapeHtml(desc)}</li>`).join('')}
          </ul>
        </div>
        <p class="help-hint">Press Shift + ? or Esc to close</p>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeHandler = () => overlay.remove();
    overlay.querySelector('.help-overlay-close').addEventListener('click', closeHandler);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHandler(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.contains(overlay)) {
        closeHandler();
      }
    }, { once: true });

    overlay.querySelector('.help-overlay-close').focus();
  }

  // ---- Projects ----

  showProjects(filter = '') {
    this.log('');
    this.log('PROJECTS', 'info');

    if (this._guard()) return;

    const projectList = getProjects(filter, '');

    if (projectList.length === 0) {
      this.log('No projects found matching criteria', 'warning');
      this.log('Available categories: cloud, devops, iot, web', 'info');
    } else {
      this.log(`Found ${projectList.length} project(s)`, 'success');

      projectList.forEach(project => {
        const badgesHTML = generateBadges(project.badges);
        const metricsHTML = this.formatProjectMetrics(project);
        const html = `
          <div class="project-name">\u{1f4e6} ${escapeHtml(project.name)}</div>
          <div class="project-badges">${badgesHTML}</div>
          <div class="project-desc">${escapeHtml(project.description.substring(0, 120))}...</div>
          <div class="project-category">Category: ${escapeHtml(project.category.toUpperCase())}</div>
          ${metricsHTML}
          <a href="${validateUrl(project.githubUrl)}" target="_blank" rel="noopener noreferrer" class="project-link">View on GitHub \u279C</a>
        `;
        this._card(html);
      });
    }

    this.log('');
  }

  formatProjectMetrics(project) {
    if (!project.metrics) return '';
    const metrics = Object.entries(project.metrics);
    if (metrics.length === 0) return '';

    const metricItems = metrics.map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `${label}: ${escapeHtml(String(value))}`;
    }).join(' | ');

    return `<div class="project-metrics">${metricItems}</div>`;
  }

  showProjectDetail(identifier = '') {
    if (!identifier) {
      this.log('');
      this.log('PROJECTS', 'info');
      const projects = getProjects();
      this.log('Available projects (type "project <name>" for details)', 'success');

      if (this._guard()) return;

      projects.forEach(project => {
        const badgesHTML = generateBadges(project.badges);
        const html = `
          <div class="project-name">\u{1f4e6} ${escapeHtml(project.name)}</div>
          <div class="project-badges">${badgesHTML}</div>
          <div class="project-desc">${escapeHtml(project.description.substring(0, 100))}...</div>
        `;
        this._card(html);
      });
      return;
    }

    const project = getProject(normalizeSlug(identifier));

    if (!project) {
      this.log(`Project "${identifier}" not found.`, 'warning');
      this.log('Available projects: meshwatch, minecraft-monitoring, monitoring, azure-functions, career-portal', 'info');
      return;
    }

    this.log('');
    this.log(`PROJECT: ${project.name.toUpperCase()}`, 'info');

    if (this._guard()) return;

    const badgesHTML = generateBadges(project.badges);
    const techStackHTML = project.techStack.map(t => `<li>\u2022 ${escapeHtml(t.name)} \u2014 ${escapeHtml(t.level)}</li>`).join('');
    const metricsHTML = this.formatProjectMetrics(project);
    const achievementsHTML = project.keyAchievements.map(a => `<li style="margin: 0.25rem 0;">   \u2713 ${escapeHtml(a)}</li>`).join('');

    let linksHTML = '';
    if (project.githubUrl) {
      linksHTML += `<a href="${validateUrl(project.githubUrl)}" target="_blank" rel="noopener noreferrer" class="project-link">GitHub \u279C</a> `;
    }
    if (project.liveUrl) {
      linksHTML += `<a href="${validateUrl(project.liveUrl)}" target="_blank" rel="noopener noreferrer" class="project-link">Live Dashboard \u279C</a>`;
    }

    const cardHTML = `
      <div class="project-name">\u{1f4e6} ${escapeHtml(project.name)}</div>
      <div class="project-badges">${badgesHTML}</div>
      <div class="project-desc">${escapeHtml(project.description)}</div>
      <div style="margin-top: 1rem;"><strong>TECH STACK</strong></div>
      <ul style="list-style: none; padding-left: 0.5rem;">${techStackHTML}</ul>
      ${metricsHTML ? `<div class="project-metrics">${metricsHTML}</div>` : ''}
      <div style="margin-top: 1rem;"><strong>KEY ACHIEVEMENTS</strong></div>
      <ul style="list-style: none; padding-left: 0.5rem;">${achievementsHTML}</ul>
    `;

    this._card(cardHTML);

    if (linksHTML || project.demoNote) {
      let linksContent = linksHTML;
      if (project.demoNote) {
        linksContent += `<br><em style="color: #8a8;">${escapeHtml(project.demoNote)}</em>`;
      }
      this._card(linksContent);
    }

    this.log('');
  }

  // ---- Skills ----

  showSkills(category = '') {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('');
    this.log('TECHNICAL SKILLS', 'info');

    const skills = {
      cloud: [
        'Azure (Blob Storage, Functions, AKS)',
        'Cloudflare (DNS, CDN, Workers)',
        'Docker & Kubernetes (k3s, Istio)'
      ],
      frontend: [
        'React.js / Next.js',
        'TypeScript / JavaScript (ES6+)',
        'CSS3 / Tailwind / Material UI',
        'Progressive Web Apps'
      ],
      backend: [
        'Node.js / Express / NestJS',
        'Python (FastAPI, Django)',
        'GraphQL / REST APIs',
        'PostgreSQL / MongoDB / Redis'
      ],
      devops: [
        'GitHub Actions / CI/CD Pipelines',
        'Terraform / Infrastructure as Code',
        'Prometheus / Grafana / Loki',
        'OpenTelemetry / Distributed Tracing'
      ]
    };

    const categories = Object.keys(skills);
    const displayCategory = category ? category.toLowerCase() : null;

    categories.forEach(cat => {
      if (!displayCategory || cat === displayCategory) {
        this.log(`\n${cat.toUpperCase()}`, 'success');
        skills[cat].forEach(skill => {
          this.log(`   \u2022 ${skill}`, 'info');
        });
      }
    });

    this.log('');
  }

  // ---- About ----

  showAbout() {
    if (typeof document === 'undefined' || !this.output) return;
    const aboutText = [
      '',
      '\u{1f44b} Hello! I\'m Eugene Vincent',
      '\u{1f4cf} Aurora, IL, USA',
      '',
      'Full Stack Engineer passionate about cloud-native architectures',
      'and developer experience. Currently building MeshWatch - a cost-',
      'optimized service mesh observability platform on k3s.',
      '',
      '\u{1f3af} What I do:',
      '   \u2022 Design scalable microservices with Istio & OpenTelemetry',
      '   \u2022 Build React/Next.js frontends with progressive enhancement',
      '   \u2022 Deploy serverless APIs on Azure',
      '   \u2022 Automate CI/CD pipelines with GitHub Actions',
      '',
      '\u{1f4a1} Recently:',
      '   \u2022 Integrated Ollama Phi-3 for automated incident analysis',
      '   \u2022 Reduced monitoring costs by 60% vs serverless alternatives',
      '   \u2022 Created FAANG-quality portfolio with synthwave terminal theme',
      '',
      '\u{1f393} Currently exploring:',
      '   \u2022 Training and fine-tuning LLMs on local hardware for cost-effective AI',
      '   \u2022 Reducing inference costs by running models locally via Ollama',
      '   \u2022 Automating workflows with local AI agents to save time and compute',
      '   \u2022 WASM for browser-based compute',
      '   \u2022 Edge computing with Cloudflare Workers',
      '',
      ''
    ];

    aboutText.forEach(line => {
      if (line.startsWith('\u{1f3af}') || line.startsWith('\u{1f4a1}') || line.startsWith('\u{1f393}')) {
        this.log(line, 'success');
      } else if (line.startsWith('   \u2022')) {
        this.log(line, 'info');
      } else {
        this.log(line, 'default');
      }
    });
  }

  // ---- Contact ----

  showContact(args) {
    if (typeof document === 'undefined' || !this.output) return;

    if (args === '--email' || args === '-e') {
      this.startContactForm();
      return;
    }

    this.log('');
    this.log('CONTACT', 'info');
    this.log('\u{1f4e7} Email: eugene.vince55@gmail.com', 'success');
    this.log('\u{1f517} GitHub: github.com/chaitea321', 'success');
    this.log('\u{1f4bc} LinkedIn: linkedin.com/in/eugene-vincent-42472024b', 'success');
    this.log('\u{1f310} Portfolio: chai-homelab.com', 'success');
    this.log('  Use "contact --email" to send via terminal.', 'info');
    this.log('');
  }

  startContactForm() {
    if (typeof document === 'undefined' || !this.output || !this.input) return;

    this.log('');
    this.log('SEND EMAIL', 'info');
    this.log('Interactive email form. Type answers below.', 'info');
    this.log('Type "cancel" at any time to abort.', 'warning');

    const steps = [
      { key: 'name', prompt: 'Your name:', validate: v => v.trim().length > 0 },
      { key: 'subject', prompt: 'Subject:', validate: v => v.trim().length > 0 },
      { key: 'message', prompt: 'Message:', validate: v => v.trim().length > 10 }
    ];

    let stepIndex = 0;
    const formData = {};
    const contactAPI = new ContactAPI();

    const askNext = () => {
      if (stepIndex >= steps.length) {
        this.log('Sending email...', 'info');

        contactAPI.submit(formData).then(result => {
          this.log(`\n${result.message}`, result.fallback ? 'warning' : 'success');
          stepIndex = -1;
        }).catch(err => {
          this.log(`Error sending email: ${err.message || 'Unknown error'}`, 'warning');
          stepIndex = -1;
        });

        return;
      }

      const step = steps[stepIndex];
      this.log(`\n${step.prompt}`, 'info');
      this.log('  (type "cancel" to abort)', 'warning');

      const formSubmit = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const value = this.input.value.trim();

          if (value.toLowerCase() === 'cancel') {
            this.log('Form cancelled.', 'warning');
            stepIndex = -1;
            this.input.onkeydown = null;
            return;
          }

          if (!step.validate(value)) {
            this.log(`  ${step.prompt} (minimum length required)`, 'warning');
            this.input.value = '';
            return;
          }

          formData[step.key] = value;
          this.log('  Recorded.', 'success');
          stepIndex++;
          this.input.value = '';
          this.input.onkeydown = null;
          if (stepIndex >= 0) askNext();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.log('Form cancelled.', 'warning');
          stepIndex = -1;
          this.input.onkeydown = null;
        }
      };

      setTimeout(() => {
        this.input.focus();
        this.input.onkeydown = formSubmit;
      }, 50);
    };

    askNext();
  }

  // ---- Experience ----

  showExperience(level = '') {
    if (this._guard()) return;
    this.log('');
    this.log('HOMELAB PROJECTS & EXPERIENCE', 'info');

    const experience = [
      {
        role: 'Full Stack Engineer',
        company: 'Homelab Projects (2023 - Present)',
        period: '2023 - Present',
        level: 'senior',
        details: [
          'Built MeshWatch - cost-optimized service mesh observability on k3s',
          'Integrated Ollama Phi-3 for automated incident analysis',
          'Reduced monitoring costs by 60% vs serverless alternatives',
          'Deployed cloud-native architectures on Azure'
        ]
      },
      {
        role: 'DevOps Engineer',
        company: 'Homelab Projects (2022 - Present)',
        period: '2022 - Present',
        level: 'mid',
        details: [
          'Managed k3s Kubernetes cluster with Istio service mesh',
          'Implemented Prometheus/Grafana/Loki monitoring stack',
          'Automated deployments with GitHub Actions CI/CD',
          'Configured Cloudflare DNS, CDN, and SSL termination'
        ]
      },
      {
        role: 'Software Engineering Student',
        company: 'University of Illinois (2024 - 2028)',
        period: '2024 - 2028',
        level: 'junior',
        details: [
          'Self-directed homelab projects alongside coursework',
          'Applied academic knowledge to real-world infrastructure',
          'Built and maintained production-grade monitoring systems',
          'Developed full-stack applications with React and TypeScript'
        ]
      }
    ];

    const filtered = level
      ? experience.filter(e => e.level === level.toLowerCase())
      : experience;

    if (filtered.length === 0) {
      this.log(`No experience found for level: ${level}`, 'warning');
      this.log('Available levels: senior, mid, junior', 'info');
    } else {
      filtered.forEach(exp => {
        const html = `
          <div class="project-name">\u{1f3e2} ${escapeHtml(exp.role)}</div>
          <div class="project-desc">${escapeHtml(exp.company)} | ${escapeHtml(exp.period)}</div>
          <ul style="list-style: none; padding-left: 1rem;">
            ${exp.details.map(d => `<li style="margin: 0.25rem 0;">   \u2022 ${escapeHtml(d)}</li>`).join('')}
          </ul>
        `;
        this._card(html);
      });
    }

    this.log('');
  }

  // ---- Education ----

  showEducation() {
    if (this._guard()) return;
    this.log('');
    this.log('EDUCATION', 'info');

    const education = [
      {
        degree: 'Bachelor of Science in Computer Science',
        institution: 'University of Illinois',
        year: '2024 - 2028 (Expected)',
        details: [
          'Full-stack web development',
          'Data structures and algorithms',
          'Software engineering principles',
          'Database systems and cloud computing'
        ]
      },
      {
        degree: 'Certifications & Self-Study',
        institution: 'Self-Directed Learning',
        year: '2022 - Present',
        details: [
          'AZ-900: Azure Fundamentals (Certified)',
          'Cloud Architecture (Azure)',
          'DevOps best practices and CI/CD',
          'Service mesh with Istio and Linkerd'
        ]
      }
    ];

    education.forEach(edu => {
      const html = `
        <div class="project-name">\u{1f393} ${escapeHtml(edu.degree)}</div>
        <div class="project-desc">${escapeHtml(edu.institution)} | ${escapeHtml(edu.year)}</div>
        <ul style="list-style: none; padding-left: 1rem;">
          ${edu.details.map(d => `<li style="margin: 0.25rem 0;">   \u2022 ${escapeHtml(d)}</li>`).join('')}
        </ul>
      `;
      this._card(html);
    });

    this.log('');
  }

  // ---- Resume ----

  showResume(format = '') {
    if (typeof document === 'undefined' || !this.output) return;

    const resumeText = `EUGENE VINCENT
Full Stack Engineer | Azure DevOps | Software Reliability
${'\u{1f4cf}'} Aurora, IL, USA | ${'\u{1f4e7}'} eugene.vince55@gmail.com
${'\u{1f517}'} github.com/chaitea321  ${'\u{1f4bc}'} linkedin.com/in/eugene-vincent-42472024b

EDUCATION
----------------------------------------------------------
B.S. Computer Science (2024 - 2028, Expected)
University of Illinois
  \u2022 Full-stack web development | Data structures & algorithms
  \u2022 Software engineering principles | Database systems
  \u2022 Cloud computing | Distributed systems

CERTIFICATIONS
----------------------------------------------------------
AZ-900: Microsoft Azure Fundamentals (Certified)
Self-Directed Learning (2022 - Present)
  \u2022 Cloud Architecture & DevOps best practices
  \u2022 Service mesh with Istio and Linkerd

HOMELAB PROJECTS
----------------------------------------------------------
MeshWatch | Service Mesh Observability Platform
  \u2022 Cost-optimized platform on k3s Kubernetes with Istio mTLS
  \u2022 Integrated Ollama Phi-3 AI for automated incident analysis
  \u2022 Reduced monitoring costs by 60% ($5.12/mo vs $7+/mo serverless)
  \u2022 Full observability: Prometheus, Grafana, Loki, Tempo

Minecraft Server Monitoring | IoT / Gaming
  \u2022 Istio service mesh observability with JMX + RCON exporters
  \u2022 Prometheus metrics (TPS, heap, GC pauses) + Grafana dashboards
  \u2022 Discord bot with 10 slash commands for server control
  \u2022 AI-powered lag analysis via Ollama Phi-3

Monitoring Stack | DevOps
  \u2022 ArgoCD App of Apps pattern for multi-namespace management
  \u2022 External Secrets Operator with Azure Key Vault backend
  \u2022 cert-manager with Let's Encrypt TLS auto-provisioning
  \u2022 20-panel Grafana dashboard with Loki log aggregation

Azure Functions | Serverless
  \u2022 Health checker function with 15-minute cron interval
  \u2022 Service Bus trigger for incident event processing
  \u2022 Deduplication windows to prevent alert storms

Software Reliability Engineering Focus
  \u2022 Training and fine-tuning LLMs on local hardware for cost-effective AI
  \u2022 Reducing inference costs by running models locally via Ollama
  \u2022 Automating workflows with local AI agents to save time and compute

SKILLS
----------------------------------------------------------
Cloud: Azure (Functions, Blob Storage, AKS), Cloudflare, Docker, Kubernetes
Frontend: React.js, Next.js, TypeScript, CSS3, Tailwind, PWA Development
Backend: Node.js, Express, Python, FastAPI, GraphQL, REST APIs
DevOps: GitHub Actions, Terraform, Prometheus, Grafana, Loki, Istio
Reliability: Distributed Tracing, SLO Monitoring, Incident Response

PROJECTS
----------------------------------------------------------
meshwatch - Service mesh observability (*28 stars)
  \u2022 Istio-based monitoring with real-time metrics
  \u2022 Cost-optimized vs serverless alternatives
  \u2022 AI-powered incident analysis with Ollama Phi-3

minecraft-monitoring - Gaming server observability
  \u2022 JMX + RCON exporters for real-time metrics
  \u2022 Discord bot with 10 slash commands
  \u2022 AI-powered lag analysis and alerting

monitoring - Production monitoring platform
  \u2022 ArgoCD GitOps with cert-manager TLS
  \u2022 External Secrets Operator + Azure Key Vault
  \u2022 20-panel Grafana dashboards + Loki logs

azure-functions - Serverless API gateway
  \u2022 Health checker + Service Bus incident processing
  \u2022 Discord webhook integration
  \u2022 Pydantic validation models

career-portal - Terminal portfolio (you are here)
   \u2022 Interactive terminal with ${this.commandHistory.length} commands and autocomplete
  \u2022 PWA support with service worker offline caching
  \u2022 WCAG 2.1 accessible (ARIA, keyboard nav, screen reader)
${'='.repeat(40)}
Generated from chai-homelab.com portfolio terminal`;

    const resumeMd = `# Eugene Vincent — Full Stack Engineer

**Azure DevOps | Software Reliability | Cloud-Native Architectures**

📍 Aurora, IL, USA | 📧 eugene.vince55@gmail.com | 🐙 github.com/chaitea321 | 💼 linkedin.com/in/eugene-vincent-42472024b

## Education
- **B.S. Computer Science** (2024–2028, Expected) — University of Illinois
  - Full-stack web development | Data structures & algorithms
  - Software engineering principles | Database systems | Cloud computing

## Certifications
- **AZ-900**: Microsoft Azure Fundamentals (Certified)
- Self-Directed Learning (2022–Present): Cloud Architecture, DevOps, Istio, Linkerd

## Homelab Projects

### MeshWatch — Service Mesh Observability Platform
- Cost-optimized platform on k3s Kubernetes with Istio mTLS
- Integrated Ollama Phi-3 AI for automated incident analysis
- Reduced monitoring costs by 60% ($5.12/mo vs $7+/mo serverless)
- Full observability: Prometheus, Grafana, Loki, Tempo

### Minecraft Server Monitoring — IoT / Gaming
- Istio service mesh observability with JMX + RCON exporters
- Prometheus metrics (TPS, heap, GC pauses) + Grafana dashboards
- Discord bot with 10 slash commands for server control
- AI-powered lag analysis via Ollama Phi-3

### Monitoring Stack — DevOps
- ArgoCD App of Apps pattern for multi-namespace management
- External Secrets Operator with Azure Key Vault backend
- cert-manager with Let's Encrypt TLS auto-provisioning
- 20-panel Grafana dashboard with Loki log aggregation

### Azure Functions — Serverless
- Health checker function with 15-minute cron interval
- Service Bus trigger for incident event processing
- Deduplication windows to prevent alert storms

## Skills
- **Cloud**: Azure, Cloudflare, Docker, Kubernetes
- **Frontend**: React.js, Next.js, TypeScript, CSS3, Tailwind, PWA
- **Backend**: Node.js, Express, Python, FastAPI, GraphQL, REST APIs
- **DevOps**: GitHub Actions, Terraform, Prometheus, Grafana, Loki, Istio
- **Reliability**: Distributed Tracing, SLO Monitoring, Incident Response

---
Generated from chai-homelab.com portfolio terminal`;

    if (format === '--txt' || format === '-t') {
      this.downloadFile(resumeText, 'Eugene_Vincent_Resume.txt', 'text/plain');
      this.log(`\n${'\u2705'} Downloading resume as .txt...`, 'success');
      return;
    }

    if (format === '--md' || format === '-m') {
      this.downloadFile(resumeMd, 'Eugene_Vincent_Resume.md', 'text/markdown');
      this.log(`\n${'\u2705'} Downloading resume as .md...`, 'success');
      return;
    }

    this.log('');
    this.log('RESUME', 'info');
    this.log(resumeText, 'default');
    this.log('');
  }

  downloadFile(content, filename, mimeType) {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Status ----

  async showStatus() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('');
    this.log('SYSTEM STATUS', 'info');

    try {
      const isOnline = navigator.onLine;
      this.log(`Network: ${isOnline ? '\u2705 Online' : '\u274C Offline'}`, isOnline ? 'success' : 'warning');

      if (isOnline) {
        const status = await this.meshwatchAPI.getMetrics();
        if (status.success) {
          this.log('MeshWatch: \u2705 Live (Azure Functions)', 'success');
          this.log(`  Pods deployed: ${status.podsDeployed || 15} | Services: ${status.servicesMonitored || 5}`, 'info');
          this.log(`  Cost: $${status.monthlyCost || '5.12'}/month (60% savings vs serverless)`, 'success');
          this.log(`  AI Analysis: ${status.aiAnalysis || 'Ollama Phi-3 ready for incident analysis'}`, 'info');
        } else {
          this.log('Azure Functions not yet deployed, showing demo data...', 'warning');
          this.log('MeshWatch: \u2705 Production (demo mode — static estimates)', 'success');
          this.log('  Pods deployed: 15 | Services monitored: 5', 'info');
          this.log('  Monthly cost: $5.12 (60% savings vs serverless)', 'success');
          this.log('  AI Analysis: Ollama Phi-3 ready (Tailscale pending)', 'info');
        }
      } else {
        this.log('Offline mode - showing cached metrics', 'warning');
        this.log('MeshWatch: \u2705 Production (offline cache)', 'success');
        this.log('  Pods deployed: 15 | Services monitored: 5', 'info');
      }

      this.log(`Browser: ${navigator.userAgent.split(' ').slice(-1)[0] || 'Modern'}`, 'info');
      this.log(`Platform: ${navigator.platform || 'Unknown'}`, 'info');
      this.log(`Memory API: ${performance.memory ? 'Available' : 'Not available'}`, 'info');
    } catch (error) {
      console.error('Status check error:', error);
      this.log('Error fetching system status. Showing offline metrics.', 'warning');
      this.log('MeshWatch: \u2705 Production (fallback)', 'success');
      this.log('  Pods deployed: 15 | Services monitored: 5', 'info');
    }

    this.log('');
  }

  // ---- Minecraft ----

  async showMinecraft() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('');
    this.log('MINECRAFT SERVER STATUS', 'info');

    try {
      const resp = await fetch(`/config/minecraft-stats.json?t=${Date.now()}`);
      if (resp.ok) {
        const stats = await resp.json();
        this.log(`Server: ${stats.server.name} (${stats.server.version})`, 'success');
        this.log(`Runtime: ${stats.server.javaVersion}`, 'info');
        this.log(`TPS: ${stats.metrics.tps} | Players: ${stats.metrics.players}/${stats.metrics.maxPlayers}`, 'info');
        this.log(`Uptime: ${stats.metrics.uptime}`, 'success');
        this.log(`Discord Alerts Today: ${stats.monitoring.discordAlertsToday} | RCON Latency: ${stats.monitoring.rconLatency}`, 'info');
        this.log(`Heap: ${stats.metrics.heapUsedMB}MB / ${stats.metrics.heapMaxMB}MB`, 'info');
        if (stats.recentChanges && stats.recentChanges.length > 0) {
          this.log('Recent Changes:', 'success');
          stats.recentChanges.forEach(change => {
            this.log(`  \u2022 ${change}`, 'info');
          });
        }
      } else {
        throw new Error('Stats file not found');
      }
    } catch (error) {
      console.error('Minecraft stats error:', error);
      this.showMinecraftFallback();
    }

    this.log('');
  }

  showMinecraftFallback() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('Server: Minecraft PaperMC 26.1.2 (Java 25)', 'success');
    this.log('TPS: 20 | Players: 3', 'info');
    this.log('Uptime: 99.8%', 'info');
    this.log('Discord Alerts Today: 0', 'info');
    this.log('Tech Stack:', 'success');
    this.log('  \u2022 JMX Exporter - TPS, Heap, GC Metrics', 'info');
    this.log('  \u2022 RCON Protocol - Server Control', 'info');
    this.log('  \u2022 Discord.py Bot - 10 Slash Commands', 'info');
    this.log('  \u2022 Prometheus + Grafana - Real-time Dashboards', 'info');
    this.log('  \u2022 Ollama Phi-3 - AI Lag Analysis', 'info');
    this.log('Stats update every 10 minutes via cron job.', 'info');
  }

  // ---- AI ----

  async askAI(question = '') {
    if (!question) {
      this.log('');
      this.log('AI ASSISTANT', 'info');
      this.log('Ask me anything about your portfolio projects!', 'success');
      this.log('Examples:', 'info');
      this.log('  ai What does MeshWatch do?', 'info');
      this.log('  ai Tell me about your Kubernetes experience', 'info');
      this.log('  ai How much did you save on monitoring costs?', 'info');
      this.log('AI requires Ollama deployment via Tailscale.', 'warning');
      this.log('In demo mode, I will answer from cached knowledge.', 'info');
      return;
    }

    this.log('');
    this.log(`\u{1f916} Portfolio Knowledge: ${question}`, 'info');

    try {
      const response = await this.aiAssistant.query(question);

      if (response.success) {
        this.log('Answer:', 'success');
        const words = response.data.split(' ');
        let line = '';
        const maxLineLength = 80;
        words.forEach(word => {
          if ((line + word).length > maxLineLength) {
            this.log(line, 'info');
            line = word;
          } else {
            line += (line ? ' ' : '') + word;
          }
        });
        if (line) this.log(line, 'info');
      } else {
        this.log('Answer:', 'success');
        const answer = response.data;
        if (answer) {
          const words = answer.split(' ');
          let line = '';
          const maxLineLength = 80;
          words.forEach(word => {
            if ((line + word).length > maxLineLength) {
              this.log(line, 'info');
              line = word;
            } else {
              line += (line ? ' ' : '') + word;
            }
          });
          if (line) this.log(line, 'info');
        } else {
          this.log('For live AI, deploy Ollama on your k3s cluster.', 'warning');
        }
      }
    } catch (error) {
      console.error('AI query error:', error);
      this.log('Answer:', 'info');
      this.log('Using cached knowledge. Deploy Ollama for live AI answers.', 'warning');
    }

    this.log('');
  }

  // ---- Clear ----

  clearTerminal() {
    if (!this.output) return;
    while (this.output.firstChild) {
      this.output.removeChild(this.output.firstChild);
    }
  }

  toggleTheme() {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('theme-retro');
    const isRetro = document.body.classList.contains('theme-retro');
    localStorage.setItem('portfolio-theme', isRetro ? 'retro' : 'synthwave');
    this.log(`\n${isRetro ? '\u2705' : '\u266F'} Theme toggled to ${isRetro ? 'retro' : 'synthwave'} mode`, 'info');
  }

  // ---- Demo Mode ----

  startDemoMode() {
    if (this.isDemoMode) {
      this.log('Demo mode already running!', 'success');
      return;
    }

    this.isDemoMode = true;
    this.currentProjectIndex = 0;

    this.log('DEMO MODE ACTIVATED', 'info');
    this.log('Auto-cycling through projects. Type "demo stop" to exit.', 'success');

    const projects = getProjects();
    const runNext = () => {
      if (!this.isDemoMode) return;

      const project = projects[this.currentProjectIndex % projects.length];
      this.log(`\n--- DEMO: ${project.name.toUpperCase()} ---`, 'info');
      this.log(project.description, 'default');
      this.log(`Badges: ${project.badges.join(', ')}`, 'success');
      this.log(`Category: ${project.category}`, 'info');

      this.currentProjectIndex++;

      const delay = this.config?.demoMode?.cycleIntervalMs || 4000;
      this.demoInterval = setTimeout(runNext, delay);
    };

    runNext();
  }

  stopDemoMode() {
    if (!this.isDemoMode) return;

    this.isDemoMode = false;
    clearTimeout(this.demoInterval);
    this.demoInterval = null;

    this.log('DEMO MODE STOPPED', 'warning');
    this.log('Demo mode deactivated. Resume normal terminal interaction.', 'info');
  }

  // ---- Skills Visual ----

  showSkillsVisual() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('');
    this.log('SKILLS VISUALIZATION', 'info');

    Object.values(SKILLS_DATA).forEach(data => {
      this.log(`${data.label}`, 'success');
      const bar = '\u2588'.repeat(Math.round(data.level / 10)) + '\u2591'.repeat(10 - Math.round(data.level / 10));
      this.log(`  ${bar} ${data.level}%`);
      data.items.forEach(item => {
        this.log(`    \u2022 ${item}`, 'info');
      });
      this.log('');
    });

    this.log('');
  }

  // ---- Timeline ----

  showTimeline() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('');
    this.log('PROJECT TIMELINE', 'info');

    const projects = [
      { name: 'Monitoring Stack', start: 2022, end: null, active: true },
      { name: 'MeshWatch', start: 2023, end: null, active: true },
      { name: 'Minecraft Monitor', start: 2023, end: 2024, active: false },
      { name: 'Career Portal', start: 2024, end: null, active: true },
      { name: 'Azure Functions', start: 2024, end: null, active: true }
    ];

    const years = [2022, 2023, 2024, 2025];
    const maxYear = 2025;

    const header = 'Year   '.padEnd(8) + projects.map(p => p.name.substring(0, 12).padEnd(14)).join('');
    this.log(header, 'info');
    this.log('\u2500'.repeat(header.length), 'info');

    projects.forEach(project => {
      const prefix = `${project.start}\u2500`.padEnd(8);
      let bar = '';
      for (const year of years) {
        if (year < project.start) {
          bar += ' '.repeat(14);
        } else if (project.end && year > project.end) {
          bar += ' '.repeat(14);
        } else if (year === project.start && year === (project.end || maxYear)) {
          bar += '\u2500'.repeat(14);
        } else if (year === project.start) {
          bar += '\u2500' + '\u2500'.repeat(13);
        } else if (project.end && year === project.end) {
          bar += '\u2500'.repeat(14);
        } else if (year > project.start && (!project.end || year <= project.end)) {
          bar += '\u2500'.repeat(14);
        } else {
          bar += ' '.repeat(14);
        }
      }

      const activeTag = project.active ? ' [CURRENT]' : '';
      this.log(`${prefix}${bar}${activeTag}`);
    });

    this.log('');
    this.log('Key: \u2500 = Active period  |  [CURRENT] = Still maintained', 'info');
    this.log('');
  }

  // ---- Easter Eggs ----

  showNeofetch() {
    if (typeof document === 'undefined' || !this.output) return;
    const isOnline = navigator.onLine;
    const browser = navigator.userAgent.split(' ').slice(-1)[0] || 'Modern';
    const platform = navigator.platform || 'Unknown';

    this.log('       _/.-~-.        eugene@homelab', 'cyan');
    this.log('      |   \'._.\'       ------------------');
    this.log('      |  \'-.  .-\'     OS: Ubuntu 24.04 LTS');
    this.log('      |  \'-.  .-\'     Kernel: AMD Ryzen 7 5700U');
    this.log(`      |    '-.'       Uptime: ${isOnline ? 'Online' : 'Offline'}`);
    this.log('    .\'   \'    \'.      Shell: bash 5.5.1');
    this.log('   \'._   \'._\'   _.  Memory: 14GB RAM');
    this.log('    \'.___.\'__.\'     Cluster: k3s (Istio + Flagger)');
    this.log('                   AI: Ollama Phi-3 (Tailscale)');
    this.log(`                   Browser: ${browser}`);
    this.log(`                   Network: ${isOnline ? '108.233.139.113' : 'offline'}`);
  }

  showFortune() {
    if (typeof document === 'undefined' || !this.output) return;

    const fortunes = [
      '"The best way to learn is by building things that might break." - Unknown Engineer',
      '"If it works in production, it was never really broken." - Senior Dev',
      '"Kubernetes: because managing containers one at a time was too easy."',
      '"Always code as if you will live forever. The code will remain." - Ancient Programming Proverb',
      '"CI/CD pipelines exist so that redeploying at 5pm on Friday doesn\'t feel like Russian roulette."',
      '"The best error message is the one you never see because it was caught before reaching users."',
      '"Infrastructure as Code: because copy-pasting config files is so 2019."',
      '"Your code works on your machine. That\'s not a bug, that\'s a feature." - Every Developer',
      '"The cloud is just someone else\'s computer. But at least their computer costs $5/month."',
      '"Git commit messages are the diary entries of developers who regret their past decisions."',
      '"Microservices: because monoliths were making you too comfortable."',
      '"A loaded gun does not cause gun violence. An untested API endpoint causes production incidents."',
      '"The secret to great software is shipping it, breaking it, fixing it, and repeating."',
      '"Docker containers are like suitcases: everything fits if you just fold enough."',
      '"The most dangerous line of code is the one that says // TODO: fix this later."',
      '"Observability: because \'it works\' is not a valid incident response."',
      '"Edge computing: because making users wait 50ms longer is unacceptable."',
      '"Service mesh mTLS: because plaintext HTTP in production is a personality trait."',
      '"Zero-downtime deployment: proving that humans are still the biggest source of outages."',
      '"The true cost of cloud computing: what your AWS bill looks like at end of month."'
    ];

    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    this.log('');
    this.log(`   \u{1f3ae} FORTUNE`, 'success');
    this.log(`   ${fortune}`, 'info');
    this.log('');
  }

  showCowsay(text) {
    if (typeof document === 'undefined' || !this.output) return;

    if (!text) {
      this.log('Usage: cowsay <your text here>', 'warning');
      this.log('Example: cowsay Hello World', 'info');
      return;
    }

    const wrapped = [];
    const maxLineLen = 38;
    const words = text.split(' ');
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= maxLineLen) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) wrapped.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) wrapped.push(currentLine);

    const bubbleWidth = Math.max(...wrapped.map(l => l.length)) + 2;

    this.log('', 'default');

    if (wrapped.length === 1) {
      this.log(` ${'\u2500'.repeat(bubbleWidth)} `, 'info');
      this.log(` <${wrapped[0]}>`, 'info');
      this.log(` ${'\u2500'.repeat(bubbleWidth)} `, 'info');
    } else {
      this.log(` ${'\u2500'.repeat(bubbleWidth)} `, 'info');
      wrapped.forEach((line, i) => {
        const padded = line.padEnd(bubbleWidth - 2);
        const isLast = i === wrapped.length - 1;
        if (isLast) {
          this.log(` \\${padded}/`, 'info');
        } else {
          this.log(` |${padded}|`, 'info');
        }
      });
      this.log(` ${'\u2500'.repeat(bubbleWidth)} `, 'info');
    }

    this.log('        \\   ^__^', 'info');
    this.log('         \\  (oo)\\', 'info');
    this.log('          (xx)\\', 'info');
    this.log('', 'default');
  }

  // ---- Achievements ----

  showAchievements() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('');
    this.log('ACHIEVEMENTS', 'info');

    const total = this.achievements.getAll().length;
    const unlocked = this.achievements.getCount();
    this.log(`Progress: ${unlocked}/${total} unlocked`, unlocked >= total ? 'success' : 'info');
    this.log('');

    this.achievements.getAll().forEach(a => {
      const isUnlocked = this.achievements.state[`unlocked_${a.id}`];
      const status = isUnlocked ? ('\u2705 UNLOCKED') : ('\u25CF LOCKED');
      this.log(`  ${a.icon} ${a.name.padEnd(20)} — ${a.desc.padEnd(35)} ${status}`, isUnlocked ? 'success' : 'warning');
    });

    this.log('');
  }

  // ---- Ctrl+K Command Palette ----

  toggleCommandPalette() {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('command-palette');
    if (existing) {
      existing.remove();
      this._paletteOpen = false;
      return;
    }
    this.showCommandPalette();
  }

  showCommandPalette() {
    if (typeof document === 'undefined' || !this.output) return;

    const overlay = document.createElement('div');
    overlay.id = 'command-palette';
    overlay.className = 'command-palette';

    const searchInput = document.createElement('input');
    searchInput.id = 'palette-search';
    searchInput.type = 'text';
    searchInput.placeholder = 'Type a command... (\u2191\u2193 navigate, Enter execute, Esc close)';
    searchInput.setAttribute('autocomplete', 'off');
    searchInput.setAttribute('spellcheck', 'false');

    const results = document.createElement('div');
    results.id = 'palette-results';
    results.className = 'palette-results';

    overlay.appendChild(searchInput);
    overlay.appendChild(results);
    document.body.appendChild(overlay);

    this._paletteOpen = true;

    setTimeout(() => {
      searchInput.focus();
      this.renderPaletteResults(searchInput.value, results);
    }, 100);

    searchInput.addEventListener('input', () => {
      this.renderPaletteResults(searchInput.value, results);
    });

    searchInput.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.palette-item');
      const focused = results.querySelector('.palette-item.focused');
      let focusedIdx = Array.from(items).indexOf(focused);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusedIdx = Math.min(focusedIdx + 1, items.length - 1);
        items.forEach(i => i.classList.remove('focused'));
        if (items[focusedIdx]) {
          items[focusedIdx].classList.add('focused');
          items[focusedIdx].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusedIdx = Math.max(focusedIdx - 1, 0);
        items.forEach(i => i.classList.remove('focused'));
        if (items[focusedIdx]) {
          items[focusedIdx].classList.add('focused');
          items[focusedIdx].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = results.querySelector('.palette-item.focused') || results.querySelector('.palette-item');
        if (active) {
          const cmd = active.dataset.command;
          overlay.remove();
          this._paletteOpen = false;
          this.displayCommand(cmd);
          this.executeCommand(cmd);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        overlay.remove();
        this._paletteOpen = false;
        this.input.focus();
      }
    });

    results.addEventListener('click', (e) => {
      const item = e.target.closest('.palette-item');
      if (item) {
        const cmd = item.dataset.command;
        overlay.remove();
        this._paletteOpen = false;
        this.displayCommand(cmd);
        this.executeCommand(cmd);
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        this._paletteOpen = false;
      }
    });
  }

  renderPaletteResults(query, results) {
    results.innerHTML = '';
    const q = query.toLowerCase().trim();

    const allCommands = [...this.commandHistory];
    const filtered = filterCommands(allCommands, q);

    if (filtered.length === 0) {
      results.textContent = 'No matching commands';
      return;
    }

    filtered.slice(0, 12).forEach(cmd => {
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.dataset.command = cmd;
      item.innerHTML = createPaletteItem(cmd, q).innerHTML;
      results.appendChild(item);
    });

    const first = results.querySelector('.palette-item');
    if (first) first.classList.add('focused');
  }

  // ---- Performance Dashboard ----

  showPerf() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('');
    this.log('PERFORMANCE DASHBOARD', 'info');

    const perf = performance.getEntriesByType('navigation')[0] || {};
    const now = performance.now();

    const ttfb = perf.startTime ? Math.round(perf.responseStart - perf.startTime) : null;
    const dcltStart = perf.domContentLoadedEventStart || 0;
    const domContentLoaded = Math.round(dcltStart - perf.startTime);
    const fullLoad = perf.loadEventStart ? Math.round(perf.loadEventStart - perf.startTime) : null;

    let ttfbEst = ttfb;
    let dcltEst = domContentLoaded;
    let fullLoadEst = fullLoad;

    if (!ttfbEst) {
      ttfbEst = null;
      dcltEst = null;
      fullLoadEst = null;
    }

    const grades = {
      ttfb: gradePerf(ttfbEst, PERF_THRESHOLDS.ttfb),
      dclt: gradePerf(dcltEst, PERF_THRESHOLDS.domContentLoaded),
      full: gradePerf(fullLoadEst, PERF_THRESHOLDS.fullLoad)
    };

    const bar = (ms, max) => {
      if (ms === null || ms <= 0) return '\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591';
      const filled = Math.min(10, Math.max(1, Math.round((ms / max) * 10)));
      return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
    };

    this.log('  Metric                    Time     Grade   Bar', 'info');
    this.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', 'info');

    const metrics = [
      { name: 'TTFB', time: ttfbEst, ...grades.ttfb, max: 2000 },
      { name: 'DOMContentLoaded', time: dcltEst, ...grades.dclt, max: 4000 },
      { name: 'Full Load', time: fullLoadEst, ...grades.full, max: 8000 }
    ];

    metrics.forEach(m => {
      const timeStr = m.time !== null ? `${m.time}ms` : 'N/A';
      const barStr = bar(m.time, m.max);
      this.log(`  ${m.name.padEnd(23)} ${timeStr.padEnd(8)} ${m.letter.padEnd(5)} ${barStr}`, m.color);
    });

    this.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', 'info');

    const overall = computeOverallGrade(grades);
    this.log(`  Overall Grade: ${overall.grade}`, overall.color);

    if (performance.getEntriesByType('resource').length > 0) {
      const resources = performance.getEntriesByType('resource');
      const largestResource = resources.reduce((max, r) => r.responseEnd > max.responseEnd ? r : max, resources[0] || {});
      this.log(`  Largest Resource: ${largestResource.name || 'N/A'}`, 'info');
    }

    if (performance.memory) {
      const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
      const totalMB = Math.round(performance.memory.totalJSHeapSize / 1048576);
      this.log(`  JS Heap: ${usedMB}MB / ${totalMB}MB`, 'info');
    }

    this.log('');
  }

  // ---- Core Methods ----

  _guard() {
    return typeof document === 'undefined' || !this.output;
  }

  _card(html, className = 'output-line project-card') {
    if (this._guard()) return null;
    const card = document.createElement('div');
    card.className = className;
    card.innerHTML = html;
    this.output.appendChild(card);
    this.scrollToBottom();
    return card;
  }

  openPage(url, title) {
    if (this._guard()) return;
    this.log(`Opening ${title}...`, 'info');
    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newTab) {
      this.log('Popup blocked! Please allow popups for this site.', 'warning');
      this.log(`  Direct link: ${url}`, 'info');
    } else {
      this.log(`${title} opened in new tab.`, 'success');
    }
  }

  log(message, type = 'default') {
    if (this._guard()) return;
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = message;
    this.output.appendChild(line);

    // Cap output at 500 lines to prevent DOM bloat
    while (this.output.children.length > 500) {
      this.output.removeChild(this.output.firstChild);
    }

    this.scrollToBottom();

    if (this.announcementEl && message.trim() && !message.startsWith('   ')) {
      void this.announceMessage(message.trim());
    }
  }

  divider() {
    if (typeof document === 'undefined' || !this.output) return;
    const line = document.createElement('div');
    line.className = 'output-line section-divider';
    this.output.appendChild(line);
    this.scrollToBottom();
  }

  announceMessage(message) {
    if (this.announcementEl) {
      clearTimeout(this._announcementTimeout);
      this._announcementTimeout = setTimeout(() => {
        this.announcementEl.textContent = message;
      }, 300);
    }
  }

  scrollToBottom() {
    if (typeof document === 'undefined' || !this.output) return;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
    }

    this._rafId = requestAnimationFrame(() => {
      this.output.scrollTop = this.output.scrollHeight;
      this._rafId = null;
    });
  }

  autocomplete() {
    if (typeof document === 'undefined' || !this.input) return;
    const value = this.input.value.trim();

    if (!value) {
      this._updateAutocomplete();
      return;
    }

    const matches = this.commandHistory.filter(cmd =>
      cmd.startsWith(value.toLowerCase())
    );

    if (matches.length === 1) {
      this.input.value = matches[0];
      this.input.style.boxShadow = '0 0 8px var(--neon-cyan)';
      setTimeout(() => { this.input.style.boxShadow = ''; }, 300);
    } else if (matches.length > 1) {
      this._updateAutocomplete();
    }
  }

  async showGitHubStats() {
    this.log('');
    this.log('GitHub Profile Stats', 'info');

    try {
      const resp = await fetch('https://api.github.com/users/chaitea321');
      if (!resp.ok) throw new Error('GitHub API unavailable');

      const data = await resp.json();

      this.log(`  Username: ${data.login}`, 'success');
      this.log(`  Name: ${data.name || 'N/A'}`, 'info');
      this.log(`  Location: ${data.location || 'N/A'}`, 'info');
      this.log(`  Bio: ${data.bio || 'No bio set'}`, 'info');
      this.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', 'info');
      this.log(`  Repositories: ${data.public_repos}`, 'success');
      this.log(`  Followers: ${data.followers_count}`, 'success');
      this.log(`  Stars Received: ${data.total_repositories_stars_received || 'N/A'}`, 'success');
      this.log(`  Joined: ${new Date(data.created_at).getFullYear()}`, 'info');

      if (data.url) {
        this.log(`  Profile: ${data.url}`, 'info');
      }
    } catch (err) {
      this.log('  GitHub API unavailable — showing cached stats', 'warning');
      this.log('  Username: chaitea321', 'info');
      this.log('  Repositories: 5+', 'success');
      this.log('  Profile: github.com/chaitea321', 'info');
    }

    this.log('');
  }
}

export default Terminal;

// Self-instantiate the terminal
if (typeof window !== 'undefined') {
  const term = new Terminal();
  window.terminal = term;
}
