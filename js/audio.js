/* Weasel — som do filme: lê e escreve WAV, faz o lip sync (pela força da voz num .wav, ou pelas bocas que o
   Rhubarb Lip Sync calculou) e escreve as legendas (.srt e .vtt). Não toca nada: quem toca é o editor
   (Web Audio) e quem mistura no vídeo é o ffmpeg. */
(function (W) {
  'use strict';

  // ---------- WAV ----------
  // PCM de 8, 16, 24 ou 32 bits, ou float; os canais viram um só (média).
  function parseWav(bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const tag = (o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
    if (u8.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('não é um arquivo WAV');
    let fmt = null, data = null;
    for (let o = 12; o + 8 <= u8.length;) {
      const id = tag(o), size = dv.getUint32(o + 4, true), body = o + 8;
      if (id === 'fmt ') {
        fmt = { format: dv.getUint16(body, true), channels: dv.getUint16(body + 2, true), rate: dv.getUint32(body + 4, true), bits: dv.getUint16(body + 14, true) };
        if (fmt.format === 0xfffe && size >= 26) fmt.format = dv.getUint16(body + 24, true);
      } else if (id === 'data') data = { o: body, size: Math.min(size, u8.length - body) };
      o = body + size + (size & 1);
    }
    if (!fmt || !data) throw new Error('WAV sem as partes fmt e data');
    const { format, channels, rate, bits } = fmt;
    const bps = bits / 8, frames = Math.floor(data.size / (bps * channels));
    let read;
    if (format === 1 && bits === 8) read = (o) => (u8[o] - 128) / 128;
    else if (format === 1 && bits === 16) read = (o) => dv.getInt16(o, true) / 32768;
    else if (format === 1 && bits === 24) read = (o) => (((u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16)) << 8) >> 8) / 8388608;
    else if (format === 1 && bits === 32) read = (o) => dv.getInt32(o, true) / 2147483648;
    else if (format === 3 && bits === 32) read = (o) => dv.getFloat32(o, true);
    else if (format === 3 && bits === 64) read = (o) => dv.getFloat64(o, true);
    else throw new Error(`WAV em formato que não sei ler (formato ${format}, ${bits} bits): use PCM 16 bits`);
    const mono = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      let s = 0;
      for (let c = 0; c < channels; c++) s += read(data.o + (i * channels + c) * bps);
      mono[i] = s / channels;
    }
    return { kind: 'wav', sampleRate: rate, channels, frames, duration: frames / rate, mono };
  }

  // WAV PCM de 16 bits, um canal
  function encodeWav(samples, rate) {
    const n = samples.length, out = new Uint8Array(44 + n * 2), dv = new DataView(out.buffer);
    const put = (o, s) => { for (let i = 0; i < 4; i++) out[o + i] = s.charCodeAt(i); };
    put(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); put(8, 'WAVE');
    put(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    put(36, 'data'); dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
    return out;
  }

  // ---------- lip sync ----------
  // Bocas no padrão do Rhubarb Lip Sync (desenhos de boca clássicos da animação):
  // A fechada (M, B, P), B pouco aberta, C aberta, D bem aberta, E arredondada, F biquinho (U, O),
  // G dentes no lábio (F, V), H língua (L), X descanso (silêncio).
  const VISEMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'];

  // filtro passa-faixa (biquad do "Audio EQ Cookbook"), para medir a energia perto de um formante
  function bandpass(x, rate, f, q) {
    const w = (2 * Math.PI * f) / rate, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    const b0 = al / a0, b2 = -al / a0, a1 = (-2 * Math.cos(w)) / a0, a2 = (1 - al) / a0;
    const y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
      y[i] = v;
    }
    return y;
  }

  // formantes (1º e 2º) de cada vogal e a boca que ela pede
  const VOWELS = [
    { v: 'a', f: [800, 1250], mouth: 'D' }, { v: 'e', f: [480, 1900], mouth: 'C' }, { v: 'i', f: [320, 2300], mouth: 'B' },
    { v: 'o', f: [520, 900], mouth: 'E' }, { v: 'u', f: [360, 720], mouth: 'F' },
  ];

  // Lip sync automático. A cada 10 ms mede o volume (relativo ao trecho mais alto da fala) e compara o
  // timbre com o molde de cada vogal (energia perto do 1º e do 2º formante): a → D, e → C, i → B, o → E,
  // u → F; voz fraca → B; silêncio → X; pausa curta no meio da fala → A (a boca fecha entre as sílabas).
  // Para voz de verdade, as bocas do Rhubarb Lip Sync (cues=) acertam mais.
  function lipCues(mono, rate) {
    const hop = Math.max(1, Math.round(rate / 100)), win = hop * 2;
    const n = Math.max(0, Math.floor((mono.length - win) / hop) + 1);
    const freqs = [...new Set(VOWELS.flatMap((x) => x.f))].filter((f) => f < rate / 2);
    const bands = new Map(freqs.map((f) => [f, bandpass(mono, rate, f, 2.5)]));
    const rms = new Float32Array(n), vowel = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      const e = new Map(freqs.map((f) => [f, 0]));
      for (let j = 0; j < win; j++) {
        const k = i * hop + j;
        s += mono[k] * mono[k];
        for (const f of freqs) { const b = bands.get(f)[k]; e.set(f, e.get(f) + b * b); }
      }
      rms[i] = Math.sqrt(s / win);
      let best = VOWELS[0], bs = -1;
      for (const x of VOWELS) {
        const sc = Math.sqrt((e.get(x.f[0]) || 0) * (e.get(x.f[1]) || 0));
        if (sc > bs) { bs = sc; best = x; }
      }
      vowel[i] = best;
    }
    const sm = new Float32Array(n);
    for (let i = 0; i < n; i++) sm[i] = (rms[Math.max(0, i - 1)] + rms[i] + rms[Math.min(n - 1, i + 1)]) / 3;
    const loud = Array.from(sm).filter((v) => v > 1e-4).sort((a, b) => a - b);
    const ref = loud.length ? loud[Math.min(loud.length - 1, Math.floor(loud.length * 0.95))] : 1;
    const L = Array.from(sm, (v) => v / ref);
    const letters = L.map((v, i) => (v < 0.1 ? 'X' : v < 0.3 ? 'B' : vowel[i].mouth === 'D' && v < 0.55 ? 'C' : vowel[i].mouth));
    // trechos iguais viram uma deixa
    const step = hop / rate;
    let cues = [];
    for (let i = 0; i < n; i++) {
      const last = cues[cues.length - 1];
      if (last && last.value === letters[i]) last.end = (i + 1) * step;
      else cues.push({ start: i * step, end: (i + 1) * step, value: letters[i] });
    }
    // pausa curta no meio da fala: a boca fecha (A) em vez de descansar (X)
    cues.forEach((c, k) => { if (c.value === 'X' && k > 0 && k < cues.length - 1 && c.end - c.start < 0.12) c.value = 'A'; });
    // deixa mais curta que um quadro (40 ms) entra na anterior; iguais vizinhas se juntam
    const out = [];
    for (const c of cues) {
      const last = out[out.length - 1];
      if (last && (c.end - c.start < 0.04 || last.value === c.value)) last.end = c.end;
      else out.push(Object.assign({}, c));
    }
    if (out.length) { out[0].start = 0; out[out.length - 1].end = Math.max(out[out.length - 1].end, mono.length / rate); }
    return out.map((c) => ({ start: round3(c.start), end: round3(c.end), value: c.value }));
  }
  const round3 = (v) => Math.round(v * 1000) / 1000;

  // Deixas do Rhubarb Lip Sync: o .json (mouthCues) ou o .tsv ("tempo<TAB>boca" por linha).
  function parseCues(text) {
    const t = String(text).replace(/^﻿/, '').trim();
    let cues;
    if (t[0] === '{') {
      const j = JSON.parse(t);
      if (!Array.isArray(j.mouthCues)) throw new Error('o .json não tem mouthCues (é um arquivo do Rhubarb?)');
      cues = j.mouthCues.map((c) => ({ start: Number(c.start), end: Number(c.end), value: String(c.value).toUpperCase() }));
    } else {
      const rows = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split(/\s+/));
      cues = rows.map((r, i) => ({ start: Number(r[0]), end: rows[i + 1] ? Number(rows[i + 1][0]) : Number(r[0]) + 0.1, value: String(r[1] || 'X').toUpperCase() }));
    }
    for (const c of cues) {
      if (!Number.isFinite(c.start) || !Number.isFinite(c.end)) throw new Error('tempo inválido nas deixas');
      if (!VISEMES.includes(c.value)) throw new Error(`boca desconhecida "${c.value}" (use ${VISEMES.join(' ')})`);
    }
    return cues.map((c) => ({ start: round3(c.start), end: round3(c.end), value: c.value })).sort((a, b) => a.start - b.start);
  }

  // a boca no instante t (segundos desde o começo do arquivo de som)
  function cueAt(cues, t) {
    let lo = 0, hi = cues.length - 1, found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cues[mid].start <= t) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return found >= 0 && t < cues[found].end ? cues[found].value : 'X';
  }

  // ---------- legendas ----------
  function clock(t, sep) {
    const ms = Math.max(0, Math.round(t * 1000));
    const p = (v, n) => String(v).padStart(n, '0');
    return `${p(Math.floor(ms / 3600000), 2)}:${p(Math.floor(ms / 60000) % 60, 2)}:${p(Math.floor(ms / 1000) % 60, 2)}${sep}${p(ms % 1000, 3)}`;
  }
  // list: [{ start, end, text }] em segundos
  function srt(list) {
    return list.map((s, i) => `${i + 1}\n${clock(s.start, ',')} --> ${clock(s.end, ',')}\n${s.text}\n`).join('\n');
  }
  function vtt(list) {
    return 'WEBVTT\n\n' + list.map((s) => `${clock(s.start, '.')} --> ${clock(s.end, '.')}\n${s.text}\n`).join('\n');
  }

  W.audio = { parseWav, encodeWav, lipCues, parseCues, cueAt, srt, vtt, VISEMES };
})(window.Weasel = window.Weasel || {});
