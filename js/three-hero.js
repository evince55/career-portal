// Hero background — restrained synthwave: wireframe horizon + sparse particle drift.
// Vendored library pinned at three@0.185.1 (js/vendor/three.module.min.js, which
// imports its sibling js/vendor/three.core.min.js — the official r185 split build).
// This module is ONLY ever loaded via dynamic import from index.html, after the
// window load event + requestIdleCallback, and never under prefers-reduced-motion,
// saveData, viewports < 768px, or missing WebGL. Keep it out of any eager script.
import * as THREE from '/js/vendor/three.module.min.js';

const BG = 0x08080d; // --bg-0
const CYAN = 0x3fd8e8; // --accent-cyan
const MAGENTA = 0xf45fd0; // --accent-magenta
const TILE = 40; // horizon tile depth; displacement is periodic on this length

// A gently displaced plane: flat "valley" down the middle, low hills at the
// sides. Displacement is periodic along y (period 20) so two tiles scroll
// seamlessly toward the camera.
function buildHorizonGeometry() {
  const geo = new THREE.PlaneGeometry(64, TILE, 48, 30);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const side = Math.max(0, Math.abs(x) - 6);
    const wave = 0.6 + 0.4 * Math.sin(x * 0.5) * Math.sin((y * Math.PI) / 10);
    pos.setZ(i, side * 0.28 * wave);
  }
  return geo;
}

function buildParticleGeometry(count, spread) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = Math.random() * 9 + 0.3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geo;
}

export function initThreeHero(canvas) {
  if (!canvas) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(BG, 0); // transparent: the CSS gradient fallback shows through

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 8, 46);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
  camera.position.set(0, 2.1, 11);
  camera.lookAt(0, 1.2, -10);

  const horizonGeo = buildHorizonGeometry();
  const horizonMat = new THREE.MeshBasicMaterial({
    color: CYAN,
    wireframe: true,
    transparent: true,
    opacity: 0.13
  });
  const tiles = [new THREE.Mesh(horizonGeo, horizonMat), new THREE.Mesh(horizonGeo, horizonMat)];
  tiles[0].position.set(0, 0, -TILE / 4);
  tiles[1].position.set(0, 0, -TILE / 4 - TILE);
  for (const tile of tiles) tile.rotation.x = -Math.PI / 2;

  const cyanPts = new THREE.Points(
    buildParticleGeometry(220, 70),
    new THREE.PointsMaterial({ color: CYAN, size: 0.06, transparent: true, opacity: 0.5, sizeAttenuation: true })
  );
  const magentaPts = new THREE.Points(
    buildParticleGeometry(110, 70),
    new THREE.PointsMaterial({ color: MAGENTA, size: 0.08, transparent: true, opacity: 0.4, sizeAttenuation: true })
  );
  scene.add(tiles[0], tiles[1], cyanPts, magentaPts);

  function resize() {
    const w = canvas.clientWidth || (canvas.parentElement && canvas.parentElement.clientWidth) || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let rafId = 0;
  let running = false;
  let disposed = false;
  let last = 0;

  function frame(t) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min((t - last) / 1000, 0.1) || 0;
    last = t;
    for (const tile of tiles) {
      tile.position.z += dt * 1.5;
      if (tile.position.z >= TILE * 0.75) tile.position.z -= TILE * 2;
    }
    cyanPts.rotation.y += dt * 0.012;
    magentaPts.rotation.y -= dt * 0.009;
    renderer.render(scene, camera);
  }

  function pause() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
  }

  function resume() {
    if (running || disposed) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  // Only animate while both the tab and the hero itself are visible.
  let pageVisible = !document.hidden;
  let heroVisible = true;
  function sync() {
    if (pageVisible && heroVisible) resume();
    else pause();
  }
  const onVisibility = () => {
    pageVisible = !document.hidden;
    sync();
  };
  document.addEventListener('visibilitychange', onVisibility);

  let io = null;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((entries) => {
      heroVisible = entries.some((e) => e.isIntersecting);
      sync();
    }, { threshold: 0.02 });
    io.observe(canvas);
  }

  window.addEventListener('resize', resize);

  function dispose() {
    if (disposed) return;
    disposed = true;
    pause();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', resize);
    if (io) io.disconnect();
    horizonGeo.dispose();
    horizonMat.dispose();
    cyanPts.geometry.dispose();
    cyanPts.material.dispose();
    magentaPts.geometry.dispose();
    magentaPts.material.dispose();
    renderer.dispose();
  }
  window.addEventListener('pagehide', dispose, { once: true });

  resize();
  sync();

  return { pause, resume, dispose };
}

export default initThreeHero;
