// Synthwave Grid Floor — Perspective grid with horizon glow and fade
// Custom GLSL shader: additive-blended neon lines on dark background

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const GRID_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GRID_FRAG = `
  precision mediump float;

  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uGlowColor;
  uniform float uOpacity;
  varying vec2 vUv;

  float myFract(float x) { return x - floor(x); }

  void main() {
    float xNorm = vUv.x * 2.0 - 1.0;

    // Horizontal lines — perspective-correct via UV interpolation
    float hLine = abs(myFract(vUv.y * 40.0 + uTime * 0.5) - 0.5);
    hLine = min(hLine, abs(myFract(vUv.y * 80.0 + uTime * 0.5) - 0.5));
    hLine = 1.0 - step(0.012, hLine);

    // Vertical lines with subtle perspective convergence
    float vLine = abs(myFract(xNorm * 20.0) - 0.5);
    vLine = 1.0 - step(0.008, vLine);

    // Combine with depth-based color gradient
    vec3 lineColor = mix(uColor1, uColor2, vUv.y);
    float grid = max(hLine, vLine) * lineColor;

    // Fade toward horizon (top of UV space)
    float hf = 1.0 - clamp((vUv.y - 0.88) / 0.12, 0.0, 1.0);
    grid *= hf;

    // Side fade — soften edges
    float sf = 1.0 - clamp((abs(xNorm) - 0.4) / 0.08, 0.0, 1.0);
    grid *= sf;

    // Glow at vanishing point (horizon center: vUv = (0.5, 1.0))
    float glowDist = length(vUv - vec2(0.5, 1.0));
    grid += uGlowColor * exp(-glowDist * 4.0) * 0.3;

    gl_FragColor = vec4(grid, uOpacity * hf * sf);
  }
`;

function createGrid(options = {}) {
  const {
    color1 = [1.0, 0.0, 1.0],
    color2 = [0.73, 0.07, 1.0],
    glowColor = [1.0, 0.0, 0.98],
    opacity = 0.4,
    size = { width: 300, height: 250 },
    time = 0
  } = options;

  const uniforms = {
    uTime: { value: time },
    uColor1: { value: new THREE.Vector3(...color1) },
    uColor2: { value: new THREE.Vector3(...color2) },
    uGlowColor: { value: new THREE.Vector3(...glowColor) },
    uOpacity: { value: opacity }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: GRID_VERT,
    fragmentShader: GRID_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const geometry = new THREE.PlaneGeometry(size.width, size.height);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -3, 50);
  mesh.renderOrder = -1;

  return {
    name: 'grid',
    object: mesh,
    uniforms,
    frame(delta) {
      uniforms.uTime.value += delta * 0.4;
    },
    animate() {},
    init() {},
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}

export default createGrid;
export { createGrid, GRID_VERT, GRID_FRAG };
