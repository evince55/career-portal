class AudioController {
  constructor() {
    this.enabled = false;
    this.audioContext = null;
    this.soundEnabled = false;
    this.keys = new Set();
    this._initialized = false;
    this._soundQueue = [];
    this._currentSound = null;
    
    // Try to initialize Web Audio API (standard browser API)
    try {
      if (typeof window !== 'undefined' && typeof Audio === 'function') {
        // Use standard Audio API for tone generation
        this.soundEnabled = true;
      }
    } catch (e) {
      console.warn('[AudioController] Web Audio API not available, sounds disabled');
    }
    
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
      if (!this.enabled || !this.soundEnabled) return Promise.resolve();
      
      // Generate a WAV data URI for the tone and play it via standard Audio API
      const sampleRate = 48000;
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = new Float32Array(numSamples);
      
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Apply envelope to avoid clicking
        const envelope = Math.min(i / (sampleRate * 0.005), 1) * Math.max(1 - (i / numSamples), 0);
        buffer[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
      }
      
      // Convert to WAV format
      const wavBuffer = this._floatToWav(buffer, sampleRate);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      return new Promise(resolve => {
        const audio = new Audio(url);
        audio.play().catch(() => {});
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(url);
          resolve();
        });
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          resolve();
        });
        // Fallback timeout in case 'ended' never fires
        setTimeout(resolve, duration * 1000 + 100);
      });
    };
  }
  
  _floatToWav(samples, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = bitsPerSample / 8;
    const dataLength = samples.length * byteRate;
    const headerLength = 44;
    const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(arrayBuffer);
    
    // RIFF header
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this._writeString(view, 8, 'WAVE');
    // fmt chunk
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint16(28, bitsPerSample, true);
    this._writeString(view, 32, 'data');
    view.setUint32(36, dataLength, true);
    
    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const val = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, val, true);
      offset += 2;
    }
    
    return arrayBuffer;
  }
  
  _writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  async playSound(type) {
    if (!this.sounds[type]) return;
    
    // Add to queue and process sequentially
    this._soundQueue.push(this.sounds[type]);
    
    // If no sound is currently playing, start processing the queue
    if (!this._currentSound) {
      await this._processQueue();
    }
  }
  
  async _processQueue() {
    while (this._soundQueue.length > 0 && this.enabled && this.soundEnabled) {
      const soundFn = this._soundQueue.shift();
      this._currentSound = soundFn;
      
      try {
        await soundFn();
      } catch (e) {
        console.warn('[AudioController] Sound playback failed:', e.message);
      }
      
      this._currentSound = null;
    }
  }
  
  toggle() {
    this.enabled = !this.enabled;
    if (typeof document !== 'undefined') {
      const icon = document.querySelector('.audio-icon');
      
      if (icon) {
        icon.textContent = this.enabled ? '🔊' : '🔇';
      }
      
      void document.body?.classList.toggle('audio-enabled', this.enabled);
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
  
  async handleInput(key) {
    switch (key) {
      case 'Enter':
        await this.playSound('enter');
        break;
      case 'Backspace':
        await this.playSound('backspace');
        break;
      default:
        if (key.length === 1) {
          await this.playSound('keydown');
        }
    }
  }
}

const audioController = new AudioController();
audioController.loadPreference();

export default audioController;
