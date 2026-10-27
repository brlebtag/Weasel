#!/usr/bin/env node
/* Weasel — linha de comando: lê o código (arquivo, texto ou stdin) e exporta igual ao editor web. */
'use strict';
const fs = require('fs');
const path = require('path');

const { W } = require('./runtime');
const X = W.exporter;
const V = require('./video');
const { makeMediaResolver } = require('./media');
const VERSION = require(path.join(__dirname, '..', 'package.json')).version;

const HELP = `weasel ${VERSION} — desenho por código na linha de comando

Uso:
  weasel <arquivo.weasel> [opções]
  weasel -e "<código>" [opções]
  weasel - [opções]                 (lê o código da entrada padrão)

Entrada:
  -e, --eval <código>     código direto no comando; ";" ou "\\n" separam as linhas
                          (include procura arquivos a partir do arquivo de entrada,
                          ou da pasta atual com -e e stdin)

Saída:
  -o, --out <arquivo>     arquivo de saída; a extensão escolhe o formato
                          (.png .jpg .gif .svg .tres .tscn; .zip = sprite sheet em zip;
                          filme: .mp4 .mov .webm .mkv)
  -f, --format <tipo>     png | jpg | gif | svg | sheet | godot | tscn | build (GIF da pintura)
                          | mp4 | mov | webm | mkv (filme)
  -a, --anim <nome>       animação usada (gif, sheet, godot, png/jpg/svg). Em sheet, "all" = todas
      --frame <n>         quadro do png/jpg/svg (o mesmo número usado em key; começa em 0)
      --frames            png/jpg/svg: salva todos os quadros, um arquivo por quadro
      --variant <nome>    variante de cores; "all" exporta todas (sufixo _variante)
  -s, --scale <n>         escala (padrão 1; ex.: 0.5, 2)
  -t, --transparent       fundo transparente (png, gif, svg, sheet, godot)
      --trim [margem]     recorta ao desenho (margem padrão 8)
  -q, --quality <1-100>   qualidade do jpg (padrão 92)
      --layout <grid|rows>  sprite sheet em grade ou uma linha por animação
      --cols <n>          colunas da grade (0 = automático)
      --padding <n>       espaço entre quadros da sprite sheet (padrão 2)
      --speed <n>         velocidade da pintura no GIF "build" (padrão 1)
      --dither            GIF com pontilhado (menos faixas em brilhos e degradês)
      --guides            inclui as camadas "guide"

Godot:
  -o personagem.tscn      pacote pronto: folha, normal map, SpriteFrames (.tres), cena (.tscn)
                          com colisão, hitbox/hurtbox por quadro e eventos, e weasel_anim.gd
  -f godot                só a folha e o SpriteFrames (.tres); num arquivo com tileset, o TileSet
      --normal            gera o normal map também no -f godot (no .tscn já vem)
      --no-normal         .tscn sem normal map
      --no-mirror         .tscn sem gerar o lado espelhado (walk_right → walk_left)

Filme (arquivo com a linha film):
  -o filme.mp4            vídeo H.264 (padrão); .mov = ProRes (bom para editar; com -t,
                          ProRes 4444 com transparência); .webm = VP9; precisa do ffmpeg
      --frames            sequência de imagens (filme_00000.png …), numeradas pelo quadro
      --shot <nome>       só um plano (shot); --shots: um arquivo por plano
      --from <t> --to <t> só um trecho (2s, 48f, 1m30s ou 00:01:12 = min:seg:quadro)
      --time <t>          png/jpg: o quadro nesse tempo (--frame <n> também vale)
  -j, --jobs <n>          threads de render (padrão: núcleos − 1, até 8)
      --crf <n>           qualidade do mp4/webm (menor = melhor; padrão 18 no mp4, 30 no webm)
      --ffmpeg <caminho>  onde está o ffmpeg (ou a variável WEASEL_FFMPEG)
  -o mix.wav              só o som do filme (os audio misturados), para o editor de vídeo
      --edl --fcpxml      junto com o vídeo, a linha do tempo para o editor de vídeo (DaVinci
                          Resolve, Final Cut, Premiere): o vídeo (ou um por plano, com --shots)
                          e cada som numa trilha; o vídeo sai sem o som misturado
  -o filme.fcpxml|.edl    só a linha do tempo, para vídeos já renderizados com o mesmo nome
      --ext <mp4|mov|…>   extensão desses vídeos (padrão mp4)
      --no-audio          vídeo sem o som de referência (por padrão os audio vão misturados)
      --subs <srt|vtt|none>  legendas ao lado do vídeo (padrão srt: filme.srt, filme.en.srt…)
      --burn-subs         legendas desenhadas na imagem (ou film subs=burn)
      --lang <código>     língua das legendas desenhadas (padrão: a do film lang=)

Outros:
  -w, --watch             exporta de novo sempre que o arquivo (ou um include) mudar
      --check             só verifica o código e mostra erros
      --info              mostra canvas, camadas, componentes, ossos, animações e eventos
      --force             exporta mesmo com erros (ignora as linhas inválidas, como o editor)
      --quiet             não escreve nada além dos erros
  -h, --help              esta ajuda
  -v, --version           versão

Exemplos:
  weasel cavaleiro.weasel                        -> cavaleiro.png
  weasel cavaleiro.weasel -o out/jump.gif -a jump --trim
  weasel cavaleiro.weasel -f sheet -a all -s 0.5 --trim -t   -> PNG + JSON
  weasel coruja.weasel -f godot -a all --trim -t -o godot/coruja.tres
  weasel coruja.weasel -o coruja.svg --variant all
  weasel cavaleiro.weasel -f build -o pintura.gif
  weasel furao.weasel -o godot/furao.tscn -s 0.5
  weasel blocos.weasel -f godot -o godot/blocos.tres --normal
  weasel coruja.weasel -a pia -o coruja.gif --watch
  weasel -e "canvas 200 200; ellipse sol 100,100 60 c=#ffb000" -o sol.png
  weasel filme.weasel -o filme.mp4
  weasel filme.weasel -o render/filme.mov --shots -s 0.5
  weasel filme.weasel --frames -o quadros/q.png --from 10s --to 20s
  weasel filme.weasel -o capa.png --time 4s
  weasel filme.weasel -o revisao.mp4 --burn-subs -s 0.5
  weasel filme.weasel -o render/filme.mov --shots --fcpxml --edl
`;

const tty = process.stderr.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);

class Fail extends Error { constructor(msg, code) { super(msg); this.code = code; } }
const usage = (msg) => { throw new Fail(msg, 2); };

function parseArgs(argv) {
  const o = {
    input: null, code: null, out: null, format: null, anim: null, frame: 0, frameSet: false, frames: false, variant: null, scale: 1, transparent: false, trim: false, margin: 8, quality: 92,
    layout: 'grid', cols: 0, padding: 2, speed: 1, dither: false, guides: false, watch: false, check: false, info: false, force: false, quiet: false,
    time: null, shot: null, shots: false, from: null, to: null, jobs: null, crf: null, ffmpeg: null,
    normal: null, mirror: true, audio: true, subs: 'srt', burnSubs: false, lang: null, edl: false, fcpxml: false, ext: 'mp4',
  };
  const num = (name, v, min, max) => {
    const n = Number(v);
    if (v === undefined || v === '' || !Number.isFinite(n)) usage(`${name} precisa de um número`);
    if (n < min || n > max) usage(`${name} deve ficar entre ${min} e ${max}`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i], inline;
    if (a.startsWith('--') && a.includes('=')) { inline = a.slice(a.indexOf('=') + 1); a = a.slice(0, a.indexOf('=')); }
    const val = () => {
      if (inline !== undefined) return inline;
      if (i + 1 >= argv.length) usage(`falta o valor de ${a}`);
      return argv[++i];
    };
    switch (a) {
      case '-h': case '--help': process.stdout.write(HELP); process.exit(0); break;
      case '-v': case '--version': console.log(VERSION); process.exit(0); break;
      case '-e': case '--eval': o.code = val(); break;
      case '-o': case '--out': o.out = val(); break;
      case '-f': case '--format': o.format = val().toLowerCase(); break;
      case '-a': case '--anim': o.anim = val(); break;
      case '--frame': o.frame = Math.round(num('--frame', val(), 0, 10000000)); o.frameSet = true; break;
      case '--time': o.time = val(); break;
      case '--shot': o.shot = val(); break;
      case '--shots': o.shots = true; break;
      case '--from': o.from = val(); break;
      case '--to': o.to = val(); break;
      case '-j': case '--jobs': o.jobs = Math.round(num('--jobs', val(), 1, 64)); break;
      case '--crf': o.crf = Math.round(num('--crf', val(), 0, 63)); break;
      case '--ffmpeg': o.ffmpeg = val(); break;
      case '--normal': o.normal = true; break;
      case '--no-normal': o.normal = false; break;
      case '--no-mirror': o.mirror = false; break;
      case '--no-audio': o.audio = false; break;
      case '--subs': o.subs = val(); if (!['srt', 'vtt', 'none'].includes(o.subs)) usage('--subs aceita srt, vtt ou none'); break;
      case '--burn-subs': o.burnSubs = true; break;
      case '--lang': o.lang = val(); break;
      case '--edl': o.edl = true; break;
      case '--fcpxml': o.fcpxml = true; break;
      case '--ext': o.ext = val().replace(/^\./, ''); break;
      case '--frames': o.frames = true; break;
      case '--variant': o.variant = val(); break;
      case '-s': case '--scale': o.scale = num('--scale', val(), 0.05, 16); break;
      case '-t': case '--transparent': o.transparent = true; break;
      case '--trim':
        o.trim = true;
        if (inline !== undefined) o.margin = Math.round(num('--trim', inline, 0, 1000));
        else if (i + 1 < argv.length && /^\d+$/.test(argv[i + 1])) o.margin = Number(argv[++i]);
        break;
      case '-q': case '--quality': o.quality = Math.round(num('--quality', val(), 1, 100)); break;
      case '--layout': o.layout = val(); if (!['grid', 'rows'].includes(o.layout)) usage('--layout aceita grid ou rows'); break;
      case '--cols': o.cols = Math.round(num('--cols', val(), 0, 1000)); break;
      case '--padding': o.padding = Math.round(num('--padding', val(), 0, 1000)); break;
      case '--speed': o.speed = num('--speed', val(), 0.05, 20); break;
      case '--dither': o.dither = true; break;
      case '--guides': o.guides = true; break;
      case '-w': case '--watch': o.watch = true; break;
      case '--check': o.check = true; break;
      case '--info': o.info = true; break;
      case '--force': o.force = true; break;
      case '--quiet': o.quiet = true; break;
      default:
        if (a === '-' || !a.startsWith('-')) {
          if (o.input) usage(`só um arquivo de entrada por vez ("${o.input}" e "${a}")`);
          o.input = a;
        } else usage(`opção desconhecida "${a}"`);
    }
  }
  if (o.code !== null && o.input) usage('use um arquivo OU -e, não os dois');
  if (o.code === null && !o.input && !process.stdin.isTTY) o.input = '-';
  if (o.code === null && !o.input) { process.stdout.write(HELP); process.exit(2); }
  if (o.watch && (o.code !== null || o.input === '-')) usage('--watch precisa de um arquivo de entrada');
  return o;
}

let stdinCache = null;
function readSource(o) {
  if (o.code !== null) return { src: o.code.replace(/\\n/g, '\n').replace(/;/g, '\n'), name: '<-e>', base: 'desenho', dir: process.cwd() };
  if (o.input === '-') {
    if (stdinCache === null) stdinCache = fs.readFileSync(0, 'utf8');
    return { src: stdinCache, name: '<stdin>', base: 'desenho', dir: process.cwd() };
  }
  let src;
  try { src = fs.readFileSync(o.input, 'utf8'); } catch (e) { throw new Fail(`não consegui ler "${o.input}" (${e.code || e.message})`, 2); }
  return { src: src.replace(/^﻿/, ''), name: o.input, base: path.basename(o.input).replace(/\.[^.]+$/, '') || 'desenho', dir: path.dirname(path.resolve(o.input)) };
}

// include: caminho relativo ao arquivo que inclui
function makeResolver(source, watched) {
  const dirs = new Map([[path.basename(source.name), source.dir]]);
  const resolve = (name, from) => {
    const p = path.resolve(dirs.get(from) || source.dir, name);
    try {
      const t = fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
      dirs.set(name, path.dirname(p));
      watched.add(p);
      return t;
    } catch (e) {
      return null;
    }
  };
  // sons (audio): relativos ao arquivo que os usa, como os includes
  resolve.media = makeMediaResolver((from) => dirs.get(from) || source.dir, (p) => watched.add(p));
  return resolve;
}

function report(model, src, name) {
  const lines = src.split(/\r?\n/);
  for (const e of model.errors) {
    const kind = e.level === 'error' ? paint('31;1', 'erro') : paint('33;1', 'aviso');
    console.error(`${name}:${e.line + 1}:${e.from + 1}: ${kind}: ${e.msg}`);
    const n = String(e.line + 1);
    console.error(paint('2', `  ${n} | `) + (lines[e.line] || ''));
    console.error(paint('2', `  ${' '.repeat(n.length)} | `) + ' '.repeat(e.from) + paint(e.level === 'error' ? '31' : '33', '^'.repeat(Math.max(1, e.to - e.from))));
  }
}

function info(m) {
  if (m.film) { console.log(V.filmInfo(m)); return; }
  const c = m.canvas;
  const bg = !c.bg ? 'transparente' : typeof c.bg === 'string' ? c.bg : `gradiente ${c.bg.name}`;
  const out = [];
  out.push(`canvas   ${c.w} × ${c.h}, fundo ${bg}${m.finish.style !== 'game' ? `, acabamento ${m.finish.style}` : ''}${m.finish.pixel > 1 ? `, pixel ${m.finish.pixel}` : ''}`);
  if (m.files.length) out.push(`include  ${m.files.join(', ')}`);
  if (m.vars.size) out.push(`let      ${[...m.vars].map(([k, v]) => `${k}=${Math.round(v * 1000) / 1000}`).join(' ')}`);
  if (m.gradients.size) out.push(`gradientes ${[...m.gradients.values()].map((g) => `${g.name} (${g.type}${g.box ? ', box' : ''})`).join(', ')}`);
  if (m.variants.length) out.push(`variantes ${m.variants.join(', ')}`);
  if (m.patterns.size) out.push(`padrões  ${[...m.patterns.values()].map((p) => `${p.name} (${p.type}${p.cross ? ', cross' : ''})`).join(', ')}`);
  if (m.defs.size) out.push(`componentes ${[...m.defs.values()].map((d) => `${d.name} (${d.uses}×)`).join(', ')}`);
  if (m.ambient) out.push(`ambiente ${m.ambient.c} × ${m.ambient.power}`);
  if (m.lights.size) out.push(`luzes    ${[...m.lights.values()].map((l) => `${l.name} (${l.type}, ${l.c} × ${l.power}${l.bone ? `, osso ${l.bone}` : ''}${l.flicker ? ', tremula' : ''})`).join(', ')}`);
  const fin = Object.entries({ bloom: m.finish.bloom, vignette: m.finish.vignette, grain: m.finish.grain, posterize: m.finish.posterize }).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`);
  if (fin.length) out.push(`acabamento ${fin.join(' ')}`);
  out.push(`camadas  ${m.layers.length}`);
  for (const L of m.layers) {
    const fx = L.fx ? Object.keys(L.fx).filter((k) => !['glowc', 'glows', 'tintc'].includes(k)) : [];
    const flags = [L.guide && 'guide', L.hidden && 'hidden', L.unlit && 'unlit', L.clip && `clip=${L.clip}`, L.cut && `cut=${L.cut}`, L.only && `only=${L.only.join(',')}`,
      fx.length && `efeitos: ${fx.join(',')}`, L.trail && 'trail', L.cast && 'cast', L.rim && 'rim'].filter(Boolean).join(' ');
    out.push(`  ${L.name.padEnd(14)} ${String(L.items.length).padStart(3)} item(ns)${flags ? '  ' + flags : ''}`);
  }
  out.push(`formas   ${m.elements.length}${m.elements.some((e) => e.hidden) ? ` (${m.elements.filter((e) => e.hidden).length} ocultas)` : ''}`);
  const em = m.elements.filter((e) => e.type === 'emitter');
  if (em.length) out.push(`partículas ${em.map((e) => `${e.name || '?'} (${e.pshape}${e.rate ? `, ${e.rate}/s` : ''}${e.burst ? `, rajada ${e.burst}` : ''})`).join(', ')}`);
  if (m.bones.size) {
    out.push(`ossos    ${[...m.bones.values()].map((b) => {
      const extra = [b.sway && 'sway', b.bob && 'bob', b.jitter && 'jitter', b.spring && 'spring'].filter(Boolean);
      return (b.parent ? `${b.name}←${b.parent}` : b.name) + (extra.length ? ` (${extra.join(',')})` : '');
    }).join(', ')}`);
  }
  if (m.cloths.size) out.push(`tecidos  ${[...m.cloths.keys()].join(', ')}`);
  if (m.anims.length) {
    out.push(`animações ${m.anims.length}`);
    for (const a of m.anims) {
      out.push(`  ${a.name.padEnd(14)} ${a.frames} quadros, ${a.fps} fps${a.loop ? '' : ', once'}${a.ptracks.size ? `, anima ${[...a.ptracks.keys()].join(' ')}` : ''}`);
      if (a.events.length) out.push(`  ${''.padEnd(14)} eventos: ${a.events.map((e) => `${e.name}@${e.frame}`).join(', ')}`);
    }
  } else out.push('animações nenhuma');
  if (m.unity) out.push(`unity    ${m.unity.unit} px/unidade, raiz ${m.unity.root.join(',')}`);
  if (m.mouth) out.push(`boca     ${m.mouth.name} (lip sync: ${Object.entries(m.mouth.map).map(([k, v]) => `${k}=${v.shape}${v.t < 1 ? '@' + v.t : ''}`).join(' ')})`);
  if (m.godot) out.push(`godot    ${m.godot.body}${m.godot.root ? `, raiz ${m.godot.root.join(',')}` : ''}${m.godot.name ? `, nó ${m.godot.name}` : ''}${m.godot.normal !== 1 ? `, normal ${m.godot.normal}` : ''}`);
  if (m.boxes.size) {
    out.push(`caixas   ${m.boxes.size}`);
    for (const b of m.boxes.values()) out.push(`  ${b.name.padEnd(14)} ${b.kind} ${b.shape}${b.bone ? ` osso ${b.bone}` : ''}${b.only ? ` só em ${b.only.join(',')}` : ''}${b.on ? '' : ' (começa desligada)'}`);
  }
  if (m.tileset) {
    const T = m.tileset;
    out.push(`tileset  blocos de ${T.size.join('×')}, ${T.cols} × ${T.rows} células${T.auto ? ', auto' : ''}`);
    for (const t of T.tiles) out.push(`  ${t.name.padEnd(14)} ${t.col},${t.row}${t.collision ? ` colisão ${t.collision.name}` : t.solid ? ' sólido' : ''}${t.oneway ? ' só por cima' : ''}`);
  }
  console.log(out.join('\n'));
}

function formatFromOut(out) {
  const ext = path.extname(out || '').toLowerCase();
  return { '.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg', '.gif': 'gif', '.svg': 'svg', '.tres': 'godot', '.tscn': 'tscn', '.zip': 'sheet', '.json': 'sheet', '.mp4': 'mp4', '.mov': 'mov', '.webm': 'webm', '.mkv': 'mkv', '.wav': 'wav', '.edl': 'edl', '.fcpxml': 'fcpxml' }[ext] || null;
}

function save(file, buf, what, quiet) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, buf);
  if (!quiet) console.log(`${paint('32', 'salvo')} ${file}  ${paint('2', `${what} · ${kb(buf.length)}`)}`);
}
const kb = (n) => (n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const withSuffix = (file, suffix) => file.replace(/(\.[^./\\]+)?$/, (ext) => suffix + (ext || ''));

function pickAnim(m, name, required) {
  if (!name) {
    if (!required) return null;
    if (!m.anims.length) usage('o desenho não tem animações (anim/key); para o GIF da pintura use -f build');
    return m.anims[0].name;
  }
  if (!m.animMap.has(name)) usage(`animação "${name}" não existe${m.anims.length ? ` (tem: ${m.anims.map((a) => a.name).join(', ')})` : ''}`);
  return name;
}

// Exporta um modelo (uma variante). sfx vai no fim do nome dos arquivos.
async function exportModel(model, o, format, base, sfx) {
  const opts = { scale: o.scale, transparent: o.transparent && format !== 'jpg', trim: o.trim, margin: o.margin, quality: o.quality / 100, layout: o.layout, cols: o.cols, padding: o.padding, speed: o.speed, dither: o.dither, guides: o.guides, format };
  const named = (file) => (sfx ? withSuffix(file, sfx) : file);

  if (format === 'png' || format === 'jpg' || format === 'svg') {
    const anim = pickAnim(model, o.anim, o.frames);
    const a = anim ? model.animMap.get(anim) : null;
    const one = (f) => {
      if (format === 'svg') { const s = X.svgText(model, anim, f, opts); return { buf: Buffer.from(s), what: 'SVG' }; }
      const cv = X.imageCanvas(model, anim, f, opts);
      return { buf: format === 'jpg' ? cv.toBuffer('image/jpeg', o.quality) : cv.toBuffer('image/png'), what: `${cv.width}×${cv.height}` };
    };
    if (o.frames) {
      opts.rect = o.trim ? X.contentRect(model, [anim], o.margin) : undefined;
      const pattern = named(o.out || `${base}_${anim}.${format}`);
      for (let f = 0; f < a.frames; f++) { const r = one(f); save(withSuffix(pattern, '_' + String(f).padStart(3, '0')), r.buf, r.what, o.quiet); }
      return;
    }
    if (a && o.frame >= a.frames) usage(`--frame ${o.frame} não existe em "${anim}" (quadros 0 a ${a.frames - 1})`);
    if (!a && o.frame) usage('--frame precisa de --anim');
    const r = one(o.frame);
    save(named(o.out || (anim ? `${base}_${anim}_${o.frame}.${format}` : `${base}.${format}`)), r.buf, r.what, o.quiet);
    return;
  }

  if (format === 'gif' || format === 'build') {
    const source = format === 'build' ? X.BUILD : pickAnim(model, o.anim, true);
    const r = await X.gifBytes(model, source, opts);
    save(named(o.out || `${base}_${format === 'build' ? 'pintura' : source}.gif`), Buffer.from(r.bytes), `${r.width}×${r.height}, ${r.frames} quadros`, o.quiet);
    return;
  }

  // Godot: cena pronta (.tscn) ou TileSet
  if (format === 'tscn' || (format === 'godot' && model.tileset)) {
    const out = named(o.out || `${base}.${format === 'tscn' && !model.tileset ? 'tscn' : 'tres'}`);
    const dir = path.dirname(out), b = path.basename(out).replace(/\.[^.]+$/, '');
    const normal = o.normal === null ? format === 'tscn' : o.normal;
    let pkg;
    try {
      pkg = W.godot.packageFiles(model, { base: b, scale: o.scale, normal, mirror: o.mirror, padding: o.padding, layout: o.layout, cols: o.cols, margin: o.margin });
    } catch (e) { usage(e.message); }
    const what = (f) => {
      if (f.canvas) return `${f.canvas.width}×${f.canvas.height}${/_normal\.png$/.test(f.name) ? ', normal map' : pkg.sheet ? `, ${pkg.sheet.frames} quadros de ${pkg.sheet.fw}×${pkg.sheet.fh}` : ''}`;
      if (f.name.endsWith('.tscn')) return `cena do Godot 4 (${pkg.boxes} caixa${pkg.boxes === 1 ? '' : 's'}${pkg.mirrored.length ? `, espelhadas: ${pkg.mirrored.join(', ')}` : ''})`;
      if (f.name.endsWith('.gd')) return 'ajudante do AnimationPlayer';
      return pkg.kind === 'tileset' ? `TileSet do Godot 4 (${pkg.tiles} blocos)` : 'SpriteFrames do Godot 4';
    };
    for (const f of pkg.files) save(path.join(dir, f.name), f.canvas ? f.canvas.toBuffer('image/png') : Buffer.from(f.text), what(f), o.quiet);
    return;
  }

  // sprite sheet (PNG + JSON) ou Godot (PNG + .tres)
  let names;
  if (!o.anim || o.anim === 'all') names = model.anims.length ? model.anims.map((a) => a.name) : [null];
  else names = [pickAnim(model, o.anim, true)];
  const tag = !o.anim || o.anim === 'all' ? (model.anims.length > 1 ? 'todas' : names[0] || 'pose') : o.anim;
  const out = named(o.out || `${base}_${tag}.png`);
  const zip = path.extname(out).toLowerCase() === '.zip';
  const pngFile = out.replace(/\.(zip|json|png|tres)$/i, '') + '.png';
  opts.imageName = path.basename(pngFile);
  const r = X.sheetCanvas(model, names, opts);
  const png = r.canvas.toBuffer('image/png');
  const what = `${r.canvas.width}×${r.canvas.height}, ${r.frames} quadros de ${r.fw}×${r.fh}`;
  // normal map junto (--normal): mesma arrumação da folha; no Godot, o .tres usa os dois
  const normal = o.normal ? { name: opts.imageName.replace(/\.png$/i, '_normal.png'), data: W.normal.sheet(model, r, { strength: model.godot ? model.godot.normal : 1 }).toBuffer('image/png') } : null;
  const extra = format === 'godot'
    ? { name: opts.imageName.replace(/\.png$/i, '.tres'), data: Buffer.from(X.godotText(model, r, opts.imageName, normal ? normal.name : undefined)), what: 'SpriteFrames do Godot 4' }
    : { name: opts.imageName.replace(/\.png$/i, '.json'), data: Buffer.from(r.json), what: 'JSON (TexturePacker/Phaser)' };
  if (zip) {
    const parts = [{ name: opts.imageName, data: new Uint8Array(png) }, { name: extra.name, data: new Uint8Array(extra.data) }];
    if (normal) parts.push({ name: normal.name, data: new Uint8Array(normal.data) });
    const blob = W.zip(parts);
    save(out, Buffer.from(await blob.arrayBuffer()), what, o.quiet);
  } else {
    save(pngFile, png, what, o.quiet);
    if (normal) save(path.join(path.dirname(pngFile), normal.name), normal.data, 'normal map', o.quiet);
    save(path.join(path.dirname(pngFile), extra.name), extra.data, extra.what, o.quiet);
  }
}

// Uma rodada completa: lê, confere e exporta. Devolve o código de saída e os arquivos lidos.
async function run(o) {
  const watched = new Set();
  const source = readSource(o);
  if (o.input && o.input !== '-') watched.add(path.resolve(o.input));
  const resolve = makeResolver(source, watched);
  const parse = (variant) => W.lang.parse(source.src, { file: path.basename(source.name), resolve, media: resolve.media, variant: variant || null });
  const model = parse(o.variant && o.variant !== 'all' ? o.variant : null);
  const nErr = model.errors.filter((e) => e.level === 'error').length;
  report(model, source.src, source.name);

  if (o.info) info(model);
  if (o.check) {
    if (!o.quiet) console.log(nErr ? `${nErr} erro(s).` : model.errors.length ? 'sem erros (só avisos).' : 'sem erros.');
    return { code: nErr ? 1 : 0, watched };
  }
  if (o.info && !o.out && !o.format) return { code: nErr ? 1 : 0, watched };
  if (nErr && !o.force) {
    console.error(`weasel: ${nErr} erro(s); nada foi exportado (use --force para exportar ignorando as linhas com erro).`);
    return { code: 1, watched };
  }
  if (o.variant && o.variant !== 'all' && !model.variants.includes(o.variant)) usage(`variante "${o.variant}" não existe${model.variants.length ? ` (tem: ${model.variants.join(', ')})` : ''}`);

  let format = o.format || formatFromOut(o.out) || (model.film ? (o.frameSet || o.time !== null ? 'png' : 'mp4') : 'png');
  if (format === 'jpeg') format = 'jpg';
  if (![...['png', 'jpg', 'gif', 'svg', 'sheet', 'godot', 'tscn', 'build', 'wav', 'edl', 'fcpxml'], ...V.VIDEO].includes(format)) usage(`formato desconhecido "${format}" (use png, jpg, gif, svg, sheet, godot, tscn, build, mp4, mov, webm ou mkv)`);
  if (model.film) {
    if (o.variant) usage('--variant vale para desenhos; num filme, escolha a variante no actor (variant=)');
    await V.exportFilm(model, o, format, source, { save, usage, Fail, paint, withSuffix, kb });
    return { code: 0, watched };
  }
  if (V.VIDEO.includes(format) || ['wav', 'edl', 'fcpxml'].includes(format)) usage(`${format} é para filmes (arquivo com a linha film); para animação de jogo use gif ou sheet`);
  for (const [k, flag] of [['shot', '--shot'], ['from', '--from'], ['to', '--to'], ['time', '--time']]) if (o[k] !== null) usage(`${flag} só vale para filmes`);

  if (o.variant === 'all') {
    if (!model.variants.length) usage('o desenho não tem variantes (variant)');
    await exportModel(model, o, format, source.base, '');
    for (const v of model.variants) await exportModel(parse(v), o, format, source.base, '_' + v);
  } else {
    await exportModel(model, o, format, source.base, '');
  }
  return { code: 0, watched };
}

async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { return fail(e); }
  if (!o.watch) {
    try { process.exit((await run(o)).code); } catch (e) { return fail(e); }
  }
  // --watch: exporta de novo quando o arquivo ou um include muda
  let watchers = [], timer = null, busy = false;
  const stamp = () => new Date().toLocaleTimeString('pt-BR');
  const once = async () => {
    busy = true;
    let watched = new Set([path.resolve(o.input)]);
    try { watched = (await run(o)).watched; } catch (e) { console.error(`weasel: ${e.message}`); }
    busy = false;
    for (const w of watchers) w.close();
    watchers = [...watched].map((f) => {
      try { return fs.watch(f, () => { clearTimeout(timer); timer = setTimeout(() => { if (!busy) { console.log(paint('2', `[${stamp()}] ${path.basename(f)} mudou`)); once(); } }, 150); }); } catch (e) { return { close() {} }; }
    });
    console.log(paint('2', `[${stamp()}] esperando mudanças em ${[...watched].map((f) => path.basename(f)).join(', ')} (Ctrl+C para sair)`));
  };
  await once();
}

function fail(e) {
  if (e instanceof Fail) {
    console.error(`weasel: ${e.message}`);
    if (e.code === 2) console.error('Use "weasel --help" para ver as opções.');
    process.exit(e.code);
  }
  console.error(`weasel: ${e.message}`);
  process.exit(3);
}

main();
