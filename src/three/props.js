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
    leaf: new THREE.MeshPhysicalMaterial({ color: '#2f5a24', roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide }),
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
  g.add(leafMesh(10.5, 2.6, -0.9), leafMesh(-11, 3.5, 0.8, 0.9), leafMesh(2.5, 11, 2.6, 0.8));
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
function apples() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * Math.PI;
    const rad = Math.sin(a) * (3.6 + 0.35 * Math.sin(a * 2)) * (1 - 0.12 * t);
    const y = -Math.cos(a) * 3.3 + (t > 0.9 ? -(t - 0.9) * 6 : 0) + (t < 0.08 ? (0.08 - t) * 5 : 0);
    pts.push(new THREE.Vector2(Math.max(0.001, rad), y + 3.3));
  }
  const geo = new THREE.LatheGeometry(pts, 64);
  const tex = noiseTexture(256, '#9cc63f', '#d8e36a', false, 3);
  const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const stemMat = new THREE.MeshStandardMaterial({ color: '#5a3d1e', roughness: 0.8 });
  [[-8.6, 4.2, 0.2], [9.2, 3.0, 2.4]].forEach(([x, z, rot], i) => {
    const apple = new THREE.Mesh(geo, mat);
    apple.castShadow = true;
    apple.position.set(x, 0, z);
    apple.rotation.y = rot;
    apple.scale.setScalar(i ? 0.92 : 1);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.6, 8), stemMat);
    stem.position.set(0.15, 6.6, 0);
    stem.rotation.z = -0.25;
    apple.add(stem);
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
function honey() {
  const g = new THREE.Group();
  const cellR = 0.62;
  const hex = new THREE.CylinderGeometry(cellR * 0.93, cellR * 0.93, 1.6, 6);
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#e3a02a',
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: new THREE.Color('#3a1e00'),
  });
  const cells = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * cellR * 1.5;
      const z = row * cellR * Math.sqrt(3) + (col % 2 ? (cellR * Math.sqrt(3)) / 2 : 0);
      const cx = x - 5;
      const cz = z - 4;
      if ((cx * cx) / 22 + (cz * cz) / 12 > 1) continue;
      cells.push([cx, cz]);
    }
  }
  const inst = new THREE.InstancedMesh(hex, mat, cells.length);
  const m = new THREE.Matrix4();
  cells.forEach(([x, z], i) => {
    m.makeRotationY(Math.PI / 6);
    m.setPosition(x, 0.8 + rand() * 0.08, z);
    inst.setMatrixAt(i, m);
  });
  inst.castShadow = true;
  const comb = new THREE.Group();
  comb.add(inst);
  comb.position.set(-10.5, 0, 4.5);
  comb.rotation.y = 0.5;
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
function charcoal() {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#1a1a1c',
    roughness: 0.55,
    metalness: 0.35,
    flatShading: true,
  });
  for (let i = 0; i < 9; i++) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const k = 0.75 + rand() * 0.5;
      pos.setXYZ(v, pos.getX(v) * k * 1.3, pos.getY(v) * k * 0.8, pos.getZ(v) * k);
    }
    geo.computeVertexNormals();
    const chunk = new THREE.Mesh(geo, mat);
    const side = i % 2 ? 1 : -1;
    const sc = r(0.7, 1.4);
    chunk.scale.setScalar(sc);
    chunk.position.set(side * r(6.5, 11), 0.7 * sc, r(-1, 8));
    chunk.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    chunk.castShadow = true;
    g.add(chunk);
  }
  // aduela tostada
  const tex = noiseTexture(512, '#9a6a3c', '#5a3a1c', true, 11);
  const charTex = noiseTexture(256, '#151110', '#3a2a1e', false, 12);
  const wood = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  const charred = new THREE.MeshStandardMaterial({ map: charTex, roughness: 0.95 });
  const stave = new THREE.Mesh(new THREE.BoxGeometry(16, 1.3, 3.6), [wood, wood, wood, charred, wood, wood]);
  stave.position.set(-10, 0.65, -3.5);
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
