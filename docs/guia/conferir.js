#!/usr/bin/env node
/* Weasel — as conferências do guia que não desenham nada (o gerar.js as roda no npm test):

   - a referência (19-referencia.md) tem uma ficha para cada comando do Weasel, e cada ficha cita toda opção
     (nome=) e toda palavra solta que o comando aceita; o mesmo para os estilos do art, o que a key e o at mudam
     e as palavras soltas do at;
   - as funções das contas (20-funcoes.md) citam toda função e o pi;
   - a linha de comando (21-linha-de-comando.md) cita toda opção que o weasel.js aceita;
   - todo link de um capítulo para outro leva a um arquivo que existe e a um título (ou âncora) que existe nele.

   Uma opção nova no Weasel faz o npm test falhar até ganhar a sua linha no guia.

     node docs/guia/conferir.js                      confere o guia inteiro
     node docs/guia/conferir.js parte.md canvas art  confere só esses comandos (e os links e exemplos) num rascunho
*/
'use strict';
const fs = require('fs');
const path = require('path');

const GUIA = __dirname;
const ROOT = path.join(GUIA, '..', '..');

// o texto sem os blocos de código (um "# comentário" dentro de um bloco não é título)
function prose(text) {
  const out = [];
  let fence = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(```+|~~~+)/);
    if (m) {
      if (!fence) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      out.push('');
      continue;
    }
    out.push(fence ? '' : line);
  }
  return out.join('\n');
}

// a âncora que o GitHub dá a um título: minúsculas, sem pontuação (acentos ficam), espaços viram "-"
const slug = (h) => h.trim().toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');

function headings(text) {
  const lines = prose(text).split('\n'), out = [], seen = new Map();
  lines.forEach((line, i) => {
    const m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (!m) return;
    let s = slug(m[2]);
    const n = seen.get(s) || 0;
    seen.set(s, n + 1);
    if (n) s += `-${n}`;
    out.push({ level: m[1].length, text: m[2], slug: s, line: i });
  });
  return { list: out, lines };
}

// as âncoras de um arquivo: os títulos e os <a id="…"> / <a name="…">
function anchors(text) {
  const set = new Set(headings(text).list.map((h) => h.slug));
  for (const m of text.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) set.add(m[1]);
  return set;
}

// o corpo de um título: do título até o próximo título do mesmo nível ou acima (sem os blocos de código)
function body(H, h) {
  const i = H.list.indexOf(h);
  const next = H.list.slice(i + 1).find((o) => o.level <= h.level);
  return H.lines.slice(h.line + 1, next ? next.line : H.lines.length).join('\n');
}
const find = (H, level, re) => H.list.find((h) => h.level === level && re.test(h.text));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tick = (w) => new RegExp('`' + esc(w) + '`');
const tickEq = (w) => new RegExp('`' + esc(w) + '=');

// ---------- a referência ----------
function refProblems(text, L, only) {
  const H = headings(text), probs = [];
  const want = only && only.length ? only : Object.keys(L.KEYWORDS);
  const sec = {};
  for (const kw of want) {
    const h = find(H, 3, tick(kw));
    if (!h) { probs.push(`o comando ${kw} não tem ficha (um título ### com \`${kw}\`)`); continue; }
    const b = (sec[kw] = body(H, h));
    for (const a of L.ATTRS[kw] || []) if (!tickEq(a).test(b)) probs.push(`${kw}: falta a opção \`${a}=\``);
    for (const f of L.FLAGS[kw] || []) if (!tick(f).test(b)) probs.push(`${kw}: falta a palavra solta \`${f}\``);
  }
  // os estilos do art: um título #### por estilo, com as opções dele
  if (sec.art !== undefined) {
    const artH = find(H, 3, tick('art'));
    const sub = H.list.filter((h) => h.level === 4 && h.line > artH.line && h.line < (H.list.find((o) => o.line > artH.line && o.level <= 3) || { line: Infinity }).line);
    for (const st of L.ART_STYLES) {
      const h = sub.find((o) => tick(st).test(o.text));
      if (!h) { probs.push(`art: o estilo ${st} não tem título (#### \`${st}\`)`); continue; }
      const b = body(H, h), o = L.ART_OPTS[st];
      for (const a of o.attrs) if (!tickEq(a).test(b)) probs.push(`art ${st}: falta a opção \`${a}=\``);
      for (const f of o.flags) if (!tick(f).test(b)) probs.push(`art ${st}: falta a palavra solta \`${f}\``);
    }
  }
  // o que a key e o at mudam: um título #### para cada alvo
  const targets = (cmd, list) => {
    if (sec[cmd] === undefined) return;
    for (const [where, table] of list) {
      const h = find(H, 4, new RegExp('^`' + cmd + '` ' + esc(where) + '$'));
      if (!h) { probs.push(`${cmd}: falta o título #### \`${cmd}\` ${where}`); continue; }
      const b = body(H, h);
      for (const p of Object.keys(table)) if (!tickEq(p).test(b)) probs.push(`${cmd} ${where}: falta \`${p}=\``);
    }
  };
  targets('key', [['numa forma', L.PROPS], ['numa camada', L.LAYER_PROPS], ['numa luz', L.LIGHT_PROPS], ['num osso', L.BONE_PROPS], ['numa caixa', L.BOX_PROPS]]);
  targets('at', [['num ator', L.ACTOR_PROPS], ['na câmera', L.CAMERA_PROPS], ['numa luz', L.LIGHT_PROPS], ['numa camada', L.LAYER_PROPS], ['numa forma', L.SHAPE_AT_PROPS]]);
  if (sec.at !== undefined) for (const p of ['ease', 'blend', 'dur', 'pairs', 'born']) if (!tickEq(p).test(sec.at)) probs.push(`at: falta \`${p}=\``);
  return probs;
}

// ---------- as funções das contas ----------
// os nomes do FN de js/lang.js (lidos do código, que não exporta a lista)
function fnNames() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'lang.js'), 'utf8');
  const start = src.indexOf('const FN = {'), end = src.indexOf('const FN_ARGS', start);
  return [...new Set([...src.slice(start, end).matchAll(/(\w+): (?:\(|Math\.)/g)].map((m) => m[1]))];
}
function fnProblems(text, names) {
  const t = prose(text), probs = [];
  for (const f of names) if (!new RegExp('`' + f + '\\(').test(t)) probs.push(`a função ${f}() não está no capítulo (\`${f}(…)\`)`);
  if (!/`pi`/.test(t)) probs.push('falta o `pi`');
  return probs;
}

// ---------- a linha de comando ----------
function cliOptions() {
  const src = fs.readFileSync(path.join(ROOT, 'cli', 'weasel.js'), 'utf8');
  const start = src.indexOf('function parseArgs'), end = src.indexOf('\n}', start);
  return [...new Set([...src.slice(start, end).matchAll(/case '(-[-\w]+)'/g)].map((m) => m[1]))];
}
function cliProblems(text) {
  const t = prose(text), probs = [];
  for (const o of cliOptions()) if (!new RegExp('`' + esc(o) + '(?![-\\w])').test(t)) probs.push(`a opção ${o} não está no capítulo (\`${o}\`)`);
  return probs;
}

// ---------- os links ----------
function linkProblems(file, text, dir) {
  const probs = [], t = prose(text), cache = new Map();
  const anchorsOf = (p) => {
    if (!cache.has(p)) cache.set(p, fs.existsSync(p) ? anchors(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')) : null);
    return cache.get(p);
  };
  for (const m of t.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = m[2];
    if (m[1] || /^[a-z]+:/i.test(target)) continue; // imagens e http:, mailto:
    const [rel, hash] = target.split('#');
    const p = rel ? path.resolve(dir, decodeURI(rel)) : null;
    if (rel && !fs.existsSync(p)) { probs.push(`${file}: o link ${target} leva a um arquivo que não existe`); continue; }
    if (hash === undefined || (rel && !/\.md$/i.test(rel))) continue;
    const set = rel ? anchorsOf(p) : anchors(text);
    if (!set.has(decodeURIComponent(hash))) probs.push(`${file}: o link ${target} leva a um título que não existe`);
  }
  return probs;
}

// todas as conferências do guia; files = os capítulos (nomes dentro de docs/guia)
function all(W, files) {
  const read = (f) => fs.readFileSync(path.join(GUIA, f), 'utf8').replace(/\r\n/g, '\n');
  const probs = [];
  const has = (f) => files.includes(f);
  if (has('19-referencia.md')) probs.push(...refProblems(read('19-referencia.md'), W.lang).map((p) => `19-referencia.md: ${p}`));
  if (has('20-funcoes.md')) probs.push(...fnProblems(read('20-funcoes.md'), fnNames()).map((p) => `20-funcoes.md: ${p}`));
  if (has('21-linha-de-comando.md')) probs.push(...cliProblems(read('21-linha-de-comando.md')).map((p) => `21-linha-de-comando.md: ${p}`));
  for (const f of files) probs.push(...linkProblems(f, read(f), GUIA));
  return probs;
}

module.exports = { all, refProblems, fnProblems, fnNames, cliProblems, cliOptions, linkProblems, headings, slug, prose };

// rascunho: node docs/guia/conferir.js parte.md [comandos…] (os links valem como se o arquivo estivesse em docs/guia)
if (require.main === module) {
  const { W } = require('../../cli/runtime');
  const args = process.argv.slice(2);
  let probs;
  if (!args.length) {
    probs = all(W, fs.readdirSync(GUIA).filter((f) => /\.md$/.test(f)));
  } else {
    const file = path.resolve(args[0]), text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), base = path.basename(file);
    const cmds = args.slice(1);
    probs = [];
    if (cmds.includes('--funcoes')) probs.push(...fnProblems(text, fnNames()));
    else if (cmds.includes('--cli')) probs.push(...cliProblems(text));
    else if (cmds.length) probs.push(...refProblems(text, W.lang, cmds));
    probs.push(...linkProblems(base, text, GUIA));
    // os exemplos com <!-- conferir --> ou <!-- gerar: --> precisam rodar sem erro nem aviso
    const { makeMediaResolver } = require('../../cli/media');
    const EX = path.join(ROOT, 'exemplos');
    const re = /((?:<!--\s*(?:gerar|conferir|arquivo)\b[^>]*-->\s*\n)+)```weasel\n([\s\S]*?)\n```/g;
    const virt = new Map();
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index + m[1].length).split('\n').length + 1;
      const arq = m[1].match(/<!--\s*arquivo:\s*([^>]*?)\s*-->/);
      if (arq) virt.set(arq[1], m[2]);
      const resolve = (name) => { if (virt.has(name)) return virt.get(name); try { return fs.readFileSync(path.join(EX, name), 'utf8'); } catch (e) { return null; } };
      const model = W.lang.parse(m[2], { file: 'guia.weasel', resolve, media: makeMediaResolver(() => EX) });
      for (const e of model.errors) probs.push(`linha ${line + e.line}: ${e.level === 'warn' ? 'aviso' : 'erro'}: ${e.msg}`);
    }
  }
  for (const p of probs) console.log(p);
  console.log(`${probs.length} problema(s)`);
  process.exit(probs.length ? 1 : 0);
}
