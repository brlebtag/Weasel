/* Weasel — geometria: matrizes 2D, curvas suaves e traço de espessura variável. */
(function (W) {
  'use strict';

  // Matriz afim no formato do canvas: [a, b, c, d, e, f]
  const M = {
    id() { return [1, 0, 0, 1, 0, 0]; },
    mul(a, b) {
      return [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5],
      ];
    },
    apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; },
    translate(x, y) { return [1, 0, 0, 1, x, y]; },
    rotate(deg) {
      const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      return [c, s, -s, c, 0, 0];
    },
    scale(x, y) { return [x, 0, 0, y, 0, 0]; },
    isId(m) { return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0; },
    det(m) { return m[0] * m[3] - m[1] * m[2]; },
    invert(m) {
      const d = m[0] * m[3] - m[1] * m[2];
      if (!d) return M.id();
      return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d];
    },
  };

  // Cores #rgb/#rgba/#rrggbb/#rrggbbaa → [r,g,b,a] (a de 0 a 1); qualquer outra coisa → null.
  function parseHex(c) {
    if (typeof c !== 'string' || c[0] !== '#') return null;
    let h = c.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const v = parseInt(h, 16);
    if (isNaN(v)) return null;
    return h.length === 6 ? [(v >> 16) & 255, (v >> 8) & 255, v & 255, 1] : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), parseInt(h.slice(6, 8), 16) / 255];
  }
  const hex2 = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  function toHex(c) { return '#' + hex2(c[0]) + hex2(c[1]) + hex2(c[2]) + (c[3] < 1 ? hex2(c[3] * 255) : ''); }
  // Mistura duas cores; só cores hex dão para misturar, as outras trocam de uma vez.
  function lerpColor(a, b, t) {
    const p = parseHex(a), q = parseHex(b);
    if (!p || !q) return t < 1 ? a : b;
    return toHex(p.map((v, i) => v + (q[i] - v) * t));
  }

  const EASE = {
    smooth: (t) => t * t * (3 - 2 * t),
    linear: (t) => t,
    in: (t) => t * t,
    out: (t) => 1 - (1 - t) * (1 - t),
    step: () => 0,
    back: (t) => { const c = 1.70158, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; },
  };

  // Trecho de uma trilha de keys que contém o quadro f: a key de antes, a de depois e o t (já com o ease).
  // Numa animação com loop, antes da primeira key o valor vem da última, passando pela emenda.
  function segment(track, f, frames, loop) {
    if (!track || !track.length) return null;
    const first = track[0], last = track[track.length - 1];
    if (track.length === 1) return { a: first, b: first, t: 0 };
    let a, b, fa, fb;
    if (f < first.frame) {
      if (!loop) return { a: first, b: first, t: 0 };
      a = last; fa = last.frame - frames; b = first; fb = first.frame;
    } else if (f >= last.frame) {
      if (!loop) return { a: last, b: last, t: 0 };
      a = last; fa = last.frame; b = first; fb = first.frame + frames;
    } else {
      let i = 0;
      while (track[i + 1].frame <= f) i++;
      a = track[i]; b = track[i + 1]; fa = a.frame; fb = b.frame;
    }
    const span = fb - fa;
    return { a, b, t: span > 0 ? EASE[a.ease]((f - fa) / span) : 0 };
  }

  // Curva suave que passa por todos os pontos. Pontos com corner=true viram cantos vivos e
  // pontos com tan=[dx,dy] usam essa alça (a do outro lado é espelhada).
  // Cada segmento é uma cúbica [x0,y0, c1x,c1y, c2x,c2y, x1,y1].
  function smoothSegs(pts, closed, smooth) {
    const n = pts.length;
    if (n < 2) return [];
    const k = 0.36 * (smooth === undefined ? 1 : smooth);
    const dir = pts.map((p, i) => {
      if (p.corner || p.tan || k <= 0) return null;
      let a = pts[i - 1], b = pts[i + 1];
      if (closed) { a = pts[(i - 1 + n) % n]; b = pts[(i + 1) % n]; }
      if (!a || !b) return null;
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
      return l > 1e-9 ? [dx / l, dy / l] : null;
    });
    const segs = [];
    const count = closed ? n : n - 1;
    for (let i = 0; i < count; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      const dp = dir[i], dq = dir[(i + 1) % n];
      const c1 = p.tan ? [p.x + p.tan[0], p.y + p.tan[1]] : dp ? [p.x + dp[0] * len * k, p.y + dp[1] * len * k] : [p.x + (q.x - p.x) / 3, p.y + (q.y - p.y) / 3];
      const c2 = q.tan ? [q.x - q.tan[0], q.y - q.tan[1]] : dq ? [q.x - dq[0] * len * k, q.y - dq[1] * len * k] : [q.x - (q.x - p.x) / 3, q.y - (q.y - p.y) / 3];
      segs.push([p.x, p.y, c1[0], c1[1], c2[0], c2[1], q.x, q.y]);
    }
    return segs;
  }

  function polySegs(pts, closed) {
    const segs = [];
    const n = pts.length, count = closed ? n : n - 1;
    for (let i = 0; i < count; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      segs.push([p.x, p.y, p.x + (q.x - p.x) / 3, p.y + (q.y - p.y) / 3, q.x - (q.x - p.x) / 3, q.y - (q.y - p.y) / 3, q.x, q.y]);
    }
    return segs;
  }

  const KAPPA = 0.5522847498;

  // Elipse como 4 cúbicas, já rotacionada (graus) em torno do centro.
  function ellipseSegs(cx, cy, rx, ry, rot) {
    const kx = rx * KAPPA, ky = ry * KAPPA;
    const raw = [
      [rx, 0, rx, ky, kx, ry, 0, ry],
      [0, ry, -kx, ry, -rx, ky, -rx, 0],
      [-rx, 0, -rx, -ky, -kx, -ry, 0, -ry],
      [0, -ry, kx, -ry, rx, -ky, rx, 0],
    ];
    const m = M.mul(M.translate(cx, cy), M.rotate(rot || 0));
    return raw.map((s) => mapSeg(s, (x, y) => M.apply(m, x, y)));
  }

  function rectSegs(x, y, w, h, r, rot) {
    r = Math.max(0, Math.min(r || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    const segs = [];
    const line = (x0, y0, x1, y1) => segs.push([x0, y0, x0 + (x1 - x0) / 3, y0 + (y1 - y0) / 3, x1 - (x1 - x0) / 3, y1 - (y1 - y0) / 3, x1, y1]);
    const arc = (x0, y0, x1, y1, cxp, cyp) => segs.push([x0, y0, x0 + (cxp - x0) * KAPPA, y0 + (cyp - y0) * KAPPA, x1 + (cxp - x1) * KAPPA, y1 + (cyp - y1) * KAPPA, x1, y1]);
    const x2 = x + w, y2 = y + h;
    line(x + r, y, x2 - r, y);
    if (r) arc(x2 - r, y, x2, y + r, x2, y);
    line(x2, y + r, x2, y2 - r);
    if (r) arc(x2, y2 - r, x2 - r, y2, x2, y2);
    line(x2 - r, y2, x + r, y2);
    if (r) arc(x + r, y2, x, y2 - r, x, y2);
    line(x, y2 - r, x, y + r);
    if (r) arc(x, y + r, x + r, y, x, y);
    if (!rot) return segs;
    const m = M.mul(M.translate(x + w / 2, y + h / 2), M.mul(M.rotate(rot), M.translate(-(x + w / 2), -(y + h / 2))));
    return segs.map((s) => mapSeg(s, (px, py) => M.apply(m, px, py)));
  }

  function mapSeg(s, f) {
    const a = f(s[0], s[1]), b = f(s[2], s[3]), c = f(s[4], s[5]), d = f(s[6], s[7]);
    return [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]];
  }

  function toPath(segs, closed) {
    const p = new Path2D();
    if (!segs.length) return p;
    p.moveTo(segs[0][0], segs[0][1]);
    for (const s of segs) p.bezierCurveTo(s[2], s[3], s[4], s[5], s[6], s[7]);
    if (closed) p.closePath();
    return p;
  }

  // Transforma as cúbicas em polilinha: [x0,y0,x1,y1,...]
  function flatten(segs, step) {
    const out = [];
    if (!segs.length) return out;
    step = step || 3;
    out.push(segs[0][0], segs[0][1]);
    for (const s of segs) {
      const est = Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[2], s[5] - s[3]) + Math.hypot(s[6] - s[4], s[7] - s[5]);
      const n = Math.max(2, Math.min(80, Math.ceil(est / step)));
      for (let j = 1; j <= n; j++) {
        const t = j / n, u = 1 - t;
        const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        out.push(a * s[0] + b * s[2] + c * s[4] + d * s[6], a * s[1] + b * s[3] + c * s[5] + d * s[7]);
      }
    }
    return out;
  }

  function polyLength(p) {
    let l = 0;
    for (let i = 2; i < p.length; i += 2) l += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
    return l;
  }

  // Primeira fração t (0..1) da polilinha.
  function polyPrefix(p, t) {
    if (t >= 1) return p.slice();
    const total = polyLength(p), want = total * Math.max(0, t);
    const out = [p[0], p[1]];
    let acc = 0;
    for (let i = 2; i < p.length; i += 2) {
      const l = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
      if (acc + l >= want) {
        const f = l > 0 ? (want - acc) / l : 0;
        out.push(p[i - 2] + (p[i] - p[i - 2]) * f, p[i - 1] + (p[i + 1] - p[i - 1]) * f);
        return out;
      }
      acc += l;
      out.push(p[i], p[i + 1]);
    }
    return out;
  }

  // Traço com espessura variável. Trechos de espessura parecida viram um stroke só; as pontas
  // redondas de trechos vizinhos se sobrepõem, então não aparecem emendas claras entre eles.
  function varBatches(p, widths) {
    const n = p.length / 2, out = [];
    let i = 0;
    while (i < n - 1) {
      const w = (widths[i] + widths[i + 1]) / 2;
      let j = i + 1;
      while (j < n - 1 && Math.abs((widths[j] + widths[j + 1]) / 2 - w) < 0.2) j++;
      if (w > 0.05) out.push({ i, j, w });
      i = j;
    }
    return out;
  }

  function strokeVar(ctx, p, widths) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const b of varBatches(p, widths)) {
      ctx.beginPath();
      ctx.moveTo(p[b.i * 2], p[b.i * 2 + 1]);
      for (let k = b.i + 1; k <= b.j; k++) ctx.lineTo(p[k * 2], p[k * 2 + 1]);
      ctx.lineWidth = b.w;
      ctx.stroke();
    }
  }

  // Com transparência, os trechos sobrepostos escureceriam: desenha opaco à parte e aplica o alpha uma vez.
  let scratch = null;
  function drawVar(ctx, p, widths) {
    if (ctx.globalAlpha >= 0.999) { strokeVar(ctx, p, widths); return; }
    const c = ctx.canvas;
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width !== c.width || scratch.height !== c.height) { scratch.width = c.width; scratch.height = c.height; }
    const o = scratch.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, scratch.width, scratch.height);
    o.setTransform(ctx.getTransform());
    o.strokeStyle = ctx.strokeStyle;
    strokeVar(o, p, widths);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(scratch, 0, 0);
    ctx.restore();
  }

  // Espessura do contorno: mais grosso do lado oposto à luz (weight controla o quanto).
  function inkWidths(p, base, weight, light) {
    const n = p.length / 2;
    let area = 0;
    for (let i = 0; i < n - 1; i++) area += p[i * 2] * p[i * 2 + 3] - p[i * 2 + 2] * p[i * 2 + 1];
    const sgn = area >= 0 ? 1 : -1;
    const ll = Math.hypot(light[0], light[1]) || 1, lx = light[0] / ll, ly = light[1] / ll;
    const w = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = i === 0 ? n - 2 : i - 1, b = i === n - 1 ? 1 : i + 1;
      let tx = p[b * 2] - p[a * 2], ty = p[b * 2 + 1] - p[a * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const nx = sgn * ty, ny = -sgn * tx;
      const d = nx * lx + ny * ly;
      w[i] = base * Math.max(0.2, 1 + weight * (2.6 * Math.max(0, -d) - 1.2 * Math.max(0, d)));
    }
    const s = w.slice();
    for (let i = 0; i < n; i++) {
      const a = i === 0 ? n - 2 : i - 1, b = i === n - 1 ? 1 : i + 1;
      s[i] = (w[a] + 2 * w[i] + w[b]) / 4;
    }
    return s;
  }

  // Afinamento das pontas: taper=[início, fim] como fração do comprimento.
  function taperWidths(p, w0, w1, taper) {
    const n = p.length / 2;
    const total = polyLength(p) || 1;
    const out = new Array(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) acc += Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]);
      const u = acc / total;
      let w = w0 + (w1 - w0) * u;
      if (taper[0] > 0 && u < taper[0]) w *= Math.sin((u / taper[0]) * Math.PI / 2);
      if (taper[1] > 0 && u > 1 - taper[1]) w *= Math.sin(((1 - u) / taper[1]) * Math.PI / 2);
      out[i] = Math.max(0, w);
    }
    return out;
  }

  W.geom = { M, EASE, segment, parseHex, toHex, lerpColor, smoothSegs, polySegs, ellipseSegs, rectSegs, mapSeg, toPath, flatten, polyLength, polyPrefix, varBatches, strokeVar, drawVar, inkWidths, taperWidths };
})(window.Weasel = window.Weasel || {});
