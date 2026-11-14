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
  const segment = G.segment;
  // only= de camadas e caixas: a animação pelo nome, ou pelos nomes das que ela junta (mix=)
  const animIn = (list, anim) => list.includes(anim.name) || !!(anim.aliases && anim.aliases.some((n) => list.includes(n)));

  // Ponto do caminho (path=) na fração t do comprimento (0 = começo, 1 = fim), com a direção dele em graus.
  // Num caminho fechado, t dá voltas (1.5 = uma volta e meia).
  function pathAt(el, t) {
    let arc = el._arc;
    if (!arc) {
      const segs = rawSegs(el).map((s) => (el.xf ? G.mapSeg(s, (x, y) => M.apply(el.xf, x, y)) : s));
      const fl = G.flatten(segs, 1.5), pts = [];
      for (let i = 0; i < fl.length; i += 2) pts.push([fl[i], fl[i + 1]]);
      if (el.closed && pts.length) pts.push(pts[0]);
      const acc = [0];
      for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      arc = el._arc = { pts, acc, total: acc[acc.length - 1] || 0 };
    }
    const { pts, acc, total } = arc;
    if (pts.length < 2 || !total) return { x: pts.length ? pts[0][0] : 0, y: pts.length ? pts[0][1] : 0, angle: 0 };
    const u = el.closed ? ((t % 1) + 1) % 1 : Math.max(0, Math.min(1, t)), s = u * total;
    let lo = 0, hi = acc.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (acc[mid] <= s) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[hi], k = (s - acc[lo]) / (acc[hi] - acc[lo] || 1);
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
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
    // path=: o pivô anda pelo caminho (key osso.along=0 … 1) e, com turn, vira junto com a curva
    if (b.path) {
      const tr = anim.ptracks.get(`${b.name}.along`), s = tr && segment(tr.keys, f, anim.frames, anim.loop);
      if (s) {
        const P = pathAt(b.path, s.a.v + (s.b.v - s.a.v) * s.t);
        v[0] += P.x - b.pivot[0];
        v[1] += P.y - b.pivot[1];
        if (b.turn) v[2] += P.angle;
      }
    }
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
    // com ik: os valores de todos os ossos primeiro, o ik gira as correntes, e só então as matrizes
    if (model.iks && model.iks.length) {
      const vals = new Map();
      for (const b of model.bones.values()) vals.set(b.name, boneValues(anim, b, f, springs, time));
      return matsFrom(model, ikVals(model, vals));
    }
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
    const props = [], lprops = [], liprops = [], bprops = [], b3s = [];
    for (let f = 0; f < N; f++) {
      const pm = new Map(), lm = new Map(), li = new Map(), bm = new Map(), b3 = new Map();
      for (const tr of anim.ptracks.values()) {
        if (tr.kind === 'bone' && tr.prop === 'along') continue; // osso.along entra nos valores do osso
        const s = segment(tr.keys, f, N, anim.loop);
        if (!s) continue;
        let v;
        if (tr.type === 'num' || tr.type === 'width' || tr.type === 'free') v = lerp(s.a.v, s.b.v, s.t);
        else if (tr.type === 'color') v = typeof s.a.v === 'string' && typeof s.b.v === 'string' ? G.lerpColor(s.a.v, s.b.v, s.t) : s.t < 1 ? s.a.v : s.b.v;
        else if (tr.type === 'step' || tr.type === 'order') v = s.a.v;
        else v = { from: s.a.v, to: s.b.v, t: s.t };
        // caixa numa animação sem loop: antes da primeira key vale o estado declarado (off = desligada)
        if (tr.kind === 'box' && !anim.loop && f < tr.keys[0].frame) continue;
        if (tr.kind === 'layer' || tr.kind === 'light' || tr.kind === 'box' || tr.kind === 'bone') {
          const map = tr.kind === 'layer' ? lm : tr.kind === 'light' ? li : tr.kind === 'bone' ? b3 : bm;
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
      b3s.push(b3);
    }
    d = { mats, cloth, props, lprops, liprops, bprops, b3s, springs };
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

  // Matrizes dos ossos a partir dos valores de cada um (como boneMatrices, mas com os valores prontos).
  function matsFrom(model, vals) {
    const out = new Map();
    const get = (name, depth) => {
      if (out.has(name)) return out.get(name);
      const b = model.bones.get(name);
      if (!b) return M.id();
      const v = vals.get(name) || REST, [px, py] = b.pivot;
      let local = M.mul(M.translate(px + v[0], py + v[1]), M.mul(M.rotate(v[2]), M.mul(M.scale(v[3], v[4]), M.translate(-px, -py))));
      const m = b.parent && depth < 64 ? M.mul(get(b.parent, depth + 1), local) : local;
      out.set(name, m);
      return m;
    };
    for (const name of model.bones.keys()) get(name, 0);
    return out;
  }

  // ---------- ik ----------
  // Os valores dos ossos (dx, dy, rot, sx, sy) com cada ik resolvido: a raiz e o meio giram para a ponta chegar ao
  // pé (ou ao pivô do alvo), com o joelho do lado do bend= (1: como no limb, à direita de quem vai do quadril para
  // o pé). Os comprimentos vêm da pose sem o ik (a escala dos ossos conta). Longe demais, a perna estica e aponta
  // para o pé. A ponta não gira com a perna: fica no ângulo que teria sem o ik (um pé plano no chão), mais as key
  // dela. Sem ik, devolve o mesmo mapa.
  const wrapPi = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; };
  function ikVals(model, vals) {
    if (!model.iks || !model.iks.length) return vals;
    const out = new Map(vals), deg = 180 / Math.PI;
    const turn = (name, d) => { const v = (out.get(name) || REST).slice(); v[2] += d; out.set(name, v); };
    for (const k of model.iks) {
      const mats = matsFrom(model, out);
      const [A, B, C] = k.bones.map((n) => model.bones.get(n));
      const at = (b) => M.apply(mats.get(b.name), b.pivot[0], b.pivot[1]);
      const H = at(A), K = at(B), T = at(C), G = k.target ? at(model.bones.get(k.target)) : k.foot;
      const L1 = Math.hypot(K[0] - H[0], K[1] - H[1]), L2 = Math.hypot(T[0] - K[0], T[1] - K[1]);
      const dx = G[0] - H[0], dy = G[1] - H[1], d = Math.hypot(dx, dy);
      if (L1 < 1e-6 || L2 < 1e-6 || d < 1e-6) continue;
      const ux = dx / d, uy = dy / d, r = Math.max(Math.abs(L1 - L2), Math.min(L1 + L2, d));
      // lei dos cossenos no quadril; o joelho sai do rumo do pé para o lado (uy, -ux) com bend=1
      const c = Math.max(-1, Math.min(1, (L1 * L1 + r * r - L2 * L2) / (2 * L1 * r))), s = Math.sqrt(1 - c * c) * k.bend;
      const K1 = [H[0] + L1 * (ux * c + uy * s), H[1] + L1 * (uy * c - ux * s)], E = [H[0] + ux * r, H[1] + uy * r];
      const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);
      const da = wrapPi(ang(H, K1) - ang(H, K));
      // girar a raiz leva a ponta junto, em volta do quadril
      const ca = Math.cos(da), sa = Math.sin(da), T1 = [H[0] + (T[0] - H[0]) * ca - (T[1] - H[1]) * sa, H[1] + (T[0] - H[0]) * sa + (T[1] - H[1]) * ca];
      const db = wrapPi(ang(K1, E) - ang(K1, T1));
      // num pai espelhado (escala negativa), girar o filho para um lado gira o desenho para o outro
      const sign = (name) => { const mm = name ? mats.get(name) : null; return mm && M.det(mm) < 0 ? -1 : 1; };
      turn(A.name, da * deg * sign(A.parent));
      turn(B.name, db * deg * sign(A.name));
      turn(C.name, -(da + db) * deg * sign(B.name));
    }
    return out;
  }

  // Expressão (expr) por cima de uma pose: os ossos e as formas que ela diz, misturando de uma expressão para a
  // outra. ex = { from, to, u } (nomes, ou null para nenhuma). Os ossos da expressão substituem os da animação.
  function exprPose(model, pose, ex) {
    const A = ex.from ? model.exprs.get(ex.from) : null, B = ex.to ? model.exprs.get(ex.to) : null, u = ex.u;
    if (!A && !B) return pose;
    let bones = pose.bones;
    const touched = new Set([...(A ? A.tracks.keys() : []), ...(B ? B.tracks.keys() : [])]);
    if (touched.size) {
      const base = pose.anim ? boneLocal(model, pose.anim, pose.frame) : null, vals = new Map();
      for (const b of model.bones.values()) {
        let v = base ? base.get(b.name) : pose.time !== undefined ? freeValues(b, pose.time) : REST;
        if (touched.has(b.name)) {
          const va = A && A.tracks.has(b.name) ? A.tracks.get(b.name)[0].v : v, vb = B && B.tracks.has(b.name) ? B.tracks.get(b.name)[0].v : v;
          v = va.map((x, k) => x + (vb[k] - x) * u);
        }
        vals.set(b.name, v);
      }
      bones = matsFrom(model, ikVals(model, vals));
    }
    let props = pose.props, b3 = pose.b3;
    const keys = new Set([...(A ? A.ptracks.keys() : []), ...(B ? B.ptracks.keys() : [])]);
    if (keys.size) {
      props = new Map(pose.props);
      for (const key of keys) {
        const ta = A && A.ptracks.get(key), tb = B && B.ptracks.get(key), tr = ta || tb;
        // osso.yaw / osso.pitch: o giro 3D do osso
        if (tr.kind === 'bone' && tr.prop !== 'along') {
          if (b3 === pose.b3) b3 = new Map(pose.b3 || []);
          const o = Object.assign({}, b3.get(tr.name) || {}), own = o[tr.prop] !== undefined ? o[tr.prop] : model.bones.get(tr.name)[tr.prop] || 0;
          const na = ta ? ta.keys[0].v : own, nb = tb ? tb.keys[0].v : own;
          o[tr.prop] = na + (nb - na) * u;
          b3.set(tr.name, o);
          continue;
        }
        if (tr.kind !== 'el') continue;
        const va = ta ? ta.keys[0].v : undefined, vb = tb ? tb.keys[0].v : undefined;
        for (const el of tr.targets) {
          const o = Object.assign({}, props.get(el.id) || {}), cur = o[tr.prop];
          if (tr.type === 'shape') {
            o.shape = { from: va !== undefined ? findNamed(model, va, el.inst) : el, to: vb !== undefined ? findNamed(model, vb, el.inst) : el, t: u };
          } else if (tr.type === 'color') {
            const own = cur !== undefined ? cur : tr.prop === 'inkc' ? el.inkc : el.closed ? el.fill : el.color;
            const ca = va !== undefined ? va : own, cb = vb !== undefined ? vb : own;
            o[tr.prop] = typeof ca === 'string' && typeof cb === 'string' ? G.lerpColor(ca, cb, u) : u < 0.5 ? ca : cb;
          } else if (tr.type === 'step') {
            const own = cur !== undefined ? cur : 1;
            o[tr.prop] = u < 0.5 ? (va !== undefined ? va : own) : vb !== undefined ? vb : own;
          } else if (tr.type !== 'order') {
            const own = cur !== undefined ? cur : tr.prop === 'w' ? el.w : tr.prop === 'ink' ? el.ink : tr.type === 'free' ? el[tr.prop] || 0 : 1;
            const na = va !== undefined ? va : own, nb = vb !== undefined ? vb : own;
            o[tr.prop] = na + (nb - na) * u;
          }
          props.set(el.id, o);
        }
      }
    }
    return Object.assign({}, pose, { bones, props, b3, geo: new Map() });
  }

  function makePose(model, animName, frame) {
    const anim = animName ? model.animMap.get(animName) || null : null;
    if (!anim) return { anim: null, frame: 0, bones: boneMatrices(model, null, 0, null), cloth: NONE, props: NONE, lprops: NONE, liprops: NONE, bprops: NONE, b3: NONE, geo: new Map() };
    const d = animData(model, anim);
    const f = ((Math.round(frame) % anim.frames) + anim.frames) % anim.frames;
    return { anim, frame: f, bones: d.mats[f], cloth: d.cloth[f], props: d.props[f], lprops: d.lprops[f], liprops: d.liprops[f], bprops: d.bprops[f], b3: d.b3s[f], geo: new Map() };
  }
  // Pose sem animação num instante (segundos) de um filme: partículas, balanços e tremulação andam com o relógio.
  function timePose(model, time) {
    return { anim: null, frame: 0, time, bones: boneMatrices(model, null, 0, null, time), cloth: NONE, props: NONE, lprops: NONE, liprops: NONE, bprops: NONE, b3: NONE, geo: new Map() };
  }

  // ---------- caixas de colisão (jogo) ----------
  // Onde a caixa está nesta pose e se está ligada: segue a posição e a rotação do osso (não a escala);
  // only= liga só nessas animações; key caixa.show=0/1 liga e desliga quadro a quadro.
  function boxState(model, pose, b) {
    const bp = (pose.bprops && pose.bprops.get(b.name)) || NOPROPS;
    let on = bp.show !== undefined ? bp.show !== 0 : b.on;
    if (b.only && !(pose.anim ? animIn(b.only, pose.anim) : b.only.includes('pose'))) on = false;
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

  // ---------- passada (anim feet=) e trajetória dos pontos ----------
  // Onde o ponto está em cada quadro da animação.
  function pointPath(model, anim, p) {
    const pts = [];
    for (let f = 0; f < anim.frames; f++) { const s = pointState(model, makePose(model, anim.name, f), p); pts.push([s.x, s.y]); }
    return pts;
  }
  const median = (v) => { const s = v.slice().sort((a, b) => a - b), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
  // Personagem que anda no lugar, visto de lado (como numa esteira): cada pé vai para trás enquanto está no chão,
  // e quem leva o personagem para a frente é o jogo (ou o filme). No chão = perto da altura mais baixa a que
  // aquele pé chega na animação. Do quanto os pés andam entre dois quadros seguidos no chão sai a velocidade em
  // que o personagem tem de andar para eles ficarem parados (a mediana: um quadro torto não estraga a conta).
  // dx = px do desenho por quadro (negativo: os pés vão para a esquerda, o personagem anda para a direita);
  // speed = px do desenho por segundo, com o sinal da direção em que o personagem anda.
  // slips: os pés que, no chão, andam diferente dessa velocidade (escorregam).
  function gait(model, anim) {
    if (!anim || !anim.feet || !anim.feet.length) return null;
    model._gait = model._gait || new Map();
    if (model._gait.has(anim.name)) return model._gait.get(anim.name);
    const N = anim.frames, feet = [];
    for (const name of anim.feet) {
      const p = model.points.get(name);
      if (!p) continue;
      const pts = pointPath(model, anim, p), ys = pts.map((q) => q[1]);
      const ground = Math.max(...ys), tol = Math.max(0.5, (ground - Math.min(...ys)) * 0.2);
      const on = ys.map((y) => y >= ground - tol);
      const steps = [];
      if (N > 1) for (let f = 0; f < (anim.loop ? N : N - 1); f++) { const g = (f + 1) % N; if (on[f] && on[g]) steps.push(pts[g][0] - pts[f][0]); }
      feet.push({ name, pts, on, ground, steps });
    }
    const all = feet.flatMap((ft) => ft.steps);
    const dx = all.length ? median(all) : null;
    const r = { anim, feet, dx, speed: dx === null ? null : -dx * anim.fps, slips: [] };
    if (dx !== null) {
      const tol = Math.max(0.75, Math.abs(dx) * 0.15);
      for (const ft of feet) {
        if (!ft.steps.length) continue;
        const lo = Math.min(...ft.steps), hi = Math.max(...ft.steps);
        if (Math.abs(lo - dx) > tol || Math.abs(hi - dx) > tol) r.slips.push({ name: ft.name, min: lo, max: hi });
      }
    }
    model._gait.set(anim.name, r);
    return r;
  }
  // Os quadros em que o pé está no chão, em trechos: "0–12", "3–5, 14–15"
  function frameRuns(on) {
    const out = [];
    for (let f = 0; f < on.length; f++) {
      if (!on[f]) continue;
      let e = f;
      while (e + 1 < on.length && on[e + 1]) e++;
      out.push(e > f ? `${f}–${e}` : String(f));
      f = e;
    }
    return out.join(', ');
  }
  const dec = (v, n) => String(Math.round(v * 10 ** n) / 10 ** n).replace('.', ',');
  // A passada em palavras: { head, feet: [linhas], slips: [avisos] }; scale = a escala da exportação (1 = o desenho)
  function gaitText(g, scale) {
    const k = scale || 1;
    const feet = g.feet.map((ft) => `${ft.name}: ${ft.on.some(Boolean) ? `no chão nos quadros ${frameRuns(ft.on)}` : 'não pisa'}${ft.steps.length ? '' : ' (nunca em dois quadros seguidos)'}`);
    let head;
    if (g.dx === null) head = 'nenhum pé fica no chão em dois quadros seguidos: não dá para medir';
    else if (Math.abs(g.speed) < 0.05) head = 'parado: os pés no chão não andam (o personagem anda pelo próprio desenho?)';
    else head = `anda ${dec(Math.abs(g.speed) * k, 1)} px/s para a ${g.speed > 0 ? 'direita' : 'esquerda'}${k !== 1 ? ` na escala ${dec(k, 3)}` : ''} (${dec(Math.abs(g.dx) * k, 2)} px por quadro a ${dec(g.anim.fps, 2)} fps)`;
    // quanto o pé vai para trás por quadro (negativo: para a frente)
    const back = (v) => dec((g.dx < 0 ? -v : v) * k, 2);
    const slips = g.slips.map((s) => `${s.name} escorrega: no chão vai para trás de ${back(g.dx < 0 ? s.max : s.min)} a ${back(g.dx < 0 ? s.min : s.max)} px por quadro (os outros, ${back(g.dx)})`);
    return { head, feet, slips };
  }

  // As trajetórias: [{ name, pts, foot }]; foot = a passada daquele pé, quando ele está no feet= da animação.
  // names = só esses pontos; sem names, os pés da animação ou, sem feet=, todos os pontos.
  function trajectories(model, anim, names) {
    const g = gait(model, anim);
    const list = (names || (g ? anim.feet : [...model.points.keys()])).filter((n) => model.points.has(n));
    return list.map((name) => {
      const ft = g && g.feet.find((x) => x.name === name);
      return { name, pts: ft ? ft.pts : pointPath(model, anim, model.points.get(name)), foot: ft || null };
    });
  }

  // A trajetória: o caminho de cada ponto em todos os quadros da animação, numerado. Com feet=, os pés mostram também
  // os quadros no chão (bolinhas cheias) e a linha onde pisam. Em coordenadas do desenho; z = zoom (as linhas e os
  // números ficam do mesmo tamanho na tela). o = { names (só esses pontos), frame (o quadro atual, com um anel) }
  const TRAJ_COLORS = ['#ff4d6d', '#14b8a6', '#f59e0b', '#3b82f6', '#a855f7', '#65a30d'];
  function drawTrajectory(ctx, model, anim, z, o) {
    o = o || {};
    const paths = trajectories(model, anim, o.names);
    ctx.save();
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.font = `${10 / z}px ui-monospace, Menlo, Consolas, monospace`;
    const label = (text, x, y, c) => {
      ctx.lineWidth = 3 / z;
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = c;
      ctx.fillText(text, x, y);
    };
    paths.forEach(({ name, pts, foot: ft }, i) => {
      const c = TRAJ_COLORS[i % TRAJ_COLORS.length], N = pts.length;
      // a linha do chão desse pé, só no trecho em que ele pisa
      if (ft && ft.steps.length) {
        const xs = pts.filter((_, f) => ft.on[f]).map((q) => q[0]);
        ctx.setLineDash([4 / z, 3 / z]);
        ctx.lineWidth = 1 / z;
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.moveTo(Math.min(...xs) - 6 / z, ft.ground);
        ctx.lineTo(Math.max(...xs) + 6 / z, ft.ground);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.5 / z;
      ctx.strokeStyle = c;
      ctx.beginPath();
      pts.forEach((q, f) => (f ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      if (anim.loop && N > 2) ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (let f = 0; f < N; f++) {
        const on = ft && ft.on[f];
        ctx.beginPath();
        ctx.arc(pts[f][0], pts[f][1], (on ? 3.2 : 2.4) / z, 0, Math.PI * 2);
        ctx.fillStyle = on ? c : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1.2 / z;
        ctx.strokeStyle = c;
        ctx.stroke();
      }
      if (o.frame !== undefined && N) {
        const q = pts[((o.frame % N) + N) % N];
        ctx.beginPath();
        ctx.arc(q[0], q[1], 6.5 / z, 0, Math.PI * 2);
        ctx.lineWidth = 2 / z;
        ctx.strokeStyle = c;
        ctx.stroke();
      }
      // os números dos quadros, sem amontoar: só quando o ponto se afastou do último numerado
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      let last = null;
      for (let f = 0; f < N; f++) {
        const q = pts[f];
        if (last && Math.hypot(q[0] - last[0], q[1] - last[1]) < 16 / z) continue;
        label(String(f), q[0] + 4 / z, q[1] - 4 / z, c);
        last = q;
      }
      // o nome em cima do ponto mais alto do caminho
      let top = pts[0];
      for (const q of pts) if (q[1] < top[1]) top = q;
      ctx.textAlign = 'center';
      label(name, top[0], top[1] - 12 / z, c);
    });
    ctx.restore();
    return gait(model, anim);
  }

  // ---------- imagens guia (ref) ----------
  // Só no editor (e na linha de comando com --refs): nunca saem nas exportações. A posição é o canto de cima à
  // esquerda da imagem (já na escala); a rotação gira em volta do centro.
  const refOn = (r, pose) => !r.hidden && (!r.only || (pose.anim ? animIn(r.only, pose.anim) : r.only.includes('pose'))) && (!r.frames || !pose.anim || (pose.frame >= r.frames[0] && pose.frame <= r.frames[1]));
  // da imagem (w × h pixels) para o desenho
  function refMatrix(r, w, h) {
    const hw = (w * r.scale) / 2, hh = (h * r.scale) / 2;
    return M.mul(M.translate(r.x + hw, r.y + hh), M.mul(M.rotate(r.rot), M.mul(M.translate(-hw, -hh), M.scale(r.scale, r.scale))));
  }
  // images(arquivo) → a imagem carregada (ou null); front: as de trás (false) ou as da frente (true)
  function drawRefs(ctx, model, pose, images, front) {
    for (const r of model.refs) {
      if (!!r.front !== !!front || !refOn(r, pose)) continue;
      const img = images(r.file);
      if (!img) continue;
      const m = refMatrix(r, img.naturalWidth || img.width, img.naturalHeight || img.height);
      ctx.save();
      ctx.globalAlpha = r.opacity;
      ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
  }

  // ---------- geometria de cada elemento numa pose ----------
  // bones=: o peso de cada osso num ponto, pela distância até o "pedaço" do osso (do pivô dele até o pivô do
  // seguinte na lista; o último continua na mesma direção). Perto de uma junta, os dois ossos dividem o ponto.
  function skinWeights(model, el, x, y) {
    const segs = el._skin || (el._skin = el.bones.map((n, i) => {
      const p = model.bones.get(n).pivot, q = el.bones[i + 1] ? model.bones.get(el.bones[i + 1]).pivot : null;
      const prev = i > 0 ? model.bones.get(el.bones[i - 1]).pivot : null;
      const e = q || (prev ? [2 * p[0] - prev[0], 2 * p[1] - prev[1]] : p);
      return [p[0], p[1], e[0], e[1]];
    }));
    // a passagem de um osso para o outro ocupa uns 40% do tamanho médio dos pedaços
    if (el._sigma === undefined) {
      const ls = segs.map((q) => Math.hypot(q[2] - q[0], q[3] - q[1])).filter((l) => l > 0);
      el._sigma = Math.max(4, 0.4 * (ls.length ? ls.reduce((a, b) => a + b, 0) / ls.length : 20));
    }
    const d2 = segs.map((q) => {
      const dx = q[2] - q[0], dy = q[3] - q[1], l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((x - q[0]) * dx + (y - q[1]) * dy) / l2)) : 0;
      return (x - q[0] - dx * t) ** 2 + (y - q[1] - dy * t) ** 2;
    });
    const near = Math.min(...d2), k = 2 * el._sigma * el._sigma;
    const w = d2.map((v) => Math.exp(-(v - near) / k));
    const sum = w.reduce((a, b) => a + b, 0);
    return w.map((v) => v / sum);
  }

  // bones=: um ponto do desenho (já com o componente) vai para onde a média dos ossos, com os pesos, o leva
  function skinMap(model, pose, el) {
    const ms = el.bones.map((n) => pose.bones.get(n));
    return (x, y) => {
      const w = skinWeights(model, el, x, y);
      let px = 0, py = 0;
      ms.forEach((mm, i) => { const q = mm ? M.apply(mm, x, y) : [x, y]; px += q[0] * w[i]; py += q[1] * w[i]; });
      return [px, py];
    };
  }

  // coordenadas do código → mundo: componente (xf), osso (ou vários, com bones=), tecido
  function mapper(model, pose, el) {
    if (el.bones) {
      const sk = skinMap(model, pose, el), xf = el.xf;
      return xf ? (x, y) => { const q = M.apply(xf, x, y); return sk(q[0], q[1]); } : sk;
    }
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

  // fs (opcional): um mapa por ponto (os presos com @osso); sem ele, ou num item null, vale f
  function mapPts(pts, f, fs) {
    return pts.map((p, i) => {
      const g = (fs && fs[i]) || f;
      const q = g(p.x, p.y);
      const o = { x: q[0], y: q[1], corner: p.corner };
      if (p.tan) { const t = g(p.x + p.tan[0], p.y + p.tan[1]); o.tan = [t[0] - q[0], t[1] - q[1]]; }
      return o;
    });
  }

  // x,y@osso: o mapa de cada ponto preso (o osso dele, misturado com o mapa f da forma pelo peso); null nos soltos.
  // Os pontos andam e a curva é refeita por eles: as linhas e o preenchimento esticam entre os presos e os soltos.
  function pinMaps(model, pose, el, f) {
    const xf = el.xf;
    return el.pins.map((p) => {
      if (!p) return null;
      const m = pose.bones.get(p.bone), w = p.w;
      return (x, y) => {
        let q = xf ? M.apply(xf, x, y) : [x, y];
        if (m) q = M.apply(m, q[0], q[1]);
        if (w >= 1) return q;
        const a = f(x, y);
        return [a[0] + (q[0] - a[0]) * w, a[1] + (q[1] - a[1]) * w];
      };
    });
  }
  // o mapa do ponto i (com o 3D): para as alças dos pontos presos
  function pointMap(model, pose, el, i) {
    const f = mapper(model, pose, el), g = (el.pins && el.pins[i] && pinMaps(model, pose, el, f)[i]) || f, d3 = el3(model, pose, el);
    return d3 ? (x, y) => { const q = g(x, y); return d3.map(q[0], q[1]); } : g;
  }

  // x,y@osso no Godot com esqueleto (rig=bones): o peso de cada osso num lugar qualquer da imagem parada. No
  // contorno, cada trecho mistura os pesos das duas pontas como a curva mistura os pontos (linha reta: em linha
  // reta; curva: devagar perto das pontas); dentro da forma, a média dos pesos do contorno, pesada pela distância.
  // Devolve [[osso ou null (= o da forma), peso], ...].
  function pinWeights(model, el, x, y) {
    let S = el._pinw;
    if (!S) {
      const T = (p) => (el.xf ? M.apply(el.xf, p.x, p.y) : [p.x, p.y]);
      const keys = [null, ...new Set(el.pins.filter(Boolean).map((p) => p.bone))];
      const wv = el.pins.map((p) => keys.map((kk, j) => (p ? (j === 0 ? 1 - p.w : kk === p.bone ? p.w : 0) : j === 0 ? 1 : 0)));
      const n = el.pts.length, count = el.closed ? n : n - 1, line = el.type === 'line';
      const pts = el.pts.map((p) => { const q = T(p); const o = { x: q[0], y: q[1], corner: p.corner }; if (p.tan) { const t = T({ x: p.x + p.tan[0], y: p.y + p.tan[1] }); o.tan = [t[0] - q[0], t[1] - q[1]]; } return o; });
      const segs = line ? G.polySegs(pts, el.closed) : G.smoothSegs(pts, el.closed, el.smooth);
      const samples = [];
      for (let i = 0; i < count && i < segs.length; i++) {
        const s = segs[i], a = wv[i], b = wv[(i + 1) % n];
        // a alça de cada ponta anda com o ponto dela, a não ser num canto sem alça (fica a 1/3 do caminho)
        const straight = (j) => line || el.smooth <= 0 || (!pts[j].tan && (pts[j].corner || (!el.closed && (j === 0 || j === n - 1))));
        const c1 = straight(i) ? a.map((v, q) => (2 * v + b[q]) / 3) : a, c2 = straight((i + 1) % n) ? a.map((v, q) => (v + 2 * b[q]) / 3) : b;
        const est = Math.hypot(s[6] - s[0], s[7] - s[1]), N = Math.max(2, Math.min(40, Math.ceil(est / 4)));
        for (let j = 0; j < N; j++) {
          const t = j / N, u = 1 - t, B0 = u * u * u, B1 = 3 * u * u * t, B2 = 3 * u * t * t, B3 = t * t * t;
          samples.push({ x: B0 * s[0] + B1 * s[2] + B2 * s[4] + B3 * s[6], y: B0 * s[1] + B1 * s[3] + B2 * s[5] + B3 * s[7], w: keys.map((_, q) => B0 * a[q] + B1 * c1[q] + B2 * c2[q] + B3 * b[q]) });
        }
      }
      S = el._pinw = { keys, samples };
    }
    const acc = S.keys.map(() => 0);
    let sum = 0;
    for (const p of S.samples) {
      const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d2 < 0.25) return S.keys.map((kk, q) => [kk, p.w[q]]);
      const k = 1 / (d2 * d2);
      sum += k;
      p.w.forEach((v, q) => { acc[q] += v * k; });
    }
    return S.keys.map((kk, q) => [kk, sum ? acc[q] / sum : q === 0 ? 1 : 0]);
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

  // ---------- 2.5D: giro 3D, profundidade e perspectiva ----------
  // Cada giro é um "estágio": desfaz a perspectiva do ponto (pelo z dele), gira em volta do centro e projeta de
  // novo. Sem giro, o estágio não muda nada: o desenho fica onde foi desenhado. Os estágios vão de dentro para
  // fora: o giro da própria forma, os dos ossos (do osso dela até a raiz) e o da camada. O z sai da tela (perto).
  const D2R = Math.PI / 180;
  // distância do olho (persp=; 0 = sem perspectiva). Padrão: o dobro do lado maior do desenho.
  const eyeOf = (model, v) => (v === undefined || v === null ? 2 * Math.max(model.canvas.w, model.canvas.h) : v);
  function stage3(cx, cy, yaw, pitch, F) {
    const a = yaw * D2R, b = pitch * D2R;
    return { cx, cy, F, ca: Math.cos(a), sa: Math.sin(a), cb: Math.cos(b), sb: Math.sin(b) };
  }
  // p = [x, y, z, escala], alterado no lugar; a escala junta o quanto a perspectiva aumentou o ponto
  function run3(s, p) {
    const F = s.F, z = p[2];
    const k0 = F ? Math.max(0.05 * F, F - z) / F : 1;
    const dx = (p[0] - s.cx) * k0, dy = (p[1] - s.cy) * k0;
    const x1 = dx * s.ca + z * s.sa, z1 = -dx * s.sa + z * s.ca;
    const y1 = dy * s.cb - z1 * s.sb, z2 = dy * s.sb + z1 * s.cb;
    const k1 = F ? F / Math.max(0.05 * F, F - z2) : 1;
    p[0] = s.cx + x1 * k1;
    p[1] = s.cy + y1 * k1;
    p[2] = z2;
    p[3] *= k0 * k1;
  }
  // iso: o ponto (0,0) do mapa vai para iso=x,y (padrão: em cima, no meio do desenho)
  const isoOrigin = (model, L) => (Array.isArray(L.iso) ? L.iso : [model.canvas.w / 2, 0]);
  // giro da camada inteira. floor deita a camada: a linha do pivô (padrão: a de baixo) fica igual e o que está
  // mais para cima vai para longe, até o infinito chegar no horizonte (horizon=). Sem persp=, deita 45°.
  function layerStage(model, pose, L) {
    const lp = pose.lprops.get(L.name) || NOPROPS;
    const yaw = lp.yaw !== undefined ? lp.yaw : L.yaw || 0;
    let pitch = lp.pitch !== undefined ? lp.pitch : L.pitch || 0, c = L.pivot, F = eyeOf(model, L.persp);
    if (L.floor) {
      c = c || [model.canvas.w / 2, model.canvas.h];
      const H = L.horizon !== null && L.horizon !== undefined ? L.horizon : model.canvas.h * 0.3, hh = c[1] - H;
      const own = L.persp !== null && L.persp !== undefined;
      if (hh > 0) {
        if (!pitch) pitch = own ? (F ? Math.atan(F / hh) / D2R : 60) : 45;
        if (!own) F = hh * Math.tan(Math.min(89, pitch) * D2R);
      }
    }
    if (!yaw && !pitch) return null;
    c = c || [model.canvas.w / 2, model.canvas.h / 2];
    return stage3(c[0], c[1], yaw, pitch, F);
  }
  // as propriedades animadas de uma forma (as cópias do 3D, como o verso, usam as da forma de origem)
  const propsOf = (pose, el) => pose.props.get(el._pid !== undefined ? el._pid : el.id) || NOPROPS;

  // Tudo o que o 3D precisa de uma forma nesta pose (fica guardado na pose). on = false: nada gira e a forma
  // fica como foi desenhada (sai igualzinho a antes do 3D); depth ainda serve para o zsort.
  function info3(model, pose, el) {
    const key = '3d' + el.id;
    let d = pose.geo.get(key);
    if (!d) { d = make3(model, pose, el); pose.geo.set(key, d); }
    return d;
  }
  const el3 = (model, pose, el) => { if (!model.has3d) return null; const d = info3(model, pose, el); return d.on ? d : null; };
  function make3(model, pose, el) {
    const src = el._src || el, pr = pose.props.get(src.id) || NOPROPS;
    const L = src.layer, iso = L && L.iso ? isoOrigin(model, L) : null;
    const yaw = (pr.yaw !== undefined ? pr.yaw : src.yaw || 0) + (el._flip ? 180 : 0);
    const pitch = pr.pitch !== undefined ? pr.pitch : src.pitch || 0;
    const hasZ = pr.z !== undefined || src.z !== undefined;
    let zc = (pr.z !== undefined ? pr.z : src.z || 0) + (src.zu || 0);
    // no mapa isométrico a espessura sobe: a forma é o tampo do bloco
    if (iso && src.thick > 0) zc += src.thick;
    const dz = el._dz || 0, sign = el._flip ? -1 : 1;
    const f = mapper(model, pose, src), lb = localBox(src), own = f(lb.x + lb.w / 2, lb.y + lb.h / 2);
    const stages = [];
    if (yaw || pitch) stages.push(stage3(own[0], own[1], yaw, pitch, eyeOf(model, src.persp)));
    // ossos, do osso da forma até a raiz; o primeiro com round= dá a bola
    let ball = null;
    for (let bn = src.bone || src.on, guard = 0; bn && guard < 64; guard++) {
      const b = model.bones.get(bn);
      if (!b) break;
      const m = pose.bones.get(bn), bv = pose.b3 && pose.b3.get(bn);
      const c0 = b.round ? b.round.c : b.pivot, c = m ? M.apply(m, c0[0], c0[1]) : c0;
      if (b.round && !ball) ball = { x: c[0], y: c[1], r: b.round.r * (m ? scaleOf(m) : 1) };
      const by = bv && bv.yaw !== undefined ? bv.yaw : b.yaw || 0, bp = bv && bv.pitch !== undefined ? bv.pitch : b.pitch || 0;
      if (by || bp) stages.push(stage3(c[0], c[1], by, bp, eyeOf(model, b.persp)));
      bn = b.parent;
    }
    const nOwn = stages.length;
    if (L && !iso) { const s = layerStage(model, pose, L); if (s) stages.push(s); }
    // z de cada ponto: o z= da forma (um cartão reto) ou, num osso com round=, a superfície da bola
    const sphere = ball && !hasZ && !src.billboard ? ball : null;
    const z0 = sign * (zc + dz);
    const zOf = sphere ? (x, y) => { const dx = x - sphere.x, dy = y - sphere.y, q = sphere.r * sphere.r - dx * dx - dy * dy; return sign * ((q > 0 ? Math.sqrt(q) : 0) + zc + dz); } : () => z0;
    if (!stages.length && !iso) return { on: false, depth: zOf(own[0], own[1]) };
    const map3 = (x, y, z) => {
      const p = [x, y, z, 1];
      for (const s of stages) run3(s, p);
      if (iso) { const X = p[0], Y = p[1]; p[0] = iso[0] + X - Y; p[1] = iso[1] + (X + Y) / 2 - p[2]; p[2] = X + Y + 1e-3 * p[2]; }
      return p;
    };
    // para onde a frente aponta: só os giros da forma e dos ossos (o da camada não escurece nada)
    let nx = 0, ny = 0, nz = 1, nzOwn = 1;
    stages.forEach((s, i) => {
      const x1 = nx * s.ca + nz * s.sa, z1 = -nx * s.sa + nz * s.ca;
      nx = x1;
      const y1 = ny * s.cb - z1 * s.sb;
      nz = ny * s.sb + z1 * s.cb;
      ny = y1;
      if (i === nOwn - 1) nzOwn = nz;
    });
    let map, depth;
    if (src.billboard) {
      // billboard: só o ponto de apoio anda (e a perspectiva muda o tamanho); a forma continua de frente
      const m = src.bone ? pose.bones.get(src.bone) : null;
      const a = src.boardAt ? (m ? M.apply(m, src.boardAt[0], src.boardAt[1]) : src.boardAt) : f(lb.x + lb.w / 2, lb.y + lb.h);
      const q = map3(a[0], a[1], z0), k = q[3];
      map = (x, y) => [q[0] + (x - a[0]) * k, q[1] + (y - a[1]) * k];
      depth = q[2];
      nz = nzOwn = 1;
    } else {
      map = (x, y) => map3(x, y, zOf(x, y));
      depth = map3(own[0], own[1], zOf(own[0], own[1]))[2];
    }
    // na bola, a peça que vai para trás dela some aos poucos
    let fade = 1;
    if (sphere && !iso) {
      const c = map3(sphere.x, sphere.y, sign * (zc + dz)), t = (depth - c[2]) / (sphere.r || 1);
      fade = Math.max(0, Math.min(1, 1 + t / 0.12));
    }
    // cartão virando: fica mais escuro quanto mais de lado (shade= da camada)
    const sh = L && L.shade !== undefined ? L.shade : 0.5;
    const dark = nOwn && !sphere && !src.billboard && !iso ? sh * 0.7 * (1 - Math.min(1, Math.abs(nzOwn))) : 0;
    // uma direção girada como a forma (sem perspectiva): para a luz dos lados do bloco
    const rotN = (v) => {
      let [x, y, z] = v;
      for (const s of stages) { const x1 = x * s.ca + z * s.sa, z1 = -x * s.sa + z * s.ca, y1 = y * s.cb - z1 * s.sb; z = y * s.sb + z1 * s.cb; x = x1; y = y1; }
      return [x, y, z];
    };
    return { on: true, map, map3, zOf, rotN, nz, fade, dark, depth, iso, curved: !!sphere };
  }
  // coordenadas do código → tela, com o 3D (para gradientes, hachuras e alças)
  function fullMap(model, pose, el) {
    const f = mapper(model, pose, el), d3 = el3(model, pose, el);
    return d3 ? (x, y) => { const q = f(x, y); return d3.map(q[0], q[1]); } : f;
  }
  // matriz do texto com o 3D: a mais parecida com o giro, pelos cantos da caixa do texto
  function textMat(model, pose, el) {
    const m = textMatrix(pose, el), d3 = el3(model, pose, el);
    if (!d3) return m;
    const b = textBox(el);
    if (!(b.w > 0) || !(b.h > 0)) return m;
    const P = (x, y) => { const q = M.apply(m, x, y); return d3.map(q[0], q[1]); };
    const p0 = P(b.x, b.y), px = P(b.x + b.w, b.y), py = P(b.x, b.y + b.h);
    const a = [(px[0] - p0[0]) / b.w, (px[1] - p0[1]) / b.w], c = [(py[0] - p0[0]) / b.h, (py[1] - p0[1]) / b.h];
    return [a[0], a[1], c[0], c[1], p0[0] - a[0] * b.x - c[0] * b.y, p0[1] - a[1] * b.x - c[1] * b.y];
  }
  // Cópias de uma forma para o 3D: bk = o verso (back=) virado de costas no lugar dela; bt = o verso no fundo
  // do bloco (thick=); tb = a própria forma no fundo do bloco.
  function proxy3(el, kind) {
    const key = '_p3' + kind;
    if (el[key]) return el[key];
    const flip = kind !== 'tb', B = flip ? el.back : el, P = Object.create(B);
    Object.assign(P, { id: kind + el.id, _pid: B.id, _src: el, _flip: flip, _dz: kind === 'bk' ? 0 : -el.thick, hidden: false, layer: el.layer, bone: el.bone, bones: el.bones, cloth: el.cloth, thick: 0, back: null, cuts: null });
    el[key] = P;
    return P;
  }
  // lados de uma forma com espessura: um quadrilátero por trecho do contorno, de longe para perto. k = luz do
  // lado (1 = a cor dos lados; menos = mais escuro): a luz vem de cima à esquerda; no iso, o lado esquerdo é o claro.
  function sideQuads(model, pose, el, d3) {
    const fl = geometry(model, pose, el).flat2;
    if (!fl) return [];
    const n = fl.length / 2, t = el.thick, top = [], bot = [];
    let A2 = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; A2 += fl[2 * i] * fl[2 * j + 1] - fl[2 * j] * fl[2 * i + 1]; }
    const sg = A2 > 0 ? 1 : -1, clamp1 = (v) => Math.max(-1, Math.min(1, v));
    for (let i = 0; i < n; i++) {
      const x = fl[2 * i], y = fl[2 * i + 1], z = d3.zOf(x, y);
      top.push(d3.map3(x, y, z));
      bot.push(d3.map3(x, y, z - t));
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = top[i], b = top[j], c = bot[j], d = bot[i];
      const ex = fl[2 * j] - fl[2 * i], ey = fl[2 * j + 1] - fl[2 * i + 1], l = Math.hypot(ex, ey) || 1;
      const nv = d3.rotN([(sg * ey) / l, (-sg * ex) / l, 0]);
      const k = d3.iso ? 0.86 + 0.14 * clamp1(nv[1] - nv[0]) : 0.84 + 0.16 * clamp1(-0.6 * nv[0] - 0.8 * nv[1]);
      out.push({ q: [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]], depth: (a[2] + b[2] + c[2] + d[2]) / 4, k });
    }
    return out.sort((p, q) => p.depth - q.depth);
  }
  // forma com espessura: a face de longe, os lados e a de perto, na ordem de pintar (no iso, só lados e tampo)
  function solidParts(model, pose, el, d3) {
    const quads = sideQuads(model, pose, el, d3);
    if (d3.iso) return { far: null, quads, near: el };
    const back = proxy3(el, el.back ? 'bt' : 'tb');
    return d3.nz >= 0 ? { far: back, quads, near: el } : { far: el, quads, near: back };
  }
  // cor dos lados: thickc= ou a cor da forma mais escura
  function sideColor(el, pr) {
    if (el.thickc) return el.thickc;
    const f = pr.c !== undefined ? pr.c : el.fill;
    return typeof f === 'string' && G.parseHex(f) ? G.lerpColor(f, '#000000', 0.2) : typeof el.inkc === 'string' ? el.inkc : '#555555';
  }
  // tira os pontos do meio dos trechos retos (o giro e a perspectiva levam reta em reta): menos lados no bloco
  // e um SVG menor. Na bola (round=), a reta entorta, então lá isto não é usado.
  function dropStraight(p) {
    const n = p.length / 2;
    if (n < 4) return p;
    const out = [p[0], p[1]];
    let k = 0;
    for (let i = 1; i < n - 1; i++) {
      // o ponto i pode sair se todos de k até i ficam na reta de k até i+1
      const ax = p[2 * k], ay = p[2 * k + 1], dx = p[2 * i + 2] - ax, dy = p[2 * i + 3] - ay, l = Math.hypot(dx, dy) || 1;
      let ok = true;
      for (let j = k + 1; j <= i && ok; j++) ok = Math.abs((p[2 * j] - ax) * dy - (p[2 * j + 1] - ay) * dx) / l <= 0.05;
      if (!ok) { out.push(p[2 * i], p[2 * i + 1]); k = i; }
    }
    out.push(p[2 * n - 2], p[2 * n - 1]);
    return out;
  }
  // zsort: longe primeiro (no iso, de cima do mapa para baixo); empate fica na ordem do arquivo
  function zSort(model, pose, items) {
    return items.map((it, i) => ({ it, i, d: info3(model, pose, it.el).depth })).sort((a, b) => a.d - b.d || a.i - b.i).map((o) => o.it);
  }

  // ---------- morph entre formas quaisquer ----------
  // Formas do mesmo tipo e com o mesmo número de pontos se misturam ponto a ponto. As outras (elipse que
  // vira estrela, boca de 4 pontos que vira uma de 7) viram contornos com MORPH_N pontos espalhados por
  // igual, alinhados para cada ponto andar o mínimo, e a mistura é entre esses contornos.
  const MORPH_N = 72;
  const lerpable = (a, b) => a.type === b.type && (!a.pts || !b.pts || a.pts.length === b.pts.length);
  function rawSegs(e) {
    if (e.type === 'ellipse') return G.ellipseSegs(e.center[0], e.center[1], e.radius[0], e.radius[1], e.rot);
    if (e.type === 'rect') return G.rectSegs(e.xy[0], e.xy[1], e.size[0], e.size[1], e.r, e.rot);
    if (e.type === 'line') return G.polySegs(e.pts, false);
    return G.smoothSegs(e.pts, e.closed, e.smooth);
  }
  // n pontos com a mesma distância entre si ao longo do contorno (fechado: sem repetir o primeiro)
  function resample(flat, n, closed) {
    const pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
    if (closed && pts.length > 1) { const a = pts[0], b = pts[pts.length - 1]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6) pts.push(a.slice()); }
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = acc[acc.length - 1] || 1, out = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      const s = closed ? (total * k) / n : (total * k) / (n - 1);
      while (j < acc.length - 2 && acc[j + 1] < s) j++;
      const span = acc[j + 1] - acc[j] || 1, f = Math.min(1, Math.max(0, (s - acc[j]) / span));
      const a = pts[j], b = pts[Math.min(j + 1, pts.length - 1)];
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
    return out;
  }
  const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; };
  function morphPair(model, a, b) {
    model._morph = model._morph || new Map();
    const key = `${a.id}>${b.id}`;
    if (model._morph.has(key)) return model._morph.get(key);
    const closed = a.closed;
    const A = resample(G.flatten(rawSegs(a), 1.5), MORPH_N, closed);
    let B = resample(G.flatten(rawSegs(b), 1.5), MORPH_N, closed);
    if (closed) {
      // mesmo sentido de volta e o começo que deixa os pontos mais perto dos seus pares
      if (Math.sign(area(A)) !== Math.sign(area(B))) B = B.slice().reverse();
      let best = 0, bd = Infinity;
      for (let s = 0; s < MORPH_N; s++) {
        let d = 0;
        for (let i = 0; i < MORPH_N && d < bd; i++) { const p = A[i], q = B[(i + s) % MORPH_N]; d += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; }
        if (d < bd) { bd = d; best = s; }
      }
      B = B.map((_, i) => B[(i + best) % MORPH_N]);
    } else {
      const d = (P, Q) => P.reduce((s, p, i) => s + (p[0] - Q[i][0]) ** 2 + (p[1] - Q[i][1]) ** 2, 0);
      const R2 = B.slice().reverse();
      if (d(A, R2) < d(A, B)) B = R2;
    }
    const pair = { A, B };
    model._morph.set(key, pair);
    return pair;
  }

  function geometry(model, pose, el) {
    let g = pose.geo.get(el.id);
    if (g) return g;
    const pr = pose.props.get(el._pid !== undefined ? el._pid : el.id);
    const mo = pr && pr.shape && pr.shape.from && pr.shape.to ? pr.shape : null;
    let segs = [];
    // bones=: a curva é desenhada parada e depois dobrada ponto a ponto pelos ossos
    const skin = el.bones ? skinMap(model, pose, el) : null;
    const mapOf = () => (skin ? (el.xf ? (x, y) => M.apply(el.xf, x, y) : (x, y) => [x, y]) : mapper(model, pose, el));
    if (mo && (!lerpable(mo.from, mo.to) || mo.from.type !== el.type || mo.to.type !== el.type) && el.type !== 'text' && el.type !== 'emitter' && !el.limb) {
      const { A, B } = morphPair(model, mo.from, mo.to), t = mo.t, f = mapOf();
      const pts = A.map((p, i) => { const q = f(p[0] + (B[i][0] - p[0]) * t, p[1] + (B[i][1] - p[1]) * t); return { x: q[0], y: q[1] }; });
      segs = G.polySegs(pts, el.closed);
    } else if (el.type === 'ellipse') {
      let c = el.center, r = el.radius, rot = el.rot;
      if (mo) {
        const A = mo.from, B = mo.to, t = mo.t;
        c = [lerp(A.center[0], B.center[0], t), lerp(A.center[1], B.center[1], t)];
        r = [lerp(A.radius[0], B.radius[0], t), lerp(A.radius[1], B.radius[1], t)];
        rot = lerp(A.rot, B.rot, t);
      }
      const f = mapOf();
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
      const f = mapOf();
      segs = G.rectSegs(xy[0], xy[1], size[0], size[1], rr, rot).map((s) => G.mapSeg(s, f));
    } else if (el.type === 'text') {
      const b = textBox(el), m = textMatrix(pose, el);
      segs = G.rectSegs(b.x, b.y, b.w, b.h, 0, 0).map((s) => G.mapSeg(s, (x, y) => M.apply(m, x, y)));
    } else if (el.type === 'emitter') {
      const f = mapOf();
      segs = G.ellipseSegs(el.at[0], el.at[1], 4, 4, 0).map((s) => G.mapSeg(s, f));
    } else if (el.limb) {
      segs = G.smoothSegs(limbPoints(model, pose, el), false, 1);
    } else {
      const pts = mo ? lerpPts(mo.from.pts, mo.to.pts, mo.t, el.pts) : el.pts;
      const f = mapOf(), fs = el.pins && !skin ? pinMaps(model, pose, el, f) : null;
      if (el.type === 'line') segs = G.polySegs(mapPts(pts, f, fs), false);
      else if (pts.length >= 2) segs = G.smoothSegs(mapPts(pts, f, fs), el.closed, el.smooth);
    }
    if (skin && segs.length) {
      const fl = G.flatten(segs, 3), pts = [];
      for (let i = 0; i < fl.length; i += 2) { const q = skin(fl[i], fl[i + 1]); pts.push({ x: q[0], y: q[1] }); }
      if (el.closed && pts.length > 2 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 1e-6) pts.pop();
      segs = G.polySegs(pts, el.closed);
    }
    // 3D: a curva vira pontos (flat2, como desenhada) e cada ponto gira e ganha perspectiva
    const d3 = el.type !== 'emitter' ? el3(model, pose, el) : null;
    let flat2 = null;
    if (d3 && segs.length) {
      flat2 = G.flatten(segs, 1.5);
      const n = flat2.length;
      if (el.closed && n > 6 && Math.hypot(flat2[0] - flat2[n - 2], flat2[1] - flat2[n - 1]) < 1e-6) flat2 = flat2.slice(0, n - 2);
      if (!d3.curved) flat2 = dropStraight(flat2);
      const pts = [];
      for (let i = 0; i < flat2.length; i += 2) { const q = d3.map(flat2[i], flat2[i + 1]); pts.push({ x: q[0], y: q[1] }); }
      segs = G.polySegs(pts, el.closed);
    }
    g = { segs, closed: el.closed, _path: null, _flat: null, flat2 };
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
  // Moldes que se cruzam (pelas caixas): num recorte só, a regra par-ímpar pinta de novo onde dois se cruzam,
  // então cada um recorta à parte. Moldes separados continuam num recorte só (sem emenda entre vizinhos).
  function crossing(model, pose, els) {
    if (els.length < 2) return false;
    const bx = els.map((e) => segsBox(geometry(model, pose, e).segs));
    const over = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;
    for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) if (over(bx[i], bx[j])) return true;
    return false;
  }
  function clipOutEach(ctx, model, pose, els) {
    for (const e of els) ctx.clip(inverse(pathOf(geometry(model, pose, e))), 'evenodd');
  }
  // os buracos (cut=) das formas de um molde
  const moldHoles = (model, name) => clipEls(model, name).filter((e) => e.closed && e.cuts).flatMap((e) => e.cuts);
  // clip= da camada: só dentro do molde; os buracos do molde continuam buracos
  function clipInto(ctx, model, pose, name) {
    ctx.clip(clipPath(model, pose, name));
    clipOutEach(ctx, model, pose, moldHoles(model, name));
  }
  // cut= da camada: tudo menos o molde; pelos buracos do molde a camada aparece
  function clipAway(ctx, model, pose, name) {
    // o molde de um buraco que está na mesma camada só empresta o formato: não recorta sozinho
    const holes = moldHoles(model, name), els = clipEls(model, name).filter((e) => e.closed && !holes.includes(e));
    if (!holes.length && !crossing(model, pose, els)) { ctx.clip(inverse(clipPath(model, pose, name)), 'evenodd'); return; }
    for (const e of els) {
      const p = inverse(pathOf(geometry(model, pose, e)));
      if (e.cuts) for (const h of e.cuts) p.addPath(pathOf(geometry(model, pose, h)));
      ctx.clip(p, 'evenodd');
    }
  }

  // ---------- tinta: cor ou gradiente ----------
  function gradGeom(model, pose, el, g) {
    const f = el ? fullMap(model, pose, el) : (x, y) => [x, y];
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
    const d3 = el3(model, pose, el);
    if (d3) for (const p of out) { const q = d3.map(p.x, p.y); p.x = q[0]; p.y = q[1]; }
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
    const f = fullMap(model, pose, el), b = localBox(el);
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
    if (layer.only && !(pose.anim ? animIn(layer.only, pose.anim) : layer.only.includes('pose'))) return false;
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
  // Passes dos estilos de arte (opts.pass): o mesmo desenho de outro jeito, para o estilo comparar.
  //   unlit: sem luz · noInk: sem o contorno (ink) · toon: { shadow, c }: a faixa de sombra de cada forma, do
  //   lado oposto ao light= do canvas · tex: { tile, d, px, off }: cada forma recebe a textura do estilo presa a
  //   ela (sem luz, sem contorno, sem traços, textos, partículas nem efeitos de camada) · stroke: { fill, ink,
  //   line }: o estilo pinta cada forma e cada traço, na ordem do desenho (ver strokeInfo).
  // Sem opts.pass, o desenho é o de sempre (e um drawScene de dentro herda o passe de quem chamou).
  let PASS = null;
  function drawScene(ctx, model, pose, opts) {
    if (!opts || opts.pass === undefined) return drawScene0(ctx, model, pose, opts);
    const prev = PASS;
    PASS = opts.pass || null;
    try { return drawScene0(ctx, model, pose, opts); } finally { PASS = prev; }
  }
  function drawScene0(ctx, model, pose, opts) {
    opts = opts || {};
    const tex = !!(PASS && PASS.tex);
    if (opts.background !== false && !tex) fillBg(ctx, model, pose, { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h });
    const lighting = PASS && (PASS.unlit || tex) ? null : opts.lighting !== undefined ? opts.lighting : sceneLights(model, pose);
    const R = { model, pose, opts, lighting, maps: null };
    for (const layer of orderLayers(model, pose)) {
      // com opts.layers, quem chama já decidiu o que aparece (no filme, only= também aceita shots)
      if (opts.layers ? !opts.layers.has(layer) : !layerVisible(layer, pose, opts)) continue;
      const lp = pose.lprops.get(layer.name) || NOPROPS;
      if (lp.show === 0) continue;
      const alpha = layer.opacity * (lp.opacity !== undefined ? lp.opacity : 1);
      if (alpha <= 0.001) continue;
      let items = orderItems(opts.items ? layer.items.filter((it) => opts.items.has(it)) : opts.filter ? layer.items.filter((it) => opts.filter(it.el)) : layer.items, pose);
      if (layer.zsort && model.has3d) items = zSort(model, pose, items);
      if (layer.cast && lighting) drawCast(ctx, R, layer, items, alpha);
      if (!items.length) continue;
      const lit = !!lighting && !layer.unlit && !layer.guide;
      const fx = tex ? null : layerFx(layer, lp);
      if (fx || (layer.trail && pose.anim && !tex)) drawFxLayer(ctx, R, layer, items, alpha, lit, fx || {});
      else drawLayer(ctx, R, layer, items, alpha, lit, pose, false);
    }
    if (lighting && opts.glows !== false) drawLightGlows(ctx, lighting);
  }

  function drawLayer(ctx, R, layer, items, alpha, lit, pose, solo, flat) {
    ctx.save();
    if (!solo) ctx.globalCompositeOperation = PASS && PASS.tex ? 'source-over' : layer.blend;
    if (layer.clip) clipInto(ctx, R.model, pose, layer.clip);
    if (layer.cut) clipAway(ctx, R.model, pose, layer.cut);
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
  // Passe stroke: só o brilho do emit= (a sombra colorida), uma vez, sem o desenho (ele vai para longe e a sombra
  // volta para o lugar); depois o estilo pinta sem sombra (com ela, cada passada do estilo somaria o brilho).
  function glowOnly(ctx, SP, draw) {
    if (ctx.shadowBlur && SP.glow !== false) {
      const T = ctx.getTransform(), D = 1e4;
      ctx.save();
      ctx.setTransform(T.a, T.b, T.c, T.d, T.e - D, T.f);
      ctx.shadowOffsetX = D;
      draw(ctx);
      ctx.restore();
    }
    glowOff(ctx);
  }

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
  // Com 3D: some atrás da bola (round=), mostra o verso (back=) quando vira de costas e monta o bloco (thick=).
  function drawItem(ctx, model, pose, el, part, layer, base, R, flat) {
    const d3 = model.has3d && (!el.hidden || propsOf(pose, el).reveal) ? el3(model, pose, el) : null;
    if (!d3) { drawItem0(ctx, model, pose, el, part, layer, base, R, flat); return; }
    if (d3.fade <= 0.001) return;
    base *= d3.fade;
    if (el.thick > 0 && el.closed && !el._src && !el.billboard) {
      const sp = solidParts(model, pose, el, d3);
      if (part !== 'ink') {
        if (sp.far) drawItem0(ctx, model, pose, sp.far, part, layer, base, R, flat);
        drawSides(ctx, model, pose, el, sp.quads, base, R, flat);
      }
      drawItem0(ctx, model, pose, sp.near, part, layer, base, R, flat);
      return;
    }
    drawItem0(ctx, model, pose, d3.nz < 0 && el.back ? proxy3(el, 'bk') : el, part, layer, base, R, flat);
  }
  // os lados do bloco: primeiro o contorno (fica só por fora), depois o preenchimento de cada lado
  function drawSides(ctx, model, pose, el, quads, base, R, flat) {
    const pr = propsOf(pose, el);
    const alpha = base * el.opacity * (pr.opacity !== undefined ? pr.opacity : 1);
    if (alpha <= 0.001 || pr.show === 0 || !quads.length || (PASS && PASS.tex)) return;
    let col = sideColor(el, pr);
    const ink = pr.ink !== undefined ? pr.ink : el.ink;
    let inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
    if (R) {
      const b = segsBox(geometry(model, pose, el).segs);
      col = litColor(col, R.lighting, b.x + b.w / 2, b.y + b.h / 2);
      inkc = litColor(inkc, R.lighting, b.x + b.w / 2, b.y + b.h / 2, true);
    }
    const quad = (q) => { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(q[4], q[5]); ctx.lineTo(q[6], q[7]); ctx.closePath(); };
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    if (ink > 0 && typeof inkc === 'string' && model.finish.style !== 'flat' && !flat && !(PASS && PASS.noInk)) {
      ctx.strokeStyle = inkc;
      ctx.lineWidth = ink;
      for (const s of quads) { quad(s.q); ctx.stroke(); }
    }
    ctx.lineWidth = 1;
    for (const s of quads) {
      ctx.fillStyle = ctx.strokeStyle = G.lerpColor(col, '#000000', 1 - s.k);
      quad(s.q);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawItem0(ctx, model, pose, el, part, layer, base, R, flat) {
    const pr = propsOf(pose, el);
    // reveal: num filme, at forma.show=1 mostra uma forma com hidden
    if (el.hidden && !pr.reveal) return;
    if (pr.show === 0) return;
    const alpha = base * el.opacity * (pr.opacity !== undefined ? pr.opacity : 1);
    if (alpha <= 0.001) return;
    const dr = pr.draw !== undefined ? Math.max(0, Math.min(1, pr.draw)) : 1;
    if (dr <= 0.001) return;
    const fin = model.finish;
    const L = R && !el.emit ? R : null; // o que emite luz não recebe luz
    ctx.globalAlpha = alpha;
    ctx.setLineDash([]);
    const tex = !!(PASS && PASS.tex);
    // no passe tex, e num passe stroke com text: false (o estilo põe os textos e as partículas num passe por cima),
    // sem os textos e as partículas
    if ((tex || (PASS && PASS.stroke && PASS.stroke.text === false)) && (el.type === 'text' || el.type === 'emitter')) return;
    const emit = el.emit && !flat && !tex;
    if (emit) glowOn(ctx, el.emit);
    if (el.type === 'text') { drawText(ctx, model, pose, el, pr, L, dr); glowOff(ctx); return; }
    if (el.type === 'emitter') { drawParticles(ctx, model, pose, el, alpha, L); glowOff(ctx); return; }
    const g = geometry(model, pose, el);
    if (!g.segs.length) { glowOff(ctx); return; }
    if (el.closed) {
      const fill = pr.c !== undefined ? pr.c : el.fill;
      const ink = pr.ink !== undefined ? pr.ink : el.ink;
      let inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
      const hasInk = ink > 0 && fin.style !== 'flat' && inkc && !(PASS && (PASS.noInk || PASS.tex));
      const withInk = part !== 'fill' && hasInk;
      const cut = el.cuts ? cutPath(model, pose, el) : null;
      const apart = cut && crossing(model, pose, el.cuts);
      const path = pathOf(g);
      const bb = L ? segsBox(g.segs) : null;
      const dp = dr < 1 ? drawParts(dr) : null;
      if (L && withInk) inkc = litColor(inkc, L.lighting, bb.x + bb.w / 2, bb.y + bb.h / 2, true);
      // passe stroke: o estilo pinta a forma (menos as guias e as formas desenhando aos poucos)
      const SP = PASS && PASS.stroke && !layer.guide && !dp ? PASS.stroke : null;
      const sinfo = SP ? strokeInfo(ctx, model, pose, el, g, true, { path, fill, ink, inkc, hasInk: ink > 0 && !!inkc && fin.style !== 'flat', alpha }) : null;
      if (cut) { ctx.save(); if (apart) clipOutEach(ctx, model, pose, el.cuts); else ctx.clip(inverse(cut), 'evenodd'); }
      if (part !== 'ink' && fill && (!dp || dp.fill > 0)) {
        const fa = dp ? alpha * dp.fill : alpha;
        ctx.globalAlpha = fa;
        if (tex) texFill(ctx, model, pose, el, g, path);
        else if (SP) { glowOnly(ctx, SP, (x) => { x.fillStyle = sinfo.fillStyle; x.fill(path); }); SP.fill(ctx, sinfo); }
        else if (fill.kind === 'pat') drawPattern(ctx, model, pose, el, g, fill);
        else { ctx.fillStyle = paint(ctx, model, pose, el, fill); ctx.fill(path); }
        glowOff(ctx);
        // cartão virando de lado (3D): mais escuro
        const d3 = tex ? null : el3(model, pose, el);
        if (d3 && d3.dark > 0.004) {
          ctx.save();
          ctx.globalAlpha = fa * d3.dark;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#000000';
          ctx.fill(path);
          ctx.restore();
        }
        if (L) {
          shadeShape(ctx, L, path, bb, layer, fa);
          lightRaster(ctx, L, path, bb, fa);
          const rim = layer.rim || L.lighting.rim;
          if (rim) rimShape(ctx, L, el, g, path, bb, rim, fa);
        }
        if (PASS && PASS.toon && !layer.unlit && !layer.guide) toonBand(ctx, model, g, path, fa, PASS.toon);
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
      } else if (SP) { if (part !== 'fill') { ctx.globalAlpha = alpha; SP.ink(ctx, sinfo); } } else if (withInk) drawInk(ctx, model, pose, g, el, ink, inkc);
      if (cut) {
        ctx.restore();
        // contorno dos buracos, só por dentro da forma; buracos que se cruzam: cada um por fora dos outros
        if (withInk && !dp) {
          for (const h of apart ? el.cuts : [null]) {
            ctx.save();
            ctx.clip(path);
            if (h) clipOutEach(ctx, model, pose, el.cuts.filter((o) => o !== h));
            if (SP) {
              // no passe stroke, o contorno de cada buraco é pintado pelo estilo
              for (const c of h ? [h] : el.cuts) {
                const hg = geometry(model, pose, c);
                if (hg.segs.length) SP.ink(ctx, strokeInfo(ctx, model, pose, el, hg, true, { path: pathOf(hg), fill, ink, inkc, hasInk: true, alpha, hole: true }));
              }
            } else {
              ctx.strokeStyle = paint(ctx, model, pose, el, inkc);
              ctx.lineWidth = ink;
              ctx.lineJoin = 'round';
              ctx.stroke(h ? pathOf(geometry(model, pose, h)) : cut);
            }
            ctx.restore();
          }
        }
      }
      return;
    }
    let color = pr.c !== undefined ? pr.c : el.color;
    if (!color || tex) { glowOff(ctx); return; }
    if (L) { const bb = segsBox(g.segs); color = litColor(color, L.lighting, bb.x + bb.w / 2, bb.y + bb.h / 2); }
    const w = pr.w !== undefined ? pr.w : el.w;
    ctx.fillStyle = ctx.strokeStyle = paint(ctx, model, pose, el, color);
    // desenhando aos poucos: só o começo do traço
    const pre = dr < 1 ? G.polyPrefix(flatOf(g), dr) : null;
    if (pre && pre.length < 4) { glowOff(ctx); return; }
    if (el.type === 'line') {
      const body = (x) => {
        x.lineWidth = w;
        x.lineCap = 'butt';
        x.lineJoin = 'round';
        if (el.dash) x.setLineDash(el.dash);
        x.stroke(pathOf(g));
        x.setLineDash([]);
      };
      if (PASS && PASS.stroke && !layer.guide && !pre) {
        const li = strokeInfo(ctx, model, pose, el, g, false, { color, w, ws: null, body, alpha: ctx.globalAlpha });
        glowOnly(ctx, PASS.stroke, (x) => { x.fillStyle = x.strokeStyle = li.lineStyle; body(x); });
        if (PASS.stroke.line(ctx, li)) return;
      }
      ctx.fillStyle = ctx.strokeStyle = paint(ctx, model, pose, el, color);
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
    if (PASS && PASS.stroke && !layer.guide && !pre) {
      // passe stroke: o estilo pinta o traço; body() desenha o corpo dele com o fillStyle/strokeStyle de agora
      const p = el.limb || el.taper[0] > 0 || el.taper[1] > 0 ? flatOf(g) : null;
      const ws = !p ? null : el.limb ? G.taperWidths(p, el.limb[0] * (w / (el.w || 1)), el.limb[1] * (w / (el.w || 1)), [0, 0]) : G.taperWidths(p, w, w, el.taper);
      const body = (x) => {
        if (ws) { G.drawVar(x, p, ws); return; }
        x.lineWidth = w;
        x.lineCap = el.cap;
        x.lineJoin = 'round';
        x.stroke(pathOf(g));
      };
      const li = strokeInfo(ctx, model, pose, el, g, false, { color, w, ws, body, alpha: ctx.globalAlpha });
      glowOnly(ctx, PASS.stroke, (x) => { x.fillStyle = x.strokeStyle = li.lineStyle; body(x); });
      if (PASS.stroke.line(ctx, li)) return;
      ctx.fillStyle = ctx.strokeStyle = paint(ctx, model, pose, el, color);
    }
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

  // Passe stroke: o que o estilo recebe de cada forma (closed) ou traço. poly: os pontos [x,y,x,y…]; path: a forma;
  // box: a caixa no desenho; style(spec): a cor ou o degradê pronto para pintar; fillStyle/inkStyle/lineStyle: os
  // da forma; key: um número da forma (para sortear); map/lbox: o osso (do desenho parado para o desenho) e a caixa
  // parada, para a textura andar com a forma; light: o light= do canvas; drawInk(): o contorno de sempre.
  function strokeInfo(ctx, model, pose, el, g, closed, o) {
    const info = Object.assign({ el, g, closed, poly: flatOf(g), box: segsBox(g.segs), key: hashKey(el.id), light: model.canvas.light, canvas: model.canvas }, o);
    info.style = (spec) => paint(ctx, model, pose, el, spec);
    if (closed) {
      info.fillStyle = o.fill ? paint(ctx, model, pose, el, o.fill) : null;
      info.fillSpec = o.fill || null;
      info.inkStyle = o.inkc ? paint(ctx, model, pose, el, o.inkc) : null;
      info.drawInk = () => {
        if (o.hole) { ctx.strokeStyle = info.inkStyle; ctx.lineWidth = o.ink; ctx.lineJoin = 'round'; ctx.stroke(o.path); return; }
        drawInk(ctx, model, pose, g, el, o.ink, o.inkc);
      };
    } else {
      info.lineStyle = paint(ctx, model, pose, el, o.color);
      info.lineSpec = o.color;
    }
    info.map = () => fullMap(model, pose, el);
    info.lbox = () => localBox(el);
    return info;
  }
  const hashKey = (id) => { const s = String(id); let h = 7; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

  // Passe toon: a faixa de sombra da forma, do lado oposto ao light= do canvas (a forma menos ela mesma
  // deslocada para a luz). Formas do tamanho do canvas (o chão, o céu) ficam sem.
  function toonBand(ctx, model, g, path, alpha, T) {
    if (!(T.shadow > 0)) return;
    const bb = segsBox(g.segs);
    if (bb.w >= model.canvas.w * 0.9 || bb.h >= model.canvas.h * 0.9) return;
    const l = model.canvas.light, ll = Math.hypot(l[0], l[1]) || 1, lx = l[0] / ll, ly = l[1] / ll;
    const d = T.shadow * (Math.abs(lx) * bb.w + Math.abs(ly) * bb.h);
    if (d < 0.25) return;
    ctx.save();
    ctx.clip(path);
    ctx.clip(inverse(inverseShift(g.segs, lx * d, ly * d)), 'evenodd');
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = T.c || '#a9aec6';
    ctx.fillRect(bb.x - 1, bb.y - 1, bb.w + 2, bb.h + 2);
    ctx.restore();
  }
  // Passe de textura: a forma recebe a textura do estilo (T.tile, d pontos por unidade, repetida), presa a ela:
  // anda e gira com o osso. A escala é a da tela (T.px pontos por unidade), para a textura ter sempre o mesmo
  // tamanho, mesmo num ator pequeno. T.off: o deslocamento da textura (boil, seed). T.turn(key): o giro da
  // textura em cada forma (um ângulo a partir do número da forma), para cada uma ter a sua direção.
  const TEXPAT = new WeakMap();
  function texFill(ctx, model, pose, el, g, path) {
    const T = PASS.tex, f = fullMap(model, pose, el), b = localBox(el);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, h = Math.max(1, Math.max(b.w, b.h) / 2);
    const p0 = f(cx, cy), px = f(cx + h, cy), py = f(cx, cy + h);
    const A = [(px[0] - p0[0]) / h, (px[1] - p0[1]) / h, (py[0] - p0[0]) / h, (py[1] - p0[1]) / h, 0, 0];
    A[4] = p0[0] - A[0] * cx - A[2] * cy;
    A[5] = p0[1] - A[1] * cx - A[3] * cy;
    const m = matOf(ctx), t = M.mul(m, A), k = T.px / (Math.sqrt(Math.abs(M.det(t))) || 1);
    let S0 = [t[0] * k, t[1] * k, t[2] * k, t[3] * k, t[4], t[5]];
    const turn = T.turn ? T.turn(hashKey(el.id)) : 0;
    if (turn) S0 = M.mul(S0, [Math.cos(turn), Math.sin(turn), -Math.sin(turn), Math.cos(turn), 0, 0]);
    const pm = M.mul(S0, [1 / T.d, 0, 0, 1 / T.d, -T.off[0], -T.off[1]]);
    const bb = segsBox(g.segs), inv = M.invert(pm);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of [[bb.x, bb.y], [bb.x + bb.w, bb.y], [bb.x, bb.y + bb.h], [bb.x + bb.w, bb.y + bb.h]]) {
      const q = M.apply(m, x, y), r = M.apply(inv, q[0], q[1]);
      x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[0]); y1 = Math.max(y1, r[1]);
    }
    ctx.save();
    ctx.clip(path);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(pm[0], pm[1], pm[2], pm[3], pm[4], pm[5]);
    // o padrão é feito uma vez por azulejo (fazer um a cada forma copia o azulejo inteiro)
    let pat = TEXPAT.get(T.tile);
    if (!pat) { pat = ctx.createPattern(T.tile, 'repeat'); TEXPAT.set(T.tile, pat); }
    ctx.fillStyle = pat;
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    ctx.restore();
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
    const m = textMat(model, pose, el);
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
  const hasBase = (f) => !!(f.bloom || f.vignette || f.grain || f.posterize);
  const hasPost = (model) => hasBase(model.finish) || hasScreen(model);
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
  // bloom, vinheta, granulado e posterização, aplicados na imagem pronta, e depois os efeitos de tela. o.base ===
  // false: só os de tela (a imagem pixelada já passou pelos outros); o.screen === false: sem os de tela
  function postFx(cv, model, seed, o) {
    o = o || {};
    const f = model.finish;
    if (o.base !== false && hasBase(f)) baseFx(cv, model, seed);
    if (o.screen !== false && hasScreen(model)) screenFx(cv, f, seed || 0);
  }
  function baseFx(cv, model, seed) {
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

  // ---------- efeitos de tela (finish oldfilm= vhs= glitch= crt=, de 0 a 1) ----------
  // Imitam o meio por onde a imagem passa: o filme antigo, a fita VHS, a imagem digital quebrando e a tela de tubo.
  // Valem no filme, no vídeo, no GIF e no PNG; a folha de sprites e o Godot saem sem eles (renderImage com
  // screen: false). seed: o número do quadro (o risco, a poeira e o tremido mudam de um quadro para o outro, mas
  // sempre do mesmo jeito). Os tamanhos andam com a altura da imagem (u: 1 em 540 pontos de altura).
  const SCREEN_FX = ['oldfilm', 'vhs', 'glitch', 'crt'], TAU = Math.PI * 2;
  const hasScreen = (model) => SCREEN_FX.some((k) => model.finish[k] > 0);
  // o aviso das exportações de jogo (null: sem efeitos de tela)
  const screenNote = (model) => {
    const on = SCREEN_FX.filter((k) => model.finish[k] > 0);
    return on.length ? `os efeitos de tela do finish (${on.map((k) => k + '=').join(', ')}) ficam de fora: eles são para o filme, o vídeo, o GIF e o PNG` : null;
  };
  // um número de 0 a 1 que só depende de (a, b, c)
  const hsh = (a, b, c) => {
    let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul((c | 0) + 0x3c6ef372, 0x85ebca6b)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
  };
  // a cor em (x, y) (bilinear, sem escurecer a borda do que é transparente; fora da imagem, a borda)
  function sampleAt(s, W, H, x, y, out) {
    x = Math.min(W - 0.5, Math.max(0.5, x)) - 0.5;
    y = Math.min(H - 0.5, Math.max(0.5, y)) - 0.5;
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < 4; j++) {
      const o = ((j < 2 ? y0 : y1) * W + (j & 1 ? x1 : x0)) * 4, w = (j & 1 ? fx : 1 - fx) * (j < 2 ? 1 - fy : fy) * s[o + 3];
      r += s[o] * w; g += s[o + 1] * w; b += s[o + 2] * w; a += w;
    }
    if (a > 0) { out[0] = r / a; out[1] = g / a; out[2] = b / a; } else out[0] = out[1] = out[2] = 0;
    out[3] = a;
    return out;
  }
  // filme antigo: sépia, a luz piscando, o quadro tremendo no projetor, o grão, as bordas escuras, os riscos (cada
  // um dura uns quadros), a poeira e, às vezes, um fio de cabelo
  const SEPIA = [[34, 22, 12], [150, 112, 72], [246, 232, 204]];
  function oldFilm(x, W, H, v, seed) {
    const img = x.getImageData(0, 0, W, H), d = img.data, s = new Uint8ClampedArray(d), u = H / 540, q = [0, 0, 0, 0];
    const R = (k) => hsh(seed, k, 11);
    const jx = (R(1) - 0.5) * 1.6 * v * u, jy = (R(2) - 0.5) * 4 * v * u, fl = 1 + (R(3) - 0.5) * 0.18 * v;
    const sep = Math.min(1, 1.5 * v), gr = 26 * v;
    for (let py = 0, o = 0; py < H; py++) {
      const ny = (py + 0.5) / H - 0.5;
      for (let px = 0; px < W; px++, o += 4) {
        sampleAt(s, W, H, px + 0.5 - jx, py + 0.5 - jy, q);
        if (!q[3]) { d[o + 3] = 0; continue; }
        const L = (0.299 * q[0] + 0.587 * q[1] + 0.114 * q[2]) / 255, lo = L < 0.5, a = lo ? SEPIA[0] : SEPIA[1], b = lo ? SEPIA[1] : SEPIA[2], t = lo ? L * 2 : L * 2 - 1;
        const nx = (px + 0.5) / W - 0.5, r2 = (nx * nx + ny * ny) * 2;
        const k = fl * (1 - 0.55 * v * Math.max(0, r2 - 0.2) ** 1.5), n = (hsh(px, py, seed) - 0.5) * gr;
        for (let ch = 0; ch < 3; ch++) d[o + ch] = (q[ch] + (a[ch] + (b[ch] - a[ch]) * t - q[ch]) * sep) * k + n;
        d[o + 3] = q[3];
      }
    }
    x.putImageData(img, 0, 0);
    x.save();
    x.globalCompositeOperation = 'source-atop';
    x.lineCap = 'round';
    const al = Math.min(1, 1.5 * v);
    for (let j = 0, ns = Math.ceil(3 * v); j < ns; j++) {
      const life = 6 + Math.floor(hsh(j, 1, 21) * 20), t0 = Math.floor(hsh(j, 2, 21) * life), ep = Math.floor((seed + t0) / life), age = (seed + t0) % life;
      if (hsh(j, ep, 22) > 0.6) continue;
      const X0 = hsh(j, ep, 23) * W + age * (hsh(j, ep, 24) - 0.5) * 3 * u;
      const ya = hsh(j, ep, 25) < 0.6 ? 0 : hsh(j, ep, 26) * H * 0.6, yb = Math.min(H, ya + (0.4 + 0.6 * hsh(j, ep, 27)) * H);
      const A = (0.25 + 0.35 * hsh(j, seed, 29)) * al;
      x.strokeStyle = hsh(j, ep, 28) < 0.7 ? `rgba(255,248,230,${A})` : `rgba(20,12,6,${A})`;
      x.lineWidth = Math.max(1, (0.6 + hsh(j, ep, 30)) * u);
      x.beginPath();
      for (let y = ya; y <= yb + 1e-6; y += 6 * u) x.lineTo(X0 + Math.sin((y / H) * 5 + j) * 1.5 * u + (hsh(j, Math.floor(y), seed) - 0.5) * 0.7 * u, y);
      x.stroke();
    }
    for (let i = 0, nd = Math.round(hsh(seed, 3, 31) * 9 * v); i < nd; i++) {
      const cx = hsh(seed, i, 33) * W, cy = hsh(seed, i, 34) * H, r = (0.6 + 2 * hsh(seed, i, 35)) * u, dark = hsh(seed, i, 36) < 0.8;
      x.fillStyle = dark ? `rgba(15,10,5,${0.75 * al})` : `rgba(255,250,235,${0.6 * al})`;
      for (let b = 0; b < 3; b++) {
        x.beginPath();
        x.arc(cx + (hsh(i, b, seed + 37) - 0.5) * r * 1.4, cy + (hsh(i, b, seed + 38) - 0.5) * r * 1.4, r * (0.5 + 0.5 * hsh(i, b, seed + 39)), 0, TAU);
        x.fill();
      }
    }
    if (hsh(seed, 4, 32) < 0.25 * v) {
      const cx = hsh(seed, 5, 32) * W, cy = hsh(seed, 6, 32) * H, L = (20 + 40 * hsh(seed, 7, 32)) * u, a = hsh(seed, 8, 32) * TAU;
      x.strokeStyle = `rgba(15,10,5,${0.7 * al})`;
      x.lineWidth = Math.max(1, 0.8 * u);
      x.beginPath();
      x.moveTo(cx, cy);
      x.quadraticCurveTo(cx + Math.cos(a + 1.2) * L * 0.7, cy + Math.sin(a + 1.2) * L * 0.7, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
      x.stroke();
    }
    x.restore();
  }
  // fita VHS: as linhas tremendo de lado, a cor borrada e atrasada, o preto lavado, o chiado, a faixa do tracking
  // descendo devagar e a troca de cabeça (a faixa torta embaixo)
  function vhs(x, W, H, v, seed) {
    const img = x.getImageData(0, 0, W, H), d = img.data, s = new Uint8ClampedArray(d), u = H / 540, q = [0, 0, 0, 0];
    const Y = new Float32Array(W), I = new Float32Array(W), Q = new Float32Array(W), A = new Float32Array(W), PI = new Float64Array(W + 1), PQ = new Float64Array(W + 1);
    const rc = Math.max(1, Math.round(3.5 * u * v)), cs = 2.5 * u * v, sat = 1 - 0.2 * v;
    const bh = (8 + 14 * v) * u, by = ((seed * 1.7 * u + hsh(7, 0, 41) * H) % (H + 4 * bh)) - 2 * bh, hh = (3 + 6 * v) * u;
    for (let py = 0; py < H; py++) {
      let ox = Math.sin(py / (37 * u) + seed * 0.9) * 0.5 * u * v + (hsh(py, seed, 42) - 0.5) * 0.9 * u * v;
      const tb = Math.abs(py + 0.5 - by) < bh ? 1 - Math.abs(py + 0.5 - by) / bh : 0, hb = py + 0.5 > H - hh ? (py + 0.5 - (H - hh)) / hh : 0;
      if (tb) ox += (hsh(py >> 1, seed, 43) - 0.5) * 18 * u * v * tb;
      if (hb) ox += hb * hb * 24 * u * v;
      for (let px = 0; px < W; px++) {
        sampleAt(s, W, H, px + 0.5 - ox, py + 0.5, q);
        Y[px] = 0.299 * q[0] + 0.587 * q[1] + 0.114 * q[2];
        I[px] = 0.596 * q[0] - 0.274 * q[1] - 0.322 * q[2];
        Q[px] = 0.211 * q[0] - 0.523 * q[1] + 0.312 * q[2];
        A[px] = q[3];
        PI[px + 1] = PI[px] + I[px];
        PQ[px + 1] = PQ[px] + Q[px];
      }
      for (let px = 0, o = py * W * 4; px < W; px++, o += 4) {
        const xc = px - cs, a = Math.max(0, Math.min(W - 1, Math.round(xc - rc))), b = Math.max(a, Math.min(W - 1, Math.round(xc + rc))), n = b - a + 1;
        const ci = ((PI[b + 1] - PI[a]) / n) * sat, cq = ((PQ[b + 1] - PQ[a]) / n) * sat;
        let y = Y[px] * (1 - 0.35 * v) + (Y[Math.max(0, px - 1)] + Y[Math.min(W - 1, px + 1)]) * 0.175 * v;
        y = y * (1 - 0.1 * v) + 14 * v + (hsh(px, py, seed) - 0.5) * 22 * v;
        if (tb && hsh(px >> 2, py, seed + 1) < 0.18 * tb) y = 225;
        if (hsh(px, py, seed + 2) < 0.0015 * v) y = 255;
        d[o] = y + 0.956 * ci + 0.621 * cq;
        d[o + 1] = y - 0.272 * ci - 0.647 * cq;
        d[o + 2] = y - 1.106 * ci + 1.703 * cq;
        d[o + 3] = A[px];
      }
    }
    x.putImageData(img, 0, 0);
  }
  // falha digital: só em alguns quadros (em rajadas); faixas da imagem pulam de lado (algumas com as cores trocadas), o
  // vermelho e o azul se separam, e uns blocos se repetem fora do lugar
  function glitch(x, W, H, v, seed) {
    // as falhas vêm em rajadas de uns quadros
    if (hsh(Math.floor((seed + 1) / 3), 0, 51) > 0.08 + 0.27 * v) return;
    const img = x.getImageData(0, 0, W, H), d = img.data, s = new Uint8ClampedArray(d), u = H / 540;
    const R = (k) => hsh(seed, k, 52), wrap = (i) => ((i % W) + W) % W;
    const split = Math.round((0.004 + 0.012 * v) * W * (R(1) < 0.5 ? -1 : 1));
    const bands = [];
    for (let j = 0, nb = 1 + Math.floor(R(2) * (2 + 6 * v)); j < nb; j++) {
      const y0 = R(10 + j) * H;
      bands.push({ y0, y1: y0 + (0.01 + 0.07 * R(20 + j)) * H, sh: Math.round((R(30 + j) - 0.5) * 2 * (0.03 + 0.15 * v) * W), swap: R(40 + j) < 0.2 });
    }
    for (let py = 0, o = 0; py < H; py++) {
      let sh = 0, swap = false;
      for (const b of bands) if (py >= b.y0 && py < b.y1) { sh = b.sh; swap = b.swap; }
      const row = py * W;
      for (let px = 0; px < W; px++, o += 4) {
        const xs = px - sh, oR = (row + wrap(xs - split)) * 4, oG = (row + wrap(xs)) * 4, oB = (row + wrap(xs + split)) * 4;
        const r = s[oR], g = s[oG + 1], b = s[oB + 2];
        if (swap) { d[o] = b; d[o + 1] = r; d[o + 2] = g; } else { d[o] = r; d[o + 1] = g; d[o + 2] = b; }
        d[o + 3] = Math.max(s[oR + 3], s[oG + 3], s[oB + 3]);
      }
    }
    // os blocos: copiados de outro lugar, em degraus de 8u
    const st = Math.max(2, Math.round(8 * u)), c = new Uint8ClampedArray(d);
    for (let k = 0, nm = Math.floor(R(3) * 5 * v); k < nm; k++) {
      const bw = Math.round(((0.03 + 0.08 * R(60 + k)) * W) / st) * st, bh = Math.round(((0.02 + 0.06 * R(70 + k)) * H) / st) * st;
      const dx = Math.floor((R(80 + k) * W) / st) * st, dy = Math.floor((R(90 + k) * H) / st) * st, sx = Math.floor((R(100 + k) * W) / st) * st, sy = Math.floor((R(110 + k) * H) / st) * st;
      for (let j = 0; j < bh; j++) {
        if (dy + j >= H || sy + j >= H) break;
        for (let i = 0; i < bw; i++) {
          if (dx + i >= W || sx + i >= W) break;
          const o = ((dy + j) * W + dx + i) * 4, p = ((sy + j) * W + sx + i) * 4;
          d[o] = c[p]; d[o + 1] = c[p + 1]; d[o + 2] = c[p + 2]; d[o + 3] = c[p + 3];
        }
      }
    }
    x.putImageData(img, 0, 0);
  }
  // tela de tubo: a imagem curva (mais curva quanto maior o valor; com crt=1, só uma faixa fina da borda some), os
  // cantos redondos e escuros, as linhas de varredura, a máscara de cor (R, G e B lado a lado) e as bordas escuras
  function crt(x, W, H, v, seed) {
    const img = x.getImageData(0, 0, W, H), d = img.data, s = new Uint8ClampedArray(d), u = H / 540, q = [0, 0, 0, 0];
    let opaque = true;
    for (let o = 3; o < s.length; o += 4) if (s[o] < 255) { opaque = false; break; }
    const cv = 0.08 * v, rr = (0.025 + 0.045 * v) * Math.min(W, H), P = Math.max(2, Math.round(H / 240)), T = Math.max(3, Math.round(3 * u)) / 3;
    const ms = 0.2 * v * Math.min(1, u), sl = 0.55 * v, gain = 1 + 0.25 * v, soft = 1.2 * Math.max(1, u);
    for (let py = 0, o = 0; py < H; py++) {
      const ny = ((py + 0.5) / H) * 2 - 1;
      for (let px = 0; px < W; px++, o += 4) {
        const nx = ((px + 0.5) / W) * 2 - 1, sx = nx * (1 + cv * ny * ny), sy = ny * (1 + cv * nx * nx);
        const X = ((sx + 1) / 2) * W, Yy = ((sy + 1) / 2) * H;
        const qx = Math.abs(X - W / 2) - (W / 2 - rr), qy = Math.abs(Yy - H / 2) - (H / 2 - rr);
        const dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr, m = Math.min(1, Math.max(0, -dist / soft));
        if (m <= 0) { d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = opaque ? 255 : 0; continue; }
        sampleAt(s, W, H, X, Yy, q);
        const L = (0.299 * q[0] + 0.587 * q[1] + 0.114 * q[2]) / 255, f = 0.5 - 0.5 * Math.cos((TAU * Yy) / P);
        const k = (1 - sl * (1 - f) * (1 - 0.6 * L)) * (1 - 0.3 * v * ((sx * sx + sy * sy) / 2) ** 2) * gain * (opaque ? m : 1), col = Math.floor(px / T) % 3;
        for (let ch = 0; ch < 3; ch++) d[o + ch] = q[ch] * k * (ch === col ? 1 + 2 * ms : 1 - ms);
        d[o + 3] = opaque ? 255 : q[3] * m;
      }
    }
    x.putImageData(img, 0, 0);
  }
  const SCREEN_RUN = { oldfilm: oldFilm, vhs, glitch, crt };
  function screenFx(cv, f, seed) {
    const x = cv.getContext('2d');
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    for (const k of SCREEN_FX) if (f[k] > 0) SCREEN_RUN[k](x, cv.width, cv.height, Math.min(1, f[k]), seed | 0);
    x.restore();
  }

  // Imagem pronta de um quadro: escala, recorte, acabamentos e pixelado. opts.screen === false: sem os efeitos de
  // tela (oldfilm, vhs, glitch, crt), nas exportações de jogo.
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
      if (opts.transparent) {
        if (opts.refs) drawRefs(ctx, model, pose, opts.refs, false);
        drawScene(ctx, model, pose, { background: false, guides: opts.guides, filter: opts.filter });
      } else {
        ctx.fillStyle = '#ffffff';
        if (!model.canvas.bg && !opts.matte) ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        fillBg(ctx, model, pose, rect, opts.matte);
        if (opts.refs) drawRefs(ctx, model, pose, opts.refs, false);
        drawScene(ctx, model, pose, { background: false, guides: opts.guides, filter: opts.filter });
      }
      if (opts.refs) drawRefs(ctx, model, pose, opts.refs, true);
      if (opts.after) opts.after(ctx, s);
    };
    // estilo de arte (art pixel, art ascii…): o desenho vai numa imagem de trabalho e o estilo pinta o resultado;
    // o acabamento (bloom, vinheta…) vem por cima, e o finish pixel= fica de fora. opts.art === false: sem o estilo.
    const art = opts.art !== false && model.art && W.art ? model.art : null;
    if (art) {
      const r = W.art.paint(octx, [scale, 0, 0, scale, -rect.x * scale, -rect.y * scale], rect, art, {
        // pass: o passe que o estilo pediu (sem luz, sem contorno, textura…); no passe de textura, sem as referências
        content: (x, m, pass) => {
          x.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
          const refs = pass && pass.tex ? null : opts.refs;
          if (refs) drawRefs(x, model, pose, refs, false);
          drawScene(x, model, pose, { background: false, guides: opts.guides, filter: opts.filter, pass });
          if (refs) drawRefs(x, model, pose, refs, true);
        },
        bg: opts.transparent ? null : (x, m) => {
          // o fundo cobre a imagem de trabalho inteira (a grade passa um pouco do recorte)
          const R = { x: -m[4] / m[0], y: -m[5] / m[3], w: x.canvas.width / m[0], h: x.canvas.height / m[3] };
          x.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
          x.fillStyle = '#ffffff';
          if (!model.canvas.bg && !opts.matte) x.fillRect(R.x, R.y, R.w, R.h);
          fillBg(x, model, pose, R, opts.matte);
        },
      }, { colors: () => W.art.colorsOf([model], !opts.transparent && (opts.matte || !model.canvas.bg) ? [opts.matte || '#ffffff'] : null), ink: model.palette.get('ink'), paper: opts.matte || W.art.paperOf(model), bare: !model.canvas.bg && !opts.matte, lit: !!sceneLights(model, pose), frame: pose.frame || 0 });
      if (opts.after) { octx.setTransform(scale, 0, 0, scale, -rect.x * scale, -rect.y * scale); opts.after(octx, scale); octx.setTransform(1, 0, 0, 1, 0, 0); }
      if (!opts.noPost) postFx(out, model, pose.frame, { screen: opts.screen });
      if (r.text) out.artText = r.text;
      return out;
    }
    if (px > 1) {
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.round(W2 / px));
      small.height = Math.max(1, Math.round(H2 / px));
      draw(small.getContext('2d'), scale / px);
      if (!opts.noPost) postFx(small, model, pose.frame, { screen: false });
      octx.imageSmoothingEnabled = false;
      octx.drawImage(small, 0, 0, W2, H2);
      if (!opts.noPost) postFx(out, model, pose.frame, { base: false, screen: opts.screen });
    } else {
      draw(octx, scale);
      if (!opts.noPost) postFx(out, model, pose.frame, { screen: opts.screen });
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

  // Posição de uma alça (ponto editável) na pose atual. As alças da própria forma andam com ela (osso, tecido, 3D).
  const ELEMENT_HANDLES = new Set(['pt', 'tan', 'center', 'corner', 'size', 'round', 'move', 'rot', 'mid', 'fsize']);
  function handlePos(model, pose, rec, h) {
    if (rec.el && (h.kind === 'pt' || h.kind === 'tan') && rec.el.pins && rec.el.pins[h.idx]) return pointMap(model, pose, rec.el, h.idx)(h.x, h.y);
    if (rec.el && ELEMENT_HANDLES.has(h.kind)) return fullMap(model, pose, rec.el)(h.x, h.y);
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
    makePose, timePose, boneMatrices, boneLocal, matsFrom, ikVals, pinWeights, pointMap, drawRefs, refOn, refMatrix, exprPose, skinWeights, pathAt, animIn, boxState, pointState, pointPath, gait, gaitText, trajectories, drawTrajectory, orderItems, orderLayers, drawParts, geometry, drawScene, renderImage, buildPlan, buildState, buildFilter, drawTrace, drawPen, handlePos, ELEMENT_HANDLES,
    flatOf, pathOf, layerVisible, mapper, textBox, textMatrix, textFont, localBox, gradGeom, textGradGeom, clipEls, crossing, moldHoles, findNamed, limbPoints, fillBg,
    el3, info3, fullMap, textMat, proxy3, solidParts, sideColor, zSort, propsOf, isoOrigin,
    sceneLights, lightAt, lightWeight, litColor, layerFx, castShadows, castSources, particles, patternLines, segsBox, hasPost, postFx, hasScreen, screenNote, canFilter,
  };
})(window.Weasel = window.Weasel || {});
