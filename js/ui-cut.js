/* Weasel — mais caminhos (etapa 5b do plano da interface, docs/planos/interface-illustrator.md, seção 11.6).
   - Tesoura (C): um clique num stroke (ou line) corta ali, no lugar exato. Numa forma fechada, são dois cliques na
     borda, e ela se divide em duas numa reta entre eles.
   - Faca: o arraste corta as formas fechadas que atravessa (as escolhidas; sem escolha, as da camada). Os dois
     lados do corte ficam com a mesma curva.
   - Junção e Objeto › Caminho › Juntar (Ctrl+J): dois traços abertos viram um (pontas que se encostam viram um
     ponto; senão, uma reta liga as duas).
   - Borracha de caminho: apaga pedaços de stroke e line por onde passa, no lugar exato.
   - Suavizar: tira pontos da forma escolhida onde o arraste passa (a curva fica mais lisa ali; o resto, igual).
   - Construtor de formas (Shift+M): com duas formas ou mais escolhidas, o arraste junta as regiões por onde passa
     numa forma só; com Alt, apaga as regiões.
   Os traços cortados e juntados continuam com a curva de antes (os pedaços saem das próprias cúbicas); a Faca, o
   Suavizar e o Construtor usam a grade do js/pathops.js, como o Pathfinder. As linhas do código saem do
   js/ui-paths.js (W.paths.kit). */
(function (W) {
  'use strict';
  const A = W.app, PO = W.pathops, SM = W.simplify, S = W.scene, K = W.paths && W.paths.kit;
  if (!A || !PO || !SM || !S || !K) return;
  const st = A.st;
  const px = (n) => n / st.view.z; // n pixels da tela, no desenho
  const layerName = (l) => (A.layerOf(l) || { name: '' }).name;
  const nameOfText = (t) => K.nameOf(t) || '?';

  // ---------- quem pode ser cortado ----------
  // as linhas escolhidas e as da camada onde se desenha (fora as travadas e as escondidas)
  function candLines() {
    const sel = A.selected().filter((l) => A.selectable(l));
    return [...new Set([...sel, ...K.layerLines()])].sort((a, b) => a - b);
  }
  const segsBox = (segs, pad) => {
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const s of segs) for (let k = 0; k < 8; k += 2) { b.x0 = Math.min(b.x0, s[k]); b.x1 = Math.max(b.x1, s[k]); b.y0 = Math.min(b.y0, s[k + 1]); b.y1 = Math.max(b.y1, s[k + 1]); }
    b.x0 -= pad; b.y0 -= pad; b.x1 += pad; b.y1 += pad;
    return b;
  };
  const inBox = (b, p) => p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1;
  function geoOf(l) {
    const m = A.model(), rec = m && m.byLine.get(l), el = rec && rec.el;
    if (!el) return null;
    const segs = S.geometry(m, A.pose(), el).segs;
    return segs.length ? segs : null;
  }
  // o ponto da borda (ou do traço) mais perto de p, até 8 pixels: { line, cmd, i, t, x, y, d }
  function edgeAt(p, only) {
    const reach = px(8);
    let best = null;
    for (const l of candLines()) {
      const cmd = K.cmdOf(A.lineText(l));
      if (!(K.AREA.has(cmd) || K.OPEN.has(cmd)) || (only && !only.has(cmd))) continue;
      const segs = geoOf(l);
      if (!segs || !inBox(segsBox(segs, reach), p)) continue;
      const q = PO.nearestOn(segs, p[0], p[1]);
      if (q && q.d <= reach && (!best || q.d < best.d - 1e-9 || (Math.abs(q.d - best.d) <= 1e-9 && l > best.line))) best = Object.assign(q, { line: l, cmd });
    }
    return best;
  }
  // a posição perto (3 pixels) de um ponto da forma vira o próprio ponto
  function snapPos(segs, closed, h) {
    const s = segs[h.i], r = px(3);
    if (Math.hypot(h.x - s[0], h.y - s[1]) < r) return PO.normPos(segs, closed, { i: h.i, t: 0 });
    if (Math.hypot(h.x - s[6], h.y - s[7]) < r) return PO.normPos(segs, closed, { i: h.i, t: 1 });
    return PO.normPos(segs, closed, h);
  }
  const done = (pick) => { const all = pick.all && pick.all.length ? pick.all : pick; if (all.length) A.setSel(all, all[0]); };

  // ---------- Tesoura ----------
  let pend = null, hov = null;
  function cutOpenAt(it, h) {
    const segs = it.segs, n = segs.length, q = snapPos(segs, false, h);
    if ((q.i === 0 && q.t === 0) || (q.i === n - 1 && q.t === 1)) { A.hint(`Tesoura: aí já é a ponta de ${it.name}.`, 2400); return; }
    const a = PO.subPath(segs, false, it.tags, { i: 0, t: 0 }, q), b = PO.subPath(segs, false, it.tags, q, { i: n - 1, t: 1 });
    const Ns = [a, b].sort((x, y) => PO.nodesLen(y) - PO.nodesLen(x));
    const src = A.editor.value.split('\n'), lines = K.exactLines(src, it, Ns, new Set(), false);
    done(K.writeAll(new Map([[it.line, lines]]), new Set(), new Map(), 'tesoura' + Date.now()));
    A.hint(`Tesoura: ${it.name} virou dois traços (${it.name} e ${nameOfText(lines[1])}), cortado no lugar exato.${K.notes(src, [], [it])}`, 4200);
  }
  // uma forma fechada, dividida na reta entre as posições a e b da borda
  function cutChord(it, a, b) {
    const segs = it.segs, pa = snapPos(segs, true, a), pb = snapPos(segs, true, b);
    const P0 = PO.posAt(segs, pa), P1 = PO.posAt(segs, pb);
    if (Math.hypot(P0[0] - P1[0], P0[1] - P1[1]) < px(3)) { A.hint('Tesoura: o segundo clique precisa ser em outro ponto da borda.', 2600); return; }
    // a reta volta do fim ao começo (as alças de um terço: um canto, se do outro lado também for)
    const close = (N) => { const f = N[0], l = N[N.length - 1], v = [(f.x - l.x) / 3, (f.y - l.y) / 3]; f.tin = v; l.tan = v.slice(); return PO.growNodes(N, true, 3); };
    const Ns = [close(PO.subPath(segs, true, it.tags, pa, pb)), close(PO.subPath(segs, true, it.tags, pb, pa))]
      .sort((x, y) => Math.abs(PO.nodesArea(y)) - Math.abs(PO.nodesArea(x)));
    const src = A.editor.value.split('\n');
    let lines = K.exactLines(src, it, Ns, new Set(), true);
    // os furos (cut=) ficam com o pedaço que passa por eles
    if (it.holeInfo.length) lines = lines.map((t, k) => {
      const nb = PO.boxOf([Ns[k]]), cut = (K.attrOf(t, 'cut') || '').split(',').filter(Boolean);
      const keep = cut.filter((nm) => { const h = it.holeInfo.find((x) => x.name === nm); return !h || PO.meets(PO.boxOf([h.R]), nb); });
      return K.setAttr(t, 'cut', keep.length ? keep.join(',') : null);
    });
    done(K.writeAll(new Map([[it.line, lines]]), new Set(), new Map(), 'tesoura' + Date.now()));
    A.hint(`Tesoura: ${it.name} virou duas formas (${it.name} e ${nameOfText(lines[1])}), divididas numa reta.${K.notes(src, [], [it])}`, 4400);
  }
  const scissors = {
    handles: false,
    down(e) {
      if (!K.ready('A Tesoura')) return true;
      const p = A.toCanvas(e), h = edgeAt(p);
      if (!h) { pend = null; A.draw(); A.hint('Tesoura: clique no traço de um stroke (ou na borda de uma forma) para cortar ali.', 2800); return true; }
      const it = K.itemOf(A.model(), A.pose(), h.line, { open: true });
      if (it.why) { A.hint(`Tesoura: ${it.why}.`, 3400); return true; }
      if (it.open) { pend = null; cutOpenAt(it, h); return true; }
      if (pend && pend.line === h.line && pend.text === it.text) { const a = pend; pend = null; cutChord(it, a, h); return true; }
      pend = { line: h.line, i: h.i, t: h.t, x: h.x, y: h.y, text: it.text };
      A.hint(`Tesoura: agora clique em outro ponto da borda de ${it.name}. Ela se divide em duas, numa reta entre os dois cliques. Esc desiste.`, 4600);
      A.draw();
      return true;
    },
    move() {},
    up() {},
    hover(e) { const h = edgeAt(A.toCanvas(e)); hov = h; A.draw(); },
    cursor: () => (hov ? 'crosshair' : 'default'),
    overlay(ctx, z) {
      const dot = (x, y, sq) => {
        ctx.beginPath();
        if (sq) ctx.rect(x - 3.5 / z, y - 3.5 / z, 7 / z, 7 / z); else ctx.arc(x, y, 3.5 / z, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 1.5 / z;
        ctx.strokeStyle = '#2f8cff';
        ctx.stroke();
      };
      if (pend) {
        if (hov && hov.line === pend.line) {
          ctx.beginPath();
          ctx.moveTo(pend.x, pend.y);
          ctx.lineTo(hov.x, hov.y);
          ctx.setLineDash([5 / z, 4 / z]);
          ctx.lineWidth = 1.5 / z;
          ctx.strokeStyle = '#2f8cff';
          ctx.stroke();
          ctx.setLineDash([]);
        }
        dot(pend.x, pend.y, true);
      }
      if (hov) dot(hov.x, hov.y, false);
    },
  };

  // ---------- os arrastes (Faca, Borracha de caminho, Suavizar) ----------
  let trail = null, here = null;
  const TRAIL = { knife: 0, patherase: 5, smooth: 12 }; // o raio, em pixels da tela (a Faca é uma linha)
  function trailTool(id, finish, label) {
    return {
      handles: false,
      down(e) {
        if (!K.ready(label)) return true;
        trail = { tool: id, raw: [A.toCanvas(e)], alt: e.altKey };
        return true;
      },
      move(e) {
        if (!trail) return;
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        for (const ev of evs.length ? evs : [e]) {
          const p = A.toCanvas(ev), last = trail.raw[trail.raw.length - 1];
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) * st.view.z >= 1) trail.raw.push(p);
        }
        here = trail.raw[trail.raw.length - 1];
        A.draw();
      },
      up() {
        const F = trail;
        trail = null;
        A.draw();
        if (F && st.model) finish(F);
      },
      hover(e) { here = A.toCanvas(e); A.draw(); },
      cursor: () => 'crosshair',
      overlay(ctx, z) {
        const r = px(TRAIL[id]);
        if (trail && trail.tool === id && trail.raw.length) {
          ctx.beginPath();
          trail.raw.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          if (trail.raw.length === 1) ctx.lineTo(trail.raw[0][0] + 0.01, trail.raw[0][1]);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          if (id === 'knife') {
            ctx.lineWidth = 3 / z;
            ctx.strokeStyle = 'rgba(255,255,255,.9)';
            ctx.stroke();
            ctx.lineWidth = 1.2 / z;
            ctx.strokeStyle = '#d0263c';
            ctx.stroke();
          } else {
            ctx.lineWidth = r * 2;
            ctx.strokeStyle = id === 'smooth' ? 'rgba(47,140,255,.25)' : 'rgba(150,150,160,.45)';
            ctx.stroke();
          }
        }
        if (!here || !r) return;
        ctx.beginPath();
        ctx.arc(here[0], here[1], r, 0, Math.PI * 2);
        ctx.lineWidth = 2.4 / z;
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.stroke();
        ctx.lineWidth = 1 / z;
        ctx.strokeStyle = id === 'smooth' ? 'rgba(20,90,200,.9)' : 'rgba(200,40,60,.9)';
        ctx.stroke();
      },
    };
  }
  const trailLen = (raw) => { let l = 0; for (let i = 1; i < raw.length; i++) l += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]); return l; };
  // os alvos: as escolhidas (só as que valem), ou as da camada; ok(cmd) filtra
  function targets(ok) {
    const sel = A.selected().filter((l) => A.selectable(l));
    const pool = sel.length ? [...new Set(sel)].sort((a, b) => a - b) : K.layerLines();
    return { sel: sel.length > 0, lines: pool.filter((l) => ok(K.cmdOf(A.lineText(l)))) };
  }

  // a Faca
  function knifeFinish(F) {
    if (F.raw.length < 2 || trailLen(F.raw) * st.view.z < 6) { A.hint('Faca: arraste atravessando as formas que quer cortar.', 2600); return; }
    const kp = SM.freehand(F.raw, false, px(2));
    const tb = PO.boxOf([F.raw.map((p) => ({ x: p[0], y: p[1] }))], px(2));
    const T = targets((c) => K.AREA.has(c));
    const m = A.model(), pose = A.pose(), src = A.editor.value.split('\n'), used = new Set();
    const rep = new Map(), drop = new Set(), skip = [], changed = [];
    let nPieces = 0;
    for (const l of T.lines) {
      const segs = geoOf(l);
      if (!segs || !PO.meets(segsBox(segs, 0), tb)) continue;
      const it = K.itemOf(m, pose, l);
      if (it.why) { if (!it.minor) skip.push(it.why); continue; }
      const pcs = PO.knife([it], kp, { cell: K.cellNow(), tol: K.tolNow(), smooth: it.smooth })[0];
      if (!pcs) continue;
      const { lines, drop: dh } = K.piecesText(src, it, pcs, used);
      rep.set(l, lines);
      for (const d of dh) drop.add(d);
      changed.push(it);
      nPieces += pcs.length;
    }
    if (!changed.length) {
      A.hint(skip.length ? `Faca: não deu para cortar (${skip.join('; ')}).` : `Faca: o arraste precisa atravessar a forma de um lado ao outro${T.sel ? ' (vale para as escolhidas)' : ''}.`, 3400);
      return;
    }
    done(K.writeAll(rep, drop, new Map(), 'faca' + Date.now()));
    A.hint(`Faca: ${changed.length === 1 ? changed[0].name : `${changed.length} formas`} virou ${nPieces} pedaços (nome_1, nome_2…).${skip.length ? ' Fora: ' + skip.join('; ') + '.' : ''}${K.notes(src, [], changed)}`, 4600);
  }

  // a Borracha de caminho
  function patheraseFinish(F) {
    const r = px(TRAIL.patherase), inside = PO.near(SM.resample(F.raw, Math.max(K.cellNow(), r / 4)), r);
    const T = targets((c) => K.OPEN.has(c) || K.AREA.has(c));
    const m = A.model(), pose = A.pose(), src = A.editor.value.split('\n'), used = new Set();
    const tb = PO.boxOf([F.raw.map((p) => ({ x: p[0], y: p[1] }))], r);
    const rep = new Map(), drop = new Set(), skip = [], gone = [], changed = [];
    let closedHit = 0, nSplit = 0;
    for (const l of T.lines) {
      const segs = geoOf(l);
      if (!segs || !PO.meets(segsBox(segs, 0), tb)) continue;
      if (K.AREA.has(K.cmdOf(A.lineText(l)))) { closedHit++; continue; }
      const it = K.itemOf(m, pose, l, { open: true });
      if (it.why) { if (!it.minor) skip.push(it.why); continue; }
      const ok = K.openRuns(it, inside);
      if (!ok) continue;
      if (!ok.length) { drop.add(l); gone.push(it); continue; }
      rep.set(l, K.exactLines(src, it, ok, used, false));
      if (ok.length > 1) nSplit++;
      changed.push(it);
    }
    if (!changed.length && !gone.length) {
      A.hint(closedHit ? 'Borracha de caminho: ela corta stroke e line. Para tirar área de uma forma fechada, use a Borracha (Shift+E).' : skip.length ? `Borracha de caminho: não deu (${skip.join('; ')}).` : 'Borracha de caminho: passe por cima de um stroke (ou line).', 3600);
      return;
    }
    done(K.writeAll(rep, drop, new Map(), 'borracha-caminho' + Date.now()));
    const bits = [];
    if (changed.length) bits.push(`${changed.length} traço${changed.length > 1 ? 's' : ''} cortado${changed.length > 1 ? 's' : ''}${nSplit ? ` (${nSplit} virou pedaços: nome_1…)` : ''}`);
    if (gone.length) bits.push(`${gone.length} sumiu${gone.length > 1 ? 'ram' : ''}`);
    A.hint(`Borracha de caminho: ${bits.join(', ')}.${K.notes(src, gone, changed)}`, 4200);
  }

  // o Suavizar: a média ao longo da curva (três passadas de uma janela do tamanho do raio), só nos pontos por onde o
  // arraste passou, e entrando aos poucos na beira (sem degrau); as pontas de um traço aberto não andam
  function smoothRun(R0, inside, r, closed) {
    const n = R0.length, S = R0.map((p) => [p.x, p.y]), on = R0.map((p) => inside(p.x, p.y));
    let len = 0;
    for (let k = 1; k < n; k++) len += Math.hypot(S[k][0] - S[k - 1][0], S[k][1] - S[k - 1][1]);
    const w = Math.max(1, Math.round(r / Math.max(1e-6, len / Math.max(1, n - 1))));
    // quanto cada ponto anda: 0 fora, até 1 a w pontos da beira
    const edge = on.map((o) => (o ? 1e9 : 0));
    for (let round = 0; round < (closed ? 2 : 1); round++) {
      for (let k = 0; k < n; k++) { const a = closed ? (k - 1 + n) % n : k - 1; if (a >= 0) edge[k] = Math.min(edge[k], edge[a] + 1); }
      for (let k = n - 1; k >= 0; k--) { const b = closed ? (k + 1) % n : k + 1; if (b < n) edge[k] = Math.min(edge[k], edge[b] + 1); }
    }
    const f = edge.map((e, k) => (!closed && (k === 0 || k === n - 1) ? 0 : Math.min(1, e / w)));
    let cur = S;
    for (let it = 0; it < 3; it++) {
      cur = cur.map((p, k) => {
        if (!f[k]) return p;
        let sx = 0, sy = 0, c = 0;
        for (let d = -w; d <= w; d++) {
          let j = k + d;
          if (closed) j = ((j % n) + n) % n; else j = Math.max(0, Math.min(n - 1, j));
          sx += cur[j][0]; sy += cur[j][1]; c++;
        }
        return [p[0] + (sx / c - p[0]) * f[k], p[1] + (sy / c - p[1]) * f[k]];
      });
    }
    return cur;
  }
  // o Suavizar
  function smoothFinish(F) {
    const sel = A.selected().filter((l) => A.selectable(l));
    if (!sel.length) { A.hint('Suavizar: escolha antes a forma (shape) ou o traço (stroke) a suavizar.', 3200); return; }
    const r = px(TRAIL.smooth), inside = PO.near(SM.resample(F.raw, Math.max(K.cellNow(), r / 4)), r);
    const m = A.model(), pose = A.pose(), src = A.editor.value.split('\n'), rep = new Map(), skip = [];
    let before = 0, after = 0;
    for (const l of [...new Set(sel)].sort((a, b) => a - b)) {
      const cmd = K.cmdOf(A.lineText(l));
      if (cmd !== 'shape' && cmd !== 'stroke') { if (K.AREA.has(cmd) || cmd === 'line') skip.push(`${nameOfText(A.lineText(l))} é ${cmd}`); continue; }
      const it = K.itemOf(m, pose, l, { open: true });
      if (it.why) { if (!it.minor) skip.push(it.why); continue; }
      if (!it.tags) continue;
      const R0 = it.rings[0], n = it.tags.length, closed = !it.open;
      const hit = new Set();
      for (const p of R0) if (p.tag && inside(p.x, p.y) && (closed || (p.tag.i > 0 && p.tag.i < n - 1))) hit.add(p.tag);
      if (!hit.size) continue;
      const P = smoothRun(R0, inside, r, closed).map((q, k) => ({ x: q[0], y: q[1], tag: R0[k].tag && !hit.has(R0[k].tag) ? R0[k].tag : null, src: R0 }));
      const Fp = PO.fitPath(P, { tol: px(1.2), smooth: it.smooth, cell: K.stepNow(), closed });
      const pts = closed ? K.rot0(Fp, it.line) : Fp;
      K.pinNew(pts, closed);
      const nt = K.withPoints(it.text, pts.map((p) => K.tokenOf(p, it.fr)));
      if (nt === it.text) continue;
      rep.set(l, [nt]);
      before += n;
      after += pts.length;
    }
    if (!rep.size) { A.hint(skip.length ? `Suavizar: vale para shape e stroke (${skip.join('; ')}).` : 'Suavizar: aqui já está liso (passe o arraste por cima dos pontos da forma escolhida).', 3200); return; }
    done(K.writeAll(rep, new Set(), new Map(), 'suavizar' + Date.now()));
    A.hint(`Suavizar: a curva ficou mais lisa onde o arraste passou${after < before ? ` (de ${before} para ${after} pontos)` : ''}; o resto ficou igual. Passe de novo para alisar mais.`, 3200);
  }

  // ---------- Junção e Juntar (Ctrl+J) ----------
  // a e b: itens abertos; ends: { ea, eb } (0: a primeira ponta, 1: a última), ou null (as pontas mais perto)
  function joinItems(a, b, ends) {
    if (layerName(a.line) !== layerName(b.line)) { A.hint(`Juntar: os dois traços precisam estar na mesma camada (estão em ${layerName(a.line)} e ${layerName(b.line)}).`, 3600); return; }
    const Na = PO.nodesOf(a.segs, false, a.tags), Nb = PO.nodesOf(b.segs, false, b.tags);
    const endOf = (N, e) => (e ? N[N.length - 1] : N[0]);
    let ea, eb;
    if (ends) ({ ea, eb } = ends);
    else {
      let bd = Infinity;
      for (const x of [1, 0]) for (const y of [0, 1]) { const p = endOf(Na, x), q = endOf(Nb, y), d = Math.hypot(p.x - q.x, p.y - q.y); if (d < bd - 1e-9) { bd = d; ea = x; eb = y; } }
    }
    // a primeira termina na junção, a segunda começa nela
    const A1 = ea ? Na : PO.reverseNodes(Na), B1 = eb ? PO.reverseNodes(Nb) : Nb;
    // fica a linha de cima (como no Pathfinder); um stroke ganha de uma line (a curva não cabe na line); um pedaço
    // (nome_1) que volta para o nome de origem fica com o nome de origem
    let tgt = b.line > a.line ? b : a;
    if (a.cmd !== b.cmd) tgt = a.cmd === 'stroke' ? a : b;
    else if (new RegExp(`^${a.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d+$`).test(b.name)) tgt = a;
    else if (new RegExp(`^${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d+$`).test(a.name)) tgt = b;
    const other = tgt === a ? b : a;
    const pa = A1[A1.length - 1], pb = B1[0], gap = Math.hypot(pa.x - pb.x, pa.y - pb.y), meet = gap <= px(2);
    let N;
    if (meet) {
      const J = Object.assign({}, tgt === a ? pa : pb, { tin: pa.tin, tan: pb.tan });
      N = A1.slice(0, -1).concat([J], B1.slice(1));
    } else {
      const v = [(pb.x - pa.x) / 3, (pb.y - pa.y) / 3];
      N = A1.slice(0, -1).concat([Object.assign({}, pa, { tan: v }), Object.assign({}, pb, { tin: v.slice() })], B1.slice(1));
    }
    // a de cima continua no sentido dela (o taper= e o começo do traço não mudam)
    if (tgt === a ? !ea : !!eb) N = PO.reverseNodes(N);
    const src = A.editor.value.split('\n');
    const out = K.withPoints(tgt.text, K.exactToks(tgt, N, false));
    done(K.writeAll(new Map([[tgt.line, [out]]]), new Set([other.line]), new Map(), 'juntar' + Date.now()));
    A.hint(`Juntar: ${other.name} entrou em ${tgt.name} (${meet ? 'as pontas viraram um ponto' : 'uma reta liga as pontas'}).${K.notes(src, [other], [tgt])}`, 4200);
  }
  function joinSel() {
    if (!K.ready('Juntar')) return;
    const m = A.model(), pose = A.pose(), its = [], skip = [];
    for (const l of [...new Set(A.selected())].sort((x, y) => x - y)) {
      const it = K.itemOf(m, pose, l, { open: true });
      if (it.why) { if (!it.minor) skip.push(it.why); continue; }
      if (it.open) its.push(it); else skip.push(`${it.name} é fechada (${it.cmd})`);
    }
    if (its.length !== 2) { A.hint(`Juntar: escolha dois traços abertos (stroke ou line), com Shift+clique.${skip.length ? ' Fora: ' + skip.join('; ') + '.' : ''}`, 3800); return; }
    joinItems(its[0], its[1], null);
  }
  // a ponta solta de um traço aberto mais perto de p (10 pixels): { line, e, x, y }
  function endAt(p, not) {
    const reach = px(10);
    let best = null;
    for (const l of candLines()) {
      if (!K.OPEN.has(K.cmdOf(A.lineText(l)))) continue;
      const segs = geoOf(l);
      if (!segs) continue;
      const s0 = segs[0], s1 = segs[segs.length - 1];
      [[0, s0[0], s0[1]], [1, s1[6], s1[7]]].forEach(([e, x, y]) => {
        if (not && not.line === l && not.e === e) return;
        const d = Math.hypot(x - p[0], y - p[1]);
        if (d <= reach && (!best || d < best.d)) best = { line: l, e, x, y, d };
      });
    }
    return best;
  }
  let jd = null, jhov = null;
  const joinTool = {
    handles: false,
    down(e) {
      if (!K.ready('A Junção')) return true;
      const p = A.toCanvas(e), a = endAt(p);
      if (!a) { A.hint('Junção: aperte numa ponta de um stroke (ou line) e arraste até a ponta de outro.', 3000); return true; }
      jd = { a, p, b: null };
      return true;
    },
    move(e) {
      if (!jd) return;
      jd.p = A.toCanvas(e);
      jd.b = endAt(jd.p, jd.a);
      A.draw();
    },
    up() {
      const d = jd;
      jd = null;
      A.draw();
      if (!d) return;
      if (!d.b) { A.hint('Junção: solte em cima da ponta de outro traço.', 2600); return; }
      if (d.b.line === d.a.line) { A.hint('Junção: um stroke não fecha em si mesmo (para uma forma fechada, use um shape).', 3400); return; }
      const m = A.model(), pose = A.pose(), a = K.itemOf(m, pose, d.a.line, { open: true }), b = K.itemOf(m, pose, d.b.line, { open: true });
      if (a.why || b.why) { A.hint(`Junção: ${(a.why || b.why)}.`, 3200); return; }
      joinItems(a, b, { ea: d.a.e, eb: d.b.e });
    },
    hover(e) { jhov = endAt(A.toCanvas(e)); A.draw(); },
    cursor: () => (jhov ? 'crosshair' : 'default'),
    overlay(ctx, z) {
      const ring = (q, on) => {
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4.5 / z, 0, Math.PI * 2);
        ctx.fillStyle = on ? '#2f8cff' : '#fff';
        ctx.fill();
        ctx.lineWidth = 1.5 / z;
        ctx.strokeStyle = '#2f8cff';
        ctx.stroke();
      };
      if (jd) {
        ctx.beginPath();
        ctx.moveTo(jd.a.x, jd.a.y);
        ctx.lineTo(jd.b ? jd.b.x : jd.p[0], jd.b ? jd.b.y : jd.p[1]);
        ctx.setLineDash([5 / z, 4 / z]);
        ctx.lineWidth = 1.5 / z;
        ctx.strokeStyle = '#2f8cff';
        ctx.stroke();
        ctx.setLineDash([]);
        ring(jd.a, true);
        if (jd.b) ring(jd.b, true);
      } else if (jhov) ring(jhov, false);
    },
  };

  // ---------- Construtor de formas ----------
  let B = null, bd = null, bhov = -1;
  // as regiões das formas escolhidas (guardadas enquanto o código, a escolha e o zoom não mudam)
  function builderData() {
    const key = A.editor.value.length + '|' + A.editor.value + '|' + A.selected().join(',') + '|' + st.view.z.toFixed(4);
    if (B && B.key === key) return B;
    const m = A.model(), pose = A.pose(), items = [], skip = [];
    for (const l of [...new Set(A.selected())].sort((x, y) => x - y)) {
      if (!A.selectable(l)) continue;
      const it = K.itemOf(m, pose, l);
      if (it.why) { if (!it.minor) skip.push(it.why); continue; }
      items.push(it);
    }
    B = { key };
    if (items.length < 2) B.why = `Construtor de formas: escolha duas formas fechadas ou mais (shape, rect, ellipse) que se cruzam.${skip.length ? ' Fora: ' + skip.join('; ') + '.' : ''}`;
    else if (new Set(items.map((it) => layerName(it.line))).size > 1) B.why = 'Construtor de formas: as formas precisam estar na mesma camada.';
    else if (items.length > 31) B.why = 'Construtor de formas: são formas demais de uma vez (até 31).';
    else Object.assign(B, { items, R: PO.regions(items, { cell: K.cellNow() }), loops: new Map() });
    return B;
  }
  function loopsOf(D, ids) {
    const k = [...ids].sort((a, b) => a - b).join(',');
    if (!D.loops.has(k)) { if (D.loops.size > 40) D.loops.clear(); D.loops.set(k, PO.regionLoops(D.R, [...ids])); }
    return D.loops.get(k);
  }
  function builderApply(D, ids, alt) {
    const t0 = performance.now(), items = D.items;
    const res = PO.regionsApply(D.R, [...ids], !alt, { tol: K.tolNow(), smooth: 1 });
    let host = null;
    if (!alt) {
      const sig = D.R.regs[ids[0]].sig;
      for (let k = items.length - 1; k >= 0 && !host; k--) if (Math.floor(sig / 2 ** k) % 2) host = items[k];
      if (!res.merged || !res.merged.length) { A.hint('Construtor de formas: essas regiões são pequenas demais. Nada mudou.', 2800); return; }
    }
    const src = A.editor.value.split('\n'), used = new Set(), rep = new Map(), drop = new Set(), gone = [], changed = [];
    items.forEach((it, k) => {
      const rem = res.items[k];
      const put = (pcs) => { const { lines, drop: dh } = K.piecesText(src, it, pcs, used); rep.set(it.line, lines); for (const d of dh) drop.add(d); changed.push(it); };
      if (it === host) { put([...res.merged, ...(rem || [])]); return; }
      if (rem === null) return;
      if (!rem.length) { drop.add(it.line); gone.push(it); return; }
      put(rem);
    });
    done(K.writeAll(rep, drop, new Map(), 'construtor' + Date.now()));
    const n = ids.length, rg = `${n} ${n > 1 ? 'regiões' : 'região'}`;
    A.hint(alt ? `Construtor de formas: ${rg} apagada${n > 1 ? 's' : ''}.${K.notes(src, gone, changed)}` : `Construtor de formas: ${rg} ${n > 1 ? 'viraram' : 'virou'} ${host.name}${n > 1 ? '' : ' (separada das outras)'}.${K.notes(src, gone, changed)}`, 4600);
    const ms = Math.round(performance.now() - t0);
    if (ms > 1500) console.info(`Weasel: o Construtor de formas levou ${ms} ms`);
  }
  const builder = {
    handles: false,
    down(e) {
      if (!K.ready('O Construtor de formas')) return true;
      const D = builderData();
      if (D.why) { A.hint(D.why, 3800); return true; }
      const p = A.toCanvas(e), id = PO.regionAt(D.R, p[0], p[1]);
      bd = { D, ids: id >= 0 ? [id] : [], last: p, alt: e.altKey };
      A.draw();
      return true;
    },
    move(e) {
      if (!bd) return;
      const p = A.toCanvas(e), q = bd.last, step = Math.max(bd.D.R.g.c, px(1)), n = Math.max(1, Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / step));
      for (let k = 1; k <= n; k++) {
        const id = PO.regionAt(bd.D.R, q[0] + ((p[0] - q[0]) * k) / n, q[1] + ((p[1] - q[1]) * k) / n);
        if (id >= 0 && !bd.ids.includes(id)) bd.ids.push(id);
      }
      bd.last = p;
      bd.alt = bd.alt || e.altKey;
      A.draw();
    },
    up(e) {
      const d = bd;
      bd = null;
      A.draw();
      if (!d) return;
      if (!d.ids.length) { A.hint('Construtor de formas: arraste por cima das regiões que quer juntar (com Alt, apagar).', 3000); return; }
      builderApply(d.D, d.ids, d.alt || (e && e.altKey));
    },
    hover(e) {
      const D = A.selected().length >= 2 && !A.isFilm() && st.model ? builderData() : null;
      const p = A.toCanvas(e), id = D && !D.why ? PO.regionAt(D.R, p[0], p[1]) : -1;
      if (id !== bhov) { bhov = id; A.draw(); }
    },
    cursor: () => (bhov >= 0 ? 'crosshair' : 'default'),
    overlay(ctx, z) {
      const D = bd ? bd.D : B && !B.why && B.key ? B : null;
      if (!D || !D.R) return;
      const ids = bd ? bd.ids : bhov >= 0 ? [bhov] : [];
      if (!ids.length) return;
      const alt = bd ? bd.alt : false;
      ctx.beginPath();
      for (const L of loopsOf(D, ids)) L.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fillStyle = alt ? 'rgba(208,38,60,.28)' : 'rgba(47,140,255,.28)';
      ctx.fill('evenodd');
      ctx.setLineDash(alt ? [4 / z, 3 / z] : []);
      ctx.lineWidth = 1.5 / z;
      ctx.strokeStyle = alt ? '#d0263c' : '#2f8cff';
      ctx.stroke();
      ctx.setLineDash([]);
    },
  };

  A.addTool('scissors', scissors);
  A.addTool('knife', trailTool('knife', knifeFinish, 'A Faca'));
  A.addTool('patherase', trailTool('patherase', patheraseFinish, 'A Borracha de caminho'));
  A.addTool('smooth', trailTool('smooth', smoothFinish, 'O Suavizar'));
  A.addTool('join', joinTool);
  A.addTool('builder', builder);

  // Esc: desiste do arraste (ou do primeiro clique da Tesoura); Ctrl+J: Juntar
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && t.closest && t.closest('textarea, input, select, dialog, [contenteditable]')) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'j') {
      if (A.isFilm()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      joinSel();
      return;
    }
    if (e.key !== 'Escape' || !(trail || pend || bd || jd)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    trail = null;
    pend = null;
    bd = null;
    jd = null;
    A.draw();
    A.hint('Desisti: nada mudou.', 1600);
  }, true);
  A.on('tool', () => { trail = null; pend = null; bd = null; jd = null; hov = null; jhov = null; bhov = -1; here = null; });

  W.cut = { join: joinSel };
})(window.Weasel = window.Weasel || {});
