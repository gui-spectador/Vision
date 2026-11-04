import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/rye/latin-400.css';
import '@fontsource/great-vibes/latin-400.css';
import '@fontsource/old-standard-tt/latin-400.css';
import '@fontsource/old-standard-tt/latin-700.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/playfair-display/latin-900.css';
import '@fontsource/petit-formal-script/latin-400.css';
import '@fontsource/oswald/latin-500.css';
import './styles.css';

import { Stage, LIGHTING } from './three/stage.js';
import { buildBottle } from './three/bottle.js';
import { buildProps, disposeObject } from './three/props.js';
import { PRODUCTS as ALL_PRODUCTS } from './data/products.js';
import { createPanel } from './ui/panel.js';
import { createHotspots } from './ui/hotspots.js';
import { arSupported, openAR } from './three/ar.js';

const $ = (s) => document.querySelector(s);

// Modo produto único: ?produto=jd-blackberry ou build com VITE_SOLO=jd-blackberry
const params = new URLSearchParams(location.search);
const SOLO = params.get('produto') || import.meta.env.VITE_SOLO || '';
const PRODUCTS = ALL_PRODUCTS.some((p) => p.id === SOLO) ? ALL_PRODUCTS.filter((p) => p.id === SOLO) : ALL_PRODUCTS;
const IS_SOLO = PRODUCTS.length === 1;
if (IS_SOLO) document.querySelector('#app').classList.add('solo');
if (params.has('limpo')) document.querySelector('#app').classList.add('clean');
const isMobile = () => matchMedia('(max-width: 900px)').matches;
const storage = {
  get(k) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ }
  },
};

const LABEL_FONTS = [
  '400 80px "Rye"',
  '400 80px "Great Vibes"',
  '400 40px "Old Standard TT"',
  '700 40px "Old Standard TT"',
  '700 40px "Cinzel"',
  '900 80px "Playfair Display"',
  '400 80px "Petit Formal Script"',
  '500 40px "Oswald"',
];

const state = {
  index: 0,
  size: 0,
  thumbs: {},
  cache: new Map(), // `${id}:${size}` -> bottle (LRU)
  busy: false,
};

function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

function setProgress(p, text) {
  $('#loader-bar').style.width = `${Math.round(p * 100)}%`;
  if (text) $('#loader-text').textContent = text;
}

function ageGate() {
  if (storage.get('vision.age') === 'ok') return Promise.resolve();
  const gate = $('#agegate');
  gate.hidden = false;
  return new Promise((resolve) => {
    $('#age-yes').onclick = () => {
      storage.set('vision.age', 'ok');
      gate.hidden = true;
      resolve();
    };
    $('#age-no').onclick = () => {
      gate.querySelector('h2').textContent = 'Acesso não permitido';
      gate.querySelector('p').textContent = 'Este conteúdo é destinado apenas a maiores de 18 anos.';
      gate.querySelector('.agegate-actions').remove();
    };
  });
}

function applyAccent(theme) {
  document.documentElement.style.setProperty('--accent', theme.accent);
}

async function getBottle(product, size) {
  const key = `${product.id}:${size}`;
  if (state.cache.has(key)) {
    const b = state.cache.get(key);
    state.cache.delete(key);
    state.cache.set(key, b);
    return b;
  }
  const b = await buildBottle(product, size);
  state.cache.set(key, b);
  return b;
}

function trimCache(stage) {
  const keep = 3;
  for (const [key, b] of state.cache) {
    if (state.cache.size <= keep) break;
    if (b === stage.current) continue;
    if (b.root.parent) continue; // ainda em transição
    b.dispose();
    state.cache.delete(key);
  }
}

function renderHero(p, sizeIndex) {
  const s = p.sizes[sizeIndex];
  const parts = p.short.split(' ');
  const main = parts.length > 1 && parts[0] === 'Tennessee' ? parts.slice(1).join(' ') : p.short;
  const pre = main !== p.short ? 'Tennessee' : '';
  $('#hero').innerHTML = `
    <span class="eyebrow">${p.brand}${p.badge ? ` <span class="badge">${p.badge}</span>` : ''}</span>
    <h1>${pre ? `<em>${pre}</em>` : ''}${main}</h1>
    <p class="tagline">${p.tagline}</p>
    <div class="facts-inline">
      <span class="pill">${p.abv}% vol</span>
      <span class="pill">${s.label}</span>
      <span class="pill">${p.categoryShort ?? p.category}</span>
      ${s.price ? `<span class="pill" title="${p.priceNote ?? ''}">${s.price}</span>` : ''}
    </div>
    ${p.sizes.length > 1 ? `<div class="size-switch" role="radiogroup" aria-label="Capacidade"><span class="label">Tamanho</span>${p.sizes
      .map((z, i) => `<button data-size="${i}" class="${i === sizeIndex ? 'active' : ''}">${z.label}</button>`)
      .join('')}</div>` : ''}`;
  $('#crumb').textContent = `${p.brand} · ${p.short}`;
}

function renderShelf(onPick) {
  const track = $('#shelf-track');
  track.innerHTML = PRODUCTS.map(
    (p, i) => `<button class="thumb" role="option" data-i="${i}" aria-selected="${i === state.index}" title="${p.name}">
      <img alt="${p.name}" src="${state.thumbs[p.id] ?? ''}" />
      <span>${p.short}</span>
    </button>`,
  ).join('');
  track.addEventListener('click', (e) => {
    const t = e.target.closest('.thumb');
    if (t) onPick(Number(t.dataset.i));
  });
}

function updateShelf() {
  document.querySelectorAll('.thumb').forEach((t) => {
    const sel = Number(t.dataset.i) === state.index;
    t.setAttribute('aria-selected', String(sel));
    if (sel) t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  });
}

function layoutInsets(stage) {
  const panel = $('#panel');
  if (isMobile()) {
    const peek = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--peek')) || 176;
    if (document.querySelector('#app').classList.contains('clean')) stage.setInsets({ left: 0, right: 0, top: 0, bottom: 0 });
    else stage.setInsets({ left: 0, right: 74, top: 64, bottom: peek + (IS_SOLO ? 14 : 100) });
  } else {
    if (document.querySelector('#app').classList.contains('clean')) {
      stage.setInsets({ left: 0, right: 0, top: 0, bottom: 0 });
      return;
    }
    const r = panel.getBoundingClientRect();
    const hero = $('#hero').getBoundingClientRect();
    stage.setInsets({ left: Math.min(hero.right, window.innerWidth * 0.3) * 0.7, right: window.innerWidth - r.left, top: 70, bottom: IS_SOLO ? 110 : 150 });
  }
}

async function main() {
  if (!hasWebGL2()) {
    $('#loader').classList.add('done');
    $('#webgl-error').hidden = false;
    return;
  }
  const gate = ageGate();

  setProgress(0.05, 'Carregando tipografia dos rótulos…');
  await Promise.all(LABEL_FONTS.map((f) => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready;

  setProgress(0.15, 'Montando o estúdio…');
  let hotspots;
  const stage = new Stage($('#viewport'), {
    onFrame: (st) => hotspots?.update(st.projectAnchors()),
  });
  stage.onRetire = () => setTimeout(() => trimCache(stage), 50);
  stage.onRetireProps = (props) => disposeObject(props);

  // Miniaturas reais: cada garrafa é renderizada pelo mesmo motor 3D
  const thumbSize = isMobile() ? { width: 180, height: 240 } : { width: 240, height: 320 };
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    setProgress(0.15 + (0.75 * i) / PRODUCTS.length, `Modelando ${p.short}…`);
    await new Promise((r) => requestAnimationFrame(r));
    const b = await getBottle(p, 0);
    state.thumbs[p.id] = stage.snapshot(b, thumbSize);
    if (i > 1) {
      b.dispose();
      state.cache.delete(`${p.id}:0`);
    }
  }

  const panel = createPanel(
    { head: $('#panel-head'), tabs: $('#tabs'), body: $('#panel-body') },
    {
      onHotspot: (k) => {
        if (isMobile()) $('#panel').classList.remove('expanded');
        hotspots.open(k);
      },
      onExplode: () => {
        if (isMobile()) $('#panel').classList.remove('expanded');
        setExplode(true);
      },
      onSize: (i) => selectSize(i),
    },
  );

  hotspots = createHotspots({
    layer: $('#hotspots'),
    calloutLayer: $('#callouts'),
    card: $('#hotspot-card'),
    stage,
    // no celular o cartão fica embaixo: sobe o ponto focado para a área livre acima dele
    onOpen: () => {
      if (!isMobile()) return;
      const peek = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--peek')) || 176;
      stage.setInsets({ bottom: peek + $('#hotspot-card').offsetHeight + (IS_SOLO ? 30 : 110) });
    },
    onClose: () => layoutInsets(stage),
  });

  const dock = $('#dock');
  const btn = (a) => dock.querySelector(`[data-action="${a}"]`);
  function setExplode(on) {
    hotspots.close(false);
    stage.setExplode(on);
    btn('explode').classList.toggle('active', on);
  }

  async function select(i, dir) {
    if (state.busy) return;
    state.busy = true;
    hotspots.close(false);
    btn('explode').classList.remove('active');
    const p = PRODUCTS[i];
    const prevIndex = state.index;
    state.index = i;
    state.size = 0;
    applyAccent(p.theme);
    renderHero(p, 0);
    panel.render(p, 0);
    hotspots.setProduct(p, p.sizes[0]);
    updateShelf();
    layoutInsets(stage);
    const bottle = await getBottle(p, 0);
    const sameProps = stage.currentProps && prevIndex === i;
    const props = sameProps ? stage.currentProps : buildProps(p.props);
    stage.showProduct(bottle, props, dir);
    try {
      if (location.hash.slice(1) !== p.id) history.replaceState(null, '', `#${p.id}`);
    } catch {
      /* visualizadores embutidos podem bloquear o histórico */
    }
    setTimeout(() => { state.busy = false; }, 450);
  }

  async function selectSize(si) {
    const p = PRODUCTS[state.index];
    if (si === state.size || state.busy) return;
    state.busy = true;
    state.size = si;
    hotspots.close(false);
    btn('explode').classList.remove('active');
    renderHero(p, si);
    panel.render(p, si);
    hotspots.setProduct(p, p.sizes[si]);
    const bottle = await getBottle(p, si);
    stage.showProduct(bottle, stage.currentProps, 0);
    setTimeout(() => { state.busy = false; }, 300);
  }

  renderShelf((i) => {
    if (i === state.index) return;
    select(i, i > state.index ? 1 : -1);
  });

  $('#hero').addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]');
    if (b) selectSize(Number(b.dataset.size));
  });

  // Controles
  dock.addEventListener('click', (e) => {
    const lightBtn = e.target.closest('[data-light]');
    if (lightBtn) {
      setLighting(lightBtn.dataset.light);
      return;
    }
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action;
    if (a === 'spin') {
      stage.spin = !stage.spin;
      stage.spinBeforeFocus = undefined;
      b.classList.toggle('active', stage.spin);
    } else if (a === 'explode') {
      setExplode(stage.explodeTarget === 0);
    } else if (a === 'hotspots') {
      const off = $('#hotspots').classList.toggle('off');
      b.classList.toggle('active', !off);
      if (off) hotspots.close(false);
    } else if (a === 'reset') {
      hotspots.close(false);
      btn('explode').classList.remove('active');
      stage.resetView();
    } else if (a === 'ar') {
      b.disabled = true;
      openAR(stage.current)
        .catch((err) => console.error('AR', err))
        .finally(() => { b.disabled = false; });
    } else if (a === 'light-cycle') {
      const keys = Object.keys(LIGHTING);
      setLighting(keys[(keys.indexOf(stage.preset) + 1) % keys.length]);
    }
  });

  function setLighting(name) {
    stage.setLighting(name);
    dock.querySelectorAll('[data-light]').forEach((x) => x.classList.toggle('active', x.dataset.light === name));
    $('#light-label').textContent = LIGHTING[name].label;
  }

  // Realidade aumentada (AR Quick Look no iPhone/iPad)
  // dentro de um iframe (visualizadores embutidos) o AR Quick Look não abre: só mostra na página própria
  const embedded = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  if (arSupported() && !embedded) btn('ar').hidden = false;

  // Tela cheia (indisponível no Safari do iPhone)
  const fs = $('#btn-fullscreen');
  if (!document.documentElement.requestFullscreen) fs.hidden = true;
  fs.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });

  // Gaveta (celular)
  const panelEl = $('#panel');
  $('#panel-handle').addEventListener('click', () => panelEl.classList.toggle('expanded'));
  $('#tabs').addEventListener('click', () => {
    if (isMobile()) panelEl.classList.add('expanded');
  });
  let dragY = null;
  panelEl.addEventListener('touchstart', (e) => {
    if (e.target.closest('.panel-body') && panelEl.classList.contains('expanded') && $('#panel-body').scrollTop > 0) return;
    dragY = e.touches[0].clientY;
  }, { passive: true });
  panelEl.addEventListener('touchend', (e) => {
    if (dragY === null) return;
    const dy = e.changedTouches[0].clientY - dragY;
    if (dy < -40) panelEl.classList.add('expanded');
    if (dy > 40) panelEl.classList.remove('expanded');
    dragY = null;
  });
  $('#viewport').addEventListener('pointerdown', () => {
    panelEl.classList.remove('expanded');
    $('#hint').classList.add('hide');
  });
  setTimeout(() => $('#hint').classList.add('hide'), 9000);

  window.addEventListener('resize', () => {
    layoutInsets(stage);
    stage.frame(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') select((state.index + 1) % PRODUCTS.length, 1);
    if (e.key === 'ArrowLeft') select((state.index - 1 + PRODUCTS.length) % PRODUCTS.length, -1);
    if (e.key === 'Escape') {
      hotspots.close(true);
      setExplode(false);
    }
  });

  // Produto inicial (aceita link direto: #jd-old-no7)
  const fromHash = PRODUCTS.findIndex((p) => p.id === location.hash.slice(1));
  state.index = fromHash >= 0 ? fromHash : 0;
  setProgress(0.95, 'Ajustando a luz…');
  layoutInsets(stage);
  stage.insetsAnim = { ...stage.insets };
  await select(state.index, 0);
  stage.resize();
  stage.frame(false);

  await gate;
  setProgress(1);
  setTimeout(() => $('#loader').classList.add('done'), 250);

  // Ganchos para testes/automação
  window.vision = { stage, select, selectSize, hotspots, setLighting, setExplode, PRODUCTS, state };
}

main().catch((err) => {
  console.error(err);
  $('#loader-text').textContent = 'Não foi possível iniciar o showroom 3D.';
});
