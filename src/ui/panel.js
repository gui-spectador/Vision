import { radarChart } from './radar.js';
import { SOURCES } from '../data/products.js';

export const HOTSPOT_ORDER = ['cap', 'neck', 'emboss', 'label', 'liquid', 'base'];

const TABS = [
  ['overview', 'Visão geral'],
  ['composition', 'Composição'],
  ['history', 'História'],
  ['pairing', 'Harmonização'],
  ['sensory', 'Sensorial'],
];

// Paleta categórica validada (contraste, daltonismo) para a superfície escura do painel
const GRAIN_COLORS = ['#c08a10', '#4f8fd9', '#c7563a'];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const ICONS = {
  shot: '<path d="M10 8h14l-2.2 19H12.2z"/><path d="M11.2 17h11.6"/>',
  rocks: '<path d="M7 11h20l-2 16H9z"/><rect x="11" y="15" width="5" height="5" rx="1"/><rect x="17" y="17" width="5" height="5" rx="1"/>',
  highball: '<path d="M10 4h14l-1.6 25H11.6z"/><circle cx="15" cy="20" r="1"/><circle cx="19" cy="15" r="1"/><circle cx="17" cy="24" r="1"/>',
  frozen: '<path d="M10 9h14l-2.2 19H12.2z"/><path d="M17 13v10M12.7 15.5l8.6 5M21.3 15.5l-8.6 5"/>',
  citrus: '<path d="M8 6h13l-1.4 23H9.4z"/><circle cx="24" cy="9" r="5"/><path d="M24 4v10M19 9h10M20.5 5.5l7 7M27.5 5.5l-7 7"/>',
  berries: '<path d="M7 11h20l-2 16H9z"/><circle cx="14" cy="8" r="2.4"/><circle cx="19" cy="7" r="2.4"/><circle cx="16.5" cy="4" r="2.4"/>',
  mug: '<path d="M8 8h15v19H8z"/><path d="M23 12h3a3 3 0 0 1 0 6h-3"/><path d="M12 4c0 2 2 2 2 4M17 4c0 2 2 2 2 4"/>',
};

function serveIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('gelado') && n.includes('shot')) return ICONS.frozen;
  if (n.includes('gelado')) return ICONS.frozen;
  if (n.includes('puro') || n.includes('shot')) return ICONS.shot;
  if (n.includes('cítric')) return ICONS.citrus;
  if (n.includes('frutas')) return ICONS.berries;
  if (n.includes('gelo')) return ICONS.rocks;
  if (n.includes('quente') || n.includes('cider')) return ICONS.mug;
  return ICONS.highball;
}

export function createPanel(el, handlers) {
  const state = { product: null, sizeIndex: 0, tab: 'overview' };

  el.tabs.innerHTML = TABS.map(
    ([id, label]) => `<button class="tab" role="tab" data-tab="${id}" aria-selected="${id === state.tab}">${label}</button>`,
  ).join('');
  el.tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    setTab(b.dataset.tab);
    handlers.onTab?.(b.dataset.tab);
  });

  function setTab(tab) {
    state.tab = tab;
    el.tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === tab)));
    renderBody();
    el.body.scrollTop = 0;
  }

  function sizeSwitch(p) {
    if (p.sizes.length < 2) return `<span class="pill">${esc(p.sizes[0].label)}</span>`;
    return `<div class="size-switch" role="radiogroup" aria-label="Capacidade">${p.sizes
      .map((s, i) => `<button data-size="${i}" class="${i === state.sizeIndex ? 'active' : ''}" role="radio" aria-checked="${i === state.sizeIndex}">${esc(s.label)}</button>`)
      .join('')}</div>`;
  }

  function renderHead() {
    const p = state.product;
    const s = p.sizes[state.sizeIndex];
    el.head.innerHTML = `
      <span class="eyebrow">${esc(p.brand)}${p.badge ? ` <span class="badge">${esc(p.badge)}</span>` : ''}</span>
      <h2>${esc(p.short)}</h2>
      <p>${esc(p.category)} · ${p.abv}% vol · ${esc(s.label)}</p>
      <div class="mobile-only">${sizeSwitch(p)}<span class="pill">${esc(p.origin)}</span></div>`;
  }

  function renderBody() {
    const p = state.product;
    if (!p) return;
    const s = p.sizes[state.sizeIndex];
    const b = el.body;
    b.innerHTML = '';
    const add = (html) => {
      const sec = document.createElement('section');
      sec.innerHTML = html;
      b.appendChild(sec);
      return sec;
    };

    if (state.tab === 'overview') {
      add(`<p class="lead">${esc(p.description)}</p>`);
      add(`<h4>Ficha técnica</h4>
        <div class="spec-grid">
          <div class="spec"><span>Teor alcoólico</span><strong>${p.abv}% vol (${p.proof} proof)</strong></div>
          <div class="spec"><span>Capacidade</span><strong>${esc(s.label)}</strong></div>
          <div class="spec"><span>Categoria</span><strong>${esc(p.category)}</strong></div>
          <div class="spec"><span>Origem</span><strong>${esc(p.origin)}</strong></div>
          <div class="spec"><span>Lançamento</span><strong>${esc(p.launched)}</strong></div>
          <div class="spec"><span>Temperatura ideal</span><strong>${esc(p.temperature)}</strong></div>
          <div class="spec" style="grid-column: span 2"><span>Copo</span><strong>${esc(p.glass)}</strong></div>
        </div>`);
      const sec = add(`<h4>Explore a garrafa em 3D</h4><div class="explore-list">${HOTSPOT_ORDER.map(
        (k, i) => `<button class="explore-item" data-hotspot="${k}"><span class="num">${i + 1}</span><span><strong>${esc(p.hotspots[k].title)}</strong><small>Toque para aproximar</small></span></button>`,
      ).join('')}</div>`);
      sec.addEventListener('click', (e) => {
        const it = e.target.closest('[data-hotspot]');
        if (it) handlers.onHotspot?.(it.dataset.hotspot);
      });
    }

    if (state.tab === 'composition') {
      const c = p.composition;
      add(`<h4>O que tem na garrafa</h4><div class="chips">${c.blend
        .map((x) => `<span class="chip"><small>${esc(x.role)}</small>${esc(x.label)}</span>`)
        .join('')}</div>`);
      const pct = p.abv;
      const circ = 2 * Math.PI * 30;
      add(`<div class="abv">
          <svg viewBox="0 0 74 74" aria-hidden="true">
            <circle cx="37" cy="37" r="30" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="7"/>
            <circle cx="37" cy="37" r="30" fill="none" stroke="var(--accent)" stroke-width="7" stroke-linecap="round"
              stroke-dasharray="${(circ * pct) / 100} ${circ}" transform="rotate(-90 37 37)"/>
          </svg>
          <div><strong>${pct}% vol</strong><span>${p.proof} proof · ${esc(s.label)} contém ${Math.round((s.ml * pct) / 100)} ml de álcool</span></div>
        </div>`);
      add(`<h4>Receita de grãos</h4>
        <div class="stack" role="img" aria-label="${c.mashBill.map((g) => `${g.label} ${g.pct}%`).join(', ')}">
          ${c.mashBill.map((g, i) => `<i style="width:${g.pct}%;background:${GRAIN_COLORS[i]};animation-delay:${i * 0.12}s" title="${esc(g.label)}: ${g.pct}%"></i>`).join('')}
        </div>
        <div class="stack-legend">${c.mashBill.map((g, i) => `<span><b style="background:${GRAIN_COLORS[i]}"></b>${esc(g.label)} <em>${g.pct}%</em></span>`).join('')}</div>
        <p class="note">${esc(c.mashNote)}</p>`);
      add(`<h4>Do grão à garrafa</h4><ol class="steps">${c.process
        .map((st) => `<li><strong>${esc(st.step)}</strong><p>${esc(st.text)}</p></li>`)
        .join('')}</ol>`);
      const sec = add(`<p class="note">${esc(c.allergens)}</p><button class="cta" data-explode>Ver componentes em vista explodida →</button>`);
      sec.querySelector('[data-explode]').addEventListener('click', () => handlers.onExplode?.());
    }

    if (state.tab === 'history') {
      add(`<h4>Linha do tempo</h4><ol class="timeline">${p.history
        .map((h) => `<li class="${h.highlight ? 'hl' : ''}"><time>${esc(h.year)}</time><p>${esc(h.text)}</p></li>`)
        .join('')}</ol>`);
    }

    if (state.tab === 'pairing') {
      const pr = p.pairings;
      add(`<h4>Como servir</h4><div class="serves">${pr.serves
        .map((sv) => `<div class="serve"><svg viewBox="0 0 34 34">${serveIcon(sv.name)}</svg><strong>${esc(sv.name)}</strong><small>${esc(sv.detail)}</small></div>`)
        .join('')}</div>`);
      add(`<h4>Harmonização à mesa</h4><div class="pairs">${pr.food
        .map((f) => `<div class="pair"><span class="kind">${esc(f.kind)}</span><div><strong>${esc(f.name)}</strong><small>${esc(f.why)}</small></div></div>`)
        .join('')}</div>`);
      add(`<h4>Drinks</h4>${pr.drinks
        .map(
          (d, i) => `<details class="drink" ${i === 0 ? 'open' : ''}>
            <summary><span><strong>${esc(d.name)}</strong><small>${esc(d.source)} · ${esc(d.glass)}</small></span></summary>
            <div class="drink-body">
              <div><h5>Ingredientes</h5><ul>${d.ingredients.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
              <div><h5>Preparo</h5><ol>${d.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
            </div>
          </details>`,
        )
        .join('')}`);
    }

    if (state.tab === 'sensory') {
      const t = p.tasting;
      const sec = add(`<h4>Perfil sensorial (0–5)</h4>`);
      sec.appendChild(radarChart(p.sensory));
      sec.insertAdjacentHTML('beforeend', '<p class="note">Escala editorial de referência, baseada nas descrições oficiais e em notas de degustação publicadas.</p>');
      add(`<h4>Notas de degustação</h4><div class="notes">
          <div><span>Cor</span><p><i class="swatch" style="background:${p.liquid.color}"></i>${esc(t.color)}</p></div>
          <div><span>Aroma</span><p>${esc(t.nose)}</p></div>
          <div><span>Paladar</span><p>${esc(t.palate)}</p></div>
          <div><span>Final</span><p>${esc(t.finish)}</p></div>
        </div>`);
    }

    add(`<details class="sources"><summary>Fontes das informações</summary><ul>${SOURCES.map(
      (s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`,
    ).join('')}</ul><p class="note">Beba com moderação. Venda proibida para menores de 18 anos.</p></details>`);
  }

  el.head.addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]');
    if (b) handlers.onSize?.(Number(b.dataset.size));
  });

  return {
    render(product, sizeIndex) {
      const changed = product !== state.product;
      state.product = product;
      state.sizeIndex = sizeIndex;
      renderHead();
      if (changed) setTab(state.tab);
      else renderBody();
    },
    setTab,
    sizeSwitch,
  };
}
