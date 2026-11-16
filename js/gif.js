/* Weasel — codificador de GIF animado (paleta por median cut + LZW), sem dependências. */
(function (W) {
  'use strict';

  class Bytes {
    constructor(n) { this.buf = new Uint8Array(n || 1 << 16); this.len = 0; }
    grow(n) {
      if (this.len + n <= this.buf.length) return;
      let size = this.buf.length * 2;
      while (size < this.len + n) size *= 2;
      const b = new Uint8Array(size); b.set(this.buf.subarray(0, this.len)); this.buf = b;
    }
    byte(v) { this.grow(1); this.buf[this.len++] = v & 255; }
    word(v) { this.byte(v); this.byte(v >> 8); }
    str(s) { for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i)); }
    bytes(a, n) { this.grow(n); this.buf.set(a.subarray(0, n), this.len); this.len += n; }
    result() { return this.buf.slice(0, this.len); }
    // o que já foi escrito (para gravar no arquivo e continuar do zero; vale até a próxima escrita)
    drain() { const v = this.buf.subarray(0, this.len); this.len = 0; return v; }
  }

  // As cores dos quadros (cubos de 5 bits por canal), para a paleta: uma amostra de cada quadro. Juntar um quadro
  // de cada vez (sample) dá a mesma paleta de quando estão todos juntos: as somas são de inteiros.
  function histogram() {
    return { count: new Uint32Array(32768), sr: new Float64Array(32768), sg: new Float64Array(32768), sb: new Float64Array(32768) };
  }
  function sample(H, img, transparent) {
    const d = img.data, { count, sr, sg, sb } = H;
    const step = Math.max(1, Math.floor(d.length / 4 / 400000)) * 4;
    for (let i = 0; i < d.length; i += step) {
      if (transparent && d[i + 3] < 128) continue;
      const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      count[k]++; sr[k] += d[i]; sg[k] += d[i + 1]; sb[k] += d[i + 2];
    }
  }

  // As cores que H juntou, só as que apareceram (e H volta a zero), para somar em outro H com addColors: cada thread
  // de render manda as cores do seu quadro, e a soma dá a mesma paleta.
  function takeColors(H) {
    const { count, sr, sg, sb } = H;
    let m = 0;
    for (let k = 0; k < 32768; k++) if (count[k]) m++;
    const ks = new Uint16Array(m), n = new Uint32Array(m), s = new Float64Array(m * 3);
    for (let k = 0, i = 0; k < 32768; k++) {
      if (!count[k]) continue;
      ks[i] = k; n[i] = count[k]; s[i * 3] = sr[k]; s[i * 3 + 1] = sg[k]; s[i * 3 + 2] = sb[k];
      count[k] = 0; sr[k] = 0; sg[k] = 0; sb[k] = 0;
      i++;
    }
    return { k: ks, n, s };
  }
  function addColors(H, C) {
    for (let i = 0; i < C.k.length; i++) {
      const k = C.k[i];
      H.count[k] += C.n[i]; H.sr[k] += C.s[i * 3]; H.sg[k] += C.s[i * 3 + 1]; H.sb[k] += C.s[i * 3 + 2];
    }
  }

  // Paleta de até maxColors cores para as cores juntadas em H (median cut).
  function paletteOf(H, maxColors) {
    const { count, sr, sg, sb } = H;
    const bins = [];
    for (let k = 0; k < 32768; k++) if (count[k]) bins.push(k);
    if (!bins.length) { bins.push(0); count[0] = 1; }
    const ch = (k, c) => (c === 0 ? k >> 10 : c === 1 ? (k >> 5) & 31 : k & 31);
    const box = (list) => {
      let n = 0;
      const lo = [31, 31, 31], hi = [0, 0, 0];
      for (const k of list) {
        n += count[k];
        for (let c = 0; c < 3; c++) { const v = ch(k, c); if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }
      }
      const range = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
      const axis = range[0] >= range[1] && range[0] >= range[2] ? 0 : range[1] >= range[2] ? 1 : 2;
      return { list, n, axis, score: list.length > 1 ? n * (range[axis] + 1) : -1 };
    };
    const boxes = [box(bins)];
    while (boxes.length < maxColors) {
      let bi = -1, best = 0;
      boxes.forEach((b, i) => { if (b.score > best) { best = b.score; bi = i; } });
      if (bi < 0) break;
      const b = boxes[bi];
      b.list.sort((p, q) => ch(p, b.axis) - ch(q, b.axis));
      let acc = 0, cut = 1;
      for (let i = 0; i < b.list.length; i++) { acc += count[b.list[i]]; if (acc >= b.n / 2) { cut = Math.min(b.list.length - 1, Math.max(1, i + 1)); break; } }
      boxes.splice(bi, 1, box(b.list.slice(0, cut)), box(b.list.slice(cut)));
    }
    return boxes.map((b) => {
      let n = 0, r = 0, g = 0, bl = 0;
      for (const k of b.list) { n += count[k]; r += sr[k]; g += sg[k]; bl += sb[k]; }
      return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
    });
  }

  const codes = new Uint16Array(1 << 20), gens = new Uint16Array(1 << 20);
  let gen = 0;
  function nextGen() { gen++; if (gen > 65535) { gens.fill(0); gen = 1; } }

  function lzw(out, idx, minCode) {
    out.byte(minCode);
    const clear = 1 << minCode, eoi = clear + 1;
    let next = eoi + 1, size = minCode + 1;
    const block = new Uint8Array(255);
    let bl = 0, cur = 0, shift = 0;
    const flushByte = () => {
      block[bl++] = cur & 255; cur >>>= 8; shift -= 8;
      if (bl === 255) { out.byte(255); out.bytes(block, 255); bl = 0; }
    };
    const emit = (code) => { cur |= code << shift; shift += size; while (shift >= 8) flushByte(); };
    nextGen();
    emit(clear);
    let prefix = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], key = (prefix << 8) | k;
      if (gens[key] === gen) { prefix = codes[key]; continue; }
      emit(prefix);
      if (next === 4096) {
        emit(clear);
        next = eoi + 1; size = minCode + 1; nextGen();
      } else {
        if (next >= 1 << size) size++;
        codes[key] = next++; gens[key] = gen;
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (shift > 0) { cur &= 255; shift = 8; flushByte(); }
    if (bl) { out.byte(bl); out.bytes(block, bl); }
    out.byte(0);
  }

  // A chave de cada ponto: a cor em 5 bits por canal (depois do pontilhado), ou TKEY no ponto transparente.
  // K (opcional): onde escrever, do tamanho da imagem.
  const TKEY = 32768;
  // pontilhado ordenado (Bayer 4×4): troca faixas de cor por um padrão fino
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  function keysOf(img, transparent, dither, K) {
    const d = img.data, w = img.width, h = img.height;
    if (!K) K = new Uint16Array(w * h);
    const amp = dither ? 34 * Math.min(1, Math.max(0, dither === true ? 1 : dither)) : 0;
    if (!amp) {
      // sem pontilhado, só inteiros
      for (let i = 0, j = 0, n = w * h; j < n; i += 4, j++) {
        K[j] = transparent && d[i + 3] < 128 ? TKEY : ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      }
      return K;
    }
    // o deslocamento do pontilhado em cada uma das 16 posições da grade 4×4 (linha y & 3, coluna x & 3)
    const off = BAYER.map((v) => (v / 16 - 0.47) * amp);
    for (let y = 0, i = 0, j = 0; y < h; y++) {
      const row = (y & 3) << 2;
      for (let x = 0; x < w; x++, i += 4, j++) {
        if (transparent && d[i + 3] < 128) { K[j] = TKEY; continue; }
        const o = off[row | (x & 3)], r = cl(d[i] + o), g = cl(d[i + 1] + o), b = cl(d[i + 2] + o);
        K[j] = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      }
    }
    return K;
  }

  // O GIF em partes: o cabeçalho com a paleta (pal) para count quadros w×h, depois frame(K, fi) com as chaves de cada
  // quadro, e end(). out: os bytes (quem chama pode gravar e esvaziar com out.drain() entre uma parte e outra).
  // opts: { delay (centésimos de s, número ou lista), loop (0 = sempre), transparent }
  function writer(pal, w, h, count, opts, out) {
    opts = opts || {};
    const transparent = !!opts.transparent;
    const tIndex = transparent ? pal.length : 0;
    const cache = new Int16Array(32768).fill(-1);
    const nearest = (k, r, g, b) => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < pal.length; i++) {
        const p = pal[i], dr = p[0] - r, dg = p[1] - g, db = p[2] - b;
        const d = dr * dr * 3 + dg * dg * 4 + db * db * 2;
        if (d < bd) { bd = d; best = i; }
      }
      cache[k] = best;
      return best;
    };
    if (!out) out = new Bytes();
    out.str('GIF89a');
    out.word(w); out.word(h);
    out.byte(0xf7); out.byte(0); out.byte(0);
    for (let i = 0; i < 256; i++) { const p = pal[i] || [0, 0, 0]; out.byte(p[0]); out.byte(p[1]); out.byte(p[2]); }
    if (count > 1) {
      out.byte(0x21); out.byte(0xff); out.byte(11); out.str('NETSCAPE2.0');
      out.byte(3); out.byte(1); out.word(opts.loop || 0); out.byte(0);
    }
    const idx = new Uint8Array(w * h);
    return {
      out,
      frame(K, fi) {
        for (let j = 0; j < idx.length; j++) {
          const k = K[j];
          if (k === TKEY) { idx[j] = tIndex; continue; }
          const c = cache[k];
          idx[j] = c >= 0 ? c : nearest(k, (k >> 10) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4);
        }
        const delay = Array.isArray(opts.delay) ? opts.delay[fi] : opts.delay || 8;
        out.byte(0x21); out.byte(0xf9); out.byte(4);
        out.byte(((transparent ? 2 : 1) << 2) | (transparent ? 1 : 0));
        out.word(Math.max(2, Math.round(delay)));
        out.byte(tIndex); out.byte(0);
        out.byte(0x2c); out.word(0); out.word(0); out.word(w); out.word(h); out.byte(0);
        lzw(out, idx, 8);
      },
      end() { out.byte(0x3b); },
    };
  }

  /**
   * frames: ImageData[] do mesmo tamanho. opts: { delay (centésimos de s, número ou lista), loop (0 = sempre), transparent, dither }
   */
  function encode(frames, opts) {
    opts = opts || {};
    const w = frames[0].width, h = frames[0].height;
    const transparent = !!opts.transparent;
    const H = histogram();
    for (const img of frames) sample(H, img, transparent);
    const g = writer(paletteOf(H, transparent ? 255 : 256), w, h, frames.length, opts, new Bytes(w * h * frames.length / 3 + 2048));
    const K = new Uint16Array(w * h);
    frames.forEach((img, fi) => g.frame(keysOf(img, transparent, opts.dither, K), fi));
    g.end();
    return g.out.result();
  }

  W.gif = { encode, histogram, sample, takeColors, addColors, paletteOf, keysOf, writer };
})(window.Weasel = window.Weasel || {});
