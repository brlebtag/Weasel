/* Weasel — linha do tempo do filme no editor: régua com o código de tempo, os planos (com marquinhas nos at),
   os sons (forma de onda e, nas falas, as bocas do lip sync) e as legendas. Clicar leva o player até ali e o
   cursor do código até a linha do bloco; arrastar um som, uma legenda ou o fim de um plano reescreve o tempo
   no código (só do arquivo aberto). Roda do mouse rola, Ctrl+roda aproxima, duplo clique no vazio enquadra. */
(function (W) {
  'use strict';
  const H_RULER = 20, H_SHOT = 30, H_AUDIO = 38, H_SUB = 26, GUT = 70, EDGE = 6;
  const COLORS = { shotA: '#2f3f63', shotB: '#36486e', other: '#2a2f3c', audio: '#1f5a5a', wave: '#7fe0d0', lips: '#ffd166', sub: '#5b4a1f', subText: '#ffe7a8', play: '#ff8a1f' };

  // picos da forma de onda: o maior valor a cada 5 ms (calculado uma vez por som)
  function peaks(media) {
    if (!media) return null;
    if (media._peaks) return media._peaks;
    let data = media.mono, rate = media.sampleRate;
    if (!data && media.audio) { data = media.audio.getChannelData(0); rate = media.audio.sampleRate; }
    if (!data || !rate) return null;
    const step = Math.max(1, Math.round(rate / 200)), n = Math.ceil(data.length / step), out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let j = i * step, e = Math.min(data.length, j + step); j < e; j++) { const v = Math.abs(data[j]); if (v > m) m = v; }
      out[i] = m;
    }
    media._peaks = { data: out, per: 200 };
    return media._peaks;
  }

  // host: { model(), frame(), setFrame(f), range(), editable(owner), lineOf(src), gotoLine(line), edit(src, field, seconds), open(file), hint(msg) }
  function timelineView(canvas, host) {
    const v = { t0: 0, pps: 0, auto: true, drag: null, layout: null };
    const ctx = canvas.getContext('2d');

    function layout(model) {
      const tl = W.film.timeline(model);
      // sons em trilhas: cada um na primeira livre
      const ends = [], lanes = new Map();
      for (const c of [...tl.audios].sort((a, b) => a.start - b.start)) {
        let k = ends.findIndex((e) => e <= c.start + 1e-6);
        if (k < 0) { k = ends.length; ends.push(0); }
        ends[k] = c.end;
        lanes.set(c, k);
      }
      const nAudio = Math.max(1, ends.length);
      const rows = { ruler: 0, shots: H_RULER, audio: H_RULER + H_SHOT, subs: H_RULER + H_SHOT + nAudio * H_AUDIO };
      const height = rows.subs + (tl.subs.length ? H_SUB : 0) + 4;
      return { tl, lanes, nAudio, rows, height };
    }
    const xOf = (t) => GUT + (t - v.t0) * v.pps;
    const tOf = (x) => v.t0 + (x - GUT) / v.pps;

    function fit(width, dur) {
      v.pps = Math.max(1e-3, (width - GUT - 12) / Math.max(0.5, dur));
      v.t0 = 0;
    }

    // o que está sob o ponto (x, y): bloco, e se é a borda direita (para mudar a duração)
    function hit(x, y) {
      const L = v.layout;
      if (!L || x < GUT) return null;
      const t = tOf(x), near = (t1) => Math.abs(xOf(t1) - x) <= EDGE;
      if (y >= L.rows.shots && y < L.rows.audio) {
        for (const e of L.tl.entries) {
          const a = e.start / L.tl.fps, b = (e.start + e.frames) / L.tl.fps;
          if (near(b)) return { kind: 'shot', item: e, edge: true, owner: e.owner, src: e.shot };
          if (t >= a && t < b) return { kind: 'shot', item: e, owner: e.owner, src: e.shot };
        }
      }
      if (y >= L.rows.audio && y < L.rows.subs) {
        const lane = Math.floor((y - L.rows.audio) / H_AUDIO);
        for (const c of L.tl.audios) {
          if (L.lanes.get(c) !== lane) continue;
          if (near(c.end)) return { kind: 'audio', item: c, edge: true, owner: c.owner, src: c.a };
          if (t >= c.start && t < c.end) return { kind: 'audio', item: c, owner: c.owner, src: c.a };
        }
      }
      if (y >= L.rows.subs && L.tl.subs.length) {
        for (const s of L.tl.subs) {
          if (near(s.end)) return { kind: 'sub', item: s, edge: true, owner: s.owner, src: s.src };
          if (t >= s.start && t < s.end) return { kind: 'sub', item: s, owner: s.owner, src: s.src };
        }
      }
      return null;
    }

    function draw() {
      const model = host.model();
      if (!model || !model.film) return;
      const L = (v.layout = layout(model));
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      if (canvas.style.height !== L.height + 'px') canvas.style.height = L.height + 'px';
      const cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(L.height * dpr));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      const fps = L.tl.fps, dur = Math.max(1 / fps, L.tl.duration);
      if (v.auto || !v.pps) fit(w, dur);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, L.height);
      ctx.font = '11px ui-monospace, Consolas, monospace';
      ctx.textBaseline = 'middle';
      const clipText = (text, x, y, maxW) => {
        if (maxW < 14) return;
        let s = text;
        while (s.length > 1 && ctx.measureText(s).width > maxW) s = s.slice(0, -2) + '…';
        ctx.fillText(s, x, y);
      };
      ctx.save();
      ctx.beginPath();
      ctx.rect(GUT, 0, w - GUT, L.height);
      ctx.clip();

      // régua: marcas a cada 1, 2, 5, 10… segundos (o que couber)
      const steps = [1 / fps, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
      const step = steps.find((s) => s * v.pps >= 70) || 600;
      ctx.fillStyle = '#151821';
      ctx.fillRect(GUT, 0, w - GUT, H_RULER);
      ctx.strokeStyle = '#3a4152';
      ctx.fillStyle = '#9aa6b8';
      ctx.beginPath();
      for (let t = Math.max(0, Math.floor(v.t0 / step) * step); t <= Math.min(dur, tOf(w)); t += step) {
        const x = Math.round(xOf(t)) + 0.5;
        ctx.moveTo(x, H_RULER - 7);
        ctx.lineTo(x, L.height);
        const label = W.film.timecode(Math.round(t * fps), fps);
        if (x + 3 >= GUT && x + 3 + ctx.measureText(label).width <= w) ctx.fillText(label, x + 3, 9);
      }
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // planos, com marquinhas nos at
      L.tl.entries.forEach((e, i) => {
        const x0 = xOf(e.start / fps), x1 = xOf((e.start + e.frames) / fps), y = L.rows.shots + 2;
        const mine = host.editable(e.owner);
        ctx.fillStyle = mine ? (i % 2 ? COLORS.shotB : COLORS.shotA) : COLORS.other;
        ctx.fillRect(x0, y, Math.max(1, x1 - x0 - 1), H_SHOT - 4);
        ctx.fillStyle = '#c9d4ea';
        clipText(e.name, x0 + 5, y + 10, x1 - x0 - 8);
        const keys = new Set();
        for (const tr of e.shot.tracks.values()) for (const k of tr.keys) keys.add(k.t);
        ctx.fillStyle = '#ffd16699';
        for (const k of keys) { const x = xOf(e.start / fps + k); if (x > x0 && x < x1) ctx.fillRect(x - 0.5, y + H_SHOT - 10, 1.5, 5); }
      });

      // sons: forma de onda (loop repete o arquivo) e as bocas do lip sync
      for (const c of L.tl.audios) {
        const lane = L.lanes.get(c), y = L.rows.audio + lane * H_AUDIO + 2, hgt = H_AUDIO - 4;
        const x0 = xOf(c.start), x1 = xOf(c.end);
        if (x1 < GUT || x0 > w) continue;
        const media = c.a.media, pk = peaks(media);
        ctx.fillStyle = host.editable(c.owner) ? COLORS.audio : COLORS.other;
        ctx.fillRect(x0, y, Math.max(1, x1 - x0 - 1), hgt);
        if (!media) {
          ctx.strokeStyle = '#ff6b6b';
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(x0 + 0.5, y + 0.5, x1 - x0 - 2, hgt - 1);
          ctx.setLineDash([]);
        }
        if (pk) {
          const period = c.a.loop && media.duration ? media.duration : Infinity, mid = y + hgt / 2 + 4;
          ctx.fillStyle = COLORS.wave;
          ctx.globalAlpha = 0.75;
          for (let x = Math.max(GUT, Math.floor(x0)); x < Math.min(w, x1); x++) {
            let ft = c.a.from + (tOf(x) - c.start);
            if (period !== Infinity) ft = (c.a.from + (tOf(x) - c.start)) % period;
            const i0 = Math.floor(ft * pk.per), i1 = Math.max(i0 + 1, Math.floor((ft + 1 / v.pps) * pk.per));
            let m = 0;
            for (let i = i0; i < i1 && i < pk.data.length; i++) if (pk.data[i] > m) m = pk.data[i];
            const hh = Math.max(0.5, m * (hgt - 14) / 2);
            ctx.fillRect(x, mid - hh, 1, hh * 2);
          }
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = '#e6fffa';
        clipText(`${c.a.name}${c.a.lips ? ' → ' + c.a.lips : ''}${c.a.loop ? ' · loop' : ''}${media ? '' : ' (falta o som)'}`, x0 + 4, y + 8, x1 - x0 - 8);
        const cues = c.a.lips && W.film.cuesOf(c.a);
        if (cues) {
          ctx.fillStyle = COLORS.lips;
          for (const q of cues) {
            const xs = xOf(c.start + q.start - c.a.from), xe = xOf(c.start + q.end - c.a.from);
            if (xe < x0 || xs > x1 || xe - xs < 9 || q.value === 'X') continue;
            ctx.fillText(q.value, xs + 1, y + hgt - 6);
          }
        }
      }

      // legendas
      if (L.tl.subs.length) {
        for (const s of L.tl.subs) {
          const x0 = xOf(s.start), x1 = xOf(s.end), y = L.rows.subs + 2;
          ctx.fillStyle = host.editable(s.owner) ? COLORS.sub : COLORS.other;
          ctx.fillRect(x0, y, Math.max(1, x1 - x0 - 1), H_SUB - 4);
          ctx.fillStyle = COLORS.subText;
          clipText(s.text.replace(/\n/g, ' / '), x0 + 4, y + (H_SUB - 4) / 2, x1 - x0 - 8);
        }
      }

      // trecho escolhido no player (um plano): o resto fica escuro
      const [lo, hi] = host.range();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      if (lo > 0) ctx.fillRect(GUT, H_RULER, xOf(lo / fps) - GUT, L.height);
      if (hi < L.tl.frames) ctx.fillRect(xOf(hi / fps), H_RULER, w, L.height);

      // arrastando: onde o bloco vai ficar
      if (v.drag && v.drag.preview) {
        const p = v.drag.preview;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(xOf(p.start) + 0.5, p.y + 0.5, Math.max(2, (p.end - p.start) * v.pps - 1), p.h - 1);
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
      }

      // cabeça de leitura
      const xp = Math.round(xOf(host.frame() / fps)) + 0.5;
      ctx.strokeStyle = COLORS.play;
      ctx.beginPath();
      ctx.moveTo(xp, 0);
      ctx.lineTo(xp, L.height);
      ctx.stroke();
      ctx.fillStyle = COLORS.play;
      ctx.beginPath();
      ctx.moveTo(xp - 5, 0);
      ctx.lineTo(xp + 5, 0);
      ctx.lineTo(xp, 7);
      ctx.fill();
      ctx.restore();

      // nomes das trilhas
      ctx.fillStyle = '#11141b';
      ctx.fillRect(0, 0, GUT, L.height);
      ctx.fillStyle = '#7d889b';
      ctx.fillText(W.film.timecode(host.frame(), fps), 4, 10);
      ctx.fillText('planos', 6, L.rows.shots + H_SHOT / 2);
      for (let k = 0; k < L.nAudio; k++) ctx.fillText(`som ${k + 1}`, 6, L.rows.audio + k * H_AUDIO + H_AUDIO / 2);
      if (L.tl.subs.length) ctx.fillText('legendas', 6, L.rows.subs + H_SUB / 2);
    }

    // ---------- mouse ----------
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const fpsNow = () => v.layout.tl.fps;
    const snapT = (t, alt) => {
      const fps = fpsNow();
      let s = Math.round(t * fps) / fps;
      if (alt) return s;
      // gruda na cabeça de leitura e no começo dos planos (a menos de 6 px)
      const cands = [host.frame() / fps, ...v.layout.tl.entries.map((e) => e.start / fps)];
      for (const c of cands) if (Math.abs(c - t) * v.pps < 6) s = c;
      return s;
    };
    function scrub(x) {
      const L = v.layout;
      host.setFrame(Math.max(0, Math.min(L.tl.frames - 1, Math.round(tOf(x) * L.tl.fps))));
    }
    canvas.addEventListener('pointerdown', (e) => {
      if (!v.layout || e.button !== 0) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro que o navegador não conhece */ }
      const [x, y] = pos(e);
      if (x < GUT) return;
      const h = hit(x, y);
      if (!h || y < H_RULER) { v.drag = { kind: 'scrub' }; scrub(x); return; }
      if (!host.editable(h.owner)) { host.hint('Este bloco é de outro arquivo (scene): duplo clique abre o arquivo.'); scrub(x); return; }
      const line = host.lineOf(h.src);
      if (line >= 0) host.gotoLine(line);
      const L = v.layout;
      let y0, hh, start, end;
      if (h.kind === 'shot') { start = h.item.start / L.tl.fps; end = (h.item.start + h.item.frames) / L.tl.fps; y0 = L.rows.shots + 2; hh = H_SHOT - 4; } else if (h.kind === 'audio') { start = h.item.start; end = h.item.end; y0 = L.rows.audio + L.lanes.get(h.item) * H_AUDIO + 2; hh = H_AUDIO - 4; } else { start = h.item.start; end = h.item.end; y0 = L.rows.subs + 2; hh = H_SUB - 4; }
      // arrastar o meio de um plano só passeia o player (o começo dele vem dos planos de antes)
      if (h.kind === 'shot' && !h.edge) { v.drag = { kind: 'scrub' }; scrub(x); return; }
      v.drag = { kind: 'move', h, x0: x, start, end, y: y0, h0: hh, moved: false };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!v.layout) return;
      const [x, y] = pos(e);
      const d = v.drag;
      if (!d) {
        const h = x >= GUT ? hit(x, y) : null;
        canvas.style.cursor = !h || y < H_RULER ? 'text' : !host.editable(h.owner) ? 'default' : h.edge ? 'ew-resize' : h.kind === 'shot' ? 'text' : 'grab';
        return;
      }
      if (d.kind === 'scrub') { scrub(x); return; }
      const dt = (x - d.x0) / v.pps;
      if (Math.abs(x - d.x0) > 2) d.moved = true;
      if (!d.moved) return;
      if (d.h.edge) d.preview = { start: d.start, end: Math.max(d.start + 1 / fpsNow(), snapT(d.end + dt, e.altKey)), y: d.y, h: d.h0 };
      else { const s = Math.max(0, snapT(d.start + dt, e.altKey)); d.preview = { start: s, end: s + (d.end - d.start), y: d.y, h: d.h0 }; }
      draw();
    });
    const end = () => {
      const d = v.drag;
      v.drag = null;
      if (d && d.kind === 'move' && d.moved && d.preview) {
        const h = d.h;
        if (h.edge) host.edit(h.kind, h.item, 'dur', d.preview.end - d.preview.start);
        else host.edit(h.kind, h.item, 'start', d.preview.start);
      }
      draw();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('dblclick', (e) => {
      const [x, y] = pos(e);
      const h = v.layout && x >= GUT ? hit(x, y) : null;
      if (h && !host.editable(h.owner)) { host.open(h.item.file || (h.item.entry && h.item.entry.file)); return; }
      if (!h) { v.auto = true; draw(); }
    });
    canvas.addEventListener('wheel', (e) => {
      if (!v.layout) return;
      e.preventDefault();
      const [x] = pos(e);
      v.auto = false;
      if (e.ctrlKey || e.metaKey) {
        const t = tOf(x), k = Math.exp(-e.deltaY * 0.0015);
        v.pps = Math.min(4000, Math.max(0.01, v.pps * k));
        v.t0 = t - (x - GUT) / v.pps;
      } else v.t0 += (e.deltaY + e.deltaX) / v.pps;
      v.t0 = Math.max(-1 / v.pps * 10, Math.min(v.t0, v.layout.tl.duration));
      draw();
    }, { passive: false });

    return { draw, view: v, hit, xOf, tOf, layout: () => v.layout };
  }

  W.timelineView = timelineView;
})(window.Weasel = window.Weasel || {});
