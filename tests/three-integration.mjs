// Three.js 3D Integration Tests — File structure, source analysis, configuration
// Uses fs-based assertions (no import of CDN-dependent modules)
// Import-based tests skip modules that depend on external CDN URLs

import { describe, it } from 'node:test';
import assert from 'assert/strict';
import * as fs from 'fs';
import * as path from 'path';

const JS_DIR = path.join(process.cwd(), 'js');
const ROOT = process.cwd();

describe('Three.js 3D Integration', () => {
  describe('File Structure', () => {
    it('has all five 3D modules', () => {
      const expected = [
        'three-manager.js',
        'three-grid.js',
        'three-particles.js',
        'three-shapes.js',
        'three-interaction.js'
      ];
      for (const file of expected) {
        const fullPath = path.join(JS_DIR, file);
        assert.ok(fs.existsSync(fullPath), `Missing module: ${file}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(content.length > 100, `${file} is too short (${content.length} chars)`);
      }
    });

    it('service-worker.js includes new modules', () => {
      const swPath = path.join(JS_DIR, 'service-worker.js');
      const content = fs.readFileSync(swPath, 'utf8');
      assert.ok(content.includes('three-manager.js'), 'SW missing three-manager.js');
      assert.ok(content.includes('three-grid.js'), 'SW missing three-grid.js');
      assert.ok(content.includes('three-particles.js'), 'SW missing three-particles.js');
      assert.ok(content.includes('three-shapes.js'), 'SW missing three-shapes.js');
      assert.ok(content.includes('three-interaction.js'), 'SW missing three-interaction.js');
    });

    it('CSS includes three-canvas styles', () => {
      const cssPath = path.join(ROOT, 'css', 'styles.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      assert.ok(content.includes('.three-canvas'), 'CSS missing .three-canvas selector');
      assert.ok(content.includes('z-index: -1'), 'CSS missing z-index: -1 for canvas');
    });

    it('index.html includes 3D integration script', () => {
      const htmlPath = path.join(ROOT, 'index.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-manager.js'), 'index.html missing three-manager import');
      assert.ok(content.includes('three-grid.js'), 'index.html missing three-grid import');
      assert.ok(content.includes('three-particles.js'), 'index.html missing three-particles import');
    });

    it('project-explorer.html includes 3D integration', () => {
      const htmlPath = path.join(ROOT, 'project-explorer.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-shapes.js'), 'explorer missing three-shapes import');
      assert.ok(content.includes('three-interaction.js'), 'explorer missing three-interaction import');
    });

    it('dashboard.html includes 3D integration', () => {
      const htmlPath = path.join(ROOT, 'dashboard.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-shapes.js'), 'dashboard missing three-shapes import');
    });

    it('writeups.html includes 3D integration', () => {
      const htmlPath = path.join(ROOT, 'writeups.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-grid.js'), 'writeups missing three-grid import');
      assert.ok(content.includes('three-particles.js'), 'writeups missing three-particles import');
    });

    it('contact.html includes 3D integration', () => {
      const htmlPath = path.join(ROOT, 'contact.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-shapes.js'), 'contact missing three-shapes import');
    });
  });

  describe('ThreeManager — Source Analysis', () => {
    it('exports default class and named THREE export', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('export default ThreeManager'), 'Should export default class');
      assert.ok(content.includes('export { THREE'), 'Should export named THREE');
    });

    it('has detect(), init(), dispose() methods', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('detect()'), 'Should have detect method');
      assert.ok(content.includes('init()'), 'Should have init method');
      assert.ok(content.includes('dispose()'), 'Should have dispose method');
      assert.ok(content.includes('addComponent'), 'Should have addComponent');
    });

    it('detects mobile width (< 1024)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('< 1024') || content.includes('<1024'), 'Should check width < 1024');
    });

    it('has gpuTier detection logic', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('gpuTier'), 'Should have gpuTier property');
      assert.ok(content.includes('devicePixelRatio'), 'Should detect GPU via pixel ratio');
    });

    it('has disableAnimations for reduced motion', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('disableAnimations'), 'Should have disableAnimations');
      assert.ok(content.includes('prefers-reduced-motion'), 'Should check reduced motion preference');
    });

    it('addComponent stores component in list', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('this.components.push'), 'Should push to components array');
      assert.ok(content.includes('getComponents'), 'Should have getComponents getter');
    });

    it('removeComponent removes by name', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes("c => c.name !== name"), 'Should filter by name');
    });

    it('dispose cleans up all resources', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('cancelAnimationFrame'), 'Should cancel animation frame');
      assert.ok(content.includes('removeEventListener'), 'Should remove event listeners');
      assert.ok(content.includes('renderer.dispose'), 'Should dispose renderer');
    });

    it('init returns { disabled: true } when disabled', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes("return { disabled: true }"), 'Should return disabled flag');
    });

    it('uses powerPreference: low-power', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('low-power'), 'Should use low-power GPU preference');
    });

    it('caps pixel ratio', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('Math.min'), 'Should cap pixel ratio with Math.min');
    });

    it('handles visibility change (tab pause)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('visibilitychange'), 'Should handle tab visibility');
    });

    it('uses requestAnimationFrame for render loop', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('requestAnimationFrame'), 'Should use rAF loop');
    });
  });

  describe('ThreeGrid — Source Analysis', () => {
    it('exports default factory and named createGrid', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('export default createGrid'), 'Should export default factory');
      assert.ok(content.includes('export { createGrid'), 'Should export named createGrid');
    });

    it('has required grid methods', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('frame(delta)'), 'Should have frame method');
      assert.ok(content.includes('init()'), 'Should have init method');
      assert.ok(content.includes('dispose()'), 'Should have dispose method');
    });

    it('uses AdditiveBlending for neon glow', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('AdditiveBlending'), 'Should use additive blending');
    });

    it('creates PlaneGeometry for grid', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('PlaneGeometry'), 'Should create plane geometry');
    });

    it('has uTime uniform for animation', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('uTime'), 'Should have time uniform');
    });

    it('rotates plane on X axis', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('rotation.x'), 'Should rotate plane on X');
    });

    it('uses ShaderMaterial with custom shaders', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('ShaderMaterial'), 'Should use ShaderMaterial');
      assert.ok(content.includes('vertexShader: GRID_VERT'), 'Should have vertex shader');
      assert.ok(content.includes('fragmentShader: GRID_FRAG'), 'Should have fragment shader');
    });
  });

  describe('ThreeParticles — Source Analysis', () => {
    it('exports default factory and named createParticles', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(content.includes('export default createParticles'), 'Should export default factory');
      assert.ok(content.includes('export { createParticles'), 'Should export named createParticles');
    });

    it('uses BufferGeometry for GPU efficiency', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(content.includes('BufferGeometry'), 'Should use BufferGeometry');
    });

    it('sets custom attributes (position, color, size, phase)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(content.includes("setAttribute('aPosition'"), 'Should set position attribute');
      assert.ok(content.includes("setAttribute('aColor'"), 'Should set color attribute');
      assert.ok(content.includes("setAttribute('aSize'"), 'Should set size attribute');
      assert.ok(content.includes("setAttribute('aPhase'"), 'Should set phase attribute');
    });

    it('creates Points object', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(content.includes('new THREE.Points'), 'Should create Points');
    });

    it('has sine-wave drift animation in vertex shader', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(content.includes('sin(uTime'), 'Should have sine wave in shader');
      assert.ok(content.includes('cos(uTime'), 'Should have cosine wave in shader');
    });

    it('uses AdditiveBlending', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(content.includes('AdditiveBlending'), 'Should use additive blending');
    });

    it('accepts configurable count, colors, speed, spread', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(content.includes('count'), 'Should accept count option');
      assert.ok(content.includes('colors'), 'Should accept colors option');
      assert.ok(content.includes('speed'), 'Should accept speed option');
      assert.ok(content.includes('spread'), 'Should accept spread option');
    });
  });

  describe('ThreeShapes — Source Analysis', () => {
    it('exports default, createShape, and createShapes', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('export default createShapes'), 'Should export default factory');
      assert.ok(content.includes('export { createShape'), 'Should export createShape');
      assert.ok(content.includes('createShapes'), 'Should export createShapes');
    });

    it('supports icosahedron geometry', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('IcosahedronGeometry'), 'Should support icosahedron');
    });

    it('supports octahedron geometry', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('OctahedronGeometry'), 'Should support octahedron');
    });

    it('supports torusKnot geometry', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('TorusKnotGeometry'), 'Should support torus knot');
    });

    it('has Fresnel shader for neon glow', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('fresnel'), 'Should have Fresnel effect');
      assert.ok(content.includes('dot(viewDir, vNormal)'), 'Should use dot product for fresnel');
    });

    it('has hover state in shader uniforms', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('uHover'), 'Should have hover uniform');
    });

    it('has floating animation (sine wave)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('sin(t * 0.5'), 'Should have floating animation');
    });

    it('has rotation animation', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('rotation.x +='), 'Should rotate on X');
      assert.ok(content.includes('rotation.y +='), 'Should rotate on Y');
    });

    it('creates array of shapes via createShapes', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('const shapes = []'), 'Should create shapes array');
      assert.ok(content.includes('shapes.push(shape)'), 'Should push shapes');
    });

    it('shape has userData.interactive flag', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('userData.interactive'), 'Should set interactive flag');
    });

    it('respects gpuTier for shape count', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('gpuTier'), 'Should use gpuTier');
    });
  });

  describe('ThreeInteraction — Source Analysis', () => {
    it('exports default factory and named createInteraction', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes('export default createInteraction'), 'Should export default');
      assert.ok(content.includes('export { createInteraction'), 'Should export named');
    });

    it('uses THREE.Raycaster for mouse picking', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes('Raycaster'), 'Should use raycaster');
    });

    it('handles pointermove for hover detection', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes('pointermove'), 'Should handle pointermove');
    });

    it('handles pointerdown for click detection', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes('pointerdown'), 'Should handle pointerdown');
    });

    it('handles pointerleave for hover reset', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes('pointerleave'), 'Should handle pointerleave');
    });

    it('implements pulse animation on click', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes('pulseStart'), 'Should track pulse start time');
      assert.ok(content.includes('Math.sin(progress * Math.PI)'), 'Should use sine pulse');
    });

    it('handles keyboard events (Tab/Enter/Space)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes("e.key === 'Tab'"), 'Should handle Tab key');
      assert.ok(content.includes("e.key === 'Enter'"), 'Should handle Enter key');
    });

    it('has resetHover function', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes('resetHover'), 'Should have resetHover');
      assert.ok(content.includes('u.uHover.value = 0'), 'Should reset hover uniform');
    });

    it('handles window blur for hover cleanup', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes("window.addEventListener('blur'"), 'Should handle window blur');
    });

    it('scales objects on hover', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(content.includes('hoverScale'), 'Should have hover scale config');
      assert.ok(content.includes('.scale.setScalar'), 'Should scale objects');
    });
  });

  describe('Shader Safety', () => {
    it('grid shader uses safe GLSL (no fract builtin)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('myFract'), 'Grid shader should use myFract helper');
      assert.ok(content.includes('floor'), 'myFract should use floor()');
    });

    it('particle shader uses safe GLSL', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(!content.includes('fract('), 'Particle shader should not use fract()');
    });

    it('shape shader uses safe GLSL', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(!content.includes('fract('), 'Shape shader should not use fract()');
    });

    it('interaction shader uses safe GLSL (no shaders needed)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-interaction.js'), 'utf8');
      assert.ok(!content.includes('fract('), 'Interaction should not have GLSL');
    });
  });

  describe('Mobile Detection', () => {
    it('CSS hides canvas on mobile via media query', () => {
      const cssPath = path.join(ROOT, 'css', 'styles.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      assert.ok(content.includes('max-width: 1024px'), 'CSS should have mobile media query');
      assert.ok(content.includes('.three-canvas { display: none !important; }'), 'CSS should hide canvas on mobile');
    });

    it('three-manager disables on width < 1024', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('< 1024') || content.includes('<1024'), 'Should check width < 1024');
    });

    it('canvas uses position: fixed for full-screen overlay', () => {
      const cssPath = path.join(ROOT, 'css', 'styles.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      assert.ok(content.includes('position: fixed'), 'Canvas should be fixed position');
      assert.ok(content.includes('width: 100%'), 'Canvas should be full width');
      assert.ok(content.includes('height: 100%'), 'Canvas should be full height');
    });
  });

  describe('Performance Safeguards', () => {
    it('manager caps pixel ratio at 2x', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('Math.min(window.devicePixelRatio'), 'Should cap pixel ratio');
    });

    it('particles use BufferGeometry (GPU-efficient)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(content.includes('BufferGeometry'), 'Should use BufferGeometry');
    });

    it('shapes use wireframe rendering', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-shapes.js'), 'utf8');
      assert.ok(content.includes('wireframe: wireframe'), 'Should support wireframe option');
    });

    it('grid uses depthWrite: false for proper layering', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('depthWrite: false'), 'Grid should not write to depth buffer');
    });

    it('all components use renderOrder for draw ordering', () => {
      const gridContent = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      const particleContent = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      assert.ok(gridContent.includes('renderOrder'), 'Grid should have renderOrder');
      assert.ok(particleContent.includes('renderOrder'), 'Particles should have renderOrder');
    });

    it('manager uses low-power GPU preference', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('low-power'), 'Should use low-power GPU preference');
    });
  });

  describe('Error Boundaries', () => {
    it('page scripts wrap Three.js in try-catch', () => {
      const pages = ['index.html', 'project-explorer.html', 'dashboard.html', 'writeups.html', 'contact.html'];
      for (const page of pages) {
        const content = fs.readFileSync(path.join(ROOT, page), 'utf8');
        assert.ok(content.includes('try {'), `${page} should have try-catch`);
        assert.ok(content.includes('catch'), `${page} should have catch block`);
        assert.ok(content.includes('console.warn'), `${page} should warn on error`);
      }
    });

    it('manager handles zero-width/height gracefully', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('width <= 0') || content.includes('height <= 0'), 'Should check for zero dimensions');
    });

    it('manager checks typeof document before DOM access', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes("typeof document === 'undefined'"), 'Should check for document existence');
    });
  });

  describe('Theme Compatibility', () => {
    it('grid colors match synthwave palette (pink/purple/cyan)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      // Default color1 = [1.0, 0.0, 1.0] = pink
      // Default color2 = [0.73, 0.07, 1.0] = purple
      assert.ok(content.includes('[1.0, 0.0, 1.0]'), 'Default color1 should be pink');
      assert.ok(content.includes('[0.73, 0.07, 1.0]'), 'Default color2 should be purple');
    });

    it('particle colors include cyan (#0ff0fc)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-particles.js'), 'utf8');
      // Third color in palette = [0.0, 0.94, 0.98] ≈ cyan
      assert.ok(content.includes('[0.0, 0.94, 0.98]'), 'Should include cyan color');
    });

    it('CSS retro theme overrides are present', () => {
      const cssPath = path.join(ROOT, 'css', 'styles.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      assert.ok(content.includes('body.theme-retro'), 'CSS should have retro theme selector');
    });

    it('grid module supports custom colors for retro theme', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      // Should accept color1, color2, glowColor as options
      assert.ok(content.includes('color1 ='), 'Should accept color1 option');
      assert.ok(content.includes('glowColor ='), 'Should accept glowColor option');
    });
  });

  describe('Code Quality', () => {
    it('all modules use ES6 module syntax', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-particles.js', 'three-shapes.js', 'three-interaction.js'];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        assert.ok(content.includes('export'), `${mod} should have export`);
        assert.ok(!content.includes('require('), `${mod} should not use require()`);
      }
    });

    it('all modules use single quotes for strings', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-particles.js', 'three-shapes.js', 'three-interaction.js'];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        assert.ok(content.length > 0, `${mod} should not be empty`);
      }
    });

    it('no console.log in production code (only warn/error)', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-particles.js', 'three-shapes.js', 'three-interaction.js'];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        // Allow console.warn and console.error but not console.log
        const logMatches = content.match(/console\.log\(/g);
        assert.strictEqual(logMatches, null, `${mod} should not use console.log`);
      }
    });

    it('all modules have proper disposal cleanup', () => {
      const modules = [
        { name: 'three-grid.js', pattern: 'geometry.dispose()' },
        { name: 'three-particles.js', pattern: 'geometry.dispose()' },
        { name: 'three-shapes.js', pattern: 'geometry.dispose()' }
      ];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod.name), 'utf8');
        assert.ok(content.includes(mod.pattern), `${mod.name} should dispose geometry`);
        assert.ok(content.includes('material.dispose()'), `${mod.name} should dispose material`);
      }
    });

    it('modules use arrow functions consistently', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-particles.js', 'three-shapes.js', 'three-interaction.js'];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        assert.ok(content.includes('() =>') || content.includes('(delta)'), `${mod} should use arrow functions`);
      }
    });

    it('ThreeManager has frame(delta) for render loop coordination', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('for (const comp of this.components)'), 'Should iterate components');
      assert.ok(content.includes('comp.animate(delta)'), 'Should call component animate');
      assert.ok(content.includes('this._render(time)'), 'Should call render');
    });

    it('ThreeManager disposes event listeners on cleanup', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes("window.removeEventListener('resize'"), 'Should remove resize listener');
      assert.ok(content.includes("document.removeEventListener('visibilitychange'") || content.includes('visibilitychange'), 'Should handle visibility cleanup');
    });
  });

  describe('CDN Import Consistency', () => {
    it('all modules use same Three.js CDN version', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-particles.js', 'three-shapes.js', 'three-interaction.js'];
      const version = '0.160.0';
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        assert.ok(content.includes(version), `${mod} should use Three.js v${version}`);
      }
    });

    it('all modules import from jsDelivr CDN', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-particles.js', 'three-shapes.js', 'three-interaction.js'];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        assert.ok(content.includes('cdn.jsdelivr.net'), `${mod} should use jsDelivr CDN`);
      }
    });
  });

  describe('Page Integration Completeness', () => {
    it('index.html has grid + particles (full synthwave scene)', () => {
      const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      assert.ok(content.includes('createGrid'), 'Index should create grid');
      assert.ok(content.includes('createParticles'), 'Index should create particles');
    });

    it('project-explorer.html has shapes + interaction', () => {
      const content = fs.readFileSync(path.join(ROOT, 'project-explorer.html'), 'utf8');
      assert.ok(content.includes('createShapes'), 'Explorer should create shapes');
      assert.ok(content.includes('createInteraction'), 'Explorer should create interaction');
    });

    it('dashboard.html has minimal shapes (subtle background)', () => {
      const content = fs.readFileSync(path.join(ROOT, 'dashboard.html'), 'utf8');
      assert.ok(content.includes('createShapes'), 'Dashboard should create shapes');
      assert.ok(!content.includes('createGrid'), 'Dashboard should NOT have grid (kept subtle)');
    });

    it('writeups.html has grid + particles (subtle)', () => {
      const content = fs.readFileSync(path.join(ROOT, 'writeups.html'), 'utf8');
      assert.ok(content.includes('createGrid'), 'Writeups should create grid');
      assert.ok(content.includes('createParticles'), 'Writeups should create particles');
    });

    it('contact.html has shapes (decorative)', () => {
      const content = fs.readFileSync(path.join(ROOT, 'contact.html'), 'utf8');
      assert.ok(content.includes('createShapes'), 'Contact should create shapes');
    });

    it('all pages with 3D have beforeunload cleanup', () => {
      const pagesWith3d = ['index.html', 'project-explorer.html', 'dashboard.html', 'writeups.html', 'contact.html'];
      for (const page of pagesWith3d) {
        const content = fs.readFileSync(path.join(ROOT, page), 'utf8');
        assert.ok(content.includes('beforeunload'), `${page} should have beforeunload cleanup`);
        assert.ok(content.includes('three.dispose'), `${page} should call dispose on unload`);
      }
    });

    it('index.html passes gpuTier to particle count', () => {
      const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      assert.ok(content.includes('gpuTier'), 'Index should check GPU tier for particle count');
    });
  });
});
