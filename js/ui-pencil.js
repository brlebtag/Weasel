/* Weasel — o Lápis, o Pincel e o Simplificar (etapa 4c do plano da interface, docs/planos/interface-illustrator.md).
   - Lápis (N): o arraste vira poucos pontos (o Simplificar, js/simplify.js) e escreve um stroke com o contorno das
     caixinhas; terminando perto do começo, fecha um shape.
   - Pincel (B): o arraste vira um stroke com a grossura das caixinhas e as pontas afinando (taper=). [ e ] mudam a
     grossura (nos dois).
   - Objeto › Caminho › Simplificar: um painelzinho com a tolerância e a prévia ao vivo (a forma de antes, fantasma,
     por baixo; a nova por cima) e o "312 → 24 pontos". Aplicar escreve todas as linhas juntas (um Ctrl+Z só).
   O app.js dá o mouse (A.addTool), o desenho por cima (A.addOverlay) e escreve no código (A.drawPlace, A.addLine,
   A.setLines); as cores vêm das caixinhas da barra de ferramentas (js/ui-draw.js). */
(function (W) {
  'use strict';
  const A = W.app, G = W.geom, D = W.draw, SM = W.simplify, L = W.lang;
  if (!A || !G || !D || !SM) return;
  const st = A.st;
  const $ = (id) => document.getElementById(id);
  const fx = (v) => String(Number(v.toFixed(st.view.z > 3 ? 1 : 0)));
  const FID = 2; // pixels da tela que o traço do Lápis e do Pincel pode se afastar do mouse
  const CLOSE = 12; // pixels da tela: o Lápis que termina perto assim do começo fecha um shape
  const TAPER = '0.15,0.3'; // o Pincel afina 15% no começo e 30% no fim

  // ---------- as cores e a grossura (das caixinhas) ----------
  const inked = (v) => v !== null && v !== undefined && v !== '' && v !== 'none' && Number(v) !== 0;
  function hexOf(c) {
    if (c && c[0] === '#') return c;
    const m = A.model(), v = m && m.palette.get(c);
    return typeof v === 'string' && v[0] === '#' ? v : c === 'ink' ? '#14141c' : '#2f8cff';
  }
  // a cor do traço: o contorno (sem contorno, o preenchimento)
  function strokeHex() {
    const p = D.paint();
    return hexOf(p.stroke !== 'none' ? p.stroke || 'ink' : p.fill !== 'none' ? p.fill : 'ink');
  }
  // a grossura em pixels (a caixinha pode ter um nome da palette, como line)
  function widthOf(open) {
    const w = D.paint().w;
    if (!inked(w)) return open ? 2 : 4;
    const n = Number(w);
    if (Number.isFinite(n)) return n;
    const m = A.model(), v = m && m.palette.get(w);
    return Number.isFinite(Number(v)) ? Number(v) : 4;
  }
  const brushPaint = () => {
    const p = D.paint();
    const op = D.openPaint();
    return `${inked(p.w) ? op : op.replace(/\bw=\S+/, 'w=4')} taper=${TAPER}`;
  };

  // ---------- à mão livre ----------
  // o traço sendo feito: { tool, raw: [[x, y]] } (no desenho); hover: o mouse, para a bolinha do Pincel
  let free = null, hover = null;
  const lenOf = (raw) => { let l = 0; for (let i = 1; i < raw.length; i++) l += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]); return l; };
  const closes = (F) => {
    if (F.tool !== 'pencil' || F.raw.length < 5) return false;
    const a = F.raw[0], b = F.raw[F.raw.length - 1], z = st.view.z;
    return Math.hypot(a[0] - b[0], a[1] - b[1]) * z < CLOSE && lenOf(F.raw) * z > CLOSE * 4;
  };
  function finish() {
    const F = free;
    free = null;
    A.draw();
    if (!F || !st.model) return;
    const z = st.view.z, raw = F.raw, brush = F.tool === 'brush';
    if (lenOf(raw) * z < 3) { A.hint(brush ? 'Arraste para pintar com o Pincel.' : 'Arraste para desenhar com o Lápis.', 1800); return; }
    const closed = closes(F);
    const pts = SM.freehand(raw, closed, FID / z);
    const pl = A.drawPlace(D.behind());
    if (!pl || pl.why) { if (pl) A.hint(pl.why, 3200); return; }
    // nas coordenadas do código ali; dois pontos seguidos iguais (do arredondamento) viram um
    const toks = [];
    for (const p of pts) {
      const q = pl.local([p.x, p.y]), t = `${fx(q[0])},${fx(q[1])}`;
      const prev = toks[toks.length - 1];
      if (prev && prev.xy === t) { prev.corner = prev.corner || p.corner; continue; }
      toks.push({ xy: t, corner: p.corner });
    }
    if (closed && toks.length > 1 && toks[0].xy === toks[toks.length - 1].xy) toks.pop();
    if (toks.length < (closed ? 3 : 2)) { A.hint('O traço ficou pequeno demais: nada foi escrito.', 2200); return; }
    const txt = toks.map((t) => t.xy + (t.corner ? '!' : '')).join(' ');
    const cmd = closed ? 'shape' : 'stroke';
    const paint = closed ? D.closedPaint() : brush ? brushPaint() : D.openPaint();
    const nl = A.addLine(pl, cmd, cmd, `${paint} : ${txt}`, { key: (brush ? 'pincel' : 'lapis') + Date.now() });
    if (nl < 0) return;
    const name = (L.splitLine(A.lineText(nl)).words[1] || {}).text || '';
    A.hint(`${cmd} ${name} com ${toks.length} pontos na linha ${nl + 1}. Objeto › Caminho › Simplificar tira mais.`, 3000);
  }
  function freeTool(id) {
    return {
      handles: false,
      down(e) {
        if (!st.model) return false;
        free = { tool: id, raw: [A.toCanvas(e)] };
        return true;
      },
      move(e) {
        if (!free) return;
        // os pontos que o navegador juntou entre um evento e outro (o traço sai mais fiel)
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        for (const ev of evs.length ? evs : [e]) {
          const p = A.toCanvas(ev), last = free.raw[free.raw.length - 1];
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) * st.view.z >= 0.5) free.raw.push(p);
        }
        hover = free.raw[free.raw.length - 1];
        A.draw();
      },
      up() { if (free) finish(); },
      hover(e) { hover = A.toCanvas(e); if (id === 'brush') A.draw(); },
      cursor: () => 'crosshair',
      overlay(ctx, z, dpr) {
        // o Pincel mostra a grossura no mouse
        if (id === 'brush' && hover && !free) {
          ctx.beginPath();
          ctx.arc(hover[0], hover[1], Math.max(widthOf(true) / 2, 1.5 / z), 0, Math.PI * 2);
          ctx.lineWidth = 2.4 / z;
          ctx.strokeStyle = 'rgba(255,255,255,.8)';
          ctx.stroke();
          ctx.lineWidth = 1 / z;
          ctx.strokeStyle = 'rgba(20,20,28,.85)';
          ctx.stroke();
        }
        if (!free || free.tool !== id || free.raw.length < 2) return;
        // o traço como vai sair (a cor e a grossura do contorno)
        ctx.beginPath();
        free.raw.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(widthOf(true), 1.2 / z);
        ctx.strokeStyle = strokeHex();
        ctx.globalAlpha = 0.85;
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (closes(free)) {
          const a = free.raw[0];
          ctx.beginPath();
          ctx.arc(a[0], a[1], 6 / z, 0, Math.PI * 2);
          ctx.lineWidth = 1.5 / z;
          ctx.strokeStyle = '#2f8cff';
          ctx.stroke();
          D.tag(ctx, dpr, free.raw[free.raw.length - 1], 'fechar (shape)');
        }
      },
    };
  }
  A.addTool('pencil', freeTool('pencil'));
  A.addTool('brush', freeTool('brush'));

  // [ e ] mudam a grossura (a caixinha), sem mexer nas formas escolhidas
  function nudgeW(up) {
    const w = widthOf(true);
    const step = w < 10 ? 1 : w < 30 ? 2 : 5;
    const n = Math.max(1, Math.min(400, up ? w + step : w - step));
    D.setW(String(n));
    A.hint(`Grossura ${n} (a caixinha do contorno): os próximos traços saem assim.`, 1600);
    A.draw();
  }
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || (st.tool !== 'brush' && st.tool !== 'pencil') || A.isFilm()) return;
    const t = e.target;
    if (t && t.closest && t.closest('textarea, input, select, dialog, [contenteditable]')) return;
    if (e.key !== '[' && e.key !== ']') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    nudgeW(e.key === ']');
  }, true);
  A.on('tool', () => { if (free && st.tool !== free.tool) free = null; hover = null; });

  // ---------- Objeto › Caminho › Simplificar ----------
  const TMIN = 0.1, TMAX = 20;
  const toS = (t) => Math.round((100 * Math.log(t / TMIN)) / Math.log(TMAX / TMIN));
  const toT = (s) => Math.round(TMIN * Math.pow(TMAX / TMIN, s / 100) * 10) / 10;
  let sp = null, panel = null, lastTol = 1.5;
  const SIMPLE = new Set(['shape', 'stroke', 'line']);
  const wordsOf = (line) => L.splitLine(A.lineText(line)).words;
  // as linhas escolhidas que têm pontos (sem escolha, a do cursor)
  function targets() {
    const sel = A.selected();
    return (sel.length ? sel : [st.caret.line]).filter((l) => { const w = wordsOf(l)[0]; return w && SIMPLE.has(w.text); });
  }
  function build() {
    panel = document.createElement('div');
    panel.id = 'simpPanel';
    panel.className = 'ref-panel simp-panel';
    panel.hidden = true;
    panel.innerHTML = '<div class="rp-head"><b>Simplificar</b><span class="sp-n"></span><button type="button" class="x" title="Cancelar (Esc)" aria-label="Cancelar">×</button></div>'
      + '<label class="sp-tol"><span>Tolerância</span><input type="range" min="0" max="100" step="1" aria-label="Tolerância"><input type="text" class="sp-num" spellcheck="false" autocomplete="off" aria-label="Tolerância em pixels"><small>px</small></label>'
      + '<div class="sp-note"></div>'
      + '<div class="rp-foot"><button type="button" class="sp-ok">Simplificar</button><button type="button" class="sp-no">Cancelar</button><small>quanto cada forma pode se afastar da de antes, em pixels do desenho</small></div>';
    $('stage').appendChild(panel);
    const rg = panel.querySelector('input[type=range]'), nm = panel.querySelector('.sp-num');
    rg.addEventListener('input', () => { setTol(toT(Number(rg.value)), rg, true); });
    nm.addEventListener('change', () => { const v = Number(nm.value.replace(',', '.')); if (Number.isFinite(v) && v > 0) setTol(Math.min(1000, v), nm); else nm.value = String(sp ? sp.tol : lastTol); });
    nm.addEventListener('keydown', (e) => { if (e.key === 'Enter') { nm.dispatchEvent(new Event('change')); } });
    panel.querySelector('.x').addEventListener('click', () => close(true));
    panel.querySelector('.sp-no').addEventListener('click', () => close(true));
    panel.querySelector('.sp-ok').addEventListener('click', apply);
  }
  // arrastando o controle, as contas esperam o mouse parar um pouquinho (com muitas formas escolhidas, cada conta leva
  // uns milissegundos)
  let later = 0;
  function setTol(t, from, soon) {
    if (!sp) return;
    sp.tol = t;
    lastTol = t;
    const rg = panel.querySelector('input[type=range]'), nm = panel.querySelector('.sp-num');
    if (from !== rg) rg.value = String(toS(Math.max(TMIN, Math.min(TMAX, t))));
    if (from !== nm) nm.value = String(t);
    clearTimeout(later);
    if (soon) later = setTimeout(() => { if (sp) compute(); }, 40); else compute();
  }
  function compute() {
    let before = 0, after = 0;
    const notes = [], src = A.editor.value;
    for (const T of sp.lines) {
      T.res = SM.line(T.text, sp.tol);
      const w = L.splitLine(T.text).words, what = `${w[0].text}${w[1] && !w[1].text.includes('=') ? ' ' + w[1].text : ''}`;
      if (T.res.why) { if (!T.res.minor || sp.lines.length === 1) notes.push(`${what}: ${T.res.why}`); continue; }
      before += T.res.before;
      after += T.res.after;
      const name = w[1] ? w[1].text : '';
      const uses = T.res.after < T.res.before && name ? SM.uses(src, name) : [];
      if (uses.length) notes.push(`${what}: a troca de forma usa (linha ${uses.map((u) => u + 1).join(', ')}); com outro número de pontos, ela deixa de ir ponto a ponto`);
    }
    panel.querySelector('.sp-n').textContent = before ? `${before} → ${after} pontos` : '';
    const note = panel.querySelector('.sp-note');
    note.textContent = notes.join(' · ');
    note.hidden = !notes.length;
    panel.querySelector('.sp-ok').disabled = !(after < before);
    A.draw();
  }
  function open() {
    if (A.isFilm()) return;
    const ls = targets();
    if (!ls.length) { A.hint('Escolha um shape, um stroke ou uma line (com a Seleção, V) para simplificar.', 2800); return; }
    if (!panel) build();
    sp = { lines: ls.map((line) => ({ line, text: A.lineText(line), res: null })), tol: lastTol };
    panel.hidden = false;
    setTol(lastTol);
    const nm = panel.querySelector('.sp-num');
    nm.focus();
    nm.select();
  }
  function close(cancel) {
    if (!sp) return;
    sp = null;
    panel.hidden = true;
    A.draw();
    if (cancel) A.hint('Simplificar cancelado: nada mudou.', 1600);
  }
  function apply() {
    if (!sp) return;
    clearTimeout(later);
    compute();
    const out = new Map();
    let before = 0, after = 0;
    for (const T of sp.lines) if (T.res && !T.res.why && T.res.after < T.res.before) { out.set(T.line, T.res.text); before += T.res.before; after += T.res.after; }
    close(false);
    if (!out.size) { A.hint('Nada para tirar com essa tolerância.', 2200); return; }
    A.setLines(out, 'simplificar' + Date.now());
    A.hint(`Simplificado: ${before} → ${after} pontos (Ctrl+Z volta).`, 2600);
  }
  // o código mudou por fora (digitando, desfazendo): a prévia não vale mais
  A.on('model', () => { if (sp && sp.lines.some((T) => A.lineText(T.line) !== T.text)) { close(false); A.hint('O código mudou: o Simplificar fechou sem mudar nada.', 2400); } });
  window.addEventListener('keydown', (e) => {
    if (!sp || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('textarea, dialog, [contenteditable]')) return;
    if (t && t.closest && t.closest('input, select') && !panel.contains(t)) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(true); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); if (t && t.classList && t.classList.contains('sp-num')) t.dispatchEvent(new Event('change')); apply(); }
  }, true);

  // a prévia: a curva de antes, fantasma, e a nova por cima, com os pontos que ficam
  function curveOf(text) {
    const s = L.splitLine(text), cmd = s.words[0].text, pts = s.points.map((p) => L.parsePoint(p));
    if (pts.some((p) => !p)) return null;
    const sw = s.words.find((w) => w.text.startsWith('smooth=')), smooth = sw ? Number(sw.text.slice(7)) : 1;
    const closed = cmd === 'shape';
    return { pts, closed, segs: cmd === 'line' || !(smooth > 0) ? G.polySegs(pts, closed) : G.smoothSegs(pts, closed, Number.isFinite(smooth) ? smooth : 1) };
  }
  function strokeCurve(ctx, c, map, idx) {
    ctx.beginPath();
    c.segs.forEach((s, j) => {
      const i = idx ? idx[j] : j;
      for (let k = 0; k <= 12; k++) {
        const t = k / 12, u = 1 - t;
        const x = u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6], y = u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7];
        const p = map(x, y, k < 6 ? i : idx ? idx[(j + 1) % idx.length] : (j + 1) % c.pts.length);
        if (!j && !k) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
    });
  }
  A.addOverlay((ctx, z) => {
    if (!sp) return;
    for (const T of sp.lines) {
      const map = A.localMap(T.line), a = map && curveOf(T.text);
      if (!a) continue;
      ctx.lineJoin = 'round';
      strokeCurve(ctx, a, map);
      ctx.lineWidth = 6 / z;
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.stroke();
      ctx.lineWidth = 2 / z;
      ctx.strokeStyle = 'rgba(20,20,28,.35)';
      ctx.stroke();
      if (!T.res || T.res.why) continue;
      const b = curveOf(T.res.text);
      if (!b) continue;
      strokeCurve(ctx, b, map, T.res.kept);
      ctx.lineWidth = 1.6 / z;
      ctx.strokeStyle = '#2f8cff';
      ctx.stroke();
      const cs = new Set(T.res.corners);
      T.res.kept.forEach((i, j) => {
        const p = map(b.pts[j].x, b.pts[j].y, i), r = 3 / z;
        ctx.beginPath();
        if (b.pts[j].corner || cs.has(i)) ctx.rect(p[0] - r, p[1] - r, 2 * r, 2 * r); else ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1.2 / z;
        ctx.strokeStyle = '#2f8cff';
        ctx.stroke();
      });
    }
  });

  W.pencil = { simplify: open, simplifying: () => !!sp };
})(window.Weasel = window.Weasel || {});
