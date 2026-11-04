import * as THREE from 'three';

/*
 * Pintura procedural dos rótulos em canvas (alta resolução).
 * Cada rótulo gera três camadas:
 *   color -> arte (map)
 *   orm   -> canal G = rugosidade, canal B = metalicidade (hot-stamping dourado/prata)
 *   bump  -> relevo (tinta e foil levemente em alto-relevo)
 * Para fidelidade total, o produto pode informar `labelImage` com a arte oficial plana (PNG/JPG).
 */

const FOILS = {
  gold: ['#7a5a22', '#d9b56a', '#fff1c1', '#b8893a', '#f2d68c', '#8a6526'],
  darkgold: ['#4a3410', '#9a7426', '#d4ad5a', '#6e5018', '#b08a36', '#4a3410'],
  silver: ['#6d7178', '#c9ccd1', '#ffffff', '#9da2a9', '#e6e8eb', '#70747a'],
  copper: ['#6b3518', '#c7774a', '#ffd2b0', '#a85a32', '#e8a07a', '#6b3518'],
};

export class LabelCanvas {
  constructor(width, height, { paperRoughness = 0.62, base = '#ffffff' } = {}) {
    this.w = width;
    this.h = height;
    this.color = document.createElement('canvas');
    this.orm = document.createElement('canvas');
    this.bump = document.createElement('canvas');
    for (const c of [this.color, this.orm, this.bump]) {
      c.width = width;
      c.height = height;
    }
    this.c = this.color.getContext('2d');
    this.m = this.orm.getContext('2d');
    this.b = this.bump.getContext('2d');
    this.c.fillStyle = base;
    this.c.fillRect(0, 0, width, height);
    const g = Math.round(paperRoughness * 255);
    this.paperORM = `rgb(255,${g},0)`;
    this.m.fillStyle = this.paperORM;
    this.m.fillRect(0, 0, width, height);
    this.b.fillStyle = '#000';
    this.b.fillRect(0, 0, width, height);
  }

  foilStyle(ctx, kind, x0, y0, x1, y1) {
    const stops = FOILS[kind] ?? FOILS.gold;
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s, i) => grad.addColorStop(i / (stops.length - 1), s));
    return grad;
  }

  /**
   * Desenha um elemento em todas as camadas.
   * draw(ctx, fillStyle) deve desenhar (fill/stroke) usando o estilo recebido.
   * opts.fill: cor | 'gold' | 'silver' | 'copper'. opts.raise: 0..1 relevo.
   */
  el(draw, { fill = '#000', raise = 0.18, bbox = null, knock = '#000' } = {}) {
    const foil = typeof fill === 'string' && FOILS[fill];
    const [x0, y0, x1, y1] = bbox ?? [0, 0, this.w, this.h];
    const style = foil ? this.foilStyle(this.c, fill, x0, y0, x1, y1 * 0.6 + y0 * 0.4) : fill;
    this.c.save();
    draw(this.c, style, knock);
    this.c.restore();
    this.m.save();
    draw(this.m, foil ? 'rgb(255,62,255)' : 'rgb(255,120,0)', this.paperORM);
    this.m.restore();
    if (raise > 0) {
      const v = Math.round(Math.min(1, foil ? raise + 0.35 : raise) * 255);
      this.b.save();
      draw(this.b, `rgb(${v},${v},${v})`, '#000');
      this.b.restore();
    }
  }

  textures(anisotropy = 8) {
    const map = new THREE.CanvasTexture(this.color);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = anisotropy;
    const orm = new THREE.CanvasTexture(this.orm);
    orm.anisotropy = anisotropy;
    const bump = new THREE.CanvasTexture(this.bump);
    bump.anisotropy = anisotropy;
    for (const t of [map, orm, bump]) {
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
    }
    return { map, orm, bump, canvas: this.color };
  }
}

/* ---------- utilitários de tipografia ---------- */

function fitFont(ctx, text, family, weight, maxSize, maxWidth, spacing = 0) {
  let size = maxSize;
  for (; size > 8; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const w = ctx.measureText(text).width + spacing * size * (text.length - 1);
    if (w <= maxWidth) break;
  }
  return size;
}

function spacedText(ctx, text, x, y, spacingPx, mode = 'fill') {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacingPx * (text.length - 1);
  let cx = x - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    if (mode === 'fill' || mode === 'both') ctx.fillText(ch, cx, y);
    if (mode === 'stroke' || mode === 'both') ctx.strokeText(ch, cx, y);
    cx += widths[i] + spacingPx;
  });
  ctx.textAlign = align;
  return total;
}

/** Texto em arco (centro do arco abaixo do texto: arco "sorrindo" para cima). */
function arcText(ctx, text, cx, cy, radius, spacingPx, mode = 'fill') {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacingPx * (chars.length - 1);
  let angle = -total / radius / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'center';
  chars.forEach((ch, i) => {
    const half = widths[i] / 2 / radius;
    angle += half;
    ctx.save();
    ctx.translate(cx, cy + radius);
    ctx.rotate(angle);
    ctx.translate(0, -radius);
    if (mode === 'stroke' || mode === 'both') ctx.strokeText(ch, 0, 0);
    if (mode === 'fill' || mode === 'both') ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += half + spacingPx / radius;
  });
  ctx.textAlign = align;
}

/* ---------- ornamentos ---------- */

function scroll(ctx, x, y, w, dir = 1, lw = 4) {
  // Arabesco: haste com volutas
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + dir * w * 0.25, y - w * 0.12, x + dir * w * 0.5, y + w * 0.1, x + dir * w * 0.72, y - w * 0.02);
  ctx.bezierCurveTo(x + dir * w * 0.86, y - w * 0.08, x + dir * w * 0.95, y - w * 0.02, x + dir * w, y + w * 0.04);
  ctx.stroke();
  for (const [t, s] of [[0.32, 1], [0.58, -1], [0.82, 1]]) {
    const px = x + dir * w * t;
    const py = y + (s > 0 ? -w * 0.03 : w * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py - s * w * 0.06, w * 0.07, w * 0.04, dir * s * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x + dir * w, y + w * 0.04 - w * 0.05, w * 0.05, Math.PI * 0.5, Math.PI * 2.2, dir < 0);
  ctx.stroke();
}

function filigree(ctx, cx, y, w, lw = 4) {
  scroll(ctx, cx - 18, y, w / 2 - 18, -1, lw);
  scroll(ctx, cx + 18, y, w / 2 - 18, 1, lw);
  ctx.beginPath();
  ctx.moveTo(cx, y - 22);
  ctx.lineTo(cx + 16, y);
  ctx.lineTo(cx, y + 22);
  ctx.lineTo(cx - 16, y);
  ctx.closePath();
  ctx.fill();
}

function frame(ctx, w, h, inset, lw, corner = 34) {
  ctx.lineWidth = lw;
  ctx.beginPath();
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  ctx.moveTo(x0 + corner, y0);
  ctx.lineTo(x1 - corner, y0);
  ctx.arc(x1, y0, corner, Math.PI, Math.PI * 0.5, true);
  ctx.lineTo(x1, y1 - corner);
  ctx.arc(x1, y1, corner, Math.PI * 1.5, Math.PI, true);
  ctx.lineTo(x0 + corner, y1);
  ctx.arc(x0, y1, corner, 0, Math.PI * 1.5, true);
  ctx.lineTo(x0, y0 + corner);
  ctx.arc(x0, y0, corner, Math.PI * 0.5, 0, true);
  ctx.closePath();
  ctx.stroke();
}

/* ---------- ícones ---------- */

const ICONS = {
  blackberry(ctx, cx, cy, s) {
    // drupas em grade hexagonal dentro de um oval
    const r = s * 0.095;
    const ax = s * 0.38;
    const ay = s * 0.48;
    for (let row = -6; row <= 6; row++) {
      const yy = cy + 0.06 * s + row * r * 1.62;
      for (let k = -6; k <= 6; k++) {
        const xx = cx + (k + (Math.abs(row) % 2 ? 0.5 : 0)) * r * 1.86;
        const nx = (xx - cx) / ax;
        const ny = (yy - cy - 0.06 * s) / ay;
        if (nx * nx + ny * ny > 1) continue;
        ctx.beginPath();
        ctx.arc(xx, yy, r * 0.95, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // cálice e cabo
    for (const a of [-1.05, -0.35, 0.35, 1.05]) {
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(a) * s * 0.2, cy - s * 0.47, s * 0.2, s * 0.06, a * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(cx - s * 0.025, cy - s * 0.74, s * 0.05, s * 0.26);
  },
  bee(ctx, cx, cy, s, style, knock) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.32, cy - s * 0.34, s * 0.36, s * 0.2, -0.55, 0, Math.PI * 2);
    ctx.ellipse(cx + s * 0.32, cy - s * 0.34, s * 0.36, s * 0.2, 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.08, s * 0.24, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.42, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.fillStyle = knock;
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.08, s * 0.24, s * 0.42, 0, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - s * 0.3, cy - s * 0.08 + i * s * 0.17, s * 0.6, s * 0.06);
    }
    ctx.restore();
    ctx.lineWidth = s * 0.03;
    ctx.strokeStyle = style;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.06, cy - s * 0.55);
    ctx.quadraticCurveTo(cx - s * 0.16, cy - s * 0.78, cx - s * 0.26, cy - s * 0.8);
    ctx.moveTo(cx + s * 0.06, cy - s * 0.55);
    ctx.quadraticCurveTo(cx + s * 0.16, cy - s * 0.78, cx + s * 0.26, cy - s * 0.8);
    ctx.stroke();
  },
  flame(ctx, cx, cy, s, style, knock) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.85);
    ctx.bezierCurveTo(cx + s * 0.2, cy - s * 0.45, cx + s * 0.62, cy - s * 0.2, cx + s * 0.45, cy + s * 0.32);
    ctx.bezierCurveTo(cx + s * 0.34, cy + s * 0.62, cx - s * 0.34, cy + s * 0.66, cx - s * 0.46, cy + s * 0.3);
    ctx.bezierCurveTo(cx - s * 0.56, cy - s * 0.02, cx - s * 0.3, cy - s * 0.2, cx - s * 0.22, cy - s * 0.42);
    ctx.bezierCurveTo(cx - s * 0.1, cy - s * 0.18, cx - s * 0.02, cy - s * 0.5, cx, cy - s * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.fillStyle = knock;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.02, cy - s * 0.18);
    ctx.bezierCurveTo(cx + s * 0.3, cy + s * 0.05, cx + s * 0.3, cy + s * 0.42, cx, cy + s * 0.46);
    ctx.bezierCurveTo(cx - s * 0.26, cy + s * 0.44, cx - s * 0.26, cy + s * 0.12, cx - s * 0.1, cy - s * 0.02);
    ctx.bezierCurveTo(cx - s * 0.06, cy + s * 0.12, cx + s * 0.04, cy + s * 0.02, cx + s * 0.02, cy - s * 0.18);
    ctx.fill();
    ctx.restore();
  },
  apple(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.32);
    ctx.bezierCurveTo(cx + s * 0.25, cy - s * 0.5, cx + s * 0.62, cy - s * 0.38, cx + s * 0.56, cy + s * 0.08);
    ctx.bezierCurveTo(cx + s * 0.52, cy + s * 0.45, cx + s * 0.24, cy + s * 0.66, cx, cy + s * 0.52);
    ctx.bezierCurveTo(cx - s * 0.24, cy + s * 0.66, cx - s * 0.52, cy + s * 0.45, cx - s * 0.56, cy + s * 0.08);
    ctx.bezierCurveTo(cx - s * 0.62, cy - s * 0.38, cx - s * 0.25, cy - s * 0.5, cx, cy - s * 0.32);
    ctx.fill();
    ctx.fillRect(cx - s * 0.03, cy - s * 0.62, s * 0.06, s * 0.3);
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.2, cy - s * 0.56, s * 0.2, s * 0.08, -0.5, 0, Math.PI * 2);
    ctx.fill();
  },
  seven(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
    ctx.lineWidth = s * 0.06;
    ctx.stroke();
    ctx.font = `700 ${s * 0.7}px "Old Standard TT", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('7', cx, cy + s * 0.04);
  },
};

/* ---------- ornamentos do painel (estilo do rótulo original) ---------- */

/** Arabesco superior: duas volutas espelhadas que saem do centro. */
function topFlourish(ctx, cx, y, w, lw) {
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    const x = (t) => cx + d * w * t;
    ctx.beginPath();
    ctx.moveTo(x(0.03), y + 4);
    ctx.bezierCurveTo(x(0.16), y - w * 0.07, x(0.3), y + w * 0.06, x(0.46), y - w * 0.01);
    ctx.bezierCurveTo(x(0.55), y - w * 0.045, x(0.6), y - w * 0.08, x(0.53), y - w * 0.095);
    ctx.bezierCurveTo(x(0.47), y - w * 0.105, x(0.45), y - w * 0.06, x(0.5), y - w * 0.055);
    ctx.stroke();
    // segunda haste, mais alta
    ctx.beginPath();
    ctx.moveTo(x(0.1), y - w * 0.035);
    ctx.bezierCurveTo(x(0.22), y - w * 0.1, x(0.33), y - w * 0.02, x(0.4), y - w * 0.07);
    ctx.stroke();
    // voluta externa
    ctx.beginPath();
    ctx.moveTo(x(0.55), y + 2);
    ctx.bezierCurveTo(x(0.68), y + w * 0.05, x(0.8), y - w * 0.07, x(0.92), y - w * 0.02);
    ctx.bezierCurveTo(x(0.99), y + w * 0.01, x(0.97), y + w * 0.06, x(0.91), y + w * 0.05);
    ctx.bezierCurveTo(x(0.87), y + w * 0.04, x(0.88), y + w * 0.01, x(0.92), y + w * 0.015);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx, y - 12);
  ctx.lineTo(cx + 9, y + 2);
  ctx.lineTo(cx, y + 16);
  ctx.lineTo(cx - 9, y + 2);
  ctx.closePath();
  ctx.fill();
}

/** Linha lateral da moldura, com voluta no alto, losango no meio e curva para dentro embaixo. */
function sideFrame(ctx, x, y0, y1, dir, lw) {
  const h = y1 - y0;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + dir * 46, y0 + 30);
  ctx.bezierCurveTo(x + dir * 70, y0 - 6, x + dir * 8, y0 - 18, x, y0 + 30);
  ctx.bezierCurveTo(x - dir * 10, y0 + h * 0.18, x + dir * 6, y0 + h * 0.3, x, y0 + h * 0.42);
  ctx.bezierCurveTo(x - dir * 6, y0 + h * 0.55, x + dir * 10, y0 + h * 0.7, x, y0 + h * 0.86);
  ctx.bezierCurveTo(x - dir * 4, y0 + h * 0.95, x + dir * 30, y1 + 6, x + dir * 90, y1 - 4);
  ctx.stroke();
  // linha interna paralela (filete duplo)
  ctx.lineWidth = lw * 0.55;
  ctx.beginPath();
  ctx.moveTo(x + dir * 16, y0 + h * 0.08);
  ctx.bezierCurveTo(x + dir * 8, y0 + h * 0.3, x + dir * 22, y0 + h * 0.6, x + dir * 14, y0 + h * 0.84);
  ctx.stroke();
  // losango no meio, apontando para fora
  const my = y0 + h * 0.42;
  ctx.beginPath();
  ctx.moveTo(x - dir * 34, my);
  ctx.lineTo(x - dir * 14, my - 11);
  ctx.lineTo(x + dir * 2, my);
  ctx.lineTo(x - dir * 14, my + 11);
  ctx.closePath();
  ctx.fill();
}

/** Arabesco inferior, ligando as duas laterais. */
function bottomFlourish(ctx, cx, y, w, lw) {
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    const x = (t) => cx + d * w * t;
    ctx.beginPath();
    ctx.moveTo(x(0.95), y - 18);
    ctx.bezierCurveTo(x(0.78), y + 22, x(0.55), y - 28, x(0.3), y + 6);
    ctx.bezierCurveTo(x(0.18), y + 22, x(0.08), y + 10, x(0.1), y - 6);
    ctx.bezierCurveTo(x(0.12), y - 20, x(0.2), y - 14, x(0.17), y - 4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, y + 6, 7, 0, Math.PI * 2);
  ctx.fill();
}

/** Amora-preta com coroa de folhas (ícone dourado do rótulo). */
function blackberryCrest(ctx, cx, cy, s) {
  // coroa: cinco folhas pontudas abertas em leque
  const leaf = (ang, len, wid) => {
    ctx.save();
    ctx.translate(cx, cy - s * 0.34);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, -len * 0.3, wid * 0.55, -len * 0.78, 0, -len);
    ctx.bezierCurveTo(-wid * 0.55, -len * 0.78, -wid, -len * 0.3, 0, 0);
    ctx.fill();
    ctx.restore();
  };
  leaf(-1.42, s * 0.5, s * 0.11);
  leaf(-0.8, s * 0.42, s * 0.11);
  leaf(0, s * 0.26, s * 0.09);
  leaf(0.8, s * 0.42, s * 0.11);
  leaf(1.42, s * 0.5, s * 0.11);
  // fruto: drupas redondas com sulcos entre elas
  const rows = [[-0.27, 3], [-0.09, 4], [0.09, 4], [0.27, 3], [0.43, 2]];
  const r = s * 0.105;
  for (const [fy, count] of rows) {
    for (let i = 0; i < count; i++) {
      const fx = (i - (count - 1) / 2) * 0.205;
      ctx.beginPath();
      ctx.arc(cx + fx * s, cy + s * 0.04 + fy * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Voluta que ladeia o ícone: espiral na ponta interna e cauda afilada para fora. */
function scrollSwoosh(ctx, x, y, w, dir, lw) {
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  ctx.beginPath();
  // espiral
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const a = Math.PI * 2.2 * t + Math.PI * 0.5;
    const rr = w * 0.09 * (1 - t * 0.75);
    const px = x + dir * (Math.cos(a) * rr);
    const py = y - w * 0.05 + Math.sin(a) * rr;
    if (t === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // cauda dupla
  for (const [o, k] of [[0, 1], [16, 0.7]]) {
    ctx.lineWidth = lw * k;
    ctx.beginPath();
    ctx.moveTo(x, y + w * 0.04 + o * 0.3);
    ctx.bezierCurveTo(x + dir * w * 0.35, y + w * 0.16 + o, x + dir * w * 0.62, y - w * 0.02 + o, x + dir * w, y - w * 0.22 + o * 0.4);
    ctx.stroke();
  }
}

/* ---------- rótulo frontal: painel de quina a quina ---------- */

/*
 * Proporções medidas na foto do rótulo de 1 L. O painel cobre a face e os dois chanfros
 * (largura de superfície 9,3 cm): a face plana vai de u = 0,118 a 0,882 e os textos
 * verticais ficam sobre os chanfros (u ≈ 0,069 e 0,931).
 */
export function paintFrontLabel(design, volumeText, { width = 1700, height = 1768 } = {}) {
  const L = new LabelCanvas(width, height, { base: design.bg[0] });
  const { c } = L;
  const W = width;
  const H = height;
  const cx = W / 2;
  const foil = design.foil ?? 'gold';
  const ink = design.ink;
  const Y = (f) => f * H;

  // fundo
  const g = c.createRadialGradient(cx, Y(0.42), 60, cx, Y(0.5), W * 0.75);
  g.addColorStop(0, design.bg[0]);
  g.addColorStop(1, design.bg[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const rnd = mulberry32(7);
  c.globalAlpha = design.paperGrain ?? 0.035;
  for (let i = 0; i < 12000; i++) {
    c.fillStyle = rnd() > 0.5 ? '#fff' : '#000';
    c.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  c.globalAlpha = 1;

  // textos verticais sobre os chanfros
  L.el((ctx, s) => {
    ctx.fillStyle = s;
    ctx.textBaseline = 'middle';
    const t1 = design.sideLeft ?? 'JACK DANIEL DISTILLERY';
    const t2 = design.sideRight ?? 'QUALITY & CRAFTSMANSHIP';
    const span = H * 0.8;
    for (const [text, x, rot] of [[t1, W * 0.069, Math.PI / 2], [t2, W * 0.931, -Math.PI / 2]]) {
      ctx.save();
      ctx.translate(x, H * 0.51);
      ctx.rotate(rot);
      ctx.font = '700 58px "Old Standard TT", serif';
      const plain = ctx.measureText(text).width;
      const gap = Math.max(4, (span - plain) / (text.length - 1));
      spacedText(ctx, text, 0, 0, gap);
      ctx.restore();
    }
  }, { fill: design.sideInk ?? ink, raise: 0.12 });

  // moldura dourada: arabesco superior, laterais e inferior
  L.el((ctx, s) => {
    ctx.strokeStyle = s;
    ctx.fillStyle = s;
    topFlourish(ctx, cx, Y(0.088), W * 0.31, 5);
    sideFrame(ctx, W * 0.177, Y(0.355), Y(0.93), 1, 5);
    sideFrame(ctx, W * 0.823, Y(0.355), Y(0.93), -1, 5);
    bottomFlourish(ctx, cx, Y(0.94), W * 0.28, 5);
  }, { fill: foil, raise: 0.28 });

  // marca em arco (letras altas e condensadas)
  const wm = design.wordmark ?? "JACK DANIEL'S";
  L.el((ctx, s) => {
    const sx = 0.54;
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(sx, 1);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = s;
    const target = (W * 0.67) / sx;
    let size = 360;
    while (size > 80) {
      ctx.font = `900 ${size}px "Playfair Display", serif`;
      if (ctx.measureText(wm).width + size * 0.015 * wm.length <= target) break;
      size -= 4;
    }
    // engrossa o traço (o logotipo original é bem mais pesado que a fonte)
    ctx.strokeStyle = s;
    ctx.lineWidth = size * 0.035;
    ctx.lineJoin = 'round';
    arcText(ctx, wm, 0, Y(0.232), 2600, size * 0.015, 'both');
    ctx.restore();
    // ® pequeno
    ctx.font = '700 30px "Old Standard TT", serif';
    ctx.fillStyle = s;
    ctx.fillText('®', cx + W * 0.336, Y(0.3));
  }, { fill: design.wordmarkFill ?? ink, raise: 0.3 });

  // ícone central + pinceladas
  L.el((ctx, s, k) => {
    ctx.fillStyle = s;
    ctx.strokeStyle = s;
    if (design.icon === 'blackberry') blackberryCrest(ctx, cx, Y(0.365), 250);
    else if (ICONS[design.icon]) ICONS[design.icon](ctx, cx, Y(0.365), 210, s, k);
    scrollSwoosh(ctx, cx - W * 0.1, Y(0.43), W * 0.16, -1, 6);
    scrollSwoosh(ctx, cx + W * 0.1, Y(0.43), W * 0.16, 1, 6);
  }, { fill: design.iconFill ?? foil, raise: 0.35, knock: design.bg[0] });

  // "Tennessee" (script encorpado)
  if (design.script) {
    L.el((ctx, s) => {
      const size = fitFont(ctx, design.script, '"Petit Formal Script", cursive', 400, design.scriptSize ?? 175, W * 0.42);
      ctx.font = `400 ${size}px "Petit Formal Script", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = s;
      ctx.strokeStyle = s;
      ctx.lineWidth = size * 0.05;
      ctx.lineJoin = 'round';
      ctx.strokeText(design.script, cx, Y(0.553));
      ctx.fillText(design.script, cx, Y(0.553));
    }, { fill: design.scriptFill ?? ink, raise: 0.25 });
  }

  // título em versais (ex.: "BLACKBERRY")
  if (design.title) {
    L.el((ctx, s) => {
      const tSize = fitFont(ctx, design.title, '"Old Standard TT", serif', 700, 124, W * 0.5, 0.05);
      ctx.font = `700 ${tSize}px "Old Standard TT", serif`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = s;
      const tw = spacedText(ctx, design.title, cx, Y(0.645), tSize * 0.05);
      ctx.font = `700 ${tSize * 0.24}px "Old Standard TT", serif`;
      ctx.textAlign = 'left';
      ctx.fillText(design.titleMark ?? '™', cx + tw / 2 + 6, Y(0.645) - tSize * 0.05);
    }, { fill: design.titleFill ?? ink, raise: 0.25 });
    // losangos laterais na altura do título
    L.el((ctx, s) => {
      ctx.fillStyle = s;
      for (const x of [W * 0.208, W * 0.792]) {
        ctx.beginPath();
        ctx.moveTo(x, Y(0.565) - 14);
        ctx.lineTo(x + 10, Y(0.565));
        ctx.lineTo(x, Y(0.565) + 14);
        ctx.lineTo(x - 10, Y(0.565));
        ctx.closePath();
        ctx.fill();
      }
    }, { fill: foil, raise: 0.3 });
  }

  // "ORIGINAL RECIPE"
  if (design.kicker) {
    L.el((ctx, s) => {
      ctx.font = '700 46px "Old Standard TT", serif';
      ctx.fillStyle = s;
      ctx.textBaseline = 'alphabetic';
      spacedText(ctx, design.kicker, cx, Y(0.712), 7);
    }, { fill: foil, raise: 0.3 });
  }

  // descrição + teor alcoólico
  L.el((ctx, s) => {
    ctx.fillStyle = s;
    ctx.textBaseline = 'alphabetic';
    let y = Y(0.772);
    for (const line of design.lines ?? []) {
      ctx.save();
      ctx.translate(cx, y);
      ctx.scale(0.86, 1);
      const size = fitFont(ctx, line, '"Old Standard TT", serif', 700, 44, (W * 0.56) / 0.86, 0.02);
      ctx.font = `700 ${size}px "Old Standard TT", serif`;
      spacedText(ctx, line, 0, 0, size * 0.02);
      ctx.restore();
      y += Y(0.0275);
    }
    ctx.font = '500 40px "Oswald", sans-serif';
    spacedText(ctx, `${design.abv}  ${volumeText}`.toUpperCase(), cx, y + Y(0.012), 3);
  }, { fill: design.smallInk ?? ink, raise: 0.12 });

  return L.textures();
}

/* ---------- colarinho (gargalo) ---------- */

/*
 * Envolve todo o gargalo (perímetro médio ≈ 10,7 cm × 4,1 cm de altura). O centro do canvas é a
 * frente da garrafa. Faixa dourada larga no topo, filetes finos e, na frente, marca + ícone +
 * "Tennessee BLACKBERRY".
 */
export function paintNeckLabel(design, { width = 2048, height = 786 } = {}) {
  const L = new LabelCanvas(width, height, { base: design.neckBg ?? design.bg[0] });
  const { c } = L;
  const W = width;
  const H = height;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, design.bg[1]);
  g.addColorStop(0.45, design.neckBg ?? design.bg[0]);
  g.addColorStop(1, design.bg[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const foil = design.foil ?? 'gold';
  const ink = design.neckInk ?? design.ink;
  L.el((ctx, s) => {
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, W, H * 0.055);
    ctx.fillRect(0, H * 0.1, W, H * 0.018);
    ctx.fillRect(0, H * 0.905, W, H * 0.02);
  }, { fill: foil, raise: 0.3 });

  const wm = design.wordmark ?? "JACK DANIEL'S";
  const drawSet = (ctx, s, x, k = 1) => {
    // marca em arco (~24% da circunferência)
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(0.68 * k, k);
    let size = 160;
    do {
      ctx.font = `900 ${size}px "Playfair Display", serif`;
      size -= 4;
    } while (ctx.measureText(wm).width * 0.68 > W * 0.25 && size > 40);
    ctx.fillStyle = s;
    arcText(ctx, wm, 0, (H * 0.44) / k, 1400, size * 0.02);
    ctx.restore();
    ctx.fillStyle = s;
    // "Tennessee BLACKBERRY" (~39% da circunferência)
    const line = design.neckTitle ?? design.title ?? '';
    const script = design.neckScript ?? design.script ?? '';
    ctx.textBaseline = 'alphabetic';
    let f = 1;
    const measure = () => {
      ctx.font = `400 ${84 * f * k}px "Petit Formal Script", cursive`;
      const sw = ctx.measureText(script).width;
      ctx.font = `700 ${60 * f * k}px "Old Standard TT", serif`;
      const tw = ctx.measureText(line).width + line.length * 6 * k;
      return [sw, tw, sw + 24 * k + tw];
    };
    let [sw, tw, total] = measure();
    while (total > W * 0.39 * k && f > 0.4) {
      f -= 0.04;
      [sw, tw, total] = measure();
    }
    let x0 = x - total / 2;
    ctx.textAlign = 'left';
    ctx.font = `400 ${84 * f * k}px "Petit Formal Script", cursive`;
    ctx.fillText(script, x0, H * 0.745);
    x0 += sw + 24 * k;
    ctx.font = `700 ${60 * f * k}px "Old Standard TT", serif`;
    spacedText(ctx, line, x0 + tw / 2, H * 0.745, 6 * k);
    ctx.textAlign = 'center';
  };
  L.el((ctx, s) => {
    drawSet(ctx, s, W / 2);
    drawSet(ctx, s, 0, 0.9); // costas (atravessa a emenda)
    drawSet(ctx, s, W, 0.9);
  }, { fill: ink, raise: 0.25 });
  L.el((ctx, s, k) => {
    ctx.fillStyle = s;
    ctx.strokeStyle = s;
    if (design.icon === 'blackberry') {
      blackberryCrest(ctx, W / 2, H * 0.56, 120);
    } else if (ICONS[design.icon]) {
      ICONS[design.icon](ctx, W / 2, H * 0.56, 100, s, k);
    }
  }, { fill: design.iconFill ?? foil, raise: 0.35, knock: design.neckBg ?? design.bg[0] });
  return L.textures();
}

/* ---------- contra-rótulo ---------- */

export function paintBackLabel(design, product, volumeText, { width = 1100, height = 1300 } = {}) {
  const L = new LabelCanvas(width, height, { base: design.backBg ?? '#efe6d2', paperRoughness: 0.7 });
  const { c } = L;
  const W = width;
  const H = height;
  c.fillStyle = design.backBg ?? '#efe6d2';
  c.fillRect(0, 0, W, H);
  const ink = design.backInk ?? '#1d1a17';
  L.el((ctx, s) => { ctx.strokeStyle = s; frame(ctx, W, H, 30, 4, 24); }, { fill: ink, raise: 0.1 });
  L.el((ctx, s) => {
    ctx.fillStyle = s;
    ctx.textAlign = 'center';
    ctx.font = '400 86px "Rye", serif';
    ctx.fillText(design.wordmark ?? "JACK DANIEL'S", W / 2, 170);
    ctx.font = '700 44px "Cinzel", serif';
    ctx.fillText(product.name.replace(/^Jack Daniel's\s*/i, '').toUpperCase(), W / 2, 250);
    ctx.font = '400 36px "Old Standard TT", serif';
    const text = product.backLabel ?? product.tagline ?? '';
    wrap(ctx, text, W / 2, 340, W - 180, 50);
    ctx.font = '700 34px "Old Standard TT", serif';
    ctx.fillText(`${product.abv}% vol · ${volumeText}`, W / 2, H - 300);
    ctx.font = '400 30px "Old Standard TT", serif';
    ctx.fillText(product.origin ?? '', W / 2, H - 250);
    ctx.font = '700 32px "Cinzel", serif';
    ctx.fillText('BEBA COM MODERAÇÃO', W / 2, H - 150);
    ctx.font = '400 26px "Old Standard TT", serif';
    ctx.fillText('Venda proibida para menores de 18 anos', W / 2, H - 105);
  }, { fill: ink, raise: 0.1 });
  return L.textures();
}

/* ---------- arte oficial (opcional) ---------- */

export async function loadLabelImage(url) {
  const tex = await new THREE.TextureLoader().loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { map: tex, orm: null, bump: null, canvas: tex.image };
}

/* ---------- helpers ---------- */

function wrap(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

export function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
