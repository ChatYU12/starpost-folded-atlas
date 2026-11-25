import * as THREE from 'three';
import { CHAPTERS } from './story.js';

const $ = id => document.getElementById(id);
const PI = Math.PI;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eio = t => (t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const N = CHAPTERS.length; // 5 chapters (index 0..4)
const STAMP_KEY = 'starpost_stamps_v1';
const STAMPS = new Set(JSON.parse(localStorage.getItem(STAMP_KEY) || '[]'));

/* ---------- Web Audio Sound Synth ---------- */
let SND = true, AC = null, NB = null;
function ac() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      NB = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
      const d = NB.getChannelData(0); let l = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + .05 * w) / 1.05; d[i] = l * 3; }
    } catch {}
  }
  if (AC?.state === 'suspended') AC.resume();
  return SND ? AC : null;
}
function noise(dur, f0, f1, vol, type = 'bandpass') {
  const A = ac(); if (!A) return;
  const t = A.currentTime, s = A.createBufferSource(); s.buffer = NB; s.loop = true;
  const f = A.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur);
  const g = A.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .25); g.gain.linearRampToValueAtTime(0, t + dur);
  s.connect(f).connect(g).connect(A.destination); s.start(t); s.stop(t + dur + .05);
}
function tone(f0, f1, dur, vol, type = 'sine', delay = 0) {
  const A = ac(); if (!A) return;
  const t = A.currentTime + delay, o = A.createOscillator(), g = A.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g).connect(A.destination); o.start(t); o.stop(t + dur + .03);
}
const SFX = {
  paper: () => noise(.32, 2200, 3800, .1, 'bandpass'),
  harbor: () => { tone(880, 872, 1.1, .14); tone(1318, 1310, 1.3, .09, 'sine', .07); tone(1760, 1750, 1.0, .06, 'sine', .16); },
  ginkgo: () => { noise(.6, 1200, 2600, .09); [523, 659, 784, 1046].forEach((f, i) => tone(f, f * 1.005, .9, .08, 'triangle', i * .09)); },
  bridge: () => { noise(.9, 500, 1400, .1, 'lowpass'); [1046, 1175, 1397, 1568, 2093].forEach((f, i) => tone(f, f * .995, 1.2, .07, 'sine', i * .11)); },
  greenhouse: () => { [587, 740, 880, 1175, 1480].forEach((f, i) => tone(f, f * 1.01, 1.3, .08, 'sine', i * .12)); },
  tower: () => { [261.6, 392, 523.2, 659.2, 784, 1046.5].forEach((f, i) => tone(f, f, 2.2, .09, 'triangle', i * .1)); }
};

/* ---------- Three.js Scene ---------- */
const cv = $('world');
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2));
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(34, 1, .05, 30);

const hemi = new THREE.HemisphereLight('#cde4df', '#596e67', 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffd89e', 2.0); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: .1, far: 8 });
sun.shadow.bias = -.0006; sun.shadow.normalBias = .01;
scene.add(sun, sun.target);

const lamp = new THREE.PointLight('#ffbe66', 1.2, .95, 1.8); scene.add(lamp);

const deskShadow = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .34 }));
deskShadow.rotation.x = -PI / 2; deskShadow.position.y = -.052; deskShadow.receiveShadow = true;
scene.add(deskShadow);

/* ---------- Asset Loader ---------- */
const CUTOUT_KEYS = [
  'fox', 'postoffice', 'postbox', 'sailboat', 'mist_cloud',
  'ginkgo_tree', 'teahouse', 'stone_lantern',
  'bridge_gate', 'chime', 'spruce',
  'conservatory', 'moonflower', 'crescent', 'night_tree',
  'clocktower', 'astrolabe', 'star_arch', 'village'
];
const TX = {};
const asp = k => TX[k].image.width / TX[k].image.height;
const loader = new THREE.TextureLoader();

async function loadAll() {
  let done = 0;
  await Promise.all(CUTOUT_KEYS.map(k => loader.loadAsync(`art/${k}.webp`).then(t => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TX[k] = t;
    const pct = Math.round(++done / CUTOUT_KEYS.length * 100);
    $('ldPct').textContent = pct + '%';
    $('ldFill').style.width = pct + '%';
  })));
}

/* ---------- Parchment Spread Textures ---------- */
const CW = 900, CHT = 1260;
function drawPaperBase(g, tint = '#f4ecd8') {
  g.fillStyle = tint; g.fillRect(0, 0, CW, CHT);
  const r = rng(19);
  for (let i = 0; i < 3200; i++) {
    g.fillStyle = r() < .5 ? `rgba(110,85,55,${r() * .045})` : `rgba(255,252,240,${r() * .05})`;
    g.fillRect(r() * CW, r() * CHT, 2, 2);
  }
}

const GROUNDS = {
  harbor(g, W) {
    // Sea mist water on right & back, stone pier on left
    const gr = g.createLinearGradient(0, 0, CW, CHT);
    gr.addColorStop(0, '#4f7f7d'); gr.addColorStop(.55, '#3b6a69'); gr.addColorStop(1, '#2f595a');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // Water shimmer lines
    g.strokeStyle = 'rgba(240,248,242,.22)'; g.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const [x, y] = W(-.2 + (i * 0.17) % 1.25, -.58 + i * .048);
      g.beginPath(); g.moveTo(x - 36, y); g.quadraticCurveTo(x, y - 6, x + 36, y); g.stroke();
    }
    // Stone pier on left/center
    const [x0, y0] = W(-1, -.52), [x1, y1] = W(.28, .35);
    g.fillStyle = '#c9beaa'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = '#6f6556'; g.lineWidth = 5; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    const r = rng(4);
    for (let i = 0; i < 65; i++) {
      const [px, py] = W(-1 + r() * 1.24, -.48 + r() * .78);
      g.fillStyle = ['#b8ab96', '#d8cebc', '#a69a86'][i % 3];
      g.fillRect(px, py, 24 + r() * 24, 16 + r() * 14);
    }
  },
  ginkgo(g, W) {
    const gr = g.createLinearGradient(0, 0, 0, CHT);
    gr.addColorStop(0, '#808758'); gr.addColorStop(.5, '#9d9558'); gr.addColorStop(1, '#b99f5d');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // Winding stone steps
    g.strokeStyle = '#d8ccb2'; g.lineWidth = 115; g.lineCap = 'round';
    g.beginPath();
    const pts = [[-.95, .25], [-.45, .14], [-.05, -.05], [.28, -.28], [.65, -.46]];
    pts.forEach(([x, z], i) => { const [px, py] = W(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); });
    g.stroke();
    g.strokeStyle = 'rgba(92,76,56,.35)'; g.lineWidth = 4; g.setLineDash([12, 16]); g.stroke(); g.setLineDash([]);
    // Fallen golden ginkgo leaves
    const r = rng(12);
    for (let i = 0; i < 120; i++) {
      const [px, py] = W(r() * 2 - 1, -.62 + r() * 1.15);
      g.fillStyle = ['#f3c95b', '#eab63e', '#df9e2c', '#f8df89'][i % 4];
      g.beginPath(); g.ellipse(px, py, 6 + r() * 6, 4 + r() * 4, r() * 3, 0, PI * 2); g.fill();
    }
  },
  bridge(g, W) {
    // Deep twilight canyon chasm in middle, spruce cliffs left & right
    const gr = g.createLinearGradient(0, 0, 0, CHT);
    gr.addColorStop(0, '#5a4e6b'); gr.addColorStop(.5, '#3b4859'); gr.addColorStop(1, '#293947');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // River ribbon far below
    g.strokeStyle = 'rgba(176,216,226,.38)'; g.lineWidth = 60; g.lineCap = 'round';
    g.beginPath();
    [[.06, -.7], [-.04, -.2], [.12, .25], [-.08, .7]].forEach(([x, z], i) => {
      const [px, py] = W(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py);
    }); g.stroke();
    // Left & right cliff ledges
    g.fillStyle = '#36584f';
    g.beginPath(); const [lx, ly] = W(-1, -.7); g.moveTo(lx, ly);
    [[-.36, -.7], [-.28, -.15], [-.44, .45], [-1, .7]].forEach(([x, z]) => { const [px, py] = W(x, z); g.lineTo(px, py); });
    g.closePath(); g.fill();
    g.beginPath(); const [rx, ry] = W(1, -.7); g.moveTo(rx, ry);
    [[.38, -.7], [.34, -.1], [.46, .45], [1, .7]].forEach(([x, z]) => { const [px, py] = W(x, z); g.lineTo(px, py); });
    g.closePath(); g.fill();
  },
  greenhouse(g, W) {
    const gr = g.createLinearGradient(0, 0, 0, CHT);
    gr.addColorStop(0, '#22354f'); gr.addColorStop(1, '#1a2d3d');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // Garden cobblestone path
    const [cx, cy] = W(0, -.05);
    g.fillStyle = 'rgba(182,226,238,.12)';
    g.beginPath(); g.ellipse(cx, cy, CW * .48, CHT * .26, 0, 0, PI * 2); g.fill();
    const r = rng(27);
    for (let i = 0; i < 48; i++) {
      const a = r() * PI * 2, d = .08 + r() * .44;
      const [px, py] = W(Math.cos(a) * d * 1.4, -.04 + Math.sin(a) * d * .65);
      g.fillStyle = i % 3 ? 'rgba(155,180,196,.32)' : 'rgba(170,234,250,.28)';
      g.beginPath(); g.ellipse(px, py, 14 + r() * 14, 9 + r() * 8, r(), 0, PI * 2); g.fill();
    }
    // Glowing blue flower dots
    for (let i = 0; i < 40; i++) {
      const [px, py] = W(r() * 2 - 1, -.58 + r() * 1.05);
      g.fillStyle = i % 2 ? 'rgba(183,231,247,.55)' : 'rgba(255,224,128,.55)';
      g.beginPath(); g.arc(px, py, 3 + r() * 4, 0, PI * 2); g.fill();
    }
  },
  tower(g, W) {
    const gr = g.createLinearGradient(0, 0, 0, CHT);
    gr.addColorStop(0, '#233252'); gr.addColorStop(1, '#1c2742');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // Engraved golden compass terrace
    const [cx, cy] = W(0, -.08);
    g.save(); g.translate(cx, cy);
    g.fillStyle = '#33405e'; g.beginPath(); g.ellipse(0, 0, CW * .48, CHT * .32, 0, 0, PI * 2); g.fill();
    g.strokeStyle = 'rgba(228,185,91,.75)'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, CW * .46, CHT * .3, 0, 0, PI * 2); g.stroke();
    g.setLineDash([12, 10]);
    g.beginPath(); g.ellipse(0, 0, CW * .34, CHT * .22, 0, 0, PI * 2); g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < 12; i++) {
      const a = i * PI / 6;
      g.beginPath(); g.moveTo(Math.cos(a) * CW * .14, Math.sin(a) * CHT * .09);
      g.lineTo(Math.cos(a) * CW * .45, Math.sin(a) * CHT * .29); g.stroke();
    }
    g.restore();
  }
};

function makePageTex(chIdx, side, mirror = false) {
  const c = document.createElement('canvas'); c.width = CW; c.height = CHT;
  const g = c.getContext('2d');
  const ch = CHAPTERS[chIdx];
  const ox = side === 'L' ? -1 : 0;
  const W = (x, z) => [(x - ox) * CW, (z + .7) / 1.4 * CHT];
  drawPaperBase(g);

  // Scalloped/deckle inset map panel
  const pad = 42, bot = 220;
  g.save();
  g.beginPath();
  g.roundRect(side === 'L' ? pad : 0, pad, side === 'L' ? CW - pad : CW - pad, CHT - pad - bot, 16);
  g.clip();
  GROUNDS[ch.ground](g, W);
  g.restore();

  // Gilded brass inner hairline frame
  g.strokeStyle = 'rgba(182,140,62,.65)'; g.lineWidth = 3;
  g.strokeRect(side === 'L' ? pad : -4, pad, CW - pad + 4, CHT - pad - bot);

  // Editorial bottom printed strip on the parchment
  g.fillStyle = '#27483f';
  if (side === 'L') {
    g.font = '600 22px "Noto Serif SC", serif'; g.fillStyle = '#8b734b';
    g.fillText(ch.folio, 56, CHT - 150);
    g.font = '700 44px "Noto Serif SC", serif'; g.fillStyle = '#1f3b33';
    g.fillText(ch.title, 56, CHT - 92);
  } else {
    g.font = 'italic 26px "Noto Serif SC", serif'; g.fillStyle = '#3c4a45';
    g.fillText(ch.quote, 46, CHT - 122);
    g.font = '600 22px "Noto Serif SC", serif'; g.fillStyle = '#8b734b';
    g.textAlign = 'right'; g.fillText(`— ${String(chIdx + 1).padStart(2, '0')} —`, CW - 56, CHT - 56);
    g.textAlign = 'left';
  }

  // Spine crease shadow
  const sg = side === 'L' ? g.createLinearGradient(CW, 0, CW - 85, 0) : g.createLinearGradient(0, 0, 85, 0);
  sg.addColorStop(0, 'rgba(32,24,16,.28)'); sg.addColorStop(1, 'rgba(32,24,16,0)');
  g.fillStyle = sg; g.fillRect(0, 0, CW, CHT);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  if (mirror) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; }
  return tex;
}

const PAGES = [];
function buildPageTextures() {
  for (let i = 0; i < N; i++) {
    PAGES[i] = { L: makePageTex(i, 'L'), Lm: makePageTex(i, 'L', true), R: makePageTex(i, 'R') };
  }
}

/* ---------- 3D Book Geometry ---------- */
const book = new THREE.Group(); scene.add(book);
const coverMat = new THREE.MeshStandardMaterial({ color: '#213d35', roughness: .85 });
const edgeMat = new THREE.MeshStandardMaterial({ color: '#e9dcc0', roughness: .95 });
const brassMat = new THREE.MeshStandardMaterial({ color: '#d9ad4e', metalness: .35, roughness: .4 });

for (const s of [-1, 1]) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.07, .016, 1.48), coverMat);
  board.position.set(s * .525, -.044, 0); board.receiveShadow = true; board.castShadow = true;
  const block = new THREE.Mesh(new THREE.BoxGeometry(1.0, .036, 1.4), edgeMat);
  block.position.set(s * .5, -.018, 0); block.receiveShadow = true;
  book.add(board, block);
}
const spine = new THREE.Mesh(new THREE.BoxGeometry(.06, .018, 1.48), brassMat);
spine.position.set(0, -.045, 0); book.add(spine);

const pageMat = () => new THREE.MeshStandardMaterial({ roughness: .92, emissive: '#ffffff', emissiveIntensity: .12 });
const pgGeo = new THREE.PlaneGeometry(1, 1.4).rotateX(-PI / 2);
const pageL = new THREE.Mesh(pgGeo, pageMat()), pageR = new THREE.Mesh(pgGeo, pageMat());
pageL.position.set(-.5, .001, 0); pageR.position.set(.5, .001, 0);
pageL.receiveShadow = pageR.receiveShadow = true;
book.add(pageL, pageR);

const COLS = 40;
const leafGeo = new THREE.PlaneGeometry(1, 1.4, COLS, 1).rotateX(-PI / 2).translate(.5, 0, 0);
const leafS = Float32Array.from({ length: leafGeo.attributes.position.count }, (_, i) => leafGeo.attributes.position.getX(i));
const leafF = new THREE.Mesh(leafGeo, pageMat()), leafB = new THREE.Mesh(leafGeo, pageMat());
leafB.material.side = THREE.BackSide; leafF.castShadow = leafB.castShadow = true;
leafF.visible = leafB.visible = false;
book.add(leafF, leafB);
const PAGE_MATS = [pageL.material, pageR.material, leafF.material, leafB.material];

function setLeaf(p) {
  const k = .88 * Math.sin(p * PI), xs = [], ys = [];
  let x = 0, y = 0;
  for (let i = 0; i <= COLS; i++) {
    const s = i / COLS; xs.push(x); ys.push(y);
    const ph = p * PI - k * (s - .35);
    x += Math.cos(ph) / COLS; y += Math.sin(ph) / COLS;
  }
  const pos = leafGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const c = Math.round(leafS[i] * COLS);
    pos.setX(i, xs[c]); pos.setY(i, ys[c] + .003 + .002 * Math.sin(p * PI));
  }
  pos.needsUpdate = true; leafGeo.computeVertexNormals();
}

/* ---------- Pop-Up Cutouts & Chapter Dioramas ---------- */
const CUT_MATS = [], STAGES = Array.from({ length: N }, () => []), LANDMARKS = [];
const geo1 = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);

class Cutout {
  constructor(chIdx, k, h, x, z, o = {}) {
    this.ch = chIdx; this.k = k; this.h = h; this.x = x; this.z = z;
    this.lift = o.lift || 0; this.sway = o.sway ?? .012; this.bob = o.bob || 0;
    this.drift = o.drift || 0; this.dir = o.dir || 1; this.bb = o.bb ?? true;
    this.landmark = !!o.landmark; this.ph = Math.random() * 9; this.pulse = 0;
    this.g = new THREE.Group(); this.hinge = new THREE.Group(); this.body = new THREE.Group();
    this.mat = new THREE.MeshStandardMaterial({
      map: TX[k], emissiveMap: TX[k], emissive: '#ffffff', emissiveIntensity: .12,
      alphaTest: .45, side: THREE.DoubleSide, roughness: .95
    });
    CUT_MATS.push(this.mat);
    this.mesh = new THREE.Mesh(geo1, this.mat);
    this.mesh.castShadow = true;
    this.mesh.userData.cutout = this;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: .45, map: TX[k] });
    this.g.position.set(x, 0, z);
    this.g.add(this.hinge); this.hinge.add(this.body); this.body.add(this.mesh);
    book.add(this.g);
    STAGES[chIdx].push(this);
    if (this.landmark) LANDMARKS[chIdx] = this;
  }
  top() { return this.mesh.localToWorld(new THREE.Vector3(0, 1.08, 0)); }
  update(t, fold, yaw, dt) {
    this.g.visible = fold > .005;
    if (!this.g.visible) return;
    this.g.rotation.y = this.bb ? yaw : 0;
    this.hinge.rotation.x = -(1 - fold) * PI / 2;
    this.pulse = Math.max(0, this.pulse - dt * 1.4);
    const bounce = Math.sin(this.pulse * PI * 3) * this.pulse * .06;
    const sc = 1 + bounce;
    this.mesh.scale.set(this.h * asp(this.k) * this.dir * sc, this.h * sc, 1);
    this.body.position.y = this.lift + Math.max(0, bounce) * .5 + (this.bob ? Math.sin(t * 1.5 + this.ph) * this.bob : 0);
    this.body.position.x = this.drift ? Math.sin(t * .18 + this.ph) * this.drift : 0;
    this.body.rotation.z = Math.sin(t * 1.6 + this.ph) * this.sway + (this.pulse > 0 ? Math.sin(t * 22) * this.pulse * .14 : 0);
  }
}

let starBeam = null, beamLife = 0;

function buildStages() {
  // Ch 0: 雾港邮局
  new Cutout(0, 'mist_cloud', .16, -.45, -.58, { lift: .22, drift: .07, sway: .006 });
  new Cutout(0, 'mist_cloud', .13, .42, -.56, { lift: .28, drift: .06, dir: -1, sway: .006 });
  new Cutout(0, 'postoffice', .46, -.46, -.28, { sway: .004, bb: false });
  new Cutout(0, 'sailboat', .34, .56, -.22, { bob: .009, sway: .022 });
  new Cutout(0, 'fox', .24, -.04, -.02, { sway: .015 });
  new Cutout(0, 'postbox', .22, .20, -.04, { landmark: true, sway: .005 });

  // Ch 1: 银杏阶梯
  new Cutout(1, 'ginkgo_tree', .48, -.68, -.38, { sway: .015 });
  new Cutout(1, 'ginkgo_tree', .44, .66, -.36, { dir: -1, sway: .016 });
  new Cutout(1, 'ginkgo_tree', .34, -.24, -.52, { sway: .012 });
  new Cutout(1, 'teahouse', .40, .28, -.34, { sway: .004, bb: false });
  new Cutout(1, 'fox', .23, -.16, .04, { sway: .015 });
  new Cutout(1, 'stone_lantern', .24, .24, -.08, { landmark: true, sway: .004 });

  // Ch 2: 云杉吊桥
  new Cutout(2, 'spruce', .46, -.78, -.42, { sway: .012 });
  new Cutout(2, 'spruce', .42, -.58, -.52, { sway: .01 });
  new Cutout(2, 'spruce', .48, .76, -.40, { sway: .012 });
  new Cutout(2, 'spruce', .36, .54, -.52, { sway: .01 });
  new Cutout(2, 'mist_cloud', .14, .05, .14, { lift: .02, drift: .08, sway: .008 });
  new Cutout(2, 'bridge_gate', .48, .08, -.26, { sway: .006, bb: false });
  new Cutout(2, 'fox', .22, -.24, -.02, { sway: .015 });
  new Cutout(2, 'chime', .22, -.34, -.16, { landmark: true, lift: .16, sway: .045 });

  // Ch 3: 萤火玻璃花房
  new Cutout(3, 'crescent', .18, -.56, -.60, { lift: .28, sway: .008 });
  new Cutout(3, 'night_tree', .46, -.74, -.36, { sway: .01 });
  new Cutout(3, 'night_tree', .44, .74, -.34, { dir: -1, sway: .01 });
  new Cutout(3, 'conservatory', .48, -.06, -.34, { sway: .003, bb: false });
  new Cutout(3, 'fox', .23, .02, .06, { dir: -1, sway: .015 });
  new Cutout(3, 'moonflower', .22, .28, -.06, { landmark: true, sway: .022 });

  // Ch 4: 观星钟楼
  new Cutout(4, 'star_arch', .46, 0, -.58, { lift: .16, sway: .004, bb: false });
  new Cutout(4, 'village', .20, .58, -.16, { sway: .003, bb: false });
  new Cutout(4, 'spruce', .34, -.76, -.36, { sway: .01 });
  new Cutout(4, 'clocktower', .52, -.22, -.30, { sway: .003, bb: false });
  new Cutout(4, 'fox', .23, -.04, .04, { sway: .015 });
  new Cutout(4, 'astrolabe', .26, .20, -.14, { landmark: true, lift: .06, sway: .018 });

  // Golden starlight beam for Ch 4 climax
  const bGeo = new THREE.CylinderGeometry(.018, .07, 1.5, 20, 1, true).translate(0, .75, 0);
  const bMat = new THREE.MeshBasicMaterial({ color: '#ffe896', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  starBeam = new THREE.Mesh(bGeo, bMat);
  starBeam.position.set(.20, .06, -.14);
  starBeam.visible = false;
  book.add(starBeam);
}

/* ---------- Ambient & Burst Particles ---------- */
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,248,200,1)'); r.addColorStop(.35, 'rgba(255,216,110,.75)'); r.addColorStop(1, 'rgba(255,216,110,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const PARTS = Array.from({ length: 28 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.userData = { x: (Math.random() - .5) * 1.6, z: -.5 + Math.random() * .75, y: .05 + Math.random() * .42, ph: Math.random() * 9, sp: .4 + Math.random() * .7 };
  book.add(s); return s;
});
let burst = 0;

/* ---------- Continuous Book Scrubbing & Lighting ---------- */
let curPos = 0, tgtPos = 0, activeCh = 0;
const curMood = {
  sky: new THREE.Color(), gnd: new THREE.Color(), sunCol: new THREE.Color(), lampCol: new THREE.Color(),
  sunPos: new THREE.Vector3(), lampPos: new THREE.Vector3(), sunInt: 2, lampInt: 1, em: .14
};

function updateBookState(pos, dt, t, yaw) {
  const i0 = clamp(Math.floor(pos), 0, N - 1);
  const i1 = clamp(i0 + 1, 0, N - 1);
  const frac = pos - i0;
  const turning = frac > .003 && frac < .997;

  pageL.material.map = pageL.material.emissiveMap = PAGES[i0].L;
  pageR.material.map = pageR.material.emissiveMap = PAGES[turning ? i1 : i0].R;
  pageL.material.needsUpdate = pageR.material.needsUpdate = true;

  leafF.visible = leafB.visible = turning;
  if (turning) {
    leafF.material.map = leafF.material.emissiveMap = PAGES[i0].R;
    leafB.material.map = leafB.material.emissiveMap = PAGES[i1].Lm;
    leafF.material.needsUpdate = leafB.material.needsUpdate = true;
    setLeaf(frac);
  }

  // Fold cutouts smoothly down as page turns away and rise as new page arrives
  for (let c = 0; c < N; c++) {
    const dist = Math.abs(pos - c);
    const fold = clamp(1 - dist / .36);
    const eased = eio(fold);
    for (const a of STAGES[c]) a.update(t, eased, yaw, dt);
  }

  // Interpolate lighting mood
  const mA = CHAPTERS[i0].mood, mB = CHAPTERS[i1].mood, u = eio(frac);
  curMood.sky.set(mA.sky).lerp(new THREE.Color(mB.sky), u);
  curMood.gnd.set(mA.gnd).lerp(new THREE.Color(mB.gnd), u);
  curMood.sunCol.set(mA.sunCol).lerp(new THREE.Color(mB.sunCol), u);
  curMood.lampCol.set(mA.lampCol).lerp(new THREE.Color(mB.lampCol), u);
  curMood.sunPos.set(...mA.sunPos).lerp(new THREE.Vector3(...mB.sunPos), u);
  curMood.lampPos.set(...mA.lampPos).lerp(new THREE.Vector3(...mB.lampPos), u);
  curMood.sunInt = lerp(mA.sunInt, mB.sunInt, u);
  curMood.lampInt = lerp(mA.lampInt, mB.lampInt, u) * (1 + burst * .9);
  curMood.em = lerp(mA.em, mB.em, u);

  hemi.color.copy(curMood.sky); hemi.groundColor.copy(curMood.gnd);
  sun.color.copy(curMood.sunCol); sun.intensity = curMood.sunInt; sun.position.copy(curMood.sunPos);
  lamp.color.copy(curMood.lampCol); lamp.intensity = curMood.lampInt; lamp.position.copy(curMood.lampPos);
  PAGE_MATS.forEach(m => m.emissiveIntensity = curMood.em);
  CUT_MATS.forEach(m => m.emissiveIntensity = curMood.em * .85);

  const near = Math.round(pos);
  if (near !== activeCh) {
    activeCh = near;
    syncUI();
  }
  $('chapterBox').classList.toggle('fade', Math.abs(pos - near) > .14);

  // Floating landmark pill position
  const lm = LANDMARKS[near], pill = $('landmark');
  const settled = Math.abs(pos - near) < .08 && lm && lm.g.visible;
  pill.classList.toggle('hide', !settled);
  if (settled) {
    const V = lm.top().project(cam);
    pill.style.left = clamp((V.x + 1) / 2 * innerWidth, 95, innerWidth - 95) + 'px';
    pill.style.top = clamp((1 - V.y) / 2 * innerHeight - 10, 86, innerHeight - 170) + 'px';
  }

  // Particles
  burst = Math.max(0, burst - dt * .75);
  const pCol = near === 3 ? '#b5f0ff' : (near === 1 ? '#ffd35c' : '#ffe89c');
  for (const s of PARTS) {
    const d = s.userData;
    s.material.color.set(pCol);
    const riseSpeed = near === 1 ? -.18 : .08 + burst * .25;
    let y = (d.y + t * riseSpeed * d.sp) % .52;
    if (y < .03) y += .49;
    s.position.set(d.x + Math.sin(t * .7 + d.ph) * .08, y, d.z + Math.cos(t * .6 + d.ph) * .06);
    const sz = (.018 + burst * .02) * (.65 + .35 * Math.sin(t * 3 + d.ph));
    s.scale.set(sz, sz, 1);
    s.material.opacity = (.35 + burst * .55) * (.55 + .45 * Math.sin(t * 2.5 + d.ph));
  }

  // Ch 4 starlight beam
  if (starBeam) {
    beamLife = Math.max(0, beamLife - dt * .32);
    const showBeam = near === 4 && (beamLife > .01 || STAMPS.has('tower')) && Math.abs(pos - 4) < .15;
    starBeam.visible = showBeam;
    if (showBeam) {
      const strength = Math.max(beamLife, STAMPS.has('tower') ? .32 : 0);
      starBeam.material.opacity = strength * (.75 + .25 * Math.sin(t * 3.5));
      starBeam.scale.set(1 + Math.sin(t * 4) * .1, 1, 1 + Math.sin(t * 4) * .1);
    }
  }
}

/* ---------- UI Synchronization ---------- */
let toastTimer = null;
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2800);
}

function syncUI() {
  const ch = CHAPTERS[activeCh];
  const stamped = STAMPS.has(ch.id);
  document.documentElement.style.setProperty('--bg-top', ch.mood.top);
  document.documentElement.style.setProperty('--bg-bot', ch.mood.bot);
  $('folio').textContent = ch.folio;
  $('heading').textContent = ch.title;
  $('region').textContent = ch.region;
  $('propHint').textContent = stamped ? `✦ 已解锁「${ch.stampName}」` : `✦ ${ch.hint}`;
  $('line').textContent = stamped ? ch.afterLine : ch.line;
  $('counter').textContent = `${String(activeCh + 1).padStart(2, '0')} / 05`;
  $('previous').disabled = activeCh === 0;
  $('next').disabled = activeCh === N - 1;
  $('stampCount').textContent = `${STAMPS.size}/5`;

  const pill = $('landmark');
  pill.classList.toggle('done', stamped);
  pill.querySelector('span').textContent = stamped ? ch.doneLabel : ch.actionLabel;

  [...$('dots').children].forEach((d, i) => {
    d.className = (i === activeCh ? 'active ' : '') + (STAMPS.has(CHAPTERS[i].id) ? 'stamped' : '');
  });

  if (location.hash !== '#' + ch.id) history.replaceState(null, '', '#' + ch.id);
}

function triggerLandmark(chIdx = activeCh) {
  const ch = CHAPTERS[chIdx];
  const lm = LANDMARKS[chIdx];
  if (lm) lm.pulse = 1;
  burst = 1.2;
  if (chIdx === 4) beamLife = 1.4;
  SFX[ch.id]?.();
  const isNew = !STAMPS.has(ch.id);
  STAMPS.add(ch.id);
  localStorage.setItem(STAMP_KEY, JSON.stringify([...STAMPS]));
  syncUI();
  if (chIdx === 4 && STAMPS.size === 5) {
    toast('⭐ 集齐全部 5 枚星邮印记！迷路的流星已重返银河');
  } else if (isNew) {
    toast(`${ch.stampIcon} 获得「${ch.stampName}」（已收集 ${STAMPS.size}/5）`);
  } else {
    toast(`${ch.stampIcon} ${ch.doneLabel}`);
  }
}

function goChapter(idx) {
  const next = clamp(Math.round(idx), 0, N - 1);
  if (Math.abs(next - tgtPos) > .01) SFX.paper();
  tgtPos = next;
  $('scrub').value = next;
}

/* ---------- Dialogs: Printed Reader & Fold-Out Map ---------- */
function openReader() {
  const ch = CHAPTERS[activeCh];
  $('readFolio').textContent = `${ch.folio} · ${ch.region}`;
  $('readTitle').textContent = ch.title;
  $('readImg').src = ch.ill;
  $('readImg').alt = ch.title;
  $('readContents').innerHTML =
    `<p class="quote">${ch.quote}</p>` +
    ch.prose.map(p => `<p>${p}</p>`).join('');
  $('readStampState').textContent = STAMPS.has(ch.id) ? `${ch.stampIcon} 已盖「${ch.stampName}」` : `尚未盖章 · 返回页面点击「${ch.actionLabel}」`;
  $('readNextBtn').textContent = activeCh < N - 1 ? '前往下一章 ›' : '打开全岛地图 🗺';
  $('pageDialog').showModal();
}

function renderMap() {
  const pts = CHAPTERS.map(c => c.mapPos);
  const pathD = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const nodes = CHAPTERS.map((c, i) => {
    const [x, y] = c.mapPos, got = STAMPS.has(c.id), cur = i === activeCh;
    return `<g class="map-node" data-i="${i}" transform="translate(${x},${y})">
      <circle class="node-ring" r="${cur ? 22 : 17}" fill="${got ? '#27483f' : '#f5ecd9'}" stroke="${cur ? '#d9ad4e' : '#6b5a42'}" stroke-width="${cur ? 4 : 2.5}"/>
      <text y="6" text-anchor="middle" font-size="16" fill="${got ? '#f7e3a6' : '#27483f'}">${got ? c.stampIcon : i + 1}</text>
      <rect x="-46" y="24" width="92" height="24" rx="12" fill="rgba(245,236,217,.94)" stroke="#b69866" stroke-width="1"/>
      <text y="40" text-anchor="middle" font-size="12.5" font-weight="${cur ? 700 : 500}" fill="#212c28">${c.title}</text>
    </g>`;
  }).join('');

  $('chart').innerHTML = `<svg viewBox="0 0 780 390" xmlns="http://www.w3.org/2000/svg">
    <rect width="780" height="390" fill="#d7e4dd"/>
    <g stroke="#b6cbc2" stroke-width="1" opacity=".6">
      <line x1="0" y1="95" x2="780" y2="95"/><line x1="0" y1="195" x2="780" y2="195"/><line x1="0" y1="295" x2="780" y2="295"/>
      <line x1="195" y1="0" x2="195" y2="390"/><line x1="390" y1="0" x2="390" y2="390"/><line x1="585" y1="0" x2="585" y2="390"/>
    </g>
    <path d="M62,300 Q80,190 190,155 Q295,120 390,125 Q520,130 615,72 Q725,42 732,145 Q745,255 645,305 Q540,352 405,315 Q265,342 150,348 Q68,350 62,300 Z" fill="#efe3c6" stroke="#8a7450" stroke-width="3"/>
    <path d="M90,290 Q115,205 210,175 Q315,148 405,152 Q525,155 620,102 Q695,84 702,155 Q708,242 622,282 Q525,318 402,290 Q275,314 166,320 Q100,322 90,290 Z" fill="none" stroke="#c7b28b" stroke-width="1.5" stroke-dasharray="6 5"/>
    <path d="${pathD}" fill="none" stroke="#a97d25" stroke-width="3.5" stroke-dasharray="8 8" stroke-linecap="round"/>
    <g transform="translate(88,78)" fill="none" stroke="#5b6f67" stroke-width="1.5">
      <circle r="28"/><polygon points="0,-24 5,-5 24,0 5,5 0,24 -5,5 -24,0 -5,-5" fill="#d9ad4e" stroke="#6b5220"/>
      <text x="0" y="-32" text-anchor="middle" font-size="11" fill="#3a4c45" stroke="none">N</text>
    </g>
    ${nodes}
  </svg>`;

  $('stamps').innerHTML = CHAPTERS.map(c => {
    const got = STAMPS.has(c.id);
    return `<span class="stamp-pill ${got ? 'got' : ''}">${c.stampIcon} ${c.stampName}${got ? ' · 已集' : ''}</span>`;
  }).join('');

  $('chart').querySelectorAll('.map-node').forEach(n => {
    n.onclick = () => { $('mapDialog').close(); goChapter(+n.dataset.i); };
  });
}

/* ---------- Camera & Pointer Controls ---------- */
const USER = { az: 0, el: 50, zoom: 1 };
const camC = { az: 0, el: 50, zoom: 1, px: 0, py: 0 };
const PTR = { x: 0, y: 0 };

function syncReset() {
  const moved = Math.abs(((USER.az % 360) + 540) % 360 - 180) > 2 || Math.abs(USER.el - 50) > 2 || Math.abs(USER.zoom - 1) > .05;
  $('look').classList.toggle('hide', !moved);
}
function fitDist() {
  const a = innerWidth / innerHeight, v = 34 * PI / 180, hf = 2 * Math.atan(Math.tan(v / 2) * a);
  return Math.max(1.38 / Math.tan(hf / 2), 1.24 / Math.tan(v / 2));
}
function placeCam(dt) {
  const k = 1 - Math.exp(-dt * 8), k2 = 1 - Math.exp(-dt * 2.5);
  camC.az += (USER.az - camC.az) * k;
  camC.el += (USER.el - camC.el) * k;
  camC.zoom += (USER.zoom - camC.zoom) * k;
  camC.px += (PTR.x - camC.px) * k2;
  camC.py += (PTR.y - camC.py) * k2;
  const D = fitDist() * camC.zoom;
  const el = (camC.el + camC.py * 2.5) * PI / 180;
  const az = camC.az * PI / 180 + camC.px * .05;
  cam.position.set(Math.sin(az) * Math.cos(el) * D, Math.sin(el) * D, .04 + Math.cos(az) * Math.cos(el) * D);
  cam.lookAt(0, .06, -.02);
}
function resize() {
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.setSize(innerWidth, innerHeight, true);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
}
addEventListener('resize', resize);

const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
let DR = null, draggingScrub = false;
const PTS = new Map(); let PINCH = null;

function onBook(e) {
  v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(v2, cam);
  return ray.intersectObject(book, true).some(h => h.object.visible);
}

cv.addEventListener('pointerdown', e => {
  ac(); PTS.set(e.pointerId, { x: e.clientX, y: e.clientY }); cv.setPointerCapture(e.pointerId);
  if (PTS.size === 2) {
    const [a, b] = [...PTS.values()];
    PINCH = { d: Math.hypot(a.x - b.x, a.y - b.y), z: USER.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, az: USER.az, el: USER.el };
    DR = null; return;
  }
  const orbit = e.button === 2 || e.shiftKey || !onBook(e);
  DR = { x: e.clientX, y: e.clientY, orbit, moved: false, az: USER.az, el: USER.el, pos0: curPos };
  cv.classList.add(orbit ? 'orbit' : 'turn');
});
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => {
  e.preventDefault(); USER.zoom = clamp(USER.zoom * (1 + e.deltaY * .0011), .5, 1.65); syncReset();
}, { passive: false });

cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { PTR.x = (e.clientX / innerWidth - .5) * 2; PTR.y = (e.clientY / innerHeight - .5) * 2; }
  if (PTS.has(e.pointerId)) PTS.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (PINCH && PTS.size === 2) {
    const [a, b] = [...PTS.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    USER.zoom = clamp(PINCH.z * PINCH.d / Math.max(20, d), .5, 1.65);
    USER.az = PINCH.az - ((a.x + b.x) / 2 - PINCH.mx) * .35;
    USER.el = clamp(PINCH.el + ((a.y + b.y) / 2 - PINCH.my) * .2, 20, 80);
    syncReset(); return;
  }
  if (!DR) return;
  const dx = e.clientX - DR.x, dy = e.clientY - DR.y;
  if (Math.hypot(dx, dy) > 6) DR.moved = true;
  if (DR.orbit) {
    USER.az = DR.az - dx * .4;
    USER.el = clamp(DR.el + dy * .25, 20, 80);
    syncReset();
  } else if (DR.moved) {
    const flip = Math.cos(camC.az * PI / 180) < 0 ? -1 : 1;
    tgtPos = clamp(DR.pos0 - dx * flip / (innerWidth * .42), 0, N - 1);
    $('scrub').value = tgtPos.toFixed(2);
  }
});

cv.addEventListener('pointerup', e => {
  PTS.delete(e.pointerId); if (PTS.size < 2) PINCH = null;
  cv.classList.remove('turn', 'orbit');
  if (!DR) return;
  const d = DR; DR = null;
  if (!d.moved) {
    // Check click on 3D cutout (especially landmark!)
    v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(v2, cam);
    const meshes = STAGES[activeCh].filter(a => a.g.visible).map(a => a.mesh);
    const hits = ray.intersectObjects(meshes);
    if (hits.length) {
      const cut = hits[0].object.userData.cutout;
      if (cut.landmark) triggerLandmark(activeCh);
      else { cut.pulse = .8; tone(640, 880, .12, .08, 'triangle'); }
    }
    return;
  }
  if (!d.orbit) {
    const snapped = Math.round(tgtPos);
    if (snapped !== Math.round(d.pos0)) SFX.paper();
    tgtPos = snapped;
    $('scrub').value = snapped;
  }
});
cv.addEventListener('pointercancel', () => { PTS.clear(); PINCH = null; DR = null; cv.classList.remove('turn', 'orbit'); });

/* ---------- Controls Wiring ---------- */
$('previous').onclick = () => { ac(); goChapter(activeCh - 1); };
$('next').onclick = () => { ac(); goChapter(activeCh + 1); };
$('landmark').onclick = () => { ac(); triggerLandmark(activeCh); };
$('read').onclick = () => { ac(); openReader(); };
$('closePage').onclick = () => $('pageDialog').close();
$('pageDialog').onclick = e => { if (e.target === $('pageDialog')) $('pageDialog').close(); };
$('readNextBtn').onclick = () => {
  $('pageDialog').close();
  if (activeCh < N - 1) goChapter(activeCh + 1);
  else { renderMap(); $('mapDialog').showModal(); }
};
$('mapButton').onclick = () => { ac(); renderMap(); $('mapDialog').showModal(); };
$('closeMap').onclick = () => $('mapDialog').close();
$('mapDialog').onclick = e => { if (e.target === $('mapDialog')) $('mapDialog').close(); };
$('look').onclick = () => { USER.az = Math.round(USER.az / 360) * 360; USER.el = 50; USER.zoom = 1; syncReset(); };
$('sound').onclick = e => {
  SND = !SND;
  const lbl = '声音：' + (SND ? '开' : '关');
  e.currentTarget.textContent = SND ? '🔊' : '🔇';
  e.currentTarget.setAttribute('aria-pressed', SND);
  e.currentTarget.setAttribute('aria-label', lbl);
  e.currentTarget.title = lbl;
};

$('scrub').addEventListener('input', e => { draggingScrub = true; tgtPos = +e.target.value; });
$('scrub').addEventListener('change', e => { draggingScrub = false; goChapter(Math.round(+e.target.value)); });

addEventListener('keydown', e => {
  if ($('pageDialog').open || $('mapDialog').open) return;
  if (e.key === 'ArrowRight') goChapter(activeCh + 1);
  if (e.key === 'ArrowLeft') goChapter(activeCh - 1);
  if (e.key === 'q' || e.key === 'Q') { USER.az += 18; syncReset(); }
  if (e.key === 'e' || e.key === 'E') { USER.az -= 18; syncReset(); }
  if (e.key === ' ') { e.preventDefault(); triggerLandmark(activeCh); }
});

/* ---------- Main Loop ---------- */
let last = performance.now();
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000); last = ts;
  const speed = draggingScrub ? 18 : 7.5;
  curPos += (tgtPos - curPos) * (1 - Math.exp(-dt * speed));
  if (Math.abs(tgtPos - curPos) < .0008) curPos = tgtPos;
  placeCam(dt);
  updateBookState(curPos, dt, ts / 1000, camC.az * PI / 180);
  R.render(scene, cam);
  requestAnimationFrame(frame);
}

/* ---------- Boot ---------- */
(async () => {
  if (matchMedia('(pointer:coarse)').matches) $('turnHint').textContent = '滑动翻页 · 双指旋转 · 点点地标';
  await loadAll();
  buildPageTextures();
  buildStages();
  resize();
  const h = location.hash.slice(1);
  const startIdx = CHAPTERS.findIndex(c => c.id === h);
  if (startIdx >= 0) { curPos = tgtPos = activeCh = startIdx; $('scrub').value = startIdx; }
  syncUI(); syncReset();
  requestAnimationFrame(frame);
  setTimeout(() => { $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 600); }, 250);
})();
