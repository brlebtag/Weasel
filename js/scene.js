/* Weasel — cena: pose dos ossos, tecido, pernas, desenho por camadas e a "pintura" passo a passo. */
(function (W) {
  'use strict';
  const G = W.geom, M = G.M;
  const REST = [0, 0, 0, 1, 1];

  // ---------- animação ----------
  function sampleTrack(track, f, frames, loop) {
    if (!track || !track.length) return REST;
    if (track.length === 1) return track[0].v;
    const first = track[0], last = track[track.length - 1];
    let a, b, fa, fb;
    if (f < first.frame) {
      if (!loop) return first.v;
      a = last; fa = last.frame - frames; b = first; fb = first.frame;
    } else if (f >= last.frame) {
      if (!loop) return last.v;
      a = last; fa = last.frame; b = first; fb = first.frame + frames;
    } else {
      let i = 0;
      while (track[i + 1].frame <= f) i++;
      a = track[i]; b = track[i + 1]; fa = a.frame; fb = b.frame;
    }
    const span = fb - fa;
    const t = span > 0 ? G.EASE[a.ease]((f - fa) / span) : 0;
    return a.v.map((x, k) => x + (b.v[k] - x) * t);
  }

  function sortedTracks(anim) {
    if (!anim._sorted) {
      for (const tr of anim.tracks.values()) tr.sort((p, q) => p.frame - q.frame);
      anim._sorted = true;
    }
  }

  function boneMatrices(model, anim, f) {
    if (anim) sortedTracks(anim);
    const out = new Map();
    const get = (name, depth) => {
      if (out.has(name)) return out.get(name);
      const b = model.bones.get(name);
      if (!b) return M.id();
      const v = anim ? sampleTrack(anim.tracks.get(name), f, anim.frames, anim.loop) : REST;
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

  // Tecido: uma "massa" presa ao pivô por uma mola. Ela atrasa quando o osso acelera
  // e é arrastada para trás pela velocidade. Os pontos longe do pivô seguem a massa.
  function clothSim(model, anim) {
    model._sim = model._sim || new Map();
    if (model._sim.has(anim.name)) return model._sim.get(anim.name);
    const res = new Map();
    const N = anim.frames, dt = 1 / anim.fps;
    const mats = [];
    for (let f = 0; f < N; f++) mats.push(boneMatrices(model, anim, f));
    const idx = (i) => (anim.loop ? ((i % N) + N) % N : Math.max(0, Math.min(N - 1, i)));
    for (const c of model.cloths.values()) {
      if (!(c.R > 0)) continue;
      const pos = mats.map((mm) => (c.bone && mm.get(c.bone) ? M.apply(mm.get(c.bone), c.center[0], c.center[1]) : c.center));
      const K = 30 + 420 * c.tension, C = 2 * Math.sqrt(K) * 0.22, gain = 1.6 * c.swing, drag = 0.045 * c.drag;
      let ox = 0, oy = 0, vx = 0, vy = 0;
      const out = new Array(N);
      const passes = anim.loop ? 3 : 1, sub = 10, h = dt / sub, lim = c.R * 0.4;
      for (let pass = 0; pass < passes; pass++) {
        for (let i = 0; i < N; i++) {
          if (pass === passes - 1) out[i] = [ox, oy];
          const p0 = pos[idx(i - 1)], p1 = pos[i], p2 = pos[idx(i + 1)];
          const ax = (p2[0] - 2 * p1[0] + p0[0]) / (dt * dt), ay = (p2[1] - 2 * p1[1] + p0[1]) / (dt * dt);
          const velx = (p2[0] - p0[0]) / (2 * dt), vely = (p2[1] - p0[1]) / (2 * dt);
          const tx = -velx * drag, ty = -vely * drag;
          for (let s = 0; s < sub; s++) {
            vx += (-K * (ox - tx) - C * vx - gain * ax) * h;
            vy += (-K * (oy - ty) - C * vy - gain * ay) * h;
            ox += vx * h; oy += vy * h;
            const l = Math.hypot(ox, oy);
            if (l > lim) { ox *= lim / l; oy *= lim / l; }
          }
        }
      }
      res.set(c.name, out);
    }
    model._sim.set(anim.name, res);
    return res;
  }

  function makePose(model, animName, frame) {
    const anim = animName ? model.animMap.get(animName) || null : null;
    const f = anim ? ((Math.round(frame) % anim.frames) + anim.frames) % anim.frames : 0;
    const pose = { anim, frame: f, bones: boneMatrices(model, anim, f), cloth: new Map(), geo: new Map() };
    if (anim && model.cloths.size) {
      for (const [k, arr] of clothSim(model, anim)) pose.cloth.set(k, arr[f]);
    }
    return pose;
  }

  // ---------- geometria de cada elemento numa pose ----------
  function mapper(model, pose, el, boneName) {
    const bn = boneName === undefined ? el.bone : boneName;
    const m = bn ? pose.bones.get(bn) : null;
    const c = el.cloth ? model.cloths.get(el.cloth) : null;
    const o = c ? pose.cloth.get(el.cloth) : null;
    return (x, y) => {
      const p = m ? M.apply(m, x, y) : [x, y];
      if (o && c.R > 0) {
        const w = Math.pow(Math.min(1, Math.hypot(x - c.pivot[0], y - c.pivot[1]) / c.R), 1.2);
        p[0] += o[0] * w; p[1] += o[1] * w;
      }
      return p;
    };
  }

  function mapPts(pts, f) {
    return pts.map((p) => { const q = f(p.x, p.y); return { x: q[0], y: q[1], corner: p.corner }; });
  }

  function limbPoints(model, pose, el) {
    const m = el.on ? pose.bones.get(el.on) : null;
    const hip = m ? M.apply(m, el.hip[0], el.hip[1]) : el.hip.slice();
    const L = el.restLen;
    let dx = el.foot[0] - hip[0], dy = el.foot[1] - hip[1], d = Math.hypot(dx, dy);
    let foot = el.foot;
    if (d > L) { foot = [hip[0] + dx / d * L, hip[1] + dy / d * L]; dx = foot[0] - hip[0]; dy = foot[1] - hip[1]; d = L; }
    const pts = [{ x: hip[0], y: hip[1] }];
    if (d < L - 0.5 && d > 1e-6) {
      const h = Math.sqrt(Math.max(0, (L / 2) ** 2 - (d / 2) ** 2)) * Math.min(1, Math.abs(el.bend));
      const s = el.bend >= 0 ? 1 : -1;
      pts.push({ x: (hip[0] + foot[0]) / 2 + (dy / d) * h * s, y: (hip[1] + foot[1]) / 2 - (dx / d) * h * s });
    }
    pts.push({ x: foot[0], y: foot[1] });
    return pts;
  }

  function geometry(model, pose, el) {
    let g = pose.geo.get(el.id);
    if (g) return g;
    let segs = [];
    if (el.type === 'ellipse') {
      const f = mapper(model, pose, el);
      segs = G.ellipseSegs(el.center[0], el.center[1], el.radius[0], el.radius[1], el.rot).map((s) => G.mapSeg(s, f));
    } else if (el.type === 'rect') {
      const f = mapper(model, pose, el);
      segs = G.rectSegs(el.xy[0], el.xy[1], el.size[0], el.size[1], el.r, el.rot).map((s) => G.mapSeg(s, f));
    } else if (el.limb) {
      segs = G.smoothSegs(limbPoints(model, pose, el), false, 1);
    } else if (el.type === 'line') {
      segs = G.polySegs(mapPts(el.pts, mapper(model, pose, el)), false);
    } else if (el.pts.length >= 2) {
      segs = G.smoothSegs(mapPts(el.pts, mapper(model, pose, el)), el.closed, el.smooth);
    }
    g = { segs, closed: el.closed, _path: null, _flat: null };
    pose.geo.set(el.id, g);
    return g;
  }
  const pathOf = (g) => g._path || (g._path = G.toPath(g.segs, g.closed));
  const flatOf = (g) => g._flat || (g._flat = G.flatten(g.segs, 2.5));

  function clipPath(model, pose, name) {
    const p = new Path2D();
    const els = model.named.get(name) || (model.layerMap.get(name) ? model.layerMap.get(name).items.filter((i) => i.part !== 'ink').map((i) => i.el) : []);
    for (const el of els) if (el.closed) p.addPath(pathOf(geometry(model, pose, el)));
    return p;
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
    if (opts.background !== false && model.canvas.bg) {
      ctx.fillStyle = model.canvas.bg;
      ctx.fillRect(0, 0, model.canvas.w, model.canvas.h);
    }
    for (const layer of model.layers) {
      if (!layerVisible(layer, pose, opts)) continue;
      const items = filter ? layer.items.filter((it) => filter(it.el)) : layer.items;
      if (!items.length) continue;
      ctx.save();
      ctx.globalCompositeOperation = layer.blend;
      if (layer.clip) ctx.clip(clipPath(model, pose, layer.clip));
      for (const it of items) drawItem(ctx, model, pose, it.el, it.part, layer);
      ctx.restore();
    }
  }

  function drawItem(ctx, model, pose, el, part, layer) {
    const g = geometry(model, pose, el);
    if (!g.segs.length) return;
    const fin = model.finish;
    ctx.globalAlpha = layer.opacity * el.opacity;
    ctx.setLineDash([]);
    if (el.closed) {
      if (part !== 'ink' && el.fill) { ctx.fillStyle = el.fill; ctx.fill(pathOf(g)); }
      if (part !== 'fill' && el.ink > 0 && fin.style !== 'flat' && el.inkc) drawInk(ctx, model, g, el);
      return;
    }
    if (!el.color) return;
    if (el.type === 'line') {
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.w;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      if (el.dash) ctx.setLineDash(el.dash);
      ctx.stroke(pathOf(g));
      return;
    }
    if (layer.clip && !el.limb) ctx.globalAlpha *= fin.inner;
    ctx.fillStyle = ctx.strokeStyle = el.color;
    if (el.limb) {
      const p = flatOf(g);
      G.drawVar(ctx, p, G.taperWidths(p, el.limb[0], el.limb[1], [0, 0]));
    } else if (el.taper[0] > 0 || el.taper[1] > 0) {
      const p = flatOf(g);
      G.drawVar(ctx, p, G.taperWidths(p, el.w, el.w, el.taper));
    } else {
      ctx.lineWidth = el.w;
      ctx.lineCap = el.cap;
      ctx.lineJoin = 'round';
      ctx.stroke(pathOf(g));
    }
  }

  function drawInk(ctx, model, g, el) {
    ctx.fillStyle = ctx.strokeStyle = el.inkc;
    if (!(el.weight > 0)) {
      ctx.lineWidth = el.ink;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke(pathOf(g));
      return;
    }
    const p = flatOf(g);
    G.drawVar(ctx, p, G.inkWidths(p, el.ink, el.weight, model.canvas.light));
  }

  // Imagem pronta de um quadro: escala, recorte e acabamento pixelado.
  function renderImage(model, pose, opts) {
    opts = opts || {};
    const scale = opts.scale || 1;
    const rect = opts.rect || { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h };
    const W2 = Math.max(1, Math.round(rect.w * scale)), H2 = Math.max(1, Math.round(rect.h * scale));
    const out = document.createElement('canvas');
    out.width = W2; out.height = H2;
    const octx = out.getContext('2d');
    const px = model.finish.pixel || 1;
    const draw = (ctx, s) => {
      ctx.setTransform(s, 0, 0, s, -rect.x * s, -rect.y * s);
      if (opts.transparent) drawScene(ctx, model, pose, { background: false, guides: opts.guides, filter: opts.filter });
      else {
        ctx.fillStyle = opts.matte || model.canvas.bg || '#ffffff';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        drawScene(ctx, model, pose, { guides: opts.guides, filter: opts.filter });
      }
      if (opts.after) opts.after(ctx, s);
    };
    if (px > 1) {
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.round(W2 / px)); small.height = Math.max(1, Math.round(H2 / px));
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
        if (seen.has(it.el.id)) continue;
        seen.add(it.el.id);
        const g = geometry(model, pose, it.el);
        if (!g.segs.length) continue;
        order.push({ el: it.el, len: G.polyLength(flatOf(g)) });
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
    const p = G.polyPrefix(flatOf(g), st.t);
    if (p.length < 4) return;
    let w = 2, col = '#14141c';
    if (el.closed) { w = el.ink > 0 ? el.ink : 2.5; col = el.ink > 0 ? el.inkc : (el.fill || col); }
    else if (el.limb) { w = el.limb[0]; col = el.color || col; }
    else { w = el.w; col = el.color || col; }
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col;
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
    if (h.kind === 'pivot' && h.bone) { const m = pose.bones.get(h.bone); return m ? M.apply(m, h.x, h.y) : [h.x, h.y]; }
    if (h.kind === 'pivot' && h.cloth) { const c = model.cloths.get(h.cloth); const m = c && c.bone ? pose.bones.get(c.bone) : null; return m ? M.apply(m, h.x, h.y) : [h.x, h.y]; }
    if (h.kind === 'hip' && rec.el) { const m = rec.el.on ? pose.bones.get(rec.el.on) : null; return m ? M.apply(m, h.x, h.y) : [h.x, h.y]; }
    if (rec.el) return mapper(model, pose, rec.el)(h.x, h.y);
    return [h.x, h.y];
  }

  W.scene = { makePose, boneMatrices, geometry, drawScene, renderImage, buildPlan, buildState, buildFilter, drawTrace, drawPen, handlePos, flatOf, pathOf, layerVisible };
})(window.Weasel = window.Weasel || {});
