/*
 * Divulgação: galeria das peças (vídeo e imagens), tela cheia e download.
 *
 * Download: no claude.ai a página não pode baixar arquivos sozinha; pede ao visualizador pela
 * capacidade `downloads` (o usuário confirma). Fora dele (GitHub Pages, servidor próprio) basta um
 * link com `download`.
 */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5 12 15.5l5-5M5 19.5h14" /></svg>';

/* ---------- download ---------- */

let dlPromise = null;
/** undefined: fora do claude.ai (link comum funciona) · null: visualizador sem download · objeto: capacidade. */
function downloadsNamespace() {
  if (!dlPromise) {
    const c = window.claude;
    dlPromise = typeof c?.use === 'function' ? Promise.resolve(c.use('downloads')).catch(() => null) : Promise.resolve(undefined);
  }
  return dlPromise;
}

export async function canDownload() {
  return (await downloadsNamespace()) !== null;
}

export async function saveFile(url, filename) {
  const dl = await downloadsNamespace();
  if (dl === undefined) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return 'saved';
  }
  if (!dl) throw Object.assign(new Error('downloads indisponível'), { code: 'unavailable' });
  const res = await fetch(url);
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { code: 'fetch_failed' });
  const blob = await res.blob();
  return (await dl.save({ filename, data: blob })).status;
}

let toastEl = null;
let toastTimer = 0;
function toast(text) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'media-toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

/** Liga um botão de download: estado de espera e mensagens de erro curtas. */
export async function handleDownload(btn) {
  if (btn.classList.contains('busy')) return;
  btn.classList.add('busy');
  try {
    await saveFile(btn.dataset.dl, btn.dataset.name);
  } catch (err) {
    const code = err?.code;
    if (code === 'declined') {
      /* o visualizador desistiu: nada a dizer */
    } else if (code === 'rate_limited') toast('Já existe um download aguardando confirmação.');
    else toast('Não foi possível baixar aqui. Abra o link do showroom no navegador e tente de novo.');
  } finally {
    btn.classList.remove('busy');
  }
}

/* ---------- tela cheia ---------- */

let lb = null;

function buildLightbox() {
  const el = document.createElement('div');
  el.className = 'lightbox';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="lb-top">
      <div class="lb-title"><strong></strong><small></small></div>
      <button class="lb-btn lb-dl dl-btn" type="button">${DOWNLOAD_ICON}<span>Baixar</span></button>
      <button class="lb-btn lb-close" type="button" aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
    </div>
    <div class="lb-stage">
      <button class="lb-nav lb-prev" type="button" aria-label="Anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
      <img alt="" />
      <button class="lb-nav lb-next" type="button" aria-label="Próxima"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
    </div>
    <div class="lb-count"></div>`;
  document.body.appendChild(el);
  const img = el.querySelector('img');
  const state = { list: [], i: 0, returnFocus: null };

  const show = (i) => {
    state.i = (i + state.list.length) % state.list.length;
    const it = state.list[state.i];
    el.setAttribute('aria-label', it.title);
    el.querySelector('.lb-title strong').textContent = it.title;
    el.querySelector('.lb-title small').textContent = it.format;
    el.querySelector('.lb-count').textContent = `${state.i + 1} / ${state.list.length}`;
    const dl = el.querySelector('.lb-dl');
    dl.dataset.dl = it.full;
    dl.dataset.name = it.file;
    // miniatura (já carregada) na hora, troca pela imagem inteira quando ela chegar
    img.src = it.thumb;
    img.alt = it.title;
    const full = new Image();
    full.onload = () => {
      if (state.list[state.i] === it) img.src = it.full;
    };
    full.src = it.full;
  };
  const close = () => {
    el.hidden = true;
    document.documentElement.classList.remove('lb-open');
    state.returnFocus?.focus?.();
  };

  el.addEventListener('click', (e) => {
    if (e.target.closest('.lb-close') || e.target === el || e.target.classList.contains('lb-stage')) close();
    else if (e.target.closest('.lb-prev')) show(state.i - 1);
    else if (e.target.closest('.lb-next')) show(state.i + 1);
    else if (e.target.closest('.lb-dl')) handleDownload(e.target.closest('.lb-dl'));
  });
  // teclado: captura antes dos atalhos do showroom (setas trocam de produto)
  window.addEventListener('keydown', (e) => {
    if (el.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(state.i - 1);
    else if (e.key === 'ArrowRight') show(state.i + 1);
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  // deslizar no celular
  let sx = null;
  el.querySelector('.lb-stage').addEventListener('pointerdown', (e) => { sx = e.clientX; });
  el.querySelector('.lb-stage').addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) show(state.i + (dx < 0 ? 1 : -1));
  });

  return {
    open(list, i) {
      state.list = list;
      state.returnFocus = document.activeElement;
      el.hidden = false;
      document.documentElement.classList.add('lb-open');
      show(i);
      el.querySelector('.lb-close').focus();
    },
  };
}

export function openLightbox(list, i) {
  lb ??= buildLightbox();
  lb.open(list, i);
}

/* ---------- conteúdo da aba ---------- */

/** Lista achatada das imagens (ordem da galeria), com caminhos da imagem inteira e da miniatura. */
export function mediaImages(media) {
  return media.groups.flatMap((g) => g.images.map((im) => ({
    ...im,
    full: `divulgacao/${im.file}`,
    thumb: `divulgacao/miniaturas/${im.file}`,
  })));
}

export function mediaSectionsHTML(media) {
  const all = mediaImages(media);
  let k = 0;
  const tile = (im, cls = '') => {
    const i = k++;
    const it = all[i];
    return `<div class="media-tile ${cls}" style="--ar:${im.w > im.h ? '16 / 9' : '4 / 5'}">
      <button class="media-open" type="button" data-lb="${i}" aria-label="Ampliar: ${esc(im.title)}">
        <img src="${esc(it.thumb)}" alt="${esc(im.title)}" loading="lazy" decoding="async" />
        <span class="media-cap"><strong>${esc(im.title)}</strong><small>${esc(im.format)}</small></span>
      </button>
      <button class="dl-btn dl-round" type="button" data-dl="${esc(it.full)}" data-name="${esc(im.file)}" aria-label="Baixar ${esc(im.title)}" title="Baixar">${DOWNLOAD_ICON}</button>
    </div>`;
  };
  return media.groups.map((g) => {
    let html = `<h4>${esc(g.title)}</h4>`;
    if (g.video) {
      const name = g.video.src.split('/').pop();
      html += `<figure class="media-video">
          <video controls playsinline preload="none" poster="${esc(g.video.poster)}" aria-label="${esc(g.video.title)}">
            <source src="${esc(g.video.src)}" type="video/mp4" />
          </video>
        </figure>
        <div class="media-row">
          <span><strong>${esc(g.video.title)}</strong><small>${esc(g.video.format)}</small></span>
          <button class="dl-btn dl-pill" type="button" data-dl="${esc(g.video.src)}" data-name="${esc(name)}">${DOWNLOAD_ICON}<span>Baixar MP4</span></button>
        </div>`;
    }
    // 3 colunas quando há 3+ verticais; a paisagem ocupa a linha inteira
    const cols = g.images.filter((im) => im.w <= im.h).length >= 3 ? 3 : 2;
    html += `<div class="media-grid cols-${cols}">${g.images.map((im) => tile(im, im.w > im.h ? 'wide' : '')).join('')}</div>`;
    return html;
  });
}
