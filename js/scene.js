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

  function boneValues(anim, b, f, springs, time) {
    if (!anim) return time === undefined ? REST : freeValues(b, time);
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
    if (b.jitter) { const q = Math.floor(f); v[0] += b.jitter * hash(b.name + 'x', q); v[1] += b.jitter * hash(b.name + 'y', q); }
    if (springs && springs.has(b.name)) v[2] += springs.get(b.name)[f];
    return v;
  }
  // Sem animação mas com relógio (filme): balanço, sobe-e-desce e tremor continuam, sem precisar fechar loop.
  function freeValues(b, t) {
    if (!b.sway && !b.bob && !b.jitter) return REST;
    const v = REST.slice();
    const wave = (w) => w[0] * Math.sin((2 * Math.PI * t) / w[1] + (w[2] * Math.PI) / 180);
    if (b.sway) v[2] += wave(b.sway);
    if (b.bob) v[1] += wave(b.bob);
    if (b.jitter) { const f = Math.floor(t * 12 + 1e-6); v[0] += b.jitter * hash(b.name + 'x', f); v[1] += b.jitter * hash(b.name + 'y', f); }
    return v;
  }

  function boneMatrices(model, anim, f, springs, time) {
    const out = new Map();
    const get = (name, depth) => {
      if (out.has(name)) return out.get(name);
      const b = model.bones.get(name);
      if (!b) return M.id();
      const v = boneValues(anim, b, f, springs, time);
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

    // Propriedades animadas (opacidade, cor, espessura, visibilidade, morph, efeitos, luzes, caixas).
    const props = [], lprops = [], liprops = [], bprops = [];
    for (let f = 0; f < N; f++) {
      const pm = new Map(), lm = new Map(), li = new Map(), bm = new Map();
      for (const tr of anim.ptracks.values()) {
        const s = segment(tr.keys, f, N, anim.loop);
        if (!s) continue;
        let v;
        if (tr.type === 'num' || tr.type === 'width' || tr.type === 'free') v = lerp(s.a.v, s.b.v, s.t);
        else if (tr.type === 'color') v = typeof s.a.v === 'string' && typeof s.b.v === 'string' ? G.lerpColor(s.a.v, s.b.v, s.t) : s.t < 1 ? s.a.v : s.b.v;
        else if (tr.type === 'step' || tr.type === 'order') v = s.a.v;
        else v = { from: s.a.v, to: s.b.v, t: s.t };
        // caixa numa animação sem loop: antes da primeira key vale o estado declarado (off = desligada)
        if (tr.kind === 'box' && !anim.loop && f < tr.keys[0].frame) continue;
        if (tr.kind === 'layer' || tr.kind === 'light' || tr.kind === 'box') {
          const map = tr.kind === 'layer' ? lm : tr.kind === 'light' ? li : bm;
          const o = map.get(tr.name) || {};
          o[tr.prop] = v;
          map.set(tr.name, o);
          continue;
        }
        for (const el of tr.targets) {
          const o = pm.get(el.id) || {};
          if (tr.type === 'shape') o.shape = { from: findNamed(model, v.from, el.inst), to: findNamed(model, v.to, el.inst), t: v.t };
          else o[tr.prop] = tr.type === 'width' ? v * el.ws : v;
          pm.set(el.id, o);
        }
      }
      props.push(pm);
      lprops.push(lm);
      liprops.push(li);
      bprops.push(bm);
    }
    d = { mats, cloth, props, lprops, liprops, bprops, springs };
    model._anim.set(anim.name, d);
    return d;
  }

  // Valores de cada osso (dx, dy, rot, sx, sy) num quadro que pode ser fracionário: o esqueleto do Godot
  // amostra entre os quadros. As molas, calculadas quadro a quadro, são interpoladas.
  function boneLocal(model, anim, f) {
    const d = animData(model, anim), N = anim.frames, out = new Map();
    const at = (i) => (anim.loop ? ((i % N) + N) % N : Math.max(0, Math.min(N - 1, i)));
    for (const b of model.bones.values()) {
      const v = boneValues(anim, b, f, null);
      const sp = d.springs.get(b.name);
      if (sp) { const i = Math.floor(f), t = f - i; v[2] += sp[at(i)] + (sp[at(i + 1)] - sp[at(i)]) * t; }
      out.set(b.name, v);
    }
    return out;
  }

  function makePose(model, animName, frame) {
    const anim = animName ? model.animMap.get(animName) || null : null;
    if (!anim) return { anim: null, frame: 0, bones: boneMatrices(model, null, 0, null), cloth: NONE, props: NONE, lprops: NONE, liprops: NONE, bprops: NONE, geo: new Map() };
    const d = animData(model, anim);
    const f = ((Math.round(frame) % anim.frames) + anim.frames) % anim.frames;
    return { anim, frame: f, bones: d.mats[f], cloth: d.cloth[f], props: d.props[f], lprops: d.lprops[f], liprops: d.liprops[f], bprops: d.bprops[f], geo: new Map() };
  }
  // Pose sem animação num instante (segundos) de um filme: partículas, balanços e tremulação andam com o relógio.
  function timePose(model, time) {
    return { anim: null, frame: 0, time, bones: boneMatrices(model, null, 0, null, time), cloth: NONE, props: NONE, lprops: NONE, liprops: NONE, bprops: NONE, geo: new Map() };
  }

  // ---------- caixas de colisão (jogo) ----------
  // Onde a caixa está nesta pose e se está ligada: segue a posição e a rotação do osso (não a escala);
  // only= liga só nessas animações; key caixa.show=0/1 liga e desliga quadro a quadro.
  function boxState(model, pose, b) {
    const bp = (pose.bprops && pose.bprops.get(b.name)) || NOPROPS;
    let on = bp.show !== undefined ? bp.show !== 0 : b.on;
    if (b.only && !(pose.anim ? b.only.includes(pose.anim.name) : b.only.includes('pose'))) on = false;
    const cx = b.shape === 'rect' ? b.x + b.w / 2 : b.x, cy = b.shape === 'rect' ? b.y + b.h / 2 : b.y;
    const m = b.bone ? pose.bones.get(b.bone) : null;
    const c = m ? M.apply(m, cx, cy) : [cx, cy];
    const rot = m ? (Math.atan2(m[1], m[0]) * 180) / Math.PI : 0;
    return { box: b, on, cx: c[0], cy: c[1], rot, shape: b.shape, w: b.w, h: b.h, r: b.r, kind: b.kind };
  }

  // Ponto de encaixe (point) nesta pose: segue a posição e a rotação do osso (graus).
  function pointState(model, pose, p) {
    const m = p.bone ? pose.bones.get(p.bone) : null;
    const c = m ? M.apply(m, p.x, p.y) : [p.x, p.y];
    return { point: p, x: c[0], y: c[1], rot: m ? (Math.atan2(m[1], m[0]) * 180) / Math.PI : 0 };
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
    else if (el.type === 'text') { const b = textBox(el); pts = [[el.at[0] + b.x, el.at[1] + b.y], [el.at[0] + b.x + b.w, el.at[1] + b.y + b.h]]; } else if (el.type === 'emitter') pts = [[el.at[0] - el.area[0] / 2, el.at[1] - el.area[1] / 2], [el.at[0] + el.area[0] / 2, el.at[1] + el.area[1] / 2]];
    else if (el.limb) pts = [el.hip, el.foot];
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
    } else if (el.type === 'emitter') {
      const f = mapper(model, pose, el);
      segs = G.ellipseSegs(el.at[0], el.at[1], 4, 4, 0).map((s) => G.mapSeg(s, f));
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
    if (spec.kind === 'pat') return spec.c;
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
    if (spec.kind === 'pat') return spec.c;
    return makeGradient(ctx, textGradGeom(el, spec), spec.stops);
  }

  function fillBg(ctx, model, pose, rect, override) {
    const bg = override || model.canvas.bg;
    if (!bg) return;
    ctx.fillStyle = paint(ctx, model, pose, null, bg);
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  // ---------- telas de rascunho e utilidades ----------
  const pool = new Map();
  function scratch(name, w, h) {
    let c = pool.get(name);
    if (!c) { c = document.createElement('canvas'); pool.set(name, c); }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    if (canFilter()) x.filter = 'none';
    x.shadowColor = 'rgba(0,0,0,0)';
    x.shadowBlur = 0;
    x.clearRect(0, 0, w, h);
    return { canvas: c, ctx: x };
  }
  const matOf = (ctx) => { const t = ctx.getTransform(); return [t.a, t.b, t.c, t.d, t.e, t.f]; };
  const setMat = (ctx, m) => ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  const scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
  const c255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const rgbStr = (rgb, k) => `rgb(${c255(rgb[0] * k)},${c255(rgb[1] * k)},${c255(rgb[2] * k)})`;
  const rgbaStr = (rgb, a) => `rgba(${c255(rgb[0])},${c255(rgb[1])},${c255(rgb[2])},${Math.max(0, Math.min(1, a))})`;
  let filterOk = null;
  function canFilter() {
    if (filterOk === null) {
      try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; filterOk = c.filter === 'blur(2px)'; } catch (e) { filterOk = false; }
    }
    return filterOk;
  }
  function segsBox(segs) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of segs) for (let i = 0; i < 8; i += 2) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); }
    return x0 === Infinity ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function inverseShift(segs, dx, dy) {
    return G.toPath(segs.map((s) => s.map((v, i) => v + (i % 2 ? dy : dx))), true);
  }

  // ---------- luz ----------
  // Luzes desta pose: posição (com osso), propriedades animadas e tremulação.
  function sceneLights(model, pose) {
    if (!model.lights.size && !model.ambient) return null;
    const amb = model.ambient || { c: '#ffffff', power: 0.6 };
    const lights = [];
    for (const L of model.lights.values()) {
      const lp = pose.liprops.get(L.name) || NOPROPS;
      let power = lp.power !== undefined ? lp.power : L.power;
      if (L.flicker && pose.anim) power *= Math.max(0, 1 + L.flicker * hash(L.name, pose.frame));
      else if (L.flicker && pose.time !== undefined) power *= Math.max(0, 1 + L.flicker * hash(L.name, Math.floor(pose.time * 12 + 1e-6)));
      const c = typeof lp.c === 'string' ? lp.c : L.c;
      const o = {
        name: L.name, type: L.type, c, rgb: G.parseHex(c) || [255, 255, 255, 1], power,
        radius: Math.max(1, lp.radius !== undefined ? lp.radius : L.radius), glow: lp.glow !== undefined ? lp.glow : L.glow,
        aim: lp.aim !== undefined ? lp.aim : L.aim, cone: lp.cone !== undefined ? lp.cone : L.cone, x: L.x, y: L.y, dx: L.dx, dy: L.dy,
      };
      if (L.bone) {
        const m = pose.bones.get(L.bone);
        if (m) { const p = M.apply(m, L.x, L.y); o.x = p[0]; o.y = p[1]; o.aim += (Math.atan2(m[1], m[0]) * 180) / Math.PI; }
      }
      o.rim = L.rim || 0;
      if (power > 0) lights.push(o);
    }
    const rimW = Math.max(0, ...lights.map((l) => l.rim));
    return { amb: { rgb: G.parseHex(amb.c) || [255, 255, 255, 1], power: amb.power }, lights, rim: rimW > 0 ? { c: null, w: rimW } : null };
  }
  // quanto a luz chega num ponto (v = direção da luz até o ponto, só para o spot)
  function spotFactor(L, vx, vy) {
    const a = (L.aim * Math.PI) / 180;
    const ang = (Math.acos(Math.max(-1, Math.min(1, vx * Math.cos(a) + vy * Math.sin(a)))) * 180) / Math.PI;
    return ang <= L.cone ? 1 : ang <= L.cone * 1.25 ? 0.35 : 0;
  }
  function lightWeight(L, x, y) {
    if (L.type === 'dir') return L.power * 0.6;
    const dx = x - L.x, dy = y - L.y, d = Math.hypot(dx, dy);
    if (d >= L.radius) return 0;
    const f = 1 - d / L.radius;
    let w = L.power * f * f;
    if (L.type === 'spot' && d > 1e-6) w *= spotFactor(L, dx / d, dy / d);
    return w;
  }
  // de onde vem a luz num ponto: direção dominante, intensidade e cor
  function lightAt(lighting, x, y) {
    let sx = 0, sy = 0, I = 0, r = 0, g = 0, b = 0;
    for (const L of lighting.lights) {
      const w = lightWeight(L, x, y);
      if (w <= 0) continue;
      let ux, uy;
      if (L.type === 'dir') { const l = Math.hypot(L.dx, L.dy) || 1; ux = L.dx / l; uy = L.dy / l; } else { const l = Math.hypot(L.x - x, L.y - y) || 1; ux = (L.x - x) / l; uy = (L.y - y) / l; }
      sx += ux * w; sy += uy * w; I += w;
      r += L.rgb[0] * w; g += L.rgb[1] * w; b += L.rgb[2] * w;
    }
    if (I <= 0) return null;
    const l = Math.hypot(sx, sy);
    return { I, ux: l > 1e-9 ? sx / l : 0, uy: l > 1e-9 ? sy / l : 0, dir: l / I, rgb: [r / I, g / I, b / I] };
  }
  // overlay: escurece o escuro e clareia o claro; 0.5 não muda nada
  const overlay = (b, s) => (b < 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s));
  const ADD = 0.6; // força do brilho perto das luzes (passo em overlay)
  // cor de algo pequeno (traço, contorno, texto, partícula): a luz daquele ponto, igual ao mapa de luz
  function litColor(spec, lighting, x, y, noAdd) {
    if (typeof spec !== 'string') return spec;
    const c = G.parseHex(spec);
    if (!c) return spec;
    const a = lighting.amb;
    let r = a.rgb[0] * a.power, g = a.rgb[1] * a.power, b = a.rgb[2] * a.power, ar = 0, ag = 0, ab = 0;
    for (const L of lighting.lights) {
      const w = lightWeight(L, x, y);
      if (w <= 0) continue;
      r += L.rgb[0] * w; g += L.rgb[1] * w; b += L.rgb[2] * w;
      ar += L.rgb[0] * w; ag += L.rgb[1] * w; ab += L.rgb[2] * w;
    }
    const out = [c[0] * Math.min(255, r) / 255, c[1] * Math.min(255, g) / 255, c[2] * Math.min(255, b) / 255].map((v, i) => {
      if (noAdd) return v;
      const s = 0.5 + 0.5 * Math.min(255, [ar, ag, ab][i] * 0.5) / 255;
      const o = overlay(v / 255, s) * 255;
      return v + (o - v) * ADD;
    });
    return G.toHex([out[0], out[1], out[2], c[3]]);
  }

  const FALL = [[0, 1], [0.25, 0.5625], [0.5, 0.25], [0.75, 0.0625], [1, 0]];
  function paintLight(x, L) {
    if (L.type === 'dir') {
      x.save();
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = rgbStr(L.rgb, L.power * 0.6);
      x.fillRect(0, 0, x.canvas.width, x.canvas.height);
      x.restore();
      return;
    }
    const grad = (k) => {
      const g = x.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.radius);
      for (const [t, f] of FALL) g.addColorStop(t, rgbStr(L.rgb, L.power * f * k));
      return g;
    };
    if (L.type === 'point') { x.fillStyle = grad(1); x.fillRect(L.x - L.radius, L.y - L.radius, 2 * L.radius, 2 * L.radius); return; }
    const a = (L.aim * Math.PI) / 180;
    for (const [w, k] of [[1.25, 0.35], [1, 0.65]]) {
      const half = Math.min(Math.PI, (L.cone * w * Math.PI) / 180);
      x.save();
      x.beginPath();
      x.moveTo(L.x, L.y);
      x.arc(L.x, L.y, L.radius, a - half, a + half);
      x.closePath();
      x.clip();
      x.fillStyle = grad(k);
      x.fillRect(L.x - L.radius, L.y - L.radius, 2 * L.radius, 2 * L.radius);
      x.restore();
    }
  }
  // Mapa de luz (ambiente + luzes) e mapa só das luzes, no tamanho e na transformação da tela de destino.
  function lightMaps(R, ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height, m = matOf(ctx);
    const key = `${W}x${H}:${m.join(',')}`;
    if (R.maps && R.maps.key === key) return R.maps;
    const lm = scratch('lm', W, H), add = scratch('lmadd', W, H);
    lm.ctx.fillStyle = rgbStr(R.lighting.amb.rgb, R.lighting.amb.power);
    lm.ctx.fillRect(0, 0, W, H);
    // mapa do brilho: cinza 50% (neutro no overlay) + metade da luz
    add.ctx.fillStyle = 'rgb(128,128,128)';
    add.ctx.fillRect(0, 0, W, H);
    for (const [x, k] of [[lm.ctx, 1], [add.ctx, 0.5]]) {
      setMat(x, m);
      x.globalCompositeOperation = 'lighter';
      for (const L of R.lighting.lights) paintLight(x, k === 1 ? L : Object.assign({}, L, { power: L.power * k }));
    }
    R.maps = { key, lm: lm.canvas, add: add.canvas };
    return R.maps;
  }
  // Ilumina o que já foi pintado dentro do contorno de uma forma (só na caixa dela, para ser rápido).
  function lightRaster(ctx, R, path, bb, alpha) {
    const maps = lightMaps(R, ctx), m = matOf(ctx);
    const pts = [M.apply(m, bb.x, bb.y), M.apply(m, bb.x + bb.w, bb.y), M.apply(m, bb.x, bb.y + bb.h), M.apply(m, bb.x + bb.w, bb.y + bb.h)];
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[0]))) - 2), x1 = Math.min(W, Math.ceil(Math.max(...pts.map((p) => p[0]))) + 2);
    const y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1]))) - 2), y1 = Math.min(H, Math.ceil(Math.max(...pts.map((p) => p[1]))) + 2);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.save();
    ctx.clip(path);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(maps.lm, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = alpha * ADD;
    ctx.drawImage(maps.add, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
  }
  // Lado da forma virado para a luz mais claro, lado oposto mais escuro.
  function shadeShape(ctx, R, path, bb, layer, alpha) {
    const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
    const la = lightAt(R.lighting, cx, cy);
    if (!la) return;
    const k = layer.shade * Math.min(1, la.I) * la.dir;
    if (k < 0.01) return;
    const half = Math.abs(la.ux) * bb.w / 2 + Math.abs(la.uy) * bb.h / 2 || 1;
    const p0 = [cx - la.ux * half, cy - la.uy * half], p1 = [cx + la.ux * half, cy + la.uy * half];
    // lado longe da luz: multiplica por escuro; lado da luz: overlay com a cor da luz (o escuro continua escuro)
    const dark = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
    dark.addColorStop(0, `rgba(0,0,0,${Math.min(0.85, 0.55 * k)})`);
    dark.addColorStop(0.55, 'rgba(0,0,0,0)');
    const lite = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
    lite.addColorStop(0.45, rgbaStr(la.rgb, 0));
    lite.addColorStop(1, rgbaStr(la.rgb, Math.min(0.9, 0.6 * k)));
    ctx.save();
    ctx.clip(path);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = dark;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = lite;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    ctx.restore();
  }
  // Fio de luz na borda virada para a luz (a forma menos ela mesma deslocada para longe da luz).
  // Vem do rim= da camada ou das luzes com rim= (aí na cor da própria luz).
  function rimShape(ctx, R, el, g, path, bb, rim, alpha) {
    const la = lightAt(R.lighting, bb.x + bb.w / 2, bb.y + bb.h / 2);
    if (!la || la.dir < 0.05) return;
    const w = rim.w * (el.ws || 1);
    ctx.save();
    ctx.clip(path);
    ctx.clip(inverse(inverseShift(g.segs, -la.ux * w, -la.uy * w)), 'evenodd');
    ctx.globalAlpha = alpha * Math.min(1, la.I) * Math.min(1, la.dir * 1.3);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rim.c || rgbaStr(la.rgb.map((v) => Math.min(255, v * 1.15 + 30)), 1);
    ctx.fillRect(bb.x - w, bb.y - w, bb.w + 2 * w, bb.h + 2 * w);
    ctx.restore();
  }
  // halo visível das lâmpadas (glow=)
  function drawLightGlows(ctx, lighting) {
    for (const L of lighting.lights) {
      if (L.type === 'dir' || !(L.glow > 0)) continue;
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.glow);
      g.addColorStop(0, rgbaStr(L.rgb, 0.75 * Math.min(1.3, L.power)));
      g.addColorStop(0.3, rgbaStr(L.rgb, 0.28 * Math.min(1.3, L.power)));
      g.addColorStop(1, rgbaStr(L.rgb, 0));
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(L.x - L.glow, L.y - L.glow, 2 * L.glow, 2 * L.glow);
      ctx.restore();
    }
  }

  // ---------- sombra projetada ----------
  function groundY(model, pose, ground, x) {
    const p = flatOf(geometry(model, pose, ground));
    let best = null, bd = Infinity;
    for (let i = 0; i < p.length - 2; i += 2) {
      const ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3];
      if ((x >= ax && x <= bx) || (x >= bx && x <= ax)) return ax === bx ? ay : ay + ((by - ay) * (x - ax)) / (bx - ax);
      const d = Math.min(Math.abs(ax - x), Math.abs(bx - x));
      if (d < bd) { bd = d; best = Math.abs(ax - x) < Math.abs(bx - x) ? ay : by; }
    }
    return best === null ? model.canvas.h : best;
  }
  function itemsBox(model, pose, items) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const it of items) {
      if (it.el.hidden) continue;
      const b = segsBox(geometry(model, pose, it.el).segs);
      if (!b.w && !b.h) continue;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    }
    return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // de quem é a silhueta: a própria camada ou as camadas de from=
  const castSources = (layer, items) => (layer.cast.from ? layer.cast.from.map((L) => ({ layer: L, items: L.items })) : [{ layer, items }]);
  // Para cada luz: matriz que achata a silhueta no chão, inclinada para longe da luz, e a força da sombra.
  function castShadows(model, pose, lighting, layer, items) {
    const bb = itemsBox(model, pose, castSources(layer, items).flatMap((s) => s.items));
    if (!bb) return [];
    const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
    const y0 = groundY(model, pose, layer.cast.ground, cx);
    const out = [];
    for (const L of lighting.lights) {
      let sx, I;
      if (L.type === 'dir') {
        if (L.dy >= -0.05) continue;
        sx = Math.max(-3, Math.min(3, L.dx / L.dy));
        I = L.power * 0.6;
      } else {
        const H0 = y0 - L.y;
        if (H0 <= 10) continue;
        sx = Math.max(-3, Math.min(3, (cx - L.x) / H0));
        I = lightWeight(L, cx, cy);
      }
      if (I < 0.02) continue;
      // x' = x + sx·(chão − y): inclina para longe da luz;  y' = chão + k·(chão − y): deita no chão, para a frente
      const k = 0.28;
      // a sombra continua visível enquanto a luz é perceptível (queda mais suave que a da luz)
      out.push({ A: [1, 0, -sx, -k, sx * y0, (1 + k) * y0], opacity: layer.cast.opacity * Math.min(1, Math.sqrt(I / 0.35)) });
    }
    return out;
  }
  function drawCast(ctx, R, layer, items, alpha) {
    const casts = castShadows(R.model, R.pose, R.lighting, layer, items);
    if (!casts.length) return;
    const W = ctx.canvas.width, H = ctx.canvas.height, m = matOf(ctx), s = scaleOf(m);
    const T = scratch('cast', W, H);
    setMat(T.ctx, m);
    for (const s of castSources(layer, items)) {
      if (layerVisible(s.layer, R.pose, R.opts)) drawLayer(T.ctx, R, s.layer, s.items, 1, false, R.pose, true, true);
    }
    T.ctx.setTransform(1, 0, 0, 1, 0, 0);
    T.ctx.globalCompositeOperation = 'source-in';
    T.ctx.fillStyle = '#000';
    T.ctx.fillRect(0, 0, W, H);
    const inv = M.invert(m);
    for (const c of casts) {
      ctx.save();
      setMat(ctx, M.mul(m, M.mul(c.A, inv)));
      ctx.globalAlpha = alpha * c.opacity;
      ctx.globalCompositeOperation = 'source-over';
      if (layer.cast.blur > 0 && canFilter()) ctx.filter = `blur(${(layer.cast.blur * s).toFixed(1)}px)`;
      ctx.drawImage(T.canvas, 0, 0);
      ctx.restore();
    }
  }

  // ---------- partículas ----------
  const hash01 = (seed, i, k) => (hash(`${seed}:${k}`, i) + 1) / 2;
  // Estado das partículas num quadro. O sorteio depende só do número da partícula: o loop fecha
  // certinho e a exportação sai igual toda vez.
  function particles(model, pose, el) {
    const anim = pose.anim;
    const fps = anim ? anim.fps : 12;
    const loopD = anim && anim.loop ? anim.frames / anim.fps : 0;
    const t = anim ? pose.frame / anim.fps : pose.time !== undefined ? pose.time : el.rate > 0 ? el.life * 1.25 : el.life * 0.35;
    const data = anim ? animData(model, anim) : null;
    const out = [];
    const origin = (ts, k) => {
      let x = el.at[0] + (hash01(el.seed, k, 4) - 0.5) * el.area[0], y = el.at[1] + (hash01(el.seed, k, 5) - 0.5) * el.area[1];
      if (el.xf) { const q = M.apply(el.xf, x, y); x = q[0]; y = q[1]; }
      let bm = null;
      if (el.bone) {
        if (data) {
          let f = Math.floor(ts * fps + 1e-6);
          f = anim.loop ? ((f % anim.frames) + anim.frames) % anim.frames : Math.max(0, Math.min(anim.frames - 1, f));
          bm = data.mats[f].get(el.bone);
        } else bm = pose.bones.get(el.bone);
      }
      return bm ? M.apply(bm, x, y) : [x, y];
    };
    const spawn = (k, ts) => {
      const age = t - ts;
      const life = el.life * (0.75 + 0.5 * hash01(el.seed, k, 1));
      if (age < 0 || age > life) return;
      const ang = ((el.angle + (hash01(el.seed, k, 2) - 0.5) * el.spread) * Math.PI) / 180;
      const sp = el.speed * (0.7 + 0.6 * hash01(el.seed, k, 3));
      const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
      const o = origin(ts, k);
      const d = el.drag, fd = d > 0 ? (1 - Math.exp(-d * age)) / d : age, e = d > 0 ? Math.exp(-d * age) : 1;
      const u = age / life;
      out.push({
        x: o[0] + vx * fd + 0.5 * el.wind * age * age, y: o[1] + vy * fd + 0.5 * el.gravity * age * age,
        vx: vx * e + el.wind * age, vy: vy * e + el.gravity * age, u, size: lerp(el.size[0], el.size[1], u),
        color: G.lerpColor(el.colors[0], el.colors[1], u), spin: hash01(el.seed, k, 6) * Math.PI,
      });
    };
    if (el.rate > 0) {
      let rate = el.rate, N = 0;
      if (loopD) { N = Math.max(1, Math.round(rate * loopD)); rate = N / loopD; }
      const i0 = Math.ceil((t - el.life * 1.25) * rate), i1 = Math.floor(t * rate + 1e-9);
      for (let i = i0; i <= i1; i++) spawn(N ? ((i % N) + N) % N : i, i / rate);
    }
    if (el.burst > 0) {
      const tb = loopD ? t % loopD : t;
      for (let j = 0; j < el.burst; j++) spawn(100000 + j, t - tb);
    }
    return out;
  }
  function drawParticles(ctx, model, pose, el, alpha, R) {
    const base = ctx.globalAlpha;
    for (const p of particles(model, pose, el)) {
      if (p.size <= 0.05) continue;
      let col = p.color;
      if (R) col = litColor(col, R.lighting, p.x, p.y);
      const c = G.parseHex(col);
      if (!c || c[3] <= 0.004) continue;
      const rgb = `rgb(${c255(c[0])},${c255(c[1])},${c255(c[2])})`;
      ctx.globalAlpha = alpha * c[3];
      const r = p.size / 2;
      switch (el.pshape) {
        case 'soft': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
          g.addColorStop(0, rgb);
          g.addColorStop(1, `rgba(${c255(c[0])},${c255(c[1])},${c255(c[2])},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(p.x - r * 2, p.y - r * 2, r * 4, r * 4);
          break;
        }
        case 'square':
          ctx.fillStyle = rgb;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
          break;
        case 'streak': {
          const v = Math.hypot(p.vx, p.vy) || 1, len = p.size * 4;
          ctx.strokeStyle = rgb;
          ctx.lineWidth = Math.max(0.6, p.size * 0.35);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x - (p.vx / v) * len, p.y - (p.vy / v) * len);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          break;
        }
        case 'star':
          ctx.fillStyle = rgb;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = p.spin + (i * Math.PI) / 4, rr = i % 2 ? r * 0.35 : r * 1.2;
            if (i) ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); else ctx.moveTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
          break;
        default:
          ctx.fillStyle = rgb;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
      }
    }
    ctx.globalAlpha = base;
  }

  // ---------- hachura e pontos ----------
  // Linhas geradas no espaço da própria forma, então acompanham osso, componente e tecido.
  function patternLines(model, pose, el, pat) {
    const f = mapper(model, pose, el), b = localBox(el);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R0 = Math.hypot(b.w, b.h) / 2 + pat.gap;
    const lines = [], dots = [];
    if (pat.type === 'hatch') {
      for (const ang of pat.cross ? [pat.angle, pat.angle + 90] : [pat.angle]) {
        const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
        for (let k = -R0; k <= R0; k += pat.gap) lines.push([f(cx + nx * k - dx * R0, cy + ny * k - dy * R0), f(cx + nx * k + dx * R0, cy + ny * k + dy * R0)]);
      }
    } else {
      const a = (pat.angle * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      let row = 0;
      for (let j = -R0; j <= R0; j += pat.gap * 0.866, row++) {
        for (let i = -R0 + (row % 2 ? pat.gap / 2 : 0); i <= R0; i += pat.gap) dots.push(f(cx + dx * i + nx * j, cy + dy * i + ny * j));
      }
    }
    return { lines, dots };
  }
  function drawPattern(ctx, model, pose, el, g, pat) {
    const path = pathOf(g);
    ctx.save();
    ctx.clip(path);
    if (pat.bg) { ctx.fillStyle = pat.bg; ctx.fill(path); }
    const { lines, dots } = patternLines(model, pose, el, pat);
    ctx.strokeStyle = ctx.fillStyle = pat.c;
    if (lines.length) {
      ctx.lineWidth = pat.w * (el.ws || 1);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      for (const [a, b] of lines) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
    }
    if (dots.length) {
      // em lotes pequenos: um caminho só com milhares de círculos fica lento demais no terminal
      const r = pat.r * (el.ws || 1);
      for (let i = 0; i < dots.length; i += 48) {
        ctx.beginPath();
        for (const d of dots.slice(i, i + 48)) { ctx.moveTo(d[0] + r, d[1]); ctx.arc(d[0], d[1], r, 0, Math.PI * 2); }
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- desenho ----------
  function layerVisible(layer, pose, opts) {
    if (layer.hidden) return false;
    if (layer.guide && !opts.guides) return false;
    // only=: só nessas animações; o nome pose vale para a pose parada (sem animação)
    if (layer.only && !(pose.anim ? layer.only.includes(pose.anim.name) : layer.only.includes('pose'))) return false;
    return true;
  }

  const FX_KEYS = ['blur', 'glow', 'tint', 'brightness', 'saturate', 'contrast', 'hue'];
  // efeitos da camada nesta pose (os animados por key substituem os do código)
  function layerFx(layer, lp) {
    let fx = layer.fx;
    for (const k of FX_KEYS) if (lp[k] !== undefined) { if (fx === layer.fx) fx = Object.assign({}, layer.fx); fx[k] = lp[k]; }
    if (!fx) return null;
    const on = (k) => fx[k] !== undefined && fx[k] !== 1;
    return fx.blur > 0 || fx.glow > 0 || fx.tint > 0 || fx.shadow || on('brightness') || on('saturate') || on('contrast') || fx.hue ? fx : null;
  }
  function filterString(fx, s) {
    const f = [];
    if (fx.blur > 0) f.push(`blur(${(fx.blur * s).toFixed(2)}px)`);
    if (fx.brightness !== undefined && fx.brightness !== 1) f.push(`brightness(${fx.brightness})`);
    if (fx.contrast !== undefined && fx.contrast !== 1) f.push(`contrast(${fx.contrast})`);
    if (fx.saturate !== undefined && fx.saturate !== 1) f.push(`saturate(${fx.saturate})`);
    if (fx.hue) f.push(`hue-rotate(${fx.hue}deg)`);
    return f.join(' ');
  }
  // desfoque sem ctx.filter: diminui e aumenta de novo
  function softBlur(src, px) {
    const k = Math.max(1, Math.min(24, px / 1.5));
    const w = Math.max(1, Math.round(src.width / k)), h = Math.max(1, Math.round(src.height / k));
    const a = scratch('blurA', w, h);
    a.ctx.imageSmoothingEnabled = true;
    a.ctx.drawImage(src, 0, 0, w, h);
    const b = scratch('blurB', src.width, src.height);
    b.ctx.imageSmoothingEnabled = true;
    b.ctx.drawImage(a.canvas, 0, 0, src.width, src.height);
    return b.canvas;
  }

  // ---------- ordem de pintura ----------
  // key forma.above=outra / below=outra: a forma é pintada logo depois (ou antes) da outra, na mesma camada.
  // Sem nenhuma mudança, devolve a própria lista (a ordem do arquivo).
  function orderItems(items, pose) {
    const pm = pose.props;
    if (!pm || !pm.size) return items;
    let moved = null;
    for (const it of items) { const o = pm.get(it.el.id); if (o && o.order) (moved || (moved = [])).push(it); }
    if (!moved) return items;
    const out = items.filter((it) => !moved.includes(it));
    for (const it of moved) {
      const o = pm.get(it.el.id).order, hits = [];
      out.forEach((x, i) => { if (x.el.name === o.target) hits.push(i); });
      // num componente, a outra forma da mesma cópia
      const mine = hits.filter((i) => out[i].el.inst === it.el.inst);
      const at = mine.length ? mine : hits;
      if (!at.length) out.splice(Math.min(items.indexOf(it), out.length), 0, it);
      else out.splice(o.rel === 'above' ? at[at.length - 1] + 1 : at[0], 0, it);
    }
    return out;
  }
  // key camada.above=outra / below=outra: a camada inteira muda de lugar.
  function orderLayers(model, pose) {
    const lp = pose.lprops;
    if (!lp || !lp.size) return model.layers;
    let moved = null;
    for (const [name, o] of lp) if (o.order) { const Ly = model.layerMap.get(name); if (Ly) (moved || (moved = [])).push(Ly); }
    if (!moved) return model.layers;
    const out = model.layers.filter((Ly) => !moved.includes(Ly));
    for (const Ly of moved) {
      const o = lp.get(Ly.name).order, t = out.findIndex((x) => x.name === o.target);
      if (t < 0) out.splice(Math.min(model.layers.indexOf(Ly), out.length), 0, Ly);
      else out.splice(o.rel === 'above' ? t + 1 : t, 0, Ly);
    }
    return out;
  }

  // opts.items: só esses itens das camadas (o esqueleto do Godot desenha cada peça à parte);
  // opts.layers: só essas camadas (filme: cada profundidade é desenhada à parte);
  // opts.lighting: luz pronta (filme: a do ator mais a da cena); opts.glows=false: sem os halos das lâmpadas.
  function drawScene(ctx, model, pose, opts) {
    opts = opts || {};
    if (opts.background !== false) fillBg(ctx, model, pose, { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h });
    const lighting = opts.lighting !== undefined ? opts.lighting : sceneLights(model, pose);
    const R = { model, pose, opts, lighting, maps: null };
    for (const layer of orderLayers(model, pose)) {
      // com opts.layers, quem chama já decidiu o que aparece (no filme, only= também aceita shots)
      if (opts.layers ? !opts.layers.has(layer) : !layerVisible(layer, pose, opts)) continue;
      const lp = pose.lprops.get(layer.name) || NOPROPS;
      if (lp.show === 0) continue;
      const alpha = layer.opacity * (lp.opacity !== undefined ? lp.opacity : 1);
      if (alpha <= 0.001) continue;
      const items = orderItems(opts.items ? layer.items.filter((it) => opts.items.has(it)) : opts.filter ? layer.items.filter((it) => opts.filter(it.el)) : layer.items, pose);
      if (layer.cast && lighting) drawCast(ctx, R, layer, items, alpha);
      if (!items.length) continue;
      const lit = !!lighting && !layer.unlit && !layer.guide;
      const fx = layerFx(layer, lp);
      if (fx || (layer.trail && pose.anim)) drawFxLayer(ctx, R, layer, items, alpha, lit, fx || {});
      else drawLayer(ctx, R, layer, items, alpha, lit, pose, false);
    }
    if (lighting && opts.glows !== false) drawLightGlows(ctx, lighting);
  }

  function drawLayer(ctx, R, layer, items, alpha, lit, pose, solo, flat) {
    ctx.save();
    if (!solo) ctx.globalCompositeOperation = layer.blend;
    if (layer.clip) ctx.clip(clipPath(R.model, pose, layer.clip));
    if (layer.cut) ctx.clip(inverse(clipPath(R.model, pose, layer.cut)), 'evenodd');
    for (const it of items) drawItem(ctx, R.model, pose, it.el, it.part, layer, alpha, lit ? R : null, flat);
    ctx.restore();
  }

  // Camada com efeitos: desenhada à parte e aplicada de uma vez (sombra, brilho, cor, desfoque, rastro).
  function drawFxLayer(ctx, R, layer, items, alpha, lit, fx) {
    const { model, pose } = R;
    const W = ctx.canvas.width, H = ctx.canvas.height, m = matOf(ctx), s = scaleOf(m);
    const T = scratch('fx', W, H);
    if (layer.trail && pose.anim) {
      for (let k = layer.trail.n; k >= 1; k--) {
        const U = scratch('trail', W, H);
        setMat(U.ctx, m);
        drawLayer(U.ctx, R, layer, items, 1, lit, makePose(model, pose.anim.name, pose.frame - k), true);
        if (layer.trail.c) {
          U.ctx.setTransform(1, 0, 0, 1, 0, 0);
          U.ctx.globalCompositeOperation = 'source-atop';
          U.ctx.globalAlpha = 0.65;
          U.ctx.fillStyle = layer.trail.c;
          U.ctx.fillRect(0, 0, W, H);
        }
        T.ctx.globalAlpha = Math.pow(layer.trail.decay, k);
        T.ctx.drawImage(U.canvas, 0, 0);
        T.ctx.globalAlpha = 1;
      }
    }
    setMat(T.ctx, m);
    drawLayer(T.ctx, R, layer, items, 1, lit, pose, true);
    T.ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (fx.tint > 0 && fx.tintc) {
      T.ctx.globalCompositeOperation = 'source-atop';
      T.ctx.globalAlpha = Math.min(1, fx.tint);
      T.ctx.fillStyle = fx.tintc;
      T.ctx.fillRect(0, 0, W, H);
      T.ctx.globalCompositeOperation = 'source-over';
      T.ctx.globalAlpha = 1;
    }
    let img = T.canvas;
    const filt = filterString(fx, s);
    if (!canFilter() && fx.blur > 0) img = softBlur(img, fx.blur * s);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = layer.blend;
    const big = W + H + 100;
    // só a sombra/brilho: a imagem vai para fora da tela e o deslocamento traz a sombra de volta
    if (fx.shadow) {
      ctx.shadowColor = fx.shadow.c;
      ctx.shadowBlur = fx.shadow.b * s;
      ctx.shadowOffsetX = big + fx.shadow.dx * s;
      ctx.shadowOffsetY = fx.shadow.dy * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, -big, 0);
    }
    if (fx.glow > 0) {
      const strength = fx.glows !== undefined ? fx.glows : 1;
      for (let i = 0; i < Math.ceil(strength); i++) {
        ctx.shadowColor = fx.glowc || '#ffffff';
        ctx.shadowBlur = fx.glow * s;
        ctx.shadowOffsetX = big;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = alpha * Math.min(1, strength - i);
        ctx.drawImage(img, -big, 0);
      }
    }
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
    if (filt && canFilter()) ctx.filter = filt;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  function glowOn(ctx, emit) {
    ctx.shadowColor = emit.c;
    ctx.shadowBlur = 16 * emit.s * scaleOf(matOf(ctx));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  function glowOff(ctx) { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; }

  // ---------- desenhar aos poucos (key forma.draw=0 … 1) ----------
  // Traços e contornos andam do começo ao fim; numa forma fechada, o preenchimento aparece no fim.
  const DRAW_LINE = 0.8, DRAW_FILL = 0.6;
  const drawParts = (d) => ({ line: Math.min(1, d / DRAW_LINE), fill: Math.max(0, Math.min(1, (d - DRAW_FILL) / (1 - DRAW_FILL))) });
  function strokePoly(ctx, q, w, cap) {
    ctx.lineWidth = w;
    ctx.lineCap = cap;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(q[0], q[1]);
    for (let i = 2; i < q.length; i += 2) ctx.lineTo(q[i], q[i + 1]);
    ctx.stroke();
  }
  // o começo (t de 0 a 1) de um traço com espessura variável: as espessuras são as do traço inteiro
  function drawVarPart(ctx, p, widths, t) {
    const q = G.polyPrefix(p, t);
    if (q.length >= 4) G.drawVar(ctx, q, widths.slice(0, q.length / 2));
  }

  // R: iluminação da camada (null = sem luz). flat: só a silhueta (sombra projetada), sem brilho próprio.
  function drawItem(ctx, model, pose, el, part, layer, base, R, flat) {
    if (el.hidden) return;
    const pr = pose.props.get(el.id) || NOPROPS;
    if (pr.show === 0) return;
    const alpha = base * el.opacity * (pr.opacity !== undefined ? pr.opacity : 1);
    if (alpha <= 0.001) return;
    const dr = pr.draw !== undefined ? Math.max(0, Math.min(1, pr.draw)) : 1;
    if (dr <= 0.001) return;
    const fin = model.finish;
    const L = R && !el.emit ? R : null; // o que emite luz não recebe luz
    ctx.globalAlpha = alpha;
    ctx.setLineDash([]);
    const emit = el.emit && !flat;
    if (emit) glowOn(ctx, el.emit);
    if (el.type === 'text') { drawText(ctx, model, pose, el, pr, L, dr); glowOff(ctx); return; }
    if (el.type === 'emitter') { drawParticles(ctx, model, pose, el, alpha, L); glowOff(ctx); return; }
    const g = geometry(model, pose, el);
    if (!g.segs.length) { glowOff(ctx); return; }
    if (el.closed) {
      const fill = pr.c !== undefined ? pr.c : el.fill;
      const ink = pr.ink !== undefined ? pr.ink : el.ink;
      let inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
      const hasInk = ink > 0 && fin.style !== 'flat' && inkc;
      const withInk = part !== 'fill' && hasInk;
      const cut = el.cuts ? cutPath(model, pose, el) : null;
      const path = pathOf(g);
      const bb = L ? segsBox(g.segs) : null;
      const dp = dr < 1 ? drawParts(dr) : null;
      if (L && withInk) inkc = litColor(inkc, L.lighting, bb.x + bb.w / 2, bb.y + bb.h / 2, true);
      if (cut) { ctx.save(); ctx.clip(inverse(cut), 'evenodd'); }
      if (part !== 'ink' && fill && (!dp || dp.fill > 0)) {
        const fa = dp ? alpha * dp.fill : alpha;
        ctx.globalAlpha = fa;
        if (fill.kind === 'pat') drawPattern(ctx, model, pose, el, g, fill);
        else { ctx.fillStyle = paint(ctx, model, pose, el, fill); ctx.fill(path); }
        glowOff(ctx);
        if (L) {
          shadeShape(ctx, L, path, bb, layer, fa);
          lightRaster(ctx, L, path, bb, fa);
          const rim = layer.rim || L.lighting.rim;
          if (rim) rimShape(ctx, L, el, g, path, bb, rim, fa);
        }
      }
      glowOff(ctx);
      if (dp) {
        ctx.globalAlpha = alpha;
        if (withInk && dp.line > 0) {
          ctx.fillStyle = ctx.strokeStyle = paint(ctx, model, pose, el, inkc);
          const p = flatOf(g);
          if (el.weight > 0) drawVarPart(ctx, p, G.inkWidths(p, ink, el.weight, model.canvas.light), dp.line);
          else { const q = G.polyPrefix(p, dp.line); if (q.length >= 4) strokePoly(ctx, q, ink, 'round'); }
        } else if (!hasInk && part !== 'ink' && fill && dp.fill < 1) {
          // sem contorno: um traço da cor da forma corre a borda e some quando o preenchimento chega
          const q = G.polyPrefix(flatOf(g), dp.line);
          ctx.globalAlpha = alpha * (1 - dp.fill);
          ctx.strokeStyle = paint(ctx, model, pose, el, fill);
          if (q.length >= 4) strokePoly(ctx, q, 3 * (el.ws || 1), 'round');
        }
      } else if (withInk) drawInk(ctx, model, pose, g, el, ink, inkc);
      if (cut) {
        ctx.restore();
        if (withInk && !dp) {
          // contorno dos buracos, só por dentro da forma
          ctx.save();
          ctx.clip(path);
          ctx.strokeStyle = paint(ctx, model, pose, el, inkc);
          ctx.lineWidth = ink;
          ctx.lineJoin = 'round';
          ctx.stroke(cut);
          ctx.restore();
        }
      }
      return;
    }
    let color = pr.c !== undefined ? pr.c : el.color;
    if (!color) { glowOff(ctx); return; }
    if (L) { const bb = segsBox(g.segs); color = litColor(color, L.lighting, bb.x + bb.w / 2, bb.y + bb.h / 2); }
    const w = pr.w !== undefined ? pr.w : el.w;
    ctx.fillStyle = ctx.strokeStyle = paint(ctx, model, pose, el, color);
    // desenhando aos poucos: só o começo do traço
    const pre = dr < 1 ? G.polyPrefix(flatOf(g), dr) : null;
    if (pre && pre.length < 4) { glowOff(ctx); return; }
    if (el.type === 'line') {
      ctx.lineWidth = w;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      if (el.dash) ctx.setLineDash(el.dash);
      if (pre) strokePoly(ctx, pre, w, 'butt');
      else ctx.stroke(pathOf(g));
      glowOff(ctx);
      return;
    }
    if (layer.clip && !el.limb) ctx.globalAlpha *= fin.inner;
    if (el.limb) {
      const p = flatOf(g);
      const s = w / (el.w || 1);
      const ws = G.taperWidths(p, el.limb[0] * s, el.limb[1] * s, [0, 0]);
      if (pre) drawVarPart(ctx, p, ws, dr); else G.drawVar(ctx, p, ws);
    } else if (el.taper[0] > 0 || el.taper[1] > 0) {
      const p = flatOf(g);
      const ws = G.taperWidths(p, w, w, el.taper);
      if (pre) drawVarPart(ctx, p, ws, dr); else G.drawVar(ctx, p, ws);
    } else if (pre) strokePoly(ctx, pre, w, el.cap);
    else {
      ctx.lineWidth = w;
      ctx.lineCap = el.cap;
      ctx.lineJoin = 'round';
      ctx.stroke(pathOf(g));
    }
    glowOff(ctx);
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

  // dr < 1: as letras aparecem uma a uma, no lugar que ocupam no texto inteiro
  function drawText(ctx, model, pose, el, pr, R, dr) {
    if (!el.str) return;
    let fill = pr.c !== undefined ? pr.c : el.fill;
    const ink = pr.ink !== undefined ? pr.ink : el.ink;
    let inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
    const m = textMatrix(pose, el);
    if (R) { fill = litColor(fill, R.lighting, m[4], m[5]); inkc = litColor(inkc, R.lighting, m[4], m[5]); }
    ctx.save();
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.font = textFont(el);
    ctx.textAlign = el.align;
    ctx.textBaseline = 'alphabetic';
    let str = el.str, x = 0;
    if (dr !== undefined && dr < 1) {
      const chars = Array.from(el.str), n = Math.floor(chars.length * dr + 1e-6);
      if (!n) { ctx.restore(); return; }
      const full = ctx.measureText(el.str).width;
      x = el.align === 'center' ? -full / 2 : el.align === 'right' ? -full : 0;
      str = chars.slice(0, n).join('');
      ctx.textAlign = 'left';
    }
    if (ink > 0 && inkc && model.finish.style !== 'flat') {
      ctx.lineWidth = ink * 2;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = paintText(ctx, el, inkc);
      ctx.strokeText(str, x, 0);
    }
    if (fill) { ctx.fillStyle = paintText(ctx, el, fill); ctx.fillText(str, x, 0); }
    ctx.restore();
  }

  // ---------- acabamentos da imagem inteira ----------
  const hasPost = (model) => { const f = model.finish; return !!(f.bloom || f.vignette || f.grain || f.posterize); };
  const noiseCache = new Map();
  function noiseTile(seed) {
    const k = ((seed % 8) + 8) % 8;
    if (noiseCache.has(k)) return noiseCache.get(k);
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d'), img = x.createImageData(128, 128);
    let s = (1234567 + k * 7919) >>> 0;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = (s >>> 16) & 255;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    noiseCache.set(k, c);
    return c;
  }
  function posterize(x, W, H, model) {
    const p = model.finish.posterize;
    const img = x.getImageData(0, 0, W, H), d = img.data;
    if (p === 'palette') {
      const pal = [...model.palette.values()].filter((v) => typeof v === 'string').map(G.parseHex).filter(Boolean);
      if (!pal.length) return;
      const cache = new Map();
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const key = ((d[i] >> 2) << 12) | ((d[i + 1] >> 2) << 6) | (d[i + 2] >> 2);
        let c = cache.get(key);
        if (!c) {
          let bd = Infinity;
          for (const q of pal) {
            const dr = q[0] - d[i], dg = q[1] - d[i + 1], db = q[2] - d[i + 2], dd = dr * dr * 3 + dg * dg * 4 + db * db * 2;
            if (dd < bd) { bd = dd; c = q; }
          }
          cache.set(key, c);
        }
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      }
    } else {
      const n = p - 1;
      for (let i = 0; i < d.length; i += 4) for (let j = 0; j < 3; j++) d[i + j] = (Math.round((d[i + j] / 255) * n) * 255) / n;
    }
    x.putImageData(img, 0, 0);
  }
  // bloom, vinheta, granulado e posterização, aplicados na imagem pronta
  function postFx(cv, model, seed) {
    if (!hasPost(model)) return;
    const f = model.finish, W = cv.width, H = cv.height, x = cv.getContext('2d');
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    if (f.bloom > 0 && canFilter()) {
      const B = scratch('bloom', W, H), r = Math.max(2, Math.round(Math.max(W, H) * 0.025));
      B.ctx.filter = `brightness(0.85) contrast(2.2) blur(${r}px)`;
      B.ctx.drawImage(cv, 0, 0);
      B.ctx.filter = 'none';
      x.globalCompositeOperation = 'screen';
      for (let a = f.bloom; a > 0; a -= 1) { x.globalAlpha = Math.min(1, a); x.drawImage(B.canvas, 0, 0); }
    }
    if (f.vignette > 0) {
      const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${Math.min(1, f.vignette)})`);
      x.globalAlpha = 1;
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
    }
    if (f.grain > 0) {
      const N = scratch('grain', W, H);
      N.ctx.fillStyle = N.ctx.createPattern(noiseTile(seed || 0), 'repeat');
      N.ctx.fillRect(0, 0, W, H);
      N.ctx.globalCompositeOperation = 'destination-in';
      N.ctx.drawImage(cv, 0, 0);
      x.globalCompositeOperation = 'overlay';
      x.globalAlpha = Math.min(1, f.grain * 3);
      x.drawImage(N.canvas, 0, 0);
    }
    x.restore();
    if (f.posterize) posterize(x, W, H, model);
  }

  // Imagem pronta de um quadro: escala, recorte, acabamentos e pixelado.
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
      if (!opts.noPost) postFx(small, model, pose.frame);
      octx.imageSmoothingEnabled = false;
      octx.drawImage(small, 0, 0, W2, H2);
    } else {
      draw(octx, scale);
      if (!opts.noPost) postFx(out, model, pose.frame);
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
        order.push({ el: it.el, len: it.el.type === 'text' || it.el.type === 'emitter' ? 60 : G.polyLength(flatOf(g)) });
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
    if (el.type === 'text' || el.type === 'emitter') { const p = flatOf(g); drawPen(ctx, p[0], p[1], zoom || 1); return; }
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
    if (h.kind === 'box' || h.kind === 'point') { const m = h.bone ? pose.bones.get(h.bone) : null; return m ? M.apply(m, h.x, h.y) : [h.x, h.y]; }
    if (h.kind === 'light') {
      const Lt = model.lights.get(h.light), m = Lt && Lt.bone ? pose.bones.get(Lt.bone) : null;
      return m ? M.apply(m, h.x, h.y) : [h.x, h.y];
    }
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
    makePose, timePose, boneMatrices, boneLocal, boxState, pointState, orderItems, orderLayers, drawParts, geometry, drawScene, renderImage, buildPlan, buildState, buildFilter, drawTrace, drawPen, handlePos,
    flatOf, pathOf, layerVisible, mapper, textBox, textMatrix, textFont, localBox, gradGeom, textGradGeom, clipEls, findNamed, limbPoints, fillBg,
    sceneLights, lightAt, lightWeight, litColor, layerFx, castShadows, castSources, particles, patternLines, segsBox, hasPost, postFx, canFilter,
  };
})(window.Weasel = window.Weasel || {});
