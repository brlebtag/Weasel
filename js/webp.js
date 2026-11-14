/* Weasel — WebP animado: cada quadro é gravado em WebP pelo próprio canvas (o navegador ou, na linha de comando, o
   @napi-rs/canvas) e este módulo junta os quadros num arquivo animado (RIFF: VP8X, ANIM e um ANMF por quadro). */
(function (W) {
  'use strict';

  const enc = new TextEncoder();
  const u16 = (v) => [v & 255, (v >> 8) & 255];
  const u24 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255];
  const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const fourcc = (b, p) => String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
  const rd32 = (b, p) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16)) + b[p + 3] * 16777216;
  const rd24 = (b, p) => b[p] | (b[p + 1] << 8) | (b[p + 2] << 16);

  function concat(parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  // um pedaço do RIFF: o nome, o tamanho e o conteúdo (com um byte a mais quando o tamanho é ímpar)
  function chunk(id, data) {
    const pad = data.length & 1;
    const out = new Uint8Array(8 + data.length + pad);
    out.set(enc.encode(id), 0);
    out.set(u32(data.length), 4);
    out.set(data, 8);
    return out;
  }
  // os pedaços de um RIFF/WEBP: [{ id, data, raw (o pedaço inteiro, com o cabeçalho) }]
  function chunks(bytes) {
    if (bytes.length < 12 || fourcc(bytes, 0) !== 'RIFF' || fourcc(bytes, 8) !== 'WEBP') throw new Error('não é um WebP');
    const out = [];
    for (let p = 12; p + 8 <= bytes.length;) {
      const n = rd32(bytes, p + 4), end = p + 8 + n;
      out.push({ id: fourcc(bytes, p), data: bytes.subarray(p + 8, end), raw: bytes.subarray(p, end + (n & 1)) });
      p = end + (n & 1);
    }
    return out;
  }

  // Junta os quadros. frames: [{ bytes: o WebP de um quadro, width, height, ms: quanto o quadro fica na tela }],
  // todos do mesmo tamanho; o.loop: quantas vezes toca (0 = sem fim); o.transparent: com transparência.
  // Cada quadro cobre a imagem toda e não se mistura com o anterior (assim o fundo transparente fica certo).
  function encode(frames, o) {
    o = o || {};
    if (!frames.length) throw new Error('nenhum quadro');
    const w = frames[0].width, h = frames[0].height;
    let alpha = !!o.transparent;
    const anmf = frames.map((f) => {
      // do WebP do quadro saem só a transparência (ALPH, no WebP com perdas) e a imagem (VP8 ou VP8L)
      const keep = chunks(f.bytes).filter((c) => c.id === 'ALPH' || c.id === 'VP8 ' || c.id === 'VP8L');
      if (!keep.some((c) => c.id === 'VP8 ' || c.id === 'VP8L')) throw new Error('quadro WebP sem imagem');
      if (keep.some((c) => c.id === 'ALPH')) alpha = true;
      const head = new Uint8Array([...u24(0), ...u24(0), ...u24(w - 1), ...u24(h - 1), ...u24(Math.max(1, Math.min(0xffffff, Math.round(f.ms)))), 0x02]);
      return chunk('ANMF', concat([head, ...keep.map((c) => c.raw)]));
    });
    // VP8X: animação (0x02) e, se houver, transparência (0x10); o tamanho da imagem vai menos 1
    const vp8x = chunk('VP8X', new Uint8Array([alpha ? 0x12 : 0x02, 0, 0, 0, ...u24(w - 1), ...u24(h - 1)]));
    // ANIM: a cor de fundo (azul, verde, vermelho, alfa) e as repetições
    const anim = chunk('ANIM', new Uint8Array([...(alpha ? [0, 0, 0, 0] : [255, 255, 255, 255]), ...u16(o.loop || 0)]));
    const body = concat([enc.encode('WEBP'), vp8x, anim, ...anmf]);
    return concat([enc.encode('RIFF'), new Uint8Array(u32(body.length)), body]);
  }

  // Lê um WebP animado (para os testes e para conferir): o tamanho, as repetições e cada quadro
  function parse(bytes) {
    const list = chunks(bytes);
    const x = list.find((c) => c.id === 'VP8X');
    const a = list.find((c) => c.id === 'ANIM');
    return {
      width: x ? rd24(x.data, 4) + 1 : 0,
      height: x ? rd24(x.data, 7) + 1 : 0,
      flags: x ? x.data[0] : 0,
      loop: a ? a.data[4] | (a.data[5] << 8) : null,
      frames: list.filter((c) => c.id === 'ANMF').map((c) => ({
        x: rd24(c.data, 0) * 2, y: rd24(c.data, 3) * 2, width: rd24(c.data, 6) + 1, height: rd24(c.data, 9) + 1,
        ms: rd24(c.data, 12), flags: c.data[15],
        parts: chunks(concat([enc.encode('RIFF'), new Uint8Array(4), enc.encode('WEBP'), c.data.subarray(16)])).map((p) => p.id.trim()),
      })),
    };
  }

  // O WebP de um quadro: o canvas da página, o OffscreenCanvas (no worker) ou o da linha de comando.
  // q de 0 a 1 (1 = sem perdas, no Chrome e no @napi-rs/canvas). Navegador que não grava WebP (o Safari devolve PNG): erro.
  async function frameBytes(canvas, q) {
    let bytes;
    if (canvas.toBuffer) bytes = new Uint8Array(canvas.toBuffer('image/webp', Math.round(q * 100)));
    else {
      const blob = canvas.convertToBlob ? await canvas.convertToBlob({ type: 'image/webp', quality: q }) : await new Promise((res) => canvas.toBlob(res, 'image/webp', q));
      bytes = new Uint8Array(await blob.arrayBuffer());
    }
    if (bytes.length < 12 || fourcc(bytes, 8) !== 'WEBP') throw new Error('este navegador não grava WebP; use o Chrome, o Edge ou o Firefox, ou a linha de comando');
    return bytes;
  }

  W.webp = { encode, parse, frameBytes };
})(window.Weasel = window.Weasel || {});
