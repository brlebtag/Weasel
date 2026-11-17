/* Weasel — operações entre formas (etapa 5 do plano da interface, docs/planos/interface-illustrator.md; os pedidos 1
   e 2 da proposta do Lucas). Unir, subtrair, interseção e excluir (o Pathfinder), o Pincel de bolha e a Borracha
   usam o mesmo jeito:
   - as formas viram áreas numa grade fina (cada casa, um pedacinho do desenho) e a conta (unir, tirar…) é feita casa
     a casa. Assim o resultado nunca sai com um contorno quebrado, por mais que as formas se cruzem;
   - o contorno da área que sobra é seguido (marching squares) e encostado de volta nas bordas de verdade: as retas
     ficam retas, os cantos onde duas bordas se cruzam ficam no lugar exato e os pontos da forma que a conta não
     tocou continuam os mesmos (com o ! e as alças);
   - por cima, a curva lisa do Weasel é ajustada com o Simplificar (js/simplify.js), com ! nos cantos.
   Aqui só tem a conta (sem tela); quem usa é o js/ui-paths.js. */
(function (W) {
  'use strict';
  const G = W.geom, SM = W.simplify;

  const bez = (s, t) => {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * s[0] + b * s[2] + c * s[4] + d * s[6], a * s[1] + b * s[3] + c * s[5] + d * s[7]];
  };
  // a cúbica é uma reta (as alças em cima da corda, entre as pontas)?
  function straight(s) {
    const dx = s[6] - s[0], dy = s[7] - s[1], l2 = dx * dx + dy * dy;
    if (l2 < 1e-12) return Math.abs(s[2] - s[0]) + Math.abs(s[3] - s[1]) + Math.abs(s[4] - s[6]) + Math.abs(s[5] - s[7]) < 1e-9;
    for (const [x, y] of [[s[2], s[3]], [s[4], s[5]]]) {
      const t = ((x - s[0]) * dx + (y - s[1]) * dy) / l2, cr = ((x - s[0]) * dy - (y - s[1]) * dx) / Math.sqrt(l2);
      if (Math.abs(cr) > 1e-6 || t < -1e-9 || t > 1 + 1e-9) return false;
    }
    return true;
  }

  // ---------- as bordas ----------
  // A borda de uma forma (as cúbicas do desenho) em pontos [{ x, y, tag }]. O começo da cúbica i (o ponto i da forma)
  // leva tags[i]; os trechos retos ficam só com as pontas (as retas continuam retas). closed: a última cúbica volta
  // ao começo, que não se repete.
  function ring(segs, step, tags, closed) {
    const out = [];
    segs.forEach((s, i) => {
      out.push({ x: s[0], y: s[1], tag: tags ? tags[i] || null : null });
      if (straight(s)) return;
      const est = Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[2], s[5] - s[3]) + Math.hypot(s[6] - s[4], s[7] - s[5]);
      const n = Math.max(2, Math.min(400, Math.ceil(est / step)));
      for (let j = 1; j < n; j++) { const p = bez(s, j / n); out.push({ x: p[0], y: p[1], tag: null }); }
    });
    if (!closed && segs.length) { const s = segs[segs.length - 1]; out.push({ x: s[6], y: s[7], tag: tags ? tags[segs.length] || null : null }); }
    // pontos repetidos (uma cúbica de tamanho zero) viram um, e fica a marca
    const res = [];
    for (const p of out) {
      const q = res[res.length - 1];
      if (q && Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9) { if (!q.tag) q.tag = p.tag; continue; }
      res.push(p);
    }
    if (closed && res.length > 1) {
      const a = res[0], b = res[res.length - 1];
      if (Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9) { if (!a.tag) a.tag = b.tag; res.pop(); }
    }
    // cada marca sabe de que anel é, quantos pontos ele tem e as alças de antes (out: a de saída, in: a de chegada,
    // como no ~in~out do código), para o ponto que fica na beira da mudança não mexer no resto
    if (tags) {
      const n = closed ? segs.length : segs.length + 1;
      for (let i = 0; i < n; i++) {
        const t = tags[i];
        if (!t) continue;
        const so = closed ? segs[i] : segs[i], si = closed ? segs[(i - 1 + segs.length) % segs.length] : segs[i - 1];
        Object.assign(t, { ring: res, n, out: so ? [so[2] - so[0], so[3] - so[1]] : null, in: si ? [si[6] - si[4], si[7] - si[5]] : null });
      }
    }
    res.closed = closed;
    return res;
  }
  function boxOf(rings, pad) {
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const R of rings) for (const p of R) {
      const x = p.x !== undefined ? p.x : p[0], y = p.y !== undefined ? p.y : p[1];
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
    }
    if (pad) { b.x0 -= pad; b.y0 -= pad; b.x1 += pad; b.y1 += pad; }
    return b;
  }
  const meets = (a, b) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
  const join = (a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });

  // ---------- a grade ----------
  // A casa (i, j) cobre x0 + i·c … x0 + (i+1)·c; vale pelo meio dela. Com no máximo `max` casas, a casa cresce.
  function grid(box, cell, max) {
    let c = cell;
    const w = Math.max(box.x1 - box.x0, 1e-6), h = Math.max(box.y1 - box.y0, 1e-6);
    while ((w / c + 6) * (h / c + 6) > (max || 3e6)) c *= 1.15;
    const pad = 2 * c;
    return { x0: box.x0 - pad, y0: box.y0 - pad, c, nx: Math.ceil((w + 2 * pad) / c) + 1, ny: Math.ceil((h + 2 * pad) / c) + 1 };
  }
  const mask = (g) => new Uint8Array(g.nx * g.ny);

  // pinta as casas dentro dos anéis (regra nonzero, como o desenho): rings = [[{ x, y }]]
  function fill(g, rings, out) {
    const { x0, y0, c, nx, ny } = g, rows = new Array(ny);
    for (const R of rings) {
      const n = R.length;
      for (let k = 0; k < n; k++) {
        const a = R[k], b = R[(k + 1) % n];
        if (a.y === b.y) continue;
        const dir = b.y > a.y ? 1 : -1, ylo = Math.min(a.y, b.y), yhi = Math.max(a.y, b.y);
        const j0 = Math.max(0, Math.ceil((ylo - y0) / c - 0.5)), j1 = Math.min(ny - 1, Math.ceil((yhi - y0) / c - 0.5) - 1);
        for (let j = j0; j <= j1; j++) {
          const yc = y0 + (j + 0.5) * c;
          (rows[j] || (rows[j] = [])).push(a.x + ((b.x - a.x) * (yc - a.y)) / (b.y - a.y), dir);
        }
      }
    }
    for (let j = 0; j < ny; j++) {
      const r = rows[j];
      if (!r) continue;
      const m = r.length / 2, idx = new Array(m);
      for (let t = 0; t < m; t++) idx[t] = t;
      idx.sort((p, q) => r[2 * p] - r[2 * q]);
      let w = 0, xa = 0;
      for (let t = 0; t < m; t++) {
        const p = idx[t], x = r[2 * p], was = w;
        w += r[2 * p + 1];
        if (was === 0 && w !== 0) xa = x;
        else if (was !== 0 && w === 0) {
          const ia = Math.max(0, Math.ceil((xa - x0) / c - 0.5)), ib = Math.min(nx - 1, Math.ceil((x - x0) / c - 0.5) - 1);
          for (let i = ia; i <= ib; i++) out[j * nx + i] = 1;
        }
      }
    }
    return out;
  }
  // pinta as casas a até r do caminho (o rastro de um pincel redondo): path = [[x, y]]
  function stamp(g, path, r, out) {
    const { x0, y0, c, nx, ny } = g, r2 = r * r;
    const P = path.length === 1 ? [path[0], path[0]] : path;
    for (let k = 0; k + 1 < P.length; k++) {
      const a = P[k], b = P[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r - x0) / c)), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + r - x0) / c));
      const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r - y0) / c)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + r - y0) / c));
      for (let j = j0; j <= j1; j++) {
        const py = y0 + (j + 0.5) * c;
        for (let i = i0; i <= i1; i++) {
          const o = j * nx + i;
          if (out[o]) continue;
          const px = x0 + (i + 0.5) * c;
          let t = l2 > 1e-12 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = a[0] + t * dx - px, ey = a[1] + t * dy - py;
          if (ex * ex + ey * ey <= r2) out[o] = 1;
        }
      }
    }
    return out;
  }
  // o ponto está a até r do caminho?
  function near(path, r) {
    const P = path.length === 1 ? [path[0], path[0]] : path, r2 = r * r;
    return (x, y) => {
      for (let k = 0; k + 1 < P.length; k++) {
        const a = P[k], b = P[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
        let t = l2 > 1e-12 ? ((x - a[0]) * dx + (y - a[1]) * dy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = a[0] + t * dx - x, ey = a[1] + t * dy - y;
        if (ex * ex + ey * ey <= r2) return true;
      }
      return false;
    };
  }
  const any = (m) => { for (let i = 0; i < m.length; i++) if (m[i]) return true; return false; };
  const count = (m) => { let n = 0; for (let i = 0; i < m.length; i++) n += m[i]; return n; };

  // ---------- o contorno da área ----------
  // Marching squares pelos meios das casas: cada volta sai com a área por dentro à direita (na tela, de y para
  // baixo), então a volta de fora tem área > 0 e a de um buraco, < 0. As casas que só se tocam pela quina ficam
  // separadas.
  function trace(g, m) {
    const { x0, y0, c, nx, ny } = g, W2 = nx + 2;
    const v = (i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? 0 : m[j * nx + i]);
    const H = (i, j) => ((j + 1) * W2 + (i + 1)) * 2, V = (i, j) => ((j + 1) * W2 + (i + 1)) * 2 + 1;
    const next = new Map();
    const ids = [0, 0, 0, 0], cv = [0, 0, 0, 0], io = [0, 0, 0, 0];
    for (let j = -1; j < ny; j++) {
      for (let i = -1; i < nx; i++) {
        cv[0] = v(i, j); cv[1] = v(i + 1, j); cv[2] = v(i + 1, j + 1); cv[3] = v(i, j + 1);
        const s = cv[0] + cv[1] + cv[2] + cv[3];
        if (s === 0 || s === 4) continue;
        ids[0] = H(i, j); ids[1] = V(i + 1, j); ids[2] = H(i, j + 1); ids[3] = V(i, j);
        for (let k = 0; k < 4; k++) io[k] = cv[k] && !cv[(k + 1) % 4] ? 1 : !cv[k] && cv[(k + 1) % 4] ? -1 : 0;
        for (let k = 0; k < 4; k++) {
          if (io[k] !== 1) continue;
          for (let d = 1; d < 4; d++) { const q = (k - d + 4) % 4; if (io[q] === -1) { next.set(ids[k], ids[q]); break; } }
        }
      }
    }
    const pos = (id) => {
      const h = id % 2 === 0, cell = id >> 1, i = (cell % W2) - 1, j = Math.floor(cell / W2) - 1;
      return h ? [x0 + (i + 1) * c, y0 + (j + 0.5) * c] : [x0 + (i + 0.5) * c, y0 + (j + 1) * c];
    };
    const loops = [], seen = new Set();
    for (const id0 of next.keys()) {
      if (seen.has(id0)) continue;
      const pts = [];
      let id = id0, guard = next.size + 2;
      while (!seen.has(id) && guard-- > 0) { seen.add(id); pts.push(pos(id)); id = next.get(id); if (id === undefined) break; }
      if (pts.length < 3) continue;
      loops.push({ pts, area: area(pts) });
    }
    return loops;
  }
  function area(P) {
    let s = 0;
    for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return s / 2;
  }
  function inPoly(P, x, y) {
    let inside = false;
    for (let k = 0, l = P.length - 1; k < P.length; l = k++) {
      const a = P[k], b = P[l];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  // as voltas em pedaços: { outer, holes: [], area }; os pedaços menores que `minArea` somem
  function pieces(loops, minArea) {
    const outs = loops.filter((l) => l.area > 0).map((l) => ({ outer: l.pts, holes: [], area: l.area }));
    for (const h of loops.filter((l) => l.area < 0)) {
      if (-h.area < (minArea || 0)) continue;
      const p = h.pts[0];
      let best = null;
      for (const o of outs) if ((!best || o.area < best.area) && inPoly(o.outer, p[0], p[1])) best = o;
      if (best) best.holes.push(h.pts);
    }
    return outs.filter((o) => o.area >= (minArea || 0)).sort((a, b) => b.area - a.area);
  }

  // ---------- encostar nas bordas de verdade ----------
  // exact: os anéis das formas (os pontos de ring(), com a marca); o contorno da grade (loop: [[x, y]]) é posto em
  // cima da borda mais perto (até d), e onde ele passa de um trecho a outro entra o ponto exato: o ponto da forma
  // entre os dois, ou o cruzamento das duas bordas. Devolve [{ x, y, tag, ex (ponto exato), cross (cruzamento),
  // src (o anel de onde veio) }].
  function snapper(exact, d) {
    const segs = [];
    exact.forEach((R, r) => {
      const n = R.length, open = R.closed === false;
      for (let k = 0; k < (open ? n - 1 : n); k++) segs.push({ r, k, a: R[k], b: R[(k + 1) % n] });
    });
    const B = Math.max(d * 3, 1e-6), cells = new Map(), key = (i, j) => i * 73856093 + j * 19349663;
    segs.forEach((s, id) => {
      const i0 = Math.floor((Math.min(s.a.x, s.b.x) - d) / B), i1 = Math.floor((Math.max(s.a.x, s.b.x) + d) / B);
      const j0 = Math.floor((Math.min(s.a.y, s.b.y) - d) / B), j1 = Math.floor((Math.max(s.a.y, s.b.y) + d) / B);
      if ((i1 - i0 + 1) * (j1 - j0 + 1) > 4096) return; // um trecho enorme numa grade fina: fica de fora (é raro)
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = key(i, j); const L = cells.get(k); if (L) L.push(id); else cells.set(k, [id]); }
    });
    function nearest(x, y) {
      const L = cells.get(key(Math.floor(x / B), Math.floor(y / B)));
      if (!L) return null;
      let best = null, bd = d * d;
      for (const id of L) {
        const s = segs[id], dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, l2 = dx * dx + dy * dy;
        let t = l2 > 1e-18 ? ((x - s.a.x) * dx + (y - s.a.y) * dy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = s.a.x + t * dx, py = s.a.y + t * dy, e = (px - x) * (px - x) + (py - y) * (py - y);
        if (e <= bd) { bd = e; best = { id, x: px, y: py, t }; }
      }
      return best;
    }
    // o cruzamento das duas bordas: só quando elas se cruzam de verdade (com um ângulo) e dentro dos dois trechos
    function cross(s, u) {
      const ax = s.a.x, ay = s.a.y, bx = s.b.x - ax, by = s.b.y - ay, cx = u.a.x, cy = u.a.y, dx = u.b.x - cx, dy = u.b.y - cy;
      const lb = Math.hypot(bx, by), ld = Math.hypot(dx, dy), den = bx * dy - by * dx;
      if (lb < 1e-12 || ld < 1e-12 || Math.abs(den) < Math.sin((8 * Math.PI) / 180) * lb * ld) return null;
      const t = ((cx - ax) * dy - (cy - ay) * dx) / den, w = ((cx - ax) * by - (cy - ay) * bx) / den;
      if (t * lb < -d || (t - 1) * lb > d || w * ld < -d || (w - 1) * ld > d) return null;
      return { x: ax + t * bx, y: ay + t * by };
    }
    return function snap(loop) {
      const P = loop.map(([x, y]) => { const q = nearest(x, y); return q ? { x: q.x, y: q.y, s: q.id } : { x, y, s: -1 }; });
      const out = [], n = P.length;
      for (let i = 0; i < n; i++) {
        const p = P[i], q = P[(i + 1) % n];
        out.push({ x: p.x, y: p.y, tag: null, src: p.s >= 0 ? exact[segs[p.s].r] : null });
        if (p.s < 0 || q.s < 0 || p.s === q.s) continue;
        const sa = segs[p.s], sb = segs[q.s];
        if (sa.r === sb.r) {
          const R = exact[sa.r], m = R.length, open = R.closed === false;
          const fwd = open ? sb.k - sa.k : (sb.k - sa.k + m) % m, bwd = open ? sa.k - sb.k : (sa.k - sb.k + m) % m;
          const walk = (ks) => { let l = 0; for (let t = 1; t < ks.length; t++) l += Math.hypot(R[ks[t]].x - R[ks[t - 1]].x, R[ks[t]].y - R[ks[t - 1]].y); return l; };
          let ks = null;
          if (fwd > 0 && fwd <= 24) { ks = []; for (let t = 1; t <= fwd; t++) ks.push((sa.k + t) % m); }
          else if (bwd > 0 && bwd <= 24) { ks = []; for (let t = 0; t < bwd; t++) ks.push((sa.k - t + m) % m); }
          if (ks && walk(ks) < Math.max(d * 8, 3 * Math.hypot(q.x - p.x, q.y - p.y))) {
            for (const k of ks) out.push({ x: R[k].x, y: R[k].y, tag: R[k].tag, ex: true, src: R });
            continue;
          }
        }
        const c = cross(sa, sb);
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        if (c && Math.hypot(c.x - mx, c.y - my) < d * 2.5) out.push({ x: c.x, y: c.y, tag: null, ex: true, cross: true, src: null });
      }
      // pontos repetidos: fica o exato
      const res = [];
      for (const p of out) {
        const q = res[res.length - 1];
        if (q && Math.hypot(q.x - p.x, q.y - p.y) < 1e-7) { if (p.ex && !q.ex) res[res.length - 1] = p; continue; }
        res.push(p);
      }
      while (res.length > 2 && Math.hypot(res[0].x - res[res.length - 1].x, res[0].y - res[res.length - 1].y) < 1e-7) { const p = res.pop(); if (p.ex && !res[0].ex) res[0] = p; }
      return res;
    };
  }

  // ---------- a curva por cima ----------
  const CORNER_EX = (20 * Math.PI) / 180;
  // o quanto a direção vira no ponto i, olhando r para trás e r para frente (pelo caminho)
  function turnAt(S, closed, i, r) {
    const N = S.length, p = S[i];
    const reach = (dir) => {
      let l = 0, k = i;
      for (let t = 0; t < N; t++) {
        const kk = closed ? (k + dir + N) % N : k + dir;
        if (kk < 0 || kk >= N) return k === i ? null : S[k];
        l += Math.hypot(S[kk][0] - S[k][0], S[kk][1] - S[k][1]);
        k = kk;
        if (l >= r) break;
      }
      return S[k];
    };
    const a = reach(-1), b = reach(1);
    if (!a || !b) return 0;
    const ux = p[0] - a[0], uy = p[1] - a[1], vx = b[0] - p[0], vy = b[1] - p[1], lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu < 1e-9 || lv < 1e-9) return 0;
    return Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv))));
  }
  // P: [{ x, y, tag, ex }] (de snapper); o: { tol, smooth, cell, closed }. Os pontos da forma (tag) ficam sempre;
  // os exatos que viram canto também. Devolve [{ x, y, corner, tag }].
  function fitPath(P, o) {
    const closed = o.closed !== false, S = P.map((p) => [p.x, p.y]), N = S.length;
    if (N < (closed ? 3 : 2)) return P.map((p) => ({ x: p.x, y: p.y, corner: !!(p.tag && p.tag.corner), tag: p.tag || null }));
    let len = 0;
    for (let i = 1; i < N; i++) len += Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]);
    if (closed) len += Math.hypot(S[0][0] - S[N - 1][0], S[0][1] - S[N - 1][1]);
    const step = Math.max(1e-3, len / N), tol = o.tol, smooth = o.smooth === undefined ? 1 : o.smooth;
    const r = Math.max(3 * tol, 4 * step, 2.5 * (o.cell || 0));
    const corner = new Set(), forced = new Set();
    // os pontos exatos que viram: dos vizinhos (até rr pelo caminho), fica o que vira mais
    const rr = Math.max(2 * (o.cell || 0), 2 * step), cand = [];
    for (let i = 0; i < N; i++) {
      const p = P[i];
      if (p.tag) { forced.add(i); if (p.tag.corner) corner.add(i); }
      else if (p.ex) { const t = turnAt(S, closed, i, rr); if (t > CORNER_EX) cand.push({ i, t }); }
    }
    const dist = (a, b) => {
      // pelo caminho, de a até b (o mais curto)
      let l = 0;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      for (let k = lo; k < hi && l <= rr * 2; k++) l += Math.hypot(S[k + 1][0] - S[k][0], S[k + 1][1] - S[k][1]);
      if (!closed) return l;
      let l2 = 0;
      for (let k = hi; k !== lo && l2 <= rr * 2; k = (k + 1) % N) l2 += Math.hypot(S[(k + 1) % N][0] - S[k][0], S[(k + 1) % N][1] - S[k][1]);
      return Math.min(l, l2);
    };
    for (const c of cand) {
      if (cand.some((e) => e !== c && (e.t > c.t + 1e-9 || (Math.abs(e.t - c.t) <= 1e-9 && e.i < c.i)) && dist(e.i, c.i) < rr)) continue;
      forced.add(c.i);
      corner.add(c.i);
    }
    if (!closed) { forced.add(0); forced.add(N - 1); }
    // os cantos vivos do resto (onde o pincel encontra uma borda, por exemplo); perto de um canto exato, vale o exato
    const ex = [...corner];
    for (const s of SM.corners(S, closed, r, step)) {
      if (forced.has(s)) continue;
      let far = true;
      for (const e of ex) { let gap = Math.abs(e - s); if (closed) gap = Math.min(gap, N - gap); if (gap * step < r) { far = false; break; } }
      if (far) { corner.add(s); forced.add(s); }
    }
    // a beira da mudança: o ponto da forma cujo vizinho mudou (entre ele e o próximo ponto dela entrou outra coisa)
    // fica com as alças de antes, senão a curva lisa dele muda e puxa a dos vizinhos, uma a uma, pela forma toda
    const tagged = [];
    for (let i = 0; i < N; i++) if (P[i].tag && P[i].tag.ring) tagged.push(i);
    const frozen = new Set();
    const intact = (a, b) => {
      const ta = P[a].tag, tb = P[b].tag;
      if (tb.ring !== ta.ring || tb.i !== (ta.ring.closed === false ? ta.i + 1 : (ta.i + 1) % ta.n)) return false;
      for (let s = (a + 1) % N; s !== b; s = (s + 1) % N) if (P[s].src !== ta.ring || P[s].cross) return false;
      return true;
    };
    // okIn/okOut: o lado de chegada e o de saída continuam iguais
    const okIn = new Set(), okOut = new Set();
    for (let t = 0; t < tagged.length; t++) {
      if (!closed && t === tagged.length - 1) break;
      const a = tagged[t], b = tagged[(t + 1) % tagged.length];
      if (tagged.length > 1 && intact(a, b)) { okOut.add(a); okIn.add(b); }
    }
    for (const i of tagged) if (!okIn.has(i) || !okOut.has(i)) frozen.add(i);
    if (!closed && tagged.length) {
      // no aberto, as pontas de verdade não têm o outro lado
      if (tagged[0] === 0) { okIn.add(0); if (okOut.has(0)) frozen.delete(0); }
      if (tagged[tagged.length - 1] === N - 1) { okOut.add(N - 1); if (okIn.has(N - 1)) frozen.delete(N - 1); }
    }
    const unit = (v) => { const l = v ? Math.hypot(v[0], v[1]) : 0; return l > 1e-9 ? [v[0] / l, v[1] / l] : null; };
    // as alças de um ponto da forma: as que ele já tinha escritas (~) ficam; o da beira fica com a de antes do lado
    // que não mudou e, do outro, a mesma direção com o tamanho automático (a curva continua lisa ali)
    const handles = (s) => {
      const t = P[s].tag;
      if (!t) return null;
      if (t.tan) return { tan: t.tan, tin: t.tin || null };
      if (!frozen.has(s) || corner.has(s) || smooth <= 0) return null;
      const d = unit(t.out) || unit(t.in);
      if (!d) return null;
      return { tan: okOut.has(s) && t.out ? t.out : null, tin: okIn.has(s) && t.in ? t.in : null, dout: d, din: d, frozen: true };
    };
    const props = (s) => {
      const h = handles(s);
      if (!h) return { corner: corner.has(s), tan: null, tin: null };
      // sem a alça de saída exata, a de chegada exata vai no tin, e a saída usa a direção
      return { corner: corner.has(s), tan: h.tan || null, tin: h.tin || null, dout: h.tan ? null : h.dout, din: h.tin ? null : h.din };
    };
    const K = SM.fit({ S, closed, k: 0.36 * smooth, tol, poly: smooth <= 0, cand: [...Array(N).keys()], forced, props, starts: tagged.length ? [Infinity] : [Infinity, 2, 4, 8, 16] });
    const k = 0.36 * smooth;
    return K.map((s, j) => {
      const h = handles(s), o2 = { x: S[s][0], y: S[s][1], corner: corner.has(s) && (closed || (s !== 0 && s !== N - 1)), tag: P[s].tag || null };
      if (h && h.frozen) {
        // as alças de verdade, com o tamanho do trecho que ficou
        const nb = (d) => { const jj = j + d; if (closed) return S[K[(jj + K.length) % K.length]]; return jj >= 0 && jj < K.length ? S[K[jj]] : null; };
        const a = nb(-1), b = nb(1), p = S[s];
        const tan = h.tan || (b ? [h.dout[0] * Math.hypot(b[0] - p[0], b[1] - p[1]) * k, h.dout[1] * Math.hypot(b[0] - p[0], b[1] - p[1]) * k] : null);
        const tin = h.tin || (a ? [h.din[0] * Math.hypot(a[0] - p[0], a[1] - p[1]) * k, h.din[1] * Math.hypot(a[0] - p[0], a[1] - p[1]) * k] : null);
        if (tan && tin) Object.assign(o2, { tan, tin, frozen: true });
      }
      return o2;
    });
  }
  // a volta segue a ordem dos pontos da forma (o contorno da grade gira sempre para o mesmo lado; a forma pode ter
  // sido escrita ao contrário): devolve a volta virada, se for o caso
  function orient(P) {
    let fwd = 0, bwd = 0, prev = null;
    for (const p of P) {
      const t = p.tag;
      if (!t || !t.ring) continue;
      if (prev && prev.ring === t.ring) { const n = t.n; if (t.i === (prev.i + 1) % n) fwd++; else if (t.i === (prev.i - 1 + n) % n) bwd++; }
      prev = t;
    }
    return bwd > fwd ? P.slice().reverse() : P;
  }

  // ---------- a conta inteira ----------
  // items: [{ rings: [anel], holes: [anel], exact: true }] (os anéis de ring(); exact: a borda vale para encostar).
  // brush: { path: [[x, y]], r } ou null (o rastro do pincel, mais um item). keep(bits) diz se uma casa fica, a
  // partir de bits[k] (a casa está dentro do item k; o pincel é o último). o: { cell, tol, max, box, minArea }.
  // Devolve { pieces: [{ outer: pontos, holes: [pontos], area }], g, cell } (os pontos de fitPath).
  function combine(items, brush, keep, o) {
    let box = null;
    for (const it of items) { const b = boxOf(it.rings); box = box ? join(box, b) : b; }
    if (brush) { const b = boxOf([brush.path.map((p) => ({ x: p[0], y: p[1] }))], brush.r); box = box ? join(box, b) : b; }
    if (o.box) box = o.box;
    if (!box || !(box.x1 >= box.x0)) return { pieces: [] };
    const g = grid(box, o.cell, o.max);
    const ms = items.map((it) => {
      const m = fill(g, it.rings, mask(g));
      if (it.holes && it.holes.length) { const h = fill(g, it.holes, mask(g)); for (let i = 0; i < m.length; i++) if (h[i]) m[i] = 0; }
      return m;
    });
    if (brush) ms.push(stamp(g, SM.resample(brush.path, Math.max(g.c, brush.r / 4)), brush.r, mask(g)));
    // o.touch: só faz a conta se o pincel encosta no primeiro item (a Borracha numa forma longe dela)
    if (o.touch && brush) {
      const a = ms[0], b = ms[ms.length - 1];
      let hit = false;
      for (let i = 0; i < a.length && !hit; i++) if (a[i] && b[i]) hit = true;
      if (!hit) return { pieces: null, untouched: true };
    }
    const out = mask(g), bits = new Array(ms.length);
    for (let i = 0; i < out.length; i++) {
      for (let k = 0; k < ms.length; k++) bits[k] = ms[k][i];
      if (keep(bits)) out[i] = 1;
    }
    return { pieces: outline(g, out, items, o), g, mask: out };
  }
  // o contorno de uma área da grade em pedaços com a curva por cima
  function outline(g, out, items, o) {
    const exact = [];
    for (const it of items) if (it.exact !== false) for (const R of [...it.rings, ...(it.holes || [])]) exact.push(R);
    const snap = snapper(exact, g.c * 1.05);
    // src: o anel de onde a volta inteira veio, quando ela é ele mesmo sem mudança (um furo que ficou como estava)
    const fitLoop = (L, smooth) => {
      const P = orient(snap(L));
      const F = fitPath(P, { tol: o.tol, smooth, cell: g.c, closed: true });
      const src = P.length && P[0].src && P.every((p) => p.src === P[0].src && !p.cross) ? P[0].src : null;
      return F.length >= 3 ? { pts: F, src } : null;
    };
    const res = [];
    for (const pc of pieces(trace(g, out), o.minArea !== undefined ? o.minArea : g.c * g.c * 4)) {
      const outer = fitLoop(pc.outer, o.smooth);
      if (!outer) continue;
      const hs = pc.holes.map((h) => fitLoop(h, o.smooth)).filter(Boolean);
      res.push({ outer: outer.pts, outerSrc: outer.src, holes: hs.map((h) => h.pts), holeSrc: hs.map((h) => h.src), area: pc.area });
    }
    return res;
  }

  // Quais itens o rastro do pincel toca (ou encosta, até uma casa de distância): [true/false] na ordem dos itens
  function touches(items, brush, cell) {
    const pb = boxOf([brush.path.map((p) => ({ x: p[0], y: p[1] }))], brush.r + cell * 2);
    const g = grid(pb, cell, 2e6), F = stamp(g, SM.resample(brush.path, Math.max(g.c, brush.r / 4)), brush.r + g.c, mask(g));
    return items.map((it) => {
      if (!meets(boxOf(it.rings), pb)) return false;
      const m = fill(g, it.rings, mask(g));
      if (it.holes && it.holes.length) { const h = fill(g, it.holes, mask(g)); for (let i = 0; i < m.length; i++) if (h[i]) m[i] = 0; }
      for (let i = 0; i < m.length; i++) if (m[i] && F[i]) return true;
      return false;
    });
  }

  // ---------- cortar um traço aberto ----------
  // P: os pontos do traço (de ring(), aberto); inside(x, y): o ponto está na borracha. Devolve os pedaços de fora,
  // [[{ x, y, tag, end }]] (end: a ponta nova, no corte), com o corte no lugar exato (por bisseção).
  function cutOpen(P, inside, step) {
    const runs = [];
    let cur = null;
    const edge = (a, b, ina) => {
      // a fronteira entre a e b (um dentro, outro fora)
      let lo = 0, hi = 1;
      for (let t = 0; t < 30; t++) { const mid = (lo + hi) / 2, x = a.x + (b.x - a.x) * mid, y = a.y + (b.y - a.y) * mid; if (inside(x, y) === ina) lo = mid; else hi = mid; }
      const t = (lo + hi) / 2;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tag: null, end: true };
    };
    for (let k = 0; k < P.length; k++) {
      const p = P[k], inP = inside(p.x, p.y);
      if (k === 0) { if (!inP) cur = [p]; continue; }
      const a = P[k - 1], l = Math.hypot(p.x - a.x, p.y - a.y), m = Math.max(1, Math.ceil(l / step));
      let prev = a, inPrev = inside(a.x, a.y);
      for (let t = 1; t <= m; t++) {
        const q = t === m ? p : { x: a.x + ((p.x - a.x) * t) / m, y: a.y + ((p.y - a.y) * t) / m, tag: null };
        const inQ = t === m ? inP : inside(q.x, q.y);
        if (inQ !== inPrev) {
          const e = edge(prev, q, inPrev);
          if (inPrev) cur = [e]; else { cur.push(e); runs.push(cur); cur = null; }
        }
        if (t === m && !inQ) cur.push(q);
        prev = q;
        inPrev = inQ;
      }
    }
    if (cur && cur.length > 1) runs.push(cur);
    return runs;
  }

  W.pathops = { touches, orient, ring, boxOf, meets, join, grid, mask, fill, stamp, near, any, count, trace, area, inPoly, pieces, snapper, fitPath, combine, outline, cutOpen, straight };
})(window.Weasel = window.Weasel || {});
