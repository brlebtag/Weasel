/* Weasel — Godot 4 com esqueleto de verdade (godot rig=bones, ou --rig na linha de comando). Cada osso vira
   um Bone2D e cada pedaço do desenho uma imagem que segue o osso; o AnimationPlayer anima os ossos, então o
   movimento fica liso, as animações se misturam no AnimationTree e o código do jogo pode girar um osso
   (mirar, olhar). O que dobra (pernas e braços com IK, tecido, formas com bones=) vira um Polygon2D com pele:
   a imagem parada deforma com os ossos (a perna ganha coxa e canela; o tecido, um osso que balança). O que
   muda de forma (morph, draw, cores) troca de imagem quadro a quadro, presa ao osso; partículas, rastro e
   sombra no chão, quadro a quadro no mundo. Caixas, pontos de encaixe, eventos, normal map, troca de ordem
   (above/below) e as animações espelhadas funcionam como na cena por quadros. */
(function (W) {
  'use strict';
  const S = W.scene, M = W.geom.M;

  const num = (v) => { const r = Math.round(v * 10000) / 10000; return Object.is(r, -0) ? '0' : String(r); };
  // número que o Godot lê como float: "0" vira inteiro, e uma faixa contínua de inteiros arredonda os ângulos
  const flo = (v) => { const s = num(v); return /[.e]/.test(s) ? s : `${s}.0`; };
  const vec = (p) => `Vector2(${num(p[0])}, ${num(p[1])})`;
  const quote = (t) => `"${String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const sname = (t) => `&${quote(t)}`;
  const MARGIN = 24; // em volta do canvas: o que passa um pouco da borda na pose parada também vira peça
  const SHAPE_PROPS = new Set(['shape', 'draw', 'c', 'inkc', 'w', 'ink']);
  const RATE = 30; // amostras por segundo, no mínimo, para os ossos (entre elas o Godot interpola)
  const wrapPi = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // Faixa de animação. smooth: o Godot interpola entre as keys (ossos, opacidade); senão troca de uma vez.
  function track(i, path, keys, smooth) {
    return [
      `tracks/${i}/type = "value"`, `tracks/${i}/imported = false`, `tracks/${i}/enabled = true`, `tracks/${i}/path = NodePath(${quote(path)})`,
      `tracks/${i}/interp = ${smooth ? 1 : 0}`, `tracks/${i}/loop_wrap = true`, `tracks/${i}/keys = {`,
      `"times": PackedFloat32Array(${keys.map((k) => num(k[0])).join(', ')}),`,
      `"transitions": PackedFloat32Array(${keys.map(() => '1').join(', ')}),`,
      `"update": ${smooth ? 0 : 1},`,
      `"values": [${keys.map((k) => k[1]).join(', ')}]`, '}',
    ];
  }
  // tira as keys que o Godot recria interpolando as que ficam (o arquivo fica bem menor)
  function thin(keys, vals, eps) {
    if (keys.length <= 2) return keys;
    const out = [keys[0]];
    let a = 0;
    // todas as keys entre a e b caem na reta de a até b?
    const fits = (b) => {
      for (let j = a + 1; j < b; j++) {
        const t = (keys[j][0] - keys[a][0]) / (keys[b][0] - keys[a][0] || 1);
        if (vals[j].some((v, q) => Math.abs(vals[a][q] + (vals[b][q] - vals[a][q]) * t - v) > eps)) return false;
      }
      return true;
    };
    for (let i = 1; i < keys.length - 1; i++) if (!fits(i + 1)) { out.push(keys[i]); a = i; }
    out.push(keys[keys.length - 1]);
    return out;
  }

  // ---------- como cada forma anda ----------
  // rigid = uma imagem presa a um osso; shape = muda de forma (a imagem troca, presa ao osso);
  // skin = dobra (IK, tecido, bones=): Polygon2D com pele; world = depende do mundo: quadro a quadro.
  function analyse(model) {
    const shapeT = new Set(), fade = new Set(), order = new Set(), dynLayers = new Set(), orderLayers = new Set(), notes = new Set();
    let lightsMove = model.anims.length > 0 && [...model.lights.values()].some((L) => L.bone);
    for (const an of model.anims) {
      for (const tr of an.ptracks.values()) {
        if (tr.kind === 'el') {
          for (const el of tr.targets) {
            if (SHAPE_PROPS.has(tr.prop)) shapeT.add(el);
            else if (tr.prop === 'opacity' || tr.prop === 'show') fade.add(el);
            else if (tr.prop === 'order') {
              order.add(el);
              for (const k of tr.keys) if (k.v) for (const o of model.named.get(k.v.target) || []) order.add(o);
            }
          }
        } else if (tr.kind === 'layer') {
          if (tr.prop === 'order') { orderLayers.add(tr.name); for (const k of tr.keys) if (k.v) orderLayers.add(k.v.target); } else dynLayers.add(tr.name);
        } else if (tr.kind === 'light') lightsMove = true;
      }
    }
    const lit = (el) => (model.lights.size || model.ambient) && !el.layer.unlit && !el.layer.guide && !el.emit;
    const motion = (el) => (el.limb ? `limb:${el.id}` : el.cloth ? `cloth:${el.cloth}|${el.bone || ''}` : el.bones ? `bones:${el.bones.join(',')}` : `bone:${el.bone || ''}`);
    const kind = new Map();
    for (const el of model.elements) {
      const L = el.layer;
      let k = 'rigid';
      if (el.type === 'emitter' || L.trail || L.cast || dynLayers.has(L.name) || (lightsMove && lit(el))) k = 'world';
      else if (el.limb || el.cloth || el.bones) k = shapeT.has(el) || (el.cloth && (el.limb || el.bones)) ? 'world' : 'skin';
      else if (shapeT.has(el)) k = 'shape';
      kind.set(el, k);
    }
    // recortes (clip, cut e buracos) só andam junto se o molde andar igual
    for (let pass = 0; pass < 3; pass++) {
      for (const el of model.elements) {
        if (kind.get(el) === 'world') continue;
        const L = el.layer, molds = [];
        for (const n of [L.clip, L.cut]) if (n) molds.push(...S.clipEls(model, n));
        if (el.cuts) molds.push(...el.cuts);
        if (molds.some((mo) => kind.get(mo) === 'world' || motion(mo) !== motion(el) || (kind.get(mo) === 'shape' && kind.get(el) === 'skin'))) kind.set(el, 'world');
        else if (molds.some((mo) => kind.get(mo) === 'shape') && kind.get(el) === 'rigid') kind.set(el, 'shape');
      }
    }
    if (model.lights.size && !lightsMove) notes.add('a luz da cena fica desenhada nas peças como na pose parada (no Godot, use as luzes 2D com o normal map)');
    return { kind, motion, fade, order, orderLayers, notes };
  }

  // Peças em ordem de pintura: itens seguidos que andam juntos (mesmo osso ou mesma pele, mesma visibilidade)
  // viram uma imagem.
  function partsOf(model, an) {
    const parts = [];
    let cur = null;
    for (const L of model.layers) {
      if (L.hidden || L.guide) continue;
      for (const it of L.items) {
        const el = it.el;
        if (el.hidden) continue;
        const k = an.kind.get(el), only = L.only ? L.only.join(',') : '', lay = an.orderLayers.has(L.name) ? `|L${L.name}` : '';
        const bone = k === 'world' || k === 'skin' ? null : el.bone || null;
        let key;
        if (k === 'world') key = `w|${only}`;
        else if (k === 'skin') key = `k|${an.motion(el)}|${only}`;
        else if (k === 'shape') key = `s|${bone || ''}|${only}`;
        else if (an.fade.has(el)) key = `e|${el.id}`;
        else if (an.order.has(el)) key = `o|${el.id}`;
        else key = `r|${bone || ''}|${only}`;
        key += lay;
        if (!cur || cur.key !== key) {
          cur = { key, kind: k === 'world' || k === 'shape' ? 'frames' : k, bone, el, items: new Set(), layers: new Set(), only: L.only, fade: k === 'rigid' && an.fade.has(el) ? el : null, name: null };
          parts.push(cur);
        }
        cur.items.add(it);
        cur.layers.add(L);
        if (!cur.name && el.name) cur.name = el.name;
      }
    }
    return parts;
  }

  function render(model, pose, part, k, R) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(R.w * k));
    c.height = Math.max(1, Math.ceil(R.h * k));
    const x = c.getContext('2d');
    x.setTransform(k, 0, 0, k, -R.x * k, -R.y * k);
    S.drawScene(x, model, pose, { background: false, glows: false, layers: part.layers, items: part.items });
    return c;
  }
  // o retângulo com algum pixel visível (null = vazio)
  function alphaBox(c) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 2) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  function crop(c, b) {
    const o = document.createElement('canvas');
    o.width = b.w;
    o.height = b.h;
    o.getContext('2d').drawImage(c, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    return o;
  }
  const union = (a, b) => (!a ? b : !b ? a : { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) });
  // impressão digital dos pixels: quadros iguais de uma peça usam a mesma imagem
  function digest(c) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 2166136261;
    for (let i = 0; i < d.length; i += 3) { h ^= d[i]; h = Math.imul(h, 16777619); }
    return `${c.width}x${c.height}:${h >>> 0}`;
  }

  // Todas as imagens numa folha só, em prateleiras (as mais altas primeiro).
  function pack(imgs, pad) {
    const order = imgs.map((_, i) => i).sort((a, b) => imgs[b].height - imgs[a].height || a - b);
    const area = imgs.reduce((s, im) => s + (im.width + pad) * (im.height + pad), 0);
    const Wd = Math.min(4096, Math.max(64, ...imgs.map((im) => im.width + pad * 2), Math.ceil(Math.sqrt(area) * 1.15)));
    let x = pad, y = pad, row = 0;
    const pos = [];
    for (const i of order) {
      const im = imgs[i];
      if (x + im.width + pad > Wd) { x = pad; y += row + pad; row = 0; }
      pos[i] = [x, y];
      x += im.width + pad;
      row = Math.max(row, im.height);
    }
    const Hd = y + row + pad;
    if (Hd > 16384) throw new Error('as peças não cabem numa folha: diminua a escala');
    const sheet = (list) => {
      const out = document.createElement('canvas');
      out.width = Wd;
      out.height = Hd;
      const ctx = out.getContext('2d');
      list.forEach((im, i) => ctx.drawImage(im, pos[i][0], pos[i][1]));
      return out;
    };
    return { canvas: sheet(imgs), pos, sheet };
  }

  // ---------- cena ----------
  // Arquivos para o Godot: a folha de peças (.png), o normal map, a cena (.tscn) e o ajudante do AnimationPlayer.
  // o = { base, scale, mirror, names, name, normal }
  function packageFiles(model, o) {
    const Gd = W.godot, k = o.scale || 1, base = o.base, withNormal = o.normal !== false;
    const R = { x: -MARGIN, y: -MARGIN, w: model.canvas.w + 2 * MARGIN, h: model.canvas.h + 2 * MARGIN };
    const root = Gd.rootOf(model, { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h });
    const T = (x, y) => [(x - root[0]) * k, (y - root[1]) * k];
    const allow = o.names ? o.names.filter(Boolean) : [];
    const anims = Gd.playerAnims(model, o.mirror !== false).filter((p) => !allow.length || allow.includes(p.anim.name));
    const own = [...new Set(anims.map((p) => p.anim))];
    const first = anims.length ? anims[0] : null;
    const an = analyse(model);
    const rest = S.makePose(model, null, 0);
    const strength = model.godot ? model.godot.normal : 1;

    // imagens das peças (e o normal map de cada uma, no mesmo tamanho)
    const imgs = [], normals = [];
    const canvasRect = (b) => ({ x: R.x + b.x / k, y: R.y + b.y / k, w: b.w / k, h: b.h / k });
    const addImg = (im, pose, part, b) => {
      if (withNormal) {
        const alpha = im.getContext('2d').getImageData(0, 0, im.width, im.height).data;
        normals.push(W.normal.frame(model, pose, { rect: canvasRect(b), scale: k, strength, alpha, items: part.items, layers: part.layers }));
      }
      return imgs.push(im) - 1;
    };
    const parts = partsOf(model, an).filter((part) => {
      if (part.kind === 'rigid' || part.kind === 'skin') {
        const c = render(model, rest, part, k, R), b = alphaBox(c);
        if (!b) return false;
        part.box = b;
        part.img = addImg(crop(c, b), rest, part, b);
        return true;
      }
      const shots = new Map();
      let box = null;
      // presa a um osso: desenhada no lugar do osso parado, para a imagem só mudar quando a forma muda
      const at = (pose) => (part.bone ? Object.assign({}, pose, { bones: rest.bones, cloth: rest.cloth, geo: new Map() }) : pose);
      const take = (key, pose) => { const p = at(pose), c = render(model, p, part, k, R); shots.set(key, { c, p }); box = union(box, alphaBox(c)); };
      for (const a of own) {
        if (part.only && !S.animIn(part.only, a)) continue;
        for (let f = 0; f < a.frames; f++) take(`${a.name}#${f}`, S.makePose(model, a.name, f));
      }
      if (!own.length) take('pose', rest);
      if (!box) return false;
      part.box = box;
      part.cells = new Map();
      const seen = new Map();
      for (const [key, s] of shots) {
        const im = crop(s.c, box), id = digest(im);
        if (!seen.has(id)) seen.set(id, addImg(im, s.p, part, box));
        part.cells.set(key, seen.get(id));
      }
      // a imagem da pose inicial (o primeiro quadro da primeira animação em que a peça aparece)
      part.img = part.cells.values().next().value;
      return true;
    });
    if (!imgs.length) throw new Error('nada para exportar: o desenho está vazio');
    const atlas = pack(imgs, 2);
    const rect = (i) => `Rect2(${atlas.pos[i][0]}, ${atlas.pos[i][1]}, ${imgs[i].width}, ${imgs[i].height})`;

    // nomes dos nós
    const used = new Set(['Visual', 'Esqueleto', 'Pecas', 'AnimationPlayer', 'Hitbox', 'Hurtbox', 'Corpo']);
    const unique = (n) => { let s = String(n).replace(/[^\w-]/g, '_') || 'peca'; while (used.has(s)) s += '_'; used.add(s); return s; };

    // ---------- ossos do Godot ----------
    // Os do arquivo, mais os criados para o que dobra: coxa e canela de cada perna com IK, e o osso que balança
    // de cada tecido. Cada um sabe a posição de descanso (relativa ao pai, em unidades do desenho) e, numa
    // amostra da animação, a posição, a rotação (radianos) e a escala.
    const gbones = [], byName = new Map();
    const addBone = (g) => { g.node = unique(g.name); gbones.push(g); return g; };
    for (const b of model.bones.values()) {
      const pp = b.parent && model.bones.has(b.parent) ? model.bones.get(b.parent).pivot : root;
      byName.set(b.name, addBone({ name: b.name, src: b, parent: null, rest: [b.pivot[0] - pp[0], b.pivot[1] - pp[1]], pivot: b.pivot }));
    }
    for (const g of byName.values()) if (g.src.parent && byName.has(g.src.parent)) g.parent = byName.get(g.src.parent);
    const restOf = (parent, p) => (parent ? [p[0] - parent.pivot[0], p[1] - parent.pivot[1]] : [p[0] - root[0], p[1] - root[1]]);
    const skins = parts.filter((p) => p.kind === 'skin');
    // pernas e braços com IK: dois ossos que giram (o desenho parado é a perna esticada)
    for (const part of skins) {
      const el = part.el;
      if (!el.limb) continue;
      const on = el.on && byName.get(el.on), hip0 = el.hip, foot0 = el.target ? model.bones.get(el.target).pivot : el.foot;
      const L = el.restLen, a0 = Math.atan2(foot0[1] - hip0[1], foot0[0] - hip0[0]);
      const mid = [(hip0[0] + foot0[0]) / 2, (hip0[1] + foot0[1]) / 2];
      const coxa = addBone({ name: `${el.name || 'membro'}_coxa`, parent: on || null, rest: restOf(on, hip0), pivot: hip0, len: L / 2, ang: a0 });
      const canela = addBone({ name: `${el.name || 'membro'}_canela`, parent: coxa, rest: [mid[0] - hip0[0], mid[1] - hip0[1]], pivot: mid, len: L / 2, ang: a0 });
      // o joelho, como no desenho (scene.limbPoints), com os ossos desta amostra
      const ik = (mats) => {
        const m = el.on ? mats.get(el.on) : null;
        const hip = m ? M.apply(m, hip0[0], hip0[1]) : hip0;
        let goal = el.foot;
        if (el.target) { const tb = model.bones.get(el.target), tm = mats.get(el.target); goal = tm ? M.apply(tm, tb.pivot[0], tb.pivot[1]) : tb.pivot; }
        let dx = goal[0] - hip[0], dy = goal[1] - hip[1], d = Math.hypot(dx, dy), end = goal;
        if (d > L) { end = [hip[0] + (dx / d) * L, hip[1] + (dy / d) * L]; dx = end[0] - hip[0]; dy = end[1] - hip[1]; d = L; }
        let knee = [(hip[0] + end[0]) / 2, (hip[1] + end[1]) / 2];
        if (d < L - 0.5 && d > 1e-6) {
          const h = Math.sqrt(Math.max(0, (L / 2) ** 2 - (d / 2) ** 2)) * Math.min(1, Math.abs(el.bend)), s = el.bend >= 0 ? 1 : -1;
          knee = [knee[0] + (dy / d) * h * s, knee[1] - (dx / d) * h * s];
        }
        const at = Math.atan2(knee[1] - hip[1], knee[0] - hip[0]), as = Math.atan2(end[1] - knee[1], end[0] - knee[0]);
        const phi = m ? Math.atan2(m[1], m[0]) : 0;
        return { thigh: wrapPi(at - a0 - phi), shin: wrapPi(as - at) };
      };
      coxa.sample = (ctx) => ({ pos: coxa.rest, rot: ik(ctx.mats).thigh, sc: [1, 1] });
      canela.sample = (ctx) => ({ pos: canela.rest, rot: ik(ctx.mats).shin, sc: [1, 1] });
      // peso de cada ponto: coxa até perto do joelho, canela depois, com uma passagem suave
      part.weights = (x, y) => {
        const t = ((x - hip0[0]) * Math.cos(a0) + (y - hip0[1]) * Math.sin(a0)) / L, u = Math.max(0, Math.min(1, (t - 0.4) / 0.2)), w = u * u * (3 - 2 * u);
        return [[coxa, 1 - w], [canela, w]];
      };
    }
    // tecido: um osso que balança, preso ao osso do tecido; cada ponto segue o balanço pela distância ao pivô
    const swings = new Map();
    for (const part of skins) {
      const el = part.el;
      if (!el.cloth || el.limb || el.bones) continue;
      const c = model.cloths.get(el.cloth);
      if (!c) continue;
      const key = `${c.name}|${el.bone || ''}`;
      if (!swings.has(key)) {
        let parent = el.bone ? byName.get(el.bone) : null;
        if (!parent) parent = addBone({ name: `${c.name}_base`, parent: null, rest: restOf(null, c.pivot), pivot: c.pivot, len: 10, ang: Math.PI / 2 });
        const sw = addBone({ name: `${c.name}_pano`, parent, rest: restOf(parent, c.pivot), pivot: c.pivot, len: Math.max(10, c.R * 0.5), ang: Math.PI / 2 });
        sw.sample = (ctx) => {
          const off = ctx.cloth(c.name), pm = parent.src ? ctx.mats.get(parent.src.name) : null;
          let d = off;
          if (pm) { const inv = M.invert(pm); d = [inv[0] * off[0] + inv[2] * off[1], inv[1] * off[0] + inv[3] * off[1]]; }
          return { pos: [sw.rest[0] + d[0], sw.rest[1] + d[1]], rot: 0, sc: [1, 1] };
        };
        swings.set(key, { parent, sw, c });
      }
      const { parent, sw } = swings.get(key);
      part.weights = (x, y) => {
        const w = Math.pow(Math.min(1, Math.hypot(x - c.pivot[0], y - c.pivot[1]) / (c.R || 1)), 1.2);
        return [[parent, 1 - w], [sw, w]];
      };
    }
    // bones=: os pesos do próprio desenho
    for (const part of skins) {
      const el = part.el;
      if (!el.bones || el.cloth) continue;
      part.weights = (x, y) => S.skinWeights(model, el, x, y).map((w, i) => [byName.get(el.bones[i]), w]);
    }
    const chain = (g) => { const out = []; let c = g, guard = 0; while (c && guard++ < 64) { out.unshift(c.node); c = c.parent; } return out; };
    const bonePath = (g) => `Visual/Esqueleto/${chain(g).join('/')}`;

    // amostras de cada animação (mais de uma por quadro, para o Godot interpolar macio)
    const clothAt = (a) => {
      const cache = new Map(), pose = (f) => { if (!cache.has(f)) cache.set(f, S.makePose(model, a.name, f).cloth); return cache.get(f); };
      return (f) => (name) => {
        const f0 = Math.floor(f), t = f - f0, f1 = a.loop ? (f0 + 1) % a.frames : Math.min(a.frames - 1, f0 + 1);
        const p = pose(f0).get(name) || [0, 0], q = pose(f1).get(name) || [0, 0];
        return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      };
    };
    const local = (g, ctx) => {
      if (g.sample) return g.sample(ctx);
      const v = ctx.vals.get(g.name);
      return { pos: [g.rest[0] + v[0], g.rest[1] + v[1]], rot: (v[2] * Math.PI) / 180, sc: [v[3], v[4]] };
    };
    const samples = new Map();
    for (const a of own) {
      const sub = Math.max(1, Math.ceil(RATE / a.fps)), n = a.frames * sub, rows = [], cl = clothAt(a);
      for (let i = 0; i < n; i++) {
        const f = i / sub, vals = S.boneLocal(model, a, f), ctx = { vals, mats: S.matsFrom(model, vals), cloth: cl(f) };
        const row = new Map(gbones.map((g) => [g, local(g, ctx)]));
        rows.push({ t: i / (a.fps * sub), row });
      }
      // rotações sem saltos de uma volta entre amostras vizinhas
      for (const g of gbones) {
        for (let i = 1; i < rows.length; i++) {
          const p = rows[i - 1].row.get(g).rot, q = rows[i].row.get(g);
          while (q.rot - p > Math.PI) q.rot -= 2 * Math.PI;
          while (q.rot - p < -Math.PI) q.rot += 2 * Math.PI;
        }
      }
      samples.set(a, rows);
    }
    const E = 1e-6;
    for (const g of gbones) {
      g.moves = { pos: false, rot: false, sc: false };
      for (const rows of samples.values()) {
        for (const r of rows) {
          const v = r.row.get(g);
          if (Math.abs(v.pos[0] - g.rest[0]) > E || Math.abs(v.pos[1] - g.rest[1]) > E) g.moves.pos = true;
          if (Math.abs(v.rot) > E) g.moves.rot = true;
          if (Math.abs(v.sc[0] - 1) > E || Math.abs(v.sc[1] - 1) > E) g.moves.sc = true;
        }
      }
    }
    // comprimento e direção dos ossos do arquivo (só para o desenho do esqueleto no editor do Godot)
    const center = (p) => [R.x + (p.box.x + p.box.w / 2) / k, R.y + (p.box.y + p.box.h / 2) / k];
    for (const g of byName.values()) {
      const pts = parts.filter((p) => p.bone === g.name).map(center).concat(gbones.filter((c) => c.parent === g && c.src).map((c) => c.pivot));
      let tip = pts.length ? [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length] : [g.pivot[0], g.pivot[1] + 10];
      if (Math.hypot(tip[0] - g.pivot[0], tip[1] - g.pivot[1]) < 4) tip = [g.pivot[0], g.pivot[1] + 10];
      g.len = Math.hypot(tip[0] - g.pivot[0], tip[1] - g.pivot[1]);
      g.ang = Math.atan2(tip[1] - g.pivot[1], tip[0] - g.pivot[0]);
    }

    // ---------- peças: nomes, malhas das que dobram, ordem ----------
    parts.forEach((p, i) => { p.node = unique(`${p.name || 'peca'}_${i}`); });
    // malha: uma grade sobre a imagem parada, só nas células com desenho; cada ponto com os pesos dos ossos
    for (const part of skins) {
      const im = imgs[part.img], b = part.box, d = im.getContext('2d').getImageData(0, 0, im.width, im.height).data;
      const g = Math.max(6, Math.round(Math.sqrt((b.w * b.h) / 350))), cols = Math.ceil(b.w / g), rws = Math.ceil(b.h / g);
      const id = (i, j) => j * (cols + 1) + i, verts = [], uv = [], tris = [];
      for (let j = 0; j <= rws; j++) {
        for (let i = 0; i <= cols; i++) {
          const u = Math.min(b.w, i * g), v = Math.min(b.h, j * g);
          verts.push([R.x * k + b.x + u - root[0] * k, R.y * k + b.y + v - root[1] * k]);
          uv.push([atlas.pos[part.img][0] + u, atlas.pos[part.img][1] + v]);
        }
      }
      const full = (i, j) => {
        for (let y = j * g; y < Math.min(b.h, (j + 1) * g + 1); y++) for (let x = i * g; x < Math.min(b.w, (i + 1) * g + 1); x++) if (d[(y * b.w + x) * 4 + 3] > 2) return true;
        return false;
      };
      for (let j = 0; j < rws; j++) for (let i = 0; i < cols; i++) if (full(i, j)) tris.push([id(i, j), id(i + 1, j), id(i + 1, j + 1)], [id(i, j), id(i + 1, j + 1), id(i, j + 1)]);
      const weights = new Map();
      verts.forEach((p, vi) => {
        for (const [gb, w] of part.weights((p[0] + root[0] * k) / k, (p[1] + root[1] * k) / k)) {
          if (!gb) continue;
          if (!weights.has(gb)) weights.set(gb, new Float32Array(verts.length));
          weights.get(gb)[vi] += w;
        }
      });
      part.mesh = { verts, uv, tris, weights };
    }
    // troca de ordem (above/below): o z_index de cada peça em cada quadro, o menor que deixa a ordem certa
    const itemPart = new Map();
    parts.forEach((p, i) => { for (const it of p.items) itemPart.set(it, i); });
    const reorder = an.order.size || an.orderLayers.size;
    const zOf = (pose) => {
      const seq = [];
      for (const L of S.orderLayers(model, pose)) for (const it of S.orderItems(L.items, pose)) { const i = itemPart.get(it); if (i !== undefined && seq[seq.length - 1] !== i) seq.push(i); }
      const z = parts.map(() => 0);
      let pz = 0, po = -1;
      for (const i of seq) { if (i < po) pz++; z[i] = pz; po = i; }
      return z;
    };

    // caixas e pontos de encaixe, quadro a quadro (como na cena por quadros)
    const bodyType = (model.godot && model.godot.body) || 'character';
    const boxes = Gd.boxList(model);
    boxes.forEach((b, i) => {
      b.node = unique(b.name);
      b.parent = b.kind === 'hit' ? 'Hitbox' : b.kind === 'hurt' ? 'Hurtbox' : bodyType === 'node' ? 'Corpo' : '.';
      b.path = b.parent === '.' ? b.node : `${b.parent}/${b.node}`;
      b.res = `Shape_${i}`;
      b.extra = b.shape === 'capsule' && b.w > b.h ? 90 : 0;
    });
    const points = [...model.points.values()];
    for (const p of points) p.node = unique(p.name);
    const boxAt = (pose, b, flip) => {
      const st = S.boxState(model, pose, b), p = T(st.cx, st.cy);
      let rot = st.rot + b.extra;
      if (flip) { p[0] = -p[0]; rot = -rot; }
      return { pos: vec(p), rot: num((rot * Math.PI) / 180), off: st.on ? 'false' : 'true' };
    };
    const pointAt = (pose, p, flip) => {
      const st = S.pointState(model, pose, p), q = T(st.x, st.y);
      let rot = st.rot;
      if (flip) { q[0] = -q[0]; rot = 180 - rot; }
      return { pos: vec(q), rot: num((rot * Math.PI) / 180) };
    };
    const firstPose = first ? S.makePose(model, first.anim.name, 0) : rest;
    const restB = boxes.map((b) => boxAt(firstPose, b, false)), restP = points.map((p) => pointAt(firstPose, p, false));
    const rowsB = [], rowsP = [], rowsV = [], rowsZ = [];
    // visibilidade e transparência das peças em cada quadro
    const partState = (pose, a, part) => {
      let vis = !part.only || (a ? S.animIn(part.only, a) : part.only.includes('pose'));
      let alpha = 1;
      if (part.fade) {
        const pr = pose.props.get(part.fade.id) || {};
        if (pr.show === 0) vis = false;
        if (pr.opacity !== undefined) alpha = pr.opacity;
      }
      return { vis: vis ? 'true' : 'false', alpha };
    };
    for (const p of anims) {
      const rb = [], rp = [], rv = [], rz = [];
      for (let f = 0; f < p.anim.frames; f++) {
        const pose = S.makePose(model, p.anim.name, f);
        rb.push(boxes.map((b) => boxAt(pose, b, p.flip)));
        rp.push(points.map((pt) => pointAt(pose, pt, p.flip)));
        rv.push(parts.map((part) => partState(pose, p.anim, part)));
        if (reorder) rz.push(zOf(pose));
      }
      rowsB.push(rb);
      rowsP.push(rp);
      rowsV.push(rv);
      rowsZ.push(rz);
    }
    boxes.forEach((b, j) => {
      b.movePos = rowsB.some((rows) => rows.some((row) => row[j].pos !== restB[j].pos || row[j].rot !== restB[j].rot));
      b.moveOn = rowsB.some((rows) => rows.some((row) => row[j].off !== restB[j].off));
    });
    points.forEach((pt, j) => { pt.movePos = rowsP.some((rows) => rows.some((row) => row[j].pos !== restP[j].pos || row[j].rot !== restP[j].rot)); });
    const restV = parts.map((part) => partState(firstPose, first ? first.anim : null, part));
    parts.forEach((part, j) => {
      part.moveVis = rowsV.some((rows) => rows.some((row) => row[j].vis !== restV[j].vis));
      part.moveAlpha = rowsV.some((rows) => rows.some((row) => row[j].alpha !== 1));
      part.moveZ = reorder && rowsZ.some((rows) => rows.some((row) => row[j] !== 0));
    });
    const flips = anims.some((p) => p.flip);
    // a imagem de uma peça que muda de forma no quadro f (fora das animações em que ela aparece, a inicial)
    const cellOf = (part, a, f) => { const c = part.cells.get(`${a.name}#${f}`); return c === undefined ? part.img : c; };
    const step = (i, path, keys) => track(i, path, keys, false);

    // ---------- o arquivo .tscn ----------
    const blocks = [];
    const ext = [`[ext_resource type="Texture2D" path="${base}.png" id="1_pecas"]`, `[ext_resource type="Script" path="weasel_anim.gd" id="2_script"]`];
    let tex = 'ExtResource("1_pecas")';
    if (withNormal) {
      ext.push(`[ext_resource type="Texture2D" path="${base}_normal.png" id="3_normal"]`);
      blocks.push(['[sub_resource type="CanvasTexture" id="CanvasTexture_pecas"]', 'diffuse_texture = ExtResource("1_pecas")', 'normal_texture = ExtResource("3_normal")'].join('\n'));
      tex = 'SubResource("CanvasTexture_pecas")';
    }
    for (const b of boxes) {
      const lines = [];
      if (b.shape === 'rect') lines.push(`[sub_resource type="RectangleShape2D" id="${b.res}"]`, `size = ${vec([b.w * k, b.h * k])}`);
      else if (b.shape === 'circle') lines.push(`[sub_resource type="CircleShape2D" id="${b.res}"]`, `radius = ${num(b.r * k)}`);
      else lines.push(`[sub_resource type="CapsuleShape2D" id="${b.res}"]`, `radius = ${num((Math.min(b.w, b.h) / 2) * k)}`, `height = ${num(Math.max(b.w, b.h) * k)}`);
      blocks.push(lines.join('\n'));
    }
    const animIds = [];
    const animBlock = (id, name, length, loop, stepT, build) => {
      const lines = [`[sub_resource type="Animation" id="${id}"]`, `resource_name = ${quote(name)}`, `length = ${num(length)}`];
      if (loop) lines.push('loop_mode = 1');
      lines.push(`step = ${num(stepT)}`);
      let i = 0;
      build((tr) => { lines.push(...tr(i)); i++; });
      blocks.push(lines.join('\n'));
      animIds.push([name, id]);
    };
    // ossos: posição, rotação e escala (só o que muda em alguma animação), interpolados pelo Godot
    const boneTracks = (add, g, rows) => {
      const vals = rows.map((r) => { const v = r.row.get(g); return { pos: [v.pos[0] * k, v.pos[1] * k], rot: v.rot, sc: v.sc }; });
      const keys = (str, nums, eps) => thin(vals.map((v, i) => [rows[i].t, str(v)]), vals.map(nums), eps);
      if (g.moves.pos) add((i) => track(i, `${bonePath(g)}:position`, keys((v) => vec(v.pos), (v) => v.pos, 0.01), true));
      if (g.moves.rot) add((i) => track(i, `${bonePath(g)}:rotation`, keys((v) => flo(v.rot), (v) => [v.rot], 0.0002), true));
      if (g.moves.sc) add((i) => track(i, `${bonePath(g)}:scale`, keys((v) => vec(v.sc), (v) => v.sc, 0.0002), true));
    };
    const restRow = [{ t: 0, row: new Map(gbones.map((g) => [g, { pos: g.rest, rot: 0, sc: [1, 1] }])) }];
    // peças: a imagem das que mudam de forma, quando aparecem, a transparência e a ordem; o lado espelhado
    const partTracks = (add, n, a, flip) => {
      parts.forEach((part, j) => {
        const path = `Visual/Pecas/${part.node}`, dt = a ? 1 / a.fps : 1;
        if (part.kind === 'frames') add((i) => step(i, `${path}:region_rect`, a ? Gd.changes(Array.from({ length: a.frames }, (_, f) => rect(cellOf(part, a, f))), dt) : [[0, rect(part.img)]]));
        if (part.moveVis) add((i) => step(i, `${path}:visible`, a ? Gd.changes(rowsV[n].map((row) => row[j].vis), dt) : [[0, restV[j].vis]]));
        if (part.moveAlpha) add((i) => track(i, `${path}:self_modulate`, a ? rowsV[n].map((row, f) => [f * dt, `Color(1, 1, 1, ${num(row[j].alpha)})`]) : [[0, `Color(1, 1, 1, ${num(restV[j].alpha)})`]], true));
        if (part.moveZ) add((i) => step(i, `${path}:z_index`, a ? Gd.changes(rowsZ[n].map((row) => String(row[j])), dt) : [[0, '0']]));
      });
      if (flips) add((i) => step(i, 'Visual:scale', [[0, flip ? 'Vector2(-1, 1)' : 'Vector2(1, 1)']]));
    };
    animBlock('Animation_RESET', 'RESET', 0.001, false, 0.001, (add) => {
      for (const g of gbones) boneTracks(add, g, restRow);
      partTracks(add, -1, null, false);
      boxes.forEach((b, j) => {
        if (b.movePos) { add((i) => step(i, `${b.path}:position`, [[0, restB[j].pos]])); add((i) => step(i, `${b.path}:rotation`, [[0, restB[j].rot]])); }
        if (b.moveOn) add((i) => step(i, `${b.path}:disabled`, [[0, restB[j].off]]));
      });
      points.forEach((pt, j) => { if (pt.movePos) { add((i) => step(i, `${pt.node}:position`, [[0, restP[j].pos]])); add((i) => step(i, `${pt.node}:rotation`, [[0, restP[j].rot]])); } });
    });
    anims.forEach((p, n) => {
      const a = p.anim, dt = 1 / a.fps;
      animBlock(`Animation_${n}`, p.name, a.frames * dt, a.loop, dt, (add) => {
        for (const g of gbones) boneTracks(add, g, samples.get(a));
        partTracks(add, n, a, p.flip);
        boxes.forEach((b, j) => {
          if (b.movePos) {
            add((i) => step(i, `${b.path}:position`, Gd.changes(rowsB[n].map((row) => row[j].pos), dt)));
            add((i) => step(i, `${b.path}:rotation`, Gd.changes(rowsB[n].map((row) => row[j].rot), dt)));
          }
          if (b.moveOn) add((i) => step(i, `${b.path}:disabled`, Gd.changes(rowsB[n].map((row) => row[j].off), dt)));
        });
        points.forEach((pt, j) => {
          if (!pt.movePos) return;
          add((i) => step(i, `${pt.node}:position`, Gd.changes(rowsP[n].map((row) => row[j].pos), dt)));
          add((i) => step(i, `${pt.node}:rotation`, Gd.changes(rowsP[n].map((row) => row[j].rot), dt)));
        });
        if (a.events.length) add((i) => Gd.methodTrack(i, 'AnimationPlayer', a.events.map((e) => [e.frame * dt, e.name])));
      });
    });
    blocks.push(['[sub_resource type="AnimationLibrary" id="AnimationLibrary_weasel"]', '_data = {', animIds.map(([name, id]) => `${sname(name)}: SubResource("${id}")`).join(',\n'), '}'].join('\n'));

    // nós: o personagem, o visual (esqueleto e peças), as caixas, os pontos e o AnimationPlayer
    const rootName = o.name || (model.godot && model.godot.name) || Gd.pascal(base);
    const nodes = [`[node name="${rootName}" type="${Gd.ROOT_TYPES[bodyType]}"]`, '[node name="Visual" type="Node2D" parent="."]', '[node name="Esqueleto" type="Skeleton2D" parent="Visual"]'];
    const visit = (g) => {
      const parent = g.parent ? bonePath(g.parent) : 'Visual/Esqueleto', p = [g.rest[0] * k, g.rest[1] * k];
      nodes.push([`[node name="${g.node}" type="Bone2D" parent="${parent}"]`, `position = ${vec(p)}`, `rest = Transform2D(1, 0, 0, 1, ${num(p[0])}, ${num(p[1])})`,
        'auto_calculate_length_and_angle = false', `length = ${num(Math.max(4, (g.len || 10) * k))}`, `bone_angle = ${num(((g.ang === undefined ? Math.PI / 2 : g.ang) * 180) / Math.PI)}`].join('\n'));
      // as peças presas ao osso o seguem por RemoteTransform2D: ficam numa lista só, na ordem de pintura
      for (const part of parts) {
        if (!part.bone || part.bone !== g.name || !g.src) continue;
        nodes.push([`[node name="${part.node}" type="RemoteTransform2D" parent="${bonePath(g)}"]`, `remote_path = NodePath(${quote(`${'../'.repeat(chain(g).length + 2)}Pecas/${part.node}`)})`].join('\n'));
      }
      for (const c of gbones) if (c.parent === g) visit(c);
    };
    for (const g of gbones) if (!g.parent) visit(g);
    nodes.push('[node name="Pecas" type="Node2D" parent="Visual"]');
    parts.forEach((part, j) => {
      const head = [];
      if (restV[j].vis === 'false') head.push('visible = false');
      if (restV[j].alpha !== 1) head.push(`self_modulate = Color(1, 1, 1, ${num(restV[j].alpha)})`);
      if (part.kind === 'skin') {
        // a peça que dobra: Polygon2D com pele (cada ponto da malha segue os ossos com o seu peso)
        const ms = part.mesh, bonesArr = [];
        for (const [gb, w] of ms.weights) bonesArr.push(`NodePath(${quote(chain(gb).join('/'))})`, `PackedFloat32Array(${[...w].map(num).join(', ')})`);
        nodes.push([`[node name="${part.node}" type="Polygon2D" parent="Visual/Pecas"]`, ...head, `texture = ${tex}`, 'skeleton = NodePath("../../Esqueleto")',
          `polygon = PackedVector2Array(${ms.verts.map((p) => `${num(p[0])}, ${num(p[1])}`).join(', ')})`,
          `uv = PackedVector2Array(${ms.uv.map((p) => `${num(p[0])}, ${num(p[1])}`).join(', ')})`,
          `polygons = [${ms.tris.map((t) => `PackedInt32Array(${t.join(', ')})`).join(', ')}]`,
          `bones = [${bonesArr.join(', ')}]`].join('\n'));
        return;
      }
      const anchor = part.bone ? model.bones.get(part.bone).pivot : root;
      const off = [R.x * k + part.box.x - anchor[0] * k, R.y * k + part.box.y - anchor[1] * k];
      nodes.push([`[node name="${part.node}" type="Sprite2D" parent="Visual/Pecas"]`, ...head, `texture = ${tex}`, 'centered = false', `offset = ${vec(off)}`, 'region_enabled = true', `region_rect = ${rect(part.img)}`].join('\n'));
    });
    const boxNode = (b, j) => {
      const lines = [`[node name="${b.node}" type="CollisionShape2D" parent="${b.parent}"]`, `position = ${restB[j].pos}`];
      if (restB[j].rot !== '0') lines.push(`rotation = ${restB[j].rot}`);
      lines.push(`shape = SubResource("${b.res}")`);
      if (restB[j].off === 'true') lines.push('disabled = true');
      return lines.join('\n');
    };
    for (const [parent, type] of [['.', null], ['Corpo', 'Area2D'], ['Hitbox', 'Area2D'], ['Hurtbox', 'Area2D']]) {
      const mine = boxes.map((b, j) => [b, j]).filter(([b]) => b.parent === parent);
      if (!mine.length) continue;
      const extra = parent === 'Hitbox' ? '\nmonitorable = false' : parent === 'Hurtbox' ? '\nmonitoring = false' : '';
      if (type) nodes.push(`[node name="${parent}" type="${type}" parent="."]${extra}`);
      for (const [b, j] of mine) nodes.push(boxNode(b, j));
    }
    points.forEach((pt, j) => {
      const lines = [`[node name="${pt.node}" type="Marker2D" parent="."]`, `position = ${restP[j].pos}`];
      if (restP[j].rot !== '0') lines.push(`rotation = ${restP[j].rot}`);
      nodes.push(lines.join('\n'));
    });
    const player = ['[node name="AnimationPlayer" type="AnimationPlayer" parent="."]', 'libraries = {\n&"": SubResource("AnimationLibrary_weasel")\n}'];
    if (first) player.push(`autoplay = ${sname(first.name)}`);
    player.push('script = ExtResource("2_script")');
    nodes.push(player.join('\n'));
    const text = [`[gd_scene load_steps=${blocks.length + ext.length + 1} format=3]`, ext.join('\n'), ...blocks, ...nodes].join('\n\n') + '\n';

    const files = [{ name: `${base}.png`, canvas: atlas.canvas }];
    if (withNormal) files.push({ name: `${base}_normal.png`, canvas: atlas.sheet(normals) });
    files.push({ name: `${base}.tscn`, text }, { name: 'weasel_anim.gd', text: Gd.SCRIPT });
    const mirrored = anims.filter((p) => p.flip).map((p) => p.name);
    return {
      files, kind: 'rig', mirrored, boxes: boxes.length, points: points.length, bones: model.bones.size,
      rigid: parts.filter((p) => p.kind === 'rigid').length, skinned: skins.length, framed: parts.filter((p) => p.kind === 'frames').length, images: imgs.length, notes: [...an.notes],
    };
  }

  W.rig = { packageFiles, analyse };
})(window.Weasel = window.Weasel || {});
