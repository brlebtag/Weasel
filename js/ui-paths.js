/* Weasel — os caminhos (etapa 5 do plano da interface, docs/planos/interface-illustrator.md; os pedidos 1 e 2 da
   proposta do Lucas).
   - Objeto › Caminho › Unir, Subtrair, Interseção e Excluir (o Pathfinder): as formas escolhidas viram uma (ou
     mais), com os pontos novos escritos no código.
   - Pincel de bolha (Shift+B): o arraste pinta uma área cheia, com a cor da caixinha do preenchimento. Se ela encosta
     em formas da mesma cor (o mesmo c=) da mesma camada, vira uma forma só com elas; senão, um shape novo.
   - Borracha (Shift+E): tira área das formas escolhidas (sem escolha, das da camada do cursor). Um pedaço que se
     solta vira nome_1, nome_2…; a forma que some inteira sai do código; um buraco no meio vira um cut=; num stroke,
     corta o traço em pedaços.
   [ e ] mudam o tamanho dos dois, e um círculo no mouse mostra o tamanho. Um Ctrl+Z desfaz o gesto inteiro.
   A conta mora no js/pathops.js; aqui ficam o mouse, as linhas do código e os avisos. */
(function (W) {
  'use strict';
  const A = W.app, G = W.geom, D = W.draw, SM = W.simplify, PO = W.pathops, L = W.lang, S = W.scene;
  if (!A || !G || !D || !SM || !PO || !L || !S) return;
  const st = A.st, M = G.M;
  const AREA = new Set(['shape', 'rect', 'ellipse']), OPEN = new Set(['stroke', 'line']);
  const fnum = (v) => { const t = String(Number(v.toFixed(st.view.z > 3 ? 2 : 1))); return t === '-0' ? '0' : t; };
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // a precisão da conta, pelo zoom: a casa da grade e a tolerância do ajuste, no desenho
  const cellNow = () => Math.max(0.05, Math.min(2, 0.35 / st.view.z));
  const tolNow = () => Math.max(0.05, Math.min(1.5, 0.5 / st.view.z));
  const stepNow = () => Math.max(0.25, Math.min(2, 1 / st.view.z));

  // ---------- as linhas ----------
  const split = (t) => L.splitLine(t);
  const cmdOf = (t) => (split(t).words[0] || {}).text || '';
  const nameOf = (t) => { const w = split(t).words[1]; return w && L.IDENT.test(w.text) ? w.text : null; };
  const attrOf = (t, k) => { const w = split(t).words.find((x) => x.text.startsWith(k + '=')); return w ? w.text.slice(k.length + 1) : null; };
  const indentOf = (t) => /^[ \t]*/.exec(t)[0];
  // troca (ou tira, com v null) um atributo k= da linha; sem ele, entra no fim do cabeçalho
  function setAttr(t, k, v) {
    const sp = split(t), w = sp.words.find((x) => x.text.startsWith(k + '='));
    if (w) {
      if (v === null) { let a = w.from; while (a > 0 && (t[a - 1] === ' ' || t[a - 1] === '\t')) a--; return t.slice(0, a) + t.slice(w.to); }
      return t.slice(0, w.from) + `${k}=${v}` + t.slice(w.to);
    }
    if (v === null) return t;
    const last = sp.words[sp.words.length - 1], at = last ? last.to : t.length;
    return t.slice(0, at) + ` ${k}=${v}` + t.slice(at);
  }
  // rect e ellipse viram shape: fica o nome e o que não é o tamanho (o r= dos cantos e o rot= já estão nos pontos)
  function toShape(t) {
    const sp = split(t), ws = sp.words, keep = [];
    for (let i = 2; i < ws.length; i++) {
      const x = ws[i].text;
      if (/^(r|rot)=/.test(x)) continue;
      if (!x.includes('=') && /^[-+\d.,]+$/.test(x)) continue;
      keep.push(x);
    }
    return `${indentOf(t)}shape ${ws[1].text}${keep.length ? ' ' + keep.join(' ') : ''} : PTS${sp.comment ? ' ' + sp.comment : ''}`;
  }
  // os pontos da linha (shape, stroke, line) trocados por toks
  function withPoints(t, toks) {
    const sp = split(t);
    if (!sp.points.length) return t.replace(/ : PTS/, ` : ${toks.join(' ')}`);
    return t.slice(0, sp.points[0].from) + toks.join(' ') + t.slice(sp.points[sp.points.length - 1].to);
  }
  const withName = (t, nm) => { const w = split(t).words[1]; return t.slice(0, w.from) + nm + t.slice(w.to); };
  // as linhas (fora a própria e as de comentário) em que o nome aparece
  function refs(src, name, skip) {
    const re = new RegExp(`(^|[\\s=,.:])${esc(name)}(?![\\w-])`), out = [];
    src.forEach((t, i) => { if (!skip.has(i) && !/^\s*#/.test(t) && re.test(split(t).code)) out.push(i); });
    return out;
  }

  // ---------- de onde a linha está até o desenho ----------
  // A matriz do código até o desenho (a forma parada ou presa a um osso só). null quando a camada está em 3D ou os
  // ossos dobram a forma agora (aí a conta no desenho não volta certa para o código).
  function frameOf(m, pose, el) {
    const f = S.fullMap(m, pose, el), o = f(0, 0), ax = f(1, 0), ay = f(0, 1);
    const mat = [ax[0] - o[0], ax[1] - o[1], ay[0] - o[0], ay[1] - o[1], o[0], o[1]];
    for (const [x, y] of [[173, -61], [-97, 211], [523, 389]]) {
      const q = f(x, y), r = M.apply(mat, x, y);
      if (Math.hypot(q[0] - r[0], q[1] - r[1]) > 0.01) return null;
    }
    if (Math.abs(mat[0] * mat[3] - mat[1] * mat[2]) < 1e-9) return null;
    return { mat, inv: M.invert(mat) };
  }
  const lin = (m, v) => [m[0] * v[0] + m[2] * v[1], m[1] * v[0] + m[3] * v[1]];
  const sameMat = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);

  // Uma linha como item da conta: { line, el, text, cmd, name, fr, rings, holes, holeInfo, open } ou { why } (minor:
  // a linha não é uma forma que dá para usar, sem precisar avisar)
  function itemOf(m, pose, line, o) {
    const rec = m.byLine.get(line), el = rec && rec.el, text = A.lineText(line), cmd = cmdOf(text), name = nameOf(text);
    if (!el || !(AREA.has(cmd) || (o && o.open && OPEN.has(cmd)))) return { why: 'não é uma forma', minor: true };
    if (rec.repeated) return { why: `${name || cmd} vem de um repeat (mude a linha de dentro do repeat)` };
    if (!name) return { why: `a linha ${line + 1} não tem nome` };
    if (el.limb || attrOf(text, 'limb') !== null) return { why: `${name} é um membro (limb=)` };
    const sp = split(text);
    if (sp.points.some((p) => p.text.includes('{')) || sp.words.slice(2).some((w) => !w.text.includes('=') && w.text.includes('{'))) return { why: `${name} usa contas ({…}): mude pelo código` };
    if (el.text !== undefined && cmd === 'text') return { why: 'é um texto', minor: true };
    const fr = frameOf(m, pose, el);
    if (!fr) return { why: `${name} está numa camada em 3D (yaw=, pitch=) ou dobrada pelos ossos agora: volte à pose parada` };
    const g = S.geometry(m, pose, el), segs = g.segs, closed = AREA.has(cmd);
    if (!segs.length) return { why: `${name} não tem área`, minor: true };
    // as marcas dos pontos da forma (o texto de cada um, para ficar igual)
    let tags = null;
    const pts = el.pts || [];
    if ((cmd === 'shape' || OPEN.has(cmd)) && pts.length && segs.length === (closed ? pts.length : pts.length - 1) && sp.points.length === pts.length) {
      tags = pts.map((p, i) => {
        const tok = sp.points[i].text, at = tok.indexOf('@');
        const wtan = p.tan ? lin(fr.mat, p.tan) : null, wtin = p.tin ? lin(fr.mat, p.tin) : null;
        return { i, line, tok, xy: tok.replace(/[~!@].*$/, ''), pin: at >= 0 ? tok.slice(at) : '', corner: !!p.corner, tan: wtan, tin: wtin, mat: fr.mat };
      });
      // os pontos presos a ossos: a forma tem que estar onde os pontos dizem (senão a pose está dobrando)
      for (let i = 0; i < pts.length; i++) {
        const q = M.apply(fr.mat, pts[i].x, pts[i].y), s0 = segs[Math.min(i, segs.length - 1)];
        const sx = i < segs.length ? s0[0] : s0[6], sy = i < segs.length ? s0[1] : s0[7];
        if (Math.hypot(q[0] - sx, q[1] - sy) > 0.05) return { why: `${name} está dobrada pelos ossos agora: volte à pose parada` };
      }
    }
    const R = PO.ring(segs, stepNow(), tags, closed);
    const holes = [], holeInfo = [];
    if (closed && el.cuts) for (const h of el.cuts) {
      const hs = S.geometry(m, pose, h).segs;
      if (!hs.length) continue;
      const HR = PO.ring(hs, stepNow(), null, true);
      holes.push(HR);
      holeInfo.push({ R: HR, name: h.name, line: A.ownLine(h), hidden: !!h.hidden });
    }
    return { line, el, text, cmd, name, fr, segs, tags, rings: [R], holes, holeInfo, open: !closed, smooth: cmd === 'line' ? 0 : el.smooth === undefined ? 1 : el.smooth };
  }

  // ---------- escrever ----------
  // Um ponto (de pathops.fitPath, no desenho) como texto no código de fr: o ponto da própria forma (ou de outra com
  // a mesma matriz) fica como estava; o da beira ganha as alças; os novos são arredondados.
  function tokenOf(p, fr) {
    const t = p.tag, same = t && sameMat(t.mat, fr.mat);
    if (same && !p.frozen) return t.tok;
    let s;
    if (same) s = t.xy;
    else { const q = M.apply(fr.inv, p.x, p.y); s = `${fnum(q[0])},${fnum(q[1])}`; }
    if (p.frozen) {
      const a = lin(fr.inv, p.tin), b = lin(fr.inv, p.tan), fa = `${fnum(a[0])},${fnum(a[1])}`, fb = `${fnum(b[0])},${fnum(b[1])}`;
      s += fa === fb ? `~${fb}` : `~${fa}~${fb}`;
    } else if (p.corner) s += '!';
    return s + (t && same ? t.pin : p.pin || '');
  }
  // os pontos novos entre dois pontos presos ao mesmo osso ficam presos a ele também
  function pinNew(pts, closed) {
    const n = pts.length, pinOf = (p) => (p.tag ? p.tag.pin : null);
    if (!pts.some((p) => pinOf(p))) return;
    for (let i = 0; i < n; i++) {
      if (pts[i].tag) continue;
      let a = null, b = null;
      for (let d = 1; d < n && a === null; d++) { const j = i - d; if (!closed && j < 0) break; const p = pts[(j + n) % n]; if (p.tag) a = pinOf(p); }
      for (let d = 1; d < n && b === null; d++) { const j = i + d; if (!closed && j >= n) break; const p = pts[j % n]; if (p.tag) b = pinOf(p); }
      if (a && a === b) pts[i].pin = a;
    }
  }
  // a volta começa no primeiro ponto da forma que ficou (a ordem do código muda o mínimo)
  function rot0(pts, line) {
    let j = -1;
    pts.forEach((p, i) => { if (p.tag && p.tag.line === line && (j < 0 || p.tag.i < pts[j].tag.i)) j = i; });
    return j > 0 ? pts.slice(j).concat(pts.slice(0, j)) : pts;
  }
  // um nome livre: base_1, base_2… (sem repetir os já usados nesta conta)
  function freeAs(src, base, used) {
    const all = src.join('\n');
    for (let k = 1; ; k++) {
      const nm = `${base}${k}`;
      if (used.has(nm)) continue;
      if (!new RegExp(`(^|[\\s=,])${esc(nm)}(?![\\w.-])`).test(all)) { used.add(nm); return nm; }
    }
  }
  // Os pedaços de uma conta como linhas: o primeiro fica com a linha de it (o nome e o resto); os outros entram logo
  // abaixo como nome_1, nome_2…; cada furo vira um shape hidden e entra no cut=. Devolve { lines, keep: os furos
  // antigos que continuam, drop: as linhas dos furos antigos que sobraram, sem uso }.
  function piecesText(src, it, pcs, used) {
    const base = it.cmd === 'shape' ? it.text : toShape(it.text);
    const lines = [], oldHoles = new Map(it.holeInfo.map((h) => [h.R, h]));
    const kept = new Set();
    pcs.forEach((pc, k) => {
      const nm = k === 0 ? it.name : freeAs(src, `${it.name}_`, used);
      const outer = rot0(pc.outer, it.line);
      pinNew(outer, true);
      let t = withPoints(k === 0 ? base : withName(base, nm), outer.map((p) => tokenOf(p, it.fr)));
      const cuts = [], extra = [];
      pc.holes.forEach((h, j) => {
        const old = pc.holeSrc && pc.holeSrc[j] ? oldHoles.get(pc.holeSrc[j]) : null;
        if (old && old.name) { if (!cuts.includes(old.name)) cuts.push(old.name); kept.add(old.name); return; }
        const hn = freeAs(src, `${nm}_hole`, used);
        cuts.push(hn);
        extra.push(`${indentOf(it.text)}shape ${hn} hidden : ${h.map((p) => tokenOf(Object.assign({}, p, { tag: null, frozen: false, corner: p.corner }), it.fr)).join(' ')}`);
      });
      t = setAttr(t, 'cut', cuts.length ? cuts.join(',') : null);
      lines.push(t, ...extra);
    });
    // os furos antigos que viraram parte da borda: a linha deles sai se ninguém mais usa o nome
    const drop = [];
    for (const h of it.holeInfo) {
      if (kept.has(h.name) || !h.hidden || h.line === undefined || h.line < 0) continue;
      const others = refs(src, h.name, new Set([h.line, it.line]));
      if (!others.length && !it.holeInfo.some((x) => x !== h && x.name === h.name && kept.has(x.name))) drop.push(h.line);
    }
    return { lines, drop };
  }
  // Um ponto de um caminho exato (de pathops.subPath, no desenho) como texto, do jeito que pathops.settle disse (md):
  // o texto de antes, canto, liso ou com as alças escritas
  const xyText = (q) => `${fnum(q[0])},${fnum(q[1])}`;
  function nodeTok(p, md, fr) {
    const t = p.tag, same = t && sameMat(t.mat, fr.mat), pin = same ? t.pin : p.pin || '';
    if (md.keep && same) return t.tok;
    const xy = same ? t.xy : xyText(M.apply(fr.inv, p.x, p.y));
    if (md.keep) md = t.tan ? { free: true, tin: t.tin || t.tan, tan: t.tan } : t.corner ? { corner: true } : { auto: true };
    if (md.corner) return xy + '!' + pin;
    if (!md.free) return xy + pin;
    const fa = xyText(lin(fr.inv, md.tin)), fb = xyText(lin(fr.inv, md.tan));
    return xy + (fa === fb ? `~${fb}` : `~${fa}~${fb}`) + pin;
  }
  function exactToks(it, N, closed) {
    pinNew(N, closed);
    if (it.cmd === 'line') return N.map((p) => nodeTok(p, p.tag ? { keep: true } : { auto: true }, it.fr));
    const md = PO.settle(N, closed, it.smooth);
    return N.map((p, i) => nodeTok(p, md[i], it.fr));
  }
  // Os pedaços exatos (listas de pontos de pathops.subPath) como linhas: o primeiro fica com a linha de it; os
  // outros entram logo abaixo como nome_1, nome_2…. closed: os pedaços são fechados (rect e ellipse viram shape).
  function exactLines(src, it, Ns, used, closed) {
    const base = closed && it.cmd !== 'shape' ? toShape(it.text) : it.text;
    return Ns.map((N, k) => withPoints(k === 0 ? base : withName(base, freeAs(src, `${it.name}_`, used)), exactToks(it, N, closed)));
  }
  // os trechos de um traço fora de inside(x, y), já como pontos, do maior para o menor (os de menos de três casas
  // somem); null quando nada muda
  function openRuns(it, inside) {
    const S = it.segs, n = S.length, runs = PO.outside(S, inside, cellNow());
    if (runs.length === 1 && runs[0].a.i === 0 && runs[0].a.t === 0 && runs[0].b.i === n - 1 && runs[0].b.t === 1) return null;
    return runs.map((r) => PO.subPath(S, false, it.tags, PO.normPos(S, false, r.a), PO.normPos(S, false, r.b)))
      .filter((N) => N.length >= 2 && PO.nodesLen(N) > cellNow() * 3)
      .sort((a, b) => PO.nodesLen(b) - PO.nodesLen(a));
  }
  // escreve tudo numa edição só (um Ctrl+Z): rep: linha → [linhas novas]; drop: linhas que saem; ins: antes da
  // linha → [linhas]. Devolve as linhas novas de rep e ins (para escolher).
  function writeAll(rep, drop, ins, key) {
    const src = A.editor.value.split('\n'), out = [], pick = [], all = [];
    const add = (r) => { for (let k = 0; k < r.length; k++) if (!/(^|\s)hidden(\s|$)/.test(split(r[k]).code)) all.push(out.length + k); };
    for (let i = 0; i <= src.length; i++) {
      if (ins.has(i)) { pick.push(out.length); add(ins.get(i)); out.push(...ins.get(i)); }
      if (i === src.length) break;
      if (drop.has(i)) continue;
      if (rep.has(i)) { const r = rep.get(i); if (r.length) pick.push(out.length); add(r); out.push(...r); continue; }
      out.push(src[i]);
    }
    rewrite(out, key);
    // pick.all: todas as linhas novas, fora as dos furos (hidden)
    pick.all = all;
    return pick;
  }
  // só o trecho que mudou, numa edição só (como o js/ui-select.js)
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
      // (acrescentando no fim: depois da última letra; o lineStart da linha que não existe é o fim do texto)
      from = a > 0 ? (a >= cur.length ? v.length : ed.lineStart(a) - 1) : 0;
      to = v.length;
      text = add.length ? (a > 0 ? '\n' : '') + add.join('\n') : '';
    }
    ed.replaceRange(from, to, text, { key });
    return true;
  }
  // avisos: o nome que saiu (ou que mudou de rect/ellipse para shape) e ainda aparece em outra linha; a troca de
  // forma que usa esta (com outro número de pontos, ela deixa de ir ponto a ponto)
  function notes(src, gone, changed) {
    const out = [];
    // rect e ellipse que viraram shape (o pedido do Lucas: avisar)
    const conv = changed.filter((c) => c.cmd === 'rect' || c.cmd === 'ellipse').map((c) => `${c.name} (${c.cmd})`);
    if (conv.length) out.push(`${conv.join(', ')} virou shape, com pontos`);
    for (const g of gone) { const r = refs(src, g.name, new Set([g.line])); if (r.length) out.push(`${g.name} saiu, mas o nome aparece na linha ${r.map((x) => x + 1).join(', ')}`); }
    for (const c of changed) {
      const u = SM.uses(src.join('\n'), c.name).filter((l) => l !== c.line);
      if (u.length) out.push(`a troca de forma usa ${c.name} (linha ${u.map((x) => x + 1).join(', ')})`);
    }
    return out.length ? ' Atenção: ' + out.join('; ') + '.' : '';
  }
  function ready(what) {
    if (!st.model || A.isFilm()) { A.hint(`${what} é do desenho (não do filme).`, 2400); return false; }
    if (A.defPreview()) { A.hint(`${what}: saia da prévia do componente (def) para usar; dentro dela, mude pelo código.`, 3600); return false; }
    return true;
  }

  // ---------- Objeto › Caminho: Unir, Subtrair, Interseção, Excluir ----------
  const OPS = {
    unite: { label: 'Unir', keep: (b) => b.some((x) => x), top: true, done: 'unidas' },
    minus: { label: 'Subtrair', keep: (b) => b[0] && !b.slice(1).some((x) => x), top: false, done: 'a de trás menos as da frente' },
    inter: { label: 'Interseção', keep: (b) => b.every((x) => x), top: true, done: 'só o que as formas têm em comum' },
    xor: { label: 'Excluir', keep: (b) => b.filter((x) => x).length % 2 === 1, top: true, done: 'sem as sobreposições' },
  };
  function pathfinder(kind) {
    const op = OPS[kind];
    if (!ready(op.label)) return;
    const m = A.model(), pose = A.pose();
    const lines = [...new Set(A.selected())].sort((a, b) => a - b);
    const items = [], skip = [];
    for (const l of lines) {
      const it = itemOf(m, pose, l);
      if (it.why) { if (!it.minor) skip.push(it.why); continue; }
      items.push(it);
    }
    if (items.length < 2) {
      A.hint(`${op.label}: escolha duas formas fechadas ou mais (shape, rect, ellipse), com Shift+clique.${skip.length ? ' Fora: ' + skip.join('; ') + '.' : ''}`, 4000);
      return;
    }
    const ly = new Set(items.map((it) => (A.layerOf(it.line) || { name: '' }).name));
    if (ly.size > 1) { A.hint(`${op.label}: as formas precisam estar na mesma camada (estão em ${[...ly].join(', ')}).`, 3600); return; }
    const t0 = performance.now();
    const r = PO.combine(items, null, op.keep, { cell: cellNow(), tol: tolNow(), smooth: 1 });
    // a forma que fica: a de cima (a última no código); no Subtrair, a de trás
    const tgt = op.top ? items[items.length - 1] : items[0];
    if (!r.pieces || !r.pieces.length) { A.hint(`${op.label}: não sobra nada (as formas não se encostam do jeito certo para isso). Nada mudou.`, 3600); return; }
    const src = A.editor.value.split('\n'), used = new Set();
    const { lines: out, drop } = piecesText(src, tgt, r.pieces, used);
    const rep = new Map([[tgt.line, out]]), dropS = new Set(drop);
    const gone = items.filter((it) => it !== tgt);
    for (const it of gone) dropS.add(it.line);
    const pick = writeAll(rep, dropS, new Map(), 'pathfinder' + Date.now());
    if (pick.length) A.setSel([pick[0]], pick[0]);
    const n = r.pieces.length, ms = Math.round(performance.now() - t0);
    A.hint(`${op.label}: ${items.length} formas viraram ${n === 1 ? `${tgt.name}` : `${n} pedaços (${tgt.name} e ${tgt.name}_1…)`}, ${op.done}.${skip.length ? ' Ficaram de fora: ' + skip.join('; ') + '.' : ''}${notes(src, gone, [tgt])}`, 5200);
    if (ms > 1500) console.info(`Weasel: ${op.label} levou ${ms} ms`);
  }

  // ---------- o Pincel de bolha e a Borracha ----------
  let size = 16; // o diâmetro, no desenho
  let free = null, hover = null;
  const blobColor = () => {
    const p = D.paint();
    if (p.fill && p.fill !== 'none') return p.fill;
    if (p.stroke && p.stroke !== 'none') return p.stroke;
    const m = A.model();
    return m && typeof m.palette.get('ink') === 'string' ? 'ink' : '#14141c';
  };
  function hexOf(c) {
    if (c && c[0] === '#') return c;
    const m = A.model(), v = m && m.palette.get(c);
    return typeof v === 'string' && v[0] === '#' ? v : c === 'ink' ? '#14141c' : '#2f8cff';
  }
  // as linhas da camada onde se desenha (fora as travadas, as escondidas e as de repeat)
  function layerLines() {
    const Ly = A.drawLayer();
    if (!Ly) return [];
    const out = [];
    for (const it of Ly.items) {
      const l = A.ownLine(it.el);
      if (l === undefined || l < 0 || it.el.hidden || !A.selectable(l)) continue;
      if (!out.includes(l)) out.push(l);
    }
    return out.sort((a, b) => a - b);
  }

  function blobFinish(F) {
    const m = A.model(), pose = A.pose(), c = blobColor(), r = size / 2, brush = { path: F.raw, r };
    const t0 = performance.now();
    // as formas da mesma cor da camada que o rastro toca
    const cands = [];
    for (const l of layerLines()) {
      const t = A.lineText(l);
      if (!AREA.has(cmdOf(t)) || attrOf(t, 'c') !== c) continue;
      const it = itemOf(m, pose, l);
      if (!it.why) cands.push(it);
    }
    const hit = cands.length ? PO.touches(cands, brush, cellNow()) : [];
    const T = cands.filter((_, i) => hit[i]);
    const src = A.editor.value.split('\n'), used = new Set();
    if (T.length) {
      const res = PO.combine(T, brush, (b) => b.some((x) => x), { cell: cellNow(), tol: tolNow(), smooth: 1 });
      if (!res.pieces || !res.pieces.length) return;
      const tgt = T[T.length - 1];
      const { lines: out, drop } = piecesText(src, tgt, res.pieces, used);
      const dropS = new Set(drop);
      for (const it of T) if (it !== tgt) dropS.add(it.line);
      const pick = writeAll(new Map([[tgt.line, out]]), dropS, new Map(), 'bolha' + Date.now());
      if (pick.length) A.setSel([pick[0]], pick[0]);
      const gone = T.filter((it) => it !== tgt);
      A.hint(`Pincel de bolha: ${gone.length ? `${T.length} formas (${T.map((x) => x.name).join(', ')}) viraram ${tgt.name}` : `${tgt.name} cresceu`} (${res.pieces[0].outer.length} pontos).${notes(src, gone, [tgt])}`, 4200);
    } else {
      const pl = A.drawPlace(D.behind());
      if (!pl || pl.why) { if (pl) A.hint(pl.why, 3200); return; }
      const res = PO.combine([], brush, (b) => b[0], { cell: cellNow(), tol: tolNow(), smooth: 1 });
      if (!res.pieces || !res.pieces.length) return;
      const fr = { mat: [1, 0, 0, 1, 0, 0], inv: [1, 0, 0, 1, 0, 0] };
      const loc = (p) => { const q = pl.local([p.x, p.y]); return Object.assign({}, p, { x: q[0], y: q[1], tag: null }); };
      const add = [];
      let first = null;
      res.pieces.forEach((pc) => {
        const nm = freeAs(src, 'shape', used);
        if (!first) first = nm;
        const cuts = [], extra = [];
        pc.holes.forEach((h) => {
          const hn = freeAs(src, `${nm}_hole`, used);
          cuts.push(hn);
          extra.push(`${pl.indent}shape ${hn} hidden : ${h.map((p) => tokenOf(loc(p), fr)).join(' ')}`);
        });
        add.push(`${pl.indent}shape ${nm} c=${c}${cuts.length ? ' cut=' + cuts.join(',') : ''} : ${pc.outer.map((p) => tokenOf(loc(p), fr)).join(' ')}`, ...extra);
      });
      const pick = writeAll(new Map(), new Set(), new Map([[pl.at, add]]), 'bolha' + Date.now());
      if (pick.length) A.setSel([pick[0]], pick[0]);
      A.hint(`Pincel de bolha: shape ${first} com ${res.pieces[0].outer.length} pontos. Pintando por cima dele com a mesma cor, ele cresce.`, 3600);
    }
    const ms = Math.round(performance.now() - t0);
    if (ms > 1500) console.info(`Weasel: o Pincel de bolha levou ${ms} ms`);
  }

  function eraseFinish(F) {
    const m = A.model(), pose = A.pose(), r = size / 2, brush = { path: F.raw, r };
    const sel = A.selected();
    const lines = sel.length ? [...new Set(sel)].filter((l) => A.selectable(l)).sort((a, b) => a - b) : layerLines();
    const pb = PO.boxOf([F.raw.map((p) => ({ x: p[0], y: p[1] }))], r);
    const src = A.editor.value.split('\n'), used = new Set(), rep = new Map(), drop = new Set(), skip = [], gone = [], changed = [];
    let nCut = 0, nGone = 0, nSplit = 0;
    const inside = PO.near(SM.resample(F.raw, Math.max(cellNow(), r / 4)), r);
    const t0 = performance.now();
    for (const l of lines) {
      const it = itemOf(m, pose, l, { open: true });
      if (it.why) { if (!it.minor) skip.push(it.why); continue; }
      if (!PO.meets(PO.boxOf(it.rings), pb)) continue;
      if (it.open) {
        // o traço é cortado no lugar exato (a curva que fica é a mesma)
        const ok = openRuns(it, inside);
        if (!ok) continue;
        if (!ok.length) { drop.add(l); gone.push(it); nGone++; continue; }
        rep.set(l, exactLines(src, it, ok, used, false));
        nCut++;
        if (ok.length > 1) nSplit++;
        changed.push(it);
        continue;
      }
      const res = PO.combine([it], brush, (b) => b[0] && !b[1], { cell: cellNow(), tol: tolNow(), smooth: it.smooth, touch: true });
      if (res.untouched) continue;
      if (!res.pieces.length) { drop.add(l); gone.push(it); nGone++; continue; }
      const { lines: out, drop: dh } = piecesText(src, it, res.pieces, used);
      rep.set(l, out);
      for (const d of dh) drop.add(d);
      nCut++;
      if (res.pieces.length > 1) nSplit++;
      changed.push(it);
    }
    if (!nCut && !nGone) {
      A.hint(skip.length ? `Borracha: não deu para apagar (${skip.join('; ')}).` : sel.length ? 'Borracha: o rastro não passou pelas formas escolhidas.' : 'Borracha: o rastro não passou por nenhuma forma da camada.', 3200);
      return;
    }
    const pick = writeAll(rep, drop, new Map(), 'borracha' + Date.now());
    if (sel.length && pick.length) A.setSel(pick, pick[0]);
    const bits = [];
    if (nCut) bits.push(`${nCut} forma${nCut > 1 ? 's' : ''} apagada${nCut > 1 ? 's' : ''} em parte${nSplit ? ` (${nSplit} virou pedaços: nome_1…)` : ''}`);
    if (nGone) bits.push(`${nGone} sumiu${nGone > 1 ? 'ram' : ''} (a linha saiu)`);
    A.hint(`Borracha: ${bits.join(', ')}.${skip.length ? ' Fora: ' + skip.join('; ') + '.' : ''}${notes(src, gone, changed)}`, 4600);
    const ms = Math.round(performance.now() - t0);
    if (ms > 1500) console.info(`Weasel: a Borracha levou ${ms} ms`);
  }

  function areaTool(id) {
    return {
      handles: false,
      down(e) {
        if (!ready(id === 'blob' ? 'O Pincel de bolha' : 'A Borracha')) return true;
        free = { tool: id, raw: [A.toCanvas(e)] };
        return true;
      },
      move(e) {
        if (!free) return;
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        for (const ev of evs.length ? evs : [e]) {
          const p = A.toCanvas(ev), last = free.raw[free.raw.length - 1];
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) * st.view.z >= 1) free.raw.push(p);
        }
        hover = free.raw[free.raw.length - 1];
        A.draw();
      },
      up() {
        const F = free;
        free = null;
        A.draw();
        if (!F || !st.model) return;
        if (F.tool === 'blob') blobFinish(F); else eraseFinish(F);
      },
      hover(e) { hover = A.toCanvas(e); A.draw(); },
      cursor: () => 'crosshair',
      overlay(ctx, z) {
        const r = size / 2;
        if (free && free.tool === id) {
          // o rastro: a cor do pincel, ou um cinza para a borracha
          ctx.beginPath();
          free.raw.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          if (free.raw.length === 1) ctx.lineTo(free.raw[0][0] + 0.01, free.raw[0][1]);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = size;
          ctx.strokeStyle = id === 'blob' ? hexOf(blobColor()) : 'rgba(150,150,160,.55)';
          ctx.globalAlpha = id === 'blob' ? 0.8 : 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const p = hover;
        if (!p) return;
        ctx.beginPath();
        ctx.arc(p[0], p[1], Math.max(r, 1.5 / z), 0, Math.PI * 2);
        ctx.lineWidth = 2.4 / z;
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.stroke();
        ctx.lineWidth = 1 / z;
        ctx.strokeStyle = id === 'blob' ? 'rgba(20,20,28,.85)' : 'rgba(200,40,60,.9)';
        ctx.stroke();
      },
    };
  }
  A.addTool('blob', areaTool('blob'));
  A.addTool('eraser', areaTool('eraser'));

  // [ e ] mudam o tamanho (dos dois); Esc, no meio do arraste, desiste
  function nudge(up) {
    const step = size < 10 ? 1 : size < 30 ? 2 : size < 100 ? 5 : 10;
    size = Math.max(1, Math.min(1000, up ? size + step : size - step));
    A.hint(`Tamanho ${size} (o diâmetro, no desenho): vale para o Pincel de bolha e a Borracha.`, 1600);
    A.draw();
  }
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || (st.tool !== 'blob' && st.tool !== 'eraser') || A.isFilm()) return;
    const t = e.target;
    if (t && t.closest && t.closest('textarea, input, select, dialog, [contenteditable]')) return;
    if (e.key === 'Escape' && free) { e.preventDefault(); e.stopImmediatePropagation(); free = null; A.draw(); A.hint('Desisti desse arraste: nada mudou.', 1600); return; }
    if (e.key !== '[' && e.key !== ']') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    nudge(e.key === ']');
  }, true);
  A.on('tool', () => { if (free && st.tool !== free.tool) free = null; hover = null; });

  W.paths = {
    pathfinder, ops: () => Object.keys(OPS).map((k) => ({ kind: k, label: OPS[k].label })), size: () => size,
    // o que as outras ferramentas de caminho (js/ui-cut.js) usam daqui
    kit: { AREA, OPEN, cellNow, tolNow, stepNow, split, cmdOf, nameOf, attrOf, setAttr, toShape, withPoints, withName, refs, frameOf, lin, itemOf, tokenOf, nodeTok, exactToks, exactLines, openRuns, pinNew, rot0, freeAs, piecesText, writeAll, notes, ready, layerLines, xyText },
  };
})(window.Weasel = window.Weasel || {});
