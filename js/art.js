/* Weasel — estilos de arte (art pixel, art ascii…): o desenho pronto é pintado de outro jeito.
   O desenho vai primeiro numa imagem de trabalho, e o estilo lê essa imagem em células. A grade fica
   presa à origem do canvas (ou do quadro do filme): recortes, escalas e atores desenhados à parte caem
   sempre na mesma grade. */
(function (W) {
  'use strict';
  const G = W.geom;

  // paletas prontas do pixel art (palette=own usa as cores do próprio desenho)
  const PALETTES = {
    gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    nes: [
      '#7c7c7c', '#0000fc', '#0000bc', '#4428bc', '#940084', '#a80020', '#a81000', '#881400', '#503000', '#007800', '#006800', '#005800', '#004058', '#000000',
      '#bcbcbc', '#0078f8', '#0058f8', '#6844fc', '#d800cc', '#e40058', '#f83800', '#e45c10', '#ac7c00', '#00b800', '#00a800', '#00a844', '#008888',
      '#f8f8f8', '#3cbcfc', '#6888fc', '#9878f8', '#f878f8', '#f85898', '#f87858', '#fca044', '#f8b800', '#b8f818', '#58d854', '#58f898', '#00e8d8', '#787878',
      '#fcfcfc', '#a4e4fc', '#b8b8f8', '#d8b8f8', '#f8b8f8', '#f8a4c0', '#f0d0b0', '#fce0a8', '#f8d878', '#d8f878', '#b8f8b8', '#b8f8d8', '#00fcfc', '#f8d8f8',
    ],
    pico8: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'],
    mono: ['#000000', '#ffffff'],
  };
  // pontilhado ordenado de Bayer 4×4: o limite de cada célula, de 0 a 1
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const FONT = 'Consolas, "DejaVu Sans Mono", Menlo, "Courier New", monospace';

  // o desenho tem art? (num filme: o do filme, de um plano, de um ator ou de uma cena)
  const has = (model) => !!(model && (model.art || (model.film && model.film.hasArt)));

  // ---------- cores ----------
  const rgbOf = (c) => { const p = G.parseHex(c); return p ? [p[0], p[1], p[2]] : null; };
  const lum = (c) => (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
  // a cor em Lab (CIE, branco D65): a distância entre duas cores em Lab é parecida com a diferença que o
  // olho vê (no RGB, um azul-escuro fica "perto" de um verde-escuro)
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  function lab(r, g, b) {
    const R = lin(r), Gc = lin(g), B = lin(b);
    const x = fLab((R * 0.4124 + Gc * 0.3576 + B * 0.1805) / 0.95047);
    const y = fLab(R * 0.2126 + Gc * 0.7152 + B * 0.0722);
    const z = fLab((R * 0.0193 + Gc * 0.1192 + B * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  const dLab = (p, q) => { const a = p[0] - q[0], b = p[1] - q[1], c = p[2] - q[2]; return a * a + b * b + c * c; };
  // índice de 6 bits por canal (a cor do meio de cada faixa é a que conta: o resultado não depende da ordem)
  const key6 = (r, g, b) => ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
  const mid6 = (k) => [((k >> 12) << 2) + 2, (((k >> 6) & 63) << 2) + 2, ((k & 63) << 2) + 2];
  // todas as cores do desenho (palette, formas, gradientes, padrões e fundo): a palette "own" do pixel art
  const colorCache = new WeakMap();
  function modelColors(m) {
    if (colorCache.has(m)) return colorCache.get(m);
    const out = new Map();
    const add = (c) => {
      if (typeof c === 'string') { const p = c[0] === '#' ? rgbOf(c) : null; if (p) out.set(p.join(','), p); } else if (c && typeof c === 'object') {
        if (c.kind === 'grad') for (const s of c.stops) add(s.c);
        else if (c.kind === 'pat') { add(c.c); add(c.bg); }
      }
    };
    for (const v of m.palette.values()) add(v);
    add(m.canvas.bg);
    for (const g of m.gradients.values()) add(g);
    for (const p of m.patterns.values()) add(p);
    for (const el of m.elements) for (const k in el) { const v = el[k]; if (typeof v === 'string' || (v && (v.kind === 'grad' || v.kind === 'pat'))) add(v); }
    const list = [...out.values()];
    colorCache.set(m, list);
    return list;
  }
  // extra: outras cores que entram na palette own (o branco ou o matte de quem exporta sem fundo e opaco)
  function colorsOf(models, extra) {
    const out = new Map();
    for (const m of models) if (m) for (const p of modelColors(m)) out.set(p.join(','), p);
    if (extra) for (const c of extra) { const p = rgbOf(c); if (p) out.set(p.join(','), p); }
    return [...out.values()].slice(0, 256);
  }
  // a cor do papel: o fundo do canvas (o primeiro tom, se for gradiente); sem fundo, branco
  function paperOf(model) {
    const bg = model.canvas.bg;
    if (!bg) return '#ffffff';
    if (typeof bg === 'string') return rgbOf(bg) ? bg : '#ffffff';
    return bg.stops && rgbOf(bg.stops[0].c) ? bg.stops[0].c : '#ffffff';
  }

  // palette com a cor mais parecida já calculada (por 6 bits de cada canal)
  const palCache = new Map();
  function palOf(list) {
    if (!list || !list.length) return null;
    const key = list.map((p) => p.join(',')).join(';');
    let P = palCache.get(key);
    if (P) return P;
    if (palCache.size > 16) palCache.clear();
    P = { rgb: list, lab: list.map((p) => lab(p[0], p[1], p[2])), near: new Int16Array(1 << 18).fill(-1) };
    palCache.set(key, P);
    return P;
  }
  const dist = (p, r, g, b) => { const dr = p[0] - r, dg = p[1] - g, db = p[2] - b; return dr * dr * 3 + dg * dg * 4 + db * db * 2; };
  // a cor da palette mais parecida (em Lab); skip: um índice que não vale (a segunda mais parecida)
  function closest(P, L, skip) {
    let v = -1, bd = Infinity;
    for (let i = 0; i < P.lab.length; i++) { if (i === skip) continue; const d = dLab(P.lab[i], L); if (d < bd) { bd = d; v = i; } }
    return v;
  }
  function nearest(P, r, g, b) {
    const k = key6(r, g, b);
    let v = P.near[k];
    if (v >= 0) return v;
    const m = mid6(k);
    v = closest(P, lab(m[0], m[1], m[2]), -1);
    P.near[k] = v;
    return v;
  }
  // o quanto cada cor se afasta do papel (Lab, de 0 a 1), guardado por 6 bits de cada canal
  const awayCache = new Map();
  function awayOf(paper) {
    const id = paper.join(',');
    let A = awayCache.get(id);
    if (A) return A;
    if (awayCache.size > 8) awayCache.clear();
    const Lp = lab(paper[0], paper[1], paper[2]);
    // a maior distância possível: até o preto ou até o branco
    const span = Math.sqrt(Math.max(dLab(Lp, [0, 0, 0]), dLab(Lp, [100, 0, 0]))) || 1;
    A = { Lp, span, t: new Float32Array(1 << 18).fill(-1) };
    awayCache.set(id, A);
    return A;
  }
  function away(A, r, g, b) {
    const k = key6(r, g, b);
    let v = A.t[k];
    if (v >= 0) return v;
    const m = mid6(k);
    v = Math.min(1, Math.sqrt(dLab(lab(m[0], m[1], m[2]), A.Lp)) / A.span);
    A.t[k] = v;
    return v;
  }

  // ---------- telas de trabalho ----------
  const pool = new Map();
  function work(name, w, h) {
    let c = pool.get(name);
    if (!c) { c = document.createElement('canvas'); pool.set(name, c); }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, w, h);
    return { canvas: c, ctx: x };
  }
  const setMat = (x, m) => x.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

  // ---------- pixel art ----------
  // Cada bloco size×size fica com a cor que mais aparece nele (depois de trocar cada ponto pela cor mais
  // parecida da palette); o contorno ganha quando cobre um quarto do bloco, para não sumir.
  function pixelPaint(ctx, base, g, img, mask, art, info) {
    const own = art.palette === 'own';
    const P = palOf(own ? info.colors() : PALETTES[art.palette].map(rgbOf));
    // info.ink: a tinta, ou a lista das tintas (no filme, a de cada arquivo); a primeira pinta o outline
    const inks = [].concat(info.ink || []).map(rgbOf).filter(Boolean);
    const inkRGB = inks[0] || [20, 20, 28];
    const inkOut = P ? P.rgb[nearest(P, inkRGB[0], inkRGB[1], inkRGB[2])] : inkRGB;
    // tinta: o ponto cuja cor mais parecida, entre as cores do próprio desenho, é a ink (um céu escuro
    // perto da tinta não vira contorno)
    const O = own ? P : palOf(info.colors());
    const inkSet = new Set(O ? inks.map((c) => nearest(O, c[0], c[1], c[2])) : []);
    const isInk = (k, r, gg, b) => (O ? inkSet.has(O === P ? k : nearest(O, r, gg, b)) : dist(inkRGB, r, gg, b) < 1300);
    const { gw, gh, sx, sy, Wd } = g, cells = gw * gh;
    const K = P ? P.rgb.length : 4096;
    const cnt = new Int32Array(K), sr = new Float64Array(K), sg = new Float64Array(K), sb = new Float64Array(K);
    const used = [];
    const out = new Uint8ClampedArray(cells * 4), inside = new Uint8Array(cells);
    // por bloco: 0 vazio, 1 contorno, 2 cor; a cor que ganhou e a média dos pontos dela
    const kind = new Uint8Array(cells), win = new Int32Array(cells), mean = new Float32Array(cells * 3);
    const put = (o, c) => { out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; };
    for (let by = 0; by < gh; by++) {
      for (let bx = 0; bx < gw; bx++) {
        let tN = 0, inkN = 0, inN = 0;
        used.length = 0;
        // só a parte do bloco que fica dentro do recorte (na borda do canvas, o bloco passa dela)
        const xA = Math.max(bx * sx, g.ix0), xB = Math.min(bx * sx + sx, g.ix1), yA = Math.max(by * sy, g.iy0), yB = Math.min(by * sy + sy, g.iy1);
        const total = Math.max(1, (xB - xA) * (yB - yA));
        for (let y = yA; y < yB; y++) {
          let i = (y * Wd + xA) * 4;
          for (let x = xA; x < xB; x++, i += 4) {
            if (mask && mask[i + 3] >= 128) inN++;
            if (img[i + 3] < 128) { tN++; continue; }
            const r = img[i], gg = img[i + 1], b = img[i + 2];
            const k = P ? nearest(P, r, gg, b) : ((r >> 4) << 8) | ((gg >> 4) << 4) | (b >> 4);
            if (isInk(k, r, gg, b)) inkN++;
            if (!cnt[k]) used.push(k);
            cnt[k]++;
            sr[k] += r; sg[k] += gg; sb[k] += b;
          }
        }
        let best = -1, bn = 0;
        for (const k of used) if (cnt[k] > bn) { bn = cnt[k]; best = k; }
        const c = by * gw + bx;
        if (inkN * 4 >= total) { kind[c] = 1; inside[c] = 1; } else if (best >= 0 && tN <= bn) {
          kind[c] = 2;
          win[c] = best;
          mean[c * 3] = sr[best] / bn; mean[c * 3 + 1] = sg[best] / bn; mean[c * 3 + 2] = sb[best] / bn;
          inside[c] = mask ? (inN * 2 > total ? 1 : 0) : 1;
        } else inside[c] = mask ? (inN * 2 > total ? 1 : 0) : 0;
        for (const k of used) { cnt[k] = 0; sr[k] = sg[k] = sb[k] = 0; }
      }
    }
    // a cor de cada bloco. Pontilhado (dither=bayer): a média fica entre a cor do bloco e a segunda mais
    // parecida da palette. Com 3 cores ou mais, só onde a cor muda aos poucos (degradê, luz): o que é liso
    // fica liso. Com 2 cores (mono), em tudo, como no 1 bit.
    const all = P && P.rgb.length <= 2;
    const smooth = (c, bx, by) => {
      if (all) return true;
      for (const [n, ok] of [[c - 1, bx > 0], [c + 1, bx < gw - 1], [c - gw, by > 0], [c + gw, by < gh - 1]]) {
        if (!ok || kind[n] !== 2) continue;
        const d = Math.max(Math.abs(mean[c * 3] - mean[n * 3]), Math.abs(mean[c * 3 + 1] - mean[n * 3 + 1]), Math.abs(mean[c * 3 + 2] - mean[n * 3 + 2]));
        if (d > 2 && d < 48) return true;
      }
      return false;
    };
    for (let by = 0; by < gh; by++) {
      for (let bx = 0; bx < gw; bx++) {
        const c = by * gw + bx, o = c * 4;
        if (kind[c] === 1) { put(o, inkOut); continue; }
        if (kind[c] !== 2) continue;
        const mr = mean[c * 3], mg = mean[c * 3 + 1], mb = mean[c * 3 + 2], best = win[c];
        if (!P) { put(o, [mr, mg, mb]); continue; }
        const c1 = P.rgb[best];
        if (!art.dither || !smooth(c, bx, by)) { put(o, c1); continue; }
        const j2 = closest(P, lab(mr, mg, mb), best), c2 = j2 >= 0 ? P.rgb[j2] : null;
        let pick = c1;
        if (c2) {
          const vr = c2[0] - c1[0], vg = c2[1] - c1[1], vb = c2[2] - c1[2], vv = vr * vr + vg * vg + vb * vb;
          const t = vv ? ((mr - c1[0]) * vr + (mg - c1[1]) * vg + (mb - c1[2]) * vb) / vv : 0;
          const gx = g.gx0 + bx, gy = g.gy0 + by;
          if (t > BAYER4[(((gy % 4) + 4) % 4) * 4 + (((gx % 4) + 4) % 4)]) pick = c2;
        }
        put(o, pick);
      }
    }
    // contorno de 1 pixel em volta da silhueta, feito depois de pixelar (a espessura é sempre a mesma)
    if (art.outline) {
      for (let by = 0; by < gh; by++) {
        for (let bx = 0; bx < gw; bx++) {
          const c = by * gw + bx;
          if (inside[c]) continue;
          if ((bx > 0 && inside[c - 1]) || (bx < gw - 1 && inside[c + 1]) || (by > 0 && inside[c - gw]) || (by < gh - 1 && inside[c + gw])) put(c * 4, inkOut);
        }
      }
    }
    const sm = work('art_small', gw, gh);
    const id = sm.ctx.createImageData(gw, gh);
    id.data.set(out);
    sm.ctx.putImageData(id, 0, 0);
    ctx.save();
    setMat(ctx, base);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sm.canvas, g.gx0 * g.cw, g.gy0 * g.ch, gw * g.cw, gh * g.ch);
    ctx.restore();
    return {};
  }

  // ---------- ASCII ----------
  // Cada célula vira uma letra, pelo quanto ela se afasta da cor do papel (o fundo): perto do papel, espaço.
  function asciiPaint(ctx, base, g, img, mask, art, info) {
    const chars = [...art.chars], n = chars.length;
    const paper = (info.paper && rgbOf(info.paper)) || [255, 255, 255];
    const A = awayOf(paper);
    const ink = lum(paper) < 0.5 ? '#f2f2f2' : [].concat(info.ink || [])[0] || '#14141c';
    const { gw, gh, sx, sy, Wd } = g;
    const lines = [], marks = [];
    for (let cy = 0; cy < gh; cy++) {
      let row = '';
      for (let cx = 0; cx < gw; cx++) {
        let sum = 0, cr = 0, cg = 0, cb = 0, cw = 0;
        // só a parte da célula que fica dentro do recorte
        const xA = Math.max(cx * sx, g.ix0), xB = Math.min(cx * sx + sx, g.ix1), yA = Math.max(cy * sy, g.iy0), yB = Math.min(cy * sy + sy, g.iy1);
        const total = Math.max(1, (xB - xA) * (yB - yA));
        for (let y = yA; y < yB; y++) {
          let i = (y * Wd + xA) * 4;
          for (let x = xA; x < xB; x++, i += 4) {
            const a = img[i + 3] / 255;
            if (!a) continue;
            const d = a * away(A, img[i], img[i + 1], img[i + 2]);
            sum += d;
            const w = a * (d + 0.02);
            cr += img[i] * w; cg += img[i + 1] * w; cb += img[i + 2] * w; cw += w;
          }
        }
        const ch = chars[Math.min(n - 1, Math.floor((sum / total) * n))];
        row += ch;
        if (ch !== ' ') marks.push({ cx, cy, ch, c: art.color && cw ? `rgb(${Math.round(cr / cw)},${Math.round(cg / cw)},${Math.round(cb / cw)})` : ink });
      }
      lines.push(row.replace(/\s+$/, ''));
    }
    ctx.save();
    setMat(ctx, base);
    // o papel só é pintado quando há fundo (sem fundo, ele só serve de referência para o escuro e a tinta)
    if (info.paper && g.fill) { ctx.fillStyle = info.paper; ctx.fillRect(g.gx0 * g.cw, g.gy0 * g.ch, gw * g.cw, gh * g.ch); }
    ctx.font = `${Math.min(g.ch, g.cw / 0.6)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const k of marks) {
      ctx.fillStyle = k.c;
      ctx.fillText(k.ch, (g.gx0 + k.cx + 0.5) * g.cw, (g.gy0 + k.cy + 0.5) * g.ch);
    }
    ctx.restore();
    return { text: lines.join('\n') + '\n' };
  }

  // cell: o tamanho da célula (unidades do canvas); ws: pontos da imagem de trabalho por unidade
  const STYLES = {
    pixel: { cell: (a) => [a.size, a.size], ws: (a) => (a.size >= 4 ? 1 : Math.ceil(4 / a.size)), paint: pixelPaint },
    ascii: { cell: (a) => a.cell, ws: (a) => (Math.min(a.cell[0], a.cell[1]) >= 4 ? 1 : 2), paint: asciiPaint },
  };
  const heavy = (art) => !!(art && STYLES[art.style] && STYLES[art.style].heavy);

  // Pinta a região rect (unidades do desenho) no ctx com o estilo. base: desenho → pixels do ctx.
  // src.content(x, m) desenha o desenho (fundo transparente) com a transformação m; src.bg(x, m), o fundo
  // (null = sem fundo). info = { colors(): cores da palette own, ink, paper: a cor do papel (a referência do
  // ascii, mesmo sem fundo; null = branco) }.
  // Devolve { text } no ASCII.
  function paint(ctx, base, rect, art, src, info) {
    const S = STYLES[art.style];
    if (!S) return {};
    const cell = S.cell(art), ws = S.ws(art);
    const gx0 = Math.floor(rect.x / cell[0] + 1e-9), gy0 = Math.floor(rect.y / cell[1] + 1e-9);
    const gw = Math.max(1, Math.ceil((rect.x + rect.w) / cell[0] - 1e-9) - gx0), gh = Math.max(1, Math.ceil((rect.y + rect.h) / cell[1] - 1e-9) - gy0);
    const sx = Math.max(1, Math.round(cell[0] * ws)), sy = Math.max(1, Math.round(cell[1] * ws));
    const Wd = gw * sx, Hd = gh * sy;
    const m = [sx / cell[0], 0, 0, sy / cell[1], -gx0 * sx, -gy0 * sy];
    // o recorte na imagem de trabalho: as células da borda só contam os pontos de dentro dele
    const ix0 = Math.max(0, Math.round(rect.x * m[0] + m[4])), iy0 = Math.max(0, Math.round(rect.y * m[3] + m[5]));
    const ix1 = Math.min(Wd, Math.round((rect.x + rect.w) * m[0] + m[4])), iy1 = Math.min(Hd, Math.round((rect.y + rect.h) * m[3] + m[5]));
    const C = work('art_content', Wd, Hd);
    src.content(C.ctx, m);
    let img, mask = null;
    if (src.bg) {
      mask = C.ctx.getImageData(0, 0, Wd, Hd).data;
      const B = work('art_bg', Wd, Hd);
      src.bg(B.ctx, m);
      B.ctx.setTransform(1, 0, 0, 1, 0, 0);
      B.ctx.drawImage(C.canvas, 0, 0);
      img = B.ctx.getImageData(0, 0, Wd, Hd).data;
    } else img = C.ctx.getImageData(0, 0, Wd, Hd).data;
    return S.paint(ctx, base, { gx0, gy0, gw, gh, sx, sy, Wd, Hd, cw: cell[0], ch: cell[1], fill: !!src.bg, ix0, iy0, ix1, iy1 }, img, mask, art, info) || {};
  }

  // ---------- jogo ----------
  // art pixel … small: a sprite sheet e o Godot saem com 1 pixel por bloco (com escala 2, 2 pixels)
  const small = (model) => !!(model && model.art && model.art.style === 'pixel' && model.art.small);
  const smallScale = (model, scale) => (small(model) ? Math.max(1, Math.round(scale || 1)) / model.art.size : scale);
  function snapRect(model, rect) {
    if (!small(model)) return rect;
    const n = model.art.size, x = Math.floor(rect.x / n) * n, y = Math.floor(rect.y / n) * n;
    return { x, y, w: Math.ceil((rect.x + rect.w) / n) * n - x, h: Math.ceil((rect.y + rect.h) / n) * n - y };
  }
  // o pixel art pede o filtro nearest no Godot (sem ele, o Godot suaviza e borra os pixels)
  const crisp = (model) => !!(model && model.art && model.art.style === 'pixel');

  // o art em texto, como se escreve (para o --info): "pixel size=8 palette=gameboy outline"
  function describe(a) {
    if (!a) return '';
    const p = [a.style];
    if (a.style === 'pixel') {
      p.push(`size=${a.size}`);
      if (a.palette !== 'own') p.push(`palette=${a.palette}`);
      if (a.dither) p.push(`dither=${a.dither}`);
      if (a.outline) p.push('outline');
      if (a.small) p.push('small');
    } else if (a.style === 'ascii') {
      p.push(`size=${a.cell.join(',')}`);
      if (a.chars !== ' .:-=+*#%@') p.push(`chars="${a.chars}"`);
      if (a.color) p.push('color');
    }
    if (a.boil) p.push(`boil=${a.boil}`);
    if (a.seed) p.push(`seed=${a.seed}`);
    return p.join(' ');
  }

  W.art = { has, paint, colorsOf, paperOf, heavy, small, smallScale, snapRect, crisp, describe, PALETTES, STYLES };
})(window.Weasel = window.Weasel || {});
