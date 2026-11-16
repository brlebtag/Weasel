/* Weasel — desenhar (etapa 4a do plano da interface, docs/planos/interface-illustrator.md): as formas que nascem do
   arraste (Retângulo, Elipse, Polígono, Estrela e Linha), o Conta-gotas, o Degradê e as caixinhas de preenchimento e
   contorno no pé da barra de ferramentas.
   O app.js dá o mouse (A.addTool) e escreve no código (A.drawPlace, A.addLine, A.setAttrs); aqui se decide o que
   escrever. */
(function (W) {
  'use strict';
  const A = W.app, L = W.lang;
  if (!A || !L) return;
  const st = A.st, $ = (id) => document.getElementById(id), view = $('view');
  const P = () => W.props || null;
  const fx = (v) => String(Number(v.toFixed(st.view.z > 3 ? 1 : 0)));
  const keyNow = (k) => k + Date.now();

  // ---------- a pintura escrita numa linha ----------
  const words = (line) => L.splitLine(A.lineText(line)).words;
  const cmdOf = (line) => { const w = words(line); return w[0] ? w[0].text : ''; };
  const OPEN = new Set(['line', 'stroke']);
  const PAINTED = new Set(['shape', 'ellipse', 'rect', 'text', 'line', 'stroke']);
  const has = (cmd, k) => (L.ATTRS[cmd] || []).includes(k);
  // o valor escrito na linha (k=valor), null se não está escrito e undefined se é uma {conta} (não dá para copiar)
  function attrOf(line, k) {
    const w = words(line).slice(1).find((t) => t.text.startsWith(k + '='));
    if (!w) return null;
    const v = w.text.slice(k.length + 1);
    return v.includes('{') ? undefined : v;
  }
  const inked = (v) => v !== null && v !== undefined && v !== '' && v !== 'none' && Number(v) !== 0;
  // A pintura pelos papéis: fill (o preenchimento), scol (a cor do contorno), sw (a grossura do contorno) e op (a
  // opacidade). Na linha reta e no traço, o c= e o w= são o contorno e não há preenchimento.
  // undefined: a linha não tem aquele papel; null: não está escrito (vale o padrão)
  function paintOf(line) {
    const cmd = cmdOf(line);
    if (!PAINTED.has(cmd)) return null;
    const get = (k) => attrOf(line, k);
    if (OPEN.has(cmd)) return { cmd, fill: undefined, scol: get('c'), sw: get('w'), op: get('opacity') };
    return { cmd, fill: get('c'), scol: get('inkc'), sw: get('ink'), op: get('opacity') };
  }
  // copia a pintura src para as linhas: o que a fonte tem escrito vai, o que ela não tem sai (fica no padrão, igual)
  function paintTo(lines, src, key) {
    let n = 0;
    for (const l of lines) {
      const cmd = cmdOf(l), at = {};
      if (!PAINTED.has(cmd)) continue;
      if (OPEN.has(cmd)) {
        // na linha reta, o contorno da fonte; de uma forma sem contorno, a cor dela
        const ink = OPEN.has(src.cmd) || inked(src.sw), c = ink ? src.scol : src.fill;
        if (c !== undefined && c !== 'none') at.c = c;
        if (ink && src.sw !== undefined) at.w = src.sw;
      } else {
        if (src.fill !== undefined) at.c = src.fill;
        if (src.scol !== undefined) at.inkc = src.scol;
        if (src.sw !== undefined) at.ink = src.sw;
      }
      if (src.op !== undefined && has(cmd, 'opacity')) at.opacity = src.op;
      if (A.setAttrs([l], at, null, key)) n++;
    }
    return n;
  }

  // ---------- as caixinhas de preenchimento e contorno (o pé da barra de ferramentas) ----------
  // O que as formas desenhadas recebem: fill (o c=), stroke (o inkc=; '' é a cor do ink de sempre) e w (a grossura:
  // o ink=, ou o w= da linha reta). 'none' é sem. Como no Illustrator, escolher uma forma traz as cores dela para
  // cá, e mudar aqui com formas escolhidas pinta as escolhidas.
  const DEF = { fill: '#4a90d9', stroke: '', w: '4' };
  const sw = Object.assign({ front: 'fill', behind: false }, DEF);
  const fillOn = () => sw.fill !== 'none';
  const inkOn = () => sw.stroke !== 'none' && inked(sw.w);
  // a cor do ink de sempre: a da palette (ink=…) ou o quase preto
  const inkName = (m) => (m && typeof m.palette.get('ink') === 'string' ? 'ink' : '#14141c');
  function closedPaint() {
    const out = [];
    if (fillOn()) out.push('c=' + sw.fill); else if (!inkOn()) out.push('c=none');
    if (inkOn()) { out.push('ink=' + sw.w); if (sw.stroke) out.push('inkc=' + sw.stroke); }
    return out.join(' ');
  }
  // a linha reta: a cor do contorno (sem contorno, a do preenchimento) e a grossura
  function openPaint() {
    const c = sw.stroke !== 'none' ? sw.stroke : fillOn() ? sw.fill : '';
    return `${c ? `c=${c} ` : ''}w=${inked(sw.w) ? sw.w : 2}`;
  }
  // as caixinhas como fonte do paintTo (o Alt+clique do Conta-gotas)
  const swSrc = () => ({ cmd: 'sw', fill: fillOn() ? sw.fill : inkOn() ? null : 'none', scol: inkOn() ? sw.stroke || null : null, sw: inkOn() ? sw.w : null, op: undefined });
  // as caixinhas pegam a pintura de uma linha
  function loadFrom(line) {
    const p = paintOf(line);
    if (!p) return false;
    if (OPEN.has(p.cmd)) {
      if (p.scol !== undefined) sw.stroke = p.scol || '';
      if (inked(p.sw)) sw.w = p.sw;
      return true;
    }
    const ink = inked(p.sw);
    if (p.fill !== undefined) sw.fill = p.fill !== null ? p.fill : ink && p.cmd !== 'text' ? 'none' : inkName(A.model());
    if (p.sw !== undefined && p.scol !== undefined) { sw.stroke = ink ? p.scol || '' : 'none'; if (ink) sw.w = p.sw; }
    return true;
  }
  // um papel das caixinhas (fill, stroke ou w) vai para as escolhidas; devolve quantas
  function paintSel(roles, key) {
    const lines = A.targets().filter((l) => PAINTED.has(cmdOf(l)));
    for (const l of lines) {
      const cmd = cmdOf(l), at = {};
      if (OPEN.has(cmd)) {
        if (roles.includes('stroke') && sw.stroke !== 'none') at.c = sw.stroke || null;
        if (roles.includes('w') && inked(sw.w)) at.w = sw.w;
      } else {
        const hadInk = inked(attrOf(l, 'ink'));
        let ink = hadInk;
        if (roles.includes('stroke')) {
          if (sw.stroke === 'none') { at.ink = null; at.inkc = null; ink = false; } else { at.inkc = sw.stroke || null; if (!hadInk) { at.ink = inked(sw.w) ? sw.w : DEF.w; ink = true; } }
        }
        if (roles.includes('w') && sw.stroke !== 'none' && has(cmd, 'ink')) { at.ink = inked(sw.w) ? sw.w : null; ink = inked(sw.w); }
        // sem c=, a forma com contorno fica vazia e a sem contorno fica cheia da cor do ink: ligar ou desligar o
        // contorno escreve o c= que mantém o preenchimento como estava (o texto sem c= é sempre da cor do ink)
        if (roles.includes('fill')) at.c = fillOn() ? sw.fill : ink && cmd !== 'text' ? null : 'none';
        else if (ink !== hadInk && cmd !== 'text' && attrOf(l, 'c') === null) at.c = ink ? inkName(A.model()) : 'none';
      }
      A.setAttrs([l], at, null, key);
    }
    return lines.length;
  }
  function setRole(role, v, key) {
    sw[role] = v;
    paintSel([role], key || keyNow('cor'));
    paintSw();
  }
  function defaults() {
    Object.assign(sw, DEF);
    paintSel(['fill', 'stroke', 'w'], keyNow('cor'));
    paintSw();
    A.hint('Cores padrão: preenchimento azul, contorno da cor do ink, grossura 4.', 2000);
  }
  function swap() {
    const f = sw.fill, s = sw.stroke;
    sw.fill = s === 'none' ? 'none' : s || inkName(A.model());
    sw.stroke = f;
    if (sw.stroke !== 'none' && !inked(sw.w)) sw.w = DEF.w;
    paintSel(['fill', 'stroke'], keyNow('cor'));
    paintSw();
  }
  function flipFront() { sw.front = sw.front === 'fill' ? 'stroke' : 'fill'; paintSw(); }
  function toggleBehind() {
    sw.behind = !sw.behind;
    paintSw();
    A.hint(sw.behind ? 'Desenhar atrás: as formas novas nascem atrás de tudo da camada (Shift+D volta).' : 'Desenhar normal: as formas novas nascem na frente de tudo da camada.', 2600);
  }

  // a tela das caixinhas
  const svg = (inner) => `<svg viewBox="0 0 16 16" aria-hidden="true">${inner}</svg>`;
  const NONE_BG = 'linear-gradient(to top right, transparent calc(50% - 1.2px), #e0393e calc(50% - 1.2px), #e0393e calc(50% + 1.2px), transparent calc(50% + 1.2px)), #ffffff';
  const wrap = document.createElement('div');
  wrap.className = 'tsw-wrap';
  wrap.innerHTML = `<hr><div class="tsw" data-front="fill">
      <button type="button" class="tsw-box tsw-stroke" data-role="stroke" aria-label="Contorno"><i class="ring"></i><i class="hole"></i></button>
      <button type="button" class="tsw-box tsw-fill" data-role="fill" aria-label="Preenchimento"><i class="ring"></i></button>
      <button type="button" class="tsw-mini tsw-def" title="As cores padrão (D)" aria-label="Cores padrão">${svg('<rect class="f" x="1" y="1" width="8" height="8"/><rect x="6.5" y="6.5" width="8" height="8"/>')}</button>
      <button type="button" class="tsw-mini tsw-swap" title="Trocar o preenchimento e o contorno (Shift+X)" aria-label="Trocar">${svg('<path d="M3 5.5h8.5M9.5 3l2.5 2.5L9.5 8M13 10.5H4.5M6.5 8 4 10.5 6.5 13"/>')}</button>
    </div>
    <div class="tsw-row">
      <button type="button" class="tsw-none" title="Sem cor na caixinha da frente (/)" aria-label="Nenhuma">${svg('<rect x="2.5" y="2.5" width="11" height="11" rx="1"/><path d="M3 13 13 3"/>')}</button>
      <button type="button" class="tsw-mode" aria-label="Desenhar atrás">${svg('<rect x="2" y="2" width="8" height="8" rx="1"/><rect class="f" x="6" y="6" width="8" height="8" rx="1"/>')}</button>
    </div>
    <input type="text" class="tsw-w" spellcheck="false" autocomplete="off" aria-label="Grossura do contorno">
    <input type="color" class="tsw-pick" tabindex="-1" aria-hidden="true">`;
  $('tools').appendChild(wrap);
  const swBox = wrap.querySelector('.tsw'), wIn = wrap.querySelector('.tsw-w'), pick = wrap.querySelector('.tsw-pick');
  const ringOf = (role) => wrap.querySelector(`.tsw-${role} .ring`), btnOf = (role) => wrap.querySelector(`.tsw-${role}`);
  function bgOf(v, role) {
    const m = A.model();
    if (v === 'none') return NONE_BG;
    if (!v) v = role === 'stroke' ? inkName(m) : '#14141c';
    if (m && m.gradients.has(v) && P() && P().gradStyle) return P().gradStyle(m, v).replace(/^background:/, '');
    return (P() && m && P().hexOf(v, m)) || '#888888';
  }
  const shown = (v, role) => (v === 'none' ? 'nenhum' : v || (role === 'stroke' ? 'a cor do ink' : v));
  function paintSw() {
    swBox.dataset.front = sw.front;
    ringOf('fill').style.background = bgOf(sw.fill, 'fill');
    ringOf('stroke').style.background = bgOf(sw.stroke, 'stroke');
    btnOf('fill').title = `Preenchimento (c=): ${shown(sw.fill, 'fill')}. ${sw.front === 'fill' ? 'Clique para escolher a cor' : 'Clique para trazer para a frente'}; X troca qual fica na frente.`;
    btnOf('stroke').title = `Contorno (inkc=): ${shown(sw.stroke, 'stroke')}. ${sw.front === 'stroke' ? 'Clique para escolher a cor' : 'Clique para trazer para a frente'}; X troca qual fica na frente.`;
    if (document.activeElement !== wIn) wIn.value = sw.w;
    wIn.title = 'A grossura do contorno das formas novas (ink=; na linha reta, w=). Um número ou um nome da palette.';
    wIn.classList.toggle('off', sw.stroke === 'none');
    const mode = wrap.querySelector('.tsw-mode');
    mode.classList.toggle('on', sw.behind);
    mode.title = sw.behind ? 'Desenhar atrás: as formas novas nascem atrás de tudo da camada (Shift+D: na frente)' : 'Desenhar normal: as formas novas nascem na frente de tudo da camada (Shift+D: atrás)';
  }
  let pickRole = 'fill', pickKey = '';
  function openPicker(role) {
    pickRole = role;
    pickKey = keyNow('cor');
    const m = A.model(), v = sw[role];
    pick.value = (v && v !== 'none' && P() && m && P().hexOf(v, m)) || (role === 'stroke' && !v && P() && m && P().hexOf(inkName(m), m)) || '#4a90d9';
    try { if (pick.showPicker) pick.showPicker(); else pick.click(); } catch (e) { pick.click(); }
  }
  pick.addEventListener('input', () => {
    const m = A.model(), hex = pick.value;
    setRole(pickRole, P() && m ? P().colorText(hex, m) : hex, pickKey);
    if (pickRole === 'stroke' && !inked(sw.w)) { sw.w = DEF.w; paintSw(); }
  });
  wrap.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.role) { if (sw.front !== b.dataset.role) { sw.front = b.dataset.role; paintSw(); } else openPicker(b.dataset.role); return; }
    if (b.classList.contains('tsw-def')) defaults();
    else if (b.classList.contains('tsw-swap')) swap();
    else if (b.classList.contains('tsw-none')) setRole(sw.front, 'none');
    else if (b.classList.contains('tsw-mode')) toggleBehind();
  });
  wrap.addEventListener('dblclick', (e) => { const b = e.target.closest('[data-role]'); if (b) openPicker(b.dataset.role); });
  wIn.addEventListener('change', () => {
    const v = wIn.value.trim();
    if (!v) { paintSw(); return; }
    sw.w = v;
    if (sw.stroke === 'none' && inked(v)) sw.stroke = '';
    paintSel(['w', 'stroke'], keyNow('grossura'));
    paintSw();
  });
  wIn.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' || e.key === 'Escape') { if (e.key === 'Escape') wIn.value = sw.w; wIn.blur(); view.focus && view.focus(); }
  });

  // as letras das caixinhas (com o foco no desenho): D padrão, X a da frente, Shift+X troca, / nenhuma, Shift+D modo
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || A.isFilm() || st.view3d) return;
    const t = e.target;
    if (t && t.closest && t.closest('textarea, input, select, dialog, [contenteditable]')) return;
    if (document.querySelector('.menu-pop')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'd') { e.preventDefault(); if (e.shiftKey) toggleBehind(); else defaults(); } else if (k === 'x') { e.preventDefault(); if (e.shiftKey) swap(); else flipFront(); } else if (k === '/' && !e.shiftKey) { e.preventDefault(); setRole(sw.front, 'none'); }
  });

  // escolher uma forma traz a pintura dela (e a mudança no código também)
  let lastSig = null;
  function follow() {
    if (A.isFilm()) return;
    const l = A.targets().find((x) => PAINTED.has(cmdOf(x)));
    const sig = l === undefined ? '' : l + '\u0000' + A.lineText(l);
    if (sig === lastSig) return;
    lastSig = sig;
    if (l !== undefined) loadFrom(l);
    paintSw();
  }
  const syncWrap = () => { wrap.hidden = A.isFilm() || st.view3d; };
  A.on('draw', follow);
  A.on('model', () => { syncWrap(); paintSw(); });
  A.on('view3d', syncWrap);
  A.on('tool', syncWrap);

  // ---------- as formas que nascem do arraste ----------
  const sides = { polygon: 6, star: 5 }, INNER = 0.5;
  let mk = null;
  // a forma do arraste d ({ tool, a, b, shift, alt }): { box: [x, y, w, h] }, { poly: [[x, y]…] } ou { line: [p, q] }
  function geo(d) {
    const [ax, ay] = d.a;
    let dx = d.b[0] - ax, dy = d.b[1] - ay;
    if (d.tool === 'line') {
      if (d.shift) { const len = Math.hypot(dx, dy), t = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4); dx = Math.cos(t) * len; dy = Math.sin(t) * len; }
      return { line: d.alt ? [[ax - dx, ay - dy], [ax + dx, ay + dy]] : [[ax, ay], [ax + dx, ay + dy]] };
    }
    if (d.tool === 'polygon' || d.tool === 'star') {
      // do meio para fora: o primeiro canto aponta para o mouse; com Shift, em pé (a base deitada, a estrela de pé)
      const n = sides[d.tool], k = d.tool === 'star' ? 2 * n : n, r = Math.hypot(dx, dy);
      const t0 = d.shift ? -Math.PI / 2 + (d.tool === 'polygon' && n % 2 === 0 ? Math.PI / n : 0) : Math.atan2(dy, dx);
      const poly = [];
      for (let i = 0; i < k; i++) { const rr = d.tool === 'star' && i % 2 ? r * INNER : r, t = t0 + (i * 2 * Math.PI) / k; poly.push([ax + Math.cos(t) * rr, ay + Math.sin(t) * rr]); }
      return { poly, r, n };
    }
    if (d.shift) { const s = Math.max(Math.abs(dx), Math.abs(dy)); dx = (dx < 0 ? -1 : 1) * s; dy = (dy < 0 ? -1 : 1) * s; }
    const w = Math.abs(dx) * (d.alt ? 2 : 1), h = Math.abs(dy) * (d.alt ? 2 : 1);
    return { box: [d.alt ? ax - Math.abs(dx) : Math.min(ax, ax + dx), d.alt ? ay - Math.abs(dy) : Math.min(ay, ay + dy), w, h] };
  }
  // escreve a forma do arraste no código (na frente de tudo da camada, ou atrás com o modo Desenhar atrás)
  function writeShape(d) {
    const g = geo(d), pl = A.drawPlace(sw.behind);
    if (!pl || pl.why) { if (pl) A.hint(pl.why, 3200); return; }
    const lc = (p) => pl.local(p);
    let cmd, base = d.tool, rest, what;
    if (g.box) {
      const p = lc([g.box[0], g.box[1]]), q = lc([g.box[0] + g.box[2], g.box[1] + g.box[3]]);
      const x0 = Math.min(p[0], q[0]), y0 = Math.min(p[1], q[1]), w = Math.max(Math.abs(q[0] - p[0]), 1), h = Math.max(Math.abs(q[1] - p[1]), 1);
      if (d.tool === 'rect') { cmd = 'rect'; rest = `${fx(x0)},${fx(y0)} ${fx(w)},${fx(h)} ${closedPaint()}`; what = `${fx(w)} × ${fx(h)}`; } else {
        cmd = 'ellipse';
        const rx = fx(w / 2), ry = fx(h / 2);
        rest = `${fx(x0 + w / 2)},${fx(y0 + h / 2)} ${rx === ry ? rx : `${rx},${ry}`} ${closedPaint()}`;
        what = rx === ry ? `raio ${rx}` : `${rx} × ${ry}`;
      }
    } else if (g.poly) {
      cmd = 'shape';
      rest = `${closedPaint()} : ${g.poly.map((p) => { const q = lc(p); return `${fx(q[0])},${fx(q[1])}!`; }).join(' ')}`;
      what = `${g.n} ${d.tool === 'star' ? 'pontas' : 'lados'}`;
    } else {
      cmd = 'line';
      const p = lc(g.line[0]), q = lc(g.line[1]);
      rest = `${openPaint()} : ${fx(p[0])},${fx(p[1])} ${fx(q[0])},${fx(q[1])}`;
      what = `${fx(Math.hypot(q[0] - p[0], q[1] - p[1]))} de comprimento`;
    }
    const nl = A.addLine(pl, cmd, base, rest, { key: keyNow('desenho') });
    if (nl < 0) return;
    const name = (words(nl)[1] || {}).text || '';
    A.hint(`${cmd} ${name} (${what}) na linha ${nl + 1}. As alças mudam ela; V move, A mexe nos pontos.`, 2600);
  }
  // um clique sem arrastar: a forma num tamanho que cabe no que está à vista, com o meio no clique
  function clickShape(d) {
    const z = st.view.z, c = st.model.canvas, [x, y] = d.a;
    const s = Math.max(4, Math.min(view.clientWidth / z, view.clientHeight / z, c.w, c.h) * 0.12);
    const o = { tool: d.tool };
    if (d.tool === 'rect') Object.assign(o, { a: [x - s, y - s * 0.7], b: [x + s, y + s * 0.7] });
    else if (d.tool === 'ellipse') Object.assign(o, { a: [x, y], b: [x + s, y + s], alt: true });
    else if (d.tool === 'line') Object.assign(o, { a: [x - s, y], b: [x + s, y] });
    else Object.assign(o, { a: [x, y], b: [x, y - s], shift: true });
    writeShape(o);
  }
  const mods = (d, e) => { d.shift = !!e.shiftKey; d.alt = !!e.altKey; };
  function shapeTool(tool) {
    return {
      handles: true,
      down(e) {
        const p = A.toCanvas(e);
        mk = { tool, a: A.snapPt(e, p[0], p[1]), b: null, x: e.clientX, y: e.clientY, moved: false };
        return true;
      },
      move(e) {
        if (!mk) return;
        if (!mk.moved && Math.hypot(e.clientX - mk.x, e.clientY - mk.y) < 4) return;
        mk.moved = true;
        mods(mk, e);
        const p = A.toCanvas(e);
        mk.b = A.snapPt(e, p[0], p[1]);
        A.draw();
      },
      up(e) {
        const d = mk;
        mk = null;
        if (!d || !st.model) return;
        if (!d.moved) { clickShape(d); return; }
        mods(d, e);
        writeShape(d);
      },
      overlay(ctx, z, dpr) {
        if (!mk || !mk.moved || mk.tool !== tool) return;
        const g = geo(mk);
        ctx.beginPath();
        if (g.box) {
          const [x, y, w, h] = g.box;
          if (tool === 'ellipse') ctx.ellipse(x + w / 2, y + h / 2, Math.max(w / 2, 0.01), Math.max(h / 2, 0.01), 0, 0, Math.PI * 2);
          else ctx.rect(x, y, w, h);
        } else if (g.poly) { g.poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); } else { ctx.moveTo(g.line[0][0], g.line[0][1]); ctx.lineTo(g.line[1][0], g.line[1][1]); }
        if (!g.line && fillOn()) { ctx.globalAlpha = 0.35; ctx.fillStyle = bgOf(sw.fill, 'fill').startsWith('#') ? bgOf(sw.fill, 'fill') : '#4a90d9'; ctx.fill(); ctx.globalAlpha = 1; }
        ctx.lineWidth = 1.5 / z;
        ctx.strokeStyle = '#2f8cff';
        ctx.stroke();
        // o tamanho, perto do mouse
        const label = g.box ? (tool === 'ellipse' && Math.abs(g.box[2] - g.box[3]) < 0.5 ? `raio ${fx(g.box[2] / 2)}` : `${fx(g.box[2])} × ${fx(g.box[3])}`) : g.poly ? `${g.n} ${tool === 'star' ? 'pontas' : 'lados'} · raio ${fx(g.r)}` : `${fx(Math.hypot(g.line[1][0] - g.line[0][0], g.line[1][1] - g.line[0][1]))} · ${Math.round((-Math.atan2(g.line[1][1] - g.line[0][1], g.line[1][0] - g.line[0][0]) * 180) / Math.PI)}°`;
        tag(ctx, dpr, mk.b, label);
      },
    };
  }
  // uma etiqueta escura perto de um ponto do desenho (em pixels da tela)
  function tag(ctx, dpr, at, text) {
    const sx = st.view.x + at[0] * st.view.z + 14, sy = st.view.y + at[1] * st.view.z + 20;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '11px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(20,28,38,.88)';
    ctx.fillRect(sx, sy, w, 19);
    ctx.fillStyle = '#e8eef5';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, sx + 6, sy + 10);
  }
  for (const t of ['rect', 'ellipse', 'polygon', 'star', 'line']) A.addTool(t, shapeTool(t));

  // durante o arraste: ↑ e ↓ mudam os lados (as pontas), Shift e Alt valem na hora, Esc desiste
  window.addEventListener('keydown', (e) => {
    const d = mk || gd;
    if (!d) return;
    const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (e.key === 'Escape') { stop(); mk = null; gd = null; A.draw(); return; }
    if (mk && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && sides[mk.tool]) {
      stop();
      sides[mk.tool] = Math.max(3, Math.min(64, sides[mk.tool] + (e.key === 'ArrowUp' ? 1 : -1)));
      A.hint(`${sides[mk.tool]} ${mk.tool === 'star' ? 'pontas' : 'lados'}`, 1200);
      A.draw();
      return;
    }
    if (e.key === 'Shift' || e.key === 'Alt') { stop(); mods(d, e); if (d === gd) { if (gd.moved) writeGrad(gd); } else A.draw(); }
  }, true);
  window.addEventListener('keyup', (e) => {
    const d = mk || gd;
    if (!d || (e.key !== 'Shift' && e.key !== 'Alt')) return;
    e.preventDefault();
    mods(d, e);
    if (d === gd) { if (gd.moved) writeGrad(gd); } else A.draw();
  }, true);

  // ---------- o Conta-gotas ----------
  // Clique numa forma: as escolhidas pegam o c=, o ink=, o inkc= e o opacity= dela; sem escolha, as caixinhas pegam
  // (e as próximas formas saem assim). Alt+clique pinta a forma clicada com as caixinhas.
  const DROP = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="M2 18l1-4 8.5-8.5 3 3L6 17z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/><path d="M11.5 5.5l2-2a2 2 0 0 1 3 3l-2 2z" fill="#111"/></svg>')}") 2 18, crosshair`;
  let ed = null;
  A.addTool('eyedrop', {
    cursor: () => DROP,
    down(e) { ed = { x: e.clientX, y: e.clientY }; return true; },
    move() {},
    up(e) {
      const d = ed;
      ed = null;
      if (!d || !st.model) return;
      const el = A.hitsAt(e)[0];
      if (!el) { A.hint('Clique numa forma para pegar a cor dela.', 2000); return; }
      const own = A.ownLine(el);
      if (e.altKey) {
        const l = A.linesAt(e)[0];
        if (l === undefined || !PAINTED.has(cmdOf(l))) { A.hint('Essa forma não se pinta pelo Conta-gotas (está travada ou é um use).', 2600); return; }
        paintTo([l], swSrc(), keyNow('contagotas'));
        A.hint('Pintou a forma clicada com as caixinhas de preenchimento e contorno.', 2200);
        return;
      }
      const src = own >= 0 && cmdOf(own) === el.type ? paintOf(own) : null;
      if (!src) { A.hint('Essa forma não tem cor escrita para pegar.', 2200); return; }
      const name = (words(own)[1] || {}).text || el.type;
      const to = A.targets().filter((l) => l !== own && PAINTED.has(cmdOf(l)));
      loadFrom(own);
      paintSw();
      if (!to.length) { A.hint(`As caixinhas pegaram a pintura de ${name}: as próximas formas saem assim.`, 2600); return; }
      const n = paintTo(to, src, keyNow('contagotas'));
      A.hint(n ? `${n === 1 ? 'A escolhida pegou' : `As ${n} escolhidas pegaram`} a cor, o contorno e a opacidade de ${name}.` : `As escolhidas já estavam como ${name}.`, 2600);
    },
  });

  // ---------- o Degradê ----------
  // Arraste sobre a forma (ou sobre as escolhidas): o degradê vai de onde apertou até onde soltou. Se o c= dela já é
  // um gradient só dela, ele muda de lugar; se não, nasce um gradient novo (gradient1…), da cor dela clareada até a
  // cor dela, e o c= passa a ser ele. Alt troca linear e redondo (radial); Shift anda de 45 em 45 graus.
  const GRAD_OK = new Set(['shape', 'ellipse', 'rect', 'text', 'line', 'stroke']);
  let gd = null;
  const gradOk = (l) => GRAD_OK.has(cmdOf(l));
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // a cor da forma, clareada, até a cor dela (a cor que estiver escrita: o nome da palette fica)
  function stopsFor(line) {
    const m = A.model(), c = attrOf(line, 'c');
    let end = c && c !== 'none' && !m.gradients.has(c) ? c : sw.fill !== 'none' && !m.gradients.has(sw.fill) ? sw.fill : '#4a90d9';
    const hex = (P() && P().hexOf(end, m)) || '#4a90d9';
    const light = W.geom && W.geom.lerpColor ? W.geom.lerpColor(hex, '#ffffff', 0.65) : '#ffffff';
    return `: ${light} ${end}`;
  }
  // a linha do gradient de nome name (ou -1)
  const gradLine = (ls, name) => ls.findIndex((t) => new RegExp(`^\\s*gradient\\s+${esc(name)}(\\s|$)`).test(t));
  // prepara o gradiente do arraste: o de agora (se é só das formas do arraste) ou um novo
  function prepGrad(d) {
    const m = A.model(), ls = A.editor.value.split('\n');
    const cur = d.lines.map((l) => attrOf(l, 'c'));
    const name0 = cur[0] && m.gradients.has(cur[0]) && cur.every((c) => c === cur[0]) ? cur[0] : null;
    const gl = name0 ? gradLine(ls, name0) : -1;
    if (gl >= 0) {
      const sp = L.splitLine(ls[gl]), g = m.gradients.get(name0);
      const tail = sp.colon >= 0 ? ls[gl].slice(sp.colon) : stopsFor(d.lines[0]);
      const re = new RegExp(`=${esc(name0)}(?![\\w.@])`);
      const users = ls.map((t, i) => (i !== gl && re.test(t) ? i : -1)).filter((i) => i >= 0);
      if (users.every((l) => d.lines.includes(l))) return { name: name0, gline: gl, type0: g.type, box: g.box, tail, indent: /^\s*/.exec(ls[gl])[0] };
      // o gradient é de outras formas também: um novo com as mesmas cores, só para estas
      return newGrad(d, tail, g.type, g.box);
    }
    return newGrad(d, stopsFor(d.lines[0]), 'linear', false);
  }
  function newGrad(d, tail, type, box) {
    const ls = A.editor.value.split('\n'), name = A.freeName('gradient');
    // depois da última linha palette, gradient ou pattern; sem elas, depois do canvas
    let at = -1;
    ls.forEach((t, i) => { if (/^\s*(palette|gradient|pattern)\b/.test(t)) at = i; });
    if (at < 0) at = ls.findIndex((t) => /^\s*canvas\b/.test(t));
    const gline = at + 1;
    A.insertLine(gline, `gradient ${name} ${type}${box ? ' box' : ''} 0,0 1,0 ${tail.trim()}`, d.key);
    d.lines = d.lines.map((l) => (l >= gline ? l + 1 : l));
    A.setAttrs(d.lines, { c: name }, null, d.key);
    A.setSel(d.lines);
    return { name, gline, type0: type, box, tail: tail.trim(), indent: '', fresh: true };
  }
  function writeGrad(d) {
    if (!d.lines.length || !d.b) return;
    if (!d.made) d.made = prepGrad(d);
    const G = d.made;
    let [ax, ay] = d.a, [bx, by] = d.b;
    if (d.shift) { const len = Math.hypot(bx - ax, by - ay), t = Math.round(Math.atan2(by - ay, bx - ax) / (Math.PI / 4)) * (Math.PI / 4); bx = ax + Math.cos(t) * len; by = ay + Math.sin(t) * len; }
    const type = d.alt ? (G.type0 === 'radial' ? 'linear' : 'radial') : G.type0;
    const q = A.gradCoords(d.lines[0], G.box, [[ax, ay], [bx, by]]);
    const dec = G.box ? 2 : st.view.z > 3 ? 1 : 0, f = (v) => String(Number(v.toFixed(dec)));
    let coords;
    if (type === 'linear') coords = `${f(q.pts[0][0])},${f(q.pts[0][1])} ${f(q.pts[1][0])},${f(q.pts[1][1])}`;
    else {
      const r = Math.hypot(q.px[1][0] - q.px[0][0], q.px[1][1] - q.px[0][1]) / q.rs;
      coords = `${f(q.pts[0][0])},${f(q.pts[0][1])} ${f(Math.max(G.box ? 0.01 : 1, r))}`;
    }
    A.setLines(new Map([[G.gline, `${G.indent}gradient ${G.name} ${type}${G.box ? ' box' : ''} ${coords} ${G.tail}`]]), d.key);
    d.type = type;
  }
  A.addTool('gradient', {
    down(e) {
      const p = A.toCanvas(e);
      let lines = A.targets().filter(gradOk);
      const under = A.linesAt(e).find(gradOk);
      // apertar numa forma que não estava escolhida: o degradê vai para ela
      if (under !== undefined && !lines.includes(under)) { lines = [under]; A.setSel(lines, under); }
      gd = { a: A.snapPt(e, p[0], p[1]), b: null, x: e.clientX, y: e.clientY, lines, moved: false, key: keyNow('degrade'), made: null };
      return true;
    },
    move(e) {
      if (!gd || !gd.lines.length) return;
      if (!gd.moved && Math.hypot(e.clientX - gd.x, e.clientY - gd.y) < 4) return;
      gd.moved = true;
      mods(gd, e);
      const p = A.toCanvas(e);
      gd.b = A.snapPt(e, p[0], p[1]);
      writeGrad(gd);
    },
    up(e) {
      const d = gd;
      gd = null;
      if (!d || !st.model) return;
      if (!d.lines.length) { A.hint('Arraste sobre uma forma (ou escolha uma antes): o degradê vai de onde apertou até onde soltou.', 3000); return; }
      if (!d.moved) {
        // um clique numa forma sem degradê: um degradê deitado, de uma ponta à outra dela
        const c = attrOf(d.lines[0], 'c'), m = A.model();
        if (c && m.gradients.has(c)) { A.hint(`O c= já é o gradient ${c}: arraste para mudar a direção (Alt: redondo).`, 2600); return; }
        const b = A.boxOf(d.lines);
        if (!b) return;
        Object.assign(d, { a: [b.x0, b.cy], b: [b.x1, b.cy], shift: false, alt: false });
        writeGrad(d);
      }
      A.draw();
      if (d.made) A.hint(`${d.made.fresh ? 'Gradient novo' : 'Gradient'} ${d.made.name} (${d.type === 'radial' ? 'redondo' : 'linear'}) no c=. As cores ficam na linha dele, no começo do código; Alt+arrastar troca para ${d.type === 'radial' ? 'linear' : 'redondo'}.`, 3400);
    },
    overlay(ctx, z) {
      if (!gd || !gd.moved || !gd.b) return;
      const [ax, ay] = gd.a, [bx, by] = gd.b;
      ctx.lineWidth = 3 / z;
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.lineWidth = 1.5 / z;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      for (const [x, y] of [[ax, ay], [bx, by]]) {
        ctx.beginPath();
        ctx.arc(x, y, 4.5 / z, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1.5 / z;
        ctx.strokeStyle = '#222';
        ctx.stroke();
      }
    },
  });

  // ---------- para os outros: as Amostras sem escolha pintam as caixinhas ----------
  W.draw = {
    setPaint: (role, v) => { setRole(role, v); A.hint(`A caixinha ${role === 'fill' ? 'do preenchimento' : role === 'stroke' ? 'do contorno' : 'da grossura'} pegou ${v}: as próximas formas saem assim.`, 2400); },
    paint: () => Object.assign({}, sw),
    // para a Caneta e a Curvatura (js/ui-pen.js)
    behind: () => sw.behind,
    closedPaint,
    openPaint,
    tag,
  };
  syncWrap();
  paintSw();
})(window.Weasel = window.Weasel || {});
