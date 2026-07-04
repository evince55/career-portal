// Hero background — a cinematic synthwave scene rendered as a single full-screen
// fragment shader (sun with scanline bands, perspective grid, drifting starfield).
// One draw call, all work on the GPU; far cheaper than geometry.
//
// Vendored library pinned at three@0.185.1 (js/vendor/three.module.min.js).
// This module is ONLY ever loaded via dynamic import from index.html, after the
// window load event + requestIdleCallback, and never under prefers-reduced-motion,
// saveData, viewports < 768px, or missing WebGL. Keep it out of any eager script.
//
// A Higgsfield (or any) poster/video can layer in front of this later — the scene
// is the always-available WebGL backdrop and the CSS gradient is the no-WebGL one.
import * as THREE from '/js/vendor/three.module.min.js';

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2  uRes;
uniform vec3  uSkyTop;   // deep sky
uniform vec3  uSkyGlow;  // horizon haze
uniform vec3  uSun;      // sun / bloom
uniform vec3  uGrid;     // grid + accents

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  float sunX = 0.66; // sun / grid vanishing point, right of the hero copy
  float horizon = 0.44;
  vec3 col = mix(uSkyGlow, uSkyTop, smoothstep(horizon, 1.0, uv.y));

  // drifting starfield above the horizon
  if (uv.y > horizon) {
    vec2 cell = floor(uv * vec2(200.0 * aspect, 200.0));
    float s = hash(cell);
    float tw = 0.6 + 0.4 * sin(uTime * 1.6 + s * 40.0);
    col += step(0.994, s) * tw * 0.55;
  }

  // the sun — cyan→magenta disc with horizontal scanline bands on its lower half.
  // Sits right-of-centre so the left-aligned hero copy stays on dark pixels.
  vec2 p = vec2((uv.x - sunX) * aspect, uv.y - (horizon + 0.02));
  float d = length(p);
  float sunR = 0.19;
  float disc = smoothstep(sunR, sunR - 0.005, d);
  float bands = step(0.5, sin((uv.y - horizon) * 150.0));
  float lower = step(uv.y, horizon + 0.02);
  disc *= 1.0 - lower * bands;
  vec3 sunCol = mix(uSun, uSkyGlow + uGrid * 0.2, clamp((horizon + sunR - uv.y) / (sunR * 2.0), 0.0, 1.0));
  col = mix(col, sunCol, disc);
  col += uSun * smoothstep(sunR * 2.4, 0.0, d) * 0.28; // bloom

  // perspective grid below the horizon
  if (uv.y < horizon) {
    float depth = horizon - uv.y;
    float persp = 1.0 / (depth + 0.03);
    float rows = fract(depth * persp * 1.4 - uTime * 0.18);
    float rowLine = smoothstep(0.07, 0.0, min(rows, 1.0 - rows));
    float cols = fract((uv.x - sunX) * persp * 0.9);
    float colLine = smoothstep(0.06, 0.0, min(cols, 1.0 - cols));
    float grid = max(rowLine, colLine);
    float fade = smoothstep(0.0, 0.06, depth) * smoothstep(0.42, 0.02, depth);
    col += uGrid * grid * fade * 0.55;
    col = mix(col, uSkyTop * 0.4, smoothstep(horizon, horizon - 0.08, uv.y) * 0.35);
  }

  // keep the left half dark so the hero copy stays legible
  col *= mix(0.24, 1.0, smoothstep(0.04, 0.62, uv.x));

  // fade to the page background at the very top; hold strength lower down
  float alpha = smoothstep(1.0, 0.5, uv.y) * 0.6 + 0.35;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.92));
}
`;

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

function toVec3(hex) {
  return new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

export function initThreeHero(canvas) {
  if (!canvas) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x08080d, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uSkyTop: { value: toVec3(0x0b0a16) },
    uSkyGlow: { value: toVec3(0x2a0f2b) },
    uSun: { value: toVec3(0x3fd8e8) },
    uGrid: { value: toVec3(0x3fd8e8) }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);

  function resize() {
    const w = canvas.clientWidth || (canvas.parentElement && canvas.parentElement.clientWidth) || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  }

  let rafId = 0;
  let running = false;
  let disposed = false;
  let last = 0;

  function frame(t) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min((t - last) / 1000, 0.1) || 0;
    last = t;
    uniforms.uTime.value += dt;
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
    quad.geometry.dispose();
    material.dispose();
    renderer.dispose();
  }
  window.addEventListener('pagehide', dispose, { once: true });

  resize();
  // render one frame immediately so the scene is present the moment it fades in
  renderer.render(scene, camera);
  sync();

  return { pause, resume, dispose };
}

export default initThreeHero;
