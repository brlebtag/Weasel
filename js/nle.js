/* Weasel — linha do tempo para o editor de vídeo: EDL (CMX3600) e FCPXML 1.9 (DaVinci Resolve, Final Cut
   Pro; Premiere e outros abrem o EDL). O vídeo renderizado (inteiro ou um arquivo por plano) vai na trilha
   de vídeo e cada audio do filme vai numa trilha de som, no lugar e com o volume certos; os planos viram
   marcadores. As legendas vão no .srt, que todo editor importa. Só texto: vale no navegador e na CLI. */
(function (W) {
  'use strict';

  // ---------- o que vai na linha do tempo ----------
  // o = { from, to: quadros do filme (to exclusivo); videos: [{ file, start: quadro do filme, frames }];
  //       audioPath(clip) → caminho do som (null = fica de fora); scale = escala do vídeo renderizado }
  function plan(model, o) {
    const tl = W.film.timeline(model), fps = tl.fps;
    const from = o.from || 0, to = o.to === undefined ? tl.frames : o.to;
    const videos = o.videos.map((v) => ({ file: v.file, rec: v.start - from, frames: v.frames, src: 0 }));
    const markers = tl.entries.filter((e) => e.start >= from && e.start < to).map((e) => ({ rec: e.start - from, name: e.name }));
    // os marcadores (mark) do filme também
    for (const mk of tl.marks || []) { const f = Math.round(mk.start * fps); if (f >= from && f < to) markers.push({ rec: f - from, name: mk.name }); }
    markers.sort((p, q) => p.rec - q.rec);
    // sons: os loops viram repetições do arquivo, um clipe por volta
    const pieces = [];
    for (const c of W.film.audioClips(model, from / fps, to / fps)) {
      const file = o.audioPath(c);
      if (!file) continue;
      const period = c.loop && c.media && c.media.duration ? c.media.duration : 0;
      if (!period) { pieces.push({ c, file, at: c.at, offset: c.offset, dur: c.dur }); continue; }
      let t = 0, off = c.offset % period;
      while (t < c.dur - 1e-6) {
        const d = Math.min(period - off, c.dur - t);
        pieces.push({ c, file, at: c.at + t, offset: off, dur: d });
        t += d;
        off = 0;
      }
    }
    // em quadros (o EDL só conta quadros), e cada um na primeira trilha livre
    const audio = pieces.map((p) => ({
      name: p.c.a.name, file: p.file, media: p.c.media, vol: p.c.vol,
      rec: Math.round(p.at * fps), src: Math.round(p.offset * fps), frames: Math.max(1, Math.round(p.dur * fps)),
    })).sort((a, b) => a.rec - b.rec);
    const ends = [];
    for (const a of audio) {
      let lane = ends.findIndex((e) => e <= a.rec);
      if (lane < 0) { lane = ends.length; ends.push(0); }
      ends[lane] = a.rec + a.frames;
      a.lane = lane;
    }
    // tamanho do vídeo renderizado (escala -s), par como o ffmpeg deixa
    const even = (v) => Math.max(2, Math.round(v / 2) * 2);
    const s = o.scale || 1;
    return { fps, frames: to - from, videos, audio, markers, lanes: ends.length, width: even(model.canvas.w * s), height: even(model.canvas.h * s) };
  }

  const base = (f) => String(f).split(/[\\/]/).pop();
  const stem = (f) => base(f).replace(/\.[^.]+$/, '');

  // ---------- EDL (CMX3600) ----------
  function tc(frames, fps) {
    const r = Math.round(fps), f = Math.max(0, Math.round(frames));
    const p = (v) => String(v).padStart(2, '0');
    return `${p(Math.floor(f / (r * 3600)))}:${p(Math.floor(f / (r * 60)) % 60)}:${p(Math.floor(f / r) % 60)}:${p(f % r)}`;
  }
  // o vídeo começa em 01:00:00:00, como as linhas do tempo dos editores
  function edl(p, title) {
    const start = Math.round(p.fps) * 3600;
    const events = [
      ...p.videos.map((v) => ({ ch: 'V', rec: v.rec, src: v.src, frames: v.frames, file: v.file, note: null })),
      ...p.audio.map((a) => ({ ch: a.lane ? `A${a.lane + 1}` : 'A', rec: a.rec, src: a.src, frames: a.frames, file: a.file, note: a.vol !== 1 ? `volume ${a.vol} (${db(a.vol)})` : null })),
    ].sort((a, b) => a.rec - b.rec || (a.ch === 'V' ? -1 : b.ch === 'V' ? 1 : a.ch.localeCompare(b.ch)));
    const out = [`TITLE: ${title}`, 'FCM: NON-DROP FRAME', ''];
    events.forEach((e, i) => {
      out.push(`${String(i + 1).padStart(3, '0')}  AX       ${e.ch.padEnd(5)} C        ${tc(e.src, p.fps)} ${tc(e.src + e.frames, p.fps)} ${tc(start + e.rec, p.fps)} ${tc(start + e.rec + e.frames, p.fps)}`);
      out.push(`* FROM CLIP NAME: ${base(e.file)}`);
      if (e.note) out.push(`* COMMENT: ${e.note}`);
      out.push('');
    });
    return out.join('\n');
  }
  const db = (v) => `${v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-96'}dB`;

  // ---------- FCPXML 1.9 ----------
  // a sequência começa em 0s (cada editor põe o timecode inicial que quiser; o EDL usa 01:00:00:00)
  // tempo como fração exata (24 quadros/s → "N/24s"; 29,97 → "N*1001/30000s")
  function rational(fps) {
    const r = Math.round(fps);
    if (Math.abs(fps - r) < 1e-6) return { num: 1, den: r };
    const ntsc = Math.round(fps * 1.001);
    if (Math.abs(fps - ntsc / 1.001) < 0.005) return { num: 1001, den: ntsc * 1000 };
    return { num: 1000, den: Math.round(fps * 1000) };
  }
  const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // caminho do disco → URL file:/// (o que o FCPXML pede)
  function fileUrl(f) {
    let s = String(f).replace(/\\/g, '/');
    if (/^[A-Za-z]:\//.test(s)) s = '/' + s;
    if (!s.startsWith('/')) return encodeURI(s);
    return 'file://' + encodeURI(s).replace(/#/g, '%23').replace(/\?/g, '%3F');
  }
  function fcpxml(p, title) {
    const R = rational(p.fps), t = (frames) => (frames ? `${frames * R.num}/${R.den}s` : '0s');
    const assets = new Map();
    const res = [`    <format id="r1" frameDuration="${R.num}/${R.den}s" width="${p.width}" height="${p.height}" colorSpace="1-1-1 (Rec. 709)"/>`];
    const assetOf = (file, kind, item) => {
      if (assets.has(file)) return assets.get(file);
      const id = `r${assets.size + 2}`;
      assets.set(file, id);
      if (kind === 'video') {
        const frames = Math.max(...p.videos.filter((v) => v.file === file).map((v) => v.src + v.frames));
        res.push(`    <asset id="${id}" name="${xml(stem(file))}" start="0s" duration="${t(frames)}" hasVideo="1" format="r1" hasAudio="0" videoSources="1">`);
      } else {
        const m = item.media || {};
        const dur = m.duration ? (m.sampleRate ? `${Math.round(m.duration * m.sampleRate)}/${m.sampleRate}s` : `${Math.round(m.duration * 1000)}/1000s`) : t(item.src + item.frames);
        res.push(`    <asset id="${id}" name="${xml(stem(file))}" start="0s" duration="${dur}" hasAudio="1" audioSources="1" audioChannels="${m.channels || 2}" audioRate="${m.sampleRate || 48000}">`);
      }
      res.push(`      <media-rep kind="original-media" src="${xml(fileUrl(file))}"/>`, '    </asset>');
      return id;
    };
    p.videos.forEach((v) => assetOf(v.file, 'video'));
    p.audio.forEach((a) => assetOf(a.file, 'audio', a));
    // cada som fica preso (lane negativa = embaixo) ao trecho de vídeo onde começa
    const spine = [];
    p.videos.forEach((v, i) => {
      const last = i === p.videos.length - 1;
      const mine = p.audio.filter((a) => a.rec >= v.rec && (last || a.rec < v.rec + v.frames));
      const marks = p.markers.filter((mk) => mk.rec >= v.rec && mk.rec < v.rec + v.frames);
      spine.push(`        <asset-clip ref="${assets.get(v.file)}" name="${xml(stem(v.file))}" offset="${t(v.rec)}" start="${t(v.src)}" duration="${t(v.frames)}" format="r1" tcFormat="NDF">`);
      for (const a of mine) {
        const head = `          <asset-clip ref="${assets.get(a.file)}" lane="${-(a.lane + 1)}" name="${xml(a.name)}" offset="${t(v.src + a.rec - v.rec)}" start="${t(a.src)}" duration="${t(a.frames)}"`;
        if (a.vol === 1) spine.push(head + '/>');
        else spine.push(head + '>', `            <adjust-volume amount="${db(a.vol)}"/>`, '          </asset-clip>');
      }
      for (const mk of marks) spine.push(`          <marker start="${t(v.src + mk.rec - v.rec)}" duration="${t(1)}" value="${xml(mk.name)}"/>`);
      spine.push('        </asset-clip>');
    });
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE fcpxml>',
      '<fcpxml version="1.9">',
      '  <resources>',
      ...res,
      '  </resources>',
      '  <library>',
      `    <event name="${xml(title)}">`,
      `      <project name="${xml(title)}">`,
      `        <sequence format="r1" duration="${t(p.frames)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">`,
      '          <spine>',
      ...spine.map((l) => '    ' + l),
      '          </spine>',
      '        </sequence>',
      '      </project>',
      '    </event>',
      '  </library>',
      '</fcpxml>',
      '',
    ].join('\n');
  }

  W.nle = { plan, edl, fcpxml, tc, fileUrl };
})(window.Weasel = window.Weasel || {});
