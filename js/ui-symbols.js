/* Weasel — os símbolos (etapa 6b do plano docs/planos/interface-illustrator.md, seção 11.7). Os símbolos do
   Weasel são os componentes: def … end e use. O painel Símbolos, na coluna da direita, mostra cada def com uma
   miniatura; arrastar uma para o desenho escreve um use ali. F8 (Criar símbolo) faz das formas escolhidas um def,
   com o 0,0 no meio delas, e deixa um use no lugar. O duplo clique num use (ou na miniatura) entra no def, com a
   prévia; Quebrar vínculo troca o use pelas formas do def, no lugar e no tamanho dele. Cada gesto é uma edição só
   do código (um Ctrl+Z desfaz). */
(function (W) {
  'use strict';
  const A = W.app, L = W.lang, S = W.scene, SE = W.sel;
  if (!A || !L || !S || !SE || !SE.kit) return;
  const K = SE.kit, st = A.st;
  const $ = (id) => document.getElementById(id);
  const dock = $('dock');
  if (!dock) return;
  const P = () => W.props || null;
  const many = K.many;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const model = () => (A.isFilm() ? null : st.model);
  const word = (t) => { const w = L.splitLine(t || '').words[0]; return w ? w.text : ''; };
  const fmtN = (v, d) => { const t = String(Number(v.toFixed(d === undefined ? 2 : d))); return t === '-0' ? '0' : t; };
  const dec = () => (st.view.z > 3 ? 1 : 0);
  const inField = (t) => !!(t && t.closest && t.closest('textarea, input, select, dialog'));

  // ---------- a parte da coluna ----------
  const sec = document.createElement('section');
  sec.className = 'dk-sec sy-sec';
  sec.dataset.sec = 'sym';
  sec.innerHTML = `<div class="dk-head"><b>Símbolos</b><span class="dk-what"></span><button type="button" class="sy-new" title="Criar símbolo (F8): as formas escolhidas viram um def, e um use fica no lugar delas">＋</button><button type="button" class="x" data-close="sym" title="Fechar (Janela › Símbolos abre de novo)" aria-label="Fechar">✕</button></div>
    <div class="dk-body"><div class="sy-grid"></div>
    <div class="sy-foot"><button type="button" data-act="place" title="Põe um use do símbolo escolhido no meio da vista">Colocar</button><button type="button" data-act="edit" title="Entra no def do símbolo escolhido (como o duplo clique)">Editar</button><button type="button" data-act="break" title="Troca os use escolhidos pelas formas do def, no mesmo lugar">Quebrar vínculo</button><button type="button" data-act="del" title="Apaga o def do símbolo escolhido (só sem nenhum use)">Apagar</button></div>
    <small class="sy-tip">Arraste uma miniatura para o desenho para pôr um <code>use</code>. Duplo clique na miniatura (ou num <code>use</code> no desenho) edita o símbolo; duplo clique no nome renomeia. <kbd>F8</kbd> faz das escolhidas um símbolo.</small></div>`;
  const sw = dock.querySelector('[data-sec=sw]');
  dock.insertBefore(sec, sw ? sw.nextSibling : null);
  const grid = sec.querySelector('.sy-grid'), what = sec.querySelector('.dk-what');
  let chosen = null; // o def escolhido no painel (ou o do use escolhido no desenho)

  // ---------- as miniaturas ----------
  // Cada uma é o def sozinho, com os valores padrão (uma leitura do arquivo com a prévia daquele def). Uma só muda
  // quando muda o texto do def dela (ou de um def que ela usa) ou uma linha de cores e contas (palette, gradient,
  // pattern, let, canvas); e só é desenhada de novo quando o código para de mudar por um instante (num arraste
  // dentro do símbolo, no fim dele).
  const TW = 76, TH = 60, cache = new Map();
  const LOOKS = new Set(['palette', 'gradient', 'pattern', 'let', 'canvas']);
  let looksNow = { glob: '', blocks: new Map() }, queue = [], timer = 0;
  function looks() {
    const ls = A.editor.value.split('\n'), glob = [], blocks = new Map();
    let depth = 0, cur = '', buf = [];
    for (const t of ls) {
      const w = word(t);
      if (!depth && w === 'def') { const n = L.splitLine(t).words[1]; depth = 1; cur = n ? n.text : ''; buf = [t]; continue; }
      if (depth) {
        buf.push(t);
        if (w === 'repeat' || w === 'group') depth++;
        else if (w === 'end' && --depth === 0 && cur) blocks.set(cur, buf.join('\n'));
        continue;
      }
      if (LOOKS.has(w)) glob.push(t);
    }
    return { glob: glob.join('\n'), blocks };
  }
  function keyOf(name, seen) {
    if (seen.has(name)) return '';
    seen.add(name);
    const b = looksNow.blocks.get(name) || '';
    let k = b;
    for (const u of b.matchAll(/^\s*use\s+([A-Za-z_][\w-]*)/gm)) k += '\n' + keyOf(u[1], seen);
    return k;
  }
  const tileKey = (name) => `${looksNow.glob}\n\u0000${name}\n${keyOf(name, new Set())}`;
  function want(name) {
    const c = cache.get(name);
    if (c && c.key === tileKey(name)) return false;
    if (!queue.includes(name)) queue.push(name);
    return true;
  }
  function paint(name) {
    const cv = document.createElement('canvas'), k = Math.min(2, window.devicePixelRatio || 1);
    cv.width = TW * k;
    cv.height = TH * k;
    const pm = A.defModel(name);
    if (!pm) return cv;
    const ctx = cv.getContext('2d'), pose = S.makePose(pm, null, 0);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of pm.elements) {
      if (el.hidden) continue;
      const g = S.geometry(pm, pose, el);
      if (!g.segs.length) continue;
      const b = S.segsBox(g.segs), pad = (el.ink || el.w || 0) / 2;
      x0 = Math.min(x0, b.x - pad); y0 = Math.min(y0, b.y - pad); x1 = Math.max(x1, b.x + b.w + pad); y1 = Math.max(y1, b.y + b.h + pad);
    }
    if (x0 > x1) return cv;
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), z = Math.min((TW - 8) / w, (TH - 8) / h) * k;
    ctx.setTransform(z, 0, 0, z, (TW * k - w * z) / 2 - x0 * z, (TH * k - h * z) / 2 - y0 * z);
    try { S.drawScene(ctx, pm, pose, { background: false, glows: false, lighting: null }); } catch (e) { /* a miniatura fica vazia */ }
    return cv;
  }
  // uma miniatura por vez, sem travar a página
  function pump() {
    timer = 0;
    const name = queue.shift();
    if (!name) return;
    const m = model();
    if (m && m.defs.has(name)) {
      cache.set(name, { key: tileKey(name), cv: paint(name) });
      const tile = grid.querySelector(`.sy-tile[data-name="${name}"] canvas`);
      if (tile) blit(tile, name);
    }
    if (queue.length) timer = setTimeout(pump, 0);
  }
  function blit(tile, name) {
    const c = cache.get(name), ctx = tile.getContext('2d');
    ctx.clearRect(0, 0, tile.width, tile.height);
    if (c) ctx.drawImage(c.cv, 0, 0, tile.width, tile.height);
  }

  // ---------- montar o painel ----------
  let sig = '';
  const shown = () => !sec.hidden && !dock.hidden && !sec.classList.contains('fold');
  function fill(force) {
    const m = model();
    if (!m || !shown()) return;
    const defs = [...m.defs.values()];
    const s2 = defs.map((d) => `${d.name}:${d.uses}:${A.defLines(d.name) ? 1 : 0}`).join('|');
    looksNow = looks();
    let more = false;
    if (force || s2 !== sig) {
      sig = s2;
      grid.innerHTML = defs.length ? '' : '<div class="rp-empty">Nenhum símbolo ainda. Escolha formas no desenho e aperte <kbd>F8</kbd> (ou o ＋) para criar um.</div>';
      const k = Math.min(2, window.devicePixelRatio || 1);
      for (const d of defs) {
        const own = !!A.defLines(d.name), t = document.createElement('div');
        t.className = 'sy-tile' + (own ? '' : ' inc');
        t.dataset.name = d.name;
        t.title = `def ${d.name}: ${d.uses ? many(d.uses, 'use', 'uses') : 'sem nenhum use'}${own ? '' : ' (vem de um include)'}. Arraste para o desenho; duplo clique edita.`;
        t.innerHTML = `<canvas width="${TW * k}" height="${TH * k}"></canvas><span class="sy-name"></span><span class="sy-uses">${d.uses || ''}</span>`;
        t.querySelector('.sy-name').textContent = d.name;
        grid.appendChild(t);
        // a de antes fica até a nova ficar pronta
        if (cache.has(d.name)) blit(t.querySelector('canvas'), d.name);
        if (want(d.name)) more = true;
      }
    } else for (const d of defs) if (want(d.name)) more = true;
    if (more || (queue.length && !timer)) { clearTimeout(timer); timer = setTimeout(pump, 400); }
    mark();
  }
  function mark() {
    const m = model();
    if (!m) return;
    // o use escolhido no desenho escolhe o símbolo dele
    const sel = A.selected();
    if (sel.length === 1) { const r = m.byLine.get(sel[0]); if (r && r.use) chosen = r.use; }
    if (chosen && !m.defs.has(chosen)) chosen = null;
    grid.querySelectorAll('.sy-tile').forEach((t) => t.classList.toggle('sel', t.dataset.name === chosen));
    const d = chosen && m.defs.get(chosen);
    what.textContent = d ? `${d.name} · ${d.uses ? many(d.uses, 'use', 'uses') : 'sem use'}` : '';
    const own = !!(d && A.defLines(d.name)), useSel = sel.some((l) => { const r = m.byLine.get(l); return r && r.use; });
    const set = (act, ok) => { const b = sec.querySelector(`[data-act=${act}]`); if (b) b.disabled = !ok; };
    set('place', !!d);
    set('edit', own);
    set('break', useSel);
    set('del', own && !d.uses);
  }

  // ---------- colocar: um use no desenho ----------
  function place(name, at) {
    const m = model();
    if (!m || !m.defs.has(name)) return -1;
    if (A.symIso().includes(name)) { A.hint(`O símbolo ${name} não cabe dentro dele mesmo.`, 2600); return -1; }
    const pl = A.drawPlace(false);
    if (!pl || pl.why) { if (pl && pl.why) A.hint(pl.why, 3200); return -1; }
    const p = pl.local(at), d = dec();
    const line = A.addLine(pl, 'use', null, `${fmtN(p[0], d)},${fmtN(p[1], d)}`, { name, key: 'use' + Date.now() });
    if (line >= 0) A.hint(`use ${name}: o 0,0 do símbolo foi para ${fmtN(p[0], d)},${fmtN(p[1], d)}. Duplo clique nele edita o símbolo.`, 2800);
    return line;
  }

  // ---------- criar: as escolhidas viram um def ----------
  // O 0,0 fica no meio da caixa delas (arredondado); o def (symbol1, symbol2…) entra logo antes do use, ou antes do
  // grupo de mais fora em volta dele (um def não fica dentro de um grupo), e o use fica no lugar da de cima.
  function create() {
    const m = model();
    if (!m || !K.ready('criar um símbolo', true)) return;
    if (st.anim) { A.hint('Para criar um símbolo, escolha "pose parada" no player.', 2600); return; }
    const lines = A.selected();
    if (!lines.length) { A.hint('Escolha as formas que vão virar o símbolo (F8).', 2400); return; }
    const plans = lines.map((l) => A.editPlan(l)), bad = plans.find((p) => p.why);
    if (bad) { A.hint(`A linha ${bad.line + 1} não pode entrar num símbolo: ${bad.why}.`, 3200); return; }
    const b = A.boxOf(lines);
    if (!b) return;
    const cx = Math.round(b.cx), cy = Math.round(b.cy), key = 'symbol' + Date.now(), keep = st.lastXf;
    if (cx || cy) A.transformLines(lines, 'move', { dx: -cx, dy: -cy }, key);
    st.lastXf = keep;
    const s = A.editor.value.split('\n'), bl = K.blocks(s), us = K.unitsOf(lines, s);
    if (!us.length || us.some((u) => u.b >= s.length)) { A.hint('Um bloco está sem end: feche no código antes.', 3000); return; }
    const name = A.freeName('symbol'), tops = us.map((u, i) => K.noteTop(s, u.a, i ? us[i - 1].b : -1));
    const last = us.length - 1, ind = K.indentOf(s[us[last].a]), take = new Set(), body = [];
    us.forEach((u, i) => {
      const base = K.indentOf(s[u.a]);
      for (let j = tops[i]; j <= u.b; j++) { take.add(j); body.push(K.reindent(s[j], base, '  ')); }
    });
    // onde ficam o use (no lugar da de cima) e o def: depois do último def do arquivo; sem nenhum, antes da primeira
    // camada; senão logo antes do use (fora de qualquer bloco: um def não fica dentro de group, repeat nem de outro def)
    let spot = tops[last];
    for (const k of bl) if (k.a < tops[last] && tops[last] <= k.b && !take.has(k.a)) spot = Math.min(spot, K.noteTop(s, k.a, -1));
    const defsBefore = bl.filter((k) => k.kind === 'def' && k.b < spot), firstLayer = s.findIndex((t) => word(t) === 'layer');
    if (defsBefore.length) spot = Math.max(...defsBefore.map((k) => k.b)) + 1;
    else if (firstLayer >= 0 && firstLayer < spot) spot = K.noteTop(s, firstLayer, -1);
    const rest = [];
    let useAt = -1, defAt = -1;
    s.forEach((t, i) => { if (i === tops[last]) useAt = rest.length; if (i === spot) defAt = rest.length; if (!take.has(i)) rest.push(t); });
    const useLine = `${ind}use ${name} ${cx},${cy}`, block = [`def ${name}`, ...body, 'end'];
    const pre = defAt > 0 && rest[defAt - 1].trim() ? [''] : [];
    let next;
    if (defAt === useAt) next = rest.slice(0, useAt).concat(pre, block, [''], [useLine], rest.slice(useAt));
    else next = rest.slice(0, defAt).concat(pre, block, rest[defAt] !== undefined && rest[defAt].trim() ? [''] : [], rest.slice(defAt, useAt), [useLine], rest.slice(useAt));
    K.rewrite(next, key);
    const at = next.indexOf(useLine, defAt);
    if (at >= 0) A.setSel([at], at);
    chosen = name;
    A.hint(`Símbolo ${name}: ${many(lines.length, 'forma virou', 'formas viraram')} um def (o 0,0 é o meio delas), e um use ficou no lugar. Duplo clique nele edita o símbolo; o painel Símbolos põe outros.`, 4200);
  }

  // ---------- quebrar o vínculo: o use vira as formas do def ----------
  // Os parâmetros entram no lugar dos nomes (c=cor vira a cor do use) e as {contas} viram números. As formas vão para
  // o lugar, o tamanho, o giro e o espelho do use (o w=, o ink= e o r= não mudam com o scale=, como ao esticar).
  function subst(t, params, vars) {
    const sp = L.splitLine(t), ed = [];
    let bad = '';
    for (const w of sp.words.slice(1)) {
      if (w.text[0] === '"') continue;
      const eq = L.topIndex(w.text, '='), start = eq >= 0 ? eq + 1 : 0, v0 = w.text.slice(start);
      let v = v0.replace(/\{([^{}]*)\}/g, (all, e) => {
        try { const n = L.evalExpr(e, vars); if (!Number.isFinite(n)) throw new Error('nan'); return fmtN(n, 2); } catch (er) { bad = bad || all; return all; }
      });
      if (eq >= 0) v = v.replace(/(^|[^\w#.$-])([A-Za-z_][\w-]*)(?![\w-])/g, (all, pre, id) => (params.has(id) ? pre + params.get(id) : all));
      if (v !== v0) ed.push([w.from + start, w.to, v]);
    }
    if (bad) return { why: `a conta ${bad} não virou número` };
    let out = t;
    for (const [a, b, v] of ed.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + v + out.slice(b);
    return { text: out };
  }
  // o use estica também as espessuras (ink=, w=, thick=, dash=, limb=, size= das partículas e o z=): nas formas
  // soltas, elas vão multiplicadas, para o desenho ficar igual. Um nome da palette vira o número dele.
  const THICK = ['ink', 'w', 'thick', 'dash', 'limb', 'size', 'z'], WDEF = { stroke: 4, line: 1 };
  function thicken(t, k, m) {
    const sp = L.splitLine(t), cmd = sp.words[0] && sp.words[0].text, ed = [];
    // (num use de dentro, o z= soma sem esticar e as espessuras esticam sozinhas pelo scale= dele)
    if (!cmd || !L.DRAWABLE.has(cmd) || cmd === 'use') return t;
    let hasW = false;
    for (const w of sp.words.slice(1)) {
      const eq = L.topIndex(w.text, '=');
      if (eq < 0) continue;
      const key = w.text.slice(0, eq), v = w.text.slice(eq + 1);
      if (key === 'w') hasW = true;
      if (!THICK.includes(key) || (key === 'size' && cmd !== 'emitter')) continue;
      const parts = v.split(','), out = parts.map((p) => {
        const n = Number(p), pv = m.palette.get(p);
        return Number.isFinite(n) && p.trim() !== '' ? fmtN(n * k, 2) : typeof pv === 'number' ? fmtN(pv * k, 2) : null;
      });
      if (out.some((x) => x === null)) continue;
      ed.push([w.from + eq + 1, w.to, out.join(',')]);
    }
    let s = t;
    for (const [a, b, v] of ed.sort((x, y) => y[0] - x[0])) s = s.slice(0, a) + v + s.slice(b);
    if (!hasW && WDEF[cmd] !== undefined) {
      const at = L.splitLine(s), last = at.words[at.words.length - 1];
      // o w= vai antes dos pontos (stroke … : x,y …), senão no fim
      const colon = at.words.find((w) => w.text === ':');
      const pos = colon ? colon.from : last.to, add = `w=${fmtN(WDEF[cmd] * k, 2)}`;
      s = colon ? s.slice(0, pos) + add + ' ' + s.slice(pos) : s.slice(0, pos) + ' ' + add + s.slice(pos);
    }
    return s;
  }
  function breakOne(line, key) {
    const m = st.model, rec = m.byLine.get(line);
    if (!rec || !rec.use) return { why: 'não é um use' };
    const name = rec.use, at = A.defLines(name), A2 = rec.st.attrs;
    if (!at) return { why: `o def ${name} vem de outro arquivo (include)` };
    if (A2.has('bone') || A2.has('cloth')) return { why: 'o use está preso a um osso ou tecido (bone=, cloth=)' };
    if (rec.st.pos.slice(2).some((w) => w.text === 'billboard')) return { why: 'o use é billboard (fica sempre de frente)' };
    const pos = rec.handles.find((h) => h.kind === 'pos');
    if (!pos || pos.fixed) return { why: 'a posição do use tem {conta}' };
    const num = (k, d) => { const a = A2.get(k); if (!a) return d; const v = a.text.split(',').map(Number); return v.some((x) => !Number.isFinite(x)) ? NaN : v; };
    const sc = num('scale', [1]), rot = num('rot', [0]), op = num('opacity', [1]), zz = num('z', [0]);
    if ([sc, rot, op, zz].some((v) => Number.isNaN(v))) return { why: 'o use tem {conta} no scale=, no rot=, no opacity= ou no z=' };
    const flip = A2.get('flip') ? A2.get('flip').text : '';
    const sx = sc[0] * (flip.includes('x') ? -1 : 1), sy = (sc.length > 1 ? sc[1] : sc[0]) * (flip.includes('y') ? -1 : 1), deg = rot[0], o = op[0];
    const ls = A.editor.value.split('\n'), body = ls.slice(at.line + 1, at.end);
    if (body.some((t) => word(t) === 'repeat')) return { why: `o def ${name} tem repeat (as cópias não viram linhas soltas)` };
    // os parâmetros: o padrão do def, trocado pelo do use
    // (o use também pode trocar uma cor da palette ou uma variável: entra no lugar do nome do mesmo jeito)
    const def = m.defs.get(name), params = new Map();
    for (const a of def.st.attrs.values()) params.set(a.key, a.text);
    for (const [k, a] of A2) if (!L.ATTRS.use.includes(k)) params.set(k, a.text);
    const vars = new Map(m.vars || []);
    for (const [k, v] of params) { const n = Number(v); if (Number.isFinite(n)) vars.set(k, n); }
    const out = [], k = Math.sqrt(Math.abs(sx * sy));
    for (const t of body) { const r = subst(t, params, vars); if (r.why) return r; out.push(Math.abs(k - 1) > 1e-9 ? thicken(r.text, k, m) : r.text); }
    // o recuo: o do use, no lugar do de dentro do def
    const inner = out.filter((t) => t.trim()).map((t) => K.indentOf(t)).sort((a, b) => a.length - b.length)[0] || '';
    const ind = K.indentOf(ls[line]);
    let text = out.map((t) => K.reindent(t, inner, ind));
    // um nome que já existe no desenho (de outro vínculo quebrado, por exemplo) ganha um número, como no colar
    const live = new Set(A.layerTree(m).flatMap((t) => t.kids.map((k) => k.name)).filter(Boolean));
    for (const g of A.blocks().groups) if (g.name) live.add(g.name);
    if (text.some((t) => { const w = L.splitLine(t).words.slice(1).find((x) => L.topIndex(x.text, '=') < 0 && x.text[0] !== '"' && !L.DRAW_FLAGS.has(x.text)); return !!w && live.has(w.text); })) {
      const ren = A.renameCopy(text.join('\n'));
      if (ren) text = ren.text.split('\n');
    }
    const ed = A.editor, from = ed.lineStart(line);
    ed.replaceRange(from, from + ls[line].length, text.join('\n'), { key });
    const sigs = A.sigs(), fresh = text.map((_, i) => line + i).filter((l) => sigs.has(l));
    if (!fresh.length) return { n: text.length, lines: [] };
    // o tamanho e o espelho, o giro (os dois em volta do meio) e o lugar: o 0,0 do def vai para o x,y do use
    const b = A.boxOf(fresh), keep = st.lastXf;
    if (b) {
      const c = [b.cx, b.cy];
      if (sx !== 1 || sy !== 1) A.transformLines(fresh, 'scale', { sx, sy, fx: 0.5, fy: 0.5 }, key);
      if (deg) A.transformLines(fresh, 'spin', { deg }, key);
      const r = (deg * Math.PI) / 180, qx = sx * c[0], qy = sy * c[1];
      const dx = pos.x + Math.cos(r) * qx - Math.sin(r) * qy - c[0], dy = pos.y + Math.sin(r) * qx + Math.cos(r) * qy - c[1];
      if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) A.transformLines(fresh, 'move', { dx, dy }, key);
    }
    st.lastXf = keep;
    // a transparência do use passa para cada forma
    // a transparência do use multiplica a de cada forma; o z= do use soma no z de cada uma
    if (o !== 1 || zz[0]) for (const l of fresh) {
      const r2 = st.model.byLine.get(l), at2 = {};
      if (!r2 || !r2.st) continue;
      const co = r2.st.attrs.get('opacity'), cz = r2.st.attrs.get('z'), vo = co ? Number(co.text) : 1, vz = cz ? Number(cz.text) : 0;
      if (o !== 1 && Number.isFinite(vo)) at2.opacity = fmtN(vo * o, 3);
      if (zz[0] && Number.isFinite(vz)) at2.z = fmtN(vz + zz[0], 2);
      if (Object.keys(at2).length) A.setAttrs([l], at2, null, key);
    }
    return { n: text.length, lines: fresh };
  }
  function breakLink() {
    const m = model();
    if (!m || !K.ready('quebrar o vínculo', true)) return;
    if (st.anim) { A.hint('Para quebrar o vínculo, escolha "pose parada" no player.', 2600); return; }
    const uses = A.selected().filter((l) => { const r = m.byLine.get(l); return r && r.use; }).sort((a, b) => b - a);
    if (!uses.length) { A.hint('Escolha um use (uma cópia de um símbolo) para quebrar o vínculo.', 2600); return; }
    const key = 'unlink' + Date.now(), got = [];
    let why = '', shift = 0;
    // de baixo para cima: as linhas de cima não mudam de número
    for (const l of uses) {
      const r = breakOne(l, key);
      if (r.why) { why = why || r.why; continue; }
      got.forEach((g, i) => { got[i] = g + r.n - 1; });
      got.push(...r.lines);
      shift++;
    }
    if (got.length) A.setSel(got, got[0]);
    if (shift) A.hint(`Vínculo quebrado: ${many(shift, 'use virou', 'uses viraram')} ${many(got.length, 'forma', 'formas')} soltas.${why ? ` (Um ficou: ${why}.)` : ''} Ctrl+Z desfaz.`, 3600);
    else A.hint(`Não deu para quebrar o vínculo: ${why}.`, 3200);
  }

  // ---------- apagar e renomear ----------
  function del(name) {
    const m = model(), d = m && m.defs.get(name), at = d && A.defLines(name);
    if (!at || !K.ready('apagar um símbolo')) return;
    if (d.uses) { A.hint(`O símbolo ${name} tem ${many(d.uses, 'use', 'uses')}: apague os use ou quebre o vínculo antes.`, 3200); return; }
    const s = A.editor.value.split('\n'), top = K.noteTop(s, at.line, -1);
    let b = at.end;
    // a linha em branco depois do end vai junto, se ficariam duas
    if (b + 1 < s.length && !s[b + 1].trim() && (top === 0 || !s[top - 1].trim())) b++;
    K.rewrite(s.slice(0, top).concat(s.slice(b + 1)), 'symdel' + Date.now());
    chosen = null;
    A.hint(`Símbolo ${name} apagado. Ctrl+Z desfaz.`, 2400);
  }
  function rename(tile) {
    const name = tile.dataset.name, at = A.defLines(name);
    if (!at) { A.hint(`O def ${name} vem de outro arquivo (include): renomeie lá.`, 3000); return; }
    const lab = tile.querySelector('.sy-name'), inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'sy-ren';
    inp.value = name;
    inp.spellcheck = false;
    inp.setAttribute('aria-label', 'Nome novo do símbolo');
    lab.hidden = true;
    lab.after(inp);
    inp.focus();
    inp.select();
    let done = false;
    const end = (ok) => {
      if (done) return;
      done = true;
      const val = inp.value.trim();
      inp.remove();
      lab.hidden = false;
      if (!ok || !val || val === name) return;
      const r = A.rename(at.line, val);
      if (r.why) { A.hint(`Não renomeei: ${r.why}.`, 3200); return; }
      chosen = val;
      A.hint(`Símbolo ${name} → ${val}${r.n > 1 ? `, com ${many(r.n - 1, 'use', 'uses')}` : ''}. Ctrl+Z desfaz.`, 2800);
    };
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); end(true); } else if (e.key === 'Escape') { e.preventDefault(); end(false); } });
    inp.addEventListener('blur', () => end(true));
    inp.addEventListener('pointerdown', (e) => e.stopPropagation());
    inp.addEventListener('dblclick', (e) => e.stopPropagation());
  }
  // editar pelo painel: entra no def; o Esc volta para o primeiro use dele (se houver)
  function edit(name) {
    const m = model();
    if (!m) return;
    let back = -1;
    for (const [l, r] of m.byLine) if (r.use === name && (back < 0 || l < back)) back = l;
    A.enterDef(name, back);
  }

  // ---------- o painel: clique, duplo clique, arrastar ----------
  sec.addEventListener('click', (e) => {
    if (e.target.closest('.sy-new')) { create(); return; }
    const b = e.target.closest('[data-act]');
    if (b) {
      const act = b.dataset.act;
      if (act === 'place' && chosen) { const at = A.viewCenter(), l = place(chosen, at); if (l >= 0) A.setSel([l], l); } else if (act === 'edit' && chosen) edit(chosen);
      else if (act === 'break') breakLink();
      else if (act === 'del' && chosen) del(chosen);
      return;
    }
    const t = e.target.closest('.sy-tile');
    if (t && !swallow) { chosen = t.dataset.name; mark(); }
  });
  sec.addEventListener('dblclick', (e) => {
    const t = e.target.closest('.sy-tile');
    if (!t) return;
    if (e.target.closest('.sy-name')) rename(t); else edit(t.dataset.name);
  });
  let drag = null, swallow = false;
  sec.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.sy-tile');
    if (!t || e.button !== 0 || e.target.closest('input')) return;
    drag = { name: t.dataset.name, x: e.clientX, y: e.clientY, ghost: null };
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
      const g = document.createElement('div'), c = cache.get(drag.name);
      g.className = 'sy-ghost';
      if (c) { const cv = document.createElement('canvas'); cv.width = c.cv.width; cv.height = c.cv.height; cv.getContext('2d').drawImage(c.cv, 0, 0); g.appendChild(cv); }
      g.appendChild(document.createTextNode(drag.name));
      document.body.appendChild(g);
      drag.ghost = g;
    }
    drag.ghost.style.left = `${e.clientX + 8}px`;
    drag.ghost.style.top = `${e.clientY + 8}px`;
    const over = document.elementFromPoint(e.clientX, e.clientY);
    drag.ghost.classList.toggle('ok', !!over && over.id === 'view');
  });
  function endDrag(e, cancel) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.ghost) return;
    d.ghost.remove();
    swallow = true;
    setTimeout(() => { swallow = false; }, 0);
    if (cancel) return;
    const over = document.elementFromPoint(e.clientX, e.clientY);
    if (!over || over.id !== 'view') return;
    const l = place(d.name, A.toCanvas(e));
    if (l >= 0) A.setSel([l], l);
  }
  document.addEventListener('pointerup', (e) => endDrag(e, false));
  document.addEventListener('pointercancel', (e) => endDrag(e, true));

  // F8: criar símbolo (com o foco fora dos campos)
  window.addEventListener('keydown', (e) => {
    if (drag && drag.ghost && e.key === 'Escape') { e.stopPropagation(); endDrag(e, true); return; }
    if (e.key !== 'F8' || inField(e.target) || A.isFilm() || !st.model) return;
    e.preventDefault();
    create();
  });

  // ---------- menu Objeto › Símbolo ----------
  function menu() {
    const m = model(), sel = A.selected(), r1 = m && sel.length === 1 ? m.byLine.get(sel[0]) : null;
    return [
      { label: 'Criar símbolo', key: 'F8', enabled: () => sel.length > 0, run: create },
      { label: 'Editar símbolo', enabled: () => !!(r1 && r1.use), run: () => A.enterDef(r1.use, sel[0]) },
      { label: 'Sair do símbolo', key: 'Esc', enabled: () => A.symIso().length > 0, run: () => A.exitDef() },
      '-',
      { label: 'Colocar', enabled: () => !!m && m.defs.size > 0, sub: () => [...(m ? m.defs.keys() : [])].map((n) => ({ label: n, run: () => { const l = place(n, A.viewCenter()); if (l >= 0) A.setSel([l], l); } })) },
      { label: 'Quebrar vínculo', enabled: () => sel.some((l) => { const r = m && m.byLine.get(l); return r && r.use; }), run: breakLink },
    ];
  }

  // aberto ou fechado (Janela › Símbolos): a mesma chave das outras partes da coluna
  new MutationObserver(() => { if (shown()) fill(true); }).observe(sec, { attributes: true, attributeFilter: ['hidden', 'class'] });
  A.on('model', () => fill(false));
  A.on('draw', () => { if (shown()) mark(); });
  if (P() && P().sync) P().sync();
  W.symbols = { create, place, breakLink, del, edit, menu, toggle: () => P() && P().toggle('sym'), isOn: () => !!(P() && P().isOn('sym')) };
  setTimeout(() => fill(true), 0);
})(window.Weasel = window.Weasel || {});
