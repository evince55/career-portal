// Three.js Scene Manager — Core lifecycle, WebGL detection, auto-detect
// Handles renderer, camera, scene composition, render loop coordination
// Mobile-optimized: lowers quality on mobile but still renders

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

class ThreeManager {
  constructor(options = {}) {
    this.options = {
      pixelRatio: 2,
      antialias: true,
      alpha: true,
      ...options
    };
    this.disabled = false;
    this.isMobile = false;
    this.gpuTier = 1;
    this.disableAnimations = false;
    this.components = [];
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;
    this._rafId = null;
    this._lastTime = 0;
    this._isVisible = true;
    this._onResize = null;
    this.detect();
  }

  detect() {
    if (typeof document === 'undefined') {
      this.disabled = true;
      return;
    }

    // Detect mobile — don't disable, just tune quality
    this.isMobile = window.innerWidth < 1024;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      this.disableAnimations = true;
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      this.disabled = true;
      return;
    }

    const pxRatio = window.devicePixelRatio || 1;
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    // Mobile: lower GPU tier, even on capable hardware
    if (this.isMobile) {
      this.gpuTier = pxRatio >= 2 && maxTextureSize >= 4096 ? 1 : 0;
      // Also reduce pixel ratio on mobile to save GPU
      this.options.pixelRatio = Math.min(this.options.pixelRatio, pxRatio > 2 ? 1.5 : 1);
      // Disable antialiasing on mobile for performance
      this.options.antialias = false;
    } else if (pxRatio >= 2 && maxTextureSize >= 4096) {
      this.gpuTier = 2;
    }

    const ua = navigator.userAgent.toLowerCase();
    // Only disable on very low-end Android devices
    if (this.isMobile && /android/.test(ua) && pxRatio < 1.5 && maxTextureSize < 2048) {
      this.disabled = true;
      return;
    }

    // Also disable on very small screens (under 360px) — too cramped for 3D
    if (window.innerWidth < 360) {
      this.disabled = true;
      return;
    }
  }

  init() {
    if (this.disabled || typeof document === 'undefined') {
      return { disabled: true };
    }

    const width = this.options.width || window.innerWidth;
    const height = this.options.height || window.innerHeight;

    if (width <= 0 || height <= 0) {
      this.disabled = true;
      return { disabled: true };
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.alpha,
      powerPreference: 'low-power'
    });
    this.renderer.setSize(width, height);

    // On mobile, cap pixel ratio to save GPU
    const targetPR = this.options.pixelRatio;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, targetPR));

    // On mobile, reduce shadow map quality (if shadows are added later)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.canvas = this.renderer.domElement;
    this.canvas.className = 'three-canvas';
    // Pointer events controlled by CSS (.three-canvas has pointer-events: none by default)
    // Do NOT set inline pointer-events here — it would override the CSS class rule.

    // Mouse tracking — normalized coords [-1..1] for all components to read
    this.mouse = { x: 0, y: 0 };
    this._onPointerMove = (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', this._onPointerMove);

    this.scene = new THREE.Scene();

    // Slightly wider FOV on mobile for more immersion on small screens
    const fov = this.isMobile ? 65 : 60;
    const aspect = width / height;
    const near = 0.1;
    const far = 500;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    // Adjust camera position for mobile — bring objects closer on small screens
    if (this.isMobile) {
      this.camera.position.z = 2;
    }

    document.body.insertBefore(this.canvas, document.body.firstChild);

    this._onResize = () => {
      if (!this.renderer || !this.camera) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();

      // Re-detect mobile on resize (orientation change)
      const wasMobile = this.isMobile;
      this.isMobile = w < 1024;
    };

    window.addEventListener('resize', this._onResize);

    document.addEventListener('visibilitychange', () => {
      this._isVisible = document.visibilityState === 'visible';
    });

    this._startLoop();

    return {
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      animate: (frame) => this._render(frame),
      dispose: () => this.dispose()
    };
  }

  _startLoop() {
    this._lastTime = performance.now();
    const loop = (time) => {
      if (!this._isVisible) {
        this._rafId = requestAnimationFrame(loop);
        return;
      }
      const delta = Math.min((time - this._lastTime) / 1000, 0.1);
      this._lastTime = time;
      for (const comp of this.components) {
        comp.frame(delta);
        if (!this.disableAnimations && comp.animate) {
          comp.animate(delta);
        }
      }
      this._render(time);
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  _render(_time) {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  addComponent(component) {
    if (component.init) component.init(this);
    this.components.push(component);
  }

  getComponents() {
    return [...this.components];
  }

  removeComponent(name) {
    this.components = this.components.filter(c => c.name !== name);
  }

  dispose() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
    if (this._onPointerMove) {
      window.removeEventListener('pointermove', this._onPointerMove);
      this._onPointerMove = null;
    }
    for (const comp of this.components) {
      if (comp.dispose) comp.dispose();
    }
    this.components = [];
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.canvas = null;
  }
}

export default ThreeManager;
export { THREE, THREE_CDN };
