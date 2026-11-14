/* Weasel — vídeo MP4 no navegador: os quadros são comprimidos pelo próprio navegador (WebCodecs, H.264) e este
   módulo monta o arquivo .mp4 em volta deles, com o índice (moov) na frente, como o WhatsApp e os celulares
   gostam. Na linha de comando quem faz o MP4 é o ffmpeg. */
(function (W) {
  'use strict';

  const enc = new TextEncoder();
  const b16 = (v) => [(v >> 8) & 255, v & 255];
  const b32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const zeros = (n) => new Uint8Array(n);
  const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];
  // uma lista de números de 32 bits (as tabelas podem ter milhares)
  function u32s(list) {
    const out = new Uint8Array(list.length * 4);
    const v = new DataView(out.buffer);
    list.forEach((x, i) => v.setUint32(i * 4, x));
    return out;
  }
  function concat(parts) {
    const list = parts.map((p) => (p instanceof Uint8Array ? p : typeof p === 'string' ? enc.encode(p) : new Uint8Array(p)));
    let n = 0;
    for (const p of list) n += p.length;
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of list) { out.set(p, o); o += p.length; }
    return out;
  }
  // uma caixa do MP4: tamanho, tipo e conteúdo; a "full box" tem ainda a versão e as flags
  const box = (type, ...parts) => { const body = concat(parts); return concat([b32(body.length + 8), type, body]); };
  const full = (type, version, flags, ...parts) => box(type, [version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255], ...parts);

  // Monta o .mp4. chunks: os quadros na ordem em que o codificador os entregou (a de decodificar):
  // [{ data: Uint8Array, us: tempo do quadro em microssegundos, key: quadro-chave? }]
  // o: { width, height, fps, description: a configuração do H.264 (avcC) que o codificador deu }
  function mux(chunks, o) {
    const n = chunks.length;
    if (!n) throw new Error('nenhum quadro');
    const ts = Math.round(o.fps * 1000); // cada quadro dura 1000 nessa escala
    const pts = chunks.map((c) => Math.round((c.us * ts) / 1e6));
    // quadros fora de ordem (B-frames): o tempo de mostrar vem no ctts e o começo é ajustado no elst
    let shift = 0;
    pts.forEach((p, i) => { shift = Math.max(shift, i * 1000 - p); });
    const cts = pts.map((p, i) => p + shift - i * 1000);
    const mediaDur = n * 1000, movieDur = Math.round(mediaDur / (ts / 1000));
    const keys = [];
    chunks.forEach((c, i) => { if (c.key) keys.push(i + 1); });
    const moov = (offset) => box('moov',
      full('mvhd', 0, 0, b32(0), b32(0), b32(1000), b32(movieDur), b32(0x00010000), b16(0x0100), zeros(10), u32s(MATRIX), zeros(24), b32(2)),
      box('trak',
        full('tkhd', 0, 3, b32(0), b32(0), b32(1), b32(0), b32(movieDur), zeros(8), b16(0), b16(0), b16(0), b16(0), u32s(MATRIX), b32(o.width * 65536), b32(o.height * 65536)),
        shift ? box('edts', full('elst', 0, 0, b32(1), b32(movieDur), b32(shift), b32(0x00010000))) : zeros(0),
        box('mdia',
          full('mdhd', 0, 0, b32(0), b32(0), b32(ts), b32(mediaDur), b16(0x55c4), b16(0)),
          full('hdlr', 0, 0, b32(0), 'vide', zeros(12), 'VideoHandler\0'),
          box('minf',
            full('vmhd', 0, 1, zeros(8)),
            box('dinf', full('dref', 0, 0, b32(1), full('url ', 0, 1))),
            box('stbl',
              full('stsd', 0, 0, b32(1), box('avc1',
                zeros(6), b16(1), zeros(16), b16(o.width), b16(o.height), b32(0x00480000), b32(0x00480000), b32(0), b16(1),
                [6, ...enc.encode('Weasel')], zeros(25), b16(0x0018), b16(0xffff),
                box('avcC', o.description), box('pasp', b32(1), b32(1)))),
              full('stts', 0, 0, b32(1), b32(n), b32(1000)),
              keys.length < n ? full('stss', 0, 0, b32(keys.length), u32s(keys)) : zeros(0),
              cts.some((v) => v) ? full('ctts', 0, 0, b32(n), u32s(cts.flatMap((v) => [1, v]))) : zeros(0),
              full('stsc', 0, 0, b32(1), b32(1), b32(n), b32(1)),
              full('stsz', 0, 0, b32(0), b32(n), u32s(chunks.map((c) => c.data.length))),
              full('stco', 0, 0, b32(1), b32(offset)))))));
    const ftyp = box('ftyp', 'isom', b32(0x200), 'isom', 'iso2', 'avc1', 'mp41');
    // o moov vai antes dos quadros (toca enquanto baixa): primeiro o tamanho dele, depois onde os quadros começam
    const size = moov(0).length;
    const data = concat(chunks.map((c) => c.data));
    return new Blob([ftyp, moov(ftyp.length + size + 8), concat([b32(data.length + 8), 'mdat']), data], { type: 'video/mp4' });
  }

  // Lê as caixas de um .mp4 (para os testes e para conferir): [{ type, size, at, kids }]
  function boxes(bytes, from, to) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = [];
    const nest = { moov: 8, trak: 8, mdia: 8, minf: 8, stbl: 8, dinf: 8, edts: 8, stsd: 16, avc1: 86 };
    for (let p = from || 0, end = to === undefined ? bytes.length : to; p + 8 <= end;) {
      const size = v.getUint32(p), type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
      const b = { type, size, at: p };
      if (nest[type]) b.kids = boxes(bytes, p + nest[type], p + size);
      out.push(b);
      p += Math.max(8, size);
    }
    return out;
  }

  // Devolve a vez para a página ou o worker (progresso, codificador), sem o setTimeout que a aba escondida segura.
  function yieldTask() {
    return new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => { ch.port1.close(); r(); }; ch.port2.postMessage(0); });
  }

  // Os níveis do H.264: [código, macroblocos por quadro, macroblocos por segundo]. Fica no menor que cabe,
  // o que os celulares tocam melhor.
  const LEVELS = [[0x1e, 1620, 40500], [0x1f, 3600, 108000], [0x20, 5120, 216000], [0x28, 8192, 245760], [0x2a, 8704, 522240], [0x32, 22080, 589824], [0x33, 36864, 983040], [0x34, 36864, 2073600]];
  // Que H.264 o navegador sabe gravar neste tamanho (High, senão Main, senão Baseline), ou null.
  async function pickCodec(width, height, fps) {
    if (typeof VideoEncoder === 'undefined') return null;
    const mbs = Math.ceil(width / 16) * Math.ceil(height / 16);
    const level = LEVELS.find(([, fs, rate]) => mbs <= fs && mbs * fps <= rate);
    if (!level) return null;
    const lv = level[0].toString(16).padStart(2, '0');
    for (const profile of ['6400', '4d00', '4200']) {
      const config = { codec: `avc1.${profile}${lv}`, width, height, framerate: fps, bitrate: Math.round(Math.min(40e6, Math.max(400e3, width * height * fps * 0.2))), latencyMode: 'quality', avc: { format: 'avc' } };
      try {
        const r = await VideoEncoder.isConfigSupported(config);
        if (r.supported) return { name: 'h264', config };
      } catch (e) { /* tenta o próximo */ }
    }
    return null;
  }

  // Grava um MP4: drawFrame(i) devolve o canvas do quadro i (de 0 a n-1), todos do mesmo tamanho, par.
  // onProgress(i, n); cancelled() → true interrompe. O mesmo jeito do W.webm.record.
  async function record(n, fps, width, height, drawFrame, onProgress, cancelled) {
    const codec = await pickCodec(width, height, fps);
    if (!codec) throw new Error(`este navegador não grava MP4 (H.264) em ${width} × ${height}; use uma escala menor ou a linha de comando`);
    const chunks = [];
    let failure = null, description = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        const d = meta && meta.decoderConfig && meta.decoderConfig.description;
        if (d && !description) description = new Uint8Array(ArrayBuffer.isView(d) ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d.slice(0));
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        chunks.push({ data, us: chunk.timestamp, key: chunk.type === 'key' });
      },
      error: (e) => { failure = e; },
    });
    encoder.configure(codec.config);
    const gop = Math.max(1, Math.round(fps * 2));
    for (let i = 0; i < n; i++) {
      if (failure) throw failure;
      if (cancelled && cancelled()) { encoder.close(); return null; }
      const frame = new VideoFrame(drawFrame(i), { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: i % gop === 0 });
      frame.close();
      if (onProgress) onProgress(i + 1, n);
      while (encoder.encodeQueueSize > 4) await yieldTask();
      if (i % 4 === 3) await yieldTask();
    }
    await encoder.flush();
    encoder.close();
    if (failure) throw failure;
    if (!description) throw new Error('o codificador H.264 do navegador não deu a configuração do vídeo (avcC)');
    return { blob: mux(chunks, { width, height, fps, description }), codec: codec.config.codec };
  }

  W.mp4 = { mux, boxes, record, pickCodec };
})(window.Weasel = window.Weasel || {});
