/* eslint-disable no-unused-vars */
// Main terminal UI controller with new API integrations.

import { getProjects, getProject, generateBadges } from './project-catalog.js';
import MeshWatchAPI from './meshwatch-api.js';
import AIAssistant from './ai-assistant.js';
import Achievements from './achievements.js';
import { escapeHtml, normalizeSlug, validateUrl, COMMAND_ICONS, COMMAND_DESCS, highlightMatch, createPaletteItem, filterCommands, SKILLS_DATA, PERF_THRESHOLDS, gradePerf, computeOverallGrade } from './utils/helpers.js';

// Lazy import VisualEffects for matrix Easter egg
let _visualEffects = null;
function getVisualEffects() {
  if (!_visualEffects && typeof document !== 'undefined') {
    // eslint-disable-next-line no-unused-vars
    import('./visual-effects.js').then(m => { _visualEffects = m.default || m; });
  }
  return _visualEffects;
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
      'matrix', 'timeline', 'neofetch', 'fortune', 'cowsay',
      'achievements', 'perf', 'explorer', 'dashboard'
    ];
    this.announcementEl = null;
    this._announcementTimeout = null;
    this.isDemoMode = false;
    this.demoInterval = null;
    this.currentProjectIndex = 0;
    this._meshwatchAPI = null;
    this._aiAssistant = null;
    this.achievements = new Achievements();
    this.config = { demoMode: { cycleIntervalMs: 4000 } }; // Default config

    // Load config in browser, skip in Node.js test environment
    if (typeof window !== 'undefined') {
      this.loadConfig().then(() => this.init());
    } else {
      // In Node.js, init immediately without config
      this.init();
    }
  }

  async loadConfig() {
    try {
      const resp = await fetch('/config/career-fair.json');
      if (resp.ok) {
        const cfg = await resp.json();
        this.config = cfg;
        // Merge demoMode defaults
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
    if (this.output) {
      while (this.output.firstChild) {
        this.output.removeChild(this.output.firstChild);
      }
    }
    this.setupAccessibility();

    // Render welcome box instantly (no typewriter for box borders - they'd misalign during animation)
    if (typeof document !== 'undefined' && this.output) {
      const welcomeLines = [
        '╔══════════════════════════════════════════════════════╗',
        '║   Welcome to Eugene Vincent\'s Portfolio Terminal     ║',
        '║   Full Stack Engineer | Azure DevOps | SRE          ║',
        '╚══════════════════════════════════════════════════════╝'
      ];

      welcomeLines.forEach(line => {
        const div = document.createElement('div');
        div.className = 'output-line';
        div.textContent = line;
        this.output.appendChild(div);
      });

      this.scrollToBottom();
    }

    // Now typewriter the prompt (only in browser)
    if (typeof document !== 'undefined') {
      this.typewriterEffect('> Type "help" to see available commands\n', () => this.bindEvents());
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
    
    // Arrow navigation for command history when terminal output area has focus
    if (e.key === 'ArrowUp' && this.history.length > 0) {
      e.preventDefault();
      this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
      this.input.value = this.history[this.history.length - 1 - this.historyIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex > 0) {
        this.historyIndex--;
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

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && document.activeElement !== this.input) {
            e.preventDefault();
            this.input.focus();
            this.announceMessage('Command input focused');
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            this.clearTerminal();
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.toggleCommandPalette();
          }
        });

        const demoBtn = document.getElementById('demo-start-btn');
        if (demoBtn) {
          demoBtn.addEventListener('click', () => this.startDemoMode());
        }
      }
      window.addEventListener('resize', () => this.scrollToBottom());
    }
  }

  handleInput(e) {
    if (e.key === 'Enter') {
      const command = this.input.value.trim();
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
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.input.value = this.history[this.historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.input.value = this.history[this.historyIndex];
      } else {
        this.historyIndex = this.history.length;
        this.input.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.autocomplete();
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
            this.log('\u2705 Theme set to retro mode', 'success');
          } else if (args === 'synthwave') {
            document.body.classList.remove('theme-retro');
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
        case 'matrix':
          this.toggleMatrix(args);
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
         default:
          this.log(`Unknown command: ${cmd}`, 'warning');
      }

      // Track achievements for valid commands
      if (typeof document !== 'undefined' && cmd !== 'clear' && cmd !== 'help') {
        const newUnlocks = this.achievements.record(cmd, args);
        newUnlocks.forEach(a => {
          this.log(`\n${'\u{1f3af}'} Achievement Unlocked: ${a.icon} ${a.name} — ${a.desc}`, 'success');
        });
      }
    } catch (error) {
      console.error('[Terminal] Command error:', error.name, '-', error.message);
      this.log(`\n⚡ System error: ${error.message || 'An unexpected error occurred'}`, 'warning');
      this.log('Try "help" for available commands.', 'info');
    }
  }

  showHelp() {
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
      { cmd: 'matrix [on|off]', desc: 'Toggle matrix rain animation' },
      { cmd: 'neofetch', desc: 'System information display' },
      { cmd: 'fortune', desc: 'Random tech/career fortune' },
      { cmd: 'cowsay <text>', desc: 'ASCII cow says your text' },
      { cmd: 'achievements', desc: 'View earned achievements' },
      { cmd: 'perf', desc: 'Performance dashboard (A-F grading)' },
      { cmd: 'contact --email', desc: 'Interactive email form' },
      { cmd: 'explorer', desc: 'Open Project Explorer page' },
      { cmd: 'dashboard', desc: 'Open Live Dashboard page' }
    ];

    const a11yShortcuts = [
      { key: 'Tab', desc: 'Autocomplete command' },
      { key: '\u2190/\u2191', desc: 'Command history' },
      { key: 'Ctrl+K', desc: 'Command palette overlay' },
      { key: 'Esc', desc: 'Focus input field' }
    ];

    this.divider();
    this.log('\n=== AVAILABLE COMMANDS ===', 'info');
    helpText.forEach(({ cmd, desc }) => {
      this.log(`  ${cmd.padEnd(20)} - ${desc}`, 'success');
    });
    this.log('============================\n', 'info');
    this.divider();

    this.log('=== KEYBOARD SHORTCUTS ===', 'info');
    a11yShortcuts.forEach(({ key, desc }) => {
      this.log(`  ${key.padEnd(10)} - ${desc}`, 'success');
    });
    this.log('===========================\n', 'info');
    this.divider();

    this.log('=== PROJECT CATEGORIES ===', 'info');
    const categories = ['cloud', 'devops', 'iot', 'web'];
    categories.forEach(cat => {
      this.log(`  ${cat.padEnd(10)} - Projects in "${cat}" category`, 'info');
    });
    this.log('===========================\n', 'info');
  }

  showProjects(filter = '') {
    this.log('\n=== PROJECTS ===\n', 'info');

    if (this._guard()) return;

    const projectList = getProjects(filter, '');

    if (projectList.length === 0) {
      this.log('No projects found matching criteria', 'warning');
      this.log('Available categories: cloud, devops, iot, web', 'info');
    } else {
      this.log(`Found ${projectList.length} project(s):\n`, 'success');

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

    this.log('\n📡 Tip: Type "project <name>" for a deep-dive into any project\n', 'info');
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
      this.log('\n=== PROJECTS ===\n', 'info');
      const projects = getProjects();
      this.log('Available projects (type "project <name>" for details):\n', 'success');

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
      this.log(`\n\u274C Project "${identifier}" not found.`, 'warning');
      this.log('Available projects: meshwatch, minecraft-monitoring, monitoring, azure-functions, career-portal\n', 'info');
      return;
    }

    this.log(`\n=== PROJECT: ${project.name.toUpperCase()} ===\n`, 'info');

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

    this.log('', 'default');
  }

  showSkills(category = '') {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== TECHNICAL SKILLS ===\n', 'info');

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

    this.log('\n========================\n', 'info');
  }

  showAbout() {
    if (typeof document === 'undefined' || !this.output) return;
    this.divider();
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
      '========================\n'
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

  showContact(args) {
    if (typeof document === 'undefined' || !this.output) return;

    // Multi-step interactive email form: contact --email
    if (args === '--email' || args === '-e') {
      this.startContactForm();
      return;
    }

    this.divider();
    this.log('\n=== CONTACT ===\n', 'info');
    this.log('\u{1f4e7} Email: eugene.vince55@gmail.com', 'success');
    this.log('\u{1f517} GitHub: github.com/chaitea321', 'success');
    this.log('\u{1f4bc} LinkedIn: linkedin.com/in/eugene-vincent-42472024b', 'success');
    this.log('\u{1f310} Portfolio: chai-homelab.com', 'success');
    this.log('\n  Use "contact --email" to send via terminal.\n', 'info');
    this.log('========================\n', 'info');
  }

  // Multi-step contact form with interactive prompts
  startContactForm() {
    if (typeof document === 'undefined' || !this.output || !this.input) return;

    this.divider();
    this.log('\n=== SEND EMAIL ===\n', 'info');
    this.log('Interactive email form. Type answers below.', 'info');
    this.log('Type "cancel" at any time to abort.\n', 'warning');

    const steps = [
      { key: 'name', prompt: 'Your name:', validate: v => v.trim().length > 0 },
      { key: 'subject', prompt: 'Subject:', validate: v => v.trim().length > 0 },
      { key: 'message', prompt: 'Message:', validate: v => v.trim().length > 10 }
    ];

    let stepIndex = 0;
    const formData = {};

    const askNext = () => {
      if (stepIndex >= steps.length) {
        // Build mailto: link and open it
        const name = encodeURIComponent(formData.name);
        const subject = encodeURIComponent(formData.subject);
        const body = encodeURIComponent(`Hi Eugene,\n\nFrom: ${formData.name}\n\n${formData.message}`);
        const mailto = `mailto:eugene.vince55@gmail.com?subject=${subject}&body=${body}`;

        this.log('\nForm complete!', 'success');
        this.log('\nOpening email client...\n', 'info');
        this.log('  To: eugene.vince55@gmail.com', 'info');
        this.log(`  Subject: ${formData.subject}`, 'info');
        this.log(`  From: ${formData.name}\n`, 'info');

        // Open mailto link
        const a = document.createElement('a');
        a.href = mailto;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        this.divider();
        stepIndex = -1; // Mark as complete
        return;
      }

      const step = steps[stepIndex];
      this.log(`\n${step.prompt}`, 'info');
      this.log('  (type "cancel" to abort)\n', 'warning');

      // Override Enter key temporarily for form input
      const formSubmit = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const value = this.input.value.trim();

          if (value.toLowerCase() === 'cancel') {
            this.log('\nForm cancelled.', 'warning');
            this.divider();
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
          this.log('  \u2705 Recorded.', 'success');
          stepIndex++;
          this.input.value = '';
          this.input.onkeydown = null;
          this.bindEvents(); // Rebind normal events, then ask next
          if (stepIndex >= 0) askNext();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.log('\nForm cancelled.', 'warning');
          this.divider();
          stepIndex = -1;
          this.input.onkeydown = null;
        }
      };

      // Small delay to let the next character render before focusing
      setTimeout(() => {
        this.input.focus();
        this.input.onkeydown = formSubmit;
      }, 50);
    };

    askNext();
  }

  showExperience(level = '') {
    if (this._guard()) return;
    this.log('\n=== HOMELAB PROJECTS & EXPERIENCE ===\n', 'info');

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

    this.log('\n========================\n', 'info');
  }

  showEducation() {
    if (this._guard()) return;
    this.log('\n=== EDUCATION ===\n', 'info');

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

    this.log('\n========================\n', 'info');
  }

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
  \u2022 Interactive terminal with 14+ commands and autocomplete
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

    this.divider();
    this.log('\n=== RESUME ===\n', 'info');
    this.log(resumeText, 'default');
    this.log('\n💠 Tip: Use "resume --txt" or "resume --md" to download.', 'info');
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

  async showStatus() {
    if (typeof document === 'undefined' || !this.output) return;
    this.divider();
    this.log('\n=== SYSTEM STATUS ===\n', 'info');

    try {
      // Show current online/offline status
      const isOnline = navigator.onLine;
      this.log(`Network: ${isOnline ? '\u2705 Online' : '\u274C Offline'}`, isOnline ? 'success' : 'warning');

      if (isOnline) {
        // Try to fetch live metrics from Azure Functions
        const status = await this.meshwatchAPI.getMetrics();
        if (status.success) {
          this.log('MeshWatch: \u2705 Live (Azure Functions)', 'success');
          this.log(`  Pods deployed: ${status.podsDeployed || 15} | Services: ${status.servicesMonitored || 5}`, 'info');
          this.log(`  Cost: $${status.monthlyCost || '5.12'}/month (60% savings vs serverless)`, 'success');
          this.log(`  AI Analysis: ${status.aiAnalysis || 'Ollama Phi-3 ready for incident analysis'}`, 'info');
        } else {
          // Fallback to cached/demo metrics
          this.log('Azure Functions not yet deployed, showing demo data...', 'warning');
          this.log('MeshWatch: \u2705 Production (demo mode)', 'success');
          this.log('  Pods deployed: 15 | Services monitored: 5', 'info');
          this.log('  Monthly cost: $5.12 (60% savings vs serverless)', 'success');
          this.log('  AI Analysis: Ollama Phi-3 ready (Tailscale pending)', 'info');
        }
      } else {
        this.log('Offline mode - showing cached metrics', 'warning');
        this.log('MeshWatch: \u2705 Production (offline cache)', 'success');
        this.log('  Pods deployed: 15 | Services monitored: 5', 'info');
      }

      // Show browser info for recruiter talk points
      this.log(`\nBrowser: ${navigator.userAgent.split(' ').slice(-1)[0] || 'Modern'}`, 'info');
      this.log(`Platform: ${navigator.platform || 'Unknown'}`, 'info');
      this.log(`Memory API: ${performance.memory ? 'Available' : 'Not available'}`, 'info');
    } catch (error) {
      console.error('Status check error:', error);
      this.log('Error fetching system status. Showing offline metrics.', 'warning');
      this.log('MeshWatch: \u2705 Production (fallback)', 'success');
      this.log('  Pods deployed: 15 | Services monitored: 5', 'info');
    }

    this.log('\n========================\n', 'info');
  }

  async showMinecraft() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== MINECRAFT SERVER STATUS ===\n', 'info');

    try {
      // Load stats from local JSON file (updated every 10 min via cron)
      const resp = await fetch(`/config/minecraft-stats.json?t=${Date.now()}`);
      if (resp.ok) {
        const stats = await resp.json();
        this.log(`Server: ${stats.server.name} (${stats.server.version})`, 'success');
        this.log(`Runtime: ${stats.server.javaVersion}`, 'info');
        this.log(`TPS: ${stats.metrics.tps} | Players: ${stats.metrics.players}/${stats.metrics.maxPlayers}`, 'info');
        this.log(`Uptime: ${stats.metrics.uptime} | Last GC Pause: ${stats.metrics.lastGcPause}`, 'success');
        this.log(`Discord Alerts Today: ${stats.monitoring.discordAlertsToday} | RCON Latency: ${stats.monitoring.rconLatency}`, 'info');
        this.log(`Heap: ${stats.metrics.heapUsedMB}MB / ${stats.metrics.heapMaxMB}MB`, 'info');
        if (stats.recentChanges && stats.recentChanges.length > 0) {
          this.log('\nRecent Changes:', 'success');
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

    this.log('\n========================\n', 'info');
  }

  showMinecraftFallback() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('Server: Minecraft PaperMC 26.1.2 (Java 25)', 'success');
    this.log('TPS: 20 | Players: 3', 'info');
    this.log('Uptime: 99.8% | Last GC Pause: 45ms', 'info');
    this.log('Discord Alerts Today: 0', 'info');
    this.log('\nTech Stack:', 'success');
    this.log('  \u2022 JMX Exporter - TPS, Heap, GC Metrics', 'info');
    this.log('  \u2022 RCON Protocol - Server Control', 'info');
    this.log('  \u2022 Discord.py Bot - 10 Slash Commands', 'info');
    this.log('  \u2022 Prometheus + Grafana - Real-time Dashboards', 'info');
    this.log('  \u2022 Ollama Phi-3 - AI Lag Analysis', 'info');
    this.log('\nStats update every 10 minutes via cron job.', 'info');
  }

  async askAI(question = '') {
    if (!question) {
      this.log('\n=== AI ASSISTANT ===\n', 'info');
      this.log('Ask me anything about your portfolio projects!', 'success');
      this.log('Examples:', 'info');
      this.log('  ai What does MeshWatch do?', 'info');
      this.log('  ai Tell me about your Kubernetes experience', 'info');
      this.log('  ai How much did you save on monitoring costs?', 'info');
      this.log('\n\nAI requires Ollama deployment via Tailscale.', 'warning');
      this.log('In demo mode, I will answer from cached knowledge.\n', 'info');
      return;
    }

    this.log('', 'default');
    this.log(`\u{1f916} Portfolio Knowledge: ${question}`, 'info');

    try {
      // Try to query Ollama via Azure Functions proxy
      const response = await this.aiAssistant.query(question);

      if (response.success) {
        this.log('\n\u{1f916} Answer:', 'success');
        // Wrap long responses nicely
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
        // Fallback: use cached knowledge (already returned in response.data)
        this.log('\n\u{1f916} Answer:', 'success');
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
      this.log('\n\u{1f916} Answer:', 'info');
      this.log('Using cached knowledge. Deploy Ollama for live AI answers.', 'warning');
    }

    this.log('', 'default');
  }

  toggleMatrix(arg = '') {
    if (typeof document === 'undefined') return;

    const matrixColumns = document.querySelectorAll('.matrix-column');

    if (arg === 'on') {
      // Enable matrix rain by setting columns to visible
      matrixColumns.forEach(col => col.style.display = '');
      this.log('\u2705 Matrix rain enabled! (Type "matrix off" to disable)', 'success');
    } else if (arg === 'off') {
      // Disable matrix rain by hiding columns
      matrixColumns.forEach(col => col.style.display = 'none');
      this.log('\u274c Matrix rain disabled', 'warning');
    } else {
      // Toggle based on current state
      const hasMatrix = matrixColumns.length > 0;
      if (hasMatrix) {
        matrixColumns.forEach(col => col.style.display = 'none');
        this.log('\u274c Matrix rain disabled', 'warning');
      } else {
        // Check if matrix columns exist but are hidden, or create fresh ones
        const allCols = document.querySelectorAll('.matrix-column');
        if (allCols.length > 0) {
          allCols.forEach(col => col.style.display = '');
          this.log('\u2705 Matrix rain enabled! (Type "matrix off" to disable)', 'success');
        } else {
          // No columns exist - trigger visual effects to create them
          if (typeof window !== 'undefined') {
            import('./visual-effects.js').then(() => {
              const cols = document.querySelectorAll('.matrix-column');
              if (cols.length > 0) {
                this.log('\u2705 Matrix rain enabled! (Type "matrix off" to disable)', 'success');
              } else {
                this.log('Matrix columns not found. Visual effects may need to be loaded first.', 'warning');
              }
            });
          }
        }
      }
    }
  }

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
    this.log(`\n${isRetro ? '\u2705' : '\u266F'} Theme toggled to ${isRetro ? 'retro' : 'synthwave'} mode`, 'info');
  }

  // ---- Demo Mode ----

  startDemoMode() {
    if (this.isDemoMode) {
      this.log('\n\u2705 Demo mode already running!', 'success');
      return;
    }

    this.isDemoMode = true;
    this.currentProjectIndex = 0;

    this.log('\n=== DEMO MODE ACTIVATED ===', 'info');
    this.log('Auto-cycling through projects. Press "demo stop" or click Stop Demo to exit.', 'success');
    this.log('Press any key to pause the showcase.\n', 'warning');

    // Bind pause on any keypress
    this._demoPauseHandler = (e) => {
      if (!this.isDemoMode) return;
      this.stopDemoMode();
      document.removeEventListener('keydown', this._demoPauseHandler);
    };
    document.addEventListener('keydown', this._demoPauseHandler);

    const projects = getProjects();
    const runNext = () => {
      if (!this.isDemoMode) return;

      const project = projects[this.currentProjectIndex % projects.length];
      this.log(`\n--- DEMO: ${project.name.toUpperCase()} ---`, 'info');
      this.log(project.description, 'default');
      this.log(`Badges: ${project.badges.join(', ')}`, 'success');
      this.log(`Category: ${project.category}`, 'info');

      this.currentProjectIndex++;

      // Schedule next project after delay (config-driven, falls back to 4000ms)
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

    document.removeEventListener('keydown', this._demoPauseHandler);
    this._demoPauseHandler = null;

    this.log('\n=== DEMO MODE STOPPED ===', 'warning');
    this.log('Demo mode deactivated. Resume normal terminal interaction.\n', 'info');
  }

  // ---- Skills Visual ---

  showSkillsVisual() {
    if (typeof document === 'undefined' || !this.output) return;
    this.divider();
    this.log('\n=== SKILLS VISUALIZATION ===\n', 'info');

    Object.values(SKILLS_DATA).forEach(data => {
      this.log(`${data.label}`, 'success');
      const bar = '\u2588'.repeat(Math.round(data.level / 10)) + '\u2591'.repeat(10 - Math.round(data.level / 10));
      this.log(`  ${bar} ${data.level}%`);
      data.items.forEach(item => {
        this.log(`    \u2022 ${item}`, 'info');
      });
      this.log('');
    });

    this.divider();
  }

  // ---- Timeline ---

  showTimeline() {
    if (typeof document === 'undefined' || !this.output) return;
    this.divider();
    this.log('\n=== PROJECT TIMELINE ===\n', 'info');

    const projects = [
      { name: 'Monitoring Stack', start: 2022, end: null, active: true },
      { name: 'MeshWatch', start: 2023, end: null, active: true },
      { name: 'Minecraft Monitor', start: 2023, end: 2024, active: false },
      { name: 'Career Portal', start: 2024, end: null, active: true },
      { name: 'Azure Functions', start: 2024, end: null, active: true }
    ];

    const years = [2022, 2023, 2024, 2025];
    const maxYear = 2025;

    // Header row
    const header = 'Year   '.padEnd(8) + projects.map(p => p.name.substring(0, 12).padEnd(14)).join('');
    this.log(header, 'info');
    this.log('─'.repeat(header.length), 'info');

    // Draw timeline bars for each project
    projects.forEach(project => {
      const prefix = `${project.start}─`.padEnd(8);
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
    this.divider();
  }

  // ---- Easter Eggs ---

  showNeofetch() {
    if (typeof document === 'undefined' || !this.output) return;
    const isOnline = navigator.onLine;
    const browser = navigator.userAgent.split(' ').slice(-1)[0] || 'Modern';
    const platform = navigator.platform || 'Unknown';

    this.divider();
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
    this.divider();
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
    this.divider();
    this.log('\n   \u{1f3ae} FORTUNE\n', 'success');
    this.log(`   ${fortune}`, 'info');
    this.log('\n   Type "fortune" again for another.\n', 'info');
    this.divider();
  }

  showCowsay(text) {
    if (typeof document === 'undefined' || !this.output) return;

    if (!text) {
      this.log('\nUsage: cowsay <your text here>', 'warning');
      this.log('Example: cowsay Hello World\n', 'info');
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
    const topBorder = '/'.padEnd(bubbleWidth, '-').replace(/[/-]$/, '\\');
    const bottomBorder = '\\'.padStart(bubbleWidth, '-').replace(/[/\\]$/, '/');

    this.divider();
    this.log('', 'default');

    if (wrapped.length === 1) {
      this.log(` ${' '.repeat(bubbleWidth - 2)} `, 'info');
      this.log(` <${wrapped[0]}>`, 'info');
      this.log(` ${' '.repeat(bubbleWidth - 2)} `, 'info');
    } else {
      this.log(` ${' '.repeat(bubbleWidth - 2)} `, 'info');
      wrapped.forEach((line, i) => {
        const padded = line.padEnd(bubbleWidth - 2);
        const isLast = i === wrapped.length - 1;
        if (isLast) {
          this.log(` \\${padded}/`, 'info');
        } else {
          this.log(` |${padded}|`, 'info');
        }
      });
      this.log(` ${' '.repeat(bubbleWidth - 2)} `, 'info');
    }

    this.log('        \\   ^__^', 'info');
    this.log('         \\  (oo)\\', 'info');
    this.log('          (xx)\\', 'info');
    this.log('', 'default');
    this.divider();
  }

  // ---- Achievements ---

  showAchievements() {
    if (typeof document === 'undefined' || !this.output) return;
    this.divider();
    this.log('\n=== ACHIEVEMENTS ===\n', 'info');

    const total = this.achievements.getAll().length;
    const unlocked = this.achievements.getCount();
    this.log(`Progress: ${unlocked}/${total} unlocked`, unlocked >= total ? 'success' : 'info');
    this.log('');

    this.achievements.getAll().forEach(a => {
      const isUnlocked = this.achievements.state[`unlocked_${a.id}`];
      const status = isUnlocked ? ('\u2705 UNLOCKED') : ('\u25CF LOCKED');
      this.log(`  ${a.icon} ${a.name.padEnd(20)} — ${a.desc.padEnd(35)} ${status}`, isUnlocked ? 'success' : 'warning');
    });

    this.divider();
  }

  // ---- Ctrl+K Command Palette ---

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

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'command-palette';
    overlay.className = 'command-palette';

    // Search input
    const searchInput = document.createElement('input');
    searchInput.id = 'palette-search';
    searchInput.type = 'text';
    searchInput.placeholder = 'Type a command... (↑↓ navigate, Enter execute, Esc close)';
    searchInput.setAttribute('autocomplete', 'off');
    searchInput.setAttribute('spellcheck', 'false');

    // Results container
    const results = document.createElement('div');
    results.id = 'palette-results';
    results.className = 'palette-results';

    overlay.appendChild(searchInput);
    overlay.appendChild(results);
    document.body.appendChild(overlay);

    this._paletteOpen = true;

    // Focus search input with slight delay for animation
    setTimeout(() => {
      searchInput.focus();
      this.renderPaletteResults(searchInput.value, results);
    }, 100);

    // Search / filter handler
    searchInput.addEventListener('input', () => {
      this.renderPaletteResults(searchInput.value, results);
    });

    // Keyboard navigation
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
          // Execute the command
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

    // Click to execute
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

    // Close on overlay click (outside palette box)
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

    // Build command list (deduplicated, perf always included)
    const allCommands = [...new Set([...this.commandHistory, 'perf'])];

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

    // Auto-focus first result
    const first = results.querySelector('.palette-item');
    if (first) first.classList.add('focused');
  }

  // ---- Performance Dashboard ---

  showPerf() {
    if (typeof document === 'undefined' || !this.output) return;
    this.divider();
    this.log('\n=== PERFORMANCE DASHBOARD ===\n', 'info');

    const perf = performance.getEntriesByType('navigation')[0] || {};
    const now = performance.now();

    // Navigation Timing API metrics
    const ttfb = perf.startTime ? Math.round(perf.responseStart - perf.startTime) : null;
    const dcltStart = perf.domContentLoadedEventStart || 0;
    const domContentLoaded = Math.round(dcltStart - perf.startTime);
    const fullLoad = perf.loadEventStart ? Math.round(perf.loadEventStart - perf.startTime) : null;

    // Fallback: use PerformanceObserver if Navigation Timing not available
    let ttfbEst = ttfb;
    let dcltEst = domContentLoaded;
    let fullLoadEst = fullLoad;

    if (!ttfbEst && now > 0) {
      // Estimate from performance.now() (time since page load started)
      ttfbEst = Math.round(now * 0.6);
      dcltEst = Math.round(now * 0.8);
      fullLoadEst = Math.round(now);
    }

    // A-F grading thresholds (extracted to constants)
    const grades = {
      ttfb: gradePerf(ttfbEst, PERF_THRESHOLDS.ttfb),
      dclt: gradePerf(dcltEst, PERF_THRESHOLDS.domContentLoaded),
      full: gradePerf(fullLoadEst, PERF_THRESHOLDS.fullLoad)
    };

    // ASCII bar chart for each metric
    const bar = (ms, max) => {
      if (ms === null || ms <= 0) return '░░░░░░░░░░';
      const filled = Math.min(10, Math.max(1, Math.round((ms / max) * 10)));
      return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
    };

    this.log('\n  Metric                    Time     Grade   Bar', 'info');
    this.log('  ───────────────────────────────────────────────', 'info');

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

    // Overall grade (extracted to utility function)
    const overall = computeOverallGrade(grades);

    this.log('  ───────────────────────────────────────────────', 'info');
    this.log(`  Overall Grade: ${overall.grade}`, overall.color);

    // Additional perf data from Performance API
    if (performance.getEntriesByType('resource').length > 0) {
      const resources = performance.getEntriesByType('resource');
      const largestResource = resources.reduce((max, r) => r.responseEnd > max.responseEnd ? r : max, resources[0] || {});
      this.log(`\n  Largest Resource: ${largestResource.name || 'N/A'}`, 'info');
    }

    // Memory info (if available via Performance API)
    if (performance.memory) {
      const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
      const totalMB = Math.round(performance.memory.totalJSHeapSize / 1048576);
      this.log(`  JS Heap: ${usedMB}MB / ${totalMB}MB`, 'info');
    }

    this.divider();
  }

  // ---- Core Methods ---

  /** Guard: exit early if not in browser or output element missing */
  _guard() {
    return typeof document === 'undefined' || !this.output;
  }

  /** Create a styled output line with type class */
  _line(text, type = 'default') {
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = text;
    this.output.appendChild(line);
    this.scrollToBottom();
  }

  /** Create a project-style card with innerHTML */
  _card(html, className = 'output-line project-card') {
    if (this._guard()) return null;
    const card = document.createElement('div');
    card.className = className;
    card.innerHTML = html;
    this.output.appendChild(card);
    this.scrollToBottom();
    return card;
  }

  /** Open a new page in a new tab with confirmation */
  openPage(url, title) {
    if (this._guard()) return;
    this.log(`\n📂 Opening ${title}...`, 'info');
    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newTab) {
      this.log('⚠ Popup blocked! Please allow popups for this site.', 'warning');
      this.log(`  Direct link: ${url}`, 'info');
    } else {
      this.log(`✅ ${title} opened in new tab.`, 'success');
    }
  }

  log(message, type = 'default') {
    if (this._guard()) return;
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = message;
    this.output.appendChild(line);

    // Cap output at 500 lines to prevent DOM bloat on long sessions
    while (this.output.children.length > 500) {
      this.output.removeChild(this.output.firstChild);
    }

    this.scrollToBottom();

    // Announce to screen readers (first and last lines only to avoid spam)
    if (this.announcementEl && message.trim() && !message.startsWith('   ')) {
      void this.announceMessage(message.trim());
    }
  }

  // Print a section divider line for visual grouping
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

  typewriterEffect(text, callback) {
    if (typeof document === 'undefined' || !this.output) {
      if (callback) callback();
      return;
    }
    const line = document.createElement('div');
    line.className = 'output-line';
    this.output.appendChild(line);

    let i = 0;
    const speed = 2;

    const type = () => {
      if (i < text.length) {
        line.textContent += text.charAt(i);
        i++;
        this.scrollToBottom();
        setTimeout(type, speed);
      } else if (callback) {
        callback();
      }
    };

    type();
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

    // Empty input with Tab shows all commands available
    if (!value) {
      this.log('\nAvailable commands: ' + this.commandHistory.join(', '), 'info');
      return;
    }

    const matches = this.commandHistory.filter(cmd =>
      cmd.startsWith(value.toLowerCase())
    );

    if (matches.length === 1) {
      this.input.value = matches[0];
      // Brief visual feedback for successful autocomplete
      this.input.style.boxShadow = '0 0 8px var(--neon-cyan)';
      setTimeout(() => { this.input.style.boxShadow = ''; }, 300);
    } else if (matches.length > 1) {
      this.log('\nMatches: ' + matches.join('  '), 'info');
      // Keep cursor at end of input so user can continue typing
    } else {
      this.log('\nNo matches for "' + value + '". Try Tab to see available commands.', 'warning');
    }
  }
}

export default Terminal;

// Self-instantiate the terminal (matches pattern used by audio, performance, visual-effects)
if (typeof window !== 'undefined') {
  const term = new Terminal();
  window.terminal = term; // Expose for debugging
}
