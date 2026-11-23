/* Weasel — Godot 4: SpriteFrames (.tres) com normal map opcional, cena pronta (.tscn) com AnimatedSprite2D,
   colisão, hitbox e hurtbox que mudam quadro a quadro, pontos de encaixe (Marker2D), eventos chamados pelo AnimationPlayer e direções
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
      // com os dois lados desenhados (três vistas), nada sai espelhado: a espada trocaria de mão
      const d = dirOf(a.name), m = d && MIRROR[d];
      if (!m || a.noMirror || (model.views && model.views.noMirror)) continue;
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
  // keys = [tempo, nome] ou [tempo, [nomes]]: um nome chama _weasel_evento(nome); vários, _weasel_eventos([nomes])
  function methodTrack(i, path, keys) {
    const call = (v) => {
      const names = Array.isArray(v) ? v : [v];
      return names.length > 1 ? `{\n"args": [[${names.map(sname).join(', ')}]],\n"method": &"_weasel_eventos"\n}` : `{\n"args": [${sname(names[0])}],\n"method": &"_weasel_evento"\n}`;
    };
    return [
      `tracks/${i}/type = "method"`, `tracks/${i}/imported = false`, `tracks/${i}/enabled = true`, `tracks/${i}/path = NodePath(${quote(path)})`,
      `tracks/${i}/interp = 1`, `tracks/${i}/loop_wrap = true`, `tracks/${i}/keys = {`,
      `"times": PackedFloat32Array(${keys.map((k) => num(k[0])).join(', ')}),`,
      `"transitions": PackedFloat32Array(${keys.map(() => '1').join(', ')}),`,
      `"values": [${keys.map((k) => call(k[1])).join(', ')}]`, '}',
    ];
  }
  // Os event de uma animação na faixa de métodos: uma key por quadro, com os nomes daquele quadro na ordem do
  // código. O Godot guarda uma key só por instante: duas no mesmo tempo, e a de antes some.
  function eventKeys(events, dt) {
    const by = new Map();
    for (const e of events) { if (!by.has(e.frame)) by.set(e.frame, []); by.get(e.frame).push(e.name); }
    return [...by.keys()].sort((p, q) => p - q).map((f) => [f * dt, by.get(f)]);
  }
  // velocidades do ajudante (anim feet=): quanto o personagem anda por segundo em cada animação para os pés no
  // chão não escorregarem, em px da cena (escala s); as espelhadas andam o mesmo. null sem nenhum feet=.
  const flo = (v) => { const t = num(v); return /[.e]/.test(t) ? t : `${t}.0`; };
  function speedsProp(model, anims, s) {
    const list = anims.map((p) => [p.name, S.gait(model, p.anim)]).filter(([, g]) => g && g.speed !== null);
    if (!list.length) return null;
    return `velocidades = {\n${list.map(([n, g]) => `${quote(n)}: ${flo(Math.round(Math.abs(g.speed) * s * 100) / 100)}`).join(',\n')}\n}`;
  }
  // fases do ajudante (anim feet=, só as em loop): onde fica o meio do apoio do primeiro pé, em fração do ciclo (0 a 1);
  // tocar(acao, dir, true) troca de animação com o pé no chão ainda no chão. null sem nenhuma (a cena fica como antes).
  function phasesProp(model, anims) {
    const list = anims.filter((p) => p.anim.loop).map((p) => [p.name, S.feetPhase(model, p.anim), p.anim.frames]).filter(([, v]) => v !== null);
    if (!list.length) return null;
    return `fases = {\n${list.map(([n, v, N]) => `${quote(n)}: ${flo(Math.round((v / N) * 10000) / 10000)}`).join(',\n')}\n}`;
  }
  // transições do ajudante (anim … from= to=): para cada animação de saída e de chegada, os quadros de onde as peças
  // partem e os nomes delas (no lado espelhado, o par espelhado); trocar() acha a peça certa. null sem nenhuma peça
  // (a cena fica como antes).
  const mirrorName = (n) => { const d = dirOf(n), m = d && MIRROR[d]; return m ? n.slice(0, -d.length) + m : n; };
  function transProp(model, anims) {
    const by = new Map();
    for (const p of anims) {
      const b = p.anim.blendOf;
      if (!b) continue;
      const from = p.flip ? mirrorName(b.from.name) : b.from.name, to = p.flip ? mirrorName(b.to.name) : b.to.name;
      if (!by.has(from)) by.set(from, new Map());
      const outs = by.get(from);
      if (!outs.has(to)) outs.set(to, []);
      outs.get(to).push([b.start, p.name]);
    }
    if (!by.size) return null;
    const pair = (to, list) => {
      list.sort((p, q) => p[0] - q[0]);
      return `${quote(to)}: {\n"quadros": [${list.map((x) => x[0]).join(', ')}],\n"pecas": [${list.map((x) => quote(x[1])).join(', ')}]\n}`;
    };
    return `transicoes = {\n${[...by].map(([from, outs]) => `${quote(from)}: {\n${[...outs].map(([to, list]) => pair(to, list)).join(',\n')}\n}`).join(',\n')}\n}`;
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
    // pontos de encaixe: Marker2D com o nome do ponto (o eixo x do marcador aponta para onde o osso aponta)
    const points = [...model.points.values()];
    for (const p of points) {
      let n = p.name;
      while (reserved.has(n) || used.has(n)) n += '_ponto';
      used.add(n);
      p.node = n;
    }
    const pointAt = (pose, p, flip) => {
      const st = S.pointState(model, pose, p);
      const q = T(st.x, st.y);
      let rot = st.rot;
      // no lado espelhado, a direção também espelha
      if (flip) { q[0] = -q[0]; rot = 180 - rot; }
      return { pos: vec(q), rot: num((rot * Math.PI) / 180) };
    };
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
    const restP = points.map((pt) => pointAt(restPose, pt, false));
    const perAnimP = [];
    const perAnim = anims.map((p) => {
      const rows = [], prow = [];
      for (let f = 0; f < p.anim.frames; f++) {
        const pose = S.makePose(model, p.anim.name, f);
        rows.push(boxes.map((b) => boxAt(pose, b, p.flip)));
        prow.push(points.map((pt) => pointAt(pose, pt, p.flip)));
      }
      perAnimP.push(prow);
      return rows;
    });
    points.forEach((pt, k) => { pt.movePos = perAnimP.some((rows) => rows.some((row) => row[k].pos !== restP[k].pos || row[k].rot !== restP[k].rot)); });
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
        points.forEach((pt, k) => {
          if (pt.movePos) { add((i) => valueTrack(i, `${pt.node}:position`, [[0, restP[k].pos]])); add((i) => valueTrack(i, `${pt.node}:rotation`, [[0, restP[k].rot]])); }
        });
      });
    }
    anims.forEach((p, n) => {
      const a = p.anim, dt = 1 / a.fps, rows = perAnim[n];
      // uma peça de transição pode tocar de trás para a frente (trocar()): o Godot só põe o valor de uma pista
      // discreta quando passa pela key, então cada pista ganha uma key logo antes do fim (a do fim exato ele
      // pula), com o valor do último quadro
      const vt = (i, path, keys) => valueTrack(i, path, a.blendOf && keys.length ? keys.concat([[a.frames * dt - 0.0001, keys[keys.length - 1][1]]]) : keys);
      animBlock(`Animation_${n}`, p.name, a.frames * dt, a.loop, dt, (add) => {
        add((i) => vt(i, 'Sprite:animation', [[0, sname(a.name)]]));
        add((i) => vt(i, 'Sprite:frame', rows.map((_, f) => [f * dt, String(f)])));
        if (flips) { add((i) => vt(i, 'Sprite:flip_h', [[0, p.flip ? 'true' : 'false']])); add((i) => vt(i, 'Sprite:offset', [[0, vec(p.flip ? offFlip : off)]])); }
        boxes.forEach((b, k) => {
          if (b.movePos) {
            add((i) => vt(i, `${b.path}:position`, changes(rows.map((row) => row[k].pos), dt)));
            add((i) => vt(i, `${b.path}:rotation`, changes(rows.map((row) => row[k].rot), dt)));
          }
          if (b.moveOn) add((i) => vt(i, `${b.path}:disabled`, changes(rows.map((row) => row[k].off), dt)));
        });
        points.forEach((pt, k) => {
          if (!pt.movePos) return;
          const prow = perAnimP[n];
          add((i) => vt(i, `${pt.node}:position`, changes(prow.map((row) => row[k].pos), dt)));
          add((i) => vt(i, `${pt.node}:rotation`, changes(prow.map((row) => row[k].rot), dt)));
        });
        if (a.events.length) add((i) => methodTrack(i, 'AnimationPlayer', eventKeys(a.events, dt)));
      });
    });
    blocks.push(['[sub_resource type="AnimationLibrary" id="AnimationLibrary_weasel"]', '_data = {', animIds.map(([name, id]) => `${sname(name)}: SubResource("${id}")`).join(',\n'), '}'].join('\n'));

    // nós
    const rootName = o.name || (model.godot && model.godot.name) || 'Personagem';
    const nodes = [`[node name="${rootName}" type="${ROOT_TYPES[bodyType]}"]`];
    const sprite = [`[node name="Sprite" type="AnimatedSprite2D" parent="."]`, 'sprite_frames = ExtResource("1_frames")'];
    sprite.push(`animation = ${sname(first ? first.anim.name : 'default')}`, 'centered = false', `offset = ${vec(off)}`);
    // pixel art (art pixel): o Godot desenha sem suavizar (nearest), senão os pixels borram
    if (W.art && W.art.crisp(model)) sprite.push('texture_filter = 1');
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
    points.forEach((pt, k) => {
      const lines = [`[node name="${pt.node}" type="Marker2D" parent="."]`, `position = ${restP[k].pos}`];
      if (restP[k].rot !== '0') lines.push(`rotation = ${restP[k].rot}`);
      nodes.push(lines.join('\n'));
    });
    const player = [`[node name="AnimationPlayer" type="AnimationPlayer" parent="."]`, 'libraries = {\n&"": SubResource("AnimationLibrary_weasel")\n}'];
    if (first) player.push(`autoplay = ${sname(first.name)}`);
    player.push('script = ExtResource("2_script")');
    const speeds = speedsProp(model, anims, s);
    if (speeds) player.push(speeds);
    const phases = phasesProp(model, anims);
    if (phases) player.push(phases);
    const trans = transProp(model, anims);
    if (trans) player.push(trans);
    nodes.push(player.join('\n'));

    return [`[gd_scene load_steps=${blocks.length + 3} format=3]`, ext.join('\n'), ...blocks, ...nodes].join('\n\n') + '\n';
  }

  // Ajudante do AnimationPlayer (o mesmo para todos os personagens).
  const SCRIPT = `# Weasel — ajudante do AnimationPlayer das cenas exportadas pelo Weasel.
# Toca as animações pelo nome e pela direção (top-down), troca de animação na mesma fase da passada,
# troca com as transições geradas (trocar()), diz quantos quadros e o fps de cada animação, mostra um
# quadro parado e avisa os eventos (event).
# É o mesmo arquivo para todos os personagens; pode copiar e mudar à vontade.
extends AnimationPlayer

## Emitido em cada event das animações (passo, golpe, pouso...).
signal evento(nome: StringName)

const DIRECOES_4: Array[String] = ["_right", "_down", "_left", "_up"]
const DIRECOES_8: Array[String] = ["_right", "_down_right", "_down", "_down_left", "_left", "_up_left", "_up", "_up_right"]

## A última direção pedida a tocar(); vale quando a direção passada é zero (personagem parado).
var direcao := Vector2.DOWN

## Quantos pixels por segundo o personagem anda em cada animação com feet= para os pés no chão não
## escorregarem (o Weasel mede nos quadros). Vazio quando nenhuma animação tem feet=.
@export var velocidades: Dictionary = {}

## Onde fica o meio do apoio do primeiro pé (feet=) em cada animação em loop, em fração do ciclo (0 a 1).
## tocar(acao, dir, true) usa para trocar de animação com o pé no chão ainda no chão. Vazio sem feet=.
@export var fases: Dictionary = {}

## As transições geradas (anim … from= to=): para cada animação de saída e de chegada, os quadros de onde
## as peças partem e os nomes delas. trocar() acha a peça certa. Vazio sem transições.
@export var transicoes: Dictionary = {}

var _peca: StringName = &""
var _destino: StringName = &""
var _destino_tempo := 0.0


## Toca "acao" virada para a direção: tocar("walk", velocity) escolhe walk_down, walk_up, walk_right
## ou walk_left (e as diagonais, se houver). Sem animações com direção, toca "acao" mesmo.
## Só recomeça a animação quando ela muda.
## Com mesma_fase = true, a troca entre duas animações em loop continua no mesmo ponto da passada, em vez
## de recomeçar do quadro 0: tocar("trote", velocity, true). Com feet= nas duas, o pé que está no chão
## continua no chão; sem feet=, 40% do ciclo de uma vira 40% da outra.
func tocar(acao: String, dir := Vector2.ZERO, mesma_fase := false) -> void:
	if dir.length_squared() > 0.0001:
		direcao = dir.normalized()
	var nome := nome_com_direcao(acao, direcao)
	if current_animation != nome or not is_playing():
		var tempo := -1.0
		if mesma_fase:
			tempo = _tempo_na_mesma_fase(nome)
		play(nome)
		if tempo >= 0.0:
			seek(tempo, true)


## O nome da animação de "acao" para a direção (ou "acao", se não houver versões com direção).
## Sem a versão para cima ou para baixo (um personagem só de lado, com _right e _left), olha para o lado
## para onde vai; reto para cima ou para baixo (ou parado), continua virado para o lado em que está.
func nome_com_direcao(acao: String, dir: Vector2) -> StringName:
	var angulo := rad_to_deg(dir.angle())
	if has_animation(acao + "_down_right") or has_animation(acao + "_up_right"):
		var oito := acao + DIRECOES_8[posmod(roundi(angulo / 45.0), 8)]
		if has_animation(oito):
			return StringName(oito)
	var quatro := acao + DIRECOES_4[posmod(roundi(angulo / 90.0), 4)]
	if has_animation(quatro):
		return StringName(quatro)
	if not has_animation(acao):
		# reto para cima ou para baixo: menos de 22,5 graus de inclinação (a fatia de cima nas oito direções)
		var reto := absf(dir.x) <= absf(dir.y) * 0.4142
		var esquerda := String(assigned_animation).ends_with("_left") if reto else dir.x < 0.0
		var lado := acao + ("_left" if esquerda else "_right")
		if has_animation(lado):
			return StringName(lado)
	return StringName(acao)


## A velocidade (px/s, na escala da cena) em que o personagem anda na animação "nome" sem os pés
## escorregarem: velocidade("trote") vale trote ou, sem ela, trote virado para a última direção (como
## tocar()); velocidade() é a da animação tocando agora. 0 se a animação não tem feet=.
## Para o passo acompanhar o jogo: speed_scale = absf(velocity.x) / velocidade()
func velocidade(nome := "") -> float:
	if nome == "":
		nome = String(current_animation)
	if not velocidades.has(nome):
		nome = String(nome_com_direcao(nome, direcao))
	return float(velocidades.get(nome, 0.0))


## Troca para "acao" sem corte seco: trocar("idle", velocity). Pode chamar a cada quadro, como o tocar():
## só começa uma troca quando a animação muda.
## - Com uma transição (anim … from= to=) da animação atual para a nova, toca a peça que parte do quadro
##   em que a atual está (arredondando para baixo) e, no fim dela, a nova, do começo.
## - Com a transição do caminho contrário (parar de correr, e agora voltar a correr), toca a peça de trás
##   para a frente, e a nova continua do quadro em que a peça termina.
## - Sem transição, entre dois loops a nova continua no mesmo ponto da passada (como tocar(acao, dir, true)).
##   Com esqueleto, mistura as duas em "mistura" segundos; por quadros, corta seco (a mistura do Godot
##   deixaria o sprite preso na animação de antes).
## Enquanto a peça toca, chame trocar(), não tocar(): o tocar() da mesma animação corta a peça.
func trocar(acao: String, dir := Vector2.ZERO, mistura := 0.2) -> void:
	if dir.length_squared() > 0.0001:
		direcao = dir.normalized()
	var para := nome_com_direcao(acao, direcao)
	if is_playing() and (current_animation == para or (_peca != &"" and current_animation == _peca and _destino == para)):
		return
	var de := StringName(current_animation if is_playing() else assigned_animation)
	_peca = &""
	var ida := _pecas(de, para)
	if not ida.is_empty():
		var quadro := _quadro_atual(de)
		var inicios: Array = ida["quadros"]
		for i in range(inicios.size() - 1, -1, -1):
			if int(inicios[i]) <= quadro:
				_tocar_peca(ida["pecas"][i], para, 0.0, false)
				return
	var volta := _pecas(para, de)
	if not volta.is_empty() and get_animation(para).loop_mode != Animation.LOOP_NONE:
		# a peça termina perto do quadro seguinte ao de onde ela parte; "para" continua do outro
		var n := quadros(para)
		_tocar_peca(volta["pecas"][0], para, (posmod(int(volta["quadros"][0]) + 2, n) + 0.01) / fps(para), true)
		return
	var tempo := _tempo_na_mesma_fase(para)
	if mistura <= 0.0 or _por_quadros(para):
		play(para)
		if tempo >= 0.0:
			seek(tempo, true)
		return
	play(para, mistura)
	if tempo >= 0.0:
		seek(tempo, true)
	# o que troca de uma vez (o lado espelhado, as caixas, os pontos) não entra na mistura do Godot: vale
	# já no começo e é conferido de novo no fim
	_aplicar_discretas(para, maxf(tempo, 0.0))
	if is_inside_tree():
		get_tree().create_timer(mistura).timeout.connect(_depois_da_mistura.bind(para))


## Quantos quadros a animação tem: quadros("walk") (com a direção, como tocar()); quadros() é a que está
## tocando agora (ou parada em mostrar_quadro()). 0 se a animação não existe.
func quadros(acao := "") -> int:
	var a := _animacao(acao)
	if a == null:
		return 0
	return maxi(1, roundi(a.length * fps(acao)))


## A velocidade da animação em quadros por segundo (o fps= do Weasel): fps("walk"); fps() é a que está
## tocando agora. 0 se a animação não existe.
func fps(acao := "") -> float:
	var a := _animacao(acao)
	if a == null or a.step <= 0.0:
		return 0.0
	# a cena guarda o tempo de um quadro com 4 casas (1/24 vira 0.0417): vale o fps redondo que dá esse tempo
	var bruto := 1.0 / a.step
	for passo in [1.0, 0.5, 0.25, 0.1]:
		var redondo := snappedf(bruto, passo)
		if redondo > 0.0 and absf(snappedf(1.0 / redondo, 0.0001) - a.step) < 0.00001:
			return redondo
	return bruto


## Mostra a animação parada num quadro, que o jogo escolhe (uma barra que enche, um passo que o jogador
## controla...): mostrar_quadro("walk", 3, velocity). O quadro vai de 0 a quadros("walk") - 1. Para no
## meio do quadro, sem avisar os eventos. Depois, tocar() a mesma animação continua dali.
func mostrar_quadro(acao: String, quadro: int, dir := Vector2.ZERO) -> void:
	if dir.length_squared() > 0.0001:
		direcao = dir.normalized()
	var nome := String(nome_com_direcao(acao, direcao))
	var n := quadros(nome)
	if n <= 0:
		return
	play(nome, 0.0)
	seek((clampi(quadro, 0, n - 1) + 0.5) / fps(nome), true)
	pause()


## A Animation de "acao" (com a direção, como tocar()); "" é a que está tocando ou parada.
func _animacao(acao: String) -> Animation:
	var nome := acao
	if nome == "":
		nome = current_animation if current_animation != "" else assigned_animation
	if not has_animation(nome):
		nome = String(nome_com_direcao(nome, direcao))
	if not has_animation(nome):
		return null
	return get_animation(nome)


## As peças da transição de "de" para "para": {"quadros": [...], "pecas": [...]}, ou {} se não há.
func _pecas(de: StringName, para: StringName) -> Dictionary:
	var saidas: Dictionary = transicoes.get(String(de), {})
	return saidas.get(String(para), {})


## O quadro em que "nome" está (tocando, parada ou já terminada).
func _quadro_atual(nome: StringName) -> int:
	var n := quadros(nome)
	if n <= 0 or (current_animation != nome and assigned_animation != nome):
		return 0
	return clampi(floori(current_animation_position * fps(nome) + 0.0001), 0, n - 1)


func _tocar_peca(peca: String, destino: StringName, destino_tempo: float, ao_contrario: bool) -> void:
	_peca = StringName(peca)
	_destino = destino
	_destino_tempo = destino_tempo
	if not animation_finished.is_connected(_fim_da_peca):
		animation_finished.connect(_fim_da_peca)
	if ao_contrario:
		play_backwards(_peca, 0.0)
	else:
		play(_peca, 0.0)


func _fim_da_peca(nome: StringName) -> void:
	if _peca == &"" or nome != _peca:
		return
	_peca = &""
	play(_destino, 0.0)
	if _destino_tempo > 0.0:
		seek(_destino_tempo, true)


## A cena por quadros troca o sprite (a pista Sprite:animation); a com esqueleto, não.
func _por_quadros(nome: StringName) -> bool:
	var a := get_animation(nome)
	return a != null and a.find_track(^"Sprite:animation", Animation.TYPE_VALUE) >= 0


## Põe nos nós os valores que trocam de uma vez (pistas discretas) de "nome" no tempo dado.
func _aplicar_discretas(nome: StringName, tempo: float) -> void:
	var a := get_animation(nome)
	var raiz := get_node_or_null(root_node)
	if a == null or raiz == null:
		return
	for i in a.get_track_count():
		if a.track_get_type(i) != Animation.TYPE_VALUE or a.value_track_get_update_mode(i) != Animation.UPDATE_DISCRETE:
			continue
		var k := a.track_find_key(i, tempo)
		if k < 0:
			continue
		var caminho := a.track_get_path(i)
		var no := raiz.get_node_or_null(NodePath(caminho.get_concatenated_names()))
		if no != null:
			no.set_indexed(NodePath(caminho.get_concatenated_subnames()), a.track_get_key_value(i, k))


func _depois_da_mistura(nome: StringName) -> void:
	if assigned_animation == nome:
		seek(current_animation_position, true)


## Onde "para" continua a passada da animação que está tocando (em segundos), ou -1 se não dá: nada
## tocando, ou uma das duas não é loop.
func _tempo_na_mesma_fase(para: StringName) -> float:
	var de := current_animation
	if not is_playing() or de == "" or not has_animation(de) or not has_animation(para):
		return -1.0
	var a := get_animation(de)
	var b := get_animation(para)
	if a.loop_mode == Animation.LOOP_NONE or b.loop_mode == Animation.LOOP_NONE or a.length <= 0.0:
		return -1.0
	var fase := current_animation_position / a.length
	if fases.has(de) and fases.has(String(para)):
		fase += float(fases[String(para)]) - float(fases[de])
	return fposmod(fase, 1.0) * b.length


func _weasel_evento(nome: StringName) -> void:
	evento.emit(nome)


## Vários event no mesmo quadro (event 8 pata_e pata_d): avisa um de cada vez, na ordem do código.
func _weasel_eventos(nomes: Array) -> void:
	for nome in nomes:
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
    // iso: o bloco do mapa é um losango 2:1 (largura × metade) na parte de baixo da célula; o que sobra em cima
    // (a altura das caixas e paredes) aparece acima dele no mapa
    const dh = T.iso ? Math.round(tw / 2) : th, oy = T.iso ? Math.round((th - dh) / 2) : 0;
    const pose = S.makePose(model, null, 0);
    const tiles = tileList(model, o.atlas, s);
    const tex = o.normalPath ? 'SubResource("CanvasTexture_tiles")' : 'ExtResource("1_tiles")';
    const out = ['[gd_resource type="TileSet" format=3]', '', `[ext_resource type="Texture2D" path="${o.imagePath}" id="1_tiles"]`];
    if (o.normalPath) out.push(`[ext_resource type="Texture2D" path="${o.normalPath}" id="2_normal"]`, '', '[sub_resource type="CanvasTexture" id="CanvasTexture_tiles"]', 'diffuse_texture = ExtResource("1_tiles")', 'normal_texture = ExtResource("2_normal")');
    out.push('', '[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_tiles"]', `texture = ${tex}`, `texture_region_size = Vector2i(${tw}, ${th})`);
    for (const t of tiles) {
      const key = `${t.col}:${t.row}/0`;
      out.push(`${key} = 0`);
      const cx = (t.col + 0.5) * T.size[0], cy = (t.row + 0.5) * T.size[1] + oy / s;
      let poly = null;
      if (t.collision) {
        const flat = S.flatOf(S.geometry(model, pose, t.collision));
        let pts = [];
        for (let i = 0; i < flat.length; i += 2) pts.push([(flat[i] - cx) * s, (flat[i + 1] - cy) * s]);
        if (pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.01) pts.pop();
        pts = dropCollinear(simplify(pts, 0.6), 0.6);
        if (pts.length >= 3) poly = pts;
      } else if (t.solid) poly = T.iso ? [[0, -dh / 2], [tw / 2, 0], [0, dh / 2], [-tw / 2, 0]] : [[-tw / 2, -th / 2], [tw / 2, -th / 2], [tw / 2, th / 2], [-tw / 2, th / 2]];
      if (oy) out.push(`${key}/texture_origin = Vector2i(0, ${oy})`);
      if (poly) {
        out.push(`${key}/physics_layer_0/polygon_0/points = PackedVector2Array(${poly.map((p) => `${num(p[0])}, ${num(p[1])}`).join(', ')})`);
        if (t.oneway) out.push(`${key}/physics_layer_0/polygon_0/one_way = true`);
      }
      out.push(`${key}/custom_data_0 = ${quote(t.name)}`);
    }
    out.push('', '[resource]', ...(T.iso ? ['tile_shape = 1', 'tile_layout = 5'] : []), `tile_size = Vector2i(${tw}, ${dh})`, 'physics_layer_0/collision_layer = 1', 'custom_data_layer_0/name = "nome"', 'custom_data_layer_0/type = 4', 'sources/0 = SubResource("TileSetAtlasSource_tiles")', '');
    return { text: out.join('\n'), tiles };
  }

  // ---------- pacote ----------
  // Arquivos para o Godot: [{ name, canvas } | { name, text }]. o = { base, scale, normal, mirror, padding, layout, cols, margin }
  function packageFiles(model, o) {
    const X = W.exporter, base = o.base, files = [];
    const strength = model.godot ? model.godot.normal : 1;
    if (model.tileset) {
      const T = model.tileset;
      // art pixel … small: o atlas sai com 1 pixel por bloco
      if (W.art && W.art.small(model)) o = Object.assign({}, o, { scale: W.art.smallScale(model, o.scale) });
      if (Math.abs(T.size[0] * o.scale - Math.round(T.size[0] * o.scale)) > 1e-6 || Math.abs(T.size[1] * o.scale - Math.round(T.size[1] * o.scale)) > 1e-6) {
        throw new Error(`com escala ${o.scale} o bloco de ${T.size[0]}×${T.size[1]} não fica com tamanho inteiro`);
      }
      const rect = { x: 0, y: 0, w: T.cols * T.size[0], h: T.rows * T.size[1] };
      const atlas = S.renderImage(model, S.makePose(model, null, 0), { scale: o.scale, rect, transparent: true, screen: false });
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
    // o.progress(fase, i, n): a barra da janela de exportar
    const r = X.sheetCanvas(model, names, { scale: o.scale, transparent: true, trim: o.trim !== false, margin: o.margin !== undefined ? o.margin : 8, layout: o.layout || 'grid', cols: o.cols || 0, padding: o.padding !== undefined ? o.padding : 2, imageName: `${base}.png`, progress: o.progress });
    files.push({ name: `${base}.png`, canvas: r.canvas });
    let normalPath = null;
    if (o.normal) { normalPath = `${base}_normal.png`; files.push({ name: normalPath, canvas: W.normal.sheet(model, r, { strength, progress: o.progress }) }); }
    files.push({ name: `${base}.tres`, text: spriteFramesText(model, r, `${base}.png`, normalPath) });
    if (o.scene !== false) {
      files.push({ name: `${base}.tscn`, text: sceneText(model, r, { framesPath: `${base}.tres`, scriptPath: 'weasel_anim.gd', name: o.name || (model.godot && model.godot.name) || pascal(base), mirror: o.mirror }) });
      files.push({ name: 'weasel_anim.gd', text: SCRIPT });
    }
    const mirrored = o.scene === false ? [] : playerAnims(model, o.mirror !== false).filter((p) => p.flip && names.includes(p.anim.name)).map((p) => p.name);
    return { files, kind: 'scene', sheet: r, mirrored, boxes: boxList(model).length, points: model.points.size };
  }

  W.godot = { spriteFramesText, sceneText, tilesetText, packageFiles, playerAnims, rootOf, boxList, SCRIPT, dirOf, ROOT_TYPES, pascal, methodTrack, eventKeys, changes, speedsProp, phasesProp, transProp };
})(window.Weasel = window.Weasel || {});
