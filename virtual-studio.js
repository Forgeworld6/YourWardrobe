import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const canvas = document.getElementById("virtualCanvas");
const wrap = document.getElementById("virtualCanvasWrap");
const loading = document.getElementById("virtualLoading");
if (canvas && wrap) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 1.55, 6.8);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(3, 3, -4);
  scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshStandardMaterial({ color: 0xbabbb7, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  floor.receiveShadow = true;
  scene.add(floor);
  const avatar = new THREE.Group();
  scene.add(avatar);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc99470, roughness: 0.86 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x777b80, roughness: 0.92 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x34383e, roughness: 0.95 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222326, roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x292522, roughness: 1 });
  function capsule(radius, length, material, x, y, z, parent=avatar) {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 5, 10), material);
    mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function sphere(rx, ry, rz, material, x,y,z) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material);
    mesh.scale.set(rx,ry,rz); mesh.position.set(x,y,z); mesh.castShadow=true; avatar.add(mesh); return mesh;
  }
  function buildAvatar(kind) {
    avatar.clear();
    const female = kind === "female";
    const torsoW = female ? .36 : .4;
    capsule(.19, .55, shirtMat, 0, 1.55, 0);
    sphere(torsoW, .25, .2, shirtMat, 0, 1.68, 0);
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
      sphere(.12,.17,.12,hairMat,-.12,2.34,-.025);
      sphere(.12,.17,.12,hairMat,.12,2.34,-.025);
    } else {
      sphere(.15,.06,.14,hairMat,0,2.43,.02);
    }
    avatar.scale.set(female ? .96 : 1, female ? .98 : 1, 1);
  }
  buildAvatar("male");
  avatar.position.y = 0;
  let dragging=false, lastX=0, lastY=0, zoom=6.8, targetTilt=0;
  function resize(){
    const w=wrap.clientWidth, h=wrap.clientHeight;
    if(!w||!h)return;
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(wrap); resize();
  function animate(){
    requestAnimationFrame(animate);
    avatar.rotation.y += (targetTilt-avatar.rotation.y)*.16;
    camera.position.z += (zoom-camera.position.z)*.14;
    renderer.render(scene,camera);
  }
  animate();
  loading?.classList.add("hidden");
  canvas.addEventListener("pointerdown",e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener("pointermove",e=>{if(!dragging)return;targetTilt+=(e.clientX-lastX)*.012;lastX=e.clientX;lastY=e.clientY;});
  canvas.addEventListener("pointerup",()=>dragging=false);
  canvas.addEventListener("pointercancel",()=>dragging=false);
  canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.008,4.5,9);},{passive:false});
  document.querySelectorAll("[data-avatar]").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll("[data-avatar]").forEach(x=>x.classList.toggle("active",x===b));
    buildAvatar(b.dataset.avatar);
  }));
  document.getElementById("rotateLeft")?.addEventListener("click",()=>targetTilt-=Math.PI/4);
  document.getElementById("rotateRight")?.addEventListener("click",()=>targetTilt+=Math.PI/4);
  document.getElementById("viewFront")?.addEventListener("click",()=>targetTilt=0);
  document.getElementById("viewSide")?.addEventListener("click",()=>targetTilt=Math.PI/2);
  document.getElementById("viewBack")?.addEventListener("click",()=>targetTilt=Math.PI);
  document.getElementById("zoomIn")?.addEventListener("click",()=>zoom=THREE.MathUtils.clamp(zoom-.5,4.5,9));
  document.getElementById("zoomOut")?.addEventListener("click",()=>zoom=THREE.MathUtils.clamp(zoom+.5,4.5,9));
  document.getElementById("syncVirtualOutfit")?.addEventListener("click",()=>{
    const pairs=[["topPreview","virtualTopStatus"],["bottomPreview","virtualBottomStatus"],["shoesPreview","virtualShoesStatus"]];
    pairs.forEach(([source,target])=>{
      const img=document.querySelector("#"+source+" .slot-visual img");
      document.getElementById(target).textContent=img?.getAttribute("src")?"Image selected":"Not selected";
    });
    const any=pairs.some(([source])=>document.querySelector("#"+source+" .slot-visual img")?.getAttribute("src"));
    const message=document.querySelector(".virtual-disclaimer");
    if(message) message.textContent=any?"Your Home outfit is detected. Garment textures and realistic fitting are the next integration stage.":"Choose clothes on Home first, then tap Use Home outfit.";
  });
}
