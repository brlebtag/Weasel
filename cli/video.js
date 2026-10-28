/* Weasel — filmes na linha de comando: vídeo (mp4, mov, webm, mkv) pelo ffmpeg, sequência de PNG/JPG,
   GIF e quadros soltos; render em paralelo com threads. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { Worker } = require('worker_threads');
const { W } = require('./runtime');

const VIDEO = ['mp4', 'mov', 'webm', 'mkv'];

// tempo dado na linha de comando: 2s, 2, 1.5s, 500ms, 48f, 1m30s ou código de tempo 00:01:12 (min:seg:quadro)
function parseTime(s, fps) {
  const t = String(s).trim();
  let m;
  if ((m = /^(?:(\d+):)?(\d+):(\d+):(\d+)$/.exec(t))) return (Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])) + Number(m[4]) / fps;
  if ((m = /^(\d+(?:\.\d+)?)ms$/.exec(t))) return Number(m[1]) / 1000;
  if ((m = /^(\d+(?:\.\d+)?)m(?:(\d+(?:\.\d+)?)s?)?$/.exec(t))) return Number(m[1]) * 60 + Number(m[2] || 0);
  if ((m = /^(\d+(?:\.\d+)?)f$/.exec(t))) return Number(m[1]) / fps;
  if ((m = /^(\d+(?:\.\d+)?)s?$/.exec(t))) return Number(m[1]);
  return NaN;
}

function findFfmpeg(custom) {
  for (const bin of [custom, process.env.WEASEL_FFMPEG, 'ffmpeg'].filter(Boolean)) {
    const r = spawnSync(bin, ['-hide_banner', '-version'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return bin;
  }
  return null;
}

// Os sons de um trecho como entradas do ffmpeg e o filtro que os mistura: cada som cortado (from=, dur=),
// com volume, atrasado até o lugar dele e somado aos outros. first = número da primeira entrada de som.
// O silêncio do fim vai só até dur: um apad sem fim deixa o ffmpeg produzir som à frente do vídeo
// enquanto o x264 segura quadros (preset slow), e a memória e o arquivo crescem sem parar.
function audioMix(clips, first, dur) {
  const inputs = [], parts = [];
  clips.forEach((c, i) => {
    if (c.loop) inputs.push('-stream_loop', '-1');
    inputs.push('-i', c.media.path);
    const ms = Math.round(c.at * 1000);
    parts.push(`[${first + i}:a]atrim=start=${c.offset.toFixed(4)}:duration=${c.dur.toFixed(4)},asetpts=PTS-STARTPTS,volume=${c.vol},aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}:all=1[s${i}]`);
  });
  const pad = `apad=whole_dur=${dur.toFixed(4)}`;
  const mix = clips.length > 1 ? `${clips.map((_, i) => `[s${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,${pad}[aout]` : `[s0]${pad}[aout]`;
  return { inputs, filter: [...parts, mix].join(';') };
}

// Argumentos do ffmpeg para cada formato. Os quadros chegam crus (RGBA) pela entrada padrão;
// o.audio = { clips, dur } mistura os sons de referência junto.
function ffmpegArgs(fmt, w, h, fps, o, out) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-r', String(fps), '-i', '-'];
  const vf = [];
  const alpha = o.transparent && fmt !== 'mp4';
  if (!alpha && (w % 2 || h % 2)) vf.push('pad=ceil(iw/2)*2:ceil(ih/2)*2');
  const bt709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];
  if (fmt === 'mov') {
    // ProRes: o formato que os editores de vídeo abrem sem sofrer (4444 guarda a transparência)
    vf.push(`scale=out_color_matrix=bt709:out_range=tv,format=${alpha ? 'yuva444p10le' : 'yuv422p10le'}`);
    args.push('-vf', vf.join(','), '-c:v', 'prores_ks', '-profile:v', alpha ? '4' : '3', '-vendor', 'apl0', ...bt709);
  } else if (fmt === 'webm') {
    vf.push(alpha ? 'format=yuva420p' : 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p');
    args.push('-vf', vf.join(','), '-c:v', 'libvpx-vp9', '-crf', String(o.crf === null ? (o.small ? 36 : 30) : o.crf), '-b:v', '0', '-row-mt', '1', ...(alpha ? [] : bt709));
  } else {
    // mp4 e mkv: H.264, o que qualquer player e editor aceitam. --small (para mandar) troca tempo
    // de codificação por tamanho: slow + tune animation comprime bem as cores lisas do desenho,
    // e o ffmpeg continua mais rápido que o render
    vf.push('scale=out_color_matrix=bt709:out_range=tv,format=yuv420p');
    const speed = o.small ? ['-preset', 'slow', '-tune', 'animation'] : ['-preset', 'medium'];
    args.push('-vf', vf.join(','), '-c:v', 'libx264', ...speed, '-crf', String(o.crf === null ? (o.small ? 23 : 18) : o.crf), ...bt709);
    if (fmt === 'mp4') args.push('-movflags', '+faststart');
  }
  if (o.audio && o.audio.clips.length) {
    // com som, o filtro do vídeo vai para o -filter_complex junto com a mistura
    const i = args.indexOf('-vf'), vchain = args[i + 1];
    args.splice(i, 2);
    const mix = audioMix(o.audio.clips, 1, o.audio.dur);
    args.splice(args.indexOf('-i') + 2, 0, ...mix.inputs);
    const codec = fmt === 'mov' ? ['-c:a', 'pcm_s16le'] : fmt === 'webm' ? ['-c:a', 'libopus', '-b:a', o.small ? '96k' : '160k'] : ['-c:a', 'aac', '-b:a', o.small ? '128k' : '192k'];
    args.push('-filter_complex', `[0:v]${vchain}[vout];${mix.filter}`, '-map', '[vout]', '-map', '[aout]', ...codec, '-t', o.audio.dur.toFixed(4));
  }
  args.push(out);
  return args;
}

// ---------- threads ----------
class Pool {
  constructor(n, data) {
    this.queue = [];
    this.idle = [];
    this.jobs = new Map();
    this.failed = null;
    this.workers = Array.from({ length: n }, () => {
      const w = new Worker(path.join(__dirname, 'film-worker.js'), { workerData: data });
      w.on('message', (m) => this.done(w, m));
      w.on('error', (e) => this.fail(e));
      this.idle.push(w);
      return w;
    });
  }
  run(job) {
    if (this.failed) return Promise.reject(this.failed);
    return new Promise((resolve, reject) => { this.queue.push({ job, resolve, reject }); this.pump(); });
  }
  pump() {
    while (this.idle.length && this.queue.length) {
      const w = this.idle.pop(), q = this.queue.shift();
      this.jobs.set(w, q);
      w.postMessage(q.job);
    }
  }
  done(w, m) {
    const q = this.jobs.get(w);
    this.jobs.delete(w);
    this.idle.push(w);
    if (m.error) q.reject(new Error(`quadro ${m.f}: ${m.error}`)); else q.resolve(m);
    this.pump();
  }
  fail(e) {
    this.failed = e;
    for (const q of [...this.jobs.values(), ...this.queue]) q.reject(e);
    this.jobs.clear();
    this.queue = [];
  }
  close() { return Promise.all(this.workers.map((w) => w.terminate())); }
}

// Renderiza os quadros pedidos e entrega na ordem, com no máximo `win` quadros prontos esperando.
async function eachFrame(frames, ctx, kind, onFrame) {
  if (!ctx.pool) {
    for (const f of frames) {
      const cv = W.film.renderFrame(ctx.model, f, { scale: ctx.scale, transparent: ctx.transparent, subs: ctx.subs, lang: ctx.lang });
      if (kind === 'raw') {
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        await onFrame(f, { w: cv.width, h: cv.height, buf: Buffer.from(d.buffer, d.byteOffset, d.byteLength) });
      } else {
        const out = ctx.nameOf(f);
        const bytes = kind === 'jpg' ? cv.toBuffer('image/jpeg', ctx.quality) : cv.toBuffer('image/png');
        fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
        fs.writeFileSync(out, bytes);
        await onFrame(f, { w: cv.width, h: cv.height, bytes: bytes.length });
      }
    }
    return;
  }
  const win = ctx.jobs * 3, inflight = new Map();
  const send = (i) => inflight.set(i, ctx.pool.run({ f: frames[i], kind, out: kind === 'raw' ? null : path.resolve(ctx.nameOf(frames[i])), quality: ctx.quality }));
  for (let i = 0; i < Math.min(win, frames.length); i++) send(i);
  for (let i = 0; i < frames.length; i++) {
    const r = await inflight.get(i);
    inflight.delete(i);
    if (i + win < frames.length) send(i + win);
    if (r.buf) r.buf = Buffer.from(r.buf);
    await onFrame(frames[i], r);
  }
}

function progress(label, total, quiet) {
  const t0 = Date.now(), tty = process.stderr.isTTY;
  let lastPct = 0;
  const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return {
    tick(done) {
      if (quiet) return;
      const el = (Date.now() - t0) / 1000, rate = done / Math.max(0.001, el), pct = Math.floor((done / total) * 100);
      const line = `${label}: quadro ${done}/${total} (${pct}%) · ${rate.toFixed(1)} q/s · falta ${clock((total - done) / Math.max(0.001, rate))}`;
      if (tty) process.stderr.write(`\r${line}\x1b[K`);
      else if (pct >= lastPct + 10 || done === total) { lastPct = pct - (pct % 10); console.error(line); }
    },
    end() { if (!quiet && tty) process.stderr.write('\r\x1b[K'); return (Date.now() - t0) / 1000; },
  };
}

// ---------- exportação ----------
// h: { save, usage, Fail, paint, withSuffix, kb } da linha de comando
async function exportFilm(model, o, format, source, h) {
  const tl = W.film.timeline(model);
  if (!tl.frames) h.usage('o filme não tem nenhum quadro (falta shot … dur=?)');
  const fps = tl.fps;
  if (format === 'svg') h.usage('SVG não vale para filme (use mp4, mov, webm, gif ou png)');
  if (format === 'sheet' || format === 'godot' || format === 'build') h.usage('sprite sheet, Godot e pintura são para desenhos de jogo; um filme sai em vídeo (mp4, mov, webm), gif ou png');

  // quais quadros: o filme todo, um shot, um trecho
  let entries = tl.entries;
  if (o.shot) {
    const want = o.shot;
    entries = tl.entries.filter((e) => e.name === want || e.name.endsWith('/' + want) || String(e.index + 1) === want);
    if (!entries.length) h.usage(`shot "${want}" não existe (tem: ${tl.entries.map((e) => e.name).join(', ')})`);
  }
  const t2f = (s, what) => {
    const t = parseTime(s, fps);
    if (isNaN(t)) h.usage(`${what} inválido "${s}" (use 2s, 48f, 1m30s ou 00:01:12)`);
    return Math.round(t * fps);
  };
  const from = o.from !== null ? t2f(o.from, '--from') : 0, to = o.to !== null ? t2f(o.to, '--to') : Infinity;
  const range = (list) => {
    const out = [];
    for (const e of list) for (let f = e.start; f < e.start + e.frames; f++) if (f >= from && f < to) out.push(f);
    return out;
  };
  const tag = (e) => e.name.replace(/[\\/]+/g, '-');
  const parts = o.shots ? entries.map((e) => ({ suffix: '_' + tag(e), frames: range([e]) })) : [{ suffix: o.shot ? '_' + tag(entries[0]) : '', frames: range(entries) }];
  for (const p of parts) if (!p.frames.length) h.usage(`nenhum quadro no trecho pedido${p.suffix ? ` (${p.suffix.slice(1)})` : ''}`);
  const total = parts.reduce((n, p) => n + p.frames.length, 0);
  const span = (p) => [p.frames[0] / fps, (p.frames[p.frames.length - 1] + 1) / fps];
  const burn = !!(o.burnSubs || model.film.burn);
  // legendas ao lado (filme.srt, e filme.en.srt para outras línguas)
  const writeSubs = (out, p) => {
    if (o.subs === 'none' || format === 'gif') return;
    const [a, b] = span(p);
    for (const lang of W.film.langs(model)) {
      const list = W.film.subtitles(model, a, b, lang);
      if (!list.length) continue;
      const file = out.replace(/(_\d{5})?\.[^./\\]+$/, '') + (lang === model.film.lang ? '' : '.' + lang) + '.' + o.subs;
      h.save(file, Buffer.from(o.subs === 'vtt' ? W.audio.vtt(list) : W.audio.srt(list)), `${list.length} legenda${list.length > 1 ? 's' : ''}${lang === model.film.lang ? '' : ` (${lang})`}`, o.quiet);
    }
  };
  // linha do tempo para o editor de vídeo (EDL, FCPXML) apontando para os vídeos e os sons
  const writeTimelines = (outBase, parts2, kinds) => {
    if (!kinds.length) return;
    const from = parts2[0].frames[0], last = parts2[parts2.length - 1].frames, to = last[last.length - 1] + 1;
    const videos = parts2.map((p) => ({ file: path.resolve(p.file), start: p.frames[0], frames: p.frames.length }));
    const pl = W.nle.plan(model, { from, to, videos, scale: o.scale, audioPath: (c) => (c.media && c.media.path) || null });
    const title = path.basename(outBase);
    for (const k of kinds) {
      const text = k === 'edl' ? W.nle.edl(pl, title) : W.nle.fcpxml(pl, title);
      h.save(`${outBase}.${k}`, Buffer.from(text), `${k === 'edl' ? 'EDL (CMX3600)' : 'FCPXML 1.9'}: ${videos.length} vídeo${videos.length > 1 ? 's' : ''}, ${pl.audio.length} ${pl.audio.length === 1 ? 'som' : 'sons'} em ${pl.lanes} trilha${pl.lanes === 1 ? '' : 's'}, ${pl.markers.length} marcador${pl.markers.length === 1 ? '' : 'es'}`, o.quiet);
    }
  };
  const timelineKinds = [o.edl && 'edl', o.fcpxml && 'fcpxml'].filter(Boolean);

  // só a linha do tempo: os vídeos já foram (ou vão ser) renderizados com o mesmo nome
  if (format === 'edl' || format === 'fcpxml') {
    const outBase = (o.out || `${source.base}.${format}`).replace(/\.[^./\\]+$/, '');
    const parts2 = parts.map((p) => ({ file: h.withSuffix(`${outBase}.${o.ext}`, p.suffix), frames: p.frames }));
    writeTimelines(outBase, parts2, [...new Set([format, ...timelineKinds])]);
    writeSubs(`${outBase}.${o.ext}`, { frames: parts.flatMap((p) => p.frames) });
    return;
  }
  if (timelineKinds.length && VIDEO.includes(format) && o.audio) {
    o.audio = false; // os sons vão em trilhas separadas na linha do tempo
    if (!o.quiet) console.error(h.paint('2', 'com --edl/--fcpxml o vídeo sai sem o som misturado: cada som vai numa trilha da linha do tempo'));
  }

  const clipsOf = (p) => {
    if (!o.audio) return [];
    const [a, b] = span(p);
    const all = W.film.audioClips(model, a, b), ok = all.filter((c) => c.media && c.media.path);
    if (ok.length < all.length && !o.quiet) console.error(h.paint('33', 'aviso') + `: som não encontrado: ${all.filter((c) => !(c.media && c.media.path)).map((c) => c.a.file).join(', ')}`);
    return ok;
  };

  // só o som (a mistura dos audio), para o editor de vídeo
  if (format === 'wav') {
    const bin = findFfmpeg(o.ffmpeg);
    if (!bin) throw new h.Fail('não achei o ffmpeg (precisa dele para misturar o som)', 2);
    for (const p of parts) {
      const out = h.withSuffix(o.out || `${source.base}.wav`, p.suffix);
      const clips = clipsOf(p), dur = p.frames.length / fps;
      if (!clips.length) h.usage('o trecho não tem som (audio)');
      const mix = audioMix(clips, 0, dur);
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      const r = spawnSync(bin, ['-y', '-hide_banner', '-loglevel', 'error', ...mix.inputs, '-filter_complex', mix.filter, '-map', '[aout]', '-t', dur.toFixed(4), '-c:a', 'pcm_s16le', out], { encoding: 'utf8' });
      if (r.status !== 0) throw new h.Fail(`o ffmpeg falhou: ${(r.stderr || '').trim()}`, 3);
      if (!o.quiet) console.log(`${h.paint('32', 'salvo')} ${out}  ${h.paint('2', `48 kHz estéreo, ${W.film.timecode(p.frames.length, fps)}, ${clips.length} ${clips.length > 1 ? 'sons' : 'som'} · ${h.kb(fs.statSync(out).size)}`)}`);
      writeSubs(out, p);
    }
    return;
  }

  // um quadro só
  const single = (format === 'png' || format === 'jpg') && !o.frames;
  if (single) {
    let f = o.time !== null ? t2f(o.time, '--time') : o.frame;
    if (o.shot && o.time === null && !o.frameSet) f = entries[0].start;
    if (f >= tl.frames) h.usage(`o filme vai do quadro 0 ao ${tl.frames - 1} (${W.film.timecode(tl.frames - 1, fps)})`);
    const cv = W.film.renderFrame(model, f, { scale: o.scale, transparent: o.transparent && format !== 'jpg', subs: burn, lang: o.lang });
    const buf = format === 'jpg' ? cv.toBuffer('image/jpeg', o.quality) : cv.toBuffer('image/png');
    const loc = W.film.locate(model, f);
    h.save(o.out || `${source.base}_${String(f).padStart(5, '0')}.${format}`, buf, `${cv.width}×${cv.height}, quadro ${f} (${W.film.timecode(f, fps)}, shot ${loc.entry.name})`, o.quiet);
    return;
  }

  let jobs = o.jobs === null ? (total >= 48 ? Math.max(1, Math.min(8, (os.availableParallelism ? os.availableParallelism() : os.cpus().length) - 1)) : 1) : o.jobs;
  jobs = Math.max(1, Math.min(jobs, total));
  const ctx = { model, scale: o.scale, transparent: o.transparent && format !== 'jpg' && format !== 'mp4' && format !== 'mkv', quality: o.quality / 100, jobs, pool: null, nameOf: null, subs: burn, lang: o.lang };
  if (o.transparent && (format === 'mp4' || format === 'mkv') && !o.quiet) console.error(h.paint('33', 'aviso') + `: ${format} não guarda transparência; use .mov (ProRes 4444), .webm ou --frames (PNG)`);
  if (jobs > 1) ctx.pool = new Pool(jobs, { src: source.src, name: path.basename(source.name), dir: source.dir, scale: ctx.scale, transparent: ctx.transparent, subs: burn, lang: o.lang });
  const summary = (secs, n) => { n = n || total; return `${n} quadros em ${secs.toFixed(1)}s (${(n / Math.max(0.001, secs)).toFixed(1)} q/s${jobs > 1 ? `, ${jobs} threads` : ''})`; };

  try {
    if (VIDEO.includes(format)) {
      const bin = findFfmpeg(o.ffmpeg);
      if (!bin) throw new h.Fail('não achei o ffmpeg. Instale (https://ffmpeg.org; no Windows: winget install ffmpeg), passe --ffmpeg <caminho> ou exporte quadros com --frames -o quadros/q.png', 2);
      for (const p of parts) {
        const out = h.withSuffix(o.out || `${source.base}.${format}`, p.suffix);
        fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
        const bar = progress(path.basename(out), p.frames.length, o.quiet);
        let proc = null, errText = '', closed = null, size = null, n = 0;
        const clips = clipsOf(p);
        await eachFrame(p.frames, ctx, 'raw', async (f, r) => {
          if (!proc) {
            size = [r.w, r.h];
            const audio = clips.length ? { clips, dur: p.frames.length / fps } : null;
            proc = spawn(bin, ffmpegArgs(format, r.w, r.h, fps, { transparent: ctx.transparent, crf: o.crf, small: o.small, audio }, out), { stdio: ['pipe', 'ignore', 'pipe'] });
            proc.stderr.on('data', (d) => { errText += d; });
            proc.stdin.on('error', () => {});
            closed = new Promise((res) => proc.on('close', res));
          }
          if (proc.exitCode !== null) throw new h.Fail(`o ffmpeg parou: ${errText.trim() || 'sem mensagem'}`, 3);
          if (!proc.stdin.write(r.buf)) {
            await new Promise((res) => {
              const go = () => { proc.stdin.off('drain', go); proc.off('close', go); res(); };
              proc.stdin.once('drain', go);
              proc.once('close', go);
            });
          }
          bar.tick(++n);
        });
        proc.stdin.end();
        const code = await closed;
        const secs = bar.end();
        if (code !== 0) throw new h.Fail(`o ffmpeg falhou (${code}): ${errText.trim()}`, 3);
        const bytes = fs.statSync(out).size;
        if (!o.quiet) console.log(`${h.paint('32', 'salvo')} ${out}  ${h.paint('2', `${size[0]}×${size[1]}, ${fps} fps, ${W.film.timecode(p.frames.length, fps)}${clips.length ? `, com ${clips.length} ${clips.length > 1 ? 'sons' : 'som'}` : ''} · ${h.kb(bytes)} · ${summary(secs, p.frames.length)}`)}`);
        writeSubs(out, p);
        p.file = out;
      }
      if (timelineKinds.length) {
        const outBase = (o.out || `${source.base}.${format}`).replace(/\.[^./\\]+$/, '') + (o.shot && !o.shots ? parts[0].suffix : '');
        writeTimelines(outBase, parts, timelineKinds);
        // legendas do trecho inteiro, alinhadas com a linha do tempo
        if (parts.length > 1) writeSubs(`${outBase}.${format}`, { frames: parts.flatMap((q) => q.frames) });
      }
      return;
    }

    if (format === 'gif') {
      if (total > 900 && !o.quiet) console.error(h.paint('33', 'aviso') + `: GIF com ${total} quadros fica enorme; para filme use .mp4`);
      for (const p of parts) {
        const out = h.withSuffix(o.out || `${source.base}.gif`, p.suffix);
        const bar = progress(path.basename(out), p.frames.length, o.quiet);
        const frames = [];
        await eachFrame(p.frames, ctx, 'raw', async (f, r) => { frames.push({ width: r.w, height: r.h, data: new Uint8ClampedArray(r.buf.buffer, r.buf.byteOffset, r.buf.byteLength) }); bar.tick(frames.length); });
        const delay = frames.map((_, i) => Math.round(((i + 1) * 100) / fps) - Math.round((i * 100) / fps));
        const bytes = W.gif.encode(frames, { delay, loop: 0, transparent: ctx.transparent, dither: o.dither });
        const secs = bar.end();
        h.save(out, Buffer.from(bytes), `${frames[0].width}×${frames[0].height} · ${summary(secs)}`, o.quiet);
      }
      return;
    }

    // sequência de imagens, com o número do quadro do filme no nome (o editor de vídeo junta na ordem)
    for (const p of parts) {
      const pattern = h.withSuffix(o.out || `${source.base}.${format}`, p.suffix);
      ctx.nameOf = (f) => h.withSuffix(pattern, '_' + String(f).padStart(5, '0'));
      const bar = progress(path.basename(pattern), p.frames.length, o.quiet);
      let n = 0, bytes = 0, size = null;
      await eachFrame(p.frames, ctx, format, async (f, r) => { n++; bytes += r.bytes; size = size || [r.w, r.h]; bar.tick(n); });
      const secs = bar.end();
      writeSubs(pattern, p);
      if (!o.quiet) console.log(`${h.paint('32', 'salvo')} ${ctx.nameOf(p.frames[0])} … ${path.basename(ctx.nameOf(p.frames[p.frames.length - 1]))}  ${h.paint('2', `${size[0]}×${size[1]}, ${fps} fps · ${h.kb(bytes)} · ${summary(secs)}`)}`);
    }
  } finally {
    if (ctx.pool) await ctx.pool.close();
  }
}

// resumo do filme para --info
function filmInfo(m) {
  const tl = W.film.timeline(m), F = m.film, out = [];
  const secs = (s) => `${Math.round(s * 100) / 100}s`;
  const bg = !m.canvas.bg ? 'transparente' : typeof m.canvas.bg === 'string' ? m.canvas.bg : `gradiente ${m.canvas.bg.name}`;
  out.push(`filme    ${m.canvas.w} × ${m.canvas.h}, ${F.fps} fps, ${secs(tl.duration)} (${tl.frames} quadros, ${W.film.timecode(tl.frames, F.fps)}), fundo ${bg}`);
  const fin = Object.entries({ bloom: m.finish.bloom, vignette: m.finish.vignette, grain: m.finish.grain, posterize: m.finish.posterize, pixel: m.finish.pixel > 1 && m.finish.pixel }).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`);
  if (fin.length) out.push(`acabamento ${fin.join(' ')}`);
  if (m.ambient) out.push(`ambiente ${m.ambient.c} × ${m.ambient.power}`);
  if (m.lights.size) out.push(`luzes    ${[...m.lights.values()].map((l) => `${l.name} (${l.type}, ${l.c} × ${l.power})`).join(', ')}`);
  const actor = (a) => {
    const extra = [a.anim && `anim ${a.anim}`, a.depth !== 1 && `depth ${a.depth}`, a.screen && 'screen', !a.show && 'hidden', a.variant && `variante ${a.variant}`, !a.model && 'NÃO CARREGOU'].filter(Boolean);
    return `${a.name} (${a.file}${extra.length ? ', ' + extra.join(', ') : ''})`;
  };
  if (F.actors.length) out.push(`atores   ${F.actors.map(actor).join(', ')}`);
  const own = m.layers.filter((L) => L.items.length);
  if (own.length) out.push(`camadas  ${own.map((L) => L.name + (L.depth !== 1 ? ` (depth ${L.depth})` : '') + (L.screen ? ' (screen)' : '') + (L.only ? ` (only ${L.only.join(',')})` : '')).join(', ')}`);
  if (tl.audios.length) {
    out.push(`sons     ${tl.audios.length}`);
    for (const c of tl.audios) {
      const a = c.a, notes = [a.file];
      if (!a.media) notes.push('NÃO ACHEI');
      if (a.lips) notes.push(`boca de ${a.lips}${a.cues ? ' (Rhubarb)' : ''}`);
      if (a.loop) notes.push('loop');
      if (a.vol !== 1) notes.push(`vol ${a.vol}`);
      out.push(`  ${a.name.padEnd(16)} ${W.film.timecode(Math.round(c.start * F.fps), F.fps)}  ${secs(c.end - c.start).padStart(6)}  ${notes.join(' · ')}`);
    }
  }
  if (tl.subs.length) out.push(`legendas ${tl.subs.length} (${W.film.langs(m).join(', ')})${F.burn ? ', desenhadas no vídeo' : ''}`);
  out.push(`planos   ${tl.entries.length}`);
  for (const e of tl.entries) {
    const s = e.shot, c = s.cam, notes = [];
    notes.push(c.follow ? `câmera segue ${c.follow}` : `câmera ${Math.round(c.x)},${Math.round(c.y)}`);
    if (c.zoom !== 1) notes.push(`zoom ${c.zoom}`);
    if (s.actors.length) notes.push(`atores ${s.actors.map((a) => a.name).join(', ')}`);
    const keys = [...s.tracks.values()].reduce((n, t) => n + t.keys.length, 0);
    if (keys) notes.push(`${keys} mudança(s) com at`);
    if (s.trans) notes.push(`entra com ${s.trans.type} (${secs(s.trans.dur)})`);
    out.push(`  ${e.name.padEnd(16)} ${W.film.timecode(e.start, F.fps)}  ${secs(e.frames / F.fps).padStart(6)}  ${String(e.frames).padStart(5)} quadros  ${notes.join(' · ')}`);
  }
  return out.join('\n');
}

module.exports = { exportFilm, filmInfo, parseTime, findFfmpeg, ffmpegArgs, VIDEO };
