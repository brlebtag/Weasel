/* Weasel — um quadro do GIF de filme pronto para guardar, sem os pixels: as cores dele para a paleta e a cor de
   15 bits de cada ponto, comprimida (~1/60 do tamanho). Usado pela linha de comando e pelas threads de render. */
'use strict';
const zlib = require('zlib');
const { W } = require('./runtime');

const H = W.gif.histogram();

function packFrame(cv, transparent, dither) {
  const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
  const img = { width: w, height: h, data: d };
  W.gif.sample(H, img, transparent);
  const K = W.gif.keysOf(img, transparent, dither);
  const keys = zlib.deflateRawSync(Buffer.from(K.buffer, K.byteOffset, K.byteLength), { level: 1 });
  return { w, h, colors: W.gif.takeColors(H), keys };
}

// as chaves de volta (Uint16Array de w×h)
function unpackKeys(keys) {
  let z = zlib.inflateRawSync(keys);
  if (z.byteOffset & 1) z = Buffer.from(z);
  return new Uint16Array(z.buffer, z.byteOffset, z.length >> 1);
}

module.exports = { packFrame, unpackKeys };
