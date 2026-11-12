// 테스트용: ?device=3d 일 때 손에 든 기기를 three.js 실시간 3D 모델로 교체 (예전 3D 뷰어의 래스터 버전)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const held = document.getElementById('held');
held.classList.add('d3');
const W = held.offsetWidth, H = held.offsetHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.domElement.className = 'dev3d';
held.prepend(renderer.domElement);

const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(renderer);
function studioEnv() {
  const env = new THREE.Scene(); env.background = new THREE.Color(0xcdcdd0);
  const box = (w, h, x, y, z, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
  box(4, 3, 0, 5, 1, 3.2); box(1.2, 5, -4, 1, 2, 2.4); box(.6, 5, 4, 1, -1.5, 3.0);
  box(.6, 5, -2.5, 1, -4, 2.0); box(6, 2, 0, -3, 3, 1.1); box(5, 4, 0, 1, 5, .9); box(5, 4, 0, 1, -5, 1.4);
  return pm.fromScene(env, .02).texture;
}
scene.environment = studioEnv();
// real studio HDRI (Poly Haven, CC0); falls back to the procedural studio if it can't load
new RGBELoader().load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr', t => {
  t.mapping = THREE.EquirectangularReflectionMapping; scene.environment = pm.fromEquirectangular(t).texture; t.dispose();
  scene.environmentRotation = new THREE.Euler(0, 2.4, 0); scene.environmentIntensity = .45; dirty = 3; });
scene.environmentIntensity = .45;
// one strong key from upper-left-behind the viewer → clear self-shadows (dial on body, button edge)
const key = new THREE.DirectionalLight(0xfff3e6, 2.4); key.position.set(-.4, .5, .4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -.09, right: .09, top: .09, bottom: -.09, near: .05, far: 1.5 });
key.shadow.bias = -.0004; key.shadow.normalBias = .0004; key.shadow.radius = 4; key.shadow.blurSamples = 12; scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe6ff, .35); rim.position.set(.6, .2, -.5); scene.add(rim);
renderer.toneMappingExposure = .88;
const camera = new THREE.PerspectiveCamera(24, W / H, 0.005, 5);

let model, parts = {}, tickPivot, btnHome = new THREE.Vector3(), ctrCanvas, ctrTex, lastCount = -1, lastRec = null;
const DIAL_CCW = 1.78, DIAL_CW = -1.13;

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('pinch.glb', g => {
  model = g.scene;
  model.traverse(o => {
    if (o.isMesh) {
      const m = o.material, pn = o.parent ? o.parent.name : '';
      if (m.transmission > 0 && pn !== 'mat_glass') { m.color.setStyle('#e4e3ea'); m.roughness = .42; m.ior = 1.48; m.thickness = .0055; m.transmission = .45; m.attenuationColor = new THREE.Color().setStyle('#dedee2'); m.attenuationDistance = .045; m.specularIntensity = .7; m.clearcoat = .35; m.clearcoatRoughness = .2; }
      if (['mat_frame', 'mat_dish'].includes(pn)) m.roughness = .42;
      if (pn === 'mat_dish') m.color.setStyle('#b7b6cc');
      if (pn === 'mat_frame') { m.color.setStyle('#c6c6ca'); m.emissive = m.color.clone().multiplyScalar(.1); }
      if (pn === 'mat_print_front') m.color.setStyle('#ffffff');
      if (['button', 'tick', 'mic'].includes(pn)) m.roughness = .36;
      if (pn === 'mat_black') m.roughness = .4;
      if (pn === 'mat_glass') { m.transmission = 1; m.roughness = .03; m.thickness = .0005; m.ior = 1.5; }
    }
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    if (o.name) parts[o.name] = o;
  });
  const pivot = new THREE.Group(); pivot.add(model); scene.add(pivot);
  const box = new THREE.Box3().setFromObject(model), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  model.position.sub(c);
  // dial pivot at dish centre
  const db = new THREE.Box3().setFromObject(parts.mat_dish), dc = db.getCenter(new THREE.Vector3());
  tickPivot = new THREE.Group(); model.worldToLocal(dc); tickPivot.position.set(dc.x, dc.y, 0); model.add(tickPivot); tickPivot.attach(parts.tick);
  btnHome.copy(parts.button.position);
  ['digits', 'rec_led', 'led'].forEach(n => parts[n] && parts[n].traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0, 0, 0); } }));
  buildCounter();
  glow('led', 0xffffff, true);
  // back view, slightly turned like the hand-held render
  pivot.rotation.set(-0.05, Math.PI + 0.06, 0);
  const dist = (sz.y * 1.08) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0);
  window.__d3 = { parts: Object.keys(parts), ready: true };
}, undefined, e => console.error('3D load fail', e));

let dirty = 3;  // render only when something changes
const SW = 7.9, SH = 4.3, SX = 35.0, SY = 83.3;
function buildCounter() {
  const d = parts.digits; if (!d) return;
  const bb = new THREE.Box3().setFromObject(d), c = bb.getCenter(new THREE.Vector3()); model.worldToLocal(c);
  const bmin = bb.min.clone(); model.worldToLocal(bmin);
  d.visible = false;
  ctrCanvas = document.createElement('canvas'); ctrCanvas.width = 1264; ctrCanvas.height = Math.round(1264 * SH / SW);
  ctrTex = new THREE.CanvasTexture(ctrCanvas); ctrTex.colorSpace = THREE.SRGBColorSpace; ctrTex.anisotropy = 8;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SW / 1000, SH / 1000), new THREE.MeshBasicMaterial({ map: ctrTex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.position.set(c.x, c.y + (SY - 83.0) / 1000, bmin.z - .00005); mesh.rotation.y = Math.PI;
  model.add(mesh);
}
function drawCounter(count) {
  if (!ctrCanvas) return;
  const g = ctrCanvas.getContext('2d'), W = ctrCanvas.width, H = ctrCanvas.height;
  const px = mm => mm / SW * W, X = xm => W / 2 + px(SX - xm), Y = ym => H / 2 + px(SY - ym);
  g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, W, H);
  const nums = [count + 1, count, count - 1].map(n => (n >= 0 && n <= 28) ? String(n).padStart(2, '0') : '');
  g.fillStyle = '#f2f2f2'; g.shadowColor = 'rgba(255,255,255,.45)'; g.shadowBlur = 14;
  g.font = `500 ${Math.round(px(1.8))}px Jost, Futura, "Avenir Next", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const xs = [31.6, 35.0, 38.3], ys = [83.55, 83.05, 82.5];
  nums.forEach((t, k) => { g.save(); g.translate(X(xs[k]), Y(ys[k])); g.rotate(Math.PI / 2); g.fillText(t, 0, 0); g.restore(); });
  [33.1, 36.8].forEach(xm => { g.beginPath(); g.arc(X(xm), Y(83.0), px(.2), 0, Math.PI * 2); g.fill(); });
  ctrTex.needsUpdate = true;
}
function glow(name, color, on) { parts[name] && parts[name].traverse(o => { if (o.isMesh) { o.material.emissive.set(on ? color : 0x000000); o.material.emissiveIntensity = on ? 2.2 : 0; } }); }

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W * renderer.getPixelRatio(), H * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, W, H); ao.updateGtaoMaterial({ radius: .006, distanceExponent: 1.5, thickness: .004, scale: 1.2, samples: 8 }); ao.blendIntensity = .8; composer.addPass(ao);
composer.addPass(new OutputPass());

const proj = (obj) => { const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3()).project(camera); return [(c.x + 1) / 2 * W, (1 - c.y) / 2 * H]; };
let blink = 0;
let lastVol = -1, lastPressed = null, placed = false;
renderer.setAnimationLoop(t => {
  if (!model) return;
  const n = state.shots.length; if (n !== lastCount) { lastCount = n; drawCounter(n); dirty = 2; }
  if (vol !== lastVol) { lastVol = vol; tickPivot.rotation.z = DIAL_CCW - vol * (DIAL_CCW - DIAL_CW); dirty = 2; }
  const pressed = document.getElementById('hbtn3d').classList.contains('press');
  if (pressed !== lastPressed) { lastPressed = pressed; parts.button.position.copy(btnHome); if (pressed) parts.button.position.x -= .0012; dirty = 2; }
  if (rec) { const on = Math.floor(t / 250) % 2 === 0; if (on !== lastRec) { glow('rec_led', 0xff2020, on); lastRec = on; dirty = 2; } }
  else if (lastRec !== false) { glow('rec_led', 0, false); lastRec = false; dirty = 2; }
  if (!dirty) return;
  dirty--;
  // keep invisible hit areas over the 3D button and dial
  const [bx, by] = proj(parts.button), [dx, dy] = proj(parts.mat_dish);
  const hb = document.getElementById('hbtn3d'), hd = document.getElementById('hdial');
  hb.style.left = (bx - hb.offsetWidth / 2) + 'px'; hb.style.top = (by - hb.offsetHeight / 2) + 'px';
  hd.style.left = (dx - hd.offsetWidth / 2) + 'px'; hd.style.top = (dy - hd.offsetHeight / 2) + 'px';
  composer.render();
});
