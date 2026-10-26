/* Weasel — leitura da linguagem: cada linha vira uma instrução, e as instruções viram o modelo do desenho. */
(function (W) {
  'use strict';

  const KEYWORDS = {
    canvas: 'setup', finish: 'setup', unity: 'setup', palette: 'setup',
    layer: 'draw', shape: 'draw', stroke: 'draw', line: 'draw', ellipse: 'draw', rect: 'draw',
    bone: 'rig', cloth: 'rig', anim: 'rig', key: 'rig',
  };
  const DRAWABLE = new Set(['shape', 'stroke', 'line', 'ellipse', 'rect']);
  const CLOSED = new Set(['shape', 'ellipse', 'rect']);

  const ATTRS = {
    canvas: ['bg', 'light'],
    finish: ['inner', 'pixel'],
    unity: ['unit', 'root', 'collider'],
    layer: ['clip', 'only', 'opacity', 'blend'],
    bone: ['parent', 'pivot'],
    cloth: ['pivot', 'tension', 'bone', 'swing', 'drag'],
    anim: ['frames', 'fps'],
    shape: ['c', 'ink', 'inkc', 'weight', 'inkon', 'bone', 'cloth', 'smooth', 'opacity'],
    ellipse: ['c', 'ink', 'inkc', 'weight', 'inkon', 'rot', 'bone', 'cloth', 'opacity'],
    rect: ['c', 'ink', 'inkc', 'weight', 'inkon', 'r', 'rot', 'bone', 'cloth', 'opacity'],
    stroke: ['c', 'w', 'taper', 'cap', 'bone', 'cloth', 'smooth', 'opacity', 'limb', 'hip', 'on', 'foot', 'bend'],
    line: ['c', 'w', 'dash', 'bone', 'cloth', 'opacity'],
  };
  const FLAGS = { layer: ['guide', 'hidden'], anim: ['once', 'loop'] };
  const FINISHES = ['game', 'flat'];
  const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
  const DEFAULT_PALETTE = { ink: '#14141c', line: 8, inner: 5, edge: 3 };

  const NUM = /^[-+]?(\d+\.?\d*|\.\d+)$/;
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const IDENT = /^[A-Za-z_][\w-]*$/;
  const PT = /^([-+]?(?:\d+\.?\d*|\.\d+)),([-+]?(?:\d+\.?\d*|\.\d+))(!?)$/;

  const num = (s) => (NUM.test(s) ? parseFloat(s) : NaN);
  const nums = (s) => s.split(',').map(num);

  function isCssColor(v) {
    return /^[a-z]+$/i.test(v) && typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('color', v);
  }

  function words(s, off) {
    const out = [], rx = /\S+/g;
    let m;
    while ((m = rx.exec(s))) out.push({ text: m[0], from: m.index + off, to: m.index + off + m[0].length });
    return out;
  }

  // Separa comentário (# no início ou depois de espaço), cabeçalho e lista de pontos (depois do ":").
  function splitLine(text) {
    let cut = text.length, comment = null;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '#' && (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\t')) { cut = i; comment = text.slice(i); break; }
    }
    const code = text.slice(0, cut);
    const colon = code.indexOf(':');
    return {
      code, comment, commentAt: comment === null ? -1 : cut, colon,
      words: words(colon < 0 ? code : code.slice(0, colon), 0),
      points: colon < 0 ? [] : words(code.slice(colon + 1), colon + 1),
    };
  }

  function readStatement(text, li, err) {
    const sp = splitLine(text);
    if (!sp.words.length) {
      if (sp.points.length) err(li, 'pontos sem instrução antes do ":"', sp.points[0].from, sp.points[0].to);
      return null;
    }
    const first = sp.words[0];
    if (!KEYWORDS[first.text]) {
      err(li, `instrução desconhecida "${first.text}"`, first.from, first.to);
      return null;
    }
    const st = { cmd: first.text, line: li, cmdTok: first, pos: [], attrs: new Map(), pts: [], hasColon: sp.colon >= 0 };
    for (const w of sp.words.slice(1)) {
      const eq = w.text.indexOf('=');
      if (eq > 0) {
        const key = w.text.slice(0, eq);
        if (st.attrs.has(key)) err(li, `atributo repetido "${key}"`, w.from, w.to, 'warn');
        st.attrs.set(key, { key, text: w.text.slice(eq + 1), from: w.from, to: w.to, vfrom: w.from + eq + 1 });
      } else if (eq === 0) {
        err(li, `atributo sem nome "${w.text}"`, w.from, w.to);
      } else {
        st.pos.push(w);
      }
    }
    for (const p of sp.points) {
      const m = PT.exec(p.text);
      if (!m) { err(li, `ponto inválido "${p.text}" (use x,y ou x,y!)`, p.from, p.to); continue; }
      st.pts.push({ x: +m[1], y: +m[2], corner: m[3] === '!', from: p.from, to: p.to });
    }
    return st;
  }

  function parse(src) {
    const lines = src.split(/\r?\n/);
    const errors = [];
    const err = (line, msg, from, to, level) => errors.push({ line, msg, from: from || 0, to: to || 0, level: level || 'error' });
    const stmts = [];
    lines.forEach((t, i) => { const s = readStatement(t, i, err); if (s) stmts.push(s); });

    const m = {
      lineCount: lines.length,
      canvas: { w: 800, h: 600, bg: '#ffffff', light: [-0.6, -0.8] },
      finish: { style: 'game', inner: 1, pixel: 1 },
      unity: null,
      palette: new Map(Object.entries(DEFAULT_PALETTE)),
      layers: [], layerMap: new Map(),
      bones: new Map(), cloths: new Map(),
      anims: [], animMap: new Map(),
      elements: [], named: new Map(),
      byLine: new Map(),
      errors,
    };

    // ---- leitura de valores ----
    const bad = (st, a, msg, level) => err(st.line, msg, a ? a.from : st.cmdTok.from, a ? a.to : st.cmdTok.to, level);
    function color(st, a) {
      const v = a.text;
      if (v === 'none' || v === 'transparent') return null;
      if (HEX.test(v)) return v;
      const p = m.palette.get(v);
      if (typeof p === 'string') return p;
      if (typeof p === 'number') { bad(st, a, `"${v}" na palette é número, não cor`); return null; }
      if (isCssColor(v)) return v;
      bad(st, a, `cor desconhecida "${v}"`);
      return null;
    }
    function width(st, a) {
      const n = num(a.text);
      if (!isNaN(n)) return Math.max(0, n);
      if (a.text === 'none') return 0;
      const p = m.palette.get(a.text);
      if (typeof p === 'number') return p;
      bad(st, a, p === undefined ? `espessura desconhecida "${a.text}"` : `"${a.text}" na palette é cor, não número`);
      return 0;
    }
    function number(st, a, def, min, max) {
      const n = num(a.text);
      if (isNaN(n)) { bad(st, a, `número inválido em ${a.key}=`); return def; }
      if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
        bad(st, a, `${a.key}= deve ficar entre ${min} e ${max}`, 'warn');
        return Math.min(max, Math.max(min, n));
      }
      return n;
    }
    function list(st, a, min, max, def) {
      const v = nums(a.text);
      if (v.length < min || v.length > max || v.some(isNaN)) {
        bad(st, a, min === max ? `esperados ${min} números em ${a.key}=` : `esperados ${min} a ${max} números em ${a.key}=`);
        return def;
      }
      return v;
    }
    const pair = (st, a, def) => list(st, a, 2, 2, def);
    const posPair = (st, tok, what, def) => {
      const v = tok ? nums(tok.text) : [];
      if (v.length !== 2 || v.some(isNaN)) { err(st.line, `esperado ${what} no formato x,y`, tok ? tok.from : st.cmdTok.from, tok ? tok.to : st.cmdTok.to); return def; }
      return v;
    };
    const ident = (st, tok, what) => {
      if (!tok) { err(st.line, `falta o nome ${what}`, st.cmdTok.from, st.cmdTok.to); return null; }
      if (!IDENT.test(tok.text)) { err(st.line, `nome inválido "${tok.text}"`, tok.from, tok.to); return null; }
      return tok.text;
    };
    function checkAttrs(st) {
      const ok = ATTRS[st.cmd];
      if (!ok) return;
      for (const a of st.attrs.values()) if (!ok.includes(a.key)) bad(st, a, `atributo desconhecido "${a.key}" em ${st.cmd}`, 'warn');
    }
    function info(st, extra) {
      const rec = Object.assign({ st, handles: [] }, extra || {});
      m.byLine.set(st.line, rec);
      return rec;
    }

    // ---- passo 1: configuração, palette, camadas, ossos e tecidos ----
    for (const st of stmts) {
      const A = st.attrs;
      checkAttrs(st);
      switch (st.cmd) {
        case 'canvas': {
          const w = st.pos[0] ? num(st.pos[0].text) : NaN, h = st.pos[1] ? num(st.pos[1].text) : NaN;
          if (isNaN(w) || isNaN(h) || w < 1 || h < 1 || w > 4096 || h > 4096) err(st.line, 'use: canvas largura altura (1 a 4096)', st.cmdTok.from, st.cmdTok.to);
          else { m.canvas.w = Math.round(w); m.canvas.h = Math.round(h); }
          if (A.has('bg')) {
            const a = A.get('bg'), p = m.palette.get(a.text);
            if (a.text === 'none' || a.text === 'transparent') m.canvas.bg = null;
            else if (HEX.test(a.text) || isCssColor(a.text)) m.canvas.bg = a.text;
            else if (typeof p === 'string') m.canvas.bg = p;
            else bad(st, a, `cor inválida "${a.text}"`);
          }
          if (A.has('light')) m.canvas.light = pair(st, A.get('light'), m.canvas.light);
          info(st);
          break;
        }
        case 'finish': {
          const s = st.pos[0] && st.pos[0].text;
          if (s && !FINISHES.includes(s)) err(st.line, `acabamento desconhecido "${s}" (use ${FINISHES.join(' ou ')})`, st.pos[0].from, st.pos[0].to);
          else if (s) m.finish.style = s;
          if (A.has('inner')) m.finish.inner = number(st, A.get('inner'), 1, 0, 1);
          if (A.has('pixel')) m.finish.pixel = Math.round(number(st, A.get('pixel'), 1, 1, 32));
          info(st);
          break;
        }
        case 'unity': {
          const u = { unit: 100, root: [m.canvas.w / 2, m.canvas.h], collider: null };
          if (A.has('unit')) u.unit = number(st, A.get('unit'), 100, 1, 100000);
          if (A.has('root')) u.root = pair(st, A.get('root'), u.root);
          if (A.has('collider')) u.collider = list(st, A.get('collider'), 2, 4, null);
          if (u.collider) while (u.collider.length < 4) u.collider.push(0);
          m.unity = u;
          const rec = info(st);
          if (A.has('root')) { const a = A.get('root'); rec.handles.push({ kind: 'root', x: u.root[0], y: u.root[1], from: a.vfrom, to: a.to }); }
          break;
        }
        case 'palette': {
          for (const a of A.values()) {
            if (!IDENT.test(a.key)) { bad(st, a, `nome de cor inválido "${a.key}"`); continue; }
            const v = a.text, n = num(v);
            if (HEX.test(v)) m.palette.set(a.key, v);
            else if (!isNaN(n)) m.palette.set(a.key, n);
            else if (m.palette.has(v)) m.palette.set(a.key, m.palette.get(v));
            else if (isCssColor(v)) m.palette.set(a.key, v);
            else bad(st, a, `valor inválido "${v}" (use #cor, número ou outro nome da palette)`);
          }
          if (st.pos.length) err(st.line, 'palette só aceita nome=valor', st.pos[0].from, st.pos[0].to);
          info(st);
          break;
        }
        case 'layer': {
          const name = ident(st, st.pos[0], 'da camada');
          if (!name) break;
          if (m.layerMap.has(name)) { err(st.line, `camada "${name}" já existe`, st.pos[0].from, st.pos[0].to); break; }
          const L = { name, line: st.line, items: [], guide: false, hidden: false, clip: null, only: null, opacity: 1, blend: 'source-over' };
          for (const f of st.pos.slice(1)) {
            if (FLAGS.layer.includes(f.text)) L[f.text] = true;
            else err(st.line, `opção desconhecida "${f.text}" (use guide ou hidden)`, f.from, f.to, 'warn');
          }
          if (A.has('clip')) L.clip = A.get('clip').text;
          if (A.has('only')) L.only = A.get('only').text.split(',').filter(Boolean);
          if (A.has('opacity')) L.opacity = number(st, A.get('opacity'), 1, 0, 1);
          if (A.has('blend')) {
            const b = A.get('blend').text;
            if (BLENDS.includes(b)) L.blend = b === 'normal' ? 'source-over' : b;
            else bad(st, A.get('blend'), `blend desconhecido "${b}"`);
          }
          st.layer = L;
          m.layers.push(L);
          m.layerMap.set(name, L);
          info(st, { layer: L });
          break;
        }
        case 'bone': {
          const name = ident(st, st.pos[0], 'do osso');
          if (!name) break;
          if (m.bones.has(name)) { err(st.line, `osso "${name}" já existe`, st.pos[0].from, st.pos[0].to); break; }
          const b = { name, line: st.line, pivot: [0, 0], parent: null };
          const rec = info(st, { bone: b });
          if (A.has('pivot')) {
            const a = A.get('pivot');
            b.pivot = pair(st, a, [0, 0]);
            rec.handles.push({ kind: 'pivot', bone: name, x: b.pivot[0], y: b.pivot[1], from: a.vfrom, to: a.to });
          } else err(st.line, 'falta pivot=x,y', st.cmdTok.from, st.cmdTok.to);
          if (A.has('parent')) b.parent = A.get('parent').text;
          m.bones.set(name, b);
          break;
        }
        case 'cloth': {
          const name = ident(st, st.pos[0], 'do tecido');
          if (!name) break;
          const c = { name, line: st.line, pivot: [0, 0], tension: 0.5, bone: null, swing: 1, drag: 1, R: 0, center: [0, 0] };
          const rec = info(st, { cloth: c });
          if (A.has('pivot')) {
            const a = A.get('pivot');
            c.pivot = pair(st, a, [0, 0]);
            rec.handles.push({ kind: 'pivot', cloth: name, x: c.pivot[0], y: c.pivot[1], from: a.vfrom, to: a.to });
          } else err(st.line, 'falta pivot=x,y', st.cmdTok.from, st.cmdTok.to);
          if (A.has('tension')) c.tension = number(st, A.get('tension'), 0.5, 0, 1);
          if (A.has('swing')) c.swing = number(st, A.get('swing'), 1, 0, 10);
          if (A.has('drag')) c.drag = number(st, A.get('drag'), 1, 0, 10);
          if (A.has('bone')) c.bone = A.get('bone').text;
          m.cloths.set(name, c);
          break;
        }
      }
    }
    for (const st of stmts) {
      if (st.cmd === 'bone' && st.attrs.has('parent')) {
        const a = st.attrs.get('parent'), b = m.bones.get(st.pos[0] && st.pos[0].text);
        if (!b) continue;
        if (!m.bones.has(a.text)) { bad(st, a, `osso pai "${a.text}" não existe`); b.parent = null; continue; }
        let p = a.text, guard = 0;
        while (p && guard++ < 100) { if (p === b.name) { bad(st, a, 'ossos em ciclo'); b.parent = null; break; } p = m.bones.get(p) && m.bones.get(p).parent; }
      }
      if (st.cmd === 'cloth' && st.attrs.has('bone')) {
        const a = st.attrs.get('bone');
        if (!m.bones.has(a.text)) { bad(st, a, `osso "${a.text}" não existe`); m.cloths.get(st.pos[0].text).bone = null; }
      }
    }

    // ---- passo 2: desenhos, animações e keys ----
    let cur = null, curAnim = null, base = null;
    const baseLayer = () => {
      if (!base) {
        base = { name: 'base', line: -1, items: [], guide: false, hidden: false, clip: null, only: null, opacity: 1, blend: 'source-over', implicit: true };
        m.layers.unshift(base);
        if (!m.layerMap.has('base')) m.layerMap.set('base', base);
      }
      return base;
    };

    for (const st of stmts) {
      const A = st.attrs;
      if (st.cmd === 'layer') { if (st.layer) cur = st.layer; continue; }
      if (st.cmd === 'anim') {
        const name = ident(st, st.pos[0], 'da animação');
        if (!name) { curAnim = null; continue; }
        if (m.animMap.has(name)) { err(st.line, `animação "${name}" já existe`, st.pos[0].from, st.pos[0].to); curAnim = null; continue; }
        const an = { name, line: st.line, frames: 24, fps: 12, loop: true, tracks: new Map(), keyLines: [] };
        if (A.has('frames')) an.frames = Math.round(number(st, A.get('frames'), 24, 1, 600));
        if (A.has('fps')) an.fps = number(st, A.get('fps'), 12, 1, 60);
        for (const f of st.pos.slice(1)) {
          if (f.text === 'once') an.loop = false;
          else if (f.text === 'loop') an.loop = true;
          else err(st.line, `opção desconhecida "${f.text}" (use once ou loop)`, f.from, f.to, 'warn');
        }
        m.anims.push(an);
        m.animMap.set(name, an);
        curAnim = an;
        info(st, { anim: an });
        continue;
      }
      if (st.cmd === 'key') {
        if (!curAnim) { err(st.line, 'key precisa vir depois de um anim', st.cmdTok.from, st.cmdTok.to); continue; }
        const ft = st.pos[0];
        let frame = ft ? num(ft.text) : NaN;
        if (isNaN(frame) || frame < 0) { err(st.line, 'use: key quadro osso=dx,dy,rot,sx,sy', ft ? ft.from : st.cmdTok.from, ft ? ft.to : st.cmdTok.to); continue; }
        frame = Math.round(frame);
        if (frame > curAnim.frames) { err(st.line, `quadro ${frame} passa do fim (frames=${curAnim.frames})`, ft.from, ft.to, 'warn'); frame = curAnim.frames; }
        let ease = 'smooth';
        for (const a of A.values()) {
          if (a.key === 'ease') {
            if (W.geom.EASE[a.text]) ease = a.text;
            else bad(st, a, `ease desconhecido "${a.text}" (use ${Object.keys(W.geom.EASE).join(', ')})`);
            continue;
          }
          if (!m.bones.has(a.key)) { bad(st, a, `osso "${a.key}" não existe`); continue; }
          const v = list(st, a, 1, 5, null);
          if (!v) continue;
          const full = [0, 0, 0, 1, 1];
          v.forEach((x, i) => { full[i] = x; });
          if (v.length === 4) full[4] = v[3];
          if (!curAnim.tracks.has(a.key)) curAnim.tracks.set(a.key, []);
          const tr = curAnim.tracks.get(a.key);
          const same = tr.findIndex((k) => k.frame === frame);
          const k = { frame, v: full, ease, line: st.line };
          if (same >= 0) tr[same] = k; else tr.push(k);
        }
        curAnim.keyLines.push({ line: st.line, frame });
        info(st, { anim: curAnim, frame });
        continue;
      }
      if (!DRAWABLE.has(st.cmd)) continue;

      const layer = cur || baseLayer();
      const el = buildElement(st, layer);
      if (!el) continue;
      m.elements.push(el);
      if (el.name) { if (!m.named.has(el.name)) m.named.set(el.name, []); m.named.get(el.name).push(el); }
      if (el.inkon && el.ink > 0) {
        layer.items.push({ el, part: 'fill' });
        el.inkon.items.push({ el, part: 'ink' });
      } else {
        layer.items.push({ el, part: 'all' });
      }
    }

    function buildElement(st, layer) {
      const A = st.attrs;
      const el = { id: m.elements.length, type: st.cmd, line: st.line, name: null, layer, bone: null, cloth: null, opacity: 1, pts: st.pts, closed: CLOSED.has(st.cmd) };
      let pos = st.pos;
      if (pos[0] && IDENT.test(pos[0].text)) { el.name = pos[0].text; pos = pos.slice(1); }
      const rec = info(st, { el });
      if (A.has('bone')) { const a = A.get('bone'); if (m.bones.has(a.text)) el.bone = a.text; else bad(st, a, `osso "${a.text}" não existe`); }
      if (A.has('cloth')) { const a = A.get('cloth'); if (m.cloths.has(a.text)) el.cloth = a.text; else bad(st, a, `tecido "${a.text}" não existe`); }
      if (A.has('opacity')) el.opacity = number(st, A.get('opacity'), 1, 0, 1);
      const inkColor = m.palette.get('ink');
      const defInk = typeof inkColor === 'string' ? inkColor : '#14141c';

      if (el.closed) {
        el.ink = A.has('ink') ? width(st, A.get('ink')) : 0;
        el.fill = A.has('c') ? color(st, A.get('c')) : (el.ink > 0 ? null : defInk);
        el.inkc = A.has('inkc') ? color(st, A.get('inkc')) : defInk;
        el.weight = A.has('weight') ? number(st, A.get('weight'), 0, 0, 3) : 0;
        if (A.has('inkon')) {
          const a = A.get('inkon'), t = m.layerMap.get(a.text);
          if (!t) bad(st, a, `camada "${a.text}" não existe`);
          else if (!(el.ink > 0)) bad(st, a, 'inkon= só faz sentido com ink=', 'warn');
          else el.inkon = t;
        }
      }
      if (st.cmd === 'shape') {
        el.smooth = A.has('smooth') ? number(st, A.get('smooth'), 1, 0, 2) : 1;
        if (st.pts.length < 3) err(st.line, 'shape precisa de pelo menos 3 pontos depois do ":"', st.cmdTok.from, st.cmdTok.to);
      } else if (st.cmd === 'ellipse') {
        el.center = posPair(st, pos[0], 'o centro', [0, 0]);
        const r = pos[1] ? nums(pos[1].text) : [];
        if ((r.length === 1 || r.length === 2) && !r.some(isNaN)) el.radius = r.length === 1 ? [r[0], r[0]] : r;
        else { err(st.line, 'use: ellipse nome cx,cy rx,ry (ou um raio só)', pos[1] ? pos[1].from : st.cmdTok.from, pos[1] ? pos[1].to : st.cmdTok.to); el.radius = [10, 10]; }
        el.rot = A.has('rot') ? number(st, A.get('rot'), 0) : 0;
        if (pos[0]) rec.handles.push({ kind: 'center', x: el.center[0], y: el.center[1], from: pos[0].from, to: pos[0].to });
      } else if (st.cmd === 'rect') {
        el.xy = posPair(st, pos[0], 'o canto', [0, 0]);
        el.size = posPair(st, pos[1], 'o tamanho (largura,altura)', [10, 10]);
        el.r = A.has('r') ? number(st, A.get('r'), 0, 0) : 0;
        el.rot = A.has('rot') ? number(st, A.get('rot'), 0) : 0;
        if (pos[0]) rec.handles.push({ kind: 'corner', x: el.xy[0], y: el.xy[1], from: pos[0].from, to: pos[0].to });
      } else if (st.cmd === 'stroke') {
        el.color = A.has('c') ? color(st, A.get('c')) : defInk;
        el.w = A.has('w') ? width(st, A.get('w')) : 4;
        el.taper = A.has('taper') ? pair(st, A.get('taper'), [0, 0]).map((v) => Math.min(1, Math.max(0, v))) : [0, 0];
        el.cap = A.has('cap') ? A.get('cap').text : 'round';
        if (!['round', 'butt', 'square'].includes(el.cap)) { bad(st, A.get('cap'), 'cap= aceita round, butt ou square', 'warn'); el.cap = 'round'; }
        el.smooth = A.has('smooth') ? number(st, A.get('smooth'), 1, 0, 2) : 1;
        if (A.has('limb') || A.has('hip') || A.has('foot')) {
          el.limb = A.has('limb') ? list(st, A.get('limb'), 1, 2, [el.w, el.w]) : [el.w, el.w];
          if (el.limb.length === 1) el.limb = [el.limb[0], el.limb[0]];
          if (A.has('hip')) {
            const a = A.get('hip');
            el.hip = pair(st, a, [0, 0]);
            rec.handles.push({ kind: 'hip', x: el.hip[0], y: el.hip[1], from: a.vfrom, to: a.to });
          } else { err(st.line, 'perna precisa de hip=x,y', st.cmdTok.from, st.cmdTok.to); el.hip = [0, 0]; }
          if (A.has('on')) { const a = A.get('on'); if (m.bones.has(a.text)) el.on = a.text; else bad(st, a, `osso "${a.text}" não existe`); }
          el.bend = A.has('bend') ? number(st, A.get('bend'), 1, -3, 3) : 1;
          el.footSpec = A.has('foot') ? A.get('foot') : null;
          if (!el.footSpec) err(st.line, 'perna precisa de foot=chão,x ou foot=x,y', st.cmdTok.from, st.cmdTok.to);
        } else if (st.pts.length < 2) err(st.line, 'stroke precisa de pelo menos 2 pontos depois do ":"', st.cmdTok.from, st.cmdTok.to);
      } else if (st.cmd === 'line') {
        el.color = A.has('c') ? color(st, A.get('c')) : defInk;
        el.w = A.has('w') ? width(st, A.get('w')) : 1;
        el.dash = A.has('dash') ? list(st, A.get('dash'), 1, 8, null) : null;
        if (st.pts.length < 2) err(st.line, 'line precisa de pelo menos 2 pontos depois do ":"', st.cmdTok.from, st.cmdTok.to);
      }
      st.pts.forEach((p, i) => rec.handles.push({ kind: 'pt', idx: i, x: p.x, y: p.y, corner: p.corner, from: p.from, to: p.to }));
      if (pos.length && st.cmd !== 'ellipse' && st.cmd !== 'rect') err(st.line, `valor solto "${pos[0].text}" (atributos usam nome=valor)`, pos[0].from, pos[0].to, 'warn');
      return el;
    }

    // ---- passo 3: referências que dependem de tudo já lido ----
    for (const L of m.layers) {
      if (L.clip && !m.named.has(L.clip) && !m.layerMap.has(L.clip)) {
        const st = stmts.find((s) => s.layer === L);
        if (st) bad(st, st.attrs.get('clip'), `clip: "${L.clip}" não é forma nem camada`);
        L.clip = null;
      }
      if (L.only) {
        const st = stmts.find((s) => s.layer === L);
        for (const n of L.only) if (!m.animMap.has(n) && st) bad(st, st.attrs.get('only'), `animação "${n}" não existe`, 'warn');
      }
    }
    for (const el of m.elements) {
      if (!el.limb) continue;
      el.foot = [el.hip[0], el.hip[1] + 40];
      const a = el.footSpec;
      if (a) {
        const parts = a.text.split(',');
        const st = stmts.find((s) => s.line === el.line);
        if (parts.length === 2 && IDENT.test(parts[0]) && !isNaN(num(parts[1]))) {
          const g = (m.named.get(parts[0]) || []).find((e) => e.pts && e.pts.length >= 2);
          if (!g) bad(st, a, `não achei a linha "${parts[0]}" para apoiar o pé`);
          else el.foot = [num(parts[1]), yOnLine(g.pts, num(parts[1]))];
        } else {
          const v = nums(a.text);
          if (v.length === 2 && !v.some(isNaN)) el.foot = v;
          else bad(st, a, 'use foot=chão,x (nome de uma line) ou foot=x,y');
        }
      }
      el.restLen = Math.max(1, Math.hypot(el.foot[0] - el.hip[0], el.foot[1] - el.hip[1]));
    }
    for (const c of m.cloths.values()) {
      const pts = [];
      for (const el of m.elements) {
        if (el.cloth !== c.name) continue;
        if (!c.bone && el.bone) c.bone = el.bone;
        for (const p of restPoints(el)) pts.push(p);
      }
      if (!pts.length) continue;
      let sx = 0, sy = 0, R = 0;
      for (const p of pts) { sx += p[0]; sy += p[1]; R = Math.max(R, Math.hypot(p[0] - c.pivot[0], p[1] - c.pivot[1])); }
      c.center = [sx / pts.length, sy / pts.length];
      c.R = R;
    }
    errors.sort((a, b) => a.line - b.line || a.from - b.from);
    return m;
  }

  function yOnLine(pts, x) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((x >= a.x && x <= b.x) || (x >= b.x && x <= a.x)) return a.x === b.x ? a.y : a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
    }
    const near = pts.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), pts[0]);
    return near.y;
  }

  function restPoints(el) {
    if (el.type === 'ellipse') return [[el.center[0] - el.radius[0], el.center[1]], [el.center[0] + el.radius[0], el.center[1]], [el.center[0], el.center[1] - el.radius[1]], [el.center[0], el.center[1] + el.radius[1]]];
    if (el.type === 'rect') return [[el.xy[0], el.xy[1]], [el.xy[0] + el.size[0], el.xy[1] + el.size[1]]];
    return el.pts.map((p) => [p.x, p.y]);
  }

  W.lang = { parse, splitLine, KEYWORDS, ATTRS, FLAGS, DRAWABLE, IDENT, HEX, NUM };
})(window.Weasel = window.Weasel || {});
