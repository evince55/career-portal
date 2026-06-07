/* eslint-disable no-unused-vars */
// Main terminal UI controller with new API integrations.

import { getProjects, getProject, generateBadges } from './project-catalog.js';
import MeshWatchAPI from './meshwatch-api.js';
import AIAssistant from './ai-assistant.js';

class Terminal {
  constructor() {
    this.output = typeof document !== 'undefined' ? document.getElementById('terminal-output') : null;
    this.input = typeof document !== 'undefined' ? document.getElementById('command-input') : null;
    this.history = [];
    this.historyIndex = -1;
    this.commandHistory = [
      'help', 'projects', 'project', 'skills', 'experience', 'education',
      'resume', 'about', 'contact', 'status', 'minecraft', 'ai',
      'demo', 'clear', 'theme'
    ];
    this.announcementEl = null;
    this.isDemoMode = false;
    this.demoInterval = null;
    this.currentProjectIndex = 0;
    this._meshwatchAPI = null;
    this._aiAssistant = null;

    this.init();
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
      this.output.innerHTML = '';
    }
    this.setupAccessibility();
    this.typewriterEffect(
      '> Welcome to Chaitanya Kumar\'s portfolio terminal v2.0.0\n',
      () => this.typewriterEffect('> Type "help" to see available commands\n', () => this.bindEvents())
    );
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
    line.innerHTML = `<span class="prompt">$</span> ${command}`;
    this.output.appendChild(line);
  }

  executeCommand(command) {
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
        this.showContact();
        break;
      case 'clear':
        if (typeof document !== 'undefined' && this.output) {
          this.output.innerHTML = '';
        }
        break;
      case 'theme':
        this.toggleTheme();
        break;
      case 'experience':
        this.showExperience(args);
        break;
      case 'education':
        this.showEducation(args);
        break;
      case 'resume':
        this.showResume();
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
      default:
        this.log(`Unknown command: ${cmd}`, 'warning');
    }
  }

  showHelp() {
    const helpText = [
      { cmd: 'help', desc: 'Show this help message' },
      { cmd: 'projects [category]', desc: 'List projects (optional: cloud, devops, iot, web)' },
      { cmd: 'project <name>', desc: 'Deep-dive into a specific project' },
      { cmd: 'skills [category]', desc: 'Show technical skills (optional: category)' },
      { cmd: 'experience [level]', desc: 'Show work experience (senior/mid/junior)' },
      { cmd: 'education', desc: 'Show education background' },
      { cmd: 'resume', desc: 'Download resume text format' },
      { cmd: 'about', desc: 'About Chaitanya Kumar' },
      { cmd: 'contact', desc: 'Contact information' },
      { cmd: 'status', desc: 'Show system/live metrics status' },
      { cmd: 'minecraft', desc: 'Show Minecraft server live stats' },
      { cmd: 'ai <question>', desc: 'Ask AI about your portfolio' },
      { cmd: 'demo [stop]', desc: 'Start/stop auto-cycling project showcase' },
      { cmd: 'clear', desc: 'Clear terminal output' },
      { cmd: 'theme', desc: 'Toggle synthwave/retro theme' }
    ];

    const a11yShortcuts = [
      { key: 'Tab', desc: 'Navigate between elements' },
      { key: '\u2190/\u2191', desc: 'Command history' },
      { key: 'Esc', desc: 'Focus input field' }
    ];

    this.log('\n=== AVAILABLE COMMANDS ===', 'info');
    helpText.forEach(({ cmd, desc }) => {
      this.log(`  ${cmd.padEnd(20)} - ${desc}`, 'success');
    });
    this.log('============================\n', 'info');

    this.log('=== KEYBOARD SHORTCUTS ===', 'info');
    a11yShortcuts.forEach(({ key, desc }) => {
      this.log(`  ${key.padEnd(10)} - ${desc}`, 'success');
    });
    this.log('===========================\n', 'info');

    this.log('=== PROJECT CATEGORIES ===', 'info');
    const categories = ['cloud', 'devops', 'iot', 'web'];
    categories.forEach(cat => {
      this.log(`  ${cat.padEnd(10)} - Projects in "${cat}" category`, 'info');
    });
    this.log('===========================\n', 'info');
  }

  showProjects(filter = '') {
    this.log('\n=== PROJECTS ===\n', 'info');

    if (typeof document === 'undefined' || !this.output) return;

    const projectList = getProjects(filter, '');

    if (projectList.length === 0) {
      this.log('No projects found matching criteria', 'warning');
      this.log('Available categories: cloud, devops, iot, web', 'info');
    } else {
      this.log(`Found ${projectList.length} project(s):\n`, 'success');

      projectList.forEach(project => {
        const card = document.createElement('div');
        card.className = 'output-line project-card';

        const badgesHTML = generateBadges(project.badges);
        const metricsHTML = this.formatProjectMetrics(project);

        card.innerHTML = `
          <div class="project-name">\u{1f4e6} ${project.name}</div>
          <div class="project-badges">${badgesHTML}</div>
          <div class="project-desc">${project.description.substring(0, 120)}...</div>
          <div class="project-category">Category: ${project.category.toUpperCase()}</div>
          ${metricsHTML}
          <a href="${project.githubUrl || '#'}" target="_blank" class="project-link">View on GitHub \u279C</a>
        `;
        this.output.appendChild(card);
      });
    }

    this.log('\n\U0001f461 Tip: Type "project <name>" for a deep-dive into any project\n', 'info');
  }

  formatProjectMetrics(project) {
    if (!project.metrics) return '';
    const metrics = Object.entries(project.metrics);
    if (metrics.length === 0) return '';

    const metricItems = metrics.map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `${label}: ${value}`;
    }).join(' | ');

    return `<div class="project-metrics">${metricItems}</div>`;
  }

  showProjectDetail(identifier = '') {
    if (!identifier) {
      this.log('\n=== PROJECTS ===\n', 'info');
      const projects = getProjects();
      this.log('Available projects (type "project <name>" for details):\n', 'success');

      if (typeof document !== 'undefined' && this.output) {
        projects.forEach(project => {
          const card = document.createElement('div');
          card.className = 'output-line project-card';
          const badgesHTML = generateBadges(project.badges);
          card.innerHTML = `
            <div class="project-name">\u{1f4e6} ${project.name}</div>
            <div class="project-badges">${badgesHTML}</div>
            <div class="project-desc">${project.description.substring(0, 100)}...</div>
          `;
          this.output.appendChild(card);
        });
      }
      return;
    }

    const project = getProject(identifier);

    if (!project) {
      this.log(`\n\u274C Project "${identifier}" not found.`, 'warning');
      this.log('Available projects: meshwatch, minecraft-monitoring, cs211, career-portal, monitoring, azure-functions\n', 'info');
      return;
    }

    this.log(`\n=== PROJECT: ${project.name.toUpperCase()} ===\n`, 'info');

    if (typeof document === 'undefined' || !this.output) return;

    const card = document.createElement('div');
    card.className = 'output-line project-card';

    const badgesHTML = generateBadges(project.badges);
    const techStackHTML = project.techStack.map(t => `<li>\u2022 ${t.name} \u2014 ${t.level}</li>`).join('');
    const metricsHTML = this.formatProjectMetrics(project);
    const achievementsHTML = project.keyAchievements.map(a => `<li style="margin: 0.25rem 0;">   \u2713 ${a}</li>`).join('');

    let linksHTML = '';
    if (project.githubUrl) {
      linksHTML += `<a href="${project.githubUrl}" target="_blank" class="project-link">GitHub \u279C</a> `;
    }
    if (project.liveUrl) {
      linksHTML += `<a href="${project.liveUrl}" target="_blank" class="project-link">Live Dashboard \u279C</a>`;
    }

    card.innerHTML = `
      <div class="project-name">\u{1f4e6} ${project.name}</div>
      <div class="project-badges">${badgesHTML}</div>
      <div class="project-desc">${project.description}</div>
      <div style="margin-top: 1rem;"><strong>TECH STACK</strong></div>
      <ul style="list-style: none; padding-left: 0.5rem;">${techStackHTML}</ul>
      ${metricsHTML ? `<div class="project-metrics">${metricsHTML}</div>` : ''}
      <div style="margin-top: 1rem;"><strong>KEY ACHIEVEMENTS</strong></div>
      <ul style="list-style: none; padding-left: 0.5rem;">${achievementsHTML}</ul>
    `;

    this.output.appendChild(card);

    if (linksHTML || project.demoNote) {
      const linksCard = document.createElement('div');
      linksCard.className = 'output-line project-card';
      let linksContent = linksHTML;
      if (project.demoNote) {
        linksContent += `<br><em style="color: #8a8;">${project.demoNote}</em>`;
      }
      linksCard.innerHTML = linksContent;
      this.output.appendChild(linksCard);
    }

    this.log('', 'default');
  }

  showSkills(category = '') {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== TECHNICAL SKILLS ===\n', 'info');

    const skills = {
      cloud: [
        'Azure (Blob Storage, Functions, AKS)',
        'AWS (EC2, S3, Lambda)',
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
    const aboutText = [
      '',
      '\u{1f44b} Hello! I\'m Chaitanya Kumar',
      '\u{1f4cf} Aurora, IL, USA',
      '',
      'Full Stack Engineer passionate about cloud-native architectures',
      'and developer experience. Currently building MeshWatch - a cost-',
      'optimized service mesh observability platform on k3s.',
      '',
      '\u{1f3af} What I do:',
      '   \u2022 Design scalable microservices with Istio & OpenTelemetry',
      '   \u2022 Build React/Next.js frontends with progressive enhancement',
      '   \u2022 Deploy serverless APIs on Azure/AWS',
      '   \u2022 Automate CI/CD pipelines with GitHub Actions',
      '',
      '\u{1f4a1} Recently:',
      '   \u2022 Integrated Ollama Phi-3 for automated incident analysis',
      '   \u2022 Reduced monitoring costs by 60% vs serverless alternatives',
      '   \u2022 Created FAANG-quality portfolio with synthwave terminal theme',
      '',
      '\u{1f393} Currently exploring:',
      '   \u2022 WASM for browser-based compute',
      '   \u2022 Edge computing with Cloudflare Workers',
      '   \u2022 AI-powered DevOps (AIOps)',
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

  showContact() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== CONTACT ===\n', 'info');
    this.log('\u{1f4e7} Email: chaitanya.kumar@example.com', 'success');
    this.log('\u{1f517} GitHub: github.com/chaitea321', 'success');
    this.log('\u{1f4bc} LinkedIn: linkedin.com/in/chaitea321', 'success');
    this.log('\u{1f310} Portfolio: chai-homelab.com', 'success');
    this.log('========================\n', 'info');
  }

  showExperience(level = '') {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== WORK EXPERIENCE ===\n', 'info');

    const experience = [
      {
        role: 'Full Stack Engineer',
        company: 'Freelance / Personal Projects',
        period: '2023 - Present',
        level: 'senior',
        details: [
          'Built MeshWatch - cost-optimized service mesh observability on k3s',
          'Integrated Ollama Phi-3 for automated incident analysis',
          'Reduced monitoring costs by 60% vs serverless alternatives',
          'Deployed cloud-native architectures on Azure & AWS'
        ]
      },
      {
        role: 'DevOps Engineer',
        company: 'Personal Homelab Projects',
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
        role: 'Software Engineering Intern',
        company: 'Academic Projects',
        period: '2023 - 2024',
        level: 'junior',
        details: [
          'Built full-stack web applications for coursework',
          'Developed real-time collaboration features',
          'Implemented RESTful APIs with Node.js and Express',
          'Created responsive frontends with React and TypeScript'
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
        const card = document.createElement('div');
        card.className = 'output-line project-card';
        card.innerHTML = `
          <div class="project-name">\u{1f3e2} ${exp.role}</div>
          <div class="project-desc">${exp.company} | ${exp.period}</div>
          <ul style="list-style: none; padding-left: 1rem;">
            ${exp.details.map(d => `<li style="margin: 0.25rem 0;">   \u2022 ${d}</li>`).join('')}
          </ul>
        `;
        this.output.appendChild(card);
      });
    }

    this.log('\n========================\n', 'info');
  }

  showEducation() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== EDUCATION ===\n', 'info');

    const education = [
      {
        degree: 'Bachelor of Science in Computer Science',
        institution: 'University of Illinois (CS211)',
        year: '2023 - 2024',
        details: [
          'Full-stack web development',
          'Data structures and algorithms',
          'Software engineering principles',
          'Database systems and cloud computing'
        ]
      },
      {
        degree: 'Certifications & Self-Study',
        institution: 'Online Platforms',
        year: '2022 - Present',
        details: [
          'Kubernetes Administration (CKA preparation)',
          'Cloud Architecture (Azure/AWS)',
          'DevOps best practices and CI/CD',
          'Service mesh with Istio and Linkerd'
        ]
      }
    ];

    education.forEach(edu => {
      const card = document.createElement('div');
      card.className = 'output-line project-card';
      card.innerHTML = `
        <div class="project-name">\u{1f393} ${edu.degree}</div>
        <div class="project-desc">${edu.institution} | ${edu.year}</div>
        <ul style="list-style: none; padding-left: 1rem;">
          ${edu.details.map(d => `<li style="margin: 0.25rem 0;">   \u2022 ${d}</li>`).join('')}
        </ul>
      `;
      this.output.appendChild(card);
    });

    this.log('\n========================\n', 'info');
  }

  showResume() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== RESUME TEXT ===\n', 'info');

    const resumeText = `
CHAITANYA KUMAR
Full Stack Engineer | Kubernetes Enthusiast
${'\u{1f4cf}'} Aurora, IL, USA
${'\u{1f4e7}'} chaitanya.kumar@example.com
${'\u{1f517}'} github.com/chaitea321
${'\u{1f4bc}'} linkedin.com/in/chaitea321

EMPLOYMENT HISTORY
----------------------------------------------------------
Full Stack Engineer | Freelance / Personal Projects (2023 - Present)
  \u2022 Built MeshWatch - cost-optimized service mesh observability on k3s
  \u2022 Integrated Ollama Phi-3 for automated incident analysis
  \u2022 Reduced monitoring costs by 60% vs serverless alternatives
  \u2022 Deployed cloud-native architectures on Azure & AWS

DevOps Engineer | Personal Homelab Projects (2022 - Present)
  \u2022 Managed k3s Kubernetes cluster with Istio service mesh
  \u2022 Implemented Prometheus/Grafana/Loki monitoring stack
  \u2022 Automated deployments with GitHub Actions CI/CD
  \u2022 Configured Cloudflare DNS, CDN, and SSL termination

Software Engineering Intern | Academic Projects (2023 - 2024)
  \u2022 Built full-stack web applications for coursework
  \u2022 Developed real-time collaboration features
  \u2022 Implemented RESTful APIs with Node.js and Express
  \u2022 Created responsive frontends with React and TypeScript

EDUCATION
----------------------------------------------------------
B.S. Computer Science | University of Illinois (2023 - 2024)
  \u2022 Full-stack web development
  \u2022 Data structures and algorithms
  \u2022 Software engineering principles
  \u2022 Database systems and cloud computing

Certifications & Self-Study (2022 - Present)
  \u2022 Kubernetes Administration (CKA preparation)
  \u2022 Cloud Architecture (Azure/AWS)
  \u2022 DevOps best practices and CI/CD
  \u2022 Service mesh with Istio and Linkerd

SKILLS
----------------------------------------------------------
Cloud: Azure, AWS, Cloudflare, Docker, Kubernetes
Frontend: React.js, Next.js, TypeScript, CSS3, Tailwind
Backend: Node.js, Express, Python, FastAPI, GraphQL, REST
DevOps: GitHub Actions, Terraform, Prometheus, Grafana, Loki

PROJECTS
----------------------------------------------------------
meshwatch - Service mesh observability platform (*28)
  \u2022 Istio-based monitoring with real-time metrics
  \u2022 Cost-optimized vs serverless alternatives
  \u2022 AI-powered incident analysis with Ollama Phi-3

CS211 - Course management system (*12)
  \u2022 Full-stack web application with real-time updates
  \u2022 React frontend with Node.js/Express backend
  \u2022 PostgreSQL database with Redis caching

${'='.repeat(40)}
Generated from chai-homelab.com portfolio terminal
    `.trim();

    this.log(resumeText, 'default');
    this.log('\n\U0001f4a1 Tip: Copy this text or visit github.com/chaitea321 for PDF', 'info');
  }

  async showStatus() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== SYSTEM STATUS ===\n', 'info');

    // Show current online/offline status
    const isOnline = navigator.onLine;
    this.log(`Network: ${isOnline ? '\u2705 Online' : '\u274C Offline'}`, isOnline ? 'success' : 'warning');

    if (isOnline) {
      // Try to fetch live metrics from Azure Functions
      const status = await this.meshwatchAPI.getMetrics();
      if (status.success) {
        this.log(`MeshWatch: ${status.data || 'Metrics loaded via Azure Functions'}`, 'success');
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

    this.log('\n========================\n', 'info');
  }

  async showMinecraft() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== MINECRAFT SERVER STATUS ===\n', 'info');

    const isOnline = navigator.onLine;

    if (isOnline) {
      // Try to fetch live metrics from Azure Functions
      const status = await this.meshwatchAPI.getMinecraftMetrics();
      if (status.success) {
        this.log(`Server: ${status.data || 'Minecraft Server 1.21.4'}`, 'success');
        this.log(`TPS: ${status.tps || 20} | Players: ${status.players || 3}`, 'info');
        this.log(`Uptime: ${status.uptime || '99.8%'}`, 'success');
        this.log(`Discord Alerts Today: ${status.discordAlertsToday || 0}`, 'info');
        this.log(`Last GC Pause: ${status.lastGcPause || '45ms'}`, 'info');
      } else {
        this.log('Azure Functions not yet deployed, showing demo data...', 'warning');
        this.showMinecraftDemo();
      }
    } else {
      this.log('Offline mode - showing cached Minecraft metrics', 'warning');
      this.showMinecraftDemo();
    }

    this.log('\n========================\n', 'info');
  }

  showMinecraftDemo() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('Server: Minecraft PaperMC 1.21.4 (Java 21)', 'success');
    this.log('TPS: 20 | Players: 3', 'info');
    this.log('Uptime: 99.8% | Last GC Pause: 45ms', 'info');
    this.log('Discord Alerts Today: 0', 'info');
    this.log('\nTech Stack:', 'success');
    this.log('  \u2022 JMX Exporter - TPS, Heap, GC Metrics', 'info');
    this.log('  \u2022 RCON Protocol - Server Control', 'info');
    this.log('  \u2022 Discord.py Bot - 10 Slash Commands', 'info');
    this.log('  \u2022 Prometheus + Grafana - Real-time Dashboards', 'info');
    this.log('  \u2022 Ollama Phi-3 - AI Lag Analysis', 'info');
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
    this.log(`\u{1f916} AI thinking: ${question}`, 'info');

    // Try to query Ollama via Azure Functions proxy
    const response = await this.aiAssistant.query(question);

    if (response.success) {
      this.log('\n\u{1f916} AI Response:', 'success');
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
      // Fallback: use cached knowledge to answer
      this.log('\n\u{1f916} AI Response (cached knowledge):', 'success');
      const answer = this.getCachedAIAnswer(question);
      this.log(answer, 'info');
    }

    this.log('', 'default');
  }

  getCachedAIAnswer(question) {
    const q = question.toLowerCase();

    if (q.includes('meshwatch') || q.includes('monitoring')) {
      return 'MeshWatch is a cost-optimized service mesh observability platform built on k3s Kubernetes with Istio. It uses mTLS for service-to-service encryption, OpenTelemetry for distributed tracing, and integrates Ollama Phi-3 AI for automated incident analysis. Key cost savings: $5.12/month vs $7+/month for serverless alternatives - a 60% reduction.';
    }

    if (q.includes('kubernetes') || q.includes('kube') || q.includes('k8s')) {
      return 'I\'ve managed Kubernetes clusters using k3s (lightweight K3s) with Istio service mesh for production workloads. This includes ArgoCD GitOps patterns, External Secrets Operator with Azure Key Vault backend, cert-manager for TLS, and kube-prometheus-stack for monitoring. I also implemented canary deployments with Flagger for zero-downtime releases.';
    }

    if (q.includes('cost') || q.includes('save') || q.includes('price') || q.includes('$')) {
      return 'I reduced monitoring costs by 60% compared to serverless alternatives. My MeshWatch stack runs on a $5/month k3s cluster with Istio, Prometheus, Grafana, Loki, and Tempo - providing full observability (metrics, traces, logs) while saving ~$7/month vs cloud-native managed services like Datadog or AWS CloudWatch.';
    }

    if (q.includes('ollama') || q.includes('ai') || q.includes('phi')) {
      return 'I integrated Ollama Phi-3 on my k3s cluster for automated incident analysis. When alerts fire, the AI analyzes Prometheus metrics and Grafana dashboards to suggest root causes and remediation steps. This is accessed via Tailscale (outbound-only tunnel), keeping everything secure without opening firewall ports.';
    }

    if (q.includes('minecraft')) {
      return 'I built a full Minecraft server observability stack with Istio service mesh, Prometheus metrics (TPS, heap memory, GC pauses), and a Discord bot integration with 10 slash commands (/status, /players, /tps, etc.). It uses JMX Exporter for Java metrics and RCON protocol for server control. The AI-powered lag analysis helps identify performance bottlenecks in real-time.';
    }

    if (q.includes('azure') || q.includes('function')) {
      return 'I use Azure Blob Storage ($0.50/month) to host this portfolio statically, with Azure Functions serving as a secure API gateway for exposing Prometheus metrics and proxying Ollama AI queries. GitHub OAuth PKCE flow authenticates users before they can access live cluster metrics.';
    }

    if (q.includes('skills') || q.includes('stack') || q.includes('technology')) {
      return 'My core tech stack includes: Cloud - Azure, AWS, Cloudflare, Docker, Kubernetes. Frontend - React.js, Next.js, TypeScript, CSS3, PWA development. Backend - Node.js, Express, Python, FastAPI, GraphQL, REST APIs. DevOps - GitHub Actions, Terraform, Prometheus, Grafana, Loki, Istio service mesh.';
    }

    if (q.includes('education') || q.includes('degree') || q.includes('school')) {
      return 'I have a B.S. in Computer Science from the University of Illinois (CS211), with coursework in full-stack web development, data structures, software engineering principles, and database systems. I\'m also preparing for the CKA (Certified Kubernetes Administrator) certification through self-study.';
    }

    if (q.includes('experience') || q.includes('work') || q.includes('job')) {
      return 'I have three main experience areas: 1) Full Stack Engineer - building MeshWatch and integrating Ollama AI, reducing costs by 60%. 2) DevOps Engineer - managing k3s Kubernetes with Istio service mesh, Prometheus/Grafana/Loki monitoring, GitHub Actions CI/CD. 3) Software Engineering Intern - full-stack web apps, real-time collaboration features, RESTful APIs with Node.js/Express.';
    }

    if (q.includes('contact') || q.includes('email') || q.includes('linkedin') || q.includes('github')) {
      return 'You can find me at: Email - chaitanya.kumar@example.com, GitHub - github.com/chaitea321 (with 28+ stars on MeshWatch), LinkedIn - linkedin.com/in/chaitea321, Portfolio - chai-homelab.com';
    }

    return 'Great question! I can provide detailed answers about my projects (MeshWatch, Minecraft monitoring, CS211), technical skills (Kubernetes, Azure, React, Python), cost optimization achievements (60% savings), or career background. Try asking about any of these topics for a comprehensive answer.';
  }

  toggleTheme() {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('theme-retro');
    const isRetro = document.body.classList.contains('theme-retro');
    this.log(`\n${isRetro ? '\u2705' : '\u26A0'} Theme toggled to ${isRetro ? 'retro' : 'synthwave'} mode`, 'info');
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

      // Schedule next project after delay (shorter if demo mode)
      const delay = 4000; // 4 seconds per project in demo mode
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

  // ---- Core Methods ---

  log(message, type = 'default') {
    if (typeof document === 'undefined' || !this.output) return;
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = message;
    this.output.appendChild(line);
    this.scrollToBottom();

    // Announce to screen readers (first and last lines only to avoid spam)
    if (this.announcementEl && message.trim() && !message.startsWith('   ')) {
      void this.announceMessage(message.trim());
    }
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
    const value = this.input.value;
    const matches = this.commandHistory.filter(cmd =>
      cmd.startsWith(value.toLowerCase())
    );

    if (matches.length === 1) {
      this.input.value = matches[0];
    } else if (matches.length > 1) {
      this.log('\nMatches: ' + matches.join(', '), 'info');
    }
  }
}

export default Terminal;
