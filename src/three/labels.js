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

/* ---------- rótulo frontal ---------- */

export function paintFrontLabel(design, volumeText, { width = 1400, height = 1780 } = {}) {
  const L = new LabelCanvas(width, height, { base: design.bg[0] });
  const { c } = L;
  const W = width;
  const H = height;
  const cx = W / 2;
  const foil = design.foil ?? 'gold';
  const ink = design.ink;

  // Fundo com gradiente radial e textura de papel
  const g = c.createRadialGradient(cx, H * 0.42, 40, cx, H * 0.5, H * 0.75);
  g.addColorStop(0, design.bg[0]);
  g.addColorStop(1, design.bg[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const rnd = mulberry32(7);
  c.globalAlpha = design.paperGrain ?? 0.05;
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = rnd() > 0.5 ? '#fff' : '#000';
    c.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  c.globalAlpha = 1;

  // Molduras
  L.el((ctx, s) => { ctx.strokeStyle = s; frame(ctx, W, H, 26, 9, 40); }, { fill: foil, raise: 0.3 });
  L.el((ctx, s) => { ctx.strokeStyle = s; frame(ctx, W, H, 50, 3, 26); }, { fill: foil, raise: 0.2 });

  // Faixas laterais com texto vertical
  const bandL = 64;
  const bandR = W - 64;
  L.el((ctx, s) => {
    ctx.strokeStyle = s;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bandL + 62, 190);
    ctx.lineTo(bandL + 62, H - 190);
    ctx.moveTo(bandR - 62, 190);
    ctx.lineTo(bandR - 62, H - 190);
    ctx.stroke();
  }, { fill: foil, raise: 0.15 });
  L.el((ctx, s) => {
    ctx.fillStyle = s;
    ctx.font = '700 34px "Old Standard TT", serif';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(bandL + 31, H / 2);
    ctx.rotate(Math.PI / 2);
    spacedText(ctx, design.sideLeft ?? 'JACK DANIEL DISTILLERY', 0, 0, 10);
    ctx.restore();
    ctx.save();
    ctx.translate(bandR - 31, H / 2);
    ctx.rotate(-Math.PI / 2);
    spacedText(ctx, design.sideRight ?? 'QUALITY & CRAFTSMANSHIP', 0, 0, 10);
    ctx.restore();
  }, { fill: design.sideInk ?? ink, raise: 0.12 });

  // Filigrana superior
  L.el((ctx, s) => { ctx.strokeStyle = s; ctx.fillStyle = s; filigree(ctx, cx, 150, 760, 5); }, { fill: foil, raise: 0.25 });

  // Marca em arco
  const wm = design.wordmark ?? "JACK DANIEL'S";
  const wmSize = fitFont(c, wm, '"Rye", serif', 400, 168, 1000, 0.02);
  L.el((ctx, s) => {
    ctx.font = `400 ${wmSize}px "Rye", serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    if (design.wordmarkStroke) {
      ctx.strokeStyle = design.wordmarkStroke;
      ctx.lineWidth = 14;
      arcText(ctx, wm, cx, 360, 1500, wmSize * 0.02, 'stroke');
    }
    ctx.fillStyle = s;
    arcText(ctx, wm, cx, 360, 1500, wmSize * 0.02, 'fill');
  }, { fill: design.wordmarkFill ?? ink, raise: 0.3 });

  // Ícone com arabescos
  const iconY = 560;
  L.el((ctx, s, k) => {
    ctx.strokeStyle = s;
    ctx.fillStyle = s;
    scroll(ctx, cx - 120, iconY + 10, 300, -1, 5);
    scroll(ctx, cx + 120, iconY + 10, 300, 1, 5);
    const icon = ICONS[design.icon];
    if (icon) icon(ctx, cx, iconY, 150, s, k);
  }, { fill: design.iconFill ?? foil, raise: 0.35, knock: design.bg[0] });

  // Script (ex.: "Tennessee" / "Old No. 7")
  if (design.script) {
    const sSize = fitFont(c, design.script, '"Great Vibes", cursive', 400, design.scriptSize ?? 220, 900);
    L.el((ctx, s) => {
      ctx.font = `400 ${sSize}px "Great Vibes", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = s;
      ctx.fillText(design.script, cx, 850);
    }, { fill: design.scriptFill ?? ink, raise: 0.25 });
  }

  // Título em versais (ex.: "BLACKBERRY")
  if (design.title) {
    const tSize = fitFont(c, design.title, '"Old Standard TT", serif', 700, 150, 980, 0.06);
    L.el((ctx, s) => {
      ctx.font = `700 ${tSize}px "Old Standard TT", serif`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = s;
      const tw = spacedText(ctx, design.title, cx, 1010, tSize * 0.06);
      ctx.font = `700 ${tSize * 0.28}px "Old Standard TT", serif`;
      ctx.textAlign = 'left';
      ctx.fillText('®', cx + tw / 2 + 6, 1010 - tSize * 0.62);
    }, { fill: design.titleFill ?? ink, raise: 0.25 });
  }

  // Kicker (ex.: "ORIGINAL RECIPE")
  if (design.kicker) {
    L.el((ctx, s) => {
      ctx.font = '700 52px "Cinzel", serif';
      ctx.fillStyle = s;
      ctx.strokeStyle = s;
      ctx.lineWidth = 3;
      const tw = spacedText(ctx, design.kicker, cx, 1125, 8);
      ctx.beginPath();
      ctx.moveTo(cx - tw / 2 - 150, 1108);
      ctx.lineTo(cx - tw / 2 - 30, 1108);
      ctx.moveTo(cx + tw / 2 + 30, 1108);
      ctx.lineTo(cx + tw / 2 + 150, 1108);
      ctx.stroke();
    }, { fill: foil, raise: 0.3 });
  }

  // Linhas descritivas
  L.el((ctx, s) => {
    ctx.fillStyle = s;
    ctx.textBaseline = 'alphabetic';
    let y = 1220;
    for (const line of design.lines ?? []) {
      const size = fitFont(ctx, line, '"Old Standard TT", serif', 700, 46, 860, 0.08);
      ctx.font = `700 ${size}px "Old Standard TT", serif`;
      spacedText(ctx, line, cx, y, size * 0.08);
      y += 62;
    }
    ctx.font = '400 50px "Old Standard TT", serif';
    spacedText(ctx, `${design.abv}  ${volumeText}`, cx, y + 40, 2);
  }, { fill: design.smallInk ?? ink, raise: 0.12 });

  // Filigrana inferior + cartucho
  L.el((ctx, s) => {
    ctx.strokeStyle = s;
    ctx.fillStyle = s;
    filigree(ctx, cx, H - 175, 700, 5);
    ctx.font = '700 30px "Cinzel", serif';
    spacedText(ctx, design.footer ?? 'LYNCHBURG · TENNESSEE', cx, H - 92, 8);
  }, { fill: foil, raise: 0.25 });

  return L.textures();
}

/* ---------- colarinho (gargalo) ---------- */

export function paintNeckLabel(design, { width = 2048, height = 830 } = {}) {
  // proporção ≈ perímetro coberto (≈8,2 cm) / altura (≈3,3 cm) para não distorcer
  const L = new LabelCanvas(width, height, { base: design.neckBg ?? design.bg[0] });
  const { c } = L;
  const W = width;
  const H = height;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, design.neckBg ?? design.bg[1]);
  g.addColorStop(0.5, design.bg[0]);
  g.addColorStop(1, design.neckBg ?? design.bg[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const foil = design.foil ?? 'gold';
  const ink = design.neckInk ?? design.ink;
  L.el((ctx, s) => {
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, W, 54);
    ctx.fillRect(0, H - 54, W, 54);
    ctx.fillRect(0, 78, W, 8);
    ctx.fillRect(0, H - 86, W, 8);
  }, { fill: foil, raise: 0.3 });

  const cx = W / 2;
  const wm = design.wordmark ?? "JACK DANIEL'S";
  L.el((ctx, s) => {
    ctx.fillStyle = s;
    ctx.textAlign = 'center';
    const wmSize = fitFont(ctx, wm, '"Rye", serif', 400, 120, 760, 0.03);
    ctx.font = `400 ${wmSize}px "Rye", serif`;
    arcText(ctx, wm, cx, 270, 1400, wmSize * 0.03);
    const script = design.neckScript ?? design.script ?? '';
    const sSize = fitFont(ctx, script, '"Great Vibes", cursive', 400, 150, 640);
    ctx.font = `400 ${sSize}px "Great Vibes", cursive`;
    ctx.fillText(script, cx, 480);
    const title = design.neckTitle ?? design.title ?? '';
    const tSize = fitFont(ctx, title, '"Old Standard TT", serif', 700, 92, 700, 0.12);
    ctx.font = `700 ${tSize}px "Old Standard TT", serif`;
    spacedText(ctx, title, cx, 640, tSize * 0.12);
    // laterais (visíveis quando a garrafa gira)
    ctx.font = '400 64px "Rye", serif';
    for (const x of [W * 0.1, W * 0.9]) {
      const sz = fitFont(ctx, wm, '"Rye", serif', 400, 64, 330);
      ctx.font = `400 ${sz}px "Rye", serif`;
      ctx.fillText(wm, x, H / 2 + sz * 0.35);
    }
  }, { fill: ink, raise: 0.25 });
  if (ICONS[design.icon]) {
    L.el((ctx, s, k) => {
      ctx.fillStyle = s;
      ctx.strokeStyle = s;
      ICONS[design.icon](ctx, cx - 560, H / 2 + 10, 230, s, k);
      ICONS[design.icon](ctx, cx + 560, H / 2 + 10, 230, s, k);
    }, { fill: design.iconFill ?? foil, raise: 0.35, knock: design.bg[0] });
  }
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
