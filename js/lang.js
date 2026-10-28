/* Weasel — leitura da linguagem: cada linha vira uma instrução, e as instruções viram o modelo do desenho. */
(function (W) {
  'use strict';
  const M = W.geom.M;

  const KEYWORDS = {
    canvas: 'setup', finish: 'setup', unity: 'setup', palette: 'setup', gradient: 'setup', pattern: 'setup', let: 'setup', variant: 'setup', include: 'setup',
    layer: 'draw', shape: 'draw', stroke: 'draw', line: 'draw', ellipse: 'draw', rect: 'draw', text: 'draw', emitter: 'draw',
    def: 'comp', end: 'comp', use: 'comp',
    bone: 'rig', cloth: 'rig', anim: 'rig', key: 'rig', event: 'rig',
    light: 'fx', ambient: 'fx',
    film: 'film', scene: 'film', shot: 'film', actor: 'film', camera: 'film', at: 'film', audio: 'film', sub: 'film', mouth: 'rig',
    box: 'game', godot: 'game', tileset: 'game', tile: 'game', point: 'game',
  };
  const FILM_CMDS = new Set(['scene', 'shot', 'actor', 'camera', 'at', 'audio', 'sub']);
  // bocas do lip sync (padrão do Rhubarb Lip Sync): A fechada … F biquinho, G F/V, H L, X descanso
  const VISEMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'];
  const DRAWABLE = new Set(['shape', 'stroke', 'line', 'ellipse', 'rect', 'text', 'emitter']);
  const CLOSED = new Set(['shape', 'ellipse', 'rect']);
  const COMMON = ['c', 'bone', 'cloth', 'opacity', 'mirror', 'cut', 'emit'];
  const OUTLINE = ['ink', 'inkc', 'weight', 'inkon'];
  const ATTRS = {
    canvas: ['bg', 'light'],
    finish: ['inner', 'pixel', 'bloom', 'vignette', 'grain', 'posterize'],
    unity: ['unit', 'root', 'collider'],
    layer: ['clip', 'cut', 'only', 'opacity', 'blend', 'blur', 'glow', 'shadow', 'tint', 'brightness', 'saturate', 'contrast', 'hue', 'trail', 'cast', 'from', 'rim', 'shade', 'depth'],
    bone: ['parent', 'pivot', 'sway', 'bob', 'jitter', 'spring'],
    cloth: ['pivot', 'tension', 'bone', 'swing', 'drag'],
    anim: ['frames', 'fps'],
    use: ['scale', 'rot', 'flip', 'bone', 'cloth', 'opacity'],
    light: ['c', 'power', 'radius', 'glow', 'bone', 'flicker', 'aim', 'cone', 'rim'],
    ambient: ['c', 'power'],
    pattern: ['c', 'bg', 'gap', 'w', 'r', 'angle'],
    shape: [...COMMON, ...OUTLINE, 'smooth'],
    ellipse: [...COMMON, ...OUTLINE, 'rot'],
    rect: [...COMMON, ...OUTLINE, 'r', 'rot'],
    stroke: [...COMMON, 'w', 'taper', 'cap', 'smooth', 'limb', 'hip', 'on', 'foot', 'target', 'bend'],
    line: [...COMMON, 'w', 'dash'],
    text: [...COMMON, 'ink', 'inkc', 'size', 'font', 'align', 'rot'],
    emitter: ['c', 'bone', 'opacity', 'emit', 'rate', 'burst', 'life', 'speed', 'angle', 'spread', 'gravity', 'wind', 'drag', 'size', 'shape', 'area', 'seed'],
    film: ['fps', 'dur', 'lang', 'subs', 'subsize', 'subc'],
    audio: ['at', 'from', 'dur', 'vol', 'lips', 'cues', 'text', 'lang'],
    sub: ['dur', 'lang'],
    mouth: VISEMES,
    shot: ['dur', 'in'],
    actor: ['scale', 'rot', 'flip', 'depth', 'anim', 'speed', 'opacity', 'origin', 'variant', 'hide'],
    camera: ['zoom', 'rot', 'shake', 'follow', 'offset', 'lag', 'fade', 'fadec'],
    box: ['bone', 'only'],
    point: ['bone'],
    godot: ['body', 'root', 'normal', 'name', 'rig'],
    tileset: ['size'],
    tile: ['collision'],
  };
  const FLAGS = {
    layer: ['guide', 'hidden', 'lit', 'unlit', 'screen', 'front'], anim: ['once', 'loop'], gradient: ['linear', 'radial', 'box'], light: ['point', 'spot', 'dir'], pattern: ['hatch', 'dots', 'cross'],
    shape: ['hidden'], stroke: ['hidden'], line: ['hidden'], ellipse: ['hidden'], rect: ['hidden'], text: ['hidden', 'bold', 'italic'], emitter: ['hidden'],
    actor: ['screen', 'bg', 'hidden', 'unlit', 'front'],
    audio: ['loop'],
    box: ['body', 'hit', 'hurt', 'rect', 'circle', 'capsule', 'off'],
    tileset: ['auto'],
    tile: ['solid', 'oneway'],
  };
  const DRAW_FLAGS = new Set(['hidden', 'bold', 'italic']);
  const PARTICLE_SHAPES = ['dot', 'soft', 'square', 'streak', 'star'];
  // order = above=/below= (pinta logo depois/antes de outra forma ou camada); draw = quanto já foi desenhado (0 a 1)
  const PROPS = { opacity: 'num', show: 'step', c: 'color', inkc: 'color', w: 'width', ink: 'width', shape: 'shape', draw: 'num', above: 'order', below: 'order' };
  const LAYER_PROPS = { opacity: 'num', show: 'step', blur: 'free', glow: 'free', tint: 'free', brightness: 'free', saturate: 'free', contrast: 'free', hue: 'free', above: 'order', below: 'order' };
  const LIGHT_PROPS = { power: 'free', radius: 'free', c: 'color', glow: 'free', aim: 'free', cone: 'free' };
  // o que o "at" muda num filme (xy = par x,y; step = troca de uma vez, sem transição)
  const ACTOR_PROPS = { pos: 'xy', x: 'free', y: 'free', scale: 'scale', rot: 'free', opacity: 'num', depth: 'pos', speed: 'stepnum', anim: 'anim', flip: 'flip', show: 'step', variant: 'variant' };
  const CAMERA_PROPS = { pos: 'xy', x: 'free', y: 'free', zoom: 'pos', rot: 'free', shake: 'px', follow: 'actor', offset: 'xy', lag: 'stepnum', fade: 'num', fadec: 'color' };
  // formas do próprio arquivo do filme (mapas, setas, títulos)
  const SHAPE_AT_PROPS = { draw: 'num', opacity: 'num', show: 'step' };
  // transições na entrada de um plano: shot nome dur=4s in=fade,0.5s
  const TRANSITIONS = ['fade', 'wipe', 'slide', 'zoom', 'iris'];
  const FILM_W = 1920, FILM_H = 1080;
  // jogo: caixas (colisão do corpo, golpe, dano) e o tipo do nó raiz da cena do Godot
  const BOX_PROPS = { show: 'step' };
  const BOX_KINDS = ['body', 'hit', 'hurt'], BOX_SHAPES = ['rect', 'circle', 'capsule'];
  const GODOT_BODIES = ['character', 'static', 'area', 'rigid', 'node'];
  const FINISHES = ['game', 'flat'];
  const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
  const DEFAULT_PALETTE = { ink: '#14141c', line: 8, inner: 5, edge: 3 };

  const NUM = /^[-+]?(\d+\.?\d*|\.\d+)$/;
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const IDENT = /^[A-Za-z_][\w-]*$/;

  // ---------- expressões: {cx+20}, {olho*1.6}, {sin(30)*r} ----------
  const FN = {
    sin: (d) => Math.sin(d * Math.PI / 180), cos: (d) => Math.cos(d * Math.PI / 180), tan: (d) => Math.tan(d * Math.PI / 180),
    atan2: (y, x) => Math.atan2(y, x) * 180 / Math.PI, sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max,
    floor: Math.floor, ceil: Math.ceil, round: Math.round, pow: Math.pow,
    lerp: (a, b, t) => a + (b - a) * t, clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  };
  function evalExpr(s, vars) {
    let i = 0;
    const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
    const fail = (msg) => { throw new Error(msg); };
    function primary() {
      ws();
      const ch = s[i];
      if (ch === '(') {
        i++;
        const v = expr();
        ws();
        if (s[i] !== ')') fail('falta ")"');
        i++;
        return v;
      }
      let m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (m) { i += m[0].length; return parseFloat(m[0]); }
      m = /^[A-Za-z_]\w*/.exec(s.slice(i));
      if (m) {
        const name = m[0];
        i += name.length;
        ws();
        if (s[i] === '(') {
          i++;
          const args = [];
          ws();
          if (s[i] !== ')') {
            for (;;) { args.push(expr()); ws(); if (s[i] === ',') { i++; continue; } break; }
          }
          if (s[i] !== ')') fail('falta ")"');
          i++;
          if (!FN[name]) fail(`função desconhecida "${name}"`);
          return FN[name](...args);
        }
        if (name === 'pi') return Math.PI;
        if (vars && vars.has(name)) return vars.get(name);
        fail(`variável desconhecida "${name}"`);
      }
      fail(ch === undefined ? 'expressão incompleta' : `símbolo inesperado "${ch}"`);
    }
    function power() { const b = primary(); ws(); if (s[i] === '^') { i++; return Math.pow(b, unary()); } return b; }
    function unary() { ws(); if (s[i] === '-') { i++; return -unary(); } if (s[i] === '+') { i++; return unary(); } return power(); }
    function term() {
      let v = unary();
      for (;;) {
        ws();
        const op = s[i];
        if (op !== '*' && op !== '/' && op !== '%') return v;
        i++;
        const r = unary();
        v = op === '*' ? v * r : op === '/' ? v / r : v % r;
      }
    }
    function expr() {
      let v = term();
      for (;;) {
        ws();
        const op = s[i];
        if (op !== '+' && op !== '-') return v;
        i++;
        const r = term();
        v = op === '+' ? v + r : v - r;
      }
    }
    const v = expr();
    ws();
    if (i < s.length) fail(`símbolo inesperado "${s[i]}"`);
    if (!Number.isFinite(v)) fail('o resultado não é um número');
    return v;
  }

  let scope = null; // variáveis visíveis enquanto um valor é lido (let + parâmetros de def)
  function num(s) {
    if (NUM.test(s)) return parseFloat(s);
    if (s.length > 2 && s[0] === '{' && s[s.length - 1] === '}') {
      try { return evalExpr(s.slice(1, -1), scope); } catch (e) { return NaN; }
    }
    return NaN;
  }
  function splitTop(s, sep) {
    const out = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') depth = Math.max(0, depth - 1);
      else if (s[i] === sep && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
    }
    out.push(s.slice(start));
    return out;
  }
  function topIndex(s, ch) {
    let d = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{') d++;
      else if (s[i] === '}') d = Math.max(0, d - 1);
      else if (s[i] === ch && d === 0) return i;
    }
    return -1;
  }
  const nums = (s) => splitTop(s, ',').map(num);
  const unq = (s) => (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"' ? s.slice(1, -1) : s);

  function isCssColor(v) {
    return /^[a-z]+$/i.test(v) && typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('color', v);
  }

  // ---------- leitura das linhas ----------
  // Palavras separadas por espaço, sem quebrar dentro de "aspas" nem de {expressões}.
  function words(s, off) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      while (i < s.length && /\s/.test(s[i])) i++;
      if (i >= s.length) break;
      const start = i;
      let q = false, depth = 0;
      while (i < s.length && (q || depth > 0 || !/\s/.test(s[i]))) {
        const ch = s[i];
        if (ch === '"') q = !q;
        else if (!q && ch === '{') depth++;
        else if (!q && ch === '}' && depth > 0) depth--;
        i++;
      }
      out.push({ text: s.slice(start, i), from: start + off, to: i + off });
    }
    return out;
  }

  // Separa comentário, cabeçalho e lista de pontos (depois do ":"). "#" começa comentário no início
  // da linha ou depois de espaço — a não ser que seja uma cor (#fff, #e4ded3...).
  function splitLine(text) {
    let cut = text.length, comment = null, colon = -1, q = false, depth = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') { q = !q; continue; }
      if (q) continue;
      if (ch === '{') { depth++; continue; }
      if (ch === '}') { depth = Math.max(0, depth - 1); continue; }
      if (depth) continue;
      if (ch === '#') {
        const lead = !text.slice(0, i).trim();
        const afterSpace = i > 0 && (text[i - 1] === ' ' || text[i - 1] === '\t');
        if (lead || (afterSpace && !/^#[0-9a-fA-F]{3,8}(?=$|[\s@,])/.test(text.slice(i)))) { cut = i; comment = text.slice(i); break; }
      }
      if (ch === ':' && colon < 0) colon = i;
    }
    const code = text.slice(0, cut);
    return {
      code, comment, commentAt: comment === null ? -1 : cut, colon,
      words: words(colon < 0 ? code : code.slice(0, colon), 0),
      points: colon < 0 ? [] : words(code.slice(colon + 1), colon + 1),
    };
  }

  function checkExprs(tok, li, err) {
    const t = tok.text;
    let depth = 0, start = -1;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '{') { if (depth++ === 0) start = i; } else if (t[i] === '}' && depth > 0 && --depth === 0) {
        try { evalExpr(t.slice(start + 1, i), scope); } catch (e) { err(li, `{${t.slice(start + 1, i)}}: ${e.message}`, tok.from + start, tok.from + i + 1); }
      }
    }
    if (depth > 0) err(li, 'falta fechar "}"', tok.from, tok.to);
  }

  // Ponto: x,y  |  x,y!  (canto vivo)  |  x,y~dx,dy  (alça da curva, relativa ao ponto)
  function parsePoint(p) {
    let t = p.text, corner = false, tan = null;
    const ti = topIndex(t, '~');
    if (ti >= 0) {
      tan = nums(t.slice(ti + 1));
      if (tan.length !== 2 || tan.some(isNaN)) return null;
      t = t.slice(0, ti);
    } else if (t.endsWith('!')) { corner = true; t = t.slice(0, -1); }
    const v = nums(t);
    if (v.length !== 2 || v.some(isNaN)) return null;
    return { x: v[0], y: v[1], corner, tan, from: p.from, to: p.to, xyTo: p.from + t.length + (corner ? 1 : 0), tanFrom: ti >= 0 ? p.from + ti + 1 : -1, fixed: p.text.includes('{') };
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
    const st = { cmd: first.text, line: li, cmdTok: first, pos: [], attrs: new Map(), pts: [], raw: sp.points, hasColon: sp.colon >= 0 };
    if (st.cmd === 'let') return st;
    for (const w of sp.words.slice(1)) {
      if (w.text.includes('{') && !w.text.includes('"')) checkExprs(w, li, err);
      const eq = w.text[0] === '"' ? -1 : topIndex(w.text, '=');
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
    if (st.cmd !== 'gradient') {
      for (const p of sp.points) {
        if (p.text.includes('{')) checkExprs(p, li, err);
        const q = parsePoint(p);
        if (q) st.pts.push(q);
        else if (!p.text.includes('{')) err(li, `ponto inválido "${p.text}" (use x,y  x,y!  ou  x,y~dx,dy)`, p.from, p.to);
      }
    }
    return st;
  }

  // Junta os arquivos de include numa lista só de linhas, lembrando de onde cada uma veio.
  function expandIncludes(src, opts) {
    const out = [], files = [];
    const mainFile = opts.file || 'principal';
    const visit = (text, file, mainLine, chain, depth) => {
      text.split(/\r?\n/).forEach((t, i) => {
        const ml = depth === 0 ? i : mainLine;
        const row = { text: t, file, line: i, main: ml };
        out.push(row);
        const sp = splitLine(t);
        if (!sp.words.length || sp.words[0].text !== 'include') return;
        const tok = sp.words[1];
        if (!tok) { row.incErr = 'use: include "arquivo.weasel"'; return; }
        const name = unq(tok.text);
        if (!opts.resolve) { row.incErr = 'include não está disponível aqui'; return; }
        if (chain.includes(name)) { row.incErr = `include em ciclo: ${[...chain, name].join(' → ')}`; return; }
        if (depth >= 8) { row.incErr = 'includes demais um dentro do outro'; return; }
        const sub = opts.resolve(name, file);
        if (sub === null || sub === undefined) { row.incErr = `não achei o arquivo "${name}"`; return; }
        if (!files.includes(name)) files.push(name);
        visit(sub, name, ml, [...chain, name], depth + 1);
      });
    };
    visit(src, mainFile, 0, [mainFile], 0);
    return { lines: out, files, mainFile };
  }

  function parse(src, opts) {
    opts = opts || {};
    const errors = [], seen = new Set();
    let quiet = false;
    const err = (line, msg, from, to, level, force) => {
      if (quiet && !force) return;
      const k = `${line}:${from || 0}:${msg}`;
      if (seen.has(k)) return;
      seen.add(k);
      errors.push({ line, msg, from: from || 0, to: to || 0, level: level || 'error' });
    };
    const X = expandIncludes(src, opts);
    const L = X.lines;

    const m = {
      lineCount: src.split(/\r?\n/).length,
      canvas: { w: 800, h: 600, bg: '#ffffff', light: [-0.6, -0.8] },
      finish: { style: 'game', inner: 1, pixel: 1 },
      unity: null,
      palette: new Map(Object.entries(DEFAULT_PALETTE)),
      gradients: new Map(), patterns: new Map(),
      lights: new Map(), ambient: null,
      layers: [], layerMap: new Map(),
      bones: new Map(), cloths: new Map(),
      anims: [], animMap: new Map(),
      elements: [], named: new Map(),
      defs: new Map(), variants: [], variant: null, vars: null, files: X.files,
      film: null,
      boxes: new Map(), points: new Map(), godot: null, tileset: null, mouth: null,
      byLine: new Map(),
      errors,
    };

    // ---- let: variáveis para {expressões}, lidas antes de tudo ----
    const globals = new Map();
    m.vars = globals;
    L.forEach((ln, i) => {
      const sp = splitLine(ln.text);
      if (!sp.words.length || sp.words[0].text !== 'let') return;
      if (sp.words.length < 2) err(i, 'use: let nome=valor', sp.words[0].from, sp.words[0].to);
      for (const w of sp.words.slice(1)) {
        const eq = w.text.indexOf('=');
        const key = eq > 0 ? w.text.slice(0, eq) : '';
        if (!IDENT.test(key)) { err(i, `use let nome=valor ("${w.text}")`, w.from, w.to); continue; }
        let v = w.text.slice(eq + 1);
        if (v[0] === '{' && v[v.length - 1] === '}') v = v.slice(1, -1);
        try { globals.set(key, evalExpr(v, globals)); } catch (e) { err(i, `let ${key}: ${e.message}`, w.from + eq + 1, w.to); }
      }
    });

    scope = globals;
    const stmts = [];
    L.forEach((ln, i) => {
      if (ln.incErr) { const sp = splitLine(ln.text); const t = sp.words[1] || sp.words[0]; err(i, ln.incErr, t.from, t.to); }
      const s = readStatement(ln.text, i, err);
      if (s) stmts.push(s);
      // dentro de def … end, os parâmetros numéricos do def também valem nas {contas}
      if (s && s.cmd === 'def') {
        scope = new Map(globals);
        for (const a of s.attrs.values()) { const n = num(a.text); if (!isNaN(n)) scope.set(a.key, n); }
      } else if (s && s.cmd === 'end') scope = globals;
    });
    scope = globals;
    // num filme, o quadro padrão é Full HD
    if (stmts.some((s) => s.cmd === 'film') && !stmts.some((s) => s.cmd === 'canvas')) { m.canvas.w = FILM_W; m.canvas.h = FILM_H; }

    // ---- leitura de valores ----
    const ROOT = { xf: null, over: null, vars: globals, bone: null, cloth: null, opacity: 1, inst: 0 };
    const bad = (st, a, msg, level) => {
      if (a && a.inherited) return;
      err(st.line, msg, a ? a.from : st.cmdTok.from, a ? a.to : st.cmdTok.to, level, !!a);
    };
    const pal = (k, ctx) => (ctx && ctx.over && ctx.over.has(k) ? ctx.over.get(k) : m.palette.get(k));
    function color(st, a, ctx) {
      const v = unq(a.text);
      if (v === 'none' || v === 'transparent') return null;
      if (HEX.test(v)) return v;
      const p = pal(v, ctx);
      if (typeof p === 'string' || (p && p.kind === 'grad')) return p;
      if (typeof p === 'number') { bad(st, a, `"${v}" na palette é número, não cor`); return null; }
      const g = m.gradients.get(v) || m.patterns.get(v);
      if (g) return g;
      if (isCssColor(v)) return v;
      bad(st, a, `cor desconhecida "${v}"`);
      return null;
    }
    // só cor simples (#hex, palette): luzes, partículas, efeitos
    function plainColor(st, a, text) {
      const sub = text === undefined ? a : Object.assign({}, a, { text });
      const c = color(st, sub, ROOT);
      if (c && typeof c !== 'string') { bad(st, a, 'aqui só vale cor simples (sem gradiente ou padrão)'); return null; }
      if (c && !W.geom.parseHex(c)) { bad(st, a, `use uma cor #hex aqui ("${c}")`, 'warn'); return null; }
      return c;
    }
    function width(st, a, ctx) {
      const n = num(a.text);
      if (!isNaN(n)) return Math.max(0, n);
      if (a.text === 'none') return 0;
      const p = pal(a.text, ctx);
      if (typeof p === 'number') return p;
      bad(st, a, p === undefined ? `espessura desconhecida "${a.text}"` : `"${a.text}" na palette é cor, não número`);
      return 0;
    }
    function number(st, a, def, min, max) {
      const n = num(a.text);
      if (isNaN(n)) { bad(st, a, `número inválido em ${a.key}=`); return def; }
      if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
        bad(st, a, `${a.key}= deve ficar entre ${min} e ${max === undefined ? '∞' : max}`, 'warn');
        return Math.min(max === undefined ? Infinity : max, Math.max(min, n));
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
      if (v.length !== 2 || v.some(isNaN)) {
        if (!(tok && tok.inherited)) err(st.line, `esperado ${what} no formato x,y`, tok ? tok.from : st.cmdTok.from, tok ? tok.to : st.cmdTok.to);
        return def;
      }
      return v;
    };
    const ident = (st, tok, what) => {
      if (!tok) { err(st.line, `falta o nome ${what}`, st.cmdTok.from, st.cmdTok.to); return null; }
      if (!IDENT.test(tok.text)) { err(st.line, `nome inválido "${tok.text}"`, tok.from, tok.to); return null; }
      return tok.text;
    };
    function checkAttrs(st) {
      const ok = ATTRS[st.cmd];
      if (!ok || st.cmd === 'use') return;
      for (const a of st.attrs.values()) if (!ok.includes(a.key)) bad(st, a, `atributo desconhecido "${a.key}" em ${st.cmd}`, 'warn');
    }
    function info(st, extra) {
      const rec = Object.assign({ st, handles: [] }, extra || {});
      m.byLine.set(st.line, rec);
      return rec;
    }
    // valor de palette: #cor, número, outro nome da palette, nome de cor do CSS
    function paletteValue(st, a) {
      if (!IDENT.test(a.key)) { bad(st, a, `nome inválido "${a.key}"`); return undefined; }
      const v = a.text, n = num(v);
      if (HEX.test(v)) return v;
      if (!isNaN(n)) return n;
      if (m.palette.has(v)) return m.palette.get(v);
      if (isCssColor(v)) return v;
      bad(st, a, `valor inválido "${v}" (use #cor, número ou outro nome da palette)`);
      return undefined;
    }

    // ---- def ... end ----
    const defs = m.defs;
    let open = null;
    for (const st of stmts) {
      if (st.cmd === 'def') {
        if (open) { err(st.line, `def dentro de def (falta o end de "${open.name}")`, st.cmdTok.from, st.cmdTok.to); continue; }
        const name = ident(st, st.pos[0], 'do componente');
        open = { name: name || '?', line: st.line, st, body: [], uses: 0 };
        if (name) {
          if (defs.has(name)) err(st.line, `componente "${name}" já existe`, st.pos[0].from, st.pos[0].to);
          else defs.set(name, open);
        }
        info(st, { def: open });
        continue;
      }
      if (st.cmd === 'end') {
        if (!open) err(st.line, 'end sem def', st.cmdTok.from, st.cmdTok.to);
        else { info(st, { def: open }); open = null; }
        continue;
      }
      if (open) {
        st.inDef = open;
        if (DRAWABLE.has(st.cmd) || st.cmd === 'use') open.body.push(st);
        else if (st.cmd !== 'include') err(st.line, `${st.cmd} não pode ficar dentro de def (só formas e use)`, st.cmdTok.from, st.cmdTok.to);
      }
    }
    if (open) err(open.line, `def "${open.name}" sem end`, open.st.cmdTok.from, open.st.cmdTok.to);
    const top = stmts.filter((s) => !s.inDef && s.cmd !== 'def' && s.cmd !== 'end');

    // ---- passo 1: configuração, palette, camadas, ossos, tecidos ----
    const variantStmts = [], gradientStmts = [], lateStmts = [], layerFx = [];
    let bgTok = null;
    for (const st of top) {
      const A = st.attrs;
      checkAttrs(st);
      switch (st.cmd) {
        case 'canvas': {
          const w = st.pos[0] ? num(st.pos[0].text) : NaN, h = st.pos[1] ? num(st.pos[1].text) : NaN;
          if (isNaN(w) || isNaN(h) || w < 1 || h < 1 || w > 4096 || h > 4096) err(st.line, 'use: canvas largura altura (1 a 4096)', st.cmdTok.from, st.cmdTok.to);
          else { m.canvas.w = Math.round(w); m.canvas.h = Math.round(h); }
          if (A.has('bg')) bgTok = { st, a: A.get('bg') };
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
          for (const k of ['bloom', 'vignette', 'grain']) if (A.has(k)) m.finish[k] = number(st, A.get(k), 0, 0, 3);
          if (A.has('posterize')) {
            const a = A.get('posterize');
            if (a.text === 'palette') m.finish.posterize = 'palette';
            else m.finish.posterize = Math.round(number(st, a, 0, 2, 64));
          }
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
          if (A.has('root')) { const a = A.get('root'); rec.handles.push({ kind: 'root', x: u.root[0], y: u.root[1], from: a.vfrom, to: a.to, fixed: a.text.includes('{') }); }
          break;
        }
        case 'palette': {
          for (const a of A.values()) { const v = paletteValue(st, a); if (v !== undefined) m.palette.set(a.key, v); }
          if (st.pos.length) err(st.line, 'palette só aceita nome=valor', st.pos[0].from, st.pos[0].to);
          info(st);
          break;
        }
        case 'variant': {
          const name = ident(st, st.pos[0], 'da variante');
          if (name) { variantStmts.push({ name, st }); if (!m.variants.includes(name)) m.variants.push(name); }
          info(st);
          break;
        }
        case 'gradient': gradientStmts.push(st); break;
        case 'pattern': case 'light': case 'ambient': lateStmts.push(st); break;
        case 'layer': {
          const name = ident(st, st.pos[0], 'da camada');
          if (!name) break;
          if (m.layerMap.has(name)) { err(st.line, `camada "${name}" já existe`, st.pos[0].from, st.pos[0].to); break; }
          const Ly = { name, line: st.line, items: [], guide: false, hidden: false, lit: false, unlit: false, clip: null, cut: null, only: null, opacity: 1, blend: 'source-over', fx: null, trail: null, cast: null, rim: null, shade: 0.5, depth: 1, screen: false, front: false };
          for (const f of st.pos.slice(1)) {
            if (FLAGS.layer.includes(f.text)) Ly[f.text] = true;
            else err(st.line, `opção desconhecida "${f.text}" (use ${FLAGS.layer.join(', ')})`, f.from, f.to, 'warn');
          }
          layerFx.push({ st, Ly });
          if (A.has('clip')) Ly.clip = A.get('clip').text;
          if (A.has('cut')) Ly.cut = A.get('cut').text;
          if (A.has('only')) Ly.only = A.get('only').text.split(',').filter(Boolean);
          if (A.has('opacity')) Ly.opacity = number(st, A.get('opacity'), 1, 0, 1);
          if (A.has('depth')) Ly.depth = number(st, A.get('depth'), 1, 0.05, 1000);
          if (A.has('blend')) {
            const b = A.get('blend').text;
            if (BLENDS.includes(b)) Ly.blend = b === 'normal' ? 'source-over' : b;
            else bad(st, A.get('blend'), `blend desconhecido "${b}"`);
          }
          st.layer = Ly;
          m.layers.push(Ly);
          m.layerMap.set(name, Ly);
          info(st, { layer: Ly });
          break;
        }
        case 'bone': {
          const name = ident(st, st.pos[0], 'do osso');
          if (!name) break;
          if (m.bones.has(name)) { err(st.line, `osso "${name}" já existe`, st.pos[0].from, st.pos[0].to); break; }
          const b = { name, line: st.line, pivot: [0, 0], parent: null, sway: null, bob: null, jitter: 0, spring: 0, tip: null };
          const rec = info(st, { bone: b });
          if (A.has('pivot')) {
            const a = A.get('pivot');
            b.pivot = pair(st, a, [0, 0]);
            rec.handles.push({ kind: 'pivot', bone: name, x: b.pivot[0], y: b.pivot[1], from: a.vfrom, to: a.to, fixed: a.text.includes('{') });
          } else err(st.line, 'falta pivot=x,y', st.cmdTok.from, st.cmdTok.to);
          if (A.has('parent')) b.parent = A.get('parent').text;
          for (const k of ['sway', 'bob']) {
            if (!A.has(k)) continue;
            const v = list(st, A.get(k), 2, 3, null);
            if (v && v[1] <= 0) bad(st, A.get(k), `${k}=amplitude,período: o período tem que ser maior que 0`);
            else if (v) b[k] = [v[0], v[1], v[2] || 0];
          }
          if (A.has('jitter')) b.jitter = number(st, A.get('jitter'), 0, 0, 200);
          if (A.has('spring')) b.spring = number(st, A.get('spring'), 0.5, 0, 1) || 0.001;
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
            rec.handles.push({ kind: 'pivot', cloth: name, x: c.pivot[0], y: c.pivot[1], from: a.vfrom, to: a.to, fixed: a.text.includes('{') });
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
    for (const st of top) {
      if (st.cmd === 'bone' && st.attrs.has('parent')) {
        const a = st.attrs.get('parent'), b = m.bones.get(st.pos[0] && st.pos[0].text);
        if (!b || b.line !== st.line) continue;
        if (!m.bones.has(a.text)) { bad(st, a, `osso pai "${a.text}" não existe`); b.parent = null; continue; }
        let p = a.text, guard = 0;
        while (p && guard++ < 100) { if (p === b.name) { bad(st, a, 'ossos em ciclo'); b.parent = null; break; } p = m.bones.get(p) && m.bones.get(p).parent; }
      }
      if (st.cmd === 'cloth' && st.attrs.has('bone')) {
        const a = st.attrs.get('bone');
        if (!m.bones.has(a.text)) { bad(st, a, `osso "${a.text}" não existe`); m.cloths.get(st.pos[0].text).bone = null; }
      }
    }

    // variante escolhida: troca valores da palette antes de qualquer cor ser usada
    for (const v of variantStmts) {
      if (v.name !== opts.variant) continue;
      for (const a of v.st.attrs.values()) {
        if (a.key === 'show' || a.key === 'hide') continue;
        const val = paletteValue(v.st, a);
        if (val !== undefined) m.palette.set(a.key, val);
      }
      m.variant = v.name;
    }
    if (opts.variant && !m.variant) m.variant = null;

    // gradientes
    for (const st of gradientStmts) {
      const name = ident(st, st.pos[0], 'do gradiente');
      if (!name) continue;
      const typeTok = st.pos[1];
      const type = typeTok && (typeTok.text === 'linear' || typeTok.text === 'radial') ? typeTok.text : null;
      if (!type) { err(st.line, 'use: gradient nome linear x1,y1 x2,y2 : cores   ou   gradient nome radial cx,cy raio : cores', typeTok ? typeTok.from : st.cmdTok.from, typeTok ? typeTok.to : st.cmdTok.to); continue; }
      const rest = st.pos.slice(2);
      const box = rest.some((t) => t.text === 'box');
      const vals = rest.filter((t) => t.text !== 'box');
      let p = null;
      if (type === 'linear') {
        const a = posPair(st, vals[0], 'o ponto inicial', null), b = posPair(st, vals[1], 'o ponto final', null);
        if (a && b) p = [a[0], a[1], b[0], b[1]];
      } else {
        const c = posPair(st, vals[0], 'o centro', null);
        const r = vals[1] ? num(vals[1].text) : NaN;
        if (c && (isNaN(r) || r <= 0)) err(st.line, 'falta o raio do gradiente radial', vals[1] ? vals[1].from : st.cmdTok.from, vals[1] ? vals[1].to : st.cmdTok.to);
        else if (c) {
          p = [c[0], c[1], r];
          if (vals[2]) { const f = posPair(st, vals[2], 'o foco', null); if (f) p.push(f[0], f[1]); }
        }
      }
      if (!p) continue;
      const stops = [];
      for (const t of st.raw) {
        const at = t.text.lastIndexOf('@');
        const ctext = at > 0 ? t.text.slice(0, at) : t.text;
        const c = color(st, { key: 'cor', text: ctext, from: t.from, to: t.from + ctext.length }, ROOT);
        if (c && typeof c !== 'string') { err(st.line, 'gradiente não pode usar outro gradiente como cor', t.from, t.to); continue; }
        let pos = null;
        if (at > 0) {
          pos = num(t.text.slice(at + 1));
          if (isNaN(pos)) { err(st.line, `posição inválida em "${t.text}" (use cor@0.5)`, t.from, t.to); pos = null; }
        }
        stops.push({ c: c || 'rgba(0,0,0,0)', at: pos });
      }
      if (!stops.length) { err(st.line, 'faltam as cores depois do ":" (ex.: : #fff@0 #888@1)', st.cmdTok.from, st.cmdTok.to); continue; }
      if (stops[0].at === null) stops[0].at = 0;
      if (stops[stops.length - 1].at === null) stops[stops.length - 1].at = stops.length > 1 ? 1 : 0;
      for (let i = 1; i < stops.length - 1; i++) {
        if (stops[i].at !== null) continue;
        let j = i;
        while (stops[j].at === null) j++;
        const a0 = stops[i - 1].at, a1 = stops[j].at;
        for (let k = i; k < j; k++) stops[k].at = a0 + ((a1 - a0) * (k - i + 1)) / (j - i + 1);
      }
      let last = 0;
      for (const s of stops) { s.at = Math.min(1, Math.max(last, s.at)); last = s.at; }
      if (m.gradients.has(name)) err(st.line, `gradiente "${name}" já existe`, st.pos[0].from, st.pos[0].to);
      if (m.palette.has(name)) err(st.line, `"${name}" já é um nome da palette`, st.pos[0].from, st.pos[0].to, 'warn');
      const g = { kind: 'grad', name, type, p, box, stops };
      m.gradients.set(name, g);
      info(st, { grad: g });
    }
    // padrões de preenchimento: hachura e pontos
    for (const st of lateStmts.filter((s) => s.cmd === 'pattern')) {
      const name = ident(st, st.pos[0], 'do padrão');
      if (!name) continue;
      const A = st.attrs, flags = st.pos.slice(1).map((t) => t.text);
      for (const t of st.pos.slice(1)) if (!FLAGS.pattern.includes(t.text)) err(st.line, `opção desconhecida "${t.text}" (use hatch, dots ou cross)`, t.from, t.to, 'warn');
      const inkc = m.palette.get('ink');
      const p = { kind: 'pat', name, type: flags.includes('dots') ? 'dots' : 'hatch', cross: flags.includes('cross'), c: typeof inkc === 'string' ? inkc : '#14141c', bg: null, gap: 6, w: 1.2, r: 1.4, angle: 45 };
      if (A.has('c')) p.c = plainColor(st, A.get('c')) || p.c;
      if (A.has('bg')) p.bg = plainColor(st, A.get('bg'));
      if (A.has('gap')) p.gap = number(st, A.get('gap'), 6, 1.5, 500);
      if (A.has('w')) p.w = number(st, A.get('w'), 1.2, 0.1, 50);
      if (A.has('r')) p.r = number(st, A.get('r'), 1.4, 0.1, 50);
      if (A.has('angle')) p.angle = number(st, A.get('angle'), 45);
      if (m.patterns.has(name) || m.gradients.has(name)) err(st.line, `"${name}" já existe`, st.pos[0].from, st.pos[0].to);
      m.patterns.set(name, p);
      info(st, { pat: p });
    }

    if (bgTok) {
      const c = color(bgTok.st, bgTok.a, ROOT);
      if (c && c.kind === 'pat') bad(bgTok.st, bgTok.a, 'o fundo não aceita padrão (use cor ou gradiente)');
      else m.canvas.bg = c;
    }

    // efeitos das camadas
    for (const { st, Ly } of layerFx) {
      const A = st.attrs, fx = {};
      const parts = (a) => splitTop(a.text, ',');
      const nAt = (p, i, def) => (p[i] === undefined || p[i] === '' ? def : num(p[i]));
      if (A.has('blur')) fx.blur = number(st, A.get('blur'), 0, 0, 500);
      if (A.has('glow')) {
        const a = A.get('glow'), p = parts(a), c = plainColor(st, a, p[0]), r = nAt(p, 1, 12), s = nAt(p, 2, 1);
        if (isNaN(r) || isNaN(s)) bad(st, a, 'use glow=cor,raio[,força]');
        else if (c) { fx.glowc = c; fx.glow = r; fx.glows = Math.max(0.1, Math.min(5, s)); }
      }
      if (A.has('shadow')) {
        const a = A.get('shadow'), p = parts(a), c = plainColor(st, a, p[0]);
        const v = [nAt(p, 1, 4), nAt(p, 2, 6), nAt(p, 3, 8)];
        if (v.some(isNaN)) bad(st, a, 'use shadow=cor,dx,dy,desfoque');
        else if (c) fx.shadow = { c, dx: v[0], dy: v[1], b: v[2] };
      }
      if (A.has('tint')) {
        const a = A.get('tint'), p = parts(a), c = plainColor(st, a, p[0]), t = nAt(p, 1, 0.5);
        if (isNaN(t)) bad(st, a, 'use tint=cor,quanto (0 a 1)');
        else if (c) { fx.tintc = c; fx.tint = Math.min(1, Math.max(0, t)); }
      }
      for (const k of ['brightness', 'saturate', 'contrast']) if (A.has(k)) fx[k] = number(st, A.get(k), 1, 0, 10);
      if (A.has('hue')) fx.hue = number(st, A.get('hue'), 0);
      if (Object.keys(fx).length) Ly.fx = fx;
      if (A.has('trail')) {
        const a = A.get('trail'), p = parts(a), n = Math.round(nAt(p, 0, NaN)), d = nAt(p, 1, 0.5);
        const c = p[2] ? plainColor(st, a, p[2]) : null;
        if (isNaN(n) || n < 1 || n > 30 || isNaN(d)) bad(st, a, 'use trail=quadros,queda[,cor] (ex.: trail=4,0.5)');
        else Ly.trail = { n, decay: Math.min(0.95, Math.max(0.05, d)), c };
      }
      if (A.has('cast')) {
        const a = A.get('cast'), p = parts(a), op = nAt(p, 1, 0.45), b = nAt(p, 2, 6);
        if (!IDENT.test(p[0]) || isNaN(op) || isNaN(b)) bad(st, a, 'use cast=chão[,opacidade[,desfoque]] (chão = nome de uma line)');
        else Ly.castSpec = { line: p[0], opacity: Math.min(1, Math.max(0, op)), blur: Math.max(0, b), a };
      }
      if (A.has('from')) {
        if (!A.has('cast')) bad(st, A.get('from'), 'from= só vale junto com cast=', 'warn');
        else Ly.castFromSpec = { names: A.get('from').text.split(',').filter(Boolean), a: A.get('from') };
      }
      if (A.has('rim')) {
        const a = A.get('rim'), p = parts(a), c = plainColor(st, a, p[0]), w = nAt(p, 1, 4);
        if (isNaN(w)) bad(st, a, 'use rim=cor[,largura]');
        else if (c) Ly.rim = { c, w };
      }
      if (A.has('shade')) Ly.shade = number(st, A.get('shade'), 0.5, 0, 2);
    }

    // luzes
    for (const st of lateStmts.filter((s) => s.cmd !== 'pattern')) {
      const A = st.attrs;
      if (st.cmd === 'ambient') {
        m.ambient = { c: '#ffffff', power: 0.6, line: st.line };
        if (A.has('c')) m.ambient.c = plainColor(st, A.get('c')) || '#ffffff';
        if (A.has('power')) m.ambient.power = number(st, A.get('power'), 0.6, 0, 5);
        info(st);
        continue;
      }
      const name = ident(st, st.pos[0], 'da luz');
      if (!name) continue;
      const tt = st.pos[1];
      const type = tt && FLAGS.light.includes(tt.text) ? tt.text : null;
      if (!type) { err(st.line, 'use: light nome point x,y  |  light nome spot x,y aim= cone=  |  light nome dir dx,dy', tt ? tt.from : st.cmdTok.from, tt ? tt.to : st.cmdTok.to); continue; }
      const Lt = { name, line: st.line, type, x: 0, y: 0, dx: -0.6, dy: -0.8, c: '#ffffff', power: 1, radius: 300, glow: 0, bone: null, flicker: 0, aim: 90, cone: 30 };
      const v = posPair(st, st.pos[2], type === 'dir' ? 'a direção (dx,dy)' : 'a posição', null);
      if (v && type === 'dir') { Lt.dx = v[0]; Lt.dy = v[1]; } else if (v) { Lt.x = v[0]; Lt.y = v[1]; }
      const rec = info(st, { light: Lt });
      if (v && type !== 'dir') rec.handles.push({ kind: 'light', light: name, x: Lt.x, y: Lt.y, from: st.pos[2].from, to: st.pos[2].to, fixed: st.pos[2].text.includes('{') });
      if (A.has('c')) Lt.c = plainColor(st, A.get('c')) || '#ffffff';
      if (A.has('power')) Lt.power = number(st, A.get('power'), 1, 0, 20);
      if (A.has('radius')) Lt.radius = number(st, A.get('radius'), 300, 1, 100000);
      if (A.has('glow')) Lt.glow = number(st, A.get('glow'), 0, 0, 100000);
      if (A.has('flicker')) Lt.flicker = number(st, A.get('flicker'), 0, 0, 1);
      if (A.has('aim')) Lt.aim = number(st, A.get('aim'), 90);
      if (A.has('cone')) Lt.cone = number(st, A.get('cone'), 30, 1, 180);
      Lt.rim = A.has('rim') ? number(st, A.get('rim'), 0, 0, 100) : 0;
      if (A.has('bone')) { const a = A.get('bone'); if (m.bones.has(a.text)) Lt.bone = a.text; else bad(st, a, `osso "${a.text}" não existe`); }
      if (m.lights.has(name)) err(st.line, `luz "${name}" já existe`, st.pos[0].from, st.pos[0].to);
      m.lights.set(name, Lt);
    }

    // ---- passo 2: desenhos, componentes, animações ----
    let cur = null, curAnim = null, base = null, instCount = 0;
    const pendingProps = [];
    const baseLayer = () => {
      if (!base) {
        base = { name: 'base', line: -1, items: [], guide: false, hidden: false, clip: null, cut: null, only: null, opacity: 1, blend: 'source-over', implicit: true };
        m.layers.unshift(base);
        if (!m.layerMap.has('base')) m.layerMap.set('base', base);
      }
      return base;
    };
    const DRY_LAYER = { name: '(def)', items: [], opacity: 1 };

    function addElement(el) {
      el.id = m.elements.length;
      m.elements.push(el);
      if (el.name) { if (!m.named.has(el.name)) m.named.set(el.name, []); m.named.get(el.name).push(el); }
      if (el.inkon && el.ink > 0) {
        el.layer.items.push({ el, part: 'fill' });
        el.inkon.items.push({ el, part: 'ink' });
      } else {
        el.layer.items.push({ el, part: 'all' });
      }
    }

    function buildElement(st, layer, ctx, o) {
      o = o || {};
      const A = st.attrs;
      const flags = new Set();
      let pos = st.pos.filter((t) => { if (DRAW_FLAGS.has(t.text)) { flags.add(t.text); return false; } return true; });
      const el = {
        id: -1, type: st.cmd, line: st.line, name: null, layer, bone: ctx.bone, cloth: ctx.cloth, opacity: ctx.opacity,
        pts: st.pts, closed: CLOSED.has(st.cmd), xf: ctx.xf, inst: ctx.inst, hidden: flags.has('hidden'), ws: 1,
      };
      if (pos[0] && IDENT.test(pos[0].text)) { el.name = pos[0].text; pos = pos.slice(1); }
      el.ws = ctx.xf ? Math.sqrt(Math.abs(M.det(ctx.xf))) : 1;
      const ws = el.ws;
      const prev = m.byLine.get(st.line);
      const real = ctx.inst >= 0;
      const rec = prev && prev.real && prev.el ? { handles: [] } : info(st, { el, xf: ctx.xf, real });
      if (A.has('bone')) { const a = A.get('bone'); if (m.bones.has(a.text)) el.bone = a.text; else bad(st, a, `osso "${a.text}" não existe`); }
      if (A.has('cloth')) { const a = A.get('cloth'); if (m.cloths.has(a.text)) el.cloth = a.text; else bad(st, a, `tecido "${a.text}" não existe`); }
      if (A.has('opacity')) el.opacity *= number(st, A.get('opacity'), 1, 0, 1);
      if (A.has('cut')) { el.cutNames = A.get('cut').text.split(',').filter(Boolean); el.cutAt = { st, a: A.get('cut') }; }
      if (A.has('emit')) {
        const a = A.get('emit'), p = splitTop(a.text, ','), c = plainColor(st, a, p[0]);
        const s = p[1] === undefined ? 1 : num(p[1]);
        if (isNaN(s)) bad(st, a, 'use emit=cor[,força]');
        else if (c) el.emit = { c, s: Math.max(0, Math.min(10, s)) };
      }
      const inkColor = pal('ink', ctx);
      const defInk = typeof inkColor === 'string' ? inkColor : '#14141c';

      if (el.closed) {
        el.ink = (A.has('ink') ? width(st, A.get('ink'), ctx) : 0) * ws;
        el.fill = A.has('c') ? color(st, A.get('c'), ctx) : (el.ink > 0 ? null : defInk);
        el.inkc = A.has('inkc') ? color(st, A.get('inkc'), ctx) : defInk;
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
        else { if (!(pos[1] && pos[1].inherited)) err(st.line, 'use: ellipse nome cx,cy rx,ry (ou um raio só)', pos[1] ? pos[1].from : st.cmdTok.from, pos[1] ? pos[1].to : st.cmdTok.to); el.radius = [10, 10]; }
        el.rot = A.has('rot') ? number(st, A.get('rot'), 0) : 0;
        if (pos[0] && !o.noHandles) rec.handles.push({ kind: 'center', x: el.center[0], y: el.center[1], from: pos[0].from, to: pos[0].to, fixed: pos[0].text.includes('{') });
      } else if (st.cmd === 'rect') {
        el.xy = posPair(st, pos[0], 'o canto', [0, 0]);
        el.size = posPair(st, pos[1], 'o tamanho (largura,altura)', [10, 10]);
        el.r = A.has('r') ? number(st, A.get('r'), 0, 0) : 0;
        el.rot = A.has('rot') ? number(st, A.get('rot'), 0) : 0;
        if (pos[0] && !o.noHandles) rec.handles.push({ kind: 'corner', x: el.xy[0], y: el.xy[1], from: pos[0].from, to: pos[0].to, fixed: pos[0].text.includes('{') });
      } else if (st.cmd === 'text') {
        el.at = posPair(st, pos[0], 'a posição', [0, 0]);
        const s = pos[1];
        if (!s || s.text[0] !== '"') { if (!(s && s.inherited)) err(st.line, 'use: text nome x,y "texto"', s ? s.from : st.cmdTok.from, s ? s.to : st.cmdTok.to); el.str = ''; } else el.str = unq(s.text);
        el.size = A.has('size') ? number(st, A.get('size'), 24, 1, 2000) : 24;
        el.font = A.has('font') ? unq(A.get('font').text) : 'sans-serif';
        el.align = A.has('align') ? A.get('align').text : 'left';
        if (!['left', 'center', 'right'].includes(el.align)) { bad(st, A.get('align'), 'align= aceita left, center ou right', 'warn'); el.align = 'left'; }
        el.rot = A.has('rot') ? number(st, A.get('rot'), 0) : 0;
        el.fill = A.has('c') ? color(st, A.get('c'), ctx) : defInk;
        el.ink = A.has('ink') ? width(st, A.get('ink'), ctx) : 0;
        el.inkc = A.has('inkc') ? color(st, A.get('inkc'), ctx) : defInk;
        el.bold = flags.has('bold');
        el.italic = flags.has('italic');
        el.cloth = null;
        if (pos[0] && !o.noHandles) rec.handles.push({ kind: 'center', x: el.at[0], y: el.at[1], from: pos[0].from, to: pos[0].to, fixed: pos[0].text.includes('{') });
      } else if (st.cmd === 'stroke') {
        el.color = A.has('c') ? color(st, A.get('c'), ctx) : defInk;
        el.w = (A.has('w') ? width(st, A.get('w'), ctx) : 4) * ws;
        el.taper = A.has('taper') ? pair(st, A.get('taper'), [0, 0]).map((v) => Math.min(1, Math.max(0, v))) : [0, 0];
        el.cap = A.has('cap') ? A.get('cap').text : 'round';
        if (!['round', 'butt', 'square'].includes(el.cap)) { bad(st, A.get('cap'), 'cap= aceita round, butt ou square', 'warn'); el.cap = 'round'; }
        el.smooth = A.has('smooth') ? number(st, A.get('smooth'), 1, 0, 2) : 1;
        if (A.has('limb') || A.has('hip') || A.has('foot') || A.has('target')) {
          el.limb = A.has('limb') ? list(st, A.get('limb'), 1, 2, [el.w / ws, el.w / ws]) : [el.w / ws, el.w / ws];
          if (el.limb.length === 1) el.limb = [el.limb[0], el.limb[0]];
          el.limb = el.limb.map((v) => v * ws);
          if (A.has('hip')) {
            const a = A.get('hip');
            el.hip = pair(st, a, [0, 0]);
            if (!o.noHandles) rec.handles.push({ kind: 'hip', x: el.hip[0], y: el.hip[1], from: a.vfrom, to: a.to, fixed: a.text.includes('{') });
          } else { err(st.line, 'membro precisa de hip=x,y (onde ele nasce)', st.cmdTok.from, st.cmdTok.to); el.hip = [0, 0]; }
          if (A.has('on')) { const a = A.get('on'); if (m.bones.has(a.text)) el.on = a.text; else bad(st, a, `osso "${a.text}" não existe`); }
          el.bend = A.has('bend') ? number(st, A.get('bend'), 1, -3, 3) : 1;
          el.footSpec = A.has('foot') ? A.get('foot') : null;
          if (A.has('target')) { const a = A.get('target'); if (m.bones.has(a.text)) el.target = a.text; else bad(st, a, `osso "${a.text}" não existe`); }
          if (!el.footSpec && !el.target && !A.has('target')) err(st.line, 'membro precisa de foot=chão,x, foot=x,y ou target=osso', st.cmdTok.from, st.cmdTok.to);
        } else if (st.pts.length < 2) err(st.line, 'stroke precisa de pelo menos 2 pontos depois do ":"', st.cmdTok.from, st.cmdTok.to);
      } else if (st.cmd === 'emitter') {
        el.at = posPair(st, pos[0], 'a origem', [0, 0]);
        const N = (k, def, min, max) => (A.has(k) ? number(st, A.get(k), def, min, max) : def);
        el.rate = N('rate', 20, 0, 2000);
        el.burst = Math.round(N('burst', 0, 0, 5000));
        el.life = N('life', 1, 0.02, 60);
        el.speed = N('speed', 80, 0, 100000);
        el.angle = N('angle', -90);
        el.spread = N('spread', 40, 0, 360);
        el.gravity = N('gravity', 0);
        el.wind = N('wind', 0);
        el.drag = N('drag', 0, 0, 100);
        el.seed = N('seed', 1);
        const sz = A.has('size') ? list(st, A.get('size'), 1, 2, [4]) : [4];
        el.size = [sz[0] * ws, (sz.length > 1 ? sz[1] : sz[0]) * ws];
        const ar = A.has('area') ? list(st, A.get('area'), 1, 2, [0]) : [0];
        el.area = [ar[0], ar.length > 1 ? ar[1] : ar[0]];
        el.pshape = A.has('shape') ? A.get('shape').text : 'dot';
        if (!PARTICLE_SHAPES.includes(el.pshape)) { bad(st, A.get('shape'), `shape= aceita ${PARTICLE_SHAPES.join(', ')}`, 'warn'); el.pshape = 'dot'; }
        el.colors = [defInk, defInk];
        if (A.has('c')) {
          const a = A.get('c'), p = splitTop(a.text, ',');
          const c0 = plainColor(st, a, p[0]) || defInk;
          el.colors = [c0, p[1] ? plainColor(st, a, p[1]) || c0 : c0];
        }
        if (el.rate <= 0 && el.burst <= 0) err(st.line, 'o emissor precisa de rate= ou burst=', st.cmdTok.from, st.cmdTok.to, 'warn');
        if (pos[0] && !o.noHandles) rec.handles.push({ kind: 'center', x: el.at[0], y: el.at[1], from: pos[0].from, to: pos[0].to, fixed: pos[0].text.includes('{') });
      } else if (st.cmd === 'line') {
        el.color = A.has('c') ? color(st, A.get('c'), ctx) : defInk;
        el.w = (A.has('w') ? width(st, A.get('w'), ctx) : 1) * ws;
        el.dash = A.has('dash') ? list(st, A.get('dash'), 1, 8, null) : null;
        if (el.dash) el.dash = el.dash.map((v) => v * ws);
        if (st.pts.length < 2) err(st.line, 'line precisa de pelo menos 2 pontos depois do ":"', st.cmdTok.from, st.cmdTok.to);
      }
      if (!o.noHandles) {
        st.pts.forEach((p, i) => {
          rec.handles.push({ kind: 'pt', idx: i, x: p.x, y: p.y, corner: p.corner, tan: p.tan, from: p.from, to: p.tan ? p.tanFrom - 1 : p.to, fixed: p.fixed });
          if (p.tan) rec.handles.push({ kind: 'tan', idx: i, x: p.x + p.tan[0], y: p.y + p.tan[1], px: p.x, py: p.y, from: p.tanFrom, to: p.to, fixed: p.fixed });
        });
      }
      const loose = pos.filter((t) => !t.inherited);
      if (loose.length && !['ellipse', 'rect', 'text', 'emitter'].includes(st.cmd)) err(st.line, `valor solto "${loose[0].text}" (atributos usam nome=valor)`, loose[0].from, loose[0].to, 'warn');
      return el;
    }

    // Parâmetro de componente (no def ou no use): número vira variável e espessura; o resto, cor.
    function applyParam(st, a, ctx, parent) {
      if (!IDENT.test(a.key)) { bad(st, a, `nome de parâmetro inválido "${a.key}"`); return; }
      const n = num(a.text);
      if (!isNaN(n)) { ctx.vars.set(a.key, n); ctx.over.set(a.key, n); return; }
      const c = color(st, a, parent);
      if (c !== null || a.text === 'none') ctx.over.set(a.key, c);
    }

    function instantiate(def, layer, ctx, depth, dry) {
      const saved = scope;
      for (const bst of def.body) {
        scope = ctx.vars;
        const st = readStatement(L[bst.line].text, bst.line, err);
        if (!st) continue;
        st.inDef = def;
        if (st.cmd === 'use') buildUse(st, layer, ctx, depth + 1, dry);
        else if (st.attrs.has('mirror')) buildMirror(st, layer, ctx, dry);
        else {
          checkAttrs(st);
          const el = buildElement(st, layer, ctx);
          if (!dry) addElement(el);
        }
      }
      scope = saved;
    }

    function buildUse(st, layer, parent, depth, dry) {
      const saved = scope;
      scope = parent.vars;
      const defTok = st.pos[0];
      const def = defTok && defs.get(defTok.text);
      if (!def) { err(st.line, defTok ? `componente "${defTok.text}" não existe` : 'use: use componente x,y', defTok ? defTok.from : st.cmdTok.from, defTok ? defTok.to : st.cmdTok.to); scope = saved; return; }
      if (depth > 8) { err(st.line, 'componentes demais um dentro do outro (algum use em ciclo?)', st.cmdTok.from, st.cmdTok.to); scope = saved; return; }
      if (!dry) def.uses++;
      const at = st.pos[1] ? posPair(st, st.pos[1], 'a posição', [0, 0]) : [0, 0];
      for (const f of st.pos.slice(2)) err(st.line, `valor solto "${f.text}"`, f.from, f.to, 'warn');
      const A = st.attrs;
      let sx = 1, sy = 1, fx = 1, fy = 1;
      if (A.has('scale')) { const v = list(st, A.get('scale'), 1, 2, [1]); sx = v[0]; sy = v.length > 1 ? v[1] : v[0]; }
      const rot = A.has('rot') ? number(st, A.get('rot'), 0) : 0;
      if (A.has('flip')) {
        const f = A.get('flip').text;
        if (f === 'x') fx = -1;
        else if (f === 'y') fy = -1;
        else if (f === 'xy') { fx = -1; fy = -1; } else bad(st, A.get('flip'), 'flip= aceita x, y ou xy');
      }
      const local = M.mul(M.translate(at[0], at[1]), M.mul(M.rotate(rot), M.scale(sx * fx, sy * fy)));
      const ctx = {
        xf: parent.xf ? M.mul(parent.xf, local) : local,
        over: new Map(parent.over || []), vars: new Map(parent.vars),
        bone: parent.bone, cloth: parent.cloth, opacity: parent.opacity, inst: dry ? -1 : ++instCount,
      };
      if (A.has('bone')) { const a = A.get('bone'); if (m.bones.has(a.text)) ctx.bone = a.text; else bad(st, a, `osso "${a.text}" não existe`); }
      if (A.has('cloth')) { const a = A.get('cloth'); if (m.cloths.has(a.text)) ctx.cloth = a.text; else bad(st, a, `tecido "${a.text}" não existe`); }
      if (A.has('opacity')) ctx.opacity *= number(st, A.get('opacity'), 1, 0, 1);
      for (const a of def.st.attrs.values()) applyParam(def.st, a, ctx, parent);
      scope = parent.vars;
      for (const a of A.values()) if (!ATTRS.use.includes(a.key)) applyParam(st, a, ctx, parent);
      const prev = m.byLine.get(st.line);
      if (!dry && !(prev && prev.real)) {
        const rec = info(st, { use: def.name, xf: parent.xf, real: true });
        if (st.pos[1]) rec.handles.push({ kind: 'pos', x: at[0], y: at[1], from: st.pos[1].from, to: st.pos[1].to, fixed: st.pos[1].text.includes('{') });
      }
      instantiate(def, layer, ctx, depth, dry);
      scope = saved;
    }

    // mirror=fonte@eixo: copia outra forma refletida (@400 = linha vertical x=400; @y300 = horizontal).
    function buildMirror(st, layer, ctx, dry) {
      const a = st.attrs.get('mirror');
      const at = a.text.indexOf('@');
      const srcName = at >= 0 ? a.text.slice(0, at) : a.text, axis = at >= 0 ? a.text.slice(at + 1) : '';
      const pool = st.inDef ? st.inDef.body : top;
      const src = pool.find((s) => s.line !== st.line && DRAWABLE.has(s.cmd) && s.pos[0] && s.pos[0].text === srcName && !s.attrs.has('mirror'));
      if (!src) { bad(st, a, `não achei a forma "${srcName}" para espelhar${st.inDef ? ' dentro deste def' : ''}`); return; }
      if (src.cmd !== st.cmd) { bad(st, a, `um ${st.cmd} não pode espelhar um ${src.cmd}`); return; }
      let R;
      if (!axis) R = [-1, 0, 0, 1, m.canvas.w, 0];
      else {
        const horiz = /^y/i.test(axis);
        const v = num(axis.replace(/^[xy]/i, ''));
        if (isNaN(v)) { bad(st, a, 'use mirror=nome@x (linha vertical em x) ou mirror=nome@y300 (horizontal)'); return; }
        R = horiz ? [1, 0, 0, -1, 0, 2 * v] : [-1, 0, 0, 1, 2 * v, 0];
      }
      const saved = scope;
      scope = ctx.vars;
      const srcSt = readStatement(L[src.line].text, src.line, () => {});
      scope = saved;
      if (!srcSt) return;
      const attrs = new Map();
      for (const [k, v] of srcSt.attrs) attrs.set(k, Object.assign({}, v, { inherited: true }));
      for (const [k, v] of st.attrs) if (k !== 'mirror') attrs.set(k, v);
      const ownName = st.pos[0] && IDENT.test(st.pos[0].text) && !DRAW_FLAGS.has(st.pos[0].text) ? st.pos[0] : null;
      const srcPos = srcSt.pos.slice(srcSt.pos[0] && IDENT.test(srcSt.pos[0].text) && !DRAW_FLAGS.has(srcSt.pos[0].text) ? 1 : 0)
        .filter((t) => !DRAW_FLAGS.has(t.text)).map((t) => Object.assign({}, t, { inherited: true }));
      const ownFlags = st.pos.filter((t) => DRAW_FLAGS.has(t.text));
      if (st.pts.length) err(st.line, 'mirror= copia os pontos da outra forma; os pontos desta linha são ignorados', st.pts[0].from, st.pts[0].to, 'warn');
      const spec = { cmd: src.cmd, line: st.line, cmdTok: st.cmdTok, pos: [...(ownName ? [ownName] : []), ...srcPos, ...ownFlags], attrs, pts: srcSt.pts, raw: srcSt.raw };
      checkAttrs(st);
      const wasQuiet = quiet;
      quiet = true;
      const el = buildElement(spec, layer, Object.assign({}, ctx, { xf: ctx.xf ? M.mul(ctx.xf, R) : R }), { noHandles: true });
      quiet = wasQuiet;
      el.mirrorOf = srcName;
      if (!dry) addElement(el);
    }

    // Componentes são conferidos uma vez mesmo sem nenhum use (erros aparecem no def).
    for (const def of defs.values()) {
      const ctx = { xf: null, over: new Map(), vars: new Map(globals), bone: null, cloth: null, opacity: 1, inst: -1 };
      for (const a of def.st.attrs.values()) applyParam(def.st, a, ctx, ROOT);
      instantiate(def, DRY_LAYER, ctx, 0, true);
    }

    for (const st of top) {
      const A = st.attrs;
      if (st.cmd === 'layer') { if (st.layer) cur = st.layer; continue; }
      if (st.cmd === 'anim') {
        const name = ident(st, st.pos[0], 'da animação');
        if (!name) { curAnim = null; continue; }
        if (m.animMap.has(name)) { err(st.line, `animação "${name}" já existe`, st.pos[0].from, st.pos[0].to); curAnim = null; continue; }
        const an = { name, line: st.line, frames: 24, fps: 12, loop: true, tracks: new Map(), ptracks: new Map(), events: [] };
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
      if (st.cmd === 'key' || st.cmd === 'event') {
        if (!curAnim) { err(st.line, `${st.cmd} precisa vir depois de um anim`, st.cmdTok.from, st.cmdTok.to); continue; }
        const ft = st.pos[0];
        let frame = ft ? num(ft.text) : NaN;
        if (isNaN(frame) || frame < 0) { err(st.line, st.cmd === 'key' ? 'use: key quadro osso=dx,dy,rot,sx,sy  forma.propriedade=valor' : 'use: event quadro nome', ft ? ft.from : st.cmdTok.from, ft ? ft.to : st.cmdTok.to); continue; }
        frame = Math.round(frame);
        if (frame > curAnim.frames) { err(st.line, `quadro ${frame} passa do fim (frames=${curAnim.frames})`, ft.from, ft.to, 'warn'); frame = curAnim.frames; }
        if (st.cmd === 'event') {
          const names = st.pos.slice(1).map((t) => unq(t.text));
          if (!names.length) err(st.line, 'falta o nome do evento (ex.: event 6 passo)', st.cmdTok.from, st.cmdTok.to);
          for (const n of names) curAnim.events.push({ frame: frame % curAnim.frames, name: n, line: st.line });
          info(st, { anim: curAnim, frame });
          continue;
        }
        let ease = 'smooth';
        if (A.has('ease')) {
          const a = A.get('ease');
          if (W.geom.EASE[a.text]) ease = a.text;
          else bad(st, a, `ease desconhecido "${a.text}" (use ${Object.keys(W.geom.EASE).join(', ')})`);
        }
        for (const a of A.values()) {
          if (a.key === 'ease') continue;
          if (a.key.includes('.')) { pendingProps.push({ anim: curAnim, frame, ease, a, st }); continue; }
          if (!m.bones.has(a.key)) { bad(st, a, `osso "${a.key}" não existe (para formas use nome.propriedade=valor)`); continue; }
          const v = list(st, a, 1, 5, null);
          if (!v) continue;
          const full = [0, 0, 0, 1, 1];
          v.forEach((x, i) => { full[i] = x; });
          if (v.length === 4) full[4] = v[3];
          upsertKey(curAnim.tracks, a.key, { frame, v: full, ease });
        }
        info(st, { anim: curAnim, frame });
        continue;
      }
      if (st.cmd === 'use') { buildUse(st, cur || baseLayer(), ROOT, 0, false); continue; }
      if (!DRAWABLE.has(st.cmd)) continue;
      const layer = cur || baseLayer();
      if (A.has('mirror')) buildMirror(st, layer, ROOT, false);
      else addElement(buildElement(st, layer, ROOT));
    }

    function upsertKey(map, name, k) {
      if (!map.has(name)) map.set(name, []);
      const tr = map.get(name);
      const same = tr.findIndex((x) => x.frame === k.frame);
      if (same >= 0) tr[same] = k; else tr.push(k);
    }

    // forma com esse nome, de preferência da mesma instância de componente
    function findNamed(name, inst) {
      const list = m.named.get(name);
      if (!list) return null;
      return list.find((e) => e.inst === inst) || list[0];
    }

    // ---- passo 3: referências que dependem de tudo já lido ----
    for (const Ly of m.layers) {
      const st = top.find((s) => s.layer === Ly);
      for (const k of ['clip', 'cut']) {
        if (Ly[k] && !m.named.has(Ly[k]) && !m.layerMap.has(Ly[k])) {
          if (st) bad(st, st.attrs.get(k), `${k}: "${Ly[k]}" não é forma nem camada`);
          Ly[k] = null;
        }
      }
      if (Ly.only && st) {
        for (const n of Ly.only) {
          if (n === 'pose' || m.animMap.has(n) || top.some((s) => s.cmd === 'shot' && s.pos[0] && s.pos[0].text === n)) continue;
          bad(st, st.attrs.get('only'), `animação "${n}" não existe`, 'warn');
        }
      }
      if (Ly.castSpec) {
        const g = (m.named.get(Ly.castSpec.line) || []).find((e) => e.type === 'line' && e.pts.length >= 2);
        if (!g) bad(st, Ly.castSpec.a, `cast: não achei a line "${Ly.castSpec.line}" (o chão onde a sombra cai)`);
        else Ly.cast = { ground: g, opacity: Ly.castSpec.opacity, blur: Ly.castSpec.blur, from: null };
        if (Ly.cast && Ly.castFromSpec) {
          Ly.cast.from = [];
          for (const n of Ly.castFromSpec.names) {
            const src = m.layerMap.get(n);
            if (!src) bad(st, Ly.castFromSpec.a, `from: camada "${n}" não existe`);
            else if (src !== Ly) Ly.cast.from.push(src);
          }
        }
      }
    }
    for (const el of m.elements) {
      if (el.cutNames) {
        el.cuts = [];
        for (const n of el.cutNames) {
          const c = findNamed(n, el.inst);
          if (!c) bad(el.cutAt.st, el.cutAt.a, `cut: forma "${n}" não existe`);
          else if (!c.closed) bad(el.cutAt.st, el.cutAt.a, `cut: "${n}" precisa ser uma forma fechada`);
          else if (c !== el) el.cuts.push(c);
        }
        if (!el.cuts.length) el.cuts = null;
      }
      if (!el.limb) continue;
      const xf = el.xf;
      const T = (x, y) => (xf ? M.apply(xf, x, y) : [x, y]);
      const hipLocal = el.hip;
      el.hip = T(hipLocal[0], hipLocal[1]);
      el.foot = [el.hip[0], el.hip[1] + 40];
      if (xf && M.det(xf) < 0) el.bend = -el.bend;
      const a = el.footSpec;
      const st = { line: el.line, cmdTok: { from: 0, to: 0 } };
      if (el.target) {
        const b = m.bones.get(el.target);
        el.foot = b.pivot.slice();
      } else if (a) {
        const parts = a.text.split(',');
        if (parts.length === 2 && IDENT.test(parts[0]) && !isNaN(num(parts[1]))) {
          const g = (m.named.get(parts[0]) || []).find((e) => e.pts && e.pts.length >= 2);
          if (!g) bad(st, a, `não achei a linha "${parts[0]}" para apoiar o pé`);
          else {
            const wx = T(num(parts[1]), hipLocal[1])[0];
            el.foot = [wx, yOnLine(g.pts.map((p) => { const q = g.xf ? M.apply(g.xf, p.x, p.y) : [p.x, p.y]; return { x: q[0], y: q[1] }; }), wx)];
          }
        } else {
          const v = nums(a.text);
          if (v.length === 2 && !v.some(isNaN)) el.foot = T(v[0], v[1]);
          else bad(st, a, 'use foot=chão,x (nome de uma line) ou foot=x,y');
        }
      }
      el.xf = null;
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
    for (const b of m.bones.values()) {
      if (!b.spring) continue;
      const pts = [];
      for (const el of m.elements) if (el.bone === b.name) for (const p of restPoints(el)) pts.push(p);
      if (pts.length) {
        let sx = 0, sy = 0;
        for (const p of pts) { sx += p[0]; sy += p[1]; }
        b.tip = [sx / pts.length, sy / pts.length];
      }
      if (!b.tip || Math.hypot(b.tip[0] - b.pivot[0], b.tip[1] - b.pivot[1]) < 2) b.tip = [b.pivot[0], b.pivot[1] + 30];
    }

    // variante com show= e hide=: peças (formas ou camadas) que aparecem ou somem nessa versão
    for (const v of variantStmts) {
      for (const k of ['show', 'hide']) {
        const a = v.st.attrs.get(k);
        if (!a) continue;
        for (const n of a.text.split(',').filter(Boolean)) {
          const ly = m.layerMap.get(n), els = m.named.get(n);
          if (!ly && !els) { bad(v.st, a, `${k}: "${n}" não é forma nem camada`, 'warn'); continue; }
          if (v.name !== opts.variant) continue;
          if (ly) ly.hidden = k === 'hide';
          if (els) for (const e of els) e.hidden = k === 'hide';
        }
      }
    }

    // ---- jogo: caixas de colisão, godot, tileset e tile ----
    for (const st of top) {
      const A = st.attrs;
      if (st.cmd === 'box') readBox(st, A);
      else if (st.cmd === 'point') readPoint(st, A);
      else if (st.cmd === 'mouth') readMouth(st, A);
      else if (st.cmd === 'godot') {
        const g = { body: 'character', root: null, normal: 1, name: null, rig: 'frames', line: st.line };
        const rec = info(st);
        if (A.has('body')) { const a = A.get('body'); if (GODOT_BODIES.includes(a.text)) g.body = a.text; else bad(st, a, `body= aceita ${GODOT_BODIES.join(', ')}`); }
        if (A.has('root')) {
          const a = A.get('root');
          g.root = pair(st, a, null);
          if (g.root) rec.handles.push({ kind: 'root', x: g.root[0], y: g.root[1], from: a.vfrom, to: a.to, fixed: a.text.includes('{') });
        }
        if (A.has('normal')) g.normal = number(st, A.get('normal'), 1, 0, 10);
        // rig=bones: a cena sai com esqueleto de verdade (Bone2D); rig=frames (padrão): quadros prontos
        if (A.has('rig')) { const a = A.get('rig'); if (a.text === 'bones' || a.text === 'frames') g.rig = a.text; else bad(st, a, 'rig= aceita frames (quadros prontos) ou bones (esqueleto de verdade)'); }
        if (A.has('name')) {
          const a = A.get('name'), v = unq(a.text);
          if (/^[A-Za-z_]\w*$/.test(v)) g.name = v; else bad(st, a, 'name= precisa ser um nome simples (letras, números e _)');
        }
        for (const f of st.pos) err(st.line, `valor solto "${f.text}"`, f.from, f.to, 'warn');
        if (m.godot) err(st.line, 'godot repetido (vale o último)', st.cmdTok.from, st.cmdTok.to, 'warn');
        m.godot = g;
      } else if (st.cmd === 'tileset') {
        if (m.tileset) { err(st.line, 'tileset repetido (só um por arquivo)', st.cmdTok.from, st.cmdTok.to); continue; }
        const T = { size: [32, 32], auto: false, tiles: [], line: st.line, cols: 0, rows: 0 };
        if (A.has('size')) { const v = list(st, A.get('size'), 1, 2, [32]); T.size = [Math.max(2, Math.round(v[0])), Math.max(2, Math.round(v.length > 1 ? v[1] : v[0]))]; }
        for (const f of st.pos) { if (f.text === 'auto') T.auto = true; else err(st.line, `opção desconhecida "${f.text}" (use auto)`, f.from, f.to, 'warn'); }
        T.cols = Math.floor(m.canvas.w / T.size[0]);
        T.rows = Math.floor(m.canvas.h / T.size[1]);
        if (!T.cols || !T.rows) err(st.line, `o canvas (${m.canvas.w}×${m.canvas.h}) é menor que um bloco`, st.cmdTok.from, st.cmdTok.to);
        info(st, { tileset: T });
        m.tileset = T;
      }
    }
    for (const st of top) if (st.cmd === 'tile') readTile(st, st.attrs);

    // mouth boca A=fechada B=aberta@0.4 C=aberta@0.7 D=aberta … : as bocas do lip sync, por morph da forma
    // (as formas precisam ter o mesmo tipo e o mesmo número de pontos que a boca; @ é o quanto do morph)
    function readMouth(st, A) {
      const name = ident(st, st.pos[0], 'da boca (a forma que mexe)');
      if (!name) return;
      const els = m.named.get(name);
      if (!els) { err(st.line, `forma "${name}" não existe`, st.pos[0].from, st.pos[0].to); return; }
      if (m.mouth) err(st.line, 'mouth repetido (vale o último)', st.cmdTok.from, st.cmdTok.to, 'warn');
      const mo = { name, line: st.line, map: {} };
      for (const a of A.values()) {
        if (!VISEMES.includes(a.key)) continue;
        const at = a.text.lastIndexOf('@');
        const shape = at > 0 ? a.text.slice(0, at) : a.text, t = at > 0 ? num(a.text.slice(at + 1)) : 1;
        const target = (m.named.get(shape) || [])[0];
        if (!target) bad(st, a, `forma "${shape}" não existe`);
        else if (!compatible(els[0], target)) bad(st, a, `"${shape}" não combina com "${name}": precisa ser do mesmo tipo e ter o mesmo número de pontos`);
        else if (isNaN(t) || t < 0 || t > 1) bad(st, a, 'use forma@0.5 (o quanto do morph, de 0 a 1)');
        else mo.map[a.key] = { shape, t };
      }
      for (const f of st.pos.slice(1)) err(st.line, `valor solto "${f.text}" (use A=forma, C=forma@0.7 …)`, f.from, f.to, 'warn');
      if (!Object.keys(mo.map).length) err(st.line, 'use: mouth boca A=fechada C=aberta@0.7 D=aberta (as bocas A a H e X)', st.cmdTok.from, st.cmdTok.to);
      info(st, { mouth: mo });
      m.mouth = mo;
    }

    // box nome hit rect x,y l,a  |  circle cx,cy r  |  capsule cx,cy l,a   [off] bone= only=
    function readBox(st, A) {
      const name = ident(st, st.pos[0], 'da caixa');
      if (!name) return;
      if (m.boxes.has(name)) { err(st.line, `caixa "${name}" já existe`, st.pos[0].from, st.pos[0].to); return; }
      if (m.points.has(name)) { err(st.line, `"${name}" já é o nome de um ponto`, st.pos[0].from, st.pos[0].to); return; }
      const b = { name, line: st.line, kind: 'body', shape: 'rect', x: 0, y: 0, w: 10, h: 10, r: 5, bone: null, only: null, on: true };
      const vals = [];
      for (const t of st.pos.slice(1)) {
        if (BOX_KINDS.includes(t.text)) b.kind = t.text;
        else if (BOX_SHAPES.includes(t.text)) b.shape = t.text;
        else if (t.text === 'off') b.on = false;
        else vals.push(t);
      }
      const rec = info(st, { box: b });
      const usage = { rect: 'box nome body|hit|hurt rect x,y largura,altura', circle: 'box nome body|hit|hurt circle cx,cy raio', capsule: 'box nome body|hit|hurt capsule cx,cy largura,altura' }[b.shape];
      const where = (t) => (t ? [t.from, t.to] : [st.cmdTok.from, st.cmdTok.to]);
      const p = vals[0] ? nums(vals[0].text) : [];
      if (p.length !== 2 || p.some(isNaN)) { err(st.line, `use: ${usage}`, ...where(vals[0])); return; }
      const q = vals[1] ? nums(vals[1].text) : [];
      if (q.length !== (b.shape === 'circle' ? 1 : 2) || q.some((v) => isNaN(v) || v <= 0)) { err(st.line, `use: ${usage}`, ...where(vals[1])); return; }
      for (const t of vals.slice(2)) err(st.line, `valor solto "${t.text}"`, t.from, t.to, 'warn');
      b.x = p[0];
      b.y = p[1];
      if (b.shape === 'circle') b.r = q[0]; else { b.w = q[0]; b.h = q[1]; }
      if (A.has('bone')) { const a = A.get('bone'); if (m.bones.has(a.text)) b.bone = a.text; else bad(st, a, `osso "${a.text}" não existe`); }
      if (A.has('only')) {
        const a = A.get('only');
        b.only = a.text.split(',').filter(Boolean);
        for (const n of b.only) if (n !== 'pose' && !m.animMap.has(n)) bad(st, a, `animação "${n}" não existe`, 'warn');
      }
      rec.handles.push({ kind: 'box', box: name, bone: b.bone, x: b.x, y: b.y, from: vals[0].from, to: vals[0].to, fixed: vals[0].text.includes('{') });
      if (m.named.has(name)) err(st.line, `"${name}" também é o nome de uma forma; nas keys, vale a caixa`, st.pos[0].from, st.pos[0].to, 'warn');
      m.boxes.set(name, b);
    }

    // point nome x,y bone=osso: ponto de encaixe que segue o osso (de onde sai o tiro, onde a mão segura,
    // onde nasce a poeira do passo); vai quadro a quadro para o Godot (Marker2D) e para o JSON da sprite sheet
    function readPoint(st, A) {
      const name = ident(st, st.pos[0], 'do ponto');
      if (!name) return;
      if (m.points.has(name)) { err(st.line, `ponto "${name}" já existe`, st.pos[0].from, st.pos[0].to); return; }
      if (m.boxes.has(name)) { err(st.line, `"${name}" já é o nome de uma caixa`, st.pos[0].from, st.pos[0].to); return; }
      const t = st.pos[1];
      const v = posPair(st, t, 'a posição do ponto', null);
      if (!v) return;
      for (const f of st.pos.slice(2)) err(st.line, `valor solto "${f.text}"`, f.from, f.to, 'warn');
      const p = { name, line: st.line, x: v[0], y: v[1], bone: null };
      if (A.has('bone')) { const a = A.get('bone'); if (m.bones.has(a.text)) p.bone = a.text; else bad(st, a, `osso "${a.text}" não existe`); }
      const rec = info(st, { point: p });
      rec.handles.push({ kind: 'point', point: name, bone: p.bone, x: p.x, y: p.y, from: t.from, to: t.to, fixed: t.text.includes('{') });
      m.points.set(name, p);
    }

    // tile nome coluna,linha [solid] [oneway] collision=forma
    function readTile(st, A) {
      const T = m.tileset;
      if (!T) { err(st.line, 'tile precisa de um tileset antes (ex.: tileset size=32)', st.cmdTok.from, st.cmdTok.to); return; }
      const name = ident(st, st.pos[0], 'do bloco');
      if (!name) return;
      const t = { name, col: 0, row: 0, solid: false, oneway: false, collision: null, line: st.line };
      let cell = null;
      for (const f of st.pos.slice(1)) {
        if (f.text === 'solid') t.solid = true;
        else if (f.text === 'oneway') t.oneway = true;
        else if (!cell) cell = f;
        else err(st.line, `valor solto "${f.text}"`, f.from, f.to, 'warn');
      }
      const v = cell ? nums(cell.text) : [];
      if (v.length !== 2 || v.some((x) => isNaN(x) || x < 0 || x % 1)) { err(st.line, 'use: tile nome coluna,linha [solid] [oneway] collision=forma', cell ? cell.from : st.cmdTok.from, cell ? cell.to : st.cmdTok.to); return; }
      t.col = v[0];
      t.row = v[1];
      if (t.col >= T.cols || t.row >= T.rows) { err(st.line, `fora do tileset (colunas 0 a ${T.cols - 1}, linhas 0 a ${T.rows - 1})`, cell.from, cell.to); return; }
      const same = T.tiles.find((o) => o.col === t.col && o.row === t.row);
      if (same) { err(st.line, `a célula ${t.col},${t.row} já é do bloco "${same.name}"`, cell.from, cell.to); return; }
      if (T.tiles.some((o) => o.name === name)) { err(st.line, `bloco "${name}" já existe`, st.pos[0].from, st.pos[0].to); return; }
      if (A.has('collision')) {
        const a = A.get('collision'), el = (m.named.get(a.text) || [])[0];
        if (!el) bad(st, a, `forma "${a.text}" não existe`);
        else if (!el.closed) bad(st, a, `"${a.text}" precisa ser uma forma fechada (shape, rect ou ellipse)`);
        else t.collision = el;
      }
      if (t.collision && t.solid) err(st.line, 'solid e collision= juntos: vale o formato de collision=', st.cmdTok.from, st.cmdTok.to, 'warn');
      if (t.oneway && !t.collision) t.solid = true;
      info(st, { tile: t, tileset: T });
      T.tiles.push(t);
    }

    // propriedades animadas: forma.opacity / forma.c / forma.shape / camada.show ...
    for (const p of pendingProps) {
      const { anim, frame, ease, a, st } = p;
      const dot = a.key.lastIndexOf('.');
      const name = a.key.slice(0, dot), prop = a.key.slice(dot + 1);
      // quem é o alvo: forma, luz ou camada — o primeiro que tiver essa propriedade
      const cands = [
        m.boxes.has(name) && { kind: 'box', table: BOX_PROPS, targets: null },
        m.named.has(name) && { kind: 'el', table: PROPS, targets: m.named.get(name) },
        m.lights.has(name) && { kind: 'light', table: LIGHT_PROPS, targets: null },
        m.layerMap.has(name) && { kind: 'layer', table: LAYER_PROPS, targets: null },
      ].filter(Boolean);
      if (!cands.length) { bad(st, a, `"${name}" não é forma, caixa, luz nem camada`); continue; }
      const tgt = cands.find((c) => c.table[prop]);
      if (!tgt) { bad(st, a, `"${prop}" não anima aqui (${cands.map((c) => `${{ el: 'forma', light: 'luz', layer: 'camada', box: 'caixa' }[c.kind]}: ${Object.keys(c.table).join(', ')}`).join(' · ')})`); continue; }
      const els = tgt.kind === 'el' ? tgt.targets : null;
      const type = tgt.table[prop];
      let v;
      if (type === 'num') v = number(st, a, 1, 0, 1);
      else if (type === 'free') v = number(st, a, 0);
      else if (type === 'step') {
        const t = a.text.toLowerCase();
        v = ['1', 'on', 'true', 'sim'].includes(t) ? 1 : ['0', 'off', 'false', 'nao', 'não'].includes(t) ? 0 : null;
        if (v === null) { bad(st, a, 'show= aceita 1 ou 0'); continue; }
      } else if (type === 'color') v = tgt.kind === 'light' ? plainColor(st, a) : color(st, a, ROOT);
      else if (type === 'width') v = width(st, a, ROOT);
      else if (type === 'order') {
        v = orderOf(st, a, tgt.kind, name, els, prop);
        if (v === undefined) continue;
      } else {
        const t = m.named.get(a.text);
        if (!t) { bad(st, a, `forma "${a.text}" não existe`); continue; }
        if (!els.every((e) => compatible(e, t[0]))) { bad(st, a, `"${a.text}" não combina com "${name}": precisa ser do mesmo tipo e ter o mesmo número de pontos`); continue; }
        v = a.text;
      }
      if (tgt.kind === 'light' && type === 'color' && !v) continue;
      // above= e below= são a mesma trilha (a ordem): a key seguinte pode trocar uma pela outra
      const tkey = type === 'order' ? `${name}.order` : a.key;
      if (!anim.ptracks.has(tkey)) anim.ptracks.set(tkey, { name, prop: type === 'order' ? 'order' : prop, kind: tgt.kind, type, keys: [], targets: els });
      const tr = anim.ptracks.get(tkey);
      const k = { frame, v, ease };
      const same = tr.keys.findIndex((x) => x.frame === frame);
      if (same >= 0) tr.keys[same] = k; else tr.keys.push(k);
    }
    // key forma.above=outra / below=outra (ou camada.above=outra_camada); none volta para a ordem do arquivo
    function orderOf(st, a, kind, name, els, rel) {
      const t = a.text;
      if (t === 'none') return null;
      if (t === name) { bad(st, a, `${rel}= precisa de outra ${kind === 'layer' ? 'camada' : 'forma'}`); return undefined; }
      if (kind === 'layer') {
        if (!m.layerMap.has(t)) { bad(st, a, `camada "${t}" não existe`); return undefined; }
        return { rel, target: t };
      }
      const others = m.named.get(t);
      if (!others) { bad(st, a, `forma "${t}" não existe`); return undefined; }
      if (!els.every((e) => others.some((o) => o.layer === e.layer))) { bad(st, a, `"${t}" não está na mesma camada que "${name}" (para trocar camadas inteiras, use os nomes das camadas)`); return undefined; }
      return { rel, target: t };
    }
    for (const an of m.anims) {
      for (const tr of an.tracks.values()) tr.sort((p, q) => p.frame - q.frame);
      for (const tr of an.ptracks.values()) tr.keys.sort((p, q) => p.frame - q.frame);
      an.events.sort((p, q) => p.frame - q.frame);
    }

    // ---- filme: planos (shot), atores, câmera e o que muda com o tempo (at) ----
    const filmSts = top.filter((s) => s.cmd === 'film');
    const subCache = new Map();
    const round3 = (v) => Math.round(v * 1000) / 1000;
    if (filmSts.length) readFilm(filmSts[0]);
    else for (const st of top) if (FILM_CMDS.has(st.cmd)) err(st.line, `${st.cmd} só vale num filme (comece o arquivo com: film fps=24)`, st.cmdTok.from, st.cmdTok.to);

    // tempo: 2s, 1.5, 500ms, 48f (quadros do filme), 1m30s; com + na frente, conta a partir do at anterior
    function timeOf(st, tok, fps, what) {
      if (!tok) { err(st.line, `falta ${what}`, st.cmdTok.from, st.cmdTok.to); return null; }
      const a = tok.key ? tok : null;
      let t = a ? a.text : tok.text, rel = false;
      if (t[0] === '+') { rel = true; t = t.slice(1); }
      let v;
      const mm = /^(\d+(?:\.\d+)?)m(?:(\d+(?:\.\d+)?)s?)?$/.exec(t);
      if (/ms$/.test(t)) v = num(t.slice(0, -2)) / 1000;
      else if (mm) v = parseFloat(mm[1]) * 60 + (mm[2] ? parseFloat(mm[2]) : 0);
      else if (/f$/.test(t)) v = num(t.slice(0, -1)) / fps;
      else if (/s$/.test(t)) v = num(t.slice(0, -1));
      else v = num(t);
      if (isNaN(v) || v < 0) {
        err(st.line, `tempo inválido "${t}" (use 2s, 1.5s, 48f, 1m30s${a ? '' : ' ou +1s'})`, a ? a.vfrom : tok.from, tok.to);
        return null;
      }
      return { v, rel };
    }

    // Arquivo usado como ator (ou cena): lido como um desenho à parte, com o próprio canvas e ossos.
    function loadSub(st, tok, file, variant, asFilm) {
      const key = `${file}\n${variant || ''}\n${asFilm ? 'cena' : 'ator'}`;
      if (subCache.has(key)) return subCache.get(key);
      let res = null;
      const chain = opts.chain || [X.mainFile];
      if (!opts.resolve) err(st.line, 'aqui não dá para abrir outros arquivos', tok.from, tok.to);
      else if (chain.includes(file)) err(st.line, `arquivos em ciclo: ${[...chain, file].join(' → ')}`, tok.from, tok.to);
      else if (chain.length > 8) err(st.line, 'arquivos demais um dentro do outro', tok.from, tok.to);
      else {
        const src = opts.resolve(file, L[st.line].file);
        if (src === null || src === undefined) err(st.line, `não achei o arquivo "${file}"`, tok.from, tok.to);
        else {
          const saved = scope;
          res = parse(src, { file, resolve: opts.resolve, variant: variant || null, chain: [...chain, file] });
          scope = saved;
          const es = res.errors.filter((e) => e.level === 'error');
          if (es.length) err(st.line, `${file}:${es[0].line + 1}: ${es[0].msg}${es.length > 1 ? ` (e mais ${es.length - 1} erro${es.length > 2 ? 's' : ''})` : ''}`, tok.from, tok.to);
          if (asFilm && !res.film) { err(st.line, `"${file}" não é um filme (falta a linha film)`, tok.from, tok.to); res = null; } else if (!asFilm && res.film) { err(st.line, `"${file}" é um filme: para juntar filmes use scene "${file}"`, tok.from, tok.to); res = null; }
        }
      }
      subCache.set(key, res);
      return res;
    }

    function readActor(st, F) {
      const A = st.attrs;
      const name = ident(st, st.pos[0], 'do ator');
      if (!name) return null;
      if (name === 'camera') { err(st.line, '"camera" é reservado; escolha outro nome', st.pos[0].from, st.pos[0].to); return null; }
      const ft = st.pos[1];
      if (!ft || ft.text === '""' || (ft.text[0] !== '"' && /[,{]/.test(ft.text))) { err(st.line, 'use: actor nome "arquivo.weasel" x,y', ft ? ft.from : st.cmdTok.from, ft ? ft.to : st.cmdTok.to); return null; }
      let file = unq(ft.text);
      if (!/\.\w+$/.test(file)) file += '.weasel';
      const model = loadSub(st, ft, file, null, false);
      const ac = {
        name, file, line: st.line, model, models: new Map([['', model]]),
        x: 0, y: 0, sx: 1, sy: 1, rot: 0, flip: [1, 1], depth: 1, anim: null, speed: 1, opacity: 1, variant: '',
        origin: model && model.unity ? model.unity.root.slice() : [0, 0], order: 0, hide: null,
        screen: false, bg: false, show: true, unlit: false, front: false,
      };
      const rec = info(st, { actor: ac });
      let posTok = null;
      for (const t of st.pos.slice(2)) {
        if (FLAGS.actor.includes(t.text)) { if (t.text === 'hidden') ac.show = false; else ac[t.text] = true; } else if (!posTok && (t.text.includes(',') || t.text.includes('{'))) posTok = t;
        else err(st.line, `opção desconhecida "${t.text}" (use ${FLAGS.actor.join(', ')})`, t.from, t.to, 'warn');
      }
      if (posTok) {
        const v = posPair(st, posTok, 'a posição', [0, 0]);
        ac.x = v[0]; ac.y = v[1];
        rec.handles.push({ kind: 'pos', actor: name, x: ac.x, y: ac.y, from: posTok.from, to: posTok.to, fixed: posTok.text.includes('{') });
      }
      if (A.has('scale')) { const v = list(st, A.get('scale'), 1, 2, [1]); ac.sx = v[0]; ac.sy = v.length > 1 ? v[1] : v[0]; }
      if (A.has('rot')) ac.rot = number(st, A.get('rot'), 0);
      if (A.has('flip')) { const f = flipOf(st, A.get('flip')); if (f) ac.flip = f; }
      if (A.has('depth')) ac.depth = number(st, A.get('depth'), 1, 0.05, 1000);
      if (A.has('speed')) ac.speed = number(st, A.get('speed'), 1, 0, 100);
      if (A.has('opacity')) ac.opacity = number(st, A.get('opacity'), 1, 0, 1);
      if (A.has('origin')) ac.origin = pair(st, A.get('origin'), ac.origin);
      if (A.has('variant')) { const v = variantOf(st, A.get('variant'), ac); if (v !== null) ac.variant = v; }
      if (A.has('anim')) { const v = animOf(st, A.get('anim'), ac); if (v !== undefined) ac.anim = v; }
      if (A.has('hide')) {
        const a = A.get('hide');
        ac.hide = new Set(a.text.split(',').filter(Boolean));
        if (model) for (const n of ac.hide) if (!model.layerMap.has(n)) bad(st, a, `o ator "${name}" não tem a camada "${n}"`, 'warn');
      }
      if (F.names.has(name)) err(st.line, `ator "${name}" já existe`, st.pos[0].from, st.pos[0].to);
      return ac;
    }
    function flipOf(st, a) {
      const f = a.text;
      if (f === 'x') return [-1, 1];
      if (f === 'y') return [1, -1];
      if (f === 'xy') return [-1, -1];
      if (f === 'none' || f === '0') return [1, 1];
      bad(st, a, 'flip= aceita x, y, xy ou none');
      return null;
    }
    function animOf(st, a, ac) {
      if (a.text === 'none') return null;
      if (!ac.model) return undefined;
      if (ac.model.animMap.has(a.text)) return a.text;
      bad(st, a, `o ator "${ac.name}" não tem a animação "${a.text}"${ac.model.anims.length ? ` (tem: ${ac.model.anims.map((x) => x.name).join(', ')})` : ''}`);
      return undefined;
    }
    function variantOf(st, a, ac) {
      const v = a.text === 'none' ? '' : a.text;
      if (!ac.model) return null;
      if (v && !ac.model.variants.includes(v)) { bad(st, a, `o ator "${ac.name}" não tem a variante "${v}"${ac.model.variants.length ? ` (tem: ${ac.model.variants.join(', ')})` : ''}`); return null; }
      if (!ac.models.has(v)) ac.models.set(v, loadSub(st, { from: a.vfrom, to: a.to }, ac.file, v, false));
      return v;
    }

    function readCamera(st, cam) {
      const A = st.attrs;
      const rec = info(st, { camera: cam });
      const t = st.pos[0];
      if (t) {
        const v = posPair(st, t, 'a posição da câmera (centro do quadro)', null);
        if (v) { cam.x = v[0]; cam.y = v[1]; rec.handles.push({ kind: 'pos', camera: true, x: v[0], y: v[1], from: t.from, to: t.to, fixed: t.text.includes('{') }); }
        for (const f of st.pos.slice(1)) err(st.line, `valor solto "${f.text}"`, f.from, f.to, 'warn');
      }
      if (A.has('zoom')) cam.zoom = number(st, A.get('zoom'), 1, 0.01, 100);
      if (A.has('rot')) cam.rot = number(st, A.get('rot'), 0);
      if (A.has('shake')) cam.shake = number(st, A.get('shake'), 0, 0, 1000);
      if (A.has('offset')) cam.offset = pair(st, A.get('offset'), cam.offset);
      if (A.has('lag')) cam.lag = number(st, A.get('lag'), 0, 0, 10);
      if (A.has('fade')) cam.fade = number(st, A.get('fade'), 0, 0, 1);
      if (A.has('fadec')) cam.fadec = plainColor(st, A.get('fadec')) || cam.fadec;
      if (A.has('follow')) { const a = A.get('follow'); cam.follow = a.text === 'none' ? null : a.text; cam.followAt = { st, a }; }
    }

    function readFilm(fst) {
      for (const st of filmSts.slice(1)) err(st.line, 'film repetido (só um por arquivo)', st.cmdTok.from, st.cmdTok.to);
      const F = {
        fps: 24, dur: null, line: fst.line, names: new Set(),
        actors: [], camera: { x: m.canvas.w / 2, y: m.canvas.h / 2, zoom: 1, rot: 0, shake: 0, follow: null, offset: [0, 0], lag: 0, fade: 0, fadec: '#000000' },
        shots: [], seq: [], audios: [], subs: [],
        lang: 'pt', burn: false, subsize: null, subc: '#ffffff',
      };
      m.film = F;
      if (fst.attrs.has('fps')) F.fps = number(fst, fst.attrs.get('fps'), 24, 1, 120);
      if (fst.attrs.has('lang')) F.lang = fst.attrs.get('lang').text;
      if (fst.attrs.has('subs')) {
        const a = fst.attrs.get('subs');
        if (a.text === 'burn') F.burn = true; else if (a.text !== 'file') bad(fst, a, 'subs= aceita burn (legenda desenhada no vídeo) ou file (só o .srt)');
      }
      if (fst.attrs.has('subsize')) F.subsize = number(fst, fst.attrs.get('subsize'), 48, 6, 400);
      if (fst.attrs.has('subc')) F.subc = plainColor(fst, fst.attrs.get('subc')) || F.subc;
      if (fst.attrs.has('dur')) { const t = timeOf(fst, fst.attrs.get('dur'), F.fps, 'a duração'); if (t) F.dur = t.v; }
      for (const f of fst.pos) err(fst.line, `valor solto "${f.text}"`, f.from, f.to, 'warn');
      info(fst, { filmSt: F });

      const sequenced = top.some((s) => s.cmd === 'shot' || s.cmd === 'scene');
      const base = (X.mainFile || 'filme').replace(/\.[^.]+$/, '');
      let shot = sequenced ? null : { name: base, line: fst.line, dur: F.dur, implicit: true, actors: [], cam: null, ats: [], tracks: new Map(), audios: [], subs: [] };
      if (shot) { F.shots.push(shot); F.seq.push({ kind: 'shot', shot }); }
      let order = 0, seen = false;
      const shotNames = new Set();
      for (const st of top) {
        if (st.cmd === 'shot') {
          seen = true;
          const name = ident(st, st.pos[0], 'do plano');
          shot = { name: name || '?', line: st.line, dur: null, actors: [], cam: null, ats: [], tracks: new Map(), names: new Set(F.names), audios: [], subs: [], trans: null };
          if (name && shotNames.has(name)) err(st.line, `shot "${name}" já existe`, st.pos[0].from, st.pos[0].to);
          shotNames.add(shot.name);
          shot.cam = Object.assign({}, F.camera, { offset: F.camera.offset.slice() });
          if (st.attrs.has('dur')) { const t = timeOf(st, st.attrs.get('dur'), F.fps, 'a duração'); if (t) shot.dur = Math.max(1 / F.fps, t.v); } else err(st.line, 'falta dur= (ex.: shot abertura dur=4s)', st.cmdTok.from, st.cmdTok.to);
          if (shot.dur === null) shot.dur = 3;
          if (st.attrs.has('in')) shot.trans = transOf(st, st.attrs.get('in'), F.fps, shot.dur);
          for (const f of st.pos.slice(1)) err(st.line, `valor solto "${f.text}"`, f.from, f.to, 'warn');
          F.shots.push(shot);
          F.seq.push({ kind: 'shot', shot });
          info(st, { shot });
          continue;
        }
        if (st.cmd === 'scene') {
          const ft = st.pos[0];
          if (!ft) { err(st.line, 'use: scene "arquivo.weasel"', st.cmdTok.from, st.cmdTok.to); continue; }
          let file = unq(ft.text);
          if (!/\.\w+$/.test(file)) file += '.weasel';
          const sub = loadSub(st, ft, file, null, true);
          info(st, { scene: file });
          shot = null;
          seen = true;
          if (sub) F.seq.push({ kind: 'scene', file, model: sub, line: st.line });
          continue;
        }
        if ((st.cmd === 'actor' || st.cmd === 'camera' || st.cmd === 'audio' || st.cmd === 'sub') && !shot && seen) {
          err(st.line, `${st.cmd} depois de scene precisa de um shot antes (ou suba para antes do primeiro shot, valendo para todos)`, st.cmdTok.from, st.cmdTok.to);
          continue;
        }
        if (st.cmd === 'actor') {
          const local = shot && !shot.implicit;
          const ac = readActor(st, local ? shot : F);
          if (!ac) continue;
          ac.order = order++;
          (local ? shot : F).names.add(ac.name);
          (local ? shot.actors : F.actors).push(ac);
          continue;
        }
        if (st.cmd === 'camera') {
          readCamera(st, shot && !shot.implicit ? shot.cam : F.camera);
          continue;
        }
        // som e legenda: dentro de um shot, o tempo conta do começo dele; antes dos shots, do começo do filme
        if (st.cmd === 'audio') {
          const local = shot && !shot.implicit;
          const a = readAudio(st, F);
          if (a) (local ? shot : F).audios.push(a);
          continue;
        }
        if (st.cmd === 'sub') {
          readSub(st, F, shot && !shot.implicit ? shot : F);
          continue;
        }
        if (st.cmd === 'at') {
          if (!shot) { err(st.line, sequenced ? 'at precisa ficar dentro de um shot' : 'at precisa vir depois do film', st.cmdTok.from, st.cmdTok.to); continue; }
          const t = timeOf(st, st.pos[0], F.fps, 'o tempo (ex.: at 2s heroi.pos=400,560)');
          if (!t) continue;
          const prev = shot.ats.length ? shot.ats[shot.ats.length - 1].t : 0;
          shot.ats.push({ st, t: t.rel ? prev + t.v : t.v });
          for (const f of st.pos.slice(1)) err(st.line, `valor solto "${f.text}" (use alvo.propriedade=valor)`, f.from, f.to, 'warn');
        }
      }
      for (const s of F.shots) {
        if (s.implicit) s.cam = F.camera;
        const actors = new Map([...F.actors, ...s.actors].map((a) => [a.name, a]));
        s.actorMap = actors;
        for (const { st, t } of s.ats) readAt(st, t, s, actors, F.fps);
        if (s.implicit && s.dur === null) {
          const last = Math.max(0, ...s.ats.map((x) => x.t));
          s.dur = last > 0 ? last : 3;
          if (!(last > 0)) err(fst.line, 'falta dur= (ex.: film fps=24 dur=10s) ou shot … dur=; o filme ficou com 3s', fst.cmdTok.from, fst.cmdTok.to, 'warn');
        }
        for (const tr of s.tracks.values()) {
          tr.keys.sort((p, q) => p.t - q.t);
          const over = tr.keys.find((k) => k.t > s.dur + 1e-9);
          if (over) err(over.line, `at ${round3(over.t)}s passa do fim do shot "${s.name}" (dur=${round3(s.dur)}s)`, 0, 2, 'warn');
        }
        // câmera seguindo um ator que não existe
        if (s.cam.follow && !actors.has(s.cam.follow) && s.cam.followAt) bad(s.cam.followAt.st, s.cam.followAt.a, `ator "${s.cam.follow}" não existe aqui`);
        for (const a of s.audios) checkLips(a, actors);
      }
      const everyone = new Map([...F.actors, ...F.shots.flatMap((s) => s.actors)].map((a) => [a.name, a]));
      for (const a of F.audios) checkLips(a, everyone);
      if (sequenced && F.dur !== null) err(fst.line, 'dur= do film só vale sem shot (a duração vem dos shots)', fst.attrs.get('dur').from, fst.attrs.get('dur').to, 'warn');
      if (!F.seq.length) err(fst.line, 'o filme não tem nenhum shot', fst.cmdTok.from, fst.cmdTok.to, 'warn');
      delete F.names;
      for (const s of F.shots) delete s.names;
    }

    // in=fade | in=iris,0.8s: como o plano entra (o plano anterior fica parado no último quadro durante a troca)
    function transOf(st, a, fps, dur) {
      const parts = a.text.split(',');
      const type = parts[0];
      if (!TRANSITIONS.includes(type)) { bad(st, a, `transição desconhecida "${type}" (use ${TRANSITIONS.join(', ')})`); return null; }
      if (parts.length > 2) { bad(st, a, 'use in=tipo,duração (ex.: in=fade,0.5s)'); return null; }
      let d = 0.5;
      if (parts[1]) {
        const off = a.vfrom + type.length + 1;
        const t = timeOf(st, { key: 'in', text: parts[1], vfrom: off, from: off, to: a.to }, fps, 'a duração da transição');
        if (!t) return null;
        if (t.rel) { bad(st, a, 'a duração da transição não aceita +'); return null; }
        d = t.v;
      }
      if (d > dur + 1e-9) { bad(st, a, `a transição (${round3(d)}s) é mais longa que o plano (${round3(dur)}s)`, 'warn'); d = dur; }
      return d > 0 ? { type, dur: d } : null;
    }

    // audio fala1 "voz/fala01.wav" at=1.2s from= dur= vol= lips=ator cues="fala01.json" text="legenda" lang= [loop]
    function readAudio(st, F) {
      const A = st.attrs;
      const name = ident(st, st.pos[0], 'do som');
      if (!name) return null;
      const ft = st.pos[1];
      if (!ft || /^[\d+{]/.test(ft.text)) { err(st.line, 'use: audio nome "arquivo.wav" at=2s', ft ? ft.from : st.cmdTok.from, ft ? ft.to : st.cmdTok.to); return null; }
      const a = { name, file: unq(ft.text), line: st.line, at: 0, from: 0, dur: null, vol: 1, loop: false, lips: null, lipsAt: null, cues: null, cuesFile: null, text: null, lang: null, media: null };
      for (const f of st.pos.slice(2)) { if (f.text === 'loop') a.loop = true; else err(st.line, `opção desconhecida "${f.text}" (use loop)`, f.from, f.to, 'warn'); }
      for (const k of ['at', 'from', 'dur']) {
        if (!A.has(k)) continue;
        const t = timeOf(st, A.get(k), F.fps, k);
        if (t) a[k] = t.v;
      }
      if (A.has('vol')) a.vol = number(st, A.get('vol'), 1, 0, 4);
      if (A.has('lips')) { a.lips = A.get('lips').text; a.lipsAt = { st, a: A.get('lips') }; }
      if (A.has('text')) a.text = unq(A.get('text').text).replace(/\\n/g, '\n');
      if (A.has('lang')) a.lang = A.get('lang').text;
      if (opts.media) {
        a.media = opts.media(a.file, L[st.line].file);
        if (!a.media) err(st.line, `não achei o som "${a.file}"`, ft.from, ft.to, 'warn');
      }
      if (A.has('cues')) {
        const c = A.get('cues');
        a.cuesFile = unq(c.text);
        const txt = opts.resolve ? opts.resolve(a.cuesFile, L[st.line].file) : null;
        if (txt === null || txt === undefined) bad(st, c, `não achei o arquivo de bocas "${a.cuesFile}"`);
        else { try { a.cues = W.audio.parseCues(txt); } catch (e) { bad(st, c, `${a.cuesFile}: ${e.message}`); } }
      }
      info(st, { audio: a });
      return a;
    }
    // lips= aponta para um ator com boca (mouth); sem cues=, o lip sync automático precisa do .wav
    function checkLips(a, actors) {
      if (!a.lips) return;
      const ac = actors.get(a.lips);
      if (!ac) { bad(a.lipsAt.st, a.lipsAt.a, `ator "${a.lips}" não existe aqui`); return; }
      if (ac.model && !ac.model.mouth) bad(a.lipsAt.st, a.lipsAt.a, `o ator "${a.lips}" não tem boca para o lip sync (falta mouth no arquivo dele)`, 'warn');
      if (!a.cues && a.media && !a.media.mono) bad(a.lipsAt.st, a.lipsAt.a, 'o lip sync automático precisa de um .wav (ou das bocas do Rhubarb em cues=)', 'warn');
    }
    // sub 2s "texto" dur= lang=   (+0.5s = meio segundo depois do fim da legenda anterior)
    function readSub(st, F, block) {
      const A = st.attrs;
      const t = timeOf(st, st.pos[0], F.fps, 'o tempo (ex.: sub 2s "Olá!")');
      if (!t) return;
      const tx = st.pos[1];
      if (!tx || tx.text[0] !== '"') { err(st.line, 'use: sub 2s "texto" dur=2s', tx ? tx.from : st.cmdTok.from, tx ? tx.to : st.cmdTok.to); return; }
      for (const f of st.pos.slice(2)) err(st.line, `valor solto "${f.text}"`, f.from, f.to, 'warn');
      const text = unq(tx.text).replace(/\\n/g, '\n');
      const prev = block.subs[block.subs.length - 1];
      const s = { t: t.rel ? (prev ? prev.t + prev.dur : 0) + t.v : t.v, dur: Math.min(7, Math.max(1.2, 0.5 + text.length / 15)), text, lang: null, line: st.line };
      if (A.has('dur')) { const d = timeOf(st, A.get('dur'), F.fps, 'a duração'); if (d) s.dur = Math.max(1 / F.fps, d.v); }
      if (A.has('lang')) s.lang = A.get('lang').text;
      block.subs.push(s);
      info(st, { sub: s, block });
    }

    // at 2s heroi.pos=900,560 heroi.anim=walk camera.zoom=1.4 ease=out
    function readAt(st, t, shot, actors, fps) {
      let ease = 'smooth';
      if (st.attrs.has('ease')) {
        const a = st.attrs.get('ease');
        if (W.geom.EASE[a.text]) ease = a.text;
        else bad(st, a, `ease desconhecido "${a.text}" (use ${Object.keys(W.geom.EASE).join(', ')})`);
      }
      const rec = info(st, { at: { shot, t } });
      const key = (kind, name, prop, interp, v, a) => {
        const id = `${kind}:${name}.${prop}`;
        if (!shot.tracks.has(id)) shot.tracks.set(id, { kind, name, prop, interp, keys: [] });
        const tr = shot.tracks.get(id);
        const k = { t, v, ease, line: st.line };
        const same = tr.keys.findIndex((x) => Math.abs(x.t - t) < 1e-9);
        if (same >= 0) tr.keys[same] = k; else tr.keys.push(k);
        return a;
      };
      let n = 0;
      for (const a of st.attrs.values()) {
        if (a.key === 'ease') continue;
        n++;
        const dot = a.key.lastIndexOf('.');
        if (dot <= 0) { bad(st, a, 'use alvo.propriedade=valor (ex.: heroi.pos=400,560 ou camera.zoom=1.5)'); continue; }
        const name = a.key.slice(0, dot), prop = a.key.slice(dot + 1);
        const ac = actors.get(name);
        let kind, table;
        if (name === 'camera') { kind = 'camera'; table = CAMERA_PROPS; } else if (ac) { kind = 'actor'; table = ACTOR_PROPS; } else if (m.lights.has(name)) { kind = 'light'; table = LIGHT_PROPS; } else if (m.layerMap.has(name)) { kind = 'layer'; table = LAYER_PROPS; } else if (m.named.has(name)) { kind = 'shape'; table = SHAPE_AT_PROPS; } else { bad(st, a, `"${name}" não é ator, camera, luz, camada nem forma deste filme`); continue; }
        const type = table[prop];
        if (type === 'order') { bad(st, a, `${prop}= muda a ordem só numa animação (key), não no at`); continue; }
        if (!type) { bad(st, a, `"${prop}" não muda com at em ${{ camera: 'camera', actor: 'ator', light: 'luz', layer: 'camada', shape: 'forma' }[kind]} (use ${Object.keys(table).filter((k) => table[k] !== 'order').join(', ')})`); continue; }
        switch (type) {
          case 'xy': {
            const v = pair(st, a, null);
            if (!v) break;
            const [px, py] = prop === 'offset' ? ['ox', 'oy'] : ['x', 'y'];
            key(kind, name, px, 'lerp', v[0]);
            key(kind, name, py, 'lerp', v[1]);
            if (prop === 'pos') rec.handles.push({ kind: 'pos', actor: kind === 'actor' ? name : null, camera: kind === 'camera', x: v[0], y: v[1], from: a.vfrom, to: a.to, fixed: a.text.includes('{') });
            break;
          }
          case 'scale': {
            const v = list(st, a, 1, 2, null);
            if (!v) break;
            key(kind, name, 'sx', 'lerp', v[0]);
            key(kind, name, 'sy', 'lerp', v.length > 1 ? v[1] : v[0]);
            break;
          }
          case 'free': key(kind, name, prop, 'lerp', number(st, a, 0)); break;
          case 'num': key(kind, name, prop, 'lerp', number(st, a, 1, 0, 1)); break;
          case 'pos': key(kind, name, prop, 'lerp', number(st, a, 1, 0.01, 1000)); break;
          case 'stepnum': key(kind, name, prop, 'step', number(st, a, 1, 0, 100)); break;
          case 'px': key(kind, name, prop, 'lerp', number(st, a, 0, 0, 1000)); break;
          case 'step': {
            const s = a.text.toLowerCase();
            const v = ['1', 'on', 'true', 'sim'].includes(s) ? 1 : ['0', 'off', 'false', 'nao', 'não'].includes(s) ? 0 : null;
            if (v === null) bad(st, a, `${prop}= aceita 1 ou 0`);
            else key(kind, name, prop, 'step', v);
            break;
          }
          case 'color': { const c = plainColor(st, a); if (c) key(kind, name, prop, 'color', c); break; }
          case 'flip': { const f = flipOf(st, a); if (f) key(kind, name, prop, 'step', f); break; }
          case 'anim': { const v = animOf(st, a, ac); if (v !== undefined) key(kind, name, prop, 'step', v); break; }
          case 'variant': { const v = variantOf(st, a, ac); if (v !== null) key(kind, name, prop, 'step', v); break; }
          case 'actor':
            if (a.text !== 'none' && !actors.has(a.text)) bad(st, a, `ator "${a.text}" não existe aqui`);
            else key(kind, name, prop, 'step', a.text === 'none' ? null : a.text);
            break;
        }
      }
      if (!n) err(st.line, 'at sem mudança (ex.: at 2s heroi.pos=400,560 camera.zoom=1.4)', st.cmdTok.from, st.cmdTok.to);
    }

    // ---- linhas de arquivos incluídos: erros e alças voltam para a linha do include ----
    if (X.files.length) {
      const mainLines = src.split(/\r?\n/);
      for (const e of errors) {
        const o = L[e.line];
        if (!o) continue;
        if (o.file === X.mainFile) { e.line = o.line; continue; }
        const inc = splitLine(mainLines[o.main] || '').words[1];
        e.msg = `${o.file}:${o.line + 1}: ${e.msg}`;
        e.line = o.main;
        e.from = inc ? inc.from : 0;
        e.to = inc ? inc.to : 0;
      }
      const nb = new Map();
      for (const [k, rec] of m.byLine) { const o = L[k]; if (o && o.file === X.mainFile) nb.set(o.line, rec); }
      m.byLine = nb;
    }
    scope = null;
    errors.sort((a, b) => a.line - b.line || a.from - b.from);
    return m;
  }

  function compatible(a, b) {
    if (a.type !== b.type || a.limb || b.limb || a.type === 'text') return false;
    if (a.pts && a.pts.length && b.pts) return a.pts.length === b.pts.length;
    return true;
  }

  function yOnLine(pts, x) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((x >= a.x && x <= b.x) || (x >= b.x && x <= a.x)) return a.x === b.x ? a.y : a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
    }
    const near = pts.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), pts[0]);
    return near.y;
  }

  // Pontos de referência de uma forma (já com a transformação do componente), para tecido e molas.
  function restPoints(el) {
    let pts;
    if (el.type === 'ellipse') pts = [[el.center[0] - el.radius[0], el.center[1]], [el.center[0] + el.radius[0], el.center[1]], [el.center[0], el.center[1] - el.radius[1]], [el.center[0], el.center[1] + el.radius[1]]];
    else if (el.type === 'rect') pts = [[el.xy[0], el.xy[1]], [el.xy[0] + el.size[0], el.xy[1] + el.size[1]]];
    else if (el.type === 'text' || el.type === 'emitter') pts = [el.at];
    else if (el.limb) pts = [el.hip, el.foot];
    else pts = el.pts.map((p) => [p.x, p.y]);
    return el.xf ? pts.map((p) => M.apply(el.xf, p[0], p[1])) : pts;
  }

  W.lang = { parse, splitLine, words, evalExpr, KEYWORDS, ATTRS, FLAGS, PROPS, LAYER_PROPS, LIGHT_PROPS, ACTOR_PROPS, CAMERA_PROPS, SHAPE_AT_PROPS, TRANSITIONS, BOX_PROPS, GODOT_BODIES, FILM_CMDS, VISEMES, PARTICLE_SHAPES, DRAWABLE, IDENT, HEX, NUM };
})(window.Weasel = window.Weasel || {});
