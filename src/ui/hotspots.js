import { HOTSPOT_ORDER } from './panel.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const CALLOUTS = [
  { key: 'cap', side: 'right', title: 'Tampa', sub: () => 'Rosqueável e serrilhada' },
  { key: 'liquid', side: 'below', title: 'Líquido', sub: (p, s) => `${s.label} · ${p.abv}% vol` },
  { key: 'glass', side: 'below', title: 'Garrafa de vidro', sub: () => 'Quadrada, relevo no ombro, base espessa' },
  { key: 'labels', side: 'below', title: 'Rótulos', sub: () => 'Frente, colarinho e verso · hot stamping' },
];

export function createHotspots({ layer, calloutLayer, card, stage, onOpen, onClose }) {
  let product = null;
  let size = null;
  let active = null;
  const pins = {};
  const callouts = {};
  const isMobile = () => matchMedia('(max-width: 900px)').matches;

  HOTSPOT_ORDER.forEach((key, i) => {
    const b = document.createElement('button');
    b.className = 'hotspot';
    b.innerHTML = `${i + 1}<span class="tip"></span>`;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      open(key);
    });
    layer.appendChild(b);
    pins[key] = b;
  });

  CALLOUTS.forEach((c) => {
    const d = document.createElement('div');
    d.className = `callout ${c.side}`;
    d.innerHTML = '<span class="dot"></span><span class="line"></span><div class="box"><strong></strong><small></small></div>';
    calloutLayer.appendChild(d);
    callouts[c.key] = d;
  });

  const $ = (id) => card.querySelector(id);
  $('#hotspot-close').addEventListener('click', () => close(true));
  $('#hs-prev').addEventListener('click', () => step(-1));
  $('#hs-next').addEventListener('click', () => step(1));

  function step(d) {
    const i = HOTSPOT_ORDER.indexOf(active);
    open(HOTSPOT_ORDER[(i + d + HOTSPOT_ORDER.length) % HOTSPOT_ORDER.length]);
  }

  function open(key) {
    if (!product) return;
    active = key;
    const h = product.hotspots[key];
    const i = HOTSPOT_ORDER.indexOf(key);
    $('#hs-index').textContent = `Detalhe ${i + 1} de ${HOTSPOT_ORDER.length}`;
    $('#hs-title').textContent = h.title;
    $('#hs-text').textContent = h.text;
    card.hidden = false;
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
    Object.entries(pins).forEach(([k, p]) => p.classList.toggle('active', k === key));
    stage.focusAnchor(key);
    onOpen?.(key);
  }

  function close(resetView = false) {
    if (!active) return;
    active = null;
    card.hidden = true;
    Object.values(pins).forEach((p) => p.classList.remove('active'));
    if (resetView) stage.resetView();
    onClose?.();
  }

  function setProduct(p, s) {
    product = p;
    size = s;
    HOTSPOT_ORDER.forEach((k) => {
      pins[k].querySelector('.tip').textContent = p.hotspots[k].title;
      pins[k].setAttribute('aria-label', p.hotspots[k].title);
    });
    CALLOUTS.forEach((c) => {
      const el = callouts[c.key];
      el.querySelector('strong').textContent = c.title;
      el.querySelector('small').textContent = c.sub(p, s);
    });
    if (active) close(false);
  }

  function update(proj) {
    if (!proj) return;
    const ex = proj.exploded;
    const hsVisible = 1 - smooth(0.02, 0.2, ex);
    for (const key of HOTSPOT_ORDER) {
      const a = proj.anchors[key];
      const pin = pins[key];
      if (!a) continue;
      const o = smooth(0.08, 0.32, a.facing) * hsVisible * (a.z < 1 ? 1 : 0);
      pin.style.transform = `translate3d(${a.x}px, ${a.y}px, 0) scale(${0.85 + 0.15 * o})`;
      pin.style.opacity = o.toFixed(3);
      pin.style.pointerEvents = o > 0.4 ? 'auto' : 'none';
    }
    const co = smooth(0.55, 0.92, ex);
    for (const c of CALLOUTS) {
      const p = proj.parts[c.key];
      const el = callouts[c.key];
      if (!p) continue;
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      el.style.opacity = co.toFixed(3);
    }
    // card acompanha o ponto no desktop
    if (active && !card.hidden && !isMobile()) {
      const a = proj.anchors[active];
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      const vw = window.innerWidth;
      let x = a.x + 34;
      if (x + w > vw - 470) x = a.x - 34 - w;
      const y = Math.min(window.innerHeight - h - 20, Math.max(80, a.y - h / 2));
      card.style.left = `${Math.max(16, x)}px`;
      card.style.top = `${y}px`;
    }
  }

  return { setProduct, update, open, close, get active() { return active; } };
}
