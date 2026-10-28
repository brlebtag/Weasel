#!/usr/bin/env node
/* Weasel — testes de regressão: renderiza os exemplos e compara com as imagens e textos de
   referência em test/ref/. Garante que mudanças novas (filme, etc.) não mexem no que já existe
   (sprite sheets, Godot, SVG, poses, variantes). Os arquivos de test/casos/ testam uma função
   cada (pontos de encaixe, peças das variantes, ordem de pintura, desenhar aos poucos, transições).

     npm test                      compara tudo
     npm run test:update           regrava as referências (só depois de conferir que a mudança é desejada)
     node test/regress.js coruja   só os casos cujo nome contém "coruja"
*/
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { W, createCanvas, loadImage } = require('../cli/runtime');
const { makeMediaResolver } = require('../cli/media');
require('../js/examples.js');
require('../js/timeline.js');
const X = W.exporter;

const ROOT = path.join(__dirname, '..');
const EX = path.join(ROOT, 'exemplos');
const CASES = path.join(__dirname, 'casos');
const REF = path.join(__dirname, 'ref');
const OUT = path.join(__dirname, 'out');
const CLI = path.join(ROOT, 'cli', 'weasel.js');

const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const STRICT = args.includes('--strict');
const only = args.filter((a) => !a.startsWith('--'));

// Um pixel conta como diferente se algum canal mudar mais que TOL; o caso falha se mais de
// MAXFRAC dos pixels mudarem (antialiasing e fontes variam um pouco entre sistemas).
const TOL = STRICT ? 0 : 16;
const MAXFRAC = STRICT ? 0 : 0.0002;

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const results = { ok: 0, fail: 0, new: 0, updated: 0 };
const failures = [];

function resolver(dir) {
  const dirs = new Map();
  return (name, from) => {
    const p = path.resolve(dirs.get(from) || dir, name);
    try {
      const t = fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
      dirs.set(name, path.dirname(p));
      return t;
    } catch (e) {
      return null;
    }
  };
}
function load(file, variant) {
  const src = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const dir = path.dirname(file);
  return W.lang.parse(src, { file: path.basename(file), resolve: resolver(dir), media: makeMediaResolver(() => dir), variant: variant || null });
}

const norm = (s) => String(s).replace(/\r\n/g, '\n');

async function pixels(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, img.width, img.height);
}

function record(ok, name, msg) {
  if (ok) { results.ok++; return; }
  results.fail++;
  failures.push(`${name}: ${msg}`);
  console.log(`  ${paint('31;1', 'FALHOU')} ${name} — ${msg}`);
}

// Compara (ou grava) um resultado. kind: 'png' (canvas) ou 'text'.
async function check(group, file, kind, actual) {
  const name = `${group}/${file}`;
  const refFile = path.join(REF, group, file);
  const outFile = path.join(OUT, group, file);
  const data = kind === 'png' ? actual.toBuffer('image/png') : Buffer.from(norm(actual));
  const exists = fs.existsSync(refFile);
  if (UPDATE || !exists) {
    fs.mkdirSync(path.dirname(refFile), { recursive: true });
    const same = exists && (kind === 'png' ? false : norm(fs.readFileSync(refFile, 'utf8')) === norm(actual));
    if (!same) fs.writeFileSync(refFile, data);
    if (!exists) { results.new++; console.log(`  ${paint('36', 'nova')}   ${name}`); } else results.updated++;
    return;
  }
  if (kind === 'text') {
    const ref = norm(fs.readFileSync(refFile, 'utf8'));
    const act = norm(actual);
    if (ref === act) return record(true);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, data);
    const a = ref.split('\n'), b = act.split('\n');
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    return record(false, name, `texto diferente na linha ${i + 1}:\n      ref: ${(a[i] || '').slice(0, 140)}\n      novo: ${(b[i] || '').slice(0, 140)}\n      (saída em ${path.relative(ROOT, outFile)})`);
  }
  const ref = await pixels(fs.readFileSync(refFile));
  const act = actual.getContext('2d').getImageData(0, 0, actual.width, actual.height);
  if (ref.width !== act.width || ref.height !== act.height) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, data);
    return record(false, name, `tamanho mudou: ${ref.width}×${ref.height} → ${act.width}×${act.height}`);
  }
  let diff = 0, worst = 0;
  const D = createCanvas(ref.width, ref.height);
  const dx = D.getContext('2d');
  const dimg = dx.createImageData(ref.width, ref.height);
  for (let i = 0; i < ref.data.length; i += 4) {
    let m = 0;
    for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(ref.data[i + k] - act.data[i + k]));
    const g = (ref.data[i] + ref.data[i + 1] + ref.data[i + 2]) / 3;
    if (m > TOL) { diff++; dimg.data[i] = 255; dimg.data[i + 1] = 0; dimg.data[i + 2] = 0; dimg.data[i + 3] = 255; } else { dimg.data[i] = dimg.data[i + 1] = dimg.data[i + 2] = 255 - (255 - g) * 0.25; dimg.data[i + 3] = 255; }
    worst = Math.max(worst, m);
  }
  const total = ref.width * ref.height;
  if (diff <= Math.max(STRICT ? 0 : 3, total * MAXFRAC)) return record(true);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, data);
  dx.putImageData(dimg, 0, 0);
  fs.writeFileSync(outFile.replace(/\.png$/, '.diff.png'), D.toBuffer('image/png'));
  return record(false, name, `${diff} pixels diferentes (${((diff / total) * 100).toFixed(3)}%, maior diferença ${worst}); veja ${path.relative(ROOT, outFile.replace(/\.png$/, '.diff.png'))}`);
}

// ---------- casos ----------
// prefix: o nome do grupo em test/ref (os casos de teste ficam como caso_nome); svg: SVG do meio de cada animação
async function drawingCases(file, prefix, svg) {
  const group = (prefix || '') + path.basename(file, '.weasel');
  const model = load(file);
  console.log(paint('1', group));
  const errs = model.errors.filter((e) => e.level === 'error');
  record(!errs.length, `${group}/parse`, `${errs.length} erro(s): ${errs.slice(0, 3).map((e) => `linha ${e.line + 1}: ${e.msg}`).join('; ')}`);

  // resumo do modelo pela própria linha de comando (também testa a CLI)
  const info = spawnSync(process.execPath, [CLI, file, '--info', '--quiet'], { encoding: 'utf8', env: Object.assign({}, process.env, { NO_COLOR: '1' }) });
  await check(group, 'info.txt', 'text', info.stdout + (info.status ? `\n[saída ${info.status}] ${info.stderr}` : ''));

  const o = { scale: 0.5, transparent: false, trim: false, margin: 8, format: 'png' };
  await check(group, 'pose.png', 'png', X.imageCanvas(model, null, 0, o));
  for (const v of model.variants) await check(group, `pose_${v}.png`, 'png', X.imageCanvas(load(file, v), null, 0, o));
  await check(group, 'pose.svg', 'text', X.svgText(model, null, 0, { scale: 0.5, transparent: false }));

  // cada quadro de cada animação, numa sprite sheet pequena, com o JSON e o .tres do Godot
  // (escala pelo total de pixels, para as referências não pesarem no repositório)
  const names = model.anims.length ? model.anims.map((a) => a.name) : [null];
  const nFrames = model.anims.reduce((n, a) => n + a.frames, 0) || 1;
  const scale = Math.min(0.3, Math.round(Math.sqrt(900000 / (nFrames * model.canvas.w * model.canvas.h)) * 100) / 100);
  const so = { scale, transparent: true, trim: true, margin: 4, layout: 'rows', cols: 0, padding: 2, imageName: `${group}.png`, format: 'sheet' };
  const r = X.sheetCanvas(model, names, so);
  if (!model.finish.grain) await check(group, 'sheet.png', 'png', r.canvas);
  else {
    // granulado é ruído puro (não comprime): a folha sai sem os acabamentos, que já são
    // conferidos nas imagens maiores
    const c = createCanvas(r.canvas.width, r.canvas.height);
    const x = c.getContext('2d');
    const rect = JSON.parse(r.json).meta.sourceRect;
    for (const cell of r.cells) x.drawImage(W.scene.renderImage(model, W.scene.makePose(model, cell.name, cell.f), { scale, rect, transparent: true, noPost: true }), cell.x, cell.y);
    await check(group, 'sheet_sem_acabamento.png', 'png', c);
  }
  await check(group, 'sheet.json', 'text', r.json);
  await check(group, 'godot.tres', 'text', X.godotText(model, r, `${group}.png`));

  // um quadro do meio de cada animação em tamanho maior (pega detalhe que a folha pequena perde)
  for (const a of model.anims) await check(group, `${a.name}_meio.png`, 'png', X.imageCanvas(model, a.name, Math.floor(a.frames / 2), o));
  if (svg) for (const a of model.anims) await check(group, `${a.name}_meio.svg`, 'text', X.svgText(model, a.name, Math.floor(a.frames / 2), { scale: 0.5, transparent: false }));

  // pacote do Godot (cena, TileSet, normal map) para quem tem caixas, unity, godot ou tileset
  if (model.boxes.size || model.unity || model.godot || model.tileset) {
    const pkg = W.godot.packageFiles(model, { base: group, scale: model.tileset ? 1 : 0.3, normal: true, mirror: true });
    for (const f of pkg.files) {
      if (f.name === 'weasel_anim.gd') await check('_godot', 'weasel_anim.gd', 'text', f.text);
      else if (f.canvas && /_normal\.png$/.test(f.name)) {
        // só o primeiro quadro (normal map não comprime bem); o tileset vai inteiro
        let cv = f.canvas;
        if (pkg.sheet) {
          const c = pkg.sheet.cells[0];
          cv = createCanvas(pkg.sheet.fw, pkg.sheet.fh);
          cv.getContext('2d').drawImage(f.canvas, c.x, c.y, pkg.sheet.fw, pkg.sheet.fh, 0, 0, pkg.sheet.fw, pkg.sheet.fh);
        }
        await check(group, 'pacote_normal.png', 'png', cv);
      }
      else if (!f.canvas) await check(group, `pacote${path.extname(f.name)}`, 'text', f.text);
    }
  }

  // Godot com esqueleto de verdade (godot rig=bones): a folha de peças e a cena
  if (model.godot && model.godot.rig === 'bones') {
    const pkg = W.rig.packageFiles(model, { base: group, scale: 0.5, mirror: true });
    for (const f of pkg.files) {
      if (f.name.endsWith('_normal.png')) await check(group, 'esqueleto_normal.png', 'png', f.canvas);
      else if (f.name.endsWith('.png')) await check(group, 'esqueleto.png', 'png', f.canvas);
      else if (f.name.endsWith('.tscn')) await check(group, 'esqueleto.tscn', 'text', f.text);
    }
  }

  // ordem da pintura passo a passo
  const plan = W.scene.buildPlan(model, { speed: 1 });
  await check(group, 'pintura.txt', 'text', plan.order.map((p) => `${p.el.type} ${p.el.name || '-'} @${p.start.toFixed(3)} +${p.dur.toFixed(3)}`).join('\n') + `\ntotal ${plan.total.toFixed(3)}\n`);
}

// Filme: a linha do tempo em texto (onde cada ator está, que quadro da animação toca, para onde a
// câmera olha) e alguns quadros prontos numa folha.
async function filmCases(file, prefix) {
  const group = (prefix || '') + path.basename(file, '.weasel');
  const model = load(file);
  console.log(paint('1', group));
  const errs = model.errors.filter((e) => e.level === 'error');
  record(!errs.length, `${group}/parse`, `${errs.length} erro(s): ${errs.slice(0, 3).map((e) => `linha ${e.line + 1}: ${e.msg}`).join('; ')}`);
  const info = spawnSync(process.execPath, [CLI, file, '--info', '--quiet'], { encoding: 'utf8', env: Object.assign({}, process.env, { NO_COLOR: '1' }) });
  await check(group, 'info.txt', 'text', info.stdout + (info.status ? `\n[saída ${info.status}] ${info.stderr}` : ''));

  const tl = W.film.timeline(model);
  const r2 = (v) => Math.round(v * 100) / 100;
  const lines = [`quadros ${tl.frames} fps ${tl.fps}`];
  for (let f = 0; f < tl.frames; f += 6) {
    const fs2 = W.film.frameState(model, f);
    const c = fs2.cam;
    const who = fs2.who.filter((w) => !w.stage).map((w) => `${w.ac.name}=${r2(w.x)},${r2(w.y)}${w.anim ? ` ${w.anim}#${w.animFrame}` : ''}${w.flip[0] < 0 ? ' flip' : ''}${w.show ? '' : ' oculto'}${w.opacity < 1 ? ` op${r2(w.opacity)}` : ''}`);
    lines.push(`${String(f).padStart(4)} ${W.film.timecode(f, tl.fps)} ${fs2.entry.name} cam=${r2(c.x)},${r2(c.y)} z${r2(c.zoom)}${c.sx || c.sy ? ` tremor ${r2(c.sx)},${r2(c.sy)}` : ''}${c.fade ? ` fade${r2(c.fade)}` : ''} | ${who.join(' | ')}`);
  }
  await check(group, 'linha_do_tempo.txt', 'text', lines.join('\n') + '\n');

  // sons, bocas e legendas
  const som = [];
  for (const c of tl.audios) som.push(`som ${c.a.name} ${c.start.toFixed(3)}-${c.end.toFixed(3)}${c.a.lips ? ` boca de ${c.a.lips}: ${(W.film.cuesOf(c.a) || []).map((q) => q.value + '@' + q.start).join(' ')}` : ''}`);
  for (const lang of W.film.langs(model)) som.push(`legendas (${lang})`, W.audio.srt(W.film.subtitles(model, 0, tl.duration, lang)));
  await check(group, 'som.txt', 'text', som.join('\n') + '\n');

  // linha do tempo para o editor de vídeo: um vídeo por plano e os sons, com caminhos relativos
  const dir = path.dirname(file);
  const pl = W.nle.plan(model, {
    videos: tl.entries.map((e) => ({ file: `${group}_${e.name.replace(/[^\w.-]+/g, '_')}.mov`, start: e.start, frames: e.frames })),
    audioPath: (c) => (c.media && c.media.path ? path.relative(dir, c.media.path).split(path.sep).join('/') : null),
    scale: 0.5,
  });
  await check(group, 'editor.edl', 'text', W.nle.edl(pl, group));
  await check(group, 'editor.fcpxml', 'text', W.nle.fcpxml(pl, group));

  // a linha do tempo do editor (planos, forma de onda dos sons, bocas e legendas)
  const tcv = createCanvas(10, 10);
  Object.assign(tcv, { clientWidth: 900, style: {}, addEventListener() {} });
  const noop = () => {};
  W.timelineView(tcv, { model: () => model, frame: () => Math.floor(tl.frames / 2), setFrame: noop, range: () => [0, tl.frames], editable: (ow) => ow === model, lineOf: () => -1, gotoLine: noop, edit: noop, open: noop, hint: noop }).draw();
  await check(group, 'linha_do_tempo.png', 'png', tcv);

  const picks = [0.08, 0.2, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95].map((k) => Math.floor(tl.frames * k));
  const imgs = picks.map((f) => W.film.renderFrame(model, f, { scale: 0.2, subs: true }));
  const w = imgs[0].width, h = imgs[0].height;
  const sheet = createCanvas(w * 3, h * 3), x = sheet.getContext('2d');
  imgs.forEach((c, i) => x.drawImage(c, (i % 3) * w, Math.floor(i / 3) * h));
  await check(group, 'quadros.png', 'png', sheet);
}

// som: os .wav dos exemplos são os do gerador, a leitura de WAV (8/16/24 bits, float, estéreo), o lip sync
// automático, as bocas do Rhubarb (.json e .tsv) e as legendas
async function audioCase() {
  console.log(paint('1', '_audio'));
  const lines = [];
  for (const [name, gen] of Object.entries(W.exampleMedia)) {
    const disk = fs.readFileSync(path.join(EX, name));
    const made = Buffer.from(gen());
    record(disk.equals(made), `_audio/${name}`, 'o arquivo em exemplos/ não é o que o gerador (js/examples.js) faz: gere de novo');
    lines.push(`${name}: ${made.length} bytes, sha ${crypto.createHash('sha256').update(made).digest('hex').slice(0, 16)}`);
  }
  // o mesmo som em vários formatos de WAV dá (quase) as mesmas amostras
  const rate = 8000, n = 400, sig = Float32Array.from({ length: n }, (_, i) => 0.6 * Math.sin(i / 7) * Math.min(1, i / 50));
  const wav = (bits, fmt, ch) => {
    const bps = bits / 8, buf = Buffer.alloc(44 + n * bps * ch);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * bps * ch, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(fmt, 20); buf.writeUInt16LE(ch, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * bps * ch, 28); buf.writeUInt16LE(bps * ch, 32); buf.writeUInt16LE(bits, 34);
    buf.write('data', 36); buf.writeUInt32LE(n * bps * ch, 40);
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
      const o = 44 + (i * ch + c) * bps, v = sig[i];
      if (fmt === 3) buf.writeFloatLE(v, o);
      else if (bits === 8) buf.writeUInt8(Math.round(v * 127 + 128), o);
      else if (bits === 16) buf.writeInt16LE(Math.round(v * 32767), o);
      else buf.writeIntLE(Math.round(v * 8388607), o, 3);
    }
    return buf;
  };
  for (const [bits, fmt, ch] of [[8, 1, 1], [16, 1, 2], [24, 1, 1], [32, 3, 2]]) {
    const w = W.audio.parseWav(wav(bits, fmt, ch));
    let err = 0;
    for (let i = 0; i < n; i++) err = Math.max(err, Math.abs(w.mono[i] - sig[i]));
    record(err < 0.02 && w.frames === n && w.sampleRate === rate, `_audio/wav${bits}${fmt === 3 ? 'f' : ''}x${ch}`, `erro máximo ${err.toFixed(4)}, ${w.frames} amostras`);
  }
  const fala = W.audio.parseWav(fs.readFileSync(path.join(EX, 'som/coruja_fala.wav')));
  lines.push('lip sync automático: ' + W.audio.lipCues(fala.mono, fala.sampleRate).map((c) => `${c.value}@${c.start}-${c.end}`).join(' '));
  const json = '{"metadata":{"duration":1.2},"mouthCues":[{"start":0.00,"end":0.2,"value":"X"},{"start":0.2,"end":0.5,"value":"D"},{"start":0.5,"end":0.7,"value":"g"},{"start":0.7,"end":1.2,"value":"X"}]}';
  const tsv = '0.00\tX\n0.20\tD\n0.50\tG\n0.70\tX\n';
  const fromJson = W.audio.parseCues(json), fromTsv = W.audio.parseCues(tsv);
  lines.push('rhubarb json: ' + fromJson.map((c) => `${c.value}@${c.start}-${c.end}`).join(' '), 'rhubarb tsv: ' + fromTsv.map((c) => `${c.value}@${c.start}-${c.end}`).join(' '));
  lines.push('boca em 0.3s / 0.6s / 2s: ' + [0.3, 0.6, 2].map((t) => W.audio.cueAt(fromJson, t)).join(' '));
  const subs = [{ start: 0.5, end: 2.25, text: 'Olá' }, { start: 3661.2, end: 3662, text: 'linha 1\nlinha 2' }];
  lines.push(W.audio.srt(subs), W.audio.vtt(subs));
  await check('_audio', 'audio.txt', 'text', lines.join('\n') + '\n');
}

// codificador de GIF com quadros sintéticos: o mesmo resultado em qualquer máquina
async function gifCase() {
  console.log(paint('1', '_gif'));
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const c = createCanvas(64, 48);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, '#203060');
    g.addColorStop(1, '#f0c040');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 48);
    x.fillStyle = '#e04040';
    x.fillRect(4 + f * 8, 10, 12, 12);
    frames.push(x.getImageData(0, 0, 64, 48));
  }
  // os pixels de entrada passam pelo canvas: o hash deles entra no texto para separar
  // "o canvas mudou" de "o codificador mudou"
  const inHash = crypto.createHash('sha256').update(Buffer.concat(frames.map((f) => Buffer.from(f.data.buffer)))).digest('hex').slice(0, 16);
  const plain = W.gif.encode(frames, { delay: frames.map(() => 8), loop: 0 });
  const dith = W.gif.encode(frames, { delay: frames.map(() => 8), loop: 0, dither: true });
  const h = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex').slice(0, 16);
  await check('_gif', 'gif.txt', 'text', `entrada ${inHash}\nnormal ${h(plain)} ${plain.length}\npontilhado ${h(dith)} ${dith.length}\n`);
}

async function main() {
  const t0 = Date.now();
  const files = fs.readdirSync(EX).filter((f) => f.endsWith('.weasel')).sort().map((f) => path.join(EX, f));
  for (const f of files) {
    if (only.length && !only.some((o) => path.basename(f).includes(o))) continue;
    const m = load(f);
    if (m.film) await filmCases(f);
    else await drawingCases(f);
  }
  const cases = fs.existsSync(CASES) ? fs.readdirSync(CASES).filter((f) => f.endsWith('.weasel')).sort().map((f) => path.join(CASES, f)) : [];
  for (const f of cases) {
    if (only.length && !only.some((o) => path.basename(f).includes(o))) continue;
    if (load(f).film) await filmCases(f, 'caso_');
    else await drawingCases(f, 'caso_', true);
  }
  if (!only.length || only.some((o) => '_gif'.includes(o))) await gifCase();
  if (!only.length || only.some((o) => '_audio'.includes(o))) await audioCase();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  if (UPDATE) console.log(`referências regravadas (${results.updated} conferidas, ${results.new} novas) em ${secs}s`);
  else console.log(`${results.fail ? paint('31;1', `${results.fail} falha(s)`) : paint('32;1', 'tudo igual')} · ${results.ok} conferidos${results.new ? ` · ${results.new} referências novas` : ''} · ${secs}s`);
  if (results.fail) {
    console.log('\nSe a mudança foi de propósito, confira as imagens em test/out/ e rode "npm run test:update".');
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(3); });
