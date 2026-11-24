/* Weasel — a tela Comparar vistas (etapa D, parte 2, do plano docs/planos/proposta-melhorias-weasel-vistas.md, item 2).
   Num arquivo com camadas view= (três vistas), Exibir › Comparar vistas troca o desenho pela vista principal e uma
   outra (o menu da barrinha) lado a lado, na mesma escala, e, se quiser, a outra por cima da principal, meio
   transparente (as costas, espelhadas). É a folha da linha de comando --compare (compareCanvas, js/export.js), com as
   mesmas contas (V.compare, js/views.js) e as mesmas cores, mas para mexer:
   - Parada (o player na pose parada): uma linha tracejada na altura de cada junta da principal, mais o alto e o chão
     das peças. Na outra vista, a bolinha da junta (cheia: a desenhada, side=x,y ou back=x,y; vazia: a pista, onde ela
     cairia pelas peças) com o quanto ela sai da linha. Arrastar a bolinha grava side=x,y (de lado) ou back=x,y (de
     costas); o duplo clique numa vazia grava a pista, e numa cheia apaga a junta desenhada.
   - Com uma animação no player: cada vista no quadro da animação dela (walk_down, walk_right…), e a bolinha de cada
     junta diz a fresta: a distância entre onde a peça do pai e a do filho levam a junta (a mesma conta do protótipo
     da etapa C).
   Clicar numa peça escolhe todas as formas daquele osso naquela vista: as setas movem, como no desenho. Clicar numa
   bolinha ou num nome da lista leva o código ao osso. */
(function (W) {
  'use strict';
  const A = W.app, S = W.scene, X = W.exporter;
  if (!A || !S || !X || !X.cmp) return;
  const st = A.st, C = X.cmp;
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const TOP = 50, GAP = 16, MG = 12; // a barrinha de cima; o espaço entre os painéis; a folga em volta das peças (px do arquivo)
  const ap = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
  const r1 = (v, whole) => String(whole ? Math.round(v) : Math.round(v * 10) / 10);
  const fmt = (v) => String(Math.round(v * 2) / 2).replace('.', ',');

  // ---------- a tela ----------
  const root = document.createElement('div');
  root.className = 'cmp';
  root.hidden = true;
  root.innerHTML = `<div class="cmp-space"><canvas class="cmp-cv"></canvas><div class="cmp-info" hidden></div></div>
    <div class="v3-bar cmp-bar" role="toolbar" aria-label="Comparar vistas">
      <label title="A vista que fica ao lado da principal">Comparar com <select class="cmp-view"></select></label>
      <label title="Um terceiro painel: a outra vista por cima da principal, meio transparente (as costas, espelhadas)"><input type="checkbox" class="cmp-over" checked> Sobrepor</label>
      <input type="range" class="cmp-alpha" min="10" max="90" step="1" value="45" title="O quanto a outra vista aparece por cima da principal" aria-label="Transparência da sobreposição">
      <button type="button" class="cmp-rest" title="Volta o player para a pose parada: as linhas, as juntas desenhadas e as pistas">Parado</button>
      <button type="button" class="ic v3-close cmp-close" title="Fechar a Comparar vistas" aria-label="Fechar">✕</button>
    </div>
    <div class="cmp-list"></div>`;
  stage.insertBefore(root, $('view').nextSibling);
  const space = root.querySelector('.cmp-space'), cv = root.querySelector('.cmp-cv'), list = root.querySelector('.cmp-list'), info = root.querySelector('.cmp-info');
  const viewSel = root.querySelector('.cmp-view'), overIn = root.querySelector('.cmp-over'), alphaIn = root.querySelector('.cmp-alpha');

  // ---------- o estado ----------
  // cam: o zoom (zf, sobre o que cabe) e onde a folha começa (ox, oy, a partir da margem dos nomes); fitted: ainda
  // no ajuste (a folha se ajeita quando a tela muda de tamanho)
  const cam = { zf: 1, ox: 0, oy: 0, fitted: true };
  let open = false, want = '', D = null, dots = [], drag = null, hover = null, chosen = null, timer = 0, busyUntil = 0, artKey = '';
  const arts = new Map(); // a vista (e o painel) → { key, cv }

  const hasViews = () => { if (A.isFilm() || A.defPreview()) return false; const m = st.model; return !!(m && m.views && m.views.p3); };
  function viewName(v, V) {
    const both = V.drawn.includes('right') && V.drawn.includes('left');
    return { down: 'de frente', up: 'de costas', right: both || V.main === 'right' ? 'direita' : 'de lado', left: 'esquerda', down_right: '3/4', down_left: '3/4 esquerda', up_right: '3/4 de costas', up_left: '3/4 de costas, esquerda' }[v] || v;
  }
  const lineOf = (m, el) => { const i = el.use !== undefined ? el.use : el.line; return m.lineMap ? m.lineMap[i] : i; };
  const theme = () => {
    const cs = getComputedStyle(stage), g = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    return { bg: g('--bg', '#f3f2ee'), text: g('--text', '#222'), dim: g('--dim', '#777'), line: g('--line', '#ccc'), accent: g('--accent', '#ff8a1f'), mono: g('--mono', 'monospace') };
  };

  // ---------- as contas ----------
  // A animação de cada vista no quadro do player: walk (ou walk_right) → walk_down, walk_right…; null: a pose parada.
  // Uma vista sem a animação fica parada.
  function animsNow(m) {
    const an = st.anim ? m.animMap.get(st.anim) : null;
    if (!an) return null;
    const base = an.viewOf || (an.aliases && an.aliases[0]) || null, names = new Map();
    for (const v of m.views.drawn) names.set(v, base && m.animMap.has(`${base}_${v}`) ? `${base}_${v}` : an.view === v ? an.name : null);
    return { an, base: base || an.name, names };
  }
  // tudo o que a tela mostra, a partir do modelo, do player e da barrinha (sem o zoom)
  function compute() {
    const m = st.model, V = m.views, main = V.main, others = V.drawn.filter((v) => v !== main);
    const other = others.includes(want) ? want : others.includes('right') ? 'right' : others[0];
    const an = animsNow(m), mode = an ? 'anim' : 'rest';
    const poseOf = (v) => {
      const n = an && an.names.get(v);
      return n ? { pose: S.makePose(m, n, st.frame), name: n } : { pose: V.restPose(v), name: '' };
    };
    const show = [main, other].filter(Boolean), poses = new Map(show.map((v) => [v, poseOf(v)]));
    const cmp = new Map(V.drawn.map((v) => [v, V.compare(v)]));
    // o recorte: as peças de todas as vistas (a escala não muda ao trocar de vista); animando, com folga para os braços
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const v of V.drawn) for (const b of m.bones.values()) { const bx = V.boxOf(v, b.name); if (bx) { x0 = Math.min(x0, bx[0]); y0 = Math.min(y0, bx[1]); x1 = Math.max(x1, bx[2]); y1 = Math.max(y1, bx[3]); } }
    if (x0 === Infinity) { x0 = 0; y0 = 0; x1 = m.canvas.w; y1 = m.canvas.h; }
    const pad = MG + (mode === 'anim' ? 0.12 * (y1 - y0) : 0);
    const rect = { x: Math.floor(x0 - pad), y: Math.floor(y0 - pad) };
    rect.w = Math.ceil(x1 + pad) - rect.x;
    rect.h = Math.ceil(y1 + pad) - rect.y;
    // as linhas: a altura de cada junta da principal (juntas a menos de 1 px, uma linha só), o alto e o chão
    const lines = [];
    const addLine = (y, name, near) => { const l = lines.find((q) => Math.abs(q.y - y) < near); if (l) l.names.push(name); else lines.push({ y, names: [name] }); };
    for (const b of m.bones.values()) if (V.boxOf(main, b.name)) addLine(b.pivot[1], b.name, 1);
    const ends = (v) => {
      let t = Infinity, bt = -Infinity, l = Infinity, r = -Infinity;
      for (const b of m.bones.values()) { const bx = V.boxOf(v, b.name); if (bx) { t = Math.min(t, bx[1]); bt = Math.max(bt, bx[3]); l = Math.min(l, bx[0]); r = Math.max(r, bx[2]); } }
      return t === Infinity ? null : { t, b: bt, l, r };
    };
    const mE = ends(main), edges = new Map();
    if (mE) {
      addLine(mE.t, 'alto', 2);
      addLine(mE.b, 'chão', 2);
      for (const v of others) { const e = ends(v); if (e) edges.set(v, [{ bone: 'alto', edge: true, drawn: true, dy: e.t - mE.t, dx: 0, y: e.t, l: e.l, r: e.r }, { bone: 'chão', edge: true, drawn: true, dy: e.b - mE.b, dx: 0, y: e.b, l: e.l, r: e.r }]); }
    }
    lines.sort((a, b) => a.y - b.y);
    // animando: a fresta de cada junta em cada vista mostrada (a junta parada da vista, levada pelo pai e pelo filho)
    const gaps = new Map();
    if (mode === 'anim') {
      for (const v of show) {
        const P = poses.get(v).pose, out = [];
        for (const r of cmp.get(v)) {
          const b = m.bones.get(r.bone), Mc = P.bones && P.bones.get(r.bone);
          if (!b || !Mc || !V.boxOf(v, r.bone)) continue;
          const q = ap(Mc, r.at), Mp = b.parent ? P.bones.get(b.parent) : null, a = Mp ? ap(Mp, r.at) : null;
          out.push({ bone: r.bone, q, gap: a ? Math.hypot(a[0] - q[0], a[1] - q[1]) : null, parent: b.parent || null });
        }
        gaps.set(v, out);
      }
    }
    // as formas de cada vista, para o clique numa peça e o contorno da escolha
    const shapes = new Map(V.drawn.map((v) => [v, []])), byLine = new Map();
    for (const L of m.layers) {
      if (!L.view || !shapes.has(L.view)) continue;
      for (const it of L.items) {
        const line = lineOf(m, it.el), rec = { el: it.el, part: it.part, view: L.view, layer: L, line, bone: it.el.bone || null };
        shapes.get(L.view).push(rec);
        if (line >= 0) { if (!byLine.has(line)) byLine.set(line, []); byLine.get(line).push(rec); }
      }
    }
    return { m, V, main, other, others, mode, an, poses, cmp, rect, lines, edges, gaps, shapes, byLine, show };
  }

  // ---------- o lugar de cada coisa na tela ----------
  // os painéis (px da tela, dentro da área): a principal, a outra e, se pedir, a outra por cima da principal
  function layout() {
    const Wd = space.clientWidth, Ht = space.clientHeight, th = theme();
    const li = (stage.classList.contains('lp-open') ? 266 : 0) + (stage.classList.contains('ruled') ? 20 : 0);
    const ctx = cv.getContext('2d');
    ctx.font = `11px ${th.mono}`;
    const LEFT = Math.min(200, Math.max(70, ...D.lines.map((l) => Math.ceil(ctx.measureText(l.names.join(' · ')).width) + 16)));
    const kinds = [{ v: D.main, kind: 'main' }];
    if (D.other) kinds.push({ v: D.other, kind: 'other' });
    if (D.other && overIn.checked) kinds.push({ v: D.other, kind: 'over' });
    // embaixo, o lugar da caixa que explica a bolinha debaixo do mouse
    const n = kinds.length, availW = Wd - li - LEFT - GAP * (n + 1), availH = Ht - TOP - 20 - 34;
    const zFit = Math.max(0.05, Math.min(8, availW / (n * D.rect.w), availH / D.rect.h));
    if (cam.fitted) {
      const PW = D.rect.w * zFit, PH = D.rect.h * zFit;
      cam.zf = 1;
      cam.ox = Math.max(0, (availW - n * PW - (n - 1) * GAP) / 2);
      cam.oy = Math.max(0, (availH - PH) / 2);
    }
    const Z = zFit * cam.zf, PW = D.rect.w * Z, PH = D.rect.h * Z, x0 = li + LEFT + GAP + cam.ox, y0 = TOP + 20 + cam.oy;
    const panels = kinds.map((k, i) => Object.assign(k, { x: x0 + i * (PW + GAP), y: y0, w: PW, h: PH }));
    return { Wd, Ht, li, LEFT, Z, zFit, panels, x0, y0, th };
  }
  // de um ponto do arquivo para a tela, num painel (e de volta)
  const toScr = (Lo, p, q) => [p.x + (q[0] - D.rect.x) * Lo.Z, p.y + (q[1] - D.rect.y) * Lo.Z];
  const toFile = (Lo, p, s) => [D.rect.x + (s[0] - p.x) / Lo.Z, D.rect.y + (s[1] - p.y) / Lo.Z];

  // ---------- pintar ----------
  // A pintura de uma vista no quadro, no tamanho da tela (guardada: pintar o soldado custa; o mouse só repinta por cima)
  function artOf(v, Lo) {
    const dpr = window.devicePixelRatio || 1, P = D.poses.get(v), key = `${v}|${P.name}|${P.name ? st.frame : ''}|${Lo.Z.toFixed(4)}|${dpr}`;
    const a = arts.get(v);
    if (a && a.m === D.m && a.key === key) return a.cv;
    let k = Lo.Z * dpr, w = Math.ceil(D.rect.w * k), h = Math.ceil(D.rect.h * k);
    const lim = Math.min(1, 4096 / w, 4096 / h, Math.sqrt(16e6 / (w * h)));
    if (lim < 1) { k *= lim; w = Math.ceil(D.rect.w * k); h = Math.ceil(D.rect.h * k); }
    const c = (a && a.cv) || document.createElement('canvas');
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    const x = c.getContext('2d');
    x.setTransform(k, 0, 0, k, -D.rect.x * k, -D.rect.y * k);
    if (D.m.canvas.bg) S.fillBg(x, D.m, P.pose, D.rect);
    try { S.drawScene(x, D.m, P.pose, { background: false, glows: false }); } catch (e) { /* um desenho quebrado no meio da digitação: fica o que deu */ }
    arts.set(v, { m: D.m, key, cv: c });
    return c;
  }
  function render() {
    if (!open || !D) return;
    const dpr = window.devicePixelRatio || 1, Wd = space.clientWidth, Ht = space.clientHeight;
    if (cv.width !== Math.round(Wd * dpr) || cv.height !== Math.round(Ht * dpr)) { cv.width = Math.round(Wd * dpr); cv.height = Math.round(Ht * dpr); }
    const Lo = layout(), th = Lo.th, g = cv.getContext('2d');
    D.Lo = Lo;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, Wd, Ht);
    const small = `11px ${th.mono}`, bold = `bold 12px ${th.mono}`;
    dots = [];
    const sel = new Set(A.selected());
    // os painéis: o papel, a pintura e o nome
    for (const p of Lo.panels) {
      g.save();
      g.fillStyle = '#ffffff';
      g.fillRect(p.x, p.y, p.w, p.h);
      g.beginPath();
      g.rect(p.x, p.y, p.w, p.h);
      g.clip();
      if (p.kind === 'over') {
        g.drawImage(artOf(D.main, Lo), p.x, p.y, p.w, p.h);
        g.globalAlpha = (+alphaIn.value || 45) / 100;
        const img = artOf(D.other, Lo);
        if (D.other === 'up') { g.translate(p.x + 2 * (D.V.rootX - D.rect.x) * Lo.Z, p.y); g.scale(-1, 1); g.drawImage(img, 0, 0, p.w, p.h); } else g.drawImage(img, p.x, p.y, p.w, p.h);
      } else {
        g.drawImage(artOf(p.v, Lo), p.x, p.y, p.w, p.h);
        // o contorno das formas escolhidas (as que esta vista pinta)
        if (sel.size) outline(g, Lo, p, sel, th);
      }
      g.restore();
      g.strokeStyle = th.line;
      g.lineWidth = 1;
      g.strokeRect(p.x - 0.5, p.y - 0.5, p.w + 1, p.h + 1);
      g.fillStyle = th.text;
      g.font = bold;
      g.textBaseline = 'alphabetic';
      // o nome do painel: do mais comprido ao mais curto, o primeiro que cabe
      const an = p.kind !== 'over' && D.poses.get(p.v).name, nm = viewName(p.v, D.V), tail = an ? ` · ${an}` : D.mode === 'anim' ? ' · parada' : '';
      const titles = p.kind === 'over' ? [`${viewName(D.other, D.V)} sobre ${viewName(D.main, D.V)}${D.other === 'up' ? ' (espelhada)' : ''}`, `sobre ${viewName(D.main, D.V)}`, 'sobre']
        : p.kind === 'main' ? [`${nm} · ${p.v} (a principal)${tail}`, `${nm} (principal)${tail}`, `${nm}${tail}`, nm] : [`${nm} · ${p.v}${tail}`, `${nm}${tail}`, nm];
      let title = titles.find((t) => g.measureText(t).width <= p.w + GAP - 4) || titles[titles.length - 1];
      while (title.length > 1 && g.measureText(title).width > p.w + GAP - 4) title = title.slice(0, -2) + '…';
      g.fillText(title, p.x, p.y - 7);
    }
    // as linhas, de ponta a ponta, e os nomes na margem
    const last = Lo.panels[Lo.panels.length - 1], xEnd = last.x + last.w + 6;
    g.save();
    g.setLineDash([5, 4]);
    g.strokeStyle = C.colors.line;
    g.globalAlpha = D.mode === 'anim' ? 0.5 : 1;
    g.lineWidth = 1;
    const ys = D.lines.map((l) => Lo.y0 + (l.y - D.rect.y) * Lo.Z);
    D.lines.forEach((l, i) => { g.beginPath(); g.moveTo(Lo.li + Lo.LEFT - 4, Math.round(ys[i]) + 0.5); g.lineTo(xEnd, Math.round(ys[i]) + 0.5); g.stroke(); });
    g.restore();
    g.font = small;
    g.fillStyle = th.dim;
    let lastY = -Infinity;
    D.lines.forEach((l, i) => { const ty = Math.max(ys[i] + 4, lastY + 12); g.fillText(l.names.join(' · '), Lo.li + 8, ty); lastY = ty; });
    // as bolinhas e os números
    const placed = [];
    const free = (x, y, w) => !placed.some((q) => x < q[0] + q[2] && q[0] < x + w && Math.abs(q[1] - y) < 12);
    const label = (t, x, y, col) => {
      g.font = small;
      const tw = Math.ceil(g.measureText(t).width);
      let ty = y + 4;
      for (const k of [0, 12, -12, 24, -24, 36]) if (free(x + 7, y + 4 + k, tw)) { ty = y + 4 + k; break; }
      placed.push([x + 7, ty, tw]);
      g.fillStyle = th.bg;
      g.globalAlpha = 0.85;
      g.fillRect(x + 6, ty - 10, tw + 2, 13);
      g.globalAlpha = 1;
      g.fillStyle = col;
      g.fillText(t, x + 7, ty);
    };
    const dot = (x, y, fill, ring, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } g.lineWidth = 1.6; g.strokeStyle = ring; g.stroke(); };
    const mark = (x, y, r) => { g.beginPath(); g.arc(x, y, r + 3.5, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = th.accent; g.stroke(); };
    for (const p of Lo.panels) {
      if (p.kind === 'over') continue;
      if (D.mode === 'anim') {
        for (const q of D.gaps.get(p.v) || []) {
          const [x, y] = toScr(Lo, p, q.q), on = hover && hover.bone === q.bone && hover.view === p.v, r = on ? 5.5 : 4.5;
          if (q.gap === null) dot(x, y, C.colors.ref, '#ffffff', 3.5);
          else dot(x, y, C.color(q.gap), '#ffffff', r);
          if (q.bone === chosen) mark(x, y, r);
          dots.push({ x, y, bone: q.bone, view: p.v, kind: 'gap', gap: q.gap, parent: q.parent });
          if (q.gap !== null && q.gap >= 0.5) label(fmt(q.gap), x, y, C.color(q.gap));
        }
        continue;
      }
      if (p.kind === 'main') {
        for (const b of D.m.bones.values()) {
          if (!D.V.boxOf(D.main, b.name)) continue;
          const [x, y] = toScr(Lo, p, b.pivot), on = hover && hover.bone === b.name && hover.view === p.v;
          dot(x, y, C.colors.ref, '#ffffff', on ? 5 : 3.5);
          if (b.name === chosen) mark(x, y, 3.5);
          dots.push({ x, y, bone: b.name, view: p.v, kind: 'ref' });
        }
        continue;
      }
      // a outra vista: o alto e o chão dela, e a bolinha de cada junta
      for (const e of D.edges.get(p.v) || []) {
        const [xl, y] = toScr(Lo, p, [e.l, e.y]), [xr] = toScr(Lo, p, [e.r, e.y]), col = C.color(e.dy);
        g.strokeStyle = col;
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(xl, y); g.lineTo(xr, y); g.stroke();
        if (Math.abs(e.dy) >= 0.5) { g.font = small; const t = C.num(e.dy), tw = Math.ceil(g.measureText(t).width), ty = y + (e.bone === 'alto' ? -3 : 11); placed.push([xr + 3, ty, tw]); g.fillStyle = th.bg; g.globalAlpha = 0.85; g.fillRect(xr + 2, ty - 10, tw + 2, 13); g.globalAlpha = 1; g.fillStyle = col; g.fillText(t, xr + 3, ty); }
      }
      for (const r of D.cmp.get(p.v)) {
        const q = r.drawn ? r.at : r.est;
        if (!q) continue;
        const [x, y] = toScr(Lo, p, q), col = C.color(C.off(r)), on = hover && hover.bone === r.bone && hover.view === p.v, rad = on ? 6 : 4.5;
        if (Math.abs(r.dy) >= 0.5) { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x, Lo.y0 + (r.ref[1] - D.rect.y) * Lo.Z); g.stroke(); }
        if (r.drawn) dot(x, y, col, '#ffffff', rad); else dot(x, y, '#ffffff', col, rad);
        if (r.bone === chosen) mark(x, y, rad);
        dots.push({ x, y, bone: r.bone, view: p.v, kind: r.drawn ? 'drawn' : 'est', r });
        if (C.off(r) >= 0.5) label(`${r.drawn ? '' : '≈'}${C.num(r.dy)}`, x, y, col);
      }
    }
    showZoom();
  }
  // o contorno das formas escolhidas que esta vista pinta, na pose do painel
  function outline(g, Lo, p, sel, th) {
    const P = D.poses.get(p.v).pose, dpr = window.devicePixelRatio || 1;
    g.save();
    g.setTransform(dpr * Lo.Z, 0, 0, dpr * Lo.Z, dpr * (p.x - D.rect.x * Lo.Z), dpr * (p.y - D.rect.y * Lo.Z));
    g.strokeStyle = th.accent;
    g.lineWidth = 2 / Lo.Z;
    g.lineJoin = 'round';
    for (const line of sel) {
      for (const rec of D.byLine.get(line) || []) {
        if (rec.view !== p.v) continue;
        let gm = null;
        try { gm = S.geometry(D.m, P, rec.el); } catch (e) { gm = null; }
        if (gm && gm.segs && gm.segs.length) g.stroke(S.pathOf(gm));
      }
    }
    g.restore();
  }

  // ---------- a lista de baixo ----------
  function fillList() {
    if (!D) { list.innerHTML = ''; return; }
    const V = D.V, rows = [];
    const item = (bone, view, text, col, title) => `<button type="button" class="cmp-it${bone === chosen ? ' on' : ''}" data-bone="${esc(bone)}" data-view="${esc(view)}" style="color:${col}" title="${esc(title)}">${esc(text)}</button>`;
    if (D.mode === 'rest') {
      rows.push(`<div class="cmp-leg">● a junta desenhada (side=x,y, back=x,y) · ○ a pista: onde ela cairia pelas peças · ― o alto e o chão · o número: o quanto sai da linha da principal, em px do arquivo (verde até 4, amarelo até 8, vermelho acima) · arraste a bolinha para gravar a junta; duplo clique: na vazia grava a pista, na cheia apaga · clique numa peça escolhe as formas do osso naquela vista</div>`);
      const order = [D.other, ...D.others.filter((v) => v !== D.other)];
      for (const v of order) {
        const its = [...D.cmp.get(v).filter((r) => r.drawn || r.est), ...(D.edges.get(v) || [])].sort((a, b) => C.off(b) - C.off(a));
        const txt = its.map((r) => {
          const t = `${r.bone} ${r.drawn ? '' : '≈'}${C.num(r.dy)}${v === 'up' && Math.abs(r.dx) >= 0.5 ? ` (x ${C.num(r.dx)})` : ''}`;
          return r.edge ? `<span class="cmp-edge" style="color:${C.color(C.off(r))}">${esc(t)}</span>` : item(r.bone, v, t, C.color(C.off(r)), r.drawn ? 'a junta desenhada: clique leva o código ao osso' : 'a pista (onde a junta cairia pelas peças): clique leva o código ao osso');
        });
        rows.push(`<div class="cmp-row${v === D.other ? ' cur' : ''}"><button type="button" class="cmp-vw" data-view="${esc(v)}" title="Comparar com esta vista">${esc(viewName(v, V))} − ${esc(viewName(D.main, V))}:</button> ${txt.join(' ')}</div>`);
      }
    } else {
      rows.push(`<div class="cmp-leg">${esc(D.an.base)}, quadro ${Math.round(st.frame)} · o número: a fresta de cada junta, em px do arquivo (a distância entre onde a peça do pai e a do filho levam a junta; verde até 4, amarelo até 8, vermelho acima) · cinza: a raiz · Parado volta às linhas e às pistas</div>`);
      for (const v of D.show) {
        const its = (D.gaps.get(v) || []).filter((q) => q.gap !== null).sort((a, b) => b.gap - a.gap);
        rows.push(`<div class="cmp-row"><span class="cmp-vn">${esc(viewName(v, V))}${D.poses.get(v).name ? '' : ' (parada)'}:</span> ${its.map((q) => item(q.bone, v, `${q.bone} ${fmt(q.gap)}`, C.color(q.gap), `fresta entre ${q.parent} e ${q.bone}: clique leva o código ao osso`)).join(' ')}</div>`);
      }
    }
    list.innerHTML = rows.join('');
  }
  list.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.cmp-it');
    if (b) { if (b.dataset.view !== D.main && b.dataset.view !== D.other && D.others.includes(b.dataset.view)) setOther(b.dataset.view); chooseBone(b.dataset.bone); return; }
    const vw = e.target.closest('.cmp-vw');
    if (vw && vw.dataset.view !== D.other) setOther(vw.dataset.view);
  });

  // ---------- quando repintar ----------
  function rebuild() {
    if (!open) return;
    if (!hasViews()) { A.setCompare(false); return; }
    const t0 = performance.now();
    D = compute();
    if (!D.other) { A.hint('Comparar vistas: o desenho só tem a vista principal.', 2600); A.setCompare(false); return; }
    fillViews();
    render();
    fillList();
    busyUntil = performance.now() + (performance.now() - t0);
  }
  // no máximo na metade do tempo (pintar o soldado custa; tocando, a tela pula quadros em vez de travar)
  function schedule() {
    if (timer) return;
    const wait = Math.max(0, busyUntil - performance.now());
    timer = setTimeout(() => requestAnimationFrame(() => { timer = 0; rebuild(); }), wait);
  }
  const keyNow = () => `${st.anim}|${st.anim ? st.frame : ''}|${want}`;
  A.on('draw', () => {
    if (!open) return;
    syncChosen();
    const k = keyNow();
    if (!D || D.m !== st.model || k !== artKey) { artKey = k; schedule(); } else render();
  });
  A.on('model', () => { if (open && !hasViews()) A.setCompare(false); });
  A.on('compare', () => { if (st.compare && !open) openView(); else if (!st.compare && open) closeView(); });
  A.on('tool', () => { space.dataset.tool = st.tool; });
  if (window.ResizeObserver) new ResizeObserver(() => { if (open && D) render(); }).observe(space);

  function fillViews() {
    const others = D.others, have = [...viewSel.options].map((o) => o.value).join(',');
    if (have !== others.join(',')) {
      viewSel.innerHTML = '';
      for (const v of others) { const o = document.createElement('option'); o.value = v; o.textContent = `${viewName(v, D.V)} (${v})`; viewSel.appendChild(o); }
    }
    viewSel.value = D.other;
  }
  function setOther(v) { want = v; artKey = ''; cam.fitted = true; rebuild(); }
  viewSel.addEventListener('change', () => setOther(viewSel.value));
  overIn.addEventListener('change', () => { cam.fitted = true; render(); });
  alphaIn.addEventListener('input', () => render());
  root.querySelector('.cmp-rest').addEventListener('click', () => {
    const s = $('animSel');
    if (st.playing) $('bPlay').click();
    if (s && s.value !== '') { s.value = ''; s.dispatchEvent(new Event('change')); }
  });
  root.querySelector('.cmp-close').addEventListener('click', () => A.setCompare(false));
  for (const b of root.querySelectorAll('.cmp-bar button, .cmp-bar input')) b.addEventListener('mousedown', (e) => { if (b.tagName === 'BUTTON') e.preventDefault(); });

  function openView() {
    open = true;
    root.hidden = false;
    cam.fitted = true;
    artKey = '';
    arts.clear();
    space.dataset.tool = st.tool;
    rebuild();
    A.hint('Comparar vistas: arraste a bolinha da junta para gravar side=x,y (de lado) ou back=x,y (de costas) · clique numa peça escolhe as formas do osso naquela vista (as setas movem) · com uma animação no player, a fresta de cada junta', 5200);
  }
  function closeView() {
    open = false;
    root.hidden = true;
    info.hidden = true;
    clearTimeout(timer);
    timer = 0;
    for (const a of arts.values()) a.cv.width = 0;
    arts.clear();
    D = null;
    drag = null;
    hover = null;
  }

  // ---------- o osso escolhido ----------
  // (noCode: só marca o osso, sem levar o código à linha dele: o clique numa peça leva às formas)
  function chooseBone(name, noCode) {
    const b = name && st.model.bones.get(name);
    chosen = b ? name : null;
    const line = b && !noCode ? A.boneLine(b) : -1;
    if (line >= 0 && st.caret.line !== line) A.editor.reveal(line, 0);
    render();
    fillList();
  }
  // o osso escolhido segue o cursor do código (numa linha bone)
  function syncChosen() {
    const m = st.model;
    if (!m) return;
    for (const b of m.bones.values()) if (A.boneLine(b) === st.caret.line) { if (chosen !== b.name) { chosen = b.name; fillList(); } return; }
  }

  // ---------- mexer na junta ----------
  // por que esta bolinha não arrasta ('' se arrasta)
  function whyNot(d) {
    if (D.mode !== 'rest') return 'Animando, a bolinha mostra a fresta: para mexer na junta, volte para Parado.';
    if (d.kind === 'ref') return `Na principal, a junta é o pivot= de ${d.bone}: mude no código.`;
    if (D.V.main !== 'down') return 'Num jogo de plataforma, a vista principal é o lado: a junta de cada osso é o pivot=.';
    if (!['right', 'left', 'up'].includes(d.view)) return `Na vista ${d.view} a junta vem da frente: só de lado (side=x,y) e de costas (back=x,y) ela é desenhada.`;
    const b = st.model.bones.get(d.bone), line = b ? A.boneLine(b) : -1, k = d.view === 'up' ? 'back' : 'side';
    if (line < 0) return `A linha do osso ${d.bone} não está neste arquivo: mude o ${k}= no código dele.`;
    if (new RegExp(`\\b${k}=\\S*\\{`).test(A.lineText(line))) return `O ${k}= de ${d.bone} vem de uma {expressão}: mude no código.`;
    return '';
  }
  // o x do side=: o escrito, ou a profundidade que o Weasel montou (lida das peças)
  function sideX(b) {
    if (b.side !== null && b.side !== undefined) return b.side;
    const d = D.V.depth.get(b.name);
    return D.V.rootX + (d ? d.z : 0);
  }
  // grava a junta de d.bone na vista d.view em q (px do arquivo); null apaga (de lado, só o y)
  function writeJoint(bone, view, q, key, whole) {
    const b = st.model.bones.get(bone), line = A.boneLine(b);
    let attrs, txt;
    if (view === 'up') { txt = q ? `${r1(q[0], whole)},${r1(q[1], whole)}` : null; attrs = { back: txt }; }
    else if (view === 'right') { txt = q ? `${r1(q[0], whole)},${r1(q[1], whole)}` : b.side !== null && b.side !== undefined ? r1(b.side) : null; attrs = { side: txt }; }
    else { txt = q ? `${r1(sideX(b))},${r1(q[1], whole)}` : b.side !== null && b.side !== undefined ? r1(b.side) : null; attrs = { side: txt }; }
    A.setAttrs([line], attrs, null, key);
    return `${Object.keys(attrs)[0]}=${txt === null ? '' : txt}`;
  }
  function dropJoint(d) {
    const why = whyNot(d);
    if (why) { A.hint(why, 2800); return; }
    const k = d.view === 'up' ? 'back' : 'side', key = 'cmp' + Date.now();
    if (d.kind === 'est') {
      const r = d.r, q = d.view === 'right' ? [r.at[0], r.est[1]] : r.est, t = writeJoint(d.bone, d.view, q, key, false);
      A.hint(`${d.bone}: ${t}, a pista das peças (confira no desenho; arraste para acertar).`, 3200);
    } else if (d.kind === 'drawn') {
      writeJoint(d.bone, d.view, null, key, false);
      A.hint(k === 'back' ? `${d.bone}: back= apagado; de costas, a junta volta a ser a da frente.` : `${d.bone}: o y do side= apagado; de lado, a junta volta a ser a da frente (a profundidade fica).`, 3000);
    }
  }

  // ---------- o mouse ----------
  const localXY = (e) => { const r = space.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function dotAt(x, y) {
    let best = null, bd = 9;
    for (const d of dots) { const dd = Math.hypot(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = d; } }
    return best;
  }
  const panelAt = (x, y) => (D && D.Lo ? D.Lo.panels.find((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) : null);
  // a forma de cima no ponto (px do arquivo), entre as da vista do painel
  let pickCtx = null;
  function shapeAt(p, q) {
    const P = D.poses.get(p.v).pose, ctx = pickCtx || (pickCtx = document.createElement('canvas').getContext('2d')), recs = D.shapes.get(p.v) || [];
    ctx.lineJoin = ctx.lineCap = 'round';
    for (let i = recs.length - 1; i >= 0; i--) {
      const rec = recs[i], el = rec.el;
      if (rec.layer.hidden || rec.layer.guide || el.hidden) continue;
      let g = null;
      try { g = S.geometry(D.m, P, el); } catch (e) { g = null; }
      if (!g || !g.segs || !g.segs.length) continue;
      const path = S.pathOf(g), opn = el.type === 'stroke' || el.type === 'line';
      ctx.lineWidth = (opn ? el.w || 1 : el.ink || 0) + 4 / D.Lo.Z;
      if ((!opn && rec.part !== 'ink' && ctx.isPointInPath(path, q[0], q[1])) || ctx.isPointInStroke(path, q[0], q[1])) return rec;
    }
    return null;
  }
  // clicar numa peça: todas as formas daquele osso naquela vista (Shift soma)
  function pickPiece(p, s, add) {
    const rec = shapeAt(p, toFile(D.Lo, p, s));
    if (!rec) { if (!add) A.selectNone(); return; }
    const lines = rec.bone ? [...new Set((D.shapes.get(p.v) || []).filter((x) => x.bone === rec.bone && x.line >= 0).map((x) => x.line))] : rec.line >= 0 ? [rec.line] : [];
    if (!lines.length) return;
    const now = add ? A.selected() : [];
    if (rec.bone) chooseBone(rec.bone, true);
    A.setSel([...now, ...lines]);
    A.hint(rec.bone ? `${rec.bone} ${viewName(p.v, D.V)}: ${lines.length === 1 ? '1 forma escolhida' : `${lines.length} formas escolhidas`} · as setas movem (Shift: 10 px) · Ctrl+Z desfaz` : `Esta forma não tem bone=: só ela foi escolhida.`, 3200);
  }
  function setInfo(d) {
    if (!d) { info.hidden = true; return; }
    let t;
    if (d.kind === 'ref') t = `${d.bone}: o pivot= (a junta na principal)`;
    else if (d.kind === 'gap') t = d.gap === null ? `${d.bone}: a raiz (sem pai, sem fresta)` : `${d.bone}, ${viewName(d.view, D.V)}: fresta de ${fmt(d.gap)} px entre a peça de ${d.parent} e a dele, neste quadro`;
    else {
      const r = d.r, k = d.view === 'up' ? 'back' : 'side', why = whyNot(d);
      const off = `${fmt(Math.abs(r.dy))} px ${r.dy < 0 ? 'acima' : 'abaixo'} da linha${d.view === 'up' && Math.abs(r.dx) >= 0.5 ? `, ${fmt(Math.abs(r.dx))} px para o lado` : ''}`;
      t = d.kind === 'drawn' ? `${d.bone}, ${viewName(d.view, D.V)}: a junta desenhada (${k}=), ${Math.abs(r.dy) < 0.5 ? 'na linha' : off}${why ? '' : ' · arraste para mudar (Shift: de 1 em 1) · duplo clique apaga'}`
        : `${d.bone}, ${viewName(d.view, D.V)}: sem junta desenhada; pelas peças, ela cairia ${Math.abs(r.dy) < 0.5 ? 'na linha' : off} (uma pista)${why ? '' : ` · duplo clique grava ${k}= ali · arraste para pôr onde ela está no desenho`}`;
      if (why) t += ` · ${why}`;
    }
    info.textContent = t;
    info.hidden = false;
  }
  function setHover(d) {
    const was = hover;
    hover = d ? { bone: d.bone, view: d.view } : null;
    if ((was && was.bone) !== (hover && hover.bone) || (was && was.view) !== (hover && hover.view)) render();
    setInfo(d);
    space.classList.toggle('on-dot', !!d && !whyNot(d));
  }
  const panning = (e) => e.button === 1 || st.tool === 'hand' || stage.classList.contains('space');
  space.addEventListener('pointerdown', (e) => {
    if (!D || !D.Lo) return;
    const s = localXY(e);
    if (panning(e)) { e.preventDefault(); drag = { mode: 'pan', s, ox: cam.ox, oy: cam.oy }; space.setPointerCapture(e.pointerId); space.classList.add('grabbing'); return; }
    if (e.button !== 0) return;
    if (st.tool === 'zoom') { zoomAt(s[0], s[1], e.altKey ? 0.8 : 1.25); return; }
    const d = dotAt(s[0], s[1]);
    space.setPointerCapture(e.pointerId);
    if (d && (d.kind === 'drawn' || d.kind === 'est') && !whyNot(d)) {
      const p = D.Lo.panels.find((x) => x.kind === 'other' && x.v === d.view);
      drag = { mode: 'joint', d, p, s, dx: d.x - s[0], dy: d.y - s[1], moved: false, key: 'cmp' + Date.now(), raf: 0, last: null };
      return;
    }
    drag = { mode: 'click', s, d, add: e.shiftKey };
  });
  space.addEventListener('pointermove', (e) => {
    const s = localXY(e);
    if (!drag) { if (D && D.Lo) setHover(dotAt(s[0], s[1])); return; }
    if (drag.mode === 'pan') { cam.fitted = false; cam.ox = drag.ox + s[0] - drag.s[0]; cam.oy = drag.oy + s[1] - drag.s[1]; render(); return; }
    if (drag.mode !== 'joint') return;
    if (!drag.moved && Math.hypot(s[0] - drag.s[0], s[1] - drag.s[1]) < 3) return;
    drag.moved = true;
    drag.last = { q: toFile(D.Lo, drag.p, [s[0] + drag.dx, s[1] + drag.dy]), whole: e.shiftKey };
    if (drag.raf) return;
    const dr = drag;
    dr.raf = requestAnimationFrame(() => {
      dr.raf = 0;
      if (!dr.last) return;
      const t = writeJoint(dr.d.bone, dr.d.view, dr.last.q, dr.key, dr.last.whole);
      info.textContent = `${dr.d.bone}: ${t}${dr.d.view === 'left' ? ' (na esquerda, só o y: o x do side= é a profundidade, da direita)' : ''} · Shift: de 1 em 1`;
      info.hidden = false;
    });
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    space.classList.remove('grabbing');
    if (d.mode === 'joint') { if (d.raf) { cancelAnimationFrame(d.raf); if (d.last) writeJoint(d.d.bone, d.d.view, d.last.q, d.key, d.last.whole); } if (!d.moved) chooseBone(d.d.bone); return; }
    if (d.mode !== 'click' || !e || e.type === 'pointercancel') return;
    const s = localXY(e);
    if (Math.hypot(s[0] - d.s[0], s[1] - d.s[1]) > 4) return;
    if (d.d) { chooseBone(d.d.bone); const why = whyNot(d.d); if (why && d.d.kind !== 'ref' && d.d.kind !== 'gap') A.hint(why, 2600); return; }
    const p = panelAt(s[0], s[1]);
    if (p && p.kind !== 'over') pickPiece(p, s, d.add);
    else if (!d.add) A.selectNone();
  };
  space.addEventListener('pointerup', endDrag);
  space.addEventListener('pointercancel', endDrag);
  space.addEventListener('pointerleave', () => { if (!drag && hover) setHover(null); else if (!drag) info.hidden = true; });
  space.addEventListener('dblclick', (e) => {
    if (!D || !D.Lo) return;
    const s = localXY(e), d = dotAt(s[0], s[1]);
    if (d && (d.kind === 'drawn' || d.kind === 'est')) { e.preventDefault(); dropJoint(d); }
  });
  space.addEventListener('wheel', (e) => {
    if (!D || !D.Lo) return;
    e.preventDefault();
    const s = localXY(e), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(s[0], s[1], Math.exp(-dy * 0.0015));
  }, { passive: false });

  // ---------- o zoom ----------
  function zoomAt(sx, sy, f) {
    if (!D || !D.Lo) return;
    const Lo = D.Lo, zf = Math.max(0.25, Math.min(16 / Lo.zFit, cam.zf * f));
    f = zf / cam.zf;
    if (Math.abs(f - 1) < 1e-6) return;
    // o ponto debaixo do mouse fica parado (os espaços entre os painéis não crescem: dentro de um painel, quase)
    const base = Lo.li + Lo.LEFT + GAP, nx0 = sx - (sx - Lo.x0) * f, ny0 = sy - (sy - Lo.y0) * f;
    cam.zf = zf;
    cam.ox = nx0 - base;
    cam.oy = ny0 - TOP - 20;
    cam.fitted = false;
    render();
    // a pintura no tamanho novo, quando o zoom para
    clearTimeout(zoomAt.t);
    zoomAt.t = setTimeout(() => render(), 160);
  }
  function showZoom() {
    const z = $('zoomPct');
    if (z && D && D.Lo) { const t = Math.round(D.Lo.Z * 100) + '%'; if (z.textContent !== t) z.textContent = t; }
  }
  A.registerCompare({
    zoom: (f) => zoomAt(space.clientWidth / 2, space.clientHeight / 2, f),
    fit: () => { cam.fitted = true; render(); },
    // 100%: um pixel do desenho, um da tela
    actual: () => { if (D && D.Lo) zoomAt(space.clientWidth / 2, space.clientHeight / 2, 1 / D.Lo.Z); },
  });

  // para conferir no navegador
  W.compareView = {
    state: () => (D ? { open, mode: D.mode, main: D.main, other: D.other, Z: D.Lo && +D.Lo.Z.toFixed(4), chosen, panels: D.Lo ? D.Lo.panels.map((p) => ({ v: p.v, kind: p.kind, x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w), h: Math.round(p.h) })) : [], dots: dots.map((d) => ({ bone: d.bone, view: d.view, kind: d.kind, x: Math.round(d.x), y: Math.round(d.y), dy: d.r ? +d.r.dy.toFixed(2) : undefined, gap: d.gap !== undefined && d.gap !== null ? +d.gap.toFixed(2) : undefined })), list: list.textContent } : { open }),
    dot: (bone, view) => { const d = dots.find((x) => x.bone === bone && x.view === view); if (!d) return null; const r = space.getBoundingClientRect(); return [Math.round(r.left + d.x), Math.round(r.top + d.y)]; },
    rebuild,
  };
})(window.Weasel = window.Weasel || {});
