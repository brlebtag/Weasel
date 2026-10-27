/* Weasel — Godot 4: SpriteFrames (.tres) com normal map opcional, cena pronta (.tscn) com AnimatedSprite2D,
   colisão, hitbox e hurtbox que mudam quadro a quadro, eventos chamados pelo AnimationPlayer e direções
   espelhadas (top-down), e TileSet com colisão. Tudo em pixels do jogo, com o ponto raiz na origem do nó. */
(function (W) {
  'use strict';
  const S = W.scene;

  const num = (v) => { const r = Math.round(v * 10000) / 10000; return Object.is(r, -0) ? '0' : String(r); };
  const vec = (p) => `Vector2(${num(p[0])}, ${num(p[1])})`;
  const quote = (t) => `"${String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const sname = (t) => `&${quote(t)}`;

  // ---------- SpriteFrames ----------
  // Sem normal map, o texto é o mesmo de sempre (as exportações antigas continuam iguais).
  function spriteFramesText(model, r, imagePath, normalPath) {
    const atlas = normalPath ? 'SubResource("CanvasTexture_sheet")' : 'ExtResource("1_sheet")';
    const out = [`[gd_resource type="SpriteFrames" load_steps=${r.cells.length + (normalPath ? 4 : 2)} format=3]`, '', `[ext_resource type="Texture2D" path="${imagePath}" id="1_sheet"]`];
    if (normalPath) out.push(`[ext_resource type="Texture2D" path="${normalPath}" id="2_normal"]`, '', '[sub_resource type="CanvasTexture" id="CanvasTexture_sheet"]', 'diffuse_texture = ExtResource("1_sheet")', 'normal_texture = ExtResource("2_normal")');
    out.push('');
    r.cells.forEach((c, i) => out.push(`[sub_resource type="AtlasTexture" id="AtlasTexture_${i}"]`, `atlas = ${atlas}`, `region = Rect2(${c.x}, ${c.y}, ${r.fw}, ${r.fh})`, ''));
    const anims = r.list.map((name) => {
      const a = name ? model.animMap.get(name) : null;
      const frames = [];
      r.cells.forEach((c, i) => { if (c.name === name) frames.push(`{\n"duration": 1.0,\n"texture": SubResource("AtlasTexture_${i}")\n}`); });
      return `{\n"frames": [${frames.join(', ')}],\n"loop": ${a ? a.loop : true},\n"name": &"${name || 'default'}",\n"speed": ${(a ? a.fps : 5).toFixed(1)}\n}`;
    });
    out.push('[resource]', `animations = [${anims.join(', ')}]`, '');
    return out.join('\n');
  }

  // ---------- direções ----------
  const DIRS = ['_down_right', '_down_left', '_up_right', '_up_left', '_right', '_left', '_down', '_up'];
  const MIRROR = { _right: '_left', _left: '_right', _down_right: '_down_left', _down_left: '_down_right', _up_right: '_up_left', _up_left: '_up_right' };
  const dirOf = (name) => DIRS.find((d) => name.endsWith(d) && name.length > d.length) || null;
  // Animações do AnimationPlayer: as do arquivo e, com mirror, o lado que falta (walk_right → walk_left).
  function playerAnims(model, mirror) {
    const out = model.anims.map((a) => ({ name: a.name, anim: a, flip: false }));
    if (!mirror) return out;
    const have = new Set(out.map((p) => p.name));
    for (const a of model.anims) {
      const d = dirOf(a.name), m = d && MIRROR[d];
      if (!m) continue;
      const other = a.name.slice(0, -d.length) + m;
      if (have.has(other)) continue;
      have.add(other);
      out.push({ name: other, anim: a, flip: true });
    }
    return out;
  }

  // ---------- cena ----------
  // ponto raiz (vira a origem do nó): godot root=, unity root=, ou o meio da base do recorte
  function rootOf(model, rect) {
    if (model.godot && model.godot.root) return model.godot.root;
    if (model.unity) return model.unity.root;
    return [rect.x + rect.w / 2, rect.y + rect.h];
  }
  // as caixas do arquivo; sem nenhuma do corpo, o colisor do unity (se houver) vira o corpo
  function boxList(model) {
    const list = [...model.boxes.values()];
    const u = model.unity;
    if (!list.some((b) => b.kind === 'body') && u && u.collider) {
      const [cw, ch, ox, oy] = u.collider, w = cw * u.unit, h = ch * u.unit;
      const cx = u.root[0] + ox * u.unit, cy = u.root[1] - oy * u.unit;
      list.unshift({ name: 'corpo', kind: 'body', shape: 'rect', x: cx - w / 2, y: cy - h / 2, w, h, r: 0, bone: null, only: null, on: true });
    }
    return list;
  }
  const ROOT_TYPES = { character: 'CharacterBody2D', static: 'StaticBody2D', area: 'Area2D', rigid: 'RigidBody2D', node: 'Node2D' };
  const pascal = (t) => String(t).replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, a, b) => b.toUpperCase()).replace(/^[^A-Za-z_]/, '_$&') || 'Personagem';

  function valueTrack(i, path, keys) {
    return [
      `tracks/${i}/type = "value"`, `tracks/${i}/imported = false`, `tracks/${i}/enabled = true`, `tracks/${i}/path = NodePath(${quote(path)})`,
      `tracks/${i}/interp = 1`, `tracks/${i}/loop_wrap = true`, `tracks/${i}/keys = {`,
      `"times": PackedFloat32Array(${keys.map((k) => num(k[0])).join(', ')}),`,
      `"transitions": PackedFloat32Array(${keys.map(() => '1').join(', ')}),`,
      '"update": 1,',
      `"values": [${keys.map((k) => k[1]).join(', ')}]`, '}',
    ];
  }
  function methodTrack(i, path, keys) {
    return [
      `tracks/${i}/type = "method"`, `tracks/${i}/imported = false`, `tracks/${i}/enabled = true`, `tracks/${i}/path = NodePath(${quote(path)})`,
      `tracks/${i}/interp = 1`, `tracks/${i}/loop_wrap = true`, `tracks/${i}/keys = {`,
      `"times": PackedFloat32Array(${keys.map((k) => num(k[0])).join(', ')}),`,
      `"transitions": PackedFloat32Array(${keys.map(() => '1').join(', ')}),`,
      `"values": [${keys.map((k) => `{\n"args": [${sname(k[1])}],\n"method": &"_weasel_evento"\n}`).join(', ')}]`, '}',
    ];
  }
  // só as keys em que o valor muda (o resto o Godot mantém)
  function changes(values, dt) {
    const out = [];
    values.forEach((v, i) => { if (!out.length || out[out.length - 1][1] !== v) out.push([i * dt, v]); });
    return out;
  }

  // Cena .tscn: r = resultado de exporter.sheetCanvas; o = { framesPath, scriptPath, name, mirror }.
  function sceneText(model, r, o) {
    const s = r.scale, rect = r.rect, root = rootOf(model, rect);
    const T = (x, y) => [(x - root[0]) * s, (y - root[1]) * s];
    const off = T(rect.x, rect.y), offFlip = [-(off[0] + r.fw), off[1]];
    const bodyType = (model.godot && model.godot.body) || 'character';
    const boxes = boxList(model);
    const allow = r.list.filter(Boolean);
    const anims = playerAnims(model, o.mirror !== false).filter((p) => !allow.length || allow.includes(p.anim.name));
    const flips = anims.some((p) => p.flip);
    const first = anims.length ? anims[0] : null;
    const reserved = new Set(['Sprite', 'AnimationPlayer', 'Hitbox', 'Hurtbox', 'Corpo']);
    const used = new Set();
    boxes.forEach((b, i) => {
      let n = b.name;
      while (reserved.has(n) || used.has(n)) n += '_caixa';
      used.add(n);
      b.node = n;
      b.parent = b.kind === 'hit' ? 'Hitbox' : b.kind === 'hurt' ? 'Hurtbox' : bodyType === 'node' ? 'Corpo' : '.';
      b.path = b.parent === '.' ? n : `${b.parent}/${n}`;
      b.res = `Shape_${i}`;
      b.extra = b.shape === 'capsule' && b.w > b.h ? 90 : 0; // cápsula deitada: a do Godot é em pé
    });
    // onde cada caixa está (e se está ligada) num quadro
    const boxAt = (pose, b, flip) => {
      const st = S.boxState(model, pose, b);
      const p = T(st.cx, st.cy);
      let rot = st.rot + b.extra;
      if (flip) { p[0] = -p[0]; rot = -rot; }
      return { pos: vec(p), rot: num((rot * Math.PI) / 180), off: st.on ? 'false' : 'true' };
    };
    const restPose = first ? S.makePose(model, first.anim.name, 0) : S.makePose(model, null, 0);
    const rest = boxes.map((b) => boxAt(restPose, b, false));
    const perAnim = anims.map((p) => {
      const rows = [];
      for (let f = 0; f < p.anim.frames; f++) { const pose = S.makePose(model, p.anim.name, f); rows.push(boxes.map((b) => boxAt(pose, b, p.flip))); }
      return rows;
    });
    // caixa que se mexe ou liga/desliga ganha faixas em todas as animações (trocar de animação acerta o estado)
    boxes.forEach((b, k) => {
      b.movePos = perAnim.some((rows) => rows.some((row) => row[k].pos !== rest[k].pos || row[k].rot !== rest[k].rot));
      b.moveOn = perAnim.some((rows) => rows.some((row) => row[k].off !== rest[k].off));
    });

    const blocks = [];
    const ext = [`[ext_resource type="SpriteFrames" path="${o.framesPath}" id="1_frames"]`, `[ext_resource type="Script" path="${o.scriptPath}" id="2_script"]`];
    for (const b of boxes) {
      const lines = [];
      if (b.shape === 'rect') lines.push(`[sub_resource type="RectangleShape2D" id="${b.res}"]`, `size = ${vec([b.w * s, b.h * s])}`);
      else if (b.shape === 'circle') lines.push(`[sub_resource type="CircleShape2D" id="${b.res}"]`, `radius = ${num(b.r * s)}`);
      else lines.push(`[sub_resource type="CapsuleShape2D" id="${b.res}"]`, `radius = ${num((Math.min(b.w, b.h) / 2) * s)}`, `height = ${num(Math.max(b.w, b.h) * s)}`);
      blocks.push(lines.join('\n'));
    }
    // RESET (o estado que o editor do Godot restaura) e uma Animation por animação
    const animIds = [];
    const animBlock = (id, name, length, loop, step, build) => {
      const lines = [`[sub_resource type="Animation" id="${id}"]`, `resource_name = ${quote(name)}`, `length = ${num(length)}`];
      if (loop) lines.push('loop_mode = 1');
      lines.push(`step = ${num(step)}`);
      let i = 0;
      const add = (tr) => { lines.push(...tr(i)); i++; };
      build(add);
      blocks.push(lines.join('\n'));
      animIds.push([name, id]);
    };
    if (first) {
      animBlock('Animation_RESET', 'RESET', 0.001, false, 0.001, (add) => {
        add((i) => valueTrack(i, 'Sprite:animation', [[0, sname(first.anim.name)]]));
        add((i) => valueTrack(i, 'Sprite:frame', [[0, '0']]));
        if (flips) { add((i) => valueTrack(i, 'Sprite:flip_h', [[0, 'false']])); add((i) => valueTrack(i, 'Sprite:offset', [[0, vec(off)]])); }
        boxes.forEach((b, k) => {
          if (b.movePos) { add((i) => valueTrack(i, `${b.path}:position`, [[0, rest[k].pos]])); add((i) => valueTrack(i, `${b.path}:rotation`, [[0, rest[k].rot]])); }
          if (b.moveOn) add((i) => valueTrack(i, `${b.path}:disabled`, [[0, rest[k].off]]));
        });
      });
    }
    anims.forEach((p, n) => {
      const a = p.anim, dt = 1 / a.fps, rows = perAnim[n];
      animBlock(`Animation_${n}`, p.name, a.frames * dt, a.loop, dt, (add) => {
        add((i) => valueTrack(i, 'Sprite:animation', [[0, sname(a.name)]]));
        add((i) => valueTrack(i, 'Sprite:frame', rows.map((_, f) => [f * dt, String(f)])));
        if (flips) { add((i) => valueTrack(i, 'Sprite:flip_h', [[0, p.flip ? 'true' : 'false']])); add((i) => valueTrack(i, 'Sprite:offset', [[0, vec(p.flip ? offFlip : off)]])); }
        boxes.forEach((b, k) => {
          if (b.movePos) {
            add((i) => valueTrack(i, `${b.path}:position`, changes(rows.map((row) => row[k].pos), dt)));
            add((i) => valueTrack(i, `${b.path}:rotation`, changes(rows.map((row) => row[k].rot), dt)));
          }
          if (b.moveOn) add((i) => valueTrack(i, `${b.path}:disabled`, changes(rows.map((row) => row[k].off), dt)));
        });
        if (a.events.length) add((i) => methodTrack(i, 'AnimationPlayer', a.events.map((e) => [e.frame * dt, e.name])));
      });
    });
    blocks.push(['[sub_resource type="AnimationLibrary" id="AnimationLibrary_weasel"]', '_data = {', animIds.map(([name, id]) => `${sname(name)}: SubResource("${id}")`).join(',\n'), '}'].join('\n'));

    // nós
    const rootName = o.name || (model.godot && model.godot.name) || 'Personagem';
    const nodes = [`[node name="${rootName}" type="${ROOT_TYPES[bodyType]}"]`];
    const sprite = [`[node name="Sprite" type="AnimatedSprite2D" parent="."]`, 'sprite_frames = ExtResource("1_frames")'];
    sprite.push(`animation = ${sname(first ? first.anim.name : 'default')}`, 'centered = false', `offset = ${vec(off)}`);
    nodes.push(sprite.join('\n'));
    const boxNode = (b, k) => {
      const lines = [`[node name="${b.node}" type="CollisionShape2D" parent="${b.parent}"]`, `position = ${rest[k].pos}`];
      if (rest[k].rot !== '0') lines.push(`rotation = ${rest[k].rot}`);
      lines.push(`shape = SubResource("${b.res}")`);
      if (rest[k].off === 'true') lines.push('disabled = true');
      return lines.join('\n');
    };
    for (const [parent, type] of [['.', null], ['Corpo', 'Area2D'], ['Hitbox', 'Area2D'], ['Hurtbox', 'Area2D']]) {
      const mine = boxes.map((b, k) => [b, k]).filter(([b]) => b.parent === parent);
      if (!mine.length) continue;
      // o golpe procura (não precisa ser achado); a área de dano é achada (não precisa procurar)
      const extra = parent === 'Hitbox' ? '\nmonitorable = false' : parent === 'Hurtbox' ? '\nmonitoring = false' : '';
      if (type) nodes.push(`[node name="${parent}" type="${type}" parent="."]${extra}`);
      for (const [b, k] of mine) nodes.push(boxNode(b, k));
    }
    const player = [`[node name="AnimationPlayer" type="AnimationPlayer" parent="."]`, 'libraries = {\n&"": SubResource("AnimationLibrary_weasel")\n}'];
    if (first) player.push(`autoplay = ${sname(first.name)}`);
    player.push('script = ExtResource("2_script")');
    nodes.push(player.join('\n'));

    return [`[gd_scene load_steps=${blocks.length + 3} format=3]`, ext.join('\n'), ...blocks, ...nodes].join('\n\n') + '\n';
  }

  // Ajudante do AnimationPlayer (o mesmo para todos os personagens).
  const SCRIPT = `# Weasel — ajudante do AnimationPlayer das cenas exportadas pelo Weasel.
# Toca as animações pelo nome e pela direção (top-down) e avisa os eventos (event) das animações.
# É o mesmo arquivo para todos os personagens; pode copiar e mudar à vontade.
extends AnimationPlayer

## Emitido em cada event das animações (passo, golpe, pouso...).
signal evento(nome: StringName)

const DIRECOES_4: Array[String] = ["_right", "_down", "_left", "_up"]
const DIRECOES_8: Array[String] = ["_right", "_down_right", "_down", "_down_left", "_left", "_up_left", "_up", "_up_right"]

## A última direção pedida a tocar(); vale quando a direção passada é zero (personagem parado).
var direcao := Vector2.DOWN


## Toca "acao" virada para a direção: tocar("walk", velocity) escolhe walk_down, walk_up, walk_right
## ou walk_left (e as diagonais, se houver). Sem animações com direção, toca "acao" mesmo.
## Só recomeça a animação quando ela muda.
func tocar(acao: String, dir := Vector2.ZERO) -> void:
	if dir.length_squared() > 0.0001:
		direcao = dir.normalized()
	var nome := nome_com_direcao(acao, direcao)
	if current_animation != nome or not is_playing():
		play(nome)


## O nome da animação de "acao" para a direção (ou "acao", se não houver versões com direção).
func nome_com_direcao(acao: String, dir: Vector2) -> StringName:
	var angulo := rad_to_deg(dir.angle())
	if has_animation(acao + "_down_right") or has_animation(acao + "_up_right"):
		var oito := acao + DIRECOES_8[posmod(roundi(angulo / 45.0), 8)]
		if has_animation(oito):
			return StringName(oito)
	var quatro := acao + DIRECOES_4[posmod(roundi(angulo / 90.0), 4)]
	if has_animation(quatro):
		return StringName(quatro)
	return StringName(acao)


func _weasel_evento(nome: StringName) -> void:
	evento.emit(nome)
`;

  // ---------- TileSet ----------
  // pontos de uma polilinha com menos vértices (Ramer–Douglas–Peucker)
  function simplify(pts, tol) {
    if (pts.length <= 3) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const [ax, ay] = pts[a], [bx, by] = pts[b];
      const L = Math.hypot(bx - ax, by - ay) || 1;
      let best = -1, bd = tol;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
        if (d > bd) { bd = d; best = i; }
      }
      if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  // tira os pontos no meio de um lado reto (o polígono é fechado: o último liga no primeiro)
  function dropCollinear(pts, tol) {
    for (let i = 0; pts.length > 3 && i < pts.length;) {
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      if (Math.abs((c[0] - a[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (c[1] - a[1])) / L < tol) pts.splice(i, 1);
      else i++;
    }
    return pts;
  }
  // Blocos do tileset: os declarados com tile e, com auto, toda célula desenhada.
  function tileList(model, atlas, s) {
    const T = model.tileset, tiles = T.tiles.slice();
    if (T.auto && atlas) {
      const x = atlas.getContext('2d'), tw = Math.round(T.size[0] * s), th = Math.round(T.size[1] * s);
      for (let row = 0; row < T.rows; row++) {
        for (let col = 0; col < T.cols; col++) {
          if (tiles.some((t) => t.col === col && t.row === row)) continue;
          const d = x.getImageData(col * tw, row * th, tw, th).data;
          let ink = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 8) ink++;
          if (ink > 4) tiles.push({ name: `bloco_${col}_${row}`, col, row, solid: false, oneway: false, collision: null });
        }
      }
    }
    return tiles.sort((a, b) => a.row - b.row || a.col - b.col);
  }
  function tilesetText(model, o) {
    const T = model.tileset, s = o.scale;
    const tw = Math.round(T.size[0] * s), th = Math.round(T.size[1] * s);
    const pose = S.makePose(model, null, 0);
    const tiles = tileList(model, o.atlas, s);
    const tex = o.normalPath ? 'SubResource("CanvasTexture_tiles")' : 'ExtResource("1_tiles")';
    const out = ['[gd_resource type="TileSet" format=3]', '', `[ext_resource type="Texture2D" path="${o.imagePath}" id="1_tiles"]`];
    if (o.normalPath) out.push(`[ext_resource type="Texture2D" path="${o.normalPath}" id="2_normal"]`, '', '[sub_resource type="CanvasTexture" id="CanvasTexture_tiles"]', 'diffuse_texture = ExtResource("1_tiles")', 'normal_texture = ExtResource("2_normal")');
    out.push('', '[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_tiles"]', `texture = ${tex}`, `texture_region_size = Vector2i(${tw}, ${th})`);
    for (const t of tiles) {
      const key = `${t.col}:${t.row}/0`;
      out.push(`${key} = 0`);
      const cx = (t.col + 0.5) * T.size[0], cy = (t.row + 0.5) * T.size[1];
      let poly = null;
      if (t.collision) {
        const flat = S.flatOf(S.geometry(model, pose, t.collision));
        let pts = [];
        for (let i = 0; i < flat.length; i += 2) pts.push([(flat[i] - cx) * s, (flat[i + 1] - cy) * s]);
        if (pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.01) pts.pop();
        pts = dropCollinear(simplify(pts, 0.6), 0.6);
        if (pts.length >= 3) poly = pts;
      } else if (t.solid) poly = [[-tw / 2, -th / 2], [tw / 2, -th / 2], [tw / 2, th / 2], [-tw / 2, th / 2]];
      if (poly) {
        out.push(`${key}/physics_layer_0/polygon_0/points = PackedVector2Array(${poly.map((p) => `${num(p[0])}, ${num(p[1])}`).join(', ')})`);
        if (t.oneway) out.push(`${key}/physics_layer_0/polygon_0/one_way = true`);
      }
      out.push(`${key}/custom_data_0 = ${quote(t.name)}`);
    }
    out.push('', '[resource]', `tile_size = Vector2i(${tw}, ${th})`, 'physics_layer_0/collision_layer = 1', 'custom_data_layer_0/name = "nome"', 'custom_data_layer_0/type = 4', 'sources/0 = SubResource("TileSetAtlasSource_tiles")', '');
    return { text: out.join('\n'), tiles };
  }

  // ---------- pacote ----------
  // Arquivos para o Godot: [{ name, canvas } | { name, text }]. o = { base, scale, normal, mirror, padding, layout, cols, margin }
  function packageFiles(model, o) {
    const X = W.exporter, base = o.base, files = [];
    const strength = model.godot ? model.godot.normal : 1;
    if (model.tileset) {
      const T = model.tileset;
      if (Math.abs(T.size[0] * o.scale - Math.round(T.size[0] * o.scale)) > 1e-6 || Math.abs(T.size[1] * o.scale - Math.round(T.size[1] * o.scale)) > 1e-6) {
        throw new Error(`com escala ${o.scale} o bloco de ${T.size[0]}×${T.size[1]} não fica com tamanho inteiro`);
      }
      const rect = { x: 0, y: 0, w: T.cols * T.size[0], h: T.rows * T.size[1] };
      const atlas = S.renderImage(model, S.makePose(model, null, 0), { scale: o.scale, rect, transparent: true });
      files.push({ name: `${base}.png`, canvas: atlas });
      let normalPath = null;
      if (o.normal) {
        normalPath = `${base}_normal.png`;
        const alpha = atlas.getContext('2d').getImageData(0, 0, atlas.width, atlas.height).data;
        files.push({ name: normalPath, canvas: W.normal.frame(model, S.makePose(model, null, 0), { rect, scale: o.scale, strength, alpha }) });
      }
      const ts = tilesetText(model, { scale: o.scale, imagePath: `${base}.png`, normalPath, atlas });
      files.push({ name: `${base}.tres`, text: ts.text });
      return { files, kind: 'tileset', tiles: ts.tiles.length, size: [atlas.width, atlas.height] };
    }
    const names = o.names || (model.anims.length ? model.anims.map((a) => a.name) : [null]);
    const r = X.sheetCanvas(model, names, { scale: o.scale, transparent: true, trim: o.trim !== false, margin: o.margin !== undefined ? o.margin : 8, layout: o.layout || 'grid', cols: o.cols || 0, padding: o.padding !== undefined ? o.padding : 2, imageName: `${base}.png` });
    files.push({ name: `${base}.png`, canvas: r.canvas });
    let normalPath = null;
    if (o.normal) { normalPath = `${base}_normal.png`; files.push({ name: normalPath, canvas: W.normal.sheet(model, r, { strength }) }); }
    files.push({ name: `${base}.tres`, text: spriteFramesText(model, r, `${base}.png`, normalPath) });
    if (o.scene !== false) {
      files.push({ name: `${base}.tscn`, text: sceneText(model, r, { framesPath: `${base}.tres`, scriptPath: 'weasel_anim.gd', name: o.name || (model.godot && model.godot.name) || pascal(base), mirror: o.mirror }) });
      files.push({ name: 'weasel_anim.gd', text: SCRIPT });
    }
    const mirrored = o.scene === false ? [] : playerAnims(model, o.mirror !== false).filter((p) => p.flip && names.includes(p.anim.name)).map((p) => p.name);
    return { files, kind: 'scene', sheet: r, mirrored, boxes: boxList(model).length };
  }

  W.godot = { spriteFramesText, sceneText, tilesetText, packageFiles, playerAnims, rootOf, boxList, SCRIPT, dirOf };
})(window.Weasel = window.Weasel || {});
