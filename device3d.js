// 테스트용: ?device=3d 일 때 손에 든 기기를 three.js 실시간 3D 모델로 교체 (예전 3D 뷰어의 래스터 버전)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const held = document.getElementById('held');
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
const SUN = new URLSearchParams(location.search).get('light') !== 'studio';  // natural light by default
const HDR = SUN ? 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr'
                : 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr';
new RGBELoader().load(HDR, t => {
  t.mapping = THREE.EquirectangularReflectionMapping; scene.environment = pm.fromEquirectangular(t).texture; t.dispose();
  scene.environmentRotation = new THREE.Euler(0, 2.4, 0); applyLight(curScene); });
scene.environmentIntensity = .8;
// one strong key from upper-left-behind the viewer → clear self-shadows (dial on body, button edge)
const key = new THREE.DirectionalLight(SUN ? 0xffe9cc : 0xfff3e6, SUN ? 2.0 : 1.6); key.position.set(-.4, SUN ? .75 : .5, .4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -.09, right: .09, top: .09, bottom: -.09, near: .05, far: 1.5 });
key.shadow.bias = -.0004; key.shadow.normalBias = .0004; key.shadow.radius = 4; key.shadow.blurSamples = 12; scene.add(key);
const rim = new THREE.DirectionalLight(SUN ? 0xcfe0ff : 0xdfe6ff, SUN ? .5 : .35); rim.position.set(.6, .2, -.5); scene.add(rim);
const RIMC0 = rim.color.getHex();
// ambient bounce from the surroundings (e.g. green from trees/grass); off unless a scene sets it
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0); scene.add(hemi);
renderer.toneMappingExposure = .98;
const camera = new THREE.PerspectiveCamera(24, W / H, 0.005, 5);

let model, parts = {}, tickPivot, btnHome = new THREE.Vector3(), ctrCanvas, ctrTex, lastCount = -1, lastRec = null;
// tick rests at 10:30 seen from the front; limit = 12 o'clock → 3 o'clock seen from the back (front: 12 → 9)
const DIAL_CCW = -Math.PI / 4, DIAL_CW = Math.PI / 4;

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('pinch.glb', g => {
  model = g.scene;
  model.traverse(o => {
    if (o.isMesh) {
      const m = o.material, pn = o.parent ? o.parent.name : '';
      if (m.transmission > 0 && pn !== 'mat_glass') { m.color.setStyle('#ebeaf0'); m.roughness = .42; m.ior = 1.48; m.thickness = .0055; m.transmission = .45; m.attenuationColor = new THREE.Color().setStyle('#dedee2'); m.attenuationDistance = .045; m.specularIntensity = .7; m.clearcoat = .35; m.clearcoatRoughness = .2; }
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
  held.classList.add('d3'); held.classList.remove('d3wait');
  window.__d3 = { parts: Object.keys(parts), ready: true,
    tickAngle() { const r = tickPivot.rotation.z; tickPivot.rotation.z = 0; tickPivot.updateMatrixWorld(true);
      const c = new THREE.Box3().setFromObject(parts.tick).getCenter(new THREE.Vector3()); tickPivot.worldToLocal(c); tickPivot.rotation.z = r;
      return { x: c.x, y: c.y, z: c.z, deg: Math.atan2(-c.x, c.y) * 180 / Math.PI }; },
    axis() { const v = new THREE.Vector3(0,0,1).applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion())); return [v.x, v.y, v.z]; },
    dishFront() { const m = new THREE.Box3().setFromObject(parts.mic), d = new THREE.Box3().setFromObject(parts.mat_dish); model.updateMatrixWorld(true);
      const a = m.getCenter(new THREE.Vector3()), b = d.getCenter(new THREE.Vector3()); model.worldToLocal(a); model.worldToLocal(b); return [a.z, b.z]; } };
}, undefined, e => { console.error('3D load fail', e); held.classList.remove('d3wait'); });

let dirty = 3;  // render only when something changes
let ctrMesh = null;
const SW = 7.9, SH = 4.3, SX = 35.0, SY = 83.3;
function buildCounter() {
  const d = parts.digits; if (!d) return;
  const bb = new THREE.Box3().setFromObject(d), c = bb.getCenter(new THREE.Vector3()); model.worldToLocal(c);
  const bmin = bb.min.clone(); model.worldToLocal(bmin);
  d.visible = false;
  ctrCanvas = document.createElement('canvas'); ctrCanvas.width = 1264; ctrCanvas.height = Math.round(1264 * SH / SW);
  ctrTex = new THREE.CanvasTexture(ctrCanvas); ctrTex.colorSpace = THREE.SRGBColorSpace; ctrTex.anisotropy = 8;
  const mesh = ctrMesh = new THREE.Mesh(new THREE.PlaneGeometry(SW / 1000, SH / 1000), new THREE.MeshBasicMaterial({ map: ctrTex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.position.set(c.x, c.y + (SY - 83.0) / 1000, bmin.z - .00005); mesh.rotation.y = Math.PI;
  model.add(mesh);
}
const drum = { v: null, step: window.drumEase.step };
function drawCounter(phase) {
  if (!ctrCanvas) return;
  window.pinchDrum(ctrCanvas.getContext('2d'), ctrCanvas.width, ctrCanvas.height, { bg: '#1b1b1d', on: true, phase, max: 27 });
  ctrTex.needsUpdate = true;
}
function glow(name, color, on) { parts[name] && parts[name].traverse(o => { if (o.isMesh) { o.material.emissive.set(on ? color : 0x000000); o.material.emissiveIntensity = on ? 2.2 : 0; } }); }

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W * renderer.getPixelRatio(), H * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, W, H); ao.updateGtaoMaterial({ radius: .006, distanceExponent: 1.5, thickness: .004, scale: 1.2, samples: 8 }); ao.blendIntensity = .62; composer.addPass(ao);
composer.addPass(new OutputPass());
// fine film grain on the device, except inside the counter window (kept crisp). off with ?nograin
const film = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, intensity: { value: 0 }, q: { value: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()] } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `#include <common>
    uniform sampler2D tDiffuse; uniform float time, intensity; uniform vec2 q[4]; varying vec2 vUv;
    float side(vec2 a, vec2 b, vec2 p){ return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x); }
    void main(){ vec4 base = texture2D(tDiffuse, vUv);
      float s0=side(q[0],q[1],vUv), s1=side(q[1],q[2],vUv), s2=side(q[2],q[3],vUv), s3=side(q[3],q[0],vUv);
      bool inside = (s0>=0.&&s1>=0.&&s2>=0.&&s3>=0.)||(s0<=0.&&s1<=0.&&s2<=0.&&s3<=0.);
      float n = rand(fract(vUv + time)); vec3 c = base.rgb + base.rgb * clamp(.1 + n, 0., 1.);
      gl_FragColor = vec4(inside ? base.rgb : mix(base.rgb, c, intensity), base.a); }` });
film.enabled = false; composer.addPass(film);
function updateCounterMask() {
  if (!ctrMesh) return; ctrMesh.updateMatrixWorld(true);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => {
    const v = new THREE.Vector3(sx * SW / 2000 * 1.04, sy * SH / 2000 * 1.04, 0).applyMatrix4(ctrMesh.matrixWorld).project(camera);
    film.uniforms.q.value[i].set((v.x + 1) / 2, (v.y + 1) / 2); });
}

const proj = (obj) => { const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3()).project(camera); return [(c.x + 1) / 2 * W, (1 - c.y) / 2 * H]; };
let blink = 0;
// per-scene lighting so the device sits naturally in each background
const LIGHT = {
  beach:  { exp: .84,  env: .66, key: .85, kc: 0xe8edf3, rim: .28, grain: .14 },  // foggy overcast coast
  summit: { exp: 1.02, env: .95, key: 1.8, kc: 0xfff4e8, rim: .55, grain: .07 },  // high, hazy, bright
  park:   { exp: .95,  env: .80, key: 1.7, kc: 0xffd9b0, rim: .40, grain: .09 },  // warm low sun
  park2:  { exp: .90,  env: .70, key: 1.15, kc: 0xedf2ea, rim: .32, rc: 0xe4f0dc, grain: .1, sr: 8, hemi: .55, hs: 0xe6eee8, hg: 0x6f9258 },  // test: neutral (not warm) sun + green bounce from trees/grass
  camp:   { exp: .86,  env: .70, key: 1.0, kc: 0xf0f3dc, rim: .30, grain: .11 },  // forest shade
  _grey:  { exp: .80,  env: .62, key: .75, kc: 0xe6ecf4, rim: .25, grain: .16 },  // overcast / rain
};
let curScene = null;
function applyLight(id) {
  const L = (id === 'park' && document.body.classList.contains('parktone') ? LIGHT.park2 : LIGHT[id]) || LIGHT._grey;
  renderer.toneMappingExposure = L.exp; scene.environmentIntensity = L.env;
  key.intensity = L.key; key.color.setHex(L.kc); rim.intensity = L.rim; rim.color.setHex(L.rc || RIMC0); key.shadow.radius = L.sr || 4;
  hemi.intensity = L.hemi || 0; if (L.hemi) { hemi.color.setHex(L.hs); hemi.groundColor.setHex(L.hg); }
  film.enabled = document.body.classList.contains('grain'); film.uniforms.intensity.value = L.grain; dirty = 3;
}
let lastVol = -1, lastPressed = null, placed = false;
renderer.setAnimationLoop(t => {
  if (!model) return;
  const sid = window.__sceneId ? window.__sceneId() : null;
  if (sid !== curScene) { curScene = sid; applyLight(sid); }
  const dtc = t - (window.__lt || t); window.__lt = t;
  if (drum.step(state.shots.length, dtc) || drum.v !== lastCount) { lastCount = drum.v; drawCounter(drum.v); dirty = 2; }
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
  if (film.enabled) { updateCounterMask(); film.uniforms.time.value = (t % 10000) / 1000; }
  composer.render();
});
