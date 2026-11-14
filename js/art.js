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

  // ---------- estilos de tom (toon, engraving, woodcut, halftone, comic, manga, riso, stencil, silhouette) ----------
  // Trabalham na resolução da saída: um ponto da imagem de trabalho por ponto da imagem final (de 1 a 4 pontos
  // por unidade do desenho; numa escala menor que 1, o resultado é reduzido com suavização). Cada um pede os
  // passes de que precisa (sem luz, sem contorno, textura presa à forma) e pinta a imagem final.
  const PAPER = '#f6f2ea', DARK = '#1c1a17', TAU = Math.PI * 2;
  const toneK = (scale) => Math.min(4, Math.max(1, scale || 1));
  const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const lum3 = (r, g, b) => (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  // levels=escuro,claro: o tom que vira preto (0) e o que vira papel (1)
  const levels = (t, L) => (L ? cl((t - L[0]) / (L[1] - L[0])) : t);
  const firstInk = (info) => [].concat(info.ink || []).find((c) => rgbOf(c)) || DARK;
  // número pseudoaleatório de 0 a 1 a partir de dois inteiros
  function rnd(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // a imagem de trabalho de volta na saída (suavizada: a grade de trabalho pode ser maior que a saída)
  function blit(ctx, base, g, canvas) {
    ctx.save();
    setMat(ctx, base);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, g.gx0 * g.cw, g.gy0 * g.ch, g.gw * g.cw, g.gh * g.ch);
    ctx.restore();
  }
  // o fundo numa imagem de trabalho (uma vez só; os passes são desenhados por cima de cópias dele)
  function bgShot(g, src, m) {
    const B = work('art_bg0', g.Wd, g.Hd);
    B.ctx.save();
    src.bg(B.ctx, m);
    B.ctx.restore();
    return B.canvas;
  }
  // o desenho (com um passe) numa imagem de trabalho, por cima do fundo (under) quando há fundo
  function shot(name, g, src, m, pass, under) {
    const C = work(name, g.Wd, g.Hd);
    if (under) C.ctx.drawImage(under, 0, 0);
    C.ctx.save();
    src.content(C.ctx, m, pass);
    C.ctx.restore();
    return C;
  }

  // A posição de cada ponto na textura (u, v, de 0 a P unidades), presa à forma: o passe tex desenha cada forma
  // com uma textura que guarda o cosseno e o seno de uma volta a cada P unidades (um passe para u, outro para
  // v). São funções suaves, sem emenda, então a suavização do canvas ao girar a textura com a forma não estraga
  // os valores. Com boil=screen, e onde não há forma (o fundo, os traços), a posição é a da tela.
  const TP = 128;
  const tiles = {};
  function coordTile(axis) {
    if (tiles[axis]) return tiles[axis];
    const n = 256, c = document.createElement('canvas');
    c.width = axis === 'u' ? n : 1;
    c.height = axis === 'u' ? 1 : n;
    const x = c.getContext('2d'), img = x.createImageData(c.width, c.height), D = img.data;
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * TAU;
      D[i * 4] = Math.round(127.5 + 127.5 * Math.cos(a));
      D[i * 4 + 1] = Math.round(127.5 + 127.5 * Math.sin(a));
      D[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    tiles[axis] = c;
    return c;
  }
  // boil= e seed=: o deslocamento da textura (muda a cada boil quadros; seed= dá outra versão)
  function texOff(art, info) {
    const step = typeof art.boil === 'number' && art.boil > 0 ? Math.floor((info.frame || 0) / art.boil) : 0;
    if (!art.seed && !step) return [0, 0];
    return [rnd(art.seed, step * 2 + 1) * TP, rnd(art.seed, step * 2 + 2) * TP];
  }
  // devolve uv(o, x, y): a posição [u, v] no ponto o (índice ×4) da imagem de trabalho, em (x, y) unidades
  function field(g, src, m, art, info) {
    const k = 1 / g.cw, off = texOff(art, info);
    let tu = null, tv = null;
    if (art.boil !== 'screen') {
      const pass = (name, axis) => {
        const X = work(name, g.Wd, g.Hd);
        X.ctx.save();
        src.content(X.ctx, m, { tex: { tile: coordTile(axis), d: 256 / TP, px: k, off } });
        X.ctx.restore();
        return X.ctx.getImageData(0, 0, g.Wd, g.Hd).data;
      };
      tu = pass('art_tu', 'u');
      tv = pass('art_tv', 'v');
    }
    const r = [0, 0];
    const ang = (c, sn) => { const a = Math.atan2(sn - 127.5, c - 127.5) / TAU; return (a < 0 ? a + 1 : a) * TP; };
    return (o, x, y) => {
      if (tu && tu[o + 3] >= 128) { r[0] = ang(tu[o], tu[o + 1]); r[1] = ang(tv[o], tv[o + 1]); } else { r[0] = x + off[0]; r[1] = y + off[1]; }
      return r;
    };
  }
  // a distância (de 0 a 0,5 volta) até o inteiro mais perto
  const tri = (p) => Math.abs(p - Math.round(p));
  // a cobertura de uma linha de largura w (pontos) a d pontos do meio dela
  const cover = (d, w) => (w <= 0 ? 0 : w >= 1 ? cl(w / 2 + 0.5 - d) : w * cl(1 - d));
  // ruído suave (um valor sorteado por célula, misturado entre as vizinhas) que se repete a cada per células;
  // salt: um ruído diferente para cada uso
  function noiseP(u, v, per, salt) {
    const i = Math.floor(u), j = Math.floor(v), fx = u - i, fy = v - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const w = (a) => ((a % per) + per) % per;
    const i0 = w(i) + salt * 4099, i1 = w(i + 1) + salt * 4099, j0 = w(j), j1 = w(j + 1);
    const a = rnd(i0, j0), b = rnd(i1, j0), c = rnd(i0, j1), d = rnd(i1, j1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  // o contorno: o quanto o desenho com ink (c) se aproxima da cor da ink (ik), saindo do desenho sem ink (n); as
  // cores contam por cima do papel (pp). Um valor de 0 a 1 por ponto.
  function edgeMap(c, n, ik, pp) {
    const E = new Float32Array(c.length >> 2);
    for (let o = 0, i = 0; o < c.length; o += 4, i++) {
      const ac = c[o + 3] / 255, an = n[o + 3] / 255;
      if (!ac && !an) continue;
      const nr = n[o] * an + pp[0] * (1 - an), ng = n[o + 1] * an + pp[1] * (1 - an), nb = n[o + 2] * an + pp[2] * (1 - an);
      const cr = c[o] * ac + pp[0] * (1 - ac), cg = c[o + 1] * ac + pp[1] * (1 - ac), cb = c[o + 2] * ac + pp[2] * (1 - ac);
      const ir = ik[0] - nr, ig = ik[1] - ng, ib = ik[2] - nb, ii = ir * ir + ig * ig + ib * ib;
      E[i] = ii > 300 ? cl(((cr - nr) * ir + (cg - ng) * ig + (cb - nb) * ib) / ii) : 0;
    }
    return E;
  }
  // uma retícula de pontos (sz unidades entre os pontos, deg graus) com números inteiros: ela se repete a cada TP
  // sem emenda (o ângulo e o tamanho ficam bem perto dos pedidos)
  function screenOf(deg, sz) {
    const r = (deg * Math.PI) / 180, a = Math.round((TP * Math.cos(r)) / sz), b = Math.round((TP * Math.sin(r)) / sz);
    return (u, v) => 0.5 + 0.25 * (Math.cos((TAU * (a * u + b * v)) / TP) + Math.cos((TAU * (-b * u + a * v)) / TP));
  }
  // o ponto da retícula com cobertura D0, de borda suavizada em fw; o quase branco fica papel e o quase preto
  // fica chapado (como na impressão)
  const dotOf = (fw) => (val, D0) => { const D = (D0 - 0.04) / 0.84; return D <= 0 ? 0 : D >= 1 ? 1 : cl((val - (1 - D)) / fw + 0.5); };
  // a luz em degraus (toon, HQs): a razão entre o desenho com luz (l) e sem luz (u) é arredondada em degraus de
  // log2 de tamanho 2/(steps-1); muito escuro sem luz, a razão não quer dizer nada (fica o desenho com luz)
  function stepLight(l, u, steps) {
    const step = 2 / (steps - 1);
    for (let o = 0; o < l.length; o += 4) {
      if (!l[o + 3]) continue;
      const lu = lum3(u[o], u[o + 1], u[o + 2]), ll = lum3(l[o], l[o + 1], l[o + 2]);
      if (lu < 0.06 || ll <= 0.001) continue;
      const rho = ll / lu, f = Math.pow(2, Math.round(Math.log2(rho) / step) * step) / rho;
      l[o] = Math.min(255, l[o] * f); l[o + 1] = Math.min(255, l[o + 1] * f); l[o + 2] = Math.min(255, l[o + 2] * f);
    }
  }
  // o registro torto (comic old, riso): o deslocamento, em pontos, na direção a (sorteada pelo seed=)
  const regDir = (art) => (art.seed ? rnd(art.seed, 7) * TAU : 0.6);
  const regOff = (art, k, a) => [Math.round(art.shift * k * Math.cos(a)), Math.round(art.shift * k * Math.sin(a))];

  // ---------- toon (cel shading) ----------
  // Cada forma ganha uma faixa de sombra dura, do lado oposto ao light= do canvas (shadow=: a largura, em
  // fração da forma). Com luzes, a luz vira degraus: a razão entre o desenho com luz e sem luz é arredondada
  // em degraus (steps=).
  function toonDraw(ctx, base, g, src, art, info, m) {
    const band = { toon: { shadow: art.shadow } };
    if (info.lit === false) {
      ctx.save();
      if (src.bg) src.bg(ctx, base);
      ctx.restore();
      ctx.save();
      src.content(ctx, base, band);
      ctx.restore();
      return {};
    }
    const B0 = src.bg ? bgShot(g, src, m) : null;
    const L = shot('art_c', g, src, m, band, B0), U = shot('art_u', g, src, m, { unlit: true, toon: band.toon }, B0);
    const li = L.ctx.getImageData(0, 0, g.Wd, g.Hd);
    stepLight(li.data, U.ctx.getImageData(0, 0, g.Wd, g.Hd).data, art.steps);
    L.ctx.putImageData(li, 0, 0);
    blit(ctx, base, g, L.canvas);
    return {};
  }

  // ---------- engraving (gravura) ----------
  // O tom (do desenho sem contorno) vira hachura: 45°, depois −45°, depois horizontal, depois 45° no meio das
  // primeiras e, no mais escuro, preto. As linhas engrossam com o tom. O contorno (ink) sai preto.
  function engravingDraw(ctx, base, g, src, art, info, m) {
    const k = 1 / g.cw, gap = art.gap, P = TP;
    // linhas que se repetem a cada P sem emenda: um número inteiro delas por volta
    const nA = Math.max(1, Math.round(P / (gap * Math.SQRT2))), nC = Math.max(1, Math.round(P / gap));
    const sA = (P / nA / Math.SQRT2) * k, sC = (P / nC) * k; // distância entre as linhas, em pontos
    const B0 = src.bg ? bgShot(g, src, m) : null;
    const C = shot('art_c', g, src, m, undefined, B0), N = shot('art_n', g, src, m, { noInk: true }, B0);
    const uv = field(g, src, m, art, info);
    const ci = C.ctx.getImageData(0, 0, g.Wd, g.Hd), c = ci.data, nd = N.ctx.getImageData(0, 0, g.Wd, g.Hd).data;
    const pp = rgbOf(art.paper || PAPER), dk = rgbOf(DARK), ik = rgbOf(firstInk(info));
    // a cobertura de uma linha de largura w (pontos) a d pontos do meio dela
    const cov = (d, w) => (w <= 0 ? 0 : w >= 1 ? cl(w / 2 + 0.5 - d) : w * cl(1 - d));
    const { Wd, Hd } = g;
    for (let py = 0, o = 0; py < Hd; py++) {
      const y = (g.gy0 + py + 0.5) * g.ch;
      for (let px = 0; px < Wd; px++, o += 4) {
        const ac = c[o + 3] / 255, an = nd[o + 3] / 255;
        if (!ac && !an) continue;
        const x = (g.gx0 + px + 0.5) * g.cw;
        // sem fundo: as cores contam por cima do papel
        const nr = nd[o] * an + pp[0] * (1 - an), ng = nd[o + 1] * an + pp[1] * (1 - an), nb = nd[o + 2] * an + pp[2] * (1 - an);
        const cr = c[o] * ac + pp[0] * (1 - ac), cg = c[o + 1] * ac + pp[1] * (1 - ac), cb = c[o + 2] * ac + pp[2] * (1 - ac);
        const D = 1 - levels(lum3(nr, ng, nb), art.levels);
        let h = 0;
        if (D > 0.06) {
          // 45°, depois −45°, depois horizontal, depois 45° no meio das primeiras; no mais escuro, chapado
          const wA = 0.3 * cl((D - 0.06) / 0.3) + 0.15 * cl((D - 0.6) / 0.35), wB = 0.3 * cl((D - 0.36) / 0.25) + 0.15 * cl((D - 0.8) / 0.15);
          const wC = 0.3 * cl((D - 0.6) / 0.2), wD = 0.3 * cl((D - 0.8) / 0.15);
          const q = uv(o, x, y), pa = (nA * (q[0] + q[1])) / P;
          let keep = 1 - cov(tri(pa) * sA, wA * sA);
          if (wB > 0) keep *= 1 - cov(tri((nA * (q[0] - q[1])) / P) * sA, wB * sA);
          if (wC > 0) keep *= 1 - cov(tri((nC * q[1]) / P) * sC, wC * sC);
          if (wD > 0) keep *= 1 - cov(tri(pa + 0.5) * sA, wD * sA);
          h = Math.max(1 - keep, cl((D - 0.85) / 0.06));
        }
        // o contorno: o quanto o desenho com ink se aproxima da cor da ink, saindo do desenho sem ink
        const ir = ik[0] - nr, ig = ik[1] - ng, ib = ik[2] - nb, ii = ir * ir + ig * ig + ib * ib;
        const e = ii > 300 ? cl(((cr - nr) * ir + (cg - ng) * ig + (cb - nb) * ib) / ii) : 0;
        const t = 1 - (1 - h) * (1 - e);
        c[o] = pp[0] + (dk[0] - pp[0]) * t;
        c[o + 1] = pp[1] + (dk[1] - pp[1]) * t;
        c[o + 2] = pp[2] + (dk[2] - pp[2]) * t;
        c[o + 3] = B0 ? 255 : Math.max(c[o + 3], nd[o + 3]);
      }
    }
    C.ctx.putImageData(ci, 0, 0);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // ---------- halftone (retícula) ----------
  // Pontos numa grade girada (size=, angle=), maiores onde é mais escuro. Com color, quatro retículas (ciano
  // 15°, magenta 75°, amarelo 0° e preto 45°) que se misturam no papel.
  const CMYK = [[0, 174, 239], [236, 0, 140], [255, 242, 0], [35, 31, 32]];
  function halftoneDraw(ctx, base, g, src, art, info, m) {
    const k = 1 / g.cw, sz = art.size;
    const color = !!art.color, scr = (color ? [15, 75, 0, 45] : [art.angle]).map((d) => screenOf(d, sz));
    const B0 = src.bg ? bgShot(g, src, m) : null;
    const C = shot('art_c', g, src, m, undefined, B0);
    const uv = field(g, src, m, art, info);
    const ci = C.ctx.getImageData(0, 0, g.Wd, g.Hd), c = ci.data;
    const pp = rgbOf(art.paper || PAPER), dk = rgbOf(DARK), L = art.levels;
    // a borda do ponto, suavizada em mais ou menos um ponto da imagem
    const dot = dotOf(Math.max(0.02, 1.2 / (sz * k)));
    const { Wd, Hd } = g;
    for (let py = 0, o = 0; py < Hd; py++) {
      const y = (g.gy0 + py + 0.5) * g.ch;
      for (let px = 0; px < Wd; px++, o += 4) {
        const a = c[o + 3] / 255;
        if (!a) continue;
        const x = (g.gx0 + px + 0.5) * g.cw;
        const r = c[o] * a + pp[0] * (1 - a), gg = c[o + 1] * a + pp[1] * (1 - a), b = c[o + 2] * a + pp[2] * (1 - a);
        const q = uv(o, x, y), u = q[0], v = q[1];
        if (!color) {
          const t = dot(scr[0](u, v), 1 - levels(lum3(r, gg, b), L));
          c[o] = pp[0] + (dk[0] - pp[0]) * t; c[o + 1] = pp[1] + (dk[1] - pp[1]) * t; c[o + 2] = pp[2] + (dk[2] - pp[2]) * t;
        } else {
          // separação simples: o preto tira o que as três cores têm em comum
          const C0 = 1 - levels(r / 255, L), M0 = 1 - levels(gg / 255, L), Y0 = 1 - levels(b / 255, L), K = Math.min(C0, M0, Y0);
          const kq = K < 1 ? 1 / (1 - K) : 0, amt = [(C0 - K) * kq, (M0 - K) * kq, (Y0 - K) * kq, K];
          let R = pp[0], G2 = pp[1], B = pp[2];
          for (let i = 0; i < 4; i++) {
            const t = amt[i] > 0.04 ? dot(scr[i](u, v), amt[i]) : 0;
            if (!t) continue;
            const ink = CMYK[i];
            R *= 1 - t * (1 - ink[0] / 255); G2 *= 1 - t * (1 - ink[1] / 255); B *= 1 - t * (1 - ink[2] / 255);
          }
          c[o] = R; c[o + 1] = G2; c[o + 2] = B;
        }
        if (B0) c[o + 3] = 255;
      }
    }
    C.ctx.putImageData(ci, 0, 0);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // ---------- stencil (estêncil, spray) ----------
  // Poucos tons chapados (tones=) da cor c= sobre o papel; perto da troca de tom, o spray salpica um no outro.
  // ruído suave (um valor sorteado por unidade, misturado entre os vizinhos), que se repete a cada TP
  function noise(u, v) {
    const i = Math.floor(u), j = Math.floor(v), fx = u - i, fy = v - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const w = (a) => ((a % TP) + TP) % TP;
    const i0 = w(i), i1 = w(i + 1), j0 = w(j), j1 = w(j + 1);
    const a = rnd(i0, j0), b = rnd(i1, j0), c = rnd(i0, j1), d = rnd(i1, j1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function stencilDraw(ctx, base, g, src, art, info, m) {
    const n = art.tones - 1;
    const B0 = src.bg ? bgShot(g, src, m) : null;
    const C = shot('art_c', g, src, m, undefined, B0);
    const uv = field(g, src, m, art, info);
    const ci = C.ctx.getImageData(0, 0, g.Wd, g.Hd), c = ci.data;
    const pp = rgbOf(art.paper || PAPER), ink = rgbOf(art.c || firstInk(info));
    const { Wd, Hd } = g;
    for (let py = 0, o = 0; py < Hd; py++) {
      const y = (g.gy0 + py + 0.5) * g.ch;
      for (let px = 0; px < Wd; px++, o += 4) {
        const a = c[o + 3] / 255;
        if (!a) continue;
        const x = (g.gx0 + px + 0.5) * g.cw;
        const t = levels(lum3(c[o] * a + pp[0] * (1 - a), c[o + 1] * a + pp[1] * (1 - a), c[o + 2] * a + pp[2] * (1 - a)), art.levels);
        // perto da troca de tom, o ruído decide (o spray salpica um tom no outro)
        const q = uv(o, x, y), z = 0.65 * noise(q[0] * 1.6, q[1] * 1.6) + 0.35 * noise(q[0] * 4.3 + 37, q[1] * 4.3 + 11);
        const j = Math.max(0, Math.min(n, Math.round(t * n + (z - 0.5) * 0.5))) / n;
        c[o] = ink[0] + (pp[0] - ink[0]) * j; c[o + 1] = ink[1] + (pp[1] - ink[1]) * j; c[o + 2] = ink[2] + (pp[2] - ink[2]) * j;
        if (B0) c[o + 3] = 255;
      }
    }
    C.ctx.putImageData(ci, 0, 0);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // ---------- silhouette (silhueta) ----------
  // Tudo o que é desenho vira a cor c= (a ink, se não tiver); o fundo fica como é.
  function silhouetteDraw(ctx, base, g, src, art, info, m) {
    if (src.bg) { ctx.save(); src.bg(ctx, base); ctx.restore(); }
    const C = shot('art_c', g, src, m, { unlit: true }, null);
    C.ctx.setTransform(1, 0, 0, 1, 0, 0);
    C.ctx.globalCompositeOperation = 'source-in';
    C.ctx.fillStyle = art.c || firstInk(info);
    C.ctx.fillRect(0, 0, g.Wd, g.Hd);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // ---------- woodcut (xilogravura) ----------
  // O contrário da gravura: a tinta é preta, e a luz vira sulcos brancos largos (gap=), toscos: um ruído largo
  // entorta o sulco e um fino engrossa e afina a borda. O claro fica papel; o mais escuro, preto. O contorno sai preto.
  function woodcutDraw(ctx, base, g, src, art, info, m) {
    const k = 1 / g.cw, n = Math.max(1, Math.round(TP / art.gap)), s = (TP / n) * k;
    const B0 = src.bg ? bgShot(g, src, m) : null;
    const C = shot('art_c', g, src, m, undefined, B0), N = shot('art_n', g, src, m, { noInk: true }, B0);
    const uv = field(g, src, m, art, info);
    const ci = C.ctx.getImageData(0, 0, g.Wd, g.Hd), c = ci.data, nd = N.ctx.getImageData(0, 0, g.Wd, g.Hd).data;
    const pp = rgbOf(art.paper || PAPER), dk = rgbOf(DARK);
    const E = edgeMap(c, nd, rgbOf(firstInk(info)), pp);
    const { Wd, Hd } = g;
    for (let py = 0, o = 0, i = 0; py < Hd; py++) {
      const y = (g.gy0 + py + 0.5) * g.ch;
      for (let px = 0; px < Wd; px++, o += 4, i++) {
        const ac = c[o + 3] / 255, an = nd[o + 3] / 255;
        if (!ac && !an) continue;
        const x = (g.gx0 + px + 0.5) * g.cw;
        const D = 1 - levels(lum3(nd[o] * an + pp[0] * (1 - an), nd[o + 1] * an + pp[1] * (1 - an), nd[o + 2] * an + pp[2] * (1 - an)), art.levels);
        let t = 1;
        if (D < 0.95) {
          // o sulco, deitado na forma; a largura (fração do espaço entre os sulcos) cresce com a luz
          const q = uv(o, x, y), pa = (n * q[1]) / TP + 0.7 * (noiseP(q[0] / 16, q[1] / 16, 8, 1) - 0.5);
          const b0 = (0.9 - D) / 0.6, wf = b0 + 0.4 * cl(b0 * 3) * (noiseP(q[0] / 4, q[1] / 4, 32, 2) - 0.5);
          t = 1 - cover(tri(pa) * s, wf * s);
        }
        t = Math.max(t, E[i]);
        c[o] = pp[0] + (dk[0] - pp[0]) * t;
        c[o + 1] = pp[1] + (dk[1] - pp[1]) * t;
        c[o + 2] = pp[2] + (dk[2] - pp[2]) * t;
        c[o + 3] = B0 ? 255 : Math.max(c[o + 3], nd[o + 3]);
      }
    }
    C.ctx.putImageData(ci, 0, 0);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // ---------- comic e manga (HQs) ----------
  const NEWS = '#f0e6cc'; // papel-jornal
  // As HQs veem o desenho com a faixa de sombra do toon (shadow=; 0 = sem faixa) e, com luz, a luz em 3 degraus.
  // Devolve c (com o contorno e sem degraus: só para medir o contorno), n (sem o contorno, em degraus), E (o contorno)
  // e pp (o papel).
  function comicShots(g, src, m, art, info, B0) {
    const toon = art.shadow > 0 ? { shadow: art.shadow } : undefined;
    const C = shot('art_c', g, src, m, { toon }, B0), N = shot('art_n', g, src, m, { toon, noInk: true }, B0);
    const ci = C.ctx.getImageData(0, 0, g.Wd, g.Hd), n = N.ctx.getImageData(0, 0, g.Wd, g.Hd).data;
    const pp = rgbOf(art.paper || (art.style === 'manga' ? '#ffffff' : NEWS));
    const E = edgeMap(ci.data, n, rgbOf(firstInk(info)), pp);
    if (info.lit !== false) stepLight(n, shot('art_u', g, src, m, { toon, noInk: true, unlit: true }, B0).ctx.getImageData(0, 0, g.Wd, g.Hd).data, 3);
    return { C, ci, c: ci.data, n, E, pp };
  }
  // a claridade de 0 (papel) a 1 (preto) do desenho sem contorno, por cima do papel
  const darkAt = (n, o, pp, L) => {
    const a = n[o + 3] / 255;
    return 1 - levels(lum3(n[o] * a + pp[0] * (1 - a), n[o + 1] * a + pp[1] * (1 - a), n[o + 2] * a + pp[2] * (1 - a)), L);
  };

  // comic (a moderna colorida): o toon, com a cor um pouco mais forte e uma retícula leve de pontos pretos na sombra
  function comicDraw(ctx, base, g, src, art, info, m) {
    if (art.old) return art.bw ? comicBwDraw(ctx, base, g, src, art, info, m) : comicOldDraw(ctx, base, g, src, art, info, m);
    const toon = art.shadow > 0 ? { shadow: art.shadow } : undefined;
    const B0 = src.bg ? bgShot(g, src, m) : null;
    const C = shot('art_c', g, src, m, { toon }, B0), ci = C.ctx.getImageData(0, 0, g.Wd, g.Hd), l = ci.data;
    if (info.lit !== false) stepLight(l, shot('art_u', g, src, m, { toon, unlit: true }, B0).ctx.getImageData(0, 0, g.Wd, g.Hd).data, 3);
    // a cor chapada (sem luz e sem faixa): a sombra é o quanto o ponto ficou mais escuro que ela
    const f = shot('art_n', g, src, m, { unlit: true }, B0).ctx.getImageData(0, 0, g.Wd, g.Hd).data;
    const uv = field(g, src, m, art, info);
    const k = 1 / g.cw, scr = screenOf(45, art.size), dot = dotOf(Math.max(0.02, 1.2 / (art.size * k))), dk = rgbOf(DARK), L = art.levels;
    const { Wd, Hd } = g;
    for (let py = 0, o = 0; py < Hd; py++) {
      const y = (g.gy0 + py + 0.5) * g.ch;
      for (let px = 0; px < Wd; px++, o += 4) {
        if (!l[o + 3]) continue;
        const x = (g.gx0 + px + 0.5) * g.cw;
        const Y = 0.3 * l[o] + 0.59 * l[o + 1] + 0.11 * l[o + 2];
        let r = levels((Y + (l[o] - Y) * 1.25) / 255, L) * 255, gg = levels((Y + (l[o + 1] - Y) * 1.25) / 255, L) * 255, b = levels((Y + (l[o + 2] - Y) * 1.25) / 255, L) * 255;
        const lf = lum3(f[o], f[o + 1], f[o + 2]), s = lf > 0.06 ? 1 - lum3(l[o], l[o + 1], l[o + 2]) / lf : 0;
        const t = 0.5 * cl((s - 0.15) / 0.45);
        if (t > 0.01) {
          const q = uv(o, x, y), d = dot(scr(q[0], q[1]), t);
          r += (dk[0] - r) * d; gg += (dk[1] - gg) * d; b += (dk[2] - b) * d;
        }
        l[o] = r; l[o + 1] = gg; l[o + 2] = b;
      }
    }
    C.ctx.putImageData(ci, 0, 0);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // comic old (o gibi antigo colorido): cada ponto vira a cor mais parecida da tabela do colorista (ciano, magenta e
  // amarelo com 0, 25, 50 ou 100%), um pouco mais clara; 25 e 50% viram pontos, cada tinta num ângulo, no
  // papel-jornal. O preto vem só do contorno e do mais escuro; a cor sai um pouco do lugar (shift=).
  const OLD_STEPS = [0, 0.25, 0.5, 1];
  function comicOldDraw(ctx, base, g, src, art, info, m) {
    const B0 = src.bg ? bgShot(g, src, m) : null;
    const { C, ci, c, n, E, pp } = comicShots(g, src, m, art, info, B0);
    const uv = field(g, src, m, art, info);
    const k = 1 / g.cw, sz = art.size, scr = [15, 75, 0].map((d) => screenOf(d, sz)), dot = dotOf(Math.max(0.02, 1.2 / (sz * k)));
    const dk = rgbOf(DARK), L = art.levels;
    const tab = [];
    for (const a0 of OLD_STEPS) for (const a1 of OLD_STEPS) for (const a2 of OLD_STEPS) {
      const amt = [a0, a1, a2], col = pp.slice();
      for (let j = 0; j < 3; j++) for (let ch = 0; ch < 3; ch++) col[ch] *= 1 - amt[j] * (1 - CMYK[j][ch] / 255);
      tab.push({ amt, lab: lab(col[0], col[1], col[2]) });
    }
    const memo = new Map();
    const pick = (r, gg, b) => {
      const key = (r << 16) | (gg << 8) | b;
      let e = memo.get(key);
      if (!e) {
        const p = lab(r, gg, b);
        let best = Infinity;
        for (const t of tab) { const d = dLab(p, t.lab); if (d < best) { best = d; e = t.amt; } }
        memo.set(key, e);
      }
      return e;
    };
    const [dx, dy] = regOff(art, k, regDir(art));
    const { Wd, Hd } = g;
    const up = (v, a, p) => Math.round(levels(((v * a + p * (1 - a)) / 255) * 0.88 + 0.12, L) * 255);
    for (let py = 0, o = 0, i = 0; py < Hd; py++) {
      const y = (g.gy0 + py + 0.5) * g.ch;
      for (let px = 0; px < Wd; px++, o += 4, i++) {
        const sx = px - dx, sy = py - dy, so = sx >= 0 && sy >= 0 && sx < Wd && sy < Hd ? (sy * Wd + sx) * 4 : -1;
        const as = so >= 0 ? n[so + 3] / 255 : 0, an = n[o + 3] / 255, ac = c[o + 3] / 255;
        if (!as && !an && !ac) continue;
        const x = (g.gx0 + px + 0.5) * g.cw;
        let R = pp[0], G2 = pp[1], B = pp[2];
        if (as) {
          // a cor, do ponto deslocado, um pouco mais clara (a tinta no jornal não chega ao escuro da tela)
          const amt = pick(up(n[so], as, pp[0]), up(n[so + 1], as, pp[1]), up(n[so + 2], as, pp[2]));
          const q = uv(so, x - dx * g.cw, y - dy * g.ch);
          for (let j = 0; j < 3; j++) {
            const a = amt[j];
            if (!a) continue;
            const t = a >= 1 ? 1 : dot(scr[j](q[0], q[1]), a), ink = CMYK[j];
            R *= 1 - t * (1 - ink[0] / 255); G2 *= 1 - t * (1 - ink[1] / 255); B *= 1 - t * (1 - ink[2] / 255);
          }
        }
        // o preto, no lugar: o contorno e o mais escuro
        const t = Math.max(cl((darkAt(n, o, pp, L) - 0.87) / 0.05), E[i]);
        c[o] = R + (dk[0] - R) * t; c[o + 1] = G2 + (dk[1] - G2) * t; c[o + 2] = B + (dk[2] - B) * t;
        c[o + 3] = B0 ? 255 : Math.max(as, an, ac) * 255;
      }
    }
    C.ctx.putImageData(ci, 0, 0);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // comic old bw (a tira de jornal): o mais escuro em preto chapado, o escuro em linhas deitadas que engrossam até
  // o preto, o meio em hachura diagonal e o claro no papel. As linhas são do desenhista: presas à forma.
  function comicBwDraw(ctx, base, g, src, art, info, m) {
    const B0 = src.bg ? bgShot(g, src, m) : null;
    const { C, ci, c, n, E, pp } = comicShots(g, src, m, art, info, B0);
    const uv = field(g, src, m, art, info);
    const k = 1 / g.cw, sz = art.size;
    const nH = Math.max(1, Math.round(TP / sz)), sH = (TP / nH) * k, nA = Math.max(1, Math.round(TP / (sz * Math.SQRT2))), sA = (TP / nA / Math.SQRT2) * k;
    const dk = rgbOf(DARK), L = art.levels;
    const { Wd, Hd } = g;
    for (let py = 0, o = 0, i = 0; py < Hd; py++) {
      const y = (g.gy0 + py + 0.5) * g.ch;
      for (let px = 0; px < Wd; px++, o += 4, i++) {
        const ac = c[o + 3] / 255, an = n[o + 3] / 255;
        if (!ac && !an) continue;
        const x = (g.gx0 + px + 0.5) * g.cw;
        const D = darkAt(n, o, pp, L);
        let h = 0;
        if (D > 0.25) {
          const q = uv(o, x, y), wH = cl((D - 0.55) / 0.3), wA = 0.35 * cl((D - 0.25) / 0.25) * (1 - wH);
          let keep = 1;
          if (wA > 0) keep *= 1 - cover(tri((nA * (q[0] + q[1])) / TP) * sA, wA * sA);
          if (wH > 0) keep *= 1 - cover(tri((nH * q[1]) / TP) * sH, wH * sH);
          h = Math.max(1 - keep, cl((D - 0.85) / 0.04));
        }
        const t = Math.max(h, E[i]);
        c[o] = pp[0] + (dk[0] - pp[0]) * t; c[o + 1] = pp[1] + (dk[1] - pp[1]) * t; c[o + 2] = pp[2] + (dk[2] - pp[2]) * t;
        c[o + 3] = B0 ? 255 : Math.max(c[o + 3], n[o + 3]);
      }
    }
    C.ctx.putImageData(ci, 0, 0);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // manga: preto chapado no mais escuro, papel branco no claro e, no meio, tones= retículas de ponto fixo (como as
  // folhas de retícula coladas à mão), a 45°. O contorno sai preto.
  function mangaDraw(ctx, base, g, src, art, info, m) {
    const B0 = src.bg ? bgShot(g, src, m) : null;
    const { C, ci, c, n, E, pp } = comicShots(g, src, m, art, info, B0);
    const uv = field(g, src, m, art, info);
    const k = 1 / g.cw, scr = screenOf(45, art.size), dot = dotOf(Math.max(0.02, 1.2 / (art.size * k))), dk = rgbOf(DARK), L = art.levels, nt = art.tones;
    const { Wd, Hd } = g;
    for (let py = 0, o = 0, i = 0; py < Hd; py++) {
      const y = (g.gy0 + py + 0.5) * g.ch;
      for (let px = 0; px < Wd; px++, o += 4, i++) {
        const ac = c[o + 3] / 255, an = n[o + 3] / 255;
        if (!ac && !an) continue;
        const x = (g.gx0 + px + 0.5) * g.cw;
        const D = darkAt(n, o, pp, L);
        let t = cl((D - 0.82) / 0.03);
        if (t < 1 && D > 0.18) {
          const j = Math.min(nt - 1, Math.floor(((D - 0.18) / 0.67) * nt)), cv = nt > 1 ? 0.15 + (0.5 * j) / (nt - 1) : 0.35;
          const q = uv(o, x, y);
          t = Math.max(t, dot(scr(q[0], q[1]), cv));
        }
        t = Math.max(t, E[i]);
        c[o] = pp[0] + (dk[0] - pp[0]) * t; c[o + 1] = pp[1] + (dk[1] - pp[1]) * t; c[o + 2] = pp[2] + (dk[2] - pp[2]) * t;
        c[o + 3] = B0 ? 255 : Math.max(c[o + 3], n[o + 3]);
      }
    }
    C.ctx.putImageData(ci, 0, 0);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // ---------- riso (risografia) ----------
  // De 1 a 3 tintas fortes (inks=) que se sobrepõem no papel: cada cor do desenho vira a mistura das tintas que chega
  // mais perto dela. Cada tinta é impressa em grão (size=: o tamanho do grão) e sai um pouco do lugar (shift=, cada
  // tinta para um lado).
  let grainCdf = null;
  // o limiar do grão que cobre a fração a do papel (o ruído suave não é uniforme: a tabela corrige)
  function grainLevel(a) {
    if (!grainCdf) {
      const v = new Float32Array(8192);
      for (let i = 0; i < v.length; i++) v[i] = noiseP(rnd(i, 1) * 64, rnd(i, 2) * 64, 64, 5);
      grainCdf = v.sort();
    }
    return a <= 0 ? -1 : a >= 1 ? 2 : grainCdf[Math.min(grainCdf.length - 1, Math.floor(a * grainCdf.length))];
  }
  function risoDraw(ctx, base, g, src, art, info, m) {
    const k = 1 / g.cw, B0 = src.bg ? bgShot(g, src, m) : null;
    const C = shot('art_c', g, src, m, undefined, B0), ci = C.ctx.getImageData(0, 0, g.Wd, g.Hd), c = ci.data, s0 = c.slice();
    const uv = field(g, src, m, art, info);
    const pp = rgbOf(art.paper || PAPER), inks = art.inks.map(rgbOf), ni = inks.length, L = art.levels;
    // a mistura: em cada canal, o papel vezes (1 − x·(1 − tinta)) de cada tinta, com x de 0 a 1 o mais perto da cor
    // (uma tinta por vez: com as outras paradas, o canal é uma reta em x, e a conta é exata)
    const memo = new Map();
    const mix = (r, gg, b) => {
      const key = (r << 16) | (gg << 8) | b;
      let x = memo.get(key);
      if (x) return x;
      x = new Float32Array(ni);
      const want = [r, gg, b];
      for (let it = 0; it < 12; it++) {
        for (let i = 0; i < ni; i++) {
          let num = 0, den = 0;
          for (let ch = 0; ch < 3; ch++) {
            let K = pp[ch];
            for (let j = 0; j < ni; j++) if (j !== i) K *= 1 - x[j] * (1 - inks[j][ch] / 255);
            const a = K * (1 - inks[i][ch] / 255);
            num += a * (K - want[ch]);
            den += a * a;
          }
          x[i] = den > 1e-6 ? cl(num / den) : 0;
        }
      }
      memo.set(key, x);
      return x;
    };
    const ncell = Math.max(1, Math.round(TP / art.size)), cs = TP / ncell, fw = Math.min(0.5, 0.3 / (cs * k));
    const a0 = regDir(art), off = inks.map((_, i) => regOff(art, k, a0 + (i * TAU) / ni));
    const lv = (v, a, p) => Math.round(levels((v * a + p * (1 - a)) / 255, L) * 255);
    const { Wd, Hd } = g;
    for (let py = 0, o = 0; py < Hd; py++) {
      const y = (g.gy0 + py + 0.5) * g.ch;
      for (let px = 0; px < Wd; px++, o += 4) {
        const x = (g.gx0 + px + 0.5) * g.cw;
        let R = pp[0], G2 = pp[1], B = pp[2], A = s0[o + 3] / 255;
        for (let i = 0; i < ni; i++) {
          const sx = px - off[i][0], sy = py - off[i][1];
          if (sx < 0 || sy < 0 || sx >= Wd || sy >= Hd) continue;
          const so = (sy * Wd + sx) * 4, as = s0[so + 3] / 255;
          if (!as) continue;
          if (as > A) A = as;
          // o quase papel fica papel (como na impressão)
          const xa = (mix(lv(s0[so], as, pp[0]), lv(s0[so + 1], as, pp[1]), lv(s0[so + 2], as, pp[2]))[i] - 0.08) / 0.92;
          if (xa <= 0.002) continue;
          const q = uv(so, x - off[i][0] * g.cw, y - off[i][1] * g.ch);
          const t = cl((grainLevel(xa) - noiseP(q[0] / cs, q[1] / cs, ncell, 11 + i)) / fw + 0.5);
          if (!t) continue;
          const ink = inks[i];
          R *= 1 - t * (1 - ink[0] / 255); G2 *= 1 - t * (1 - ink[1] / 255); B *= 1 - t * (1 - ink[2] / 255);
        }
        if (!A) continue;
        c[o] = R; c[o + 1] = G2; c[o + 2] = B;
        c[o + 3] = B0 ? 255 : A * 255;
      }
    }
    C.ctx.putImageData(ci, 0, 0);
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // ---------- estilos de traço (sketch, marker, pencil, lines, neon) ----------
  // Pintam forma por forma, na ordem do desenho e com os recortes das camadas: o passe stroke (ver strokeInfo, no
  // scene.js) chama o estilo para o preenchimento (fill), o contorno (ink) e os traços abertos (line) de cada forma.
  // A textura (passadas, hachura, tremido) é sorteada por forma, pelo seed= e, com boil=N, de novo a cada N
  // quadros; ela é feita no espaço parado da forma, então anda e gira com o osso (boil=screen: no da tela).
  // A grossura dos traços segue o tamanho do canvas (U: 1 num canvas de 500).
  const unitOf = (cv) => Math.min(4, Math.max(0.4, Math.max(cv.w, cv.h) / 500));
  // sorteio: uma sequência de números de 0 a 1 a partir de uma semente
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const boilStep = (art, info) => (typeof art.boil === 'number' && art.boil > 0 ? Math.floor((info.frame || 0) / art.boil) : 0);
  const seedOf = (art, step, it, salt) => (Math.imul(it.key ^ Math.imul(art.seed + 1, 7919), 2654435761) ^ Math.imul(step + 1, 104729) ^ Math.imul(salt + 1, 40503)) >>> 0;
  // a cor (ou a cor do meio do degradê) de uma especificação de preenchimento
  function specRGB(spec) {
    if (!spec) return null;
    if (typeof spec === 'string') return rgbOf(spec);
    if (spec.kind === 'pat') return rgbOf(spec.c);
    const st = spec.stops || [];
    if (!st.length) return null;
    const acc = [0, 0, 0];
    let n = 0;
    for (const s of st) { const c = rgbOf(s.c); if (c) { acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; n++; } }
    return n ? acc.map((v) => v / n) : null;
  }
  const ptsOf = (flat) => { const p = []; for (let i = 0; i + 1 < flat.length; i += 2) p.push([flat[i], flat[i + 1]]); return p; };
  // os pontos de uma linha a cada step unidades (closed: volta ao começo)
  function resample(pts, closed, step) {
    const P = closed ? pts.concat([pts[0]]) : pts, out = [];
    let carry = 0;
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let t = carry;
      while (t < d) { out.push([a[0] + ((b[0] - a[0]) * t) / d, a[1] + ((b[1] - a[1]) * t) / d]); t += step; }
      carry = t - d;
    }
    if (!closed && P.length) out.push(P[P.length - 1]);
    return out;
  }
  // a normal (para fora, numa forma em sentido horário na tela) em cada ponto
  function normals(pts, closed) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      out.push([dy / l, -dx / l]);
    }
    return out;
  }
  // Uma passada de lápis: a linha tremida (amp, a cada wave unidades), começando num ponto sorteado e passando um
  // pouco do fim (over, em fração do comprimento). shift: a distância para o lado (a borda de um traço largo).
  function wobble(ctx, pts, closed, R, o) {
    if (pts.length < 2) return;
    const step = o.step || 2.5, q = resample(pts, closed, step), n = q.length;
    if (n < 2) return;
    const N = normals(q, closed), ph = R() * TAU, ph2 = R() * TAU, wl = o.wave / step, sh = o.shift || [];
    const start = closed ? Math.floor(R() * n) : 0, len = closed ? Math.round(n * (1 + (o.over || 0))) : n;
    ctx.beginPath();
    for (let j = 0; j < len; j++) {
      const i = (start + j) % n, s = o.shiftOf ? o.shiftOf(i) : 0;
      const d = s + o.amp * (0.7 * Math.sin(ph + (j / wl) * TAU) + 0.3 * Math.sin(ph2 + (j / wl) * TAU * 2.7));
      const x = q[i][0] + N[i][0] * d, y = q[i][1] + N[i][1] * d;
      if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // a parte do desenho que aparece no ctx (a caixa da forma, menos o que fica fora da imagem), com uma folga
  function viewRect(ctx, box, pad) {
    let x0 = box.x - pad, y0 = box.y - pad, x1 = box.x + box.w + pad, y1 = box.y + box.h + pad;
    const T = ctx.getTransform(), det = T.a * T.d - T.b * T.c;
    if (det) {
      const w = ctx.canvas.width, h = ctx.canvas.height, xs = [], ys = [];
      for (const [px, py] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        const X = px - T.e, Y = py - T.f;
        xs.push((T.d * X - T.c * Y) / det);
        ys.push((-T.b * X + T.a * Y) / det);
      }
      x0 = Math.max(x0, Math.min(...xs) - pad); x1 = Math.min(x1, Math.max(...xs) + pad);
      y0 = Math.max(y0, Math.min(...ys) - pad); y1 = Math.min(y1, Math.max(...ys) + pad);
    }
    return [x0, y0, x1, y1];
  }
  // As linhas de uma hachura no espaço parado da forma (ângulo deg, a cada sp unidades), levadas para o desenho.
  // seg: cada linha em traços de seg unidades (com U), cada um um pouco fora da linha (wob, em fração de sp) e um
  // pouco torto (tilt); sem seg, a linha atravessa a forma (tilt: o quanto ela entorta). Cada traço é riscado
  // sozinho (muitos num caminho só deixam o canvas muito lento), e os de fora da imagem são pulados (os sorteios
  // são os mesmos, para a textura não mudar quando a forma anda).
  function hatchLines(ctx, it, art, deg, sp, R, o) {
    const screen = art.boil === 'screen', f = screen ? (x, y) => [x, y] : it.map(), b = screen ? it.box : it.lbox();
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, h = Math.hypot(b.w, b.h) / 2 + sp;
    const r = (deg * Math.PI) / 180, dx = Math.cos(r), dy = Math.sin(r), nx = -dy, ny = dx;
    const jit = o.jitter || 0, off = R() * sp, U = unitOf(it.canvas), seg = o.seg ? o.seg * U : 0;
    const V = viewRect(ctx, it.box, sp * 2 + (ctx.lineWidth || 1) * 2);
    const draw = (x0, y0, x1, y1) => {
      const p0 = f(x0, y0), p1 = f(x1, y1);
      if (Math.max(p0[0], p1[0]) < V[0] || Math.min(p0[0], p1[0]) > V[2] || Math.max(p0[1], p1[1]) < V[1] || Math.min(p0[1], p1[1]) > V[3]) return;
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.stroke();
    };
    for (let t = -h + off; t <= h; t += sp * (1 + (R() - 0.5) * jit)) {
      if (!seg) {
        const a = (R() - 0.5) * (o.tilt || 0), ex = dx + nx * a, ey = dy + ny * a;
        const ox = cx + nx * t, oy = cy + ny * t, l0 = h * (o.cut ? 1 - R() * o.cut : 1), l1 = h * (o.cut ? 1 - R() * o.cut : 1);
        draw(ox - ex * l0, oy - ey * l0, ox + ex * l1, oy + ey * l1);
        continue;
      }
      for (let s = -h - R() * seg; s < h; ) {
        const L = seg * (0.6 + R() * 0.8), a = (R() - 0.5) * (o.tilt || 0), tt = t + (R() - 0.5) * (o.wob || 0) * sp;
        const ex = dx + nx * a, ey = dy + ny * a, ox = cx + nx * tt + dx * s, oy = cy + ny * tt + dy * s;
        draw(ox, oy, ox + ex * L, oy + ey * L);
        s += L * (0.8 + R() * 0.3);
      }
    }
  }
  // a faixa de sombra (a forma menos ela mesma empurrada para o light= do canvas): recorta o ctx nela.
  // Devolve false nas formas quase do tamanho do canvas (o chão, o céu), que ficam sem.
  function clipBand(ctx, it, k) {
    const bb = it.box, cv = it.canvas;
    if (bb.w >= cv.w * 0.9 || bb.h >= cv.h * 0.9) return false;
    const l = it.light, ll = Math.hypot(l[0], l[1]) || 1, lx = l[0] / ll, ly = l[1] / ll;
    const d = k * (Math.abs(lx) * bb.w + Math.abs(ly) * bb.h);
    if (d < 0.25) return false;
    ctx.clip(it.path);
    ctx.translate(lx * d, ly * d);
    ctx.clip(inversePath(it.path), 'evenodd');
    ctx.translate(-lx * d, -ly * d);
    return true;
  }
  function inversePath(path) {
    const p = new Path2D();
    p.rect(-1e5, -1e5, 2e5, 2e5);
    p.addPath(path);
    return p;
  }
  // o contorno de um traço largo: as duas bordas (meia largura para cada lado)
  function lineEdges(it) {
    const pts = ptsOf(it.poly), ws = it.ws;
    return { pts, half: (i, n) => (ws ? ws[Math.min(ws.length - 1, Math.round((i / Math.max(1, n - 1)) * (ws.length - 1)))] : it.w) / 2 };
  }
  // O traço aberto desenhado como um contorno (a borda do corpo dele, de lw de largura): o corpo em c, crescido
  // em 8 direções, e o corpo de novo em fill por cima.
  function outlineBody(ctx, it, c, fill, lw) {
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle = c;
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      ctx.save();
      ctx.translate(Math.cos(a) * lw, Math.sin(a) * lw);
      it.body(ctx);
      ctx.restore();
    }
    ctx.fillStyle = ctx.strokeStyle = fill;
    it.body(ctx);
    ctx.restore();
  }

  // ---------- lines (só o contorno, como livro de colorir) ----------
  // As cores viram papel (cada forma esconde o que está atrás dela) e cada forma ganha o contorno, em c= (a ink),
  // com a espessura w= (sem w=, a do contorno da forma). O fundo do canvas vira papel.
  function linesPaint(art, info) {
    const c = art.c || firstInk(info), pp = art.paper || '#ffffff';
    return {
      glow: false,
      fill(ctx, it) { ctx.fillStyle = pp; ctx.fill(it.path); },
      ink(ctx, it) {
        const U = unitOf(it.canvas), w = art.w || (it.hasInk && it.ink > 0 ? it.ink : 2 * U);
        ctx.save();
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.lineJoin = 'round';
        ctx.stroke(it.path);
        ctx.restore();
      },
      line(ctx, it) {
        // o traço largo (um braço, uma perna) vira o contorno dele; o fino, uma linha só, no meio
        const U = unitOf(it.canvas), lw = art.w || 2 * U, wmax = it.ws ? Math.max(...it.ws) : it.w;
        if (wmax > lw * 3) outlineBody(ctx, it, c, pp, lw);
        else if (wmax <= lw * 1.2) { ctx.save(); ctx.fillStyle = ctx.strokeStyle = c; it.body(ctx); ctx.restore(); }
        else {
          ctx.save();
          ctx.strokeStyle = c;
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const p = it.poly;
          ctx.beginPath();
          for (let i = 0; i + 1 < p.length; i += 2) { if (i) ctx.lineTo(p[i], p[i + 1]); else ctx.moveTo(p[i], p[i + 1]); }
          ctx.stroke();
          ctx.restore();
        }
        return true;
      },
    };
  }
  function linesDraw(ctx, base, g, src, art, info, m) {
    const C = work('art_c', g.Wd, g.Hd);
    if (src.bg) { C.ctx.fillStyle = art.paper || '#ffffff'; C.ctx.fillRect(0, 0, g.Wd, g.Hd); }
    C.ctx.save();
    src.content(C.ctx, m, { unlit: true, stroke: linesPaint(art, info) });
    C.ctx.restore();
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // ---------- neon ----------
  // Só o contorno, na cor de cada forma (c=: uma cor só), mais clara e mais forte, com um miolo quase branco e um
  // brilho em volta, num fundo escuro (paper=). Cada forma esconde o que está atrás dela.
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }
  function rgbHsl(h, s, l) {
    const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return [f(0), f(8), f(4)];
  }
  const hexOf = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  function neonOf(rgb) {
    const [h, s, l] = hsl(rgb[0], rgb[1], rgb[2]);
    return rgbHsl(h, Math.max(s, 0.75), Math.min(0.68, Math.max(l, 0.58)));
  }
  function neonPaint(art, info) {
    const pp = art.paper || '#0b0a14', one = art.c ? rgbOf(art.c) : null;
    const tube = (ctx, col, w, draw) => {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = ctx.fillStyle = hexOf(col);
      ctx.lineWidth = w;
      draw(w, hexOf(col));
      // o miolo, quase branco
      const core = col.map((v) => v + (255 - v) * 0.7);
      ctx.strokeStyle = ctx.fillStyle = hexOf(core);
      ctx.lineWidth = w * 0.4;
      draw(w * 0.4, hexOf(core));
      ctx.restore();
    };
    return {
      fill(ctx, it) { ctx.fillStyle = pp; ctx.fill(it.path); },
      ink(ctx, it) {
        const U = unitOf(it.canvas), col = one || neonOf(specRGB(it.fillSpec) || (it.inkc ? specRGB(it.inkc) : null) || [255, 64, 192]);
        tube(ctx, col, art.w || 2.5 * U, () => ctx.stroke(it.path));
      },
      line(ctx, it) {
        const U = unitOf(it.canvas), lw = art.w || 2.5 * U, col = one || neonOf(specRGB(it.lineSpec) || [255, 64, 192]);
        const wide = (it.ws ? Math.max(...it.ws) : it.w) > lw * 2.5;
        tube(ctx, col, lw, (w, c) => { if (wide) outlineBody(ctx, it, c, pp, w); else it.body(ctx); });
        return true;
      },
    };
  }
  // o desenho borrado (r pontos), numa imagem de trabalho: com o filter do canvas quando ele existe; sem ele,
  // reduzindo e aumentando de volta aos poucos (metade de cada vez), com suavização
  function soften(cv, r, name) {
    const O = work(name, cv.width, cv.height);
    if (W.scene && W.scene.canFilter && W.scene.canFilter()) {
      O.ctx.filter = `blur(${r.toFixed(1)}px)`;
      O.ctx.drawImage(cv, 0, 0);
      O.ctx.filter = 'none';
      return O.canvas;
    }
    let src = cv, w = cv.width, h = cv.height, i = 0;
    const steps = [];
    while (w > 2 && h > 2 && (cv.width / w) * 1.2 < r) {
      w = Math.max(1, Math.round(w / 2));
      h = Math.max(1, Math.round(h / 2));
      const S = work('art_soft' + i++, w, h);
      S.ctx.imageSmoothingEnabled = true;
      S.ctx.imageSmoothingQuality = 'high';
      S.ctx.drawImage(src, 0, 0, w, h);
      steps.push(S);
      src = S.canvas;
    }
    for (let j = steps.length - 2; j >= 0; j--) {
      const S = steps[j];
      S.ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
      S.ctx.drawImage(src, 0, 0, S.canvas.width, S.canvas.height);
      src = S.canvas;
    }
    O.ctx.imageSmoothingEnabled = true;
    O.ctx.imageSmoothingQuality = 'high';
    O.ctx.drawImage(src, 0, 0, cv.width, cv.height);
    return O.canvas;
  }
  function neonDraw(ctx, base, g, src, art, info, m) {
    const C = work('art_c', g.Wd, g.Hd);
    if (src.bg) { C.ctx.fillStyle = art.paper || '#0b0a14'; C.ctx.fillRect(0, 0, g.Wd, g.Hd); }
    C.ctx.save();
    src.content(C.ctx, m, { unlit: true, stroke: neonPaint(art, info) });
    C.ctx.restore();
    // o brilho: o desenho borrado (largo e estreito), somado por cima
    const k = 1 / g.cw, U = bgUnit(g);
    C.ctx.save();
    C.ctx.globalCompositeOperation = 'lighter';
    C.ctx.globalAlpha = 0.9;
    C.ctx.drawImage(soften(C.canvas, 7 * k * U, 'art_glow'), 0, 0);
    C.ctx.globalAlpha = 0.7;
    C.ctx.drawImage(soften(C.canvas, 2.5 * k * U, 'art_glow2'), 0, 0);
    C.ctx.restore();
    blit(ctx, base, g, C.canvas);
    return {};
  }

  // ---------- os desenhados à mão (sketch, marker, pencil) ----------
  // O fundo do canvas é pintado no estilo (P.bg; P.paper: o papel do estilo, sem paper=), as formas por cima (o passe stroke), o pós (o grão do lápis) e,
  // com luz na cena, a luz entra por cima, comparando o desenho com luz (l) e sem luz (u), canal a canal: onde a
  // luz escurece, o ponto é multiplicado por l/u; onde ela clareia, ele anda para o branco na mesma proporção que
  // u andou até l (assim o brilho de uma lâmpada num céu escuro fica suave, sem estourar).
  function handDraw(make, post) {
    return (ctx, base, g, src, art, info, m) => {
      const P = make(art, info, g), pp = rgbOf(art.paper || P.paper || PAPER);
      const C = work('art_c', g.Wd, g.Hd);
      const B0 = src.bg ? bgShot(g, src, m) : null;
      if (B0) {
        C.ctx.fillStyle = hexOf(pp);
        C.ctx.fillRect(0, 0, g.Wd, g.Hd);
        // sem bg no canvas (info.bare), o fundo branco da imagem fica de fora: o papel aparece
        if (!info.bare) {
          C.ctx.save();
          P.bg(C.ctx, B0, g, m);
          C.ctx.restore();
        }
      }
      C.ctx.save();
      src.content(C.ctx, m, { unlit: true, stroke: P });
      C.ctx.restore();
      let ci = C.ctx.getImageData(0, 0, g.Wd, g.Hd), c = ci.data;
      if (post) post(c, g, art, info, pp, src, m);
      if (P.inkPass) {
        // o segundo passe (os contornos, por cima do primeiro já pronto)
        const I = work('art_ink', g.Wd, g.Hd);
        I.ctx.save();
        src.content(I.ctx, m, { unlit: true, stroke: P.inkPass });
        I.ctx.restore();
        if (P.inkPost) {
          const id = I.ctx.getImageData(0, 0, g.Wd, g.Hd);
          P.inkPost(id.data, g);
          I.ctx.putImageData(id, 0, 0);
        }
        C.ctx.putImageData(ci, 0, 0);
        C.ctx.drawImage(I.canvas, 0, 0);
        ci = C.ctx.getImageData(0, 0, g.Wd, g.Hd);
        c = ci.data;
      }
      if (info.lit !== false) {
        const l = shot('art_l', g, src, m, undefined, B0).ctx.getImageData(0, 0, g.Wd, g.Hd).data;
        const u = shot('art_u', g, src, m, { unlit: true }, B0).ctx.getImageData(0, 0, g.Wd, g.Hd).data;
        for (let o = 0; o < c.length; o += 4) {
          if (!c[o + 3] || !u[o + 3]) continue;
          for (let ch = 0; ch < 3; ch++) {
            const uc = u[o + ch], lc = l[o + ch], cc = c[o + ch];
            c[o + ch] = lc >= uc ? cc + ((lc - uc) * (255 - cc)) / Math.max(1, 255 - uc) : (cc * lc) / uc;
          }
        }
      }
      C.ctx.putImageData(ci, 0, 0);
      blit(ctx, base, g, C.canvas);
      return {};
    };
  }
  // a unidade dos traços no fundo (a área de trabalho no lugar do canvas)
  const bgUnit = (g) => unitOf({ w: g.gw * g.cw, h: g.gh * g.ch });
  // o fundo (B0, já na imagem de trabalho) colorindo uma máscara de traços desenhada por draw(x) em pontos
  function bgMasked(ctx, B0, g, draw, alpha, op) {
    const M = work('art_mask', g.Wd, g.Hd);
    M.ctx.save();
    draw(M.ctx);
    M.ctx.restore();
    M.ctx.globalCompositeOperation = 'source-in';
    M.ctx.drawImage(B0, 0, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (op) ctx.globalCompositeOperation = op;
    ctx.drawImage(M.canvas, 0, 0);
    ctx.restore();
  }
  // a claridade de uma cor de preenchimento (de 0, preto, a 1, branco)
  const specLum = (spec) => { const c = specRGB(spec); return c ? lum3(c[0], c[1], c[2]) : 0.5; };

  // sketch (esboço): a cor mais clara e um pouco fora do lugar, como marcador; cada forma passada duas vezes a
  // lápis, tremida, começando num ponto qualquer e passando um pouco do fim; hachura a lápis no escuro e no lado
  // longe da luz.
  const GRAPHITE = '#2b2a30';
  function sketchPaint(art, info) {
    const step = boilStep(art, info), pp = art.paper || PAPER;
    const pencilLines = (ctx, it, pts, closed, w, col, salt, shiftOf) => {
      const U = unitOf(it.canvas);
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let p = 0; p < 2; p++) {
        ctx.globalAlpha = 0.78;
        wobble(ctx, pts, closed, rng(seedOf(art, step, it, salt + p)), { amp: 0.7 * U, wave: 22 * U, over: 0.07, step: 2 * U, shiftOf });
      }
      ctx.restore();
    };
    return {
      bg(ctx, B0) { ctx.globalAlpha = 0.8; ctx.drawImage(B0, 0, 0); },
      fill(ctx, it) {
        const U = unitOf(it.canvas), R = rng(seedOf(art, step, it, 1)), a = R() * TAU, s = (1 + R()) * U;
        ctx.save();
        ctx.translate(Math.cos(a) * s, Math.sin(a) * s);
        ctx.fillStyle = it.fillStyle;
        ctx.fill(it.path);
        ctx.globalAlpha *= 0.28;
        ctx.fillStyle = pp;
        ctx.fill(it.path);
        ctx.restore();
        // a hachura a lápis: no escuro e na faixa de sombra
        const dark = cl((0.5 - specLum(it.fillSpec)) / 0.4);
        ctx.save();
        ctx.strokeStyle = GRAPHITE;
        ctx.lineWidth = 0.6 * U;
        ctx.lineCap = 'round';
        if (dark > 0.05) {
          ctx.save();
          ctx.clip(it.path);
          ctx.globalAlpha *= 0.25 + 0.4 * dark;
          hatchLines(ctx, it, art, 45, (5.5 - 2.5 * dark) * U, rng(seedOf(art, step, it, 2)), { jitter: 0.5, tilt: 0.08, seg: 28, wob: 0.35 });
          ctx.restore();
        }
        ctx.save();
        if (clipBand(ctx, it, 0.3)) {
          ctx.globalAlpha *= 0.45;
          hatchLines(ctx, it, art, 45, 3.2 * U, rng(seedOf(art, step, it, 3)), { jitter: 0.5, tilt: 0.08, seg: 22, wob: 0.35 });
        }
        ctx.restore();
        ctx.restore();
      },
      ink(ctx, it) {
        const U = unitOf(it.canvas), w = it.hasInk && it.ink > 0 ? Math.min(2.2 * U, Math.max(0.8 * U, it.ink * 0.3)) : 0.8 * U;
        const col = it.hasInk && typeof it.inkStyle === 'string' && specLum(it.inkStyle) < 0.4 ? it.inkStyle : GRAPHITE;
        pencilLines(ctx, it, ptsOf(it.poly), true, w, col, it.hole ? 20 : 10);
      },
      line(ctx, it) {
        const U = unitOf(it.canvas), R = rng(seedOf(art, step, it, 1)), a = R() * TAU, s = (1 + R()) * U;
        ctx.save();
        ctx.translate(Math.cos(a) * s, Math.sin(a) * s);
        ctx.fillStyle = ctx.strokeStyle = it.lineStyle;
        ctx.globalAlpha *= 0.8;
        it.body(ctx);
        ctx.restore();
        const E = lineEdges(it), wmax = it.ws ? Math.max(...it.ws) : it.w;
        if (wmax > 3 * U) {
          const n = resample(E.pts, false, 2 * U).length;
          pencilLines(ctx, it, E.pts, false, 0.8 * U, GRAPHITE, 10, (i) => E.half(i, n));
          pencilLines(ctx, it, E.pts, false, 0.8 * U, GRAPHITE, 30, (i) => -E.half(i, n));
        } else pencilLines(ctx, it, E.pts, false, Math.max(0.6 * U, Math.min(wmax, 1.6 * U)), GRAPHITE, 10);
        return true;
      },
    };
  }

  // marker (marcador): o papel fica limpo sob cada cor; uma camada lisa e passadas largas e irregulares no
  // comprimento da forma, que escurecem onde se cruzam; a cor 1 ou 2 pontos fora do lugar; a sombra numa segunda
  // passada do lado longe da luz; o contorno em nanquim e os brilhos de caneta gel nas formas grandes.
  function markerPaint(art, info) {
    const step = boilStep(art, info), pp = art.paper || PAPER;
    // as passadas no espaço parado da forma, no sentido do comprimento dela
    const strokes = (ctx, it, R, wide, a0) => {
      const b = art.boil === 'screen' ? it.box : it.lbox();
      const deg = (b.w >= b.h ? 0 : 90) + (R() - 0.5) * 16;
      const U = unitOf(it.canvas), pw = Math.max(3 * U, Math.min(wide, 14 * U));
      ctx.lineWidth = pw;
      ctx.lineCap = 'round';
      const R2 = rng(seedOf(art, step, it, 7));
      for (let i = 0; i < 2; i++) {
        ctx.globalAlpha = a0 * (0.25 + R2() * 0.25);
        hatchLines(ctx, it, art, deg + (R2() - 0.5) * 6, pw * (0.75 + R2() * 0.5), R2, { jitter: 0.6, tilt: 0.05, cut: 0.12 });
      }
    };
    return {
      bg(ctx, B0, g) {
        ctx.globalAlpha = 0.72;
        ctx.drawImage(B0, 0, 0);
        const R = rng(seedOf(art, 0, { key: 99 }, 0)), pw = (18 * bgUnit(g)) / g.cw;
        bgMasked(ctx, B0, g, (x) => {
          x.strokeStyle = '#ffffff';
          x.lineCap = 'round';
          x.lineWidth = pw;
          for (let y = -pw; y < g.Hd + pw; y += pw * (0.6 + R() * 0.5)) {
            x.globalAlpha = 0.2 + R() * 0.3;
            x.beginPath();
            x.moveTo(-pw - R() * pw * 4, y + (R() - 0.5) * pw);
            x.lineTo(g.Wd + pw - R() * pw * 4, y + (R() - 0.5) * pw);
            x.stroke();
          }
        }, 1);
      },
      fill(ctx, it) {
        const U = unitOf(it.canvas), R = rng(seedOf(art, step, it, 1)), a = R() * TAU, s = (0.8 + R() * 0.8) * U;
        const bb = it.box, wide = Math.min(bb.w, bb.h) / 2.5;
        ctx.save();
        ctx.translate(Math.cos(a) * s, Math.sin(a) * s);
        // o papel limpo, a camada lisa e as passadas
        ctx.fillStyle = pp;
        ctx.fill(it.path);
        ctx.clip(it.path);
        const a0 = ctx.globalAlpha;
        ctx.globalAlpha = 0.6 * a0;
        ctx.fillStyle = it.fillStyle;
        ctx.fillRect(bb.x - 4 * U, bb.y - 4 * U, bb.w + 8 * U, bb.h + 8 * U);
        ctx.strokeStyle = it.fillStyle;
        strokes(ctx, it, R, wide, a0);
        ctx.restore();
        // a sombra: uma segunda passada da mesma cor (multiplicada, fica mais escura)
        ctx.save();
        ctx.translate(Math.cos(a) * s, Math.sin(a) * s);
        if (clipBand(ctx, it, 0.3)) {
          const a0 = ctx.globalAlpha;
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.4 * a0;
          ctx.fillStyle = it.fillStyle;
          ctx.fillRect(bb.x - 4 * U, bb.y - 4 * U, bb.w + 8 * U, bb.h + 8 * U);
          ctx.strokeStyle = it.fillStyle;
          strokes(ctx, it, R, wide * 0.7, a0 * 0.8);
        }
        ctx.restore();
      },
      ink(ctx, it) {
        if (it.hasInk) it.drawInk();
        if (it.hole) return;
        // os brilhos de caneta gel: um risquinho e um ponto do lado da luz, nas formas grandes e não muito claras
        const U = unitOf(it.canvas), bb = it.box, sz = Math.min(bb.w, bb.h), cv = it.canvas;
        if (sz < Math.min(cv.w, cv.h) * 0.08 || bb.w >= cv.w * 0.9 || bb.h >= cv.h * 0.9 || specLum(it.fillSpec) > 0.85) return;
        const l = it.light, ll = Math.hypot(l[0], l[1]) || 1, lx = -l[0] / ll, ly = -l[1] / ll, tx = -ly, ty = lx;
        const cx = bb.x + bb.w / 2 + lx * bb.w * 0.3, cy = bb.y + bb.h / 2 + ly * bb.h * 0.3, r = sz * 0.12;
        ctx.save();
        ctx.clip(it.path);
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = ctx.fillStyle = '#ffffff';
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.2 * U, sz * 0.025);
        ctx.beginPath();
        ctx.moveTo(cx - tx * r, cy - ty * r);
        ctx.quadraticCurveTo(cx + lx * r * 0.25, cy + ly * r * 0.25, cx + tx * r * 0.4, cy + ty * r * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + tx * r * 0.85, cy + ty * r * 0.85, ctx.lineWidth * 0.6, 0, TAU);
        ctx.fill();
        ctx.restore();
      },
      line(ctx, it) {
        const U = unitOf(it.canvas), R = rng(seedOf(art, step, it, 1)), a = R() * TAU, s = (0.8 + R() * 0.8) * U;
        ctx.save();
        ctx.translate(Math.cos(a) * s, Math.sin(a) * s);
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha *= 0.85;
        ctx.fillStyle = ctx.strokeStyle = it.lineStyle;
        it.body(ctx);
        ctx.restore();
        return true;
      },
    };
  }

  // pencil (lápis de cor): em dois passes. No primeiro, o papel limpo sob cada cor, a cor lisa e, na faixa do lado
  // longe da luz, mais escura; os traços largos (braços, pernas) também. Depois, ponto a ponto, a cor vira hachura
  // de lápis (pencilPost): traços finos e inclinados e uma camada leve cruzada, mais fechados onde a cor é mais
  // forte, e o grão do papel. No segundo passe (inkPass), por cima e sem hachura: o contorno, um lápis tremido
  // (sem contorno, uma linha leve da cor da forma), e os traços finos; cada forma apaga ali o que ficou atrás dela.
  function pencilPaint(art, info) {
    const step = boilStep(art, info), pp = art.paper || PAPER;
    const thin = (it) => (it.ws ? Math.max(...it.ws) : it.w) <= 2.2 * unitOf(it.canvas);
    const erase = (ctx, draw) => { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = ctx.strokeStyle = '#000000'; draw(); ctx.restore(); };
    const inkPass = {
      glow: false,
      fill(ctx, it) { erase(ctx, () => ctx.fill(it.path)); },
      ink(ctx, it) {
        const U = unitOf(it.canvas), has = it.hasInk && it.ink > 0;
        const own = has ? null : specRGB(it.fillSpec);
        if (!has && !own) return;
        ctx.save();
        ctx.strokeStyle = has ? it.inkStyle : hexOf(own.map((v) => v * 0.72));
        ctx.lineWidth = has ? Math.min(2.6 * U, Math.max(0.9 * U, it.ink * 0.4)) : 0.7 * U;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha *= has ? 0.92 : 0.6;
        wobble(ctx, ptsOf(it.poly), true, rng(seedOf(art, step, it, it.hole ? 21 : 11)), { amp: 0.35 * U, wave: 30 * U, over: 0.03, step: 2 * U });
        ctx.restore();
      },
      line(ctx, it) {
        if (thin(it)) { ctx.save(); ctx.globalAlpha *= 0.9; ctx.fillStyle = ctx.strokeStyle = it.lineStyle; it.body(ctx); ctx.restore(); }
        else erase(ctx, () => it.body(ctx));
        return true;
      },
    };
    return {
      inkPass,
      bg(ctx, B0) { ctx.drawImage(B0, 0, 0); },
      fill(ctx, it) {
        const U = unitOf(it.canvas), bb = it.box, a0 = ctx.globalAlpha;
        ctx.save();
        ctx.fillStyle = pp;
        ctx.fill(it.path);
        ctx.fillStyle = it.fillStyle;
        ctx.fill(it.path);
        ctx.restore();
        // a sombra: mais força (a cor multiplicada por ela mesma)
        ctx.save();
        if (clipBand(ctx, it, 0.3)) {
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = a0 * 0.5;
          ctx.fillStyle = it.fillStyle;
          ctx.fillRect(bb.x - 4 * U, bb.y - 4 * U, bb.w + 8 * U, bb.h + 8 * U);
        }
        ctx.restore();
      },
      ink() {},
      line(ctx, it) {
        if (!thin(it)) { ctx.save(); ctx.fillStyle = ctx.strokeStyle = it.lineStyle; it.body(ctx); ctx.restore(); }
        return true;
      },
    };
  }
  // O azulejo da hachura do lápis (TP unidades de lado, hr pontos por unidade, os mesmos da imagem de trabalho: um
  // azulejo mais fino, reduzido no desenho, faria listras de interferência): cada ponto guarda o quanto está
  // perto do meio de um traço (R: a hachura inclinada; G: a cruzada). As linhas têm direção inteira (a, b) no
  // azulejo, então ele se repete sem emenda; e, com a e b sem divisor comum, as linhas do azulejo são uma linha
  // só, que dá voltas nele: ela é cortada em traços, cada um com a sua força, um pouco fora do lugar e torto,
  // afinando nas pontas.
  const pencilTiles = new Map();
  const gcd = (x, y) => { x = Math.abs(x); y = Math.abs(y); while (y) [x, y] = [y, x % y]; return x; };
  // m, n com a·m + b·n = 1
  function bezout(a, b) {
    let [r0, r1, s0, s1, t0, t1] = [a, b, 1, 0, 0, 1];
    while (r1) { const q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; [t0, t1] = [t1, t0 - q * t1]; }
    return r0 < 0 ? [-s0, -t0] : [s0, t0];
  }
  function hatchFamily(deg, sp, seg, salt) {
    const r = ((deg + 90) * Math.PI) / 180, N = TP / sp;
    const a = Math.round(N * Math.cos(r));
    let b = Math.round(N * Math.sin(r));
    while (gcd(a, b) !== 1) b += b >= 0 ? 1 : -1;
    const len = Math.hypot(a, b), [m0, n0] = bezout(a, b), L = TP * len, cells = Math.max(1, Math.round(L / seg));
    const gper = Math.max(1, Math.round(L / 5));
    return { a, b, len, spr: TP / len, shift: ((-b * m0 + a * n0) * TP) / len, L, cells, cell: L / cells, salt, gper, ga: L / gper };
  }
  // O valor (0 a 1) da família F no ponto (x, y) do azulejo, em unidades: 1 no meio de um traço, 0 longe. As
  // linhas ondulam (um ruído que também se repete a cada TP), e cada traço sai um pouco do lugar e entorta; por
  // isso o ponto olha a linha mais perto e as duas vizinhas. S (opcional): onde o ponto está no traço mais forte.
  function hatchAt(F, x, y, S) {
    const t = (F.a * x + F.b * y) / TP + 0.3 * (noiseP(x / 32, y / 32, TP / 32, F.salt + 7) - 0.5), k0 = Math.round(t);
    let best = 0;
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      let sAl = ((-F.b * x + F.a * y) / F.len - k * F.shift) % F.L;
      if (sAl < 0) sAl += F.L;
      // os traços têm tamanhos diferentes (o começo de cada um sai do lugar), senão os buracos entre eles se
      // alinham de uma linha para a outra e fazem faixas
      const at = (j) => (j + 0.8 * (rnd(((j % F.cells) + F.cells) % F.cells, F.salt + 4) - 0.5)) * F.cell;
      let jj = Math.floor(sAl / F.cell);
      if (sAl < at(jj)) jj--;
      else if (sAl >= at(jj + 1)) jj++;
      const j = ((jj % F.cells) + F.cells) % F.cells, len = at(jj + 1) - at(jj), pos = sAl - at(jj);
      const gap = len * (0.03 + 0.1 * rnd(j, F.salt));
      if (pos > len - gap) continue;
      const u = pos / (len - gap), taper = Math.min(1, 0.3 + u / 0.12, 0.3 + (1 - u) / 0.12);
      const off = (rnd(j, F.salt + 2) - 0.5) * 0.3 + (rnd(j, F.salt + 3) - 0.5) * 0.4 * (u - 0.5);
      const v = (0.6 + 0.4 * rnd(j, F.salt + 1)) * taper * (1 - 2 * Math.abs(t - k - off));
      if (v > best) {
        best = v;
        if (S) { S.s = sAl; S.j = j; S.fr = t - k - off; }
      }
    }
    return best;
  }
  // Os riscos secos de um traço largo (o giz que pulou): um ruído comprido ao longo do traço (ga unidades) e
  // estreito na largura (nb faixas por traço); 1 fora dos traços.
  const streakOf = (F, S, nb) => (S.j < 0 ? 1 : noiseP(S.s / F.ga, (S.fr + 0.5) * nb + S.j * 8, F.gper, F.salt + 9));
  // fams: as duas famílias [ângulo, espaço, tamanho dos traços, sal] (R e G do azulejo); nb: com os riscos secos
  // do traço mais forte (B), em nb faixas por traço
  function hatchTile(fams, k, nb) {
    const n = Math.max(TP, Math.round(TP * k)), HR = n / TP, key = fams.flat().concat([n, nb || 0]).map((v) => v.toFixed(3)).join(',');
    if (pencilTiles.has(key)) return pencilTiles.get(key);
    // guarda poucos azulejos (cada estilo, tamanho de canvas e escala faz o seu)
    if (pencilTiles.size > 8) pencilTiles.delete(pencilTiles.keys().next().value);
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d'), img = x.createImageData(n, n), D = img.data;
    const F1 = hatchFamily(...fams[0]), F2 = hatchFamily(...fams[1]), S1 = {}, S2 = {};
    for (let py = 0, o = 0; py < n; py++) {
      for (let px = 0; px < n; px++, o += 4) {
        const ux = (px + 0.5) / HR, uy = (py + 0.5) / HR;
        if (nb) {
          S1.j = S2.j = -1;
          const v1 = hatchAt(F1, ux, uy, S1), v2 = hatchAt(F2, ux, uy, S2);
          D[o] = Math.round(255 * v1);
          D[o + 1] = Math.round(255 * v2);
          D[o + 2] = Math.round(255 * (v1 >= v2 ? streakOf(F1, S1, nb) : streakOf(F2, S2, nb)));
        } else {
          D[o] = Math.round(255 * hatchAt(F1, ux, uy));
          D[o + 1] = Math.round(255 * hatchAt(F2, ux, uy));
        }
        D[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    const T = { canvas: c, data: D, n, hr: HR, spr1: F1.spr, spr2: F2.spr };
    pencilTiles.set(key, T);
    return T;
  }
  const pencilTile = (sp1, sp2, seg, k) => hatchTile([[-60, sp1, seg, 51], [30, sp2, seg * 0.8, 61]], k);
  // A cor vira hachura (o azulejo, preso a cada forma pelo passe tex; no fundo, nos traços e com boil=screen,
  // parado na tela) e ganha o grão do papel. A força (o quanto a cor se afasta do papel, no canal que mais
  // escureceu) fecha a hachura: no escuro, ela vira cor cheia.
  function pencilPost(c, g, art, info, pp, src, m) {
    const { Wd, Hd } = g, k = 1 / g.cw, Up = Math.min(2, Math.max(1, bgUnit(g)));
    const sp1 = Math.max(1.6 * Up, 1.8 / k);
    const T = pencilTile(sp1, sp1 * 1.4, 26 * Up, k), off = texOff(art, info), n = T.n, td = T.data, HR = T.hr;
    let tx = null;
    if (art.boil !== 'screen') {
      const X = work('art_tu', Wd, Hd);
      X.ctx.save();
      src.content(X.ctx, m, { tex: { tile: T.canvas, d: HR, px: k, off } });
      X.ctx.restore();
      tx = X.ctx.getImageData(0, 0, Wd, Hd).data;
    }
    const s1 = 2 / (T.spr1 * k), s2 = 2 / (T.spr2 * k), gs = Math.max(1, 0.9 * k);
    for (let py = 0, o = 0; py < Hd; py++) {
      for (let px = 0; px < Wd; px++, o += 4) {
        if (!c[o + 3]) continue;
        const f = Math.max(1 - c[o] / pp[0], 1 - c[o + 1] / pp[1], 1 - c[o + 2] / pp[2]);
        if (f <= 0.01) continue;
        let v1, v2;
        if (tx && tx[o + 3] >= 128) { v1 = tx[o] / 255; v2 = tx[o + 1] / 255; } else {
          let ix = Math.floor((px / k + off[0]) * HR) % n, iy = Math.floor((py / k + off[1]) * HR) % n;
          if (ix < 0) ix += n;
          if (iy < 0) iy += n;
          const q = (iy * n + ix) * 4;
          v1 = td[q] / 255; v2 = td[q + 1] / 255;
        }
        // o traço fica mais largo com a força (no escuro, quase fecha); a camada cruzada só aparece com força
        const D = Math.min(1, f * 1.1);
        const m1 = cl((v1 - (0.82 - 0.72 * D)) / s1 + 0.5), m2 = cl((v2 - (0.85 - 0.6 * D)) / s2 + 0.5) * 0.3 * D;
        // o grão: onde a força é pouca, o lápis pula os buracos do papel; a cor fica num véu leve (base) entre os traços
        const z = 0.6 * noiseP(px / gs, py / gs, 4096, 41) + 0.4 * rnd(px, py);
        const base = 0.08 + 0.5 * D * D, mm = (base + (1 - base) * (1 - (1 - m1) * (1 - m2))) * cl((f * 1.6 + 0.25 - z) / 0.35) * 1.15;
        c[o] = Math.max(0, pp[0] + (c[o] - pp[0]) * mm); c[o + 1] = Math.max(0, pp[1] + (c[o + 1] - pp[1]) * mm); c[o + 2] = Math.max(0, pp[2] + (c[o + 2] - pp[2]) * mm);
      }
    }
  }

  // ---------- crayon, chalk e watercolor ----------
  // a textura da forma: o azulejo T preso a cada forma pelo passe tex (turn: o giro dela em cada forma); com
  // boil=screen, null (o azulejo fica parado na tela)
  function shapeTex(g, src, m, art, info, T, turn) {
    if (art.boil === 'screen') return null;
    const X = work('art_tu', g.Wd, g.Hd);
    X.ctx.save();
    src.content(X.ctx, m, { tex: { tile: T.canvas, d: T.hr, px: 1 / g.cw, off: texOff(art, info), turn } });
    X.ctx.restore();
    return X.ctx.getImageData(0, 0, g.Wd, g.Hd).data;
  }
  // o valor do azulejo no ponto o (px, py) da imagem de trabalho, em V[0] e V[1]: o da forma (tx) ou, fora das
  // formas (o fundo, os traços), o azulejo parado na tela
  function tileAt(V, T, tx, o, px, py, k, off) {
    if (tx && tx[o + 3] >= 128) { V[0] = tx[o] / 255; V[1] = tx[o + 1] / 255; V[2] = tx[o + 2] / 255; return; }
    const n = T.n;
    let ix = Math.floor((px / k + off[0]) * T.hr) % n, iy = Math.floor((py / k + off[1]) * T.hr) % n;
    if (ix < 0) ix += n;
    if (iy < 0) iy += n;
    const q = (iy * n + ix) * 4;
    V[0] = T.data[q] / 255; V[1] = T.data[q + 1] / 255; V[2] = T.data[q + 2] / 255;
  }
  // a cobertura das formas e dos traços (o alfa), sem o fundo
  const COVER = {
    glow: false,
    fill(ctx, it) { ctx.fillStyle = '#ffffff'; ctx.fill(it.path); },
    ink() {},
    line(ctx, it) { ctx.fillStyle = ctx.strokeStyle = '#ffffff'; it.body(ctx); return true; },
  };
  function coverOf(g, src, m) {
    const X = work('art_cov', g.Wd, g.Hd);
    X.ctx.save();
    src.content(X.ctx, m, { unlit: true, stroke: COVER });
    X.ctx.restore();
    return X.ctx.getImageData(0, 0, g.Wd, g.Hd).data;
  }
  // o grão do papel (0 a 1), parado na tela: um ruído suave de gs pontos e um sorteio por ponto (wr: o peso dele)
  const grainAt = (px, py, gs, salt, wr) => (1 - wr) * noiseP(px / gs, py / gs, 4096, salt) + wr * rnd(px + salt * 7919, py);
  // um campo suave (fn(px, py), devagar na tela) calculado a cada st pontos e misturado entre eles: bem mais rápido
  // que o ruído ponto a ponto
  function lowField(Wd, Hd, st, fn) {
    const gw = Math.ceil(Wd / st) + 2, gh = Math.ceil(Hd / st) + 2, F = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) F[j * gw + i] = fn(i * st, j * st);
    return (px, py) => {
      const x = px / st, y = py / st, i = x | 0, j = y | 0, fx = x - i, fy = y - j, o = j * gw + i;
      const a = F[o], b = F[o + 1], c = F[o + gw], d = F[o + gw + 1];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }
  // o giro das passadas em cada forma: sorteado pelo número da forma (e de novo, um pouco, a cada boil)
  const turnOf = (art, info) => {
    const step = boilStep(art, info);
    return (key) => rnd(key, (art.seed | 0) * 31 + 5) * Math.PI + (step ? (rnd(key, step * 977 + (art.seed | 0)) - 0.5) * 0.35 : 0);
  };
  const eraseWith = (ctx, draw) => { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = ctx.strokeStyle = '#000000'; draw(); ctx.restore(); };
  // um traço fino (sem o corpo): uma passada tremida no meio dele, da largura dele (no mínimo w0)
  function thinLine(ctx, it, R, w0, o) {
    const E = lineEdges(it), wmax = it.ws ? Math.max(...it.ws) : it.w;
    ctx.save();
    ctx.lineWidth = Math.max(w0, wmax);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    wobble(ctx, E.pts, false, R, o);
    ctx.restore();
  }
  // a sombra: a cor multiplicada por ela mesma (k: a força), na faixa do lado longe da luz
  function bandShade(ctx, it, k) {
    const U = unitOf(it.canvas), bb = it.box, a0 = ctx.globalAlpha;
    ctx.save();
    if (clipBand(ctx, it, 0.3)) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = a0 * k;
      ctx.fillStyle = it.fillStyle;
      ctx.fillRect(bb.x - 4 * U, bb.y - 4 * U, bb.w + 8 * U, bb.h + 8 * U);
    }
    ctx.restore();
  }
  // o grão num passe de contornos (d: os pontos da imagem de trabalho): onde o papel tem um morro alto, o giz pula
  function grainInk(d, g, gs, lo, soft, salt) {
    const { Wd, Hd } = g;
    for (let py = 0, o = 0; py < Hd; py++) {
      for (let px = 0; px < Wd; px++, o += 4) {
        if (!d[o + 3]) continue;
        d[o + 3] = Math.round(d[o + 3] * cl((lo - grainAt(px, py, gs, salt, 0.25)) / soft));
      }
    }
  }

  // crayon (giz de cera): em dois passes, como o lápis. No primeiro, o papel limpo sob cada cor, a cor lisa, mais
  // forte na borda (quem pinta contorna a forma antes de encher) e na faixa de sombra. Depois, ponto a ponto
  // (crayonPost), a cor vira passadas largas de vai-e-vem, numa direção sorteada para cada forma, com o grão do
  // papel aparecendo em pontinhos claros onde a cera não pegou. No segundo passe, por cima: o contorno, grosso e
  // tremido, também com o grão.
  function crayonPaint(art, info) {
    const step = boilStep(art, info), pp = art.paper || PAPER;
    const thin = (it) => (it.ws ? Math.max(...it.ws) : it.w) <= 2.6 * unitOf(it.canvas);
    const inkPass = {
      glow: false,
      fill(ctx, it) { eraseWith(ctx, () => ctx.fill(it.path)); },
      ink(ctx, it) {
        const U = unitOf(it.canvas), has = it.hasInk && it.ink > 0;
        const own = has ? null : specRGB(it.fillSpec);
        if (!has && !own) return;
        ctx.save();
        ctx.strokeStyle = has ? it.inkStyle : hexOf(own.map((v) => v * 0.7));
        ctx.lineWidth = has ? Math.min(3.4 * U, Math.max(1.5 * U, it.ink * 0.6)) : 1.1 * U;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha *= has ? 0.95 : 0.7;
        wobble(ctx, ptsOf(it.poly), true, rng(seedOf(art, step, it, it.hole ? 21 : 11)), { amp: 0.6 * U, wave: 24 * U, over: 0.05, step: 2 * U });
        ctx.restore();
      },
      line(ctx, it) {
        const U = unitOf(it.canvas);
        if (thin(it)) { ctx.save(); ctx.strokeStyle = it.lineStyle; thinLine(ctx, it, rng(seedOf(art, step, it, 13)), 1.5 * U, { amp: 0.4 * U, wave: 24 * U, step: 2 * U }); ctx.restore(); }
        else eraseWith(ctx, () => it.body(ctx));
        return true;
      },
    };
    return {
      inkPass,
      inkPost: (d, g) => grainInk(d, g, Math.max(1, (1.2 * Math.min(2, Math.max(1, bgUnit(g)))) / g.cw), 0.8, 0.08, 43),
      bg(ctx, B0) { ctx.drawImage(B0, 0, 0); },
      fill(ctx, it) {
        const U = unitOf(it.canvas), a0 = ctx.globalAlpha;
        ctx.save();
        ctx.fillStyle = pp;
        ctx.fill(it.path);
        ctx.fillStyle = it.fillStyle;
        ctx.fill(it.path);
        // a cera junta na borda: uma faixa por dentro, mais forte
        ctx.clip(it.path);
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = a0 * 0.4;
        ctx.strokeStyle = it.fillStyle;
        ctx.lineWidth = 5 * U;
        ctx.lineJoin = 'round';
        ctx.stroke(it.path);
        ctx.restore();
        bandShade(ctx, it, 0.5);
      },
      ink() {},
      line(ctx, it) {
        if (!thin(it)) { ctx.save(); ctx.fillStyle = ctx.strokeStyle = it.lineStyle; it.body(ctx); ctx.restore(); }
        return true;
      },
    };
  }
  // As passadas do giz de cera: duas famílias de traços largos e longos, quase na mesma direção (a ida e a volta).
  // A força (o quanto a cor se afasta do papel) alarga as passadas; o grão do papel, grosso, fica claro onde a
  // pressão é pouca; onde as duas passadas se cruzam, a cera junta e a cor fica mais forte.
  function crayonPost(c, g, art, info, pp, src, m) {
    const { Wd, Hd } = g, k = 1 / g.cw, Up = Math.min(2, Math.max(1, bgUnit(g)));
    const sp = Math.max(3.2 * Up, 2.8 / k);
    const T = hatchTile([[-55, sp, 64 * Up, 71], [-47, sp * 1.2, 56 * Up, 81]], k, 3);
    const tx = shapeTex(g, src, m, art, info, T, turnOf(art, info)), off = texOff(art, info), V = [0, 0, 0];
    const s1 = 2 / (T.spr1 * k), s2 = 2 / (T.spr2 * k), gs = Math.max(1, 1.2 * Up * k);
    for (let py = 0, o = 0; py < Hd; py++) {
      for (let px = 0; px < Wd; px++, o += 4) {
        if (!c[o + 3]) continue;
        const f = Math.max(1 - c[o] / pp[0], 1 - c[o + 1] / pp[1], 1 - c[o + 2] / pp[2]);
        if (f <= 0.01) continue;
        tileAt(V, T, tx, o, px, py, k, off);
        const D = Math.min(1, f * 1.15);
        const m1 = cl((V[0] - (0.62 - 0.55 * D)) / s1 + 0.5), m2 = cl((V[1] - (0.72 - 0.5 * D)) / s2 + 0.5) * (0.35 + 0.5 * D);
        // o grão: a cera pega nos morros do papel e pula os vales (pontinhos claros), mais onde a pressão é pouca
        const s = 1 - (1 - m1) * (1 - m2), z = 0.8 * grainAt(px, py, gs, 43, 0.15) + 0.2 * V[2];
        const base = 0.3 - 0.25 * D + 0.5 * D * D, mm = (base + (1 - base) * s) * cl((0.42 + 0.52 * D - z) / 0.07), wax = 1 - 0.18 * m1 * m2;
        for (let ch = 0; ch < 3; ch++) c[o + ch] = Math.max(0, pp[ch] + (c[o + ch] * wax - pp[ch]) * mm);
      }
    }
  }

  // chalk (giz no quadro): o papel é o quadro (verde-escuro). Cada forma vira giz da cor dela, mais clara (um
  // pastel), e mais cheio onde a cor é mais clara: as cores escuras ficam quase só o quadro. Passadas largas, numa
  // direção por forma, com pó entre elas e o grão do quadro. O contorno vira giz branco, por cima; sem contorno,
  // uma linha leve da cor da forma. O fundo do canvas vira giz mais leve (meio apagado).
  const BOARD = '#29382f', CHALK = '#f2efe6';
  function chalkPaint(art, info) {
    const step = boilStep(art, info), board = art.paper || BOARD;
    const thin = (it) => (it.ws ? Math.max(...it.ws) : it.w) <= 2.6 * unitOf(it.canvas);
    const pastel = (rgb, t) => hexOf(rgb.map((v) => v + (255 - v) * t));
    const inkPass = {
      glow: false,
      fill(ctx, it) { eraseWith(ctx, () => ctx.fill(it.path)); },
      ink(ctx, it) {
        const U = unitOf(it.canvas), has = it.hasInk && it.ink > 0;
        const own = has ? null : specRGB(it.fillSpec);
        if (!has && !own) return;
        ctx.save();
        ctx.strokeStyle = has ? CHALK : pastel(own, 0.6);
        ctx.lineWidth = has ? Math.min(3 * U, Math.max(1.2 * U, it.ink * 0.5)) : 1 * U;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha *= has ? 0.9 : 0.5;
        wobble(ctx, ptsOf(it.poly), true, rng(seedOf(art, step, it, it.hole ? 21 : 11)), { amp: 0.5 * U, wave: 26 * U, over: 0.04, step: 2 * U });
        ctx.restore();
      },
      line(ctx, it) {
        const U = unitOf(it.canvas);
        if (thin(it)) {
          const col = specRGB(it.lineSpec);
          ctx.save();
          ctx.strokeStyle = col ? pastel(col, 0.4) : CHALK;
          thinLine(ctx, it, rng(seedOf(art, step, it, 13)), 1.2 * U, { amp: 0.4 * U, wave: 24 * U, step: 2 * U });
          ctx.restore();
        } else eraseWith(ctx, () => it.body(ctx));
        return true;
      },
    };
    return {
      paper: BOARD,
      inkPass,
      inkPost: (d, g) => grainInk(d, g, Math.max(1, (1.1 * Math.min(2, Math.max(1, bgUnit(g)))) / g.cw), 0.66, 0.14, 47),
      bg(ctx, B0) { ctx.drawImage(B0, 0, 0); },
      fill(ctx, it) {
        ctx.save();
        ctx.fillStyle = it.fillStyle;
        ctx.fill(it.path);
        ctx.restore();
        bandShade(ctx, it, 0.5);
      },
      ink() {},
      line(ctx, it) {
        if (!thin(it)) { ctx.save(); ctx.fillStyle = ctx.strokeStyle = it.lineStyle; it.body(ctx); ctx.restore(); }
        return true;
      },
    };
  }
  // A cor de cada ponto vira giz: a quantidade vem da claridade (o valor mais alto e a claridade, juntos), a cor é
  // a mesma, mais clara. Nas formas, passadas largas (com os riscos secos, onde o giz pulou) e um pouco de pó
  // entre elas; o grão do quadro decide onde o giz pegou. O fundo do canvas é só pó, mais leve.
  function chalkPost(c, g, art, info, pp, src, m) {
    const { Wd, Hd } = g, k = 1 / g.cw, Up = Math.min(2, Math.max(1, bgUnit(g)));
    const sp = Math.max(6 * Up, 4 / k);
    const T = hatchTile([[-50, sp, 80 * Up, 73], [-42, sp * 1.25, 70 * Up, 83]], k, 4);
    const tx = shapeTex(g, src, m, art, info, T, turnOf(art, info)), off = texOff(art, info), V = [0, 0, 0];
    const cv = coverOf(g, src, m);
    const s1 = 2 / (T.spr1 * k), s2 = 2 / (T.spr2 * k), gs = Math.max(1, 1.2 * k), b0 = Math.max(0.12, lum3(pp[0], pp[1], pp[2]) + 0.06);
    const Ub = bgUnit(g), cs = 120 * Ub * k, ds = 30 * Ub * k, CK = rgbOf(CHALK);
    const OLD = lowField(Wd, Hd, Math.max(2, Math.round(cs / 8)), (x, y) => 0.036 * noiseP(x / cs, y / cs, 4096, 48) + 0.024 * noiseP((x / cs) * 2.3 + 17.3, (y / cs) * 2.3, 4096, 50));
    const DUST = lowField(Wd, Hd, Math.max(2, Math.round(ds / 6)), (x, y) => 0.6 * noiseP(x / ds, y / ds, 4096, 49) + 0.4 * noiseP((0.8 * x + 0.6 * y) / (0.45 * ds), (0.8 * y - 0.6 * x) / (0.45 * ds), 4096, 51));
    for (let py = 0, o = 0; py < Hd; py++) {
      for (let px = 0; px < Wd; px++, o += 4) {
        if (!c[o + 3]) continue;
        const r = c[o], gg = c[o + 1], b = c[o + 2];
        const a = cl(((0.55 * Math.max(r, gg, b)) / 255 + 0.45 * lum3(r, gg, b) - b0) / 0.6);
        // o resto de giz apagado no quadro (nuvens bem leves, paradas na tela)
        const old = OLD(px, py);
        if (a <= 0.005) { for (let ch = 0; ch < 3; ch++) c[o + ch] = pp[ch] + (CK[ch] - pp[ch]) * old; continue; }
        const z = grainAt(px, py, gs, 47, 0.15), w = cv[o + 3] / 255;
        // o fundo: pó de giz esfregado, em nuvens
        let cov = old + 0.28 * a * (0.6 + 0.8 * (DUST(px, py) - 0.5)) * (0.8 + 0.2 * cl((0.6 - z) / 0.3));
        if (w > 0) {
          tileAt(V, T, tx, o, px, py, k, off);
          const th = 0.45 - 0.4 * a, p1 = cl((V[0] - th) / s1 + 0.5), p2 = cl((V[1] - th - 0.1) / s2 + 0.5) * 0.9;
          const p = 1 - (1 - p1) * (1 - p2), dry = 1 - 0.45 * cl((V[2] - (0.35 + 0.5 * a)) / 0.25), dust = 0.25 + 0.45 * a;
          const sc = (dust + (1 - dust) * p * dry) * (0.75 + 0.25 * cl((0.4 + 0.5 * a - z) / 0.3)) * (0.35 + 0.65 * a);
          cov += (sc - cov) * w;
        }
        c[o] = pp[0] + (r + (255 - r) * 0.4 - pp[0]) * cov;
        c[o + 1] = pp[1] + (gg + (255 - gg) * 0.4 - pp[1]) * cov;
        c[o + 2] = pp[2] + (b + (255 - b) * 0.4 - pp[2]) * cov;
      }
    }
  }

  // watercolor (aquarela, caneta e aguada): o papel limpo sob cada forma e a cor numa aguada transparente, mais
  // clara; na borda da mancha, a tinta junta (mais escura) e vaza um pouco para fora da linha, tremida. A sombra
  // é uma segunda aguada. Depois, ponto a ponto (watercolorPost), a tinta fica desigual na mancha (mais e menos
  // pigmento, preso à forma), granula no papel e o papel tem a sua textura. No segundo passe: o contorno vira
  // uma linha fina de caneta, um pouco irregular, por cima.
  function watercolorPaint(art, info) {
    const step = boilStep(art, info), pp = art.paper || PAPER;
    const thin = (it) => (it.ws ? Math.max(...it.ws) : it.w) <= 2.2 * unitOf(it.canvas);
    // A borda da mancha. Na forma: do lado de fora, a aguada que vazou um pouco da linha, tremida e com a borda
    // dura; do lado de dentro, a tinta que juntou na borda ao secar (mais escura). Num buraco, ao contrário.
    const edge = (ctx, it) => {
      const U = unitOf(it.canvas), a0 = ctx.globalAlpha, pts = ptsOf(it.poly), salt = it.hole ? 22 : 12;
      const band = (clip, alpha, w, R, o) => {
        ctx.save();
        if (clip) ctx.clip(it.path); else ctx.clip(inversePath(it.path), 'evenodd');
        ctx.globalAlpha = a0 * alpha;
        ctx.lineWidth = w;
        wobble(ctx, pts, true, R, o);
        ctx.restore();
      };
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = it.fillStyle;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      band(!!it.hole, 0.7, 2.4 * U, rng(seedOf(art, step, it, salt)), { amp: 0.9 * U, wave: 22 * U, over: 0.02, step: 2 * U });
      band(!it.hole, 0.35, 1.6 * U, rng(seedOf(art, step, it, salt + 1)), { amp: 0.4 * U, wave: 14 * U, over: 0.02, step: 2 * U });
      ctx.restore();
    };
    // nos traços largos: as duas bordas, metade para fora e metade para dentro
    const sides = (ctx, it, E, n, salt, sgn) => {
      const U = unitOf(it.canvas);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = it.lineStyle;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha *= 0.45;
      ctx.lineWidth = 1.6 * U;
      wobble(ctx, E.pts, false, rng(seedOf(art, step, it, salt)), { amp: 0.6 * U, wave: 18 * U, step: 2 * U, shiftOf: (i) => sgn * E.half(i, n) });
      ctx.restore();
    };
    const pen = { amp: 0.3, wave: 34, over: 0.02 };
    const inkPass = {
      glow: false,
      fill(ctx, it) { eraseWith(ctx, () => ctx.fill(it.path)); },
      ink(ctx, it) {
        if (!(it.hasInk && it.ink > 0)) return;
        const U = unitOf(it.canvas);
        ctx.save();
        ctx.strokeStyle = it.inkStyle;
        ctx.lineWidth = Math.min(1.6 * U, Math.max(0.6 * U, it.ink * 0.32));
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha *= 0.92;
        wobble(ctx, ptsOf(it.poly), true, rng(seedOf(art, step, it, it.hole ? 21 : 11)), { amp: pen.amp * U, wave: pen.wave * U, over: pen.over, step: 2 * U });
        ctx.restore();
      },
      line(ctx, it) {
        const U = unitOf(it.canvas);
        if (thin(it)) { ctx.save(); ctx.strokeStyle = it.lineStyle; ctx.globalAlpha *= 0.92; thinLine(ctx, it, rng(seedOf(art, step, it, 13)), 0.6 * U, { amp: pen.amp * U, wave: pen.wave * U, step: 2 * U }); ctx.restore(); }
        else eraseWith(ctx, () => it.body(ctx));
        return true;
      },
    };
    return {
      inkPass,
      bg(ctx, B0) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.82; ctx.drawImage(B0, 0, 0); },
      fill(ctx, it) {
        const a0 = ctx.globalAlpha;
        ctx.save();
        ctx.fillStyle = pp;
        ctx.fill(it.path);
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = a0 * 0.85;
        ctx.fillStyle = it.fillStyle;
        ctx.fill(it.path);
        ctx.restore();
        bandShade(ctx, it, 0.4);
      },
      ink(ctx, it) { if (it.fillStyle) edge(ctx, it); },
      line(ctx, it) {
        if (thin(it)) return true;
        const U = unitOf(it.canvas), a0 = ctx.globalAlpha;
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = a0 * 0.85;
        ctx.fillStyle = ctx.strokeStyle = it.lineStyle;
        it.body(ctx);
        ctx.restore();
        const E = lineEdges(it), n = resample(E.pts, false, 2 * U).length;
        sides(ctx, it, E, n, 12, 1);
        sides(ctx, it, E, n, 32, -1);
        return true;
      },
    };
  }
  // O azulejo da aguada: R, o quanto de pigmento (um ruído suave em três tamanhos); G, as marcas onde a água
  // voltou (as cristas de um ruído). Ele se repete a cada TP unidades, sem emenda.
  const washTiles = new Map();
  function washTile(k) {
    const n = Math.max(TP, Math.round(TP * k)), HR = n / TP;
    if (washTiles.has(n)) return washTiles.get(n);
    if (washTiles.size > 3) washTiles.delete(washTiles.keys().next().value);
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d'), img = x.createImageData(n, n), D = img.data;
    for (let py = 0, o = 0; py < n; py++) {
      for (let px = 0; px < n; px++, o += 4) {
        const u = (px + 0.5) / HR, v = (py + 0.5) / HR;
        const d = 0.5 * noiseP(u / 16, v / 16, TP / 16, 91) + 0.3 * noiseP(u / 8, v / 8, TP / 8, 92) + 0.2 * noiseP(u / 4, v / 4, TP / 4, 93);
        const r = 1 - Math.abs(2 * noiseP(u / 16, v / 16, TP / 16, 94) - 1);
        D[o] = Math.round(255 * d);
        D[o + 1] = Math.round(255 * r);
        D[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    const T = { canvas: c, data: D, n, hr: HR };
    washTiles.set(n, T);
    return T;
  }
  function watercolorPost(c, g, art, info, pp, src, m) {
    const { Wd, Hd } = g, k = 1 / g.cw;
    const T = washTile(k), tx = shapeTex(g, src, m, art, info, T, null), off = texOff(art, info), V = [0, 0];
    const gs = Math.max(1, 0.8 * k), gb = 3 * k, ws = 50 * k;
    const BIG = lowField(Wd, Hd, Math.max(2, Math.round(ws / 8)), (x, y) => 0.65 * noiseP(x / ws, y / ws, 4096, 96) + 0.35 * noiseP((x / ws) * 2.7 + 9.1, (y / ws) * 2.7, 4096, 98));
    for (let py = 0, o = 0; py < Hd; py++) {
      for (let px = 0; px < Wd; px++, o += 4) {
        if (!c[o + 3]) continue;
        // o papel: morrinhos (o papel de aquarela), um pouco mais escuros nos vales
        const bump = noiseP(px / gb, py / gb, 4096, 95);
        const f = Math.max(1 - c[o] / pp[0], 1 - c[o + 1] / pp[1], 1 - c[o + 2] / pp[2]);
        let s = 1;
        if (f > 0.01) {
          tileAt(V, T, tx, o, px, py, k, off);
          // mais e menos pigmento na mancha, as marcas da água e a granulação (o pigmento cai nos vales do papel)
          const z = grainAt(px, py, gs, 97, 0.4);
          const d = 0.5 * V[0] + 0.5 * BIG(px, py);
          s = (0.8 + (0.45 * (d - 0.5) + 0.12 * (V[1] - 0.5)) * (1 - 0.4 * f)) * (1 + 0.35 * f * (z - 0.5) + 0.2 * (0.5 - bump));
        }
        const sh = 1 - 0.035 * bump;
        for (let ch = 0; ch < 3; ch++) c[o + ch] = Math.max(0, Math.min(255, (pp[ch] + (c[o + ch] - pp[ch]) * s) * sh));
      }
    }
  }

  // cell: o tamanho da célula (unidades do canvas); ws: pontos da imagem de trabalho por unidade (scale: a
  // escala da saída); paint: pinta a imagem pronta; draw: o estilo desenha os passes que quiser
  const tone = (draw, heavy) => ({ cell: (a, scale) => [1 / toneK(scale), 1 / toneK(scale)], ws: (a, scale) => toneK(scale), draw, heavy });
  const STYLES = {
    pixel: { cell: (a) => [a.size, a.size], ws: (a) => (a.size >= 4 ? 1 : Math.ceil(4 / a.size)), paint: pixelPaint },
    ascii: { cell: (a) => a.cell, ws: (a) => (Math.min(a.cell[0], a.cell[1]) >= 4 ? 1 : 2), paint: asciiPaint },
    toon: tone(toonDraw, true),
    engraving: tone(engravingDraw, true),
    woodcut: tone(woodcutDraw, true),
    halftone: tone(halftoneDraw, true),
    comic: tone(comicDraw, true),
    manga: tone(mangaDraw, true),
    riso: tone(risoDraw, true),
    stencil: tone(stencilDraw, true),
    silhouette: tone(silhouetteDraw, false),
    sketch: tone(handDraw(sketchPaint), true),
    marker: tone(handDraw(markerPaint), true),
    pencil: tone(handDraw(pencilPaint, pencilPost), true),
    crayon: tone(handDraw(crayonPaint, crayonPost), true),
    chalk: tone(handDraw(chalkPaint, chalkPost), true),
    watercolor: tone(handDraw(watercolorPaint, watercolorPost), true),
    lines: tone(linesDraw, false),
    neon: tone(neonDraw, true),
  };
  const heavy = (art) => !!(art && STYLES[art.style] && STYLES[art.style].heavy);

  // Pinta a região rect (unidades do desenho) no ctx com o estilo. base: desenho → pixels do ctx.
  // src.content(x, m, pass) desenha o desenho (fundo transparente) com a transformação m, num passe (sem
  // passe: o desenho de sempre; ver drawScene); src.bg(x, m), o fundo (null = sem fundo). info = { colors():
  // cores da palette own, ink, paper: a cor do papel (a referência do ascii, mesmo sem fundo; null = branco),
  // lit: o desenho tem luz, frame: o quadro (para o boil=) }.
  // Devolve { text } no ASCII.
  function paint(ctx, base, rect, art, src, info) {
    const S = STYLES[art.style];
    if (!S) return {};
    const scale = Math.hypot(base[0], base[1]) || 1;
    const cell = S.cell(art, scale), ws = S.ws(art, scale);
    const gx0 = Math.floor(rect.x / cell[0] + 1e-9), gy0 = Math.floor(rect.y / cell[1] + 1e-9);
    const gw = Math.max(1, Math.ceil((rect.x + rect.w) / cell[0] - 1e-9) - gx0), gh = Math.max(1, Math.ceil((rect.y + rect.h) / cell[1] - 1e-9) - gy0);
    const sx = Math.max(1, Math.round(cell[0] * ws)), sy = Math.max(1, Math.round(cell[1] * ws));
    const Wd = gw * sx, Hd = gh * sy;
    const m = [sx / cell[0], 0, 0, sy / cell[1], -gx0 * sx, -gy0 * sy];
    // o recorte na imagem de trabalho: as células da borda só contam os pontos de dentro dele
    const ix0 = Math.max(0, Math.round(rect.x * m[0] + m[4])), iy0 = Math.max(0, Math.round(rect.y * m[3] + m[5]));
    const ix1 = Math.min(Wd, Math.round((rect.x + rect.w) * m[0] + m[4])), iy1 = Math.min(Hd, Math.round((rect.y + rect.h) * m[3] + m[5]));
    if (S.draw) return S.draw(ctx, base, { gx0, gy0, gw, gh, sx, sy, Wd, Hd, cw: cell[0], ch: cell[1], fill: !!src.bg, ix0, iy0, ix1, iy1 }, src, art, info, m) || {};
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
    } else if (a.style === 'toon') {
      if (a.steps !== 3) p.push(`steps=${a.steps}`);
      if (a.shadow !== 0.3) p.push(`shadow=${a.shadow}`);
    } else if (a.style === 'engraving') {
      if (a.gap !== 5) p.push(`gap=${a.gap}`);
    } else if (a.style === 'woodcut') {
      if (a.gap !== 8) p.push(`gap=${a.gap}`);
    } else if (a.style === 'comic' || a.style === 'manga') {
      if (a.old) p.push('old');
      if (a.bw) p.push('bw');
      if (a.size !== (a.style === 'manga' ? 4 : 5)) p.push(`size=${a.size}`);
      if (a.shadow !== 0.3) p.push(`shadow=${a.shadow}`);
      if (a.tones !== undefined && a.tones !== 3) p.push(`tones=${a.tones}`);
    } else if (a.style === 'riso') {
      if (a.inks.join(',') !== ((W.lang && W.lang.RISO_INKS) || []).join(',')) p.push(`inks=${a.inks.join(',')}`);
      if (a.size !== 1) p.push(`size=${a.size}`);
    } else if (a.style === 'halftone') {
      if (a.size !== 6) p.push(`size=${a.size}`);
      if (a.angle !== 45 && !a.color) p.push(`angle=${a.angle}`);
      if (a.color) p.push('color');
    } else if (a.style === 'stencil') {
      if (a.tones !== 3) p.push(`tones=${a.tones}`);
    } else if ((a.style === 'lines' || a.style === 'neon') && a.w) p.push(`w=${a.w}`);
    if (a.c) p.push(`c=${a.c}`);
    if (a.shift !== undefined && a.shift !== 1.5) p.push(`shift=${a.shift}`);
    if (a.levels && (a.levels[0] !== 0 || a.levels[1] !== 1)) p.push(`levels=${a.levels.join(',')}`);
    if (a.paper) p.push(`paper=${a.paper}`);
    const boil0 = W.lang && W.lang.artBoil ? W.lang.artBoil(a) : 0;
    if (a.boil !== undefined && a.boil !== boil0) p.push(`boil=${a.boil}`);
    if (a.seed) p.push(`seed=${a.seed}`);
    return p.join(' ');
  }

  W.art = { has, paint, colorsOf, paperOf, heavy, small, smallScale, snapRect, crisp, describe, PALETTES, STYLES };
})(window.Weasel = window.Weasel || {});
