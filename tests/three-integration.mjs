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
    it('has active three modules', () => {
      const expected = [
        'three-manager.js',
        'three-grid.js',
        'three-geometries.js'
      ];
      for (const file of expected) {
        const fullPath = path.join(JS_DIR, file);
        assert.ok(fs.existsSync(fullPath), `Missing module: ${file}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(content.length > 100, `${file} is too short (${content.length} chars)`);
      }
    });

    it('old modules (three-shapes, particles, interaction) have been removed', () => {
      const removed = [
        'three-shapes.js',
        'three-particles.js',
        'three-interaction.js'
      ];
      for (const file of removed) {
        const fullPath = path.join(JS_DIR, file);
        assert.ok(!fs.existsSync(fullPath), `Should have removed: ${file}`);
      }
    });

    it('service-worker.js includes only active modules', () => {
      const swPath = path.join(JS_DIR, 'service-worker.js');
      const content = fs.readFileSync(swPath, 'utf8');
      assert.ok(content.includes('three-manager.js'), 'SW missing three-manager.js');
      assert.ok(content.includes('three-grid.js'), 'SW missing three-grid.js');
      assert.ok(content.includes('three-geometries.js'), 'SW missing three-geometries.js');
      assert.ok(!content.includes('three-particles.js'), 'SW should not include removed module');
      assert.ok(!content.includes('three-shapes.js'), 'SW should not include removed module');
      assert.ok(!content.includes('three-interaction.js'), 'SW should not include removed module');
    });

    it('CSS includes three-canvas styles with correct z-index', () => {
      const cssPath = path.join(ROOT, 'css', 'styles.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      assert.ok(content.includes('.three-canvas'), 'CSS missing .three-canvas selector');
      assert.ok(content.includes('z-index: 1'), 'Canvas should have z-index: 1 (above CRT overlay)');
    });

    it('CSS has grain texture overlay and dot grid', () => {
      const cssPath = path.join(ROOT, 'css', 'styles.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      assert.ok(content.includes('#grain-overlay'), 'CSS should have grain overlay');
      assert.ok(content.includes('body::before'), 'CSS should have dot grid');
      assert.ok(content.includes('glass-card'), 'CSS should have glassmorphism class');
    });

    it('all pages include grain overlay', () => {
      const pages = ['index.html', 'project-explorer.html', 'dashboard.html', 'writeups.html', 'contact.html'];
      for (const page of pages) {
        const content = fs.readFileSync(path.join(ROOT, page), 'utf8');
        assert.ok(content.includes('grain-overlay'), `${page} should include grain overlay`);
      }
    });

    it('index.html includes 3D integration script', () => {
      const htmlPath = path.join(ROOT, 'index.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-manager.js'), 'index.html missing three-manager import');
      assert.ok(content.includes('three-geometries.js'), 'index.html should use page-specific scene builder');
    });

    it('project-explorer.html includes 3D integration', () => {
      const htmlPath = path.join(ROOT, 'project-explorer.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-geometries.js'), 'explorer should use page-specific scene builder');
    });

    it('dashboard.html includes 3D integration', () => {
      const htmlPath = path.join(ROOT, 'dashboard.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-geometries.js'), 'dashboard should use page-specific scene builder');
    });

    it('writeups.html includes 3D integration', () => {
      const htmlPath = path.join(ROOT, 'writeups.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-geometries.js'), 'writeups should use page-specific scene builder');
    });

    it('contact.html includes 3D integration', () => {
      const htmlPath = path.join(ROOT, 'contact.html');
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(content.includes('three-geometries.js'), 'contact should use page-specific scene builder');
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

    it('uses passive pointermove listener for scroll perf', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('{ passive: true }'), 'Should use passive event listener for scroll perf');
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
      assert.ok(content.includes('GRID_FRAG') || content.includes('MOBILE_GRID_FRAG'), 'Should have fragment shader');
    });

    it('uses safe GLSL (no fract builtin)', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('myFract'), 'Grid shader should use myFract helper');
      assert.ok(content.includes('floor'), 'myFract should use floor()');
    });

    it('uses depthWrite: false for proper layering', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('depthWrite: false'), 'Grid should not write to depth buffer');
    });

    it('has renderOrder for draw ordering', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('renderOrder'), 'Grid should have renderOrder');
    });
  });

  describe('ThreeGeometries — Source Analysis', () => {
    it('exports all geometry factories and scene builders', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-geometries.js'), 'utf8');
      const exports = [
        'createFlowField', 'createHoneycombLattice', 'createDataStream',
        'createPrismMatrix', 'createWaveSurface',
        'buildTerminalScene', 'buildProjectExplorerScene',
        'buildDashboardScene', 'buildWriteupsScene', 'buildContactScene'
      ];
      for (const exp of exports) {
        assert.ok(content.includes(exp), `Should export ${exp}`);
      }
    });

    it('has getQuality helper with high desktop detail', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-geometries.js'), 'utf8');
      assert.ok(content.includes('getQuality'), 'Should have quality helper');
      assert.ok(content.includes('subdiv'), 'Should have subdivision control');
      assert.ok(content.includes('countScale: 2.0'), 'Should boost count for high-end GPU');
    });

    it('each geometry uses init/mouse pattern', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-geometries.js'), 'utf8');
      const pattern = 'init(manager) { this.manager = manager; }';
      const matches = content.split(pattern).length - 1;
      assert.ok(matches >= 5, `Should have init(manager) on at least 5 geometries, got ${matches}`);
    });

    it('has MODERN_VERT and MODERN_FRAG shared shaders', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-geometries.js'), 'utf8');
      assert.ok(content.includes('MODERN_VERT'), 'Should have shared vertex shader');
      assert.ok(content.includes('MODERN_FRAG'), 'Should have shared fragment shader');
    });

    it('imports createGrid from three-grid.js', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-geometries.js'), 'utf8');
      assert.ok(content.includes("import createGrid from './three-grid.js'"), 'Should import grid');
    });

    it('uMouse uniform for mouse responsiveness', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-geometries.js'), 'utf8');
      assert.ok(content.includes('uMouse'), 'Should use mouse uniform');
    });
  });

  describe('Mobile Detection & Quality', () => {
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

    it('CSS has touch-action: none on canvas for scroll perf', () => {
      const cssPath = path.join(ROOT, 'css', 'styles.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      assert.ok(content.includes('touch-action: none'), 'Canvas should have touch-action: none');
    });
  });

  describe('Performance Safeguards', () => {
    it('manager caps pixel ratio at 2x', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('Math.min(window.devicePixelRatio'), 'Should cap pixel ratio');
    });

    it('grid uses depthWrite: false for proper layering', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-grid.js'), 'utf8');
      assert.ok(content.includes('depthWrite: false'), 'Grid should not write to depth buffer');
    });

    it('manager uses low-power GPU preference', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('low-power'), 'Should use low-power GPU preference');
    });

    it('geometries properly dispose in cleanup', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-geometries.js'), 'utf8');
      assert.ok(content.includes('.dispose()'), 'Geometries should dispose WebGL resources');
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
      assert.ok(content.includes('[1.0, 0.0, 1.0]'), 'Default color1 should be pink');
      assert.ok(content.includes('[0.73, 0.07, 1.0]'), 'Default color2 should be purple');
    });

    it('CSS retro theme overrides are present', () => {
      const cssPath = path.join(ROOT, 'css', 'styles.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      assert.ok(content.includes('body.theme-retro'), 'CSS should have retro theme selector');
    });
  });

  describe('Code Quality', () => {
    it('active modules use ES6 module syntax', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-geometries.js'];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        assert.ok(content.includes('export'), `${mod} should have export`);
        assert.ok(!content.includes('require('), `${mod} should not use require()`);
      }
    });

    it('no console.log in production code (only warn/error)', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-geometries.js'];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        const logMatches = content.match(/console\.log\(/g);
        assert.strictEqual(logMatches, null, `${mod} should not use console.log`);
      }
    });

    it('modules use arrow functions consistently', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-geometries.js'];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        assert.ok(content.includes('() =>') || content.includes('(delta)'), `${mod} should use arrow functions`);
      }
    });

    it('ThreeManager has frame(delta) for render loop coordination', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes('for (const comp of this.components)'), 'Should iterate components');
      assert.ok(content.includes('comp.animate(delta)'), 'Should call component animate');
      assert.ok(content.includes('this._render()'), 'Should call render');
    });

    it('ThreeManager disposes event listeners on cleanup', () => {
      const content = fs.readFileSync(path.join(JS_DIR, 'three-manager.js'), 'utf8');
      assert.ok(content.includes("window.removeEventListener('resize'"), 'Should remove resize listener');
      assert.ok(content.includes("removeEventListener('pointermove'"), 'Should remove pointermove listener');
    });
  });

  describe('CDN Import Consistency', () => {
    it('active modules use same Three.js CDN version', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-geometries.js'];
      const version = '0.160.0';
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        assert.ok(content.includes(version), `${mod} should use Three.js v${version}`);
      }
    });

    it('all modules import from jsDelivr CDN', () => {
      const modules = ['three-manager.js', 'three-grid.js', 'three-geometries.js'];
      for (const mod of modules) {
        const content = fs.readFileSync(path.join(JS_DIR, mod), 'utf8');
        assert.ok(content.includes('cdn.jsdelivr.net'), `${mod} should use jsDelivr CDN`);
      }
    });
  });

  describe('Page Integration Completeness', () => {
    it('index.html has terminal scene', () => {
      const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      assert.ok(content.includes('buildTerminalScene'), 'Index should use terminal scene builder');
      assert.ok(content.includes('three-geometries.js'), 'Index should import geometries module');
    });

    it('project-explorer.html has project scene', () => {
      const content = fs.readFileSync(path.join(ROOT, 'project-explorer.html'), 'utf8');
      assert.ok(content.includes('buildProjectExplorerScene'), 'Explorer should use project scene builder');
    });

    it('dashboard.html has data viz scene', () => {
      const content = fs.readFileSync(path.join(ROOT, 'dashboard.html'), 'utf8');
      assert.ok(content.includes('buildDashboardScene'), 'Dashboard should use dashboard scene builder');
    });

    it('writeups.html has ambient scene', () => {
      const content = fs.readFileSync(path.join(ROOT, 'writeups.html'), 'utf8');
      assert.ok(content.includes('buildWriteupsScene'), 'Writeups should use writeups scene builder');
    });

    it('contact.html has contact scene', () => {
      const content = fs.readFileSync(path.join(ROOT, 'contact.html'), 'utf8');
      assert.ok(content.includes('buildContactScene'), 'Contact should use contact scene builder');
    });

    it('all pages with 3D have beforeunload cleanup', () => {
      const pagesWith3d = ['index.html', 'project-explorer.html', 'dashboard.html', 'writeups.html', 'contact.html'];
      for (const page of pagesWith3d) {
        const content = fs.readFileSync(path.join(ROOT, page), 'utf8');
        assert.ok(content.includes('beforeunload'), `${page} should have beforeunload cleanup`);
        assert.ok(content.includes('three.dispose'), `${page} should call dispose on unload`);
      }
    });
  });
});
