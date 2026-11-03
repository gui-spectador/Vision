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
 * Formatos de garrafa (medidas reais aproximadas, em centímetros, para a versão de 1 litro).
 * Perfil: [altura, raio, quadratura]. Outras capacidades são geradas por escala volumétrica.
 */
export const SHAPES = {
  tennesseeSquare: {
    referenceMl: 1000,
    profile: [
      [0.0, 0.0, 5.6], [0.0, 3.7, 5.6], [0.07, 4.18, 5.6], [0.3, 4.43, 5.6], [0.75, 4.5, 5.6],
      [6.0, 4.5, 5.6], [12.0, 4.5, 5.6], [16.2, 4.5, 5.6],
      [17.1, 4.42, 5.3], [18.0, 4.12, 4.5], [18.8, 3.56, 3.5], [19.5, 2.78, 2.7], [20.1, 2.1, 2.2],
      [20.7, 1.74, 2], [21.3, 1.64, 2], [21.9, 1.74, 2], [22.5, 1.64, 2], [23.6, 1.56, 2],
      [25.5, 1.52, 2], [25.75, 1.66, 2], [26.3, 1.66, 2], [26.5, 1.47, 2], [27.7, 1.43, 2],
      [27.95, 1.32, 2], [28.0, 1.05, 2],
    ],
    wall: 0.32,
    baseTop: 1.15,
    fill: 24.3,
    label: { y0: 3.3, y1: 13.8, width: 8.05 },
    backLabel: { y0: 4.6, y1: 11.4, width: 6.0 },
    neckLabel: { y0: 22.55, y1: 25.85, arc: 0.84 },
    cap: { y0: 25.9, y1: 28.35, r: 1.82 },
    emboss: { y0: 15.3, y1: 17.1 },
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
  ctx.font = '400 74px "Rye", serif';
  ctx.filter = 'blur(2.2px)';
  // u: frente = 0.75, laterais = 0.25 ± 0.25, costas = 0.25
  for (const u of [0.75, 0.25, 0.0, 0.5, 1.0]) ctx.fillText(text, u * W, H / 2 + 4);
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
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.9,
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
    attenuationColor: new THREE.Color('#cfe9df'),
    attenuationDistance: 0.6,
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
  const liquid = new THREE.Mesh(superLathe(liquidRings, 192, { height: H }), liquidMat);
  parts.liquid.add(liquid);

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

  /* Tampa rosqueável serrilhada */
  const c = shape.cap;
  const capRings = [
    { y: c.y0, r: 0, n: 2 },
    { y: c.y0, r: c.r - 0.12, n: 2 },
    { y: c.y0 + 0.03, r: c.r - 0.02, n: 2 },
    { y: c.y0 + 0.12, r: c.r, n: 2 },
    { y: c.y1 - 0.18, r: c.r, n: 2 },
    { y: c.y1 - 0.06, r: c.r - 0.05, n: 2 },
    { y: c.y1 - 0.01, r: c.r - 0.16, n: 2 },
    { y: c.y1, r: c.r - 0.3, n: 2 },
    { y: c.y1, r: 0, n: 2 },
  ];
  const capMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(product.cap?.color ?? '#0d0d0f'),
    roughness: 0.32,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
  });
  const capMesh = new THREE.Mesh(
    superLathe(capRings, 288, { height: H, ribs: { y0: c.y0 + 0.25, y1: c.y1 - 0.25, count: 72, depth: 0.035 } }),
    capMat,
  );
  capMesh.castShadow = true;
  parts.cap.add(capMesh);

  const topColor = product.cap?.top ?? product.cap?.color ?? '#0d0d0f';
  const topIsMetal = product.cap?.topMetal ?? false;
  const capTop = new THREE.Mesh(
    new THREE.CircleGeometry(c.r - 0.34, 96),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(topColor),
      metalness: topIsMetal ? 1 : 0,
      roughness: topIsMetal ? 0.28 : 0.4,
      clearcoat: 0.5,
    }),
  );
  capTop.rotation.x = -Math.PI / 2;
  capTop.position.y = c.y1 + 0.004;
  parts.cap.add(capTop);

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

  /* Escala para a capacidade selecionada */
  const k = Math.cbrt(size.ml / shape.referenceMl);
  const SCENE = 0.1; // 1 unidade = 10 cm
  root.scale.setScalar(k * SCENE);

  /* Âncoras de hotspots (coordenadas locais do modelo, em cm) */
  const anchors = {
    cap: { position: new THREE.Vector3(0, c.y1 - 1.1, c.r + 0.05), normal: new THREE.Vector3(0, 0.2, 1).normalize(), part: 'cap' },
    neck: { ...surfaceAnchor(radiusAt, (shape.neckLabel.y0 + shape.neckLabel.y1) / 2, 0.25, 0.08), part: 'labels' },
    emboss: { ...surfaceAnchor(radiusAt, (shape.emboss.y0 + shape.emboss.y1) / 2, 0.25, 0.06), part: 'glass' },
    label: { ...surfaceAnchor(radiusAt, (shape.label.y0 + shape.label.y1) / 2 + 1.5, 0.25, 0.08), part: 'labels' },
    liquid: { ...surfaceAnchor(radiusAt, 15.2, 0.125, 0.05), part: 'liquid' },
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
          if (m[key] && m[key] !== emboss) disposables.push(m[key]);
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
    core: { y0: shape.baseTop + 0.6, y1: shape.emboss.y1 + 0.6, halfW: 3.3 },
    geo: { shape, radiusAt, H },
    labelCanvas: frontTex.canvas,
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
