/* Weasel — Simplificar (etapa 4c do plano da interface, docs/planos/interface-illustrator.md; o pedido 4 da proposta
   do Lucas). Tira pontos de um shape, stroke ou line e mantém o desenho dentro de uma tolerância, em pixels.
   O mesmo código serve ao menu Objeto › Caminho › Simplificar, ao Lápis e ao Pincel (que desenham à mão livre) e ao
   --simplify da linha de comando.
   O jeito: o Ramer–Douglas–Peucker acha os pontos que importam; depois a curva lisa do próprio Weasel (a mesma conta
   do geom.smoothSegs) é conferida contra o contorno original, trecho a trecho, e ganha pontos só onde o erro passa da
   tolerância; por fim, cada ponto que dá para tirar sem passar da tolerância sai. Cantos vivos (onde a direção muda
   de repente) viram x,y!.
   - Numa linha que já existe, os pontos que ficam são os dela, sem mudar nada (com o @osso e as alças de cada um);
     só ganham ! os que viraram canto.
   - À mão livre, os pontos novos nascem em cima do traço. */
(function (W) {
  'use strict';
  const G = W.geom, L = W.lang;

  // ---------- a curva de um trecho: a mesma conta do geom.smoothSegs, só para o trecho j ----------
  // P: [{ x, y, corner, tan, tin }]; o trecho j vai de P[j] a P[j+1] (no fechado, o último volta ao primeiro)
  function span(P, closed, k, j) {
    const n = P.length, p = P[j], q = P[(j + 1) % n];
    const dir = (i) => {
      const o = P[i];
      if (o.corner || o.tan || k <= 0) return null;
      const a = closed ? P[(i - 1 + n) % n] : P[i - 1], b = closed ? P[(i + 1) % n] : P[i + 1];
      if (!a || !b) return null;
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
      return l > 1e-9 ? [dx / l, dy / l] : null;
    };
    const len = Math.hypot(q.x - p.x, q.y - p.y), dp = dir(j), dq = dir((j + 1) % n);
    const c1 = p.tan ? [p.x + p.tan[0], p.y + p.tan[1]] : dp ? [p.x + dp[0] * len * k, p.y + dp[1] * len * k] : [p.x + (q.x - p.x) / 3, p.y + (q.y - p.y) / 3];
    const qi = q.tin || q.tan;
    const c2 = qi ? [q.x - qi[0], q.y - qi[1]] : dq ? [q.x - dq[0] * len * k, q.y - dq[1] * len * k] : [q.x - (q.x - p.x) / 3, q.y - (q.y - p.y) / 3];
    return [p.x, p.y, c1[0], c1[1], c2[0], c2[1], q.x, q.y];
  }
  const bez = (s, t) => {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * s[0] + b * s[2] + c * s[4] + d * s[6], a * s[1] + b * s[3] + c * s[5] + d * s[7]];
  };
  // distância (ao quadrado) do ponto ao segmento ab
  function seg2(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    let t = l > 1e-12 ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const x = ax + t * dx - px, y = ay + t * dy - py;
    return x * x + y * y;
  }

  // ---------- amostrar ----------
  // Um contorno (lista de cúbicas) em pontos a cada `step` pixels, mais ou menos. Devolve { S, at }: at[i] é a amostra
  // onde começa a cúbica i (o ponto i da forma).
  function sampleSegs(segs, step) {
    const S = [], at = [];
    for (const s of segs) {
      at.push(S.length);
      const l = Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[2], s[5] - s[3]) + Math.hypot(s[6] - s[4], s[7] - s[5]);
      const m = Math.max(1, Math.min(4000, Math.ceil(l / step)));
      for (let i = 0; i < m; i++) S.push(bez(s, i / m));
    }
    return { S, at };
  }
  // Os pontos do mouse (à mão livre) a cada `step` pixels pelo caminho
  function resample(raw, step) {
    const out = [];
    let prev = null, left = 0;
    for (const p of raw) {
      if (!prev) { out.push([p[0], p[1]]); prev = p; continue; }
      const dx = p[0] - prev[0], dy = p[1] - prev[1], l = Math.hypot(dx, dy);
      if (l < 1e-9) continue;
      let t = step - left;
      while (t <= l) { out.push([prev[0] + (dx * t) / l, prev[1] + (dy * t) / l]); t += step; }
      left = l - (t - step);
      prev = p;
    }
    const last = raw[raw.length - 1];
    if (last && out.length && Math.hypot(out[out.length - 1][0] - last[0], out[out.length - 1][1] - last[1]) > step * 0.25) out.push([last[0], last[1]]);
    return out;
  }

  // ---------- o ajuste ----------
  // T: { S (amostras), closed, k (o 0.36 × smooth), tol, cand (as amostras que podem virar ponto, em ordem),
  //      forced (Set: as que ficam sempre), props(i) → { corner, tan, tin } do ponto na amostra i }
  // Devolve as amostras que viram pontos, em ordem.
  function fit(T) {
    const { S, closed, k, tol } = T, N = S.length;
    const tol2 = tol * tol;
    // a posição de cada amostra que pode virar ponto na lista cand
    const candAt = new Map(T.cand.map((s, i) => [s, i]));

    // RDP pelos pontos candidatos, de a até b (índices em cand; b pode passar do fim, no fechado)
    const C = (i) => S[T.cand[i % T.cand.length]];
    function rdp(a, b, eps, out) {
      const stack = [[a, b]];
      while (stack.length) {
        const [i, j] = stack.pop();
        if (j - i < 2) continue;
        const p = C(i), q = C(j);
        let best = -1, bi = -1;
        for (let m = i + 1; m < j; m++) { const r = C(m), d = seg2(r[0], r[1], p[0], p[1], q[0], q[1]); if (d > best) { best = d; bi = m; } }
        if (best > eps * eps) { out.add(bi % T.cand.length); stack.push([i, bi], [bi, j]); }
      }
    }
    const nc = T.cand.length;
    const keySet = new Set([...T.forced].map((s) => candAt.get(s)).filter((i) => i !== undefined));
    if (!closed) { keySet.add(0); keySet.add(nc - 1); }
    if (closed && keySet.size === 0) {
      // sem canto nenhum: começa no ponto 0 e no mais longe dele
      let far = 0, fd = -1;
      for (let i = 1; i < nc; i++) { const d = (C(i)[0] - C(0)[0]) ** 2 + (C(i)[1] - C(0)[1]) ** 2; if (d > fd) { fd = d; far = i; } }
      keySet.add(0);
      keySet.add(far);
    }
    if (T.poly) {
      // sem curvas (line, smooth=0): o RDP sozinho, com a tolerância
      const ks = [...keySet].sort((a, b) => a - b);
      for (let i = 0; i < ks.length - (closed ? 0 : 1); i++) rdp(ks[i], i + 1 < ks.length ? ks[i + 1] : ks[0] + nc, tol, keySet);
      return [...keySet].sort((a, b) => a - b).map((i) => T.cand[i]);
    }
    // o começo: os pontos fixos e os que o RDP acha com a tolerância eps
    const base = [...keySet];
    function init(eps) {
      const set = new Set(base), ks = [...set].sort((a, b) => a - b);
      for (let i = 0; i < ks.length - (closed ? 0 : 1); i++) rdp(ks[i], i + 1 < ks.length ? ks[i + 1] : ks[0] + nc, eps, set);
      const K = [...set].sort((a, b) => a - b).map((i) => T.cand[i]);
      // um shape precisa de 3 pontos
      while (closed && K.length < 3 && K.length < nc) {
        let gap = -1, gi = 0;
        for (let j = 0; j < K.length; j++) { const a = candAt.get(K[j]), b = j + 1 < K.length ? candAt.get(K[j + 1]) : candAt.get(K[0]) + nc; if (b - a > gap) { gap = b - a; gi = j; } }
        const a = candAt.get(K[gi]);
        K.push(T.cand[(a + Math.floor(gap / 2)) % nc]);
        K.sort((x, y) => x - y);
      }
      return K;
    }
    const ptOf = (s) => Object.assign({ x: S[s][0], y: S[s][1] }, T.props(s));

    // o erro do trecho j (de K[j] a K[j+1]), indo e voltando: as amostras até a curva nova e a curva até as amostras
    function spanErr(P, Kx, j) {
      const a = Kx[j], b0 = j + 1 < Kx.length ? Kx[j + 1] : Kx[0], b = b0 > a ? b0 : b0 + N;
      const sg = span(P, closed, k, j);
      const ns = b - a, m = Math.max(8, Math.min(64, Math.ceil(ns / 2)));
      const B = [];
      for (let i = 0; i <= m; i++) B.push(bez(sg, i / m));
      let err = 0, worst = -1;
      for (let s = a + 1; s < b; s++) {
        const p = S[s % N];
        let d = Infinity;
        for (let i = 0; i < m && d > 0; i++) { const v = seg2(p[0], p[1], B[i][0], B[i][1], B[i + 1][0], B[i + 1][1]); if (v < d) d = v; }
        if (d > err) { err = d; worst = s; }
      }
      // a volta: a curva nova não pode fugir do contorno entre as amostras
      let back = 0, bw = -1;
      for (let i = 1; i < m; i++) {
        const p = B[i];
        let d = Infinity, ds = -1;
        for (let s = a; s < b && d > 0; s++) { const q = S[s % N], r = S[(s + 1) % N], v = seg2(p[0], p[1], q[0], q[1], r[0], r[1]); if (v < d) { d = v; ds = s; } }
        if (d > back) { back = d; bw = ds; }
      }
      if (back > err) { err = back; worst = bw > a ? bw : a + 1 < b ? a + 1 : -1; }
      return { err, worst: worst >= 0 && worst < b ? worst % N : -1 };
    }
    // a amostra candidata mais perto da pior, dentro do trecho
    function pick(a, b, w) {
      const ca = candAt.get(a), cb0 = candAt.get(b), cb = cb0 > ca ? cb0 : cb0 + nc;
      if (cb - ca < 2) return -1;
      const ww = w < a ? w + N : w;
      let best = -1, bd = Infinity;
      for (let i = ca + 1; i < cb; i++) { const s = T.cand[i % nc], ss = s < a ? s + N : s, d = Math.abs(ss - ww); if (d < bd) { bd = d; best = s; } }
      return best;
    }

    // tirar um de cada vez empaca quando os pontos estão espaçados por igual (o círculo de 16 não vira o de 8): por
    // isso o ajuste começa de vários RDP, do mais fino ao mais grosso, e fica o que acabar com menos pontos
    let best = null;
    for (const f of [2, 4, 8, 16]) {
      const K = solve(init(tol * f));
      if (!best || K.length < best.length) best = K;
    }
    return best;

    function solve(K) {
    // refinar: põe um ponto em cada trecho que passa da tolerância, até nenhum passar
    for (let pass = 0; pass < 200; pass++) {
      const P = K.map(ptOf), add = [];
      const count = closed ? K.length : K.length - 1;
      for (let j = 0; j < count; j++) {
        const r = spanErr(P, K, j);
        if (r.err <= tol2 || r.worst < 0) continue;
        const s = pick(K[j], j + 1 < K.length ? K[j + 1] : K[0], r.worst);
        if (s >= 0) add.push(s);
      }
      if (!add.length) break;
      K = [...new Set([...K, ...add])].sort((x, y) => x - y);
    }

    // podar: tira o ponto que menos estraga, enquanto der (cada um mexe só nos trechos em volta dele)
    const minN = closed ? 3 : 2;
    const cost = (Kx, Px, j) => {
      // tirar o ponto j: na lista sem ele, mudam os trechos de j-2 a j (os vizinhos dele mudam de direção)
      const K2 = Kx.slice(0, j).concat(Kx.slice(j + 1)), P2 = Px.slice(0, j).concat(Px.slice(j + 1)), n2 = K2.length;
      let worst = 0;
      for (let d = -2; d <= 0; d++) {
        let i = j + d;
        if (closed) i = ((i % n2) + n2) % n2; else if (i < 0 || i >= n2 - 1) continue;
        const r = spanErr(P2, K2, i);
        if (r.err > worst) worst = r.err;
        if (worst > tol2) break;
      }
      return worst;
    };
    let P = K.map(ptOf);
    let costs = K.map((s, j) => (T.forced.has(s) || (!closed && (j === 0 || j === K.length - 1)) ? Infinity : cost(K, P, j)));
    while (K.length > minN) {
      let bj = -1, bc = Infinity;
      for (let j = 0; j < K.length; j++) if (costs[j] < bc) { bc = costs[j]; bj = j; }
      if (bj < 0 || bc > tol2) break;
      K.splice(bj, 1);
      P.splice(bj, 1);
      costs.splice(bj, 1);
      // os vizinhos mudaram de custo
      for (let d = -3; d <= 2; d++) {
        let i = bj + d;
        if (closed) i = ((i % K.length) + K.length) % K.length; else if (i < 0 || i >= K.length) continue;
        if (costs[i] === Infinity) continue;
        costs[i] = cost(K, P, i);
      }
    }
    return K;
    }
  }

  // ---------- cantos vivos ----------
  // Uma amostra é canto quando a direção de r pixels antes até ela e dela até r pixels depois vira mais do que ANG.
  // Das vizinhas que viram, fica a que vira mais.
  const ANG = (60 * Math.PI) / 180;
  function corners(S, closed, r, step, only) {
    const N = S.length, w = Math.max(1, Math.round(r / step)), out = [];
    if (N < 2 * w + 1) return out;
    const turn = (i) => {
      const a = closed ? S[(i - w + N) % N] : S[i - w], b = S[i], c = closed ? S[(i + w) % N] : S[i + w];
      if (!a || !c) return 0;
      const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
      const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
      if (lu < 1e-9 || lv < 1e-9) return 0;
      return Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv))));
    };
    const idx = only || [...Array(N).keys()];
    const tv = idx.map(turn);
    for (let j = 0; j < idx.length; j++) {
      if (tv[j] < ANG) continue;
      // a maior da vizinhança (até w amostras de distância)
      let top = true;
      for (let d = 1; d < idx.length && top; d++) {
        let gone = true;
        for (const jj of [j - d, j + d]) {
          const ii = closed ? ((jj % idx.length) + idx.length) % idx.length : jj;
          if (ii < 0 || ii >= idx.length) continue;
          let gap = Math.abs(idx[ii] - idx[j]);
          if (closed) gap = Math.min(gap, N - gap);
          if (gap > w) continue;
          gone = false;
          if (tv[ii] > tv[j] || (tv[ii] === tv[j] && ii < j)) top = false;
        }
        if (gone) break;
      }
      if (top) out.push(idx[j]);
    }
    return out;
  }

  // ---------- à mão livre (o Lápis e o Pincel) ----------
  // raw: os pontos do mouse; tol: a tolerância (nas mesmas unidades). Devolve [{ x, y, corner }].
  function freehand(raw, closed, tol, smooth) {
    const step = Math.max(0.05, Math.min(2, tol / 3));
    const S = resample(raw, step);
    if (closed && S.length > 2) {
      // o fim que voltou em cima do começo sai (o fechado já liga o último ao primeiro)
      while (S.length > 3 && Math.hypot(S[S.length - 1][0] - S[0][0], S[S.length - 1][1] - S[0][1]) < step * 1.5) S.pop();
    }
    if (S.length < 2) return S.map((p) => ({ x: p[0], y: p[1], corner: false }));
    const cs = new Set(corners(S, closed, Math.max(3 * tol, 4 * step), step));
    const forced = new Set(cs);
    if (!closed) { forced.add(0); forced.add(S.length - 1); }
    const K = fit({ S, closed, k: 0.36 * (smooth === undefined ? 1 : smooth), tol, cand: [...Array(S.length).keys()], forced, props: (s) => ({ corner: cs.has(s) }) });
    return K.map((s) => ({ x: S[s][0], y: S[s][1], corner: cs.has(s) && (closed || (s !== 0 && s !== S.length - 1)) }));
  }

  // ---------- uma linha do código ----------
  const SIMPLE = new Set(['shape', 'stroke', 'line']);
  // text: a linha inteira; tol em pixels (nas coordenadas da linha). Devolve
  // { text, before, after, kept: [os índices dos pontos que ficaram], corners: [os que ganharam !] } ou { why } (com
  // minor quando a linha só não tem o que simplificar: não é shape, stroke nem line, ou tem poucos pontos).
  function line(text, tol) {
    const sp = L.splitLine(text), w0 = sp.words[0];
    if (!w0 || !SIMPLE.has(w0.text)) return { why: 'só shape, stroke e line têm pontos para simplificar', minor: true };
    const cmd = w0.text, attr = (k) => { const w = sp.words.find((x) => x.text.startsWith(k + '=')); return w ? w.text.slice(k.length + 1) : null; };
    if (cmd === 'stroke' && (attr('limb') !== null || sp.words.some((x) => x.text === 'limb'))) return { why: 'é um membro (limb=): os pontos dele são o quadril, o joelho e o pé' };
    const pts = sp.points.map((p) => L.parsePoint(p));
    if (sp.points.some((p) => p.text.includes('{'))) return { why: 'os pontos usam contas ({…}): ficam como estão' };
    if (pts.some((p) => !p)) return { why: 'tem ponto com erro' };
    const closed = cmd === 'shape', n = pts.length;
    if (n < (closed ? 4 : 3)) return { why: `tem ${n} pontos: não há o que tirar`, minor: true };
    let smooth = 1;
    const sv = attr('smooth');
    if (sv !== null) { smooth = Number(sv); if (!Number.isFinite(smooth)) return { why: 'o smooth= usa conta: fica como está' }; }
    const poly = cmd === 'line' || smooth <= 0;
    const segs = poly ? G.polySegs(pts, closed) : G.smoothSegs(pts, closed, smooth);
    // a curva de hoje, em amostras; cada ponto é a amostra onde começa o trecho dele
    let len = 0;
    for (const s of segs) len += Math.hypot(s[6] - s[0], s[7] - s[1]);
    const step = Math.max(0.05, Math.min(2, tol / 3, len / 2000));
    const { S, at } = sampleSegs(segs, step);
    if (!closed) { at.push(S.length); S.push([pts[n - 1].x, pts[n - 1].y]); }
    const vAt = new Map(at.map((s, i) => [s, i]));
    // os cantos que já existem (a alça quebrada ou o ! onde a curva vira) ficam sempre; os cantos vivos novos também
    const brk = new Set();
    if (!poly) {
      for (let i = 0; i < n; i++) {
        if (!closed && (i === 0 || i === n - 1)) continue;
        const sIn = segs[(i - 1 + segs.length) % segs.length], sOut = segs[i % segs.length];
        if (!sIn || !sOut) continue;
        const ix = sIn[6] - (Math.abs(sIn[6] - sIn[4]) + Math.abs(sIn[7] - sIn[5]) > 1e-6 ? sIn[4] : sIn[2]), iy = sIn[7] - (Math.abs(sIn[6] - sIn[4]) + Math.abs(sIn[7] - sIn[5]) > 1e-6 ? sIn[5] : sIn[3]);
        const ox = (Math.abs(sOut[2] - sOut[0]) + Math.abs(sOut[3] - sOut[1]) > 1e-6 ? sOut[2] : sOut[4]) - sOut[0], oy = (Math.abs(sOut[2] - sOut[0]) + Math.abs(sOut[3] - sOut[1]) > 1e-6 ? sOut[3] : sOut[5]) - sOut[1];
        const li = Math.hypot(ix, iy), lo = Math.hypot(ox, oy);
        if (li < 1e-9 || lo < 1e-9) continue;
        if ((ix * ox + iy * oy) / (li * lo) < Math.cos((12 * Math.PI) / 180)) brk.add(i);
      }
    }
    const sharp = new Set(poly ? [] : corners(S, closed, Math.max(3 * tol, 4 * step), step, at.slice(0, closed ? n : n)).map((s) => vAt.get(s)).filter((i) => !pts[i].corner && !pts[i].tan && !brk.has(i) && (closed || (i > 0 && i < n - 1))));
    const forced = new Set();
    for (const i of brk) forced.add(at[i]);
    for (const i of sharp) forced.add(at[i]);
    // os pontos presos a ossos diferentes dos vizinhos: onde o osso muda, o ponto fica (senão a forma estica errado)
    for (let i = 0; i < n; i++) {
      const pa = pts[(i - 1 + n) % n], pb = pts[(i + 1) % n];
      if ((pts[i].pin || '') !== (pa.pin || '') || (pts[i].pin || '') !== (pb.pin || '')) if (closed || (i > 0 && i < n - 1)) forced.add(at[i]);
    }
    if (!closed) { forced.add(at[0]); forced.add(at[n - 1]); }
    const props = (s) => { const i = vAt.get(s), p = pts[i]; return { corner: p.corner || sharp.has(i), tan: poly ? null : p.tan, tin: poly ? null : p.tin }; };
    const K = fit({ S, closed, k: 0.36 * smooth, tol, poly, cand: at.slice(0, n), forced, props });
    const kept = K.map((s) => vAt.get(s));
    if (kept.length >= n) return { text, before: n, after: n, kept, corners: [] };
    // reescreve: os pontos que ficam, como estavam (os cantos novos ganham ! antes do @osso)
    const keepSet = new Set(kept), cn = [];
    const toks = sp.points.map((p, i) => {
      if (!keepSet.has(i)) return null;
      let t = p.text;
      if (sharp.has(i)) { const ai = L.topIndex(t, '@'); t = ai >= 0 ? t.slice(0, ai) + '!' + t.slice(ai) : t + '!'; cn.push(i); }
      return t;
    }).filter((t) => t !== null);
    const a = sp.points[0].from, b = sp.points[n - 1].to;
    return { text: text.slice(0, a) + toks.join(' ') + text.slice(b), before: n, after: kept.length, kept, corners: cn };
  }

  // As linhas que usam a forma `name` na troca de forma (x.shape=, shape=x) ou na boca do lip sync (mouth): com
  // outro número de pontos, a troca deixa de ser ponto a ponto. Devolve os números das linhas (a partir de 0).
  function uses(src, name) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[\\s.])${esc}\\.shape=|\\bshape=${esc}(?![\\w])`), mouth = new RegExp(`^\\s*mouth\\b.*(^|[\\s=])${esc}(?![\\w])`);
    const out = [];
    src.split('\n').forEach((t, i) => { if (!/^\s*#/.test(t) && (re.test(t) || mouth.test(t))) out.push(i); });
    return out;
  }

  W.simplify = { line, freehand, uses, fit, span, corners, resample };
})(window.Weasel = window.Weasel || {});
