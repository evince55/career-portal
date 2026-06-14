// Floating Wireframe Shapes — Low-poly geometries with custom Fresnel neon glow
// Each shape has independent rotation + floating animation with phase offset

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const SHAPE_VERT = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 viewP = viewMatrix * modelMatrix * vec4(position, 1.0);
    vViewPos = -viewP.xyz;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewP;
  }
`;

const SHAPE_FRAG = `
  precision mediump float;

  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vWorldPos;

  void main() {
    // Fresnel rim lighting for neon glow effect
    vec3 viewDir = normalize(vViewPos);
    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
    fresnel = pow(fresnel, 2.0);

    // Base wireframe color with rim glow
    vec3 baseColor = uColor * (0.3 + 0.7 * fresnel);

    // Hover brightening
    baseColor += uColor * uHover * 0.5;

    // Subtle pulsing
    float pulse = 1.0 + sin(uTime * 2.0) * 0.05;
    baseColor *= pulse;

    float alpha = (0.4 + 0.6 * fresnel) * uOpacity;
    alpha += uHover * 0.2;

    gl_FragColor = vec4(baseColor, alpha);
  }
`;

const WIREFRAME_FRAG = `
  precision mediump float;

  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uTime;
  uniform float uWireframeAlpha;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vWorldPos;

  void main() {
    // Fresnel rim lighting for neon glow effect
    vec3 viewDir = normalize(vViewPos);
    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
    fresnel = pow(fresnel, 2.0);

    // Base wireframe color with rim glow
    vec3 baseColor = uColor * (uWireframeAlpha * 0.5 + 0.5 * fresnel);

    // Hover brightening
    baseColor += uColor * uHover * 0.6;

    // Subtle pulsing
    float pulse = 1.0 + sin(uTime * 2.0) * 0.05;
    baseColor *= pulse;

    float alpha = (uWireframeAlpha * 0.3 + 0.7 * fresnel) * uOpacity;
    alpha += uHover * 0.25;

    gl_FragColor = vec4(baseColor, alpha);
  }
`;

function createShape(geomType, options = {}) {
  const {
    size = 1,
    color = [0.0, 0.94, 0.98],
    wireframe = true,
    position = [0, 0, 0],
    rotationSpeed = [0.2, 0.3, 0.1],
    floatAmplitude = 0.5,
    phase = 0,
    interactive = false,
    time = 0
  } = options;

  let geometry;
  switch (geomType) {
    case 'icosahedron':
      geometry = new THREE.IcosahedronGeometry(size, 1);
      break;
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(size, 0);
      break;
    case 'torusKnot':
      geometry = new THREE.TorusKnotGeometry(size * 0.8, size * 0.25, 48, 8, 2, 3);
      break;
    default:
      geometry = new THREE.IcosahedronGeometry(size, 1);
  }

  const uniforms = {
    uColor: { value: new THREE.Vector3(...color) },
    uOpacity: { value: 0.6 },
    uHover: { value: 0 },
    uTime: { value: time },
    uWireframeAlpha: { value: wireframe ? 0.5 : 1.0 }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: SHAPE_VERT,
    fragmentShader: WIREFRAME_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    wireframe: wireframe
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.userData.interactive = interactive;
  mesh.userData.baseScale = size;
  mesh.userData.phase = phase;
  mesh.userData.rotationSpeed = rotationSpeed;
  mesh.userData.floatAmplitude = floatAmplitude;

  return {
    name: 'shape',
    object: mesh,
    uniforms,
    frame(delta) {
      uniforms.uTime.value += delta;
    },
    animate(delta) {
      const t = uniforms.uTime.value;
      const p = mesh.userData.phase;

      // Rotation
      mesh.rotation.x += mesh.userData.rotationSpeed[0] * delta;
      mesh.rotation.y += mesh.userData.rotationSpeed[1] * delta;
      mesh.rotation.z += mesh.userData.rotationSpeed[2] * delta;

      // Floating motion
      mesh.position.y = position[1] + Math.sin(t * 0.5 + p) * mesh.userData.floatAmplitude;
    },
    init() {},
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}

function createShapes(options = {}) {
  const {
    count = 3,
    gpuTier = 1,
    time = 0
  } = options;

  const shapes = [];
  const geometries = ['icosahedron', 'octahedron', 'torusKnot'];
  const colors = [
    [1.0, 0.0, 0.98],
    [0.73, 0.07, 1.0],
    [0.0, 0.94, 0.98]
  ];

  const actualCount = gpuTier >= 2 ? Math.min(count, 5) : Math.min(count, 3);

  for (let i = 0; i < actualCount; i++) {
    const geomType = geometries[i % geometries.length];
    const color = colors[i % colors.length];
    const interactive = i === 0 && gpuTier >= 2;

    const shape = createShape(geomType, {
      size: 0.8 + Math.random() * 1.2,
      color,
      wireframe: true,
      position: [
        (Math.random() - 0.5) * 40,
        2 + Math.random() * 8,
        -10 - Math.random() * 30
      ],
      rotationSpeed: [
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.2
      ],
      floatAmplitude: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      interactive,
      time
    });

    shapes.push(shape);
  }

  return {
    name: 'shapes',
    components: shapes,
    objects: shapes.map(s => s.object),
    frame(delta) {
      for (const s of shapes) {
        s.frame(delta);
      }
    },
    animate(delta) {
      for (const s of shapes) {
        s.animate(delta);
      }
    },
    init(manager) {
      for (const s of shapes) {
        manager?.scene?.add(s.object);
      }
    },
    dispose() {
      for (const s of shapes) {
        s.dispose();
      }
    }
  };
}

export default createShapes;
export { createShape, createShapes, SHAPE_VERT, SHAPE_FRAG, WIREFRAME_FRAG };
