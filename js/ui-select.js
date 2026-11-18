/* Weasel — a seleção completa (etapa 3 do plano docs/planos/interface-illustrator.md, seção 11.4). O desenho
   escolhe no app.js (clique, caixa no vazio, Laço, grupos e isolamento); aqui ficam a Varinha, o menu Selecionar e o
   que a escolha faz no código: copiar, recortar e colar (no meio da vista, na frente ou atrás), apagar, organizar
   (trazer para a frente, enviar para trás), agrupar (group … end), travar (lock) e alinhar. Cada gesto é uma edição
   só do código (um Ctrl+Z desfaz). */
(function (W) {
  'use strict';
  const A = W.app, L = W.lang;
  if (!A || !L) return;
  const st = A.st;
  const inField = (t) => !!(t && t.closest && t.closest('textarea, input, select, dialog'));

  // ---------- o que está escolhido ----------
  const sel = () => A.selected().slice().sort((a, b) => a - b);
  const model = () => (A.isFilm() ? null : st.model);
  // pode mexer no código pela escolha? (no filme não há formas; na prévia do def, o desenho é só o componente)
  // inDef: vale também dentro de um símbolo (a prévia do def), porque só mexe no texto das linhas escolhidas
  function ready(verb, inDef) {
    if (!model()) return false;
    if (A.defPreview() && !inDef) {
      A.hint(A.symIso && A.symIso().length ? `Dentro do símbolo dá para mover, esticar, girar, apagar e agrupar; para ${verb}, saia dele (Esc ou duplo clique no vazio).` : `Para ${verb}, tire o cursor de dentro do def (a prévia mostra só o componente).`, 3400);
      return false;
    }
    return true;
  }
  const wordsOf = (line) => L.splitLine(A.lineText(line)).words;
  const isHidden = (line) => wordsOf(line).slice(1).some((w) => w.text === 'hidden');
  // a camada do preenchimento de uma linha (uma forma com inkon= também aparece na camada do contorno)
  function ownLayer(m, line) {
    const r = m.byLine.get(line), el = r && r.el;
    return el && el.layer ? (typeof el.layer === 'string' ? el.layer : el.layer.name) : null;
  }
  // as linhas que dá para escolher pelo desenho: as formas das camadas que aparecem (sem as guias e sem hidden)
  function pool() {
    const m = model(), out = [];
    if (!m) return out;
    for (const t of A.layerTree(m)) {
      if (t.layer.hidden || t.layer.guide) continue;
      for (const k of t.kids) if (!out.includes(k.line) && !isHidden(k.line) && A.selectable(k.line)) out.push(k.line);
    }
    return out.sort((a, b) => a - b);
  }
  // Shift soma, Alt tira, sem nada troca a escolha
  function combine(got, e) {
    const cur = sel();
    const next = e && e.altKey ? cur.filter((l) => !got.includes(l)) : e && e.shiftKey ? [...new Set([...cur, ...got])] : got;
    A.setSel(next);
    return next;
  }
  const many = (n, one, more) => `${n} ${n === 1 ? one : more}`;

  // ---------- a Varinha e "a mesma" ----------
  // a cor escrita na linha, com o nome da palette trocado pela cor dele (c=pele e c=#f0c8a0 são a mesma cor)
  function paintOf(m, line, k) {
    const r = m.byLine.get(line), a = r && r.st.attrs.get(k);
    if (!a) return '';
    const v = m.palette.has(a.text) && typeof m.palette.get(a.text) === 'string' ? m.palette.get(a.text) : a.text;
    return String(v).toLowerCase();
  }
  const takes = (m, line, k) => { const r = m.byLine.get(line); return !!r && (L.ATTRS[r.st.cmd] || []).includes(k); };
  function sameAs(line, k) {
    const m = model(), want = paintOf(m, line, k);
    return pool().filter((l) => takes(m, l, k) && paintOf(m, l, k) === want);
  }
  function wand(line, e) {
    if (!ready('usar a Varinha')) return;
    if (line < 0) { if (!e.shiftKey && !e.altKey) A.deselect(); return; }
    const m = model();
    if (!takes(m, line, 'c')) { combine([line], e); A.hint('Esta linha não tem cor de preenchimento (c=): só ela foi escolhida.', 2400); return; }
    const got = sameAs(line, 'c'), v = m.byLine.get(line).st.attrs.get('c');
    const next = combine(got, e);
    A.hint(`${many(got.length, 'forma', 'formas')} com a cor ${v ? v.text : 'padrão (sem c=)'}${next.length !== got.length ? ` · ${next.length} escolhidas` : ''}.`, 2400);
  }
  // Selecionar › A mesma: cor de preenchimento (c), cor do contorno (inkc) ou camada
  function same(k) {
    if (!ready('escolher')) return;
    const m = model(), cur = sel();
    if (!cur.length) { A.hint('Escolha uma forma primeiro: as outras parecidas com ela entram junto.', 2600); return; }
    let got;
    if (k === 'layer') {
      const names = new Set(cur.map((l) => ownLayer(m, l)).filter(Boolean));
      const tree = A.layerTree(m);
      for (const l of cur) if (!ownLayer(m, l)) { const t = tree.find((x) => x.kids.some((q) => q.line === l)); if (t) names.add(t.layer.name); }
      got = pool().filter((l) => { const own = ownLayer(m, l); if (own) return names.has(own); const t = tree.find((x) => x.kids.some((q) => q.line === l)); return !!t && names.has(t.layer.name); });
    } else {
      const base = cur.find((l) => takes(m, l, k));
      if (base === undefined) { A.hint(k === 'inkc' ? 'A escolha não tem contorno (inkc=).' : 'A escolha não tem cor de preenchimento (c=).', 2400); return; }
      got = sameAs(base, k);
    }
    A.setSel(got);
    A.hint(`${many(got.length, 'forma escolhida', 'formas escolhidas')}.`, 1800);
  }
  function all() {
    if (!ready('escolher')) return;
    const got = pool();
    if (!got.length) { A.hint('Nada para escolher (as formas escondidas e as das camadas guia ficam de fora).', 2600); return; }
    A.setSel(got);
    A.hint(`${many(got.length, 'forma escolhida', 'formas escolhidas')}.`, 1600);
  }
  function invert() {
    if (!ready('escolher')) return;
    const cur = new Set(sel());
    A.setSel(pool().filter((l) => !cur.has(l)));
  }

  // ---------- os blocos do código ----------
  // repeat … end, def … end e group … end andam inteiros: uma forma de dentro de um repeat é o repeat todo (na
  // camada, um grupo é uma peça só; dentro dele, cada forma é uma peça)
  const OPEN = new Set(['repeat', 'def', 'group']);
  function blocks(src) {
    const out = [], stack = [];
    src.forEach((t, i) => {
      const w = L.splitLine(t).words[0];
      if (!w) return;
      if (OPEN.has(w.text)) stack.push({ kind: w.text, a: i });
      else if (w.text === 'end' && stack.length) { const b = stack.pop(); b.b = i; out.push(b); }
    });
    return out;
  }
  function unitOf(bl, line) {
    let a = line, b = line;
    for (const k of bl) if (k.a <= line && line <= k.b) { a = Math.min(a, k.a); b = Math.max(b, k.b); }
    return [a, b];
  }
  // os comentários logo acima de uma forma são dela (andam junto quando ela muda de lugar)
  const isNote = (t) => /^\s*#/.test(t);
  function noteTop(src, a, floor) {
    while (a - 1 > floor && isNote(src[a - 1])) a--;
    return a;
  }
  // as peças de cada camada, na ordem do código (a de trás primeiro): { a, b, top } (top: com os comentários)
  function layerUnits(m, src, bl) {
    const claimed = new Set(), out = [];
    for (const t of A.layerTree(m)) {
      const us = [];
      for (const k of t.kids) {
        const own = ownLayer(m, k.line);
        if (own && own !== t.layer.name) continue;
        const [a, b] = unitOf(bl, k.line);
        if (claimed.has(a)) continue;
        claimed.add(a);
        us.push({ a, b });
      }
      us.sort((x, y) => x.a - y.a);
      us.forEach((u, i) => { u.top = noteTop(src, u.a, i ? us[i - 1].b : t.line); });
      out.push({ t, us });
    }
    return out;
  }

  // as peças da escolha para mudar de lugar: um grupo inteiro é uma peça (do group ao end) e uma linha de dentro de
  // um repeat leva o repeat inteiro (o de mais fora, dentro do grupo da peça). [{ a, b, g, parent }]
  function unitsOf(lines, src) {
    const bl = blocks(src), out = [];
    for (const u of A.units(lines)) {
      let a = u.a, b = u.b;
      if (!u.g) for (const k of bl) if (k.kind === 'repeat' && k.a <= u.a && u.a <= k.b && (!u.parent || (k.a > u.parent.line && k.b < u.parent.end))) { a = Math.min(a, k.a); b = Math.max(b, k.b); }
      out.push({ a, b, g: u.g, parent: u.parent });
    }
    return out.filter((u, i) => !out.some((o, j) => j !== i && o.a <= u.a && u.b <= o.b && (o.a < u.a || o.b > u.b || j < i))).sort((x, y) => x.a - y.a);
  }
  // as peças de dentro de um grupo, na ordem do código: { a, b, top } (top: com os comentários de cima)
  function childUnits(src, bl, P) {
    const out = [], seen = new Set();
    for (const l of [...A.sigs().keys()].sort((x, y) => x - y)) {
      if (l <= P.line || l >= P.end) continue;
      let a = l, b = l;
      for (const k of bl) if (k.kind !== 'def' && k.a <= l && l <= k.b && k.a > P.line && k.b < P.end) { a = Math.min(a, k.a); b = Math.max(b, k.b); }
      if (seen.has(a)) continue;
      seen.add(a);
      out.push({ a, b });
    }
    out.forEach((u, i) => { u.top = noteTop(src, u.a, i ? out[i - 1].b : P.line); });
    return out;
  }
  const indentOf = (t) => /^[ \t]*/.exec(t || '')[0];
  // troca o recuo de base de uma linha (from) por outro (to); as linhas vazias ficam
  const reindent = (t, from, to) => (!t.trim() ? t : to + (t.startsWith(from) ? t.slice(from.length) : t.replace(/^[ \t]*/, '')));
  const depth = (g) => { let n = 0; for (let x = g; x; x = x.parent) n++; return n; };

  // ---------- escrever: só o trecho que mudou, numa edição só ----------
  // caret: a linha (de next) onde o cursor do código fica depois (sem ela, no fim do trecho trocado)
  function rewrite(next, key, caret) {
    const ed = A.editor, v = ed.value, cur = v.split('\n');
    let a = 0;
    while (a < cur.length && a < next.length && cur[a] === next[a]) a++;
    let b = 0;
    while (b < cur.length - a && b < next.length - a && cur[cur.length - 1 - b] === next[next.length - 1 - b]) b++;
    if (a === cur.length && a === next.length) return false;
    let from, to, text;
    if (b > 0) {
      from = ed.lineStart(a);
      to = ed.lineStart(cur.length - b);
      text = next.slice(a, next.length - b).map((t) => t + '\n').join('');
    } else {
      const add = next.slice(a);
      // (acrescentando no fim: depois da última letra; o lineStart da linha que não existe é o fim do texto)
      from = a > 0 ? (a >= cur.length ? v.length : ed.lineStart(a) - 1) : 0;
      to = v.length;
      text = add.length ? (a > 0 ? '\n' : '') + add.join('\n') : '';
    }
    const o = { key };
    if (caret >= 0 && caret < next.length) { let off = 0; for (let i = 0; i < caret; i++) off += next[i].length + 1; o.select = [off, off]; }
    ed.replaceRange(from, to, text, o);
    return true;
  }

  // ---------- apagar ----------
  // Apaga as linhas escolhidas (os comentários ficam). Uma forma de um repeat só sai pelo código. Se o nome de uma
  // forma apagada ainda aparece em outra linha (uma key, um clip=…), avisa onde.
  function del(lines, key, quiet) {
    if (!ready('apagar', true)) return 0;
    const m = model();
    lines = lines || sel();
    if (!lines.length) { if (!quiet) A.hint('Escolha uma forma para apagar.', 2000); return 0; }
    const us = A.units(lines), ok = us.filter((u) => u.g || !(m.byLine.get(u.a) || {}).repeated), left = us.length - ok.length;
    if (!ok.length) { A.hint('Esta forma vem de um repeat: apague no código (a linha de dentro do repeat vale para todas as cópias).', 3600); return 0; }
    const src = A.editor.value.split('\n'), drop = new Set();
    for (const u of ok) for (let l = u.a; l <= u.b && l < src.length; l++) drop.add(l);
    const names = [...drop].map((l) => { const r = m.byLine.get(l); return r && r.el && r.el.name; }).filter((n) => n && L.IDENT.test(n));
    const next = src.filter((t, i) => !drop.has(i));
    rewrite(next, key || 'del' + Date.now());
    A.deselect();
    // os nomes que ficaram para trás
    const still = [];
    for (const n of names) {
      const re = new RegExp(`(^|[^\\w-])${n}(?![\\w-])`);
      const at = next.findIndex((t) => { const sp = L.splitLine(t); return re.test(sp.comment !== null ? t.slice(0, sp.commentAt) : t); });
      if (at >= 0) still.push(`${n} (linha ${at + 1})`);
    }
    const gone = ok.filter((u) => u.g).length;
    if (!quiet) A.hint(`${gone ? many(gone, 'grupo apagado', 'grupos apagados') + (ok.length > gone ? ` e ${many(ok.length - gone, 'forma', 'formas')}` : '') : many(ok.length, 'forma apagada', 'formas apagadas')} (Ctrl+Z desfaz)${left ? ` · ${left} de repeat ${left > 1 ? 'ficaram' : 'ficou'}` : ''}${still.length ? `. O nome ainda aparece: ${still.slice(0, 2).join(', ')}${still.length > 2 ? '…' : ''}` : ''}.`, still.length ? 4200 : 2400);
    return ok.length;
  }

  // ---------- copiar, recortar e colar ----------
  // O que vai para a área de transferência é o texto das linhas (dá para colar no código, ou em outro arquivo).
  function copy(cut, quiet) {
    if (!model()) return null;
    const m = model(), lines = sel();
    if (!lines.length) { if (!quiet) A.hint('Escolha uma forma para copiar.', 2000); return null; }
    if (A.defPreview()) { A.hint('Para copiar, tire o cursor de dentro do def.', 2600); return null; }
    const ok = A.units(lines).filter((u) => u.g || !(m.byLine.get(u.a) || {}).repeated);
    if (!ok.length) { A.hint('Esta forma vem de um repeat: copie no código (a linha de dentro do repeat usa a conta dele).', 3400); return null; }
    const src = A.editor.value.split('\n'), out = [];
    for (const u of ok) { const base = indentOf(src[u.a]); for (let l = u.a; l <= u.b && l < src.length; l++) out.push(reindent(src[l], base, '')); }
    const text = out.join('\n');
    st.clip = { text, n: ok.length };
    if (cut) del(lines, 'cut' + Date.now(), true);
    const ng = ok.filter((u) => u.g).length, what = ng === ok.length ? many(ng, 'grupo', 'grupos') : many(ok.length, 'forma', 'formas');
    A.hint(`${what} ${cut ? 'recortad' : 'copiad'}${ng === ok.length ? 'o' : 'a'}${ok.length > 1 ? 's' : ''}. Ctrl+V cola no meio da vista; Ctrl+F na frente; Ctrl+B atrás.`, 2600);
    return text;
  }
  // pelo menu (sem o evento do teclado), a área de transferência do sistema também recebe o texto
  function copyMenu(cut) {
    const text = copy(cut);
    if (text && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
  }
  // só formas: o desenho cola o que ele sabe pôr numa camada
  const PASTE_OK = new Set([...L.DRAWABLE, 'use', 'include', 'repeat', 'group', 'end']);
  function shapesOnly(text) {
    const ws = text.split('\n').map((t) => L.splitLine(t).words[0]);
    return ws.some(Boolean) && ws.every((w) => !w || PASTE_OK.has(w.text));
  }
  // a camada onde as coisas novas entram: a da escolha, senão a da linha do cursor, senão a de cima
  function targetLayer(m, cur) {
    const tree = A.layerTree(m).filter((t) => !t.layer.guide);
    if (!tree.length) return null;
    const of = (l) => { const own = ownLayer(m, l); return tree.find((t) => (own ? t.layer.name === own : true) && t.kids.some((k) => k.line === l)); };
    if (cur.length) { const t = of(cur[0]); if (t) return t; }
    const c = st.caret.line, t = tree.find((x) => x.line === c) || of(c);
    return t || tree[tree.length - 1];
  }
  function layerEnd(t, bl, src) {
    if (t && t.kids.length) return Math.max(...t.kids.map((k) => unitOf(bl, k.line)[1])) + 1;
    if (t && t.line >= 0) return t.line + 1;
    return src.length - (src.length > 1 && src[src.length - 1] === '' ? 1 : 0);
  }
  function layerStart(t, bl, src) {
    if (t && t.line >= 0) return t.line + 1;
    if (t && t.kids.length) { const a = Math.min(...t.kids.map((k) => unitOf(bl, k.line)[0])); return noteTop(src, a, -1); }
    return layerEnd(t, bl, src);
  }
  // where: 'view' (Ctrl+V: no fim da camada, no meio da vista), 'front' (Ctrl+F: logo na frente da escolha, no
  // mesmo lugar) ou 'back' (Ctrl+B: logo atrás da escolha). Sem escolha, na frente ou atrás de tudo da camada.
  function paste(where, text) {
    if (!ready('colar')) return;
    if (text === undefined || text === null) text = st.clip ? st.clip.text : '';
    text = String(text).replace(/\r/g, '').replace(/\n+$/, '');
    if (!text.trim()) { A.hint('Nada copiado ainda: escolha formas e aperte Ctrl+C.', 2400); return; }
    if (!shapesOnly(text)) { A.hint('O desenho só cola formas (shape, stroke, line, ellipse, rect, text, emitter, use, include, repeat, group). Para colar outras linhas, cole no código.', 4200); return; }
    const m = model(), src = A.editor.value.split('\n'), bl = blocks(src), cur = sel(), key = 'paste' + Date.now(), iso = A.iso();
    const us = cur.length ? unitsOf(cur, src) : [];
    // onde entra e com que recuo (dentro de um grupo, o recuo dele)
    let at, ind = '';
    if (where !== 'view' && us.length) {
      const u = where === 'front' ? us[us.length - 1] : us[0];
      at = where === 'front' ? u.b + 1 : noteTop(src, u.a, u.parent ? u.parent.line : -1);
      ind = indentOf(src[u.a]);
    } else if (iso) {
      at = where === 'back' ? iso.line + 1 : Math.min(iso.end, src.length);
      ind = indentOf(src[iso.line]) + '  ';
    } else { const t = targetLayer(m, cur); at = where === 'back' ? layerStart(t, bl, src) : layerEnd(t, bl, src); }
    // os nomes só mudam se uma forma com o mesmo nome já existe (depois de um Ctrl+X, colar devolve os nomes, e as
    // keys que usavam esses nomes voltam a valer)
    const live = new Set(A.layerTree(m).flatMap((t) => t.kids.map((k) => k.name)).filter(Boolean));
    for (const g of A.blocks().groups) if (g.name) live.add(g.name);
    const clash = text.split('\n').some((t) => { const n = L.splitLine(t).words.slice(1).find((x) => L.topIndex(x.text, '=') < 0 && x.text[0] !== '"' && !L.DRAW_FLAGS.has(x.text)); return !!n && live.has(n.text); });
    const ren = clash ? A.renameCopy(text) : null, add = (ren ? ren.text : text).split('\n').map((t) => (ind && t.trim() ? ind + t : t));
    rewrite(src.slice(0, at).concat(add, src.slice(at)), key);
    const sigs = A.sigs(), fresh = add.map((_, i) => at + i).filter((l) => sigs.has(l));
    if (where === 'view' && fresh.length) {
      const b = A.boxOf(fresh), c = A.viewCenter(), keep = st.lastXf;
      if (b && (Math.abs(c[0] - b.cx) > 0.5 || Math.abs(c[1] - b.cy) > 0.5)) A.transformLines(fresh, 'move', { dx: c[0] - b.cx, dy: c[1] - b.cy }, key);
      st.lastXf = keep;
    }
    if (fresh.length) A.setSel(fresh, fresh[0]);
    if (!ren) A.hint(`${many(fresh.length || add.length, 'forma colada', 'formas coladas')} (linha ${at + 1}). Ctrl+Z desfaz.`, 2400);
  }

  // ---------- organizar ----------
  // Dentro de cada camada, quem vem depois no código fica na frente. how: 'front' (Ctrl+Shift+]), 'fwd' (Ctrl+]),
  // 'bwd' (Ctrl+[), 'back' (Ctrl+Shift+[). As peças trocam de lugar entre si; o que não é forma fica onde estava.
  const ARRANGE = { front: 'na frente de tudo', fwd: 'um passo para a frente', bwd: 'um passo para trás', back: 'atrás de tudo' };
  function arrange(how) {
    if (!ready('organizar')) return;
    const m = model(), lines = sel();
    if (!lines.length) { A.hint('Escolha uma forma para mudar de lugar na pilha (Ctrl+] e Ctrl+[).', 2600); return; }
    const src = A.editor.value.split('\n'), bl = blocks(src), want = new Set(lines);
    // as peças escolhidas, separadas pelo lugar onde estão: solta na camada, ou dentro de um grupo
    const ctxs = new Map();
    for (const u of unitsOf(lines, src)) {
      const k = u.parent ? u.parent.line : -1;
      if (!ctxs.has(k)) ctxs.set(k, { P: u.parent, su: [] });
      ctxs.get(k).su.push(u);
    }
    // os de dentro primeiro: o lugar de um grupo (do group ao end) não muda quando as peças de dentro trocam
    const fams = [];
    for (const { P, su } of [...ctxs.values()].sort((x, y) => depth(y.P) - depth(x.P))) {
      const lists = P ? [childUnits(src, bl, P)] : layerUnits(m, src, bl).map((x) => x.us);
      for (const us of lists) fams.push({ us, on: us.map((u) => su.some((x) => x.a >= u.a && x.b <= u.b)) });
    }
    let arr = src.map((t, i) => i), moved = false;
    for (const { us, on } of fams) {
      if (!on.some(Boolean)) continue;
      const slotAt = new Map();
      const order = us.map((u, i) => i);
      const swap = (i, j) => { [order[i], order[j]] = [order[j], order[i]]; [on[i], on[j]] = [on[j], on[i]]; };
      if (how === 'front' || how === 'back') {
        const yes = order.filter((i, k) => on[k]), no = order.filter((i, k) => !on[k]);
        const next = how === 'front' ? no.concat(yes) : yes.concat(no);
        next.forEach((v, k) => { order[k] = v; });
      } else if (how === 'fwd') { for (let i = us.length - 2; i >= 0; i--) if (on[i] && !on[i + 1]) swap(i, i + 1); } else for (let i = 1; i < us.length; i++) if (on[i] && !on[i - 1]) swap(i - 1, i);
      order.forEach((v, k) => { if (v !== k) moved = true; slotAt.set(us[k].top, { slot: us[k], unit: us[v] }); });
      // cada lugar recebe a peça que foi para ele; o resto fica igual (arr: de que linha veio cada linha nova)
      const next = [];
      for (let i = 0; i < arr.length;) {
        const s = slotAt.get(i);
        if (!s) { next.push(arr[i]); i++; continue; }
        for (let j = s.unit.top; j <= s.unit.b; j++) next.push(arr[j]);
        i = s.slot.b + 1;
      }
      arr = next;
    }
    const where = ctxs.has(-1) ? 'da camada' : 'do grupo';
    if (!moved) { A.hint(how === 'front' || how === 'fwd' ? `Já está na frente de tudo ${where}.` : `Já está atrás de tudo ${where}.`, 2200); return; }
    const pos = new Map(arr.map((from, i) => [from, i]));
    rewrite(arr.map((i) => src[i]), 'arrange' + Date.now());
    const fresh = [...want].map((l) => pos.get(l)).filter((l) => l !== undefined);
    A.setSel(fresh);
    A.hint(`${many(fresh.length, 'forma', 'formas')} ${ARRANGE[how]}.`, 1800);
  }

  // ---------- agrupar: group nome … end ----------
  // As peças escolhidas entram num group novo (group1, group2…), no lugar da de cima (a última no código), na ordem
  // em que estavam; os comentários de cima de cada uma vão junto, e as linhas de dentro ganham dois espaços.
  function group() {
    if (!ready('agrupar', true)) return;
    const lines = sel();
    if (!lines.length) { A.hint('Escolha as formas para agrupar (Ctrl+G).', 2400); return; }
    const src = A.editor.value.split('\n'), us = unitsOf(lines, src);
    if (us.some((u) => u.b >= src.length)) { A.hint('Um group está sem end: feche o bloco no código antes de agrupar.', 3000); return; }
    const last = us[us.length - 1], ind = indentOf(src[last.a]), take = new Set(), body = [];
    const tops = us.map((u, i) => noteTop(src, u.a, i ? us[i - 1].b : u.parent ? u.parent.line : -1));
    us.forEach((u, i) => {
      const base = indentOf(src[u.a]);
      for (let j = tops[i]; j <= u.b; j++) { take.add(j); body.push(reindent(src[j], base, ind + '  ')); }
    });
    const rest = [];
    let at = -1;
    src.forEach((t, i) => { if (i === tops[tops.length - 1]) at = rest.length; if (!take.has(i)) rest.push(t); });
    const name = A.freeName('group');
    rewrite(rest.slice(0, at).concat([`${ind}group ${name}`], body, [`${ind}end`], rest.slice(at)), 'group' + Date.now());
    const sigs = A.sigs(), fresh = body.map((t, i) => at + 1 + i).filter((l) => sigs.has(l));
    A.setSel(fresh);
    A.hint(`Grupo ${name}: ${many(fresh.length, 'forma', 'formas')}. Um clique (V) escolhe o grupo inteiro; duplo clique entra nele; Ctrl+Shift+G desfaz o grupo.`, 3600);
  }
  // desagrupar: o group e o end saem (um nível por vez); as formas ficam escolhidas
  function ungroup() {
    if (!ready('desagrupar', true)) return;
    const lines = sel(), src = A.editor.value.split('\n'), us = A.units(lines).filter((u) => u.g && u.g.end < src.length);
    if (!us.length) { A.hint('A escolha não é um grupo inteiro: escolha o grupo com a Seleção (V) e aperte Ctrl+Shift+G.', 3000); return; }
    const drop = new Set(), fix = new Map();
    for (const u of us) {
      drop.add(u.g.line);
      drop.add(u.g.end);
      const outer = indentOf(src[u.g.line]);
      for (let j = u.g.line + 1; j < u.g.end; j++) {
        const t = src[j];
        if (t.startsWith(outer + '  ')) fix.set(j, outer + t.slice(outer.length + 2));
        else if (t.startsWith(outer + '\t')) fix.set(j, outer + t.slice(outer.length + 1));
      }
    }
    const next = [], pos = new Map();
    src.forEach((t, i) => { if (drop.has(i)) return; pos.set(i, next.length); next.push(fix.has(i) ? fix.get(i) : t); });
    rewrite(next, 'ungroup' + Date.now());
    A.setSel(lines.map((l) => pos.get(l)).filter((l) => l !== undefined));
    A.hint(`${many(us.length, 'grupo desfeito', 'grupos desfeitos')} (${us.map((u) => u.g.name || 'sem nome').join(', ')}). Ctrl+Z desfaz.`, 2600);
  }
  const isGroup = () => !!model() && A.units(sel()).some((u) => u.g);

  // ---------- travar: lock ----------
  // Ctrl+2 trava a escolha (um grupo inteiro: o lock vai na linha do group); Ctrl+Alt+2 destrava tudo (as formas,
  // os use e os grupos; as camadas travadas ficam, elas se destravam pelo cadeado do painel Camadas)
  function lock() {
    if (!ready('travar', true)) return;
    const lines = sel();
    if (!lines.length) { A.hint('Escolha as formas para travar (Ctrl+2).', 2400); return; }
    const targets = A.units(lines).map((u) => (u.g ? u.g.line : u.a)).filter((l) => A.lockTok(l));
    if (!targets.length) { A.hint('Estas linhas não aceitam lock (um include se trava no outro arquivo, ou pela camada).', 3000); return; }
    A.setLock(targets, true, 'lock' + Date.now());
    A.deselect();
    A.hint(`${many(targets.length, 'peça travada', 'peças travadas')} (lock): o desenho não deixa escolher nem arrastar. Ctrl+Alt+2 destrava tudo; o cadeado do painel Camadas, uma.`, 3600);
  }
  function unlockAll() {
    if (!ready('destravar', true)) return;
    const n = A.editor.value.split('\n').length, before = new Set(A.blocks().locked), targets = [];
    for (let i = 0; i < n; i++) { const h = A.lockTok(i); if (h && h.on && h.cmd !== 'layer') targets.push(i); }
    if (!targets.length) { A.hint(before.size ? 'Só há camadas travadas: destrave pelo cadeado do painel Camadas.' : 'Nada travado.', 2600); return; }
    A.setLock(targets, false, 'unlock' + Date.now());
    const after = A.blocks().locked, sigs = A.sigs(), freed = [...before].filter((l) => !after.has(l) && sigs.has(l));
    if (freed.length) A.setSel(freed);
    A.hint(`${many(targets.length, 'peça destravada', 'peças destravadas')}${freed.length ? ` (${many(freed.length, 'forma escolhida', 'formas escolhidas')})` : ''}.`, 2600);
  }

  // ---------- alinhar e distribuir ----------
  // Pela caixa de cada peça (um grupo inteiro anda junto). Com duas peças ou mais, na caixa de todas; com uma só, na
  // prancheta (o canvas). Distribuir espalha os meios por igual, e as duas das pontas ficam.
  const ALIGN = { left: 'à esquerda', hcenter: 'no centro, na horizontal', right: 'à direita', top: 'em cima', vcenter: 'no centro, na vertical', bottom: 'embaixo', hdist: 'distribuídas na horizontal', vdist: 'distribuídas na vertical' };
  function align(how) {
    if (!ready('alinhar')) return;
    const lines = sel();
    if (!lines.length) { A.hint('Escolha as formas para alinhar.', 2200); return; }
    const us = A.units(lines).map((u) => { const ls = lines.filter((l) => l >= u.a && l <= u.b); return { ls, b: A.boxOf(ls) }; }).filter((u) => u.b);
    if (!us.length) return;
    const dist = how === 'hdist' || how === 'vdist', one = us.length === 1;
    if (dist && us.length < 3) { A.hint('Distribuir pede três peças ou mais: as das pontas ficam, as do meio se espalham.', 2800); return; }
    const c = model().canvas;
    const T = one ? { x0: 0, y0: 0, x1: c.w, y1: c.h } : { x0: Math.min(...us.map((u) => u.b.x0)), y0: Math.min(...us.map((u) => u.b.y0)), x1: Math.max(...us.map((u) => u.b.x1)), y1: Math.max(...us.map((u) => u.b.y1)) };
    for (const u of us) {
      const b = u.b;
      u.d = how === 'left' ? [T.x0 - b.x0, 0] : how === 'hcenter' ? [(T.x0 + T.x1) / 2 - b.cx, 0] : how === 'right' ? [T.x1 - b.x1, 0]
        : how === 'top' ? [0, T.y0 - b.y0] : how === 'vcenter' ? [0, (T.y0 + T.y1) / 2 - b.cy] : how === 'bottom' ? [0, T.y1 - b.y1] : [0, 0];
    }
    if (dist) {
      const k = how === 'hdist' ? 'cx' : 'cy', o = us.slice().sort((p, q) => p.b[k] - q.b[k]), a = o[0].b[k], step = (o[o.length - 1].b[k] - a) / (o.length - 1);
      o.forEach((u, i) => { const d = a + step * i - u.b[k]; u.d = how === 'hdist' ? [d, 0] : [0, d]; });
    }
    const key = 'align' + Date.now(), keep = st.lastXf;
    let n = 0;
    for (const u of us) if ((Math.abs(u.d[0]) > 0.01 || Math.abs(u.d[1]) > 0.01) && A.transformLines(u.ls, 'move', { dx: u.d[0], dy: u.d[1] }, key)) n++;
    st.lastXf = keep;
    A.setSel(lines);
    A.hint(n ? `${one ? 'Alinhada na prancheta' : `${many(us.length, 'peça', 'peças')}`} ${ALIGN[how]}.` : 'Já estava assim.', 2200);
  }

  // ---------- teclado e área de transferência (com o foco no desenho) ----------
  // também na vista Camadas em 3D, onde os mesmos itens do menu valem (antes, lá as teclas não faziam nada)
  const here = (t) => !inField(t) && !!model();
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key, low = k.length === 1 ? k.toLowerCase() : k;
    if (!mod || !here(e.target)) return;
    // Ctrl+2 trava, Ctrl+Alt+2 destrava tudo (pela tecla: no teclado brasileiro, Ctrl+Alt+2 escreve ²)
    if (e.code === 'Digit2' && !e.shiftKey) { e.preventDefault(); if (e.altKey) unlockAll(); else lock(); return; }
    if (e.altKey) return;
    // Ctrl+G agrupa, Ctrl+Shift+G desagrupa
    if (e.code === 'KeyG') { e.preventDefault(); if (e.shiftKey) ungroup(); else group(); return; }
    if (low === 'a') { e.preventDefault(); if (e.shiftKey) A.deselect(); else all(); return; }
    if ((low === 'f' || low === 'b') && !e.shiftKey) { e.preventDefault(); paste(low === 'f' ? 'front' : 'back'); return; }
    if (k === ']' || k === '}' || k === '[' || k === '{') {
      e.preventDefault();
      const up = k === ']' || k === '}';
      arrange(e.shiftKey || k === '}' || k === '{' ? (up ? 'front' : 'back') : up ? 'fwd' : 'bwd');
    }
  });
  // um texto marcado na página (no F1, por exemplo) é copiado como sempre
  const marked = () => !!(window.getSelection && String(window.getSelection()).trim());
  for (const ev of ['copy', 'cut']) {
    document.addEventListener(ev, (e) => {
      if (!here(e.target) || marked() || !sel().length) return;
      const text = copy(ev === 'cut', true);
      if (text === null) return;
      e.preventDefault();
      if (e.clipboardData) e.clipboardData.setData('text/plain', text);
    });
  }
  document.addEventListener('paste', (e) => {
    if (!here(e.target)) return;
    const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    e.preventDefault();
    paste('view', text || undefined);
  });

  W.sel = {
    wand, same, all, invert, none: () => A.deselect(),
    copy: () => copyMenu(false), cut: () => copyMenu(true), paste, del: () => del(),
    arrange, group, ungroup, isGroup, lock, unlockAll, align,
    has: () => !!model() && sel().length > 0,
    hasClip: () => !!st.clip,
    // para as camadas (js/ui-layers.js, etapa 6): os blocos, as peças e o escrever numa edição só
    kit: { blocks, unitsOf, layerUnits, noteTop, indentOf, reindent, rewrite, ready, many },
  };
})(window.Weasel = window.Weasel || {});
