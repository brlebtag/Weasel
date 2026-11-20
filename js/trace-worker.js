/* Weasel — o worker do Traçado de imagem (Objeto › Traçado de imagem…, js/ui-trace.js): a conta do js/trace.js
   fora da página, para o painel e o desenho não travarem (uma imagem de 1 Mpx leva de 1 a 3 s, a de 2 Mpx até 10).
   Recebe os pixels e as opções; avisa o progresso e devolve o traçado sem as linhas (a página monta as dela, no lugar
   e no tamanho da imagem, com os nomes do desenho). Mudar um controle no painel encerra este worker e abre outro. */
'use strict';
self.window = self;
// com o ?v= da página (o js/ui-trace.js abre este arquivo com ele)
importScripts(`trace.js${self.location.search}`);

self.onmessage = (e) => {
  const job = e.data;
  const progress = (f, what) => self.postMessage({ type: 'progress', f, what });
  try {
    const res = self.Weasel.trace.trace(job.img, Object.assign({}, job.opts, { progress, body: false }));
    self.postMessage({ type: 'done', res });
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
  }
};
