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
    const fps = model.film.fps, entries = [], audios = [], subs = [];
    const lang = model.film.lang;
    let start = 0;
    // um som no tempo: começa em base + at e dura dur=, o resto do arquivo, ou (loop, ou duração
    // desconhecida) até o fim do bloco (o shot, ou a cena inteira para sons fora de shot)
    const clip = (a, owner, base, blockEnd) => {
      const t0 = base + a.at;
      const fileDur = a.media && a.media.duration ? Math.max(0, a.media.duration - a.from) : null;
      let dur = a.dur !== null ? a.dur : !a.loop && fileDur !== null ? fileDur : blockEnd - t0;
      if (a.dur === null && fileDur === null && a.cues && a.cues.length && !a.loop) dur = a.cues[a.cues.length - 1].end - a.from;
      const c = { a, owner, start: t0, end: t0 + Math.max(0, dur), fileDur };
      audios.push(c);
      if (a.text) subs.push({ start: c.start, end: c.end, text: a.text, lang: a.lang || owner.film.lang || lang, src: a });
    };
    const sub = (s, owner, base) => subs.push({ start: base + s.t, end: base + s.t + s.dur, text: s.text, lang: s.lang || owner.film.lang || lang, src: s });
    const walk = (owner, prefix, fit, depth) => {
      const first = start;
      for (const s of owner.film.seq) {
        if (s.kind === 'shot') {
          const frames = Math.max(1, Math.round(s.shot.dur * fps));
          // o plano sem nome de uma cena (arquivo sem shot) leva só o nome do arquivo
          const name = s.shot.implicit && prefix ? prefix.slice(0, -1) : prefix + s.shot.name;
          entries.push({ owner, shot: s.shot, name, start, frames, fit, index: entries.length });
          for (const a of s.shot.audios) clip(a, owner, start / fps, (start + frames) / fps);
          for (const sb of s.shot.subs) sub(sb, owner, start / fps);
          start += frames;
        } else if (depth < 8) walk(s.model, prefix + s.file.replace(/\.[^.]+$/, '') + '/', fitOf(owner, s.model, fit), depth + 1);
      }
      for (const a of owner.film.audios) clip(a, owner, first / fps, start / fps);
      for (const sb of owner.film.subs) sub(sb, owner, first / fps);
    };
    walk(model, '', null, 0);
    subs.sort((p, q) => p.start - q.start || p.end - q.end);
    model._timeline = { fps, entries, frames: start, duration: start / fps, audios, subs };
    return model._timeline;
  }

  // ---------- lip sync ----------
  // Quando a boca não existe no personagem, a próxima da lista (a última opção é a boca parada).
  const LIP_CHAIN = { A: ['A', 'X'], B: ['B', 'C', 'A'], C: ['C', 'B', 'D'], D: ['D', 'C', 'B'], E: ['E', 'C', 'B'], F: ['F', 'A', 'B'], G: ['G', 'B', 'A'], H: ['H', 'C', 'B'], X: ['X'] };
  // as bocas de um som: do Rhubarb (cues=) ou calculadas do .wav (uma vez só)
  function cuesOf(a) {
    if (a.cues) return a.cues;
    if (a._auto === undefined) a._auto = a.media && a.media.mono ? W.audio.lipCues(a.media.mono, a.media.sampleRate) : null;
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
  // tempo da animação de a até b, com a velocidade (speed) que muda por at
  function integrate(tr, base, a, b) {
    if (!(b > a)) return 0;
    if (!tr || !tr.keys.length) return (b - a) * base;
    let total = 0, cur = base, from = a;
    for (const k of tr.keys) {
      if (k.t <= a) { cur = k.v; continue; }
      if (k.t >= b) break;
      total += (k.t - from) * cur;
      from = k.t;
      cur = k.v;
    }
    return total + (b - from) * cur;
  }

  function actorPos(shot, ac, t) {
    return [valueAt(trackOf(shot, 'actor', ac.name, 'x'), t, ac.x), valueAt(trackOf(shot, 'actor', ac.name, 'y'), t, ac.y)];
  }

  // Estado de um ator no instante t do plano: lugar, tamanho, animação (com o quadro dela) e pose.
  function actorState(shot, ac, t) {
    const v = (prop, base) => valueAt(trackOf(shot, 'actor', ac.name, prop), t, base);
    const variant = v('variant', ac.variant);
    const model = ac.models.get(variant) || ac.model;
    let anim = ac.anim, start = 0;
    const at = trackOf(shot, 'actor', ac.name, 'anim');
    if (at) for (const k of at.keys) { if (k.t <= t + 1e-9) { anim = k.v; start = k.t; } else break; }
    const p = actorPos(shot, ac, t);
    const s = {
      ac, model, x: p[0], y: p[1], sx: v('sx', ac.sx), sy: v('sy', ac.sy), rot: v('rot', ac.rot), opacity: v('opacity', ac.opacity),
      depth: Math.max(0.05, v('depth', ac.depth)), flip: v('flip', ac.flip), show: v('show', ac.show ? 1 : 0), anim: null, animFrame: 0, pose: null,
    };
    if (!model) return s;
    const a = anim ? model.animMap.get(anim) : null;
    if (a) {
      const local = integrate(trackOf(shot, 'actor', ac.name, 'speed'), ac.speed, start, t);
      let f = Math.floor(local * a.fps + 1e-6);
      f = a.loop ? ((f % a.frames) + a.frames) % a.frames : Math.min(a.frames - 1, f);
      s.anim = a.name;
      s.animFrame = f;
      s.pose = S.makePose(model, a.name, f);
    } else s.pose = S.timePose(model, t);
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
    return { x, y, zoom: raw.zoom, rot: raw.rot, sx, sy, fade: Math.min(1, Math.max(0, raw.fade)), fadec: raw.fadec, follow: raw.follow };
  }
  const STILL = { x: null, y: null, zoom: 1, rot: 0, sx: 0, sy: 0, fade: 0 };
  // mundo → quadro, para o que está na profundidade d (1 = plano da ação; 2 = duas vezes mais longe;
  // 0.5 = perto da câmera). Na câmera parada (centro do quadro, zoom 1) tudo fica como foi desenhado.
  function viewMatrix(cam, d, Wd, Hd) {
    const cx0 = Wd / 2, cy0 = Hd / 2;
    const zd = Math.pow(cam.zoom, 1 / d);
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

  // efeitos e visibilidade das camadas e luzes do filme que mudam com at
  const LAYER_BASE = { opacity: 1, show: 1, blur: 0, glow: 0, tint: 0, brightness: 1, saturate: 1, contrast: 1, hue: 0 };
  function stagePose(entry, t) {
    const owner = entry.owner, pose = S.timePose(owner, t);
    let lp = null, li = null;
    for (const tr of entry.shot.tracks.values()) {
      if (tr.kind !== 'light' && tr.kind !== 'layer') continue;
      let base;
      if (tr.kind === 'light') base = owner.lights.get(tr.name)[tr.prop];
      else { const Ly = owner.layerMap.get(tr.name); base = Ly.fx && Ly.fx[tr.prop] !== undefined ? Ly.fx[tr.prop] : LAYER_BASE[tr.prop]; }
      const map = tr.kind === 'light' ? (li || (li = new Map())) : (lp || (lp = new Map()));
      const o = map.get(tr.name) || {};
      o[tr.prop] = valueAt(tr, t, base);
      map.set(tr.name, o);
    }
    if (lp) pose.lprops = lp;
    if (li) pose.liprops = li;
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
    return { loc, entry, owner, shot, t, cam, who, W: owner.canvas.w, H: owner.canvas.h, fit: entry.fit };
  }

  // Camadas de todos os atores ordenadas por profundidade (longe primeiro), juntando as vizinhas do mesmo ator.
  function plates(fs, opts) {
    const list = [];
    for (const w of fs.who) {
      if (!w.model || !w.show || w.opacity <= 0.001) continue;
      const vis = { guides: !!(w.stage && opts.guides) };
      const screen0 = !!w.ac.screen;
      if (w.ac.bg && w.model.canvas.bg) list.push({ w, kind: 'bg', d: screen0 ? Infinity : w.depth, screen: screen0, front: !!w.ac.front, li: -1 });
      w.model.layers.forEach((layer, li) => {
        if (!layer.items.length && !layer.cast) return;
        if (w.ac.hide && w.ac.hide.has(layer.name)) return;
        // no arquivo do filme, only= também aceita nomes de shot (títulos, letreiros)
        const ok = w.stage && layer.only ? !layer.hidden && (!layer.guide || vis.guides) && layer.only.includes(fs.shot.name) : S.layerVisible(layer, w.pose, vis);
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
      groups.push({ w: p.w, d: p.d, screen: p.screen, layers: new Set(p.layer ? [p.layer] : []), bg: p.kind === 'bg', glows: p.kind === 'glow' });
    }
    // halos das luzes de cada ator: junto com a última camada dele
    const seen = new Set();
    for (let i = groups.length - 1; i >= 0; i--) if (!groups[i].w.stage && !seen.has(groups[i].w)) { seen.add(groups[i].w); groups[i].glows = true; }
    return groups;
  }

  const matOf = (ctx) => { const t = ctx.getTransform(); return [t.a, t.b, t.c, t.d, t.e, t.f]; };
  const setMat = (ctx, m) => ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  let alphaCanvas = null;
  function alphaLayer(w, h) {
    if (!alphaCanvas) alphaCanvas = document.createElement('canvas');
    if (alphaCanvas.width !== w || alphaCanvas.height !== h) { alphaCanvas.width = w; alphaCanvas.height = h; }
    const x = alphaCanvas.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, w, h);
    return x;
  }

  // Desenha o quadro no ctx, com a transformação atual valendo como "quadro do filme → tela".
  // opts.view: 'camera' (padrão) ou 'world' (como foi desenhado, sem a câmera); opts.transparent; opts.guides.
  function drawFrame(ctx, model, frame, opts) {
    opts = opts || {};
    const fs = frameState(model, frame, opts);
    if (!fs) return null;
    const base = matOf(ctx);
    const top = fs.fit ? M.mul(base, fs.fit) : base;
    ctx.save();
    if (!opts.transparent) {
      setMat(ctx, base);
      if (model.canvas.bg) S.fillBg(ctx, model, fs.who[0].pose, { x: 0, y: 0, w: model.canvas.w, h: model.canvas.h });
      if (fs.owner !== model && fs.owner.canvas.bg) { setMat(ctx, top); S.fillBg(ctx, fs.owner, fs.who[0].pose, { x: 0, y: 0, w: fs.W, h: fs.H }); }
    }
    if (fs.fit) { setMat(ctx, top); ctx.beginPath(); ctx.rect(0, 0, fs.W, fs.H); ctx.clip(); }
    const stageLighting = S.sceneLights(fs.owner, fs.who[0].pose);
    for (const w of fs.who) if (!w.stage && w.model && w.pose) w.lighting = actorLighting(stageLighting, w, w.mat);
    const views = new Map();
    for (const g of plates(fs, opts)) {
      const w = g.w;
      let v = views.get(g.d);
      if (!v) { v = g.screen ? M.id() : viewMatrix(fs.cam, g.d, fs.W, fs.H); views.set(g.d, v); }
      const m = M.mul(top, M.mul(v, w.mat));
      const faded = w.opacity < 0.999;
      const x = faded ? alphaLayer(ctx.canvas.width, ctx.canvas.height) : ctx;
      if (!faded) ctx.save();
      setMat(x, m);
      if (g.bg) S.fillBg(x, w.model, w.pose, { x: 0, y: 0, w: w.model.canvas.w, h: w.model.canvas.h });
      if (g.layers.size || g.glows) S.drawScene(x, w.model, w.pose, { background: false, layers: g.layers, lighting: w.stage ? stageLighting : w.lighting, glows: g.glows, guides: !!(w.stage && opts.guides) });
      if (faded) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = w.opacity;
        ctx.drawImage(alphaCanvas, 0, 0);
        ctx.restore();
      } else ctx.restore();
    }
    if (fs.cam.fade > 0.001) {
      setMat(ctx, top);
      ctx.globalAlpha = fs.cam.fade;
      ctx.fillStyle = fs.cam.fadec || '#000000';
      ctx.fillRect(0, 0, fs.W, fs.H);
    }
    ctx.restore();
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
    const px = model.finish.pixel || 1;
    const o = { transparent: opts.transparent, view: opts.view, guides: opts.guides, subs: opts.subs, lang: opts.lang };
    if (px > 1) {
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.round(W2 / px));
      small.height = Math.max(1, Math.round(H2 / px));
      const sx = small.getContext('2d');
      sx.setTransform(scale / px, 0, 0, scale / px, 0, 0);
      drawFrame(sx, model, frame, o);
      if (!opts.noPost) S.postFx(small, post, frame);
      octx.imageSmoothingEnabled = false;
      octx.drawImage(small, 0, 0, W2, H2);
    } else {
      octx.setTransform(scale, 0, 0, scale, 0, 0);
      drawFrame(octx, model, frame, o);
      octx.setTransform(1, 0, 0, 1, 0, 0);
      if (!opts.noPost) S.postFx(out, post, frame);
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

  W.film = { timeline, locate, timecode, frameState, drawFrame, renderFrame, cameraQuad, viewAt, frameOfShot, actorState, valueAt, subtitles, langs, audioClips, lipAt, cuesOf };
})(window.Weasel = window.Weasel || {});
