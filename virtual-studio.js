import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/meshopt_decoder.module.js";

const canvas = document.getElementById("virtualCanvas");
const wrap = document.getElementById("virtualCanvasWrap");
const loading = document.getElementById("virtualLoading");

if (canvas && wrap) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222321);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 1.35, 5.7);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1.0);
  fill.position.set(3, 3, -4);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 64),
    new THREE.MeshStandardMaterial({ color: 0xbabbb7, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  floor.receiveShadow = true;
  scene.add(floor);

  const avatar = new THREE.Group();
  scene.add(avatar);
  const fallback = new THREE.Group();
  avatar.add(fallback);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc99470, roughness: 0.86 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x777b80, roughness: 0.92 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x34383e, roughness: 0.95 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222326, roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x292522, roughness: 1 });

  function capsule(radius, length, material, x, y, z, parent=fallback) {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 5, 10), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function sphere(rx, ry, rz, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material);
    mesh.scale.set(rx, ry, rz);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    fallback.add(mesh);
    return mesh;
  }
  function buildFallback(kind) {
    fallback.clear();
    const female = kind === "female";
    capsule(.19, .55, shirtMat, 0, 1.55, 0);
    sphere(female ? .36 : .4, .25, .2, shirtMat, 0, 1.68, 0);
    capsule(.105, .32, skinMat, 0, 2.05, 0);
    sphere(.145, .19, .14, skinMat, 0, 2.36, 0);
    sphere(.15, .11, .15, hairMat, 0, 2.49, -.015);
    capsule(.075, .5, shirtMat, -.48, 1.55, 0).rotation.z = -.12;
    capsule(.075, .5, shirtMat, .48, 1.55, 0).rotation.z = .12;
    capsule(.065, .48, skinMat, -.51, 1.03, 0).rotation.z = -.12;
    capsule(.065, .48, skinMat, .51, 1.03, 0).rotation.z = .12;
    capsule(female ? .105 : .12, .47, pantsMat, -.14, .72, 0);
    capsule(female ? .105 : .12, .47, pantsMat, .14, .72, 0);
    capsule(.075, .55, pantsMat, -.14, .28, 0);
    capsule(.075, .55, pantsMat, .14, .28, 0);
    capsule(.09, .12, shoeMat, -.14, -.005, .06);
    capsule(.09, .12, shoeMat, .14, -.005, .06);
    if (female) {
      sphere(.12, .17, .12, hairMat, -.12, 2.34, -.025);
      sphere(.12, .17, .12, hairMat, .12, 2.34, -.025);
    } else {
      sphere(.15, .06, .14, hairMat, 0, 2.43, .02);
    }
    fallback.scale.set(female ? .96 : 1, female ? .98 : 1, 1);
  }

  const modelUrls = {
    male: "https://models.codelove.in/models/male-adult-01.glb",
    female: "https://models.codelove.in/models/female-adult-01.glb"
  };
  const loadedModels = new Map();
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let activeKind = "male";
  let activeModel = null;
  let dragging = false;
  let lastX = 0;
  let zoom = 5.7;
  let targetRotation = 0;
  let currentRotation = 0;

  function setStatus(message) {
    if (loading) {
      loading.textContent = message;
      loading.classList.remove("hidden");
    }
  }
  function showFallback(kind, message) {
    if (activeModel) {
      avatar.remove(activeModel);
      activeModel = null;
    }
    buildFallback(kind);
    fallback.visible = true;
    if (loading) {
      loading.textContent = message;
      loading.classList.remove("hidden");
    }
  }
  function fitModel(model) {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const height = Math.max(size.y, 0.1);
    const scale = 2.48 / height;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) node.material.side = THREE.FrontSide;
      }
    });
  }
  function activateModel(kind, model) {
    if (activeModel) avatar.remove(activeModel);
    fallback.visible = false;
    activeModel = model;
    avatar.add(model);
    avatar.rotation.y = 0;
    currentRotation = 0;
    targetRotation = 0;
    activeKind = kind;
    if (loading) loading.classList.add("hidden");
  }
  function loadAvatar(kind) {
    activeKind = kind;
    if (loadedModels.has(kind)) {
      activateModel(kind, loadedModels.get(kind));
      return;
    }
    setStatus("Loading 3D human model…");
    loader.load(
      modelUrls[kind],
      gltf => {
        const model = gltf.scene;
        fitModel(model);
        loadedModels.set(kind, model);
        if (activeKind === kind) activateModel(kind, model);
      },
      undefined,
      error => {
        console.error("YourWardrobe avatar model could not be loaded:", error);
        if (activeKind === kind) {
          showFallback(kind, "Could not load the model. Showing the backup preview.");
        }
      }
    );
  }

  loadAvatar("male");

  function resize() {
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(wrap);
  else window.addEventListener("resize", resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);
    currentRotation += (targetRotation - currentRotation) * 0.16;
    avatar.rotation.y = currentRotation;
    camera.position.z += (zoom - camera.position.z) * 0.14;
    renderer.render(scene, camera);
  }
  animate();

  canvas.addEventListener("pointerdown", event => {
    dragging = true;
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
    if (!dragging) return;
    targetRotation += (event.clientX - lastX) * 0.012;
    lastX = event.clientX;
  });
  canvas.addEventListener("pointerup", () => dragging = false);
  canvas.addEventListener("pointercancel", () => dragging = false);
  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom + event.deltaY * 0.008, 3.2, 8.5);
  }, { passive: false });

  document.querySelectorAll("[data-avatar]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-avatar]").forEach(item => item.classList.toggle("active", item === button));
      loadAvatar(button.dataset.avatar);
    });
  });

  document.getElementById("rotateLeft")?.addEventListener("click", () => targetRotation -= Math.PI / 4);
  document.getElementById("rotateRight")?.addEventListener("click", () => targetRotation += Math.PI / 4);
  document.getElementById("viewFront")?.addEventListener("click", () => targetRotation = 0);
  document.getElementById("viewSide")?.addEventListener("click", () => targetRotation = Math.PI / 2);
  document.getElementById("viewBack")?.addEventListener("click", () => targetRotation = Math.PI);
  document.getElementById("zoomIn")?.addEventListener("click", () => zoom = THREE.MathUtils.clamp(zoom - .5, 3.2, 8.5));
  document.getElementById("zoomOut")?.addEventListener("click", () => zoom = THREE.MathUtils.clamp(zoom + .5, 3.2, 8.5));

  document.getElementById("syncVirtualOutfit")?.addEventListener("click", () => {
    const pairs = [["topPreview", "virtualTopStatus"], ["bottomPreview", "virtualBottomStatus"], ["shoesPreview", "virtualShoesStatus"]];
    pairs.forEach(([source, target]) => {
      const image = document.querySelector("#" + source + " .slot-visual img");
      document.getElementById(target).textContent = image?.getAttribute("src") ? "Image selected" : "Not selected";
    });
    const hasAny = pairs.some(([source]) => document.querySelector("#" + source + " .slot-visual img")?.getAttribute("src"));
    const message = document.querySelector(".virtual-disclaimer");
    if (message) message.textContent = hasAny
      ? "Your Home outfit is detected. Clothing textures and realistic fitting are the next development stage."
      : "Choose clothes on Home first, then tap Use Home outfit.";
  });
}
