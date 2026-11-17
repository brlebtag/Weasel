/* Weasel — as camadas completas (etapa 6a do plano docs/planos/interface-illustrator.md, seção 11.7). O painel
   Camadas vai para a coluna da direita (numa tela estreita, continua por cima do desenho). Nele, arrastar uma linha
   muda o lugar dela na pilha ou leva para outra camada, e arrastar uma camada muda a ordem das camadas; o ＋ cria
   uma camada, a lixeira apaga uma, e o duplo clique num nome renomeia (com as linhas que apontam para ele). O menu
   Objeto › Mandar para a camada leva a escolha. Cada gesto é uma edição só do código (um Ctrl+Z desfaz). */
(function (W) {
  'use strict';
  const A = W.app, L = W.lang, S = W.sel;
  if (!A || !L || !S || !S.kit) return;
  const K = S.kit, st = A.st;
  const $ = (id) => document.getElementById(id);
  const panel = $('layerPanel'), dock = $('dock'), stage = $('stage');
  if (!panel) return;
  const P = () => W.props || null;
  const many = K.many;
  const model = () => (A.isFilm() ? null : st.model);
  const src = () => A.editor.value.split('\n');
  const word = (t) => { const w = L.splitLine(t || '').words[0]; return w ? w.text : ''; };

  // ---------- na coluna da direita ----------
  // Entre as Propriedades e as Amostras; numa tela estreita (onde a coluna some), por cima do desenho, como antes
  const narrow = window.matchMedia('(max-width: 640px)');
  function place() {
    const want = dock && !narrow.matches ? dock : stage;
    if (panel.parentNode !== want) {
      if (want === dock) dock.insertBefore(panel, dock.querySelector('[data-sec=sw]') || null);
      else stage.appendChild(panel);
    }
    panel.classList.toggle('docked', want === dock);
    A.fillLayers();
    if (P() && P().sync) P().sync();
  }
  narrow.addEventListener('change', place);
  // aberto ou fechado: guardado com as outras partes da coluna (no filme, o painel some sem mudar isso)
  new MutationObserver(() => {
    if (P() && P().sync) P().sync();
    if (!A.isFilm() && st.model && panel.classList.contains('docked') && P() && P().setCfg) P().setCfg('layers', !panel.hidden);
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  function reopen() {
    if (!model() || !panel.hidden || !panel.classList.contains('docked') || !(P() && P().isOn('layers'))) return;
    $('layerBtn').click();
  }

  // ---------- os pedaços do código ----------
  // a peça de uma linha para pôr outra antes ou depois dela: a linha, ou o repeat inteiro em volta (dentro do
  // grupo dela); com o grupo (whole), também o grupo inteiro
  function unitAround(bl, line, whole) {
    let a = line, b = line;
    for (const k of bl) if ((whole || k.kind !== 'group') && k.a <= line && line <= k.b && k.kind !== 'def') { a = Math.min(a, k.a); b = Math.max(b, k.b); }
    return [a, b];
  }
  // o trecho de uma camada de verdade: os comentários de cima, a linha layer e as linhas até a última peça dela
  // (o que vem depois, como as anim no fim do arquivo, fica onde está)
  function layerSpan(m, s, bl, li) {
    const tree = A.layerTree(m), t = tree[li];
    if (!t || t.line < 0) return null;
    const lu = K.layerUnits(m, s, bl).find((x) => x.t.layer === t.layer);
    let end = t.line;
    for (const u of (lu ? lu.us : [])) end = Math.max(end, u.b);
    return { a: K.noteTop(s, t.line, -1), b: end, t };
  }
  // onde entra uma peça na frente de tudo da camada li (no fim dela)
  function layerFront(m, s, bl, li) {
    const tree = A.layerTree(m), t = tree[li];
    const lu = K.layerUnits(m, s, bl).find((x) => x.t.layer === t.layer);
    const us = lu ? lu.us : [];
    if (us.length) { const last = us[us.length - 1]; return { at: last.b + 1, ind: K.indentOf(s[last.a]) }; }
    if (t.line >= 0) return { at: t.line + 1, ind: K.indentOf(s[t.line]) };
    // a camada automática vazia: antes da primeira camada de verdade (ou no fim)
    const first = tree.find((x) => x.line >= 0);
    return { at: first ? K.noteTop(s, first.line, -1) : s.length, ind: '' };
  }

  // ---------- mover linhas: para antes ou depois de outra, ou para a frente de uma camada ----------
  // to: { line, after } ou { li }. As peças vão juntas, na ordem do código, com os comentários de cima.
  function moveRows(lines, to, quiet) {
    const m = model();
    if (!m || !K.ready('mudar de camada')) return false;
    const s = src(), bl = K.blocks(s), us = K.unitsOf(lines, s);
    if (!us.length) return false;
    if (us.some((u) => u.b >= s.length)) { A.hint('Um bloco está sem end: feche no código antes de mudar de lugar.', 3000); return false; }
    // o lugar de chegada, no código de agora
    let at, ind;
    if (to.li !== undefined) ({ at, ind } = layerFront(m, s, bl, to.li));
    else {
      const [a, b] = unitAround(bl, to.line, false);
      at = to.after ? b + 1 : K.noteTop(s, a, -1);
      ind = K.indentOf(s[a]);
    }
    // o que sai (com os comentários de cima) e o que fica
    const take = new Set(), pieces = [];
    us.forEach((u, i) => {
      const top = K.noteTop(s, u.a, i ? us[i - 1].b : -1), base = K.indentOf(s[u.a]);
      const rows = [];
      for (let j = top; j <= u.b; j++) { take.add(j); rows.push({ from: j, text: K.reindent(s[j], base, ind) }); }
      pieces.push(rows);
    });
    const rest = [], from = [];
    let ins = -1;
    s.forEach((t, i) => { if (i === at) ins = rest.length; if (!take.has(i)) { rest.push(t); from.push(i); } });
    if (ins < 0) ins = rest.length;
    const add = pieces.flat(), next = rest.slice(0, ins).concat(add.map((r) => r.text), rest.slice(ins));
    const orig = from.slice(0, ins).concat(add.map((r) => r.from), from.slice(ins));
    if (next.join('\n') === s.join('\n')) { if (!quiet) A.hint('Já está aí.', 1600); return false; }
    K.rewrite(next, 'layers' + Date.now());
    const pos = new Map(orig.map((o, i) => [o, i]));
    const fresh = lines.map((l) => pos.get(l)).filter((l) => l !== undefined);
    A.setSel(fresh, fresh[0]);
    if (!quiet) {
      const t = to.li !== undefined ? A.layerTree(st.model)[to.li] : null, ly = A.layerOf(fresh[0]);
      const name = t ? t.layer.name : ly ? ly.name : (st.model.layers[0] || {}).name || 'base';
      A.hint(`${many(fresh.length, 'linha', 'linhas')} ${t ? `na frente da camada ${name}` : `na camada ${name}`}. Ctrl+Z desfaz.`, 2400);
    }
    return true;
  }

  // ---------- mover uma camada inteira ----------
  // to: { li, after }: antes ou depois da camada li (a automática fica sempre no fundo)
  function moveLayer(li, to) {
    const m = model();
    if (!m || !K.ready('mudar a ordem das camadas')) return false;
    const s = src(), bl = K.blocks(s), tree = A.layerTree(m), me = layerSpan(m, s, bl, li);
    if (!me) { A.hint('A camada automática (as linhas antes do primeiro layer) fica sempre no fundo.', 3000); return false; }
    const t = tree[to.li];
    let at;
    if (!t || t.line < 0) { const first = tree.find((x) => x.line >= 0); at = first ? K.noteTop(s, first.line, -1) : s.length; } else {
      const sp = layerSpan(m, s, bl, to.li);
      at = to.after ? sp.b + 1 : sp.a;
    }
    // a linha em branco de antes (a que separa as camadas) vai junto; na chegada, uma em branco antes e depois
    const a0 = me.a > 0 && !s[me.a - 1].trim() ? me.a - 1 : me.a;
    if (at >= a0 && at <= me.b + 1) { A.hint('A camada já está aí.', 1600); return false; }
    const block = s.slice(me.a, me.b + 1), rest = s.slice(0, a0).concat(s.slice(me.b + 1));
    const ins = at > me.b ? at - (me.b + 1 - a0) : at;
    const pre = ins > 0 && rest[ins - 1].trim() ? [''] : [], post = ins < rest.length && rest[ins].trim() ? [''] : [];
    K.rewrite(rest.slice(0, ins).concat(pre, block, post, rest.slice(ins)), 'layers' + Date.now());
    // o cursor vai para a linha da camada (ela passa a ser onde se desenha)
    A.editor.reveal(ins + pre.length + (me.t.line - me.a), 0);
    A.deselect();
    A.hint(`Camada ${me.t.layer.name} ${t && t.line >= 0 ? (to.after ? `na frente da camada ${t.layer.name}` : `atrás da camada ${t.layer.name}`) : 'logo na frente da automática'}: no código, o bloco dela mudou de lugar. Ctrl+Z desfaz.`, 2800);
    return true;
  }

  // ---------- criar e apagar ----------
  // A camada nova (layer1, layer2…) entra logo acima da camada onde se desenha e passa a ser ela (o cursor vai para
  // a linha dela)
  function add() {
    const m = model();
    if (!m || !K.ready('criar uma camada')) return;
    const s = src(), bl = K.blocks(s), tree = A.layerTree(m), Ly = A.drawLayer(), name = A.freeName('layer');
    const li = tree.findIndex((t) => t.layer === Ly);
    let at;
    if (li >= 0 && tree[li].line >= 0) at = layerSpan(m, s, bl, li).b + 1;
    else { const first = tree.find((x) => x.line >= 0); at = first ? K.noteTop(s, first.line, -1) : s.length; }
    const ed = A.editor, v = ed.value, gap = at > 0 && (s[at - 1] || '').trim() ? '\n' : '';
    let off, txt, caret;
    if (at >= s.length) {
      const bare = !v.length || v.endsWith('\n');
      off = v.length;
      txt = (bare ? '' : '\n') + gap + `layer ${name}`;
      caret = off + txt.length;
    } else {
      off = ed.lineStart(at);
      txt = gap + `layer ${name}\n` + (s[at].trim() ? '\n' : '');
      caret = off + gap.length + `layer ${name}`.length;
    }
    ed.replaceRange(off, off, txt, { key: 'layer' + Date.now(), select: [caret, caret] });
    A.deselect();
    if (panel.hidden) $('layerBtn').click();
    A.hint(`Camada ${name}: o que você desenhar agora entra nela. Duplo clique no nome (no painel Camadas) renomeia.`, 3200);
  }
  // apaga a camada e as linhas que desenham nela (com os comentários de cima); o resto do trecho (key, anim…) fica
  function del(li) {
    const m = model();
    if (!m || !K.ready('apagar uma camada')) return;
    const s = src(), bl = K.blocks(s), tree = A.layerTree(m), t = tree[li];
    if (!t || t.line < 0) return;
    const lu = K.layerUnits(m, s, bl).find((x) => x.t.layer === t.layer), drop = new Set();
    for (let j = K.noteTop(s, t.line, -1); j <= t.line; j++) drop.add(j);
    let n = 0;
    for (const u of (lu ? lu.us : [])) { for (let j = u.top; j <= u.b; j++) drop.add(j); n++; }
    // a linha em branco que separava a camada da de cima também sai
    const first = Math.min(...drop);
    if (first > 0 && !s[first - 1].trim() && (first - 1 === 0 || !drop.has(first - 2))) drop.add(first - 1);
    K.rewrite(s.filter((_, i) => !drop.has(i)), 'layerdel' + Date.now());
    A.deselect();
    const refs = new RegExp(`(^|[=,.\\s])${t.layer.name}(?![\\w-])`).test(A.editor.value);
    A.hint(`Camada ${t.layer.name} apagada${n ? `, com ${many(n, 'linha', 'linhas')}` : ''}.${refs ? ' Alguma linha ainda usava o nome dela: o código avisa onde.' : ''} Ctrl+Z desfaz.`, 3400);
  }

  // ---------- renomear: duplo clique no nome ----------
  let ren = null;
  function startRename(row) {
    const isLayer = row.classList.contains('lp-layer');
    const tree = A.layerTree(st.model), t = isLayer ? tree[+row.dataset.li] : null;
    const line = isLayer ? (t ? t.line : -1) : +row.dataset.line;
    if (line < 0) { A.hint('A camada automática não tem linha: escreva um layer no código para dar um nome às formas de antes dele.', 3400); return; }
    const old = A.nameOf(line);
    if (!old) {
      const cmd = word(A.lineText(line));
      A.hint(cmd === 'use' ? 'O use não tem nome: renomeie o def dele no painel Símbolos.' : cmd === 'include' ? 'O include não tem nome: ele traz o outro arquivo.' : 'Esta linha não tem nome para trocar.', 3000);
      return;
    }
    const target = row.querySelector(isLayer ? '.ln' : '.nm');
    if (!target) return;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'lp-ren';
    inp.value = old;
    inp.spellcheck = false;
    inp.autocomplete = 'off';
    inp.setAttribute('aria-label', 'Nome novo');
    target.hidden = true;
    target.after(inp);
    ren = { inp, target, line, old };
    inp.focus();
    inp.select();
    const done = (ok) => {
      if (!ren || ren.inp !== inp) return;
      const val = inp.value.trim();
      ren = null;
      inp.remove();
      target.hidden = false;
      if (!ok || !val || val === old) return;
      const r = A.rename(line, val);
      if (r.why) { A.hint(`Não renomeei: ${r.why}.`, 3200); return; }
      const others = r.n - 1;
      A.hint(`${old} → ${val}${r.only ? ' (só nesta linha: outra linha também cria esse nome)' : others ? ` e ${many(others, 'palavra que apontava para ele', 'palavras que apontavam para ele')}` : ''}. Ctrl+Z desfaz.`, 3200);
    };
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); done(false); }
    });
    inp.addEventListener('blur', () => done(true));
    inp.addEventListener('click', (e) => e.stopPropagation());
    inp.addEventListener('pointerdown', (e) => e.stopPropagation());
  }
  panel.addEventListener('dblclick', (e) => {
    if (e.target.closest('.lp-eye, .lp-lock, .lp-del, .tw, .lp-ren, .rp-head')) return;
    const row = e.target.closest('.lp-layer, .lp-el');
    if (row && e.target.closest('.ln, .nm, .ty, .lp-el')) startRename(row);
  });

  // ---------- arrastar no painel ----------
  let drag = null, swallow = false;
  const SKIP = '.lp-eye, .lp-lock, .lp-del, .tw, .lp-ren, .lp-add, .x, input, select';
  panel.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest(SKIP)) return;
    const row = e.target.closest('.lp-layer, .lp-el');
    if (!row || !model()) return;
    drag = { row, x: e.clientX, y: e.clientY, on: false, to: null };
  });
  function scroller() { return panel.classList.contains('docked') ? dock : panel; }
  function rowsOf(li) {
    const tree = panel.querySelector('.lp-tree'), out = [];
    let on = false;
    for (const r of tree.querySelectorAll('.lp-layer, .lp-el')) {
      if (r.classList.contains('lp-layer')) { if (on) break; on = +r.dataset.li === li; }
      if (on) out.push(r);
    }
    return out;
  }
  // a camada (li) de uma linha da árvore
  function liOf(row) {
    let r = row;
    while (r && !(r.classList && r.classList.contains('lp-layer'))) r = r.previousElementSibling;
    return r ? +r.dataset.li : -1;
  }
  function mark() {
    const box = panel.querySelector('.lp-tree');
    let bar = box.querySelector('.lp-drop');
    panel.querySelectorAll('.drop-in').forEach((r) => r.classList.remove('drop-in'));
    const to = drag && drag.to;
    if (!to || to.into !== undefined) {
      if (bar) bar.hidden = true;
      if (to && to.into !== undefined) { const r = panel.querySelector(`.lp-layer[data-li="${to.into}"]`); if (r) r.classList.add('drop-in'); }
      return;
    }
    if (!bar) { bar = document.createElement('div'); bar.className = 'lp-drop'; box.appendChild(bar); }
    bar.hidden = false;
    const bb = box.getBoundingClientRect(), rb = to.el.getBoundingClientRect();
    bar.style.top = `${(to.after ? rb.bottom : rb.top) - bb.top - 1}px`;
    bar.style.left = `${to.el.classList.contains('lp-el') ? 20 : 0}px`;
  }
  // o lugar de chegada debaixo do mouse
  function targetAt(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY), row = el && el.closest && el.closest('.lp-layer, .lp-el');
    if (!row || !panel.contains(row)) return null;
    const rb = row.getBoundingClientRect(), low = e.clientY > rb.top + rb.height / 2;
    if (drag.kind === 'layer') {
      const li = liOf(row), tree = A.layerTree(st.model), t = tree[li];
      if (li < 0 || li === drag.li) return null;
      const before = row.classList.contains('lp-layer') && !low && t.line >= 0;
      if (before) return { li, after: false, el: row };
      const rs = rowsOf(li);
      return { li, after: true, el: rs[rs.length - 1] || row };
    }
    if (row.classList.contains('lp-layer')) return { into: +row.dataset.li };
    const line = +row.dataset.line;
    if (drag.lines.includes(line)) return null;
    return { line, after: low, el: row };
  }
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
      const r = drag.row;
      if (r.classList.contains('lp-layer')) {
        const li = +r.dataset.li, t = A.layerTree(st.model)[li];
        if (!t || t.line < 0) { A.hint('A camada automática (as linhas antes do primeiro layer) fica sempre no fundo.', 2600); drag = null; return; }
        Object.assign(drag, { kind: 'layer', li });
      } else {
        const line = +r.dataset.line, sel = A.selected();
        Object.assign(drag, { kind: 'rows', lines: sel.includes(line) ? sel : [line] });
      }
      drag.on = true;
      panel.classList.add('dragging');
    }
    // perto da borda de cima ou de baixo, a lista anda
    const sc = scroller(), sb = sc.getBoundingClientRect();
    if (e.clientY < sb.top + 28) sc.scrollTop -= 8; else if (e.clientY > sb.bottom - 28) sc.scrollTop += 8;
    drag.to = targetAt(e);
    mark();
  });
  function endDrag(e, cancel) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.on) return;
    swallow = true;
    setTimeout(() => { swallow = false; }, 0);
    panel.classList.remove('dragging');
    mark();
    if (cancel || !d.to) return;
    if (d.kind === 'layer') moveLayer(d.li, d.to);
    else if (d.to.into !== undefined) moveRows(d.lines, { li: d.to.into });
    else moveRows(d.lines, { line: d.to.line, after: d.to.after });
  }
  document.addEventListener('pointerup', (e) => endDrag(e, false));
  document.addEventListener('pointercancel', (e) => endDrag(e, true));
  window.addEventListener('keydown', (e) => { if (drag && drag.on && e.key === 'Escape') { e.stopPropagation(); endDrag(e, true); } }, true);
  // o clique que termina um arraste não escolhe nada
  panel.addEventListener('click', (e) => { if (swallow) { e.stopPropagation(); e.preventDefault(); swallow = false; } }, true);
  panel.addEventListener('click', (e) => {
    if (e.target.closest('.lp-add')) { add(); return; }
    const d = e.target.closest('.lp-del');
    if (d && !d.classList.contains('na')) del(+d.closest('.lp-layer').dataset.li);
  });

  // ---------- Objeto › Mandar para a camada ----------
  function menu() {
    const m = model();
    if (!m) return [];
    const lines = A.selected(), tree = A.layerTree(m);
    const here = new Set(lines.map((l) => { const Ly = A.layerOf(l); return Ly ? Ly.name : (tree[0] && tree[0].layer.name); }));
    return tree.map((t, li) => ({
      label: t.layer.name + (t.layer.implicit ? ' (automática)' : ''),
      radio: true,
      on: () => here.size === 1 && here.has(t.layer.name),
      enabled: () => lines.length > 0 && !t.layer.lock,
      run: () => moveRows(A.selected(), { li }),
    })).concat(['-', { label: 'Nova camada', run: add }]);
  }

  // a camada onde se desenha ganha uma marca no painel
  function markDraw() {
    if (panel.hidden || !model()) return;
    const tree = A.layerTree(st.model), Ly = A.drawLayer();
    panel.querySelectorAll('.lp-layer').forEach((r) => {
      const t = tree[+r.dataset.li], on = !!t && t.layer === Ly;
      r.classList.toggle('draw', on);
      const ln = r.querySelector('.ln');
      // só escreve o que mudou: o painel roda a cada pintura (docs/planos/desempenho.md, 9d)
      const tt = on ? `${t.layer.name}: o que você desenhar entra nesta camada. Clique escolhe as linhas dela; duplo clique renomeia` : `Escolher as ${t ? t.kids.length : 0} linhas desta camada (e desenhar nela); duplo clique renomeia`;
      if (ln && ln.title !== tt) ln.title = tt;
    });
  }
  A.on('draw', markDraw);
  A.on('model', () => { reopen(); markDraw(); });

  W.layers = { add, del, moveRows, moveLayer, menu, rename: startRename };
  place();
  // começa aberto na coluna (como no Illustrator), a não ser que tenha sido fechado
  setTimeout(reopen, 0);
})(window.Weasel = window.Weasel || {});
