/* Weasel — renderiza quadros de um filme numa thread separada (weasel --jobs N).
   Cada thread lê o filme por conta própria; como todo quadro é calculado só a partir do número dele,
   a ordem em que as threads trabalham não muda nada no resultado. */
'use strict';
const fs = require('fs');
const path = require('path');
const { parentPort, workerData } = require('worker_threads');
const { W } = require('./runtime');

const { src, name, dir, scale, transparent } = workerData;
const dirs = new Map([[name, dir]]);
const resolve = (file, from) => {
  const p = path.resolve(dirs.get(from) || dir, file);
  try {
    const t = fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
    dirs.set(file, path.dirname(p));
    return t;
  } catch (e) {
    return null;
  }
};
const model = W.lang.parse(src, { file: name, resolve });

parentPort.on('message', (job) => {
  try {
    const cv = W.film.renderFrame(model, job.f, { scale, transparent });
    if (job.kind === 'raw') {
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      const buf = d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength);
      parentPort.postMessage({ f: job.f, w: cv.width, h: cv.height, buf }, [buf]);
    } else {
      const bytes = job.kind === 'jpg' ? cv.toBuffer('image/jpeg', job.quality) : cv.toBuffer('image/png');
      fs.mkdirSync(path.dirname(job.out), { recursive: true });
      fs.writeFileSync(job.out, bytes);
      parentPort.postMessage({ f: job.f, w: cv.width, h: cv.height, bytes: bytes.length });
    }
  } catch (e) {
    parentPort.postMessage({ f: job.f, error: e.stack || e.message });
  }
});
