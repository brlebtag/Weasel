/* Weasel — Godot 4 com esqueleto de verdade (godot rig=bones, ou --rig na linha de comando). Cada osso vira
   um Bone2D e cada pedaço do desenho uma imagem que segue o osso; o AnimationPlayer anima os ossos, então o
   movimento fica liso, as animações se misturam no AnimationTree e o código do jogo pode girar um osso
   (mirar, olhar). O que muda de forma (morph, pernas e braços com IK, tecido, partículas, cores animadas)
   continua quadro a quadro, numa imagem trocada a cada quadro. Caixas, pontos de encaixe e eventos funcionam
   como na cena por quadros. */
(function (W) {
  'use strict';
  const S = W.scene;

  const num = (v) => { const r = Math.round(v * 10000) / 10000; return Object.is(r, -0) ? '0' : String(r); };
  // número que o Godot lê como float: "0" vira inteiro, e uma faixa contínua de inteiros arredonda os ângulos
  const flo = (v) => { const s = num(v); return /[.e]/.test(s) ? s : `${s}.0`; };
  const vec = (p) => `Vector2(${num(p[0])}, ${num(p[1])})`;
  const quote = (t) => `"${String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const sname = (t) => `&${quote(t)}`;
  const MARGIN = 24; // em volta do canvas: o que passa um pouco da borda na pose parada também vira peça
  const SHAPE_PROPS = new Set(['shape', 'draw', 'c', 'inkc', 'w', 'ink']);
  const RATE = 30; // amostras por segundo, no mínimo, para os ossos (entre elas o Godot interpola)

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

  // ---------- peças ----------
  // Elementos que mudam numa animação e não podem ser uma imagem só presa ao osso:
  // shape = mudam de forma ou de cor, mas só dependem do próprio osso (a imagem troca e segue o osso);
  // world = dependem de mais de um osso ou do mundo (IK, tecido, partículas, rastro, sombra no chão…).
  function analyse(model) {
    const shape = new Set(), world = new Set(), fade = new Set(), dynLayers = new Set(), notes = new Set();
    for (const an of model.anims) {
      for (const tr of an.ptracks.values()) {
        if (tr.kind === 'el') {
          for (const el of tr.targets) {
            if (SHAPE_PROPS.has(tr.prop)) shape.add(el);
            else if (tr.prop === 'opacity' || tr.prop === 'show') fade.add(el);
            else if (tr.prop === 'order') notes.add('above= e below= ainda não mudam a ordem no esqueleto (vale a do arquivo)');
          }
        } else if (tr.kind === 'layer') {
          if (tr.prop === 'order') notes.add('above= e below= ainda não mudam a ordem no esqueleto (vale a do arquivo)');
          else dynLayers.add(tr.name);
        } else if (tr.kind === 'light') notes.add('as luzes animadas ficam como na pose parada');
      }
    }
    for (const el of model.elements) {
      const L = el.layer;
      if (el.limb || el.cloth || el.type === 'emitter' || L.trail || L.cast || dynLayers.has(L.name)) world.add(el);
    }
    // recortes (clip, cut e buracos) só seguem junto se o molde estiver no mesmo osso
    for (let pass = 0; pass < 3; pass++) {
      for (const el of model.elements) {
        if (world.has(el)) continue;
        const L = el.layer, molds = [];
        for (const n of [L.clip, L.cut]) if (n) molds.push(...S.clipEls(model, n));
        if (el.cuts) molds.push(...el.cuts);
        if (molds.some((mo) => mo.bone !== el.bone || world.has(mo))) world.add(el);
        else if (molds.some((mo) => shape.has(mo))) shape.add(el);
      }
    }
    for (const el of world) shape.delete(el);
    if (model.lights.size) notes.add('a luz da cena fica desenhada nas peças como na pose parada');
    return { shape, world, fade, notes };
  }

  // Peças em ordem de pintura: itens seguidos que vão juntos (mesmo osso, mesma visibilidade) viram uma imagem.
  // rigid = uma imagem presa ao osso; frames = uma imagem por quadro (presa ao osso, se tiver um, ou no mundo).
  function partsOf(model, an) {
    const parts = [];
    let cur = null;
    for (const L of model.layers) {
      if (L.hidden || L.guide) continue;
      for (const it of L.items) {
        const el = it.el;
        if (el.hidden) continue;
        const only = L.only ? L.only.join(',') : '';
        const kind = an.world.has(el) || an.shape.has(el) ? 'frames' : 'rigid';
        const bone = an.world.has(el) ? null : el.bone || null;
        const key = an.world.has(el) ? `w|${only}` : an.shape.has(el) ? `s|${bone || ''}|${only}` : an.fade.has(el) ? `e|${el.id}` : `r|${bone || ''}|${only}`;
        if (!cur || cur.key !== key) {
          cur = { key, kind, bone, items: new Set(), layers: new Set(), only: L.only, fade: kind === 'rigid' && an.fade.has(el) ? el : null, name: null };
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
    const out = document.createElement('canvas');
    out.width = Wd;
    out.height = Hd;
    const ctx = out.getContext('2d');
    imgs.forEach((im, i) => ctx.drawImage(im, pos[i][0], pos[i][1]));
    return { canvas: out, pos };
  }

  // ---------- cena ----------
  // Arquivos para o Godot: a folha de peças (.png), a cena (.tscn) e o ajudante do AnimationPlayer.
  // o = { base, scale, mirror, names, name }
  function packageFiles(model, o) {
    const Gd = W.godot, k = o.scale || 1, base = o.base;
    const R = { x: -MARGIN, y: -MARGIN, w: model.canvas.w + 2 * MARGIN, h: model.canvas.h + 2 * MARGIN };
    const root = Gd.rootOf(model, { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h });
    const T = (x, y) => [(x - root[0]) * k, (y - root[1]) * k];
    const allow = o.names ? o.names.filter(Boolean) : [];
    const anims = Gd.playerAnims(model, o.mirror !== false).filter((p) => !allow.length || allow.includes(p.anim.name));
    const own = [...new Set(anims.map((p) => p.anim))];
    const first = anims.length ? anims[0] : null;
    const an = analyse(model);
    const rest = S.makePose(model, null, 0);

    // imagens das peças: as fixas na pose parada, as que mudam de forma em cada quadro de cada animação
    const imgs = [];
    const parts = partsOf(model, an).filter((part) => {
      if (part.kind === 'rigid') {
        const c = render(model, rest, part, k, R), b = alphaBox(c);
        if (!b) return false;
        part.box = b;
        part.img = imgs.push(crop(c, b)) - 1;
        return true;
      }
      const shots = new Map();
      let box = null;
      // presa a um osso: desenhada no lugar do osso parado, para a imagem só mudar quando a forma muda
      const at = (pose) => (part.bone ? Object.assign({}, pose, { bones: rest.bones, cloth: rest.cloth, geo: new Map() }) : pose);
      const take = (key, pose) => { const c = render(model, at(pose), part, k, R); shots.set(key, c); box = union(box, alphaBox(c)); };
      for (const a of own) {
        if (part.only && !part.only.includes(a.name)) continue;
        for (let f = 0; f < a.frames; f++) take(`${a.name}#${f}`, S.makePose(model, a.name, f));
      }
      if (!own.length) take('pose', rest);
      if (!box) return false;
      part.box = box;
      part.cells = new Map();
      const seen = new Map();
      for (const [key, c] of shots) {
        const im = crop(c, box), id = digest(im);
        if (!seen.has(id)) seen.set(id, imgs.push(im) - 1);
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
    for (const b of model.bones.values()) b.node = unique(b.name);
    parts.forEach((p, i) => { p.node = unique(`${p.name || 'peca'}_${i}`); });

    // ossos: Bone2D na mesma hierarquia; a origem de cada um é o pivô
    const bones = [...model.bones.values()];
    const chain = (b) => { const out = []; let c = b, guard = 0; while (c && guard++ < 64) { out.unshift(c.node); c = c.parent ? model.bones.get(c.parent) : null; } return out; };
    const bonePath = (b) => `Visual/Esqueleto/${chain(b).join('/')}`;
    const restPos = (b) => { const pp = b.parent ? model.bones.get(b.parent).pivot : root; return [(b.pivot[0] - pp[0]) * k, (b.pivot[1] - pp[1]) * k]; };
    const local = (b, v) => { const p = restPos(b); return { pos: [p[0] + v[0] * k, p[1] + v[1] * k], rot: (v[2] * Math.PI) / 180, sc: [v[3], v[4]] }; };
    // amostras de cada animação (mais de uma por quadro, para o Godot interpolar macio)
    const samples = new Map();
    for (const a of own) {
      const sub = Math.max(1, Math.ceil(RATE / a.fps)), n = a.frames * sub, rows = [];
      for (let i = 0; i < n; i++) rows.push({ t: i / (a.fps * sub), v: S.boneLocal(model, a, i / sub) });
      samples.set(a, rows);
    }
    const REST = [0, 0, 0, 1, 1], E = 1e-6;
    for (const b of bones) {
      b.moves = { pos: false, rot: false, sc: false };
      for (const rows of samples.values()) {
        for (const r of rows) {
          const v = r.v.get(b.name);
          if (Math.abs(v[0]) > E || Math.abs(v[1]) > E) b.moves.pos = true;
          if (Math.abs(v[2]) > E) b.moves.rot = true;
          if (Math.abs(v[3] - 1) > E || Math.abs(v[4] - 1) > E) b.moves.sc = true;
        }
      }
    }
    // comprimento e direção do osso (só para o desenho do esqueleto no editor do Godot)
    const center = (p) => [R.x + (p.box.x + p.box.w / 2) / k, R.y + (p.box.y + p.box.h / 2) / k];
    for (const b of bones) {
      const pts = parts.filter((p) => p.bone === b.name).map(center).concat(bones.filter((c) => c.parent === b.name).map((c) => c.pivot));
      let tip = pts.length ? [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length] : [b.pivot[0], b.pivot[1] + 10];
      if (Math.hypot(tip[0] - b.pivot[0], tip[1] - b.pivot[1]) < 4) tip = [b.pivot[0], b.pivot[1] + 10];
      b.len = Math.hypot(tip[0] - b.pivot[0], tip[1] - b.pivot[1]) * k;
      b.ang = Math.atan2(tip[1] - b.pivot[1], tip[0] - b.pivot[0]);
    }

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
    const rowsB = [], rowsP = [], rowsV = [];
    // visibilidade e transparência das peças em cada quadro
    const partState = (pose, a, part) => {
      let vis = !part.only || part.only.includes(a ? a.name : 'pose');
      let alpha = 1;
      if (part.fade) {
        const pr = pose.props.get(part.fade.id) || {};
        if (pr.show === 0) vis = false;
        if (pr.opacity !== undefined) alpha = pr.opacity;
      }
      return { vis: vis ? 'true' : 'false', alpha };
    };
    for (const p of anims) {
      const rb = [], rp = [], rv = [];
      for (let f = 0; f < p.anim.frames; f++) {
        const pose = S.makePose(model, p.anim.name, f);
        rb.push(boxes.map((b) => boxAt(pose, b, p.flip)));
        rp.push(points.map((pt) => pointAt(pose, pt, p.flip)));
        rv.push(parts.map((part) => partState(pose, p.anim, part)));
      }
      rowsB.push(rb);
      rowsP.push(rp);
      rowsV.push(rv);
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
    });
    const flips = anims.some((p) => p.flip);
    // a imagem de uma peça que muda de forma no quadro f (fora das animações em que ela aparece, a inicial)
    const cellOf = (part, a, f) => { const c = part.cells.get(`${a.name}#${f}`); return c === undefined ? part.img : c; };
    const step = (i, path, keys) => track(i, path, keys, false);

    // ---------- o arquivo .tscn ----------
    const blocks = [];
    const ext = [`[ext_resource type="Texture2D" path="${base}.png" id="1_pecas"]`, `[ext_resource type="Script" path="weasel_anim.gd" id="2_script"]`];
    for (const b of boxes) {
      const lines = [];
      if (b.shape === 'rect') lines.push(`[sub_resource type="RectangleShape2D" id="${b.res}"]`, `size = ${vec([b.w * k, b.h * k])}`);
      else if (b.shape === 'circle') lines.push(`[sub_resource type="CircleShape2D" id="${b.res}"]`, `radius = ${num(b.r * k)}`);
      else lines.push(`[sub_resource type="CapsuleShape2D" id="${b.res}"]`, `radius = ${num((Math.min(b.w, b.h) / 2) * k)}`, `height = ${num(Math.max(b.w, b.h) * k)}`);
      blocks.push(lines.join('\n'));
    }
    const animIds = [];
    const animBlock = (id, name, length, loop, step, build) => {
      const lines = [`[sub_resource type="Animation" id="${id}"]`, `resource_name = ${quote(name)}`, `length = ${num(length)}`];
      if (loop) lines.push('loop_mode = 1');
      lines.push(`step = ${num(step)}`);
      let i = 0;
      build((tr) => { lines.push(...tr(i)); i++; });
      blocks.push(lines.join('\n'));
      animIds.push([name, id]);
    };
    // ossos: posição, rotação e escala (só o que muda em alguma animação), interpolados pelo Godot
    const boneTracks = (add, b, rows) => {
      const vals = rows.map((r) => local(b, r.v.get(b.name)));
      const keys = (str, nums, eps) => thin(vals.map((v, i) => [rows[i].t, str(v)]), vals.map(nums), eps);
      if (b.moves.pos) add((i) => track(i, `${bonePath(b)}:position`, keys((v) => vec(v.pos), (v) => v.pos, 0.01), true));
      if (b.moves.rot) add((i) => track(i, `${bonePath(b)}:rotation`, keys((v) => flo(v.rot), (v) => [v.rot], 0.0002), true));
      if (b.moves.sc) add((i) => track(i, `${bonePath(b)}:scale`, keys((v) => vec(v.sc), (v) => v.sc, 0.0002), true));
    };
    const restRow = [{ t: 0, v: new Map(bones.map((b) => [b.name, REST])) }];
    // peças: a imagem das que mudam de forma, quando aparecem e a transparência; o lado espelhado
    const partTracks = (add, rowsVis, a, flip) => {
      parts.forEach((part, j) => {
        const path = `Visual/Pecas/${part.node}`;
        if (part.kind === 'frames') add((i) => step(i, `${path}:region_rect`, a ? Gd.changes(Array.from({ length: a.frames }, (_, f) => rect(cellOf(part, a, f))), 1 / a.fps) : [[0, rect(part.img)]]));
        if (part.moveVis) add((i) => step(i, `${path}:visible`, a ? Gd.changes(rowsVis.map((row) => row[j].vis), 1 / a.fps) : [[0, restV[j].vis]]));
        if (part.moveAlpha) add((i) => track(i, `${path}:self_modulate`, a ? rowsVis.map((row, f) => [f / a.fps, `Color(1, 1, 1, ${num(row[j].alpha)})`]) : [[0, `Color(1, 1, 1, ${num(restV[j].alpha)})`]], true));
      });
      if (flips) add((i) => step(i, 'Visual:scale', [[0, flip ? 'Vector2(-1, 1)' : 'Vector2(1, 1)']]));
    };
    animBlock('Animation_RESET', 'RESET', 0.001, false, 0.001, (add) => {
      for (const b of bones) boneTracks(add, b, restRow);
      partTracks(add, null, null, false);
      boxes.forEach((b, j) => {
        if (b.movePos) { add((i) => step(i, `${b.path}:position`, [[0, restB[j].pos]])); add((i) => step(i, `${b.path}:rotation`, [[0, restB[j].rot]])); }
        if (b.moveOn) add((i) => step(i, `${b.path}:disabled`, [[0, restB[j].off]]));
      });
      points.forEach((pt, j) => { if (pt.movePos) { add((i) => step(i, `${pt.node}:position`, [[0, restP[j].pos]])); add((i) => step(i, `${pt.node}:rotation`, [[0, restP[j].rot]])); } });
    });
    anims.forEach((p, n) => {
      const a = p.anim, dt = 1 / a.fps;
      animBlock(`Animation_${n}`, p.name, a.frames * dt, a.loop, dt, (add) => {
        for (const b of bones) boneTracks(add, b, samples.get(a));
        partTracks(add, rowsV[n], a, p.flip);
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
    const depth = (b) => chain(b).length;
    const visit = (b) => {
      const parent = b.parent ? `Visual/Esqueleto/${chain(model.bones.get(b.parent)).join('/')}` : 'Visual/Esqueleto';
      const p = restPos(b);
      nodes.push([`[node name="${b.node}" type="Bone2D" parent="${parent}"]`, `position = ${vec(p)}`, `rest = Transform2D(1, 0, 0, 1, ${num(p[0])}, ${num(p[1])})`,
        'auto_calculate_length_and_angle = false', `length = ${num(Math.max(4, b.len))}`, `bone_angle = ${num((b.ang * 180) / Math.PI)}`].join('\n'));
      // as peças do osso o seguem por RemoteTransform2D: ficam numa lista só, na ordem de pintura
      for (const part of parts) {
        if (part.bone !== b.name) continue;
        nodes.push([`[node name="${part.node}" type="RemoteTransform2D" parent="${bonePath(b)}"]`, `remote_path = NodePath(${quote(`${'../'.repeat(depth(b) + 2)}Pecas/${part.node}`)})`].join('\n'));
      }
      for (const c of bones) if (c.parent === b.name) visit(c);
    };
    for (const b of bones) if (!b.parent || !model.bones.has(b.parent)) visit(b);
    nodes.push('[node name="Pecas" type="Node2D" parent="Visual"]');
    parts.forEach((part, j) => {
      const anchor = part.bone ? model.bones.get(part.bone).pivot : root;
      const off = [R.x * k + part.box.x - anchor[0] * k, R.y * k + part.box.y - anchor[1] * k];
      const lines = [`[node name="${part.node}" type="Sprite2D" parent="Visual/Pecas"]`];
      if (restV[j].vis === 'false') lines.push('visible = false');
      if (restV[j].alpha !== 1) lines.push(`self_modulate = Color(1, 1, 1, ${num(restV[j].alpha)})`);
      lines.push('texture = ExtResource("1_pecas")', 'centered = false', `offset = ${vec(off)}`, 'region_enabled = true', `region_rect = ${rect(part.img)}`);
      nodes.push(lines.join('\n'));
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
    const text = [`[gd_scene load_steps=${blocks.length + 3} format=3]`, ext.join('\n'), ...blocks, ...nodes].join('\n\n') + '\n';

    const files = [{ name: `${base}.png`, canvas: atlas.canvas }, { name: `${base}.tscn`, text }, { name: 'weasel_anim.gd', text: Gd.SCRIPT }];
    const mirrored = anims.filter((p) => p.flip).map((p) => p.name);
    return {
      files, kind: 'rig', mirrored, boxes: boxes.length, points: points.length, bones: bones.length,
      rigid: parts.filter((p) => p.kind === 'rigid').length, framed: parts.filter((p) => p.kind === 'frames').length, images: imgs.length, notes: [...an.notes],
    };
  }

  W.rig = { packageFiles, analyse };
})(window.Weasel = window.Weasel || {});
