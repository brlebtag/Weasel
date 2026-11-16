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
    const L = wavLayout((o, n) => u8.subarray(o, o + n), u8.length);
    const { format, channels, rate, bits, bps, data, frames } = L;
    let read;
    if (format === 1 && bits === 8) read = (o) => (u8[o] - 128) / 128;
    else if (format === 1 && bits === 16) read = (o) => dv.getInt16(o, true) / 32768;
    else if (format === 1 && bits === 24) read = (o) => (((u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16)) << 8) >> 8) / 8388608;
    else if (format === 1 && bits === 32) read = (o) => dv.getInt32(o, true) / 2147483648;
    else if (format === 3 && bits === 32) read = (o) => dv.getFloat32(o, true);
    else read = (o) => dv.getFloat64(o, true);
    const mono = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      let s = 0;
      for (let c = 0; c < channels; c++) s += read(data.o + (i * channels + c) * bps);
      mono[i] = s / channels;
    }
    return { kind: 'wav', sampleRate: rate, channels, frames, duration: frames / rate, mono };
  }
  // Só o que o cabeçalho diz (sem as amostras: mono = null). at(o, n): os n bytes do arquivo a partir de o; total:
  // o tamanho do arquivo. Serve para quem só precisa da duração (as threads do filme, que não tocam o som).
  function wavInfo(at, total) {
    const { channels, rate, frames } = wavLayout(at, total);
    // o mesmo erro que o parseWav daria ao criar as amostras (WAV estragado, com 0 canais e algum dado)
    if (frames === Infinity) throw new RangeError('WAV com tamanho inválido');
    return { kind: 'wav', sampleRate: rate, channels, frames, duration: frames / rate, mono: null };
  }
  // as partes do WAV (o formato e onde ficam as amostras), lidas por at(o, n) num arquivo de total bytes
  function wavLayout(at, total) {
    const head = at(0, 12);
    const tag = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
    const view = (b) => new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (total < 12 || head.length < 12 || tag(head, 0) !== 'RIFF' || tag(head, 8) !== 'WAVE') throw new Error('não é um arquivo WAV');
    let fmt = null, data = null;
    for (let o = 12; o + 8 <= total;) {
      const h = at(o, 8), size = view(h).getUint32(4, true), body = o + 8;
      const id = tag(h, 0);
      if (id === 'fmt ') {
        const dv = view(at(body, 26));
        fmt = { format: dv.getUint16(0, true), channels: dv.getUint16(2, true), rate: dv.getUint32(4, true), bits: dv.getUint16(14, true) };
        if (fmt.format === 0xfffe && size >= 26) fmt.format = dv.getUint16(24, true);
      } else if (id === 'data') data = { o: body, size: Math.min(size, total - body) };
      o = body + size + (size & 1);
    }
    if (!fmt || !data) throw new Error('WAV sem as partes fmt e data');
    const { format, channels, rate, bits } = fmt;
    const ok = (format === 1 && (bits === 8 || bits === 16 || bits === 24 || bits === 32)) || (format === 3 && (bits === 32 || bits === 64));
    if (!ok) throw new Error(`WAV em formato que não sei ler (formato ${format}, ${bits} bits): use PCM 16 bits`);
    const bps = bits / 8;
    return { format, channels, rate, bits, bps, data, frames: Math.floor(data.size / (bps * channels)) };
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

  // A energia perto de cada frequência de fs (filtro passa-faixa, biquad do "Audio EQ Cookbook") em cada janela de
  // 2·hop amostras, uma a cada hop: E[faixa][janela]. A faixa filtrada não fica guardada (20 minutos de som a
  // 48 kHz seriam 2,3 GB por thread): cada amostra entra direto na soma das duas janelas que passam por ela, na
  // ordem de antes, então as contas saem iguais às de guardar a faixa e somar a janela depois.
  // As faixas andam de duas em duas: cada uma depende da conta anterior dela, e com duas ao mesmo tempo o processador
  // não fica esperando (quase 2 vezes mais rápido). Com um número ímpar de faixas, a última vai em par com ela mesma.
  function bandEnergies(x, rate, fs, q, hop, n) {
    const co = fs.map((f) => {
      const w = (2 * Math.PI * f) / rate, al = Math.sin(w) / (2 * q), a0 = 1 + al;
      return [al / a0, -al / a0, (-2 * Math.cos(w)) / a0, (1 - al) / a0];
    });
    const E = fs.map(() => new Float64Array(n));
    // a última janela (n − 1) termina no bloco n
    const end = Math.min(x.length, (n + 1) * hop);
    for (let k = 0; k < fs.length; k += 2) {
      const [b0, b2, a1, a2] = co[k], [c0, c2, d1, d2] = co[k + 1] || co[k];
      const P = E[k], Q = E[k + 1] || P;
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0;
      // cur: a janela h, que começa neste bloco; prev: a janela h − 1, que termina nele
      let pcur = 0, pprev = 0, qcur = 0, qprev = 0, h = 0, j = 0;
      for (let i = 0; i < end; i++) {
        const xi = x[i];
        const v = b0 * xi + b2 * x2 - a1 * y1 - a2 * y2;
        const u = c0 * xi + c2 * x2 - d1 * z1 - d2 * z2;
        x2 = x1; x1 = xi; y2 = y1; y1 = v; z2 = z1; z1 = u;
        // o valor como ele ficaria guardado (Float32), ao quadrado
        const fv = Math.fround(v), fu = Math.fround(u), vv = fv * fv, uu = fu * fu;
        pcur += vv; pprev += vv; qcur += uu; qprev += uu;
        if (++j === hop) {
          if (h > 0) { P[h - 1] = pprev; Q[h - 1] = qprev; }
          pprev = pcur; qprev = qcur; pcur = 0; qcur = 0; h++; j = 0;
        }
      }
    }
    return E;
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
    const E = bandEnergies(mono, rate, freqs, 2.5, hop, n);
    // os formantes de cada vogal como posições em freqs (-1: acima da metade da taxa, energia 0)
    const at = VOWELS.map((x) => [freqs.indexOf(x.f[0]), freqs.indexOf(x.f[1])]);
    const rms = new Float32Array(n), vowel = new Array(n);
    for (let i = 0; i < n; i++) {
      const k0 = i * hop;
      let s = 0;
      for (let j = 0; j < win; j++) { const v = mono[k0 + j]; s += v * v; }
      rms[i] = Math.sqrt(s / win);
      let best = VOWELS[0], bs = -1;
      for (let v = 0; v < VOWELS.length; v++) {
        const [p, q] = at[v];
        const sc = Math.sqrt((p < 0 ? 0 : E[p][i] || 0) * (q < 0 ? 0 : E[q][i] || 0));
        if (sc > bs) { bs = sc; best = VOWELS[v]; }
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

  W.audio = { parseWav, wavInfo, encodeWav, lipCues, parseCues, cueAt, srt, vtt, VISEMES };
})(window.Weasel = window.Weasel || {});
