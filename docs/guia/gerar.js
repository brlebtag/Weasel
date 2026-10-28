#!/usr/bin/env node
/* Weasel — imagens do guia. Um bloco ```weasel com o comentário <!-- gerar: img/nome.png opções -->
   logo antes vira imagem pela linha de comando (as opções são as do weasel: -a quica, --guides…);
   pode haver mais de um "gerar" antes do mesmo bloco. Com <!-- conferir -->, o bloco só é lido.
   Os exemplos rodam como se estivessem em exemplos/, então include e actor acham os arquivos de lá.
   Com <!-- arquivo: rosto.weasel -->, o bloco também vira esse arquivo para os exemplos seguintes do
   mesmo capítulo (um personagem que o filme do bloco de baixo usa como ator).

     npm run docs                       gera todas as imagens
     node docs/guia/gerar.js formas     só os capítulos cujo nome contém "formas"
     node docs/guia/gerar.js --check    só confere que os exemplos rodam sem erro nem aviso (vai no npm test)
*/
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { W } = require('../../cli/runtime');
const { makeMediaResolver } = require('../../cli/media');

const GUIA = __dirname;
const ROOT = path.join(GUIA, '..', '..');
const EX = path.join(ROOT, 'exemplos');
const CLI = path.join(ROOT, 'cli', 'weasel.js');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const only = args.filter((a) => !a.startsWith('--'));

// Os blocos de cada capítulo, com as ordens que vêm antes deles.
function blocks(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const out = [];
  const re = /((?:<!--\s*(?:gerar|conferir|arquivo)\b[^>]*-->\s*\n)+)```weasel\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(text))) {
    const jobs = [...m[1].matchAll(/<!--\s*(gerar|conferir|arquivo)\b:?\s*([^>]*?)\s*-->/g)].map((d) => ({ kind: d[1], rest: d[2] }));
    const line = text.slice(0, m.index + m[1].length).split('\n').length + 1;
    out.push({ code: m[2], line, jobs, text });
  }
  return out;
}

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

const files = fs.readdirSync(GUIA).filter((f) => /\.md$/.test(f)).sort().filter((f) => !only.length || only.some((o) => f.includes(o)));
let bad = 0, made = 0, checked = 0;
const used = new Set();
// arquivos dos blocos <!-- arquivo: … -->: a linha de comando roda numa cópia de exemplos/ com eles dentro
let tmp = null;
const workDir = (virt) => {
  if (!virt.size) return EX;
  if (!tmp) { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'weasel-guia-')); fs.cpSync(EX, tmp, { recursive: true }); }
  for (const [name, code] of virt) fs.writeFileSync(path.join(tmp, name), code);
  return tmp;
};
for (const f of files) {
  const virt = new Map();
  for (const b of blocks(path.join(GUIA, f))) {
    checked++;
    for (const j of b.jobs) if (j.kind === 'arquivo') virt.set(j.rest.trim(), b.code);
    const fromEx = resolver(EX);
    const model = W.lang.parse(b.code, { file: 'guia.weasel', resolve: (name, from) => (virt.has(name) ? virt.get(name) : fromEx(name, from)), media: makeMediaResolver(() => EX) });
    for (const e of model.errors) {
      bad++;
      console.log(`${f}:${b.line + e.line}: ${e.level === 'warn' ? 'aviso' : 'erro'}: ${e.msg}`);
    }
    for (const j of b.jobs) {
      if (j.kind !== 'gerar') continue;
      const [out, ...opts] = j.rest.split(/\s+/).filter(Boolean);
      if (!out) { bad++; console.log(`${f}:${b.line}: gerar sem o nome da imagem`); continue; }
      used.add(path.normalize(out));
      if (!b.text.includes(`(${out})`)) console.log(`${f}:${b.line}: aviso: a imagem ${out} não aparece no texto`);
      if (CHECK) continue;
      const r = spawnSync(process.execPath, [CLI, '-', '-o', path.join(GUIA, out), '--quiet', ...opts], { cwd: workDir(virt), input: b.code, encoding: 'utf8' });
      if (r.status !== 0) { bad++; console.log(`${f}:${b.line}: ${out} falhou\n${r.stderr || r.stdout}`); } else made++;
    }
  }
}
// imagens que nenhum bloco gera mais (o .json de uma sprite sheet vem junto com o .png dela)
if (!only.length && fs.existsSync(path.join(GUIA, 'img'))) {
  const bases = new Set([...used].map((u) => u.replace(/\.[^.]+$/, '')));
  for (const img of fs.readdirSync(path.join(GUIA, 'img'))) {
    if (!bases.has(path.normalize(`img/${img}`).replace(/\.[^.]+$/, ''))) console.log(`aviso: img/${img} não é gerada por nenhum exemplo`);
  }
}
if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
console.log(CHECK ? `guia: ${checked} exemplos conferidos, ${bad} problema(s)` : `guia: ${made} imagens, ${checked} exemplos, ${bad} problema(s)`);
process.exit(bad ? 1 : 0);
