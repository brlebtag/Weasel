/* Weasel — carrega o motor do editor web no Node: os módulos de js/ são scripts de navegador,
   então damos a eles só o que usam (window, document, Path2D, CSS) em cima do @napi-rs/canvas.
   Usado pela linha de comando, pelos testes e pelos processos de render paralelo. */
'use strict';
const path = require('path');

let canvasLib;
try {
  canvasLib = require('@napi-rs/canvas');
} catch (e) {
  console.error('weasel: falta a biblioteca de desenho. Rode "npm install" na pasta do projeto.');
  process.exit(3);
}
const { createCanvas, Path2D, loadImage } = canvasLib;

const MODULES = ['geom', 'lang', 'scene', 'film', 'audio', 'normal', 'svg', 'gif', 'zip', 'export', 'godot'];

if (!globalThis.Weasel) {
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
  for (const f of MODULES) require(path.join(__dirname, '..', 'js', f + '.js'));
}

module.exports = { W: globalThis.Weasel, createCanvas, loadImage, MODULES };
