/* Weasel — a linha do tempo da animação (etapa 7a do plano docs/planos/interface-illustrator.md, seção 11.8), no
   jeito do Adobe Animate. Com uma anim escolhida no player, embaixo do desenho: uma linha por osso ou forma.prop que
   aparece nas key dela, um losango em cada quadro com key e, entre dois losangos, a barra do movimento (com o
   desenho do ease). A linha "todas" junta as key de cada quadro; a de "eventos", os event. Arrastar um losango muda
   o quadro da key (Alt: uma cópia), o botão direito escolhe o ease, Delete apaga, arrastar o fim da régua muda o
   frames=, e F6, Shift+F6, F5 e Shift+F5 fazem o que fazem no Animate. Tudo reescreve as linhas key do código
   (uma edição só: um Ctrl+Z desfaz). */
(function (W) {
  'use strict';
  const A = W.app, L = W.lang, G = W.geom, SE = W.sel;
  if (!A || !L || !G || !SE || !SE.kit) return;
  const K = SE.kit, st = A.st, many = K.many;
  const $ = (id) => document.getElementById(id);
  const film = $('timeline');
  if (!film) return;

  const box = document.createElement('div');
  box.id = 'animTl';
  box.className = 'timeline atl';
  box.hidden = true;
  box.innerHTML = '<canvas tabindex="0" aria-label="Linha do tempo da animação: clique num quadro para ir até ele; arraste os losangos para mudar o quadro das key"></canvas>';
  film.after(box);
  const cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  const RULER = 20, RH = 18, GUT = 128, DOT = 4.5;
  const C = {
    bg: '#10131a', gut: '#151a23', row: '#131822', row2: '#161c27', five: 'rgba(255,255,255,.035)', line: '#232b38', text: '#c9d1dc', dim: '#7d8796',
    bone: '#4c3f86', boneHi: '#6655b0', prop: '#2c5d59', propHi: '#3c7d77', hold: '#2f3540', key: '#e9ecf2', sel: '#ff9f43', play: '#ff8a1f', ev: '#ffd166', end: 'rgba(255,159,67,.10)',
  };
  const EASES = [
    ['smooth', 'smooth', 'começa e termina devagar (o padrão)'],
    ['linear', 'linear', 'velocidade constante'],
    ['in', 'in', 'começa devagar e acelera'],
    ['out', 'out', 'começa rápido e freia'],
    ['back', 'back', 'passa um pouco do ponto e volta'],
    ['step', 'step', 'fica parado e pula para a próxima'],
  ];
  const v = { f0: 0, cw: 12, auto: true, sel: new Set(), drag: null, row: '', data: null, sig: '', pop: null };
  const SEP = '\u0001';
  const kid = (row, frame) => row + SEP + frame;

  // ---------- o que está no código ----------
  const curAnim = () => (st.model && !A.isFilm() && st.anim ? st.model.animMap.get(st.anim) || null : null);
  // as key e os event da animação, lidos das linhas do arquivo aberto: { keys: [{ line, frame, ease, targets }],
  // events, rows: [{ key, keys: [{ frame, line, ease, text }] }] }. Num quadro, a última linha de um alvo vale.
  function readAnim(an) {
    const m = st.model, keys = [], events = [];
    let animLine = -1;
    for (const [line, rec] of m.byLine) {
      if (!rec || !rec.anim || rec.anim.name !== an.name || !rec.st) continue;
      const cmd = rec.st.cmd;
      if (cmd === 'anim') animLine = line;
      else if (cmd === 'key') {
        const targets = [];
        let ease = 'smooth';
        for (const a of rec.st.attrs.values()) { if (a.key === 'ease') ease = a.text; else targets.push({ key: a.key, text: a.text }); }
        keys.push({ line, frame: rec.frame, ease, targets });
      } else if (cmd === 'event') events.push({ line, frame: rec.frame % Math.max(1, an.frames), raw: rec.frame, names: rec.st.pos.slice(1).map((w) => w.text) });
    }
    keys.sort((a, b) => a.line - b.line);
    events.sort((a, b) => a.frame - b.frame || a.line - b.line);
    const rows = [], at = new Map();
    for (const k of keys) for (const t of k.targets) {
      if (!at.has(t.key)) { at.set(t.key, rows.length); rows.push({ key: t.key, bone: !t.key.includes('.'), keys: [] }); }
      const r = rows[at.get(t.key)], it = { frame: k.frame, line: k.line, ease: k.ease, text: t.text }, j = r.keys.findIndex((x) => x.frame === k.frame);
      if (j >= 0) r.keys[j] = it; else r.keys.push(it);
    }
    for (const r of rows) r.keys.sort((a, b) => a.frame - b.frame);
    return { an, animLine, keys, events, rows, byRow: at };
  }
  function data() {
    const an = curAnim();
    if (!an) return null;
    if (!v.data || v.data.an !== an) v.data = readAnim(an);
    return v.data;
  }

  // ---------- escrever no código ----------
  const cutWord = (t, w) => { let a = w.from; while (a > 0 && /[ \t]/.test(t[a - 1])) a--; return [a, w.to, '']; };
  // uma linha key (ou event, ou anim) com o quadro, os alvos que saem, os que entram, o ease e o frames= trocados;
  // null: a linha key ficou sem alvo e sai
  function lineEdit(t, o) {
    const sp = L.splitLine(t), ws = sp.words, ed = [];
    if (!ws.length) return t;
    if (o.frame !== undefined && ws[1]) ed.push([ws[1].from, ws[1].to, String(o.frame)]);
    let easeW = null, framesW = null, left = 0;
    for (const w of ws.slice(1)) {
      const eq = L.topIndex(w.text, '=');
      if (eq < 0) continue;
      const k = w.text.slice(0, eq);
      if (k === 'ease') { easeW = w; continue; }
      if (k === 'frames') framesW = w;
      if (o.drop && o.drop.has(k)) ed.push(cutWord(t, w)); else left++;
    }
    const end = ws[ws.length - 1].to;
    let tail = '';
    if (o.add) for (const [k, x] of o.add) { tail += ` ${k}=${x}`; left++; }
    if (o.drop && ws[0].text === 'key' && !left) return null;
    if (o.ease !== undefined) {
      if (easeW) ed.push(o.ease === 'smooth' ? cutWord(t, easeW) : [easeW.from, easeW.to, 'ease=' + o.ease]);
      else if (o.ease !== 'smooth') tail += ' ease=' + o.ease;
    } else if (easeW && tail) {
      // o ease fica no fim da linha, depois dos alvos novos
      ed.push(cutWord(t, easeW));
      tail += ' ' + easeW.text;
    }
    if (o.frames !== undefined) { if (framesW) ed.push([framesW.from, framesW.to, 'frames=' + o.frames]); else tail += ' frames=' + o.frames; }
    if (tail) ed.push([end, end, tail]);
    let s = t;
    for (const [a, b, x] of ed.sort((p, q) => q[0] - p[0] || q[1] - p[1])) s = s.slice(0, a) + x + s.slice(b);
    return s;
  }
  // plan: { frames: Map(linha → quadro), drops: Map(linha → Set(alvos)), eases: Map(linha → ease),
  //         adds: [{ frame, attrs: [[alvo, valor]], ease }], del: Set(linhas), animFrames }
  const newPlan = () => ({ frames: new Map(), drops: new Map(), eases: new Map(), adds: [], del: new Set(), animFrames: undefined });
  function drop(plan, line, key) { if (!plan.drops.has(line)) plan.drops.set(line, new Set()); plan.drops.get(line).add(key); }
  function commit(D, plan, key) {
    const src = A.editor.value.split('\n'), fin = (k) => (plan.frames.has(k.line) ? plan.frames.get(k.line) : k.frame);
    const gone = (k) => plan.del.has(k.line) || (plan.drops.has(k.line) && k.targets.every((t) => plan.drops.get(k.line).has(t.key)));
    // o que chega a um quadro tira o mesmo alvo de outra linha desse quadro (a key que chega ganha)
    const land = [];
    for (const k of D.keys) if (plan.frames.has(k.line)) for (const t of k.targets) if (!(plan.drops.get(k.line) || new Set()).has(t.key)) land.push({ frame: fin(k), key: t.key, line: k.line });
    for (const a of plan.adds) for (const [kk] of a.attrs) land.push({ frame: a.frame, key: kk, line: -1 });
    for (const l of land) for (const k of D.keys) if (k.line !== l.line && fin(k) === l.frame && !plan.del.has(k.line) && k.targets.some((t) => t.key === l.key)) drop(plan, k.line, l.key);
    // as key novas: numa linha do mesmo quadro e do mesmo ease (se houver), senão numa linha nova, logo antes da
    // primeira key (ou event) de quadro maior; sem nenhuma, depois da última linha da animação
    const append = new Map(), inserts = new Map();
    const indent = K.indentOf(src[(D.keys[0] || {}).line !== undefined ? D.keys[0].line : D.animLine] || '');
    const evFin = (e) => (plan.frames.has(e.line) ? plan.frames.get(e.line) : e.raw);
    for (const a of plan.adds) {
      const host = D.keys.filter((k) => !gone(k) && fin(k) === a.frame && k.ease === a.ease).pop();
      if (host) { if (!append.has(host.line)) append.set(host.line, []); append.get(host.line).push(...a.attrs); continue; }
      let before = Infinity, after = D.animLine;
      for (const k of D.keys) if (!gone(k)) { if (fin(k) > a.frame) before = Math.min(before, k.line); after = Math.max(after, k.line); }
      for (const e of D.events) if (!plan.del.has(e.line)) { if (evFin(e) > a.frame) before = Math.min(before, e.line); after = Math.max(after, e.line); }
      if (before !== Infinity) after = before - 1;
      const text = `${indent}key ${a.frame} ${a.attrs.map(([k, x]) => `${k}=${x}`).join(' ')}${a.ease !== 'smooth' ? ' ease=' + a.ease : ''}`;
      if (!inserts.has(after)) inserts.set(after, []);
      inserts.get(after).push({ frame: a.frame, text });
    }
    const next = [];
    src.forEach((t, i) => {
      let s = t;
      if (plan.del.has(i)) s = null;
      else if (plan.frames.has(i) || plan.drops.has(i) || plan.eases.has(i) || append.has(i) || (i === D.animLine && plan.animFrames !== undefined)) {
        s = lineEdit(t, { frame: plan.frames.get(i), drop: plan.drops.get(i), ease: plan.eases.get(i), add: append.get(i), frames: i === D.animLine ? plan.animFrames : undefined });
      }
      if (s !== null) next.push(s);
      for (const x of (inserts.get(i) || []).sort((p, q) => p.frame - q.frame)) next.push(x.text);
    });
    // o cursor do código vai para a linha do anim (que nunca muda de lugar): numa linha key, o player iria para o
    // quadro dela
    K.rewrite(next, key, D.animLine);
    v.data = null;
  }

  // ---------- as ações ----------
  // as key escolhidas: [{ row, frame }] (e os event: { ev: linha })
  function chosen() {
    const out = [];
    for (const s of v.sel) { const i = s.lastIndexOf(SEP); out.push({ row: s.slice(0, i), frame: +s.slice(i + 1) }); }
    return out;
  }
  // as linhas de código de uma key (row, frame): todas as que põem o alvo naquele quadro
  const linesOf = (D, row, frame) => D.keys.filter((k) => k.frame === frame && k.targets.some((t) => t.key === row));
  function editable(D, verb) {
    if (!D) return false;
    if (st.playing) { A.hint(`Pause o player para ${verb}.`, 2000); return false; }
    return true;
  }
  // mover (ou copiar, com Alt) as key escolhidas df quadros
  function moveKeys(df, copy) {
    const D = data(), sel = chosen().filter((s) => s.row !== 'ev');
    if (!editable(D, 'mudar as key') || !sel.length || !df) return;
    const max = D.an.frames, lo = Math.min(...sel.map((s) => s.frame)), hi = Math.max(...sel.map((s) => s.frame));
    df = Math.max(-lo, Math.min(max - hi, df));
    if (!df) return;
    const plan = newPlan(), want = new Map();
    for (const s of sel) for (const k of linesOf(D, s.row, s.frame)) { if (!want.has(k)) want.set(k, new Set()); want.get(k).add(s.row); }
    for (const [k, rows] of want) {
      // a linha inteira anda (sem cópia, com todos os alvos dela escolhidos); senão os escolhidos saem para uma linha nova
      if (!copy && k.targets.every((t) => rows.has(t.key))) { plan.frames.set(k.line, k.frame + df); continue; }
      const attrs = k.targets.filter((t) => rows.has(t.key)).map((t) => [t.key, t.text]);
      if (!copy) for (const [kk] of attrs) drop(plan, k.line, kk);
      plan.adds.push({ frame: k.frame + df, attrs, ease: k.ease });
    }
    commit(D, plan, (copy ? 'tlcopy' : 'tlmove') + Date.now());
    v.sel = new Set(sel.map((s) => kid(s.row, s.frame + df)));
    A.hint(`${many(sel.length, 'key', 'key')} ${copy ? 'copiada' + (sel.length > 1 ? 's' : '') : 'movida' + (sel.length > 1 ? 's' : '')} ${Math.abs(df)} ${Math.abs(df) === 1 ? 'quadro' : 'quadros'} para ${df > 0 ? 'a frente' : 'trás'}. Ctrl+Z desfaz.`, 2200);
  }
  function deleteKeys(list) {
    const D = data(), sel = (list || chosen()).filter((s) => s.row !== 'ev');
    if (!editable(D, 'apagar key') || !sel.length) return false;
    const plan = newPlan();
    for (const s of sel) for (const k of linesOf(D, s.row, s.frame)) drop(plan, k.line, s.row);
    commit(D, plan, 'tldel' + Date.now());
    for (const s of sel) v.sel.delete(kid(s.row, s.frame));
    A.hint(`${many(sel.length, 'key apagada', 'key apagadas')}. Ctrl+Z desfaz.`, 2000);
    return true;
  }
  function setEase(ease, list) {
    const D = data(), sel = (list || chosen()).filter((s) => s.row !== 'ev');
    if (!editable(D, 'mudar o ease') || !sel.length) return;
    const plan = newPlan(), want = new Map();
    for (const s of sel) for (const k of linesOf(D, s.row, s.frame)) { if (!want.has(k)) want.set(k, new Set()); want.get(k).add(s.row); }
    for (const [k, rows] of want) {
      if (k.ease === ease) continue;
      // o ease vale para a linha inteira: os escolhidos de uma linha com outros alvos vão para uma linha só deles
      if (k.targets.every((t) => rows.has(t.key))) { plan.eases.set(k.line, ease); continue; }
      const attrs = k.targets.filter((t) => rows.has(t.key)).map((t) => [t.key, t.text]);
      for (const [kk] of attrs) drop(plan, k.line, kk);
      plan.adds.push({ frame: k.frame, attrs, ease });
    }
    if (!plan.eases.size && !plan.adds.length) { A.hint(`Já estava com ease=${ease}.`, 1600); return; }
    commit(D, plan, 'tlease' + Date.now());
    A.hint(`ease=${ease} em ${many(sel.length, 'key', 'key')}: ${EASES.find((x) => x[0] === ease)[2]}, até a key seguinte.`, 2600);
  }
  // o valor de um alvo no quadro f, do jeito que o player mostra (para a key nova não mudar o movimento)
  const f1 = (n) => String(Number(n.toFixed(1))), f3 = (n) => String(Number(n.toFixed(3)));
  // a key nova herda o ease do trecho onde caiu (parada, sem trecho: o smooth de sempre)
  const easeOf = (s) => (s.a === s.b ? 'smooth' : s.a.ease || 'smooth');
  function valueAt(D, row, f) {
    const an = D.an;
    if (!row.includes('.')) {
      const s = G.segment(an.tracks.get(row), f, an.frames, an.loop);
      if (!s) return null;
      const x = s.a.v.map((a, k) => a + (s.b.v[k] - a) * s.t);
      // dx,dy,rot (sem os zeros do fim: b2=40) e, se esticado, sx,sy
      const p = [f1(x[0]), f1(x[1]), f1(x[2])];
      if (Math.abs(x[3] - 1) > 5e-4 || Math.abs(x[4] - 1) > 5e-4) p.push(f3(x[3]), f3(x[4]));
      else while (p.length > 1 && p[p.length - 1] === '0') p.pop();
      return { text: p.join(','), ease: easeOf(s) };
    }
    const tr = an.ptracks.get(row) || [...an.ptracks.values()].find((t) => `${t.name}.${t.prop}` === row);
    if (!tr || !['num', 'free', 'width', 'step'].includes(tr.type)) return null;
    const s = G.segment(tr.keys, f, an.frames, an.loop);
    if (!s || typeof s.a.v !== 'number') return null;
    const x = tr.type === 'step' ? (s.t >= 1 ? s.b.v : s.a.v) : s.a.v + (s.b.v - s.a.v) * s.t;
    return { text: f3(x), ease: easeOf(s) };
  }
  // F6: uma key no quadro do player, nas linhas escolhidas (ou na da última clicada, ou em todas), com o valor de agora
  function insertKey() {
    const D = data();
    if (!editable(D, 'pôr uma key')) return;
    const f = st.frame, rows = targetRows(D), plan = newPlan(), skip = [];
    let n = 0;
    for (const r of rows) {
      if (r.keys.some((k) => k.frame === f)) continue;
      const x = valueAt(D, r.key, f);
      if (!x) { skip.push(r.key); continue; }
      const same = plan.adds.find((a) => a.ease === x.ease);
      if (same) same.attrs.push([r.key, x.text]); else plan.adds.push({ frame: f, attrs: [[r.key, x.text]], ease: x.ease });
      n++;
    }
    if (!n) { A.hint(skip.length ? `F6 não sabe o valor de ${skip.join(', ')} neste quadro (uma cor ou uma forma): escreva a key no código ou copie uma com Alt+arrastar.` : `Já há key no quadro ${f} nessas linhas.`, 3200); return; }
    commit(D, plan, 'tlkey' + Date.now());
    v.sel = new Set(rows.filter((r) => !skip.includes(r.key)).map((r) => kid(r.key, f)));
    A.hint(`Key no quadro ${f} (${many(n, 'linha', 'linhas')}), com o valor que o player mostrava: agora é só posar.${skip.length ? ` Sem: ${skip.join(', ')}.` : ''}`, 3200);
  }
  // Shift+F6: tira as key do quadro do player nas linhas escolhidas
  function clearKey() {
    const D = data();
    if (!D) return;
    const f = st.frame, list = targetRows(D).filter((r) => r.keys.some((k) => k.frame === f)).map((r) => ({ row: r.key, frame: f }));
    if (!list.length) { A.hint(`Nenhuma key no quadro ${f} nessas linhas.`, 2000); return; }
    deleteKeys(list);
  }
  function targetRows(D) {
    const rows = new Set(chosen().map((s) => s.row));
    let out = D.rows.filter((r) => rows.has(r.key));
    if (!out.length && v.row) out = D.rows.filter((r) => r.key === v.row);
    return out.length ? out : D.rows;
  }
  // F5 e Shift+F5: um quadro a mais (ou a menos) no quadro do player; as key e os event depois dele andam junto
  function shiftFrames(d) {
    const D = data();
    if (!editable(D, 'mudar os quadros')) return;
    const p = st.frame, an = D.an;
    if (d < 0) {
      if (D.keys.some((k) => k.frame === p) || D.events.some((e) => e.raw === p)) { A.hint(`O quadro ${p} tem key: tire-a antes (Shift+F6) ou escolha um quadro sem key.`, 3000); return; }
      if (an.frames <= 1) return;
    }
    if (d > 0 && an.frames >= 600) { A.hint('Uma animação vai até 600 quadros.', 2000); return; }
    const plan = newPlan();
    for (const k of D.keys) if (k.frame > p) plan.frames.set(k.line, k.frame + d);
    for (const e of D.events) if (e.raw > p) plan.frames.set(e.line, e.raw + d);
    plan.animFrames = an.frames + d;
    commit(D, plan, 'tlframe' + Date.now());
    v.sel = new Set(chosen().map((s) => kid(s.row, s.frame > p ? s.frame + d : s.frame)));
    A.hint(`${d > 0 ? 'Um quadro a mais' : 'Um quadro a menos'} depois do ${p}: frames=${an.frames + d}. Ctrl+Z desfaz.`, 2200);
  }
  // arrastar o fim da régua: frames=; as key do último quadro (as que fecham o loop) vão junto
  function setFrames(n) {
    const D = data();
    if (!editable(D, 'mudar o frames=')) return;
    const old = D.an.frames, inner = Math.max(0, ...D.keys.filter((k) => k.frame < old).map((k) => k.frame), ...D.events.map((e) => e.raw));
    n = Math.max(1, inner + (D.keys.some((k) => k.frame === old) ? 1 : 0), Math.min(600, n));
    if (n === old) return;
    const plan = newPlan();
    for (const k of D.keys) if (k.frame === old) plan.frames.set(k.line, n);
    plan.animFrames = n;
    commit(D, plan, 'tlend' + Date.now());
    v.sel = new Set(chosen().map((s) => kid(s.row, s.frame === old ? n : s.frame)));
    A.hint(`frames=${n} (${(n / D.an.fps).toFixed(2).replace(/\.?0+$/, '')} s a ${D.an.fps} fps).`, 2000);
  }
  function moveEvents(list, df) {
    const D = data();
    if (!editable(D, 'mudar o evento') || !df) return;
    const plan = newPlan();
    for (const e of list) plan.frames.set(e.line, Math.max(0, Math.min(D.an.frames - 1, e.raw + df)));
    commit(D, plan, 'tlev' + Date.now());
    A.hint(`${many(list.length, 'evento movido', 'eventos movidos')}. Ctrl+Z desfaz.`, 1800);
  }
  function deleteEvents(list) {
    const D = data();
    if (!editable(D, 'apagar o evento')) return;
    const plan = newPlan();
    for (const e of list) plan.del.add(e.line);
    commit(D, plan, 'tlevdel' + Date.now());
    A.hint(`${many(list.length, 'evento apagado', 'eventos apagados')}. Ctrl+Z desfaz.`, 1800);
  }

  // ---------- o player ----------
  function goFrame(f) {
    const an = curAnim();
    if (!an) return;
    const sl = $('frameSl');
    sl.value = String(Math.max(0, Math.min(an.frames - 1, f)));
    sl.dispatchEvent(new Event('input'));
  }
  function pickAnim(name) {
    const s = $('animSel');
    s.value = name;
    s.dispatchEvent(new Event('change'));
  }

  // ---------- desenhar ----------
  let W0 = 0, H0 = 0;
  function rowsOf(D) {
    const out = [{ kind: 'sum', key: '', label: 'todas' }];
    if (D.events.length) out.push({ kind: 'ev', key: 'ev', label: 'eventos' });
    for (const r of D.rows) out.push({ kind: 'key', key: r.key, label: r.key, r });
    return out;
  }
  const xOf = (f) => GUT + (f - v.f0) * v.cw;
  const fOf = (x) => Math.floor((x - GUT) / v.cw + v.f0);
  function size() {
    const D = data(), w = Math.max(200, box.clientWidth || 600);
    const n = D ? rowsOf(D).length : 2, h = RULER + n * RH + 6;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w !== W0 || h !== H0 || cv.width !== Math.round(w * dpr)) {
      W0 = w; H0 = h;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.height = h + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (D) {
      const total = D.an.frames + 1;
      if (v.auto) { v.cw = Math.max(6, Math.min(28, (w - GUT - 14) / total)); v.f0 = 0; }
      const vis = Math.floor((w - GUT - 8) / v.cw);
      v.f0 = Math.max(0, Math.min(Math.max(0, total - vis), v.f0));
    }
  }
  function easeGlyph(x, y, w, h, ease) {
    const fn = G.EASE[ease] || G.EASE.smooth;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, e = ease === 'step' ? (i < 12 ? 0 : 1) : fn(t);
      const px = x + t * w, py = y + h - e * h;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  function diamond(x, y, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function render() {
    if (box.hidden) return;
    size();
    const D = data(), w = W0, h = H0;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textBaseline = 'middle';
    if (!D) {
      // pose parada: as animações do arquivo, para escolher uma
      ctx.fillStyle = C.dim;
      ctx.fillText('Escolha uma animação no player para ver as key dela:', 10, RULER / 2 + 2);
      v.hot = [];
      let x = 10;
      for (const a of st.model ? st.model.anims : []) {
        const tw = ctx.measureText(a.name).width + 16;
        ctx.fillStyle = '#1d2533';
        ctx.fillRect(x, RULER + 4, tw, RH);
        ctx.fillStyle = C.text;
        ctx.fillText(a.name, x + 8, RULER + 4 + RH / 2);
        v.hot.push({ x, w: tw, name: a.name });
        x += tw + 6;
      }
      return;
    }
    const an = D.an, rows = rowsOf(D), total = an.frames + 1, last = Math.min(total, v.f0 + Math.ceil((w - GUT) / v.cw) + 1);
    // as faixas das linhas e as colunas de 5 em 5 (como no Animate)
    rows.forEach((r, i) => {
      const y = RULER + i * RH;
      ctx.fillStyle = i % 2 ? C.row2 : C.row;
      ctx.fillRect(GUT, y, w - GUT, RH);
    });
    for (let f = v.f0; f < last; f++) {
      const x = xOf(f);
      if (f % 5 === 0) { ctx.fillStyle = C.five; ctx.fillRect(x, RULER, v.cw, h - RULER); }
      if (f === an.frames) { ctx.fillStyle = C.end; ctx.fillRect(x, 0, v.cw, h); }
    }
    // depois do fim: apagado
    const xe = xOf(total);
    if (xe < w) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(xe, RULER, w - xe, h - RULER); }
    // a régua
    ctx.fillStyle = C.gut;
    ctx.fillRect(GUT, 0, w - GUT, RULER);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    const step = v.cw >= 14 ? 1 : v.cw >= 8 ? 5 : 10;
    for (let f = v.f0; f < last; f++) {
      const x = xOf(f) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, f % 5 === 0 ? RULER - 8 : RULER - 4); ctx.lineTo(x, RULER); ctx.stroke();
      if (f % (step < 5 && v.cw < 22 ? 5 : step) === 0 || f === an.frames) {
        ctx.fillStyle = f === an.frames ? C.sel : C.dim;
        ctx.fillText(String(f), x + 2, 8);
      }
    }
    // a alça do fim (frames=)
    const xf = xOf(an.frames) + v.cw;
    if (xf > GUT) {
      ctx.fillStyle = v.drag && v.drag.kind === 'end' ? C.sel : '#b8742f';
      ctx.fillRect(xf - 2, 2, 4, RULER - 4);
    }
    // as barras do movimento e os losangos
    const dragging = v.drag && v.drag.kind === 'keys' && v.drag.df ? v.drag : null;
    rows.forEach((r, i) => {
      const y = RULER + i * RH, cy = y + RH / 2;
      if (r.kind === 'key') {
        const ks = r.r.keys;
        for (let j = 0; j < ks.length; j++) {
          const a = ks[j], b = ks[j + 1];
          let fb = b ? b.frame : an.loop && ks.length > 1 && a.frame < an.frames ? an.frames : null;
          if (fb === null) {
            // depois da última, numa once: parada até o fim
            if (a.frame < an.frames) { ctx.fillStyle = C.hold; ctx.fillRect(xOf(a.frame) + v.cw / 2, cy - 1, xOf(an.frames) - xOf(a.frame), 2); }
            continue;
          }
          const x0 = xOf(a.frame) + v.cw / 2, x1 = xOf(fb) + v.cw / 2, hold = a.ease === 'step';
          ctx.fillStyle = hold ? C.hold : r.r.bone ? C.bone : C.prop;
          if (!b) ctx.globalAlpha = 0.45; // a volta para a primeira (loop)
          ctx.fillRect(x0, y + 3, x1 - x0, RH - 6);
          ctx.globalAlpha = 1;
          if (x1 - x0 > 26) {
            ctx.strokeStyle = hold ? '#8a93a3' : r.r.bone ? '#b9adf5' : '#9fe0d8';
            ctx.lineWidth = 1.2;
            const gw = Math.min(16, x1 - x0 - 12), gx = (x0 + x1) / 2 - gw / 2;
            easeGlyph(gx, y + 5, gw, RH - 10, a.ease);
          }
        }
        for (const k of ks) {
          const on = v.sel.has(kid(r.key, k.frame)), x = xOf(k.frame) + v.cw / 2;
          if (x < GUT - DOT || x > w + DOT) continue;
          const moved = dragging && on;
          diamond(x, cy, DOT, moved && !dragging.copy ? 'rgba(233,236,242,.25)' : on ? C.sel : C.key, '#0b0d12');
          if (moved) diamond(xOf(k.frame + dragging.df) + v.cw / 2, cy, DOT, C.sel, '#0b0d12');
        }
      } else if (r.kind === 'sum') {
        const fs = [...new Set(D.keys.map((k) => k.frame))];
        for (const f of fs) {
          const all = D.rows.filter((x) => x.keys.some((k) => k.frame === f));
          const on = all.length && all.every((x) => v.sel.has(kid(x.key, f)));
          diamond(xOf(f) + v.cw / 2, cy, DOT - 0.5, on ? C.sel : '#9aa3b2', '#0b0d12');
        }
      } else if (r.kind === 'ev') {
        for (const e of D.events) {
          const x = xOf(e.raw) + v.cw / 2, on = v.sel.has(kid('ev', e.line));
          ctx.fillStyle = on ? C.sel : C.ev;
          ctx.fillRect(x - 0.5, y + 3, 1.5, RH - 6);
          ctx.beginPath(); ctx.moveTo(x + 1, y + 3); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x + 1, y + 9); ctx.closePath(); ctx.fill();
          if (v.cw * 3 > ctx.measureText(e.names.join(' ')).width) { ctx.fillStyle = C.dim; ctx.fillText(e.names.join(' '), x + 10, cy); }
        }
      }
    });
    // o quadro do player
    const xp = xOf(st.frame);
    if (xp + v.cw > GUT && xp < w) {
      ctx.fillStyle = 'rgba(255,138,31,.16)';
      ctx.fillRect(xp, RULER, v.cw, h - RULER);
      ctx.fillStyle = C.play;
      ctx.fillRect(xp + v.cw / 2 - 0.75, 0, 1.5, h);
      const label = String(st.frame), lw = ctx.measureText(label).width + 8;
      ctx.fillRect(Math.max(GUT, xp + v.cw / 2 - lw / 2), 1, lw, RULER - 3);
      ctx.fillStyle = '#16100a';
      ctx.fillText(label, Math.max(GUT, xp + v.cw / 2 - lw / 2) + 4, RULER / 2);
    }
    // os nomes, por cima de tudo
    ctx.fillStyle = C.gut;
    ctx.fillRect(0, 0, GUT, h);
    ctx.fillStyle = C.dim;
    let head = `${an.name} · ${an.frames} q · ${an.fps} fps${an.loop ? '' : ' · once'}`;
    if (ctx.measureText(head).width > GUT - 10) head = `${an.name} · ${an.frames}q ${an.fps}fps`;
    while (head.length > 3 && ctx.measureText(head).width > GUT - 10) head = head.slice(0, -2) + '…';
    ctx.fillText(head, 6, RULER / 2);
    rows.forEach((r, i) => {
      const y = RULER + i * RH;
      const hot = r.kind === 'key' && (v.row === r.key || chosen().some((s) => s.row === r.key));
      if (hot) { ctx.fillStyle = 'rgba(255,159,67,.12)'; ctx.fillRect(0, y, GUT, RH); }
      ctx.fillStyle = r.kind === 'key' ? (r.r.bone ? '#b9adf5' : '#9fe0d8') : C.dim;
      ctx.fillRect(6, y + RH / 2 - 3, 6, 6);
      ctx.fillStyle = r.kind === 'key' ? C.text : C.dim;
      let t = r.label;
      while (t.length > 3 && ctx.measureText(t).width > GUT - 24) t = t.slice(0, -2) + '…';
      ctx.fillText(t, 18, y + RH / 2 + 0.5);
    });
    ctx.strokeStyle = C.line;
    ctx.beginPath(); ctx.moveTo(GUT + 0.5, 0); ctx.lineTo(GUT + 0.5, h); ctx.moveTo(0, RULER + 0.5); ctx.lineTo(w, RULER + 0.5); ctx.stroke();
    if (D.an.blendOf || D.an.mixSpec || D.an.transSpec) {
      if (!D.rows.length) { ctx.fillStyle = C.dim; ctx.fillText('Esta animação mistura outras (mix=, from= e to=): as key dela vêm das outras.', GUT + 8, RULER + RH / 2); }
    }
  }

  // ---------- o mouse ----------
  function at(e) {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  // o que está em (x, y): { kind: 'ruler' | 'end' | 'name' | 'key' | 'sum' | 'ev' | 'cell', row, frame, item }
  function hit(x, y) {
    const D = data();
    if (!D) return null;
    const an = D.an, rows = rowsOf(D);
    if (y < RULER) {
      if (Math.abs(x - (xOf(an.frames) + v.cw)) <= 5) return { kind: 'end' };
      return x >= GUT ? { kind: 'ruler', frame: fOf(x) } : null;
    }
    const i = Math.floor((y - RULER) / RH), r = rows[i];
    if (!r) return null;
    if (x < GUT) return { kind: 'name', row: r };
    const f = fOf(x), near = (fr) => Math.abs(xOf(fr) + v.cw / 2 - x) <= Math.max(DOT + 2, v.cw / 2);
    if (r.kind === 'key') { const k = r.r.keys.find((q) => near(q.frame)); if (k) return { kind: 'key', row: r, frame: k.frame, item: k }; }
    if (r.kind === 'sum') { const fs = [...new Set(D.keys.map((k) => k.frame))].find(near); if (fs !== undefined) return { kind: 'sum', row: r, frame: fs }; }
    if (r.kind === 'ev') { const ev = D.events.filter((q) => near(q.raw)); if (ev.length) return { kind: 'ev', row: r, frame: ev[0].raw, items: ev }; }
    return { kind: 'cell', row: r, frame: Math.max(0, Math.min(an.frames, f)) };
  }
  function selectColumn(D, f, add) {
    if (!add) v.sel.clear();
    for (const r of D.rows) if (r.keys.some((k) => k.frame === f)) v.sel.add(kid(r.key, f));
  }
  cv.addEventListener('pointerdown', (e) => {
    closePop();
    cv.focus({ preventScroll: true });
    const [x, y] = at(e);
    const D = data();
    if (!D) {
      if (e.button === 0) for (const h of v.hot || []) if (x >= h.x && x <= h.x + h.w && y >= RULER + 4 && y <= RULER + 4 + RH) { pickAnim(h.name); return; }
      return;
    }
    const h = hit(x, y);
    if (!h) return;
    if (e.button === 2) {
      // o botão direito: escolhe o que está embaixo (se não estava escolhido) e abre o menu
      if (h.kind === 'key' && !v.sel.has(kid(h.row.key, h.frame))) { v.sel = new Set([kid(h.row.key, h.frame)]); v.row = h.row.key; }
      if (h.kind === 'sum') selectColumn(D, h.frame, false);
      if (h.kind === 'cell' || h.kind === 'name') { v.row = h.row.kind === 'key' ? h.row.key : ''; if (h.kind === 'cell') goFrame(h.frame); }
      render();
      return;
    }
    if (e.button !== 0) return;
    if (h.kind === 'end') { v.drag = { kind: 'end', x0: x, n: D.an.frames }; cv.setPointerCapture(e.pointerId); render(); return; }
    if (h.kind === 'ruler') { v.drag = { kind: 'scrub' }; cv.setPointerCapture(e.pointerId); goFrame(h.frame); return; }
    if (h.kind === 'name') {
      if (h.row.kind === 'key') { v.row = h.row.key; if (!e.shiftKey && !e.ctrlKey) v.sel.clear(); for (const k of h.row.r.keys) v.sel.add(kid(h.row.key, k.frame)); }
      else if (h.row.kind === 'sum') { v.sel.clear(); for (const r of D.rows) for (const k of r.keys) v.sel.add(kid(r.key, k.frame)); }
      render();
      return;
    }
    if (h.kind === 'cell') {
      // um quadro na linha "todas" (ou na dos eventos): o F6 vale para todas as linhas
      v.row = h.row.kind === 'key' ? h.row.key : '';
      if (!e.shiftKey) v.sel.clear();
      v.drag = { kind: 'scrub' };
      cv.setPointerCapture(e.pointerId);
      goFrame(h.frame);
      return;
    }
    if (h.kind === 'ev') {
      const id = kid('ev', h.items[0].line);
      if (!e.shiftKey && !v.sel.has(id)) v.sel.clear();
      v.sel.add(id);
      v.drag = { kind: 'ev', x0: x, df: 0, items: h.items };
      cv.setPointerCapture(e.pointerId);
      render();
      return;
    }
    // uma key (ou a coluna inteira, na linha "todas")
    if (h.kind === 'sum') selectColumn(D, h.frame, e.shiftKey);
    else {
      const id = kid(h.row.key, h.frame);
      v.row = h.row.key;
      if (e.shiftKey || e.ctrlKey) { if (v.sel.has(id)) v.sel.delete(id); else v.sel.add(id); } else if (!v.sel.has(id)) v.sel = new Set([id]);
      [...v.sel].forEach((s) => { if (s.startsWith('ev' + SEP)) v.sel.delete(s); });
    }
    v.drag = { kind: 'keys', x0: x, df: 0, copy: e.altKey, frame: h.frame, line: h.item ? h.item.line : -1 };
    cv.setPointerCapture(e.pointerId);
    render();
  });
  cv.addEventListener('pointermove', (e) => {
    const [x, y] = at(e), d = v.drag;
    if (!d) { tip(x, y); return; }
    if (d.kind === 'scrub') { goFrame(fOf(x)); return; }
    if (d.kind === 'end') { d.n = Math.max(1, Math.round((x - GUT) / v.cw + v.f0) - 1); renderEnd(d.n); return; }
    const df = Math.round((x - d.x0) / v.cw);
    if (df !== d.df) { d.df = df; d.copy = e.altKey; render(); }
  });
  function renderEnd(n) {
    render();
    const x = xOf(n) + v.cw;
    ctx.fillStyle = C.sel;
    ctx.fillRect(x - 1, 0, 2, H0);
    ctx.fillText(`frames=${n}`, Math.min(W0 - 70, x + 4), RULER / 2);
  }
  cv.addEventListener('pointerup', (e) => {
    const d = v.drag;
    v.drag = null;
    if (!d) return;
    if (d.kind === 'end') { if (d.n !== data().an.frames) setFrames(d.n); else render(); return; }
    if (d.kind === 'ev') { if (d.df) moveEvents(d.items, d.df); else { goFrame(d.items[0].raw); A.editor.reveal(d.items[0].line, 0); } render(); return; }
    if (d.kind === 'keys') {
      if (d.df) moveKeys(d.df, d.copy || e.altKey);
      else {
        // um clique: o player vai até o quadro, e o código, até a linha da key
        goFrame(d.frame);
        if (d.line >= 0) A.editor.reveal(d.line, 0);
      }
      render();
    }
  });
  cv.addEventListener('pointercancel', () => { v.drag = null; render(); });
  cv.addEventListener('contextmenu', (e) => { e.preventDefault(); const [x, y] = at(e); openPop(e.clientX, e.clientY, hit(x, y)); });
  cv.addEventListener('dblclick', (e) => {
    const [x, y] = at(e), h = hit(x, y);
    if (h && h.kind === 'cell' && !v.auto) { v.auto = true; render(); }
  });
  cv.addEventListener('wheel', (e) => {
    const D = data();
    if (!D) return;
    e.preventDefault();
    if (e.ctrlKey) {
      const [x] = at(e), f = (x - GUT) / v.cw + v.f0;
      v.auto = false;
      v.cw = Math.max(5, Math.min(40, v.cw * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      v.f0 = f - (x - GUT) / v.cw;
    } else {
      v.auto = false;
      v.f0 += Math.sign(e.deltaY || e.deltaX) * Math.max(1, Math.round(40 / v.cw));
    }
    render();
  }, { passive: false });
  // a dica do que está embaixo do mouse
  function tip(x, y) {
    const h = hit(x, y), D = data();
    let t = '';
    if (!h || !D) t = '';
    else if (h.kind === 'key') t = `key ${h.frame} ${h.row.key}=${h.item.text}${h.item.ease !== 'smooth' ? ' ease=' + h.item.ease : ''} (linha ${h.item.line + 1}). Arraste para mudar o quadro (Alt: copia); botão direito: ease; Delete apaga.`;
    else if (h.kind === 'sum') t = `Todas as key do quadro ${h.frame}: arraste para mudar o quadro de todas.`;
    else if (h.kind === 'ev') t = `event ${h.frame} ${h.items.map((q) => q.names.join(' ')).join(', ')}: arraste para mudar o quadro; Delete apaga.`;
    else if (h.kind === 'end') t = `O fim da animação (frames=${D.an.frames}): arraste para mudar. As key do último quadro, que fecham o loop, vão junto.`;
    else if (h.kind === 'ruler') t = 'Clique ou arraste para ir a um quadro.';
    else if (h.kind === 'name') t = h.row.kind === 'key' ? `${h.row.key}: clique escolhe todas as key da linha.` : h.row.kind === 'sum' ? 'Clique escolhe todas as key.' : '';
    else if (h.kind === 'cell') t = `Quadro ${h.frame}: F6 põe uma key aqui com o valor de agora; F5 põe um quadro a mais.`;
    cv.style.cursor = h && (h.kind === 'end') ? 'ew-resize' : h && (h.kind === 'key' || h.kind === 'sum' || h.kind === 'ev') ? 'grab' : 'default';
    if (cv.title !== t) cv.title = t;
  }

  // ---------- o menu do botão direito: o ease (com o desenho da curva) e os quadros ----------
  function curveSvg(ease) {
    const fn = G.EASE[ease];
    let d = '';
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, e = ease === 'step' ? (i < 16 ? 0 : 1) : fn(t);
      d += `${i ? 'L' : 'M'}${(2 + t * 20).toFixed(1)},${(20 - e * 16).toFixed(1)}`;
      if (ease === 'step' && i === 15) d += `L22,20`;
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 20H22M2 4H22" class="ax"/><path d="${d}"/></svg>`;
  }
  function closePop() { if (v.pop) { v.pop.remove(); v.pop = null; } }
  function openPop(cx, cy, h) {
    closePop();
    const D = data();
    if (!D) return;
    const sel = chosen().filter((s) => s.row !== 'ev'), evs = chosen().filter((s) => s.row === 'ev');
    const eases = new Set();
    for (const s of sel) for (const k of linesOf(D, s.row, s.frame)) eases.add(k.ease);
    const p = document.createElement('div');
    p.className = 'atl-pop';
    p.setAttribute('role', 'menu');
    p.innerHTML = `${sel.length ? `<div class="atl-h">ease de ${many(sel.length, 'key', 'key')} (como sai dela até a próxima)</div><div class="atl-eases">${EASES.map(([k, n, t]) => `<button type="button" data-ease="${k}" class="${eases.size === 1 && eases.has(k) ? 'on' : ''}" title="${t}">${curveSvg(k)}<span>${n}</span></button>`).join('')}</div>` : ''}
      <div class="atl-acts">
        <button type="button" data-act="key"><span>Inserir key</span><kbd>F6</kbd></button>
        <button type="button" data-act="clear"><span>Limpar key do quadro</span><kbd>Shift+F6</kbd></button>
        <button type="button" data-act="add"><span>Inserir quadro</span><kbd>F5</kbd></button>
        <button type="button" data-act="rem"><span>Remover quadro</span><kbd>Shift+F5</kbd></button>
        ${sel.length || evs.length ? '<button type="button" data-act="del"><span>Apagar as escolhidas</span><kbd>Delete</kbd></button>' : ''}
      </div>`;
    document.body.appendChild(p);
    const w = p.offsetWidth, hh = p.offsetHeight;
    p.style.left = Math.max(4, Math.min(window.innerWidth - w - 4, cx + 2)) + 'px';
    p.style.top = Math.max(4, Math.min(window.innerHeight - hh - 4, cy - hh - 4)) + 'px';
    p.addEventListener('pointerdown', (e) => e.stopPropagation());
    p.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      closePop();
      if (b.dataset.ease) setEase(b.dataset.ease);
      else if (b.dataset.act === 'key') insertKey();
      else if (b.dataset.act === 'clear') clearKey();
      else if (b.dataset.act === 'add') shiftFrames(1);
      else if (b.dataset.act === 'rem') shiftFrames(-1);
      else if (b.dataset.act === 'del') delSel();
      render();
    });
    v.pop = p;
  }
  document.addEventListener('pointerdown', (e) => { if (v.pop && !v.pop.contains(e.target)) closePop(); });
  function delSel() {
    const D = data();
    if (!D) return;
    const evs = chosen().filter((s) => s.row === 'ev').map((s) => D.events.find((x) => x.line === s.frame)).filter(Boolean);
    if (evs.length) deleteEvents(evs);
    else deleteKeys();
    v.sel.clear();
  }

  // ---------- o teclado (com o foco na linha do tempo) ----------
  cv.addEventListener('keydown', (e) => {
    const D = data();
    if (!D) return;
    const k = e.key;
    let ok = true;
    if (k === 'Escape') { if (v.pop) closePop(); else if (v.drag) { v.drag = null; } else if (v.sel.size) v.sel.clear(); else ok = false; }
    else if (k === 'Delete' || k === 'Backspace') { if (v.sel.size) delSel(); }
    else if (k === 'F6') { if (e.shiftKey) clearKey(); else insertKey(); }
    else if (k === 'F5') shiftFrames(e.shiftKey ? -1 : 1);
    else if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const d = k === 'ArrowLeft' ? -1 : 1;
      if (v.sel.size && chosen().some((s) => s.row !== 'ev')) moveKeys(d * (e.shiftKey ? 5 : 1), false);
      else $(d < 0 ? 'bPrev' : 'bNext').click();
    } else if ((e.ctrlKey || e.metaKey) && (k === 'a' || k === 'A')) { v.sel.clear(); for (const r of D.rows) for (const q of r.keys) v.sel.add(kid(r.key, q.frame)); }
    else ok = false;
    if (ok) { e.preventDefault(); e.stopPropagation(); render(); }
  });

  // ---------- quando aparece ----------
  function show() {
    const m = st.model, on = !!m && !A.isFilm() && m.anims.length > 0 && st.timeline !== false;
    if (box.hidden === !on) return false;
    box.hidden = !on;
    if (!on) closePop();
    return true;
  }
  function sync() {
    v.data = null;
    // a escolha some quando a key não existe mais
    const D = data();
    if (D) for (const s of [...v.sel]) {
      const i = s.lastIndexOf(SEP), row = s.slice(0, i), f = +s.slice(i + 1);
      const ok = row === 'ev' ? D.events.some((x) => x.line === f) : D.rows.some((r) => r.key === row && r.keys.some((q) => q.frame === f));
      if (!ok) v.sel.delete(s);
    } else v.sel.clear();
    show();
    render();
  }
  A.on('model', sync);
  A.on('draw', () => {
    const sig = `${st.anim}|${st.frame}|${box.clientWidth}`;
    if (show() || sig !== v.sig) { v.sig = sig; if (v.anim !== st.anim) { v.anim = st.anim; v.sel.clear(); v.row = ''; v.auto = true; v.data = null; } render(); }
  });
  $('tTimeline').addEventListener('change', () => { show(); render(); });
  if (window.ResizeObserver) new ResizeObserver(() => render()).observe(box);
  W.animTimeline = { insertKey, clearKey, shiftFrames, setEase, moveKeys, deleteKeys, setFrames, render, sel: () => chosen() };
  setTimeout(sync, 0);
})(window.Weasel = window.Weasel || {});
