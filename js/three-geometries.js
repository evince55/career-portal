// Custom 3D Geometries — Professional, interactive, portfolio-relevant shapes
// Each geometry responds to mouse position, has unique personality, and is
// themed around devops/SRE/terminal concepts.
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

// ─── Shared vertex shader — fresnel glow used by most geometries ──────────
const SHAPE_VERT = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vViewPos = -(modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHAPE_FRAG = `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 viewDir = normalize(vViewPos);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);
    float pulse = 0.8 + 0.2 * sin(uTime * 1.5);
    float mouseGlow = 0.15 * (1.0 - abs(uMouse.x)) * (1.0 - abs(uMouse.y));
    vec3 col = uColor * (0.4 + 0.6 * fresnel) * pulse + mouseGlow;
    float alpha = 0.5 + 0.5 * fresnel;
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Star Burst — Pulsing spiky star, tilts toward cursor ─────────────────
function createStarBurst(options = {}) {
  const {
    size = 1.5, spikes = 8, color = [1.0, 0.0, 0.98], time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const geometry = new THREE.IcosahedronGeometry(size, q.simple ? 0 : 1);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const spikeFactor = 1.0 + 0.4 * Math.sin(Math.atan2(y, x) * spikes) * Math.cos(z / len * spikes);
    positions.setXYZ(i, x * spikeFactor, y * spikeFactor, z * spikeFactor);
  }
  geometry.computeVertexNormals();

  const uniforms = { uColor: { value: new THREE.Vector3(...color) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
  const material = q.simple
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), wireframe: true, transparent: true, opacity: 0.6 })
    : new THREE.ShaderMaterial({ vertexShader: SHAPE_VERT, fragmentShader: SHAPE_FRAG, uniforms, transparent: true, blending: THREE.AdditiveBlending });

  const mesh = new THREE.Mesh(geometry, material);
  return {
    name: 'star', object: mesh, uniforms,
    frame(delta) { uniforms.uTime.value += delta; },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      uniforms.uMouse.value.set(mx, my);
      mesh.rotation.x += (my * 0.3 - mesh.rotation.x) * delta * 0.5;
      mesh.rotation.y += (mx * 0.4 - mesh.rotation.y) * delta * 0.5;
      mesh.rotation.z += 0.08 * delta;
    },
    init(manager) { this.manager = manager; },
    dispose() { geometry.dispose(); material.dispose(); }
  };
}

// ─── Metaball Cluster — Organic blob that pulses toward cursor ────────────
const METABALL_FRAG = `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 viewDir = normalize(vViewPos);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
    float wave = sin(uTime * 0.8) * 0.15;
    vec3 col = uColor * (0.3 + 0.7 * fresnel + wave);
    float alpha = 0.4 + 0.6 * fresnel;
    gl_FragColor = vec4(col, alpha);
  }
`;

function createMetaballCluster(options = {}) {
  const {
    size = 2.0, color = [0.0, 0.94, 0.98], time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const geometry = new THREE.IcosahedronGeometry(size, q.simple ? 1 : 2);
  const positions = geometry.attributes.position;
  const originalPositions = new Float32Array(positions.array);

  const uniforms = { uColor: { value: new THREE.Vector3(...color) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
  const material = q.simple
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), wireframe: true, transparent: true, opacity: 0.5 })
    : new THREE.ShaderMaterial({ vertexShader: SHAPE_VERT, fragmentShader: METABALL_FRAG, uniforms, transparent: true, blending: THREE.AdditiveBlending });

  const mesh = new THREE.Mesh(geometry, material);
  return {
    name: 'metaball', object: mesh, uniforms, originalPositions,
    frame(delta) { uniforms.uTime.value += delta; },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      uniforms.uMouse.value.set(mx, my);
      const t = uniforms.uTime.value;
      for (let i = 0; i < positions.count; i++) {
        const ox = originalPositions[i * 3], oy = originalPositions[i * 3 + 1], oz = originalPositions[i * 3 + 2];
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
        const disp = Math.sin(ox * 2.0 + t) * Math.cos(oy * 1.5 + t * 0.7) * Math.sin(oz * 1.8 + t * 1.3);
        const mousePull = 1.0 + 0.1 * (mx * ox + my * oy) / len;
        positions.setXYZ(i, ox * (1.0 + disp * 0.2) * mousePull, oy * (1.0 + disp * 0.2) * mousePull, oz * (1.0 + disp * 0.2) * mousePull);
      }
      geometry.computeVertexNormals();
      mesh.rotation.y += 0.1 * delta;
    },
    init(manager) { this.manager = manager; },
    dispose() { geometry.dispose(); material.dispose(); }
  };
}

// ─── DNA Helix — Rotates toward cursor, color shifts ─────────────────────
function createDNAHelix(options = {}) {
  const {
    height = 8, radius = 1.5, turns = 3,
    color1 = [0.0, 0.94, 0.98], color2 = [1.0, 0.0, 0.98], time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const group = new THREE.Group();
  const subGeometries = [];
  const subMaterials = [];

  const pointsPerStrand = Math.round((q.simple ? 20 : 50) * q.countScale);
  const totalPoints = pointsPerStrand * 2;
  const positions = new Float32Array(totalPoints * 3);
  const colors = new Float32Array(totalPoints * 3);

  for (let i = 0; i < totalPoints; i++) {
    const t = i / pointsPerStrand;
    const angle = t * Math.PI * 2 * turns;
    const y = (t - 0.5) * height;
    if (i < pointsPerStrand) {
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      colors[i * 3] = color1[0]; colors[i * 3 + 1] = color1[1]; colors[i * 3 + 2] = color1[2];
    } else {
      positions[i * 3] = Math.cos(angle + Math.PI) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle + Math.PI) * radius;
      colors[i * 3] = color2[0]; colors[i * 3 + 1] = color2[1]; colors[i * 3 + 2] = color2[2];
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  subGeometries.push(geometry);
  const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7 });
  group.add(new THREE.Line(geometry, material));
  subMaterials.push(material);

  if (!q.simple) {
    const rungCount = Math.round(turns * 4 * q.countScale);
    const rungPositions = new Float32Array(rungCount * 6);
    for (let i = 0; i < rungCount; i++) {
      const t = i / rungCount;
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * height;
      const idx = i * 6;
      rungPositions[idx]     = Math.cos(angle) * radius;
      rungPositions[idx + 1] = y;
      rungPositions[idx + 2] = Math.sin(angle) * radius;
      rungPositions[idx + 3] = Math.cos(angle + Math.PI) * radius;
      rungPositions[idx + 4] = y;
      rungPositions[idx + 5] = Math.sin(angle + Math.PI) * radius;
    }
    const rungGeo = new THREE.BufferGeometry();
    rungGeo.setAttribute('position', new THREE.BufferAttribute(rungPositions, 3));
    subGeometries.push(rungGeo);
    const rungMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.5, 0.2, 0.8), transparent: true, opacity: 0.4 });
    group.add(new THREE.Line(rungGeo, rungMat));
    subMaterials.push(rungMat);
  }

  group.rotation.x = -Math.PI * 0.3;
  return {
    name: 'dna', object: group, uniforms: { uTime: { value: time } },
    frame(delta) {},
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      group.rotation.y += (mx * 0.8 - group.rotation.y + Math.PI * 0.4) * delta * 0.3;
    },
    init(manager) { this.manager = manager; },
    dispose() {
      for (const g of subGeometries) g.dispose();
      for (const m of subMaterials) m.dispose();
    }
  };
}

// ─── Crystal Formation — Tilts and iridesces toward cursor ────────────────
const CRYSTAL_FRAG = `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 viewDir = normalize(vViewPos);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 1.5);
    float iridescence = sin(fresnel * 6.28 + uTime + uMouse.x) * 0.2;
    vec3 col = uColor * (0.5 + 0.5 * fresnel + iridescence);
    float alpha = 0.6 + 0.4 * fresnel;
    gl_FragColor = vec4(col, alpha);
  }
`;

function createCrystalFormation(options = {}) {
  const {
    size = 1.2, count = 5, color = [0.73, 0.07, 1.0], time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const group = new THREE.Group();
  const crystals = [];
  const subGeometries = [];
  const subMaterials = [];

  const adjustedCount = Math.max(2, Math.round(count * q.countScale));
  for (let i = 0; i < adjustedCount; i++) {
    const crystalSize = size * (0.5 + Math.random() * 0.8);
    const geometry = new THREE.DodecahedronGeometry(crystalSize, q.simple ? 0 : 1);
    subGeometries.push(geometry);

    const uniforms = { uColor: { value: new THREE.Vector3(...color) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
    const material = q.simple
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), wireframe: true, transparent: true, opacity: 0.5 })
      : new THREE.ShaderMaterial({ vertexShader: SHAPE_VERT, fragmentShader: CRYSTAL_FRAG, uniforms, transparent: true, blending: THREE.AdditiveBlending });
    subMaterials.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    const angle = (i / adjustedCount) * Math.PI * 2;
    const r = crystalSize * 1.5;
    mesh.position.set(Math.cos(angle) * r * 0.5, (Math.random() - 0.3) * size * 2, Math.sin(angle) * r * 0.5);
    mesh.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
    group.add(mesh);
    crystals.push({ mesh, uniforms, baseRotation: mesh.rotation.clone() });
  }

  return {
    name: 'crystal', object: group, uniforms: { uTime: { value: time } }, crystals,
    frame(delta) {
      for (const c of crystals) c.uniforms.uTime.value += delta;
      this.uniforms.uTime.value += delta;
    },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      const t = this.uniforms.uTime.value;
      group.rotation.x += (my * 0.2 - group.rotation.x) * delta * 0.5;
      group.rotation.z += (mx * 0.3 - group.rotation.z) * delta * 0.5;
      for (let i = 0; i < crystals.length; i++) {
        const c = crystals[i];
        c.uniforms.uMouse.value.set(mx, my);
        c.mesh.rotation.y = c.baseRotation.y + t * (0.1 + i * 0.05);
        c.mesh.position.y += Math.sin(t * 0.5 + i) * 0.002;
      }
    },
    init(manager) { this.manager = manager; },
    dispose() {
      for (const g of subGeometries) g.dispose();
      for (const m of subMaterials) m.dispose();
    }
  };
}

// ─── Orbital System — Orbits speed up when mouse is near ──────────────────
function createOrbitalSystem(options = {}) {
  const {
    coreSize = 0.5, orbitRadius = 2.0, orbitCount = 4,
    color = [0.0, 0.94, 0.98], time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const group = new THREE.Group();
  const subGeometries = [];
  const subMaterials = [];

  const coreGeo = new THREE.IcosahedronGeometry(coreSize, q.simple ? 0 : 1);
  subGeometries.push(coreGeo);
  const coreUniforms = { uColor: { value: new THREE.Vector3(...color) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
  const coreMat = q.simple
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), wireframe: true, transparent: true, opacity: 0.7 })
    : new THREE.ShaderMaterial({ vertexShader: SHAPE_VERT, fragmentShader: SHAPE_FRAG, uniforms: coreUniforms, transparent: true, blending: THREE.AdditiveBlending });
  subMaterials.push(coreMat);
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const orbits = [];
  const adjustedCount = Math.max(1, Math.round(orbitCount * q.countScale));
  for (let i = 0; i < adjustedCount; i++) {
    const orbitSize = coreSize * (0.3 + Math.random() * 0.4);
    const r = orbitRadius * (0.5 + Math.random() * 0.8);
    const speed = 0.5 + Math.random() * 1.5;
    const tilt = Math.random() * Math.PI;

    const sphereGeo = new THREE.IcosahedronGeometry(orbitSize, 0);
    subGeometries.push(sphereGeo);
    const sphereUniforms = { uColor: { value: new THREE.Vector3(...color) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
    const sphereMat = q.simple
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), wireframe: true, transparent: true, opacity: 0.5 })
      : new THREE.ShaderMaterial({ vertexShader: SHAPE_VERT, fragmentShader: SHAPE_FRAG, uniforms: sphereUniforms, transparent: true, blending: THREE.AdditiveBlending });
    subMaterials.push(sphereMat);

    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    if (!q.simple) {
      const ringSegs = q.countScale > 0.7 ? 48 : 32;
      const ringGeo = new THREE.RingGeometry(r - 0.02, r + 0.02, ringSegs);
      subGeometries.push(ringGeo);
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: 0.1, side: THREE.DoubleSide });
      subMaterials.push(ringMat);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    orbits.push({ mesh: sphere, radius: r, speed, tilt, phase: Math.random() * Math.PI * 2 });
  }

  return {
    name: 'orbital', object: group, uniforms: { uTime: { value: time } }, orbits, coreUniforms,
    frame(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      coreUniforms.uTime.value += delta * (1 + 0.5 * Math.abs(mx));
      this.uniforms.uTime.value += delta;
    },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      coreUniforms.uMouse.value.set(mx, my);
      const t = this.uniforms.uTime.value;
      const speedMult = 1 + 0.5 * Math.abs(mx);
      for (const o of orbits) {
        const angle = t * o.speed * speedMult + o.phase;
        o.mesh.position.set(
          Math.cos(angle) * o.radius,
          Math.sin(o.tilt) * Math.sin(angle) * o.radius * 0.3,
          Math.sin(angle) * o.radius
        );
      }
      group.rotation.x += (my * 0.15 - group.rotation.x) * delta * 0.3;
      group.rotation.z += (mx * 0.1 - group.rotation.z) * delta * 0.3;
    },
    init(manager) { this.manager = manager; },
    dispose() {
      for (const g of subGeometries) g.dispose();
      for (const m of subMaterials) m.dispose();
    }
  };
}

// ─── Waveform Ring — Pulsates faster near cursor ──────────────────────────
function createWaveformRing(options = {}) {
  const {
    radius = 2.0, tubeRadius = 0.05, segments = 64,
    color = [1.0, 0.0, 0.98], time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const group = new THREE.Group();
  const geometry = new THREE.TorusGeometry(radius, tubeRadius, q.simple ? 6 : 12, Math.round(segments * q.countScale));
  const positions = geometry.attributes.position;
  const originalPositions = new Float32Array(positions.array);

  const uniforms = { uColor: { value: new THREE.Vector3(...color) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
  const material = q.simple
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), wireframe: true, transparent: true, opacity: 0.6 })
    : new THREE.ShaderMaterial({ vertexShader: SHAPE_VERT, fragmentShader: SHAPE_FRAG, uniforms, transparent: true, blending: THREE.AdditiveBlending });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);
  return {
    name: 'waveform', object: group, uniforms, originalPositions,
    frame(delta) { uniforms.uTime.value += delta; },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      uniforms.uMouse.value.set(mx, my);
      const t = uniforms.uTime.value;
      const waveSpeed = 2 + Math.abs(mx);
      const waveAmp = 0.15 + 0.05 * Math.abs(my);
      for (let i = 0; i < positions.count; i++) {
        const ox = originalPositions[i * 3], oy = originalPositions[i * 3 + 1], oz = originalPositions[i * 3 + 2];
        const angle = Math.atan2(oz, ox);
        const wave = Math.sin(angle * 8 + t * waveSpeed) * waveAmp;
        positions.setXYZ(i, ox * (1.0 + wave), oy, oz * (1.0 + wave));
      }
      geometry.computeVertexNormals();
      mesh.rotation.x += 0.05 * delta;
      group.rotation.z += (mx * 0.1 - group.rotation.z) * delta * 0.3;
    },
    init(manager) { this.manager = manager; },
    dispose() { geometry.dispose(); material.dispose(); }
  };
}

// ─── Neural Network — Nodes pulse and connect toward cursor ───────────────
function createNeuralNetwork(options = {}) {
  const {
    nodeCount = 12, spread = 4, color = [0.0, 0.94, 0.98], time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const group = new THREE.Group();
  const subGeometries = [];
  const subMaterials = [];

  const count = Math.max(3, Math.round(nodeCount * q.countScale));
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const size = q.simple ? 0.08 : 0.12;
    const geo = new THREE.IcosahedronGeometry(size, 0);
    subGeometries.push(geo);

    const uniforms = { uColor: { value: new THREE.Vector3(...color) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
    const mat = q.simple
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), wireframe: true, transparent: true, opacity: 0.6 })
      : new THREE.ShaderMaterial({ vertexShader: SHAPE_VERT, fragmentShader: SHAPE_FRAG, uniforms, transparent: true, blending: THREE.AdditiveBlending });
    subMaterials.push(mat);

    const node = new THREE.Mesh(geo, mat);
    node.position.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
    group.add(node);
    nodes.push({ mesh: node, uniforms, basePos: node.position.clone() });
  }

  if (!q.simple) {
    const totalLines = Math.min(count * 2, count * (count - 1));
    const linePositions = new Float32Array(totalLines * 6);
    let lineIdx = 0;
    for (let i = 0; i < count && lineIdx < totalLines; i++) {
      for (let j = 0; j < 2 && lineIdx < totalLines; j++) {
        const target = (i + j + 1) % count;
        const idx = lineIdx * 6;
        linePositions[idx]     = nodes[i].basePos.x;
        linePositions[idx + 1] = nodes[i].basePos.y;
        linePositions[idx + 2] = nodes[i].basePos.z;
        linePositions[idx + 3] = nodes[target].basePos.x;
        linePositions[idx + 4] = nodes[target].basePos.y;
        linePositions[idx + 5] = nodes[target].basePos.z;
        lineIdx++;
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions.subarray(0, lineIdx * 6), 3));
    subGeometries.push(lineGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: 0.2 });
    subMaterials.push(lineMat);
    group.add(new THREE.Line(lineGeo, lineMat));
  }

  return {
    name: 'neural', object: group, uniforms: { uTime: { value: time } }, nodes,
    frame(delta) { this.uniforms.uTime.value += delta; },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      const t = this.uniforms.uTime.value;
      const mouseAttract = 0.15;
      for (const n of nodes) {
        n.uniforms.uMouse.value.set(mx, my);
        const driftX = Math.sin(t * 0.5 + n.basePos.x) * 0.2 + mx * mouseAttract;
        const driftY = Math.cos(t * 0.3 + n.basePos.y) * 0.2 + my * mouseAttract;
        const driftZ = Math.sin(t * 0.4 + n.basePos.z) * 0.15;
        n.mesh.position.x = n.basePos.x + driftX;
        n.mesh.position.y = n.basePos.y + driftY;
        n.mesh.position.z = n.basePos.z + driftZ;
      }
    },
    init(manager) { this.manager = manager; },
    dispose() {
      for (const g of subGeometries) g.dispose();
      for (const m of subMaterials) m.dispose();
    }
  };
}

// ─── Möbius Strip — Twists toward cursor, color shifts ───────────────────
function createMobiusStrip(options = {}) {
  const {
    radius = 1.5, width = 0.4, segments = 64,
    color = [1.0, 0.0, 0.98], time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);

  const segU = Math.round(segments * q.countScale);
  const segV = q.simple ? 6 : 10;

  const vertices = [], normals = [], indices = [], uvs = [];

  for (let i = 0; i <= segU; i++) {
    const u = (i / segU) * Math.PI * 2;
    for (let j = 0; j <= segV; j++) {
      const v = (j / segV - 0.5) * width;
      const halfU = u / 2;
      const x = (radius + v * Math.cos(halfU)) * Math.cos(u);
      const y = (radius + v * Math.cos(halfU)) * Math.sin(u);
      const z = v * Math.sin(halfU);
      vertices.push(x, y, z);
      normals.push(0, 0, 1);
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

  const uniforms = { uColor: { value: new THREE.Vector3(...color) }, uTime: { value: time }, uMouse: { value: new THREE.Vector2() } };
  const material = q.simple
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), wireframe: true, transparent: true, opacity: 0.5 })
    : new THREE.ShaderMaterial({ vertexShader: SHAPE_VERT, fragmentShader: SHAPE_FRAG, uniforms, transparent: true, blending: THREE.AdditiveBlending });

  const mesh = new THREE.Mesh(geometry, material);
  return {
    name: 'mobius', object: mesh, uniforms,
    frame(delta) { uniforms.uTime.value += delta; },
    animate(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      uniforms.uMouse.value.set(mx, my);
      mesh.rotation.y += (mx * 0.5 - mesh.rotation.y) * delta * 0.4;
      mesh.rotation.x += (my * 0.3 - mesh.rotation.x) * delta * 0.4;
    },
    init(manager) { this.manager = manager; },
    dispose() { geometry.dispose(); material.dispose(); }
  };
}

// ─── Terminal Nebula — Interactive particle field (showpiece) ────────────
// A dense field of glowing particles that flow toward/around cursor,
// with color shifts from terminal green to neon pink.
function createTerminalNebula(options = {}) {
  const {
    count = 500, spread = 12, time = 0,
    isMobile = false, gpuTier = 1
  } = options;
  const q = getQuality(isMobile, gpuTier);
  const particleCount = Math.round(count * q.countScale);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const velocities = new Float32Array(particleCount * 3);
  const originalPos = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = spread * (0.2 + 0.8 * Math.cbrt(Math.random()));
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    originalPos[i * 3] = positions[i * 3];
    originalPos[i * 3 + 1] = positions[i * 3 + 1];
    originalPos[i * 3 + 2] = positions[i * 3 + 2];
    // Terminal green to neon pink gradient
    const mix = Math.random();
    colors[i * 3] = mix * 1.0;
    colors[i * 3 + 1] = (1 - mix) * 0.94 + mix * 0.0;
    colors[i * 3 + 2] = mix * 0.98;
    sizes[i] = 0.05 + Math.random() * 0.1;
    velocities[i * 3] = (Math.random() - 0.5) * 0.3;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

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
    name: 'nebula', object: particles, uniforms,
    originalPos, velocities, particleCount, geometry,
    frame(delta) {
      const mx = this.manager ? this.manager.mouse.x : 0;
      const my = this.manager ? this.manager.mouse.y : 0;
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Drift toward cursor in XZ plane
        const targetX = originalPos[i3] + mx * 2;
        const targetY = originalPos[i3 + 1] + my * 2;
        const targetZ = originalPos[i3 + 2];
        pos[i3] += (targetX - pos[i3]) * delta * 0.5;
        pos[i3 + 1] += (targetY - pos[i3 + 1]) * delta * 0.5;
        // Ambient noise
        pos[i3] += Math.sin(uniforms.uTime.value + i) * delta * 0.05;
        pos[i3 + 1] += Math.cos(uniforms.uTime.value * 0.7 + i * 1.3) * delta * 0.05;
        pos[i3 + 2] += Math.sin(uniforms.uTime.value * 0.5 + i * 0.7) * delta * 0.05;
      }
      geometry.attributes.position.needsUpdate = true;
      uniforms.uTime.value += delta;
      particles.rotation.y += delta * 0.02;
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

  // Interactive particle nebula — center stage
  const nebula = createTerminalNebula({ count: 600, spread: 14, gpuTier, isMobile });
  nebula.object.position.set(0, 0, -16);
  manager.scene.add(nebula.object);
  components.push(nebula);

  // Crystal cluster — left
  const crystals = createCrystalFormation({ count: 5, size: 1.0, gpuTier, isMobile });
  crystals.object.position.set(-xPad, -2, -12);
  manager.scene.add(crystals.object);
  components.push(crystals);

  // Neural network — right
  const neural = createNeuralNetwork({ nodeCount: 8, spread: 3, gpuTier, isMobile });
  neural.object.position.set(xPad, 0, -14);
  manager.scene.add(neural.object);
  components.push(neural);

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

  // Cloud → Orbital system (left)
  const orbital = createOrbitalSystem({ orbitCount: 3, orbitRadius: 1.5, color: [0.0, 0.94, 0.98], gpuTier, isMobile });
  orbital.object.position.set(-xPad, 0, -15);
  manager.scene.add(orbital.object);
  components.push(orbital);

  // DevOps → Crystal formation (right)
  const crystals = createCrystalFormation({ count: 4, size: 0.8, color: [0.73, 0.07, 1.0], gpuTier, isMobile });
  crystals.object.position.set(xPad, -1, -15);
  manager.scene.add(crystals.object);
  components.push(crystals);

  // IoT → DNA helix (center)
  const dna = createDNAHelix({ height: 6, radius: 1.2, color1: [1.0, 0.0, 0.98], color2: [0.0, 0.94, 0.98], gpuTier, isMobile });
  dna.object.position.set(0, -2, -18);
  manager.scene.add(dna.object);
  components.push(dna);

  // Web → Waveform ring (top)
  const wave = createWaveformRing({ radius: 1.5, segments: 48, color: [0.0, 1.0, 0.25], gpuTier, isMobile });
  wave.object.position.set(0, 3, -12);
  manager.scene.add(wave.object);
  components.push(wave);

  return { name: 'projects', components, objects: components.flatMap(c => [c.object]) };
}

function buildDashboardScene(manager) {
  const components = [];
  const gpuTier = manager.gpuTier ?? 1;
  const isMobile = manager.isMobile;
  const xPad = isMobile ? 6 : 10;

  // Central orb with orbiting metrics
  const orbital = createOrbitalSystem({ coreSize: 0.6, orbitCount: 5, orbitRadius: 2.0, gpuTier, isMobile });
  orbital.object.position.set(0, 0, -12);
  manager.scene.add(orbital.object);
  components.push(orbital);

  // Waveform ring (top)
  const wave = createWaveformRing({ radius: 2.5, color: [0.0, 0.94, 0.98], gpuTier, isMobile });
  wave.object.position.set(0, 4, -15);
  manager.scene.add(wave.object);
  components.push(wave);

  // Neural network (bottom right)
  const neural = createNeuralNetwork({ nodeCount: 6, spread: 2.5, gpuTier, isMobile });
  neural.object.position.set(xPad, -3, -14);
  manager.scene.add(neural.object);
  components.push(neural);

  return { name: 'dashboard', components, objects: components.flatMap(c => [c.object]) };
}

function buildWriteupsScene(manager) {
  const components = [];
  const gpuTier = manager.gpuTier ?? 1;
  const isMobile = manager.isMobile;
  const xPad = isMobile ? 6 : 10;

  const star = createStarBurst({ size: 1.2, spikes: 6, color: [0.73, 0.07, 1.0], gpuTier, isMobile });
  star.object.position.set(0, 1, -15);
  manager.scene.add(star.object);
  components.push(star);

  const meta = createMetaballCluster({ size: 2.0, color: [0.0, 0.94, 0.98], gpuTier, isMobile });
  meta.object.position.set(-xPad, -2, -18);
  manager.scene.add(meta.object);
  components.push(meta);

  const orbital = createOrbitalSystem({ coreSize: 0.3, orbitCount: 2, orbitRadius: 1.5, color: [1.0, 0.0, 0.98], gpuTier, isMobile });
  orbital.object.position.set(xPad, 2, -20);
  manager.scene.add(orbital.object);
  components.push(orbital);

  return { name: 'writeups', components, objects: components.flatMap(c => [c.object]) };
}

function buildContactScene(manager) {
  const components = [];
  const gpuTier = manager.gpuTier ?? 1;
  const isMobile = manager.isMobile;
  const xPad = isMobile ? 6 : 12;

  const mobius = createMobiusStrip({ radius: 1.8, width: 0.5, color: [1.0, 0.0, 0.98], gpuTier, isMobile });
  mobius.object.position.set(0, 0, -12);
  manager.scene.add(mobius.object);
  components.push(mobius);

  const neural = createNeuralNetwork({ nodeCount: 6, spread: 3, color: [0.0, 0.94, 0.98], gpuTier, isMobile });
  neural.object.position.set(-xPad, 1, -15);
  manager.scene.add(neural.object);
  components.push(neural);

  const wave = createWaveformRing({ radius: 2.0, color: [0.73, 0.07, 1.0], gpuTier, isMobile });
  wave.object.position.set(0, 5, -16);
  manager.scene.add(wave.object);
  components.push(wave);

  return { name: 'contact', components, objects: components.flatMap(c => [c.object]) };
}

export {
  createStarBurst, createMetaballCluster, createDNAHelix, createCrystalFormation,
  createOrbitalSystem, createWaveformRing, createNeuralNetwork, createMobiusStrip,
  createTerminalNebula,
  buildTerminalScene, buildProjectExplorerScene, buildDashboardScene,
  buildWriteupsScene, buildContactScene
};
