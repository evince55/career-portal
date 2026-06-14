// Neon Particle System — GPU-accelerated via BufferGeometry + Points
// Particles drift in sine-wave patterns with configurable count by GPU tier

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const PARTICLE_VERT = `
  attribute vec3 aPosition;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;

  uniform float uTime;
  uniform float uSpeed;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;

    // Sine-wave drift in X and Z
    float driftX = sin(uTime * uSpeed + aPhase) * 1.5;
    float driftZ = cos(uTime * uSpeed * 0.7 + aPhase * 1.3) * 1.0;
    float driftY = sin(uTime * uSpeed * 0.3 + aPhase * 0.7) * 0.3;

    vec3 pos = aPosition;
    pos.x += driftX;
    pos.z += driftZ;
    pos.y += driftY;

    // Fade based on vertical position (near horizon = more transparent)
    float horizonFade = smoothstep(0.0, pos.y + 5.0);
    vAlpha = horizonFade;

    vec4 viewPos = viewMatrix * modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewPos;
    gl_PointSize = aSize * (300.0 / -viewPos.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 20.0);
  }
`;

const PARTICLE_FRAG = `
  precision mediump float;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);

    // Soft circle with glow
    float alpha = smoothstep(0.5, 1.0 - dist * 1.4);
    alpha *= 0.6 + 0.4 * exp(-dist * 6.0);

    gl_FragColor = vec4(vColor, alpha * vAlpha);
  }
`;

function createParticles(options = {}) {
  const {
    count = 200,
    colors = [
      [1.0, 0.0, 0.98],
      [0.73, 0.07, 1.0],
      [0.0, 0.94, 0.98]
    ],
    speed = 0.5,
    spread = { x: 60, y: 15, z: 80 },
    time = 0
  } = options;

  const positions = new Float32Array(count * 3);
  const particleColors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread.x;
    positions[i * 3 + 1] = Math.random() * spread.y - 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread.z - 20;

    const colorIdx = Math.floor(Math.random() * colors.length);
    particleColors[i * 3] = colors[colorIdx][0];
    particleColors[i * 3 + 1] = colors[colorIdx][1];
    particleColors[i * 3 + 2] = colors[colorIdx][2];

    sizes[i] = 2.0 + Math.random() * 4.0;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('aPosition', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(particleColors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const uniforms = {
    uTime: { value: time },
    uSpeed: { value: speed }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const points = new THREE.Points(geometry, material);
  points.renderOrder = -2;

  return {
    name: 'particles',
    object: points,
    uniforms,
    frame(delta) {
      uniforms.uTime.value += delta;
    },
    animate() {},
    init() {},
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}

export default createParticles;
export { createParticles, PARTICLE_VERT, PARTICLE_FRAG };
