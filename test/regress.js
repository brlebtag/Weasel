#!/usr/bin/env node
/* Weasel — testes de regressão: renderiza os exemplos e compara com as imagens e textos de
   referência em test/ref/. Garante que mudanças novas (filme, etc.) não mexem no que já existe
   (sprite sheets, Godot, SVG, poses, variantes). Os arquivos de test/casos/ testam uma função
   cada (pontos de encaixe, peças das variantes, ordem de pintura, desenhar aos poucos, transições,
   imagens guia).

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
  // art ascii: as letras do .txt (o mesmo que weasel arquivo.weasel -o pose.txt)
  if (model.art && model.art.style === 'ascii') await check(group, 'pose.txt', 'text', X.imageCanvas(model, null, 0, o).artText);

  // imagens guia (ref): ficam fora de tudo acima; com --refs, a linha de comando desenha por baixo
  if (model.refs.length) {
    fs.mkdirSync(OUT, { recursive: true });
    const shots = [['com_guias.png', []]].concat(model.anims.map((a) => [`com_guias_${a.name}.png`, ['-a', a.name, '--frame', String(Math.floor(a.frames / 2))]]));
    for (const [name, extra] of shots) {
      const out = path.join(OUT, `${group}_${name}`);
      const r = spawnSync(process.execPath, [CLI, file, '--refs', '-s', '0.5', '--quiet', '-o', out, ...extra], { encoding: 'utf8' });
      if (r.status) { record(false, `${group}/${name}`, r.stderr.trim()); continue; }
      const img = await loadImage(fs.readFileSync(out));
      const c = createCanvas(img.width, img.height);
      c.getContext('2d').drawImage(img, 0, 0);
      await check(group, name, 'png', c);
    }
  }

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
  // a trajetória dos pés (anim feet=), como no --trajectory da linha de comando
  for (const a of model.anims) if (a.feet && a.feet.length) await check(group, `${a.name}_trajetoria.png`, 'png', X.trajectoryCanvas(model, a.name, 0, { scale: 0.5, transparent: false }));

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
    const who = fs2.who.filter((w) => !w.stage).map((w) => `${w.ac.name}=${r2(w.x)},${r2(w.y)}${w.anim ? ` ${w.anim}#${w.animFrame}` : ''}${w.flip[0] < 0 ? ' flip' : ''}${w.show ? '' : ' oculto'}${w.opacity < 1 ? ` op${r2(w.opacity)}` : ''}${w.morph ? ` (metamorfose ${w.morph.A.ac.name}->${w.morph.B.ac.name} ${r2(w.morph.u)})` : ''}`);
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

  // art: o quadro do meio de cada plano maior (na folha pequena o estilo some), e as letras quando o
  // quadro é todo ascii
  if (W.art.has(model)) {
    for (const e of tl.entries) {
      const img = W.film.renderFrame(model, e.start + Math.floor(e.frames / 2), { scale: 0.5 });
      const id = e.name.replace(/[^\w.-]+/g, '_');
      await check(group, `estilo_${id}.png`, 'png', img);
      if (img.artText) await check(group, `estilo_${id}.txt`, 'text', img.artText);
    }
  }
}

// at … morph=: a metamorfose (test/casos/metamorfose.weasel). Confere os erros e avisos de morph=, dur=, pairs= e
// born=, o casamento com e sem pairs= e born=, quem aparece em cada quadro (os dois atores viram um só durante a troca,
// e no fim um some e o outro aparece) e que, no começo da troca, o quadro é igual ao da aranha sozinha.
async function morphCase() {
  console.log(paint('1', '_metamorfose'));
  const src = fs.readFileSync(path.join(CASES, 'metamorfose.weasel'), 'utf8');
  const parse = (s) => W.lang.parse(s, { file: 'metamorfose.weasel', resolve: resolver(CASES) });
  const msgs = (s) => parse(s).errors.map((e) => `${e.level} linha ${e.line + 1}: ${e.msg}`);
  const line = 'at 0.5s aranha.pos=130,140 aranha.morph=jacare dur=1.5s pairs=abdomen->corpo born=focinho->cabeca';
  const head = 'at 0.5s aranha.pos=130,140 aranha.morph=jacare';
  // as variações (menos a da troca em cima da outra) ficam sem a volta do jacaré para aranha, que só repetiria os avisos
  const one = src.replace(/\r?\nat 2\.25s jacare\.morph=aranha dur=0\.5s/, '');
  const lines = [];
  for (const [what, a, b] of [
    ['dur= com +', line, `${head} dur=+1.5s`],
    ['dur= zero', line, `${head} dur=0s`],
    ['dur= sem morph=', line, 'at 0.5s aranha.pos=130,140 dur=1.5s'],
    ['pairs= e born= sem morph=', line, 'at 0.5s aranha.pos=130,140 pairs=abdomen->corpo born=focinho->cabeca'],
    ['ator que não existe', line, 'at 0.5s aranha.morph=sapo'],
    ['o mesmo ator', line, 'at 0.5s aranha.morph=aranha'],
    ['pairs= com dois pontos', line, `${head} pairs=abdomen:corpo`],
    ['pairs= ao contrário', line, `${head} pairs=corpo->abdomen`],
    ['born= de uma parte que não existe', line, `${head} born=nariz->cabeca`],
    ['born= com a outra parte no mesmo ator', line, `${head} born=focinho->rabo`],
    ['jacaré sem hidden', ' anim=anda hidden', ' anim=anda'],
    ['uma troca em cima da outra', 'at 2.25s jacare.morph=aranha dur=0.5s', 'at 1.5s jacare.morph=aranha dur=0.5s'],
    ['sem dur= (1s)', line, `${head} pairs=abdomen->corpo`],
  ]) lines.push(`${what}: ${msgs((what === 'uma troca em cima da outra' ? src : one).replace(a, b)).join(' | ') || 'nenhum aviso'}`);
  lines.push(`o arquivo: ${msgs(src).join(' | ') || 'nenhum aviso'}`);

  const pn = W.scene.partName, list = (xs) => xs.map(([x, y]) => `${pn(x)}->${pn(y)}`).join(', ') || '-';
  for (const [what, txt] of [['o arquivo', src], ['sem pairs= e born=', src.replace(' pairs=abdomen->corpo born=focinho->cabeca', '')]]) {
    const m = parse(txt), sh = m.film.shots[0];
    for (const mo of sh.morphs) {
      const p = W.film.morphPlan(sh, mo);
      lines.push(`plano (${what}) ${mo.from}->${mo.to} em ${mo.t}s, ${mo.dur}s: vira ${list(p.pairs)} · nascem ${list(p.born)} · somem ${list(p.gone)}`);
    }
  }
  const m = parse(src), sh = m.film.shots[0], r2 = (v) => Math.round(v * 100) / 100;
  const keys = (n) => (sh.tracks.get(`actor:${n}.show`) || { keys: [] }).keys.map((k) => `${k.t}s=${k.v}`).join(' ') || '-';
  lines.push(`show: aranha ${keys('aranha')} · jacare ${keys('jacare')}`);
  const free = (t) => parse(t.replace('film fps=8 dur=3s', 'film fps=8')).film.shots[0].dur;
  lines.push(`sem o dur= do film: o filme vai até o fim da última metamorfose (${free(src)}s; sem ela, ${free(src.replace(' jacare.morph=aranha dur=0.5s', ' aranha.pos=130,140'))}s)`);
  for (const f of [3, 4, 7, 10, 15, 16, 18, 19, 22, 23]) {
    const st = W.film.frameState(m, f);
    lines.push(`#${f} ${r2(f / 8)}s: ${st.who.filter((w) => !w.stage && w.show).map((w) => (w.morph ? `${w.morph.A.ac.name}->${w.morph.B.ac.name} u=${r2(w.morph.u)} depth ${r2(w.depth)} (${w.ac.name} na frente)` : w.ac.name)).join(', ')}`);
  }
  // no começo da troca (u=0), o desenho é o da aranha sozinha (o jacaré escondido, sem metamorfose)
  const solo = parse(src.replace(' aranha.morph=jacare dur=1.5s pairs=abdomen->corpo born=focinho->cabeca', '').replace('at 2.25s jacare.morph=aranha dur=0.5s', 'at 2.25s aranha.pos=130,140'));
  const px = (mm, f) => { const c = W.film.renderFrame(mm, f, { scale: 1 }); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
  const A = px(m, 4), B = px(solo, 4);
  let diff = 0, big = 0;
  for (let i = 0; i < A.length; i += 4) {
    const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
    if (d > 2) diff++;
    if (d > 40) big++;
  }
  lines.push(`#4 (u=0) contra a aranha sozinha: ${diff} pixels diferentes, ${big} muito diferentes`);
  await check('_metamorfose', 'metamorfose.txt', 'text', lines.join('\n') + '\n');
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

// prévia do def (editor): o def sozinho em 0,0 com outros valores, sem mexer no desenho nem nos erros do código
async function previewCase() {
  console.log(paint('1', '_previa'));
  const src = [
    'canvas 300 200 bg=#e8eef4',
    'palette pele=#e0b080',
    'gradient ceu linear 0,0 0,40 : #88ccff #ffffff',
    'def bola r=20 c=pele cor2=red fundo=ceu',
    '  ellipse corpo 0,0 {r} c=c ink=2',
    '  rect nariz {r},0 10,6 c=cor2 cut=furo',
    '  ellipse furo {r+5},3 2',
    '  use olho 0,{-r/2}',
    '  rect placa -10,{r+4} 20,8 c=fundo',
    'end',
    'def olho t=4',
    '  ellipse o 0,0 {t} c=black',
    'end',
    'use bola 100,100 r=30',
    '',
  ].join('\n');
  const opts = (preview) => ({ file: 'previa.weasel', resolve: () => null, preview });
  const plain = W.lang.parse(src, opts(null));
  const m = W.lang.parse(src, opts({ def: 'bola', params: { r: '40', cor2: 'blue' } }));
  const errs = (x) => x.errors.map((e) => `${e.line}:${e.msg}`).join('|');
  record(errs(m) === errs(plain) && m.elements.length === plain.elements.length && m.layers.length === plain.layers.length, '_previa/desenho', 'a prévia mudou o desenho ou os erros do código');
  record(m.defs.get('bola').uses === 1 && m.defs.get('olho').uses === 1, '_previa/uses', 'a prévia contou como use');
  const P = m.preview, lines = [`def ${P.def} na linha ${P.line + 1}`];
  for (const q of P.params) lines.push(`  ${q.key}=${q.text} (${q.kind}, padrão ${q.def}${q.changed ? ', mudou' : ''}) → ${q.value === undefined ? '-' : q.value}`);
  for (const el of P.elements) lines.push(`  ${el.type} ${el.name} linha ${el.line + 1}${el.use !== undefined ? ` (use da linha ${el.use + 1})` : ''}${el.xf ? ` xf ${el.xf.map((v) => +v.toFixed(2)).join(',')}` : ''}${el.cuts ? ` cut ${el.cuts.map((c) => c.name).join(',')}` : ''}`);
  for (const i of [4, 5, 7]) {
    const rec = m.byLine.get(i);
    lines.push(`  alças da linha ${i + 1}${rec.el && P.elements.includes(rec.el) ? ' (da prévia)' : rec.use ? ' (use)' : ''}: ${rec.handles.map((h) => `${h.kind}${h.fixed ? '!' : ''} ${+h.x.toFixed(2)},${+h.y.toFixed(2)}`).join(' · ')}`);
  }
  const bad = W.lang.parse(src, opts({ def: 'bola', params: { c: 'xyzzy' } }));
  lines.push(`cor errada: ${bad.errors.length} erro(s) no código; na prévia: ${bad.preview.errors.map((e) => `linha ${e.line + 1}: ${e.msg}`).join(' · ')}`);
  await check('_previa', 'previa.txt', 'text', lines.join('\n') + '\n');
  await check('_previa', 'previa.png', 'png', W.scene.renderImage(P.model, W.scene.makePose(P.model, null, 0), { rect: { x: -60, y: -50, w: 130, h: 110 }, scale: 2 }));
}

// contas dentro de {}: as de antes dão o mesmo resultado; as novas (smoothstep, comparações, c ? a : b e mod), os
// erros delas e o leitor da linha (o = de dentro das chaves não vira atributo)
async function exprCase() {
  console.log(paint('1', '_contas'));
  const vars = new Map([['i', 12], ['f', 0], ['r', 80], ['cx', 200]]);
  const run = (s) => { try { return String(+W.lang.evalExpr(s, vars).toFixed(6)); } catch (e) { return `erro: ${e.message}`; } };
  const old = [['200+40', '240'], ['r*1.5', '120'], ['10/4', '2.5'], ['2+3*4', '14'], ['(2+3)*4', '20'], ['7%3', '1'], ['-7%3', '-1'], ['(f-3)%12', '-3'],
    ['2^3', '8'], ['-2^2', '-4'], ['cx-20', '180'], ['lerp(100,300,0.25)', '150'], ['dist(0,0,30,40)', '50'], ['atan2(1,1)', '45'], ['clamp(r,10,50)', '50'],
    ['round(2.5)', '3'], ['rand(3)', '0.763092'], ['rand(7,-4,4)', '-3.34165']];
  const bad = old.filter(([s, want]) => run(s) !== want);
  record(!bad.length, '_contas/antigas', bad.map(([s]) => `{${s}} deu ${run(s)}`).join('; '));
  const novas = ['smoothstep(10,20,5)', 'smoothstep(10,20,15)', 'smoothstep(10,20,25)', 'smoothstep(10,20,i)', 'smoothstep(20,10,12)', 'smoothstep(5,5,4)', 'smoothstep(5,5,5)',
    'i<12', 'i<=12', 'i>12', 'i>=12', 'i==12', 'i!=12', '1+2<4', '1<2==1', 'i<6 ? 0 : 30', 'i<13 ? 0 : 30', '0 ? 1 : 2 ? 3 : 4', '1 ? 2 : 3+10', 'max(i>5 ? 3 : 1, 2)', '(i>=12)*5',
    'mod(-3,12)', 'mod(f-3,12)', 'mod(-7,3)', 'mod(7,3)', 'mod(7.5,2)',
    'i=12', '1 ? 2', 'i<', 'mod(5)', 'smoothstep(1,2)', 'mod(5,0)'];
  const lines = novas.map((s) => `{${s}} → ${run(s)}`);
  const src = 'canvas 100 100\nlet a={3>=2 ? 10 : 20} b={mod(-1,4)}\nrect r {a},{b} 10,10 opacity={a!=10 ? 1 : 0.5}\nrepeat i 0..{a>5 ? 2 : 0}\nellipse e {i*10},{i==1 ? 50 : 0} 3\nend\n';
  const m = W.lang.parse(src, { file: 'contas.weasel', resolve: () => null });
  const R = m.named.get('r')[0], E = m.named.get('e') || [];
  lines.push('', `no arquivo: ${m.errors.length} erro(s); rect r em ${R.xy} opacity ${R.opacity}; ${E.length} ellipse e em ${E.map((e) => e.center.join(',')).join(' ')}`);
  await check('_contas', 'contas.txt', 'text', lines.join('\n') + '\n');
}

// o Simplificar (js/simplify.js; o menu Objeto › Caminho › Simplificar, o Lápis, o Pincel e o --simplify): a conta
// de cada trecho é a mesma do geom.smoothSegs; formas com muitos pontos ficam com poucos e dentro da tolerância
// (medida aqui, nos dois sentidos); os cantos ganham !; os pontos que ficam não mudam (com o @osso); à mão livre; e as
// linhas que a troca de forma usa
async function simplifyCase() {
  console.log(paint('1', '_simplificar'));
  const G = W.geom, Sm = W.simplify, L = W.lang;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let bad = 0;
  for (let t = 0; t < 200; t++) {
    const n = 2 + Math.floor(rnd() * 7), closed = rnd() < 0.5, smooth = rnd() < 0.2 ? 0 : 0.5 + rnd();
    const P = Array.from({ length: n }, () => {
      const o = { x: rnd() * 200, y: rnd() * 200, corner: rnd() < 0.2 };
      if (rnd() < 0.25) { o.tan = [rnd() * 40 - 20, rnd() * 40 - 20]; o.corner = false; if (rnd() < 0.5) o.tin = [rnd() * 40 - 20, rnd() * 40 - 20]; }
      return o;
    });
    G.smoothSegs(P, closed, smooth).forEach((s, j) => { if (Sm.span(P, closed, 0.36 * smooth, j).some((v, i) => Math.abs(v - s[i]) > 1e-9)) bad++; });
  }
  record(!bad, '_simplificar/trecho', `${bad} trecho(s) diferentes do geom.smoothSegs`);
  // a curva de uma linha, em pontos densos, e o maior afastamento entre duas
  const dense = (text) => {
    const sp = L.splitLine(text), pts = sp.points.map(L.parsePoint), cmd = sp.words[0].text, sw = sp.words.find((w) => w.text.startsWith('smooth=')), smooth = sw ? Number(sw.text.slice(7)) : 1;
    const segs = cmd === 'line' || smooth <= 0 ? G.polySegs(pts, cmd === 'shape') : G.smoothSegs(pts, cmd === 'shape', smooth), out = [];
    for (const s of segs) for (let i = 0; i <= 40; i++) { const t = i / 40, u = 1 - t; out.push([u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6], u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7]]); }
    return out;
  };
  const d2 = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]); };
  const far = (A, B) => { let m = 0; for (const p of A) { let d = Infinity; for (let i = 0; i + 1 < B.length; i++) d = Math.min(d, d2(p, B[i], B[i + 1])); m = Math.max(m, d); } return m; };
  const f1 = (v) => Math.round(v * 10) / 10;
  const circ = (cx, cy, r, n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return `${f1(cx + r * Math.cos(a))},${f1(cy + r * Math.sin(a))}`; }).join(' ');
  const star = [];
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 10) * Math.PI * 2 - Math.PI / 2, r0 = i % 2 ? 50 : 120, r1 = i % 2 ? 120 : 50;
    const p0 = [200 + r0 * Math.cos(a0), 200 + r0 * Math.sin(a0)], p1 = [200 + r1 * Math.cos(a1), 200 + r1 * Math.sin(a1)];
    for (let j = 0; j < 30; j++) star.push(`${f1(p0[0] + ((p1[0] - p0[0]) * j) / 30)},${f1(p0[1] + ((p1[1] - p0[1]) * j) / 30)}`);
  }
  const bean = Array.from({ length: 600 }, (_, i) => { const a = (i / 600) * Math.PI * 2, r = 150 + 40 * Math.sin(2 * a) + 15 * Math.cos(5 * a); return `${f1(200 + r * Math.cos(a))},${f1(200 + r * Math.sin(a) * 0.7)}`; }).join(' ');
  const wave = Array.from({ length: 150 }, (_, i) => `${f1(20 + i * 2.4)},${f1(230 + 20 * Math.sin(i / 12))}`).join(' ');
  const zig = Array.from({ length: 60 }, (_, i) => `${i * 5},${f1(100 + (i % 10 < 5 ? i % 10 : 10 - (i % 10)) * 10)}`).join(' ');
  const LINES = [
    ['círculo de 120', 'shape c c=red : ' + circ(200, 200, 80, 120), 1.5],
    ['círculo de 120, tolerância 0.3', 'shape c c=red : ' + circ(200, 200, 80, 120), 0.3],
    ['estrela de 300 (pontas lisas)', 'shape s c=red : ' + star.join(' '), 1.5],
    ['feijão de 600', 'shape f c=red : ' + bean, 1.5],
    ['onda (stroke)', 'stroke o w=4 : ' + wave, 1],
    ['onda com smooth=0.5', 'stroke o w=4 smooth=0.5 : ' + wave, 1],
    ['zigue-zague (line)', 'line z w=2 : ' + zig, 0.5],
    ['quadrado de cantos com pontos no meio (smooth=0)', 'shape q c=red smooth=0 : 0,0 50,0 100,0 100,50 100,100 50,100 0,100 0,50', 0.5],
    ['preso a ossos', 'stroke r w=4 : 220,180 230,165 240,150 250,140~0,-30~30,0@b 260,150@b 270,160@b 280,165@b 290,170@b # rabo', 1.5],
    ['com alças', 'shape a c=red : 0,0~20,0 50,-5 100,0~20,0 100,100 50,105 0,100', 2],
    ['poucos pontos', 'shape t c=red : 0,0 10,0 10,10', 1],
    ['contas', 'shape t c=red : 0,0 {a},0 10,10 5,5', 1],
    ['membro', 'stroke perna limb=8,6 hip=0,0 foot=10,40', 1],
    ['retângulo', 'rect r 0,0 10,10', 1],
  ];
  const lines = [];
  for (const [what, text, tol] of LINES) {
    const r = Sm.line(text, tol);
    if (r.why) { lines.push(`${what}: ${r.why}${r.minor ? ' (minor)' : ''}`); continue; }
    const e = Math.max(far(dense(text), dense(r.text)), far(dense(r.text), dense(text)));
    record(e <= tol * 1.02, `_simplificar/${what}`, `afastou ${e.toFixed(3)} com tolerância ${tol}`);
    lines.push(`${what}: ${r.before} → ${r.after} pontos (tolerância ${tol}; cantos novos: ${r.corners.length})`, `  ${r.text}`);
  }
  // à mão livre: uma espiral e um quadrado tremidos
  const spiral = [], sq = [];
  for (let i = 0; i < 600; i++) { const a = i / 40, r = 10 + i * 0.2; spiral.push([Math.round(200 + r * Math.cos(a) + (rnd() - 0.5)), Math.round(200 + r * Math.sin(a) + (rnd() - 0.5))]); }
  for (const [a, b] of [[[50, 50], [250, 50]], [[250, 50], [250, 250]], [[250, 250], [50, 250]], [[50, 250], [50, 52]]]) for (let i = 0; i < 80; i++) sq.push([Math.round(a[0] + ((b[0] - a[0]) * i) / 80 + (rnd() - 0.5)), Math.round(a[1] + ((b[1] - a[1]) * i) / 80 + (rnd() - 0.5))]);
  const fmt = (pts) => pts.map((p) => `${f1(p.x)},${f1(p.y)}${p.corner ? '!' : ''}`).join(' ');
  lines.push('', `espiral à mão (600 pontos do mouse, tolerância 2): ${fmt(Sm.freehand(spiral, false, 2))}`);
  lines.push(`quadrado à mão (fechado, tolerância 2): ${fmt(Sm.freehand(sq, true, 2))}`);
  lines.push('', `usos de gota: ${Sm.uses('shape gota c=#123\nkey 0 b=0 gota.shape=gota2\n# gota.shape=x\nmouth boca A=gota B=gota22\nat 1s x.y.shape=gota\nshape gotas c=#1 : 0,0', 'gota').map((i) => i + 1).join(', ')}`);
  await check('_simplificar', 'simplificar.txt', 'text', lines.join('\n') + '\n');
}

// as operações entre formas (js/pathops.js: o Pathfinder, o Pincel de bolha e a Borracha do editor): os cantos das
// retas saem exatos, a área bate com a conta e os pontos que a borracha não tocou continuam os mesmos
async function pathsCase() {
  console.log(paint('1', '_caminhos'));
  const G = W.geom, P = W.pathops;
  const f2 = (v) => String(Number(v.toFixed(2)));
  const show = (pts) => pts.map((p) => `${f2(p.x)},${f2(p.y)}${p.corner ? '!' : ''}${p.frozen ? `~${p.tin.map(f2)}~${p.tan.map(f2)}` : ''}${p.tag ? '#' + p.tag.i : ''}`).join(' ');
  const rectRing = (x, y, w, h) => P.ring(G.rectSegs(x, y, w, h, 0, 0), 1, null, true);
  const circRing = (cx, cy, r) => P.ring(G.ellipseSegs(cx, cy, r, r, 0), 1, null, true);
  // a área da curva que sai (a curva lisa do Weasel pelos pontos), menos os furos
  const areaOf = (pts) => { const segs = G.smoothSegs(pts, true, 1), f = G.flatten(segs, 0.2); let a = 0; for (let i = 0; i + 3 < f.length; i += 2) a += f[i] * f[i + 3] - f[i + 2] * f[i + 1]; return Math.abs(a / 2); };
  const total = (r) => r.pieces.reduce((s, pc) => s + areaOf(pc.outer) - pc.holes.reduce((t, h) => t + areaOf(h), 0), 0);
  const O = { cell: 0.4, tol: 0.5 };
  const U = (b) => b.some((x) => x), MINUS = (b) => b[0] && !b.slice(1).some((x) => x), INTER = (b) => b.every((x) => x), XOR = (b) => b.filter((x) => x).length % 2 === 1;
  const pi = Math.PI, lines = [];
  // a área de dois círculos de raio r a d de distância (a lente do meio)
  const lens = (r, d) => 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d);
  const CASES = [
    ['retângulo menos retângulo', [{ rings: [rectRing(0, 0, 100, 60)] }, { rings: [rectRing(70, 30, 60, 60)] }], null, MINUS, 6000 - 900],
    ['retângulo mais retângulo', [{ rings: [rectRing(0, 0, 100, 60)] }, { rings: [rectRing(70, 30, 60, 60)] }], null, U, 6000 + 3600 - 900],
    ['excluir (dois retângulos)', [{ rings: [rectRing(0, 0, 100, 60)] }, { rings: [rectRing(50, 30, 100, 60)] }], null, XOR, 12000 - 2 * 1500],
    ['retângulo e círculo: interseção', [{ rings: [rectRing(0, 0, 100, 60)] }, { rings: [circRing(100, 60, 30)] }], null, INTER, (pi * 900) / 4],
    ['furo no meio', [{ rings: [rectRing(0, 0, 100, 60)] }, { rings: [circRing(50, 30, 15)] }], null, MINUS, 6000 - pi * 225],
    ['dois círculos unidos', [{ rings: [circRing(0, 0, 30)] }, { rings: [circRing(40, 0, 30)] }], null, U, 2 * pi * 900 - lens(30, 40)],
    ['furo que já existia, com borracha longe dele', [{ rings: [rectRing(0, 0, 100, 60)], holes: [circRing(30, 30, 10)] }], { path: [[100, 30]], r: 10 }, MINUS, 6000 - pi * 100 - (pi * 100) / 2],
  ];
  for (const [what, items, brush, keep, want] of CASES) {
    const r = P.combine(items, brush, keep, O), a = total(r);
    record(Math.abs(a - want) <= want * 0.01, `_caminhos/${what}`, `área ${a.toFixed(1)}, a conta dá ${want.toFixed(1)}`);
    lines.push(`${what}: ${r.pieces.length} pedaço(s), área ${a.toFixed(0)} (a conta: ${want.toFixed(0)})`);
    for (const pc of r.pieces) { lines.push(`  ${show(pc.outer)}`); pc.holes.forEach((h, j) => lines.push(`  furo${pc.holeSrc[j] ? ' (é um anel de antes, inteiro)' : ''}: ${show(h)}`)); }
  }
  // um shape de 6 pontos: a borracha numa ponta e o pincel; os pontos longe ficam como estavam
  const pts = [[0, 0], [60, -10], [120, 0], [130, 50], [60, 70], [-10, 50]].map(([x, y], i) => ({ x, y, corner: i === 0 }));
  const shapeItem = () => ({ rings: [P.ring(G.smoothSegs(pts, true, 1), 1, pts.map((p, i) => ({ i, corner: p.corner })), true)] });
  for (const [what, brush, keep, stay] of [
    ['shape com borracha na ponta', { path: [[125, 20], [140, 40]], r: 12 }, (b) => b[0] && !b[1], [0, 1, 2, 3, 4, 5]],
    ['shape com pincel de bolha', { path: [[125, 20], [160, 40]], r: 10 }, (b) => b[0] || b[1], [0, 1, 2, 3, 4, 5]],
    ['shape cortado em dois', { path: [[60, -30], [60, 90]], r: 8 }, (b) => b[0] && !b[1], [0, 2, 3, 5]],
    ['sem tocar', { path: [[300, 300]], r: 5 }, (b) => b[0], [0, 1, 2, 3, 4, 5]],
  ]) {
    const r = P.combine([shapeItem()], brush, keep, O);
    const got = new Set(r.pieces.flatMap((pc) => pc.outer.filter((p) => p.tag && !p.frozen).map((p) => p.tag.i)));
    const froz = new Set(r.pieces.flatMap((pc) => pc.outer.filter((p) => p.tag && p.frozen).map((p) => p.tag.i)));
    const lost = stay.filter((i) => !got.has(i) && !froz.has(i));
    record(!lost.length, `_caminhos/${what}`, `os pontos ${lost.join(', ')} sumiram`);
    lines.push(`${what}: ${r.pieces.length} pedaço(s)`);
    for (const pc of r.pieces) lines.push(`  ${show(pc.outer)}`);
  }
  // ---- a etapa 5b: os caminhos exatos (a curva que fica é a mesma de antes) ----
  // como o código escreve cada ponto (pathops.settle): = o texto de antes, ! canto, ~ as alças
  const showN = (N, md) => N.map((p, i) => `${f2(p.x)},${f2(p.y)}${md[i].keep ? '=' : md[i].corner ? '!' : md[i].auto ? '' : `~${md[i].tin.map(f2)}~${md[i].tan.map(f2)}`}${p.tag ? '#' + p.tag.i : ''}`).join(' ');
  // a curva que o código dá com esses pontos (o que o desenho faz com eles)
  const rebuild = (N, md, closed) => G.smoothSegs(N.map((p, i) => {
    const m = md[i], t = p.tag;
    if (m.keep) return { x: p.x, y: p.y, corner: !!(t && t.corner), tan: t && t.tan, tin: t && t.tin };
    if (m.corner) return { x: p.x, y: p.y, corner: true };
    if (m.auto) return { x: p.x, y: p.y };
    return { x: p.x, y: p.y, tan: m.tan, tin: m.tin };
  }), closed, 1);
  // o quanto a curva a sai de fora da curva b (amostras de a, o ponto de b mais perto)
  const off = (a, b) => { let w = 0; for (const s of a) for (let j = 0; j <= 20; j++) { const t = j / 20, u = 1 - t; w = Math.max(w, P.nearestOn(b, u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6], u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7]).d); } return w; };
  const sp = [[0, 0], [50, 30], [100, 0], [150, 30]].map(([x, y]) => ({ x, y }));
  const ss = G.smoothSegs(sp, false, 1), stags = sp.map((p, i) => ({ i }));
  // a Tesoura num stroke: os dois pedaços juntos são o traço de antes
  {
    const q = P.normPos(ss, false, P.nearestOn(ss, 75, 10)), n = ss.length;
    const Ns = [P.subPath(ss, false, stags, { i: 0, t: 0 }, q), P.subPath(ss, false, stags, q, { i: n - 1, t: 1 })];
    const md = Ns.map((N) => P.settle(N, false, 1)), back = Ns.flatMap((N, k) => rebuild(N, md[k], false));
    const e = Math.max(off(back, ss), off(ss, back));
    record(e < 1e-6, '_caminhos/tesoura num stroke', `a curva mudou ${e.toFixed(4)}`);
    lines.push('tesoura num stroke:');
    Ns.forEach((N, k) => lines.push(`  ${showN(N, md[k])}`));
    // e o Juntar dos dois pedaços (as pontas no mesmo lugar viram um ponto)
    const [A0, B0] = Ns, J = A0.slice(0, -1).concat([Object.assign({}, A0[A0.length - 1], { tan: B0[0].tan })], B0.slice(1)), mj = P.settle(J, false, 1);
    const ej = Math.max(off(rebuild(J, mj, false), ss), off(ss, rebuild(J, mj, false)));
    record(ej < 1e-6, '_caminhos/juntar de volta', `a curva mudou ${ej.toFixed(4)}`);
    lines.push(`juntar de volta: ${showN(J, mj)}`);
  }
  // a Borracha num stroke: o corte no lugar exato, e o resto da curva igual
  {
    const runs = P.outside(ss, P.near([[50, 0], [50, 60]], 10), 0.5);
    const Ns = runs.map((r) => P.subPath(ss, false, stags, P.normPos(ss, false, r.a), P.normPos(ss, false, r.b)));
    const md = Ns.map((N) => P.settle(N, false, 1)), back = Ns.flatMap((N, k) => rebuild(N, md[k], false));
    const ends = Ns.length === 2 ? [Ns[0][Ns[0].length - 1].x, Ns[1][0].x] : [];
    record(Ns.length === 2 && Math.abs(ends[0] - 40) < 0.6 && Math.abs(ends[1] - 60) < 0.6 && off(back, ss) < 1e-6, '_caminhos/stroke cortado', `${Ns.length} pedaços, pontas em ${ends.map(f2).join(' e ')}`);
    lines.push(`stroke cortado: ${Ns.length} pedaços`);
    Ns.forEach((N, k) => lines.push(`  ${showN(N, md[k])}`));
  }
  // a Tesoura numa forma: dois cliques na borda de um retângulo; a reta entre eles divide a área ao meio
  {
    const rs = G.rectSegs(0, 0, 100, 60, 0, 0), rt = [0, 1, 2, 3].map((i) => ({ i, corner: true }));
    const a = P.normPos(rs, true, P.nearestOn(rs, 30, -1)), b = P.normPos(rs, true, P.nearestOn(rs, 70, 61));
    const Ns = [[a, b], [b, a]].map(([x, y]) => { const N = P.subPath(rs, true, rt, x, y), f = N[0], l = N[N.length - 1], v = [(f.x - l.x) / 3, (f.y - l.y) / 3]; f.tin = v; l.tan = v.slice(); return P.growNodes(N, true, 3); });
    const ar = Ns.map((N) => Math.abs(P.nodesArea(N)));
    record(Math.abs(ar[0] - 3000) < 1 && Math.abs(ar[1] - 3000) < 1, '_caminhos/tesoura numa forma', `áreas ${ar.map((x) => x.toFixed(1)).join(' e ')}`);
    lines.push('tesoura num retângulo:');
    Ns.forEach((N) => lines.push(`  ${showN(N, P.settle(N, true, 1))}`));
  }
  // a Faca atravessando um círculo e um retângulo: dois pedaços cada, e os dois lados do corte com os mesmos pontos
  {
    const raw = [];
    for (let x = 20; x <= 205; x += 5) raw.push([x, 95 + 10 * Math.sin(x / 30)]);
    const kp = W.simplify.freehand(raw, false, 2);
    const sq = [[40, 40], [160, 40], [160, 140], [40, 140]].map(([x, y]) => ({ x, y, corner: true }));
    for (const [what, it, want] of [
      ['faca num retângulo', { rings: [P.ring(G.smoothSegs(sq, true, 1), 1, sq.map((p, i) => ({ i, corner: true })), true)] }, 12000],
      ['faca num círculo', { rings: [circRing(140, 110, 50)] }, pi * 2500],
    ]) {
      const pcs = P.knife([it], kp, { cell: 0.4, tol: 0.5, smooth: 1 })[0] || [];
      const cut = pcs.map((pc) => new Set(pc.outer.filter((p) => p.corner && !p.tag).map((p) => `${f2(p.x)},${f2(p.y)}`)));
      const shared = cut.length === 2 ? [...cut[0]].filter((k) => cut[1].has(k)).length : 0;
      const a = pcs.reduce((s, pc) => s + areaOf(pc.outer), 0);
      record(pcs.length === 2 && shared >= 2 && Math.abs(a - want) <= want * 0.01, `_caminhos/${what}`, `${pcs.length} pedaços, ${shared} cantos em comum, área ${a.toFixed(0)} (a conta: ${want.toFixed(0)})`);
      lines.push(`${what}: ${pcs.length} pedaços, área ${a.toFixed(0)}`);
      for (const pc of pcs) lines.push(`  ${show(pc.outer)}`);
    }
  }
  // o Construtor de formas: dois círculos, três regiões; juntar a lente com a da esquerda e apagar a lente
  {
    const R = P.regions([{ rings: [circRing(0, 0, 30)] }, { rings: [circRing(40, 0, 30)] }], { cell: 0.4 });
    const big = R.regs.filter((r) => r.n >= 4).map((r) => r.sig).sort().join(',');
    const lensId = P.regionAt(R, 20, 0), leftId = P.regionAt(R, -10, 0);
    const lz = lens(30, 40), all = 2 * pi * 900 - lz;
    const m = P.regionsApply(R, [lensId, leftId], true, { tol: 0.5, smooth: 1 });
    const am = m.merged.reduce((s, pc) => s + areaOf(pc.outer), 0), ar = m.items[1] ? m.items[1].reduce((s, pc) => s + areaOf(pc.outer), 0) : 0;
    const e = P.regionsApply(R, [lensId], false, { tol: 0.5, smooth: 1 });
    const ae = e.items.map((x) => (x ? x.reduce((s, pc) => s + areaOf(pc.outer), 0) : 0));
    const ok = big === '1,2,3' && Math.abs(am - pi * 900) < pi * 9 && m.items[0] && !m.items[0].length && Math.abs(ar - (pi * 900 - lz)) < pi * 9 && ae.every((x) => Math.abs(x - (pi * 900 - lz)) < pi * 9);
    record(ok, '_caminhos/construtor de formas', `regiões ${big}, juntou ${am.toFixed(0)}, sobrou ${ar.toFixed(0)}, apagando a lente ${ae.map((x) => x.toFixed(0)).join(' e ')} (a conta: ${(pi * 900).toFixed(0)}, ${(pi * 900 - lz).toFixed(0)}; tudo ${all.toFixed(0)})`);
    lines.push(`construtor de formas: regiões ${big}; juntar a lente e a esquerda: ${m.merged.length} forma, área ${am.toFixed(0)}; a da direita fica com ${ar.toFixed(0)}; apagar a lente: ${ae.map((x) => x.toFixed(0)).join(' e ')}`);
  }
  await check('_caminhos', 'caminhos.txt', 'text', lines.join('\n') + '\n');
}

// a janela de exportar (folha, Godot e GIF): o mesmo trabalho que o worker do navegador faz (exportJob, js/worker.js),
// com os nomes dos arquivos e o resumo; a folha sai igual à da função de sempre
async function jobCase() {
  console.log(paint('1', '_janela'));
  const src = fs.readFileSync(path.join(CASES, 'contas.weasel'), 'utf8');
  const parse = (v) => W.lang.parse(src, { file: 'contas.weasel', resolve: () => null, variant: v || null });
  const base = { scale: 1, transparent: true, trim: true, margin: 8, layout: 'rows', cols: 0, padding: 2, baseName: 'contas', speed: 1, dither: false };
  const ticks = {};
  const progress = (p, i, n) => { ticks[p] = (ticks[p] || 0) + 1; if (i > n || i < 1) ticks.fora = (ticks.fora || 0) + 1; };
  const lines = [];
  const jobs = [['sheet', { anim: 'pisca' }], ['godot', { anim: 'pisca', normal: true, scene: true, mirror: true }], ['godot', { anim: 'pisca', normal: false, scene: false }], ['gif', { anim: 'pisca' }], ['gif', { anim: X.BUILD }]];
  for (const [kind, extra] of jobs) {
    const r = await X.exportJob(kind, Object.assign({}, base, extra, { format: kind, progress }), parse, [''], false);
    lines.push(`${kind} ${JSON.stringify(extra)}: ${r.name} · ${r.info}${r.png ? ` · só o PNG: ${r.png.name}` : ''}`, `  ${r.names.join(' ')}`);
  }
  lines.push(`avisos de progresso: ${Object.entries(ticks).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  await check('_janela', 'janela.txt', 'text', lines.join('\n') + '\n');
  const r = await X.exportJob('sheet', Object.assign({}, base, { anim: 'pisca', format: 'sheet' }), parse, [''], false);
  const direct = X.sheetCanvas(parse(''), ['pisca'], Object.assign({}, base, { imageName: 'contas_pisca.png' }));
  record(Buffer.from(await r.png.blob.arrayBuffer()).equals(direct.canvas.toBuffer('image/png')), '_janela/folha', 'a folha da janela não é a da função de sempre');
}

// as animações em GIF, WebP e vídeo: a sequência (idle walk*3), os tempos de cada quadro, o ritmo do vídeo,
// o WebP animado (e a figurinha), o MP4 montado em volta de quadros de mentira e o .webp da linha de comando
async function animCase() {
  console.log(paint('1', '_animado'));
  const model = load(path.join(EX, 'furao.weasel'));
  const lines = [];
  const seq = 'idle_down walk_down*2';
  lines.push('sequência: ' + JSON.stringify(X.parseSeq(model, 'idle_down  walk_down * 2, attack_down')));
  for (const bad of ['', 'nada', 'walk_down*0', 'walk_down*x']) {
    try { X.parseSeq(model, bad); lines.push(` "${bad}": sem erro`); } catch (e) { lines.push(` "${bad}": ${e.message}`); }
  }
  lines.push('é sequência: ' + ['walk_down', 'idle_down walk_down', 'walk_down*2', 'a,b', ''].map((s) => `"${s}" ${X.isSeq(s)}`).join(', '));
  const o = { scale: 0.5, transparent: true, trim: true, margin: 8, quality: 0.92, seq };
  const list = X.frameList(model, X.SEQ, o);
  lines.push(`quadros da sequência: ${list.frames.length} (${list.frames.map((x) => x.name + ':' + x.f).filter((_, i) => i % 4 === 0).join(' ')}) · nome ${list.tag}`);
  const build = X.frameList(model, X.BUILD, o);
  lines.push(`pintura: ${build.frames.length} quadros, o último fica ${build.hold} s`);
  for (const [min, src] of [[3, X.SEQ], [0, X.SEQ], [5, 'attack_down'], [3, X.BUILD]]) {
    const v = X.videoFrames(model, src, Object.assign({}, o, { minLength: min, transparent: false }));
    lines.push(`vídeo ${src === X.SEQ ? 'sequência' : src === X.BUILD ? 'pintura' : src} (mínimo ${min} s): ${v.width}×${v.height}, ${v.count} quadros a ${v.fps} fps, ${v.seconds} s, ${v.cycles} volta(s); primeira volta: ${v.index.slice(0, 30).join(',')}${v.index.length > 30 ? '…' : ''}`);
  }
  const wp = await X.webpBytes(model, X.SEQ, o);
  const p = W.webp.parse(wp.bytes);
  lines.push(`webp: ${p.width}×${p.height}, flags ${p.flags}, repete ${p.loop}, ${p.frames.length} quadros; ms ${p.frames.map((f) => f.ms).join(',')}; peças ${p.frames[0].parts.join('+')}; flags dos quadros ${[...new Set(p.frames.map((f) => f.flags))].join(',')}`);
  const st = await X.webpBytes(model, 'attack_down', Object.assign({}, o, { sticker: true }));
  const sp = W.webp.parse(st.bytes);
  lines.push(`figurinha: ${sp.width}×${sp.height}, flags ${sp.flags}, ${sp.frames.length} quadros, cabe em 500 KB: ${st.bytes.length <= 500000}, grande: ${st.big}`);
  // sem perdas e sem transparência: o primeiro quadro do WebP animado é o mesmo do WebP de um quadro só (a montagem
  // não mexe na imagem que o codificador fez)
  const exact = await X.webpBytes(model, 'walk_down', Object.assign({}, o, { quality: 1, transparent: false }));
  const first = await pixels(Buffer.from(exact.bytes));
  const want = X.imageCanvas(model, 'walk_down', 0, Object.assign({}, o, { transparent: false, rect: X.contentRect(model, ['walk_down'], o.margin) }));
  const single = await pixels(want.toBuffer('image/webp', 100));
  record(first.width === want.width && Buffer.from(first.data).equals(Buffer.from(single.data)), '_animado/webp', 'o primeiro quadro do WebP animado não é o do WebP de um quadro só');
  // o MP4 em volta de quadros de mentira: 6 quadros, o 3º fora de ordem (como um B-frame)
  const fake = [0, 2, 1, 3, 4, 5].map((k, i) => ({ data: new Uint8Array(10 + i).fill(i + 1), us: Math.round((k * 1e6) / 12), key: i === 0 || i === 4 }));
  const mp4 = new Uint8Array(await W.mp4.mux(fake, { width: 64, height: 48, fps: 12, description: new Uint8Array([1, 100, 0, 31, 255, 225]) }).arrayBuffer());
  const tree = (l) => l.map((b) => b.type + (b.kids ? '(' + tree(b.kids) + ')' : '')).join(' ');
  const flat = [];
  const walk = (l) => l.forEach((b) => { flat.push(b); if (b.kids) walk(b.kids); });
  walk(W.mp4.boxes(mp4));
  const dv = new DataView(mp4.buffer);
  const get = (t) => flat.find((b) => b.type === t);
  // um número de 32 bits de uma caixa: 0 = versão e flags, 1 = quantos, 2… = a tabela
  const u32 = (t, k) => dv.getUint32(get(t).at + 8 + 4 * k);
  lines.push(`mp4: ${tree(W.mp4.boxes(mp4))}`);
  lines.push(`  stts ${u32('stts', 2)}×${u32('stts', 3)} · stss ${u32('stss', 2)},${u32('stss', 3)} · ctts ${Array.from({ length: 6 }, (_, k) => u32('ctts', 3 + 2 * k)).join(',')} · elst começa em ${u32('elst', 3)} · tamanhos ${Array.from({ length: 6 }, (_, k) => u32('stsz', 3 + k)).join(',')} · os quadros começam no mdat: ${u32('stco', 2) === get('mdat').at + 8}`);
  // o .webp da linha de comando (não precisa do ffmpeg) e os avisos de uso
  const dir = path.join(OUT, '_animado');
  fs.mkdirSync(dir, { recursive: true });
  const cli = (...a) => {
    const r = spawnSync(process.execPath, [CLI, path.join(EX, 'furao.weasel'), '--quiet', ...a], { encoding: 'utf8', env: Object.assign({}, process.env, { NO_COLOR: '1' }) });
    return (r.stderr || '').split('\n')[0].trim() || `ok (${r.status})`;
  };
  lines.push(`cli webp: ${cli('-a', seq, '-s', '0.25', '-o', path.join(dir, 'seq.webp'))}`);
  const cw = W.webp.parse(new Uint8Array(fs.readFileSync(path.join(dir, 'seq.webp'))));
  lines.push(`  ${cw.width}×${cw.height}, ${cw.frames.length} quadros`);
  lines.push(`cli png com sequência: ${cli('-a', seq, '-o', path.join(dir, 'x.png'))}`);
  lines.push(`cli figurinha em gif: ${cli('-a', 'walk_down', '--sticker', '-o', path.join(dir, 'x.gif'))}`);
  lines.push(`cli --min-length em webp: ${cli('-a', 'walk_down', '--min-length', '2s', '-o', path.join(dir, 'x.webp'))}`);
  // o -o precisa de uma extensão conhecida, que combine com o -f; senão, erro e nada salvo (antes: um PNG chamado
  // x.bmp, um GIF chamado x.png)
  for (const [what, ...a] of [['-o x.bmp', '-o', 'x.bmp'], ['-o sem extensão', '-o', 'x'], ['-o x.weasel', '-o', 'x.weasel'], ['-f build -o x.png', '-f', 'build', '-o', 'x.png'], ['-f gif -o x.png', '-f', 'gif', '-o', 'x.png'], ['-f godot -o x.json', '-f', 'godot', '-o', 'x.json']]) {
    const out = path.join(dir, a[a.length - 1]);
    a[a.length - 1] = out;
    if (fs.existsSync(out)) fs.unlinkSync(out);
    lines.push(`cli ${what}: ${cli(...a)}${fs.existsSync(out) ? ' (salvou!)' : ''}`);
  }
  // dash=: só zeros desliga o tracejado (sem aviso); um negativo avisa e a linha sai cheia (antes, a exportação
  // parava com "Make line dash path effect failed")
  lines.push(`dash: ${['0', '0,0', '-3', '4,0'].map((d) => {
    const m = W.lang.parse(`canvas 60 30\nline l w=3 dash=${d} : 5,15 55,15`);
    X.imageCanvas(m, null, 0, {});
    return `${d} → ${m.elements[0].dash ? m.elements[0].dash.join(',') : 'cheia'}${m.errors.length ? ` (${m.errors.map((e) => e.level).join(',')})` : ''}`;
  }).join(' · ')}`);
  await check('_animado', 'animado.txt', 'text', lines.join('\n') + '\n');
}

// blend= no at do filme: a troca de animação misturada (test/casos/mistura.weasel). Confere os avisos, que fora
// da mistura tudo fica igual ao corte seco, o giro pelo lado mais curto, a cor, a opacidade que só uma animação
// muda e a troca de forma (morph) indo aos poucos.
async function blendCase() {
  console.log(paint('1', '_mistura'));
  const file = path.join(CASES, 'mistura.weasel'), src = fs.readFileSync(file, 'utf8');
  const parse = (s) => W.lang.parse(s, { file: 'mistura.weasel', resolve: resolver(CASES) });
  const lines = [];
  const warns = (s) => parse(s).errors.filter((e) => /blend/.test(e.msg)).map((e) => `${e.level} linha ${e.line + 1}: ${e.msg}`);
  for (const [what, from, to] of [
    ['sem anim= na linha', 'at 1.8s b.anim=parado blend=0.8s', 'at 1.8s b.pos=180,190 blend=0.8s'],
    ['com +', 'blend=1s ease=linear', 'blend=+1s ease=linear'],
    ['zero', 'blend=1s ease=linear', 'blend=0s ease=linear'],
  ]) lines.push(`${what}: ${warns(src.replace(from, to)).join(' | ') || 'nenhum aviso'}`);
  lines.push(`o arquivo: ${warns(src).join(' | ') || 'nenhum aviso'}`);
  const m = parse(src), cut = parse(src.replace(/ blend=[\d.]+s/g, ''));
  const s = m.film.shots[0], sc = cut.film.shots[0];
  const state = (sh, n, t) => W.film.actorState(sh, sh.actorMap.get(n), t);
  const sig = (st) => [...st.pose.bones.values()].map((mm) => mm.map((x) => x.toFixed(3)).join(',')).join('|');
  // fora das janelas de mistura, a pose é a mesma do corte seco
  const outside = Object.entries({ a: [0, 0.4, 1.6, 2.5], b: [0.4, 1.0, 1.7, 2.9], c: [0.4, 0.9, 2.1, 2.9] }).flatMap(([n, ts]) => ts.map((t) => sig(state(s, n, t)) === sig(state(sc, n, t))));
  lines.push(`fora da mistura igual ao corte seco: ${outside.every(Boolean)} (${outside.length} poses)`);
  const r1 = (v) => Math.round(v * 10) / 10;
  for (const t of [0.5, 0.75, 1.0, 1.25, 1.5]) {
    const st = state(s, 'a', t), pr = st.pose.props, el = (n) => m.film.shots[0].actorMap.get('a').model.named.get(n)[0];
    const boca = pr.get(el('boca').id) || {}, tronco = pr.get(el('tronco').id) || {}, chapeu = pr.get(el('chapeu').id) || {};
    const sh = boca.shape ? `${boca.shape.from.name}→${boca.shape.to.name} ${r1(boca.shape.t)}` : 'parada';
    lines.push(`a ${t}s: ${st.anim}#${st.animFrame} braço ${st.pose.vals ? r1(st.pose.vals.get('braco')[2]) : '-'}° tronco ${tronco.c || 'azul'} chapéu ${chapeu.opacity !== undefined ? r1(chapeu.opacity) : 1} boca ${sh}`);
  }
  for (const t of [1.0, 1.25, 1.5, 1.75, 2.0]) {
    const st = state(s, 'c', t);
    lines.push(`c ${t}s (da pose solta, linear): ${st.anim || 'sem animação'} braço ${st.pose.vals ? r1(st.pose.vals.get('braco')[2]) : '-'}°`);
  }
  for (const t of [1.8, 2.0, 2.2, 2.4, 2.6, 2.8]) {
    const st = state(s, 'b', t);
    lines.push(`b ${t}s (mistura dentro de mistura): ${st.anim}#${st.animFrame} braço ${st.pose.vals ? r1(st.pose.vals.get('braco')[2]) : '-'}°`);
  }
  await check('_mistura', 'mistura.txt', 'text', lines.join('\n') + '\n');
}

// at … phase e tocar(acao, dir, true): a troca na mesma fase da passada (test/casos/fase.weasel). Confere os avisos,
// onde fica o meio do apoio de cada animação (e as fases da cena do Godot), os quadros dos atores em volta das trocas
// (pelos pés, do jeito de sempre, pela fração do ciclo e de volta com blend=) e o ajudante do Godot com as funções novas.
async function phaseCase() {
  console.log(paint('1', '_fase'));
  const src = fs.readFileSync(path.join(CASES, 'fase.weasel'), 'utf8');
  const parse = (s) => W.lang.parse(s, { file: 'fase.weasel', resolve: resolver(CASES) });
  const lines = [];
  const warns = (s) => parse(s).errors.map((e) => `${e.level} linha ${e.line + 1}: ${e.msg}`);
  const last = 'at 1s a.anim=anda_right phase blend=0.5s';
  for (const [what, to] of [
    ['sem anim= na linha', 'at 1s a.pos=60,190 phase'],
    ['para uma que toca uma vez', 'at 1s a.anim=pulo phase'],
    ['a de antes toca uma vez', 'at 1s a.anim=pulo\nat 1.5s a.anim=anda_right phase'],
    ['anim=none', 'at 1s a.anim=none phase'],
    ['sem animação antes', 'actor d "fase_boneco.weasel" 300,100\nat 1s d.anim=anda_right phase'],
    ['outra palavra solta', 'at 1s a.anim=anda_right fase'],
    ['ator sem arquivo (só o erro do arquivo)', 'actor d "nao_existe.weasel" 300,100\nat 1s d.anim=anda_right phase blend=0.5s'],
  ]) lines.push(`${what}: ${warns(src.replace(last, to)).join(' | ') || 'nenhum aviso'}`);
  lines.push(`o arquivo: ${warns(src).join(' | ') || 'nenhum aviso'}`);

  const m = parse(src), s = m.film.shots[0], boneco = s.actorMap.get('a').model;
  lines.push(`meio do apoio (quadro): ${boneco.anims.map((a) => `${a.name} ${W.scene.feetPhase(boneco, a)}`).join(', ')}`);
  lines.push(`godot: ${W.godot.phasesProp(boneco, W.godot.playerAnims(boneco, true)).replace(/\n/g, ' ')}`);
  const state = (n, t) => W.film.actorState(s, s.actorMap.get(n), t);
  for (const n of ['a', 'b', 'c']) lines.push(`${n}: ${[0, 0.2, 0.25, 0.3, 0.5, 0.95, 1, 1.25, 1.5, 1.75].map((t) => { const st = state(n, t); return `${t}s ${st.anim}#${st.animFrame}`; }).join(' · ')}`);
  // sem nenhum phase, os quadros são os de sempre (a troca recomeça do quadro 0)
  const plain = parse(src.replace(/ phase/g, '')), sp = plain.film.shots[0];
  const sig = (st) => `${st.anim}#${st.animFrame}`;
  const same = ['b'].every((n) => [0, 0.3, 0.6, 1.2, 1.9].every((t) => sig(W.film.actorState(sp, sp.actorMap.get(n), t)) === sig(state(n, t))));
  lines.push(`b (sem phase) igual com e sem os phase dos outros: ${same}`);
  const gd = W.godot.SCRIPT;
  lines.push(`ajudante: ${['func tocar(acao: String, dir := Vector2.ZERO, mesma_fase := false)', 'func quadros(', 'func fps(', 'func mostrar_quadro(', '@export var fases'].map((t) => `${t.split('(')[0]} ${gd.includes(t) ? 'sim' : 'não'}`).join(', ')}`);
  await check('_fase', 'fase.txt', 'text', lines.join('\n') + '\n');
}

// trocar() no Godot: a linha transicoes = {…} das cenas (por quadros e com esqueleto, com o lado espelhado) para o
// ajudante achar as peças de transição (test/casos/transicao_pecas.weasel), nenhuma linha sem transições, e o
// ajudante com o trocar() e as funções que ele usa.
async function swapCase() {
  console.log(paint('1', '_trocar'));
  const parse = (name, swap) => {
    let src = fs.readFileSync(path.join(CASES, name), 'utf8');
    if (swap) src = src.replace(swap[0], swap[1]);
    return W.lang.parse(src, { file: name, resolve: resolver(CASES) });
  };
  // a linha transicoes é a última da cena (no nó do AnimationPlayer)
  const block = (text) => { const i = text.indexOf('\ntransicoes = {'); return i < 0 ? 'nenhuma' : text.slice(i).trim(); };
  const lines = [];
  const m = parse('transicao_pecas.weasel');
  const sheet = X.sheetCanvas(m, m.anims.map((a) => a.name), { scale: 0.2, transparent: true, trim: true, margin: 2, layout: 'rows', cols: 0, padding: 2, imageName: 't.png', format: 'sheet' });
  lines.push('por quadros:', block(W.godot.sceneText(m, sheet, { framesPath: 't.tres', scriptPath: 'weasel_anim.gd', mirror: true })));
  const bones = parse('transicao_pecas.weasel', ['godot body=character root=60,110', 'godot body=character root=60,110 rig=bones']);
  lines.push('com esqueleto:', block(W.rig.packageFiles(bones, { base: 't', scale: 0.5, mirror: true }).files.find((x) => x.name.endsWith('.tscn')).text));
  const plain = parse('transicao_pecas.weasel', [/anim (to_idle|after_attack) from=.*\n/g, '']);
  lines.push(`sem transições: ${W.godot.transProp(plain, W.godot.playerAnims(plain, true)) || 'nenhuma linha'}`);
  const gd = W.godot.SCRIPT;
  lines.push(`ajudante: ${['func trocar(acao: String, dir := Vector2.ZERO, mistura := 0.2)', '@export var transicoes', 'func _fim_da_peca(', 'func _por_quadros(', 'func _aplicar_discretas(', 'play_backwards('].map((t) => `${t.split('(')[0]} ${gd.includes(t) ? 'sim' : 'não'}`).join(', ')}`);
  await check('_trocar', 'trocar.txt', 'text', lines.join('\n') + '\n');
}

// --contact: a folha de conferência pela linha de comando. Num desenho (test/casos/passada.weasel), os quadros
// numerados, uma linha por animação, com os eventos, os pés no chão e o escorregão do escorrega_right; num filme
// (exemplos/filme.weasel), uma linha por plano, um quadro a cada segundo (o intervalo automático) com o tempo
// embaixo. O texto guarda o que a linha de comando escreveu (sem o caminho e o tamanho do arquivo) e os erros.
async function contactCase() {
  console.log(paint('1', '_conferencia'));
  fs.mkdirSync(OUT, { recursive: true });
  const env = Object.assign({}, process.env, { NO_COLOR: '1' });
  const say = (r) => (r.stdout + r.stderr).split(/\r?\n/).filter((l) => l && !/^Use "weasel/.test(l) && !/^\s/.test(l) && !/: aviso: /.test(l))
    .map((l) => l.replace(/^salvo \S+\s+/, 'salvo ').replace(/ · \d+(\.\d+)? (KB|MB)$/, ''));
  const lines = [];
  for (const [name, args] of [['passada.png', [path.join(CASES, 'passada.weasel'), '--contact', '-s', '0.4']], ['filme.png', [path.join(EX, 'filme.weasel'), '--contact', '-s', '0.05']]]) {
    const out = path.join(OUT, `_conferencia_${name}`);
    const r = spawnSync(process.execPath, [CLI, ...args, '-o', out], { encoding: 'utf8', env });
    lines.push(`${name}:`, ...say(r));
    if (r.status) { record(false, `_conferencia/${name}`, r.stderr.trim()); continue; }
    const img = await loadImage(fs.readFileSync(out));
    const c = createCanvas(img.width, img.height);
    c.getContext('2d').drawImage(img, 0, 0);
    await check('_conferencia', name, 'png', c);
  }
  for (const args of [[path.join(EX, 'cavaleiro.weasel'), '--contact=2'], [path.join(EX, 'cavaleiro.weasel'), '--contact', '-f', 'gif'], [path.join(EX, 'filme.weasel'), '--contact=abc'], [path.join(EX, 'filme.weasel'), '--contact', '--shots']]) {
    const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env });
    lines.push(`${path.basename(args[0])} ${args.slice(1).join(' ')}: saída ${r.status}`, ...say(r));
  }
  await check('_conferencia', 'conferencia.txt', 'text', lines.join('\n') + '\n');
}

// anim … from= to=: as peças de transição da sprite sheet (test/casos/transicao_pecas.weasel). Confere os erros
// e avisos, que as animações de antes saem iguais com e sem transições, as peças (nomes, de onde partem, o peso,
// a animação que vale para only=), o once com every= e o Godot (sem loop; com esqueleto, espelhadas).
async function transCase() {
  console.log(paint('1', '_transicao'));
  const src = fs.readFileSync(path.join(CASES, 'transicao_pecas.weasel'), 'utf8');
  const parse = (s) => W.lang.parse(s, { file: 'transicao_pecas.weasel', resolve: () => null });
  const lines = [];
  const msgs = (s) => parse(s).errors.map((e) => `${e.level} linha ${e.line + 1}: ${e.msg}`);
  const tail = 'anim to_idle from=walk to=idle frames=3 every=4';
  for (const [what, to] of [
    ['sem to=', 'anim to_idle from=walk'],
    ['from= que não existe', 'anim to_idle from=run to=idle'],
    ['to= que não existe (nome exato)', 'anim to_idle from=walk_right to=sleep'],
    ['uma direção sem o to=', 'anim to_idle from=walk to=idle\nanim walk_up frames=8 fps=12'],
    ['loop', 'anim to_idle from=walk to=idle loop'],
    ['key na transição', 'anim to_idle from=walk to=idle\nkey 0 corpo=0,0,5'],
    ['nome de peça repetido', 'anim to_idle from=walk to=idle every=4\nanim to_idle_0_right frames=2'],
    ['every= sem from=', 'anim pisca frames=4 every=2'],
    ['mix= com from=', 'anim to_idle from=walk to=idle mix=walk_right,idle_right bones=cabeca'],
    ['from= uma peça', 'anim to_idle from=walk to=idle every=4\nanim de_novo from=to_idle_0_right to=idle_down'],
  ]) lines.push(`${what}: ${msgs(src.replace(tail, to)).join(' | ') || 'nenhum aviso'}`);
  lines.push(`o arquivo: ${msgs(src).join(' | ') || 'nenhum aviso'}`);

  const m = parse(src), plain = parse(src.replace(tail, '').replace('anim after_attack from=attack_right to=idle_right frames=3', ''));
  const sig = (p) => [...p.bones.values()].map((mm) => mm.map((x) => x.toFixed(4)).join(',')).join('|') + JSON.stringify([...p.props]);
  const same = plain.anims.every((a) => Array.from({ length: a.frames }, (_, f) => f).every((f) => sig(W.scene.makePose(m, a.name, f)) === sig(W.scene.makePose(plain, a.name, f))));
  lines.push(`as ${plain.anims.length} animações de antes saem iguais com as transições: ${same}`);
  lines.push(`animações: ${m.anims.map((a) => a.blendOf ? `${a.name} (${a.blendOf.from.name}→${a.blendOf.to.name}, depois do quadro ${a.blendOf.start}, ${a.frames} quadros a ${a.fps} fps)` : a.name).join(', ')}`);
  const r2 = (v) => Math.round(v * 100) / 100;
  for (const name of ['to_idle_4_right', 'after_attack_5_right']) {
    const a = m.animMap.get(name);
    for (let j = 0; j < a.frames; j++) {
      const p = W.scene.makePose(m, name, j), v = p.vals;
      lines.push(`  ${name}#${j}: vale ${p.src.anim.name}#${p.src.frame} · corpo ${v.get('corpo').map(r2).join(',')} · cabeça ${r2(v.get('cabeca')[2])}° · pé ${r2(v.get('pe')[2])}° · poeira ${W.scene.layerVisible(m.layerMap.get('poeira'), p, {}) ? 'sim' : 'não'} · golpe ${W.scene.boxState(m, p, m.boxes.get('golpe')).on ? 'ligado' : 'desligado'}`);
    }
  }
  const ev = parse(src.replace('anim after_attack from=attack_right to=idle_right frames=3', 'anim after_attack from=attack_right to=idle_right frames=3 every=2'));
  lines.push(`once com every=2: ${ev.anims.filter((a) => a.trans === 'after_attack').map((a) => a.name).join(', ')}`);
  lines.push(`fps=: ${parse(src.replace(tail, tail + ' fps=24')).animMap.get('to_idle_0_right').fps}`);
  const sheet = X.sheetCanvas(m, m.anims.map((a) => a.name), { scale: 0.2, transparent: true, trim: true, margin: 2, layout: 'rows', cols: 0, padding: 2, imageName: 't.png', format: 'sheet' });
  const tres = X.godotText(m, sheet, 't.png');
  lines.push(`godot (quadros): ${[...tres.matchAll(/"loop": (\w+),\n"name": &"(\w+)"/g)].map((x) => `${x[2]} ${x[1] === 'true' ? 'loop' : 'uma vez'}`).join(', ')}`);
  const bones = parse(src.replace('godot body=character root=60,110', 'godot body=character root=60,110 rig=bones'));
  const tscn = W.rig.packageFiles(bones, { base: 't', scale: 0.5, mirror: true }).files.find((f) => f.name.endsWith('.tscn')).text;
  lines.push(`godot (esqueleto): ${[...tscn.matchAll(/resource_name = "(\w+)"\nlength = ([\d.]+)\n(loop_mode = 1)?/g)].filter((x) => x[1] !== 'RESET').map((x) => `${x[1]} ${x[2]}s${x[3] ? ' loop' : ''}`).join(', ')}`);
  await check('_transicao', 'transicao.txt', 'text', lines.join('\n') + '\n');
}

// anim … from= to= turn: a virada (test/casos/virada.weasel). Confere os erros e avisos de turn, pairs= e born=, o
// plano (as partes que viram outras, as que nascem e as que somem) com e sem pairs= e born=, que sem turn a linha
// é a transição de antes, o andamento de cada quadro da peça e o Godot com esqueleto (a peça "virada" aparece só
// nas peças da virada; as outras se escondem nelas).
async function turnCase() {
  console.log(paint('1', '_virada'));
  const src = fs.readFileSync(path.join(CASES, 'virada.weasel'), 'utf8');
  const parse = (s) => W.lang.parse(s, { file: 'virada.weasel', resolve: () => null });
  const msgs = (s) => parse(s).errors.map((e) => `${e.level} linha ${e.line + 1}: ${e.msg}`);
  const line = 'anim vira from=idle_right to=idle_down frames=4 every=4 turn pairs=olhoL->olhoE born=olhoD->cabecaL';
  const head = 'anim vira from=idle_right to=idle_down frames=4';
  const lines = [];
  for (const [what, to] of [
    ['turn sem from=', 'anim vira frames=4 turn'],
    ['pairs= e born= sem from=', 'anim vira frames=4 pairs=olhoL->olhoE born=olhoD->cabecaL'],
    ['pairs= sem turn', `${head} pairs=olhoL->olhoE`],
    ['pairs= com dois pontos', `${head} turn pairs=olhoL:olhoE`],
    ['pairs= sem a seta', `${head} turn pairs=olhoL`],
    ['pairs= com uma parte que não está na vista', `${head} turn pairs=olhoX->olhoE`],
    ['pairs= ao contrário', `${head} turn pairs=olhoE->olhoL`],
    ['born= de uma parte das duas vistas', `${head} turn born=sombra->cabecaL`],
    ['born= de uma parte que não existe', `${head} turn born=asa->cabecaL`],
    ['born= com a outra parte na mesma vista', `${head} turn born=olhoD->cabeca`],
    ['opção desconhecida', `${head} virar`],
  ]) lines.push(`${what}: ${msgs(src.replace(line, to)).join(' | ') || 'nenhum aviso'}`);
  lines.push(`o arquivo: ${msgs(src).join(' | ') || 'nenhum aviso'}`);

  const pn = W.scene.partName, list = (xs) => xs.map(([x, y]) => `${pn(x)}->${pn(y)}`).join(', ') || '-';
  for (const [what, s] of [['o arquivo', src], ['sem pairs= e born=', src.replace(' pairs=olhoL->olhoE born=olhoD->cabecaL', '')]]) {
    const m = parse(s), p = W.scene.turnPlan(m, m.anims.find((a) => a.blendOf && a.blendOf.turn));
    lines.push(`plano (${what}): vira ${list(p.pairs)} · nascem ${list(p.born)} · somem ${list(p.gone)}`);
  }
  const plain = parse(src.replace(' turn pairs=olhoL->olhoE born=olhoD->cabecaL', ''));
  lines.push(`sem turn: ${plain.anims.filter((a) => a.blendOf).map((a) => `${a.name} ${a.blendOf.turn ? 'virada' : 'transição'}`).join(', ')}`);
  const m = parse(src), r2 = (v) => Math.round(v * 100) / 100;
  for (const a of m.anims.filter((x) => x.blendOf)) {
    lines.push(`${a.name}: ${Array.from({ length: a.frames }, (_, f) => { const p = W.scene.makePose(m, a.name, f); return p.turn ? `#${f} t=${r2(p.turn.t)} (${p.turn.A.anim.name}#${p.turn.A.frame} → ${p.turn.B.anim.name}#${p.turn.B.frame})` : `#${f} sem virada`; }).join(', ')}`);
  }
  // Godot com esqueleto: a faixa visible da peça "virada" e a de uma peça presa a um osso, em cada animação
  const pkg = W.rig.packageFiles(m, { base: 't', scale: 0.5, mirror: true });
  const tscn = pkg.files.find((f) => f.name.endsWith('.tscn')).text;
  lines.push(`godot (esqueleto): ${pkg.framed} quadro a quadro, ${pkg.rigid} presas aos ossos; ${pkg.notes.join(' | ')}`);
  const node = (re) => (tscn.match(re) || [])[1];
  const turnNode = node(/\[node name="(virada_\d+)" type="Sprite2D"/), boneNode = node(/\[node name="(cabeca\w*)" type="Sprite2D"/);
  for (const b of tscn.split('\n\n').filter((x) => x.startsWith('[sub_resource type="Animation"'))) {
    const vis = (n) => {
      const i = (b.match(new RegExp(`tracks/(\\d+)/path = NodePath\\("Visual/Pecas/${n}:visible"\\)`)) || [])[1];
      if (i === undefined) return 'sem faixa';
      const k = b.slice(b.indexOf(`tracks/${i}/keys`));
      return `${k.match(/"times": PackedFloat32Array\(([^)]*)\)/)[1]} → ${k.match(/"values": \[([^\]]*)\]/)[1]}`;
    };
    lines.push(`  ${b.match(/resource_name = "(\w+)"/)[1]}: ${turnNode} ${vis(turnNode)} · ${boneNode} ${vis(boneNode)}`);
  }
  await check('_virada', 'virada.txt', 'text', lines.join('\n') + '\n');
}

// Testar giro do editor: scene.spinPose() gira ossos na pose parada, só na tela (test/casos/pinos.weasel, com um ik
// de pé no chão e um de braço com alvo). Sem giro, é a pose parada; girando o corpo, o pé fica no chão e o braço vai
// atrás do alvo (girando para cima, o quadril sobe além do alcance e o pé sai do chão); na raiz e no meio de um ik, a
// perna fica onde o ik manda e só o pé gira junto (o editor nem deixa girar esses dois); o giro da ponta gira só a ponta.
async function spinCase() {
  console.log(paint('1', '_giro'));
  const m = load(path.join(CASES, 'pinos.weasel')), S = W.scene, r1 = (v) => Math.round(v * 10) / 10;
  const ap = (mm, p) => [mm[0] * p[0] + mm[2] * p[1] + mm[4], mm[1] * p[0] + mm[3] * p[1] + mm[5]];
  const at = (pose, n) => ap(pose.bones.get(n), m.bones.get(n).pivot).map(r1).join(',');
  const ang = (pose, n) => { const mm = pose.bones.get(n); return r1((Math.atan2(mm[1], mm[0]) * 180) / Math.PI); };
  const box = (pose, name) => { const el = m.elements.find((e) => e.name === name), bb = S.segsBox(S.geometry(m, pose, el).segs); return [bb.x, bb.y, bb.x + bb.w, bb.y + bb.h].map(Math.round).join(','); };
  const rest = S.makePose(m, null, 0), lines = [];
  const same = (a, b) => [...m.bones.keys()].every((n) => a.bones.get(n).every((v, k) => Math.abs(v - b.bones.get(n)[k]) < 1e-9));
  lines.push(`sem giro, igual à pose parada: ${same(S.spinPose(m, new Map()), rest) && same(S.spinPose(m, null), rest)}`);
  for (const [what, spins] of [
    ['parada', []],
    ['corpo 30', [['corpo', 30]]],
    ['corpo -25', [['corpo', -25]]],
    ['coxa 40 (raiz do ik)', [['coxa', 40]]],
    ['canela 40 (meio do ik)', [['canela', 40]]],
    ['pe -40 (ponta do ik)', [['pe', -40]]],
    ['alvo 90 (o alvo gira no pivô)', [['alvo', 90]]],
    ['corpo 30 e pe -40', [['corpo', 30], ['pe', -40]]],
  ]) {
    const p = S.spinPose(m, new Map(spins));
    lines.push(`${what}: ${['corpo', 'coxa', 'canela', 'pe', 'ombro', 'cotovelo', 'mao'].map((n) => `${n} ${at(p, n)}`).join(' · ')} · giro do pe ${ang(p, 'pe')} · bicho ${box(p, 'bicho')} · braco ${box(p, 'braco')}`);
  }
  await check('_giro', 'giro.txt', 'text', lines.join('\n') + '\n');
}

// speed=auto (test/casos/velocidade.weasel): os avisos (mais rápido que 3× a passada, andar com uma animação sem feet=)
// e os erros, o quadro da animação de cada ator ao longo do plano (reto, acelerando e parando, de ré, no morro, no
// teto, sem passada e ligado no meio) e o pé no chão: com o ator a 2× a passada, ele fica parado no palco com
// speed=auto e escorrega com speed=1.
async function speedCase() {
  console.log(paint('1', '_velocidade'));
  const src = fs.readFileSync(path.join(CASES, 'velocidade.weasel'), 'utf8');
  const parse = (t) => W.lang.parse(t, { file: 'velocidade.weasel', resolve: resolver(CASES) });
  const msgs = (t) => parse(t).errors.map((e) => `${e.level} linha ${e.line + 1}: ${e.msg}`);
  const lines = [`o arquivo: ${msgs(src).join(' | ') || 'nenhum aviso'}`];
  for (const [what, a, b] of [
    ['f parado (sem feet=, sem andar: sem aviso)', 'at 3s f.x=200 ease=linear', 'at 3s f.opacity=1'],
    ['e sem o disparo', 'at 1.5s e.x=400 ease=linear', 'at 1.5s e.x=130 ease=linear'],
    ['speed= errado', 'scale=0.3 anim=anda_right speed=auto\nactor b', 'scale=0.3 anim=anda_right speed=rapido\nactor b'],
    ['lag=auto na câmera', 'at 1s g.speed=auto', 'at 1s camera.lag=auto'],
    ['o disparo depois de ligar o auto no at', 'at 3s g.x=175 ease=linear', 'at 2s g.x=175 ease=linear\nat 2.5s g.x=470 ease=linear'],
    ['dois shots (o aviso diz qual)', 'film fps=12 dur=3s', 'film fps=12\nshot dois dur=1s\nshot um dur=3s'],
  ]) lines.push(`${what}: ${msgs(src.replace(a, b)).join(' | ') || 'nenhum aviso'}`);

  const m = parse(src), sh = m.film.shots[0], r2 = (v) => Math.round(v * 100) / 100;
  for (const n of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
    const ac = sh.actorMap.get(n);
    lines.push(`${n}: ${[0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].map((t) => { const q = W.film.actorState(sh, ac, t); return `${t}s #${q.animFrame}`; }).join(' · ')}`);
  }
  // o pé no chão: com a a 72 px/s (2× a passada de 36 px/s no palco), quanto o pé que está no chão nos dois quadros
  // seguidos anda no palco, no máximo
  const slip = (txt) => {
    const mm = parse(txt), tl = W.film.timeline(mm);
    let max = 0, pairs = 0, prev = null;
    for (let fr = 0; fr < tl.frames; fr++) {
      const w = W.film.frameState(mm, fr).who.find((x) => x.ac && x.ac.name === 'a'), g = W.scene.gait(w.model, w.model.animMap.get(w.anim));
      const feet = g.feet.map((ft) => { const p = W.scene.pointState(w.model, w.pose, w.model.points.get(ft.name)); return { on: ft.on[w.animFrame], x: W.geom.M.apply(w.mat, p.x, p.y)[0] }; });
      if (prev) feet.forEach((ft, k) => { if (ft.on && prev[k].on) { pairs++; max = Math.max(max, Math.abs(ft.x - prev[k].x)); } });
      prev = feet;
    }
    return `${r2(max)} px (${pairs} pares de quadros com o pé no chão)`;
  };
  const fast = src.replace('at 3s a.x=175 ease=linear', 'at 3s a.x=256 ease=linear');
  lines.push(`pé no chão, a a 2× a passada: com speed=auto anda ${slip(fast)}; com speed=1, ${slip(fast.replace('scale=0.3 anim=anda_right speed=auto\nactor b', 'scale=0.3 anim=anda_right\nactor b'))}`);
  await check('_velocidade', 'velocidade.txt', 'text', lines.join('\n') + '\n');
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
  if (!only.length || only.some((o) => '_previa'.includes(o))) await previewCase();
  if (!only.length || only.some((o) => '_contas'.includes(o))) await exprCase();
  if (!only.length || only.some((o) => '_janela'.includes(o))) await jobCase();
  if (!only.length || only.some((o) => '_animado'.includes(o))) await animCase();
  if (!only.length || only.some((o) => '_mistura'.includes(o))) await blendCase();
  if (!only.length || only.some((o) => '_transicao'.includes(o))) await transCase();
  if (!only.length || only.some((o) => '_fase'.includes(o))) await phaseCase();
  if (!only.length || only.some((o) => '_trocar'.includes(o))) await swapCase();
  if (!only.length || only.some((o) => '_virada'.includes(o))) await turnCase();
  if (!only.length || only.some((o) => '_metamorfose'.includes(o))) await morphCase();
  if (!only.length || only.some((o) => '_giro'.includes(o))) await spinCase();
  if (!only.length || only.some((o) => '_velocidade'.includes(o))) await speedCase();
  if (!only.length || only.some((o) => '_conferencia'.includes(o))) await contactCase();
  if (!only.length || only.some((o) => '_simplificar'.includes(o))) await simplifyCase();
  if (!only.length || only.some((o) => '_caminhos'.includes(o))) await pathsCase();
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
