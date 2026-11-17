/* Weasel — linha do tempo do filme no editor: régua com o código de tempo e os marcadores (mark), os planos (com marquinhas nos at),
   os sons (forma de onda e, nas falas, as bocas do lip sync) e as legendas. Clicar leva o player até ali e o
   cursor do código até a linha do bloco; arrastar um som, uma legenda ou o fim de um plano reescreve o tempo
   no código (só do arquivo aberto). Roda do mouse rola, Ctrl+roda aproxima, duplo clique no vazio enquadra. */
(function (W) {
  'use strict';
  const H_RULER = 20, H_SHOT = 30, H_LANE = 18, H_AUDIO = 38, H_SUB = 26, GUT = 70, EDGE = 6, DOT = 4.5;
  const COLORS = { shotA: '#2f3f63', shotB: '#36486e', other: '#2a2f3c', audio: '#1f5a5a', wave: '#7fe0d0', lips: '#ffd166', sub: '#5b4a1f', subText: '#ffe7a8', play: '#ff8a1f', mark: '#c77dff', sel: '#ff9f43' };
  // as faixas dos at (etapa 7b): a cor de cada tipo de alvo
  const LANE_C = { actor: '#b9adf5', camera: '#ffd166', light: '#ffb860', layer: '#9fe0d8', shape: '#9fe0d8' };
  const SEP = '\u0001';

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

  // host: { model(), frame(), setFrame(f), range(), editable(owner), lineOf(src), gotoLine(line), edit(src, field, seconds), open(file), hint(msg),
  //         lanes(model) → [{ name, kind, keys: [{ t, line, entry, fixed, ease }] }], atMove(list, dt, copy), atDel(list), atMenu(x, y, list),
  //         shotMenu(x, y, entry) }  (os at: list = [{ name, line }])
  function timelineView(canvas, host) {
    const v = { t0: 0, pps: 0, auto: true, drag: null, layout: null, sel: new Set() };
    const ctx = canvas.getContext('2d');
    canvas.tabIndex = 0;
    const atId = (name, line) => name + SEP + line;
    const chosen = () => [...v.sel].map((s) => { const i = s.lastIndexOf(SEP); return { name: s.slice(0, i), line: +s.slice(i + 1) }; });

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
      // as faixas dos at do arquivo aberto (uma por alvo); a escolha perde o que não existe mais
      const atLanes = host.lanes ? host.lanes(model) || [] : [];
      const live = new Set();
      for (const ln of atLanes) for (const k of ln.keys) live.add(atId(ln.name, k.line));
      for (const s of [...v.sel]) if (!live.has(s)) v.sel.delete(s);
      const laneTop = H_RULER + H_SHOT, audioTop = laneTop + atLanes.length * H_LANE;
      const rows = { ruler: 0, shots: H_RULER, lanes: laneTop, audio: audioTop, subs: audioTop + nAudio * H_AUDIO };
      const height = rows.subs + (tl.subs.length ? H_SUB : 0) + 4;
      return { tl, lanes, nAudio, rows, height, atLanes };
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
      // na régua: os marcadores (arrastar muda o tempo do mark)
      if (y < H_RULER) {
        for (const mk of L.tl.marks || []) if (Math.abs(xOf(mk.start) - x) <= 5) return { kind: 'mark', item: mk, owner: mk.owner, src: mk.src };
        return null;
      }
      if (y >= L.rows.lanes && y < L.rows.audio) {
        const ln = L.atLanes[Math.floor((y - L.rows.lanes) / H_LANE)];
        if (!ln) return null;
        let best = null, bd = DOT + 3;
        for (const k of ln.keys) { const d = Math.abs(xOf(k.t) - x); if (d <= bd) { bd = d; best = k; } }
        return best ? { kind: 'at', lane: ln, item: best, owner: host.model() } : { kind: 'lane', lane: ln, owner: host.model() };
      }
      if (y >= L.rows.shots && y < L.rows.lanes) {
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

    function diamond(x, y, r, fill) {
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = '#0b0d12';
      ctx.stroke();
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
        // transição na entrada (in=): uma cunha clara no começo do plano
        if (e.shot.trans) {
          const xt = Math.min(x1, xOf(e.start / fps + e.shot.trans.dur));
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.lineTo(xt, y);
          ctx.lineTo(x0, y + H_SHOT - 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = '#c9d4ea';
        clipText(e.name, x0 + 5, y + 10, x1 - x0 - 8);
        const keys = new Set();
        for (const tr of e.shot.tracks.values()) for (const k of tr.keys) keys.add(k.t);
        ctx.fillStyle = '#ffd16699';
        for (const k of keys) { const x = xOf(e.start / fps + k); if (x > x0 && x < x1) ctx.fillRect(x - 0.5, y + H_SHOT - 10, 1.5, 5); }
      });

      // as faixas dos at: um losango em cada at que muda o alvo; entre dois do mesmo plano, um traço (o valor vai
      // de um ao outro); arrastando, os escolhidos aparecem no lugar novo
      const dragAt = v.drag && v.drag.kind === 'at' && v.drag.moved ? v.drag : null;
      L.atLanes.forEach((ln, i) => {
        const y = L.rows.lanes + i * H_LANE, cy = y + H_LANE / 2, c = LANE_C[ln.kind] || '#c9d4ea';
        ctx.fillStyle = i % 2 ? 'rgba(20,24,33,.55)' : 'rgba(26,31,42,.55)';
        ctx.fillRect(GUT, y, w - GUT, H_LANE);
        ctx.strokeStyle = c;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let j = 1; j < ln.keys.length; j++) {
          const a = ln.keys[j - 1], b = ln.keys[j];
          if (a.entry !== b.entry) continue;
          ctx.moveTo(xOf(a.t), cy);
          ctx.lineTo(xOf(b.t), cy);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        for (const k of ln.keys) {
          const on = v.sel.has(atId(ln.name, k.line)), x = xOf(k.t);
          if (x < GUT - DOT || x > w + DOT) continue;
          const moved = dragAt && on;
          diamond(x, cy, k.fixed ? DOT - 1 : DOT, moved && !dragAt.copy ? 'rgba(233,236,242,.25)' : on ? COLORS.sel : c);
          if (moved) diamond(xOf(k.t + dragAt.dt), cy, DOT, COLORS.sel);
        }
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

      // marcadores (mark): uma linha fina em tudo e o nome na régua
      for (const mk of L.tl.marks || []) {
        const x = Math.round(xOf(mk.start)) + 0.5;
        if (x < GUT || x > w) continue;
        ctx.strokeStyle = COLORS.mark;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, H_RULER);
        ctx.lineTo(x, L.height);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = COLORS.mark;
        ctx.beginPath();
        ctx.moveTo(x - 4, H_RULER - 9);
        ctx.lineTo(x + 4, H_RULER - 9);
        ctx.lineTo(x, H_RULER - 2);
        ctx.fill();
        ctx.fillText(mk.name, x + 6, H_RULER - 6);
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
      L.atLanes.forEach((ln, i) => {
        const y = L.rows.lanes + i * H_LANE;
        ctx.fillStyle = LANE_C[ln.kind] || '#c9d4ea';
        ctx.beginPath();
        ctx.arc(9, y + H_LANE / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aab4c6';
        let t = ln.name === 'camera' ? 'câmera' : ln.name;
        while (t.length > 2 && ctx.measureText(t).width > GUT - 20) t = t.slice(0, -2) + '…';
        ctx.fillText(t, 16, y + H_LANE / 2 + 0.5);
      });
      ctx.fillStyle = '#7d889b';
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
      canvas.focus({ preventScroll: true });
      const L0 = v.layout;
      // o nome de uma faixa de at: escolhe todos os at dela (Shift soma)
      if (x < GUT) {
        const ln = y >= L0.rows.lanes && y < L0.rows.audio ? L0.atLanes[Math.floor((y - L0.rows.lanes) / H_LANE)] : null;
        if (ln) { if (!e.shiftKey) v.sel.clear(); for (const k of ln.keys) v.sel.add(atId(ln.name, k.line)); draw(); }
        return;
      }
      const h = hit(x, y);
      if (h && h.kind === 'lane') { if (!e.shiftKey) v.sel.clear(); v.drag = { kind: 'scrub' }; scrub(x); return; }
      // um at: escolhe (Shift ou Ctrl somam e tiram) e arrasta (Alt: uma cópia); um clique leva o código até a linha
      if (h && h.kind === 'at') {
        const id = atId(h.lane.name, h.item.line);
        if (e.shiftKey || e.ctrlKey || e.metaKey) { if (v.sel.has(id)) v.sel.delete(id); else v.sel.add(id); } else if (!v.sel.has(id)) v.sel = new Set([id]);
        v.drag = { kind: 'at', x0: x, dt: 0, moved: false, copy: e.altKey, item: h.item, toggled: e.shiftKey || e.ctrlKey || e.metaKey };
        draw();
        return;
      }
      if (!h) { v.drag = { kind: 'scrub' }; scrub(x); return; }
      if (!host.editable(h.owner)) { host.hint('Este bloco é de outro arquivo (scene): duplo clique abre o arquivo.'); scrub(x); return; }
      const line = host.lineOf(h.src);
      if (line >= 0) host.gotoLine(line);
      const L = v.layout;
      let y0, hh, start, end;
      if (h.kind === 'mark') { start = end = h.item.start; y0 = 0; hh = H_RULER; } else if (h.kind === 'shot') { start = h.item.start / L.tl.fps; end = (h.item.start + h.item.frames) / L.tl.fps; y0 = L.rows.shots + 2; hh = H_SHOT - 4; } else if (h.kind === 'audio') { start = h.item.start; end = h.item.end; y0 = L.rows.audio + L.lanes.get(h.item) * H_AUDIO + 2; hh = H_AUDIO - 4; } else { start = h.item.start; end = h.item.end; y0 = L.rows.subs + 2; hh = H_SUB - 4; }
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
        canvas.style.cursor = !h ? 'text' : !host.editable(h.owner) ? 'default' : h.edge ? 'ew-resize' : h.kind === 'shot' || h.kind === 'lane' ? 'text' : 'grab';
        const tip = h && h.kind === 'at' ? `${h.item.text || ''} (linha ${h.item.line + 1}). Arraste para mudar o tempo (Alt: copia); botão direito: ease; Delete apaga.` : h && h.kind === 'shot' && host.editable(h.owner) && host.shotMenu ? 'Botão direito: a transição de entrada (in=).' : '';
        if (canvas.title !== tip) canvas.title = tip;
        return;
      }
      if (d.kind === 'scrub') { scrub(x); return; }
      if (d.kind === 'at') {
        if (Math.abs(x - d.x0) > 2) d.moved = true;
        if (!d.moved) return;
        // o at agarrado cai num quadro (e gruda na cabeça de leitura e no começo dos planos); os outros escolhidos
        // andam o mesmo tanto
        const t1 = snapT(d.item.t + (x - d.x0) / v.pps, false);
        d.dt = t1 - d.item.t;
        d.copy = e.altKey;
        draw();
        return;
      }
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
      if (d && d.kind === 'at') {
        if (d.moved && d.dt) { if (host.atMove) host.atMove(chosen(), d.dt, d.copy); } else if (!d.moved && !d.toggled) host.gotoLine(d.item.line);
      }
      draw();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', () => { v.drag = null; draw(); });
    // o botão direito num at: o ease (como o valor chega nele) e apagar; num plano: a transição de entrada
    canvas.addEventListener('contextmenu', (e) => {
      const [x, y] = pos(e);
      const h = v.layout && x >= GUT ? hit(x, y) : null;
      if (h && h.kind === 'at' && host.atMenu) {
        e.preventDefault();
        const id = atId(h.lane.name, h.item.line);
        if (!v.sel.has(id)) v.sel = new Set([id]);
        draw();
        host.atMenu(e.clientX, e.clientY, chosen());
      } else if (h && h.kind === 'shot' && host.editable(h.owner) && host.shotMenu) {
        e.preventDefault();
        host.shotMenu(e.clientX, e.clientY, h.item);
      }
    });
    // com o foco na linha do tempo: Delete apaga os at escolhidos, as setas os empurram um quadro (Shift: 10),
    // Ctrl+A escolhe todos, Esc solta
    canvas.addEventListener('keydown', (e) => {
      const L = v.layout;
      if (!L) return;
      const k = e.key;
      if ((e.ctrlKey || e.metaKey) && (k === 'a' || k === 'A')) { v.sel.clear(); for (const ln of L.atLanes) for (const q of ln.keys) v.sel.add(atId(ln.name, q.line)); } else if (!v.sel.size) return;
      else if (k === 'Delete' || k === 'Backspace') { if (host.atDel) host.atDel(chosen()); } else if (k === 'Escape') v.sel.clear();
      else if (k === 'ArrowLeft' || k === 'ArrowRight') { if (host.atMove) host.atMove(chosen(), ((e.shiftKey ? 5 : 1) * (k === 'ArrowLeft' ? -1 : 1)) / fpsNow(), false); } else return;
      e.preventDefault();
      e.stopPropagation();
      draw();
    });
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

    return { draw, view: v, hit, xOf, tOf, layout: () => v.layout, sel: chosen };
  }

  W.timelineView = timelineView;
})(window.Weasel = window.Weasel || {});
