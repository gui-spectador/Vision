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
function blackberries(count = 7) {
  const g = new THREE.Group();
  const drupe = new THREE.SphereGeometry(0.24, 14, 10);
  const perBerry = 46;
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#1d0a22',
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    sheen: 0.6,
    sheenColor: new THREE.Color('#5a2a6a'),
    emissive: new THREE.Color('#0b0210'),
  });
  const inst = new THREE.InstancedMesh(drupe, mat, count * perBerry);
  inst.castShadow = true;
  const calyxMat = new THREE.MeshStandardMaterial({ color: '#4a3a1a', roughness: 0.8 });
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const spots = [
    [-7.2, 5.8], [-9.6, 3.2], [7.6, 5.2], [10.4, 2.6], [8.6, -2.4], [-6.0, 8.6], [5.6, 8.9],
  ];
  let k = 0;
  for (let b = 0; b < count; b++) {
    const berry = new THREE.Group();
    const [bx, bz] = spots[b % spots.length];
    const lying = rand() > 0.35;
    berry.position.set(bx + r(-0.6, 0.6), lying ? 0.95 : 1.15, bz + r(-0.6, 0.6));
    berry.rotation.set(lying ? Math.PI / 2 + r(-0.3, 0.3) : r(-0.2, 0.2), r(0, Math.PI * 2), lying ? r(-0.4, 0.4) : 0);
    berry.updateMatrixWorld(true);
    // distribuição de Fibonacci sobre elipsoide
    for (let i = 0; i < perBerry; i++) {
      const t = (i + 0.5) / perBerry;
      const phi = Math.acos(1 - 2 * t * 0.92);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      p.set(Math.sin(phi) * Math.cos(theta) * 0.78, Math.cos(phi) * 1.05, Math.sin(phi) * Math.sin(theta) * 0.78);
      p.applyMatrix4(berry.matrixWorld);
      const sc = r(0.85, 1.12);
      s.set(sc, sc, sc);
      q.setFromEuler(new THREE.Euler(rand(), rand(), rand()));
      m.compose(p, q, s);
      inst.setMatrixAt(k++, m);
    }
    const calyx = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.32, 6), calyxMat);
    calyx.position.set(0, -1.08, 0);
    calyx.rotation.x = Math.PI;
    berry.add(calyx);
    g.add(berry);
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);

  // folha
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(1.6, 0.8, 2.2, 3.2, 0, 5);
  leafShape.bezierCurveTo(-2.2, 3.2, -1.6, 0.8, 0, 0);
  const leaf = new THREE.Mesh(
    new THREE.ShapeGeometry(leafShape, 24),
    new THREE.MeshPhysicalMaterial({ color: '#2f5a24', roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide }),
  );
  leaf.rotation.set(-Math.PI / 2 + 0.08, 0, -0.9);
  leaf.position.set(9.5, 0.06, 0.5);
  leaf.receiveShadow = true;
  g.add(leaf);
  return g;
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
