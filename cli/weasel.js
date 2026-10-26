#!/usr/bin/env node
/* Weasel — linha de comando: lê o código (arquivo, texto ou stdin) e exporta igual ao editor web. */
'use strict';
const fs = require('fs');
const path = require('path');

let canvasLib;
try {
  canvasLib = require('@napi-rs/canvas');
} catch (e) {
  console.error('weasel: falta a biblioteca de desenho. Rode "npm install" na pasta do projeto.');
  process.exit(3);
}
const { createCanvas, Path2D } = canvasLib;

// Os módulos do editor web são scripts de navegador; damos a eles só o que usam.
const probe = createCanvas(1, 1).getContext('2d');
globalThis.window = globalThis;
globalThis.Path2D = Path2D;
globalThis.document = { createElement: () => createCanvas(1, 1) };
globalThis.CSS = {
  supports(prop, v) {
    probe.fillStyle = '#010203';
    probe.fillStyle = v;
    return prop === 'color' && probe.fillStyle !== '#010203';
  },
};
for (const f of ['geom', 'lang', 'scene', 'gif', 'zip', 'export']) require(path.join(__dirname, '..', 'js', f + '.js'));
const W = globalThis.Weasel;
const X = W.exporter;
const VERSION = require(path.join(__dirname, '..', 'package.json')).version;

const HELP = `weasel ${VERSION} — desenho por código na linha de comando

Uso:
  weasel <arquivo.weasel> [opções]
  weasel -e "<código>" [opções]
  weasel - [opções]                 (lê o código da entrada padrão)

Entrada:
  -e, --eval <código>     código direto no comando; ";" ou "\\n" separam as linhas

Saída:
  -o, --out <arquivo>     arquivo de saída; a extensão escolhe o formato
                          (.png .jpg .gif; .zip = sprite sheet em zip)
  -f, --format <tipo>     png | jpg | gif | sheet | build (GIF da pintura passo a passo)
  -a, --anim <nome>       animação usada (gif, sheet, png/jpg). Em sheet, "all" = todas
      --frame <n>         quadro do png/jpg (o mesmo número usado em key; começa em 0)
      --frames            png/jpg: salva todos os quadros da animação, um arquivo por quadro
  -s, --scale <n>         escala (padrão 1; ex.: 0.5, 2)
  -t, --transparent       fundo transparente (png, gif, sheet)
      --trim [margem]     recorta ao desenho (margem padrão 8)
  -q, --quality <1-100>   qualidade do jpg (padrão 92)
      --layout <grid|rows>  sprite sheet em grade ou uma linha por animação
      --cols <n>          colunas da grade (0 = automático)
      --padding <n>       espaço entre quadros da sprite sheet (padrão 2)
      --speed <n>         velocidade da pintura no GIF "build" (padrão 1)
      --guides            inclui as camadas "guide"

Outros:
      --check             só verifica o código e mostra erros
      --info              mostra canvas, camadas, ossos e animações
      --force             exporta mesmo com erros (ignora as linhas inválidas, como o editor)
      --quiet             não escreve nada além dos erros
  -h, --help              esta ajuda
  -v, --version           versão

Exemplos:
  weasel cavaleiro.weasel                        -> cavaleiro.png
  weasel cavaleiro.weasel -o out/jump.gif -a jump --trim
  weasel cavaleiro.weasel -f sheet -a all -s 0.5 --trim -t   -> PNG + JSON
  weasel cavaleiro.weasel -f build -o pintura.gif
  weasel -e "canvas 200 200; ellipse sol 100,100 60 c=#ffb000" -o sol.png
`;

const tty = process.stderr.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);

function usage(msg) {
  console.error(`weasel: ${msg}`);
  console.error('Use "weasel --help" para ver as opções.');
  process.exit(2);
}

function parseArgs(argv) {
  const o = { input: null, code: null, out: null, format: null, anim: null, frame: 0, frames: false, scale: 1, transparent: false, trim: false, margin: 8, quality: 92, layout: 'grid', cols: 0, padding: 2, speed: 1, guides: false, check: false, info: false, force: false, quiet: false };
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
      case '--frame': o.frame = Math.round(num('--frame', val(), 0, 100000)); break;
      case '--frames': o.frames = true; break;
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
      case '--guides': o.guides = true; break;
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
  return o;
}

function readSource(o) {
  if (o.code !== null) {
    if (o.input) usage('use um arquivo OU -e, não os dois');
    return { src: o.code.replace(/\\n/g, '\n').replace(/;/g, '\n'), name: '<-e>', base: 'desenho' };
  }
  if (!o.input && !process.stdin.isTTY) o.input = '-';
  if (!o.input) { process.stdout.write(HELP); process.exit(2); }
  if (o.input === '-') return { src: fs.readFileSync(0, 'utf8'), name: '<stdin>', base: 'desenho' };
  let src;
  try { src = fs.readFileSync(o.input, 'utf8'); } catch (e) { usage(`não consegui ler "${o.input}" (${e.code || e.message})`); }
  return { src: src.replace(/^﻿/, ''), name: o.input, base: path.basename(o.input).replace(/\.[^.]+$/, '') || 'desenho' };
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
  const c = m.canvas;
  const out = [];
  out.push(`canvas   ${c.w} × ${c.h}, fundo ${c.bg || 'transparente'}${m.finish.style !== 'game' ? `, acabamento ${m.finish.style}` : ''}${m.finish.pixel > 1 ? `, pixel ${m.finish.pixel}` : ''}`);
  out.push(`camadas  ${m.layers.length}`);
  for (const L of m.layers) {
    const flags = [L.guide && 'guide', L.hidden && 'hidden', L.clip && `clip=${L.clip}`, L.only && `only=${L.only.join(',')}`].filter(Boolean).join(' ');
    out.push(`  ${L.name.padEnd(14)} ${String(L.items.length).padStart(3)} item(ns)${flags ? '  ' + flags : ''}`);
  }
  out.push(`formas   ${m.elements.length}`);
  if (m.bones.size) out.push(`ossos    ${[...m.bones.values()].map((b) => (b.parent ? `${b.name}←${b.parent}` : b.name)).join(', ')}`);
  if (m.cloths.size) out.push(`tecidos  ${[...m.cloths.keys()].join(', ')}`);
  if (m.anims.length) {
    out.push(`animações ${m.anims.length}`);
    for (const a of m.anims) out.push(`  ${a.name.padEnd(14)} ${a.frames} quadros, ${a.fps} fps${a.loop ? '' : ', once'}`);
  } else out.push('animações nenhuma');
  if (m.unity) out.push(`unity    ${m.unity.unit} px/unidade, raiz ${m.unity.root.join(',')}`);
  console.log(out.join('\n'));
}

function formatFromOut(out) {
  const ext = path.extname(out || '').toLowerCase();
  return { '.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg', '.gif': 'gif', '.zip': 'sheet', '.json': 'sheet' }[ext] || null;
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

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const { src, name, base } = readSource(o);
  const model = W.lang.parse(src);
  const nErr = model.errors.filter((e) => e.level === 'error').length;
  report(model, src, name);

  if (o.info) info(model);
  if (o.check) {
    if (!o.quiet) console.log(nErr ? `${nErr} erro(s).` : model.errors.length ? 'sem erros (só avisos).' : 'sem erros.');
    process.exit(nErr ? 1 : 0);
  }
  if (o.info && !o.out && !o.format) process.exit(nErr ? 1 : 0);
  if (nErr && !o.force) {
    console.error(`weasel: ${nErr} erro(s); nada foi exportado (use --force para exportar ignorando as linhas com erro).`);
    process.exit(1);
  }

  let format = o.format || formatFromOut(o.out) || 'png';
  if (format === 'jpeg') format = 'jpg';
  if (!['png', 'jpg', 'gif', 'sheet', 'build'].includes(format)) usage(`formato desconhecido "${format}" (use png, jpg, gif, sheet ou build)`);
  const opts = { scale: o.scale, transparent: o.transparent && format !== 'jpg', trim: o.trim, margin: o.margin, quality: o.quality / 100, layout: o.layout, cols: o.cols, padding: o.padding, speed: o.speed, guides: o.guides, format };

  if (format === 'png' || format === 'jpg') {
    const anim = pickAnim(model, o.anim, o.frames);
    const a = anim ? model.animMap.get(anim) : null;
    const encode = (cv) => (format === 'jpg' ? cv.toBuffer('image/jpeg', o.quality) : cv.toBuffer('image/png'));
    if (o.frames) {
      opts.rect = o.trim ? X.contentRect(model, [anim], o.margin) : undefined;
      const pattern = o.out || `${base}_${anim}.${format}`;
      for (let f = 0; f < a.frames; f++) {
        const cv = X.imageCanvas(model, anim, f, opts);
        save(withSuffix(pattern, '_' + String(f).padStart(3, '0')), encode(cv), `${cv.width}×${cv.height}`, o.quiet);
      }
      return;
    }
    if (a && o.frame >= a.frames) usage(`--frame ${o.frame} não existe em "${anim}" (quadros 0 a ${a.frames - 1})`);
    if (!a && o.frame) usage('--frame precisa de --anim');
    const cv = X.imageCanvas(model, anim, o.frame, opts);
    const file = o.out || (anim ? `${base}_${anim}_${o.frame}.${format}` : `${base}.${format}`);
    save(file, encode(cv), `${cv.width}×${cv.height}`, o.quiet);
    return;
  }

  if (format === 'gif' || format === 'build') {
    const source = format === 'build' ? X.BUILD : pickAnim(model, o.anim, true);
    const r = await X.gifBytes(model, source, opts);
    const file = o.out || `${base}_${format === 'build' ? 'pintura' : source}.gif`;
    save(file, Buffer.from(r.bytes), `${r.width}×${r.height}, ${r.frames} quadros`, o.quiet);
    return;
  }

  // sprite sheet
  let names;
  if (!o.anim || o.anim === 'all') names = model.anims.length ? model.anims.map((a) => a.name) : [null];
  else names = [pickAnim(model, o.anim, true)];
  const tag = !o.anim || o.anim === 'all' ? (model.anims.length > 1 ? 'todas' : names[0] || 'pose') : o.anim;
  const out = o.out || `${base}_${tag}.png`;
  const zip = path.extname(out).toLowerCase() === '.zip';
  const pngFile = out.replace(/\.(zip|json|png)$/i, '') + '.png';
  opts.imageName = path.basename(pngFile);
  const r = X.sheetCanvas(model, names, opts);
  const png = r.canvas.toBuffer('image/png');
  const what = `${r.canvas.width}×${r.canvas.height}, ${r.frames} quadros de ${r.fw}×${r.fh}`;
  if (zip) {
    const blob = W.zip([
      { name: opts.imageName, data: new Uint8Array(png) },
      { name: opts.imageName.replace(/\.png$/i, '.json'), data: new TextEncoder().encode(r.json) },
    ]);
    save(out, Buffer.from(await blob.arrayBuffer()), what, o.quiet);
  } else {
    save(pngFile, png, what, o.quiet);
    save(pngFile.replace(/\.png$/i, '.json'), Buffer.from(r.json), 'JSON (TexturePacker/Phaser)', o.quiet);
  }
}

main().catch((e) => {
  console.error(`weasel: ${e.message}`);
  process.exit(3);
});
