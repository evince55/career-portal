class AudioController {
  constructor() {
    this.enabled = false;
    this.audioContext = typeof window !== 'undefined' 
      ? new (window.AudioContext || window.webkitAudioContext)() 
      : null;
    this.keys = new Set();
    
    this.init();
  }
  
  init() {
    if (typeof document !== 'undefined') {
      const toggle = document.getElementById('audio-toggle');
      
      if (toggle) {
        toggle.addEventListener('click', () => this.toggle());
      }
    }
    
    this.loadKeystrokeSounds();
  }
  
  loadKeystrokeSounds() {
    this.sounds = {
      keydown: this.createTone(200, 0.05),
      enter: this.createTone(400, 0.1),
      backspace: this.createTone(150, 0.03),
      error: this.createTone(100, 0.15)
    };
  }
  
  createTone(freq, duration) {
    return () => {
      if (!this.enabled) return;
      
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    };
  }
  
  playSound(type) {
    if (this.sounds[type]) {
      this.sounds[type]();
    }
  }
  
  toggle() {
    this.enabled = !this.enabled;
    if (typeof document !== 'undefined') {
      const icon = document.querySelector('.audio-icon');
      
      if (icon) {
        icon.textContent = this.enabled ? '🔊' : '🔇';
      }
      
      if (this.enabled && this.audioContext) {
        this.audioContext.resume();
      }
      
      if (typeof document !== 'undefined') {
        void document.body?.classList.toggle('audio-enabled', this.enabled);
      }
    }
    
    this.savePreference();
  }
  
  savePreference() {
    localStorage.setItem('portfolio-audio-enabled', this.enabled);
  }
  
  loadPreference() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('portfolio-audio-enabled');
      if (saved === 'true') {
        this.enabled = true;
        if (typeof document !== 'undefined') {
          const icon = document.querySelector('.audio-icon');
          if (icon) icon.textContent = '🔊';
          void document.body?.classList.add('audio-enabled');
        }
      }
    }
  }
  
  handleInput(key) {
    switch (key) {
      case 'Enter':
        this.playSound('enter');
        break;
      case 'Backspace':
        this.playSound('backspace');
        break;
      default:
        if (key.length === 1) {
          this.playSound('keydown');
        }
    }
  }
}

const audioController = new AudioController();
audioController.loadPreference();

export default audioController;
