/* Weasel — três vistas, uma animação (docs/planos/tres-vistas.md, etapa 1a).
   Num arquivo com camadas view=, cada animação sem direção no nome (walk) vira uma por vista desenhada (walk_down,
   walk_right, walk_up…). O Weasel monta um esqueleto em 3D:
   - o pivô de cada osso vem da vista principal (a frente; num jogo de plataforma, o lado direito);
   - a profundidade vem da vista de lado (a maior peça do osso), dos dois lados, de uma diagonal, do par espelhado
     ou do pai; side= no osso corrige (lat=, num jogo de plataforma, diz o x que o osso teria de frente);
   - cada diagonal tem o ângulo medido no desenho (angle= na camada corrige).
   Em cada quadro, os ossos andam em 3D (osso=dx,dy e osso.z=) e cada vista recebe a pose 2D dela: o lugar de cada
   osso projetado na vista, com a câmera do jogo (views tilt=: o que vai para a frente desce na tela). A ordem das
   peças troca só quando duas se cobrem e uma passou de verdade para o outro lado da outra.
   Por baixo, as animações geradas são animações comuns (uma key por quadro), e o resto do Weasel não muda. As keys
   ficam em volta do pivot= de sempre; anim.voff guarda, para cada osso, o quanto o lugar dele na vista está longe do
   pivot= (os giros que o Weasel soma, como o sway=, e as caixas, os pontos e as camadas sem view= usam isso).
   Etapa 1a: os ossos andam e esticam (dx, dy, z, sx, sy); o giro (rot, pitch e yaw) fica para a etapa 1b. */
(function (W) {
  'use strict';
  const G = W.geom;
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
    return { el, name: el.name, bone: el.bone || null, poly: pts, box, sw, cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2, area: Math.max(1e-3, (box[2] - box[0]) * (box[3] - box[1])) };
  }
  // a meia largura da peça na reta que passa por p na direção n (null: a reta não pega a peça)
  function widthAcross(pc, p, n) {
    if (pc.sw) return pc.sw / 2;
    let lo = Infinity, hi = -Infinity;
    const P = pc.poly;
    for (let i = 0; i < P.length; i++) {
      const A = P[i], B = P[(i + 1) % P.length];
      const ex = B[0] - A[0], ey = B[1] - A[1], den = ex * n[1] - ey * n[0];
      if (Math.abs(den) < 1e-9) continue;
      const qx = p[0] - A[0], qy = p[1] - A[1];
      const u = (qx * n[1] - qy * n[0]) / den, l = (qx * ey - qy * ex) / den;
      if (u < 0 || u > 1) continue;
      if (-l < lo) lo = -l;
      if (-l > hi) hi = -l;
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
    const V = { drawn, main, tilt, K, rootX, depth: new Map(), angles: {}, thick: new Map(), gens: [], ground: new Map(), swaps: [], off: new Map() };
    m.views = V;

    // as peças de cada vista (as formas das camadas view=), na ordem do arquivo
    const pieces = new Map(drawn.map((v) => [v, []]));
    for (const L of vl) for (const it of L.items) { const p = piece(it.el); if (p) pieces.get(L.view).push(p); }
    const piecesOf = (v) => pieces.get(v) || [];
    const big = new Map();
    const biggest = (v, b) => {
      const k = v + '|' + b;
      if (!big.has(k)) { let best = null; for (const p of piecesOf(v)) if (p.bone === b && (!best || p.area > best.area)) best = p; big.set(k, best); }
      return big.get(k);
    };
    const sides = drawn.includes('right') || drawn.includes('left');
    const diags = drawn.filter((v) => v.includes('_'));

    // ---------- o esqueleto em 3D: X para o lado, Y para baixo, Z para a frente ----------
    const P3 = new Map(), src = new Map();
    const read = new Set(); // a profundidade veio de uma peça (serve para medir o ângulo das diagonais)
    if (main === 'down') {
      for (const b of bones) {
        const R = biggest('right', b.name), Lf = biggest('left', b.name);
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
          const body = rootBone && biggest(main, rootBone.name), mine = biggest(main, b.name), list = piecesOf(main);
          if (body && mine && mine !== body) {
            const near = list.indexOf(mine) > list.indexOf(body);
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
        const f = biggest('down', b.name), d = biggest(v, b.name), R = biggest('right', b.name), Lf = biggest('left', b.name);
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
        const d = biggest(v, b.name);
        if (!d) continue;
        const phi = ang[v] * D2R, s = Math.sin(phi), c = Math.cos(phi);
        if (Math.abs(s) < 0.2) continue;
        const f = biggest('down', b.name), x = (f ? f.cx : b.pivot[0]) - rootX, z = (d.cx - rootX - x * c) / s;
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

    // ---------- para onde cada osso aponta (o bastão da ordem e o pé no chão) ----------
    const DIR = new Map();
    for (const b of bones) {
      const P = P3.get(b.name), kids = bones.filter((o) => o.parent === b.name);
      let v = null;
      if (kids.length === 1) { const Q = P3.get(kids[0].name); v = [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]]; }
      else { const pc = biggest(main, b.name); if (pc) v = main === 'down' ? [pc.cx - b.pivot[0], pc.cy - b.pivot[1], 0] : [0, pc.cy - b.pivot[1], pc.cx - b.pivot[0]]; }
      if (!v || Math.hypot(...v) < 2) v = [0, 10, 0];
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
    const sideView = drawn.includes('right') ? 'right' : drawn.includes('left') ? 'left' : null;
    const THK = new Map();
    for (const b of bones) {
      const P = P3.get(b.name), d = DIR.get(b.name);
      const f = main === 'down' ? biggest('down', b.name) : null, sd = sideView ? biggest(sideView, b.name) : null;
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
        const pc = biggest('up', b.name), X = P3.get(b.name)[0];
        if (!pc || Math.abs(X - rootX) < 6) continue;
        const want = 2 * rootX - X;
        if (Math.abs(pc.cx - X) < Math.abs(pc.cx - want)) warn(pc.el.line, `de costas, a esquerda e a direita trocam de lado: ${pc.name || 'esta peça'} (osso ${b.name}) está perto de x=${fmt(X)}, mas de costas o osso fica em x=${fmt(want)} (troque o bone= pelo do osso espelhado, ou mude a peça de lado)`);
      }
    }
    if (main === 'down' && sideView) {
      for (const b of bones) {
        const f = biggest('down', b.name), s = biggest(sideView, b.name);
        if (f && s && Math.abs(f.cy - s.cy) > 8) warn(b.line, `${b.name}: a peça está em y=${fmt(f.cy)} na frente e em y=${fmt(s.cy)} de lado (as vistas estão desalinhadas? a altura tem que bater)`);
      }
    }
    if (drawn.includes('right') && drawn.includes('left')) {
      for (const v of diags) if (!drawn.includes(MIRROR[v])) warn(L0(v), `com os dois lados desenhados, a diagonal ${MIRROR[v]} também precisa ser desenhada (layer … view=${MIRROR[v]}): espelhar a ${v} trocaria a mão do personagem só na diagonal, então as animações _${MIRROR[v]} não saem`);
    }

    // ---------- projeção numa vista ----------
    function proj(v) {
      const phi = ang[v] * D2R, c = Math.cos(phi), s = Math.sin(phi);
      const dep = (p) => -(p[0] - rootX) * s + p[2] * c;
      return {
        c, s, dep,
        pt: (p, depRest) => [rootX + (p[0] - rootX) * c + p[2] * s, p[1] + K * (dep(p) - depRest)],
        restXY: (P) => [rootX + (P[0] - rootX) * c + P[2] * s, P[1]],
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

    // ---------- o mundo de cada osso num quadro, em 3D ----------
    // p' = s·p + t (na etapa 1a, o osso só anda e estica: sx de lado a lado e de frente para trás, sy na altura)
    const apply = (w, p) => [w.s[0] * p[0] + w.t[0], w.s[1] * p[1] + w.t[1], w.s[2] * p[2] + w.t[2]];
    const valOf = (an, b, f) => { const s = G.segment(an.tracks.get(b.name), f, an.frames, an.loop); return s ? s.a.v.map((x, k) => x + (s.b.v[k] - x) * s.t) : REST.slice(); };
    const numOf = (an, key, f) => { const tr = an.ptracks.get(key), s = tr && G.segment(tr.keys, f, an.frames, an.loop); return s ? s.a.v + (s.b.v - s.a.v) * s.t : 0; };
    function world(an, f) {
      const out = new Map();
      const get = (b, depth) => {
        if (out.has(b.name)) return out.get(b.name);
        const v = valOf(an, b, f), dz = numOf(an, `${b.name}.z`, f), P = P3.get(b.name);
        const sc = [v[3], v[4], v[3]], mv = main === 'right' ? [-dz, v[1], v[0]] : [v[0], v[1], dz];
        let w = { s: sc, t: [0, 1, 2].map((i) => P[i] + mv[i] - sc[i] * P[i]) };
        const par = b.parent && m.bones.get(b.parent);
        if (par && depth < 64) { const q = get(par, depth + 1); w = { s: [0, 1, 2].map((i) => q.s[i] * w.s[i]), t: [0, 1, 2].map((i) => q.s[i] * w.t[i] + q.t[i]) }; }
        out.set(b.name, w);
        return w;
      };
      for (const b of bones) get(b, 0);
      return out;
    }
    // a pose 2D de uma vista: para cada osso, a key (em volta do pivot= de sempre) que leva as peças da vista do lugar
    // parado para onde o osso está agora
    function keysOf(v, Wf) {
      const pr = PR.get(v), xy = REST_XY.get(v), dp = REST_DEP.get(v), A = new Map(), out = new Map();
      const scr = (b) => {
        if (A.has(b.name)) return A.get(b.name);
        const w = Wf.get(b.name), cur = pr.pt(apply(w, P3.get(b.name)), dp.get(b.name)), rv = xy.get(b.name), S = [w.s[0], w.s[1]];
        const a = { S, rv, a: [cur[0] - S[0] * rv[0], cur[1] - S[1] * rv[1]] };
        A.set(b.name, a);
        return a;
      };
      for (const b of bones) {
        const me = scr(b), par = b.parent && m.bones.get(b.parent), p = par ? scr(par) : { S: [1, 1], a: [0, 0] };
        const Sp = p.S.map((x) => (Math.abs(x) < 1e-6 ? 1e-6 : x)), s = [me.S[0] / Sp[0], me.S[1] / Sp[1]], rv = me.rv;
        // em volta do lugar do osso na vista (rv), e depois em volta do pivot=
        const d = [0, 1].map((i) => (me.a[i] - p.a[i]) / Sp[i] - rv[i] + s[i] * rv[i] + (1 - s[i]) * (rv[i] - b.pivot[i]));
        out.set(b.name, [d[0], d[1], 0, s[0], s[1]]);
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
        out.push({ L, order });
      }
      return out;
    }

    // ---------- o pé no chão: o ponto mais baixo das peças da vista principal ----------
    // (a parte de baixo das peças de cada osso, que anda e estica com ele; um osso sem peça vale pela junta)
    const LOW = new Map();
    for (const b of bones) {
      let lo = -Infinity;
      for (const pc of piecesOf(main)) if (pc.bone === b.name) lo = Math.max(lo, pc.box[3]);
      LOW.set(b.name, lo > -Infinity ? lo : b.pivot[1]);
    }
    const lowest = (Wf) => {
      let lo = -Infinity;
      for (const b of bones) { const w = Wf && Wf.get(b.name), y = LOW.get(b.name); lo = Math.max(lo, w ? w.s[1] * y + w.t[1] : y); }
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
          if (!drawn.includes(d)) {
            const other = MIRROR[d] && drawn.includes(MIRROR[d]) ? ` (o Godot já espelha ${an.name.slice(0, -d.length)}${MIRROR[d]})` : '';
            warn(an.line, `nenhuma camada view=${d}: ${an.name} mostra só as camadas sem view=${other}`);
          } else if (d !== main) handWritten(an, d);
        }
        out.push(an);
        continue;
      }
      // os giros chegam na etapa 1b: por enquanto, os ossos das animações geradas só andam e esticam
      const turns = [...an.tracks.values()].some((tr) => tr.some((k) => Math.abs(k.v[2]) > 1e-9)) || [...an.ptracks.values()].some((tr) => tr.kind === 'bone' && (tr.prop === 'pitch' || tr.prop === 'yaw'));
      if (turns) warn(an.line, `${an.name}: o giro dos ossos (rot, pitch e yaw) ainda não vale nas animações geradas pelas vistas; por enquanto, os ossos só andam (dx, dy e z) e esticam (sx e sy)`);
      const N = an.frames, WF = [];
      for (let f = 0; f <= N; f++) WF.push(world(an, f));
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
        if (v !== main) gen.voff = V.off.get(v);
        for (const [k, tr] of an.ptracks) if (!(tr.kind === 'bone' && (tr.prop === 'z' || tr.prop === 'pitch' || tr.prop === 'yaw'))) gen.ptracks.set(k, tr);
        for (const b of bones) gen.tracks.set(b.name, []);
        for (let f = 0; f <= N; f++) for (const [b, v5] of keysOf(v, WF[f])) gen.tracks.get(b).push({ frame: f, v: v5, ease: 'linear' });
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
          const moved = new Set(), frames = new Set();
          per.forEach((o, f) => { for (const { L, order } of o) order.forEach((x, i) => { if (x !== i) { moved.add(L.items[x].el.name || `linha ${L.items[x].el.line}`); frames.add(f); } }); });
          V.swaps.push({ anim: name, frames: frames.size, total: N, pieces: [...moved] });
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
  }

  W.views = { build, VIEWS, ANG, MIRROR, dirOf };
})(window.Weasel = window.Weasel || {});
