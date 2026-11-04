import * as THREE from 'three';
import {
  sampleProfile,
  radiusFunction,
  superLathe,
  surfacePatch,
  innerVolumeRings,
  surfaceAnchor,
} from './geometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { paintFrontLabel, paintNeckLabel, paintBackLabel, loadLabelImage } from './labels.js';

/*
 * Formatos de garrafa (centímetros, versão de 1 litro). Perfil: [altura, raio, quadratura].
 * Outras capacidades são geradas por escala volumétrica.
 *
 * tennesseeSquare — medido a partir de foto frontal da garrafa de 1 L do Tennessee Blackberry:
 * largura 8,5 cm (ficha de varejo), contorno extraído pixel a pixel (1 px ≈ 0,40 mm).
 * Altura resultante: 27,0 cm (fichas de varejo: 27,2–28 cm). Corpo de faces planas com cantos
 * chanfrados, ombro curto e gargalo cônico com anel na base.
 */
export const SHAPES = {
  tennesseeSquare: {
    referenceMl: 1000,
    profile: [
      [0.0, 0.0, 18], [0.0, 3.85, 18], [0.06, 4.1, 18], [0.25, 4.21, 18], [0.6, 4.25, 18],
      [7.0, 4.25, 18], [14.95, 4.25, 18],
      [15.27, 4.22, 16], [15.51, 4.11, 13], [15.75, 3.93, 10], [15.99, 3.64, 7.5],
      [16.25, 3.28, 5.2], [16.5, 2.9, 3.8], [16.72, 2.6, 3], [16.96, 2.2, 2.3], [17.2, 1.94, 2.05],
      [17.44, 1.87, 2], [17.68, 1.9, 2], [17.93, 1.87, 2], [18.17, 1.86, 2], [18.41, 1.9, 2],
      [18.65, 1.94, 2], [18.95, 1.98, 2], [19.26, 2.0, 2], [19.62, 1.98, 2], [19.86, 1.95, 2],
      [20.1, 1.9, 2], [20.59, 1.83, 2], [21.07, 1.74, 2], [21.55, 1.66, 2], [22.04, 1.57, 2],
      [22.52, 1.49, 2], [23.0, 1.43, 2], [23.49, 1.39, 2], [23.95, 1.37, 2],
      [24.15, 1.3, 2], [26.6, 1.27, 2], [26.85, 1.15, 2], [26.9, 0.9, 2],
    ],
    wall: 0.3,
    baseTop: 1.4,
    fill: 21.3,
    // rótulo frontal: painel de quina a quina (face + chanfros = 9,3 cm), 3,5–13,2 cm do fundo
    label: { y0: 3.5, y1: 13.17, width: 9.3 },
    backLabel: { y0: 4.8, y1: 11.6, width: 6.2 },
    // colarinho envolve todo o gargalo, da tampa até 20,1 cm
    neckLabel: { y0: 20.06, y1: 24.15, arc: 0.999 },
    // tampa: Ø 2,9 cm, 2,9 cm de altura, faixa dourada de 0,65 cm no topo
    cap: { y0: 24.12, y1: 27.03, r: 1.46, gold: 0.65 },
    emboss: { y0: 15.0, y1: 16.15 },
  },
};

const shared = {
  glassNormal: new Map(),
};

/** Mapa de normais para o nome gravado em relevo no vidro (4 faces). */
function embossNormalMap(text) {
  if (shared.glassNormal.has(text)) return shared.glassNormal.get(text);
  const W = 2048;
  const H = 160;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // letras espaçadas ocupando ~64% da face (face ≈ 26% do perímetro)
  const target = W * 0.26 * 0.64;
  let size = 90;
  const spaced = (t) => [...t].join(String.fromCharCode(8202));
  do {
    ctx.font = `700 ${size}px "Old Standard TT", serif`;
    size -= 2;
  } while (ctx.measureText(spaced(text)).width > target && size > 20);
  ctx.filter = 'blur(1.6px)';
  // u: frente = 0.75, laterais = 0.25 ± 0.25, costas = 0.25
  for (const u of [0.75, 0.25, 0.0, 0.5, 1.0]) ctx.fillText(spaced(text), u * W, H / 2 + 4);
  ctx.filter = 'none';
  const src = ctx.getImageData(0, 0, W, H).data;
  const out = ctx.createImageData(W, H);
  const h = (x, y) => src[((Math.min(H - 1, Math.max(0, y)) * W) + ((x + W) % W)) * 4] / 255;
  const strength = 2.4;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const nx = -dx;
      const ny = dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const k = (y * W + x) * 4;
      out.data[k] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[k + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[k + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[k + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  shared.glassNormal.set(text, tex);
  return tex;
}

/*
 * Condensação de garrafa gelada: névoa fina + gotas (1–4 mm) + alguns escorridos.
 * Gera um mapa de altura em canvas, converte em mapa de normais e em máscara de opacidade.
 * O ladrilho cobre ~5,5 cm de garrafa e se repete sem emenda.
 */
let condensationCache = null;
function condensationTextures() {
  if (condensationCache) return condensationCache;
  const S = 1024;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = '#000';
    x.fillRect(0, 0, S, S);
    return [c, x];
  };
  const [hc, h] = mk();
  const [ac, a] = mk();
  const [gc, gl] = mk();
  const glint = (x, y, r) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const cx = x - r * 0.34 + ox;
      const cy = y - r * 0.38 + oy;
      const g = gl.createRadialGradient(cx, cy, 0, cx, cy, r * 0.32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      gl.fillStyle = g;
      gl.beginPath();
      gl.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
      gl.fill();
      a.fillStyle = 'rgba(255,255,255,0.6)';
      a.beginPath();
      a.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
      a.fill();
    }
  };
  let seed = 17;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const dome = (ctx, x, y, r, peak = 1) => {
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        const cx = x + ox;
        const cy = y + oy;
        if (cx + r < 0 || cx - r > S || cy + r < 0 || cy - r > S) continue;
        const g = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, 0, cx, cy, r);
        const v = Math.round(255 * peak);
        g.addColorStop(0, `rgb(${v},${v},${v})`);
        g.addColorStop(0.55, `rgb(${Math.round(v * 0.82)},${Math.round(v * 0.82)},${Math.round(v * 0.82)})`);
        g.addColorStop(0.85, `rgb(${Math.round(v * 0.45)},${Math.round(v * 0.45)},${Math.round(v * 0.45)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  const disc = (ctx, x, y, r, alpha) => {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  // névoa: micro gotas
  a.fillStyle = 'rgba(255,255,255,0.05)';
  a.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.8 + rnd() * 2.2;
    dome(h, x, y, r, 0.55);
    disc(a, x, y, r, 0.16);
  }
  // gotas maiores
  for (let i = 0; i < 380; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 4 + rnd() ** 2.6 * 30;
    dome(h, x, y, r * 1.02, 1);
    disc(a, x, y, r, 0.34);
    if (r > 6) glint(x, y, r);
  }
  // escorridos: trilha limpa (sem névoa) com gota na ponta
  for (let i = 0; i < 12; i++) {
    let x = rnd() * S;
    let y = rnd() * S * 0.7;
    const len = 80 + rnd() * 320;
    const w = 6 + rnd() * 8;
    a.save();
    a.globalCompositeOperation = 'destination-out';
    a.strokeStyle = 'rgba(0,0,0,0.85)';
    a.lineWidth = w * 1.6;
    a.lineCap = 'round';
    a.beginPath();
    a.moveTo(x, y);
    const steps = 12;
    for (let k = 1; k <= steps; k++) a.lineTo(x + Math.sin(k * 0.9 + i) * 3, y + (len * k) / steps);
    a.stroke();
    a.restore();
    a.strokeStyle = 'rgba(255,255,255,0.28)';
    a.lineWidth = w * 0.5;
    a.beginPath();
    a.moveTo(x, y);
    for (let k = 1; k <= steps; k++) a.lineTo(x + Math.sin(k * 0.9 + i) * 3, y + (len * k) / steps);
    a.stroke();
    h.strokeStyle = 'rgba(160,160,160,0.6)';
    h.lineWidth = w * 0.5;
    h.stroke();
    y += len;
    dome(h, x, y, w * 1.4, 1);
    disc(a, x, y, w * 1.35, 0.4);
    glint(x, y, w * 1.35);
  }
  // mapa de normais
  const src = h.getImageData(0, 0, S, S).data;
  const [nc, n] = mk();
  const out = n.createImageData(S, S);
  const H = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  const k = 3.2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * k;
      const dy = (H(x, y + 1) - H(x, y - 1)) * k;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * S + x) * 4;
      out.data[i] = (-dx / len * 0.5 + 0.5) * 255;
      out.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;
      out.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  n.putImageData(out, 0, 0);
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 5);
    t.anisotropy = 8;
    return t;
  };
  condensationCache = { normal: tex(nc), alpha: tex(ac), glint: tex(gc) };
  return condensationCache;
}

function labelMaterials(tex, paperBack) {
  const front = new THREE.MeshPhysicalMaterial({
    map: tex.map,
    roughness: tex.orm ? 1 : 0.55,
    metalness: tex.orm ? 1 : 0,
    roughnessMap: tex.orm,
    metalnessMap: tex.orm,
    bumpMap: tex.bump,
    bumpScale: 1.2,
    side: THREE.FrontSide,
    envMapIntensity: 1.0,
  });
  const back = new THREE.MeshStandardMaterial({
    color: paperBack,
    roughness: 0.85,
    side: THREE.BackSide,
  });
  return [front, back];
}

function doubleMesh(geo, [front, back]) {
  const g = new THREE.Group();
  const a = new THREE.Mesh(geo, front);
  const b = new THREE.Mesh(geo, back);
  a.castShadow = true;
  g.add(a, b);
  return g;
}

/**
 * Constrói a garrafa 3D de um produto.
 * Retorna { group, parts, anchors, heightWorld, explodeOffsets }.
 * Unidades: geometria em cm; group.scale converte para a escala da cena (1 unidade = 10 cm).
 */
export async function buildBottle(product, sizeIndex = 0) {
  if (product.model) return buildFromGLB(product, sizeIndex);
  const shape = SHAPES[product.shape ?? 'tennesseeSquare'];
  const size = product.sizes[sizeIndex] ?? product.sizes[0];
  const design = product.design;

  const rings = sampleProfile(shape.profile, 300);
  const radiusAt = radiusFunction(rings, 0.6);
  const H = shape.cap.y1;

  const root = new THREE.Group();
  root.name = product.id;
  const model = new THREE.Group(); // gira no "turntable"
  root.add(model);

  const parts = {
    glass: new THREE.Group(),
    liquid: new THREE.Group(),
    labels: new THREE.Group(),
    back: new THREE.Group(),
    cap: new THREE.Group(),
  };
  Object.entries(parts).forEach(([k, g]) => {
    g.name = k;
    model.add(g);
  });

  /* Vidro: casca com reflexos aditivos (o volume refrativo fica no líquido e na base maciça) */
  const glassGeo = superLathe(rings, 192, { height: H });
  const emboss = embossNormalMap(design.wordmark ?? "JACK DANIEL'S");
  const em = emboss.clone();
  em.needsUpdate = true;
  const vb0 = shape.emboss.y0 / H;
  const vb1 = shape.emboss.y1 / H;
  em.repeat.set(1, 1 / (vb1 - vb0));
  em.offset.set(0, -vb0 / (vb1 - vb0));
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    metalness: 0,
    roughness: 0.035,
    ior: 1.52,
    specularIntensity: 1,
    envMapIntensity: 1.45,
    normalMap: em,
    normalScale: new THREE.Vector2(0.9, 0.9),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.renderOrder = 10;
  parts.glass.add(glass);

  // Base maciça de vidro (fundo grosso típico de garrafas premium)
  const baseRings = innerVolumeRings(radiusAt, 0.06, shape.baseTop - 0.04, 0.05, 20, 0.35);
  const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1,
    roughness: 0.06,
    ior: 1.52,
    thickness: 1.2,
    attenuationColor: new THREE.Color(product.liquid.color).lerp(new THREE.Color('#ffffff'), 0.45),
    attenuationDistance: 0.35,
    specularIntensity: 1,
    envMapIntensity: 1.4,
  });
  const base = new THREE.Mesh(superLathe(baseRings, 160, { height: H }), baseMat);
  parts.glass.add(base);

  /* Líquido: volume transmissivo com absorção (lei de Beer-Lambert via attenuationColor) */
  const liquidRings = innerVolumeRings(radiusAt, shape.baseTop, shape.fill, shape.wall, 140);
  const liq = product.liquid;
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(liq.tint ?? '#ffffff'),
    transmission: 1,
    roughness: 0.02,
    ior: 1.36,
    thickness: 8.2,
    attenuationColor: new THREE.Color(liq.color),
    attenuationDistance: liq.attenuationDistance ?? 0.9,
    specularIntensity: 0.35,
    envMapIntensity: 0.8,
    dispersion: 0.25,
  });
  // Comportamento de fluido na vista explodida: ondulação do volume, superfície livre,
  // reflexos que escorrem e bolhas subindo. Desligado (0) com a garrafa montada.
  liquidMat.clearcoat = 0.001;
  liquidMat.clearcoatRoughness = 0.02;
  const fluid = {
    uTime: { value: 0 },
    uFluid: { value: 0 },
    uAmp: { value: 0 },
    uY0: { value: shape.baseTop },
    uY1: { value: shape.fill },
  };
  liquidMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fluid);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uFluid; uniform float uAmp; uniform float uY0; uniform float uY1;
        varying vec3 vFluidPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vFluidPos = position;
        if (uAmp > 0.0005) {
          float hN = clamp((position.y - uY0) / (uY1 - uY0), 0.0, 1.0);
          float rl = length(position.xz);
          vec2 dir = rl > 1e-4 ? position.xz / rl : vec2(0.0);
          float w1 = sin(position.y * 0.55 - uTime * 2.4 + position.x * 0.35) * 0.16;
          float w2 = sin(position.x * 1.1 + uTime * 3.3) * cos(position.z * 0.9 - uTime * 2.7) * 0.1;
          float w3 = sin(position.y * 1.7 + uTime * 4.1 + position.z * 1.3) * 0.05;
          transformed.xz += dir * (w1 + w2 + w3) * uAmp * (0.35 + 0.65 * hN);
          float topMask = smoothstep(uY1 - 0.35, uY1 + 0.01, position.y);
          transformed.y += topMask * uAmp * (sin(rl * 3.2 - uTime * 5.5) * 0.1 + position.x * 0.06 * sin(uTime * 1.6));
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uFluid; varying vec3 vFluidPos;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uFluid > 0.0005) {
          vec3 q = vFluidPos;
          vec3 pert = vec3(
            sin(q.y * 1.6 + uTime * 2.1) * cos(q.x * 1.3 - uTime * 1.5),
            sin(q.x * 1.9 - uTime * 1.2) * 0.5,
            cos(q.y * 1.4 - uTime * 1.8) * sin(q.z * 1.5 + uTime * 1.1));
          normal = normalize(normal + uFluid * 0.18 * pert);
        }`);
  };
  const liquid = new THREE.Mesh(superLathe(liquidRings, 192, { height: H }), liquidMat);
  parts.liquid.add(liquid);

  // bolhas
  const BUBBLES = 170;
  // opacas: entram no passe de transmissão e aparecem refratadas através do líquido
  const bubbleMat = new THREE.MeshPhysicalMaterial({
    color: '#fff3e2',
    emissive: new THREE.Color('#5a3a1c'),
    roughness: 0.04,
    clearcoat: 1,
    envMapIntensity: 3,
  });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), bubbleMat, BUBBLES);
  bubbles.frustumCulled = false;
  bubbles.visible = false;
  parts.liquid.add(bubbles);
  let bseed = 99;
  const brnd = () => {
    bseed = (bseed * 16807) % 2147483647;
    return bseed / 2147483647;
  };
  const bubble = Array.from({ length: BUBBLES }, () => ({}));
  const spawn = (b, anywhere) => {
    b.y = anywhere ? shape.baseTop + 0.3 + brnd() * (shape.fill - shape.baseTop - 0.8) : shape.baseTop + 0.3;
    const R = Math.max(0.2, radiusAt(b.y).r - shape.wall - 0.35);
    b.x = (brnd() * 2 - 1) * R * 0.85;
    b.z = (brnd() * 2 - 1) * R * 0.85;
    b.speed = 1.2 + brnd() * 2.8;
    b.size = 0.04 + brnd() ** 2 * 0.14;
    b.phase = brnd() * 6.28;
  };
  bubble.forEach((b) => spawn(b, true));
  const bm = new THREE.Matrix4();
  let explodeStart = -10;
  let wasExploded = false;

  /* Rótulos */
  const volumeText = size.labelText;
  const frontTex = product.labelImage ? await loadLabelImage(product.labelImage) : paintFrontLabel(design, volumeText);
  const neckTex = paintNeckLabel(design);
  const backTex = paintBackLabel(design, product, volumeText);
  const paperBack = design.paperBack ?? '#d9cfbd';

  const frontGeo = surfacePatch(radiusAt, { ...shape.label, center: 0.25, offset: 0.03 });
  const front = doubleMesh(frontGeo, labelMaterials(frontTex, paperBack));
  front.name = 'frontLabel';
  const neckGeo = surfacePatch(radiusAt, { ...shape.neckLabel, center: 0.25, offset: 0.035, segY: 40 });
  const neck = doubleMesh(neckGeo, labelMaterials(neckTex, paperBack));
  neck.name = 'neckLabel';
  parts.labels.add(front, neck);

  const backGeo = surfacePatch(radiusAt, { ...shape.backLabel, center: 0.75, offset: 0.03 });
  const back = doubleMesh(backGeo, labelMaterials(backTex, paperBack));
  parts.back.add(back);

  /* Tampa rosqueável: corpo preto canelado + faixa dourada no topo */
  const c = shape.cap;
  const goldH = product.cap?.ring ? c.gold ?? 0.6 : 0;
  const capRings = [
    { y: c.y0, r: 0, n: 2 },
    { y: c.y0, r: c.r - 0.1, n: 2 },
    { y: c.y0 + 0.03, r: c.r - 0.02, n: 2 },
    { y: c.y0 + 0.1, r: c.r, n: 2 },
    { y: c.y1 - 0.14, r: c.r, n: 2 },
    { y: c.y1 - 0.04, r: c.r - 0.05, n: 2 },
    { y: c.y1, r: c.r - 0.18, n: 2 },
    { y: c.y1, r: 0, n: 2 },
  ];
  const capMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(product.cap?.color ?? '#0d0d0f'),
    roughness: 0.22,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const capMesh = new THREE.Mesh(
    superLathe(capRings, 288, {
      height: H,
      ribs: { y0: c.y0 + 0.18, y1: c.y1 - goldH - 0.08, count: 24, depth: 0.05 },
    }),
    capMat,
  );
  capMesh.castShadow = true;
  parts.cap.add(capMesh);

  const topColor = product.cap?.top ?? product.cap?.color ?? '#0d0d0f';
  const topIsMetal = product.cap?.topMetal ?? false;
  const capTop = new THREE.Mesh(
    new THREE.CircleGeometry(c.r - 0.17, 96),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(topColor),
      metalness: topIsMetal ? 1 : 0,
      roughness: topIsMetal ? 0.3 : 0.4,
      clearcoat: 0.5,
    }),
  );
  capTop.rotation.x = -Math.PI / 2;
  capTop.position.y = c.y1 + 0.004;
  parts.cap.add(capTop);

  // Faixa dourada lisa no topo da tampa
  if (goldH > 0) {
    const ringRings = [
      { y: c.y1 - goldH, r: c.r + 0.012, n: 2 },
      { y: c.y1 - 0.12, r: c.r + 0.012, n: 2 },
      { y: c.y1 - 0.03, r: c.r - 0.05, n: 2 },
      { y: c.y1 + 0.002, r: c.r - 0.17, n: 2 },
    ];
    const ring = new THREE.Mesh(
      superLathe(ringRings, 160, { height: H }),
      new THREE.MeshPhysicalMaterial({ color: product.cap.ring, metalness: 1, roughness: 0.28, clearcoat: 0.6 }),
    );
    parts.cap.add(ring);
  }

  // Faixa metálica da tampa (quando existir)
  if (product.cap?.band) {
    const bandRings = [
      { y: c.y0 - 0.02, r: c.r + 0.01, n: 2 },
      { y: c.y0 + 0.28, r: c.r + 0.01, n: 2 },
    ];
    const band = new THREE.Mesh(
      superLathe(bandRings, 160, { height: H }),
      new THREE.MeshPhysicalMaterial({ color: product.cap.band, metalness: 1, roughness: 0.3, side: THREE.DoubleSide }),
    );
    parts.cap.add(band);
  }

  /* Condensação (garrafa gelada): camada fina por fora do vidro e dos rótulos, até a tampa */
  const condRings = rings.filter((p) => p.y <= shape.cap.y0 + 0.05).map((p) => ({ ...p, r: p.r > 0 ? p.r + 0.06 : 0 }));
  const cond = condensationTextures();
  const condMat = new THREE.MeshPhysicalMaterial({
    color: '#3a4247',
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: cond.glint,
    emissiveIntensity: 0.85,
    roughness: 0.08,
    metalness: 0,
    ior: 1.33,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 5,
    normalMap: cond.normal,
    normalScale: new THREE.Vector2(2.2, 2.2),
    alphaMap: cond.alpha,
    transparent: true,
    depthWrite: false,
  });
  const condensation = new THREE.Mesh(superLathe(condRings, 192, { height: H }), condMat);
  condensation.renderOrder = 11;
  condensation.visible = false;
  parts.glass.add(condensation);

  /* Escala para a capacidade selecionada */
  const k = Math.cbrt(size.ml / shape.referenceMl);
  const SCENE = 0.1; // 1 unidade = 10 cm
  root.scale.setScalar(k * SCENE);

  /* Âncoras de hotspots (coordenadas locais do modelo, em cm) */
  const anchors = {
    cap: { position: new THREE.Vector3(0, c.y1 - 1.1, c.r + 0.05), normal: new THREE.Vector3(0, 0.2, 1).normalize(), part: 'cap' },
    neck: { ...surfaceAnchor(radiusAt, (shape.neckLabel.y0 + shape.neckLabel.y1) / 2, 0.25, 0.08), part: 'labels' },
    emboss: { ...surfaceAnchor(radiusAt, (shape.emboss.y0 + shape.emboss.y1) / 2, 0.25, 0.06), part: 'glass' },
    label: { ...surfaceAnchor(radiusAt, (shape.label.y0 + shape.label.y1) / 2, 0.37, 0.08), part: 'labels' },
    liquid: { ...surfaceAnchor(radiusAt, shape.label.y1 + 1.0, 0.125, 0.05), part: 'liquid' },
    base: { ...surfaceAnchor(radiusAt, 0.55, 0.25, 0.05), part: 'glass' },
  };

  // Vista explodida em linha: líquido | garrafa (tampa acima) | rótulos
  const explodeOffsets = {
    cap: new THREE.Vector3(0, 6, 0),
    labels: new THREE.Vector3(11, 0, 0),
    back: new THREE.Vector3(11, 0, 0),
    liquid: new THREE.Vector3(-11, 0, 0),
    glass: new THREE.Vector3(0, 0, 0),
  };

  const disposables = [];
  root.traverse((o) => {
    if (o.isMesh) {
      disposables.push(o.geometry);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        disposables.push(m);
        ['map', 'roughnessMap', 'bumpMap', 'normalMap'].forEach((key) => {
          if (m[key] && m[key] !== emboss && m[key] !== cond.normal) disposables.push(m[key]);
        });
        ['alphaMap', 'emissiveMap'].forEach((key) => {
          if (m[key] && m[key] !== cond.alpha && m[key] !== cond.glint) disposables.push(m[key]);
        });
      });
    }
  });

  return {
    product,
    size,
    root,
    model,
    parts,
    anchors,
    explodeOffsets,
    heightWorld: H * k * SCENE,
    widthWorld: 9 * k * SCENE,
    centerY: (H * k * SCENE) * 0.48,
    core: { y0: shape.baseTop + 0.6, y1: shape.emboss.y0 + 0.4, halfW: 3.1 },
    coreNeck: { y0: shape.emboss.y1 + 0.6, y1: shape.fill, halfW: 1.25 },
    geo: { shape, radiusAt, H },
    labelCanvas: frontTex.canvas,
    /** Animação do líquido; e = fator da vista explodida (0..1). */
    update(dt, e = 0) {
      const t = (fluid.uTime.value += dt);
      const f = Math.min(1, Math.max(0, (e - 0.15) / 0.6));
      if (f > 0.05 && !wasExploded) explodeStart = t;
      wasExploded = f > 0.05;
      const impulse = Math.exp(-(t - explodeStart) * 1.3) * 1.0;
      fluid.uFluid.value = f;
      fluid.uAmp.value = f * (1 + Math.max(0, impulse));
      liquidMat.attenuationDistance = (liq.attenuationDistance ?? 0.9) * (1 + 0.9 * f);
      liquidMat.specularIntensity = 0.35 + 0.65 * f;
      liquidMat.clearcoat = 0.001 + 0.999 * f;
      liquidMat.envMapIntensity = 0.8 + 1.4 * f;
      bubbles.visible = f > 0.01;
      if (!bubbles.visible) return;
      bubble.forEach((b, i) => {
        b.y += b.speed * dt;
        if (b.y > shape.fill - 0.35) spawn(b, false);
        const wob = Math.sin(t * 3 + b.phase) * 0.06;
        const s = b.size * f;
        bm.makeScale(s, s, s);
        bm.setPosition(b.x + wob, b.y, b.z + Math.cos(t * 2.4 + b.phase) * 0.05);
        bubbles.setMatrixAt(i, bm);
      });
      bubbles.instanceMatrix.needsUpdate = true;
    },
    /** Garrafa gelada: mostra a condensação (névoa e gotas) sobre vidro e rótulos. */
    setCold(on) {
      condensation.visible = on;
    },
    dispose() {
      new Set(disposables).forEach((d) => d.dispose?.());
    },
  };
}

/**
 * Produto a partir de um modelo real (.glb escaneado ou do fabricante).
 * Espera escala em metros, base em y = 0 e frente para +Z. Os hotspots são posicionados
 * por proporção da altura; ajuste `product.anchors` (em cm) se precisar de precisão.
 */
async function buildFromGLB(product, sizeIndex) {
  const size = product.sizes[sizeIndex] ?? product.sizes[0];
  const gltf = await new GLTFLoader().loadAsync(product.model);
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);
  const parts = { glass: new THREE.Group(), liquid: new THREE.Group(), labels: new THREE.Group(), back: new THREE.Group(), cap: new THREE.Group() };
  Object.values(parts).forEach((g) => model.add(g));
  const scene = gltf.scene;
  scene.scale.setScalar(100); // m -> cm (coordenadas locais em cm, como os modelos procedurais)
  scene.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  parts.glass.add(scene);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const H = box.max.y;
  const halfW = Math.max(box.max.x, box.max.z, 1);
  const front = (y, z = halfW) => ({ position: new THREE.Vector3(0, y, z + 0.1), normal: new THREE.Vector3(0, 0, 1), part: 'glass' });
  const custom = product.anchors ?? {};
  const anchors = {
    cap: front(H * 0.95, halfW * 0.4),
    neck: front(H * 0.84, halfW * 0.4),
    emboss: front(H * 0.6),
    label: front(H * 0.32),
    liquid: { position: new THREE.Vector3(halfW * 0.7, H * 0.55, halfW * 0.7), normal: new THREE.Vector3(1, 0, 1).normalize(), part: 'glass' },
    base: front(H * 0.03),
  };
  for (const [k, v] of Object.entries(custom)) anchors[k] = { ...anchors[k], position: new THREE.Vector3(...v) };
  const SCENE = 0.1;
  const k = product.modelMl ? Math.cbrt(size.ml / product.modelMl) : 1;
  root.scale.setScalar(k * SCENE);
  return {
    product,
    size,
    root,
    model,
    parts,
    anchors,
    explodeOffsets: {},
    heightWorld: H * k * SCENE,
    widthWorld: halfW * 2 * k * SCENE,
    centerY: H * k * SCENE * 0.48,
    core: { y0: H * 0.06, y1: H * 0.6, halfW: halfW * 0.7 },
    labelCanvas: null,
    dispose() {
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    },
  };
}
