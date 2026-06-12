class Achievements {
  constructor() {
    this.storageKey = 'portfolio-achievements';
    this.achievements = [
      { id: 'terminal-novice', name: 'Terminal Novice', icon: '\u{1f3af}', desc: 'Executed 5 commands', condition: (s) => s.commandsUsed >= 5 },
      { id: 'explorer', name: 'Project Explorer', icon: '\u{1f570}\ufe0f', desc: 'Viewed 3+ projects', condition: (s) => s.projectsViewed >= 3 },
      { id: 'skills-visual', name: 'Skills Chart', icon: '\u{1f4ca}', desc: 'Used skills-visual command', condition: (s) => s.skillsVisual },
      { id: 'timeline', name: 'Timeline Viewer', icon: '\u{1f5d3}\ufe0f', desc: 'Viewed project timeline', condition: (s) => s.timelineViewed },
      { id: 'neofetch', name: 'System Info', icon: '\u{1f4bb}', desc: 'Ran neofetch command', condition: (s) => s.neofetchUsed },
      { id: 'fortune', name: 'Fortune Teller', icon: '\u{1f3ae}', desc: 'Read a fortune', condition: (s) => s.fortuneRead >= 1 },
      { id: 'cowsay', name: 'Cow Sayer', icon: '\u{1f42e}', desc: 'Made the cow speak', condition: (s) => s.cowsayUsed },
      { id: 'theme-switcher', name: 'Theme Switcher', icon: '\u{1f3b3}', desc: 'Changed theme twice', condition: (s) => s.themeChanges >= 2 },
      { id: 'demo-master', name: 'Demo Master', icon: '\u{1f3ae}', desc: 'Ran demo mode', condition: (s) => s.demoUsed },
      { id: 'full-explorer', name: 'Full Explorer', icon: '\u{1f3c6}', desc: 'Used 10+ unique commands', condition: (s) => s.commandsUsed >= 10 }
    ];
    this.state = this.loadState();
  }

  loadState() {
    if (typeof localStorage === 'undefined') return this.defaultState();
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return this.defaultState();
  }

  defaultState() {
    return {
      commandsUsed: 0, projectsViewed: 0, skillsVisual: false, timelineViewed: false,
      neofetchUsed: false, fortuneRead: 0, cowsayUsed: false, themeChanges: 0,
      demoUsed: false, commandsUsedList: []
    };
  }

  saveState() {
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(this.storageKey, JSON.stringify(this.state)); } catch (e) { /* ignore */ }
    }
  }

  record(command, args = '') {
    const cmd = command.toLowerCase();
    this.state.commandsUsed++;
    if (!this.state.commandsUsedList.includes(cmd)) {
      this.state.commandsUsedList.push(cmd);
    }
    switch (cmd) {
      case 'skills-visual': this.state.skillsVisual = true; break;
      case 'timeline': this.state.timelineViewed = true; break;
      case 'neofetch': this.state.neofetchUsed = true; break;
      case 'fortune': this.state.fortuneRead++; break;
      case 'cowsay': this.state.cowsayUsed = true; break;
      case 'demo': this.state.demoUsed = true; break;
    }
    if (cmd === 'theme') this.state.themeChanges++;
    if (cmd === 'project' && args) this.state.projectsViewed++;
    this.saveState();
    return this.checkUnlocks();
  }

  checkUnlocks() {
    const newUnlocks = [];
    this.achievements.forEach(a => {
      const unlocked = this.state[`unlocked_${a.id}`];
      if (!unlocked && a.condition(this.state)) {
        this.state[`unlocked_${a.id}`] = true;
        newUnlocks.push(a);
      }
    });
    return newUnlocks;
  }

  getUnlocked() {
    return this.achievements.filter(a => this.state[`unlocked_${a.id}`]);
  }

  getAll() {
    return this.achievements;
  }

  getCount() {
    return this.getUnlocked().length;
  }
}

export default Achievements;
