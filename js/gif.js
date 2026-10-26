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
  }

  // Paleta de até maxColors cores para todos os quadros (cubos de 5 bits por canal).
  function buildPalette(frames, transparent, maxColors) {
    const count = new Uint32Array(32768), sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
    for (const img of frames) {
      const d = img.data;
      const step = Math.max(1, Math.floor(d.length / 4 / 400000)) * 4;
      for (let i = 0; i < d.length; i += step) {
        if (transparent && d[i + 3] < 128) continue;
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        count[k]++; sr[k] += d[i]; sg[k] += d[i + 1]; sb[k] += d[i + 2];
      }
    }
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

  /**
   * frames: ImageData[] do mesmo tamanho. opts: { delay (centésimos de s, número ou lista), loop (0 = sempre), transparent }
   */
  function encode(frames, opts) {
    opts = opts || {};
    const w = frames[0].width, h = frames[0].height;
    const transparent = !!opts.transparent;
    const pal = buildPalette(frames, transparent, transparent ? 255 : 256);
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

    const out = new Bytes(w * h * frames.length / 3 + 2048);
    out.str('GIF89a');
    out.word(w); out.word(h);
    out.byte(0xf7); out.byte(0); out.byte(0);
    for (let i = 0; i < 256; i++) { const p = pal[i] || [0, 0, 0]; out.byte(p[0]); out.byte(p[1]); out.byte(p[2]); }
    if (frames.length > 1) {
      out.byte(0x21); out.byte(0xff); out.byte(11); out.str('NETSCAPE2.0');
      out.byte(3); out.byte(1); out.word(opts.loop || 0); out.byte(0);
    }
    const idx = new Uint8Array(w * h);
    frames.forEach((img, fi) => {
      const d = img.data;
      for (let i = 0, j = 0; j < idx.length; i += 4, j++) {
        if (transparent && d[i + 3] < 128) { idx[j] = tIndex; continue; }
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
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
    });
    out.byte(0x3b);
    return out.result();
  }

  W.gif = { encode };
})(window.Weasel = window.Weasel || {});
