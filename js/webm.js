/* Weasel — vídeo no navegador: os quadros são comprimidos pelo próprio navegador (WebCodecs, VP9 ou VP8)
   e este módulo monta o arquivo .webm (Matroska) em volta deles. Na linha de comando quem faz isso é o ffmpeg. */
(function (W) {
  'use strict';

  // ---------- EBML (o formato de caixas do Matroska) ----------
  function idBytes(id) {
    const out = [];
    for (let v = id; v > 0; v = Math.floor(v / 256)) out.unshift(v & 255);
    return out;
  }
  function uintBytes(v) {
    const out = [];
    do { out.unshift(v % 256); v = Math.floor(v / 256); } while (v > 0);
    return out;
  }
  // tamanho em "vint": o primeiro byte diz quantos bytes o número usa
  function sizeBytes(n) {
    for (let len = 1; len <= 8; len++) {
      if (n < Math.pow(2, 7 * len) - 1) {
        const out = new Array(len);
        let v = n;
        for (let i = len - 1; i >= 0; i--) { out[i] = v % 256; v = Math.floor(v / 256); }
        out[0] |= 1 << (8 - len);
        return out;
      }
    }
    throw new Error('elemento grande demais');
  }
  const enc = new TextEncoder();
  // um elemento: id, tamanho, conteúdo (bytes, número, texto, float ou lista de elementos)
  function el(id, body) {
    let data;
    if (Array.isArray(body)) data = concat(body);
    else if (body instanceof Uint8Array) data = body;
    else if (typeof body === 'string') data = enc.encode(body);
    else if (body && body.float !== undefined) { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, body.float); data = new Uint8Array(b.buffer); } else data = new Uint8Array(uintBytes(body));
    return concat([new Uint8Array(idBytes(id)), new Uint8Array(sizeBytes(data.length)), data]);
  }
  function concat(parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }

  // Monta o .webm. chunks: [{ data: Uint8Array, ms: tempo em milissegundos, key: quadro-chave? }]
  function mux(chunks, o) {
    const head = el(0x1A45DFA3, [el(0x4286, 1), el(0x42F7, 1), el(0x42F2, 4), el(0x42F3, 8), el(0x4282, 'webm'), el(0x4287, 4), el(0x4285, 2)]);
    const info = el(0x1549A966, [el(0x2AD7B1, 1000000), el(0x4D80, 'Weasel'), el(0x5741, 'Weasel'), el(0x4489, { float: o.durationMs })]);
    const tracks = el(0x1654AE6B, [el(0xAE, [
      el(0xD7, 1), el(0x73C5, 1), el(0x83, 1), el(0x9C, 0), el(0x86, o.codec === 'vp8' ? 'V_VP8' : 'V_VP9'),
      el(0x23E383, Math.round(1e9 / o.fps)),
      el(0xE0, [el(0xB0, o.width), el(0xBA, o.height)]),
    ])]);
    // um cluster por quadro-chave (o tempo de cada bloco é relativo ao cluster e cabe em 16 bits)
    const clusters = [];
    let cur = null;
    for (const c of chunks) {
      if (!cur || c.key || c.ms - cur.ms > 30000) { cur = { ms: c.ms, blocks: [] }; clusters.push(cur); }
      const hdr = new Uint8Array(4);
      hdr[0] = 0x81; // trilha 1
      const rel = c.ms - cur.ms;
      hdr[1] = (rel >> 8) & 255;
      hdr[2] = rel & 255;
      hdr[3] = c.key ? 0x80 : 0;
      cur.blocks.push(el(0xA3, concat([hdr, c.data])));
    }
    const body = [info, tracks, ...clusters.map((k) => el(0x1F43B675, [el(0xE7, k.ms), ...k.blocks]))];
    return new Blob([head, el(0x18538067, body)], { type: 'video/webm' });
  }

  // Devolve a vez para a página (progresso, codificador). Não usa setTimeout, que o navegador
  // segura em até 1 vez por segundo quando a aba está em segundo plano.
  function yieldTask() {
    return new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => { ch.port1.close(); r(); }; ch.port2.postMessage(0); });
  }

  // Que codec o navegador sabe gravar neste tamanho (VP9, senão VP8), ou null.
  async function pickCodec(width, height, fps) {
    if (typeof VideoEncoder === 'undefined') return null;
    for (const [name, codec] of [['vp9', 'vp09.00.10.08'], ['vp8', 'vp8']]) {
      const config = { codec, width, height, framerate: fps, bitrate: Math.round(width * height * fps * 0.12), latencyMode: 'quality' };
      try {
        const r = await VideoEncoder.isConfigSupported(config);
        if (r.supported) return { name, config };
      } catch (e) { /* tenta o próximo */ }
    }
    return null;
  }

  // Grava um vídeo: drawFrame(i) devolve o canvas do quadro i (de 0 a n-1).
  // onProgress(i, n); cancelled() → true interrompe.
  async function record(n, fps, width, height, drawFrame, onProgress, cancelled) {
    const codec = await pickCodec(width, height, fps);
    if (!codec) throw new Error('este navegador não grava vídeo (WebCodecs); use a sequência PNG ou a linha de comando');
    const chunks = [];
    let failure = null;
    const encoder = new VideoEncoder({
      output: (chunk) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        chunks.push({ data, ms: Math.round(chunk.timestamp / 1000), key: chunk.type === 'key' });
      },
      error: (e) => { failure = e; },
    });
    encoder.configure(codec.config);
    const gop = Math.max(1, Math.round(fps * 2));
    for (let i = 0; i < n; i++) {
      if (failure) throw failure;
      if (cancelled && cancelled()) { encoder.close(); return null; }
      const cv = drawFrame(i);
      const frame = new VideoFrame(cv, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: i % gop === 0 });
      frame.close();
      if (onProgress) onProgress(i + 1, n);
      // não deixa a fila crescer demais (e devolve a vez para a página atualizar)
      while (encoder.encodeQueueSize > 4) await yieldTask();
      if (i % 4 === 3) await yieldTask();
    }
    await encoder.flush();
    encoder.close();
    if (failure) throw failure;
    chunks.sort((a, b) => a.ms - b.ms);
    return { blob: mux(chunks, { width, height, fps, codec: codec.name, durationMs: (n * 1000) / fps }), codec: codec.name };
  }

  W.webm = { mux, record, pickCodec, yieldTask };
})(window.Weasel = window.Weasel || {});
