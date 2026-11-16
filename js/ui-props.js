/* Weasel — a coluna da direita: Propriedades e Amostras (etapa 2 do plano docs/planos/interface-illustrator.md,
   seção 11.3). O painel mostra o que está escolhido (ou a forma da linha do cursor) em campos, e cada mudança é
   escrita na linha do código, como se você tivesse digitado (um Ctrl+Z desfaz). As Amostras são a palette do
   arquivo: clicar numa cor pinta o que está escolhido. É o que deixa desenhar sem abrir o código. */
(function (W) {
  'use strict';
  const A = W.app, L = W.lang;
  if (!A || !L) return;
  const st = A.st;
  const $ = (id) => document.getElementById(id);
  const dock = $('dock');
  if (!dock) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmt = (v, d = 1) => (Number.isFinite(v) ? String(Number(v.toFixed(d))) : '');
  const num = (t) => { const v = Number(String(t).trim().replace(',', '.')); return Number.isFinite(v) ? v : NaN; };
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } },
  };
  // as seções abertas ficam guardadas neste navegador
  const cfg = { props: true, sw: true, ink: false, lock: false };
  try { Object.assign(cfg, JSON.parse(store.get('weasel.dock') || '{}')); } catch (e) { /* padrão */ }
  const saveCfg = () => store.set('weasel.dock', JSON.stringify({ props: cfg.props, sw: cfg.sw, lock: cfg.lock }));
  // os campos da caixa e do documento: números que valem como estão (sem ↺, sem apagar)
  const TF = ['tx', 'ty', 'tw', 'th', 'rot', 'cw', 'ch'];
  const DRAWN = new Set(['shape', 'stroke', 'line', 'ellipse', 'rect', 'text', 'use', 'emitter']);
  const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
  // os efeitos da camada: o valor que entra ao ligar e os campos de cada um (como o código escreve: glow=cor,raio)
  const FX = [
    { k: 'blur', label: 'Desfoque', on: '4', parts: [{ t: 'num', l: 'px' }] },
    { k: 'glow', label: 'Brilho', on: '#ffffff,12', parts: [{ t: 'color' }, { t: 'num', l: 'raio' }] },
    { k: 'shadow', label: 'Sombra', on: '#000000,4,6,8', parts: [{ t: 'color' }, { t: 'num', l: 'dx' }, { t: 'num', l: 'dy' }, { t: 'num', l: 'desf.' }] },
    { k: 'tint', label: 'Tingir', on: '#ff8a1f,0.5', parts: [{ t: 'color' }, { t: 'num', l: 'quanto' }] },
    { k: 'brightness', label: 'Claridade', on: '1.2', parts: [{ t: 'num', l: '×' }] },
    { k: 'saturate', label: 'Saturação', on: '1.5', parts: [{ t: 'num', l: '×' }] },
    { k: 'contrast', label: 'Contraste', on: '1.2', parts: [{ t: 'num', l: '×' }] },
    { k: 'hue', label: 'Matiz', on: '30', parts: [{ t: 'num', l: '°' }] },
  ];

  dock.innerHTML = `<section class="dk-sec" data-sec="props"><div class="dk-head"><b>Propriedades</b><span class="dk-what"></span><button type="button" class="x" data-close="props" title="Fechar (Janela › Propriedades abre de novo)" aria-label="Fechar">✕</button></div><div class="dk-body"></div></section>
    <section class="dk-sec" data-sec="sw"><div class="dk-head"><b>Amostras</b><span class="dk-what"></span><button type="button" class="x" data-close="sw" title="Fechar (Janela › Amostras abre de novo)" aria-label="Fechar">✕</button></div><div class="dk-body"></div></section>
    <datalist id="ppColors"></datalist><datalist id="ppFonts"><option value="sans-serif"><option value="serif"><option value="monospace"><option value="cursive"></datalist>`;
  const secP = dock.querySelector('[data-sec=props]'), secS = dock.querySelector('[data-sec=sw]');
  const bodyP = secP.querySelector('.dk-body'), bodyS = secS.querySelector('.dk-body'), whatP = secP.querySelector('.dk-what'), whatS = secS.querySelector('.dk-what');
  dock.addEventListener('click', (e) => { const b = e.target.closest('[data-close]'); if (b) toggle(b.dataset.close, false); });

  function syncDock() {
    secP.hidden = !cfg.props;
    secS.hidden = !cfg.sw;
    // no filme, a coluna some (as propriedades dos atores ficam para a etapa 7)
    dock.hidden = (!cfg.props && !cfg.sw) || !st.model || A.isFilm();
  }
  function toggle(sec, on) {
    cfg[sec] = on === undefined ? !cfg[sec] : !!on;
    saveCfg();
    syncDock();
    refresh(true);
  }

  // ---------- cores ----------
  const cx = document.createElement('canvas').getContext('2d');
  function cssHex(v) {
    cx.fillStyle = '#010203';
    cx.fillStyle = v;
    const o = cx.fillStyle;
    if (o === '#010203' && String(v).toLowerCase() !== '#010203') return null;
    if (o[0] === '#') return o;
    const mm = o.match(/rgba?\(([^)]+)\)/);
    if (!mm) return null;
    return '#' + mm[1].split(',').slice(0, 3).map((x) => Math.round(parseFloat(x)).toString(16).padStart(2, '0')).join('');
  }
  // a cor de verdade (#rrggbb) de um valor do código: #hex, nome de cor ou nome da palette
  function hexOf(v, m) {
    v = String(v || '').trim();
    for (let d = 0; m && m.palette.has(v) && typeof m.palette.get(v) === 'string' && d < 8; d++) v = String(m.palette.get(v)).trim();
    if (!v || v === 'none') return null;
    return cssHex(v);
  }
  // o que escrever para uma cor escolhida no seletor: o nome da palette, se houver um igual (seção 8 do plano)
  function colorText(hex, m) {
    for (const [k, v] of m.palette) if (typeof v === 'string' && hexOf(k, m) === hex) return k;
    return hex;
  }

  // ---------- o que está escolhido ----------
  let cur = null;
  function gather() {
    const m = st.model;
    if (!m || A.isFilm()) return null;
    const lines = A.targets(), recs = lines.map((l) => m.byLine.get(l)).filter(Boolean);
    const info = { m, lines: recs.map((r) => r.st.line), recs, cmds: recs.map((r) => r.st.cmd), kind: 'doc', layer: null };
    if (!recs.length) return info;
    if (recs.length === 1 && recs[0].st.cmd === 'layer') {
      info.kind = 'layer';
      info.layer = { L: recs[0].layer, line: info.lines[0] };
      return info;
    }
    info.kind = 'shapes';
    // a camada de cada linha: a do preenchimento (uma forma com inkon= também pinta o contorno em outra)
    const tree = A.layerTree(m), names = new Set();
    for (const r of recs) {
      const own = r.el && r.el.layer ? (typeof r.el.layer === 'string' ? r.el.layer : r.el.layer.name) : null;
      const t = own ? null : tree.find((x) => x.kids.some((k) => k.line === r.st.line));
      names.add(own || (t ? t.layer.name : ''));
    }
    if (names.size === 1) { const t = tree.find((x) => x.layer.name === [...names][0]); if (t) info.layer = { L: t.layer, line: t.line }; }
    return info;
  }
  // o valor escrito da chave nas linhas: o comum ('' se nenhuma escreve), ou null se elas diferem
  function attrOf(recs, k) {
    let v;
    for (const r of recs) { const a = r.st.attrs.get(k), t = a ? a.text : ''; if (v === undefined) v = t; else if (v !== t) return null; }
    return v === undefined ? '' : v;
  }
  function flagOf(lines, f) {
    let v;
    for (const l of lines) { const on = L.splitLine(A.lineText(l)).words.slice(1).some((w) => w.text === f); if (v === undefined) v = on; else if (v !== on) return null; }
    return !!v;
  }
  const supports = (info, k) => info.cmds.length > 0 && info.cmds.every((c) => (L.ATTRS[c] || []).includes(k));
  const allOf = (info, c) => info.cmds.length > 0 && info.cmds.every((x) => x === c);
  const box = () => (cur && cur.lines.length ? A.boxOf(cur.lines) : null);
  const canvasLine = () => A.editor.value.split('\n').findIndex((l) => /^\s*canvas\b/.test(l));
  const layerRecs = () => (cur && cur.layer && cur.layer.line >= 0 ? [cur.m.byLine.get(cur.layer.line)].filter(Boolean) : []);

  // ---------- os campos ----------
  // Cada campo sabe ler o valor de agora (get) e escrever um novo (set). key junta um arraste num Ctrl+Z só.
  const F = new Map();
  const attrField = (k, scope) => ({
    get: () => (scope === 'layer' ? attrOf(layerRecs(), k) : attrOf(cur.recs, k)),
    set: (v, key) => A.setAttrs(scope === 'layer' ? [cur.layer.line] : cur.lines, { [k]: v }, null, key),
  });
  function defineFields(info) {
    F.clear();
    // transformar: a caixa das escolhidas (sem a grossura do contorno)
    F.set('tx', { get: () => { const b = box(); return b ? fmt(b.x0) : ''; }, set: (v, key) => { const b = box(); if (b && Number.isFinite(v)) A.transformLines(cur.lines, 'move', { dx: v - b.x0, dy: 0 }, key); }, num: true });
    F.set('ty', { get: () => { const b = box(); return b ? fmt(b.y0) : ''; }, set: (v, key) => { const b = box(); if (b && Number.isFinite(v)) A.transformLines(cur.lines, 'move', { dx: 0, dy: v - b.y0 }, key); }, num: true });
    const scaleTo = (axis) => (v, key) => {
      const b = box();
      if (!b || !Number.isFinite(v) || v <= 0) return;
      const Wd = b.x1 - b.x0, Ht = b.y1 - b.y0, size = axis === 'w' ? Wd : Ht;
      if (size < 1e-6) { A.hint(axis === 'w' ? 'Sem largura para esticar (a forma é uma linha em pé).' : 'Sem altura para esticar (a forma é uma linha deitada).', 2400); return; }
      const k = v / size;
      A.transformLines(cur.lines, 'scale', axis === 'w' ? { sx: k, sy: cfg.lock ? k : 1 } : { sx: cfg.lock ? k : 1, sy: k }, key);
    };
    F.set('tw', { get: () => { const b = box(); return b ? fmt(b.x1 - b.x0) : ''; }, set: scaleTo('w'), num: true, min: 0.1 });
    F.set('th', { get: () => { const b = box(); return b ? fmt(b.y1 - b.y0) : ''; }, set: scaleTo('h'), num: true, min: 0.1 });
    // o ângulo: o rot= de uma ellipse, rect, text ou use sozinho; nas outras, um giro a partir de 0
    const rotAbs = () => cur.recs.length === 1 && ['ellipse', 'rect', 'text', 'use'].includes(cur.cmds[0]);
    F.set('rot', {
      get: () => (rotAbs() ? attrOf(cur.recs, 'rot') || '0' : '0'),
      set: (v, key) => { if (!Number.isFinite(v)) return; const deg = rotAbs() ? v - (Number(attrOf(cur.recs, 'rot')) || 0) : v; if (Math.abs(deg) > 1e-9) A.transformLines(cur.lines, 'spin', { deg }, key); },
      num: true, rel: () => !rotAbs(),
    });
    for (const k of ['c', 'inkc', 'ink', 'w', 'opacity', 'r', 'taper', 'cap', 'dash', 'size', 'font', 'align']) F.set(k, Object.assign(attrField(k), { num: ['ink', 'w', 'opacity', 'r', 'size'].includes(k) }));
    for (const f of ['bold', 'italic']) F.set(f, { get: () => flagOf(cur.lines, f), set: (on, key) => A.setAttrs(cur.lines, null, { [f]: !!on }, key), flag: true });
    // o texto entre aspas
    F.set('text', {
      get: () => { const v = cur.recs.map((r) => (r.el && r.el.type === 'text' ? r.el.str : '')); return v.every((x) => x === v[0]) ? v[0] : null; },
      set: (v, key) => {
        const t = '"' + String(v).replace(/"/g, "'") + '"';
        for (const l of cur.lines) { const ws = L.splitLine(A.lineText(l)).words, i = ws.findIndex((w) => w.text[0] === '"'); if (i > 0) A.setWord(l, i, t, key); }
      },
    });
    // a camada
    for (const k of ['opacity', 'blend']) F.set('L' + k, Object.assign(attrField(k, 'layer'), { num: k === 'opacity' }));
    for (const fx of FX) F.set('fx' + fx.k, attrField(fx.k, 'layer'));
    // o documento: o canvas L A bg=
    F.set('cw', { get: () => wordOf(canvasLine(), 1), set: (v) => { const l = canvasLine(); if (l >= 0 && v > 0) A.setWord(l, 1, fmt(v, 0)); }, num: true, min: 1 });
    F.set('ch', { get: () => wordOf(canvasLine(), 2), set: (v) => { const l = canvasLine(); if (l >= 0 && v > 0) A.setWord(l, 2, fmt(v, 0)); }, num: true, min: 1 });
    F.set('bg', {
      get: () => { const l = canvasLine(), r = l >= 0 ? info.m.byLine.get(l) : null; return r ? attrOf([r], 'bg') : ''; },
      set: (v, key) => { const l = canvasLine(); if (l >= 0) A.setAttrs([l], { bg: v }, null, key); },
    });
  }
  function wordOf(line, i) {
    if (line < 0) return '';
    const w = L.splitLine(A.lineText(line)).words[i];
    return w ? w.text : '';
  }

  // ---------- a montagem do painel ----------
  const row = (label, inner, f, extra) => `<div class="pp-row${extra || ''}"${f ? ` data-row="${f}"` : ''}><span class="pp-k${f && F.get(f) && F.get(f).num ? ' scrub' : ''}"${f ? ` data-scrub="${f}"` : ''} title="${f && F.get(f) && F.get(f).num ? 'Arraste para os lados para mudar (Shift: 10× mais)' : ''}">${label}</span>${inner}${f && !TF.includes(f) && f !== 'text' && !(F.get(f) || {}).flag ? `<button type="button" class="pp-back" data-back="${f}" title="Tirar do código (volta ao padrão)">↺</button>` : ''}</div>`;
  const numIn = (f, ph) => `<input type="text" class="pp-num" data-f="${f}" spellcheck="false" autocomplete="off"${ph ? ` placeholder="${ph}"` : ''}>`;
  const colIn = (f, ph) => `<input type="color" class="pp-col" data-col="${f}" title="Escolher a cor"><input type="text" class="pp-txt" data-f="${f}" list="ppColors" spellcheck="false" autocomplete="off" placeholder="${ph || ''}" title="#hex, um nome da palette, de cor, de degradê ou none">`;
  const txtIn = (f, ph, list) => `<input type="text" class="pp-txt" data-f="${f}"${list ? ` list="${list}"` : ''} spellcheck="false" autocomplete="off" placeholder="${ph || ''}">`;
  const selIn = (f, opts) => `<select class="pp-sel" data-f="${f}"><option value=""></option>${opts.map((o) => `<option value="${o}">${o}</option>`).join('')}</select>`;
  const grp = (title, inner, cls) => `<div class="pp-grp${cls ? ' ' + cls : ''}"><div class="pp-t">${title}</div>${inner}</div>`;

  function layerHtml(info) {
    if (!info.layer) return '';
    const Ly = info.layer.L;
    if (Ly.implicit || info.layer.line < 0) return grp(`Camada <code>${esc(Ly.name)}</code>`, `<div class="pp-note">Camada automática: para dar opacidade, mistura e efeitos, escreva uma linha <code>layer nome</code> antes das formas.</div>`);
    const fx = FX.map((x) => `<div class="pp-fx" data-fx="${x.k}"><label class="pp-chk"><input type="checkbox" data-fxon="${x.k}"> ${x.label}</label><span class="pp-fxv">${x.parts.map((p, i) => (p.t === 'color' ? `<input type="color" class="pp-col" data-fxp="${x.k}:${i}" title="Cor">` : `<input type="text" class="pp-num pp-small" data-fxp="${x.k}:${i}" spellcheck="false" autocomplete="off" title="${p.l}" placeholder="${p.l}">`)).join('')}</span></div>`).join('');
    return grp(`Camada <button type="button" class="pp-go" data-go="${info.layer.line}" title="Ir para a linha da camada no código">${esc(Ly.name)}</button>`,
      row('Opacidade', `${numIn('Lopacity', '1')}<input type="range" class="pp-range" data-range="Lopacity" min="0" max="1" step="0.05">`, 'Lopacity')
      + row('Mistura', selIn('Lblend', BLENDS), 'Lblend')
      + `<div class="pp-sub">Efeitos</div>${fx}`, 'pp-layer');
  }
  const ALIGN_BTNS = [
    ['left', 'Alinhar à esquerda (uma peça só: na prancheta)', '<path d="M2.5 2v12"/><rect x="4.5" y="4" width="8.5" height="3"/><rect x="4.5" y="9" width="5.5" height="3"/>'],
    ['hcenter', 'Alinhar no centro, na horizontal', '<path d="M8 2v12"/><rect x="3" y="4" width="10" height="3"/><rect x="5" y="9" width="6" height="3"/>'],
    ['right', 'Alinhar à direita', '<path d="M13.5 2v12"/><rect x="3" y="4" width="8.5" height="3"/><rect x="6" y="9" width="5.5" height="3"/>'],
    ['top', 'Alinhar em cima', '<path d="M2 2.5h12"/><rect x="4" y="4.5" width="3" height="8.5"/><rect x="9" y="4.5" width="3" height="5.5"/>'],
    ['vcenter', 'Alinhar no centro, na vertical', '<path d="M2 8h12"/><rect x="4" y="3" width="3" height="10"/><rect x="9" y="5" width="3" height="6"/>'],
    ['bottom', 'Alinhar embaixo', '<path d="M2 13.5h12"/><rect x="4" y="3" width="3" height="8.5"/><rect x="9" y="6" width="3" height="5.5"/>'],
    null,
    ['hdist', 'Distribuir na horizontal (três peças ou mais: os meios ficam à mesma distância)', '<rect x="1.5" y="5" width="3" height="6"/><rect x="6.5" y="3" width="3" height="10"/><rect x="11.5" y="5.5" width="3" height="5"/>'],
    ['vdist', 'Distribuir na vertical', '<rect x="5" y="1.5" width="6" height="3"/><rect x="3" y="6.5" width="10" height="3"/><rect x="5.5" y="11.5" width="5" height="3"/>'],
  ];
  function shapesHtml(info) {
    let h = '';
    if (info.cmds.some((c) => DRAWN.has(c))) {
      h += grp('Transformar', `<div class="pp-tf">
        ${row('X', numIn('tx'), 'tx')}${row('Y', numIn('ty'), 'ty')}
        ${row('L', numIn('tw'), 'tw')}${row('A', numIn('th'), 'th')}
        <button type="button" class="pp-lock${cfg.lock ? ' on' : ''}" title="Esticar sem perder a proporção" aria-pressed="${cfg.lock}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5 9.5 6.5M7 4.5l1.6-1.6a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5l-1.6 1.6a2.5 2.5 0 0 1-3.5-3.5L5.5 8"/></svg></button>
        ${row('∠', numIn('rot'), 'rot')}</div>`);
      // Alinhar (js/ui-select.js): com duas peças ou mais, na caixa de todas; com uma só, na prancheta
      if (W.sel) h += grp('Alinhar', `<div class="pp-al">${ALIGN_BTNS.map((b) => (b ? `<button type="button" data-align="${b[0]}" title="${b[1]}"><svg viewBox="0 0 16 16" aria-hidden="true">${b[2]}</svg></button>` : '<i></i>')).join('')}</div>`);
    }
    const strokeish = info.cmds.every((c) => c === 'stroke' || c === 'line');
    let ap = '';
    if (supports(info, 'c')) ap += row(strokeish ? 'Cor' : 'Preench.', colIn('c', 'padrão'), 'c');
    if (supports(info, 'inkc')) ap += row('Contorno', colIn('inkc', 'padrão'), 'inkc');
    if (supports(info, 'ink')) ap += row('Contorno px', numIn('ink', 'padrão'), 'ink');
    if (supports(info, 'w')) ap += row('Largura', numIn('w', 'padrão'), 'w');
    if (supports(info, 'r')) ap += row('Cantos', numIn('r', '0'), 'r');
    if (supports(info, 'taper')) ap += row('Afinar', txtIn('taper', 'início,fim'), 'taper');
    if (supports(info, 'cap')) ap += row('Pontas', selIn('cap', ['round', 'butt', 'square']), 'cap');
    if (supports(info, 'dash')) ap += row('Tracejado', txtIn('dash', 'traço,vão'), 'dash');
    if (supports(info, 'opacity')) ap += row('Opacidade', `${numIn('opacity', '1')}<input type="range" class="pp-range" data-range="opacity" min="0" max="1" step="0.05">`, 'opacity');
    if (ap) h += grp('Aparência', ap);
    if (allOf(info, 'text')) {
      h += grp('Texto', row('Texto', txtIn('text'), 'text')
        + row('Tamanho', numIn('size', 'padrão'), 'size')
        + row('Fonte', txtIn('font', 'sans-serif', 'ppFonts'), 'font')
        + row('Estilo', `<label class="pp-chk"><input type="checkbox" data-flag="bold"> <b>Negrito</b></label><label class="pp-chk"><input type="checkbox" data-flag="italic"> <i>Itálico</i></label>`, '')
        + row('Alinhar', selIn('align', ['left', 'center', 'right']), 'align'));
    }
    return h + layerHtml(info);
  }
  function docHtml() {
    return grp('Documento', row('Largura', numIn('cw'), 'cw') + row('Altura', numIn('ch'), 'ch') + row('Fundo', colIn('bg', 'transparente'), 'bg'))
      + '<div class="pp-note">Escolha uma forma (clique nela com a Seleção, V) para ver e mudar as propriedades dela.</div>';
  }

  let sigP = '';
  function refresh(force) {
    syncDock();
    if (dock.hidden) return;
    cur = gather();
    if (cfg.props) fillProps(force);
    if (cfg.sw) fillSwatches(force);
  }
  function fillProps(force) {
    const info = cur;
    if (!info) { bodyP.innerHTML = ''; sigP = ''; return; }
    const sig = [info.kind, info.lines.join(','), info.cmds.join(','), info.layer ? info.layer.L.name + ':' + info.layer.line : '', cfg.lock].join('|');
    if (force || sig !== sigP) {
      sigP = sig;
      defineFields(info);
      bodyP.innerHTML = info.kind === 'doc' ? docHtml() : info.kind === 'layer' ? layerHtml(info) : shapesHtml(info);
      const n = info.lines.length;
      whatP.textContent = info.kind === 'doc' ? 'documento' : info.kind === 'layer' ? `layer ${info.layer.L.name}` : n === 1 ? `${info.cmds[0]}${info.recs[0].el && info.recs[0].el.name ? ' ' + info.recs[0].el.name : info.recs[0].use ? ' ' + info.recs[0].use : ''}` : `${n} linhas`;
    }
    fillValues();
  }
  // os valores de agora, sem mexer no campo onde você está escrevendo
  function fillValues() {
    const act = document.activeElement;
    bodyP.querySelectorAll('[data-f]').forEach((el) => {
      const f = F.get(el.dataset.f);
      if (!f || el === act) return;
      const v = f.get();
      if (el.tagName === 'SELECT') { el.value = v || ''; return; }
      el.value = v === null ? '' : v;
      el.placeholder = v === null ? 'vários' : el.getAttribute('placeholder') === 'vários' ? '' : el.placeholder;
    });
    bodyP.querySelectorAll('[data-col]').forEach((el) => {
      const f = F.get(el.dataset.col);
      if (!f || el === act) return;
      const h = hexOf(f.get(), cur.m);
      el.value = h || '#000000';
      el.classList.toggle('none', !h);
    });
    bodyP.querySelectorAll('[data-range]').forEach((el) => {
      const f = F.get(el.dataset.range);
      if (!f || el === act) return;
      const v = num(f.get());
      el.value = String(Number.isFinite(v) ? v : 1);
    });
    bodyP.querySelectorAll('[data-flag]').forEach((el) => { const f = F.get(el.dataset.flag); if (!f) return; const v = f.get(); el.checked = !!v; el.indeterminate = v === null; });
    bodyP.querySelectorAll('[data-back]').forEach((el) => { const f = F.get(el.dataset.back); el.hidden = !f || f.get() === ''; });
    bodyP.querySelectorAll('[data-fx]').forEach((r) => {
      const k = r.dataset.fx, v = F.get('fx' + k).get(), on = !!v, parts = (v || '').split(',');
      const cb = r.querySelector('[data-fxon]');
      if (cb !== act) { cb.checked = on; cb.indeterminate = v === null; }
      r.classList.toggle('on', on);
      r.querySelectorAll('[data-fxp]').forEach((el) => {
        if (el === act) return;
        const i = +el.dataset.fxp.split(':')[1], t = parts[i] !== undefined ? parts[i].trim() : '';
        if (el.type === 'color') el.value = hexOf(t, cur.m) || '#000000'; else el.value = t;
        el.disabled = !on;
      });
    });
  }

  // ---------- escrever ----------
  const keyNow = (f) => `props-${f}-${Date.now()}`;
  function commit(f, raw, key) {
    const d = F.get(f);
    if (!d || !cur) return;
    const t = String(raw).trim();
    if (d.num) {
      if (t === '') { if (!TF.includes(f)) d.set(null, key); return; }
      let v = num(t);
      // ink= e w= aceitam também um nome de largura da palette (line=6)
      if (!Number.isFinite(v) && cur.m.palette.has(t) && !TF.includes(f)) { d.set(t, key); return; }
      if (!Number.isFinite(v)) { A.hint('Escreva um número.', 1600); fillValues(); return; }
      if (d.min !== undefined) v = Math.max(d.min, v);
      if (TF.includes(f)) d.set(v, key); else d.set(fmt(v, 3), key);
    } else {
      if (/\s/.test(t) && f !== 'text' && f !== 'font') { A.hint('Sem espaços aqui.', 1600); fillValues(); return; }
      d.set(f === 'font' && t ? (/^".*"$/.test(t) ? t : `"${t}"`) : t || null, key);
    }
  }
  bodyP.addEventListener('keydown', (e) => {
    const el = e.target;
    if (e.key === 'Enter' && el.matches('input[type=text]')) { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape' && el.matches('input[type=text]')) { e.preventDefault(); fillValues(); el.dataset.skip = '1'; el.blur(); }
    // ↑ e ↓ nos números: 1 (Shift: 10)
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && el.matches('.pp-num[data-f]')) {
      e.preventDefault();
      const v = num(el.value || el.placeholder || '0'), d = F.get(el.dataset.f), step = (e.shiftKey ? 10 : 1) * (['opacity', 'Lopacity'].includes(el.dataset.f) ? 0.05 : 1);
      if (!Number.isFinite(v) || !d) return;
      el.value = fmt(v + (e.key === 'ArrowUp' ? step : -step), 3);
      commit(el.dataset.f, el.value, 'props-arrow-' + el.dataset.f);
    }
  });
  bodyP.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.skip) { delete el.dataset.skip; return; }
    if (el.matches('[data-f]')) { commit(el.dataset.f, el.value, keyNow(el.dataset.f)); return; }
    if (el.matches('[data-flag]')) { F.get(el.dataset.flag).set(el.checked, keyNow(el.dataset.flag)); return; }
    if (el.matches('[data-fxon]')) {
      const fx = FX.find((x) => x.k === el.dataset.fxon);
      F.get('fx' + fx.k).set(el.checked ? fx.on : null, keyNow('fx'));
      return;
    }
    if (el.matches('[data-fxp]') && el.type !== 'color') writeFx(el, keyNow('fx'));
  });
  // o seletor de cor escreve enquanto você arrasta (tudo num Ctrl+Z só)
  let colKey = '';
  bodyP.addEventListener('focusin', (e) => { if (e.target.type === 'color' || e.target.type === 'range') colKey = keyNow('drag'); });
  bodyP.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches('[data-col]')) {
      const f = el.dataset.col, txt = bodyP.querySelector(`[data-f="${f}"]`), v = colorText(el.value, cur.m);
      if (txt) txt.value = v;
      F.get(f).set(v, colKey || keyNow(f));
    } else if (el.matches('[data-range]')) {
      const f = el.dataset.range, txt = bodyP.querySelector(`[data-f="${f}"]`);
      if (txt) txt.value = el.value;
      F.get(f).set(fmt(+el.value, 2), colKey || keyNow(f));
    } else if (el.matches('[data-fxp]') && el.type === 'color') writeFx(el, colKey || keyNow('fx'));
  });
  function writeFx(el, key) {
    const [k] = el.dataset.fxp.split(':'), fx = FX.find((x) => x.k === k), r = el.closest('[data-fx]');
    const parts = fx.parts.map((p, i) => { const inp = r.querySelector(`[data-fxp="${k}:${i}"]`); return p.t === 'color' ? colorText(inp.value, cur.m) : (inp.value.trim() || ''); });
    while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
    if (parts.some((p, i) => fx.parts[i].t === 'num' && p !== '' && !Number.isFinite(num(p)))) { A.hint('Escreva um número.', 1600); return; }
    F.get('fx' + k).set(parts.join(','), key);
  }
  bodyP.addEventListener('click', (e) => {
    const b = e.target.closest('[data-back]');
    if (b) { F.get(b.dataset.back).set(null, keyNow('back')); return; }
    const go = e.target.closest('[data-go]');
    if (go) { A.gotoCode(+go.dataset.go, 0); return; }
    if (e.target.closest('.pp-lock')) { cfg.lock = !cfg.lock; saveCfg(); refresh(true); }
    const al = e.target.closest('[data-align]');
    if (al && W.sel) W.sel.align(al.dataset.align);
  });
  // arrastar o nome de um campo de número muda o valor (cada passo parte do texto do começo do arraste)
  bodyP.addEventListener('pointerdown', (e) => {
    const k = e.target.closest('[data-scrub]');
    const f = k && k.dataset.scrub, d = f && F.get(f);
    if (!d || !d.num || e.button !== 0 || !cur) return;
    e.preventDefault();
    try { k.setPointerCapture(e.pointerId); } catch (err) { /* já solto */ }
    const lines = cur.lines.slice(), start = new Map(lines.map((l) => [l, A.lineText(l)])), key = keyNow('scrub');
    const layerLine = cur.layer ? cur.layer.line : -1, startL = layerLine >= 0 ? A.lineText(layerLine) : null;
    const base = num(d.get() || (f.endsWith('opacity') ? '1' : '0')), small = ['opacity', 'Lopacity'].includes(f);
    const step = small ? 0.01 : Math.abs(base) < 10 && !TF.includes(f) ? 0.1 : 1;
    const x0 = e.clientX;
    let last = null;
    const move = (ev) => {
      let v = (Number.isFinite(base) ? base : 0) + Math.round((ev.clientX - x0) / 2) * step * (ev.shiftKey ? 10 : 1);
      if (small) v = Math.max(0, Math.min(1, v));
      if (d.min !== undefined) v = Math.max(d.min, v);
      v = Number(v.toFixed(3));
      if (v === last) return;
      last = v;
      // volta ao texto do começo e aplica o valor inteiro (sem somar arredondamentos)
      const back = new Map(start);
      if (startL !== null) back.set(layerLine, startL);
      A.setLines(back, key);
      commit(f, String(v), key);
    };
    const up = () => { k.removeEventListener('pointermove', move); k.removeEventListener('pointerup', up); k.removeEventListener('pointercancel', up); };
    k.addEventListener('pointermove', move);
    k.addEventListener('pointerup', up);
    k.addEventListener('pointercancel', up);
  });

  // ---------- Amostras ----------
  let sigS = '';
  function fillSwatches(force) {
    const m = st.model;
    if (!m) return;
    const cols = [...m.palette].filter(([, v]) => typeof v === 'string' && hexOf(v, m));
    const widths = [...m.palette].filter(([, v]) => typeof v === 'number' || (typeof v === 'string' && Number.isFinite(Number(v)) && !hexOf(v, m)));
    const grads = [...m.gradients.keys()], pats = [...m.patterns.keys()], vars = m.variants || [];
    const sig = JSON.stringify([cols.map(([k]) => [k, hexOf(k, m)]), widths, grads, pats, vars, st.variant, cfg.ink]);
    // a lista do campo de cor: os nomes que valem em c= e inkc=
    $('ppColors').innerHTML = ['none', ...cols.map(([k]) => k), ...grads, ...pats].map((n) => `<option value="${esc(n)}">`).join('');
    if (!force && sig === sigS) return;
    sigS = sig;
    whatS.textContent = cols.length ? `${cols.length} ${cols.length > 1 ? 'cores' : 'cor'}` : '';
    const chip = (name, style, kind, title) => `<button type="button" class="sw-chip ${kind}" data-sw="${esc(name)}" data-kind="${kind}" title="${esc(title)}"><span class="sw-c" style="${style}"></span><span class="sw-n">${esc(name)}</span></button>`;
    let h = `<div class="sw-to" role="radiogroup" aria-label="Aplicar em"><span>Aplicar em</span><button type="button" data-to="fill" class="${cfg.ink ? '' : 'on'}" title="Clicar numa cor pinta o preenchimento (c=). Alt+clique pinta o outro">Preenchimento</button><button type="button" data-to="ink" class="${cfg.ink ? 'on' : ''}" title="Clicar numa cor pinta o contorno (inkc=; no stroke e na line, a cor). Alt+clique pinta o outro">Contorno</button></div>`;
    if (vars.length) h += `<div class="pp-sub">Variantes</div><div class="sw-vars"><button type="button" data-var="" class="${st.variant ? '' : 'on'}">padrão</button>${vars.map((v) => `<button type="button" data-var="${esc(v)}" class="${st.variant === v ? 'on' : ''}">${esc(v)}</button>`).join('')}</div>`;
    h += `<div class="pp-sub">Cores <button type="button" class="sw-add" title="Põe na palette a cor do preenchimento da forma escolhida (com um nome novo, cor1, cor2…)">+ nova</button></div>`;
    h += cols.length ? `<div class="sw-grid">${cols.map(([k, v]) => chip(k, `background:${hexOf(k, m)}`, 'color', `${k} = ${v}  (duplo clique: ir para a palette no código)`)).join('')}</div>`
      : '<div class="pp-note">Sem cores com nome. Uma linha <code>palette pele=#f2c79b</code> dá nome a uma cor, e ela aparece aqui.</div>';
    if (widths.length) h += `<div class="pp-sub">Larguras</div><div class="sw-grid">${widths.map(([k, v]) => chip(k, `height:${Math.max(1, Math.min(10, Number(v)))}px;align-self:center;background:currentColor`, 'width', `${k} = ${v} (vai para o ink=, ou para o w= do stroke e da line)`)).join('')}</div>`;
    if (grads.length) h += `<div class="pp-sub">Degradês</div><div class="sw-grid">${grads.map((k) => chip(k, gradStyle(m, k), 'grad', `gradient ${k}`)).join('')}</div>`;
    if (pats.length) h += `<div class="pp-sub">Padrões</div><div class="sw-grid">${pats.map((k) => chip(k, 'background:repeating-linear-gradient(45deg,#8a96a3 0 2px,transparent 2px 6px)', 'pat', `pattern ${k}`)).join('')}</div>`;
    bodyS.innerHTML = h;
  }
  function gradStyle(m, k) {
    const g = m.gradients.get(k), stops = g && (g.stops || g.colors);
    if (!stops || !stops.length) return 'background:linear-gradient(90deg,#666,#ccc)';
    const list = stops.map((s, i) => { const c = typeof s === 'string' ? s : s.c || s.color; const at = typeof s === 'object' && s.at !== undefined ? s.at : i / Math.max(1, stops.length - 1); return `${hexOf(c, m) || '#888'} ${Math.round(at * 100)}%`; });
    return `background:linear-gradient(90deg,${list.join(',')})`;
  }
  // a cor vai para o que está escolhido; sem escolha, para as caixinhas de preenchimento e contorno da barra de
  // ferramentas (js/ui-draw.js): as próximas formas desenhadas saem com ela
  function applySwatch(name, kind, alt) {
    const info = gather();
    if (!info || info.kind !== 'shapes') {
      if (W.draw && !A.isFilm()) { W.draw.setPaint(kind === 'width' ? 'w' : cfg.ink !== !!alt ? 'stroke' : 'fill', name); return; }
      A.hint('Escolha uma forma (clique nela com a Seleção, V) para pintar com a amostra.', 2600);
      return;
    }
    const ink = cfg.ink !== !!alt, key = keyNow('sw');
    const by = new Map();
    const put = (k, line) => { if (!by.has(k)) by.set(k, []); by.get(k).push(line); };
    info.recs.forEach((r, i) => {
      const c = info.cmds[i], ok = (k) => (L.ATTRS[c] || []).includes(k), line = info.lines[i];
      if (kind === 'width') { if (ok('ink')) put('ink', line); else if (ok('w')) put('w', line); return; }
      if (ink && ok('inkc')) put('inkc', line);
      else if (ok('c')) put('c', line);
    });
    if (!by.size) { A.hint('Estas linhas não aceitam essa amostra.', 2200); return; }
    for (const [k, lines] of by) A.setAttrs(lines, { [k]: name }, null, key);
  }
  bodyS.addEventListener('click', (e) => {
    const to = e.target.closest('[data-to]');
    if (to) { cfg.ink = to.dataset.to === 'ink'; refresh(true); return; }
    const v = e.target.closest('[data-var]');
    if (v) { A.setVariant(v.dataset.var); return; }
    if (e.target.closest('.sw-add')) { addColor(); return; }
    const c = e.target.closest('[data-sw]');
    if (c) applySwatch(c.dataset.sw, c.dataset.kind, e.altKey);
  });
  bodyS.addEventListener('dblclick', (e) => {
    const c = e.target.closest('[data-sw]');
    if (!c) return;
    const name = c.dataset.sw, re = c.dataset.kind === 'grad' ? new RegExp(`^\\s*gradient\\s+${name}\\b`) : c.dataset.kind === 'pat' ? new RegExp(`^\\s*pattern\\s+${name}\\b`) : new RegExp(`^\\s*palette\\b.*\\b${name}=`);
    const line = A.editor.value.split('\n').findIndex((l) => re.test(l));
    if (line >= 0) A.gotoCode(line, 0);
  });
  bodyS.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  // + nova: a cor do preenchimento da primeira escolhida entra na palette com um nome livre (cor1, cor2…)
  function addColor() {
    const m = st.model, info = gather();
    let hex = null;
    if (info && info.kind === 'shapes') for (const r of info.recs) { const a = r.st.attrs.get('c'); hex = a ? hexOf(a.text, m) : null; if (hex) break; }
    if (!hex) { A.hint('Escolha uma forma pintada com uma cor (c=#hex) para guardar a cor dela na palette.', 2800); return; }
    for (const [k] of m.palette) if (hexOf(k, m) === hex) { A.hint(`Essa cor já está na palette: ${k}.`, 2400); return; }
    let i = 1;
    while (m.palette.has('cor' + i)) i++;
    const name = 'cor' + i, key = keyNow('pal'), lines = A.editor.value.split('\n');
    const pl = lines.findIndex((l) => /^\s*palette\b/.test(l));
    if (pl >= 0) {
      const t = lines[pl], sp = L.splitLine(t), ws = sp.words, end = ws[ws.length - 1].to;
      A.setLines(new Map([[pl, t.slice(0, end) + ` ${name}=${hex}` + t.slice(end)]]), key);
    }
    // a forma escolhida passa a usar o nome
    let ls = info && info.kind === 'shapes' ? info.recs.filter((r) => { const a = r.st.attrs.get('c'); return a && hexOf(a.text, m) === hex; }).map((r) => r.st.line) : [];
    if (pl < 0) {
      const cl = lines.findIndex((l) => /^\s*canvas\b/.test(l));
      A.insertLine(cl + 1, `palette ${name}=${hex}`, key);
      // a linha nova empurra as de baixo uma para baixo
      ls = ls.map((l) => (l >= cl + 1 ? l + 1 : l));
    }
    if (ls.length) A.setAttrs(ls, { c: name }, null, key);
    A.hint(`Cor guardada na palette como ${name} (renomeie no código, se quiser).`, 2800);
  }

  // ---------- para os menus Texto e Efeito (js/ui-shell.js) ----------
  W.props = {
    toggle,
    isOn: (sec) => !!cfg[sec],
    textOn: () => { const i = gather(); return !!i && allOf(i, 'text'); },
    flag: (f) => { const i = gather(); if (!i || !allOf(i, 'text')) { A.hint('Escolha um texto.', 1800); return; } A.setAttrs(i.lines, null, { [f]: !flagOf(i.lines, f) }, keyNow(f)); },
    flagOn: (f) => { const i = gather(); return !!i && allOf(i, 'text') && flagOf(i.lines, f) === true; },
    align: (a) => { const i = gather(); if (!i || !allOf(i, 'text')) { A.hint('Escolha um texto.', 1800); return; } A.setAttrs(i.lines, { align: a === 'left' ? null : a }, null, keyNow('align')); },
    alignOn: (a) => { const i = gather(); return !!i && allOf(i, 'text') && (attrOf(i.recs, 'align') || 'left') === a; },
    bump: (d) => {
      const i = gather();
      if (!i || !allOf(i, 'text')) { A.hint('Escolha um texto.', 1800); return; }
      const key = keyNow('size');
      i.recs.forEach((r) => { const v = Math.max(1, Math.round((r.el.size || 16) * (d > 0 ? 1.2 : 1 / 1.2))); A.setAttrs([r.st.line], { size: String(v) }, null, key); });
    },
    layerOk: () => { const i = gather(); return !!(i && i.layer && !i.layer.L.implicit && i.layer.line >= 0); },
    fxOn: (k) => { const i = gather(); if (!i || !i.layer || i.layer.line < 0) return false; const r = i.m.byLine.get(i.layer.line); return !!(r && r.st.attrs.has(k)); },
    fx: (k) => {
      const i = gather();
      if (!i || !i.layer || i.layer.L.implicit || i.layer.line < 0) { A.hint('Os efeitos são da camada: escolha uma forma de uma camada escrita (layer nome).', 3000); return; }
      const r = i.m.byLine.get(i.layer.line), fx = FX.find((x) => x.k === k), on = !!(r && r.st.attrs.has(k));
      A.setAttrs([i.layer.line], { [k]: on ? null : fx.on }, null, keyNow('fx'));
      if (!on) A.hint(`${fx.label} na camada ${i.layer.L.name}. Os números ficam em Propriedades.`, 2400);
    },
    fxNone: () => {
      const i = gather();
      if (!i || !i.layer || i.layer.line < 0) return;
      const off = {};
      for (const x of FX) off[x.k] = null;
      A.setAttrs([i.layer.line], off, null, keyNow('fx'));
    },
    FX,
    // as cores para as caixinhas da barra de ferramentas (js/ui-draw.js)
    hexOf: (v, m) => hexOf(v, m || A.model()),
    colorText: (hex, m) => colorText(hex, m || A.model()),
    gradStyle: (m, k) => gradStyle(m, k),
  };

  A.on('draw', () => refresh(false));
  A.on('model', () => refresh(false));
  A.on('layout', () => refresh(false));
  syncDock();
  refresh(true);
})(window.Weasel = window.Weasel || {});
