#!/usr/bin/env node
/* Weasel — linha de comando: lê o código (arquivo, texto ou stdin) e exporta igual ao editor web. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { W, loadImage, createCanvas } = require('./runtime');
const X = W.exporter;
const V = require('./video');
const { makeMediaResolver } = require('./media');
const VERSION = require(path.join(__dirname, '..', 'package.json')).version;

const HELP = `weasel ${VERSION} — desenho por código na linha de comando

Uso:
  weasel <arquivo.weasel> [opções]
  weasel -e "<código>" [opções]
  weasel - [opções]                 (lê o código da entrada padrão)
  weasel <imagem.png> [opções]      (traça a imagem: grava um .weasel com o desenho)

Entrada:
  -e, --eval <código>     código direto no comando; ";" ou "\\n" separam as linhas
                          (include procura arquivos a partir do arquivo de entrada,
                          ou da pasta atual com -e e stdin)

Saída:
  -o, --out <arquivo>     arquivo de saída; a extensão escolhe o formato
                          (.png .jpg .gif .webp .svg .tres .tscn; .zip = sprite sheet em zip;
                          .txt = as letras do art ascii; vídeo: .mp4 .mov .webm .mkv)
  -f, --format <tipo>     png | jpg | gif | webp | svg | sheet | godot | tscn | build (a pintura;
                          GIF, ou o formato do -o: -f build -o pintura.mp4) | txt (art ascii)
                          | mp4 | mov | webm | mkv
  -a, --anim <nome>       animação usada (gif, webp, vídeo, sheet, godot, png/jpg/svg). Em sheet,
                          "all" = todas. No gif, no webp e no vídeo, uma sequência de animações:
                          -a "idle walk*3 jump" (na ordem; *3 repete 3 vezes)
      --frame <n>         quadro do png/jpg/svg (o mesmo número usado em key; começa em 0)
      --frames            png/jpg/svg: salva todos os quadros, um arquivo por quadro
      --variant <nome>    variante de cores; "all" exporta todas (sufixo _variante)
  -s, --scale <n>         escala (padrão 1; ex.: 0.5, 2)
  -t, --transparent       fundo transparente (png, gif, svg, sheet, godot)
      --trim [margem]     recorta ao desenho (margem padrão 8)
  -q, --quality <1-100>   qualidade do jpg e do webp (padrão 92; no webp, 100 = sem perdas)
      --sticker           webp: figurinha do WhatsApp (512×512, fundo transparente, até 500 KB)
      --layout <grid|rows>  sprite sheet em grade ou uma linha por animação
      --cols <n>          colunas da grade (0 = automático)
      --padding <n>       espaço entre quadros da sprite sheet (padrão 2)
      --speed <n>         velocidade da pintura no GIF "build" (padrão 1)
      --dither            GIF com pontilhado (menos faixas em brilhos e degradês)
      --guides            inclui as camadas "guide"
      --joints            as juntas dos ossos: uma bolinha em cada uma e um traço até a do pai; nas
                          três vistas, a junta de cada vista (em azul, a desenhada: side=x,y, back=)
      --refs              desenha as imagens guia (ref) por baixo, para conferir o traço
      --trajectory[=pontos]  png/jpg: a trajetória dos pés (anim feet=) em todos os quadros da
                          animação, numerada, por cima do personagem clarinho; =pe,mao segue
                          esses pontos
      --simplify <tol>    tira pontos dos shape, stroke e line e grava um .weasel novo (o Simplificar
                          do editor): cada forma se afasta no máximo <tol> pixels da original;
                          cantos vivos ganham !. Grava arquivo_simple.weasel (ou o -o .weasel; com
                          -e ou stdin, na saída padrão). Formas usadas na troca de forma (shape=, mouth)
                          ficam como estão, a não ser com --force
      --contact           png/jpg: folha de conferência, para achar um quadro: os quadros em grade,
                          numerados, uma linha por animação (todas, ou -a "idle walk"), com os
                          eventos, os pés no chão (feet=) e o escorregão em vermelho; -s muda o
                          tamanho, --cols a quebra das linhas (padrão 12)

Traçado de imagem (a entrada é uma imagem .png, .jpg ou .webp):
  -o desenho.weasel       o arquivo novo (padrão: imagem.weasel, ao lado da imagem; não grava em
                          cima de um que já existe, a não ser com --force)
      --colors <n>        quantas cores procurar na imagem (padrão 48); menos cores, menos formas
      --tol <px>          quanto a curva pode se afastar da borda (padrão 0.5); maior, menos pontos
      --blur <px>         desfoca o desenho todo (layer blur=), como o serrilhado (padrão 0)
      --no-bg             tira o fundo chapado: a cor que ocupa a maior parte da borda da imagem
                          (um fundo dentro da figura, entre o braço e o corpo, fica)
  -s, --scale <n>         reduz (ou aumenta) a imagem antes de traçar
      --out-scale <n>     traça no tamanho da imagem e grava o desenho nessa escala (os pontos, as
                          pontas dos degradês, o canvas e a ref): 0.5 = metade, sem perder detalhe
      --prefix <nome>     o prefixo nos nomes: nome_color1, nome_gradient1, _nome_hole1 (para colar o
                          traçado num desenho que já tem color1)
      --bone <osso>       bone=osso em todas as formas (--bones a,b: bones=a,b); o arquivo leva um
                          bone de mentira para abrir sozinho, que não vai para o personagem

Godot:
  -o personagem.tscn     pacote pronto: folha, normal map, SpriteFrames (.tres), cena (.tscn)
                          com colisão, hitbox/hurtbox por quadro e eventos, e weasel_anim.gd
  -f godot                só a folha e o SpriteFrames (.tres); num arquivo com tileset, o TileSet
      --normal            gera o normal map também no -f godot (no .tscn já vem)
      --no-normal         .tscn sem normal map
      --no-mirror         .tscn sem gerar o lado espelhado (walk_right → walk_left)
      --rig               .tscn com esqueleto de verdade (Bone2D e peças; experimental)
      --no-rig            .tscn por quadros, mesmo com godot rig=bones no arquivo

Vídeo de um desenho (precisa do ffmpeg):
  -o furao.mp4 -a walk    a animação em vídeo (.mp4 H.264; .mov, .webm e .mkv também; com -t,
                          .mov e .webm guardam a transparência); --crf, --small e --ffmpeg valem
      --min-length <t>    o vídeo dura no mínimo isso: a animação (ou a sequência) repete
                          inteira (padrão 3s; 0 = uma volta só)

Filme (arquivo com a linha film):
  -o filme.mp4            vídeo H.264 (padrão); .mov = ProRes (bom para editar; com -t,
                          ProRes 4444 com transparência); .webm = VP9; precisa do ffmpeg
      --frames            sequência de imagens (filme_00000.png …), numeradas pelo quadro
      --shot <nome>       só um plano (shot); --shots: um arquivo por plano
      --from <t> --to <t> só um trecho (2s, 48f, 1m30s ou 00:01:12 = min:seg:quadro)
      --time <t>          png/jpg: o quadro nesse tempo (--frame <n> também vale)
      --contact[=N]       png/jpg: folha de conferência, uma linha por plano, um quadro a cada N
                          segundos (padrão: automático, uns 120 quadros), com o tempo embaixo
  -j, --jobs <n>          threads de render (padrão: núcleos − 1, até 8)
      --crf <n>           qualidade do mp4/webm (menor = melhor; padrão 18 no mp4, 30 no webm)
      --small             vídeo menor, para mandar (WhatsApp, e-mail): H.264 mais lento e ajustado
                          para desenho, CRF 23 e som a 128k (webm: CRF 36 e som a 96k)
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
  weasel furao.weasel -a "idle_down walk_down*3" -o furao.mp4 --small
  weasel furao.weasel -a idle_down -o figurinha.webp --sticker
  weasel furao.weasel -o godot/furao.tscn -s 0.5
  weasel blocos.weasel -f godot -o godot/blocos.tres --normal
  weasel coruja.weasel -a pia -o coruja.gif --watch
  weasel -e "canvas 200 200; ellipse sol 100,100 60 c=#ffb000" -o sol.png
  weasel filme.weasel -o filme.mp4
  weasel filme.weasel -o render/filme.mov --shots -s 0.5
  weasel filme.weasel --frames -o quadros/q.png --from 10s --to 20s
  weasel filme.weasel -o capa.png --time 4s
  weasel capivara.weasel --contact -o folha.png
  weasel filme.weasel --contact=5 -o folha.png
  weasel filme.weasel -o revisao.mp4 --burn-subs -s 0.5
  weasel filme.weasel -o para_mandar.mp4 --small --burn-subs
  weasel filme.weasel -o render/filme.mov --shots --fcpxml --edl
  weasel vetorizado.weasel --simplify 1.5           -> vetorizado_simple.weasel
  weasel rascunho.png                               -> rascunho.weasel
  weasel foto.jpg -o arte.weasel --colors 24 -s 0.5
  weasel personagem.png --no-bg                     -> personagem.weasel, sem o fundo branco
  weasel manga.png --no-bg --out-scale 0.5 --prefix manga_e --bone bracoE
`;

const tty = process.stderr.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);

class Fail extends Error { constructor(msg, code) { super(msg); this.code = code; } }
const usage = (msg) => { throw new Fail(msg, 2); };

function parseArgs(argv) {
  const o = {
    input: null, code: null, out: null, format: null, anim: null, frame: 0, frameSet: false, frames: false, variant: null, scale: 1, transparent: false, trim: false, margin: 8, quality: 92,
    layout: 'grid', cols: 0, padding: 2, speed: 1, dither: false, guides: false, joints: false, watch: false, check: false, info: false, force: false, quiet: false,
    simplify: null, colors: null, tol: null, blur: null, noBg: null, outScale: null, prefix: null, bone: null, bones: null, time: null, shot: null, shots: false, from: null, to: null, jobs: null, crf: null, small: false, ffmpeg: null, minLength: null, sticker: false,
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
      case '--small': o.small = true; break;
      case '--ffmpeg': o.ffmpeg = val(); break;
      case '--min-length': o.minLength = val(); break;
      case '--sticker': o.sticker = true; break;
      case '--normal': o.normal = true; break;
      case '--no-normal': o.normal = false; break;
      case '--no-mirror': o.mirror = false; break;
      case '--rig': o.rig = true; break;
      case '--no-rig': o.rig = false; break;
      case '--no-audio': o.audio = false; break;
      case '--subs': o.subs = val(); if (!['srt', 'vtt', 'none'].includes(o.subs)) usage('--subs aceita srt, vtt ou none'); break;
      case '--burn-subs': o.burnSubs = true; break;
      case '--lang': o.lang = val(); break;
      case '--edl': o.edl = true; break;
      case '--fcpxml': o.fcpxml = true; break;
      case '--ext': o.ext = val().replace(/^\./, ''); break;
      case '--frames': o.frames = true; break;
      case '--variant': o.variant = val(); break;
      case '-s': case '--scale': o.scale = num('--scale', val(), 0.05, 16); o.scaleSet = true; break;
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
      case '--joints': o.joints = true; break;
      case '--refs': o.refs = true; break;
      case '--trajectory': o.trajectory = inline !== undefined ? inline.split(',').filter(Boolean) : true; break;
      case '--contact': o.contact = inline || true; break;
      case '--simplify': o.simplify = num('--simplify', val(), 0.01, 1000); break;
      case '--colors': o.colors = Math.round(num('--colors', val(), 2, 256)); break;
      case '--tol': o.tol = num('--tol', val(), 0.05, 20); break;
      case '--blur': o.blur = num('--blur', val(), 0, 50); break;
      case '--no-bg': o.noBg = true; break;
      case '--out-scale': o.outScale = num('--out-scale', val(), 0.01, 16); break;
      case '--prefix': o.prefix = val(); if (!/^[A-Za-z_][\w-]*$/.test(o.prefix)) usage(`--prefix "${o.prefix}": o prefixo vira o começo de um nome (letras sem acento, números, _ e -; não começa com número)`); break;
      case '--bone': o.bone = val(); if (!/^[A-Za-z_][\w-]*$/.test(o.bone)) usage(`--bone "${o.bone}" não é um nome de osso (letras sem acento, números, _ e -)`); break;
      case '--bones': {
        const v = val(), ns = v.split(',').filter(Boolean);
        if (ns.length < 2) usage('--bones precisa de dois ossos ou mais, separados por vírgula (para um osso só, --bone)');
        const bad = ns.find((n) => !/^[A-Za-z_][\w-]*$/.test(n));
        if (bad) usage(`--bones: "${bad}" não é um nome de osso (letras sem acento, números, _ e -)`);
        o.bones = ns;
        break;
      }
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

function info(m, scale) {
  if (m.film) { console.log(V.filmInfo(m)); return; }
  const c = m.canvas;
  const bg = !c.bg ? 'transparente' : typeof c.bg === 'string' ? c.bg : `gradiente ${c.bg.name}`;
  const out = [];
  out.push(`canvas   ${c.w} × ${c.h}, fundo ${bg}${m.finish.style !== 'game' ? `, acabamento ${m.finish.style}` : ''}${m.finish.pixel > 1 ? `, pixel ${m.finish.pixel}` : ''}`);
  if (m.art) out.push(`art      ${W.art.describe(m.art)}`);
  if (m.files.length) out.push(`include  ${m.files.join(', ')}`);
  if (m.vars.size) out.push(`let      ${[...m.vars].map(([k, v]) => `${k}=${Math.round(v * 1000) / 1000}`).join(' ')}`);
  if (m.gradients.size) out.push(`gradientes ${[...m.gradients.values()].map((g) => `${g.name} (${g.type}${g.box ? ', box' : ''})`).join(', ')}`);
  if (m.variants.length) out.push(`variantes ${m.variants.join(', ')}`);
  if (m.patterns.size) out.push(`padrões  ${[...m.patterns.values()].map((p) => `${p.name} (${p.type}${p.cross ? ', cross' : ''})`).join(', ')}`);
  if (m.defs.size) out.push(`componentes ${[...m.defs.values()].map((d) => `${d.name} (${d.uses}×)`).join(', ')}`);
  if (m.ambient) out.push(`ambiente ${m.ambient.c} × ${m.ambient.power}`);
  if (m.lights.size) out.push(`luzes    ${[...m.lights.values()].map((l) => `${l.name} (${l.type}, ${l.c} × ${l.power}${l.bone ? `, osso ${l.bone}` : ''}${l.flicker ? ', tremula' : ''})`).join(', ')}`);
  const fin = Object.entries({ bloom: m.finish.bloom, vignette: m.finish.vignette, grain: m.finish.grain, posterize: m.finish.posterize, oldfilm: m.finish.oldfilm, vhs: m.finish.vhs, crt: m.finish.crt, glitch: m.finish.glitch }).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`);
  if (fin.length) out.push(`acabamento ${fin.join(' ')}`);
  out.push(`camadas  ${m.layers.length}`);
  for (const L of m.layers) {
    const fx = L.fx ? Object.keys(L.fx).filter((k) => !['glowc', 'glows', 'tintc'].includes(k)) : [];
    const flags = [L.guide && 'guide', L.hidden && 'hidden', L.unlit && 'unlit', L.clip && `clip=${L.clip}`, L.cut && `cut=${L.cut}`, L.view ? `view=${L.view}${L.angle ? ` angle=${L.angle}` : ''}` : L.only && `only=${L.only.join(',')}`,
      fx.length && `efeitos: ${fx.join(',')}`, L.trail && 'trail', L.cast && 'cast', L.rim && 'rim'].filter(Boolean).join(' ');
    out.push(`  ${L.name.padEnd(14)} ${String(L.items.filter((it) => !it.el.vclone).length).padStart(3)} item(ns)${flags ? '  ' + flags : ''}`);
  }
  // as cópias do turns (js/views.js) não contam: são as mesmas formas, nas outras vistas
  const own = m.elements.filter((e) => !e.vclone);
  out.push(`formas   ${own.length}${own.some((e) => e.hidden) ? ` (${own.filter((e) => e.hidden).length} ocultas)` : ''}`);
  const em = m.elements.filter((e) => e.type === 'emitter');
  if (em.length) out.push(`partículas ${em.map((e) => `${e.name || '?'} (${e.pshape}${e.rate ? `, ${e.rate}/s` : ''}${e.burst ? `, rajada ${e.burst}` : ''})`).join(', ')}`);
  if (m.bones.size) {
    out.push(`ossos    ${[...m.bones.values()].map((b) => {
      const extra = [b.sway && 'sway', b.bob && 'bob', b.jitter && 'jitter', b.spring && 'spring'].filter(Boolean);
      return (b.parent ? `${b.name}←${b.parent}` : b.name) + (extra.length ? ` (${extra.join(',')})` : '');
    }).join(', ')}`);
  }
  if (m.cloths.size) out.push(`tecidos  ${[...m.cloths.keys()].join(', ')}`);
  if (m.views) out.push(...viewsInfo(m.views));
  if (m.anims.length) {
    out.push(`animações ${m.anims.length}`);
    const turns = new Set();
    for (const a of m.anims) {
      out.push(`  ${a.name.padEnd(14)} ${a.frames} quadros, ${a.fps} fps${a.loop ? '' : ', once'}${a.viewOf ? `, gerada de ${a.viewOf}` : ''}${[...a.ptracks.keys()].some((k) => k[0] !== '#') ? `, anima ${[...a.ptracks.keys()].filter((k) => k[0] !== '#').join(' ')}` : ''}${a.blendOf ? `, ${a.blendOf.turn ? 'virada' : 'transição'} ${a.trans}: de ${a.blendOf.from.name} (depois do quadro ${a.blendOf.start}) para ${a.blendOf.to.name}` : ''}`);
      // a virada: as partes que viram outras (de nome diferente), as que nascem e as que somem (uma vez por linha
      // anim … turn)
      const key = a.blendOf && a.blendOf.turn && `${a.trans}|${a.blendOf.from.name}|${a.blendOf.to.name}`;
      if (key && !turns.has(key)) {
        turns.add(key);
        const p = W.scene.turnPlan(m, a), pn = W.scene.partName, list = (xs) => xs.map(([x, y]) => `${pn(x)}->${pn(y)}`).join(', ');
        const pairs = p.pairs.filter(([x, y]) => pn(x) !== pn(y));
        if (pairs.length) out.push(`  ${''.padEnd(14)} vira: ${list(pairs)}`);
        if (p.born.length) out.push(`  ${''.padEnd(14)} nascem: ${list(p.born)}`);
        if (p.gone.length) out.push(`  ${''.padEnd(14)} somem: ${list(p.gone)}`);
      }
      if (a.events.length) out.push(`  ${''.padEnd(14)} eventos: ${a.events.map((e) => `${e.name}@${e.frame}`).join(', ')}`);
      const g = W.scene.gait(m, a);
      if (g) {
        const t = W.scene.gaitText(g, scale);
        out.push(`  ${''.padEnd(14)} pés: ${t.head}`);
        for (const s of t.slips) out.push(`  ${''.padEnd(14)} aviso: ${s}`);
      }
    }
  } else out.push('animações nenhuma');
  if (m.unity) out.push(`unity    ${m.unity.unit} px/unidade, raiz ${m.unity.root.join(',')}`);
  if (m.exprs.size) out.push(`expressões ${[...m.exprs.keys()].join(', ')}`);
  if (m.mouth) out.push(`boca     ${m.mouth.name} (lip sync: ${Object.entries(m.mouth.map).map(([k, v]) => `${k}=${v.shape}${v.t < 1 ? '@' + v.t : ''}`).join(' ')})`);
  if (m.godot) out.push(`godot    ${m.godot.body}${m.godot.root ? `, raiz ${m.godot.root.join(',')}` : ''}${m.godot.name ? `, nó ${m.godot.name}` : ''}${m.godot.normal !== 1 ? `, normal ${m.godot.normal}` : ''}${m.godot.rig === 'bones' ? ', esqueleto (Bone2D)' : ''}`);
  if (m.boxes.size) {
    out.push(`caixas   ${m.boxes.size}`);
    for (const b of m.boxes.values()) out.push(`  ${b.name.padEnd(14)} ${b.kind} ${b.shape}${b.bone ? ` osso ${b.bone}` : ''}${b.only ? ` só em ${b.only.join(',')}` : ''}${b.on ? '' : ' (começa desligada)'}`);
  }
  if (m.refs.length) out.push(`imagens guia ${m.refs.map((r) => `${r.name} (${r.file}${r.lock ? ', travada' : ''}${r.hidden ? ', escondida' : ''}${r.only ? `, só em ${r.only.join(',')}` : ''})`).join(', ')}`);
  if (m.points.size) {
    out.push(`pontos   ${m.points.size}`);
    for (const p of m.points.values()) out.push(`  ${p.name.padEnd(14)} ${p.x},${p.y}${p.bone ? ` osso ${p.bone}` : ''}`);
  }
  if (m.tileset) {
    const T = m.tileset;
    out.push(`tileset  blocos de ${T.size.join('×')}, ${T.cols} × ${T.rows} células${T.auto ? ', auto' : ''}`);
    for (const t of T.tiles) out.push(`  ${t.name.padEnd(14)} ${t.col},${t.row}${t.collision ? ` colisão ${t.collision.name}` : t.solid ? ' sólido' : ''}${t.oneway ? ' só por cima' : ''}`);
  }
  console.log(out.join('\n'));
}

// três vistas (layer … view=): a câmera, a profundidade de cada osso e de onde ela veio, as diagonais, a grossura, o pé
// no chão em cada quadro (px acima do chão; negativo é afundando), as animações geradas e onde a ordem troca
function viewsInfo(V) {
  const n = (v) => { const s = String(Math.round(v * 10) / 10); return s === '-0' ? '0' : s; }, pad = ''.padEnd(2);
  const out = [`vistas   ${V.drawn.join(', ')} (principal: ${V.main}), câmera tilt=${V.tilt} (o que vai para a frente desce ${n(V.K)} px por px)`];
  out.push(`${pad}profundidade ${[...V.depth].map(([b, d]) => `${b} ${n(d.z !== undefined ? d.z : d.lat - V.rootX)} (${d.from})`).join(' · ')}${V.main === 'right' ? '  [de lado a lado, pelo lat=]' : ''}`);
  for (const [v, a] of Object.entries(V.angles)) out.push(`${pad}${v.padEnd(12)} ${n(a.deg)}° ${v.startsWith('down') ? 'da frente' : 'das costas'}, ${a.from === 'medido' ? `medido (${a.n} ossos, erro médio ${n(a.err)} px)` : a.from === 'angle=' ? 'pelo angle=' : 'o padrão (não deu para medir)'}`);
  out.push(`${pad}grossura     ${[...V.thick].map(([b, t]) => `${b} ${n(2 * t[0])}/${n(2 * t[1])}`).join(' · ')}  [de lado a lado / de frente para trás]`);
  if (V.aim) out.push(`${pad}aponta       ${[...V.aim].map(([b, f]) => `${b} (${f})`).join(' · ')}`);
  // a junta desenhada (side=x,y e back=x,y): onde ela está, em relação à que o 3D daria (a da frente, projetada)
  const NAMES = { right: 'de lado', left: 'de lado', up: 'de costas' };
  for (const v of ['right', 'left', 'up']) {
    const js = (V.joints || []).filter((j) => j.view === v && (Math.abs(j.dx) >= 0.05 || Math.abs(j.dy) >= 0.05));
    if (!js.length) continue;
    const say = (j) => [Math.abs(j.dy) >= 0.05 && `${n(Math.abs(j.dy))} ${j.dy < 0 ? 'acima' : 'abaixo'}`, Math.abs(j.dx) >= 0.05 && `${n(Math.abs(j.dx))} à ${j.dx < 0 ? 'esquerda' : 'direita'}`].filter(Boolean).join(' e ');
    out.push(`${pad}junta ${NAMES[v].padEnd(9)} ${js.map((j) => `${j.bone} ${say(j)}`).join(' · ')}  [desenhada, contra a da frente${v === 'up' ? ' espelhada' : ''}]`);
  }
  for (const [a, g] of V.ground) out.push(`${pad}pé no chão   ${a}: ${g.map(n).join(' ')}`);
  for (const g of V.gens) out.push(`${pad}geradas      ${g.base} → ${g.names.length ? g.names.join(', ') : 'nenhuma (todas escritas à mão)'}`);
  // ordem troca: em quantos quadros, e quem passa na frente de quem, com os quadros (0–3, 6)
  const runs = (fs) => {
    const s = [...fs].sort((a, b) => a - b), parts = [];
    for (let i = 0; i < s.length; i++) {
      let j = i;
      while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
      parts.push(j > i ? `${s[i]}–${s[j]}` : `${s[i]}`);
      i = j;
    }
    return parts.join(', ');
  };
  for (const s of V.swaps) out.push(`${pad}ordem troca  ${s.anim}: em ${s.frames} de ${s.total} quadros${s.pairs.length ? ': ' + s.pairs.map((p) => `${p.front} na frente de ${p.back} (${runs(p.frames)})`).join(', ') : ' (peças que não se cobrem)'}`);
  // turns: o desenho que cada quadro mostra (- = o da própria vista)
  for (const t of V.turned || []) out.push(`${pad}vira         ${t.anim}: ${t.bone} ${t.picks.map((p) => p || '-').join(' ')}`);
  return out;
}

function formatFromOut(out) {
  const ext = path.extname(out || '').toLowerCase();
  return { '.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg', '.gif': 'gif', '.webp': 'webp', '.svg': 'svg', '.txt': 'txt', '.tres': 'godot', '.tscn': 'tscn', '.zip': 'sheet', '.json': 'sheet', '.mp4': 'mp4', '.mov': 'mov', '.webm': 'webm', '.mkv': 'mkv', '.wav': 'wav', '.edl': 'edl', '.fcpxml': 'fcpxml' }[ext] || null;
}

// as extensões do -o que cada formato aceita (a primeira é a sugerida). A folha e o Godot gravam mais de um arquivo
// com o nome do -o; a cena (tscn) usa só o nome
const OUT_EXT = { png: ['.png'], jpg: ['.jpg', '.jpeg'], gif: ['.gif'], webp: ['.webp'], svg: ['.svg'], txt: ['.txt'], sheet: ['.png', '.json', '.zip'], godot: ['.tres', '.png', '.zip'], tscn: ['.tscn', '.tres'], build: ['.gif', '.webp', '.mp4', '.mov', '.webm', '.mkv'], mp4: ['.mp4'], mov: ['.mov'], webm: ['.webm'], mkv: ['.mkv'], wav: ['.wav'], edl: ['.edl'], fcpxml: ['.fcpxml'] };
// o -o precisa de uma extensão conhecida e que combine com o formato: antes, -o x.bmp salvava um PNG com esse nome,
// -f build -o x.png um GIF, e um filme com -o x.tscn centenas de PNGs
function checkOut(out, format, film) {
  const ext = path.extname(out).toLowerCase(), base = path.basename(out, path.extname(out));
  if (!ext) usage(`falta a extensão no -o: ela escolhe o formato (ex.: -o ${base}.png)`);
  if (ext === '.weasel') usage('-o com .weasel é para o --simplify (o código simplificado); para a imagem, use -o ' + base + '.png');
  if (!formatFromOut(out)) usage(`extensão desconhecida "${ext}" no -o (use .png, .jpg, .gif, .webp, .svg, .txt, .json, .zip, .tres, .tscn, .mp4, .mov, .webm, .mkv, .wav, .edl ou .fcpxml)`);
  if (film && ['.tscn', '.tres', '.zip', '.json'].includes(ext)) usage(`-o ${base}${ext}: sprite sheet e Godot são para desenhos de jogo; um filme sai em vídeo (mp4, mov, webm), gif ou png`);
  const ok = OUT_EXT[format];
  if (!ok || ok.includes(ext)) return;
  if (format === 'build') usage(`a pintura (-f build) sai em GIF, WebP ou vídeo; use -o ${base}.gif (ou .webp, .mp4…)`);
  usage(`-f ${format} e -o ${base}${ext} não combinam; use -o ${base}${ok[0]}`);
}

// os arquivos de um pacote (imagens com canvas, textos com text): as imagens comprimem juntas, cada uma numa thread
// do libuv (encode, os mesmos bytes do toBuffer)
const encodeAll = (files) => Promise.all(files.map((f) => (f.canvas ? f.canvas.encode('png') : Buffer.from(f.text))));
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

// O vídeo de um desenho: os quadros (a animação, a sequência ou a pintura) vão crus para o ffmpeg, num ritmo fixo,
// repetindo até --min-length (padrão 3 s). outName(tag) dá o nome do arquivo.
async function drawingVideo(model, o, format, source, opts, outName) {
  const bin = V.findFfmpeg(o.ffmpeg);
  if (!bin) throw new Fail('não achei o ffmpeg. Instale (https://ffmpeg.org; no Windows: winget install ffmpeg), passe --ffmpeg <caminho> ou exporte um gif ou webp', 2);
  if (o.small && format === 'mov') usage('--small vale para mp4, mkv e webm; o .mov é ProRes, feito para editar');
  const alpha = o.transparent && (format === 'mov' || format === 'webm');
  if (o.transparent && !alpha && !o.quiet) console.error(paint('33', 'aviso') + `: ${format} não guarda transparência; use .mov (ProRes 4444), .webm ou .webp`);
  let minLength = 3;
  if (o.minLength !== null) {
    minLength = V.parseTime(o.minLength, model.anims.length ? model.anims[0].fps : 12);
    if (!Number.isFinite(minLength) || minLength < 0) usage(`--min-length: tempo inválido "${o.minLength}" (ex.: 3s, 5, 1500ms; 0 = uma volta só)`);
  }
  const v = X.videoFrames(model, source, Object.assign({}, opts, { transparent: alpha, minLength }));
  const out = outName(v.tag);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const t0 = Date.now();
  const proc = spawn(bin, V.ffmpegArgs(format, v.width, v.height, v.fps, { transparent: alpha, crf: o.crf, small: o.small, audio: null }, out), { stdio: ['pipe', 'ignore', 'pipe'] });
  let errText = '';
  proc.stderr.on('data', (d) => { errText += d; });
  proc.stdin.on('error', () => {});
  const closed = new Promise((res) => proc.on('close', res));
  for (let k = 0; k < v.count; k++) {
    const d = v.frame(k).getContext('2d').getImageData(0, 0, v.width, v.height).data;
    if (proc.exitCode !== null) break;
    if (!proc.stdin.write(Buffer.from(d.buffer, d.byteOffset, d.byteLength))) {
      await new Promise((res) => {
        const go = () => { proc.stdin.off('drain', go); proc.off('close', go); res(); };
        proc.stdin.once('drain', go);
        proc.once('close', go);
      });
    }
  }
  proc.stdin.end();
  const code = await closed;
  if (code !== 0) throw new Fail(`o ffmpeg falhou (${code}): ${errText.trim() || 'sem mensagem'}`, 3);
  if (!o.quiet) console.log(`${paint('32', 'salvo')} ${out}  ${paint('2', `${v.width}×${v.height}, ${v.count} quadros a ${v.fps} fps, ${v.seconds.toFixed(1)} s${v.cycles > 1 ? ` (${v.cycles} voltas)` : ''} · ${kb(fs.statSync(out).size)} · ${((Date.now() - t0) / 1000).toFixed(1)}s`)}`);
}

// Exporta um modelo (uma variante). sfx vai no fim do nome dos arquivos.
async function exportModel(model, o, format, base, sfx) {
  const opts = { scale: o.scale, transparent: o.transparent && format !== 'jpg', trim: o.trim, margin: o.margin, quality: o.quality / 100, layout: o.layout, cols: o.cols, padding: o.padding, speed: o.speed, dither: o.dither, guides: o.guides, joints: o.joints, refs: o.refImages || null, format };
  const named = (file) => (sfx ? withSuffix(file, sfx) : file);
  // --contact: a folha de conferência, os quadros numerados, uma linha por animação, com as marcas (eventos, pés no
  // chão e escorregão)
  if (o.contact) {
    if (format !== 'png' && format !== 'jpg') usage('--contact sai em png ou jpg');
    if (o.contact !== true) usage('--contact=N (o intervalo) vale para filmes; num desenho, a folha tem todos os quadros');
    if (o.trajectory) usage('use --contact ou --trajectory, não os dois');
    if (o.frames) usage('use --contact ou --frames, não os dois');
    if (!model.anims.length) usage('o desenho não tem animações (anim/key): a folha de conferência mostra os quadros delas');
    const all = !o.anim || o.anim === 'all';
    const names = all ? model.anims.map((a) => a.name) : [...new Set(o.anim.split(/[\s,]+/).filter(Boolean))];
    for (const n of names) pickAnim(model, n, true);
    let cv;
    try {
      cv = X.contactCanvas(model, names, { scale: o.scaleSet ? o.scale : null, margin: o.margin, cols: o.cols, guides: o.guides, joints: o.joints });
    } catch (e) {
      if (!e.big) throw e;
      usage(`${e.message}: diminua a escala (-s), as colunas (--cols) ou escolha as animações (-a "idle walk")`);
    }
    const n = names.reduce((k, x) => k + model.animMap.get(x).frames, 0);
    const tag = all && names.length > 1 ? 'todas' : names.join('_');
    save(named(o.out || `${base}_${tag}_conferencia.${format}`), format === 'jpg' ? cv.toBuffer('image/jpeg', o.quality) : cv.toBuffer('image/png'), `${cv.width}×${cv.height}, folha de conferência: ${n} quadros${names.length > 1 ? ` de ${names.length} animações` : ` de ${names[0]}`}`, o.quiet);
    // os escorregões também no terminal, com os quadros
    if (!o.quiet) {
      for (const name of names) {
        for (const [foot, set] of W.scene.slipFrames(model, model.animMap.get(name))) {
          if (set.size) console.log(paint('33', `aviso: ${name}: ${foot} escorrega no${set.size > 1 ? 's quadros' : ' quadro'} ${[...set].sort((a, b) => a - b).join(', ')}`));
        }
      }
    }
    return;
  }

  const animated = format === 'gif' || format === 'webp' || format === 'build' || V.VIDEO.includes(format);
  if (!animated && X.isSeq(o.anim)) usage('uma sequência de animações (-a "idle walk*3") vale para gif, webp e vídeo');
  if (!animated && o.sticker) usage('--sticker vale para webp');
  if (!animated && o.minLength !== null) usage('--min-length vale para o vídeo (mp4, mov, webm, mkv)');

  // --trajectory: a trajetória dos pés (ou dos pontos) em todos os quadros, por cima do personagem clarinho
  if (o.trajectory) {
    if (format !== 'png' && format !== 'jpg') usage('--trajectory sai em png ou jpg');
    const anim = pickAnim(model, o.anim, true), a = model.animMap.get(anim);
    const names = o.trajectory === true ? null : o.trajectory;
    const have = model.points.size ? ` (tem: ${[...model.points.keys()].join(', ')})` : '';
    if (names) { for (const n of names) if (!model.points.has(n)) usage(`ponto "${n}" não existe${have}`); }
    else if (!model.points.size) usage('--trajectory segue os pontos (point): o desenho não tem nenhum');
    if (o.frame >= a.frames) usage(`--frame ${o.frame} não existe em "${anim}" (quadros 0 a ${a.frames - 1})`);
    const cv = X.trajectoryCanvas(model, anim, o.frame, opts, names);
    save(named(o.out || `${base}_${anim}_trajetoria.${format}`), format === 'jpg' ? cv.toBuffer('image/jpeg', o.quality) : cv.toBuffer('image/png'), `${cv.width}×${cv.height}, trajetória de ${names ? names.join(', ') : a.feet ? a.feet.join(', ') : 'todos os pontos'}`, o.quiet);
    const g = W.scene.gait(model, a);
    if (g && !o.quiet) {
      const t = W.scene.gaitText(g, o.scale);
      console.log(`${anim}: ${t.head}`);
      for (const l of t.feet) console.log(`  ${l}`);
      for (const s of t.slips) console.log(paint('33', `  aviso: ${s}`));
    }
    return;
  }

  if (format === 'png' || format === 'jpg' || format === 'svg' || format === 'txt') {
    if (format === 'txt' && !(model.art && model.art.style === 'ascii')) usage('o .txt sai do estilo ascii (ponha "art ascii" no arquivo)');
    // o SVG é feito de formas: o estilo (art) é pintado na imagem pronta, então não vai junto
    if (format === 'svg' && model.art && !o.quiet) console.error(paint('33', 'aviso') + `: o SVG sai sem o estilo (art ${model.art.style}), só com as formas; para o estilo, use png`);
    if (format === 'svg' && W.scene.screenNote(model) && !o.quiet) console.error(paint('33', 'aviso') + `: ${W.scene.screenNote(model)}`);
    const anim = pickAnim(model, o.anim, o.frames);
    const a = anim ? model.animMap.get(anim) : null;
    const one = (f) => {
      if (format === 'svg') { const s = X.svgText(model, anim, f, opts); return { buf: Buffer.from(s), what: 'SVG' }; }
      if (format === 'txt') { const t = X.imageCanvas(model, anim, f, opts).artText; const ls = t.split('\n').length - 1; return { buf: Buffer.from(t), what: `${ls} linhas de letras` }; }
      const cv = X.imageCanvas(model, anim, f, opts);
      // a compressão roda numa thread do libuv (encode, os mesmos bytes do toBuffer): buf é uma promessa
      const buf = format === 'jpg' ? cv.encode('jpeg', o.quality) : cv.encode('png');
      buf.catch(() => {}); // um erro aparece no await, na vez dele
      return { buf, what: `${cv.width}×${cv.height}` };
    };
    if (o.frames) {
      opts.rect = o.trim ? X.contentRect(model, [anim], o.margin) : undefined;
      const pattern = named(o.out || `${base}_${anim}.${format}`);
      // os próximos quadros são desenhados enquanto os anteriores comprimem (até V.ENCODES por vez), salvos na ordem
      const busy = [];
      const next = async () => { const [file, r] = busy.shift(); save(file, await r.buf, r.what, o.quiet); };
      for (let f = 0; f < a.frames; f++) {
        busy.push([withSuffix(pattern, '_' + String(f).padStart(3, '0')), one(f)]);
        if (busy.length >= V.ENCODES) await next();
      }
      while (busy.length) await next();
      return;
    }
    if (a && o.frame >= a.frames) usage(`--frame ${o.frame} não existe em "${anim}" (quadros 0 a ${a.frames - 1})`);
    if (!a && o.frame) usage('--frame precisa de --anim');
    const r = one(o.frame);
    save(named(o.out || (anim ? `${base}_${anim}_${o.frame}.${format}` : `${base}.${format}`)), await r.buf, r.what, o.quiet);
    return;
  }

  // as animações: GIF, WebP e vídeo, de uma animação, de uma sequência (-a "idle walk*3") ou da pintura (-f build)
  if (format === 'gif' || format === 'webp' || format === 'build' || V.VIDEO.includes(format)) {
    let fmt = format, source;
    if (format === 'build') {
      const ext = formatFromOut(o.out);
      fmt = ext === 'webp' || V.VIDEO.includes(ext) ? ext : 'gif';
      source = X.BUILD;
    } else if (X.isSeq(o.anim)) {
      try { X.parseSeq(model, o.anim); } catch (e) { usage(e.message); }
      source = X.SEQ;
      opts.seq = o.anim;
    } else source = pickAnim(model, o.anim, true);
    if (o.sticker && fmt !== 'webp') usage('--sticker vale para webp');
    if (o.minLength !== null && !V.VIDEO.includes(fmt)) usage('--min-length vale para o vídeo (mp4, mov, webm, mkv)');
    if (fmt === 'gif') {
      const r = await X.gifBytes(model, source, opts);
      save(named(o.out || `${base}_${r.tag}.gif`), Buffer.from(r.bytes), `${r.width}×${r.height}, ${r.frames} quadros`, o.quiet);
    } else if (fmt === 'webp') {
      const r = await X.webpBytes(model, source, Object.assign(opts, { sticker: o.sticker }));
      save(named(o.out || `${base}_${r.tag}${o.sticker ? '_figurinha' : ''}.webp`), Buffer.from(r.bytes), `${r.width}×${r.height}, ${r.frames} quadros${o.sticker ? `, figurinha (qualidade ${Math.round(r.quality * 100)})` : ''}`, o.quiet);
      if (r.big && !o.quiet) console.error(paint('33', 'aviso') + ': a figurinha passou de 500 KB mesmo na qualidade mais baixa; o WhatsApp pode recusar (use uma animação mais curta)');
    } else await drawingVideo(model, o, fmt, source, opts, (tag) => named(o.out || `${base}_${tag}.${fmt}`));
    return;
  }

  // a folha e o Godot são para o jogo: sem os efeitos de tela (oldfilm, vhs, crt, glitch)
  if (W.scene.screenNote(model) && !o.quiet) console.error(paint('33', 'aviso') + `: ${W.scene.screenNote(model)}`);

  // Godot: cena pronta (.tscn) ou TileSet
  if (format === 'tscn' || (format === 'godot' && model.tileset)) {
    const out = named(o.out || `${base}.${format === 'tscn' && !model.tileset ? 'tscn' : 'tres'}`);
    const dir = path.dirname(out), b = path.basename(out).replace(/\.[^.]+$/, '');
    const normal = o.normal === null ? format === 'tscn' : o.normal;
    // esqueleto de verdade: --rig, ou godot rig=bones no arquivo (--no-rig volta para os quadros)
    const rig = format === 'tscn' && !model.tileset && (o.rig === true || (o.rig !== false && model.godot && model.godot.rig === 'bones'));
    if (rig) {
      let pr;
      try {
        pr = W.rig.packageFiles(model, { base: b, scale: o.scale, mirror: o.mirror, normal: o.normal !== false });
      } catch (e) { usage(e.message); }
      const say = (f) => {
        if (f.canvas) return /_normal\.png$/.test(f.name) ? `${f.canvas.width}×${f.canvas.height}, normal map` : `${f.canvas.width}×${f.canvas.height}, ${pr.images} imagens de peças`;
        if (f.name.endsWith('.tscn')) return `cena do Godot 4 com esqueleto (${pr.bones} osso${pr.bones === 1 ? '' : 's'}, ${pr.rigid} peça${pr.rigid === 1 ? '' : 's'} presas aos ossos${pr.skinned ? `, ${pr.skinned} que dobra${pr.skinned === 1 ? '' : 'm'}` : ''}${pr.framed ? `, ${pr.framed} quadro a quadro` : ''}${pr.boxes ? `, ${pr.boxes} caixa${pr.boxes === 1 ? '' : 's'}` : ''}${pr.points ? `, ${pr.points} ponto${pr.points === 1 ? '' : 's'}` : ''}${pr.mirrored.length ? `, espelhadas: ${pr.mirrored.join(', ')}` : ''})`;
        return 'ajudante do AnimationPlayer';
      };
      const bufs = await encodeAll(pr.files);
      pr.files.forEach((f, i) => save(path.join(dir, f.name), bufs[i], say(f), o.quiet));
      if (!o.quiet) for (const n of pr.notes) console.log(paint('33', `aviso: ${n}`));
      return;
    }
    let pkg;
    try {
      pkg = W.godot.packageFiles(model, { base: b, scale: o.scale, normal, mirror: o.mirror, padding: o.padding, layout: o.layout, cols: o.cols, margin: o.margin });
    } catch (e) { usage(e.message); }
    const what = (f) => {
      if (f.canvas) return `${f.canvas.width}×${f.canvas.height}${/_normal\.png$/.test(f.name) ? ', normal map' : pkg.sheet ? `, ${pkg.sheet.frames} quadros de ${pkg.sheet.fw}×${pkg.sheet.fh}` : ''}`;
      if (f.name.endsWith('.tscn')) return `cena do Godot 4 (${pkg.boxes} caixa${pkg.boxes === 1 ? '' : 's'}${pkg.points ? `, ${pkg.points} ponto${pkg.points === 1 ? '' : 's'}` : ''}${pkg.mirrored.length ? `, espelhadas: ${pkg.mirrored.join(', ')}` : ''})`;
      if (f.name.endsWith('.gd')) return 'ajudante do AnimationPlayer';
      return pkg.kind === 'tileset' ? `TileSet do Godot 4 (${pkg.tiles} blocos)` : 'SpriteFrames do Godot 4';
    };
    const bufs = await encodeAll(pkg.files);
    pkg.files.forEach((f, i) => save(path.join(dir, f.name), bufs[i], what(f), o.quiet));
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
  const what = `${r.canvas.width}×${r.canvas.height}, ${r.frames} quadros de ${r.fw}×${r.fh}`;
  // normal map junto (--normal): mesma arrumação da folha; no Godot, o .tres usa os dois. Ele lê a folha, então as
  // duas imagens comprimem depois, juntas
  const nm = o.normal ? W.normal.sheet(model, r, { strength: model.godot ? model.godot.normal : 1 }) : null;
  const [png, nmBuf] = await Promise.all([r.canvas.encode('png'), nm && nm.encode('png')]);
  const normal = nm ? { name: opts.imageName.replace(/\.png$/i, '_normal.png'), data: nmBuf } : null;
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
  if (o.input && TRACE_EXT.includes(path.extname(o.input).toLowerCase())) return traceImage(o);
  for (const [k, flag] of [['colors', '--colors'], ['tol', '--tol'], ['blur', '--blur'], ['noBg', '--no-bg'], ['outScale', '--out-scale'], ['prefix', '--prefix'], ['bone', '--bone'], ['bones', '--bones']]) if (o[k] !== null) usage(`${flag} vale para o traçado de uma imagem (a entrada .png, .jpg ou .webp)`);
  const watched = new Set();
  const source = readSource(o);
  if (o.input && o.input !== '-') watched.add(path.resolve(o.input));
  const resolve = makeResolver(source, watched);
  // imagens guia (ref): relativas ao arquivo; só desenhadas com --refs
  const image = (file) => fs.existsSync(path.resolve(source.dir, file));
  const parse = (variant) => W.lang.parse(source.src, { file: path.basename(source.name), resolve, media: resolve.media, image, imageHint: 'o caminho é relativo ao arquivo .weasel', variant: variant || null });
  const model = parse(o.variant && o.variant !== 'all' ? o.variant : null);
  if (o.refs) {
    const imgs = new Map();
    for (const r of model.refs) {
      const p = path.resolve(source.dir, r.file);
      if (!imgs.has(r.file) && fs.existsSync(p)) { try { imgs.set(r.file, await loadImage(fs.readFileSync(p))); } catch (e) { console.error(`weasel: não consegui ler a imagem "${r.file}"`); } }
    }
    o.refImages = (file) => imgs.get(file) || null;
  }
  const nErr = model.errors.filter((e) => e.level === 'error').length;
  report(model, source.src, source.name);
  if (o.simplify !== null) return simplifyFile(o, source, nErr, (text) => W.lang.parse(text, { file: path.basename(source.name), resolve, media: resolve.media, image }), watched);

  if (o.info) info(model, o.scale);
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

  let format = o.format || formatFromOut(o.out) || (model.film ? (o.frameSet || o.time !== null || o.contact ? 'png' : 'mp4') : 'png');
  if (format === 'jpeg') format = 'jpg';
  if (o.out) checkOut(o.out, format, model.film);
  if (![...['png', 'jpg', 'gif', 'webp', 'svg', 'txt', 'sheet', 'godot', 'tscn', 'build', 'wav', 'edl', 'fcpxml'], ...V.VIDEO].includes(format)) usage(`formato desconhecido "${format}" (use png, jpg, gif, webp, svg, txt, sheet, godot, tscn, build, mp4, mov, webm ou mkv)`);
  if (o.joints && model.film) usage('--joints vale para desenhos (num filme, confira o ator no arquivo dele)');
  if (o.joints && ![...['png', 'jpg', 'webp', 'gif'], ...V.VIDEO].includes(format)) usage('--joints sai em png, jpg, webp, gif ou vídeo');
  if (model.film) {
    if (format === 'webp') usage('webp sai de desenhos; para o filme use gif ou mp4');
    if (o.sticker) usage('--sticker vale para o webp de um desenho');
    if (o.minLength !== null) usage('--min-length vale para o vídeo de um desenho; no filme, use --from e --to');
    if (o.variant) usage('--variant vale para desenhos; num filme, escolha a variante no actor (variant=)');
    if (o.small && format === 'mov') usage('--small vale para mp4, mkv e webm; o .mov é ProRes, feito para editar');
    await V.exportFilm(model, o, format, source, { save, usage, Fail, paint, withSuffix, kb });
    return { code: 0, watched };
  }
  if (['wav', 'edl', 'fcpxml'].includes(format)) usage(`${format} é para filmes (arquivo com a linha film); para animação de jogo use gif ou sheet`);
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

// --simplify: o Simplificar do editor em todas as linhas shape, stroke e line do arquivo (não nos include), e um
// .weasel novo. As formas usadas na troca de forma (x.shape=, shape=x, mouth) ficam como estão (sem --force), porque
// com outro número de pontos a troca deixa de ir ponto a ponto.
function simplifyFile(o, source, nErr, parseText, watched) {
  if (nErr && !o.force) {
    console.error(`weasel: ${nErr} erro(s); nada foi simplificado (corrija antes, ou use --force).`);
    return { code: 1, watched };
  }
  const out = o.out || (o.input && o.input !== '-' ? path.join(path.dirname(o.input), source.base + '_simple.weasel') : null);
  if (out && !/\.weasel$/i.test(out)) usage('--simplify grava código: use -o arquivo.weasel');
  if (out && o.input && o.input !== '-' && path.resolve(out) === path.resolve(o.input) && !o.force) usage('--simplify não grava em cima do arquivo de entrada: use outro nome no -o (ou --force)');
  const lines = source.src.split('\n'), log = (s) => { if (!o.quiet) console.error(s); };
  let n = 0, before = 0, after = 0;
  lines.forEach((t, i) => {
    const cr = t.endsWith('\r'), text = cr ? t.slice(0, -1) : t;
    const w = W.lang.splitLine(text).words;
    if (!w[0] || !['shape', 'stroke', 'line'].includes(w[0].text)) return;
    const what = `linha ${i + 1} ${w[0].text}${w[1] && !w[1].text.includes('=') ? ' ' + w[1].text : ''}`;
    const r = W.simplify.line(text, o.simplify);
    if (r.why) { if (!r.minor) log(paint('33', `${what}: ${r.why}`)); return; }
    if (r.after >= r.before) return;
    const name = w[1] ? w[1].text : '', uses = name ? W.simplify.uses(source.src, name) : [];
    if (uses.length && !o.force) { log(paint('33', `${what}: ficou como está, porque a troca de forma usa ela (linha ${uses.map((u) => u + 1).join(', ')}); --force simplifica mesmo assim`)); return; }
    lines[i] = r.text + (cr ? '\r' : '');
    n++;
    before += r.before;
    after += r.after;
    log(`${what}: ${r.before} → ${r.after} pontos${r.corners.length ? ` (${r.corners.length} canto${r.corners.length > 1 ? 's' : ''} com !)` : ''}`);
  });
  const text = lines.join('\n');
  // confere: o código novo não pode ter erros que o de antes não tinha
  const e2 = parseText(text).errors.filter((e) => e.level === 'error').length;
  if (e2 > nErr) throw new Fail('o código simplificado ficou com erros; nada foi gravado (isto é um defeito do Weasel: avise)', 3);
  log(n ? `${n} forma${n > 1 ? 's' : ''}: ${before} → ${after} pontos (tolerância ${o.simplify} px)` : `nada para tirar com a tolerância ${o.simplify} px`);
  if (out) save(out, Buffer.from(text, 'utf8'), 'código simplificado', o.quiet);
  else process.stdout.write(text);
  return { code: 0, watched };
}

// Traçado de imagem (docs/planos/tracado-de-imagem.md): a entrada é uma imagem, e sai um .weasel com o desenho
// (js/trace.js). O arquivo leva a imagem como ref escondida, para comparar no editor.
const TRACE_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
async function traceImage(o) {
  const src = o.input, watched = new Set([path.resolve(src)]);
  const base = path.basename(src, path.extname(src));
  const out = o.out || path.join(path.dirname(src), base + '.weasel');
  if (!/\.weasel$/i.test(out)) usage(`o traçado de uma imagem grava código: use -o ${path.basename(out, path.extname(out))}.weasel`);
  // não grava em cima de um arquivo que já existe (pode ser um desenho feito à mão); no --watch, o seu mesmo pode
  if (fs.existsSync(out) && !o.force && o.tracedOut !== path.resolve(out)) usage(`${out} já existe: use outro nome no -o (ou --force para gravar por cima)`);
  if (o.bone && o.bones) usage('use --bone (um osso) OU --bones (vários), não os dois');
  if (!fs.existsSync(src)) throw new Fail(`não achei a imagem "${src}"`, 1);
  let img;
  try { img = await loadImage(fs.readFileSync(src)); } catch (e) { throw new Fail(`não consegui ler a imagem "${src}"`, 1); }
  const w = Math.max(1, Math.round(img.width * o.scale)), h = Math.max(1, Math.round(img.height * o.scale));
  const log = (s) => { if (!o.quiet) console.error(s); };
  if (w * h > 4e6) log(paint('33', `imagem grande (${w}×${h}, ${(w * h / 1e6).toFixed(1)} Mpx): o traçado pode levar minutos e o arquivo passar de 1 MB; -s 0.5 reduz a imagem antes de traçar`));
  const cv = createCanvas(w, h);
  const cx = cv.getContext('2d');
  // em 1:1 a imagem entra sem reamostrar (com tamanho e suavização, o canvas filtra os pixels mesmo sem mudar a escala)
  if (w === img.width && h === img.height) cx.drawImage(img, 0, 0);
  else { cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, w, h); }
  const opts = {};
  if (o.colors !== null) opts.colors = o.colors;
  if (o.tol !== null) opts.tol = o.tol;
  if (o.noBg) opts.noBg = true;
  let res;
  try { res = W.trace.trace(cx.getImageData(0, 0, w, h), opts); } catch (e) { throw new Fail(e.message, 1); }
  const used = [o.colors !== null && `--colors ${o.colors}`, o.tol !== null && `--tol ${o.tol}`, o.blur && `--blur ${o.blur}`, o.noBg && '--no-bg', o.scale !== 1 && `-s ${o.scale}`,
    o.outScale !== null && `--out-scale ${o.outScale}`, o.prefix && `--prefix ${o.prefix}`, o.bone && `--bone ${o.bone}`, o.bones && `--bones ${o.bones.join(',')}`].filter(Boolean);
  const rel = path.relative(path.dirname(path.resolve(out)), path.resolve(src)).split(path.sep).join('/');
  const st = res.stats, pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  // --out-scale: traça no tamanho da imagem e grava os pontos (e o canvas, a ref e o blur) na escala pedida; --prefix:
  // os nomes da palette, dos degradês e dos buracos com o prefixo; --bone/--bones: o osso em todas as formas
  const k = o.outScale || 1, p = o.prefix, n2 = (v) => +(v * k).toFixed(2);
  const how = {
    map: k !== 1 ? (x, y) => [x * k, y * k] : null,
    color: p ? (j) => `${p}_color${j + 1}` : undefined,
    gradient: p ? (n) => `${p}_gradient${n}` : undefined,
    hole: p ? (n) => `_${p}_hole${n}` : undefined,
    attrs: o.bone ? ` bone=${o.bone}` : o.bones ? ` bones=${o.bones.join(',')}` : '',
  };
  const W2 = Math.max(1, Math.round(w * k)), H2 = Math.max(1, Math.round(h * k)), sc = +(o.scale * k).toFixed(4);
  // o osso só existe no personagem: aqui vão ossos de mentira, para o arquivo abrir sozinho (um bone= de um osso que
  // não existe é erro)
  const fake = o.bone ? [o.bone] : o.bones || [];
  const before = fake.length ? [
    `# ${fake.length === 1 ? 'osso de mentira' : 'ossos de mentira'}, só para este arquivo abrir sozinho: no personagem, copie as formas e não ${fake.length === 1 ? 'este bone' : 'estes bone'}`,
    ...fake.map((b, i) => `bone ${b}${i ? ` parent=${fake[i - 1]}` : ''} pivot=${n2(w / 2)},${n2(h * (i + 1) / (fake.length + 1))}`),
  ] : [];
  const text = W.trace.file(res, {
    header: [
      `${path.basename(src)}: traçado de imagem do Weasel ${VERSION}.`,
      k === 1
        ? `${pl(st.regions, 'região', 'regiões')}, da maior para a menor; 1 unidade = 1 px da imagem (${w}×${h}${o.scale === 1 ? '' : `, com -s ${o.scale}`}).`
        : `${pl(st.regions, 'região', 'regiões')}, da maior para a menor; 1 px da imagem (${w}×${h}${o.scale === 1 ? '' : `, com -s ${o.scale}`}) = ${String(k).replace('.', ',')} unidade, com --out-scale ${o.outScale}.`,
      `opções: ${used.length ? used.join(' ') : 'as padrão'}`,
      ...(res.bg ? [`sem fundo: ${res.bg}`] : []),
      'a imagem original está na linha ref: tire o hidden para comparar.',
    ],
    ref: `ref original "${rel}"${sc !== 1 ? ` scale=${sc}` : ''} hidden`,
    blur: o.blur ? n2(o.blur) : 0,
    size: [W2, H2],
    how: k !== 1 || p || how.attrs ? how : null,
    before,
  });
  log(`${pl(st.regions, 'região', 'regiões')} (${pl(st.gradients, 'degradê', 'degradês')}, ${pl(st.translucent, 'semitransparente', 'semitransparentes')}), ${pl(st.shapes, 'forma', 'formas')}, ${pl(st.points, 'ponto', 'pontos')}, ${pl(st.colors, 'cor', 'cores')}${res.bg ? `, fundo ${res.bg} tirado` : ''} · ${(st.ms / 1000).toFixed(1).replace('.', ',')} s`);
  if (o.noBg && !res.bg) log(paint('33', '--no-bg: não achei um fundo chapado (uma cor só, opaca, em pelo menos metade da borda da imagem): o traçado ficou com tudo'));
  save(out, Buffer.from(text, 'utf8'), 'traçado de imagem', o.quiet);
  o.tracedOut = path.resolve(out);
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
