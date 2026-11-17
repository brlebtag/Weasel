/* Weasel — o filme pela tela (etapa 7b do plano docs/planos/interface-illustrator.md, seção 11.8). Quatro coisas:
   - as faixas dos at na linha do tempo do filme (js/timeline.js desenha; aqui fica o que cada gesto escreve):
     arrastar muda o tempo do at, Alt copia, Delete apaga, o botão direito escolhe o ease;
   - o painel Filme, na coluna da direita: o plano (duração e a transição de entrada, com uma prévia pequena de cada
     uma), a câmera (zoom, giro, tremor, escurecer) e o ator escolhido (a animação, numa lista, a velocidade, o
     tamanho, o giro, o espelho, a opacidade e se aparece);
   - as alças no desenho: os cantos da moldura da câmera mudam o zoom= (na vista do mundo) e os do ator, o scale=, e a
     bolinha verde em cima dele, o rot=;
   - "+ at aqui": uma linha at no tempo do player, para o painel e as alças escreverem nela.
   O painel e as alças escrevem onde está o cursor do código: numa linha at deste plano, nela (alvo.prop=); senão, na
   linha que declara o ator ou a câmera. Cada gesto é uma edição só do código (um Ctrl+Z desfaz). */
(function (W) {
  'use strict';
  const A = W.app, L = W.lang, G = W.geom, S = W.scene, SE = W.sel, F = W.film;
  if (!A || !L || !G || !S || !F || !SE || !SE.kit) return;
  const K = SE.kit, st = A.st, M = G.M, many = K.many;
  const $ = (id) => document.getElementById(id);
  const dock = $('dock');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmtN = (v, d) => { const t = String(Number((+v).toFixed(d === undefined ? 2 : d))); return t === '-0' ? '0' : t; };
  const num = (t) => { const v = Number(String(t).trim().replace(',', '.')); return Number.isFinite(v) ? v : NaN; };
  const AT_PLAIN = new Set(['ease', 'blend', 'dur', 'pairs', 'born']);
  const EASES = (W.animTimeline && W.animTimeline.EASES) || [['smooth', 'smooth', ''], ['linear', 'linear', ''], ['in', 'in', ''], ['out', 'out', ''], ['back', 'back', ''], ['step', 'step', '']];
  const curve = (k) => (W.animTimeline && W.animTimeline.curveSvg ? W.animTimeline.curveSvg(k) : '');
  const film = () => (st.model && st.model.film && A.isFilm() ? st.model : null);
  const tline = (m) => F.timeline(m);
  const keyNow = (w) => 'film-' + w + Date.now();

  // ---------- os at do arquivo aberto ----------
  // { line, entry, shot, t (do começo do plano), abs (do começo do filme), tok, rel, mark, ease, targets: [{ key, name, prop, text }],
  //   plain: [[chave, texto]] (blend=, dur=…), phase }
  let atCache = { m: null, list: [] };
  function atLines(m) {
    if (atCache.m === m) return atCache.list;
    const tl = tline(m), list = [];
    for (const [line, rec] of m.byLine) {
      if (!rec || !rec.at || !rec.st || rec.st.cmd !== 'at') continue;
      const entry = tl.entries.find((e) => e.shot === rec.at.shot && e.owner === m);
      if (!entry) continue;
      const tok = rec.st.pos[0] ? rec.st.pos[0].text : '0s', targets = [], plain = [];
      let ease = 'smooth';
      for (const a of rec.st.attrs.values()) {
        if (a.key === 'ease') { ease = a.text; continue; }
        if (AT_PLAIN.has(a.key)) { plain.push([a.key, a.text]); continue; }
        const dot = a.key.lastIndexOf('.');
        if (dot <= 0) continue;
        targets.push({ key: a.key, name: a.key.slice(0, dot), prop: a.key.slice(dot + 1), text: a.text });
      }
      list.push({ line, entry, shot: entry.shot, t: rec.at.t, abs: entry.start / tl.fps + rec.at.t, tok, rel: tok[0] === '+', mark: /^[A-Za-z_]/.test(tok), ease, targets, plain, phase: rec.st.pos.slice(1).some((w) => w.text === 'phase') });
    }
    list.sort((a, b) => a.line - b.line);
    atCache = { m, list };
    return list;
  }
  const kindOf = (m, shot, name) => (name === 'camera' ? 'camera' : shot.actorMap && shot.actorMap.has(name) ? 'actor' : m.lights.has(name) ? 'light' : m.layerMap.has(name) ? 'layer' : 'shape');
  // as faixas da linha do tempo: os atores (na ordem do arquivo), a câmera e o resto, cada uma com os seus at
  let laneCache = { m: null, lanes: [] };
  function lanes(m) {
    if (!m || !m.film) return [];
    if (laneCache.m === m) return laneCache.lanes;
    const by = new Map();
    for (const a of atLines(m)) {
      for (const t of a.targets) {
        if (!by.has(t.name)) by.set(t.name, { name: t.name, kind: kindOf(m, a.shot, t.name), keys: [], seen: new Set() });
        const ln = by.get(t.name);
        if (ln.seen.has(a.line)) { ln.keys.find((k) => k.line === a.line).text += ` ${t.key}=${t.text}`; continue; }
        ln.seen.add(a.line);
        ln.keys.push({ t: a.abs, line: a.line, entry: a.entry.index, fixed: a.mark, ease: a.ease, text: `at ${a.tok} ${t.key}=${t.text}` });
      }
    }
    const order = [...m.film.actors, ...m.film.shots.flatMap((s) => s.actors)].map((x) => x.name);
    const rank = (ln) => (ln.kind === 'actor' ? order.indexOf(ln.name) : ln.kind === 'camera' ? 1e5 : 2e5);
    const out = [...by.values()].sort((a, b) => rank(a) - rank(b));
    for (const ln of out) { ln.keys.sort((a, b) => a.t - b.t || a.line - b.line); delete ln.seen; }
    laneCache = { m, lanes: out };
    return out;
  }

  // ---------- escrever os at ----------
  // o tempo no jeito do token de antes: em quadros (48f) ou em segundos (1.25s)
  function fmtTime(sec, like, fps) {
    if (/f$/.test(like || '')) return `${Math.max(0, Math.round(sec * fps))}f`;
    return `${fmtN(Math.max(0, sec), 3)}s`;
  }
  function ready(verb) {
    if (!film()) return false;
    if (st.playing) { A.hint(`Pause o player para ${verb}.`, 2000); return false; }
    return true;
  }
  // plan: { tok: Map(linha → tempo novo), drops: Map(linha → Set(chaves)), adds: [{ entry, t, attrs, ease, plain, phase, like }],
  //         del: Set(linhas), eases: Map(linha → ease) }
  const newPlan = () => ({ tok: new Map(), drops: new Map(), adds: [], del: new Set(), eases: new Map() });
  function drop(plan, line, key) { if (!plan.drops.has(line)) plan.drops.set(line, new Set()); plan.drops.get(line).add(key); }
  // o tempo (do plano) de cada at depois do plano: os com + andam com o de antes
  function finals(ats, plan, dtOf) {
    const out = new Map();
    const byShot = new Map();
    for (const a of ats) { if (!byShot.has(a.shot)) byShot.set(a.shot, []); byShot.get(a.shot).push(a); }
    for (const list of byShot.values()) {
      let prev = 0, prevOld = 0;
      for (const a of list) {
        let t;
        if (a.mark) t = a.t;
        else if (a.rel && !plan.tok.has(a.line)) t = prev + (a.t - prevOld);
        else t = a.t + (dtOf(a) || 0);
        out.set(a.line, t);
        prevOld = a.t;
        prev = t;
      }
    }
    return out;
  }
  function commit(m, plan, key, caret) {
    const ats = atLines(m), fps = tline(m).fps, src = A.editor.value.split('\n');
    const byLine = new Map(ats.map((a) => [a.line, a]));
    // o que chega a um tempo tira o mesmo alvo de outra linha desse tempo, no mesmo plano (o que chega ganha)
    const fin = finals(ats, plan, (a) => plan.dt && plan.tok.has(a.line) ? plan.dt : 0);
    const left = (a) => a.targets.filter((t) => !(plan.drops.get(a.line) || new Set()).has(t.key));
    const land = [];
    for (const a of ats) if (plan.tok.has(a.line)) for (const t of left(a)) land.push({ shot: a.shot, t: fin.get(a.line), key: t.key, line: a.line });
    for (const x of plan.adds) for (const [k] of x.attrs) land.push({ shot: x.entry.shot, t: x.t, key: k, line: -1 });
    for (const l of land) for (const a of ats) if (a.line !== l.line && a.shot === l.shot && Math.abs(fin.get(a.line) - l.t) < 1e-6 && !plan.del.has(a.line) && a.targets.some((t) => t.key === l.key)) drop(plan, a.line, l.key);
    // as linhas que ficam sem alvo saem; o at com + logo depois de uma que sai ganha o tempo escrito (para não andar)
    for (const a of ats) if (!plan.del.has(a.line) && plan.drops.has(a.line) && !left(a).length) plan.del.add(a.line);
    const shotAts = (shot) => ats.filter((a) => a.shot === shot);
    for (const a of ats) {
      if (!plan.del.has(a.line)) continue;
      const list = shotAts(a.shot), i = list.indexOf(a);
      for (let j = i + 1; j < list.length && list[j].rel; j++) if (!plan.del.has(list[j].line)) { plan.tok.set(list[j].line, fmtTime(fin.get(list[j].line), list[j].tok, fps)); break; }
    }
    // as linhas novas: numa linha do mesmo tempo e do mesmo ease (sem blend=, dur=…), senão logo antes do primeiro at
    // de tempo escrito maior (um at com + depois dela contaria dela), senão depois do último at do plano
    const append = new Map(), inserts = new Map();
    const addAfter = (i, rec) => { if (!inserts.has(i)) inserts.set(i, []); inserts.get(i).push(rec); };
    plan.adds.forEach((x, n) => {
      const list = shotAts(x.entry.shot).filter((a) => !plan.del.has(a.line));
      const host = !x.plain.length && !x.phase ? list.filter((a) => Math.abs(fin.get(a.line) - x.t) < 1e-6 && a.ease === x.ease && !a.plain.length).pop() : null;
      if (host) { if (!append.has(host.line)) append.set(host.line, []); append.get(host.line).push(...x.attrs); x.at = host.line; return; }
      const before = list.find((a) => !a.rel && !a.mark && fin.get(a.line) > x.t + 1e-9);
      let after;
      if (before) after = before.line - 1;
      else if (list.length) after = list[list.length - 1].line;
      else after = x.entry.shot.implicit ? src.length - 1 : x.entry.shot.line;
      const ref = byLine.get(x.from) || list[0];
      const ind = K.indentOf(src[ref ? ref.line : x.entry.shot.line] || '');
      const words = [`at ${fmtTime(x.t, x.like, fps)}`, ...x.attrs.map(([k, v]) => `${k}=${v}`), ...x.plain.map(([k, v]) => `${k}=${v}`)];
      if (x.phase) words.push('phase');
      if (x.ease !== 'smooth') words.push('ease=' + x.ease);
      addAfter(after, { text: ind + words.join(' '), n });
    });
    const next = [];
    let caretAt = -1;
    src.forEach((t, i) => {
      let s = t;
      if (plan.del.has(i)) s = null;
      else if (plan.tok.has(i) || plan.drops.has(i) || append.has(i) || plan.eases.has(i)) s = editLine(t, plan.tok.get(i), plan.drops.get(i), append.get(i), plan.eases.get(i));
      if (s !== null) { if (caret && caret.line === i) caretAt = next.length; next.push(s); }
      for (const x of inserts.get(i) || []) { if (caret && caret.add === x.n) caretAt = next.length; next.push(x.text); }
    });
    if (caret && caret.add !== undefined && caretAt < 0) { const x = plan.adds[caret.add]; if (x && x.at !== undefined) caretAt = next.indexOf(next.find((_, i) => i === x.at)); }
    K.rewrite(next, key, caretAt >= 0 ? caretAt : caret && caret.fallback !== undefined ? caret.fallback : undefined);
  }
  const cutWord = (t, w) => { let a = w.from; while (a > 0 && /[ \t]/.test(t[a - 1])) a--; return [a, w.to, '']; };
  function editLine(t, tok, drops, add, ease) {
    const ws = L.splitLine(t).words, ed = [];
    if (!ws.length) return t;
    if (tok !== undefined && ws[1]) ed.push([ws[1].from, ws[1].to, tok]);
    let easeW = null;
    for (const w of ws.slice(2)) {
      const eq = L.topIndex(w.text, '=');
      if (eq < 0) continue;
      const k = w.text.slice(0, eq);
      if (k === 'ease') { easeW = w; continue; }
      if (drops && drops.has(k)) ed.push(cutWord(t, w));
    }
    const end = ws[ws.length - 1].to;
    let tail = add ? add.map(([k, v]) => ` ${k}=${v}`).join('') : '';
    if (ease !== undefined) {
      if (easeW) ed.push(ease === 'smooth' ? cutWord(t, easeW) : [easeW.from, easeW.to, 'ease=' + ease]);
      else if (ease !== 'smooth') tail += ' ease=' + ease;
    } else if (easeW && tail) { ed.push(cutWord(t, easeW)); tail += ' ' + easeW.text; }
    if (tail) ed.push([end, end, tail]);
    let s = t;
    for (const [a, b, x] of ed.sort((p, q) => q[0] - p[0] || q[1] - p[1])) s = s.slice(0, a) + x + s.slice(b);
    return s;
  }
  // list: [{ name, line }] (da linha do tempo) → Map(at → Set(nomes))
  function wanted(m, list) {
    const by = new Map(atLines(m).map((a) => [a.line, a])), out = new Map();
    for (const s of list) { const a = by.get(s.line); if (!a) continue; if (!out.has(a)) out.set(a, new Set()); out.get(a).add(s.name); }
    return out;
  }
  // os alvos de um nome numa linha, com o que vai junto: o blend= e o phase com o anim=, o dur=, pairs= e born= com o morph=
  function pick(a, names) {
    const attrs = a.targets.filter((t) => names.has(t.name)), props = new Set(attrs.map((t) => t.prop));
    const plain = a.plain.filter(([k]) => (k === 'blend' && props.has('anim')) || (['dur', 'pairs', 'born'].includes(k) && props.has('morph')));
    return { attrs: attrs.map((t) => [t.key, t.text]), plain, phase: a.phase && props.has('anim') };
  }
  function atMove(list, dt, copy) {
    const m = film();
    if (!m || !dt || !ready('mudar os at')) return;
    const want = wanted(m, list);
    if (!want.size) return;
    if ([...want.keys()].some((a) => a.mark)) { A.hint('Um at com o tempo de um marcador (at trovao) anda com o marcador: arraste o marcador na régua, ou troque o tempo no código.', 3600); return; }
    // nenhum sai do plano dele
    for (const a of want.keys()) dt = Math.max(-a.t, Math.min(a.shot.dur - a.t, dt));
    if (Math.abs(dt) < 1e-9) { A.hint('Os at ficam dentro do plano deles.', 1800); return; }
    const plan = newPlan(), fps = tline(m).fps;
    plan.dt = dt;
    let primary = null, chain = 0;
    const ats = atLines(m);
    for (const [a, names] of want) {
      const whole = !copy && a.targets.every((t) => names.has(t.name));
      if (whole) {
        if (a.rel) {
          const list = ats.filter((x) => x.shot === a.shot), i = list.indexOf(a), prev = i > 0 ? list[i - 1].t : 0;
          const d = a.t - prev + dt;
          plan.tok.set(a.line, d >= -1e-9 ? '+' + fmtTime(d, a.tok.slice(1), fps) : fmtTime(a.t + dt, a.tok.slice(1), fps));
        } else plan.tok.set(a.line, fmtTime(a.t + dt, a.tok, fps));
        if (!primary) primary = { line: a.line };
        const list = ats.filter((x) => x.shot === a.shot);
        for (let j = list.indexOf(a) + 1; j < list.length && list[j].rel && !want.has(list[j]); j++) chain++;
        continue;
      }
      const p = pick(a, names);
      if (!copy) for (const [k] of p.attrs) drop(plan, a.line, k);
      if (!copy) for (const [k] of p.plain) if (!a.targets.some((t) => !names.has(t.name) && (k === 'blend' ? t.prop === 'anim' : t.prop === 'morph'))) drop(plan, a.line, k);
      plan.adds.push(Object.assign({ entry: a.entry, t: a.t + dt, ease: a.ease, like: a.tok.replace(/^\+/, ''), from: a.line }, p));
      if (!primary) primary = { add: plan.adds.length - 1 };
    }
    commit(m, plan, (copy ? 'atcopy' : 'atmove') + Date.now(), primary);
    const n = list.length;
    A.hint(`${many(n, 'at', 'at')} ${copy ? 'copiado' + (n > 1 ? 's' : '') : 'movido' + (n > 1 ? 's' : '')} ${fmtN(Math.abs(dt), 3)}s para ${dt > 0 ? 'a frente' : 'trás'}${chain ? ` (e ${many(chain, 'at com + que conta dele', 'at com + que contam deles')})` : ''}. Ctrl+Z desfaz.`, 2600);
  }
  function atDel(list) {
    const m = film();
    if (!m || !ready('apagar os at')) return;
    const want = wanted(m, list);
    if (!want.size) return;
    const plan = newPlan();
    for (const [a, names] of want) {
      const p = pick(a, names);
      for (const [k] of p.attrs) drop(plan, a.line, k);
      if (a.targets.every((t) => names.has(t.name))) plan.del.add(a.line);
    }
    commit(m, plan, 'atdel' + Date.now(), { fallback: m.film.line });
    A.hint(`${many(list.length, 'at apagado', 'at apagados')}. Ctrl+Z desfaz.`, 2000);
  }
  function atEase(list, ease) {
    const m = film();
    if (!m || !ready('mudar o ease')) return;
    const want = wanted(m, list), plan = newPlan();
    let primary = null;
    for (const [a, names] of want) {
      if (a.ease === ease) continue;
      if (a.targets.every((t) => names.has(t.name))) { plan.eases.set(a.line, ease); if (!primary) primary = { line: a.line }; continue; }
      const p = pick(a, names);
      for (const [k] of p.attrs) drop(plan, a.line, k);
      plan.adds.push(Object.assign({ entry: a.entry, t: a.t, ease, like: a.tok.replace(/^\+/, ''), from: a.line }, p));
      if (!primary) primary = { add: plan.adds.length - 1 };
    }
    if (!plan.eases.size && !plan.adds.length) { A.hint(`Já estava com ease=${ease}.`, 1600); return; }
    commit(m, plan, 'atease' + Date.now(), primary);
    const e = EASES.find((x) => x[0] === ease);
    A.hint(`ease=${ease}${e && e[2] ? `: ${e[2]}` : ''} (no at, é como o valor chega nele).`, 2600);
  }

  // ---------- os menus do botão direito ----------
  let pop = null;
  function closePop() { if (pop) { if (pop.stop) pop.stop(); pop.remove(); pop = null; } }
  document.addEventListener('pointerdown', (e) => { if (pop && !pop.contains(e.target)) closePop(); });
  document.addEventListener('keydown', (e) => { if (pop && e.key === 'Escape') closePop(); });
  function place(p, x, y) {
    document.body.appendChild(p);
    const w = p.offsetWidth, h = p.offsetHeight;
    p.style.left = Math.max(4, Math.min(window.innerWidth - w - 4, x + 2)) + 'px';
    p.style.top = Math.max(4, Math.min(window.innerHeight - h - 4, y - h - 4)) + 'px';
    p.addEventListener('pointerdown', (e) => e.stopPropagation());
    pop = p;
  }
  function atMenu(x, y, list) {
    closePop();
    const m = film();
    if (!m || !list.length) return;
    const want = wanted(m, list), eases = new Set([...want.keys()].map((a) => a.ease));
    const p = document.createElement('div');
    p.className = 'atl-pop';
    p.setAttribute('role', 'menu');
    p.innerHTML = `<div class="atl-h">ease de ${many(list.length, 'at', 'at')} (como o valor chega nele)</div><div class="atl-eases">${EASES.map(([k, n, t]) => `<button type="button" data-ease="${k}" class="${eases.size === 1 && eases.has(k) ? 'on' : ''}" title="${esc(t)}">${curve(k)}<span>${n}</span></button>`).join('')}</div>
      <div class="atl-acts"><button type="button" data-act="go"><span>Ir para a linha</span><kbd>clique</kbd></button><button type="button" data-act="del"><span>Apagar</span><kbd>Delete</kbd></button></div>`;
    p.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      closePop();
      if (b.dataset.ease) atEase(list, b.dataset.ease);
      else if (b.dataset.act === 'del') atDel(list);
      else if (b.dataset.act === 'go') A.editor.reveal(list[0].line, 0);
    });
    place(p, x, y);
  }

  // ---------- as transições (shot … in=), com prévia ----------
  const TRANS = [['', 'corte', 'sem transição: corta seco do plano anterior'], ['fade', 'dissolver', 'fade: o plano novo aparece por cima do anterior'], ['wipe', 'cortina', 'wipe: o plano novo entra da esquerda para a direita'], ['slide', 'empurrar', 'slide: o plano novo empurra o anterior para a esquerda'], ['zoom', 'zoom', 'zoom: o plano anterior cresce e some'], ['iris', 'íris', 'iris: um círculo fecha sobre o anterior e abre sobre o novo']];
  const TW = 84, TH = 47;
  // o ponto da troca que a prévia mostra parada (a íris no meio é preta: mostra ela abrindo)
  const REST = { cut: -1, fade: 0.5, wipe: 0.5, slide: 0.5, zoom: 0.4, iris: 0.75 };
  const restOf = (type) => REST[type || 'cut'];
  let thumbs = { key: '', a: null, b: null };
  // o último quadro do plano anterior (ou preto, no primeiro) e o quadro do novo no fim da transição, pequenos
  function frames(m, entry) {
    const tl = tline(m), k = Math.min(2, window.devicePixelRatio || 1), w = Math.round(TW * k), h = Math.round(TH * k);
    const d = entry.shot.trans ? entry.shot.trans.dur : 0.5, fb = entry.start + Math.min(entry.frames - 1, Math.round(d * tl.fps));
    const key = `${A.editor.value.length}|${m.byLine.size}|${entry.index}|${fb}|${w}`;
    if (thumbs.key === key && thumbs.m === m) return thumbs;
    const one = (f) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d');
      const s = Math.min(w / m.canvas.w, h / m.canvas.h);
      x.fillStyle = '#000';
      x.fillRect(0, 0, w, h);
      if (f !== null) { x.setTransform(s, 0, 0, s, (w - m.canvas.w * s) / 2, (h - m.canvas.h * s) / 2); try { F.drawFrame(x, m, f, { still: true }); } catch (e) { /* um quadro que não desenha: fica preto */ } }
      return c;
    };
    thumbs = { key, m, a: one(entry.index > 0 ? entry.start - 1 : null), b: one(fb), w, h, s: Math.min(w / m.canvas.w, h / m.canvas.h) };
    return thumbs;
  }
  function paintTrans(cv, m, type, p, T) {
    const x = cv.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, cv.width, cv.height);
    if (!type) {
      // corte: parado, metade de cada um com o risco do corte; andando, um e depois o outro, sem mistura
      if (p === REST.cut) {
        const half = Math.round(cv.width / 2);
        x.drawImage(T.a, 0, 0);
        x.drawImage(T.b, half, 0, cv.width - half, cv.height, half, 0, cv.width - half, cv.height);
        x.fillStyle = 'rgba(255,255,255,.75)';
        x.fillRect(half, 0, 1, cv.height);
      } else x.drawImage(p < 0.5 ? T.a : T.b, 0, 0);
      return;
    }
    const ox = (cv.width - m.canvas.w * T.s) / 2, oy = (cv.height - m.canvas.h * T.s) / 2;
    F.composeTransition(x, { type, p }, T.a, T.b, [T.s, 0, 0, T.s, ox, oy], m.canvas.w, m.canvas.h, false);
  }
  // os seis botões, cada um com a prévia parada no meio da troca; com o mouse em cima, ela anda
  function transTiles(m, entry, onPick) {
    const box = document.createElement('div');
    box.className = 'fm-trans';
    const T = frames(m, entry), cur = entry.shot.trans ? entry.shot.trans.type : '';
    let anim = 0;
    for (const [type, label, title] of TRANS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = type === cur ? 'on' : '';
      b.title = title;
      b.dataset.trans = type;
      const cv = document.createElement('canvas');
      cv.width = T.w;
      cv.height = T.h;
      paintTrans(cv, m, type, restOf(type), T);
      b.append(cv, Object.assign(document.createElement('span'), { textContent: label }));
      b.addEventListener('pointerenter', () => {
        cancelAnimationFrame(anim);
        const t0 = performance.now();
        const step = (now) => { const u = ((now - t0) / 1100) % 1.25; paintTrans(cv, m, type, Math.min(1, u), T); anim = requestAnimationFrame(step); };
        anim = requestAnimationFrame(step);
      });
      b.addEventListener('pointerleave', () => { cancelAnimationFrame(anim); paintTrans(cv, m, type, restOf(type), T); });
      b.addEventListener('click', () => onPick(type));
      box.appendChild(b);
    }
    box.stop = () => cancelAnimationFrame(anim);
    return box;
  }
  function setTrans(entry, type, dur) {
    const m = film();
    if (!m || entry.owner !== m || entry.shot.implicit) return;
    const d = dur !== undefined ? dur : entry.shot.trans ? entry.shot.trans.dur : 0.5;
    A.setAttrs([entry.shot.line], { in: type ? `${type},${fmtN(Math.min(d, entry.shot.dur), 3)}s` : null }, null, keyNow('in'));
    A.hint(type ? `O plano ${entry.shot.name} entra com ${type} (${fmtN(d, 3)}s).` : `O plano ${entry.shot.name} corta seco.`, 2200);
  }
  function shotMenu(x, y, entry) {
    closePop();
    const m = film();
    if (!m || entry.owner !== m || entry.shot.implicit) return;
    const p = document.createElement('div');
    p.className = 'atl-pop fm-pop';
    p.innerHTML = `<div class="atl-h">Como o plano <b>${esc(entry.shot.name)}</b> entra (in=)</div>`;
    const tiles = transTiles(m, entry, (type) => { closePop(); setTrans(entry, type); });
    p.appendChild(tiles);
    p.stop = tiles.stop;
    place(p, x, y);
  }

  // ---------- onde o painel e as alças escrevem ----------
  const here = () => { const m = film(); return m ? F.locate(m, st.frame) : null; };
  // { line, at } : a linha at do cursor (do plano do player), ou a linha que declara o ator (ou a câmera do plano);
  // { insert } : o plano não tem linha camera (a câmera nova entra logo depois do shot)
  function dest(kind, name) {
    const m = film(), loc = here();
    if (!m || !loc || loc.entry.owner !== m) return null;
    const rec = m.byLine.get(st.caret.line);
    if (rec && rec.at && rec.st.cmd === 'at' && rec.at.shot === loc.entry.shot) return { line: st.caret.line, at: true, t: rec.at.t };
    if (kind === 'actor') { const ac = actorOf(m, loc.entry.shot, name); return ac && m.byLine.has(ac.line) && m.byLine.get(ac.line).actor === ac ? { line: ac.line } : null; }
    for (const [line, r] of m.byLine) if (r && r.camera === loc.entry.shot.cam) return { line };
    if (loc.entry.shot.implicit) { for (const [line, r] of m.byLine) if (r && r.camera === m.film.camera) return { line }; return { insert: m.film.line }; }
    return { insert: loc.entry.shot.line };
  }
  const actorOf = (m, shot, name) => [...m.film.actors, ...shot.actors].find((a) => a.name === name) || null;
  const track = (shot, kind, name, prop) => shot.tracks.get(`${kind}:${name}.${prop}`);
  // a propriedade muda num at antes do player: escrever na declaração não mudaria o que se vê
  function shadowed(loc, kind, name, props) {
    for (const p of props) {
      const tr = track(loc.entry.shot, kind, name, p);
      const k = tr && tr.keys.filter((q) => q.t <= loc.t + 1e-9).pop();
      if (k) return k;
    }
    return null;
  }
  const PROPS = { scale: ['sx', 'sy'], pos: ['x', 'y'] };
  // escreve alvo.prop=valor (null tira; show: a palavra hidden na declaração)
  function put(kind, name, prop, value, key) {
    const m = film(), loc = here(), d = dest(kind, name);
    if (!m || !loc) return false;
    if (!d) { A.hint(loc.entry.owner !== m ? 'Este plano é de outro arquivo (scene): abra o arquivo dele para mudar.' : `O ator ${name} vem de outro lugar: mude no código.`, 2600); return false; }
    if (!d.at) {
      const sh = shadowed(loc, kind, name, PROPS[prop] || [prop]);
      if (sh) { A.hint(`O ${prop} ${kind === 'camera' ? 'da câmera' : `de ${name}`} muda num at antes daqui (linha ${sh.line + 1}): ponha o cursor nele, ou use "+ at aqui".`, 3600); return false; }
    }
    key = key || keyNow(prop);
    // (o que não mudou nada também conta como escrito: o arraste continua)
    if (d.at) { A.setAttrs([d.line], { [`${name}.${prop}`]: value === null ? null : value }, null, key); return true; }
    if (d.insert !== undefined) {
      if (value === null) return false;
      const src = A.editor.value.split('\n'), ind = K.indentOf(src[d.insert] || '');
      const next = src.slice(0, d.insert + 1).concat([`${ind}camera ${prop}=${value}`], src.slice(d.insert + 1));
      K.rewrite(next, key, st.caret.line > d.insert ? st.caret.line + 1 : st.caret.line);
      return true;
    }
    if (kind === 'actor' && prop === 'show') { A.setAttrs([d.line], null, { hidden: value === '0' }, key); return true; }
    const plain = value === null || (prop === 'anim' && value === 'none') || (prop === 'flip' && value === 'none') ? null : value;
    A.setAttrs([d.line], { [prop]: plain }, null, key);
    return true;
  }
  // + at aqui: uma linha at no tempo do player, com a posição de agora do ator escolhido (ou da câmera); o cursor
  // vai para ela, e o painel e as alças passam a escrever nela
  function atHere() {
    const m = film(), loc = here();
    if (!m || !loc || !ready('pôr um at')) return;
    if (loc.entry.owner !== m) { A.hint('Este plano é de outro arquivo (scene).', 2200); return; }
    const ats = atLines(m), same = ats.find((a) => a.shot === loc.entry.shot && Math.abs(a.t - loc.t) < 1e-6);
    if (same) { A.editor.reveal(same.line, 0); A.hint(`Já há um at em ${fmtN(loc.t, 3)}s (linha ${same.line + 1}): o painel escreve nele.`, 2400); return; }
    const s = state(), name = chosen && s && s.ac ? chosen : 'camera';
    let attr;
    if (name === 'camera') { const c = camNow(loc); attr = ['camera.zoom', fmtN(c.zoom, 3)]; } else attr = [`${name}.pos`, `${fmtN(s.x, 1)},${fmtN(s.y, 1)}`];
    const plan = newPlan();
    plan.adds.push({ entry: loc.entry, t: loc.t, attrs: [attr], ease: 'smooth', plain: [], phase: false, like: 's' });
    commit(m, plan, 'athere' + Date.now(), { add: 0 });
    A.hint(`at ${fmtN(loc.t, 3)}s: agora o painel e as alças escrevem nesta linha.`, 2800);
  }

  // ---------- o que está no player ----------
  let chosen = ''; // o ator escolhido (clique nele no desenho, ou na lista do painel)
  let stCache = { k: '', s: null };
  function state() {
    const m = film();
    if (!m || !chosen) return null;
    const k = `${st.frame}|${chosen}|${m.byLine.size}|${A.editor.value.length}`;
    if (stCache.k === k && stCache.m === m) return stCache.s;
    let s = null;
    try { const fs = F.frameState(m, st.frame); s = fs ? fs.who.find((w) => !w.stage && !w.morph && w.ac.name === chosen) || null : null; } catch (e) { s = null; }
    stCache = { k, m, s };
    return s;
  }
  function camNow(loc) {
    const sh = loc.entry.shot, c = sh.cam, v = (p, base) => F.valueAt(track(sh, 'camera', 'camera', p), loc.t, base);
    return { zoom: v('zoom', c.zoom), rot: v('rot', c.rot), shake: v('shake', c.shake), fade: v('fade', c.fade) };
  }
  // o ator da linha do cursor (a linha actor, ou o primeiro ator de uma linha at) passa a ser o escolhido, quando o
  // cursor anda (escolher outro na lista ou no desenho vale até o cursor andar de novo)
  let followed = -1;
  function follow() {
    const m = film();
    if (!m || st.caret.line === followed) return;
    followed = st.caret.line;
    const rec = m.byLine.get(st.caret.line);
    if (rec && rec.actor) chosen = rec.actor.name;
    else if (rec && rec.at && rec.st.cmd === 'at') {
      const names = [...rec.st.attrs.values()].map((a) => a.key.slice(0, Math.max(0, a.key.lastIndexOf('.')))).filter((n) => n && rec.at.shot.actorMap && rec.at.shot.actorMap.has(n));
      if (names.length && !names.includes(chosen)) chosen = names[0];
    }
  }

  // ---------- o painel Filme ----------
  const sec = dock ? document.createElement('section') : null;
  let body = null;
  if (sec) {
    sec.className = 'dk-sec fm-sec';
    sec.dataset.sec = 'film';
    sec.innerHTML = `<div class="dk-head"><b>Filme</b><span class="dk-what"></span><button type="button" class="x" data-close="film" title="Fechar (Janela › Filme abre de novo)" aria-label="Fechar">✕</button></div><div class="dk-body"></div>`;
    dock.insertBefore(sec, dock.firstChild);
    body = sec.querySelector('.dk-body');
  }
  const row = (label, inner, title) => `<div class="pp-row"${title ? ` title="${esc(title)}"` : ''}><span class="pp-k">${label}</span>${inner}</div>`;
  const numIn = (f, ph) => `<input type="text" class="pp-num" data-fm="${f}" spellcheck="false" autocomplete="off"${ph ? ` placeholder="${ph}"` : ''}>`;
  let shape = '', tiles = null;
  function render() {
    if (!sec || sec.hidden || !body) return;
    const m = film(), loc = here();
    if (!m || !loc) { body.innerHTML = ''; shape = ''; return; }
    follow();
    const entry = loc.entry, mine = entry.owner === m, shot = entry.shot;
    const actors = [...m.film.actors, ...shot.actors].filter((a) => a.model);
    if (chosen && !actors.some((a) => a.name === chosen)) chosen = '';
    const s = state(), ac = s ? s.ac : null;
    const d = mine ? dest(ac ? 'actor' : 'camera', ac ? ac.name : 'camera') : null;
    const sig = [entry.index, mine, chosen, ac && ac.model ? ac.model.anims.map((a) => a.name).join(',') : '', actors.map((a) => a.name).join(','), d && d.at ? 'at' : 'decl', shot.trans ? shot.trans.type : '', m === thumbs.m ? '' : 'new'].join('|');
    if (sig !== shape) {
      shape = sig;
      if (tiles && tiles.stop) tiles.stop();
      tiles = null;
      let h = `<div class="pp-grp"><div class="pp-t">Escreve em</div><div class="fm-dest"></div><div class="fm-acts"><button type="button" data-act="here" title="Uma linha at no tempo do player, para o ator escolhido (ou a câmera): o painel e as alças passam a escrever nela">+ at aqui</button><select class="pp-sel fm-ease" data-fm="ease" title="ease= do at do cursor: como os valores chegam nele">${EASES.map(([k]) => `<option value="${k}">ease ${k}</option>`).join('')}</select></div></div>`;
      h += `<div class="pp-grp"><div class="pp-t">Plano <button type="button" class="pp-go" data-go="${shot.implicit ? m.film.line : shot.line}" title="Ir para a linha do plano no código">${esc(entry.name)}</button></div>`;
      if (!mine) h += '<div class="pp-note">Este plano é de outro arquivo (scene): abra o arquivo dele para mudar.</div>';
      else if (!shot.implicit) h += row('Duração', `${numIn('dur', 's')}<span class="fm-u">s</span>`) + `<div class="pp-sub">Entrada (in=) ${numIn('tdur', '0.5')}<span class="fm-u">s</span></div><div class="fm-tiles"></div>`;
      h += '</div>';
      if (mine) {
        h += `<div class="pp-grp"><div class="pp-t">Câmera</div>${row('Zoom', numIn('zoom', '1'), 'zoom=: 2 aproxima o dobro; na vista do mundo, os cantos da moldura laranja também mudam')}${row('Giro', numIn('crot', '0'), 'rot= da câmera, em graus')}${row('Tremor', numIn('shake', '0'), 'shake=: quanto a câmera treme, em pixels')}${row('Escurecer', `${numIn('fade', '0')}<input type="range" class="pp-range" data-fmr="fade" min="0" max="1" step="0.05">`, 'fade=: 1 é tudo preto')}</div>`;
        h += `<div class="pp-grp"><div class="pp-t">Ator</div>${row('Quem', `<select class="pp-sel" data-fm="who"><option value="">(clique num ator)</option>${actors.map((a) => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join('')}</select>`)}`;
        if (ac) {
          const anims = ac.model.anims.map((a) => a.name);
          h += row('Animação', `<select class="pp-sel" data-fm="anim"><option value="none">(nenhuma)</option>${anims.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select>`, 'anim=: troca de uma vez, e a animação começa do quadro 0');
          h += row('Velocidade', numIn('speed', '1'), 'speed=: 2 toca duas vezes mais rápido');
          h += row('Tamanho', numIn('scale', '1'), 'scale=: os cantos do ator, no desenho, também mudam');
          h += row('Giro', numIn('rot', '0'), 'rot=, em graus: a bolinha verde em cima do ator também gira');
          h += row('Espelho', `<select class="pp-sel" data-fm="flip"><option value="none">nenhum</option><option value="x">x</option><option value="y">y</option><option value="xy">xy</option></select>`, 'flip=: x vira para o outro lado');
          h += row('Opacidade', `${numIn('opacity', '1')}<input type="range" class="pp-range" data-fmr="opacity" min="0" max="1" step="0.05">`);
          h += row('Aparece', '<label class="pp-chk"><input type="checkbox" data-fm="show"> show</label>');
        } else h += '<div class="pp-note">Clique num ator no desenho (ou escolha na lista) para ver e trocar a animação, o tamanho e o giro dele.</div>';
        h += '</div>';
      }
      body.innerHTML = h;
      const slot = body.querySelector('.fm-tiles');
      if (slot) { tiles = transTiles(m, entry, (type) => setTrans(entry, type, transDur())); slot.appendChild(tiles); }
    }
    fill(m, loc, s, d);
  }
  const transDur = () => { const i = body && body.querySelector('[data-fm=tdur]'); const v = i ? num(i.value) : NaN; return v > 0 ? v : undefined; };
  let force = false;
  function setVal(f, v) {
    const el = body.querySelector(`[data-fm="${f}"]`);
    if (!el || (el === document.activeElement && !force)) return;
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    const r = body.querySelector(`[data-fmr="${f}"]`);
    if (r && r !== document.activeElement) r.value = v;
  }
  function fill(m, loc, s, d) {
    const what = sec.querySelector('.dk-what'), dl = body.querySelector('.fm-dest'), es = body.querySelector('.fm-ease');
    what.textContent = `${loc.entry.name} · ${fmtN(loc.t, 2)}s`;
    if (dl) {
      const rec = d && d.line !== undefined ? m.byLine.get(d.line) : null;
      dl.innerHTML = !d ? '<span class="fm-no">nada (plano de outro arquivo)</span>' : d.at ? `<code>at ${fmtN(d.t, 3)}s</code> <button type="button" class="pp-go" data-go="${d.line}">linha ${d.line + 1}</button>` : d.insert !== undefined ? '<code>camera</code> nova, logo depois do <code>shot</code>' : `<code>${esc(rec ? rec.st.cmd : '')}${rec && rec.actor ? ' ' + esc(rec.actor.name) : ''}</code> <button type="button" class="pp-go" data-go="${d.line}">linha ${d.line + 1}</button>`;
    }
    if (es) {
      es.hidden = !(d && d.at);
      if (d && d.at) { const a = atLines(m).find((x) => x.line === d.line); if (a && es !== document.activeElement) es.value = a.ease; }
    }
    const shot = loc.entry.shot;
    setVal('dur', fmtN(shot.dur, 3));
    setVal('tdur', shot.trans ? fmtN(shot.trans.dur, 3) : '');
    const c = camNow(loc);
    setVal('zoom', fmtN(c.zoom, 3));
    setVal('crot', fmtN(c.rot, 1));
    setVal('shake', fmtN(c.shake, 1));
    setVal('fade', fmtN(c.fade, 2));
    setVal('who', chosen);
    if (s) {
      const sp = F.valueAt(track(shot, 'actor', s.ac.name, 'speed'), loc.t, s.ac.speed);
      setVal('anim', s.anim || 'none');
      setVal('speed', sp === 'auto' ? 'auto' : fmtN(sp, 2));
      setVal('scale', Math.abs(s.sx - s.sy) < 1e-6 ? fmtN(s.sx, 3) : `${fmtN(s.sx, 3)},${fmtN(s.sy, 3)}`);
      setVal('rot', fmtN(F.valueAt(track(shot, 'actor', s.ac.name, 'rot'), loc.t, s.ac.rot), 1));
      setVal('flip', s.flip[0] < 0 && s.flip[1] < 0 ? 'xy' : s.flip[0] < 0 ? 'x' : s.flip[1] < 0 ? 'y' : 'none');
      setVal('opacity', fmtN(s.opacity, 2));
      setVal('show', s.show >= 0.5);
    }
  }
  // as mudanças: cada campo escreve alvo.prop= (ou o atributo da declaração)
  function change(f, raw) {
    const m = film(), loc = here();
    if (!m || !loc || !ready('mudar o filme')) return;
    const shot = loc.entry.shot, v = String(raw).trim();
    if (f === 'who') { chosen = v; shape = ''; render(); A.draw(); return; }
    if (f === 'ease') { const d = dest('camera', 'camera'); if (d && d.at) A.setAttrs([d.line], { ease: v === 'smooth' ? null : v }, null, keyNow('ease')); return; }
    if (f === 'dur') { const n = num(v); if (n > 0) A.setAttrs([shot.line], { dur: fmtN(n, 3) + 's' }, null, keyNow('dur')); return; }
    if (f === 'tdur') { const n = num(v); if (n > 0 && shot.trans) setTrans(loc.entry, shot.trans.type, n); return; }
    const cam = { zoom: 'zoom', crot: 'rot', shake: 'shake', fade: 'fade' }[f];
    if (cam) { const n = num(v); if (Number.isFinite(n)) put('camera', 'camera', cam, fmtN(n, 3)); return; }
    if (!chosen) return;
    if (f === 'anim' || f === 'flip') { put('actor', chosen, f, v); return; }
    if (f === 'show') { put('actor', chosen, 'show', raw ? '1' : '0'); return; }
    if (f === 'speed') { if (v === 'auto' || num(v) > 0) put('actor', chosen, 'speed', v === 'auto' ? 'auto' : fmtN(num(v), 3)); return; }
    if (f === 'scale') { const p = v.split(',').map(num); if (p.length <= 2 && p.every((x) => x > 0)) put('actor', chosen, 'scale', p.map((x) => fmtN(x, 3)).join(',')); return; }
    if (f === 'rot' || f === 'opacity') { const n = num(v); if (Number.isFinite(n)) put('actor', chosen, f, fmtN(f === 'opacity' ? Math.max(0, Math.min(1, n)) : n, f === 'opacity' ? 2 : 1)); }
  }
  // o que não escreveu nada (recusado, ou um valor que não serve) volta a mostrar o valor de verdade
  function apply(f, v) {
    const before = A.editor.value;
    change(f, v);
    if (A.editor.value === before && f !== 'who') { force = true; try { const m = film(), loc = here(); if (m && loc) fill(m, loc, state(), loc.entry.owner === m ? dest(state() ? 'actor' : 'camera', state() ? chosen : 'camera') : null); } finally { force = false; } }
  }
  if (body) {
    body.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.fmr) { apply(t.dataset.fmr, t.value); return; }
      if (t.dataset.fm) apply(t.dataset.fm, t.type === 'checkbox' ? t.checked : t.value);
    });
    body.addEventListener('keydown', (e) => {
      const t = e.target;
      if (e.key === 'Enter' && t.dataset.fm && t.tagName === 'INPUT') { e.preventDefault(); apply(t.dataset.fm, t.value); }
      if (e.key === 'Escape' && t.tagName === 'INPUT') { t.blur(); shape += '!'; render(); }
    });
    body.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (g) { A.editor.reveal(+g.dataset.go, 0); return; }
      const b = e.target.closest('[data-act]');
      if (b && b.dataset.act === 'here') atHere();
    });
  }

  // ---------- as alças no desenho ----------
  const KNOB = 4, GRAB = 9, SPIN_GAP = 26;
  // a caixa do que o ator desenha neste quadro, nas coordenadas do arquivo dele (sem as camadas escondidas)
  let boxCache = { k: '', b: null };
  function actorBox(s) {
    const k = `${s.ac.name}|${s.anim}|${s.animFrame}|${s.model && s.model.canvas.w}|${A.editor.value.length}`;
    if (boxCache.k === k) return boxCache.b;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const md = s.model, pose = s.pose, hide = s.ac.hide;
    if (md && pose) {
      for (const Ly of md.layers) {
        if (Ly.hidden || Ly.guide || (hide && hide.has(Ly.name))) continue;
        for (const it of Ly.items) {
          if (it.el.hidden || it.part === 'ink') continue;
          let g = null;
          try { g = S.geometry(md, pose, it.el); } catch (e) { g = null; }
          if (!g || !g.segs || !g.segs.length) continue;
          const b = S.segsBox(g.segs);
          if (!b.w && !b.h) continue;
          x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
        }
      }
    }
    const b = x0 === Infinity ? (md ? { x: 0, y: 0, w: md.canvas.w, h: md.canvas.h } : null) : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    boxCache = { k, b };
    return b;
  }
  const on = () => film() && !st.playing && (st.tool === 'select' || st.tool === 'direct') && !(sec && sec.hidden);
  // as alças de agora, nas coordenadas do quadro (as do toCanvas): { cam: { q, c, knobs }, ac: { q, P, knobs, spin, s } }
  function grips(z) {
    const m = film(), out = {};
    if (!m || !on()) return out;
    const loc = here();
    if (!loc || loc.entry.owner !== m) return out;
    if (!st.camView) {
      const q = F.cameraQuad(m, st.frame);
      if (q) out.cam = { q, c: [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2], knobs: q };
    }
    const s = state();
    if (s && s.show >= 0.5 && s.model) {
      const b = actorBox(s);
      if (b) {
        const V = F.viewAt(m, st.frame, s.ac.screen ? Infinity : s.depth, st.camView ? 'camera' : 'world'), T = M.mul(V, s.mat);
        const q = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].map((p) => M.apply(T, p[0], p[1]));
        const P = M.apply(V, s.x, s.y), top = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2], mid = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2];
        const dx = top[0] - mid[0], dy = top[1] - mid[1], l = Math.hypot(dx, dy) || 1;
        out.ac = { q, P, knobs: q, spin: [top[0] + (dx / l) * SPIN_GAP / z, top[1] + (dy / l) * SPIN_GAP / z], top, s };
      }
    }
    return out;
  }
  function overlay(ctx, z) {
    const g = grips(z);
    const knob = (p, c) => { const r = KNOB / z; ctx.beginPath(); ctx.rect(p[0] - r, p[1] - r, r * 2, r * 2); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1.4 / z; ctx.strokeStyle = '#14141c'; ctx.stroke(); };
    if (g.cam) for (const p of g.cam.knobs) knob(p, '#ff8a1f');
    if (g.ac) {
      ctx.strokeStyle = 'rgba(185,173,245,.85)';
      ctx.lineWidth = 1 / z;
      ctx.setLineDash([5 / z, 4 / z]);
      ctx.beginPath();
      g.ac.q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(g.ac.top[0], g.ac.top[1]);
      ctx.lineTo(g.ac.spin[0], g.ac.spin[1]);
      ctx.strokeStyle = '#3fcf8e';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.ac.spin[0], g.ac.spin[1], 4.5 / z, 0, Math.PI * 2);
      ctx.fillStyle = '#3fcf8e';
      ctx.fill();
      for (const p of g.ac.knobs) knob(p, '#b9adf5');
      ctx.font = `${11 / z}px ui-monospace, Consolas, monospace`;
      ctx.fillStyle = '#d9d1ff';
      ctx.fillText(g.ac.s.ac.name, g.ac.q[3][0] + 2 / z, g.ac.q[3][1] + 13 / z);
    }
  }
  function grab(e) {
    const g = grips(st.view.z), p = A.toCanvas(e), r = GRAB / st.view.z, near = (a) => Math.hypot(a[0] - p[0], a[1] - p[1]) <= r;
    if (g.ac && near(g.ac.spin)) return { kind: 'rot', g, p };
    if (g.ac) for (const k of g.ac.knobs) if (near(k)) return { kind: 'scale', g, p, k };
    if (g.cam) for (const k of g.cam.knobs) if (near(k)) return { kind: 'zoom', g, p, k };
    return null;
  }
  // o clique num ator (fora das alças) escolhe ele; o cursor vai para a linha dele, menos quando está num at deste
  // plano (aí o painel continua escrevendo no at)
  function pickActor(e) {
    const m = film(), loc = here();
    if (!m || !loc || loc.entry.owner !== m) return false;
    const p = A.toCanvas(e);
    let fs = null;
    try { fs = F.frameState(m, st.frame); } catch (er) { return false; }
    let best = null;
    for (const s of fs.who) {
      if (s.stage || s.morph || !s.model || s.show < 0.5 || !s.pose) continue;
      const b = actorBox(s);
      if (!b) continue;
      const T = M.mul(F.viewAt(m, st.frame, s.ac.screen ? Infinity : s.depth, st.camView ? 'camera' : 'world'), s.mat);
      const inv = M.invert(T), q = M.apply(inv, p[0], p[1]);
      if (q[0] < b.x || q[1] < b.y || q[0] > b.x + b.w || q[1] > b.y + b.h) continue;
      // o da frente: o mais perto (depth menor); no empate, o que vem depois no arquivo
      if (!best || s.depth < best.depth || (s.depth === best.depth && (s.ac.order || 0) >= (best.ac.order || 0))) best = s;
    }
    // o cenário (um ator do tamanho do quadro) só conta quando nada mais está ali
    if (!best) return false;
    const rec = m.byLine.get(st.caret.line), inAt = rec && rec.at && rec.st.cmd === 'at' && rec.at.shot === loc.entry.shot;
    chosen = best.ac.name;
    shape = '';
    if (!inAt && m.byLine.has(best.ac.line) && m.byLine.get(best.ac.line).actor === best.ac) { A.editor.reveal(best.ac.line, 0); followed = best.ac.line; }
    render();
    A.hint(`${best.ac.name}: os cantos mudam o tamanho (scale=), a bolinha verde gira (rot=); o painel Filme mostra a animação dele.`, 2600);
    drag = null;
    return true;
  }
  let drag = null;
  const hook = {
    overlay,
    cursor(e) { const h = on() ? grab(e) : null; return h ? (h.kind === 'rot' ? 'alias' : 'nwse-resize') : ''; },
    down(e) {
      if (!on()) return false;
      const h = grab(e);
      if (!h) return pickActor(e);
      const loc = here(), key = keyNow(h.kind);
      if (h.kind === 'zoom') { drag = { kind: 'zoom', key, c: h.g.cam.c, d0: Math.hypot(h.k[0] - h.g.cam.c[0], h.k[1] - h.g.cam.c[1]), z0: camNow(loc).zoom }; A.hint('Os cantos da moldura mudam o zoom= da câmera (dentro: aproxima). Com Shift, de 0.1 em 0.1.', 2600); }
      else {
        const s = h.g.ac.s, P = h.g.ac.P;
        if (h.kind === 'scale') { drag = { kind: 'scale', key, P, d0: Math.hypot(h.k[0] - P[0], h.k[1] - P[1]) || 1, sx: s.sx, sy: s.sy, name: s.ac.name }; A.hint('Os cantos mudam o scale= do ator, a partir do ponto dele (origin). Com Shift, de 0.05 em 0.05.', 2600); }
        else { drag = { kind: 'rot', key, P, a0: Math.atan2(h.p[1] - P[1], h.p[0] - P[0]), r0: F.valueAt(track(loc.entry.shot, 'actor', s.ac.name, 'rot'), loc.t, s.ac.rot), name: s.ac.name }; A.hint('A bolinha verde gira o ator (rot=) em volta do ponto dele. Com Shift, de 15 em 15 graus.', 2600); }
      }
      return true;
    },
    move(e) {
      const d = drag;
      if (!d) return;
      const p = A.toCanvas(e);
      if (d.kind === 'zoom') {
        const r = Math.hypot(p[0] - d.c[0], p[1] - d.c[1]) || 1e-6;
        let zz = Math.max(0.05, Math.min(50, (d.z0 * d.d0) / r));
        zz = e.shiftKey ? Math.max(0.1, Math.round(zz * 10) / 10) : Number(zz.toFixed(3));
        if (!put('camera', 'camera', 'zoom', fmtN(zz, 3), d.key)) drag = null;
      } else if (d.kind === 'scale') {
        let f = Math.hypot(p[0] - d.P[0], p[1] - d.P[1]) / d.d0;
        let sx = d.sx * f;
        if (e.shiftKey) { sx = Math.max(0.05, Math.round(sx * 20) / 20); f = sx / d.sx; }
        sx = Math.max(0.01, sx);
        const sy = Math.max(0.01, d.sy * f), same = Math.abs(d.sx - d.sy) < 1e-6;
        if (!put('actor', d.name, 'scale', same ? fmtN(sx, 3) : `${fmtN(sx, 3)},${fmtN(sy, 3)}`, d.key)) drag = null;
      } else {
        let deg = d.r0 + ((Math.atan2(p[1] - d.P[1], p[0] - d.P[0]) - d.a0) * 180) / Math.PI;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        if (!put('actor', d.name, 'rot', fmtN(deg, 1), d.key)) drag = null;
      }
    },
    up() { drag = null; },
  };
  if (A.addFilmHook) A.addFilmHook(hook);

  // ---------- quando muda ----------
  let sigDraw = '';
  A.on('model', () => { atCache = { m: null, list: [] }; laneCache = { m: null, lanes: [] }; stCache = { k: '', s: null }; boxCache = { k: '', b: null }; if (!film()) closePop(); render(); });
  A.on('draw', () => {
    if (!film()) return;
    // tocando, só o título acompanha (o resto do painel lê o quadro inteiro: fica para quando parar)
    if (st.playing) { const loc = here(), w = sec && sec.querySelector('.dk-what'); if (loc && w) w.textContent = `${loc.entry.name} · ${fmtN(loc.t, 2)}s`; sigDraw = ''; return; }
    const sig = `${st.frame}|${st.caret.line}|${chosen}|${st.camView}`;
    if (sig !== sigDraw) { sigDraw = sig; render(); }
  });
  if (sec) {
    const mo = new MutationObserver(() => { if (!sec.hidden) { shape = ''; render(); } });
    mo.observe(sec, { attributes: true, attributeFilter: ['hidden'] });
  }

  W.filmUi = { lanes, atMove, atDel, atEase, atMenu, shotMenu, atHere, put, grips: () => grips(st.view.z), chosen: () => chosen, choose: (n) => { chosen = n; shape = ''; render(); A.draw(); } };
})(window.Weasel = window.Weasel || {});
