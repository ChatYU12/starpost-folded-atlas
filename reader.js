import * as THREE from 'three';
import { CHAPTERS } from './story.js';

const $ = id => document.getElementById(id);
const PI = Math.PI;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eio = t => (t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const N = CHAPTERS.length;
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
  fox: () => { tone(580, 820, .09, .08, 'triangle'); tone(740, 980, .1, .07, 'triangle', .08); },
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

const hemi = new THREE.HemisphereLight('#d4e9e4', '#5c736c', 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffdfa8', 1.9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: .1, far: 8 });
sun.shadow.bias = -.0006; sun.shadow.normalBias = .01;
scene.add(sun, sun.target);

// Soft atmospheric accent light (raised height & wider radius so it never blows out the paper)
const lamp = new THREE.PointLight('#ffc778', .42, 1.9, 1.4); scene.add(lamp);

const deskShadow = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .36 }));
deskShadow.rotation.x = -PI / 2; deskShadow.position.y = -.052; deskShadow.receiveShadow = true;
scene.add(deskShadow);

/* ---------- Asset Loader (29 cutouts + 5 chapter illustrations) ---------- */
const CUTOUT_KEYS = [
  'fox', 'postoffice', 'postbox', 'sailboat', 'mist_cloud',
  'hills_teal', 'dock_lamp', 'reeds_fg', 'star_letter',
  'ginkgo_tree', 'teahouse', 'stone_lantern', 'hills_autumn', 'autumn_bush',
  'bridge_gate', 'chime', 'spruce', 'canyon_peaks', 'birds',
  'conservatory', 'moonflower', 'crescent', 'night_tree', 'flower_cluster',
  'clocktower', 'astrolabe', 'star_arch', 'village', 'shooting_star'
];
const TX = {}, ILL_IMG = {};
const asp = k => TX[k].image.width / TX[k].image.height;
const loader = new THREE.TextureLoader();

function loadImg(url) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
}

async function loadAll() {
  const total = CUTOUT_KEYS.length + N;
  let done = 0;
  const tick = () => {
    const pct = Math.round(++done / total * 100);
    $('ldPct').textContent = pct + '%';
    $('ldFill').style.width = pct + '%';
  };
  await Promise.all([
    ...CUTOUT_KEYS.map(k => loader.loadAsync(`art/${k}.webp`).then(t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TX[k] = t; tick();
    })),
    ...CHAPTERS.map(ch => loadImg(ch.ill).then(im => { ILL_IMG[ch.id] = im; tick(); }))
  ]);
}

/* ---------- Rich Illustrated Parchment Cartography Textures ---------- */
const CW = 900, CHT = 1260;
function drawPaperBase(g, tint = '#f4ecd8') {
  g.fillStyle = tint; g.fillRect(0, 0, CW, CHT);
  const r = rng(19);
  for (let i = 0; i < 3600; i++) {
    g.fillStyle = r() < .5 ? `rgba(110,85,55,${r() * .045})` : `rgba(255,252,240,${r() * .055})`;
    g.fillRect(r() * CW, r() * CHT, 2, 2);
  }
}

function drawCartoOverlay(g, side) {
  // Subtle engraved map grid & topographic contour rings
  g.save();
  g.strokeStyle = 'rgba(247,232,190,.16)'; g.lineWidth = 1.4;
  for (let x = 90; x < CW; x += 150) { g.beginPath(); g.moveTo(x, 42); g.lineTo(x, CHT - 220); g.stroke(); }
  for (let y = 140; y < CHT - 220; y += 150) { g.beginPath(); g.moveTo(0, y); g.lineTo(CW, y); g.stroke(); }
  // Delicate brass corner ticks
  g.strokeStyle = 'rgba(228,185,91,.65)'; g.lineWidth = 2.5;
  const xEdge = side === 'L' ? 54 : CW - 54, dir = side === 'L' ? 1 : -1;
  for (const [yy, yd] of [[54, 1], [CHT - 232, -1]]) {
    g.beginPath(); g.moveTo(xEdge, yy + yd * 26); g.lineTo(xEdge, yy); g.lineTo(xEdge + dir * 26, yy); g.stroke();
  }
  g.restore();
}

const GROUNDS = {
  harbor(g, W, im, side) {
    // Rich painterly water & pier base from illustration + crisp top-down cartography
    g.save(); g.globalAlpha = .42;
    const sx = side === 'L' ? 0 : im.width / 2;
    g.drawImage(im, sx, im.height * .22, im.width / 2, im.height * .78, 0, 0, CW, CHT - 210);
    g.restore();
    // Teal sea wash on right
    const gr = g.createLinearGradient(0, 0, CW, CHT);
    gr.addColorStop(0, 'rgba(42,88,88,.62)'); gr.addColorStop(1, 'rgba(26,64,66,.74)');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // Gentle concentric harbor ripples
    g.strokeStyle = 'rgba(220,242,235,.22)'; g.lineWidth = 2.5;
    for (let i = 0; i < 18; i++) {
      const [x, y] = W(.28 + (i * .13) % .68, -.55 + i * .055);
      g.beginPath(); g.moveTo(x - 32, y); g.quadraticCurveTo(x, y - 6, x + 32, y); g.stroke();
    }
    // Stone & timber pier with plank lines & bollards
    const [x0, y0] = W(-1, -.48), [x1, y1] = W(.30, .28);
    g.fillStyle = '#c5b89e'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = 'rgba(72,56,38,.18)'; g.fillRect(x0, y1 - 16, x1 - x0, 16);
    g.strokeStyle = '#685946'; g.lineWidth = 5; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    const r = rng(4);
    for (let i = 0; i < 72; i++) {
      const [px, py] = W(-1 + r() * 1.24, -.45 + r() * .68);
      g.fillStyle = ['#b6a78d', '#d8ccb4', '#a7987e'][i % 3];
      g.fillRect(px, py, 26 + r() * 24, 15 + r() * 12);
      g.strokeStyle = 'rgba(84,70,52,.22)'; g.lineWidth = 1.5; g.strokeRect(px, py, 26 + r() * 24, 15 + r() * 12);
    }
    // Timber edge pilings along right edge of pier
    for (let z = -.42; z <= .22; z += .16) {
      const [px, py] = W(.30, z);
      g.fillStyle = '#6b4a30'; g.beginPath(); g.arc(px, py, 13, 0, PI * 2); g.fill();
      g.strokeStyle = '#d9ad4e'; g.lineWidth = 2.5; g.stroke();
    }
  },
  ginkgo(g, W, im, side) {
    g.save(); g.globalAlpha = .38;
    const sx = side === 'L' ? 0 : im.width / 2;
    g.drawImage(im, sx, im.height * .2, im.width / 2, im.height * .8, 0, 0, CW, CHT - 210);
    g.restore();
    const gr = g.createLinearGradient(0, 0, 0, CHT);
    gr.addColorStop(0, 'rgba(116,120,70,.68)'); gr.addColorStop(.55, 'rgba(154,132,74,.64)'); gr.addColorStop(1, 'rgba(176,140,72,.72)');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // Winding stone staircase with individual stepped treads
    const pts = [[-.95, .26], [-.52, .16], [-.10, -.02], [.24, -.24], [.62, -.44]];
    g.strokeStyle = '#8b7a5e'; g.lineWidth = 128; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); pts.forEach(([x, z], i) => { const [px, py] = W(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
    g.strokeStyle = '#ded0b4'; g.lineWidth = 112; g.stroke();
    // Individual stair tread lines
    g.strokeStyle = 'rgba(92,74,48,.38)'; g.lineWidth = 3;
    for (let t = 0; t <= 1; t += .035) {
      const idx = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
      const lt = t * (pts.length - 1) - idx;
      const x = lerp(pts[idx][0], pts[idx + 1][0], lt), z = lerp(pts[idx][1], pts[idx + 1][1], lt);
      const [px, py] = W(x, z);
      g.beginPath(); g.moveTo(px - 34, py - 24); g.lineTo(px + 34, py + 24); g.stroke();
    }
    // Scattered golden ginkgo leaves
    const r = rng(12);
    for (let i = 0; i < 160; i++) {
      const [px, py] = W(r() * 2 - 1, -.60 + r() * 1.05);
      g.fillStyle = ['#f5cc58', '#eab438', '#df9b28', '#fae28a'][i % 4];
      g.beginPath(); g.ellipse(px, py, 6 + r() * 7, 4 + r() * 4, r() * 3, 0, PI * 2); g.fill();
    }
  },
  bridge(g, W, im, side) {
    g.save(); g.globalAlpha = .42;
    const sx = side === 'L' ? 0 : im.width / 2;
    g.drawImage(im, sx, im.height * .22, im.width / 2, im.height * .78, 0, 0, CW, CHT - 210);
    g.restore();
    const gr = g.createLinearGradient(0, 0, 0, CHT);
    gr.addColorStop(0, 'rgba(72,62,96,.68)'); gr.addColorStop(.5, 'rgba(46,60,78,.72)'); gr.addColorStop(1, 'rgba(30,44,58,.78)');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // Swirling twilight river & cloud wisps in chasm
    g.strokeStyle = 'rgba(182,222,232,.36)'; g.lineWidth = 54; g.lineCap = 'round';
    g.beginPath();
    [[.06, -.7], [-.05, -.2], [.08, .22], [-.06, .6]].forEach(([x, z], i) => {
      const [px, py] = W(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py);
    }); g.stroke();
    // Cliff edges with warm rock rim
    const drawCliff = poly => {
      g.fillStyle = '#2d4f48';
      g.beginPath(); poly.forEach(([x, z], i) => { const [px, py] = W(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(217,173,78,.42)'; g.lineWidth = 4; g.stroke();
    };
    drawCliff([[-1, -.7], [-.34, -.7], [-.26, -.12], [-.38, .48], [-1, .7]]);
    drawCliff([[1, -.7], [.36, -.7], [.30, -.12], [.42, .48], [1, .7]]);
    // Dirt footpaths leading to the bridge on both banks
    g.strokeStyle = '#bfa67d'; g.lineWidth = 42; g.lineCap = 'round';
    for (const seg of [[[-.92, .08], [-.32, -.12]], [[.34, -.14], [.92, -.24]]]) {
      g.beginPath(); seg.forEach(([x, z], i) => { const [px, py] = W(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
    }
  },
  greenhouse(g, W, im, side) {
    g.save(); g.globalAlpha = .45;
    const sx = side === 'L' ? 0 : im.width / 2;
    g.drawImage(im, sx, im.height * .2, im.width / 2, im.height * .8, 0, 0, CW, CHT - 210);
    g.restore();
    const gr = g.createLinearGradient(0, 0, 0, CHT);
    gr.addColorStop(0, 'rgba(24,40,66,.68)'); gr.addColorStop(1, 'rgba(18,32,48,.76)');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // Moonlit circular garden courtyard & cobblestone path
    const [cx, cy] = W(0, -.04);
    g.fillStyle = 'rgba(164,218,236,.14)';
    g.beginPath(); g.ellipse(cx, cy, CW * .54, CHT * .28, 0, 0, PI * 2); g.fill();
    g.strokeStyle = 'rgba(182,232,248,.35)'; g.lineWidth = 3; g.setLineDash([10, 10]); g.stroke(); g.setLineDash([]);
    const r = rng(27);
    for (let i = 0; i < 64; i++) {
      const a = r() * PI * 2, d = .06 + r() * .48;
      const [px, py] = W(Math.cos(a) * d * 1.45, -.04 + Math.sin(a) * d * .65);
      g.fillStyle = i % 3 ? 'rgba(155,184,202,.32)' : 'rgba(176,238,252,.32)';
      g.beginPath(); g.ellipse(px, py, 14 + r() * 14, 9 + r() * 8, r(), 0, PI * 2); g.fill();
    }
    for (let i = 0; i < 65; i++) {
      const [px, py] = W(r() * 2 - 1, -.58 + r() * 1.0);
      g.fillStyle = i % 2 ? 'rgba(183,235,250,.65)' : 'rgba(255,228,136,.65)';
      g.beginPath(); g.arc(px, py, 3 + r() * 4, 0, PI * 2); g.fill();
    }
  },
  tower(g, W, im, side) {
    g.save(); g.globalAlpha = .45;
    const sx = side === 'L' ? 0 : im.width / 2;
    g.drawImage(im, sx, im.height * .2, im.width / 2, im.height * .8, 0, 0, CW, CHT - 210);
    g.restore();
    const gr = g.createLinearGradient(0, 0, 0, CHT);
    gr.addColorStop(0, 'rgba(22,34,64,.68)'); gr.addColorStop(1, 'rgba(16,24,46,.76)');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CHT);
    // Ornate gilded astronomical compass terrace
    const [cx, cy] = W(0, -.06);
    g.save(); g.translate(cx, cy);
    g.fillStyle = 'rgba(42,54,84,.82)'; g.beginPath(); g.ellipse(0, 0, CW * .54, CHT * .34, 0, 0, PI * 2); g.fill();
    g.strokeStyle = 'rgba(232,189,94,.85)'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, CW * .52, CHT * .32, 0, 0, PI * 2); g.stroke();
    g.setLineDash([12, 10]);
    g.beginPath(); g.ellipse(0, 0, CW * .38, CHT * .23, 0, 0, PI * 2); g.stroke();
    g.beginPath(); g.ellipse(0, 0, CW * .22, CHT * .14, 0, 0, PI * 2); g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < 16; i++) {
      const a = i * PI / 8;
      g.strokeStyle = i % 2 ? 'rgba(232,189,94,.35)' : 'rgba(232,189,94,.75)';
      g.beginPath(); g.moveTo(Math.cos(a) * CW * .14, Math.sin(a) * CHT * .09);
      g.lineTo(Math.cos(a) * CW * .51, Math.sin(a) * CHT * .31); g.stroke();
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

  const pad = 40, bot = 216;
  g.save();
  g.beginPath();
  g.roundRect(side === 'L' ? pad : 0, pad, CW - pad, CHT - pad - bot, 14);
  g.clip();
  GROUNDS[ch.ground](g, W, ILL_IMG[ch.id], side);
  drawCartoOverlay(g, side);
  g.restore();

  // Double gilded hairline frame
  g.strokeStyle = 'rgba(182,140,62,.75)'; g.lineWidth = 3;
  g.strokeRect(side === 'L' ? pad : -4, pad, CW - pad + 4, CHT - pad - bot);
  g.strokeStyle = 'rgba(182,140,62,.32)'; g.lineWidth = 1.5;
  g.strokeRect(side === 'L' ? pad - 8 : -4, pad - 8, CW - pad + 12, CHT - pad - bot + 16);

  // Editorial bottom printed strip on the parchment
  if (side === 'L') {
    g.font = '600 22px "Noto Serif SC", serif'; g.fillStyle = '#8b734b';
    g.fillText(ch.folio, 56, CHT - 144);
    g.font = '700 46px "Noto Serif SC", serif'; g.fillStyle = '#1f3b33';
    g.fillText(ch.title, 56, CHT - 84);
  } else {
    g.font = 'italic 26px "Noto Serif SC", serif'; g.fillStyle = '#3c4a45';
    g.fillText(ch.quote, 46, CHT - 118);
    g.font = '600 22px "Noto Serif SC", serif'; g.fillStyle = '#8b734b';
    g.textAlign = 'right'; g.fillText(`— ${String(chIdx + 1).padStart(2, '0')} —`, CW - 56, CHT - 54);
    g.textAlign = 'left';
  }

  // Spine crease shadow
  const sg = side === 'L' ? g.createLinearGradient(CW, 0, CW - 92, 0) : g.createLinearGradient(0, 0, 92, 0);
  sg.addColorStop(0, 'rgba(32,24,16,.32)'); sg.addColorStop(1, 'rgba(32,24,16,0)');
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

/* ---------- 3D Book Craft Geometry (with brass corners & silk ribbon) ---------- */
const book = new THREE.Group(); scene.add(book);
const coverMat = new THREE.MeshStandardMaterial({ color: '#1e3830', roughness: .82 });
const edgeMat = new THREE.MeshStandardMaterial({ color: '#eadcc2', roughness: .94 });
const brassMat = new THREE.MeshStandardMaterial({ color: '#d9ad4e', metalness: .4, roughness: .35 });
const ribbonMat = new THREE.MeshStandardMaterial({ color: '#9c3830', roughness: .65 });

for (const s of [-1, 1]) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.07, .016, 1.48), coverMat);
  board.position.set(s * .525, -.044, 0); board.receiveShadow = true; board.castShadow = true;
  const block = new THREE.Mesh(new THREE.BoxGeometry(1.0, .036, 1.4), edgeMat);
  block.position.set(s * .5, -.018, 0); block.receiveShadow = true;
  book.add(board, block);
  // Gilded brass corner protectors
  for (const zs of [-1, 1]) {
    const corner = new THREE.Mesh(new THREE.BoxGeometry(.09, .02, .09), brassMat);
    corner.position.set(s * 1.02, -.044, zs * .70);
    book.add(corner);
  }
}
const spine = new THREE.Mesh(new THREE.BoxGeometry(.07, .02, 1.49), brassMat);
spine.position.set(0, -.045, 0); book.add(spine);

// Silk bookmark ribbon draping off bottom spine
const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(.055, .28).rotateX(-PI / 2), ribbonMat);
ribbon.position.set(.015, -.032, .80); ribbon.rotation.z = -.08;
book.add(ribbon);

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

/* ---------- Lush 3-Layer Pop-Up Cutouts & Story Props ---------- */
const CUT_MATS = [], STAGES = Array.from({ length: N }, () => []), LANDMARKS = [], FOXES = [];
const geo1 = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);

class Cutout {
  constructor(chIdx, k, h, x, z, o = {}) {
    this.ch = chIdx; this.k = k; this.h = h; this.x = x; this.z = z;
    this.lift = o.lift || 0; this.sway = o.sway ?? .012; this.bob = o.bob || 0;
    this.drift = o.drift || 0; this.dir = o.dir || 1; this.bb = o.bb ?? true;
    this.landmark = !!o.landmark; this.isFox = k === 'fox';
    this.hiddenUntilTrigger = !!o.hiddenUntilTrigger;
    this.ph = Math.random() * 9; this.pulse = 0; this.extraScale = 1;
    this.g = new THREE.Group(); this.hinge = new THREE.Group(); this.body = new THREE.Group();
    this.mat = new THREE.MeshStandardMaterial({
      map: TX[k], emissiveMap: TX[k], emissive: '#ffffff', emissiveIntensity: .12,
      alphaTest: .42, side: THREE.DoubleSide, roughness: .94
    });
    CUT_MATS.push(this.mat);
    this.mesh = new THREE.Mesh(geo1, this.mat);
    this.mesh.castShadow = !o.noShadow;
    this.mesh.userData.cutout = this;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: .42, map: TX[k] });
    this.g.position.set(x, 0, z);
    this.g.add(this.hinge); this.hinge.add(this.body); this.body.add(this.mesh);
    book.add(this.g);
    STAGES[chIdx].push(this);
    if (this.landmark) LANDMARKS[chIdx] = this;
    if (this.isFox) FOXES[chIdx] = this;
  }
  top() { return this.mesh.localToWorld(new THREE.Vector3(0, 1.06, 0)); }
  update(t, fold, yaw, dt) {
    const show = fold > .005 && (!this.hiddenUntilTrigger || STAMPS.has(CHAPTERS[this.ch].id));
    this.g.visible = show;
    if (!show) return;
    this.g.rotation.y = this.bb ? yaw : 0;
    this.hinge.rotation.x = -(1 - fold) * PI / 2;
    this.pulse = Math.max(0, this.pulse - dt * 1.3);
    const bounce = Math.sin(this.pulse * PI * 3) * this.pulse * .06;
    const sc = this.extraScale + bounce;
    this.mesh.scale.set(this.h * asp(this.k) * this.dir * sc, this.h * sc, 1);
    this.body.position.y = this.lift + Math.max(0, bounce) * .55 + (this.bob ? Math.sin(t * 1.6 + this.ph) * this.bob : 0);
    this.body.position.x = this.drift ? Math.sin(t * .2 + this.ph) * this.drift : 0;
    this.body.rotation.z = Math.sin(t * 1.6 + this.ph) * this.sway + (this.pulse > 0 ? Math.sin(t * 22) * this.pulse * .13 : 0);
  }
}

let starBeam = null, beamLife = 0;
let starLetter = null, canyonBirds = null, shootingStar = null, shootT = 0;

function buildStages() {
  // Ch 0: 雾港邮局 (Background hills + clouds, Midground post office/lamp/sailboat/fox/postbox, Foreground reeds + star letter)
  new Cutout(0, 'hills_teal', .34, 0, -.60, { sway: 0, bb: false, noShadow: true });
  new Cutout(0, 'mist_cloud', .16, -.48, -.58, { lift: .26, drift: .08, sway: .005 });
  new Cutout(0, 'mist_cloud', .13, .44, -.56, { lift: .31, drift: .07, dir: -1, sway: .005 });
  new Cutout(0, 'postoffice', .54, -.46, -.26, { sway: .003, bb: false });
  new Cutout(0, 'dock_lamp', .34, -.04, -.34, { sway: .005 });
  new Cutout(0, 'sailboat', .40, .58, -.20, { bob: .011, sway: .022 });
  new Cutout(0, 'fox', .26, -.06, .02, { sway: .015 });
  new Cutout(0, 'postbox', .25, .20, -.02, { landmark: true, sway: .004 });
  starLetter = new Cutout(0, 'star_letter', .13, .20, -.02, { lift: .26, bob: .022, sway: .06, hiddenUntilTrigger: true });
  new Cutout(0, 'reeds_fg', .20, -.78, .20, { sway: .022 });
  new Cutout(0, 'reeds_fg', .19, .78, .18, { dir: -1, sway: .024 });

  // Ch 1: 银杏阶梯 (Autumn hills + 5 layered ginkgo trees + teahouse + fox + stone lantern + autumn bushes)
  new Cutout(1, 'hills_autumn', .34, 0, -.60, { sway: 0, bb: false, noShadow: true });
  new Cutout(1, 'ginkgo_tree', .54, -.72, -.36, { sway: .016 });
  new Cutout(1, 'ginkgo_tree', .50, .70, -.34, { dir: -1, sway: .016 });
  new Cutout(1, 'ginkgo_tree', .40, -.30, -.50, { sway: .014 });
  new Cutout(1, 'ginkgo_tree', .36, .16, -.54, { dir: -1, sway: .014 });
  new Cutout(1, 'ginkgo_tree', .30, -.82, .08, { sway: .018 });
  new Cutout(1, 'teahouse', .48, .30, -.30, { sway: .003, bb: false });
  new Cutout(1, 'fox', .25, -.16, .05, { sway: .015 });
  new Cutout(1, 'stone_lantern', .27, .24, -.06, { landmark: true, sway: .004 });
  new Cutout(1, 'autumn_bush', .18, -.54, .22, { sway: .016 });
  new Cutout(1, 'autumn_bush', .17, .64, .18, { dir: -1, sway: .016 });
  new Cutout(1, 'autumn_bush', .15, .04, .24, { sway: .015 });

  // Ch 2: 云杉吊桥 (Canyon peaks + 6 spruce pines + large bridge gate + chime + soaring birds + valley mist)
  new Cutout(2, 'canyon_peaks', .40, 0, -.61, { sway: 0, bb: false, noShadow: true });
  new Cutout(2, 'spruce', .52, -.80, -.38, { sway: .012 });
  new Cutout(2, 'spruce', .46, -.58, -.50, { sway: .01 });
  new Cutout(2, 'spruce', .54, .78, -.36, { sway: .012 });
  new Cutout(2, 'spruce', .44, .56, -.50, { sway: .01 });
  new Cutout(2, 'spruce', .36, -.78, .12, { sway: .014 });
  new Cutout(2, 'spruce', .34, .78, .14, { sway: .014 });
  new Cutout(2, 'mist_cloud', .16, .04, .16, { lift: .02, drift: .09, sway: .008 });
  new Cutout(2, 'mist_cloud', .13, -.16, -.44, { lift: .24, drift: .07, dir: -1, sway: .006 });
  new Cutout(2, 'bridge_gate', .56, .06, -.20, { sway: .005, bb: false });
  new Cutout(2, 'fox', .24, -.24, .02, { sway: .015 });
  new Cutout(2, 'chime', .24, -.35, -.14, { landmark: true, lift: .17, sway: .048 });
  canyonBirds = new Cutout(2, 'birds', .18, .18, -.36, { lift: .34, bob: .022, drift: .16, sway: .04, hiddenUntilTrigger: true });

  // Ch 3: 萤火玻璃花房 (Crescent moon + 4 night trees + grand conservatory + moonflower + glowing flower clusters)
  new Cutout(3, 'crescent', .20, -.58, -.60, { lift: .30, sway: .008 });
  new Cutout(3, 'night_tree', .52, -.76, -.36, { sway: .01 });
  new Cutout(3, 'night_tree', .50, .76, -.34, { dir: -1, sway: .01 });
  new Cutout(3, 'night_tree', .38, -.46, -.52, { sway: .01 });
  new Cutout(3, 'night_tree', .38, .48, -.52, { dir: -1, sway: .01 });
  new Cutout(3, 'conservatory', .56, -.06, -.30, { sway: .003, bb: false });
  new Cutout(3, 'fox', .25, -.02, .08, { dir: -1, sway: .015 });
  new Cutout(3, 'moonflower', .25, .28, -.03, { landmark: true, sway: .024 });
  new Cutout(3, 'flower_cluster', .20, -.64, .16, { sway: .02 });
  new Cutout(3, 'flower_cluster', .20, .64, .16, { dir: -1, sway: .02 });
  new Cutout(3, 'flower_cluster', .16, -.36, -.10, { sway: .018 });

  // Ch 4: 观星钟楼 (Milky Way arch + night hills + clocktower + village + astrolabe + shooting star + beam)
  new Cutout(4, 'star_arch', .54, 0, -.60, { lift: .16, sway: .004, bb: false, noShadow: true });
  new Cutout(4, 'hills_teal', .28, 0, -.58, { sway: 0, bb: false, noShadow: true });
  new Cutout(4, 'village', .24, .60, -.16, { sway: .003, bb: false });
  new Cutout(4, 'spruce', .38, -.78, -.32, { sway: .01 });
  new Cutout(4, 'spruce', .32, -.66, .12, { sway: .012 });
  new Cutout(4, 'spruce', .30, .78, .12, { sway: .012 });
  new Cutout(4, 'clocktower', .60, -.24, -.26, { sway: .003, bb: false });
  new Cutout(4, 'fox', .25, -.04, .06, { sway: .015 });
  new Cutout(4, 'astrolabe', .29, .22, -.10, { landmark: true, lift: .06, sway: .018 });
  shootingStar = new Cutout(4, 'shooting_star', .22, .30, -.48, { lift: .42, bob: .018, sway: .04, hiddenUntilTrigger: true });

  const bGeo = new THREE.CylinderGeometry(.016, .065, 1.5, 20, 1, true).translate(0, .75, 0);
  const bMat = new THREE.MeshBasicMaterial({ color: '#ffe896', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  starBeam = new THREE.Mesh(bGeo, bMat);
  starBeam.position.set(.22, .06, -.10);
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
const PARTS = Array.from({ length: 34 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.userData = { x: (Math.random() - .5) * 1.7, z: -.52 + Math.random() * .82, y: .05 + Math.random() * .48, ph: Math.random() * 9, sp: .35 + Math.random() * .7 };
  book.add(s); return s;
});
let burst = 0;

/* ---------- Fox Speech Bubble ---------- */
let foxBubUntil = 0;
function foxSay(text, ms = 3600) {
  const el = $('foxBub');
  el.querySelector('span').textContent = text;
  el.classList.add('on');
  foxBubUntil = performance.now() + ms;
}

/* ---------- Continuous Book Scrubbing & Lighting ---------- */
let curPos = 0, tgtPos = 0, activeCh = 0;
const curMood = {
  sky: new THREE.Color(), gnd: new THREE.Color(), sunCol: new THREE.Color(), lampCol: new THREE.Color(),
  sunPos: new THREE.Vector3(), lampPos: new THREE.Vector3(), sunInt: 2, lampInt: .45, em: .14
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

  for (let c = 0; c < N; c++) {
    const dist = Math.abs(pos - c);
    const fold = clamp(1 - dist / .36);
    const eased = eio(fold);
    for (const a of STAGES[c]) {
      if (a.k === 'moonflower') a.extraScale = STAMPS.has('greenhouse') ? 1.18 : 1;
      a.update(t, eased, yaw, dt);
    }
  }

  // Animate shooting star arc on Ch 4
  if (shootingStar && shootingStar.g.visible) {
    shootT = (shootT + dt * .22) % 1;
    shootingStar.g.position.x = lerp(-.55, .62, shootT);
    shootingStar.lift = .34 + Math.sin(shootT * PI) * .18;
  }

  const mA = CHAPTERS[i0].mood, mB = CHAPTERS[i1].mood, u = eio(frac);
  curMood.sky.set(mA.sky).lerp(new THREE.Color(mB.sky), u);
  curMood.gnd.set(mA.gnd).lerp(new THREE.Color(mB.gnd), u);
  curMood.sunCol.set(mA.sunCol).lerp(new THREE.Color(mB.sunCol), u);
  curMood.lampCol.set(mA.lampCol).lerp(new THREE.Color(mB.lampCol), u);
  curMood.sunPos.set(...mA.sunPos).lerp(new THREE.Vector3(...mB.sunPos), u);
  curMood.lampPos.set(...mA.lampPos).lerp(new THREE.Vector3(...mB.lampPos), u);
  curMood.sunInt = lerp(mA.sunInt, mB.sunInt, u);
  curMood.lampInt = lerp(mA.lampInt, mB.lampInt, u) * (1 + burst * .55);
  curMood.em = lerp(mA.em, mB.em, u);

  hemi.color.copy(curMood.sky); hemi.groundColor.copy(curMood.gnd);
  sun.color.copy(curMood.sunCol); sun.intensity = curMood.sunInt; sun.position.copy(curMood.sunPos);
  lamp.color.copy(curMood.lampCol); lamp.intensity = curMood.lampInt; lamp.position.copy(curMood.lampPos);
  PAGE_MATS.forEach(m => m.emissiveIntensity = curMood.em);
  CUT_MATS.forEach(m => m.emissiveIntensity = curMood.em * .85);

  const near = Math.round(pos);
  if (near !== activeCh) {
    activeCh = near;
    $('foxBub').classList.remove('on');
    syncUI();
  }
  $('chapterBox').classList.toggle('fade', Math.abs(pos - near) > .14);

  // Floating landmark pill positioned cleanly above landmark
  const lm = LANDMARKS[near], pill = $('landmark');
  const settled = Math.abs(pos - near) < .08 && lm && lm.g.visible;
  pill.classList.toggle('hide', !settled);
  if (settled) {
    const V = lm.top().project(cam);
    pill.style.left = clamp((V.x + 1) / 2 * innerWidth, 95, innerWidth - 95) + 'px';
    pill.style.top = clamp((1 - V.y) / 2 * innerHeight - 16, 86, innerHeight - 175) + 'px';
  }

  // Floating Fox speech bubble
  const fox = FOXES[near], bub = $('foxBub');
  if (performance.now() > foxBubUntil || !settled || !fox) {
    bub.classList.remove('on');
  } else if (bub.classList.contains('on')) {
    const V = fox.top().project(cam);
    bub.style.left = clamp((V.x + 1) / 2 * innerWidth, 115, innerWidth - 115) + 'px';
    bub.style.top = clamp((1 - V.y) / 2 * innerHeight, 92, innerHeight - 170) + 'px';
  }

  // Ambient particles
  burst = Math.max(0, burst - dt * .7);
  const pCol = near === 3 ? '#b5f0ff' : (near === 1 ? '#ffd35c' : '#ffe89c');
  for (const s of PARTS) {
    const d = s.userData;
    s.material.color.set(pCol);
    const riseSpeed = near === 1 ? -.18 : .08 + burst * .25;
    let y = (d.y + t * riseSpeed * d.sp) % .56;
    if (y < .03) y += .53;
    s.position.set(d.x + Math.sin(t * .7 + d.ph) * .08, y, d.z + Math.cos(t * .6 + d.ph) * .06);
    const sz = (.018 + burst * .022) * (.65 + .35 * Math.sin(t * 3 + d.ph));
    s.scale.set(sz, sz, 1);
    s.material.opacity = (.36 + burst * .55) * (.55 + .45 * Math.sin(t * 2.5 + d.ph));
  }

  if (starBeam) {
    beamLife = Math.max(0, beamLife - dt * .3);
    const showBeam = near === 4 && (beamLife > .01 || STAMPS.has('tower')) && Math.abs(pos - 4) < .15;
    starBeam.visible = showBeam;
    if (showBeam) {
      const strength = Math.max(beamLife, STAMPS.has('tower') ? .34 : 0);
      starBeam.material.opacity = strength * (.75 + .25 * Math.sin(t * 3.5));
      starBeam.scale.set(1 + Math.sin(t * 4) * .1, 1, 1 + Math.sin(t * 4) * .1);
    }
  }
}

/* ---------- UI Synchronization ---------- */
let toastTimer = null;
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2900);
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

function openFinale() {
  $('certSeals').innerHTML = CHAPTERS.map(c => `<div class="cert-seal" title="${c.stampName}">${c.stampIcon}</div>`).join('');
  $('finaleDialog').showModal();
}

function triggerLandmark(chIdx = activeCh) {
  const ch = CHAPTERS[chIdx];
  const lm = LANDMARKS[chIdx], fox = FOXES[chIdx];
  if (lm) lm.pulse = 1;
  if (fox) fox.pulse = .85;
  burst = 1.25;
  if (chIdx === 4) { beamLife = 1.5; shootT = 0; }
  SFX[ch.id]?.();
  const isNew = !STAMPS.has(ch.id);
  STAMPS.add(ch.id);
  localStorage.setItem(STAMP_KEY, JSON.stringify([...STAMPS]));
  syncUI();
  foxSay(ch.foxAfter, 4200);
  if (chIdx === 4 && STAMPS.size === 5) {
    toast('⭐ 五枚星邮印记全部集齐！流星已重返银河');
    setTimeout(openFinale, 1600);
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
  $('readNextBtn').textContent = activeCh < N - 1 ? '前往下一章 ›' : (STAMPS.size === 5 ? '查看星邮证书 ⭐' : '打开全岛地图 🗺');
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
  }).join('') + (STAMPS.size === 5 ? `<button class="dlg-btn" id="openCertBtn" style="margin-left:auto;padding:5px 14px;font-size:12.5px">⭐ 查看银河证书</button>` : '');

  $('chart').querySelectorAll('.map-node').forEach(n => {
    n.onclick = () => { $('mapDialog').close(); goChapter(+n.dataset.i); };
  });
  const certBtn = $('openCertBtn');
  if (certBtn) certBtn.onclick = () => { $('mapDialog').close(); openFinale(); };
}

/* ---------- Camera & Pointer Controls ---------- */
const USER = { az: 0, el: 48, zoom: 1 };
const camC = { az: 0, el: 48, zoom: 1, px: 0, py: 0 };
const PTR = { x: 0, y: 0 };

function syncReset() {
  const moved = Math.abs(((USER.az % 360) + 540) % 360 - 180) > 2 || Math.abs(USER.el - 48) > 2 || Math.abs(USER.zoom - 1) > .05;
  $('look').classList.toggle('hide', !moved);
}
function fitDist() {
  const a = innerWidth / innerHeight, v = 34 * PI / 180, hf = 2 * Math.atan(Math.tan(v / 2) * a);
  return Math.max(1.36 / Math.tan(hf / 2), 1.22 / Math.tan(v / 2));
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
  cam.lookAt(0, .08, -.03);
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
    v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(v2, cam);
    const meshes = STAGES[activeCh].filter(a => a.g.visible).map(a => a.mesh);
    const hits = ray.intersectObjects(meshes);
    if (hits.length) {
      const cut = hits[0].object.userData.cutout;
      if (cut.landmark) triggerLandmark(activeCh);
      else if (cut.isFox) {
        cut.pulse = .85; SFX.fox();
        const ch = CHAPTERS[activeCh];
        foxSay(STAMPS.has(ch.id) ? ch.foxAfter : ch.foxLine);
      } else { cut.pulse = .75; tone(640, 880, .12, .08, 'triangle'); }
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
  else if (STAMPS.size === 5) openFinale();
  else { renderMap(); $('mapDialog').showModal(); }
};
$('mapButton').onclick = () => { ac(); renderMap(); $('mapDialog').showModal(); };
$('closeMap').onclick = () => $('mapDialog').close();
$('mapDialog').onclick = e => { if (e.target === $('mapDialog')) $('mapDialog').close(); };
$('closeFinale').onclick = () => $('finaleDialog').close();
$('finaleCloseBtn').onclick = () => $('finaleDialog').close();
$('finaleDialog').onclick = e => { if (e.target === $('finaleDialog')) $('finaleDialog').close(); };
$('look').onclick = () => { USER.az = Math.round(USER.az / 360) * 360; USER.el = 48; USER.zoom = 1; syncReset(); };
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
  if ($('pageDialog').open || $('mapDialog').open || $('finaleDialog').open) return;
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
