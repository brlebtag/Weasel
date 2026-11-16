/* Weasel — a seleção completa (etapa 3 do plano docs/planos/interface-illustrator.md, seção 11.4). O desenho
   escolhe no app.js (clique, caixa no vazio, Laço); aqui ficam a Varinha, o menu Selecionar e o que a escolha faz
   no código: copiar, recortar e colar (no meio da vista, na frente ou atrás), apagar e organizar (trazer para a
   frente, enviar para trás). Cada gesto é uma edição só do código (um Ctrl+Z desfaz). */
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
  function ready(verb) {
    if (!model()) return false;
    if (A.defPreview()) { A.hint(`Para ${verb}, tire o cursor de dentro do def (a prévia mostra só o componente).`, 3000); return false; }
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
  // repeat … end e def … end andam inteiros: uma forma de dentro de um repeat é o repeat todo
  const OPEN = new Set(['repeat', 'def']);
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

  // ---------- escrever: só o trecho que mudou, numa edição só ----------
  function rewrite(next, key) {
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
      from = a > 0 ? ed.lineStart(a) - 1 : 0;
      to = v.length;
      text = add.length ? (a > 0 ? '\n' : '') + add.join('\n') : '';
    }
    ed.replaceRange(from, to, text, { key });
    return true;
  }

  // ---------- apagar ----------
  // Apaga as linhas escolhidas (os comentários ficam). Uma forma de um repeat só sai pelo código. Se o nome de uma
  // forma apagada ainda aparece em outra linha (uma key, um clip=…), avisa onde.
  function del(lines, key, quiet) {
    if (!ready('apagar')) return 0;
    const m = model();
    lines = lines || sel();
    if (!lines.length) { if (!quiet) A.hint('Escolha uma forma para apagar.', 2000); return 0; }
    const ok = lines.filter((l) => !(m.byLine.get(l) || {}).repeated), left = lines.length - ok.length;
    if (!ok.length) { A.hint('Esta forma vem de um repeat: apague no código (a linha de dentro do repeat vale para todas as cópias).', 3600); return 0; }
    const src = A.editor.value.split('\n'), drop = new Set(ok);
    const names = ok.map((l) => { const r = m.byLine.get(l); return r && r.el && r.el.name; }).filter((n) => n && L.IDENT.test(n));
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
    if (!quiet) A.hint(`${many(ok.length, 'forma apagada', 'formas apagadas')} (Ctrl+Z desfaz)${left ? ` · ${left} de repeat ${left > 1 ? 'ficaram' : 'ficou'}` : ''}${still.length ? `. O nome ainda aparece: ${still.slice(0, 2).join(', ')}${still.length > 2 ? '…' : ''}` : ''}.`, still.length ? 4200 : 2400);
    return ok.length;
  }

  // ---------- copiar, recortar e colar ----------
  // O que vai para a área de transferência é o texto das linhas (dá para colar no código, ou em outro arquivo).
  function copy(cut, quiet) {
    if (!model()) return null;
    const m = model(), lines = sel();
    if (!lines.length) { if (!quiet) A.hint('Escolha uma forma para copiar.', 2000); return null; }
    if (A.defPreview()) { A.hint('Para copiar, tire o cursor de dentro do def.', 2600); return null; }
    const ok = lines.filter((l) => !(m.byLine.get(l) || {}).repeated);
    if (!ok.length) { A.hint('Esta forma vem de um repeat: copie no código (a linha de dentro do repeat usa a conta dele).', 3400); return null; }
    const text = ok.map((l) => A.lineText(l)).join('\n');
    st.clip = { text, n: ok.length };
    if (cut) del(ok, 'cut' + Date.now(), true);
    A.hint(`${many(ok.length, 'forma', 'formas')} ${cut ? (ok.length > 1 ? 'recortadas' : 'recortada') : ok.length > 1 ? 'copiadas' : 'copiada'}. Ctrl+V cola no meio da vista; Ctrl+F na frente; Ctrl+B atrás.`, 2600);
    return text;
  }
  // pelo menu (sem o evento do teclado), a área de transferência do sistema também recebe o texto
  function copyMenu(cut) {
    const text = copy(cut);
    if (text && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
  }
  // só formas: o desenho cola o que ele sabe pôr numa camada
  const PASTE_OK = new Set([...L.DRAWABLE, 'use', 'include', 'repeat', 'end']);
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
    if (!shapesOnly(text)) { A.hint('O desenho só cola formas (shape, stroke, line, ellipse, rect, text, emitter, use, include, repeat). Para colar outras linhas, cole no código.', 4200); return; }
    const m = model(), src = A.editor.value.split('\n'), bl = blocks(src), cur = sel(), key = 'paste' + Date.now();
    let at;
    if (where !== 'view' && cur.length) at = where === 'front' ? unitOf(bl, cur[cur.length - 1])[1] + 1 : noteTop(src, unitOf(bl, cur[0])[0], -1);
    else { const t = targetLayer(m, cur); at = where === 'back' ? layerStart(t, bl, src) : layerEnd(t, bl, src); }
    // os nomes só mudam se uma forma com o mesmo nome já existe (depois de um Ctrl+X, colar devolve os nomes, e as
    // keys que usavam esses nomes voltam a valer)
    const live = new Set(A.layerTree(m).flatMap((t) => t.kids.map((k) => k.name)).filter(Boolean));
    const clash = text.split('\n').some((t) => { const n = L.splitLine(t).words.slice(1).find((x) => L.topIndex(x.text, '=') < 0 && x.text[0] !== '"' && !L.DRAW_FLAGS.has(x.text)); return !!n && live.has(n.text); });
    const ren = clash ? A.renameCopy(text) : null, add = (ren ? ren.text : text).split('\n');
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
  const ARRANGE = { front: 'na frente de tudo da camada', fwd: 'um passo para a frente', bwd: 'um passo para trás', back: 'atrás de tudo da camada' };
  function arrange(how) {
    if (!ready('organizar')) return;
    const m = model(), lines = sel();
    if (!lines.length) { A.hint('Escolha uma forma para mudar de lugar na pilha (Ctrl+] e Ctrl+[).', 2600); return; }
    const src = A.editor.value.split('\n'), bl = blocks(src), want = new Set(lines);
    const slotAt = new Map();
    let moved = false;
    for (const { us } of layerUnits(m, src, bl)) {
      const on = us.map((u) => lines.some((l) => l >= u.a && l <= u.b));
      if (!on.some(Boolean)) continue;
      const order = us.map((u, i) => i);
      const swap = (i, j) => { [order[i], order[j]] = [order[j], order[i]]; [on[i], on[j]] = [on[j], on[i]]; };
      if (how === 'front' || how === 'back') {
        const yes = order.filter((i, k) => on[k]), no = order.filter((i, k) => !on[k]);
        const next = how === 'front' ? no.concat(yes) : yes.concat(no);
        next.forEach((v, k) => { order[k] = v; });
      } else if (how === 'fwd') { for (let i = us.length - 2; i >= 0; i--) if (on[i] && !on[i + 1]) swap(i, i + 1); } else for (let i = 1; i < us.length; i++) if (on[i] && !on[i - 1]) swap(i - 1, i);
      order.forEach((v, k) => { if (v !== k) moved = true; slotAt.set(us[k].top, { slot: us[k], unit: us[v] }); });
    }
    if (!moved) { A.hint(how === 'front' || how === 'fwd' ? 'Já está na frente de tudo da camada.' : 'Já está atrás de tudo da camada.', 2200); return; }
    // o código novo: cada lugar recebe a peça que foi para ele; o resto fica igual
    const next = [], pos = new Map();
    for (let i = 0; i < src.length;) {
      const s = slotAt.get(i);
      if (!s) { pos.set(i, next.length); next.push(src[i]); i++; continue; }
      for (let j = s.unit.top; j <= s.unit.b; j++) { pos.set(j, next.length); next.push(src[j]); }
      i = s.slot.b + 1;
    }
    rewrite(next, 'arrange' + Date.now());
    const fresh = [...want].map((l) => pos.get(l)).filter((l) => l !== undefined);
    A.setSel(fresh);
    A.hint(`${many(fresh.length, 'forma', 'formas')} ${ARRANGE[how]}.`, 1800);
  }

  // ---------- teclado e área de transferência (com o foco no desenho) ----------
  const here = (t) => !inField(t) && !!model() && !st.view3d;
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key, low = k.length === 1 ? k.toLowerCase() : k;
    if (!mod || e.altKey || !here(e.target)) return;
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
    arrange,
    has: () => !!model() && sel().length > 0,
    hasClip: () => !!st.clip,
  };
})(window.Weasel = window.Weasel || {});
