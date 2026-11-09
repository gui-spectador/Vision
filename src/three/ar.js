import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { sampleProfile, superLathe, innerVolumeRings } from './geometry.js';

/*
 * Realidade aumentada no iPhone/iPad (AR Quick Look): a garrafa atual é exportada em USDZ
 * no próprio navegador e aberta em escala real sobre uma superfície.
 */

export function arSupported() {
  const a = document.createElement('a');
  return !!a.relList?.supports?.('ar');
}

function arMaterial(src, overrides = {}) {
  return new THREE.MeshStandardMaterial({
    color: src.color?.clone?.() ?? new THREE.Color('#ffffff'),
    map: src.map ?? null,
    roughness: src.roughness ?? 0.5,
    metalness: src.metalness ?? 0,
    side: THREE.FrontSide,
    ...overrides,
  });
}

function arClone(bottle) {
  const out = new THREE.Group();
  const { parts, product, size } = bottle;
  const add = (mesh, mat) => {
    const m = new THREE.Mesh(mesh.geometry, mat);
    m.position.copy(mesh.position);
    m.rotation.copy(mesh.rotation);
    m.scale.copy(mesh.scale);
    out.add(m);
  };
  const glassMat = new THREE.MeshStandardMaterial({ color: '#f4fbf8', roughness: 0.05, transparent: true, opacity: 0.22 });
  const liquidMat = new THREE.MeshStandardMaterial({ color: product.liquid.color, roughness: 0.08, transparent: true, opacity: 0.86 });
  if (bottle.geo) {
    // malhas mais leves para o arquivo USDZ (abre rápido no iPhone)
    const { shape, radiusAt, H } = bottle.geo;
    out.add(new THREE.Mesh(superLathe(sampleProfile(shape.profile, 110), 96, { height: H }), glassMat));
    out.add(new THREE.Mesh(superLathe(innerVolumeRings(radiusAt, shape.baseTop, shape.fill, shape.wall, 48), 96, { height: H }), liquidMat));
  } else {
    parts.glass.traverse((o) => { if (o.isMesh) add(o, glassMat); });
  }
  for (const key of ['labels', 'back']) {
    parts[key].traverse((o) => {
      if (o.isMesh && o.material.side === THREE.FrontSide) add(o, arMaterial(o.material, { roughness: 0.55, metalness: 0 }));
    });
  }
  parts.cap.traverse((o) => {
    if (o.isMesh) add(o, arMaterial(o.material));
  });
  const k = Math.cbrt(size.ml / 1000);
  out.scale.setScalar(0.01 * k); // cm -> m
  const wrapper = new THREE.Group();
  wrapper.add(out);
  return wrapper;
}

export async function openAR(bottle) {
  const scene = arClone(bottle);
  const exporter = new USDZExporter();
  const data = await exporter.parseAsync(scene, {
    quickLookCompatible: true,
    ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
  });
  const blob = new Blob([data], { type: 'model/vnd.usdz+zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.rel = 'ar';
  a.href = `${url}#allowsContentScaling=0`;
  a.download = `${bottle.product.id}.usdz`;
  a.appendChild(document.createElement('img'));
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60000);
}
