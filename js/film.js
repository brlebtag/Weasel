/* Weasel — filme: planos em sequência, atores (outros arquivos .weasel), o que muda com o tempo (at),
   câmera com profundidade (paralaxe) e o quadro pronto. Tudo é calculado a partir do número do quadro,
   então qualquer quadro sai igual em qualquer ordem (render em paralelo, player, exportação). */
(function (W) {
  'use strict';
  const S = W.scene, G = W.geom, M = G.M;
  const NOPROPS = {};

  // ---------- linha do tempo ----------
  // Os planos do arquivo e os das cenas (scene) em sequência, em quadros do filme.
  // Também os sons (audio) e as legendas (sub e text= dos sons), em segundos do filme.
  function timeline(model) {
    if (model._timeline) return model._timeline;
    const fps = model.film.fps, entries = [], audios = [], subs = [], marks = [];
    const lang = model.film.lang;
    let start = 0;
    // um som no tempo: começa em base + at e dura dur=, o resto do arquivo, ou (loop, ou duração
    // desconhecida) até o fim do bloco (o shot, ou a cena inteira para sons fora de shot)
    const clip = (a, owner, base, blockEnd, file) => {
      const t0 = base + a.at;
      const fileDur = a.media && a.media.duration ? Math.max(0, a.media.duration - a.from) : null;
      let dur = a.dur !== null ? a.dur : !a.loop && fileDur !== null ? fileDur : blockEnd - t0;
      if (a.dur === null && fileDur === null && a.cues && a.cues.length && !a.loop) dur = a.cues[a.cues.length - 1].end - a.from;
      const c = { a, owner, start: t0, end: t0 + Math.max(0, dur), fileDur, base, file };
      audios.push(c);
      if (a.text) subs.push({ start: c.start, end: c.end, text: a.text, lang: a.lang || owner.film.lang || lang, src: a, owner, base, file, fromAudio: true });
    };
    const sub = (s, owner, base, file) => subs.push({ start: base + s.t, end: base + s.t + s.dur, text: s.text, lang: s.lang || owner.film.lang || lang, src: s, owner, base, file });
    // file: o arquivo de onde vêm os blocos (undefined = o arquivo principal)
    // chain: os arquivos do filme até este (o principal primeiro): o art de cada nível vale no plano
    const walk = (owner, prefix, fit, depth, file, chain) => {
      const first = start;
      chain = chain ? [...chain, owner] : [owner];
      for (const s of owner.film.seq) {
        if (s.kind === 'shot') {
          const frames = Math.max(1, Math.round(s.shot.dur * fps));
          // o plano sem nome de uma cena (arquivo sem shot) leva só o nome do arquivo
          const name = s.shot.implicit && prefix ? prefix.slice(0, -1) : prefix + s.shot.name;
          entries.push({ owner, shot: s.shot, name, start, frames, fit, index: entries.length, file, chain });
          for (const a of s.shot.audios) clip(a, owner, start / fps, (start + frames) / fps, file);
          for (const sb of s.shot.subs) sub(sb, owner, start / fps, file);
          start += frames;
        } else if (depth < 8) walk(s.model, prefix + s.file.replace(/\.[^.]+$/, '') + '/', fitOf(owner, s.model, fit), depth + 1, s.file, chain);
      }
      for (const a of owner.film.audios) clip(a, owner, first / fps, start / fps, file);
      for (const sb of owner.film.subs) sub(sb, owner, first / fps, file);
      // marcadores (mark): no tempo do filme inteiro
      for (const mk of owner.film.marks || []) marks.push({ name: mk.name, start: first / fps + mk.abs, owner, src: mk, base: first / fps + (mk.shot ? mk.shot.start || 0 : 0), file });
    };
    walk(model, '', null, 0);
    subs.sort((p, q) => p.start - q.start || p.end - q.end);
    marks.sort((p, q) => p.start - q.start);
    model._timeline = { fps, entries, frames: start, duration: start / fps, audios, subs, marks };
    return model._timeline;
  }

  // ---------- lip sync ----------
  // Quando a boca não existe no personagem, a próxima da lista (a última opção é a boca parada).
  const LIP_CHAIN = { A: ['A', 'X'], B: ['B', 'C', 'A'], C: ['C', 'B', 'D'], D: ['D', 'C', 'B'], E: ['E', 'C', 'B'], F: ['F', 'A', 'B'], G: ['G', 'B', 'A'], H: ['H', 'C', 'B'], X: ['X'] };
  // as bocas de um som: do Rhubarb (cues=) ou calculadas do .wav (uma vez só; nas threads da linha de comando, elas
  // chegam prontas em media.autoCues)
  function cuesOf(a) {
    if (a.cues) return a.cues;
    if (a._auto === undefined) a._auto = !a.media ? null : a.media.autoCues ? a.media.autoCues : a.media.mono ? W.audio.lipCues(a.media.mono, a.media.sampleRate) : null;
    return a._auto;
  }
  // a boca que o ator faz no segundo T do filme (null = sem fala agora)
  function lipAt(model, entry, name, T) {
    let v = null;
    for (const c of timeline(model).audios) {
      if (c.owner !== entry.owner || c.a.lips !== name || T < c.start || T >= c.end) continue;
      const cues = cuesOf(c.a);
      if (!cues) continue;
      const local = T - c.start;
      v = W.audio.cueAt(cues, c.a.from + (c.a.loop && c.fileDur ? local % c.fileDur : local));
    }
    return v;
  }
  // troca a forma da boca (mouth) pela da letra, por morph, numa cópia da pose
  function applyLips(s, letter) {
    const mo = s.model && s.model.mouth;
    if (!mo || !s.pose) return;
    let v = null;
    for (const k of LIP_CHAIN[letter] || [letter]) if (mo.map[k]) { v = mo.map[k]; break; }
    if (!v) return;
    const props = new Map(s.pose.props);
    for (const el of s.model.named.get(mo.name) || []) {
      const to = S.findNamed(s.model, v.shape, el.inst);
      if (!to) continue;
      props.set(el.id, Object.assign({}, props.get(el.id) || {}, { shape: { from: el, to, t: v.t } }));
    }
    s.pose = Object.assign({}, s.pose, { props, geo: new Map() });
    s.lips = letter;
  }

  // ---------- legendas ----------
  // as legendas de um trecho [from, to) em segundos, com o tempo contado do começo do trecho
  function subtitles(model, from, to, lang) {
    const tl = timeline(model), want = lang || model.film.lang;
    return tl.subs.filter((s) => s.lang === want && s.end > from && s.start < to)
      .map((s) => ({ start: Math.max(0, s.start - from), end: Math.min(to, s.end) - from, text: s.text }));
  }
  const langs = (model) => [...new Set(timeline(model).subs.map((s) => s.lang))];
  // legenda desenhada no quadro: letras claras com contorno escuro, centralizadas embaixo
  function drawSubs(ctx, model, frame, lang) {
    const tl = timeline(model), T = frame / tl.fps, want = lang || model.film.lang;
    const now = tl.subs.filter((s) => s.lang === want && T >= s.start && T < s.end);
    if (!now.length) return;
    const Wd = model.canvas.w, Hd = model.canvas.h, size = model.film.subsize || Math.round(Hd * 0.05);
    ctx.save();
    ctx.font = `600 ${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    const lines = [];
    for (const s of now) {
      for (const par of s.text.split('\n')) {
        let line = '';
        for (const w of par.split(' ')) {
          const tryLine = line ? line + ' ' + w : w;
          if (line && ctx.measureText(tryLine).width > Wd * 0.82) { lines.push(line); line = w; } else line = tryLine;
        }
        lines.push(line);
      }
    }
    const lh = size * 1.22;
    let y = Hd - Hd * 0.065 - (lines.length - 1) * lh;
    for (const l of lines) {
      ctx.lineWidth = size * 0.2;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(l, Wd / 2, y);
      ctx.fillStyle = model.film.subc || '#ffffff';
      ctx.fillText(l, Wd / 2, y);
      y += lh;
    }
    ctx.restore();
  }

  // os sons de um trecho [from, to) para misturar (o ffmpeg na linha de comando, o editor ao tocar)
  function audioClips(model, from, to) {
    const out = [];
    for (const c of timeline(model).audios) {
      if (c.end <= from || c.start >= to || !(c.a.vol > 0)) continue;
      const cut = Math.max(0, from - c.start);
      out.push({ a: c.a, media: c.a.media, at: Math.max(0, c.start - from), offset: c.a.from + cut, dur: Math.min(c.end, to) - Math.max(c.start, from), vol: c.a.vol, loop: c.a.loop, fileDur: c.fileDur, start: c.start });
    }
    return out;
  }
  // cena com outro tamanho de quadro: cabe inteira no quadro de quem a usa, centralizada
  function fitOf(parent, sub, parentFit) {
    const Wp = parent.canvas.w, Hp = parent.canvas.h, w = sub.canvas.w, h = sub.canvas.h;
    let m = null;
    if (w !== Wp || h !== Hp) {
      const s = Math.min(Wp / w, Hp / h);
      m = M.mul(M.translate((Wp - w * s) / 2, (Hp - h * s) / 2), M.scale(s, s));
    }
    return parentFit && m ? M.mul(parentFit, m) : parentFit || m;
  }

  // Em que plano está o quadro (de 0 a frames-1) e quantos segundos depois do começo do plano.
  function locate(model, frame) {
    const tl = timeline(model);
    if (!tl.entries.length) return null;
    const f = Math.max(0, Math.min(tl.frames - 1, Math.round(frame)));
    let lo = 0, hi = tl.entries.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (tl.entries[mid].start <= f) lo = mid; else hi = mid - 1;
    }
    const entry = tl.entries[lo];
    return { entry, frame: f, local: f - entry.start, t: (f - entry.start) / tl.fps };
  }

  // 00:01:12 (minutos:segundos:quadro) — ou 1:02:03:12 com horas
  function timecode(frame, fps) {
    const f = Math.max(0, Math.round(frame)), r = Math.round(fps);
    const ff = f % r, s = Math.floor(f / r), ss = s % 60, mm = Math.floor(s / 60) % 60, hh = Math.floor(s / 3600);
    const p = (n) => String(n).padStart(2, '0');
    return `${hh ? hh + ':' : ''}${p(mm)}:${p(ss)}:${p(ff)}`;
  }

  // ---------- valores no tempo ----------
  const trackOf = (shot, kind, name, prop) => shot.tracks.get(`${kind}:${name}.${prop}`);
  // A declaração (actor, camera, light) vale como um at em 0s; o ease de cada at vale para o trecho que chega nele.
  function valueAt(tr, t, base) {
    if (!tr || !tr.keys.length) return base;
    const keys = tr.keys;
    if (tr.interp === 'step') {
      let v = base;
      for (const k of keys) { if (k.t <= t + 1e-9) v = k.v; else break; }
      return v;
    }
    let prev = { t: 0, v: base };
    for (const k of keys) {
      if (k.t <= t + 1e-9) { prev = k; continue; }
      const span = k.t - prev.t;
      if (span < 1e-9) return k.v;
      const u = G.EASE[k.ease]((t - prev.t) / span);
      if (tr.interp === 'color') return G.lerpColor(prev.v, k.v, u);
      return prev.v + (k.v - prev.v) * u;
    }
    return prev.v;
  }
  // Quantos segundos da animação "name" tocam de a até b, com a velocidade (speed) que muda por at: um número (1
  // normal, 0.5 metade) ou auto (a animação acompanha o quanto o ator anda; pode dar negativo, de ré)
  function animSecs(shot, ac, model, name, a, b) {
    if (!(b > a)) return 0;
    const tr = trackOf(shot, 'actor', ac.name, 'speed');
    const seg = (x, y, v) => (v === 'auto' ? autoSecs(shot, ac, model, name, x, y) : (y - x) * v);
    if (!tr || !tr.keys.length) return seg(a, b, ac.speed);
    let total = 0, cur = ac.speed, from = a;
    for (const k of tr.keys) {
      if (k.t <= a) { cur = k.v; continue; }
      if (k.t >= b) break;
      total += seg(from, k.t, cur);
      from = k.t;
      cur = k.v;
    }
    return total + seg(from, b, cur);
  }

  // ---------- speed=auto: a animação acompanha o quanto o ator anda ----------
  // A passada (anim feet=) diz quanto o personagem anda por segundo, em px do desenho, sem os pés escorregarem. Com
  // speed=auto, a animação toca no ritmo do ator: a distância que ele anda no palco, na direção em que o desenho olha
  // (com o rot= e o giro do path=), dividida pela passada vezes o scale=. Parado, ela para no quadro; de ré, toca ao
  // contrário; nunca passa de 3× (acima disso os pés escorregam, e a leitura avisa). Sem passada (sem feet=, ou sem
  // medida), toca em 1. O ator é medido em amostras de 1/120 s, uma vez por plano.
  const AUTO_MAX = 3, AUTO_DT = 1 / 120;
  // a passada da animação (px do desenho por segundo, com o sinal da direção) ou null sem medida
  function strideOf(model, name) {
    const a = name ? model.animMap.get(name) : null, g = a ? S.gait(model, a) : null;
    return g && g.speed !== null && Math.abs(g.speed) >= 0.05 ? g.speed : null;
  }
  // em cada amostra: along = quanto o ator anda no palco por segundo na direção do x do desenho dele; vel = o mesmo
  // em px do desenho (dividido pelo scale= e pelo flip=)
  function autoBox(shot, ac) {
    const all = shot._auto || (shot._auto = new Map());
    let box = all.get(ac.name);
    if (box) return box;
    const n = Math.max(1, Math.ceil((shot.dur || 0) / AUTO_DT)), vel = new Float64Array(n), along = new Float64Array(n);
    const v = (prop, base, t) => valueAt(trackOf(shot, 'actor', ac.name, prop), t, base);
    let p0 = actorPos(shot, ac, 0);
    for (let i = 0; i < n; i++) {
      const tm = (i + 0.5) * AUTO_DT, p1 = actorPos(shot, ac, (i + 1) * AUTO_DT);
      const r = ((v('rot', ac.rot, tm) + (ac.path ? actorPos(shot, ac, tm)[2] : 0)) * Math.PI) / 180;
      const sc = v('sx', ac.sx, tm) * v('flip', ac.flip, tm)[0];
      const d = ((p1[0] - p0[0]) * Math.cos(r) + (p1[1] - p0[1]) * Math.sin(r)) / AUTO_DT;
      along[i] = d;
      vel[i] = Math.abs(sc) < 1e-9 ? 0 : d / sc;
      p0 = p1;
    }
    box = { n, vel, along, cum: new Map() };
    all.set(ac.name, box);
    return box;
  }
  // os segundos de animação acumulados desde o começo do plano, amostra a amostra, como se fosse auto o tempo todo
  function autoTable(shot, ac, model, name) {
    const gs = strideOf(model, name);
    if (gs === null) return null;
    const box = autoBox(shot, ac);
    let byModel = box.cum.get(model);
    if (!byModel) box.cum.set(model, (byModel = new Map()));
    let C = byModel.get(name);
    if (!C) {
      C = new Float64Array(box.n + 1);
      for (let i = 0; i < box.n; i++) C[i + 1] = C[i] + Math.max(-AUTO_MAX, Math.min(AUTO_MAX, box.vel[i] / gs)) * AUTO_DT;
      byModel.set(name, C);
    }
    return C;
  }
  function autoSecs(shot, ac, model, name, a, b) {
    const C = autoTable(shot, ac, model, name);
    if (!C) return b - a;
    const at = (t) => {
      const x = Math.max(0, t / AUTO_DT), i = Math.min(C.length - 2, Math.floor(x));
      return C[i] + (C[i + 1] - C[i]) * Math.min(1, x - i);
    };
    return at(b) - at(a);
  }
  // O que a leitura avisa e o --info mostra de um ator com speed=auto num plano (null se ele não usa auto):
  // notes = os trechos em que ele anda mais rápido que 3× a passada, ou anda com uma animação sem passada, com a linha
  // do speed=auto que vale ali; anims = cada animação tocada com auto: a passada e o ritmo (em × a velocidade normal)
  // enquanto ele anda (negativo: de ré).
  function autoReport(shot, ac) {
    const tr = trackOf(shot, 'actor', ac.name, 'speed');
    const srcs = [{ t: 0, v: ac.speed, line: ac.line, tok: ac.speedTok }, ...(tr ? tr.keys : [])];
    if (!ac.model || !srcs.some((x) => x.v === 'auto')) return null;
    const box = autoBox(shot, ac), animTr = trackOf(shot, 'actor', ac.name, 'anim'), varTr = trackOf(shot, 'actor', ac.name, 'variant');
    const out = { notes: [], anims: new Map() }, r2 = (x) => Math.round(x * 100) / 100;
    let run = null;
    const flush = () => { if (run) out.notes.push(run); run = null; };
    for (let i = 0; i < box.n; i++) {
      const tm = (i + 0.5) * AUTO_DT;
      if (tm > shot.dur + 1e-9) break;
      let src = srcs[0];
      for (const x of srcs) { if (x.t <= tm + 1e-9) src = x; else break; }
      const name = src.v === 'auto' ? valueAt(animTr, tm, ac.anim) : null;
      const model = ac.models.get(valueAt(varTr, tm, ac.variant)) || ac.model, a = name ? model.animMap.get(name) : null;
      if (!a) { if (run && tm - run.t1 >= 0.1) flush(); continue; }
      const gs = strideOf(model, name), moving = Math.abs(box.along[i]) > 1;
      let kind = null;
      if (gs === null) { if (moving) kind = a.feet && a.feet.length ? 'unmeasured' : 'nofeet'; } else {
        const rate = box.vel[i] / gs;
        if (!out.anims.has(name)) out.anims.set(name, { stride: Math.abs(gs), lo: null, hi: null });
        const st = out.anims.get(name);
        if (moving) { st.lo = st.lo === null ? rate : Math.min(st.lo, rate); st.hi = st.hi === null ? rate : Math.max(st.hi, rate); }
        if (Math.abs(rate) > AUTO_MAX + 1e-6) kind = 'fast';
      }
      if (gs === null && !out.anims.has(name)) out.anims.set(name, { stride: null, lo: null, hi: null });
      if (kind && run && run.kind === kind && run.anim === name && run.src === src && tm - run.t1 < 0.1) run.t1 = tm;
      else if (kind) { flush(); run = { kind, anim: name, src, t0: tm, t1: tm }; } else if (run && tm - run.t1 >= 0.1) flush();
    }
    flush();
    out.notes = out.notes.map((n) => {
      const t0 = r2(Math.max(0, n.t0 - AUTO_DT / 2)), t1 = r2(n.t1 + AUTO_DT / 2), when = t1 - t0 < 0.05 ? `em ${t0}s` : `de ${t0}s a ${t1}s`;
      const msg = n.kind === 'fast' ? `speed=auto: o ator "${ac.name}" anda mais rápido que ${AUTO_MAX}× a passada de "${n.anim}" ${when}; ali os pés escorregam (use uma animação de correr)`
        : n.kind === 'nofeet' ? `speed=auto: o ator "${ac.name}" anda com "${n.anim}", que não tem feet=, ${when}; ela toca em 1`
          : `speed=auto: a passada de "${n.anim}" não dá para medir (veja o --info do arquivo dele); o ator "${ac.name}" anda com ela ${when}, e ela toca em 1`;
      return { kind: n.kind, anim: n.anim, t0, t1, msg, line: n.src.line, from: n.src.tok ? n.src.tok[0] : 0, to: n.src.tok ? n.src.tok[1] : 0 };
    });
    for (const st of out.anims.values()) { if (st.lo !== null) { st.lo = r2(st.lo); st.hi = r2(st.hi); } }
    return out;
  }

  // com path= e at … ator.along=, o ator anda pelo caminho (o x e o y do at deixam de valer)
  function actorPos(shot, ac, t) {
    const al = ac.path && trackOf(shot, 'actor', ac.name, 'along');
    if (al) { const P = S.pathAt(ac.path, valueAt(al, t, 0)); return [P.x, P.y, ac.turn ? P.angle : 0]; }
    return [valueAt(trackOf(shot, 'actor', ac.name, 'x'), t, ac.x), valueAt(trackOf(shot, 'actor', ac.name, 'y'), t, ac.y), 0];
  }

  // Estado de um ator no instante t do plano: lugar, tamanho, animação (com o quadro dela) e pose.
  function actorState(shot, ac, t) {
    const v = (prop, base) => valueAt(trackOf(shot, 'actor', ac.name, prop), t, base);
    const variant = v('variant', ac.variant);
    const model = ac.models.get(variant) || ac.model;
    let anim = ac.anim, start = 0, cur = -1;
    const at = trackOf(shot, 'actor', ac.name, 'anim');
    if (at) for (const k of at.keys) { if (k.t <= t + 1e-9) { anim = k.v; start = k.t; cur++; } else break; }
    const p = actorPos(shot, ac, t);
    const s = {
      ac, model, x: p[0], y: p[1], sx: v('sx', ac.sx), sy: v('sy', ac.sy), rot: v('rot', ac.rot) + p[2], opacity: v('opacity', ac.opacity),
      depth: Math.max(0.05, v('depth', ac.depth)), flip: v('flip', ac.flip), show: v('show', ac.show ? 1 : 0), anim: null, animFrame: 0, pose: null,
    };
    if (!model) return s;
    // phase: cada troca marcada começa onde a animação de antes estava na passada (em quadros, pode ser fracionário);
    // sem nenhum phase, nada disso roda (as outras trocas começam do quadro 0, como sempre)
    let offs = null;
    if (at && at.keys.some((k) => k.phase)) {
      offs = [];
      let A = ac.anim ? model.animMap.get(ac.anim) : null, aFrom = 0, aOff = 0;
      for (let i = 0; i <= cur; i++) {
        const k = at.keys[i], B = k.v ? model.animMap.get(k.v) : null;
        let o = 0;
        if (k.phase && A && B && A.loop && B.loop) o = S.phaseFrame(model, A, aOff + animSecs(shot, ac, model, A.name, aFrom, k.t) * A.fps, B);
        offs.push(o);
        A = B; aFrom = k.t; aOff = o;
      }
    }
    const offOf = (i) => (offs && i >= 0 ? offs[i] : 0);
    // a pose de uma animação tocando desde from, começando no quadro off (sem animação, a pose solta no relógio do filme)
    const plain = (name, from, off) => {
      const a = name ? model.animMap.get(name) : null;
      if (!a) return { anim: null, frame: 0, pose: S.timePose(model, t) };
      const local = animSecs(shot, ac, model, a.name, from, t);
      let f = Math.floor(local * a.fps + (off || 0) + 1e-6);
      // (com speed=auto de ré, uma animação que toca uma vez fica no primeiro quadro)
      f = a.loop ? ((f % a.frames) + a.frames) % a.frames : Math.max(0, Math.min(a.frames - 1, f));
      return { anim: a.name, frame: f, pose: S.makePose(model, a.name, f) };
    };
    // blend=: durante a mistura, a animação de antes continua tocando e vai virando a nova (a de antes pode
    // estar no meio de outra mistura)
    const mixed = (i, depth) => {
      const k = i >= 0 ? at.keys[i] : null, P = plain(k ? k.v : ac.anim, k ? k.t : 0, offOf(i));
      if (!k || !k.blend || t >= k.t + k.blend - 1e-9 || depth > 16) return P;
      const u = G.EASE[k.ease]((t - k.t) / k.blend), Q = mixed(i - 1, depth + 1), D = u < 0.5 ? Q : P;
      return { anim: D.anim, frame: D.frame, pose: S.blendPose(model, Q.pose, P.pose, u) };
    };
    const r = cur >= 0 && at.keys[cur].blend ? mixed(cur, 0) : plain(anim, start, offOf(cur));
    if (r.anim) { s.anim = r.anim; s.animFrame = r.frame; }
    s.pose = r.pose;
    // expressão (expr): muda aos poucos de um at para o seguinte, como a posição
    const et = trackOf(shot, 'actor', ac.name, 'expr');
    if (et || ac.expr) {
      let prev = { t: 0, v: ac.expr || null }, next = null;
      for (const k of et ? et.keys : []) { if (k.t <= t + 1e-9) prev = k; else { next = k; break; } }
      const ex = next ? { from: prev.v, to: next.v, u: G.EASE[next.ease]((t - prev.t) / Math.max(1e-9, next.t - prev.t)) } : { from: prev.v, to: prev.v, u: 1 };
      if (ex.from || ex.to) s.pose = S.exprPose(model, s.pose, ex);
    }
    return s;
  }
  function actorMatrix(s) {
    const o = s.ac.origin;
    return M.mul(M.translate(s.x, s.y), M.mul(M.rotate(s.rot), M.mul(M.scale(s.sx * s.flip[0], s.sy * s.flip[1]), M.translate(-o[0], -o[1]))));
  }

  // ---------- câmera ----------
  function hash(seed, i) {
    let h = 2166136261 ^ Math.imul(i | 0, 374761393);
    for (let k = 0; k < seed.length; k++) { h ^= seed.charCodeAt(k); h = Math.imul(h, 16777619); }
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1;
  }
  // ruído suave de -1 a 1 (a câmera na mão treme sem pular)
  function noise(seed, x) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    const a = hash(seed, i), b = hash(seed, i + 1);
    return a + (b - a) * u;
  }

  // valores da câmera sem a suavização (lag) e sem seguir ninguém
  function cameraRaw(shot, t) {
    const c = shot.cam, v = (prop, base) => valueAt(trackOf(shot, 'camera', 'camera', prop), t, base);
    return {
      x: v('x', c.x), y: v('y', c.y), zoom: Math.max(0.01, v('zoom', c.zoom)), rot: v('rot', c.rot), shake: Math.max(0, v('shake', c.shake)),
      follow: v('follow', c.follow), ox: v('ox', c.offset[0]), oy: v('oy', c.offset[1]), lag: v('lag', c.lag), fade: v('fade', c.fade), fadec: v('fadec', c.fadec),
      lens: Math.max(0.01, v('lens', c.lens || 1)), fog: v('fog', c.fog || null), haze: Math.max(1.05, v('haze', c.haze || 6)),
    };
  }
  // para onde a câmera quer olhar: o ator seguido (mais o offset) ou a posição dela
  function cameraTarget(entry, raw, t) {
    if (!raw.follow) return [raw.x, raw.y];
    const ac = entry.shot.actorMap.get(raw.follow);
    if (!ac) return [raw.x, raw.y];
    const p = actorPos(entry.shot, ac, t);
    const d = Math.max(0.05, valueAt(trackOf(entry.shot, 'actor', ac.name, 'depth'), t, ac.depth));
    const W2 = entry.owner.canvas.w / 2, H2 = entry.owner.canvas.h / 2;
    // um ator mais longe se mexe menos na tela: a câmera anda proporcionalmente
    return [W2 + d * (p[0] + raw.ox - W2), H2 + d * (p[1] + raw.oy - H2)];
  }
  const usesPath = (shot) => !!(shot.cam.follow || shot.cam.lag > 0 || trackOf(shot, 'camera', 'camera', 'follow') || trackOf(shot, 'camera', 'camera', 'lag'));
  // Com lag, a câmera vai atrás do alvo aos poucos; é simulada quadro a quadro desde o começo do plano.
  function cameraPath(entry, fps) {
    if (entry._cam) return entry._cam;
    const n = entry.frames, out = new Float64Array(n * 2), dt = 1 / fps;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      const t = i / fps, raw = cameraRaw(entry.shot, t), p = cameraTarget(entry, raw, t);
      if (i === 0 || !(raw.lag > 0)) { cx = p[0]; cy = p[1]; } else {
        const k = 1 - Math.exp(-dt / raw.lag);
        cx += (p[0] - cx) * k;
        cy += (p[1] - cy) * k;
      }
      out[2 * i] = cx;
      out[2 * i + 1] = cy;
    }
    entry._cam = out;
    return out;
  }
  function cameraAt(entry, local, fps) {
    const t = local / fps, raw = cameraRaw(entry.shot, t);
    let x = raw.x, y = raw.y;
    if (usesPath(entry.shot)) { const p = cameraPath(entry, fps); x = p[2 * local]; y = p[2 * local + 1]; }
    let sx = 0, sy = 0;
    if (raw.shake > 0) {
      const k = t * 9;
      sx = raw.shake * (0.7 * noise('cx', k) + 0.3 * noise('cx2', k * 2.7));
      sy = raw.shake * (0.7 * noise('cy', k) + 0.3 * noise('cy2', k * 2.7));
    }
    return { x, y, zoom: raw.zoom, rot: raw.rot, sx, sy, fade: Math.min(1, Math.max(0, raw.fade)), fadec: raw.fadec, follow: raw.follow, lens: raw.lens, fog: raw.fog, haze: raw.haze };
  }
  const STILL = { x: null, y: null, zoom: 1, rot: 0, sx: 0, sy: 0, fade: 0, lens: 1, fog: null };
  // mundo → quadro, para o que está na profundidade d (1 = plano da ação; 2 = duas vezes mais longe;
  // 0.5 = perto da câmera). Na câmera parada (centro do quadro, zoom 1) tudo fica como foi desenhado.
  // zoom= é a câmera que anda (o perto cresce mais que o longe); lens= é a lente (tudo cresce igual).
  function viewMatrix(cam, d, Wd, Hd) {
    const cx0 = Wd / 2, cy0 = Hd / 2;
    const zd = Math.pow(cam.zoom, 1 / d) * (cam.lens || 1);
    const ex = cx0 + ((cam.x === null ? cx0 : cam.x) - cx0) / d, ey = cy0 + ((cam.y === null ? cy0 : cam.y) - cy0) / d;
    return M.mul(M.translate(cx0 + cam.sx, cy0 + cam.sy), M.mul(M.rotate(-cam.rot), M.mul(M.scale(zd, zd), M.translate(-ex, -ey))));
  }

  // ---------- luz ----------
  // As luzes do filme (do arquivo do filme) iluminam os atores: passam para as coordenadas de cada ator.
  function actorLighting(stageLighting, s, mat) {
    const own = S.sceneLights(s.model, s.pose);
    if (s.ac.unlit || !stageLighting) return own;
    const inv = M.invert(mat), k = Math.sqrt(Math.abs(M.det(mat))) || 1;
    const lin = (x, y) => [inv[0] * x + inv[2] * y, inv[1] * x + inv[3] * y];
    const lights = own ? own.lights.slice() : [];
    for (const L of stageLighting.lights) {
      const o = Object.assign({}, L, { glow: 0, rim: (L.rim || 0) / k });
      if (L.type === 'dir') { const d = lin(L.dx, L.dy); o.dx = d[0]; o.dy = d[1]; } else {
        const p = M.apply(inv, L.x, L.y);
        o.x = p[0]; o.y = p[1]; o.radius = L.radius / k;
        if (L.type === 'spot') { const a = (L.aim * Math.PI) / 180, d = lin(Math.cos(a), Math.sin(a)); o.aim = (Math.atan2(d[1], d[0]) * 180) / Math.PI; }
      }
      lights.push(o);
    }
    const rimW = Math.max(0, ...lights.map((l) => l.rim || 0));
    return { amb: stageLighting.amb, lights, rim: rimW > 0 ? { c: null, w: rimW } : null };
  }

  // névoa da distância (camera fog=cor haze=n): nada no plano da ação (1) ou mais perto; metade na profundidade haze
  const fogAmount = (cam, d) => (cam.fog && d > 1 && d !== Infinity ? 1 - Math.pow(0.5, (d - 1) / (Math.max(1.05, cam.haze || 6) - 1)) : 0);

  // efeitos e visibilidade das camadas e luzes do filme que mudam com at
  const LAYER_BASE = { opacity: 1, show: 1, blur: 0, glow: 0, tint: 0, brightness: 1, saturate: 1, contrast: 1, hue: 0, yaw: 0, pitch: 0 };
  const SHAPE_3D = new Set(['yaw', 'pitch', 'z']);
  function stagePose(entry, t) {
    const owner = entry.owner, pose = S.timePose(owner, t);
    let lp = null, li = null, pm = null;
    for (const tr of entry.shot.tracks.values()) {
      if (tr.kind === 'shape') {
        for (const el of owner.named.get(tr.name) || []) {
          // com hidden, a forma começa escondida e at forma.show=1 mostra (como um ator com hidden)
          const hid = tr.prop === 'show' && el.hidden;
          const v = valueAt(tr, t, SHAPE_3D.has(tr.prop) ? el[tr.prop] || 0 : hid ? 0 : 1);
          const o = (pm || (pm = new Map())).get(el.id) || {};
          o[tr.prop] = v;
          if (hid && v) o.reveal = 1;
          pm.set(el.id, o);
        }
        continue;
      }
      if (tr.kind !== 'light' && tr.kind !== 'layer') continue;
      let base;
      if (tr.kind === 'light') base = owner.lights.get(tr.name)[tr.prop];
      else { const Ly = owner.layerMap.get(tr.name); base = tr.prop === 'show' && Ly.hidden ? 0 : Ly.fx && Ly.fx[tr.prop] !== undefined ? Ly.fx[tr.prop] : Ly[tr.prop] !== undefined && (tr.prop === 'yaw' || tr.prop === 'pitch') ? Ly[tr.prop] : LAYER_BASE[tr.prop]; }
      const map = tr.kind === 'light' ? (li || (li = new Map())) : (lp || (lp = new Map()));
      const o = map.get(tr.name) || {};
      o[tr.prop] = valueAt(tr, t, base);
      map.set(tr.name, o);
    }
    if (lp) pose.lprops = lp;
    if (li) pose.liprops = li;
    if (pm) pose.props = pm;
    return pose;
  }

  // ---------- o quadro ----------
  // Tudo o que entra no quadro f: plano, câmera e cada ator (o "palco" é o próprio arquivo do filme).
  function frameState(model, frame, opts) {
    opts = opts || {};
    const loc = locate(model, frame);
    if (!loc) return null;
    const { entry, local, t } = loc;
    const owner = entry.owner, shot = entry.shot, fps = timeline(model).fps;
    const cam = opts.view === 'world' ? Object.assign({}, STILL) : cameraAt(entry, local, fps);
    const spose = stagePose(entry, t);
    const who = [{ stage: true, ac: { name: '', depth: 1, screen: false, front: false, unlit: false }, model: owner, pose: spose, mat: M.id(), depth: 1, opacity: 1, show: 1, order: -1 }];
    const T = loc.frame / fps;
    for (const ac of [...owner.film.actors, ...shot.actors]) {
      const s = actorState(shot, ac, t);
      s.order = ac.order;
      s.mat = actorMatrix(s);
      const lip = lipAt(model, entry, ac.name, T);
      if (lip) applyLips(s, lip);
      who.push(s);
    }
    // morph=: durante a troca, os dois atores dão lugar a um só, que vai de um ao outro (a profundidade, a
    // transparência e, na metade, a ordem e o estilo de arte do segundo)
    for (const mo of shot.morphs || []) {
      if (mo.skip || t < mo.t - 1e-9 || t >= mo.t + mo.dur - 1e-9) continue;
      const ia = who.findIndex((w) => !w.stage && !w.morph && w.ac.name === mo.from), ib = who.findIndex((w) => !w.stage && !w.morph && w.ac.name === mo.to);
      if (ia < 0 || ib < 0) continue;
      const A = who[ia], B = who[ib];
      if (!A.model || !A.pose || !B.model || !B.pose) continue;
      const u = G.EASE[mo.ease](Math.min(1, Math.max(0, (t - mo.t) / mo.dur))), lerp = (a, b) => a + (b - a) * u;
      const w = Object.assign({}, u < 0.5 ? A : B, { morph: { A, B, u, plan: morphPlanOf(shot, mo, A, B) }, depth: lerp(A.depth, B.depth), opacity: lerp(A.opacity, B.opacity), show: 1 });
      who.splice(Math.max(ia, ib), 1);
      who.splice(Math.min(ia, ib), 1, w);
    }
    return { loc, entry, owner, shot, t, cam, who, W: owner.canvas.w, H: owner.canvas.h, fit: entry.fit };
  }
  // O casamento das partes de uma metamorfose: feito uma vez, com os dois atores como estão no começo da troca (se um
  // deles trocar de variante no meio, com o desenho de agora)
  function morphPlanOf(shot, mo, A, B) {
    const c = mo._plan;
    if (c && c.a === A.model && c.b === B.model) return c.plan;
    const start = (w) => { const s = actorState(shot, w.ac, mo.t); return s.model === w.model && s.pose ? Object.assign(s, { mat: actorMatrix(s) }) : w; };
    const side = (s) => ({ model: s.model, pose: s.pose, mat: s.mat, hide: s.ac.hide });
    const plan = S.morphPlan(side(start(A)), side(start(B)), mo.spec);
    mo._plan = { a: A.model, b: B.model, plan };
    return plan;
  }
  // o casamento de uma metamorfose do plano, com os dois atores no começo dela (null sem os desenhos)
  function morphPlan(shot, mo) {
    const st = (n) => {
      const ac = shot.actorMap && shot.actorMap.get(n), s = ac && actorState(shot, ac, mo.t);
      return s && s.model && s.pose ? Object.assign(s, { mat: actorMatrix(s) }) : null;
    };
    const A = st(mo.from), B = st(mo.to);
    return A && B ? morphPlanOf(shot, mo, A, B) : null;
  }

  // Camadas de todos os atores ordenadas por profundidade (longe primeiro), juntando as vizinhas do mesmo ator.
  function plates(fs, opts) {
    const list = [];
    for (const w of fs.who) {
      if (!w.model || !w.show || w.opacity <= 0.001) continue;
      // a metamorfose: as partes dos dois atores juntas, na profundidade do meio da troca
      if (w.morph) { const sc = !!w.ac.screen; list.push({ w, kind: 'morph', d: sc ? Infinity : w.depth, screen: sc, front: !!w.ac.front, li: 0 }); continue; }
      const vis = { guides: !!(w.stage && opts.guides) };
      const screen0 = !!w.ac.screen;
      if (w.ac.bg && w.model.canvas.bg) list.push({ w, kind: 'bg', d: screen0 ? Infinity : w.depth, screen: screen0, front: !!w.ac.front, li: -1 });
      S.orderLayers(w.model, w.pose).forEach((layer, li) => {
        if (!layer.items.length && !layer.cast) return;
        if (w.ac.hide && w.ac.hide.has(layer.name)) return;
        // no arquivo do filme, only= também aceita nomes de shot (títulos, letreiros); uma camada com hidden
        // que tem at camada.show=… começa escondida e o at decide quando aparece
        const lp = w.stage && layer.hidden ? w.pose.lprops.get(layer.name) : null;
        const Ly = lp && lp.show !== undefined ? Object.assign({}, layer, { hidden: false }) : layer;
        const ok = w.stage && Ly.only ? !Ly.hidden && (!Ly.guide || vis.guides) && Ly.only.includes(fs.shot.name) : S.layerVisible(Ly, w.pose, vis);
        if (!ok) return;
        const screen = screen0 || !!layer.screen;
        list.push({ w, layer, d: screen ? Infinity : w.depth * (layer.depth || 1), screen, front: !!(layer.front || w.ac.front), li });
      });
      // halos das lâmpadas do filme: no plano da ação, por cima do que está nele
      if (w.stage) list.push({ w, kind: 'glow', d: 1, screen: false, front: true, li: 1e9 });
    }
    list.sort((a, b) => (a.screen - b.screen) || (b.d - a.d) || (a.front - b.front) || (a.w.order - b.w.order) || (a.li - b.li));
    const groups = [];
    for (const p of list) {
      const g = groups[groups.length - 1];
      if (g && g.w === p.w && g.d === p.d && g.screen === p.screen && p.kind !== 'glow' && !g.glows) { if (p.layer) g.layers.add(p.layer); else g.bg = true; continue; }
      groups.push({ w: p.w, d: p.d, screen: p.screen, layers: new Set(p.layer ? [p.layer] : []), bg: p.kind === 'bg', glows: p.kind === 'glow', morph: p.kind === 'morph' });
    }
    // halos das luzes de cada ator: junto com a última camada dele
    const seen = new Set();
    for (let i = groups.length - 1; i >= 0; i--) if (!groups[i].w.stage && !seen.has(groups[i].w)) { seen.add(groups[i].w); groups[i].glows = true; }
    return groups;
  }

  const matOf = (ctx) => { const t = ctx.getTransform(); return [t.a, t.b, t.c, t.d, t.e, t.f]; };
  const setMat = (ctx, m) => ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  let alphaCanvas = null;
  // a tela da transparência e da névoa de um ator: só do tamanho a (o pedaço da tela parent onde ele pinta)
  function alphaLayer(a, parent) {
    if (!alphaCanvas) alphaCanvas = document.createElement('canvas');
    if (alphaCanvas.width !== a.w || alphaCanvas.height !== a.h) { alphaCanvas.width = a.w; alphaCanvas.height = a.h; }
    S.placeCanvas(alphaCanvas, parent, a.x, a.y);
    const x = alphaCanvas.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, a.w, a.h);
    return x;
  }

  // ---------- transições entre planos (shot … in=) ----------
  // Nos primeiros quadros do plano, o último quadro do plano anterior (parado) sai enquanto este entra.
  // O primeiro plano do filme entra a partir do preto.
  function transitionAt(model, frame) {
    const loc = locate(model, frame);
    const tr = loc && loc.entry.shot.trans;
    if (!tr) return null;
    const n = Math.max(1, Math.round(tr.dur * timeline(model).fps));
    if (loc.local >= n) return null;
    return { type: tr.type, p: G.EASE.smooth((loc.local + 1) / (n + 1)), from: loc.entry.index > 0 ? loc.entry.start - 1 : null };
  }
  const transPool = [null, null];
  function transLayer(i, w, h) {
    if (!transPool[i]) transPool[i] = document.createElement('canvas');
    const c = transPool[i];
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, w, h);
    return x;
  }
  // Junta o plano que sai (A) e o que entra (B), imagens do tamanho do ctx; base = quadro do filme → tela.
  function composeTransition(ctx, tr, A, B, base, Wd, Hd, transparent) {
    const p = tr.p;
    const put = (img, alpha, m) => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (m) ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    };
    const o = M.apply(base, 0, 0), e = M.apply(base, Wd, 0), c = M.apply(base, Wd / 2, Hd / 2);
    const ux = e[0] - o[0], uy = e[1] - o[1]; // a largura do quadro, em pixels da tela
    ctx.save();
    setMat(ctx, base);
    ctx.beginPath();
    ctx.rect(0, 0, Wd, Hd);
    ctx.clip();
    if (tr.type === 'fade') { put(A, 1); put(B, p); } else if (tr.type === 'wipe') {
      // cortina: o plano novo entra da esquerda para a direita
      put(A, 1);
      setMat(ctx, base);
      ctx.beginPath();
      ctx.rect(0, 0, Wd * p, Hd);
      ctx.clip();
      put(B, 1);
    } else if (tr.type === 'slide') {
      // o plano novo empurra o anterior para a esquerda
      put(A, 1, [1, 0, 0, 1, -ux * p, -uy * p]);
      put(B, 1, [1, 0, 0, 1, ux * (1 - p), uy * (1 - p)]);
    } else if (tr.type === 'zoom') {
      // o plano anterior cresce e some, mostrando o novo
      const k = 1 + 0.6 * p;
      put(B, 1);
      put(A, 1 - p, [k, 0, 0, k, c[0] - k * c[0], c[1] - k * c[1]]);
    } else {
      // íris: um círculo fecha sobre o plano anterior e abre sobre o novo, com preto em volta
      const closing = p < 0.5, q = closing ? 1 - p * 2 : p * 2 - 1;
      if (!transparent) { setMat(ctx, base); ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, Wd, Hd); }
      setMat(ctx, base);
      ctx.beginPath();
      ctx.arc(Wd / 2, Hd / 2, Math.max(0.01, (q * Math.hypot(Wd, Hd)) / 2), 0, Math.PI * 2);
      ctx.clip();
      put(closing ? A : B, 1);
    }
    ctx.restore();
  }

  // Desenha o quadro no ctx, com a transformação atual valendo como "quadro do filme → tela".
  // opts.view: 'camera' (padrão) ou 'world' (como foi desenhado, sem a câmera); opts.transparent; opts.guides.
  function drawFrame(ctx, model, frame, opts) {
    opts = opts || {};
    const tr = opts.view === 'world' || opts.still ? null : transitionAt(model, frame);
    if (!tr) return drawShot(ctx, model, frame, opts);
    const w = ctx.canvas.width, h = ctx.canvas.height, base = matOf(ctx), Wd = model.canvas.w, Hd = model.canvas.h;
    const inner = Object.assign({}, opts, { subs: false, still: true });
    const xa = transLayer(0, w, h), xb = transLayer(1, w, h);
    setMat(xa, base);
    if (tr.from !== null) drawShot(xa, model, tr.from, inner);
    else if (!opts.transparent) { xa.fillStyle = '#000000'; xa.fillRect(0, 0, Wd, Hd); }
    setMat(xb, base);
    const fs = drawShot(xb, model, frame, inner);
    composeTransition(ctx, tr, xa.canvas, xb.canvas, base, Wd, Hd, opts.transparent);
    if (opts.subs && fs) { ctx.save(); setMat(ctx, base); drawSubs(ctx, model, fs.loc.frame, opts.lang); ctx.restore(); }
    return fs;
  }

  // ---------- estilos de arte (art) ----------
  // O estilo de quem aparece no quadro: o mais específico ganha (ator, plano, cena, filme). O art do arquivo
  // do próprio personagem não vale no filme. null = sem estilo.
  function artFor(entry, w) {
    const chain = entry.chain || [entry.owner];
    const name = w.stage ? null : w.ac.name;
    let a;
    if (name) {
      a = entry.shot.artActors && entry.shot.artActors.get(name);
      for (let i = chain.length - 1; a === undefined && i >= 0; i--) a = chain[i].film.artActors && chain[i].film.artActors.get(name);
    }
    if (a === undefined) a = entry.shot.art;
    for (let i = chain.length - 1; a === undefined && i >= 0; i--) a = chain[i].film.art;
    return a && a.style !== 'none' ? a : null;
  }
  // As camadas em trechos seguidos com o mesmo estilo, na ordem de profundidade. null = nenhum estilo no quadro.
  function artRuns(fs, groups) {
    const of = new Map(fs.who.map((w) => [w, artFor(fs.entry, w)]));
    if (![...of.values()].some(Boolean)) return null;
    const runs = [];
    for (const g of groups) {
      const a = of.get(g.w), k = a ? a.key : '';
      const r = runs[runs.length - 1];
      if (r && r.k === k) r.groups.push(g); else runs.push({ k, art: a, groups: [g] });
    }
    if (!runs.length) runs.push({ k: '', art: null, groups: [] });
    return runs;
  }

  // o fundo do quadro: o do filme e, numa cena encaixada, o da cena
  function paintBg(ctx, model, fs, base) {
    if (model.canvas.bg) { setMat(ctx, base); S.fillBg(ctx, model, fs.who[0].pose, { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h }); }
    if (fs.owner !== model && fs.owner.canvas.bg) { setMat(ctx, fs.fit ? M.mul(base, fs.fit) : base); S.fillBg(ctx, fs.owner, fs.who[0].pose, { x: 0, y: 0, w: fs.W, h: fs.H }); }
  }
  // As camadas (groups) do quadro, com a câmera, a névoa e a transparência de cada ator. bg: com o fundo;
  // fade: com o escurecer da câmera por cima.
  function paintPlates(ctx, model, fs, base, groups, opts, bg, fade) {
    const top = fs.fit ? M.mul(base, fs.fit) : base;
    ctx.save();
    if (bg && !opts.transparent) paintBg(ctx, model, fs, base);
    if (fs.fit) { setMat(ctx, top); ctx.beginPath(); ctx.rect(0, 0, fs.W, fs.H); ctx.clip(); }
    const views = new Map();
    for (const g of groups) {
      const w = g.w;
      let v = views.get(g.d);
      if (!v) { v = g.screen ? M.id() : viewMatrix(fs.cam, g.d, fs.W, fs.H); views.set(g.d, v); }
      const m = M.mul(top, M.mul(v, w.mat));
      const fog = g.screen ? 0 : fogAmount(fs.cam, g.d);
      // passe de textura dos estilos de arte: sem névoa, sem transparência e sem o fundo do ator
      const tex = !!(opts.artPass && opts.artPass.tex);
      const faded = !tex && (w.opacity < 0.999 || fog > 0.002);
      const lighting = w.stage ? fs.stageLighting : w.lighting;
      // a tela da transparência só do tamanho do que o ator pinta (S.plateBox; null = o quadro inteiro): no canvas da
      // linha de comando, pôr uma tela em outra custa o tamanho dela. A metamorfose, o fundo do ator, as guias e os
      // passes dos estilos de arte ficam com o quadro inteiro.
      let area = null;
      if (faded) {
        const box = g.morph || g.bg || opts.artPass || (w.stage && opts.guides) ? null : S.plateBox(w.model, w.pose, g.layers, m, g.glows ? lighting : null);
        area = S.boxArea(box, ctx.canvas.width, ctx.canvas.height);
        if (!area) continue; // nada do ator cai dentro do quadro
      }
      const x = faded ? alphaLayer(area, ctx.canvas) : ctx;
      if (!faded) ctx.save();
      if (g.morph) {
        const { A, B, u, plan } = w.morph;
        const side = (s) => ({ model: s.model, pose: s.pose, lighting: s.lighting, m: M.mul(top, M.mul(s.ac.screen ? M.id() : viewMatrix(fs.cam, s.depth, fs.W, fs.H), s.mat)) });
        S.drawMorph(x, side(A), side(B), u, plan, { glows: g.glows, pass: opts.artPass, film: opts.film });
      }
      setMat(x, faded ? [m[0], m[1], m[2], m[3], m[4] - area.x, m[5] - area.y] : m);
      if (g.bg && !tex) S.fillBg(x, w.model, w.pose, { x: 0, y: 0, w: w.model.canvas.w, h: w.model.canvas.h });
      // os mapas de luz pintados só na caixa do que as camadas com luz pintam (S.plateBox; null = o quadro inteiro)
      const lightBox = lighting && opts.film && !opts.artPass && !g.morph ? S.plateBox(w.model, w.pose, [...g.layers].filter((L) => !L.unlit && !L.guide), m, null) : null;
      if (!g.morph && (g.layers.size || g.glows)) S.drawScene(x, w.model, w.pose, { background: false, layers: g.layers, lighting, glows: g.glows, guides: !!(w.stage && opts.guides), pass: opts.artPass, film: opts.film, lightBox });
      if (faded) {
        if (fog > 0.002) {
          // a névoa pinta por cima só onde já tem desenho
          x.setTransform(1, 0, 0, 1, 0, 0);
          x.globalAlpha = Math.min(1, fog);
          x.globalCompositeOperation = 'source-atop';
          x.fillStyle = fs.cam.fog;
          x.fillRect(0, 0, area.w, area.h);
        }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = w.opacity;
        ctx.drawImage(alphaCanvas, area.x, area.y);
        ctx.restore();
      } else ctx.restore();
    }
    if (fade && fs.cam.fade > 0.001) {
      setMat(ctx, top);
      ctx.globalAlpha = fs.cam.fade;
      ctx.fillStyle = fs.cam.fadec || '#000000';
      ctx.fillRect(0, 0, fs.W, fs.H);
    }
    ctx.restore();
  }

  // Um quadro sem transição: o plano daquele quadro, com câmera, atores e legendas.
  // opts.art: com os estilos de arte. Cada trecho de camadas com o mesmo estilo vai numa imagem de trabalho,
  // na grade presa ao quadro do filme; o escurecer da câmera e as legendas vêm por cima, sem estilo.
  function drawShot(ctx, model, frame, opts) {
    const fs = frameState(model, frame, opts);
    if (!fs) return null;
    // film: o que o desenho guarda durante o quadro (os mapas de luz) e o jeito mais rápido do filme (S.drawScene)
    opts = Object.assign({}, opts, { film: S.filmFrame() });
    const base = matOf(ctx);
    fs.stageLighting = S.sceneLights(fs.owner, fs.who[0].pose);
    for (const w of fs.who) {
      if (!w.stage && w.model && w.pose) w.lighting = actorLighting(fs.stageLighting, w, w.mat);
      if (w.morph) for (const s of [w.morph.A, w.morph.B]) s.lighting = actorLighting(fs.stageLighting, s, s.mat);
    }
    const groups = plates(fs, opts);
    const runs = opts.art && W.art ? artRuns(fs, groups) : null;
    if (!runs) paintPlates(ctx, model, fs, base, groups, opts, true, true);
    else {
      const frameRect = { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h };
      runs.forEach((run, i) => {
        const first = i === 0 && !opts.transparent;
        if (!run.art) { paintPlates(ctx, model, fs, base, run.groups, opts, first, false); return; }
        const models = [model, ...(fs.entry.chain || []), ...run.groups.flatMap((g) => (g.w.morph ? [g.w.morph.A.model, g.w.morph.B.model] : [g.w.model]))];
        const r = W.art.paint(ctx, base, frameRect, run.art, {
          content: (x, m, pass) => paintPlates(x, model, fs, m, run.groups, pass ? Object.assign({}, opts, { artPass: pass }) : opts, false, false),
          bg: first ? (x, m) => paintBg(x, model, fs, m) : null,
        }, { colors: () => W.art.colorsOf(models), ink: [...new Set(models.filter(Boolean).map((x) => x.palette.get('ink')))], paper: W.art.paperOf(fs.owner !== model && fs.owner.canvas.bg ? fs.owner : model), lit: !!(fs.stageLighting || fs.who.some((w) => w.lighting)), frame });
        if (r.text && runs.length === 1) fs.artText = r.text;
      });
      if (fs.cam.fade > 0.001) {
        ctx.save();
        setMat(ctx, fs.fit ? M.mul(base, fs.fit) : base);
        ctx.globalAlpha = fs.cam.fade;
        ctx.fillStyle = fs.cam.fadec || '#000000';
        ctx.fillRect(0, 0, fs.W, fs.H);
        ctx.restore();
      }
    }
    if (opts.subs) { ctx.save(); setMat(ctx, base); drawSubs(ctx, model, fs.loc.frame, opts.lang); ctx.restore(); }
    return fs;
  }

  // Quadro pronto numa imagem (escala, acabamentos do filme, pixelado).
  function renderFrame(model, frame, opts) {
    opts = opts || {};
    const scale = opts.scale || 1;
    const W2 = Math.max(1, Math.round(model.canvas.w * scale)), H2 = Math.max(1, Math.round(model.canvas.h * scale));
    const out = document.createElement('canvas');
    out.width = W2;
    out.height = H2;
    const octx = out.getContext('2d');
    // acabamento (bloom, vinheta, granulado…): o do arquivo principal; sem ele, o da cena daquele quadro
    const loc = locate(model, frame);
    const post = S.hasPost(model) || !loc ? model : loc.entry.owner;
    // estilos de arte (art): ligados, a não ser com opts.art === false; com eles, o finish pixel= fica de fora
    const art = opts.art !== false && !!W.art && W.art.has(model) && opts.view !== 'world';
    const px = art ? 1 : model.finish.pixel || 1;
    const o = { transparent: opts.transparent, view: opts.view, guides: opts.guides, subs: opts.subs, lang: opts.lang, art };
    if (px > 1) {
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.round(W2 / px));
      small.height = Math.max(1, Math.round(H2 / px));
      const sx = small.getContext('2d');
      sx.setTransform(scale / px, 0, 0, scale / px, 0, 0);
      drawFrame(sx, model, frame, o);
      if (!opts.noPost) S.postFx(small, post, frame, { screen: false, film: true });
      octx.imageSmoothingEnabled = false;
      octx.drawImage(small, 0, 0, W2, H2);
      if (!opts.noPost) S.postFx(out, post, frame, { base: false });
    } else {
      octx.setTransform(scale, 0, 0, scale, 0, 0);
      const fs = drawFrame(octx, model, frame, o);
      octx.setTransform(1, 0, 0, 1, 0, 0);
      if (!opts.noPost) S.postFx(out, post, frame, { film: true });
      if (fs && fs.artText) out.artText = fs.artText;
    }
    return out;
  }

  // Os 4 cantos do que a câmera vê, no plano da ação (profundidade 1) — para desenhar a moldura na vista do mundo.
  function cameraQuad(model, frame) {
    const loc = locate(model, frame);
    if (!loc) return null;
    const { entry, local } = loc;
    const cam = cameraAt(entry, local, timeline(model).fps), Wd = entry.owner.canvas.w, Hd = entry.owner.canvas.h;
    const inv = M.invert(viewMatrix(cam, 1, Wd, Hd));
    const q = [[0, 0], [Wd, 0], [Wd, Hd], [0, Hd]].map((p) => M.apply(inv, p[0], p[1]));
    return entry.fit ? q.map((p) => M.apply(entry.fit, p[0], p[1])) : q;
  }

  // mundo → quadro do filme para a profundidade d no quadro f (as alças do editor usam isto)
  function viewAt(model, frame, d, view) {
    const loc = locate(model, frame);
    if (!loc) return M.id();
    const { entry, local } = loc;
    let v = view === 'world' || d === Infinity ? M.id() : viewMatrix(cameraAt(entry, local, timeline(model).fps), d, entry.owner.canvas.w, entry.owner.canvas.h);
    if (entry.fit) v = M.mul(entry.fit, v);
    return v;
  }

  // quadro do filme em que começa o at (ou o shot) de uma linha do arquivo principal
  function frameOfShot(model, shot, t) {
    const tl = timeline(model);
    const e = tl.entries.find((x) => x.shot === shot && x.owner === model);
    if (!e) return null;
    return e.start + Math.min(e.frames - 1, Math.round((t || 0) * tl.fps));
  }

  W.film = { timeline, locate, timecode, frameState, morphPlan, autoReport, AUTO_MAX, transitionAt, composeTransition, drawFrame, renderFrame, cameraQuad, viewAt, frameOfShot, actorState, valueAt, subtitles, langs, audioClips, lipAt, cuesOf };
})(window.Weasel = window.Weasel || {});
