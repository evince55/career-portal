// 3D Interaction Layer — Mouse/touch raycasting + keyboard navigation
// Hover: scale up + color brighten. Click: pulse animation. Tab/Enter for keyboard.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

function createInteraction(options = {}) {
  const {
    interactiveObjects = [],
    hoverScale = 1.3,
    pulseDuration = 300,
    time = 0
  } = options;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(9999, 9999);
  let camera = null;
  let canvas = null;
  let hoveredObject = null;
  let pulseStart = 0;
  let pulseTarget = null;
  let pulseOriginalScale = 1;
  let isPulsing = false;

  const uniforms = {
    uTime: { value: time }
  };

  function getInteractiveMeshes() {
    const meshes = [];
    for (const obj of interactiveObjects) {
      if (obj.userData && obj.userData.interactive) {
        meshes.push(obj);
      }
    }
    return meshes;
  }

  function handlePointerMove(clientX, clientY) {
    if (!canvas || !camera) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const meshes = getInteractiveMeshes();
    if (meshes.length === 0) return;

    raycaster.setFromCamera(camera, mouse);
    const intersects = raycaster.intersectObjects(meshes, false);

    // Reset previous hover
    if (hoveredObject && (!intersects.length || intersects[0].object !== hoveredObject)) {
      const u = hoveredObject.material.uniforms;
      if (u && u.uHover) {
        u.uHover.value = 0;
      }
      hoveredObject.scale.setScalar(1);
      hoveredObject = null;
    }

    // Set new hover
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj !== hoveredObject) {
        hoveredObject = obj;
        const u = obj.material.uniforms;
        if (u && u.uHover) {
          u.uHover.value = 1;
        }
        obj.scale.setScalar(hoverScale);
      }
    }
  }

  function handlePointerDown(clientX, clientY) {
    if (!canvas || !camera) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const meshes = getInteractiveMeshes();
    if (meshes.length === 0) return;

    raycaster.setFromCamera(camera, mouse);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      pulseStart = performance.now();
      pulseTarget = obj;
      pulseOriginalScale = obj.scale.x;
      isPulsing = true;
    }
  }

  function updatePulse() {
    if (!isPulsing || !pulseTarget) return;

    const elapsed = performance.now() - pulseStart;
    const progress = elapsed / pulseDuration;

    if (progress >= 1) {
      pulseTarget.scale.setScalar(pulseOriginalScale);
      isPulsing = false;
      pulseTarget = null;
      return;
    }

    // Pulse: scale up then back down using ease-out
    const pulse = 1 + Math.sin(progress * Math.PI) * 0.2 * (hoverScale - 1);
    pulseTarget.scale.setScalar(pulseOriginalScale * pulse);
  }

  function handleKeyDown(e) {
    if (!camera || !canvas) return;
    if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== ' ') return;

    const meshes = getInteractiveMeshes();
    if (meshes.length === 0) return;

    // Find currently focused interactive object
    const currentIndex = meshes.indexOf(document.activeElement);

    if (e.key === 'Tab') {
      // Cycle to next interactive object
      const nextIndex = (currentIndex + 1) % meshes.length;
      if (nextIndex >= 0) {
        meshes[nextIndex].focus && meshes[nextIndex].focus();
      }
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      // Trigger pulse on current object
      if (currentIndex >= 0) {
        pulseStart = performance.now();
        pulseTarget = meshes[currentIndex];
        pulseOriginalScale = pulseTarget.scale.x;
        isPulsing = true;
        e.preventDefault();
      }
    }
  }

  function resetHover() {
    if (hoveredObject) {
      const u = hoveredObject.material.uniforms;
      if (u && u.uHover) {
        u.uHover.value = 0;
      }
      hoveredObject.scale.setScalar(1);
      hoveredObject = null;
    }
  }

  return {
    name: 'interaction',
    uniforms,
    frame(delta) {
      uniforms.uTime.value += delta;
      updatePulse();
    },
    animate() {},
    init(manager) {
      if (!manager) return;
      camera = manager.camera;
      canvas = manager.canvas;

      if (!canvas || !camera) return;

      canvas.addEventListener('pointermove', (e) => {
        handlePointerMove(e.clientX, e.clientY);
      });

      canvas.addEventListener('pointerdown', (e) => {
        handlePointerDown(e.clientX, e.clientY);
      });

      canvas.addEventListener('pointerleave', () => {
        resetHover();
      });

      document.addEventListener('keydown', (e) => {
        handleKeyDown(e);
      });

      window.addEventListener('blur', () => {
        resetHover();
      });
    },
    dispose() {
      // Event listeners are cleaned up when canvas is removed from DOM
    }
  };
}

export default createInteraction;
export { createInteraction };
