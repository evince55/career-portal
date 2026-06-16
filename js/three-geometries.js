// Modern 3D Geometries — Purposeful, interactive, DevOps/SRE themed
// Each geometry represents a concept relevant to the page it appears on.
// Mobile-optimized: merged geometries, reduced counts, simpler materials

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import createGrid from './three-grid.js';

// ─── Quality helper — unified gpuTier + isMobile control ──────────────────
function getQuality(isMobile, gpuTier) {
  if (isMobile) return { simple: true, countScale: 0.5, merged: true, subdiv: 1 };
  if (gpuTier >= 2) return { simple: false, countScale: 2.0, merged: false, subdiv: 3 };
  if (gpuTier >= 1) return { simple: false, countScale: 1.5, merged: false, subdiv: 2 };
  return { simple: true, countScale: 0.75, merged: true, subdiv: 1 };
}

// ─── Shared shader — iridescent glow with fresnel ─────────────────────────
const MODERN_VERT = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vViewPos = -(modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MODERN_FRAG = `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 viewDir = normalize(vViewPos);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
    float pulse = 0.7 + 0.3 * sin(uTime * 2.0);
    float mouseGlow = 0.2 * (1.0 - abs(uMouse.x)) * (1.0 - abs(uMouse.y));
    vec3 col = uColor * (0.3 + 0.7 * fresnel) * pulse + mouseGlow;
    float alpha = 0.4 + 0.6 * fresnel;
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── FlowField — Fluid particle grid (Terminal page) ──────────────────────
// A grid of particles that flow like a liquid field, mouse creates vortices
function createFlowField(options = {}) {
  const {
    gridSize = 20, spread = 10, time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const count = Math.round(gridSize * q.countScale);
  const positions = new Float32Array(count * count * 3);
  const originalPositions = new Float32Array(count * count * 3);
  const velocities = new Float32Array(count * count * 3);

  let idx = 0;
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const x = (i / (count - 1) - 0.5) * spread;
      const y = (j / (count - 1) - 0.5) * spread;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = Math.sin(i * 0.3) * Math.cos(j * 0.3) * 0.5;
      originalPositions[idx * 3] = x;
      originalPositions[idx * 3 + 1] = y;
      originalPositions[idx * 3 + 2] = positions[idx * 3 + 2];
      idx++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const texture = createParticleTexture();
  const material = new THREE.PointsMaterial({
    size: q.simple ? 0.15 : 0.2,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: texture,
    sizeAttenuation: true,
    color: new THREE.Color(0.0, 0.94, 0.98)
  });

  const particles = new THREE.Points(geometry, material);
  const uniforms = { uTime: { value: time } };

  return {
    name: 'flowfield', object: particles, uniforms,
    originalPositions, velocities, count, gridSize, geometry,
    frame(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      const pos = geometry.attributes.position.array;
      const t = uniforms.uTime.value;

      for (let i = 0; i < count * count; i++) {
        const i3 = i * 3;
        const ox = originalPositions[i3], oy = originalPositions[i3 + 1];

        // Mouse force — particles flow toward cursor
        const dx = mx * 5 - ox;
        const dy = my * 5 - oy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = Math.min(0.3 / (dist * 0.1 + 1), 0.5);

        // Vortex effect near mouse
        const vortexX = -dy / dist * force * 2;
        const vortexY = dx / dist * force * 2;

        // Flow field noise
        const noiseX = Math.sin(t * 0.5 + ox * 0.3) * 0.1;
        const noiseY = Math.cos(t * 0.4 + oy * 0.3) * 0.1;

        pos[i3] += (vortexX + noiseX) * delta;
        pos[i3 + 1] += (vortexY + noiseY) * delta;
        pos[i3 + 2] += Math.sin(t + i * 0.1) * delta * 0.05;
      }

      geometry.attributes.position.needsUpdate = true;
      uniforms.uTime.value += delta;
    },
    animate() {},
    init(manager) { this.manager = manager; },
    dispose() {
      geometry.dispose();
      material.dispose();
      if (texture) texture.dispose();
    }
  };
}

// ─── HoneycombLattice — Hexagonal grid (Project Explorer) ─────────────────
// Represents infrastructure clusters — pulsing nodes with glowing connections
function createHoneycombLattice(options = {}) {
  const {
    gridSize = 4, spread = 8, time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const group = new THREE.Group();
  const subGeometries = [];
  const subMaterials = [];

  // Create hexagonal grid positions
  const hexPositions = [];
  const adjustedSize = Math.max(2, Math.round(gridSize * q.countScale));
  for (let i = -adjustedSize; i <= adjustedSize; i++) {
    for (let j = -adjustedSize; j <= adjustedSize; j++) {
      if ((i + j) % 2 === 0) {
        const x = i * spread * 0.866;
        const y = j * spread * 0.75;
        hexPositions.push([x, y, Math.sin(i * 0.5) * Math.cos(j * 0.5) * 0.3]);
      }
    }
  }

  // Create nodes at each hex position
  const nodeCount = hexPositions.length;
  for (let i = 0; i < nodeCount; i++) {
    const [x, y, z] = hexPositions[i];
    const size = q.simple ? 0.15 : 0.2;

    const geo = new THREE.IcosahedronGeometry(size, 0);
    subGeometries.push(geo);

    const uniforms = { uColor: { value: new THREE.Vector3(0.0, 0.94, 0.98) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
    const mat = q.simple
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(0.0, 0.94, 0.98), wireframe: true, transparent: true, opacity: 0.6 })
      : new THREE.ShaderMaterial({ vertexShader: MODERN_VERT, fragmentShader: MODERN_FRAG, uniforms, transparent: true, blending: THREE.AdditiveBlending });
    subMaterials.push(mat);

    const node = new THREE.Mesh(geo, mat);
    node.position.set(x, y, z);
    group.add(node);
    hexPositions[i].push({ mesh: node, uniforms, basePos: [x, y, z] });
  }

  // Create connections between adjacent nodes
  if (!q.simple) {
    const linePositions = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = hexPositions[i][0] - hexPositions[j][0];
        const dy = hexPositions[i][1] - hexPositions[j][1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < spread * 1.2) {
          linePositions.push(
            hexPositions[i][0], hexPositions[i][1], hexPositions[i][2],
            hexPositions[j][0], hexPositions[j][1], hexPositions[j][2]
          );
        }
      }
    }

    if (linePositions.length > 0) {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
      subGeometries.push(lineGeo);
      const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.73, 0.07, 1.0), transparent: true, opacity: 0.3 });
      subMaterials.push(lineMat);
      group.add(new THREE.LineSegments(lineGeo, lineMat));
    }
  }

  return {
    name: 'honeycomb', object: group, uniforms: { uTime: { value: time } }, hexPositions,
    frame(delta) {
      const t = this.uniforms.uTime.value;
      for (let i = 0; i < nodeCount; i++) {
        const node = hexPositions[i][3];
        if (node) {
          node.mesh.position.y = hexPositions[i][1] + Math.sin(t * 0.5 + i * 0.3) * 0.2;
        }
      }
    },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      const t = this.uniforms.uTime.value;
      for (let i = 0; i < nodeCount; i++) {
        const node = hexPositions[i][3];
        if (node) {
          // Mouse attraction
          const dx = mx * 2 - hexPositions[i][0];
          const dy = my * 2 - hexPositions[i][1];
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = Math.min(0.1 / (dist * 0.05 + 1), 0.3);
          node.mesh.position.x += dx * force * delta;
          node.mesh.position.y += dy * force * delta;
        }
      }
    },
    init(manager) { this.manager = manager; },
    dispose() {
      for (const g of subGeometries) g.dispose();
      for (const m of subMaterials) m.dispose();
    }
  };
}

// ─── DataStream — Vertical particle streams (Dashboard) ───────────────────
// Represents data pipelines and metrics flowing through systems
function createDataStream(options = {}) {
  const {
    streamCount = 8, spread = 6, height = 12, time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const count = Math.max(3, Math.round(streamCount * q.countScale));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const originalPositions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spread;
    const y = (Math.random() - 0.5) * height;
    const z = (Math.random() - 0.5) * 2;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    originalPositions[i * 3] = x;
    originalPositions[i * 3 + 1] = y;
    originalPositions[i * 3 + 2] = z;
    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
    velocities[i * 3 + 2] = 0;

    // Gradient from cyan to purple
    const t = (y / height + 0.5);
    colors[i * 3] = 0.0 + t * 0.73;
    colors[i * 3 + 1] = 0.94 * (1 - t) + 0.07 * t;
    colors[i * 3 + 2] = 0.98 * (1 - t) + 0.0 * t;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const texture = createParticleTexture();
  const material = new THREE.PointsMaterial({
    size: q.simple ? 0.12 : 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: texture,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(geometry, material);
  const uniforms = { uTime: { value: time } };

  return {
    name: 'datastream', object: particles, uniforms,
    originalPositions, velocities, count, height, spread, geometry,
    frame(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      const pos = geometry.attributes.position.array;
      const t = uniforms.uTime.value;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        // Stream downward flow
        velocities[i3 + 1] += delta * 2;
        if (velocities[i3 + 1] > height / 2) {
          positions[i3] = originalPositions[i3];
          positions[i3 + 1] = -height / 2;
          velocities[i3 + 1] = 0;
        }

        // Mouse ripple effect
        const dx = mx * 3 - positions[i3];
        const dy = my * 3 - positions[i3 + 1];
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = Math.min(0.2 / (dist * 0.1 + 1), 0.3);

        pos[i3] += dx * force * delta * 0.5;
        pos[i3 + 1] += velocities[i3 + 1] * delta + dy * force * delta * 0.3;
      }

      geometry.attributes.position.needsUpdate = true;
      uniforms.uTime.value += delta;
    },
    animate() {},
    init(manager) { this.manager = manager; },
    dispose() {
      geometry.dispose();
      material.dispose();
      if (texture) texture.dispose();
    }
  };
}

// ─── PrismMatrix — 3D cube grid (Writeups page) ───────────────────────────
// Represents complexity of technical analysis — cubes rotate and shift color
function createPrismMatrix(options = {}) {
  const {
    gridSize = 5, spread = 0.8, time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const group = new THREE.Group();
  const subGeometries = [];
  const subMaterials = [];

  const adjustedSize = Math.max(2, Math.round(gridSize * q.countScale));
  const cubes = [];

  for (let i = -adjustedSize; i <= adjustedSize; i++) {
    for (let j = -adjustedSize; j <= adjustedSize; j++) {
      for (let k = -adjustedSize; k <= adjustedSize; k++) {
        if (Math.abs(i) + Math.abs(j) + Math.abs(k) > adjustedSize * 1.5) continue;

        const size = q.simple ? 0.1 : 0.15;
        const geo = new THREE.BoxGeometry(size, size, size);
        subGeometries.push(geo);

        const uniforms = { uColor: { value: new THREE.Vector3(0.73, 0.07, 1.0) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
        const mat = q.simple
          ? new THREE.MeshBasicMaterial({ color: new THREE.Color(0.73, 0.07, 1.0), wireframe: true, transparent: true, opacity: 0.5 })
          : new THREE.ShaderMaterial({ vertexShader: MODERN_VERT, fragmentShader: MODERN_FRAG, uniforms, transparent: true, blending: THREE.AdditiveBlending });
        subMaterials.push(mat);

        const cube = new THREE.Mesh(geo, mat);
        const x = i * spread;
        const y = j * spread;
        const z = k * spread;
        cube.position.set(x, y, z);
        group.add(cube);
        cubes.push({ mesh: cube, uniforms, basePos: [x, y, z], baseRot: [0, 0, 0] });
      }
    }
  }

  return {
    name: 'prism', object: group, uniforms: { uTime: { value: time } }, cubes,
    frame(delta) {
      const t = this.uniforms.uTime.value;
      for (const c of cubes) {
        c.mesh.rotation.x += delta * (0.3 + Math.abs(c.basePos[2]) * 0.1);
        c.mesh.rotation.y += delta * (0.2 + Math.abs(c.basePos[0]) * 0.1);
      }
    },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      const t = this.uniforms.uTime.value;
      for (const c of cubes) {
        const [bx, by, bz] = c.basePos;
        // Mouse influence — cubes closer to cursor rotate faster
        const dx = mx * 5 - bx;
        const dy = my * 5 - by;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const influence = Math.min(0.3 / (dist * 0.1 + 1), 0.5);

        c.mesh.rotation.z += influence * delta * 2;
        c.mesh.position.y = by + Math.sin(t * 0.5 + bx * 0.5) * 0.1 * influence;
      }
    },
    init(manager) { this.manager = manager; },
    dispose() {
      for (const g of subGeometries) g.dispose();
      for (const m of subMaterials) m.dispose();
    }
  };
}

// ─── WaveSurface — Parametric interference surface (Contact page) ─────────
// Beautiful overlapping wave patterns representing communication
function createWaveSurface(options = {}) {
  const {
    width = 8, depth = 8, segments = 16, time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const segU = Math.round(segments * q.countScale);
  const segV = Math.round(segments * q.countScale);

  const vertices = [], normals = [], indices = [];
  const uvs = [];

  for (let i = 0; i <= segU; i++) {
    for (let j = 0; j <= segV; j++) {
      const x = (i / segU - 0.5) * width;
      const z = (j / segV - 0.5) * depth;
      vertices.push(x, 0, z);
      normals.push(0, 1, 0);
      uvs.push(i / segU, j / segV);
    }
  }

  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * (segV + 1) + j;
      const b = a + 1, c = a + (segV + 1), d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geometry.computeVertexNormals();

  const uniforms = { uColor: { value: new THREE.Vector3(1.0, 0.0, 0.98) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
  const material = q.simple
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.0, 0.98), wireframe: true, transparent: true, opacity: 0.4 })
    : new THREE.ShaderMaterial({ vertexShader: MODERN_VERT, fragmentShader: MODERN_FRAG, uniforms, transparent: true, blending: THREE.AdditiveBlending });

  const mesh = new THREE.Mesh(geometry, material);
  return {
    name: 'wavesurface', object: mesh, uniforms, geometry,
    frame(delta) { uniforms.uTime.value += delta; },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      const t = uniforms.uTime.value;
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < pos.length / 3; i++) {
        const x = pos[i * 3], z = pos[i * 3 + 2];
        // Interference pattern
        const wave1 = Math.sin(x * 0.8 + t) * Math.cos(z * 0.6 + t * 0.7);
        const wave2 = Math.sin(x * 0.5 - t * 0.5) * Math.sin(z * 0.8 + t * 0.3);
        const mouseInfluence = (1.0 - abs(mx)) * (1.0 - abs(my)) * 0.3;
        pos[i * 3 + 1] = wave1 * 0.5 + wave2 * 0.3 + mouseInfluence * Math.sin(t + i * 0.1);
      }
      geometry.computeVertexNormals();
    },
    init(manager) { this.manager = manager; },
    dispose() { geometry.dispose(); material.dispose(); }
  };
}

// ─── Particle texture (procedural circle) ─────────────────────────────────
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// ─── Page-specific scene builders ────────────────────────────────────────
function buildTerminalScene(manager) {
  const components = [];
  const gpuTier = manager.gpuTier ?? 1;
  const isMobile = manager.isMobile;
  const xPad = isMobile ? 8 : 15;

  const grid = createGrid({ opacity: 0.3, time: 0, isMobile });
  manager.scene.add(grid.object);
  components.push(grid);

  // Fluid particle field — center stage
  const flowField = createFlowField({ gridSize: 20, spread: 14, gpuTier, isMobile });
  flowField.object.position.set(0, 0, -16);
  manager.scene.add(flowField.object);
  components.push(flowField);

  // Honeycomb lattice — left (infrastructure cluster)
  const honeycomb = createHoneycombLattice({ gridSize: 3, spread: 2.5, gpuTier, isMobile });
  honeycomb.object.position.set(-xPad, -1, -12);
  manager.scene.add(honeycomb.object);
  components.push(honeycomb);

  // Data stream — right (data pipeline)
  const dataStream = createDataStream({ streamCount: 6, spread: 4, gpuTier, isMobile });
  dataStream.object.position.set(xPad, 0, -14);
  manager.scene.add(dataStream.object);
  components.push(dataStream);

  return { name: 'terminal', components, objects: components.flatMap(c => [c.object]) };
}

function buildProjectExplorerScene(manager) {
  const components = [];
  const gpuTier = manager.gpuTier ?? 1;
  const isMobile = manager.isMobile;
  const xPad = isMobile ? 8 : 12;

  const grid = createGrid({ opacity: 0.2, time: 0, isMobile });
  manager.scene.add(grid.object);
  components.push(grid);

  // Honeycomb lattice — left (infrastructure cluster)
  const honeycomb = createHoneycombLattice({ gridSize: 4, spread: 2.0, gpuTier, isMobile });
  honeycomb.object.position.set(-xPad, 0, -15);
  manager.scene.add(honeycomb.object);
  components.push(honeycomb);

  // Data stream — right (project pipelines)
  const dataStream = createDataStream({ streamCount: 5, spread: 3, gpuTier, isMobile });
  dataStream.object.position.set(xPad, -1, -15);
  manager.scene.add(dataStream.object);
  components.push(dataStream);

  // Prism matrix — center (system complexity)
  const prism = createPrismMatrix({ gridSize: 3, spread: 0.6, gpuTier, isMobile });
  prism.object.position.set(0, -2, -18);
  manager.scene.add(prism.object);
  components.push(prism);

  return { name: 'projects', components, objects: components.flatMap(c => [c.object]) };
}

function buildDashboardScene(manager) {
  const components = [];
  const gpuTier = manager.gpuTier ?? 1;
  const isMobile = manager.isMobile;
  const xPad = isMobile ? 6 : 10;

  // Data stream — center (metrics flowing)
  const dataStream = createDataStream({ streamCount: 8, spread: 5, height: 10, gpuTier, isMobile });
  dataStream.object.position.set(0, 0, -12);
  manager.scene.add(dataStream.object);
  components.push(dataStream);

  // Honeycomb lattice — top (cluster nodes)
  const honeycomb = createHoneycombLattice({ gridSize: 3, spread: 2.5, gpuTier, isMobile });
  honeycomb.object.position.set(0, 4, -15);
  manager.scene.add(honeycomb.object);
  components.push(honeycomb);

  // Prism matrix — bottom right (analysis)
  const prism = createPrismMatrix({ gridSize: 2, spread: 0.7, gpuTier, isMobile });
  prism.object.position.set(xPad, -3, -14);
  manager.scene.add(prism.object);
  components.push(prism);

  return { name: 'dashboard', components, objects: components.flatMap(c => [c.object]) };
}

function buildWriteupsScene(manager) {
  const components = [];
  const gpuTier = manager.gpuTier ?? 1;
  const isMobile = manager.isMobile;
  const xPad = isMobile ? 6 : 10;

  // Prism matrix — center (technical depth)
  const prism = createPrismMatrix({ gridSize: 4, spread: 0.7, gpuTier, isMobile });
  prism.object.position.set(0, 1, -15);
  manager.scene.add(prism.object);
  components.push(prism);

  // Data stream — left (knowledge flow)
  const dataStream = createDataStream({ streamCount: 4, spread: 3, gpuTier, isMobile });
  dataStream.object.position.set(-xPad, -2, -18);
  manager.scene.add(dataStream.object);
  components.push(dataStream);

  // Honeycomb lattice — right (connected ideas)
  const honeycomb = createHoneycombLattice({ gridSize: 2, spread: 3.0, gpuTier, isMobile });
  honeycomb.object.position.set(xPad, 2, -20);
  manager.scene.add(honeycomb.object);
  components.push(honeycomb);

  return { name: 'writeups', components, objects: components.flatMap(c => [c.object]) };
}

function buildContactScene(manager) {
  const components = [];
  const gpuTier = manager.gpuTier ?? 1;
  const isMobile = manager.isMobile;
  const xPad = isMobile ? 6 : 12;

  // Wave surface — center (communication)
  const waveSurface = createWaveSurface({ width: 8, depth: 8, segments: 16, gpuTier, isMobile });
  waveSurface.object.position.set(0, 0, -12);
  manager.scene.add(waveSurface.object);
  components.push(waveSurface);

  // Data stream — left (incoming messages)
  const dataStream = createDataStream({ streamCount: 4, spread: 3, gpuTier, isMobile });
  dataStream.object.position.set(-xPad, 1, -15);
  manager.scene.add(dataStream.object);
  components.push(dataStream);

  // Honeycomb lattice — right (network)
  const honeycomb = createHoneycombLattice({ gridSize: 2, spread: 3.0, gpuTier, isMobile });
  honeycomb.object.position.set(xPad, 2, -16);
  manager.scene.add(honeycomb.object);
  components.push(honeycomb);

  return { name: 'contact', components, objects: components.flatMap(c => [c.object]) };
}

export {
  createFlowField, createHoneycombLattice, createDataStream,
  createPrismMatrix, createWaveSurface,
  buildTerminalScene, buildProjectExplorerScene, buildDashboardScene,
  buildWriteupsScene, buildContactScene
};
