/* Weasel — cena: pose dos ossos, molas, tecido, membros, propriedades animadas, desenho por camadas
   e a "pintura" passo a passo. */
(function (W) {
  'use strict';
  const G = W.geom, M = G.M;
  const REST = [0, 0, 0, 1, 1];
  const NONE = new Map();
  const NOPROPS = {};
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- trilhas de animação ----------
  // Trecho da trilha que contém o quadro f: a key de antes, a de depois e o t (já com ease).
  function segment(track, f, frames, loop) {
    if (!track || !track.length) return null;
    const first = track[0], last = track[track.length - 1];
    if (track.length === 1) return { a: first, b: first, t: 0 };
    let a, b, fa, fb;
    if (f < first.frame) {
      if (!loop) return { a: first, b: first, t: 0 };
      a = last; fa = last.frame - frames; b = first; fb = first.frame;
    } else if (f >= last.frame) {
      if (!loop) return { a: last, b: last, t: 0 };
      a = last; fa = last.frame; b = first; fb = first.frame + frames;
    } else {
      let i = 0;
      while (track[i + 1].frame <= f) i++;
      a = track[i]; b = track[i + 1]; fa = a.frame; fb = b.frame;
    }
    const span = fb - fa;
    return { a, b, t: span > 0 ? G.EASE[a.ease]((f - fa) / span) : 0 };
  }

  function hash(str, f) {
    let h = 2166136261 ^ (f * 374761393);
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1;
  }

  function boneValues(anim, b, f, springs) {
    if (!anim) return REST;
    const s = segment(anim.tracks.get(b.name), f, anim.frames, anim.loop);
    const v = s ? s.a.v.map((x, k) => x + (s.b.v[k] - x) * s.t) : REST.slice();
    const dur = anim.frames / anim.fps, t = f / anim.fps;
    // ondas: o período é ajustado para caber um número inteiro de vezes na animação (o loop fecha)
    const wave = (w) => {
      const per = anim.loop ? dur / Math.max(1, Math.round(dur / w[1])) : w[1];
      return w[0] * Math.sin((2 * Math.PI * t) / per + (w[2] * Math.PI) / 180);
    };
    if (b.sway) v[2] += wave(b.sway);
    if (b.bob) v[1] += wave(b.bob);
    if (b.jitter) { v[0] += b.jitter * hash(b.name + 'x', f); v[1] += b.jitter * hash(b.name + 'y', f); }
    if (springs && springs.has(b.name)) v[2] += springs.get(b.name)[f];
    return v;
  }

  function boneMatrices(model, anim, f, springs) {
    const out = new Map();
    const get = (name, depth) => {
      if (out.has(name)) return out.get(name);
      const b = model.bones.get(name);
      if (!b) return M.id();
      const v = boneValues(anim, b, f, springs);
      const [px, py] = b.pivot;
      let local = M.translate(px + v[0], py + v[1]);
      local = M.mul(local, M.rotate(v[2]));
      local = M.mul(local, M.scale(v[3], v[4]));
      local = M.mul(local, M.translate(-px, -py));
      const m = b.parent && depth < 64 ? M.mul(get(b.parent, depth + 1), local) : local;
      out.set(name, m);
      return m;
    };
    for (const name of model.bones.keys()) get(name, 0);
    return out;
  }

  function findNamed(model, name, inst) {
    const list = model.named.get(name);
    if (!list) return null;
    return list.find((e) => e.inst === inst) || list[0];
  }

  // Tudo o que depende do quadro, calculado uma vez por animação.
  function animData(model, anim) {
    model._anim = model._anim || new Map();
    let d = model._anim.get(anim.name);
    if (d) return d;
    const N = anim.frames, dt = 1 / anim.fps;
    const idx = (i) => (anim.loop ? ((i % N) + N) % N : Math.max(0, Math.min(N - 1, i)));
    const passes = anim.loop ? 3 : 1, sub = 10, h = dt / sub;

    // Molas: o osso gira atrasado quando o pai acelera. Das mais perto da raiz para as pontas.
    const springs = new Map();
    const depthOf = (b) => { let k = 0, p = b.parent; while (p && k < 64) { k++; p = model.bones.get(p) && model.bones.get(p).parent; } return k; };
    const sbones = [...model.bones.values()].filter((b) => b.spring).sort((a, b) => depthOf(a) - depthOf(b));
    for (const b of sbones) {
      const mats = [];
      for (let f = 0; f < N; f++) mats.push(boneMatrices(model, anim, f, springs));
      const piv = mats.map((mm) => M.apply(mm.get(b.name), b.pivot[0], b.pivot[1]));
      const arm = mats.map((mm) => { const q = mm.get(b.name), rx = b.tip[0] - b.pivot[0], ry = b.tip[1] - b.pivot[1]; return [q[0] * rx + q[2] * ry, q[1] * rx + q[3] * ry]; });
      const K = 30 + 420 * b.spring, C = 2 * Math.sqrt(K) * 0.2;
      let th = 0, w = 0;
      const out = new Float64Array(N);
      for (let pass = 0; pass < passes; pass++) {
        for (let i = 0; i < N; i++) {
          if (pass === passes - 1) out[i] = (th * 180) / Math.PI;
          const p0 = piv[idx(i - 1)], p1 = piv[i], p2 = piv[idx(i + 1)];
          const fx = -(p2[0] - 2 * p1[0] + p0[0]) / (dt * dt) - ((p2[0] - p0[0]) / (2 * dt)) * 4;
          const fy = -(p2[1] - 2 * p1[1] + p0[1]) / (dt * dt) - ((p2[1] - p0[1]) / (2 * dt)) * 4;
          const r = arm[i], r2 = r[0] * r[0] + r[1] * r[1] || 1;
          const alpha = (1.4 * (r[0] * fy - r[1] * fx)) / r2;
          for (let s = 0; s < sub; s++) {
            w += (-K * th - C * w + alpha) * h;
            th = Math.max(-1.2, Math.min(1.2, th + w * h));
          }
        }
      }
      springs.set(b.name, out);
    }
    const mats = [];
    for (let f = 0; f < N; f++) mats.push(boneMatrices(model, anim, f, springs));

    // Tecido: uma "massa" presa ao pivô por uma mola; os pontos longe do pivô seguem a massa.
    const cloth = Array.from({ length: N }, () => new Map());
    for (const c of model.cloths.values()) {
      if (!(c.R > 0)) continue;
      const pos = mats.map((mm) => (c.bone && mm.get(c.bone) ? M.apply(mm.get(c.bone), c.center[0], c.center[1]) : c.center));
      const K = 30 + 420 * c.tension, C = 2 * Math.sqrt(K) * 0.22, gain = 1.6 * c.swing, drag = 0.045 * c.drag;
      let ox = 0, oy = 0, vx = 0, vy = 0;
      const lim = c.R * 0.4;
      for (let pass = 0; pass < passes; pass++) {
        for (let i = 0; i < N; i++) {
          if (pass === passes - 1) cloth[i].set(c.name, [ox, oy]);
          const p0 = pos[idx(i - 1)], p1 = pos[i], p2 = pos[idx(i + 1)];
          const ax = (p2[0] - 2 * p1[0] + p0[0]) / (dt * dt), ay = (p2[1] - 2 * p1[1] + p0[1]) / (dt * dt);
          const tx = (-(p2[0] - p0[0]) / (2 * dt)) * drag, ty = (-(p2[1] - p0[1]) / (2 * dt)) * drag;
          for (let s = 0; s < sub; s++) {
            vx += (-K * (ox - tx) - C * vx - gain * ax) * h;
            vy += (-K * (oy - ty) - C * vy - gain * ay) * h;
            ox += vx * h; oy += vy * h;
            const l = Math.hypot(ox, oy);
            if (l > lim) { ox *= lim / l; oy *= lim / l; }
          }
        }
      }
    }

    // Propriedades animadas (opacidade, cor, espessura, visibilidade, morph).
    const props = [], lprops = [];
    for (let f = 0; f < N; f++) {
      const pm = new Map(), lm = new Map();
      for (const tr of anim.ptracks.values()) {
        const s = segment(tr.keys, f, N, anim.loop);
        if (!s) continue;
        let v;
        if (tr.type === 'num' || tr.type === 'width') v = lerp(s.a.v, s.b.v, s.t);
        else if (tr.type === 'color') v = typeof s.a.v === 'string' && typeof s.b.v === 'string' ? G.lerpColor(s.a.v, s.b.v, s.t) : s.t < 1 ? s.a.v : s.b.v;
        else if (tr.type === 'step') v = s.a.v;
        else v = { from: s.a.v, to: s.b.v, t: s.t };
        if (tr.kind === 'layer') { const o = lm.get(tr.name) || {}; o[tr.prop] = v; lm.set(tr.name, o); continue; }
        for (const el of tr.targets) {
          const o = pm.get(el.id) || {};
          if (tr.type === 'shape') o.shape = { from: findNamed(model, v.from, el.inst), to: findNamed(model, v.to, el.inst), t: v.t };
          else o[tr.prop] = tr.type === 'width' ? v * el.ws : v;
          pm.set(el.id, o);
        }
      }
      props.push(pm);
      lprops.push(lm);
    }
    d = { mats, cloth, props, lprops };
    model._anim.set(anim.name, d);
    return d;
  }

  function makePose(model, animName, frame) {
    const anim = animName ? model.animMap.get(animName) || null : null;
    if (!anim) return { anim: null, frame: 0, bones: boneMatrices(model, null, 0, null), cloth: NONE, props: NONE, lprops: NONE, geo: new Map() };
    const d = animData(model, anim);
    const f = ((Math.round(frame) % anim.frames) + anim.frames) % anim.frames;
    return { anim, frame: f, bones: d.mats[f], cloth: d.cloth[f], props: d.props[f], lprops: d.lprops[f], geo: new Map() };
  }

  // ---------- geometria de cada elemento numa pose ----------
  // coordenadas do código → mundo: componente (xf), osso, tecido
  function mapper(model, pose, el) {
    const m = el.bone ? pose.bones.get(el.bone) : null;
    const c = el.cloth ? model.cloths.get(el.cloth) : null;
    const o = c ? pose.cloth.get(el.cloth) : null;
    const xf = el.xf;
    return (x, y) => {
      if (xf) { const q = M.apply(xf, x, y); x = q[0]; y = q[1]; }
      const p = m ? M.apply(m, x, y) : [x, y];
      if (o && c.R > 0) {
        const w = Math.pow(Math.min(1, Math.hypot(x - c.pivot[0], y - c.pivot[1]) / c.R), 1.2);
        p[0] += o[0] * w; p[1] += o[1] * w;
      }
      return p;
    };
  }

  function mapPts(pts, f) {
    return pts.map((p) => {
      const q = f(p.x, p.y);
      const o = { x: q[0], y: q[1], corner: p.corner };
      if (p.tan) { const t = f(p.x + p.tan[0], p.y + p.tan[1]); o.tan = [t[0] - q[0], t[1] - q[1]]; }
      return o;
    });
  }

  function lerpPts(A, B, t, base) {
    return A.map((p, i) => {
      const q = B[i];
      const o = { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t), corner: base[i] ? base[i].corner : p.corner };
      if (p.tan && q.tan) o.tan = [lerp(p.tan[0], q.tan[0], t), lerp(p.tan[1], q.tan[1], t)];
      else if (p.tan || q.tan) o.tan = t < 0.5 ? p.tan : q.tan;
      return o;
    });
  }

  function limbPoints(model, pose, el) {
    const m = el.on ? pose.bones.get(el.on) : null;
    const hip = m ? M.apply(m, el.hip[0], el.hip[1]) : el.hip.slice();
    let goal = el.foot;
    if (el.target) {
      const tb = model.bones.get(el.target), tm = pose.bones.get(el.target);
      goal = tm ? M.apply(tm, tb.pivot[0], tb.pivot[1]) : tb.pivot;
    }
    const L = el.restLen;
    let dx = goal[0] - hip[0], dy = goal[1] - hip[1], d = Math.hypot(dx, dy);
    let end = goal;
    if (d > L) { end = [hip[0] + (dx / d) * L, hip[1] + (dy / d) * L]; dx = end[0] - hip[0]; dy = end[1] - hip[1]; d = L; }
    const pts = [{ x: hip[0], y: hip[1] }];
    if (d < L - 0.5 && d > 1e-6) {
      const h = Math.sqrt(Math.max(0, (L / 2) ** 2 - (d / 2) ** 2)) * Math.min(1, Math.abs(el.bend));
      const s = el.bend >= 0 ? 1 : -1;
      pts.push({ x: (hip[0] + end[0]) / 2 + (dy / d) * h * s, y: (hip[1] + end[1]) / 2 - (dx / d) * h * s });
    }
    pts.push({ x: end[0], y: end[1] });
    return pts;
  }

  let measureCtx = null;
  function textFont(el) {
    const fam = /\s/.test(el.font) && !/["',]/.test(el.font) ? `"${el.font}"` : el.font;
    return `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${el.size}px ${fam}`;
  }
  // caixa do texto relativa ao ponto de âncora
  function textBox(el) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = textFont(el);
    const w = measureCtx.measureText(el.str).width;
    return { x: el.align === 'center' ? -w / 2 : el.align === 'right' ? -w : 0, y: -el.size * 0.8, w, h: el.size * 1.05 };
  }
  function textMatrix(pose, el) {
    let m = M.mul(M.translate(el.at[0], el.at[1]), M.rotate(el.rot));
    if (el.xf) m = M.mul(el.xf, m);
    const b = el.bone ? pose.bones.get(el.bone) : null;
    return b ? M.mul(b, m) : m;
  }

  // caixa nas coordenadas do código (para gradientes "box")
  function localBox(el) {
    let pts;
    if (el.type === 'ellipse') pts = [[el.center[0] - el.radius[0], el.center[1] - el.radius[1]], [el.center[0] + el.radius[0], el.center[1] + el.radius[1]]];
    else if (el.type === 'rect') pts = [el.xy, [el.xy[0] + el.size[0], el.xy[1] + el.size[1]]];
    else if (el.type === 'text') { const b = textBox(el); pts = [[el.at[0] + b.x, el.at[1] + b.y], [el.at[0] + b.x + b.w, el.at[1] + b.y + b.h]]; } else if (el.limb) pts = [el.hip, el.foot];
    else pts = el.pts.map((p) => [p.x, p.y]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    if (x0 === Infinity) return { x: 0, y: 0, w: 1, h: 1 };
    return { x: x0, y: y0, w: Math.max(1e-6, x1 - x0), h: Math.max(1e-6, y1 - y0) };
  }

  function geometry(model, pose, el) {
    let g = pose.geo.get(el.id);
    if (g) return g;
    const pr = pose.props.get(el.id);
    const mo = pr && pr.shape && pr.shape.from && pr.shape.to ? pr.shape : null;
    let segs = [];
    if (el.type === 'ellipse') {
      let c = el.center, r = el.radius, rot = el.rot;
      if (mo) {
        const A = mo.from, B = mo.to, t = mo.t;
        c = [lerp(A.center[0], B.center[0], t), lerp(A.center[1], B.center[1], t)];
        r = [lerp(A.radius[0], B.radius[0], t), lerp(A.radius[1], B.radius[1], t)];
        rot = lerp(A.rot, B.rot, t);
      }
      const f = mapper(model, pose, el);
      segs = G.ellipseSegs(c[0], c[1], r[0], r[1], rot).map((s) => G.mapSeg(s, f));
    } else if (el.type === 'rect') {
      let xy = el.xy, size = el.size, rr = el.r, rot = el.rot;
      if (mo) {
        const A = mo.from, B = mo.to, t = mo.t;
        xy = [lerp(A.xy[0], B.xy[0], t), lerp(A.xy[1], B.xy[1], t)];
        size = [lerp(A.size[0], B.size[0], t), lerp(A.size[1], B.size[1], t)];
        rr = lerp(A.r, B.r, t);
        rot = lerp(A.rot, B.rot, t);
      }
      const f = mapper(model, pose, el);
      segs = G.rectSegs(xy[0], xy[1], size[0], size[1], rr, rot).map((s) => G.mapSeg(s, f));
    } else if (el.type === 'text') {
      const b = textBox(el), m = textMatrix(pose, el);
      segs = G.rectSegs(b.x, b.y, b.w, b.h, 0, 0).map((s) => G.mapSeg(s, (x, y) => M.apply(m, x, y)));
    } else if (el.limb) {
      segs = G.smoothSegs(limbPoints(model, pose, el), false, 1);
    } else {
      const pts = mo ? lerpPts(mo.from.pts, mo.to.pts, mo.t, el.pts) : el.pts;
      const f = mapper(model, pose, el);
      if (el.type === 'line') segs = G.polySegs(mapPts(pts, f), false);
      else if (pts.length >= 2) segs = G.smoothSegs(mapPts(pts, f), el.closed, el.smooth);
    }
    g = { segs, closed: el.closed, _path: null, _flat: null };
    pose.geo.set(el.id, g);
    return g;
  }
  const pathOf = (g) => g._path || (g._path = G.toPath(g.segs, g.closed));
  const flatOf = (g) => g._flat || (g._flat = G.flatten(g.segs, 2.5));

  function clipEls(model, name) {
    if (model.named.has(name)) return model.named.get(name);
    const L = model.layerMap.get(name);
    return L ? L.items.filter((i) => i.part !== 'ink').map((i) => i.el) : [];
  }
  function clipPath(model, pose, name) {
    const p = new Path2D();
    for (const el of clipEls(model, name)) if (el.closed) p.addPath(pathOf(geometry(model, pose, el)));
    return p;
  }
  function inverse(path) {
    const p = new Path2D();
    p.rect(-1e5, -1e5, 2e5, 2e5);
    p.addPath(path);
    return p;
  }
  function cutPath(model, pose, el) {
    const p = new Path2D();
    for (const c of el.cuts) p.addPath(pathOf(geometry(model, pose, c)));
    return p;
  }

  // ---------- tinta: cor ou gradiente ----------
  function gradGeom(model, pose, el, g) {
    const f = el ? mapper(model, pose, el) : (x, y) => [x, y];
    let lx = (u) => u, ly = (v) => v, rs = 1;
    if (g.box) {
      const b = el ? localBox(el) : { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h };
      lx = (u) => b.x + u * b.w;
      ly = (v) => b.y + v * b.h;
      rs = (b.w + b.h) / 2;
    }
    if (g.type === 'linear') {
      const a = f(lx(g.p[0]), ly(g.p[1])), b = f(lx(g.p[2]), ly(g.p[3]));
      return { type: 'linear', x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
    }
    const cl = [lx(g.p[0]), ly(g.p[1])], rl = g.p[2] * rs;
    const c = f(cl[0], cl[1]), e = f(cl[0] + rl, cl[1]);
    const fo = g.p.length >= 5 ? f(lx(g.p[3]), ly(g.p[4])) : c;
    return { type: 'radial', cx: c[0], cy: c[1], r: Math.hypot(e[0] - c[0], e[1] - c[1]), fx: fo[0], fy: fo[1] };
  }
  function makeGradient(ctx, q, stops) {
    const gr = q.type === 'linear' ? ctx.createLinearGradient(q.x1, q.y1, q.x2, q.y2) : ctx.createRadialGradient(q.fx, q.fy, 0, q.cx, q.cy, Math.max(0.01, q.r));
    for (const s of stops) gr.addColorStop(s.at, s.c);
    return gr;
  }
  function paint(ctx, model, pose, el, spec) {
    if (!spec || typeof spec === 'string') return spec;
    return makeGradient(ctx, gradGeom(model, pose, el, spec), spec.stops);
  }
  // dentro do texto o contexto já está transformado: o gradiente vai para as coordenadas locais do texto
  function textGradGeom(el, spec) {
    let f;
    if (spec.box) { const b = textBox(el); f = (u, v) => [b.x + u * b.w, b.y + v * b.h]; } else {
      const inv = M.invert(M.mul(M.translate(el.at[0], el.at[1]), M.rotate(el.rot)));
      f = (x, y) => M.apply(inv, x, y);
    }
    const p = spec.p;
    if (spec.type === 'linear') { const a = f(p[0], p[1]), b = f(p[2], p[3]); return { type: 'linear', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }; }
    const c = f(p[0], p[1]), e = f(p[0] + p[2], p[1]);
    const fo = p.length >= 5 ? f(p[3], p[4]) : c;
    return { type: 'radial', cx: c[0], cy: c[1], r: Math.hypot(e[0] - c[0], e[1] - c[1]), fx: fo[0], fy: fo[1] };
  }
  function paintText(ctx, el, spec) {
    if (!spec || typeof spec === 'string') return spec;
    return makeGradient(ctx, textGradGeom(el, spec), spec.stops);
  }

  function fillBg(ctx, model, pose, rect, override) {
    const bg = override || model.canvas.bg;
    if (!bg) return;
    ctx.fillStyle = paint(ctx, model, pose, null, bg);
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  // ---------- desenho ----------
  function layerVisible(layer, pose, opts) {
    if (layer.hidden) return false;
    if (layer.guide && !opts.guides) return false;
    if (layer.only && !(pose.anim && layer.only.includes(pose.anim.name))) return false;
    return true;
  }

  function drawScene(ctx, model, pose, opts) {
    opts = opts || {};
    const filter = opts.filter;
    if (opts.background !== false) fillBg(ctx, model, pose, { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h });
    for (const layer of model.layers) {
      if (!layerVisible(layer, pose, opts)) continue;
      const lp = pose.lprops.get(layer.name);
      if (lp && lp.show === 0) continue;
      const alpha = layer.opacity * (lp && lp.opacity !== undefined ? lp.opacity : 1);
      if (alpha <= 0.001) continue;
      const items = filter ? layer.items.filter((it) => filter(it.el)) : layer.items;
      if (!items.length) continue;
      ctx.save();
      ctx.globalCompositeOperation = layer.blend;
      if (layer.clip) ctx.clip(clipPath(model, pose, layer.clip));
      if (layer.cut) ctx.clip(inverse(clipPath(model, pose, layer.cut)), 'evenodd');
      for (const it of items) drawItem(ctx, model, pose, it.el, it.part, layer, alpha);
      ctx.restore();
    }
  }

  function drawItem(ctx, model, pose, el, part, layer, base) {
    if (el.hidden) return;
    const pr = pose.props.get(el.id) || NOPROPS;
    if (pr.show === 0) return;
    const alpha = base * el.opacity * (pr.opacity !== undefined ? pr.opacity : 1);
    if (alpha <= 0.001) return;
    const fin = model.finish;
    ctx.globalAlpha = alpha;
    ctx.setLineDash([]);
    if (el.type === 'text') { drawText(ctx, model, pose, el, pr); return; }
    const g = geometry(model, pose, el);
    if (!g.segs.length) return;
    if (el.closed) {
      const fill = pr.c !== undefined ? pr.c : el.fill;
      const ink = pr.ink !== undefined ? pr.ink : el.ink;
      const inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
      const withInk = part !== 'fill' && ink > 0 && fin.style !== 'flat' && inkc;
      const cut = el.cuts ? cutPath(model, pose, el) : null;
      if (cut) { ctx.save(); ctx.clip(inverse(cut), 'evenodd'); }
      if (part !== 'ink' && fill) { ctx.fillStyle = paint(ctx, model, pose, el, fill); ctx.fill(pathOf(g)); }
      if (withInk) drawInk(ctx, model, pose, g, el, ink, inkc);
      if (cut) {
        ctx.restore();
        if (withInk) {
          // contorno dos buracos, só por dentro da forma
          ctx.save();
          ctx.clip(pathOf(g));
          ctx.strokeStyle = paint(ctx, model, pose, el, inkc);
          ctx.lineWidth = ink;
          ctx.lineJoin = 'round';
          ctx.stroke(cut);
          ctx.restore();
        }
      }
      return;
    }
    const color = pr.c !== undefined ? pr.c : el.color;
    if (!color) return;
    const w = pr.w !== undefined ? pr.w : el.w;
    ctx.fillStyle = ctx.strokeStyle = paint(ctx, model, pose, el, color);
    if (el.type === 'line') {
      ctx.lineWidth = w;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      if (el.dash) ctx.setLineDash(el.dash);
      ctx.stroke(pathOf(g));
      return;
    }
    if (layer.clip && !el.limb) ctx.globalAlpha *= fin.inner;
    if (el.limb) {
      const p = flatOf(g);
      const s = w / (el.w || 1);
      G.drawVar(ctx, p, G.taperWidths(p, el.limb[0] * s, el.limb[1] * s, [0, 0]));
    } else if (el.taper[0] > 0 || el.taper[1] > 0) {
      const p = flatOf(g);
      G.drawVar(ctx, p, G.taperWidths(p, w, w, el.taper));
    } else {
      ctx.lineWidth = w;
      ctx.lineCap = el.cap;
      ctx.lineJoin = 'round';
      ctx.stroke(pathOf(g));
    }
  }

  function drawInk(ctx, model, pose, g, el, ink, inkc) {
    ctx.fillStyle = ctx.strokeStyle = paint(ctx, model, pose, el, inkc);
    if (!(el.weight > 0)) {
      ctx.lineWidth = ink;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke(pathOf(g));
      return;
    }
    const p = flatOf(g);
    G.drawVar(ctx, p, G.inkWidths(p, ink, el.weight, model.canvas.light));
  }

  function drawText(ctx, model, pose, el, pr) {
    if (!el.str) return;
    const fill = pr.c !== undefined ? pr.c : el.fill;
    const ink = pr.ink !== undefined ? pr.ink : el.ink;
    const inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
    ctx.save();
    const m = textMatrix(pose, el);
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.font = textFont(el);
    ctx.textAlign = el.align;
    ctx.textBaseline = 'alphabetic';
    if (ink > 0 && inkc && model.finish.style !== 'flat') {
      ctx.lineWidth = ink * 2;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = paintText(ctx, el, inkc);
      ctx.strokeText(el.str, 0, 0);
    }
    if (fill) { ctx.fillStyle = paintText(ctx, el, fill); ctx.fillText(el.str, 0, 0); }
    ctx.restore();
  }

  // Imagem pronta de um quadro: escala, recorte e acabamento pixelado.
  function renderImage(model, pose, opts) {
    opts = opts || {};
    const scale = opts.scale || 1;
    const rect = opts.rect || { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h };
    const W2 = Math.max(1, Math.round(rect.w * scale)), H2 = Math.max(1, Math.round(rect.h * scale));
    const out = document.createElement('canvas');
    out.width = W2;
    out.height = H2;
    const octx = out.getContext('2d');
    const px = model.finish.pixel || 1;
    const draw = (ctx, s) => {
      ctx.setTransform(s, 0, 0, s, -rect.x * s, -rect.y * s);
      if (opts.transparent) drawScene(ctx, model, pose, { background: false, guides: opts.guides, filter: opts.filter });
      else {
        ctx.fillStyle = '#ffffff';
        if (!model.canvas.bg && !opts.matte) ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        fillBg(ctx, model, pose, rect, opts.matte);
        drawScene(ctx, model, pose, { background: false, guides: opts.guides, filter: opts.filter });
      }
      if (opts.after) opts.after(ctx, s);
    };
    if (px > 1) {
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.round(W2 / px));
      small.height = Math.max(1, Math.round(H2 / px));
      draw(small.getContext('2d'), scale / px);
      octx.imageSmoothingEnabled = false;
      octx.drawImage(small, 0, 0, W2, H2);
    } else {
      draw(octx, scale);
    }
    return out;
  }

  // ---------- pintura passo a passo (como no vídeo) ----------
  function buildPlan(model, opts) {
    opts = opts || {};
    const pose = makePose(model, null, 0);
    const order = [], seen = new Set();
    for (const layer of model.layers) {
      if (!layerVisible(layer, pose, opts)) continue;
      for (const it of layer.items) {
        if (seen.has(it.el.id) || it.el.hidden) continue;
        seen.add(it.el.id);
        const g = geometry(model, pose, it.el);
        if (!g.segs.length) continue;
        order.push({ el: it.el, len: it.el.type === 'text' ? 60 : G.polyLength(flatOf(g)) });
      }
    }
    const speed = opts.speed || 1;
    let t = 0;
    for (const o of order) {
      o.start = t;
      o.dur = Math.min(1.4, Math.max(0.18, Math.sqrt(o.len) / 22)) / speed;
      t += o.dur;
    }
    return { order, total: t, rank: new Map(order.map((o, i) => [o.el.id, i])) };
  }

  function buildState(plan, time) {
    let k = plan.order.length, t = 1;
    for (let i = 0; i < plan.order.length; i++) {
      const o = plan.order[i];
      if (time < o.start + o.dur) { k = i; t = Math.max(0, (time - o.start) / o.dur); break; }
    }
    return { k, t };
  }

  // Desenha o que já foi "pintado" até o tempo dado, mais o traço em andamento e o pincel laranja.
  function buildFilter(plan, time) {
    const st = buildState(plan, time);
    return { st, filter: (el) => { const r = plan.rank.get(el.id); return r !== undefined && r < st.k; } };
  }

  function drawTrace(ctx, model, pose, plan, st, zoom) {
    if (st.k >= plan.order.length) return;
    const el = plan.order[st.k].el;
    const g = geometry(model, pose, el);
    if (el.type === 'text') { const p = flatOf(g); drawPen(ctx, p[0], p[1], zoom || 1); return; }
    const p = G.polyPrefix(flatOf(g), st.t);
    if (p.length < 4) return;
    let w = 2, col = '#14141c';
    if (el.closed) { w = el.ink > 0 ? el.ink : 2.5; col = el.ink > 0 ? el.inkc : el.fill || col; } else if (el.limb) { w = el.limb[0]; col = el.color || col; } else { w = el.w; col = el.color || col; }
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = paint(ctx, model, pose, el, col);
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.stroke();
    drawPen(ctx, p[p.length - 2], p[p.length - 1], zoom || 1);
    ctx.restore();
  }

  function drawPen(ctx, x, y, zoom) {
    const r = 7 / zoom;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8a1f';
    ctx.fill();
    ctx.lineWidth = 2 / zoom;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }

  // Posição de uma alça (ponto editável) na pose atual.
  function handlePos(model, pose, rec, h) {
    if (rec.el && (h.kind === 'pt' || h.kind === 'tan' || h.kind === 'center' || h.kind === 'corner')) return mapper(model, pose, rec.el)(h.x, h.y);
    let p = rec.xf ? M.apply(rec.xf, h.x, h.y) : [h.x, h.y];
    if (h.kind === 'pivot' && h.bone) { const m = pose.bones.get(h.bone); if (m) p = M.apply(m, p[0], p[1]); } else if (h.kind === 'pivot' && h.cloth) {
      const c = model.cloths.get(h.cloth), m = c && c.bone ? pose.bones.get(c.bone) : null;
      if (m) p = M.apply(m, p[0], p[1]);
    } else if (h.kind === 'hip' && rec.el && rec.el.on) {
      const m = pose.bones.get(rec.el.on);
      if (m) p = M.apply(m, p[0], p[1]);
    }
    return p;
  }

  W.scene = {
    makePose, boneMatrices, geometry, drawScene, renderImage, buildPlan, buildState, buildFilter, drawTrace, drawPen, handlePos,
    flatOf, pathOf, layerVisible, mapper, textBox, textMatrix, textFont, localBox, gradGeom, textGradGeom, clipEls, findNamed, limbPoints, fillBg,
  };
})(window.Weasel = window.Weasel || {});
