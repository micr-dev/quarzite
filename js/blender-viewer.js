import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL_HEIGHT = 2.25;
const CAMERA_FIT_DESKTOP = 0.55;
const CAMERA_FIT_NARROW = 1.18;
const KEYBOARD_MOVE_SPEED = 1.35;
const VIEWER_SELECTOR = ".blender-viewer";

function createLineObject(points, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.78 });
  return new THREE.LineSegments(geometry, material);
}

function createCameraWireframe() {
  const p = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.55, -0.36, -0.86),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.55, -0.36, -0.86),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.55, 0.36, -0.86),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.55, 0.36, -0.86),
    new THREE.Vector3(-0.55, -0.36, -0.86),
    new THREE.Vector3(0.55, -0.36, -0.86),
    new THREE.Vector3(0.55, -0.36, -0.86),
    new THREE.Vector3(0.55, 0.36, -0.86),
    new THREE.Vector3(0.55, 0.36, -0.86),
    new THREE.Vector3(-0.55, 0.36, -0.86),
    new THREE.Vector3(-0.55, 0.36, -0.86),
    new THREE.Vector3(-0.55, -0.36, -0.86),
  ];

  const cameraWire = createLineObject(p, 0x050505);
  cameraWire.position.set(-1.72, 0.75, 0.05);
  cameraWire.rotation.set(-0.1, -0.55, 0);
  return cameraWire;
}

function createLampMarker() {
  const cone = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.44, -1.15, -0.32),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.44, -1.15, -0.32),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.44, -1.15, 0.32),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.44, -1.15, 0.32),
    new THREE.Vector3(-0.44, -1.15, -0.32),
    new THREE.Vector3(0.44, -1.15, -0.32),
    new THREE.Vector3(0.44, -1.15, -0.32),
    new THREE.Vector3(0.44, -1.15, 0.32),
    new THREE.Vector3(0.44, -1.15, 0.32),
    new THREE.Vector3(-0.44, -1.15, 0.32),
    new THREE.Vector3(-0.44, -1.15, 0.32),
    new THREE.Vector3(-0.44, -1.15, -0.32),
  ];

  const lamp = createLineObject(cone, 0x1c1d18);
  lamp.position.set(1.8, 1.55, -0.25);
  lamp.rotation.set(0.1, 0.35, 0);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 6),
    new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true }),
  );
  halo.position.copy(lamp.position);

  const group = new THREE.Group();
  group.add(lamp, halo);
  return group;
}

function createTransformGizmo() {
  const group = new THREE.Group();
  const origin = new THREE.Vector3(0, 0.08, 0);

  group.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, 0.55, 0xf04032, 0.16, 0.08));
  group.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, 0.65, 0x2a56ff, 0.16, 0.08));
  group.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), origin, 0.55, 0x27b64f, 0.16, 0.08));

  return group;
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();

    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value && typeof value.dispose === "function") value.dispose();
        });
        material.dispose();
      });
    }
  });
}

function makeLowPolyMaterial(material) {
  const clone = material.clone();
  clone.flatShading = true;
  clone.needsUpdate = true;
  return clone;
}

function normalizeModel(model) {
  const initialBox = new THREE.Box3().setFromObject(model);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const initialCenter = initialBox.getCenter(new THREE.Vector3());
  const height = Math.max(initialSize.y, 0.001);

  model.position.sub(initialCenter);
  model.scale.multiplyScalar(MODEL_HEIGHT / height);
  model.updateMatrixWorld(true);

  const centeredBox = new THREE.Box3().setFromObject(model);
  const minY = centeredBox.min.y;
  model.position.y -= minY;
  model.rotation.y = Math.PI * 0.08;
  model.updateMatrixWorld(true);
}

function fitCameraToModel(camera, controls, model, host) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const aspect = Math.max(host.clientWidth / Math.max(host.clientHeight, 1), 0.5);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance =
    (maxDim / (2 * Math.tan(fov / 2))) *
    (aspect < 1 ? CAMERA_FIT_NARROW : CAMERA_FIT_DESKTOP);

  controls.target.copy(center);
  controls.target.y += size.y * 0.08;

  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance * 100;
  camera.position.set(center.x + distance * 0.72, center.y + distance * 0.38, center.z + distance * 0.92);
  camera.updateProjectionMatrix();
  controls.update();
}

function initViewer(viewer) {
  const host = viewer.querySelector(".blender-canvas-host");
  const spinToggle = viewer.querySelector(".blender-spin-toggle");
  const modelSrc = viewer.dataset.modelSrc;
  if (!host || !modelSrc) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x38363d);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.outline = "none";
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  const shouldAutoRotate = !window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  controls.autoRotate = shouldAutoRotate;
  controls.autoRotateSpeed = 0.65;
  controls.enablePan = true;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.DOLLY;
  controls.minDistance = 0.55;
  controls.maxDistance = 8;

  scene.add(new THREE.HemisphereLight(0xbec9ff, 0x2e2e34, 2.1));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(2.7, 3.8, 4.5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd7c1ff, 0.85);
  fillLight.position.set(-3.8, 2.4, 2.6);
  scene.add(fillLight);

  const grid = new THREE.GridHelper(5.2, 18, 0x526652, 0x4c504d);
  grid.position.y = -0.01;
  scene.add(grid);
  scene.add(createCameraWireframe());
  scene.add(createLampMarker());
  scene.add(createTransformGizmo());

  let model = null;
  let animationFrame = 0;
  let isKeyboardActive = false;
  const clock = new THREE.Clock();
  const pressedKeys = new Set();

  function updateSpinToggle() {
    if (!spinToggle) return;

    spinToggle.textContent = controls.autoRotate ? "Stop" : "Spin";
    spinToggle.setAttribute("aria-pressed", String(controls.autoRotate));
    viewer.dataset.spin = controls.autoRotate ? "on" : "off";
  }

  function isTypingTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true']")
    );
  }

  function shouldHandleKeyboard(event) {
    return (
      isKeyboardActive &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !isTypingTarget(event.target)
    );
  }

  function updateKeyboardMovement(deltaTime) {
    if (!isKeyboardActive || pressedKeys.size === 0) return;

    const forwardIntent =
      (pressedKeys.has("KeyW") ? 1 : 0) - (pressedKeys.has("KeyS") ? 1 : 0);
    const strafeIntent =
      (pressedKeys.has("KeyD") ? 1 : 0) - (pressedKeys.has("KeyA") ? 1 : 0);
    if (forwardIntent === 0 && strafeIntent === 0) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.0001) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }

    const right = new THREE.Vector3()
      .crossVectors(forward, camera.up)
      .normalize();
    const movement = new THREE.Vector3()
      .addScaledVector(forward, forwardIntent)
      .addScaledVector(right, strafeIntent);
    if (movement.lengthSq() < 0.0001) return;

    movement.normalize().multiplyScalar(KEYBOARD_MOVE_SPEED * deltaTime);
    camera.position.add(movement);
    controls.target.add(movement);
  }

  function handlePointerEnter() {
    isKeyboardActive = true;
  }

  function handlePointerLeave() {
    if (document.activeElement !== renderer.domElement) {
      isKeyboardActive = false;
      pressedKeys.clear();
    }
  }

  function handlePointerDown(event) {
    isKeyboardActive = true;
    renderer.domElement.focus();

    if (event.button === 1) {
      event.preventDefault();
    }
  }

  function handleAuxClick(event) {
    if (event.button === 1) event.preventDefault();
  }

  function handleKeyDown(event) {
    if (!shouldHandleKeyboard(event)) return;
    if (!["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) return;

    event.preventDefault();
    pressedKeys.add(event.code);
  }

  function handleKeyUp(event) {
    if (!["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) return;

    pressedKeys.delete(event.code);
  }

  function handleWindowBlur() {
    pressedKeys.clear();
  }

  function handleSpinToggleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    controls.autoRotate = !controls.autoRotate;
    updateSpinToggle();
  }

  host.addEventListener("pointerenter", handlePointerEnter);
  host.addEventListener("pointerleave", handlePointerLeave);
  renderer.domElement.addEventListener("pointerdown", handlePointerDown);
  renderer.domElement.addEventListener("auxclick", handleAuxClick);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", handleWindowBlur);
  spinToggle?.addEventListener("click", handleSpinToggleClick);
  updateSpinToggle();

  function resize() {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    if (model) fitCameraToModel(camera, controls, model, host);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  new GLTFLoader().load(
    modelSrc,
    (gltf) => {
      model = gltf.scene;
      model.traverse((child) => {
        if (!child.isMesh || !child.material) return;

        child.castShadow = false;
        child.receiveShadow = false;
        child.material = Array.isArray(child.material)
          ? child.material.map(makeLowPolyMaterial)
          : makeLowPolyMaterial(child.material);
      });

      normalizeModel(model);
      scene.add(model);
      fitCameraToModel(camera, controls, model, host);
      viewer.classList.add("is-loaded");
    },
    undefined,
    (error) => {
      viewer.classList.add("is-error");
      const loading = viewer.querySelector(".blender-loading");
      if (loading) loading.textContent = "Could not load Quarzite";
      console.error("Failed to load Quarzite GLB", error);
    },
  );

  function animate() {
    const deltaTime = Math.min(clock.getDelta(), 0.05);
    updateKeyboardMovement(deltaTime);
    controls.update();
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }

  resize();
  animate();

  return () => {
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    host.removeEventListener("pointerenter", handlePointerEnter);
    host.removeEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
    renderer.domElement.removeEventListener("auxclick", handleAuxClick);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", handleWindowBlur);
    spinToggle?.removeEventListener("click", handleSpinToggleClick);
    controls.dispose();
    renderer.dispose();
    disposeObject(scene);
    renderer.domElement.remove();
  };
}

const disposers = [];

document.querySelectorAll(VIEWER_SELECTOR).forEach((viewer) => {
  const dispose = initViewer(viewer);
  if (dispose) disposers.push(dispose);
});

window.addEventListener("pagehide", () => {
  while (disposers.length > 0) {
    const dispose = disposers.pop();
    dispose();
  }
});
