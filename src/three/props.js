import * as THREE from 'three';
import { mulberry32 } from './labels.js';

/*
 * Ambientação: elementos que contam a história do sabor ao redor da garrafa.
 * Geometria em cm (o grupo é escalado para a cena: 1 unidade = 10 cm).
 */

const rand = mulberry32(42);
const r = (a, b) => a + (b - a) * rand();

function noiseTexture(size, colorA, colorB, streak = false, seed = 1) {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, size, size);
  const rr = mulberry32(seed);
  for (let i = 0; i < size * (streak ? 3 : 18); i++) {
    ctx.globalAlpha = 0.05 + rr() * 0.18;
    ctx.fillStyle = rr() > 0.5 ? colorB : colorA;
    if (streak) ctx.fillRect(0, rr() * size, size, 1 + rr() * 3);
    else ctx.fillRect(rr() * size, rr() * size, 2 + rr() * 4, 2 + rr() * 4);
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------- amoras ---------- */

/*
 * Amora-preta: ~46 drupas (esferas brilhantes) distribuídas num elipsoide de 1,6 × 2,1 cm,
 * com cálice no cabo. Todas as amoras de um grupo compartilham dois InstancedMesh.
 */
let berryMats = null;
function berryMaterials() {
  if (berryMats) return berryMats;
  berryMats = {
    drupe: new THREE.MeshPhysicalMaterial({
      color: '#1d0a22',
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      sheen: 0.6,
      sheenColor: new THREE.Color('#5a2a6a'),
      emissive: new THREE.Color('#0b0210'),
    }),
    calyx: new THREE.MeshStandardMaterial({ color: '#4a3a1a', roughness: 0.8 }),
    // pouco verniz: de raspão, um verniz forte vira um risco branco no chão
    leaf: new THREE.MeshPhysicalMaterial({ color: '#2f5a24', roughness: 0.55, clearcoat: 0.18, clearcoatRoughness: 0.35, side: THREE.DoubleSide }),
  };
  return berryMats;
}

/**
 * Cria amoras a partir de posições (cm): [{ x, y, z, rx, ry, rz, s }].
 * opts.drupes: drupas por amora (menos = mais leve, para pilhas grandes).
 */
export function berryField(placements, { drupes = 46, seed = 7 } = {}) {
  const rr = mulberry32(seed);
  const mats = berryMaterials();
  const geo = new THREE.SphereGeometry(0.24, drupes > 36 ? 14 : 10, drupes > 36 ? 10 : 7);
  const inst = new THREE.InstancedMesh(geo, mats.drupe, placements.length * drupes);
  const calyx = new THREE.InstancedMesh(new THREE.ConeGeometry(0.42, 0.32, 6), mats.calyx, placements.length);
  inst.castShadow = true;
  inst.receiveShadow = true;
  const M = new THREE.Matrix4();
  const L = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  let k = 0;
  placements.forEach((b, bi) => {
    e.set(b.rx ?? 0, b.ry ?? 0, b.rz ?? 0);
    q.setFromEuler(e);
    const s = b.s ?? 1;
    M.compose(new THREE.Vector3(b.x, b.y, b.z), q, sc.set(s, s, s));
    for (let i = 0; i < drupes; i++) {
      const t = (i + 0.5) / drupes;
      const phi = Math.acos(1 - 2 * t * 0.92);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      p.set(Math.sin(phi) * Math.cos(theta) * 0.78, Math.cos(phi) * 1.05, Math.sin(phi) * Math.sin(theta) * 0.78);
      p.applyMatrix4(M);
      const d = s * (0.85 + rr() * 0.27) * (drupes > 36 ? 1 : 1.18);
      L.compose(p, q.clone().setFromEuler(new THREE.Euler(rr() * 3, rr() * 3, rr() * 3)), sc.set(d, d, d));
      inst.setMatrixAt(k++, L);
    }
    L.compose(new THREE.Vector3(0, -1.08, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), one);
    calyx.setMatrixAt(bi, M.clone().multiply(L));
  });
  inst.instanceMatrix.needsUpdate = true;
  calyx.instanceMatrix.needsUpdate = true;
  const g = new THREE.Group();
  g.add(inst, calyx);
  return g;
}

function leafMesh(x, z, rot, s = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(1.6, 0.8, 2.2, 3.2, 0, 5);
  shape.bezierCurveTo(-2.2, 3.2, -1.6, 0.8, 0, 0);
  const leaf = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), berryMaterials().leaf);
  leaf.rotation.set(-Math.PI / 2 + 0.06, 0, rot);
  leaf.position.set(x, 0.05, z);
  leaf.scale.setScalar(s);
  leaf.receiveShadow = true;
  return leaf;
}

/** Amoras deitadas no chão, em grupos junto à base da garrafa (base de 8,5 × 8,5 cm). */
function blackberries() {
  const g = new THREE.Group();
  const rr = mulberry32(42);
  const R = (a, b) => a + (b - a) * rr();
  const placements = [];
  // grupos: [centro x, centro z, quantidade, raio do grupo]
  const clusters = [
    [-7.4, 5.6, 9, 3.2], [7.2, 6.0, 8, 3.0], [-9.6, -1.5, 5, 2.4], [9.8, -0.5, 5, 2.4],
    [-1.5, 8.4, 4, 2.2], [3.2, 8.8, 3, 1.8], [-6.2, -6.4, 3, 1.8], [6.4, -6.8, 3, 1.8],
  ];
  for (const [cx, cz, n, rad] of clusters) {
    for (let i = 0; i < n; i++) {
      const a = rr() * Math.PI * 2;
      const d = Math.sqrt(rr()) * rad;
      let x = cx + Math.cos(a) * d;
      let z = cz + Math.sin(a) * d;
      // mantém fora da base da garrafa (quadrado de 4,25 cm + folga)
      if (Math.abs(x) < 5.3 && Math.abs(z) < 5.3) {
        const push = 5.4 / Math.max(Math.abs(x), Math.abs(z));
        x *= push;
        z *= push;
      }
      const stacked = i > 2 && rr() > 0.72;
      placements.push({
        x, z,
        y: stacked ? 2.05 : 0.8,
        rx: Math.PI / 2 + R(-0.35, 0.35),
        ry: R(0, Math.PI * 2),
        rz: R(-0.5, 0.5),
        s: R(0.88, 1.08),
      });
    }
  }
  // algumas em pé, encostadas na garrafa
  for (const [x, z] of [[-5.3, 3.4], [5.4, 2.6], [1.6, 5.4]]) {
    placements.push({ x, z, y: 1.05, rx: R(-0.15, 0.15), ry: R(0, 6), rz: R(-0.2, 0.2), s: 1 });
  }
  g.add(berryField(placements));
  g.add(leafMesh(10.5, 2.6, -0.9), leafMesh(-11, 3.5, 0.8, 0.9), leafMesh(3.6, 9.4, 2.2, 0.8));
  return g;
}

/**
 * Pilha de amoras (cm): monte de raio R e altura H com topo plano para a garrafa.
 * Retorna { group, top } — top é a altura (cm) onde a base da garrafa apoia.
 */
export function berryPile({ radius = 24, height = 8, count = 520, flat = 6.6, seed = 11 } = {}) {
  const rr = mulberry32(seed);
  const h = (r) => (r <= flat ? height : height * Math.max(0, 1 - ((r - flat) / (radius - flat)) ** 1.5));
  const placements = [];
  let tries = 0;
  while (placements.length < count && tries < count * 6) {
    tries++;
    const r = radius * Math.sqrt(rr()) * 1.02;
    if (r < flat - 1.5) continue; // embaixo da garrafa ninguém vê
    const a = rr() * Math.PI * 2;
    const y = h(Math.min(r, radius)) + 0.55 - rr() * 0.6;
    placements.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, rx: rr() * 6.28, ry: rr() * 6.28, rz: rr() * 6.28, s: 0.85 + rr() * 0.3 });
  }
  const group = new THREE.Group();
  group.add(berryField(placements, { drupes: 30, seed }));
  // núcleo escuro do monte (evita frestas)
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const r = (i / 24) * radius;
    pts.push(new THREE.Vector2(r, Math.max(0.01, h(r) - 0.7)));
  }
  pts.push(new THREE.Vector2(radius, 0));
  pts.unshift(new THREE.Vector2(0, height - 0.7));
  const core = new THREE.Mesh(new THREE.LatheGeometry(pts.reverse(), 64), new THREE.MeshStandardMaterial({ color: '#0d0410', roughness: 0.6 }));
  core.receiveShadow = true;
  group.add(core);
  return { group, top: height + 0.15 };
}

/* ---------- maçãs verdes ---------- */
/** Casca de maçã verde: base verde com manchas amareladas, estrias suaves e lenticelas claras. */
function appleSkin(seed = 3) {
  const size = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const rr = mulberry32(seed);
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#9cc83e'); // base (fundo da maçã)
  grad.addColorStop(0.55, '#86bb32');
  grad.addColorStop(1, '#6fa52a'); // perto do cabo
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // manchas amareladas onde bateu sol
  for (let i = 0; i < 26; i++) {
    const x = rr() * size;
    const y = size * (0.2 + rr() * 0.6);
    const rad = 30 + rr() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(214,222,96,0.35)');
    g.addColorStop(1, 'rgba(214,222,96,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // estrias verticais (do cabo ao fundo)
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.025 + rr() * 0.04;
    ctx.fillStyle = rr() > 0.5 ? '#5d9426' : '#b8d660';
    ctx.fillRect(rr() * size, 0, 1 + rr() * 3, size);
  }
  // lenticelas
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = rr() > 0.3 ? '#e4ecb0' : '#c9dc86';
    ctx.beginPath();
    ctx.arc(rr() * size, rr() * size, 0.6 + rr() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/*
 * Maçã verde (tipo Granny Smith, ~7,6 cm × 7 cm): ombros largos acima do meio, cavidade funda
 * no cabo, fundo um pouco mais estreito com o cálice.
 */
function apples() {
  const g = new THREE.Group();
  const prof = [
    [0.0, 0.5], [0.45, 0.32], [1.1, 0.12], [1.9, 0.12], [2.7, 0.45], [3.3, 1.15], [3.68, 2.1],
    [3.82, 3.2], [3.74, 4.3], [3.45, 5.25], [2.95, 6.05], [2.25, 6.6], [1.5, 6.82], [0.85, 6.66],
    [0.4, 6.3], [0.0, 6.05],
  ];
  const curve = new THREE.SplineCurve(prof.map(([x, y]) => new THREE.Vector2(x, y)));
  const pts = curve.getPoints(72).map((v) => new THREE.Vector2(Math.max(0.001, v.x), v.y));
  const geo = new THREE.LatheGeometry(pts, 72);
  geo.scale(1, 1, 0.95); // leve assimetria
  const mat = new THREE.MeshPhysicalMaterial({
    map: appleSkin(),
    roughness: 0.38,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    sheen: 0.3,
    sheenColor: new THREE.Color('#eaffc0'),
  });
  const stemMat = new THREE.MeshStandardMaterial({ color: '#5a3d1e', roughness: 0.8 });
  const leafMat = new THREE.MeshPhysicalMaterial({ color: '#2c5f1a', roughness: 0.5, clearcoat: 0.4, side: THREE.DoubleSide });
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(1.1, 0.6, 1.4, 2.4, 0, 3.6);
  leafShape.bezierCurveTo(-1.4, 2.4, -1.1, 0.6, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 20);
  // dobra a folha ao longo da nervura central
  const lp = leafGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i);
    const y = lp.getY(i);
    lp.setZ(i, Math.abs(x) * 0.35 - y * y * 0.03);
  }
  leafGeo.computeVertexNormals();

  [[-9.6, 3.4, 0.3, 1, true], [9.4, 3.2, 2.4, 0.9, false]].forEach(([x, z, rot, sc, leaf]) => {
    const apple = new THREE.Mesh(geo, mat);
    apple.castShadow = true;
    apple.receiveShadow = true;
    apple.position.set(x, 0, z);
    apple.rotation.y = rot;
    apple.scale.setScalar(sc);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.5, 8), stemMat);
    stem.position.set(0.12, 6.7, 0);
    stem.rotation.z = -0.22;
    stem.castShadow = true;
    apple.add(stem);
    if (leaf) {
      const l = new THREE.Mesh(leafGeo, leafMat);
      l.position.set(0.25, 7.1, 0);
      l.rotation.set(-1.25, 0.35, -0.9);
      l.scale.setScalar(1.25);
      l.castShadow = true;
      apple.add(l);
    }
    g.add(apple);
  });
  return g;
}

/* ---------- canela em pau ---------- */
function cinnamon() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const turns = 1.7;
  const outer = [];
  const inner = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const a = t * Math.PI * 2 * turns;
    const rad = 0.75 - t * 0.35;
    outer.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    inner.push([Math.cos(a) * (rad - 0.09), Math.sin(a) * (rad - 0.09)]);
  }
  shape.moveTo(...outer[0]);
  outer.forEach((pt) => shape.lineTo(...pt));
  inner.reverse().forEach((pt) => shape.lineTo(...pt));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 9, bevelEnabled: false, curveSegments: 4 });
  geo.translate(0, 0, -4.5);
  const tex = noiseTexture(256, '#7a3c1a', '#3e1a08', true, 5);
  tex.repeat.set(1, 3);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide });
  const places = [
    [-8.2, 0.75, 4.2, 0.4], [-8.6, 0.75, 5.8, 0.55], [-7.9, 2.15, 5.0, 0.48],
    [8.4, 0.75, 4.6, -0.7],
  ];
  places.forEach(([x, y, z, rot]) => {
    const stick = new THREE.Mesh(geo, mat);
    stick.castShadow = true;
    stick.position.set(x, y, z);
    stick.rotation.set(0, rot, rand() * Math.PI);
    g.add(stick);
  });
  // anis-estrelado
  const star = new THREE.Group();
  const podGeo = new THREE.SphereGeometry(0.5, 12, 8);
  podGeo.scale(1.6, 0.55, 0.7);
  const podMat = new THREE.MeshStandardMaterial({ color: '#5a2a14', roughness: 0.7 });
  for (let i = 0; i < 8; i++) {
    const pod = new THREE.Mesh(podGeo, podMat);
    const a = (i / 8) * Math.PI * 2;
    pod.position.set(Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75);
    pod.rotation.y = -a;
    pod.castShadow = true;
    star.add(pod);
  }
  star.position.set(9.6, 0.3, 1.2);
  g.add(star);
  return g;
}

/* ---------- favo de mel e pegador ---------- */

/** Hexágono "em pé" (vértices em ±z depois de deitado), raio circunscrito r. */
function hexShape(r, hole = 0) {
  const pts = (rad) => Array.from({ length: 6 }, (_, k) => {
    const a = Math.PI / 6 + (k * Math.PI) / 3;
    return new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad);
  });
  const shape = new THREE.Shape(pts(r));
  if (hole > 0) shape.holes.push(new THREE.Path(pts(hole).reverse()));
  return shape;
}

let honeyMat = null;
function honeyMaterial() {
  honeyMat ??= new THREE.MeshPhysicalMaterial({
    color: '#f0a01e',
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transmission: 0.55,
    thickness: 0.8,
    ior: 1.49,
    attenuationColor: new THREE.Color('#a24e00'),
    attenuationDistance: 0.6,
    emissive: new THREE.Color('#2a1200'),
  });
  return honeyMat;
}

/*
 * Pedaço de favo: placa de cera com células hexagonais ocas (paredes finas), metade cheias de
 * mel brilhante e o resto operculadas (tampas de cera), sobre uma poça de mel.
 * Células de ~0,85 cm (o dobro do real) para lerem bem na distância da câmera.
 */
function honeycomb({ rx = 5.2, rz = 3.6, seed = 21 } = {}) {
  const rr = mulberry32(seed);
  const g = new THREE.Group();
  const r = 0.43;
  const wall = 0.055;
  const cellH = 0.9;
  const baseH = 0.5;
  const centers = [];
  for (let row = -12; row <= 12; row++) {
    for (let col = -14; col <= 14; col++) {
      const x = (col + (row & 1 ? 0.5 : 0)) * Math.sqrt(3) * r;
      const z = row * 1.5 * r;
      const wob = 1 + 0.08 * Math.sin(Math.atan2(z, x) * 3 + 1.3);
      if ((x * x) / (rx * rx) + (z * z) / (rz * rz) > wob * wob) continue;
      centers.push([x, z]);
    }
  }
  const wax = new THREE.MeshPhysicalMaterial({
    color: '#e9b44c',
    roughness: 0.42,
    sheen: 0.5,
    sheenColor: new THREE.Color('#fff0b0'),
    emissive: new THREE.Color('#3a2200'),
  });
  const capWax = new THREE.MeshPhysicalMaterial({ color: '#e3b860', roughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#ffe9a8'), emissive: new THREE.Color('#2a1800') });

  const lay = (geo) => {
    geo.rotateX(-Math.PI / 2);
    return geo;
  };
  const walls = lay(new THREE.ExtrudeGeometry(hexShape(r, r - wall), { depth: cellH, bevelEnabled: false }));
  const fillGeo = lay(new THREE.ExtrudeGeometry(hexShape(r - wall * 0.5), { depth: 1, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.04, bevelSegments: 2 }));
  const capGeo = lay(new THREE.ExtrudeGeometry(hexShape(r - wall * 0.5), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 3 }));

  const wallInst = new THREE.InstancedMesh(walls, wax, centers.length);
  const filled = centers.filter(() => rr() < 0.62);
  const capped = centers.filter((c) => !filled.includes(c));
  const fillInst = new THREE.InstancedMesh(fillGeo, honeyMaterial(), filled.length);
  const capInst = new THREE.InstancedMesh(capGeo, capWax, capped.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  centers.forEach(([x, z], i) => {
    m.compose(new THREE.Vector3(x, baseH, z), q, one);
    wallInst.setMatrixAt(i, m);
  });
  filled.forEach(([x, z], i) => {
    const level = 0.45 + rr() * 0.4; // fração da altura da célula
    m.compose(new THREE.Vector3(x, baseH, z), q, new THREE.Vector3(1, cellH * level, 1));
    fillInst.setMatrixAt(i, m);
  });
  capped.forEach(([x, z], i) => {
    m.compose(new THREE.Vector3(x, baseH + cellH - 0.12 - rr() * 0.06, z), q, one);
    capInst.setMatrixAt(i, m);
  });
  for (const inst of [wallInst, fillInst, capInst]) {
    inst.castShadow = true;
    inst.receiveShadow = true;
    g.add(inst);
  }

  // placa de cera (fundo do favo), com borda arredondada
  const plate = new THREE.Shape();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const wob = 1 + 0.08 * Math.sin(a * 3 + 1.3);
    const px = Math.cos(a) * (rx + 0.25) * wob;
    const pz = Math.sin(a) * (rz + 0.25) * wob;
    if (i === 0) plate.moveTo(px, pz);
    else plate.lineTo(px, pz);
  }
  const plateGeo = new THREE.ExtrudeGeometry(plate, { depth: baseH - 0.1, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.12, bevelSegments: 3 });
  plateGeo.rotateX(Math.PI / 2);
  plateGeo.translate(0, baseH - 0.1, 0);
  const plateMesh = new THREE.Mesh(plateGeo, wax);
  plateMesh.castShadow = true;
  plateMesh.receiveShadow = true;
  g.add(plateMesh);

  // poça de mel escorrendo do favo
  const pool = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const rad = 1 + 0.18 * Math.sin(a * 2 + 0.6) + 0.1 * Math.sin(a * 5 + 2);
    const px = rx * 0.55 + Math.cos(a) * 3.2 * rad;
    const pz = rz * 0.7 + Math.sin(a) * 2.0 * rad;
    if (i === 0) pool.moveTo(px, pz);
    else pool.lineTo(px, pz);
  }
  const poolGeo = new THREE.ExtrudeGeometry(pool, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.3, bevelSegments: 4 });
  poolGeo.rotateX(Math.PI / 2);
  poolGeo.translate(0, 0.1, 0);
  const poolMesh = new THREE.Mesh(poolGeo, honeyMaterial());
  poolMesh.receiveShadow = true;
  g.add(poolMesh);
  return g;
}

function honey() {
  const g = new THREE.Group();
  const comb = honeycomb({ rx: 4.4, rz: 3.1 });
  comb.position.set(-8.6, 0, 5.4);
  comb.rotation.y = 0.35;
  g.add(comb);

  // pegador de mel (madeira torneada)
  const pts = [];
  const prof = [[0, 0.0], [0, 0.55], [0.4, 0.6], [0.5, 1.15], [0.9, 1.2], [1.0, 1.15], [1.1, 1.2], [1.5, 1.2], [1.6, 1.15], [1.7, 1.2], [2.1, 1.2], [2.3, 0.6], [2.6, 0.32], [11, 0.26], [11.3, 0.3], [11.5, 0.0]];
  prof.forEach(([y, rr]) => pts.push(new THREE.Vector2(rr, y)));
  const dipper = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 40),
    new THREE.MeshStandardMaterial({ map: noiseTexture(256, '#c8975a', '#8e6232', true, 9), roughness: 0.65 }),
  );
  dipper.rotation.set(0, -0.7, Math.PI / 2);
  dipper.position.set(12.5, 1.2, 0.5);
  dipper.castShadow = true;
  g.add(dipper);
  return g;
}

/* ---------- carvão de bordo e aduela de carvalho ---------- */

/*
 * Textura de madeira carbonizada: veios no sentido da fibra e rachaduras transversais
 * ("couro de jacaré"). Gera cor, rugosidade e relevo no mesmo desenho.
 */
let charMaps = null;
function charcoalMaps() {
  if (charMaps) return charMaps;
  const size = 512;
  const mk = () => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    return [cv, cv.getContext('2d')];
  };
  const [colorCv, c] = mk();
  const [bumpCv, b] = mk();
  const [roughCv, ro] = mk();
  const rr = mulberry32(77);
  c.fillStyle = '#19191b';
  c.fillRect(0, 0, size, size);
  b.fillStyle = '#9a9a9a';
  b.fillRect(0, 0, size, size);
  ro.fillStyle = 'rgb(0,200,0)';
  ro.fillRect(0, 0, size, size);
  // blocos entre rachaduras: cada um com brilho próprio (faces de carvão refletem diferente)
  const rowH = [];
  for (let acc = 0; acc < size;) {
    const h = Math.min(size - acc, 48 + rr() * 70);
    rowH.push(h);
    acc += h;
  }
  const rows = rowH.length;
  let y = 0;
  for (let row = 0; row < rows; row++) {
    const h = rowH[row];
    let x = -rr() * 60;
    while (x < size) {
      const w = 50 + rr() * 140;
      const shade = 22 + rr() * 22;
      c.fillStyle = `rgb(${shade},${shade},${shade + 3})`;
      c.fillRect(x + 2, y + 2, w - 4, h - 4);
      const bump = 150 + rr() * 80;
      b.fillStyle = `rgb(${bump},${bump},${bump})`;
      b.fillRect(x + 3, y + 3, w - 6, h - 6);
      const gl = 110 + rr() * 90; // canal G = rugosidade
      ro.fillStyle = `rgb(0,${gl},0)`;
      ro.fillRect(x + 2, y + 2, w - 4, h - 4);
      x += w;
    }
    y += h;
  }
  // veios finos ao longo da fibra
  for (let i = 0; i < 260; i++) {
    const yy = rr() * size;
    c.globalAlpha = 0.25;
    c.fillStyle = rr() > 0.5 ? '#3a3a40' : '#0a0a0b';
    c.fillRect(0, yy, size, 1 + rr() * 1.5);
    b.globalAlpha = 0.3;
    b.fillStyle = rr() > 0.5 ? '#fff' : '#333';
    b.fillRect(0, yy, size, 1);
  }
  c.globalAlpha = 1;
  b.globalAlpha = 1;
  // rachaduras: escuras e fundas
  c.strokeStyle = '#050505';
  b.strokeStyle = '#000';
  for (const ctx of [c, b]) {
    const r2 = mulberry32(78);
    let py = 0;
    for (let row = 0; row <= rows; row++) {
      ctx.lineWidth = 1.5 + r2() * 2.5;
      ctx.beginPath();
      let px = 0;
      ctx.moveTo(0, py);
      while (px < size) {
        px += 10 + r2() * 26;
        ctx.lineTo(px, py + (r2() - 0.5) * 9);
      }
      ctx.stroke();
      // rachaduras transversais curtas e tortas
      for (let k = 0; k < 4 + r2() * 4; k++) {
        const x0 = r2() * size;
        const hh = rowH[row] ?? 60;
        ctx.lineWidth = 1 + r2() * 2;
        ctx.beginPath();
        ctx.moveTo(x0, py);
        ctx.lineTo(x0 + (r2() - 0.5) * 14, py + hh * 0.5);
        ctx.lineTo(x0 + (r2() - 0.5) * 18, py + hh * (0.6 + r2() * 0.4));
        ctx.stroke();
      }
      py += rowH[row] ?? 0;
    }
  }
  const tex = (cv, srgb) => {
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  charMaps = { map: tex(colorCv, true), bump: tex(bumpCv), rough: tex(roughCv) };
  return charMaps;
}

/** Pedaço de carvão: caixa arredondada, irregular, com arestas quebradas. */
function charcoalChunk(w, h, d, seed) {
  const rr = mulberry32(seed);
  const geo = new THREE.BoxGeometry(w, h, d, 8, 5, 6);
  const pos = geo.attributes.position;
  const rad = Math.min(w, h, d) * 0.14;
  const half = new THREE.Vector3(w / 2 - rad, h / 2 - rad, d / 2 - rad);
  const p = new THREE.Vector3();
  const inner = new THREE.Vector3();
  const f1 = 1.5 + rr() * 2;
  const f2 = 2.5 + rr() * 3;
  const ph = rr() * 10;
  const cuts = Array.from({ length: 3 }, () => {
    const n = new THREE.Vector3(rr() - 0.5, rr() * 0.8 - 0.2, rr() - 0.5).normalize();
    const reach = Math.abs(n.x) * w / 2 + Math.abs(n.y) * h / 2 + Math.abs(n.z) * d / 2;
    return { n, d: reach * (0.62 + rr() * 0.2) };
  });
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    inner.set(
      Math.max(-half.x, Math.min(half.x, p.x)),
      Math.max(-half.y, Math.min(half.y, p.y)),
      Math.max(-half.z, Math.min(half.z, p.z)),
    );
    p.sub(inner).normalize().multiplyScalar(rad).add(inner);
    // lascas: ruído de baixa frequência + facetas
    const n = Math.sin(p.x * f1 + ph) * Math.cos(p.z * f2 - ph) * 0.5 + Math.sin(p.y * f2 * 1.3 + p.x * 2) * 0.35;
    p.multiplyScalar(1 + n * 0.12);
    // quinas quebradas: achata o que passa de um plano inclinado sorteado
    for (const cut of cuts) {
      const dist = p.dot(cut.n) - cut.d;
      if (dist > 0) p.addScaledVector(cut.n, -dist);
    }
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function charcoal() {
  const g = new THREE.Group();
  const maps = charcoalMaps();
  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: maps.map,
    roughnessMap: maps.rough,
    roughness: 1,
    bumpMap: maps.bump,
    bumpScale: 2.2,
    metalness: 0.18,
  });
  // dois montinhos, um de cada lado, com pedaços apoiados uns nos outros
  const pieces = [
    // [x, y, z, w, h, d, rotY, tiltX, tiltZ]
    [-7.6, 0, 5.2, 3.6, 2.0, 2.4, 0.4, 0, 0],
    [-9.8, 0, 3.9, 2.8, 1.7, 2.0, 1.2, 0, 0],
    [-8.4, 1.75, 4.5, 2.6, 1.5, 1.8, -0.3, 0.25, 0.15],
    [-6.2, 0, 6.9, 1.9, 1.2, 1.5, 2.1, 0, 0],
    [-10.6, 0, 6.2, 1.6, 1.0, 1.3, 0.8, 0, 0],
    [8.2, 0, 4.4, 3.2, 1.9, 2.3, -0.5, 0, 0],
    [10.2, 0, 2.9, 2.4, 1.5, 1.9, 0.9, 0, 0],
    [9.1, 1.6, 3.8, 2.2, 1.3, 1.6, 0.2, -0.2, 0.25],
    [7.0, 0, 6.6, 1.7, 1.1, 1.3, 1.7, 0, 0],
    [11.3, 0, 5.4, 1.4, 0.9, 1.1, -1.1, 0, 0],
  ];
  pieces.forEach(([x, y, z, w, h, d, ry, tx, tz], i) => {
    const chunk = new THREE.Mesh(charcoalChunk(w, h, d, 100 + i), mat);
    chunk.position.set(x, y + h / 2 * 0.92, z);
    chunk.rotation.set(tx, ry, tz);
    chunk.castShadow = true;
    chunk.receiveShadow = true;
    g.add(chunk);
  });

  // aduela de barril: curva, com a face interna carbonizada (virada para cima)
  const L = 16;
  const Wd = 5.2;
  const T = 1.3;
  const R = 22; // raio interno do barril
  const geo = new THREE.BoxGeometry(L, T, Wd, 24, 1, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    // curva transversal (côncava para cima) e leve afinamento nas pontas
    const x = pos.getX(i);
    const taper = 1 - 0.08 * Math.pow(Math.abs(x) / (L / 2), 2);
    pos.setXYZ(i, x, pos.getY(i) + (z * z) / (2 * R), z * taper);
  }
  geo.computeVertexNormals();
  const tex = noiseTexture(512, '#9a6a3c', '#5a3a1c', true, 11);
  const wood = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  const charred = new THREE.MeshStandardMaterial({
    map: maps.map,
    roughnessMap: maps.rough,
    roughness: 1,
    bumpMap: maps.bump,
    bumpScale: 2.5,
    metalness: 0.12,
  });
  // faces do BoxGeometry: +x, -x, +y (topo), -y, +z, -z
  const stave = new THREE.Mesh(geo, [wood, wood, charred, wood, wood, wood]);
  stave.position.set(-10, T / 2, -3.5);
  stave.rotation.y = 0.85;
  stave.castShadow = true;
  stave.receiveShadow = true;
  g.add(stave);
  return g;
}

const BUILDERS = { blackberries, apples, cinnamon, honey, charcoal };

export function buildProps(kind) {
  const fn = BUILDERS[kind];
  const group = fn ? fn() : new THREE.Group();
  group.scale.setScalar(0.1);
  group.name = `props-${kind}`;
  return group;
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        Object.values(m).forEach((v) => v && v.isTexture && v.dispose());
        m.dispose();
      });
    }
  });
}
