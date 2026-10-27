/* Weasel — sons na linha de comando: acha o arquivo (relativo ao arquivo que usa), lê o .wav (o lip sync
   automático precisa das amostras) e pergunta a duração dos outros formatos (.mp3, .ogg…) ao ffprobe. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { W } = require('./runtime');

let probeBin;
function probeDuration(file) {
  if (probeBin === undefined) {
    probeBin = null;
    for (const bin of [process.env.WEASEL_FFPROBE, 'ffprobe'].filter(Boolean)) {
      const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
      if (!r.error && r.status === 0) { probeBin = bin; break; }
    }
  }
  if (!probeBin) return null;
  const r = spawnSync(probeBin, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = parseFloat(r.stdout);
  return Number.isFinite(d) ? d : null;
}

// dirOf(arquivo que usa) → pasta onde procurar; onFile(caminho) é avisado de cada som achado (--watch)
function makeMediaResolver(dirOf, onFile) {
  const cache = new Map();
  return (name, from) => {
    const p = path.resolve(dirOf(from), name);
    if (cache.has(p)) return cache.get(p);
    let info = null;
    if (fs.existsSync(p)) {
      try {
        info = W.audio.parseWav(fs.readFileSync(p));
      } catch (e) {
        info = { kind: 'other', duration: probeDuration(p), mono: null };
      }
      info.path = p;
      if (onFile) onFile(p);
    }
    cache.set(p, info);
    return info;
  };
}

module.exports = { makeMediaResolver, probeDuration };
