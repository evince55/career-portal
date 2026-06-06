class CommandParser {
  constructor() {
    this.commands = new Map();
    this.registerDefaultCommands();
  }
  
  registerDefaultCommands() {
    this.commands.set('help', {
      description: 'Show available commands',
      handler: (args, terminal) => terminal.showHelp()
    });
    
    this.commands.set('projects', {
      description: 'List GitHub projects',
      handler: (args, terminal) => terminal.showProjects(args[0])
    });
    
    this.commands.set('skills', {
      description: 'Show technical skills',
      handler: (args, terminal) => terminal.showSkills(args[0])
    });
    
    this.commands.set('about', {
      description: 'About Chaitanya Kumar',
      handler: (args, terminal) => terminal.showAbout()
    });
    
    this.commands.set('contact', {
      description: 'Contact information',
      handler: (args, terminal) => terminal.showContact()
    });
    
    this.commands.set('clear', {
      description: 'Clear terminal output',
      handler: (args, terminal) => {
        if (typeof document !== 'undefined' && terminal.output) {
          terminal.output.innerHTML = '';
        }
      }
    });
    
    this.commands.set('theme', {
      description: 'Toggle synthwave theme',
      handler: (args, terminal) => terminal.toggleTheme()
    });
  }
  
  registerCommand(name, config) {
    this.commands.set(name, {
      description: config.description || 'No description',
      handler: config.handler
    });
  }
  
  parse(command) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    return {
      command: cmd,
      arguments: args,
      exists: this.commands.has(cmd)
    };
  }
  
  execute(command, terminal) {
    const parsed = this.parse(command);
    
    if (parsed.exists) {
      const cmd = this.commands.get(parsed.command);
      cmd.handler(parsed.arguments, terminal);
    } else {
      terminal.log(`Unknown command: ${parsed.command}`, 'warning');
    }
  }
  
  listCommands() {
    const result = [];
    this.commands.forEach((config, name) => {
      result.push({ name, description: config.description });
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export default CommandParser;
