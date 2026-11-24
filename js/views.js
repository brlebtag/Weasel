/* Weasel — três vistas, uma animação (docs/planos/tres-vistas.md, etapa 1a).
   Num arquivo com camadas view=, cada animação sem direção no nome (walk) vira uma por vista desenhada (walk_down,
   walk_right, walk_up…). O Weasel monta um esqueleto em 3D:
   - o pivô de cada osso vem da vista principal (a frente; num jogo de plataforma, o lado direito);
   - a profundidade vem da vista de lado (o centro das formas do osso, pesado pela área), dos dois lados, de uma diagonal, do par espelhado
     ou do pai; side= no osso corrige (lat=, num jogo de plataforma, diz o x que o osso teria de frente);
   - cada diagonal tem o ângulo medido no desenho (angle= na camada corrige).
   Em cada quadro, os ossos andam em 3D (osso=dx,dy e osso.z=) e cada vista recebe a pose 2D dela: o lugar de cada
   osso projetado na vista, com a câmera do jogo (views tilt=: o que vai para a frente desce na tela). A ordem das
   peças troca só quando duas se cobrem e uma passou de verdade para o outro lado da outra.
   Por baixo, as animações geradas são animações comuns (uma key por quadro), e o resto do Weasel não muda. As keys
   ficam em volta do pivot= de sempre; anim.voff guarda, para cada osso, o quanto o lugar dele na vista está longe do
   pivot= (os giros que o Weasel soma, como o sway=, e as caixas, os pontos e as camadas sem view= usam isso).
   Os giros (etapa 1b): o osso gira em 3D (rot no plano da vista principal, osso.pitch= para a frente e para trás,
   osso.yaw= em volta do eixo de pé). Em cada vista, as peças giram pelo quanto o osso parece ter girado ali e
   encurtam ao longo dele (até 10%, ou o shorten= do osso); a largura fica. As keys geradas têm um sexto número, a inclinação (o 2D de um
   pai encurtado), que a cena e o Godot (skew) sabem desenhar. */
(function (W) {
  'use strict';
  const G = W.geom, M = G.M;
  const ANG = { down: 0, down_right: 45, right: 90, up_right: 135, up: 180, up_left: 225, left: 270, down_left: 315 };
  const VIEWS = Object.keys(ANG);
  // os sufixos dos nomes, dos compridos para os curtos (walk_down_right não é walk_down + _right)
  const SUFFIXES = ['down_right', 'down_left', 'up_right', 'up_left', 'right', 'left', 'down', 'up'];
  const MIRROR = { right: 'left', left: 'right', down_right: 'down_left', down_left: 'down_right', up_right: 'up_left', up_left: 'up_right' };
  const D2R = Math.PI / 180;
  const REST = [0, 0, 0, 1, 1];
  const dirOf = (name) => SUFFIXES.find((d) => name.endsWith('_' + d) && name.length > d.length + 1) || '';
  const r1 = (v) => { const s = (Math.round(v * 10) / 10).toString(); return s === '-0' ? '0' : s; };
  const fmt = (v) => r1(v).replace('.', ',');
  // angle= (graus a partir da frente, nas diagonais de baixo, ou das costas, nas de cima) → o ângulo da vista
  const angOf = (v, a) => (v === 'down_right' ? a : v === 'down_left' ? 360 - a : v === 'up_right' ? 180 - a : 180 + a);
  const R2D = 180 / Math.PI;
  // o quanto uma peça comprida encurta, no máximo (ponto 6 do plano: 10%) e no mínimo (o que vem para o plano da tela);
  // shorten= no bone muda os dois para um osso (shorten=off: [1, 1], a peça só gira)
  const MINLEN = 0.1, MAXLEN = 1.4;
  const fit = (b, k) => (b.shorten ? Math.max(b.shorten[0], Math.min(b.shorten[1], k)) : Math.max(MINLEN, Math.min(MAXLEN, k)));

  // ---------- 3D: matrizes 3x3 (X para o lado, Y para baixo, Z para a frente) ----------
  const mm = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const mv = (A, v) => [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2], A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2], A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]];
  const ID3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const rotX = (d) => { if (!d) return ID3; const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
  const rotY = (d) => { if (!d) return ID3; const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
  const rotZ = (d) => { if (!d) return ID3; const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
  // o ângulo a mais perto de ref (graus, somando voltas inteiras)
  const near = (a, ref) => a + 360 * Math.round((ref - a) / 360);

  // ---------- as peças: o contorno de cada forma, parado ----------
  function piece(el) {
    let segs = null;
    if (el.type === 'ellipse') segs = G.ellipseSegs(el.center[0], el.center[1], el.radius[0], el.radius[1], el.rot || 0);
    else if (el.type === 'rect') segs = G.rectSegs(el.xy[0], el.xy[1], el.size[0], el.size[1], el.r || 0, el.rot || 0);
    else if (el.type === 'line' && el.pts) segs = G.polySegs(el.pts, false);
    else if (el.pts && el.pts.length > 1) segs = G.smoothSegs(el.pts, el.closed, el.smooth);
    let pts = [];
    if (segs) { const fl = G.flatten(segs, 2); for (let i = 0; i < fl.length; i += 2) pts.push([fl[i], fl[i + 1]]); }
    else if (el.at) pts = [el.at.slice()];
    else if (el.hip) pts = [el.hip.slice(), el.foot.slice()];
    if (!pts.length) return null;
    if (el.xf) pts = pts.map((p) => G.M.apply(el.xf, p[0], p[1]));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    // traço (aberto): a grossura é a da linha
    const sw = !el.closed && typeof el.w === 'number' ? el.w : 0;
    // o peso e o centro da forma, para a peça do osso (pieceOf): a área de dentro e o centro dela; num traço, o
    // comprimento vezes a grossura e o meio dele; num ponto, quase nada
    let wt = 0, wc = null;
    if (!sw && pts.length > 2) {
      let A = 0, cx = 0, cy = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], c = a[0] * b[1] - b[0] * a[1];
        A += c; cx += (a[0] + b[0]) * c; cy += (a[1] + b[1]) * c;
      }
      if (Math.abs(A) > 1e-6) { wt = Math.abs(A) / 2; wc = [cx / (3 * A), cy / (3 * A)]; }
    }
    if (!wc && pts.length > 1) {
      let len = 0, cx = 0, cy = 0;
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); len += l; cx += ((a[0] + b[0]) / 2) * l; cy += ((a[1] + b[1]) / 2) * l; }
      if (len > 1e-6) { wt = len * Math.max(1, sw); wc = [cx / len, cy / len]; }
    }
    if (!wc) { wt = 1e-3; wc = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]; }
    return { el, name: el.name, bone: el.bone || null, poly: pts, box, sw, wt, wc, cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2, area: Math.max(1e-3, (box[2] - box[0]) * (box[3] - box[1])) };
  }
  // onde a reta que passa por p na direção n entra e sai da forma ([lo, hi], a partir de p; null: não pega a forma).
  // Num traço, os cruzamentos com a linha, mais a meia grossura para cada lado.
  function crossing(pc, p, n) {
    let lo = Infinity, hi = -Infinity;
    const P = pc.poly, open = !!pc.sw, last = open ? P.length - 1 : P.length;
    for (let i = 0; i < last; i++) {
      const A = P[i], B = P[(i + 1) % P.length];
      const ex = B[0] - A[0], ey = B[1] - A[1], den = ex * n[1] - ey * n[0];
      if (Math.abs(den) < 1e-9) continue;
      const qx = p[0] - A[0], qy = p[1] - A[1];
      const u = (qx * n[1] - qy * n[0]) / den, l = (qx * ey - qy * ex) / den;
      if (u < 0 || u > 1) continue;
      if (-l < lo) lo = -l;
      if (-l > hi) hi = -l;
    }
    if (open) return lo <= hi ? [lo - pc.sw / 2, hi + pc.sw / 2] : null;
    return hi > lo ? [lo, hi] : null;
  }
  // a meia largura da peça (todas as formas do osso) na reta que passa por p na direção n: do primeiro ao último
  // cruzamento com qualquer forma (null: a reta não pega a peça). Uma forma só: a conta de sempre (um traço vale a
  // grossura dele, onde quer que a reta passe)
  function widthAcross(pc, p, n) {
    if (pc.parts.length === 1) {
      const one = pc.parts[0];
      if (one.sw) return one.sw / 2;
      const r = crossing(one, p, n);
      return r ? (r[1] - r[0]) / 2 : null;
    }
    let lo = Infinity, hi = -Infinity;
    for (const part of pc.parts) {
      const r = crossing(part, p, n);
      if (!r) continue;
      if (r[0] < lo) lo = r[0];
      if (r[1] > hi) hi = r[1];
    }
    return hi > lo ? (hi - lo) / 2 : null;
  }

  // ---------- montar: m.views e as animações de cada vista ----------
  // H.warn(linha, mensagem): os avisos vão para a linha da camada, do osso ou da animação.
  function build(m, H) {
    const warn = H.warn;
    const vl = m.layers.filter((L) => L.view);
    if (!vl.length) return;
    const drawn = VIEWS.filter((v) => vl.some((L) => L.view === v));
    const main = drawn.includes('down') ? 'down' : drawn.includes('right') ? 'right' : null;
    if (!main) {
      warn(vl[0].line, 'falta a vista principal, a do pose e dos pivot=: a frente (view=down) ou, num jogo de plataforma, o lado direito (view=right)');
      for (const L of vl) L.only = [];
      return;
    }
    const tilt = m.viewsSpec ? m.viewsSpec.tilt : 30, K = Math.sin(tilt * D2R);
    const rootX = m.godot && m.godot.root ? m.godot.root[0] : m.canvas.w / 2;
    const bones = [...m.bones.values()];
    const V = { drawn, main, tilt, K, rootX, depth: new Map(), angles: {}, thick: new Map(), gens: [], ground: new Map(), swaps: [], off: new Map(), xf: new Map(), aim: new Map(), turned: [] };
    m.views = V;

    // as formas de cada vista (as das camadas view=), na ordem do arquivo; as escondidas (os buracos de um cut=) e as
    // das camadas guide não entram na medida da peça
    const pieces = new Map(drawn.map((v) => [v, []]));
    for (const L of vl) for (const it of L.items) { const p = piece(it.el); if (p) { p.aside = !!(L.guide || it.el.hidden); pieces.get(L.view).push(p); } }
    const piecesOf = (v) => pieces.get(v) || [];
    // A peça de um osso numa vista: todas as formas dele juntas. A caixa é a união das caixas, e a grossura vai do
    // primeiro ao último cruzamento com qualquer forma (widthAcross). O centro é a média dos centros das formas, pesada
    // pela área de cada uma: numa peça traçada, cada mancha de cor conta pelo tamanho dela, e num desenho feito à mão o
    // nariz de perfil ou a ponta do cabelo quase não puxam. big é a maior forma (a linha dos avisos, a ordem do desenho).
    const agg = new Map();
    const pieceOf = (v, b) => {
      const k = v + '|' + b;
      if (agg.has(k)) return agg.get(k);
      const mine = piecesOf(v).filter((p) => p.bone === b), shown = mine.filter((p) => !p.aside), parts = shown.length ? shown : mine;
      let r = null;
      if (parts.length) {
        let big = parts[0], W = 0, cx = 0, cy = 0;
        const box = [Infinity, Infinity, -Infinity, -Infinity];
        for (const p of parts) {
          if (p.area > big.area) big = p;
          W += p.wt; cx += p.wc[0] * p.wt; cy += p.wc[1] * p.wt;
          box[0] = Math.min(box[0], p.box[0]); box[1] = Math.min(box[1], p.box[1]); box[2] = Math.max(box[2], p.box[2]); box[3] = Math.max(box[3], p.box[3]);
        }
        r = { parts, big, box, cx: cx / W, cy: cy / W };
      }
      agg.set(k, r);
      return r;
    };
    const sides = drawn.includes('right') || drawn.includes('left');
    const diags = drawn.filter((v) => v.includes('_'));

    // ---------- o esqueleto em 3D: X para o lado, Y para baixo, Z para a frente ----------
    const P3 = new Map(), src = new Map();
    const read = new Set(); // a profundidade veio de uma peça (serve para medir o ângulo das diagonais)
    if (main === 'down') {
      for (const b of bones) {
        const R = pieceOf('right', b.name), Lf = pieceOf('left', b.name);
        const zr = R ? R.cx - rootX : null, zl = Lf ? rootX - Lf.cx : null;
        let Z = null, from = '';
        if (b.side !== null && b.side !== undefined) { Z = b.side - rootX; from = 'side='; }
        else if (zr !== null && zl !== null) {
          Z = (zr + zl) / 2; from = 'os dois lados';
          if (Math.abs(zr - zl) > 4) warn(b.line, `${b.name}: ${fmt(zr)} de profundidade no lado direito e ${fmt(zl)} no esquerdo (as duas vistas de lado discordam; vale a média, e side= no osso decide)`);
        } else if (zr !== null) { Z = zr; from = 'lado'; } else if (zl !== null) { Z = zl; from = 'esquerda'; }
        if (Z !== null && from !== 'side=') read.add(b.name);
        P3.set(b.name, [b.pivot[0], b.pivot[1], Z]);
        src.set(b.name, from);
      }
    } else {
      // principal = lado direito: o pivô é (frente, altura); o lado de cada osso vem de lat= ou da ordem do desenho
      const rootBone = bones.find((b) => !b.parent);
      for (const b of bones) {
        let X = rootX, from = 'meio';
        if (b.lat !== null && b.lat !== undefined) { X = b.lat; from = 'lat='; }
        else {
          const body = rootBone && pieceOf(main, rootBone.name), mine = pieceOf(main, b.name), list = piecesOf(main);
          if (body && mine && mine !== body) {
            const near = list.indexOf(mine.big) > list.indexOf(body.big);
            X = rootX + (near ? -8 : 8);
            from = near ? 'perto: desenhado na frente do corpo' : 'longe: desenhado atrás do corpo';
          }
        }
        P3.set(b.name, [X, b.pivot[1], b.pivot[0] - rootX]);
        src.set(b.name, from);
      }
    }

    // ---------- o ângulo das diagonais: medido no desenho, ou angle= ----------
    const ang = {};
    for (const v of drawn) ang[v] = ANG[v];
    for (const v of diags) {
      const L = vl.find((l) => l.view === v && l.angle !== null && l.angle !== undefined);
      if (L) { ang[v] = angOf(v, L.angle); V.angles[v] = { deg: L.angle, from: 'angle=' }; continue; }
      // o ângulo que melhor encaixa o x da frente e a profundidade do lado no x que a diagonal mostra
      const obs = [];
      if (main === 'down') for (const b of bones) {
        const f = pieceOf('down', b.name), d = pieceOf(v, b.name), R = pieceOf('right', b.name), Lf = pieceOf('left', b.name);
        if (!f || !d || !(R || Lf)) continue;
        const z = R && Lf ? (R.cx - rootX + rootX - Lf.cx) / 2 : R ? R.cx - rootX : rootX - Lf.cx;
        obs.push([f.cx - rootX, z, d.cx - rootX]);
      }
      if (!obs.length) {
        V.angles[v] = { deg: 45, from: 'padrão' };
        warn(L0(v), `não deu para medir o ângulo de ${v} (nenhum osso tem peça na frente, no lado e na diagonal): vale 45° (angle= na camada corrige)`);
        ang[v] = angOf(v, 45);
        continue;
      }
      let best = 45, err = Infinity;
      for (let a = 5; a <= 85.001; a += 0.5) {
        const phi = angOf(v, a) * D2R, c = Math.cos(phi), s = Math.sin(phi);
        let e = 0;
        for (const [x, z, o] of obs) { const p = x * c + z * s; e += (p - o) * (p - o); }
        if (e < err - 1e-9) { err = e; best = a; }
      }
      ang[v] = angOf(v, best);
      V.angles[v] = { deg: best, from: 'medido', n: obs.length, err: Math.sqrt(err / obs.length) };
    }
    function L0(v) { const L = vl.find((l) => l.view === v); return L ? L.line : vl[0].line; }

    // ---------- a profundidade que falta: a diagonal, o par espelhado, o pai ----------
    if (main === 'down') {
      for (const b of bones) for (const v of diags) {
        const d = pieceOf(v, b.name);
        if (!d) continue;
        const phi = ang[v] * D2R, s = Math.sin(phi), c = Math.cos(phi);
        if (Math.abs(s) < 0.2) continue;
        const f = pieceOf('down', b.name), x = (f ? f.cx : b.pivot[0]) - rootX, z = (d.cx - rootX - x * c) / s;
        const P = P3.get(b.name), from = src.get(b.name);
        if (P[2] === null) { P[2] = z; src.set(b.name, `diagonal ${v}`); }
        else if (read.has(b.name) && !from.startsWith('diagonal') && Math.abs(z - P[2]) > 5) warn(b.line, `${b.name}: ${fmt(P[2])} de profundidade no lado, ${fmt(z)} na diagonal ${v} (vale a do lado; side= no osso decide)`);
      }
      for (const b of bones) {
        const P = P3.get(b.name);
        if (P[2] !== null) continue;
        const mate = bones.find((o) => o !== b && P3.get(o.name)[2] !== null && Math.abs(o.pivot[1] - b.pivot[1]) < 3 && Math.abs(o.pivot[0] + b.pivot[0] - 2 * rootX) < 4);
        if (mate) { P[2] = P3.get(mate.name)[2]; src.set(b.name, `par de ${mate.name}`); }
      }
      for (let pass = 0; pass < 64; pass++) {
        let left = false;
        for (const b of bones) {
          const P = P3.get(b.name);
          if (P[2] !== null) continue;
          const par = b.parent && m.bones.get(b.parent);
          if (!par) { P[2] = 0; src.set(b.name, 'raiz'); continue; }
          const q = P3.get(par.name)[2];
          if (q === null) { left = true; continue; }
          P[2] = q;
          src.set(b.name, `pai, ${par.name}`);
          if (sides || diags.length) warn(b.line, `${b.name}: nenhuma peça dele no lado (nem na diagonal) e nenhum osso espelhado na frente; a profundidade é a do pai, ${par.name} (side= no osso corrige)`);
        }
        if (!left) break;
      }
      for (const P of P3.values()) if (P[2] === null) P[2] = 0;
      if (!sides && !diags.length) warn(L0(main), 'sem uma vista de lado (view=right ou view=left), a profundidade de todos os ossos fica 0: osso.z= ainda anda para a frente, mas a ordem só troca com o que anda (side= no osso dá a profundidade)');
    }
    for (const b of bones) {
      const P = P3.get(b.name);
      V.depth.set(b.name, main === 'down' ? { z: P[2], from: src.get(b.name) } : { lat: P[0], from: src.get(b.name) });
    }

    // ---------- para onde cada osso aponta (o giro das peças, o bastão da ordem) ----------
    // tip= no osso; sem ele, o osso filho, quando há um só; sem filho, o centro das peças do osso na vista principal,
    // com a profundidade do centro das peças dele de lado (as duas sombras da mesma direção). tip=x,y,z: x,y desenhados na vista
    // principal, z o quanto a ponta vai para a frente (num jogo de plataforma, para perto da câmera)
    const sideView = drawn.includes('right') ? 'right' : drawn.includes('left') ? 'left' : null;
    const DIR = new Map();
    for (const b of bones) {
      const P = P3.get(b.name), kids = bones.filter((o) => o.parent === b.name);
      let v = null;
      let from = '';
      if (b.vtip) {
        const t = b.vtip, dx = t[0] - b.pivot[0], dy = t[1] - b.pivot[1], dz = t.length > 2 ? t[2] : 0;
        v = main === 'down' ? [dx, dy, dz] : [-dz, dy, dx];
        from = 'tip=';
      } else if (kids.length === 1) { const Q = P3.get(kids[0].name); v = [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]]; from = `filho ${kids[0].name}`; }
      else {
        const pc = pieceOf(main, b.name);
        if (pc && main === 'down') {
          const sd = sideView && pieceOf(sideView, b.name), dz = sd ? (sideView === 'left' ? rootX - sd.cx : sd.cx - rootX) - P[2] : 0;
          v = [pc.cx - b.pivot[0], pc.cy - b.pivot[1], dz];
          from = sd ? 'as peças, de frente e de lado' : 'as peças';
        } else if (pc) { v = [0, pc.cy - b.pivot[1], pc.cx - b.pivot[0]]; from = 'as peças'; }
      }
      if (!v || Math.hypot(...v) < 2) { v = [0, 10, 0]; from = 'para baixo: curto demais para medir'; }
      V.aim.set(b.name, from);
      const L = Math.hypot(...v), u = v.map((c) => c / L);
      // o bastão cobre as peças do osso: da parte que fica antes da junta até a que vai mais longe
      let s0 = 0, s1 = L;
      const u2 = main === 'down' ? [u[0], u[1]] : [u[2], u[1]], l2 = Math.hypot(...u2);
      if (l2 > 0.5) for (const pc of piecesOf(main)) {
        if (pc.bone !== b.name) continue;
        for (const q of pc.poly) {
          const t = ((q[0] - b.pivot[0]) * u2[0] + (q[1] - b.pivot[1]) * u2[1]) / (l2 * l2);
          if (t < s0) s0 = t;
          if (t > s1) s1 = t;
        }
      }
      DIR.set(b.name, { u, L, s0, s1 });
    }

    // ---------- a grossura de cada osso, medida no desenho ----------
    // a meia largura da peça na reta que corta o osso de través, em 5 lugares (da junta à ponta): de frente dá a de
    // lado a lado, de lado dá a de frente para trás
    const THK = new Map();
    for (const b of bones) {
      const P = P3.get(b.name), d = DIR.get(b.name);
      const f = main === 'down' ? pieceOf('down', b.name) : null, sd = sideView ? pieceOf(sideView, b.name) : null;
      const sg = sideView === 'left' ? -1 : 1;
      const rows = [];
      for (let k = 0; k <= 4; k++) {
        const q = P.map((c, i) => c + d.u[i] * (d.s0 + ((d.s1 - d.s0) * k) / 4));
        let hx = null, hz = null;
        if (f) { const l = Math.hypot(d.u[0], d.u[1]), n = l > 0.2 ? [-d.u[1] / l, d.u[0] / l] : [1, 0]; hx = widthAcross(f, [q[0], q[1]], n); }
        if (sd) { const dx = sg * d.u[2], l = Math.hypot(dx, d.u[1]), n = l > 0.2 ? [-d.u[1] / l, dx / l] : [1, 0]; hz = widthAcross(sd, [rootX + sg * q[2], q[1]], n); }
        rows.push([hx, hz]);
      }
      // onde a reta não pega a peça (a ponta do osso passa dela), vale a medida mais perto
      for (const j of [0, 1]) {
        const have = rows.some((r) => r[j] !== null);
        const fb = have ? null : j === 0 ? (f ? (f.box[2] - f.box[0]) / 2 : null) : sd ? (sd.box[2] - sd.box[0]) / 2 : null;
        for (let k = 0; k <= 4; k++) if (rows[k][j] === null) {
          let best = null, bd = 9;
          for (let i = 0; i <= 4; i++) if (rows[i][j] !== null && Math.abs(i - k) < bd) { bd = Math.abs(i - k); best = rows[i][j]; }
          rows[k][j] = best !== null ? best : fb;
        }
      }
      for (const r of rows) {
        if (r[0] === null) r[0] = r[1] !== null ? r[1] : 4;
        if (r[1] === null) r[1] = r[0];
        r[0] = Math.max(1, r[0]);
        r[1] = Math.max(1, r[1]);
      }
      THK.set(b.name, rows);
    }
    const thickAt = (name, s) => {
      const R = THK.get(name), x = Math.max(0, Math.min(4, s * 4)), i = Math.min(3, Math.floor(x)), f = x - i;
      return [R[i][0] + (R[i + 1][0] - R[i][0]) * f, R[i][1] + (R[i + 1][1] - R[i][1]) * f];
    };
    for (const b of bones) V.thick.set(b.name, thickAt(b.name, 0.5));

    // ---------- conferências do desenho ----------
    if (main === 'down' && drawn.includes('up')) {
      for (const b of bones) {
        const pc = pieceOf('up', b.name), X = P3.get(b.name)[0];
        if (!pc || Math.abs(X - rootX) < 6) continue;
        const want = 2 * rootX - X;
        if (Math.abs(pc.cx - X) < Math.abs(pc.cx - want)) warn(pc.big.el.line, `de costas, a esquerda e a direita trocam de lado: ${pc.big.name || 'esta peça'} (osso ${b.name}) está perto de x=${fmt(X)}, mas de costas o osso fica em x=${fmt(want)} (troque o bone= pelo do osso espelhado, ou mude a peça de lado)`);
      }
    }
    if (main === 'down' && sideView) {
      // a peça inteira mais alta (ou mais baixa) de lado: o alto e o baixo dela mudaram para o mesmo lado. Só um dos
      // dois não avisa: de frente, o tronco vai até o quadril, e de lado ele pode parar no cinto
      for (const b of bones) {
        const f = pieceOf('down', b.name), s = pieceOf(sideView, b.name);
        if (!f || !s) continue;
        const dt = s.box[1] - f.box[1], db = s.box[3] - f.box[3], d = Math.min(Math.abs(dt), Math.abs(db));
        if (d > 8 && Math.sign(dt) === Math.sign(db)) warn(b.line, `${b.name}: de lado, a peça inteira está ${fmt(d)} px mais ${dt < 0 ? 'alta' : 'baixa'} que na frente (de y=${fmt(f.box[1])} a ${fmt(f.box[3])} na frente, de y=${fmt(s.box[1])} a ${fmt(s.box[3])} de lado): as vistas estão desalinhadas? a altura tem que bater`);
      }
    }
    if (drawn.includes('right') && drawn.includes('left')) {
      for (const v of diags) if (!drawn.includes(MIRROR[v])) warn(L0(v), `com os dois lados desenhados, a diagonal ${MIRROR[v]} também precisa ser desenhada (layer … view=${MIRROR[v]}): espelhar a ${v} trocaria a mão do personagem só na diagonal, então as animações _${MIRROR[v]} não saem`);
    }

    // ---------- projeção numa vista ----------
    function proj(v) {
      const phi = ang[v] * D2R, c = Math.cos(phi), s = Math.sin(phi);
      const dep = (p) => -(p[0] - rootX) * s + p[2] * c, depV = (w) => -w[0] * s + w[2] * c;
      return {
        c, s, dep,
        pt: (p, depRest) => [rootX + (p[0] - rootX) * c + p[2] * s, p[1] + K * (dep(p) - depRest)],
        restXY: (P) => [rootX + (P[0] - rootX) * c + P[2] * s, P[1]],
        // uma direção na tela: parada (como desenhada) e girada (w; o que ela andou para a frente desce na tela)
        vec0: (u) => [u[0] * c + u[2] * s, u[1]],
        vec: (w, u) => [w[0] * c + w[2] * s, w[1] + K * (depV(w) - depV(u))],
      };
    }
    const PR = new Map(drawn.map((v) => [v, proj(v)]));
    const REST_XY = new Map(), REST_DEP = new Map();
    for (const v of drawn) {
      const pr = PR.get(v), xy = new Map(), dp = new Map(), off = new Map();
      for (const b of bones) {
        const P = P3.get(b.name), q = pr.restXY(P);
        xy.set(b.name, q);
        dp.set(b.name, pr.dep(P));
        off.set(b.name, [q[0] - b.pivot[0], q[1] - b.pivot[1]]);
      }
      REST_XY.set(v, xy);
      REST_DEP.set(v, dp);
      if (v !== main) V.off.set(v, off);
    }
    // o que foi desenhado só na vista principal (as caixas, os pontos, as formas das camadas sem view=), preso a um
    // osso, vai para o lugar dele em cada vista: x -> lugar + A·(x - pivot=), com A o giro e o encurtamento que levam
    // a direção do osso desenhada na principal para a desenhada nesta vista (a ponta da espada continua na ponta)
    const pm = PR.get(main);
    for (const v of drawn) {
      if (v === main) continue;
      const pr = PR.get(v), xy = REST_XY.get(v), xf = new Map();
      for (const b of bones) {
        const q = xy.get(b.name), u = DIR.get(b.name).u, a = pm.vec0(u), c = pr.vec0(u), la = Math.hypot(a[0], a[1]), lc = Math.hypot(c[0], c[1]);
        let R = [1, 0, 0, 1, 0, 0];
        if (la > 0.25 && lc > 0.25) {
          const g = (Math.atan2(c[1], c[0]) - Math.atan2(a[1], a[0])) * R2D, k = fit(b, lc / la), n = [a[0] / la, a[1] / la], e = k - 1;
          if (Math.abs(near(g, 0)) > 1e-9 || Math.abs(e) > 1e-9) R = M.mul(M.rotate(g), [1 + e * n[0] * n[0], e * n[0] * n[1], e * n[0] * n[1], 1 + e * n[1] * n[1], 0, 0]);
        }
        const [px, py] = b.pivot;
        xf.set(b.name, [R[0], R[1], R[2], R[3], q[0] - (R[0] * px + R[2] * py), q[1] - (R[1] * px + R[3] * py)]);
      }
      V.xf.set(v, xf);
    }

    // ---------- turns: o osso que mostra o desenho de outra vista ----------
    // As peças dele nas outras vistas (e nas que saem espelhadas delas) entram em cada vista como cópias escondidas,
    // logo depois das peças dele, levadas para o lugar do osso nessa vista. Em cada quadro de uma animação gerada,
    // aparece só o desenho da vista mais perto de para onde a frente do osso aponta (o resto, escondido).
    const cands = drawn.map((v) => ({ name: v, src: v, ang: ang[v], mirror: false }));
    for (const v of drawn) if (MIRROR[v] && !drawn.includes(MIRROR[v])) cands.push({ name: MIRROR[v], src: v, ang: (360 - ang[v]) % 360, mirror: true });
    const angDist = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
    const TURN = new Map(drawn.map((v) => [v, []]));
    const rigid = (el) => el.bone && !el.vclone && !el.bones && !el.limb && !el.pins && !el.cloth;
    for (const b of bones) {
      if (!b.turns) continue;
      const ownIn = (v) => vl.filter((L) => L.view === v).flatMap((L) => L.items.filter((it) => it.el.bone === b.name && rigid(it.el)).map((it) => ({ L, it })));
      for (const v of drawn) {
        const own = ownIn(v);
        if (!own.length) continue;
        const Lv = own[own.length - 1].L, Pv = REST_XY.get(v).get(b.name), alts = [];
        let at = Lv.items.indexOf(own[own.length - 1].it) + 1;
        for (const c of cands) {
          if (c.name === v) continue;
          const src = ownIn(c.src);
          if (!src.length) continue;
          const Ps = REST_XY.get(c.src).get(b.name);
          const T = c.mirror ? [-1, 0, 0, 1, Ps[0] + Pv[0], Pv[1] - Ps[1]] : [1, 0, 0, 1, Pv[0] - Ps[0], Pv[1] - Ps[1]];
          const made = new Map(), els = [];
          for (const { it } of src) {
            let cl = made.get(it.el);
            if (!cl) {
              cl = Object.assign({}, it.el);
              for (const k of Object.keys(cl)) if (k[0] === '_') delete cl[k];
              cl.id = m.elements.length;
              cl.xf = it.el.xf ? M.mul(T, it.el.xf) : T;
              cl.layer = Lv;
              cl.hidden = true;
              cl.vclone = { of: it.el, view: c.name };
              m.elements.push(cl);
              made.set(it.el, cl);
              els.push(cl);
            }
            Lv.items.splice(at++, 0, { el: cl, part: it.part });
          }
          alts.push({ cand: c, els });
        }
        if (alts.length) TURN.get(v).push({ bone: b, own: own.map((o) => o.it.el).filter((el, i, a) => a.indexOf(el) === i), alts, ang: ang[v] });
      }
    }
    // o desenho que aparece num quadro: a vista mais perto do ângulo para onde a frente do osso aponta
    const turnPick = (t, w) => {
      const fw = mv(w.Q, [0, 0, 1]), eff = t.ang + Math.atan2(fw[0], fw[2]) * R2D;
      let best = null, bd = Infinity;
      for (const c of [{ name: null, ang: t.ang }, ...t.alts.map((a) => a.cand)]) { const d = angDist(c.ang, eff); if (d < bd - 1e-9) { bd = d; best = c.name; } }
      return best;
    };

    // ---------- o mundo de cada osso num quadro, em 3D ----------
    // p' = L·p + t, com L = o giro (Q) e a escala de cada osso até a raiz: rot no plano da vista principal, pitch para a
    // frente e para trás, yaw em volta do eixo de pé (a ordem do protótipo); sx estica de lado a lado e de frente para
    // trás, sy na altura. M2 é a matriz do 2D de sempre (o giro e a escala de cada osso, sem o 3D), S2 só a escala, e
    // th a soma dos giros: a vista principal sem pitch e sem yaw sai igual ao 2D.
    const apply = (w, p) => { const q = mv(w.L, p); return [q[0] + w.t[0], q[1] + w.t[1], q[2] + w.t[2]]; };
    const valOf = (an, b, f) => { const s = an && G.segment(an.tracks.get(b.name), f, an.frames, an.loop); return s ? s.a.v.map((x, k) => x + (s.b.v[k] - x) * s.t) : REST.slice(); };
    const numOf = (an, key, f) => { const tr = an && an.ptracks.get(key), s = tr && G.segment(tr.keys, f, an.frames, an.loop); return s ? s.a.v + (s.b.v - s.a.v) * s.t : 0; };
    // an = null: a pose parada. over (o Testar ossos): nome -> { v, z, pitch, yaw }, cada parte no lugar da animação
    function world(an, f, over) {
      const out = new Map();
      const get = (b, depth) => {
        if (out.has(b.name)) return out.get(b.name);
        const o = over && over.get(b.name), P = P3.get(b.name), v = o && o.v ? o.v.slice() : valOf(an, b, f);
        const part = (k) => (o && o[k] !== undefined && o[k] !== null ? o[k] : numOf(an, `${b.name}.${k}`, f));
        const dz = part('z'), pitch = part('pitch'), yaw = part('yaw');
        let Q = main === 'right' ? rotX(pitch - v[2]) : pitch ? mm(rotX(pitch), rotZ(v[2])) : rotZ(v[2]);
        if (yaw) Q = mm(rotY(yaw), Q);
        const L = Q.map((r) => [r[0] * v[3], r[1] * v[4], r[2] * v[3]]);
        const mvd = main === 'right' ? [-dz, v[1], v[0]] : [v[0], v[1], dz], LP = mv(L, P);
        const t = [0, 1, 2].map((i) => P[i] + mvd[i] - LP[i]);
        const M2 = M.mul(M.rotate(v[2]), M.scale(v[3], v[4]));
        let w = { L, t, Q, M2, S2: [v[3], v[4]], th: v[2], rot: v[2] };
        const par = b.parent && m.bones.get(b.parent);
        if (par && depth < 64) {
          const q = get(par, depth + 1), qt = mv(q.L, t);
          w = { L: mm(q.L, L), t: [0, 1, 2].map((i) => qt[i] + q.t[i]), Q: Q === ID3 ? q.Q : q.Q === ID3 ? Q : mm(q.Q, Q), M2: M.mul(q.M2, M2), S2: [q.S2[0] * v[3], q.S2[1] * v[4]], th: q.th + v[2], rot: v[2] };
        }
        out.set(b.name, w);
        return w;
      };
      for (const b of bones) get(b, 0);
      return out;
    }
    // a pose 2D de uma vista: para cada osso, a key (em volta do pivot= de sempre) que leva as peças da vista do lugar
    // parado para onde o osso está agora. Cada osso ganha uma matriz na tela: o pivô vai para onde ele está projetado,
    // e as peças giram pelo quanto o osso parece ter girado nessa vista e encurtam ao longo dele (de 10% a 1,4 vez); a
    // largura fica. A key é essa matriz vista do pai: [dx, dy, rot, sx, sy, inclinação]. last guarda, por osso, o giro
    // do quadro anterior (sem saltos de uma volta). A mesma matriz tem duas keys (giro e escala positiva, ou giro + 180
    // e escala negativa): Wmid é o 3D no meio do caminho desde o quadro anterior, e fica a key que, misturada com a
    // anterior, chega mais perto dele. Assim, entre dois quadros (no Godot, numa transição), a peça que passa de
    // frente para a câmera encurta e volta do outro lado, e a que dá a volta de lado gira.
    function keysOf(v, Wf, last, Wmid) {
      const H = Wmid ? localsOf(v, Wmid, new Map(last)) : null, L = localsOf(v, Wf, last), out = new Map();
      for (const b of bones) {
        const { U, q, rv } = L.get(b.name);
        // U = giro · [[sx, inclinação], [0, sy]], com o giro perto do quadro anterior
        const prev = last.get('r|' + b.name), ref = prev === undefined ? Wf.get(b.name).rot : prev;
        const sx = Math.hypot(U[0], U[1]), rot = sx > 1e-9 ? Math.atan2(U[1], U[0]) * R2D : ref;
        const dec = (r, s) => {
          const cr = Math.cos(r * D2R), sr = Math.sin(r * D2R);
          return [r, s, -sr * U[2] + cr * U[3], cr * U[2] + sr * U[3]];
        };
        const a = dec(near(rot, ref), sx), c = dec(near(rot + 180, ref), -sx), pv = last.get('v|' + b.name), hm = H && H.get(b.name);
        let k;
        if (pv && hm) {
          const off = (x) => {
            const r = ((pv[0] + x[0]) / 2) * D2R, s = (pv[1] + x[1]) / 2, sy = (pv[2] + x[2]) / 2, h = (pv[3] + x[3]) / 2, cr = Math.cos(r), sr = Math.sin(r);
            const g = [cr * s, sr * s, cr * h - sr * sy, sr * h + cr * sy];
            return g.reduce((n, y, i) => n + (y - hm.U[i]) ** 2, 0);
          };
          k = off(c) < off(a) - 1e-9 ? c : a;
        } else k = Math.abs(c[0] - ref) < Math.abs(a[0] - ref) - 1e-9 ? c : a;
        last.set('r|' + b.name, k[0]);
        last.set('v|' + b.name, k);
        const o = [b.pivot[0] - rv[0], b.pivot[1] - rv[1]];
        const d = [q[0] - b.pivot[0] + U[0] * o[0] + U[2] * o[1], q[1] - b.pivot[1] + U[1] * o[0] + U[3] * o[1]];
        out.set(b.name, [d[0], d[1], k[0], k[1], k[2], k[3]]);
      }
      return out;
    }
    // a matriz de cada osso numa vista, vista do pai (U), e onde o lugar do osso na vista vai parar (q)
    function localsOf(v, Wf, last) {
      const pr = PR.get(v), xy = REST_XY.get(v), dp = REST_DEP.get(v), isMain = v === main, A = new Map(), out = new Map();
      const scr = (b) => {
        if (A.has(b.name)) return A.get(b.name);
        const w = Wf.get(b.name), u = DIR.get(b.name).u;
        const cur = pr.pt(apply(w, P3.get(b.name)), dp.get(b.name));
        // antes do 3D: na vista principal, a matriz do 2D; nas outras, só a escala
        const base = isMain ? w.M2 : [w.S2[0], 0, 0, w.S2[1], 0, 0];
        let Mb = base;
        const p0 = pr.vec0(u), l0 = Math.hypot(p0[0], p0[1]);
        // um osso que aponta para a câmera nesta vista (parado) não gira nem encurta
        if (l0 > 0.25) {
          const p1 = pr.vec(mv(w.Q, u), u), l1 = Math.hypot(p1[0], p1[1]);
          const th = isMain ? w.th * D2R : 0, d2 = [Math.cos(th) * p0[0] - Math.sin(th) * p0[1], Math.sin(th) * p0[0] + Math.cos(th) * p0[1]];
          const prev = last.get('g|' + b.name);
          let g = l1 > 0.15 ? (Math.atan2(p1[1], p1[0]) - Math.atan2(d2[1], d2[0])) * R2D : prev || 0;
          g = near(g, prev === undefined ? 0 : prev);
          last.set('g|' + b.name, g);
          const k = fit(b, l1 / l0);
          if (Math.abs(g) > 1e-9 || Math.abs(k - 1) > 1e-9) {
            // encurta ao longo do osso como ele está desenhado agora, depois gira
            const bp = [base[0] * p0[0] + base[2] * p0[1], base[1] * p0[0] + base[3] * p0[1]], bl = Math.hypot(bp[0], bp[1]);
            const n = bl > 1e-9 ? [bp[0] / bl, bp[1] / bl] : [d2[0] / l0, d2[1] / l0], e = k - 1;
            const N = [1 + e * n[0] * n[0], e * n[0] * n[1], e * n[0] * n[1], 1 + e * n[1] * n[1], 0, 0];
            Mb = M.mul(M.rotate(g), M.mul(N, base));
          }
        }
        const a = { cur, M: Mb, rv: xy.get(b.name) };
        A.set(b.name, a);
        return a;
      };
      for (const b of bones) {
        const me = scr(b), par = b.parent && m.bones.get(b.parent), p = par ? scr(par) : null, Mb = me.M;
        // U: a matriz do osso vista do pai; q: onde o lugar do osso na vista (rv) vai parar, visto do pai
        let U, q;
        if (!p) { U = Mb; q = me.cur; }
        else {
          const Pm = p.M, dc = [me.cur[0] - p.cur[0], me.cur[1] - p.cur[1]];
          if (Pm[1] === 0 && Pm[2] === 0) {
            const a = Math.abs(Pm[0]) < 1e-9 ? 1e-9 : Pm[0], d = Math.abs(Pm[3]) < 1e-9 ? 1e-9 : Pm[3];
            U = [Mb[0] / a, Mb[1] / d, Mb[2] / a, Mb[3] / d];
            q = [p.rv[0] + dc[0] / a, p.rv[1] + dc[1] / d];
          } else {
            let det = Pm[0] * Pm[3] - Pm[1] * Pm[2];
            if (Math.abs(det) < 1e-12) det = det < 0 ? -1e-12 : 1e-12;
            const I = [Pm[3] / det, -Pm[1] / det, -Pm[2] / det, Pm[0] / det];
            U = [I[0] * Mb[0] + I[2] * Mb[1], I[1] * Mb[0] + I[3] * Mb[1], I[0] * Mb[2] + I[2] * Mb[3], I[1] * Mb[2] + I[3] * Mb[3]];
            q = [p.rv[0] + I[0] * dc[0] + I[2] * dc[1], p.rv[1] + I[1] * dc[0] + I[3] * dc[1]];
          }
        }
        out.set(b.name, { U, q, rv: me.rv });
      }
      return out;
    }

    // ---------- a ordem: quem fica na frente ----------
    // Cada osso é um bastão (do começo ao fim das peças dele) com a grossura medida no desenho. Em 5 pontos de cada
    // bastão, onde as duas peças se cobrem na tela, compara as superfícies de frente para a câmera, agora e paradas; a
    // média pesa pelo quanto se cobrem. Um par só troca quando essa diferença passou para o outro lado mais do que a
    // grossura média das duas (no mínimo 2 px). As peças do mesmo osso e as sem osso ficam na ordem do desenho.
    const surf = (k, o) => k.t * Math.sqrt(Math.max(0, 1 - (o / k.r) * (o / k.r)));
    const onSeg = (S, p) => {
      const dx = S.b[0] - S.a[0], dy = S.b[1] - S.a[1], L2 = dx * dx + dy * dy;
      const t = L2 > 1e-6 ? Math.max(0, Math.min(1, ((p[0] - S.a[0]) * dx + (p[1] - S.a[1]) * dy) / L2)) : 0;
      return { t, d: Math.hypot(S.a[0] + dx * t - p[0], S.a[1] + dy * t - p[1]) };
    };
    const at = (S, t) => [S.a[0] + (S.b[0] - S.a[0]) * t, S.a[1] + (S.b[1] - S.a[1]) * t];
    const dAt = (S, t) => S.da + (S.db - S.da) * t;
    function sticks(v, Wf) {
      const pr = PR.get(v), dp = REST_DEP.get(v), out = new Map();
      for (const b of bones) {
        const P = P3.get(b.name), d = DIR.get(b.name), rd = dp.get(b.name);
        const A0 = P.map((c, i) => c + d.u[i] * d.s0), B0 = P.map((c, i) => c + d.u[i] * d.s1);
        const w = Wf && Wf.get(b.name), A = w ? apply(w, A0) : A0, B = w ? apply(w, B0) : B0;
        out.set(b.name, { a: pr.pt(A, rd), b: pr.pt(B, rd), da: pr.dep(A), db: pr.dep(B) });
      }
      return out;
    }
    const REST_STICK = new Map(drawn.map((v) => [v, sticks(v, null)]));
    // as camadas de cada vista, com as peças (itens) na ordem do arquivo
    const viewLayers = new Map(drawn.map((v) => [v, vl.filter((L) => L.view === v)]));
    function orderOf(v, Wf) {
      const pr = PR.get(v), ca = Math.abs(pr.c), sa = Math.abs(pr.s), now = sticks(v, Wf), rest = REST_STICK.get(v);
      const thick = (name, s) => { const hw = thickAt(name, s); return { t: sa * hw[0] + ca * hw[1], r: ca * hw[0] + sa * hw[1] }; };
      const cache = new Map();
      const verdict = (na, nb) => {
        const key = na + '|' + nb;
        if (cache.has(key)) return cache.get(key);
        const A = now.get(na), B = now.get(nb), RA = rest.get(na), RB = rest.get(nb);
        let sw = 0, sn = 0, sr = 0, sT = 0;
        const tryAt = (s1, s2, dist) => {
          const ka = thick(na, s1), kb = thick(nb, s2), cover = ka.r + kb.r - dist;
          if (cover <= 0) return;
          const mm = Math.max(0, Math.min(dist, (dist - kb.r + ka.r) / 2)), ea = surf(ka, mm), eb = surf(kb, dist - mm);
          const n = dAt(A, s1) + ea - dAt(B, s2) - eb, r = dAt(RA, s1) + ea - dAt(RB, s2) - eb;
          sw += cover; sn += cover * n; sr += cover * r; sT += cover * Math.max(2, (ka.t + kb.t) / 2);
        };
        for (const s of [0, 0.25, 0.5, 0.75, 1]) {
          const q = onSeg(B, at(A, s));
          tryAt(s, q.t, q.d);
          const w = onSeg(A, at(B, s));
          tryAt(w.t, s, w.d);
        }
        const best = sw > 0 ? { n: sn / sw, r: sr / sw, T: sT / sw } : null;
        cache.set(key, best);
        return best;
      };
      const out = [];
      for (const L of viewLayers.get(v)) {
        const list = L.items, N = list.length;
        const above = (i, j) => {
          const a = list[i].el.bone, b = list[j].el.bone, restAbove = i > j;
          if (!a || !b || a === b || !P3.has(a) || !P3.has(b)) return restAbove;
          const vd = verdict(a, b);
          if (!vd) return null;
          if (restAbove) return !(vd.n < Math.min(vd.r, 0) - vd.T);
          return vd.n > Math.max(vd.r, 0) + vd.T;
        };
        const below = list.map(() => []), need = new Array(N).fill(0);
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          const w = above(i, j);
          if (w === null) continue;
          if (w) { below[j].push(i); need[i]++; } else { below[i].push(j); need[j]++; }
        }
        const done = new Array(N).fill(false), order = [];
        for (let k = 0; k < N; k++) {
          let pick = -1;
          for (let i = 0; i < N; i++) if (!done[i] && need[i] === 0) { pick = i; break; }
          if (pick < 0) for (let i = 0; i < N; i++) if (!done[i]) { pick = i; break; } // um ciclo: vale a ordem do desenho
          done[pick] = true;
          order.push(pick);
          for (const j of below[pick]) need[j]--;
        }
        // quem passou na frente de quem (para o --info): os pares de ossos que se cobrem e ficaram ao contrário do desenho
        const pairs = new Set();
        if (order.some((x, i) => x !== i)) {
          const pos = new Array(N);
          order.forEach((x, i) => { pos[x] = i; });
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            if (pos[i] < pos[j]) continue;
            const a = list[i].el.bone, b = list[j].el.bone;
            if (a && b && a !== b && P3.has(a) && P3.has(b) && verdict(a, b)) pairs.add(a + '>' + b);
          }
        }
        out.push({ L, order, pairs });
      }
      return out;
    }

    // ---------- o pé no chão: o ponto mais baixo das peças da vista principal ----------
    // (o contorno das peças de cada osso, em 3D, anda, gira e estica com ele; um osso sem peça vale pela junta). Só
    // contam os ossos que tocam o chão parados (até 6 px acima dele): a espada que desce no golpe não é um pé.
    const LOW = new Map();
    for (const b of bones) {
      const P = P3.get(b.name), pts = [];
      for (const pc of piecesOf(main)) if (pc.bone === b.name) for (const q of pc.poly) pts.push(main === 'down' ? [q[0], q[1], P[2]] : [P[0], q[1], q[0] - rootX]);
      LOW.set(b.name, pts.length ? pts : [P.slice()]);
    }
    const restLow = new Map(bones.map((b) => [b.name, Math.max(...LOW.get(b.name).map((p) => p[1]))]));
    const floorY = Math.max(...restLow.values()), feet = bones.filter((b) => restLow.get(b.name) >= floorY - 6);
    const lowest = (Wf) => {
      let lo = -Infinity;
      for (const b of feet) {
        const w = Wf && Wf.get(b.name), r = w && w.L[1];
        for (const p of LOW.get(b.name)) { const y = w ? r[0] * p[0] + r[1] * p[1] + r[2] * p[2] + w.t[1] : p[1]; if (y > lo) lo = y; }
      }
      return lo;
    };
    const ground = lowest(null);

    // ---------- as animações ----------
    const both = drawn.includes('right') && drawn.includes('left');
    // com os dois lados desenhados, nada sai espelhado no Godot (nem as transições feitas das geradas)
    V.noMirror = both;
    const isBase = (an) => !dirOf(an.name) && !an.mixSpec && !an.transSpec;
    const hand = new Set(m.anims.filter((an) => dirOf(an.name)).map((an) => an.name));
    const out = [];
    for (const an of m.anims) {
      if (!isBase(an)) {
        const d = dirOf(an.name);
        if (d && !an.mixSpec && !an.transSpec) {
          // walk_up escrita à mão conta como walk (only=walk numa caixa ou numa camada sem view=)
          const base = an.name.slice(0, -d.length - 1);
          if (m.animMap.has(base) && isBase(m.animMap.get(base))) an.aliases = [base];
          // o 3D (osso.z=, .pitch=, .yaw=) só existe nas animações sem direção no nome: numa escrita à mão, não faz nada
          const in3d = [...new Set([...an.ptracks.values()].filter((tr) => tr.kind === 'bone' && (tr.prop === 'z' || tr.prop === 'pitch' || tr.prop === 'yaw')).map((tr) => `${tr.name}.${tr.prop}=`))];
          if (in3d.length) warn(an.line, `${an.name} é escrita à mão numa vista: ${in3d.join(', ')} não ${in3d.length > 1 ? 'fazem' : 'faz'} nada aqui (o giro e a profundidade valem nas animações sem direção no nome, que o Weasel gera para cada vista)`);
          if (!drawn.includes(d)) {
            const other = MIRROR[d] && drawn.includes(MIRROR[d]) ? ` (o Godot já espelha ${an.name.slice(0, -d.length)}${MIRROR[d]})` : '';
            warn(an.line, `nenhuma camada view=${d}: ${an.name} mostra só as camadas sem view=${other}`);
          } else if (d !== main) handWritten(an, d);
        }
        out.push(an);
        continue;
      }
      const N = an.frames, WF = [], WH = [null];
      for (let f = 0; f <= N; f++) WF.push(world(an, f));
      for (let f = 1; f <= N; f++) WH.push(world(an, f - 0.5));
      const g = [];
      for (let f = 0; f < N; f++) g.push(ground - lowest(WF[f]));
      V.ground.set(an.name, g);
      const sink = g.map((x, f) => [f, x]).filter((p) => p[1] < -1);
      if (sink.length) {
        const worst = Math.min(...sink.map((p) => p[1]));
        warn(an.line, sink.length === 1 ? `${an.name}, quadro ${sink[0][0]}: o pé afunda ${fmt(-worst)} px no chão` : `${an.name}, quadros ${sink.map((p) => p[0]).join(', ')}: o pé afunda no chão (até ${fmt(-worst)} px)`);
      }
      const names = [];
      for (const v of drawn) {
        const name = `${an.name}_${v}`;
        if (hand.has(name)) continue;
        const gen = { name, line: an.line, frames: N, fps: an.fps, loop: an.loop, tracks: new Map(), ptracks: new Map(), events: an.events.map((e) => Object.assign({}, e)), view: v, viewOf: an.name, baseAnim: an, aliases: [an.name] };
        if (an.feetSpec && (v === 'right' || v === 'left')) gen.feetSpec = an.feetSpec;
        if (both) gen.noMirror = true;
        if (v !== main) { gen.voff = V.off.get(v); gen.vxf = V.xf.get(v); }
        for (const [k, tr] of an.ptracks) if (!(tr.kind === 'bone' && (tr.prop === 'z' || tr.prop === 'pitch' || tr.prop === 'yaw'))) gen.ptracks.set(k, tr);
        for (const b of bones) gen.tracks.set(b.name, []);
        const last = new Map();
        for (let f = 0; f <= N; f++) for (const [b, v6] of keysOf(v, WF[f], last, WH[f])) gen.tracks.get(b).push({ frame: f, v: v6, ease: 'linear' });
        // turns: o desenho de cada quadro (as peças da vista com show=, as cópias das outras vistas com reveal=)
        for (const t of TURN.get(v)) {
          const picks = [];
          for (let f = 0; f < N; f++) picks.push(turnPick(t, WF[f].get(t.bone.name)));
          if (picks.every((p) => p === null)) continue;
          const track = (el, prop, val) => gen.ptracks.set(`#vira:${el.id}.${prop}`, { name: el.name || '', prop, kind: 'el', type: 'step', keys: picks.map((p, f) => ({ frame: f, v: val(p), ease: 'linear' })), targets: [el] });
          for (const el of t.own) if (![...gen.ptracks.values()].some((tr) => tr.prop === 'show' && tr.targets.includes(el))) track(el, 'show', (p) => (p === null ? 1 : 0));
          for (const a of t.alts) for (const el of a.els) track(el, 'reveal', (p) => (p === a.cand.name ? 1 : 0));
          V.turned.push({ anim: name, bone: t.bone.name, picks });
        }
        // a ordem de cada quadro: o lugar de cada peça na camada dela (só nas camadas em que algo troca)
        const per = [];
        const changed = new Set();
        for (let f = 0; f < N; f++) {
          const o = orderOf(v, WF[f]);
          per.push(o);
          for (const { L, order } of o) if (order.some((x, i) => x !== i)) changed.add(L);
        }
        if (changed.size) {
          gen.zorder = per.map((o) => { const z = new Map(); for (const { L, order } of o) if (changed.has(L)) order.forEach((x, i) => z.set(L.items[x].el.id, i)); return z; });
          // para o --info: em que quadros a ordem muda, e cada par de ossos que troca (o primeiro passa na frente do
          // segundo) com os quadros dele
          const frames = new Set(), pairs = new Map();
          per.forEach((o, f) => {
            for (const { order, pairs: ps } of o) {
              if (order.some((x, i) => x !== i)) frames.add(f);
              for (const p of ps) { if (!pairs.has(p)) pairs.set(p, []); if (!pairs.get(p).includes(f)) pairs.get(p).push(f); }
            }
          });
          V.swaps.push({ anim: name, frames: frames.size, total: N, pairs: [...pairs].map(([p, fs]) => { const [front, back] = p.split('>'); return { front, back, frames: fs }; }).sort((a, b) => a.frames[0] - b.frames[0] || (a.front + a.back).localeCompare(b.front + b.back)) });
        }
        names.push(name);
        out.push(gen);
      }
      V.gens.push({ base: an.name, line: an.line, names });
      an.genOf = names;
    }
    // as keys escritas à mão numa vista que não é a principal: o giro e a escala em volta do lugar do osso nessa vista
    function handWritten(an, v) {
      const off = V.off.get(v);
      an.voff = off;
      an.vxf = V.xf.get(v);
      an.view = v;
      if (both) an.noMirror = true;
      for (const b of bones) {
        const tr = an.tracks.get(b.name), o = off.get(b.name);
        if (!tr || !tr.length || (Math.abs(o[0]) < 1e-9 && Math.abs(o[1]) < 1e-9)) continue;
        if (tr.every((k) => Math.abs(k.v[2]) < 1e-9 && k.v[3] === 1 && k.v[4] === 1)) continue;
        const keys = [];
        for (let f = 0; f <= an.frames; f++) {
          const x = valOf(an, b, f), c = Math.cos(x[2] * D2R), s = Math.sin(x[2] * D2R);
          const ro = [c * x[3] * o[0] - s * x[4] * o[1], s * x[3] * o[0] + c * x[4] * o[1]];
          keys.push({ frame: f, v: [x[0] + o[0] - ro[0], x[1] + o[1] - ro[1], x[2], x[3], x[4]], ease: 'linear' });
        }
        an.tracks.set(b.name, keys);
      }
    }
    m.anims.length = 0;
    m.anims.push(...out);
    for (const g of V.gens) {
      const base = m.animMap.get(g.base);
      m.animMap.delete(g.base);
      for (const n of g.names) m.animMap.set(n, m.anims.find((x) => x.name === n));
      // a animação base não é desenhada: o editor (a linha do anim e das key dela) mostra a da vista principal
      const to = m.animMap.get(`${g.base}_${main}`) || m.animMap.get(g.names[0]) || null;
      if (base && to) for (const rec of m.byLine.values()) if (rec.anim === base) { rec.anim = to; rec.viewBase = g.base; }
    }

    // ---------- as camadas de cada vista aparecem nas animações dela ----------
    for (const L of vl) {
      const list = m.anims.filter((an) => (an.view || dirOf(an.name)) === L.view && !an.blendOf).map((an) => an.name);
      if (L.view === main) list.push('pose');
      L.only = list;
    }
    // as formas das camadas sem view= estão desenhadas na vista principal: presas a um osso, vão para o lugar dele
    for (const L of m.layers) if (!L.view) for (const it of L.items) if (it.el.bone) it.el.vsh = true;

    // ---------- para a vista Vistas em 3D do editor (js/ui-3d.js) ----------
    // o esqueleto em 3D parado (P3), a direção de cada osso (DIR), a grossura medida, o ângulo de cada vista, o chão e
    // o mundo de cada osso num quadro de uma animação base (gen.baseAnim)
    V.p3 = P3;
    V.dir = DIR;
    V.thickAt = thickAt;
    V.ang = ang;
    V.floor = ground;
    V.world = world;
    V.apply = apply;
    // ---------- para o Testar ossos do editor (js/app.js) ----------
    // os valores de um osso num quadro da animação base (an; null = a pose parada), como numa key
    V.valsOf = (an, name, f) => {
      const b = m.bones.get(name);
      return { v: b ? valOf(an, b, f) : REST.slice(), z: numOf(an, `${name}.z`, f), pitch: numOf(an, `${name}.pitch`, f), yaw: numOf(an, `${name}.yaw`, f) };
    };
    // A pose de uma vista com alguns ossos trocados (over: nome -> { v, z, pitch, yaw }): as keys de cada osso (como as
    // geradas, sem o quadro anterior: a matriz é a mesma), a ordem das peças (id -> lugar na camada), o desenho que
    // cada osso com turns mostra ([id, show|reveal, 0|1]) e o mundo em 3D
    V.testOf = (v, an, f, over) => {
      const Wf = world(an, f, over), keys = keysOf(v, Wf, new Map(), null), order = new Map(), turns = [];
      for (const { L, order: o } of orderOf(v, Wf)) o.forEach((x, i) => order.set(L.items[x].el.id, i));
      for (const t of TURN.get(v) || []) {
        const p = turnPick(t, Wf.get(t.bone.name));
        for (const el of t.own) if (!(an && [...an.ptracks.values()].some((tr) => tr.prop === 'show' && tr.targets && tr.targets.includes(el)))) turns.push([el.id, 'show', p === null ? 1 : 0]);
        for (const a of t.alts) for (const el of a.els) turns.push([el.id, 'reveal', p === a.cand.name ? 1 : 0]);
      }
      return { keys, order, turns, W: Wf };
    };
  }

  W.views = { build, VIEWS, ANG, MIRROR, dirOf };
})(window.Weasel = window.Weasel || {});
