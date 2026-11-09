/*
 * Radar sensorial (série única, escala 0–5). Sem legenda: o título da seção nomeia a série.
 * Interação: toque/hover em cada vértice mostra o valor; uma tabela abaixo serve como visão acessível.
 */
export function radarChart(values, { max = 5, size = 320 } = {}) {
  const keys = Object.keys(values);
  const n = keys.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.32;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * R * (v / max), cy + Math.sin(a) * R * (v / max)];
  };
  const ring = (v) => keys.map((_, i) => pt(i, v).join(',')).join(' ');
  const grid = [1, 2, 3, 4, 5].map((v) => `<polygon class="grid" points="${ring(v)}" />`).join('');
  const axes = keys
    .map((_, i) => {
      const [x, y] = pt(i, max);
      return `<line class="axis" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" />`;
    })
    .join('');
  const labels = keys
    .map((k, i) => {
      const [x, y] = pt(i, max * 1.24);
      const anchor = Math.abs(x - cx) < 4 ? 'middle' : x > cx ? 'start' : 'end';
      return `<text x="${x}" y="${y + 4}" text-anchor="${anchor}">${k}</text>`;
    })
    .join('');
  const area = keys.map((k, i) => pt(i, values[k]).join(',')).join(' ');
  const dots = keys
    .map((k, i) => {
      const [x, y] = pt(i, values[k]);
      return `<circle class="pt" cx="${x}" cy="${y}" r="4.5" /><circle class="hit" data-k="${k}" data-v="${values[k]}" cx="${x}" cy="${y}" r="16" tabindex="0" aria-label="${k}: ${values[k].toFixed(1)} de ${max}" />`;
    })
    .join('');

  const wrap = document.createElement('div');
  wrap.className = 'radar-wrap';
  wrap.innerHTML = `
    <svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="Perfil sensorial">
      ${grid}${axes}<polygon class="area" points="${area}" />${dots}${labels}
    </svg>
    <div class="radar-tip" role="status"></div>`;
  const tip = wrap.querySelector('.radar-tip');
  const svg = wrap.querySelector('svg');
  const show = (el) => {
    const box = svg.getBoundingClientRect();
    const host = wrap.getBoundingClientRect();
    const sx = box.width / size;
    tip.textContent = `${el.dataset.k}: ${Number(el.dataset.v).toFixed(1)} / ${max}`;
    tip.style.left = `${box.left - host.left + el.cx.baseVal.value * sx}px`;
    tip.style.top = `${box.top - host.top + el.cy.baseVal.value * sx}px`;
    tip.classList.add('show');
  };
  wrap.querySelectorAll('.hit').forEach((el) => {
    el.addEventListener('pointerenter', () => show(el));
    el.addEventListener('focus', () => show(el));
    el.addEventListener('click', () => show(el));
    el.addEventListener('pointerleave', () => tip.classList.remove('show'));
    el.addEventListener('blur', () => tip.classList.remove('show'));
  });

  const table = document.createElement('table');
  table.className = 'radar-table';
  table.innerHTML = keys.map((k) => `<tr><td>${k}</td><td>${values[k].toFixed(1)} / ${max}</td></tr>`).join('');

  const frag = document.createDocumentFragment();
  frag.append(wrap, table);
  return frag;
}
