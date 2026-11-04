import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mulberry32 } from '../three/labels.js';
import { berryField } from '../three/props.js';

/*
 * Elementos de cena para fotos e vídeos de divulgação. Geometria em cm; cada função devolve
 * um grupo já escalado para a cena (1 unidade = 10 cm), exceto onde indicado.
 */

const SCENE = 0.1;

/** Tampo de madeira escura com veios (textura procedural). */
export function woodTable({ size = 60 } = {}) {
  const W = 2048;
  const H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  const rnd = mulberry32(5);
  ctx.fillStyle = '#1a0f0a';
  ctx.fillRect(0, 0, W, H);
  // tábuas
  const boards = 6;
  for (let b = 0; b < boards; b++) {
    const y0 = (b / boards) * H;
    const tone = 18 + rnd() * 10;
    ctx.fillStyle = `rgb(${tone + 10},${tone - 2},${tone - 8})`;
    ctx.fillRect(0, y0, W, H / boards);
    for (let i = 0; i < 90; i++) {
      const y = y0 + rnd() * (H / boards);
      ctx.strokeStyle = `rgba(${rnd() > 0.5 ? '60,36,22' : '8,4,2'},${0.15 + rnd() * 0.35})`;
      ctx.lineWidth = 0.6 + rnd() * 2.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.004 + b + i) * (2 + rnd() * 5));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, y0, W, 3);
  }
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = 8;
  const mat = new THREE.MeshPhysicalMaterial({
    map,
    roughness: 0.42,
    clearcoat: 0.55,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.4,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

/** Copo baixo (rocks) de vidro grosso, vazio. Ø 8,6 cm × 9,2 cm. */
export function rocksGlass() {
  const outer = [[0, 0], [3.95, 0], [4.15, 0.12], [4.22, 0.5], [4.34, 9.0], [4.32, 9.18], [4.18, 9.22]];
  const inner = [[3.98, 9.1], [3.9, 1.6], [3.7, 1.32], [0, 1.25]];
  const pts = [...outer, ...inner].map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, 96);
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transmission: 1,
    roughness: 0.015,
    thickness: 0.6,
    ior: 1.5,
    specularIntensity: 1,
    envMapIntensity: 1.6,
    attenuationColor: new THREE.Color('#e6f2ee'),
    attenuationDistance: 1.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  g.scale.setScalar(SCENE);
  g.userData.height = 9.22 * SCENE;
  return g;
}

/** Fatia de limão-siciliano (textura procedural). */
function lemonWheel() {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f1d23a';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbf3c8';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.45, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI * 2 + 0.05;
    const a1 = ((i + 1) / 10) * Math.PI * 2 - 0.05;
    ctx.fillStyle = '#f6dc5c';
    ctx.beginPath();
    ctx.moveTo(S / 2, S / 2);
    ctx.arc(S / 2, S / 2, S * 0.42, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshPhysicalMaterial({ map, roughness: 0.35, transmission: 0.3, thickness: 0.3, clearcoat: 0.6 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.45, 48), [
    new THREE.MeshStandardMaterial({ color: '#e8c52e', roughness: 0.5 }),
    mat,
    mat,
  ]);
  return m;
}

/**
 * Drink longo (Jack Blackberry & Lemonade): copo highball Ø 6,6 × 15 cm com gelo,
 * limão-siciliano e amora. Vidro em casca de reflexo + líquido transmissivo (como na garrafa).
 */
export function highballDrink() {
  const g = new THREE.Group();
  const outer = [[0, 0], [3.1, 0], [3.28, 0.15], [3.3, 0.6], [3.42, 14.8], [3.38, 15.0], [3.2, 15.02], [3.12, 14.9], [3.02, 1.6], [2.8, 1.45], [0, 1.4]];
  const glassGeo = new THREE.LatheGeometry(outer.map(([r, y]) => new THREE.Vector2(r, y)), 96);
  const glass = new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    roughness: 0.03,
    ior: 1.5,
    specularIntensity: 1,
    envMapIntensity: 1.6,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  glass.renderOrder = 12;
  const liquidPts = [[0, 1.5], [2.95, 1.5], [3.0, 1.7], [3.08, 11.6], [0, 11.6]];
  const liquid = new THREE.Mesh(
    new THREE.LatheGeometry(liquidPts.map(([r, y]) => new THREE.Vector2(r, y)), 96),
    new THREE.MeshPhysicalMaterial({
      color: '#fff8ee',
      transmission: 1,
      roughness: 0.04,
      ior: 1.34,
      thickness: 6,
      attenuationColor: new THREE.Color('#efc98a'),
      attenuationDistance: 0.55,
      depthWrite: false,
    }),
  );
  const iceMat = new THREE.MeshPhysicalMaterial({
    color: '#eef7ff',
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 0.38,
    clearcoat: 1,
    envMapIntensity: 1.4,
    depthWrite: false,
  });
  const rnd = mulberry32(21);
  const iceGeo = new RoundedBoxGeometry(2.5, 2.5, 2.5, 3, 0.45);
  [[0.4, 3.0, 0.2], [-0.9, 5.4, 0.6], [0.8, 7.6, -0.5], [-0.4, 9.8, 0.3], [0.5, 11.9, 0.4]].forEach(([x, y, z]) => {
    const ice = new THREE.Mesh(iceGeo, iceMat);
    ice.position.set(x, y, z);
    ice.rotation.set(rnd() * 1.2, rnd() * 3, rnd() * 1.2);
    ice.renderOrder = 11;
    g.add(ice);
  });
  const lemon = lemonWheel();
  lemon.position.set(-0.4, 8.6, 1.4);
  lemon.rotation.set(Math.PI / 2 - 0.25, 0, 0.2);
  g.add(liquid, lemon, glass);
  g.add(berryField([{ x: 0.6, y: 13.4, z: 0.2, rx: 0.3, ry: 1, rz: 0.2, s: 1.05 }], { seed: 3 }));
  g.scale.setScalar(SCENE);
  g.traverse((o) => {
    if (o.isMesh && o !== glass) o.castShadow = true;
  });
  return g;
}

/** Cone de luz volumétrica (aditivo) de um ponto até o chão. Altura e raio em unidades de cena. */
export function lightCone({ height = 5, radius = 1.6, color = '#ff1f1f' } = {}) {
  const geo = new THREE.ConeGeometry(radius, height, 64, 1, true);
  geo.translate(0, -height / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 0 },
      uHeight: { value: height },
    },
    vertexShader: /* glsl */ `
      varying float vY; varying vec3 vN; varying vec3 vV;
      uniform float uHeight;
      void main() {
        vY = -position.y / uHeight;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity;
      varying float vY; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float fall = pow(1.0 - vY, 1.4) * smoothstep(0.0, 0.08, vY);
        float a = edge * fall * uIntensity * 0.75;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 20;
  return mesh;
}
