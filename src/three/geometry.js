import * as THREE from 'three';

/*
 * Geometria procedural de garrafas.
 *
 * Toda garrafa é descrita por um perfil (altura y, raio r, "quadratura" n) em centímetros.
 * Cada anel do perfil é uma superelipse |x/r|^n + |z/r|^n = 1:
 *   n = 2   -> seção redonda (gargalo, garrafas de vinho)
 *   n = 12~20 -> seção quadrada de faces planas e cantos chanfrados (garrafa quadrada de Tennessee whiskey)
 * Variar n ao longo da altura permite ombros que passam de quadrado para redondo.
 */

const sectionCache = new Map();

const quantizeN = (n) => (n < 6 ? Math.round(Math.max(2, n) * 20) / 20 : Math.round(n * 4) / 4);

// Garrafas quadradas premium têm cantos chanfrados (pequenas facetas verticais).
// O chanfro é o plano |x| + |z| = CHAMFER_K; só atua em seções quase quadradas
// (em seções redondas, |x| + |z| <= √2 < CHAMFER_K, então nada é cortado).
const CHAMFER_K = 1.84;

function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Raio polar da seção unitária: superelipse de expoente n, com cantos chanfrados. */
function polarRadius(theta, n) {
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  const rs = n <= 2.0001 ? 1 : (c ** n + s ** n) ** (-1 / n);
  const rd = CHAMFER_K / (c + s);
  return smin(rs, rd, 0.035);
}

/** Seção transversal unitária com pontos espaçados igualmente pelo comprimento de arco. */
export function crossSection(nIn, segments) {
  const n = quantizeN(nIn);
  const key = `${n}|${segments}`;
  const cached = sectionCache.get(key);
  if (cached) return cached;

  const fine = 4096;
  const px = new Float64Array(fine + 1);
  const pz = new Float64Array(fine + 1);
  const cum = new Float64Array(fine + 1);
  for (let i = 0; i <= fine; i++) {
    const t = (i / fine) * Math.PI * 2;
    const r = polarRadius(t, n);
    px[i] = Math.cos(t) * r;
    pz[i] = Math.sin(t) * r;
    if (i > 0) cum[i] = cum[i - 1] + Math.hypot(px[i] - px[i - 1], pz[i] - pz[i - 1]);
  }
  const total = cum[fine];
  const points = new Float32Array((segments + 1) * 2);
  let k = 0;
  for (let j = 0; j <= segments; j++) {
    const target = (j / segments) * total;
    while (k < fine - 1 && cum[k + 1] < target) k++;
    const span = cum[k + 1] - cum[k] || 1;
    const f = THREE.MathUtils.clamp((target - cum[k]) / span, 0, 1);
    points[j * 2] = px[k] + (px[k + 1] - px[k]) * f;
    points[j * 2 + 1] = pz[k] + (pz[k + 1] - pz[k]) * f;
  }
  const result = { points, perimeter: total };
  sectionCache.set(key, result);
  return result;
}

/** Ponto da seção em uma fração do perímetro (0..1). 0.25 = frente (+z). */
export function sectionPointAt(n, fraction) {
  const S = 1024;
  const { points } = crossSection(n, S);
  let f = fraction % 1;
  if (f < 0) f += 1;
  const x = f * S;
  const i = Math.min(S - 1, Math.floor(x));
  const t = x - i;
  return [
    points[i * 2] + (points[i * 2 + 2] - points[i * 2]) * t,
    points[i * 2 + 1] + (points[i * 2 + 3] - points[i * 2 + 1]) * t,
  ];
}

/** Suaviza pontos de controle [y, r, n] em anéis densos usando Catmull-Rom centrípeta. */
export function sampleProfile(points, samples = 260) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([y, r, n = 2]) => new THREE.Vector3(r, y, n * 0.001)),
    false,
    'centripetal',
  );
  return curve.getSpacedPoints(samples).map((p) => ({
    y: p.y,
    r: Math.max(0, p.x),
    n: Math.max(2, p.z * 1000),
  }));
}

/** Função r(y), n(y) do perfil externo (ignora o disco da base abaixo de yMin). */
export function radiusFunction(rings, yMin = 0) {
  const wall = [];
  let lastY = -Infinity;
  for (const p of rings) {
    if (p.y < yMin) continue;
    if (p.y <= lastY) continue; // mantém monotônico
    wall.push(p);
    lastY = p.y;
  }
  return (y) => {
    if (y <= wall[0].y) return { r: wall[0].r, n: wall[0].n };
    let lo = 0;
    let hi = wall.length - 1;
    if (y >= wall[hi].y) return { r: wall[hi].r, n: wall[hi].n };
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (wall[mid].y <= y) lo = mid;
      else hi = mid;
    }
    const a = wall[lo];
    const b = wall[hi];
    const t = (y - a.y) / (b.y - a.y || 1);
    return { r: a.r + (b.r - a.r) * t, n: a.n + (b.n - a.n) * t };
  };
}

/**
 * Torno de superelipses. UV: u = volta (1 -> 0, frente em u = 0.75), v = y / altura.
 * ribs: { y0, y1, count, depth } adiciona estrias verticais (tampas serrilhadas).
 */
export function superLathe(rings, segments = 160, { ribs = null, height = null } = {}) {
  const rows = rings.length;
  const cols = segments + 1;
  const H = height ?? Math.max(...rings.map((p) => p.y));
  const pos = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  for (let i = 0; i < rows; i++) {
    const { y, r, n } = rings[i];
    const sec = crossSection(n, segments).points;
    for (let j = 0; j < cols; j++) {
      let rr = r;
      if (ribs && r > 0 && y >= ribs.y0 && y <= ribs.y1) {
        const wave = 0.5 + 0.5 * Math.cos((j / segments) * Math.PI * 2 * ribs.count);
        rr += ribs.depth * (wave * wave * 1.4 - 0.4);
      }
      const k = i * cols + j;
      pos[k * 3] = sec[j * 2] * rr;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = sec[j * 2 + 1] * rr;
      uv[k * 2] = 1 - j / segments;
      uv[k * 2 + 1] = y / H;
    }
  }
  const index = [];
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const d = a + cols;
      const c = d + 1;
      index.push(a, d, c, a, c, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();

  // Costura: média das normais da primeira e última coluna; polos com normal vertical.
  const nrm = geo.attributes.normal;
  const v = new THREE.Vector3();
  for (let i = 0; i < rows; i++) {
    const a = i * cols;
    const b = a + segments;
    if (rings[i].r < 1e-4) {
      const up = i === rows - 1 || (i > 0 && rings[i - 1].y < rings[i].y);
      for (let j = 0; j < cols; j++) nrm.setXYZ(a + j, 0, up ? 1 : -1, 0);
      continue;
    }
    v.set(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, v.x, v.y, v.z);
    nrm.setXYZ(b, v.x, v.y, v.z);
  }
  nrm.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Superfície que acompanha a garrafa (rótulos). Mapeamento UV plano: u da esquerda p/ direita,
 * v de baixo para cima — a arte do canvas aparece sem distorção.
 *  - width: largura do rótulo em cm (medida sobre a superfície) OU arc: fração do perímetro.
 *  - center: fração do perímetro no centro do rótulo (0.25 = frente, 0.75 = costas).
 */
export function surfacePatch(radiusAt, { y0, y1, width, arc, center = 0.25, offset = 0.025, segX = 120, segY = 60 }) {
  const cols = segX + 1;
  const rows = segY + 1;
  const pos = new Float32Array(cols * rows * 3);
  const uv = new Float32Array(cols * rows * 2);
  for (let i = 0; i < rows; i++) {
    const v = i / segY;
    const y = y0 + (y1 - y0) * v;
    const { r, n } = radiusAt(y);
    const R = r + offset;
    const perim = crossSection(n, 1024).perimeter * R;
    const frac = arc ?? width / perim;
    for (let j = 0; j < cols; j++) {
      const u = j / segX;
      const f = center + (0.5 - u) * frac;
      const [x, z] = sectionPointAt(n, f);
      const k = i * cols + j;
      pos[k * 3] = x * R;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = z * R;
      uv[k * 2] = u;
      uv[k * 2 + 1] = v;
    }
  }
  const index = [];
  for (let i = 0; i < segY; i++) {
    for (let j = 0; j < segX; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const d = a + cols;
      const c = d + 1;
      index.push(a, b, c, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** Anéis de um volume interno (líquido, base maciça) com parede de espessura `wall`. */
export function innerVolumeRings(radiusAt, y0, y1, wall, steps = 120, fillet = 0.22) {
  const rings = [];
  const bottom = radiusAt(y0 + fillet);
  const rb = Math.max(0.05, bottom.r - wall);
  rings.push({ y: y0, r: 0, n: bottom.n });
  rings.push({ y: y0, r: rb - fillet, n: bottom.n });
  rings.push({ y: y0 + fillet * 0.3, r: rb - fillet * 0.3, n: bottom.n });
  for (let s = 0; s <= steps; s++) {
    const y = y0 + fillet + (y1 - y0 - fillet) * (s / steps);
    const { r, n } = radiusAt(y);
    rings.push({ y, r: Math.max(0.05, r - wall), n });
  }
  const top = rings[rings.length - 1];
  rings.push({ y: y1, r: 0, n: top.n });
  return rings;
}

/** Ponto e normal na superfície externa (para âncoras de hotspots). */
export function surfaceAnchor(radiusAt, y, fraction = 0.25, offset = 0.05) {
  const { r, n } = radiusAt(y);
  const [x, z] = sectionPointAt(n, fraction);
  const p = new THREE.Vector3(x * (r + offset), y, z * (r + offset));
  const normal = new THREE.Vector3(x, 0, z).normalize();
  return { position: p, normal };
}
