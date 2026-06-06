class Terminal {
  constructor() {
    this.output = typeof document !== 'undefined' ? document.getElementById('terminal-output') : null;
    this.input = typeof document !== 'undefined' ? document.getElementById('command-input') : null;
    this.history = [];
    this.historyIndex = -1;
    this.commandHistory = ['help', 'projects', 'skills', 'about', 'contact'];
    
    this.init();
  }
  
  init() {
    if (this.output) {
      this.output.innerHTML = '';
    }
    this.typewriterEffect(
      '> Welcome to Chaitanya Kumar\'s portfolio terminal v1.0.0\n',
      () => this.typewriterEffect('> Type "help" to see available commands\n', () => this.bindEvents())
    );
  }
  
  bindEvents() {
    if (typeof document !== 'undefined') {
      if (this.input) {
        this.input.addEventListener('keydown', (e) => this.handleInput(e));
        this.input.addEventListener('focus', () => this.input.scrollIntoView({ behavior: 'smooth' }));
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
    const args = parts.slice(1);
    
    switch (cmd) {
      case 'help': this.showHelp(); break;
      case 'projects': this.showProjects(args); break;
      case 'skills': this.showSkills(args); break;
      case 'about': this.showAbout(); break;
      case 'contact': this.showContact(); break;
      case 'clear': 
        if (typeof document !== 'undefined' && this.output) {
          this.output.innerHTML = '';
        }
        break;
      case 'theme': this.toggleTheme(); break;
      default: this.log(`Unknown command: ${cmd}`, 'warning');
    }
  }
  
  showHelp() {
    const helpText = [
      { cmd: 'help', desc: 'Show this help message' },
      { cmd: 'projects [filter]', desc: 'List GitHub projects (optional: filter by keyword)' },
      { cmd: 'skills [category]', desc: 'Show technical skills (optional: category)' },
      { cmd: 'about', desc: 'About Chaitanya Kumar' },
      { cmd: 'contact', desc: 'Contact information' },
      { cmd: 'clear', desc: 'Clear terminal output' },
      { cmd: 'theme', desc: 'Toggle synthwave theme' }
    ];
    
    this.log('\n=== AVAILABLE COMMANDS ===', 'info');
    helpText.forEach(({ cmd, desc }) => {
      this.log(`  ${cmd.padEnd(15)} - ${desc}`, 'success');
    });
    this.log('========================\n', 'info');
  }
  
  showProjects(filter = '') {
    this.log('\n=== GITHUB PROJECTS ===\n', 'info');
    
    if (typeof document === 'undefined' || !this.output) return;
    
    const projects = [
      {
        name: 'CS211',
        description: 'Full-stack course management system with real-time updates',
        link: 'https://github.com/chaitea321/CS211',
        stars: 12,
        forks: 3
      },
      {
        name: 'minecraft-monitoring',
        description: 'Istio service mesh observability platform for Minecraft servers',
        link: 'https://github.com/chaitea321/minecraft-monitoring',
        stars: 28,
        forks: 7
      }
    ];
    
    const filtered = filter 
      ? projects.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || 
                            p.description.toLowerCase().includes(filter.toLowerCase()))
      : projects;
    
    if (filtered.length === 0) {
      this.log('No projects found matching criteria', 'warning');
    } else {
      filtered.forEach(project => {
        const card = document.createElement('div');
        card.className = 'output-line project-card';
        card.innerHTML = `
          <div class="project-name">📦 ${project.name}</div>
          <div class="project-desc">${project.description}</div>
          <div>⭐ ${project.stars} stars | 🔀 ${project.forks} forks</div>
          <a href="${project.link}" target="_blank" class="project-link">View on GitHub →</a>
        `;
        this.output.appendChild(card);
      });
    }
    
    this.log('\n========================\n', 'info');
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
        this.log(`\n🔹 ${cat.toUpperCase()}`, 'success');
        skills[cat].forEach(skill => {
          this.log(`   • ${skill}`, 'info');
        });
      }
    });
    
    this.log('\n========================\n', 'info');
  }
  
  showAbout() {
    if (typeof document === 'undefined' || !this.output) return;
    const aboutText = [
      '',
      '👋 Hello! I\'m Chaitanya Kumar',
      '📍 Aurora, IL, USA',
      '',
      'Full Stack Engineer passionate about cloud-native architectures',
      'and developer experience. Currently building MeshWatch - a cost-',
      'optimized service mesh observability platform on k3s.',
      '',
      '🎯 What I do:',
      '   • Design scalable microservices with Istio & OpenTelemetry',
      '   • Build React/Next.js frontends with progressive enhancement',
      '   • Deploy serverless APIs on Azure/AWS',
      '   • Automate CI/CD pipelines with GitHub Actions',
      '',
      '💡 Recently:',
      '   • Integrated Ollama Phi-3 for automated incident analysis',
      '   • Reduced monitoring costs by 60% vs serverless alternatives',
      '   • Created FAANG-quality portfolio with synthwave terminal theme',
      '',
      '🎓 Currently exploring:',
      '   • WASM for browser-based compute',
      '   • Edge computing with Cloudflare Workers',
      '   • AI-powered DevOps (AIOps)',
      '',
      '========================\n'
    ];
    
    aboutText.forEach(line => {
      if (line.startsWith('🎯') || line.startsWith('💡') || line.startsWith('🎓')) {
        this.log(line, 'success');
      } else if (line.startsWith('   •') || line.startsWith('   •')) {
        this.log(line, 'info');
      } else {
        this.log(line, 'default');
      }
    });
  }
  
  showContact() {
    if (typeof document === 'undefined' || !this.output) return;
    this.log('\n=== CONTACT ===\n', 'info');
    this.log('📧 Email: chaitanya.kumar@example.com', 'success');
    this.log('🔗 GitHub: github.com/chaitea321', 'success');
    this.log('💼 LinkedIn: linkedin.com/in/chaitea321', 'success');
    this.log('🌐 Portfolio: chai-homelab.com', 'success');
    this.log('========================\n', 'info');
  }
  
  toggleTheme() {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('theme-retro');
    const isRetro = document.body.classList.contains('theme-retro');
    this.log(`\n${isRetro ? '✅' : '⚠️'} Theme toggled to ${isRetro ? 'retro' : 'synthwave'} mode`, 'info');
  }
  
  log(message, type = 'default') {
    if (typeof document === 'undefined' || !this.output) return;
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = message;
    this.output.appendChild(line);
    this.scrollToBottom();
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
    if (typeof document !== 'undefined' && this.output) {
      this.output.scrollTop = this.output.scrollHeight;
    }
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
