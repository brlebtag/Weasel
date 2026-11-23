/* Weasel — o worker da exportação: a folha de quadros, o Godot e o GIF de um desenho são feitos aqui, fora da página,
   para a janela de exportar não travar. Carrega os mesmos módulos que a linha de comando (cli/runtime.js) e, como ela,
   dá a eles só o que usam da página (window, document e CSS), agora em cima do OffscreenCanvas do navegador.
   Recebe o código, os outros arquivos do projeto e as opções da janela; avisa o progresso e devolve os arquivos.
   Também faz as miniaturas dos estilos de arte do painel Acabamento e estilo (js/ui-style.js): um pedido novo
   abandona o anterior. */
'use strict';
self.window = self;
self.document = { createElement: () => new OffscreenCanvas(1, 1) };
// os desenhos leem os pixels o tempo todo (o recorte, os estilos, o normal map): o canvas fica na memória, e não na
// placa de vídeo, onde cada leitura custa caro (sem isso, o Godot do Cavaleiro levava 5 vezes mais)
const getContext = OffscreenCanvas.prototype.getContext;
OffscreenCanvas.prototype.getContext = function (type, opts) {
  return getContext.call(this, type, type === '2d' ? Object.assign({ willReadFrequently: true }, opts) : opts);
};
if (typeof CSS === 'undefined') {
  const probe = new OffscreenCanvas(1, 1).getContext('2d');
  self.CSS = {
    supports(prop, v) {
      probe.fillStyle = '#010203';
      probe.fillStyle = v;
      return prop === 'color' && probe.fillStyle !== '#010203';
    },
  };
}
// a mesma lista do cli/runtime.js, com o ?v= da página (o js/export.js abre este arquivo com ele)
importScripts(...['geom', 'lang', 'views', 'art', 'scene', 'film', 'audio', 'nle', 'normal', 'svg', 'gif', 'webp', 'mp4', 'zip', 'export', 'godot', 'rig'].map((f) => `${f}.js${self.location.search}`));

// as miniaturas: uma por estilo, cada uma devolvida assim que fica pronta (um ImageBitmap, sem cópia). Entre uma e
// outra, uma pausa para um pedido novo chegar: ele abandona este.
let thumbJob = 0;
async function thumbs(job) {
  thumbJob = job.id;
  const files = new Map(job.files);
  const resolve = (name) => {
    for (const k of [name, name + '.weasel']) if (files.has(k)) return files.get(k);
    return null;
  };
  const W = self.Weasel;
  let m = null, pose = null;
  try {
    m = W.lang.parse(job.text, { file: job.file, resolve, variant: job.variant || null });
    if (!m.film) pose = W.scene.makePose(m, job.anim || null, job.frame || 0);
  } catch (err) {
    self.postMessage({ type: 'thumbs-error', id: job.id, message: err && err.message ? err.message : String(err) });
    return;
  }
  for (const style of job.styles) {
    await new Promise((r) => setTimeout(r, 0));
    if (thumbJob !== job.id) return;
    let bmp = null;
    try { bmp = W.exporter.artThumb(m, style, { w: job.w, h: job.h, frame: job.frame || 0, pose }).transferToImageBitmap(); } catch (err) { bmp = null; }
    self.postMessage({ type: 'thumb', id: job.id, style, bmp }, bmp ? [bmp] : []);
  }
  self.postMessage({ type: 'thumbs-done', id: job.id });
}

self.onmessage = async (e) => {
  const job = e.data;
  if (job.type === 'thumbs') { thumbs(job); return; }
  const files = new Map(job.files);
  const resolve = (name) => {
    for (const k of [name, name + '.weasel']) if (files.has(k)) return files.get(k);
    return null;
  };
  const parse = (variant) => self.Weasel.lang.parse(job.text, { file: job.file, resolve, variant: variant || null });
  const progress = (phase, i, n) => self.postMessage({ type: 'progress', phase, i, n });
  try {
    const result = await self.Weasel.exporter.exportJob(job.kind, Object.assign(job.o, { progress }), parse, job.variants, job.all);
    self.postMessage({ type: 'done', result });
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
  }
};
