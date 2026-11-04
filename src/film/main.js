import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/latin-900.css';
import '@fontsource/rye/latin-400.css';
import '@fontsource/great-vibes/latin-400.css';
import '@fontsource/old-standard-tt/latin-400.css';
import '@fontsource/old-standard-tt/latin-700.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/petit-formal-script/latin-400.css';
import '@fontsource/oswald/latin-500.css';
import '@fontsource/oswald/latin-700.css';

import * as THREE from 'three';
import { Stage } from '../three/stage.js';
import { buildBottle } from '../three/bottle.js';
import { buildProps, berryPile } from '../three/props.js';
import { woodTable, rocksGlass, highballDrink, lightCone } from './set.js';
import { PRODUCTS } from '../data/products.js';

/*
 * Estúdio de filmagem: monta as cenas de divulgação do Tennessee Blackberry e renderiza
 * quadros determinísticos (vídeo) e imagens estáticas, com textos aplicados por cima.
 * Uso por automação: window.film.frame(t) e window.film.still(nome) devolvem dataURLs.
 */

const FONTS = [
  '400 80px "Rye"', '400 80px "Great Vibes"', '400 40px "Old Standard TT"', '700 40px "Old Standard TT"',
  '700 40px "Cinzel"', '900 80px "Playfair Display"', '600 80px "Playfair Display"', '400 80px "Petit Formal Script"',
  '500 40px "Oswald"', '700 80px "Oswald"', '400 20px Inter', '500 20px Inter', '600 20px Inter',
];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutBack = (t) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Luz vermelha "com defeito": apagada, piscadas fracas, rajadas e por fim acesa com quedas. */
function flicker(t) {
  if (t < 5.2) return 0;
  const step = Math.floor(t * 14);
  const r = hash(step);
  if (t < 6.8) return r > 0.8 ? 0.3 + 0.2 * hash(step + 3) : 0;
  if (t < 8.6) return r > 0.42 ? 0.55 + 0.45 * hash(step + 7) : 0.04;
  if (t > 9.55 && t < 9.75) return 1.25; // flash na entrada do título
  return r > 0.07 ? 0.88 + 0.12 * Math.sin(t * 37) : 0.25;
}

/* ---------------- caminho de câmera (spline com tempo suavizado) ---------------- */

function monotoneCubic(xs, ys) {
  const n = xs.length;
  const d = [];
  const m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

function cameraPath(keys) {
  const pos = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.p)), false, 'centripetal');
  const tgt = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.l)), false, 'centripetal');
  const map = monotoneCubic(keys.map((k) => k.t), keys.map((_, i) => i / (keys.length - 1)));
  return (t) => {
    const u = clamp01(map(t));
    return { p: pos.getPoint(u), l: tgt.getPoint(u) };
  };
}

/* ---------------- textos ---------------- */

function legal(g, W, H, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,255,255,0.72)';
  const base = Math.min(W, H * 0.75);
  g.font = `600 ${Math.round(base * 0.022)}px Inter`;
  g.letterSpacing = `${(base * 0.002).toFixed(1)}px`;
  g.fillText('BEBA COM MODERAÇÃO. VENDA PROIBIDA PARA MENORES DE 18 ANOS.', W / 2, H - H * 0.03);
  g.restore();
}

function bottomShade(g, W, H, k = 0.75) {
  const gr = g.createLinearGradient(0, H * 0.72, 0, H);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, `rgba(0,0,0,${k})`);
  g.fillStyle = gr;
  g.fillRect(0, H * 0.72, W, H * 0.28);
}

/** "BLACK FRIDAY": BLACK em preto com contorno e brilho vermelhos, FRIDAY em vermelho. */
function blackFridayTitle(g, W, H, p1, p2, glow, { top = 0.13, scale = 0.21 } = {}) {
  const size = Math.round(Math.min(W * scale, H * 0.13));
  g.save();
  g.textAlign = 'center';
  g.font = `700 ${size}px Oswald`;
  g.letterSpacing = `${(size * 0.04).toFixed(1)}px`;
  const yB = -size * 0.4 + (H * top + size * 0.4) * easeOutBack(clamp01(p1));
  const yF = -size * 0.4 + (H * top + size * 0.98 + size * 0.4) * easeOutBack(clamp01(p2));
  if (p1 > 0) {
    g.shadowColor = `rgba(255,32,20,${0.85 * glow})`;
    g.shadowBlur = size * 0.28;
    g.lineWidth = size * 0.04;
    g.strokeStyle = '#ff2a1f';
    g.strokeText('BLACK', W / 2, yB);
    g.shadowBlur = 0;
    g.fillStyle = '#060404';
    g.fillText('BLACK', W / 2, yB);
  }
  if (p2 > 0) {
    g.shadowColor = `rgba(255,24,12,${glow})`;
    g.shadowBlur = size * 0.34;
    g.fillStyle = '#ff1d14';
    g.fillText('FRIDAY', W / 2, yF);
    g.shadowBlur = 0;
    g.lineWidth = size * 0.012;
    g.strokeStyle = '#2a0000';
    g.strokeText('FRIDAY', W / 2, yF);
  }
  g.restore();
}

function productLine(g, W, H, alpha, y = 0.86) {
  g.save();
  g.globalAlpha = alpha;
  g.textAlign = 'center';
  g.fillStyle = '#f6efe8';
  g.font = `500 ${Math.round(W * 0.028)}px Inter`;
  g.letterSpacing = `${(W * 0.008).toFixed(1)}px`;
  g.fillText("JACK DANIEL'S", W / 2, H * y);
  g.letterSpacing = '0px';
  g.font = `600 ${Math.round(W * 0.062)}px "Playfair Display"`;
  g.fillText('Tennessee Blackberry', W / 2, H * y + W * 0.07);
  g.restore();
}

/* ---------------- montagem ---------------- */

async function setup() {
  await Promise.all(FONTS.map((f) => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready;
  const container = document.querySelector('#viewport');
  const stage = new Stage(container);
  stage.renderer.setAnimationLoop(null);
  stage.spin = false;
  const product = PRODUCTS.find((p) => p.id === 'jd-blackberry');
  const bottle = await buildBottle(product, 0);
  stage.showProduct(bottle, null, 0);
  stage.tweens = [];
  bottle.setCold(true);
  Object.assign(stage.controls, { minDistance: 0.01, maxDistance: 1000, minPolarAngle: 0, maxPolarAngle: Math.PI, enableDamping: false, enabled: false });
  const zero = { left: 0, right: 0, top: 0, bottom: 0 };
  stage.setInsets(zero);
  stage.insetsAnim = { ...zero };

  const S = stage.scene;
  const G = new THREE.Vector3(-3.4, 0, 3.2);
  const table = woodTable();
  table.material.map.repeat.set(6, 6);
  const pile = berryPile();
  pile.group.scale.setScalar(0.1);
  const pileTop = pile.top * 0.1;
  const glass = rocksGlass();
  glass.position.copy(G);
  const drink = highballDrink();
  drink.position.set(-1.25, 0.6, 0.6);
  const floorBerries = buildProps('blackberries');
  const cone = lightCone({ height: 5.4, radius: 1.75 });
  cone.position.set(0, 6.2, 0.35);
  const practical = new THREE.SpotLight('#ffb57a', 0, 0, 0.42, 0.75, 2);
  practical.position.set(G.x + 0.5, 4.6, G.z + 1.0);
  practical.target.position.set(G.x, 0.3, G.z);
  practical.castShadow = true;
  practical.shadow.mapSize.set(1024, 1024);
  practical.shadow.radius = 5;
  // lâmpada pendente visível (a fonte da luz quente sobre o copo)
  const bulb = new THREE.Group();
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd2a0').multiplyScalar(6), toneMapped: true }));
  const shadeGeo = new THREE.ConeGeometry(0.32, 0.28, 48, 1, true);
  const shade = new THREE.Mesh(shadeGeo, new THREE.MeshStandardMaterial({ color: '#16110d', roughness: 0.45, metalness: 0.6 }));
  const shadeIn = new THREE.Mesh(shadeGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb070').multiplyScalar(1.6), side: THREE.BackSide }));
  shade.position.y = 0.1;
  shadeIn.position.y = 0.1;
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 4, 6), new THREE.MeshBasicMaterial({ color: '#050505' }));
  wire.position.y = 2.2;
  const flareTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,230,190,1)');
    gr.addColorStop(0.15, 'rgba(255,200,140,0.55)');
    gr.addColorStop(1, 'rgba(255,170,90,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flare.scale.setScalar(0.75);
  bulb.add(glow, shade, shadeIn, wire, flare);
  bulb.position.copy(practical.position).add(new THREE.Vector3(0, 0.06, 0));
  // preenchimento suave no rótulo (a luz vermelha vem de cima e deixa a frente escura)
  const fill = new THREE.SpotLight('#ffd9c4', 0, 0, 0.35, 1, 2);
  fill.position.set(1.6, 2.4, 7.5);
  fill.target.position.set(0, pileTop + 1.4, 0);
  S.add(table, pile.group, glass, drink, floorBerries, cone, practical, practical.target, fill, fill.target, bulb);
  glass.traverse((o) => { if (o.isMesh) o.material.envMapIntensity = 3.2; });

  const u = stage.themeUniforms;
  const show = (o, v) => { o.visible = v; };
  let mode = '';

  function studioScene({ lighting = 'studio' } = {}) {
    mode = `studio-${lighting}`;
    stage.camera.fov = 28;
    stage.camera.updateProjectionMatrix();
    [table, pile.group, glass, drink, cone, bulb].forEach((o) => show(o, false));
    [stage.floor, stage.ao, stage.caustic, floorBerries].forEach((o) => show(o, true));
    practical.intensity = 0;
    fill.intensity = 0;
    bottle.root.position.set(0, 0, 0);
    S.environmentIntensity = 1;
    stage.key.position.set(-3.2, 6.2, 4.2);
    stage.key.target.position.set(0, 1.0, 0);
    stage.key.angle = 0.42;
    stage.key.penumbra = 1;
    stage.rects[0].position.set(-3.6, 2.2, 1.2);
    stage.rects[1].position.set(3.6, 2.2, 1.2);
    stage.rects.forEach((r) => { r.color.set('#ffffff'); r.lookAt(0, 1.4, 0); });
    stage.setLighting(lighting, true);
    stage.setTheme(product.theme, true);
    stage.bokehUniforms.uOpacity.value = 0.45;
  }

  function darkScene() {
    mode = 'dark';
    [table, pile.group, glass, cone, bulb].forEach((o) => show(o, true));
    [stage.floor, stage.ao, stage.caustic, floorBerries, drink].forEach((o) => show(o, false));
    bottle.root.position.set(0, pileTop, 0);
    stage.setLighting('studio', true);
    stage.setTheme({ base: '#020102', glow: '#1e0303', floor: '#040202', accent: '#ff4a3a', caustic: '#ff2a10' }, true);
    S.environmentIntensity = 0.3;
    u.uGlowStrength.value = 0.45;
    u.uGlowSize.value = 7;
    u.uCoreColor.value.set('#ff3322');
    stage.key.color.set('#ff1a12');
    stage.key.position.set(0, 6.2, 0.35);
    stage.key.target.position.set(0, pileTop + 1.0, 0);
    stage.key.angle = 0.34;
    stage.key.penumbra = 0.55;
    stage.rects[0].intensity = 0;
    stage.rects[2].intensity = 0;
    stage.rects[1].position.set(2.4, 2.6, -3.4);
    stage.rects[1].lookAt(0, 1.8, 0);
    stage.rects[1].color.set('#a24bff');
    stage.rects[1].intensity = 2.4;
    stage.hemi.intensity = 0.02;
    stage.bokehUniforms.uColor.value.set('#ff3a2a');
    stage.bokehUniforms.uOpacity.value = 0.22;
    stage.renderer.toneMappingExposure = 1.05;
  }

  function drinkScene() {
    mode = 'drink';
    stage.camera.fov = 28;
    stage.camera.updateProjectionMatrix();
    [table, pile.group, drink].forEach((o) => show(o, true));
    [stage.floor, stage.ao, stage.caustic, floorBerries, glass, cone, bulb].forEach((o) => show(o, false));
    practical.intensity = 0;
    fill.intensity = 0;
    bottle.root.position.set(0, pileTop, 0);
    stage.setLighting('studio', true);
    stage.setTheme({ base: '#0b0414', glow: '#6a2f98', floor: '#0a0410', accent: '#c9a3ff', caustic: '#ff7a3a' }, true);
    S.environmentIntensity = 0.85;
    stage.key.position.set(-3.0, 6.4, 5.0);
    stage.key.target.position.set(-0.5, 1.2, 0);
    stage.key.color.set('#ffffff');
    stage.key.intensity = 60;
    stage.key.angle = 0.5;
    stage.key.penumbra = 1;
    stage.rects.forEach((r) => { r.color.set('#ffffff'); });
    stage.rects[0].position.set(-3.6, 2.2, 1.2);
    stage.rects[1].position.set(3.6, 2.2, 1.2);
    stage.rects.forEach((r) => r.lookAt(0, 1.4, 0));
    u.uCoreStrength.value = 1.8;
  }

  /* ---------- vídeo de Black Friday ---------- */
  const path = cameraPath([
    { t: 0.0, p: [G.x + 0.02, 0.3, G.z + 0.04], l: [G.x + 0.03, 0.1, G.z - 0.08] },
    { t: 0.9, p: [G.x + 0.03, 0.46, G.z + 0.08], l: [G.x + 0.03, 0.1, G.z - 0.14] },
    { t: 1.8, p: [G.x + 0.04, 0.78, G.z + 0.2], l: [G.x - 0.05, 0.62, G.z - 0.65] },
    { t: 3.3, p: [G.x + 0.6, 1.5, G.z + 2.2], l: [G.x, 0.42, G.z] },
    { t: 4.9, p: [G.x + 1.8, 1.3, G.z + 2.6], l: [G.x + 0.3, 0.5, G.z - 0.1] },
    { t: 7.2, p: [-1.0, 1.9, 6.4], l: [-0.25, 1.9, 0] },
    { t: 9.2, p: [0.3, 2.3, 9.6], l: [0, 2.65, 0] },
    { t: 13.0, p: [0.12, 2.35, 8.9], l: [0, 2.7, 0] },
  ]);

  const DURATION = 13;

  function applyFilm(t) {
    if (mode !== 'dark') darkScene();
    const fl = flicker(t);
    // vermelho só como luz suave por cima; o líquido mantém o âmbar natural
    stage.key.intensity = 34 * fl;
    cone.material.uniforms.uIntensity.value = 0.55 * fl;
    u.uCoreColor.value.set('#ffd0a0').lerp(new THREE.Color('#ff8a70'), 0.25 * Math.min(1, fl));
    u.uCoreStrength.value = 0.35 + 1.25 * smooth(6.0, 8.5, t) + 0.25 * fl;
    // lente abre no copo e fecha no produto
    stage.camera.fov = 62 - 34 * smooth(0.3, 4.6, t);
    stage.camera.updateProjectionMatrix();
    const glassPart = 1 - smooth(4.6, 7.2, t);
    practical.intensity = 70 * glassPart + 2;
    // recorte quente atrás do copo enquanto ele está em cena
    stage.rects[0].position.set(G.x - 0.4, 1.3, G.z - 1.8);
    stage.rects[0].lookAt(G.x, 0.4, G.z);
    stage.rects[0].color.set('#ffcf9a');
    stage.rects[0].intensity = 7 * glassPart;
    fill.intensity = 24 * smooth(6.0, 8.0, t);
    stage.bokehUniforms.uTime.value = t;
    bottle.model.rotation.y = -0.25 + t * 0.012;
    const { p, l } = path(t);
    stage.camera.position.copy(p);
    stage.controls.target.copy(l);
    stage.camera.lookAt(l);
    return fl;
  }

  function overlayFilm(g, W, H, t, fl) {
    bottomShade(g, W, H, 0.55 * smooth(8.5, 10, t));
    // abertura
    const a = smooth(0.6, 1.3, t) * (1 - smooth(3.4, 4.0, t));
    if (a > 0) {
      g.save();
      g.globalAlpha = a;
      g.textAlign = 'center';
      g.fillStyle = '#f3ece4';
      g.font = `italic 600 ${Math.round(W * 0.07)}px "Playfair Display"`;
      g.shadowColor = 'rgba(0,0,0,0.6)';
      g.shadowBlur = 18;
      g.fillText('Seu copo está vazio?', W / 2, H * 0.78);
      g.restore();
    }
    const p1 = clamp01((t - 9.55) / 0.7);
    const p2 = clamp01((t - 9.85) / 0.7);
    blackFridayTitle(g, W, H, p1, p2, 0.35 + 0.65 * Math.min(1, fl));
    productLine(g, W, H, smooth(10.8, 11.6, t), 0.84);
    legal(g, W, H, smooth(0.2, 0.8, t));
  }

  /* ---------- imagens estáticas ---------- */
  const STILLS = {
    'black-friday-feed': {
      size: [1080, 1350],
      apply: () => {
        applyFilm(12.4);
        stage.key.intensity = 34;
        fill.intensity = 24;
        cone.material.uniforms.uIntensity.value = 0.55;
        u.uCoreStrength.value = 1.75;
        stage.camera.fov = 28;
        stage.camera.updateProjectionMatrix();
        stage.camera.position.set(0.25, 2.3, 9.4);
        stage.controls.target.set(0, 2.62, 0);
      },
      overlay: (g, W, H) => {
        bottomShade(g, W, H, 0.6);
        blackFridayTitle(g, W, H, 1, 1, 1, { top: 0.135, scale: 0.19 });
        productLine(g, W, H, 1, 0.84);
        legal(g, W, H);
      },
    },
    'black-friday-story': {
      size: [1080, 1920],
      apply: () => {
        applyFilm(12.4);
        stage.key.intensity = 34;
        fill.intensity = 24;
        cone.material.uniforms.uIntensity.value = 0.55;
        u.uCoreStrength.value = 1.75;
        stage.camera.fov = 28;
        stage.camera.updateProjectionMatrix();
        stage.camera.position.set(0.12, 2.35, 8.9);
        stage.controls.target.set(0, 2.7, 0);
      },
      overlay: (g, W, H) => {
        bottomShade(g, W, H, 0.6);
        blackFridayTitle(g, W, H, 1, 1, 1);
        productLine(g, W, H, 1, 0.84);
        legal(g, W, H);
      },
    },
    'blackberry-amoras-paisagem': {
      size: [1920, 1080],
      apply: () => {
        studioScene();
        bottle.model.rotation.y = -0.1;
        stage.camera.position.set(-0.55, 1.75, 7.9);
        stage.controls.target.set(-1.45, 1.42, 0);
      },
      overlay: (g, W, H) => {
        g.save();
        g.fillStyle = '#c9a3ff';
        g.font = `600 ${Math.round(H * 0.026)}px Inter`;
        g.letterSpacing = `${(H * 0.008).toFixed(1)}px`;
        g.fillText("JACK DANIEL'S", W * 0.08, H * 0.36);
        g.letterSpacing = '0px';
        g.fillStyle = '#f6efe8';
        g.font = `600 ${Math.round(H * 0.095)}px "Playfair Display"`;
        g.fillText('Tennessee', W * 0.08, H * 0.47);
        g.fillText('Blackberry', W * 0.08, H * 0.57);
        g.fillStyle = 'rgba(246,239,232,0.75)';
        g.font = `400 ${Math.round(H * 0.03)}px Inter`;
        g.fillText('Licor de amora-preta + Tennessee Whiskey', W * 0.08, H * 0.65);
        g.fillText('35% vol · 1 L · Lynchburg, Tennessee', W * 0.08, H * 0.7);
        g.restore();
        legal(g, W, H);
      },
    },
    'blackberry-drink-feed': {
      size: [1080, 1350],
      apply: () => {
        drinkScene();
        bottle.model.rotation.y = -0.18;
        stage.camera.position.set(-0.1, 2.05, 9.3);
        stage.controls.target.set(-0.5, 1.78, 0.2);
      },
      overlay: (g, W, H) => {
        g.save();
        g.textAlign = 'center';
        g.fillStyle = '#f6efe8';
        g.font = `600 ${Math.round(W * 0.06)}px "Playfair Display"`;
        g.fillText('Jack Blackberry & Lemonade', W / 2, H * 0.1);
        g.fillStyle = 'rgba(246,239,232,0.75)';
        g.font = `400 ${Math.round(W * 0.026)}px Inter`;
        g.fillText('Tennessee Blackberry · limão-siciliano · xarope · gelo', W / 2, H * 0.145);
        g.restore();
        bottomShade(g, W, H, 0.5);
        legal(g, W, H);
      },
    },
    'blackberry-detalhe-feed': {
      size: [1080, 1350],
      apply: () => {
        studioScene();
        bottle.model.rotation.y = -0.6;
        stage.camera.position.set(0.6, 1.75, 4.4);
        stage.controls.target.set(0, 1.55, 0);
      },
      overlay: (g, W, H) => legal(g, W, H),
    },
    'blackberry-contraluz-feed': {
      size: [1080, 1350],
      apply: () => {
        studioScene({ lighting: 'backlight' });
        bottle.model.rotation.y = -0.32;
        stage.camera.position.set(0.3, 1.6, 7.6);
        stage.controls.target.set(0, 1.38, 0);
      },
      overlay: (g, W, H) => {
        bottomShade(g, W, H, 0.5);
        productLine(g, W, H, 1, 0.86);
        legal(g, W, H);
      },
    },
  };

  function setSize(w, h) {
    container.style.width = `${w}px`;
    container.style.height = `${h}px`;
    stage.resize();
  }

  function capture(paint, type = 'image/jpeg', q = 0.93) {
    stage.camera.lookAt(stage.controls.target);
    stage.renderOnce();
    const src = stage.renderer.domElement;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    paint(g, c.width, c.height);
    return c.toDataURL(type, q);
  }

  window.film = {
    DURATION,
    stills: Object.keys(STILLS),
    setSize,
    frame(t) {
      const fl = applyFilm(t);
      return capture((g, W, H) => overlayFilm(g, W, H, t, fl));
    },
    still(name) {
      const s = STILLS[name];
      setSize(...s.size);
      s.apply();
      return capture((g, W, H) => s.overlay(g, W, H), 'image/jpeg', 0.95);
    },
  };
  document.title = 'Vision Estúdio de Filmagem · pronto';
}

setup().catch((e) => {
  console.error(e);
  document.title = `erro: ${e.message}`;
});
