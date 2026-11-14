/* Weasel — exportação: PNG, JPG, GIF e WebP animados, vídeo MP4, SVG, sprite sheet (PNG + JSON) e SpriteFrames do Godot. */
(function (W) {
  'use strict';
  const S = W.scene;
  const BUILD = '__build__', ALL = '__all__', SEQ = '__seq__';
  // o endereço deste arquivo (com o ?v= da página): o worker da exportação, js/worker.js, fica ao lado dele
  const SELF = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : null;

  const frameIdx = (model, name) => {
    const a = name ? model.animMap.get(name) : null;
    return a ? Array.from({ length: a.frames }, (_, i) => i) : [0];
  };

  // Retângulo (em unidades do canvas) que contém tudo o que é desenhado nas animações dadas.
  // progress(fase, i, n): a cada quadro (a janela de exportar mostra a barra)
  function contentRect(model, names, margin, progress) {
    const c = model.canvas;
    const s = Math.min(1, 640 / Math.max(c.w, c.h));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const total = progress ? names.reduce((n, name) => n + frameIdx(model, name).length, 0) : 0;
    let done = 0;
    for (const name of names) {
      for (const f of frameIdx(model, name)) {
        if (progress) progress('recorte', ++done, total);
        const img = S.renderImage(model, S.makePose(model, name, f), { scale: s, transparent: true, screen: false });
        const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            if (d[(y * img.width + x) * 4 + 3] > 6) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
      }
    }
    if (x0 === Infinity) return { x: 0, y: 0, w: c.w, h: c.h };
    const m = margin || 0;
    const rx = Math.max(0, Math.floor(x0 / s) - m), ry = Math.max(0, Math.floor(y0 / s) - m);
    const rx2 = Math.min(c.w, Math.ceil((x1 + 1) / s) + m), ry2 = Math.min(c.h, Math.ceil((y1 + 1) / s) + m);
    return { x: rx, y: ry, w: rx2 - rx, h: ry2 - ry };
  }

  const fullRect = (model) => ({ x: 0, y: 0, w: model.canvas.w, h: model.canvas.h });
  // o PNG/JPG de um canvas: o da página, o OffscreenCanvas (no worker da exportação) ou o da linha de comando
  const toBlob = (canvas, type, q) => (canvas.convertToBlob ? canvas.convertToBlob(q === undefined ? { type } : { type, quality: q })
    : canvas.toBlob ? new Promise((res) => canvas.toBlob(res, type, q))
      : Promise.resolve(new Blob([canvas.toBuffer(type)], { type })));
  const solidBg = (model) => { const bg = model.canvas.bg; return typeof bg === 'string' ? bg : bg && bg.stops ? bg.stops[0].c : '#ffffff'; };

  // As funções *Canvas / *Bytes / *Text não dependem do navegador: a linha de comando usa as mesmas.
  function imageCanvas(model, animName, frame, o) {
    const rect = o.rect || (o.trim ? contentRect(model, [animName || null], o.margin) : fullRect(model));
    return S.renderImage(model, S.makePose(model, animName, frame), { scale: o.scale, rect, transparent: o.format !== 'jpg' && o.transparent, guides: o.guides, refs: o.refs });
  }

  // A trajetória (linha de comando --trajectory): o caminho dos pés (anim feet=) ou dos pontos em todos os quadros da
  // animação, numerado, por cima do personagem clarinho no quadro. A imagem mostra só a região dos caminhos,
  // ampliada (até uns 1200 px); a escala (o.scale) vale para os números, como na exportação. names = só esses pontos.
  function trajectoryCanvas(model, animName, frame, o, names) {
    const anim = model.animMap.get(animName);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of S.trajectories(model, anim, names)) for (const [x, y] of p.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    let rect = fullRect(model);
    if (x0 <= x1) {
      const pad = Math.max(20, 0.15 * Math.max(x1 - x0, y1 - y0));
      rect = { x: x0 - pad, y: y0 - pad * 1.6, w: x1 - x0 + 2 * pad, h: y1 - y0 + pad * 2.6 };
    }
    const z = Math.max(0.25, Math.min(8, 1200 / rect.w, 800 / rect.h)), band = 24, font = '13px ui-monospace, Menlo, Consolas, monospace';
    const img = S.renderImage(model, S.makePose(model, animName, frame), { scale: z, rect, transparent: true, guides: o.guides, screen: false });
    // em cima: a animação e quanto o personagem anda
    const g = S.gait(model, anim), title = `${animName}${g ? ': ' + S.gaitText(g, o.scale).head : ''}`;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font;
    const out = document.createElement('canvas');
    out.width = Math.max(img.width, Math.ceil(probe.measureText(title).width) + 16);
    out.height = img.height + band;
    const ctx = out.getContext('2d');
    if (!o.transparent) { ctx.fillStyle = solidBg(model); ctx.fillRect(0, 0, out.width, out.height); }
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, 0, band);
    ctx.globalAlpha = 1;
    ctx.setTransform(z, 0, 0, z, -rect.x * z, band - rect.y * z);
    S.drawTrajectory(ctx, model, anim, z, { names, frame });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#222222';
    ctx.fillText(title, 8, band / 2);
    return out;
  }

  function svgText(model, animName, frame, o) {
    const rect = o.rect || (o.trim ? contentRect(model, [animName || null], o.margin) : fullRect(model));
    return W.svg.render(model, S.makePose(model, animName, frame), { scale: o.scale, rect, transparent: o.transparent, guides: o.guides });
  }

  async function image(model, animName, frame, o) {
    const jpg = o.format === 'jpg';
    const cv = imageCanvas(model, animName, frame, o);
    return { canvas: cv, blob: await toBlob(cv, jpg ? 'image/jpeg' : 'image/png', jpg ? o.quality : undefined) };
  }

  function delays(n, fps) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.round(((i + 1) * 100) / fps) - Math.round((i * 100) / fps));
    return out;
  }

  // ---------- as animações em GIF, WebP e vídeo ----------
  // A origem é uma animação, a pintura passo a passo (BUILD) ou uma sequência de animações (SEQ, com o texto em o.seq).

  // A sequência (na janela, ou o -a da linha de comando): os nomes na ordem, "idle walk*3 jump"; *3 repete 3 vezes.
  // Devolve [{ name, times }]; um nome que não existe dá erro com os que existem.
  function parseSeq(model, text) {
    const list = [];
    for (const tok of String(text || '').replace(/\s*\*\s*/g, '*').split(/[\s,]+/).filter(Boolean)) {
      const m = /^([^*]+)(?:\*(\d+))?$/.exec(tok);
      if (!m) throw new Error(`"${tok}" na sequência: escreva o nome da animação, ou nome*3 para repetir`);
      const times = m[2] ? parseInt(m[2], 10) : 1;
      if (!model.animMap.has(m[1])) throw new Error(`animação "${m[1]}" não existe${model.anims.length ? ` (tem: ${model.anims.map((a) => a.name).join(', ')})` : ''}`);
      if (times < 1 || times > 99) throw new Error(`"${tok}" na sequência: repita de 1 a 99 vezes`);
      list.push({ name: m[1], times });
    }
    if (!list.length) throw new Error('a sequência está vazia: escreva os nomes das animações na ordem (ex.: idle walk*3 jump)');
    return list;
  }
  // um -a com mais de uma animação (ou com *): é uma sequência
  const isSeq = (s) => /[\s,*]/.test(String(s || '').trim());

  // Os quadros de uma origem, cada um com a animação, o quadro e a posição no trecho dela (j, a fps quadros por
  // segundo; os tempos saem daí, sem erro de arredondamento). hold: quanto o último quadro fica parado (a pintura
  // pronta, 2 s); names: as animações (para o recorte); tag: o nome que vai no arquivo.
  function frameList(model, source, o) {
    if (source === BUILD) {
      const plan = S.buildPlan(model, { speed: o.speed || 1, guides: o.guides });
      const n = Math.ceil(plan.total * 20) + 1;
      return { build: plan, frames: Array.from({ length: n + 1 }, (_, i) => ({ name: null, f: 0, j: i, fps: 20, start: 0 })), hold: 2, names: [null], tag: 'pintura' };
    }
    const list = source === SEQ ? parseSeq(model, o.seq) : [{ name: source, times: 1 }];
    const frames = [];
    let start = 0;
    for (const it of list) {
      const a = it.name ? model.animMap.get(it.name) : null;
      const fps = a ? a.fps : 12;
      const idx = frameIdx(model, it.name);
      for (let k = 0; k < it.times; k++) {
        idx.forEach((f, j) => frames.push({ name: it.name, f, j, fps, start }));
        start += idx.length / fps;
      }
    }
    return { frames, hold: 0, names: [...new Set(list.map((x) => x.name))], tag: source === SEQ ? list.map((x) => x.name).join('-') : source };
  }
  // quanto cada quadro fica na tela, em 1/unit de segundo (GIF: centésimos; WebP: milésimos)
  function spans(list, unit) {
    const out = list.frames.map((x) => Math.round(((x.j + 1) * unit) / x.fps) - Math.round((x.j * unit) / x.fps));
    if (list.hold) out[out.length - 1] = Math.round(list.hold * unit);
    return out;
  }
  const rectFor = (model, list, o) => (o.trim ? contentRect(model, list.names, o.margin, o.progress) : fullRect(model));
  // Desenha o quadro i de uma lista; os que se repetem (walk*3) são desenhados uma vez só.
  function frameRenderer(model, list, o, rect) {
    const cache = new Map();
    const pose = list.build ? S.makePose(model, null, 0) : null;
    let last = null;
    return (i) => {
      const x = list.frames[i];
      if (list.build) {
        if (last && last.i === i) return last.cv;
        const bf = S.buildFilter(list.build, x.j / x.fps);
        const cv = S.renderImage(model, pose, {
          scale: o.scale, rect, transparent: o.transparent, filter: bf.filter,
          after: (ctx, s) => S.drawTrace(ctx, model, pose, list.build, bf.st, s),
        });
        last = { i, cv };
        return cv;
      }
      const key = `${x.name}\n${x.f}`;
      if (!cache.has(key)) cache.set(key, S.renderImage(model, S.makePose(model, x.name, x.f), { scale: o.scale, rect, transparent: o.transparent, guides: o.guides, refs: o.refs }));
      return cache.get(key);
    };
  }

  async function gifBytes(model, source, o) {
    const list = frameList(model, source, o);
    const draw = frameRenderer(model, list, o, rectFor(model, list, o));
    const frames = [];
    let preview = null;
    const n = list.frames.length;
    for (let i = 0; i < n; i++) {
      if (o.progress) o.progress('quadros', i + 1, n);
      const cv = draw(i);
      frames.push(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height));
      if (!preview || list.build) preview = cv;
    }
    await new Promise((r) => setTimeout(r, 0));
    const bytes = W.gif.encode(frames, { delay: spans(list, 100), loop: 0, transparent: o.transparent, dither: o.dither });
    return { bytes, width: frames[0].width, height: frames[0].height, frames: frames.length, preview, tag: list.tag };
  }

  // WebP animado: cores de verdade e transparência suave (o GIF tem 256 cores e transparência de 1 bit).
  // o.quality de 0 a 1 (1 = sem perdas). o.sticker: a figurinha do WhatsApp, 512 × 512 com fundo transparente, o
  // desenho centrado com 16 px de folga, e a qualidade baixa até o arquivo caber em 500 KB.
  const STICKER = 512, STICKER_MAX = 500 * 1000;
  async function webpBytes(model, source, o) {
    const list = frameList(model, source, o);
    const n = list.frames.length;
    let draw;
    if (o.sticker) {
      const rect = contentRect(model, list.names, 0, o.progress);
      const inner = frameRenderer(model, list, Object.assign({}, o, { scale: Math.min((STICKER - 32) / rect.w, (STICKER - 32) / rect.h), transparent: true }), rect);
      const boxed = new Map();
      draw = (i) => {
        const cv = inner(i);
        if (!boxed.has(cv)) {
          const out = document.createElement('canvas');
          out.width = out.height = STICKER;
          out.getContext('2d').drawImage(cv, Math.round((STICKER - cv.width) / 2), Math.round((STICKER - cv.height) / 2));
          boxed.set(cv, out);
        }
        return boxed.get(cv);
      };
    } else draw = frameRenderer(model, list, o, rectFor(model, list, o));
    const canvases = [];
    for (let i = 0; i < n; i++) {
      if (o.progress) o.progress('quadros', i + 1, n);
      canvases.push(draw(i));
    }
    const ms = spans(list, 1000);
    const encode = async (q) => {
      const memo = new Map();
      const frames = [];
      for (let i = 0; i < n; i++) {
        const cv = canvases[i];
        if (!memo.has(cv)) memo.set(cv, await W.webp.frameBytes(cv, q));
        frames.push({ bytes: memo.get(cv), width: cv.width, height: cv.height, ms: ms[i] });
      }
      return W.webp.encode(frames, { loop: 0, transparent: o.sticker || o.transparent });
    };
    let q = o.quality === undefined ? 0.92 : o.quality;
    let bytes = await encode(q);
    if (o.sticker) {
      for (const lower of [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]) {
        if (bytes.length <= STICKER_MAX) break;
        if (lower < q) { q = lower; bytes = await encode(q); }
      }
    }
    return { bytes, width: canvases[0].width, height: canvases[0].height, frames: n, quality: q, big: !!o.sticker && bytes.length > STICKER_MAX, preview: canvases[list.build ? n - 1 : 0], tag: list.tag };
  }

  // Os quadros de um vídeo: um ritmo fixo (o fps da animação; numa sequência com fps diferentes, um que sirva para
  // todas), com a animação (ou a sequência) repetida inteira até dar o.minLength segundos (a pintura não repete).
  // Os quadros saem num tamanho par (o H.264 pede), com o fundo do desenho; o.transparent só nos vídeos que guardam
  // transparência (o .mov e o .webm da linha de comando). frame(k) devolve o canvas do quadro k (de 0 a count-1).
  function videoFrames(model, source, o) {
    const list = frameList(model, source, o);
    const draw = frameRenderer(model, list, o, rectFor(model, list, o));
    const rates = [...new Set(list.frames.map((x) => x.fps))];
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const lcm = rates.every(Number.isInteger) ? rates.reduce((a, b) => (a * b) / gcd(a, b), 1) : 0;
    const fps = rates.length === 1 ? rates[0] : lcm && lcm <= 60 ? lcm : Math.max(...rates);
    const starts = list.frames.map((x) => x.start + x.j / x.fps);
    const end = list.frames[list.frames.length - 1];
    const cycle = list.hold ? starts[starts.length - 1] + list.hold : end.start + (end.j + 1) / end.fps;
    const cycles = list.build || !(o.minLength > 0) ? 1 : Math.max(1, Math.ceil(o.minLength / cycle - 1e-9));
    const perCycle = Math.max(1, Math.round(cycle * fps));
    // o quadro que aparece no instante k / fps (o último que já começou)
    const index = [];
    for (let k = 0, i = 0; k < perCycle; k++) {
      while (i + 1 < starts.length && starts[i + 1] <= k / fps + 1e-9) i++;
      index.push(i);
    }
    const first = draw(0);
    const width = first.width + (first.width % 2), height = first.height + (first.height % 2);
    let pad = null, padOf = null;
    const frame = (k) => {
      const cv = draw(index[k % perCycle]);
      if (cv.width === width && cv.height === height) return cv;
      if (padOf !== cv) {
        if (!pad) { pad = document.createElement('canvas'); pad.width = width; pad.height = height; }
        const ctx = pad.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        if (!o.transparent) { ctx.fillStyle = solidBg(model); ctx.fillRect(0, 0, width, height); }
        ctx.drawImage(cv, 0, 0);
        padOf = cv;
      }
      return pad;
    };
    return { fps, count: perCycle * cycles, width, height, frame, cycles, seconds: (perCycle * cycles) / fps, tag: list.tag, index };
  }

  async function gif(model, source, o) {
    const r = await gifBytes(model, source, o);
    return Object.assign(r, { blob: new Blob([r.bytes], { type: 'image/gif' }) });
  }

  async function sheet(model, names, o) {
    const r = sheetCanvas(model, names, o);
    return Object.assign(r, { png: await toBlob(r.canvas, 'image/png') });
  }

  function sheetCanvas(model, names, o) {
    const list = names.length ? names : [null];
    // art pixel … small: a folha sai com 1 pixel por bloco, e o recorte cai na grade do pixel art
    if (W.art && W.art.small(model)) o = Object.assign({}, o, { scale: W.art.smallScale(model, o.scale) });
    const rect0 = o.trim ? contentRect(model, list, o.margin, o.progress) : fullRect(model);
    const rect = W.art ? W.art.snapRect(model, rect0) : rect0;
    const fw = Math.max(1, Math.round(rect.w * o.scale)), fh = Math.max(1, Math.round(rect.h * o.scale));
    const pad = o.padding || 0;
    const cells = [];
    list.forEach((name, row) => frameIdx(model, name).forEach((f, i) => cells.push({ name, f, i, row })));
    let cols, rows;
    if (o.layout === 'rows') {
      cols = Math.max(...list.map((n) => frameIdx(model, n).length));
      rows = list.length;
      cells.forEach((c) => { c.col = c.i; c.r = c.row; });
    } else {
      cols = o.cols > 0 ? o.cols : Math.ceil(Math.sqrt(cells.length));
      rows = Math.ceil(cells.length / cols);
      cells.forEach((c, k) => { c.col = k % cols; c.r = Math.floor(k / cols); });
    }
    for (const c of cells) { c.x = pad + c.col * (fw + pad); c.y = pad + c.r * (fh + pad); }
    const out = document.createElement('canvas');
    out.width = pad + cols * (fw + pad);
    out.height = pad + rows * (fh + pad);
    if (out.width > 16384 || out.height > 16384) throw new Error('a folha ficaria grande demais: diminua a escala');
    const ctx = out.getContext('2d');
    if (!o.transparent) { ctx.fillStyle = solidBg(model); ctx.fillRect(0, 0, out.width, out.height); }
    const json = { frames: {}, animations: {}, meta: {} };
    const tags = [], events = [];
    let flat = 0;
    for (const name of list) {
      const anim = name ? model.animMap.get(name) : null;
      const key = name || 'pose';
      const from = flat;
      json.animations[key] = [];
      for (const f of frameIdx(model, name)) {
        const c = cells[flat];
        if (o.progress) o.progress('quadros', flat + 1, cells.length);
        // a folha é para o jogo: sem os efeitos de tela
        const cv = S.renderImage(model, S.makePose(model, name, f), { scale: o.scale, rect, transparent: o.transparent, guides: o.guides, screen: false });
        ctx.drawImage(cv, c.x, c.y);
        const id = `${key}_${String(f).padStart(2, '0')}`;
        const root = model.unity ? model.unity.root : [rect.x + rect.w / 2, rect.y + rect.h];
        const fe = anim ? anim.events.filter((e) => e.frame === f).map((e) => e.name) : [];
        json.frames[id] = {
          frame: { x: c.x, y: c.y, w: fw, h: fh }, rotated: false, trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: fw, h: fh }, sourceSize: { w: fw, h: fh },
          pivot: { x: round3((root[0] - rect.x) / rect.w), y: round3((root[1] - rect.y) / rect.h) },
          duration: Math.round(1000 / (anim ? anim.fps : 12)),
        };
        if (fe.length) json.frames[id].events = fe;
        if (model.boxes.size) json.frames[id].boxes = frameBoxes(model, S.makePose(model, name, f), rect, o.scale);
        if (model.points.size) json.frames[id].points = framePoints(model, S.makePose(model, name, f), rect, o.scale);
        for (const n of fe) events.push({ animation: key, frame: f, name: n });
        json.animations[key].push(id);
        flat++;
      }
      const tag = { name: key, from, to: flat - 1, direction: 'forward', fps: anim ? anim.fps : 12, loop: anim ? anim.loop : false };
      // anim feet=: quanto o personagem anda por segundo (px da folha) para os pés no chão não escorregarem
      const g = anim && S.gait(model, anim);
      if (g && g.speed !== null) tag.groundSpeed = round3(Math.abs(g.speed) * o.scale);
      tags.push(tag);
    }
    json.meta = {
      app: 'Weasel', version: '1.1', image: o.imageName || 'sprites.png', format: 'RGBA8888',
      size: { w: out.width, h: out.height }, scale: String(o.scale), frameSize: { w: fw, h: fh }, padding: pad,
      frameTags: tags, events, sourceRect: rect,
    };
    if (model.variant) json.meta.variant = model.variant;
    if (model.unity) {
      json.meta.unity = {
        pixelsPerUnit: round3(model.unity.unit * o.scale),
        pivotBottomLeft: { x: round3((model.unity.root[0] - rect.x) / rect.w), y: round3(1 - (model.unity.root[1] - rect.y) / rect.h) },
        collider: model.unity.collider,
      };
    }
    return { canvas: out, json: JSON.stringify(json, null, 2), frames: cells.length, fw, fh, cells, list, rect, scale: o.scale };
  }
  const round3 = (v) => Math.round(v * 1000) / 1000;
  // caixas ligadas no quadro, em pixels do quadro (centro, tamanho e rotação), para outros motores
  function frameBoxes(model, pose, rect, scale) {
    const out = [];
    for (const b of model.boxes.values()) {
      const st = S.boxState(model, pose, b);
      if (!st.on) continue;
      const o = { name: b.name, kind: b.kind, shape: b.shape, x: round3((st.cx - rect.x) * scale), y: round3((st.cy - rect.y) * scale) };
      if (b.shape === 'circle') o.r = round3(b.r * scale); else { o.w = round3(b.w * scale); o.h = round3(b.h * scale); }
      if (st.rot) o.rot = round3(st.rot);
      out.push(o);
    }
    return out;
  }

  // pontos de encaixe no quadro, em pixels do quadro, com a rotação do osso (graus)
  function framePoints(model, pose, rect, scale) {
    return [...model.points.values()].map((p) => {
      const st = S.pointState(model, pose, p);
      const o = { name: p.name, x: round3((st.x - rect.x) * scale), y: round3((st.y - rect.y) * scale) };
      if (st.rot) o.rot = round3(st.rot);
      return o;
    });
  }

  // SpriteFrames do Godot 4 (.tres) apontando para a folha; deixe o .png e o .tres na mesma pasta.
  const godotText = (model, r, imagePath, normalPath) => W.godot.spriteFramesText(model, r, imagePath, normalPath);

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  const kb = (n) => (n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const bytesOf = async (blob) => new Uint8Array(await blob.arrayBuffer());

  // ---------- a folha, o Godot, o GIF, o WebP e o vídeo de um desenho ----------
  // Desenham todos os quadros, por isso a janela de exportar os manda para o worker (js/worker.js), e a página não
  // trava; sem worker, rodam na própria página. Não usam a página: tudo o que a janela escolheu vem em o (anim: a
  // origem; seq: a sequência; minLength: a duração mínima do vídeo; sticker: a figurinha; normal, rig, scene e
  // mirror: as caixas do Godot; progress(fase, i, n): a barra).
  // Devolve os arquivos prontos (blob), a prévia (o blob da imagem principal) e o resumo.
  async function buildFiles(model, kind, o, suffix) {
    // a folha, o Godot e o SVG saem sem os efeitos de tela (oldfilm, vhs, crt, glitch): o aviso vai junto
    const screen = (info) => { const n = S.screenNote(model); return n ? `${info} · ${n}` : info; };
    const v = o.anim || '';
    if (kind === 'gif') {
      const x = await gif(model, v, o);
      return { files: [{ name: `${o.baseName}${suffix}_${x.tag}.gif`, blob: x.blob }], preview: x.blob, info: `${x.width} × ${x.height} px · ${x.frames} quadros · ${kb(x.blob.size)}` };
    }
    if (kind === 'webp') {
      const x = await webpBytes(model, v, o);
      const blob = new Blob([x.bytes], { type: 'image/webp' });
      const sticker = o.sticker ? ` · figurinha, qualidade ${Math.round(x.quality * 100)}%${x.big ? ' · passou de 500 KB: o WhatsApp pode recusar; use uma animação mais curta' : ''}` : '';
      return { files: [{ name: `${o.baseName}${suffix}_${x.tag}${o.sticker ? '_figurinha' : ''}.webp`, blob }], preview: blob, info: `${x.width} × ${x.height} px · ${x.frames} quadros · ${kb(blob.size)}${sticker}` };
    }
    if (kind === 'video') {
      // MP4 (H.264) pelo codificador do navegador; sem transparência
      const x = videoFrames(model, v, Object.assign({}, o, { transparent: false }));
      const r = await W.mp4.record(x.count, x.fps, x.width, x.height, x.frame, (i, n) => { if (o.progress) o.progress('video', i, n); });
      const secs = x.seconds.toFixed(1).replace('.', ',');
      return { files: [{ name: `${o.baseName}${suffix}_${x.tag}.mp4`, blob: r.blob }], preview: r.blob, video: true, info: `${x.width} × ${x.height} px · ${x.count} quadros a ${x.fps} fps · ${secs} s${x.cycles > 1 ? ` (${x.cycles} voltas)` : ''} · ${kb(r.blob.size)}` };
    }
    const names = v === ALL ? model.anims.map((a) => a.name) : [v || null];
    const tag = (v === ALL ? 'todas' : v || 'pose') + suffix;
    const png = async (f) => ({ name: f.name, blob: f.canvas ? await toBlob(f.canvas, 'image/png') : new Blob([f.text], { type: 'text/plain' }), png: !!f.canvas && !/_normal\.png$/.test(f.name) });
    // Godot com esqueleto de verdade (Bone2D): a folha de peças, o normal map, a cena e o ajudante
    const rig = !model.tileset && (o.rig || (model.godot && model.godot.rig === 'bones'));
    if (kind === 'godot' && rig) {
      const pkg = W.rig.packageFiles(model, { base: o.baseName + suffix, scale: o.scale, mirror: o.mirror, normal: o.normal, names });
      const files = await Promise.all(pkg.files.map(png));
      const main = pkg.files[0].canvas;
      const what = `esqueleto: ${pkg.bones} osso${pkg.bones === 1 ? '' : 's'} · ${pkg.rigid} peça${pkg.rigid === 1 ? '' : 's'} presas aos ossos${pkg.skinned ? ` · ${pkg.skinned} que dobra${pkg.skinned === 1 ? '' : 'm'}` : ''}${pkg.framed ? ` · ${pkg.framed} quadro a quadro` : ''}${pkg.boxes ? ` · ${pkg.boxes} caixa${pkg.boxes === 1 ? '' : 's'}` : ''}${pkg.points ? ` · ${pkg.points} ponto${pkg.points === 1 ? '' : 's'}` : ''}${pkg.mirrored.length ? ` · espelhadas: ${pkg.mirrored.join(', ')}` : ''}`;
      return { files, preview: files[0].blob, info: screen(`${main.width} × ${main.height} px · ${what}${pkg.notes.length ? ` · ${pkg.notes.join('; ')}` : ''}`) };
    }
    // Godot completo: cena, normal map, ajudante; ou o TileSet
    if (kind === 'godot' && (model.tileset || o.scene || o.normal)) {
      const pkg = W.godot.packageFiles(model, { base: model.tileset || o.scene ? o.baseName + suffix : `${o.baseName}_${tag}`, scale: o.scale, normal: o.normal, scene: o.scene, mirror: o.mirror, padding: o.padding, layout: o.layout, cols: o.cols, margin: o.margin, trim: o.trim || o.scene, names: model.tileset ? null : names, progress: o.progress });
      const files = await Promise.all(pkg.files.map(png));
      const main = pkg.files[0].canvas;
      const what = pkg.kind === 'tileset' ? `TileSet com ${pkg.tiles} blocos` : `${pkg.sheet.frames} quadros de ${pkg.sheet.fw} × ${pkg.sheet.fh}${o.scene ? ` · ${pkg.boxes} caixa${pkg.boxes === 1 ? '' : 's'}${pkg.points ? ` · ${pkg.points} ponto${pkg.points === 1 ? '' : 's'}` : ''}` : ''}${pkg.mirrored.length ? ` · espelhadas: ${pkg.mirrored.join(', ')}` : ''}`;
      return { files, preview: files[0].blob, info: screen(`${main.width} × ${main.height} px · ${what}`) };
    }
    o.imageName = `${o.baseName}_${tag}.png`;
    const x = await sheet(model, names, o);
    const files = [{ name: o.imageName, blob: x.png, png: true }];
    if (kind === 'sheet') files.push({ name: `${o.baseName}_${tag}.json`, blob: new Blob([x.json], { type: 'application/json' }) });
    else files.push({ name: `${o.baseName}_${tag}.tres`, blob: new Blob([godotText(model, x, o.imageName)], { type: 'text/plain' }) });
    return { files, preview: x.png, info: screen(`${x.canvas.width} × ${x.canvas.height} px · ${x.frames} quadros de ${x.fw} × ${x.fh} · PNG ${kb(x.png.size)}`) };
  }

  // Uma exportação da janela (folha, Godot, GIF, WebP ou vídeo): cada variante (parse(v) lê o desenho dela), num .zip quando sai
  // mais de um arquivo. all: todas as variantes (o "Só o PNG" não vale).
  async function exportJob(kind, o, parse, variants, all) {
    const files = [];
    let first = null;
    for (const v of variants) {
      const r = await buildFiles(parse(v), kind, Object.assign({}, o), v ? '_' + v : '');
      if (!first) first = r;
      files.push(...r.files);
    }
    let blob, name;
    if (files.length === 1) ({ blob, name } = files[0]);
    else {
      blob = W.zip(await Promise.all(files.map(async (f) => ({ name: f.name, data: await bytesOf(f.blob) }))));
      name = `${o.baseName}_${kind}${all ? '_variantes' : ''}.zip`;
    }
    const png = files.find((f) => f.png);
    return { blob, name, png: png && !all ? { blob: png.blob, name: png.name } : null, preview: first.preview, video: !!first.video, info: first.info, count: files.length, names: files.map((f) => f.name) };
  }

  // ---------- janela de exportação ----------
  function setupDialog(app) {
    const dlg = document.getElementById('exportDlg');
    const $ = (id) => document.getElementById(id);
    let kind = 'png', result = null, busy = 0;

    dlg.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { kind = b.dataset.kind; sync(); }));
    for (const id of ['expAnim', 'expVariant', 'expScale', 'expTransparent', 'expTrim', 'expMargin', 'expQuality', 'expLayout', 'expCols', 'expPad', 'expSpeed', 'expDither', 'expGodotScene', 'expNormal', 'expMirror', 'expRig', 'expBurn', 'expNleSplit', 'expNleExt', 'expNleDir', 'expSeq', 'expMinLen', 'expSticker', 'expVidFmt']) {
      $(id).addEventListener('change', () => refresh());
    }
    // "Acrescentar": põe a animação escolhida no fim da sequência, sem precisar digitar
    $('expSeqAdd').addEventListener('change', () => {
      const name = $('expSeqAdd').value;
      if (!name) return;
      $('expSeq').value = `${$('expSeq').value.trim()} ${name}`.trim();
      $('expSeqAdd').value = '';
      refresh();
    });
    // a pasta do projeto (para o editor de vídeo achar os arquivos) fica guardada neste navegador
    try { $('expNleDir').value = localStorage.getItem('weasel.nleDir') || ''; } catch (e) { /* sem armazenamento */ }
    $('expNleDir').addEventListener('change', () => { try { localStorage.setItem('weasel.nleDir', $('expNleDir').value.trim()); } catch (e) { /* sem armazenamento */ } });
    $('expDownload').addEventListener('click', () => save(false));
    $('expDownloadPng').addEventListener('click', () => save(true));

    const isSheet = () => kind === 'sheet' || kind === 'godot';
    // as animações (uma, a sequência ou a pintura) em GIF, WebP ou vídeo
    const isAnim = () => kind === 'gif' || kind === 'webp' || kind === 'video';
    // a folha, o Godot, o GIF, o WebP e o vídeo de um desenho desenham todos os quadros: vão para o worker
    const isJob = () => !isFilm() && (isSheet() || isAnim());
    const isFrame = () => kind === 'png' || kind === 'jpg' || kind === 'svg' || kind === 'txt';
    const isFilm = () => !!app.model().film;
    // o .txt sai do art ascii (num filme, de um quadro todo em ascii)
    const ascii = (m) => (m.film ? W.art.has(m) : !!(m.art && m.art.style === 'ascii'));
    // filme: GIF, vídeo e sequência só são gerados quando a pessoa pede (podem ser muitos quadros)
    const heavy = () => isFilm() && (kind === 'gif' || kind === 'video' || kind === 'seq');

    function sync() {
      const film = isFilm();
      dlg.querySelectorAll('[data-kind]').forEach((b) => { b.hidden = b.dataset.for === 'ascii' ? !ascii(app.model()) : b.dataset.for === (film ? 'draw' : 'film'); });
      if (dlg.querySelector(`[data-kind="${kind}"]`).hidden) kind = 'png';
      dlg.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('on', b.dataset.kind === kind));
      dlg.querySelectorAll('[data-show]').forEach((el) => { el.hidden = !el.dataset.show.split(' ').includes(kind); });
      dlg.querySelectorAll('[data-hide="film"]').forEach((el) => { if (film) el.hidden = true; else if (!el.dataset.show) el.hidden = false; });
      dlg.querySelectorAll('[data-only="film"]').forEach((el) => { if (!film) el.hidden = true; });
      $('expTransparent').closest('label').hidden = kind === 'nle' || kind === 'subs';
      const model = app.model();
      const sel = $('expAnim');
      const prev = sel.value;
      sel.innerHTML = '';
      const add = (s, v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); };
      if (film) {
        const tl = W.film.timeline(model), st = app.state();
        if (kind === 'png' || kind === 'jpg' || kind === 'txt') {
          const loc = W.film.locate(model, st.frame);
          add(sel, '', `Quadro atual — ${W.film.timecode(st.frame, tl.fps)}${loc ? ` (${loc.entry.name})` : ''}`);
        } else {
          add(sel, '', `Filme inteiro — ${tl.frames} quadros`);
          tl.entries.forEach((e, i) => add(sel, String(i), `${i + 1}. ${e.name} — ${e.frames} quadros`));
          sel.value = [prev, st.shot].find((v) => v !== undefined && [...sel.options].some((o) => o.value === v)) || '';
        }
      } else if (isFrame()) {
        const st = app.state();
        add(sel, '', st.anim ? `Quadro atual — ${st.anim}, quadro ${st.frame + 1}` : 'Pose parada (sem animação)');
      } else {
        for (const a of model.anims) add(sel, a.name, `${a.name} — ${a.frames} quadros, ${a.fps} fps`);
        if (isAnim() && model.anims.length) add(sel, SEQ, 'Sequência de animações');
        if (isAnim()) add(sel, BUILD, 'Pintura passo a passo (como no vídeo)');
        const seqAdd = $('expSeqAdd');
        seqAdd.innerHTML = '';
        add(seqAdd, '', '+ animação');
        for (const a of model.anims) add(seqAdd, a.name, a.name);
        if (isSheet() && model.anims.length > 1) add(sel, ALL, 'Todas as animações');
        if (!model.anims.length && isSheet()) add(sel, '', 'Pose parada');
        const want = [prev, isSheet() && model.anims.length > 1 ? ALL : '', app.state().anim].find((v) => v && [...sel.options].some((o) => o.value === v));
        if (want) sel.value = want;
      }
      const vs = $('expVariant'), vprev = vs.value;
      vs.innerHTML = '';
      const variants = app.variants();
      add(vs, '', 'padrão');
      for (const v of variants) add(vs, v, v);
      if (variants.length) add(vs, ALL, 'todas (num .zip)');
      vs.value = [vprev, app.variant()].find((v) => v !== undefined && [...vs.options].some((o) => o.value === v)) || '';
      $('expVariantWrap').hidden = !variants.length;
      $('expDownloadPng').hidden = !isSheet();
      refresh();
    }

    // Gera os arquivos de uma variante (os quadros soltos e o filme; a folha, o Godot e o GIF estão no buildFiles).
    async function produce(model, o, suffix) {
      const base = o.baseName + suffix;
      // o SVG sai sem os efeitos de tela (oldfilm, vhs, crt, glitch): o aviso vai junto
      const screen = (info) => { const n = S.screenNote(model); return n ? `${info} · ${n}` : info; };
      const st = app.state();
      if (model.film && kind === 'nle') {
        // linha do tempo para o editor de vídeo (EDL, FCPXML) e as legendas, apontando para os vídeos
        // renderizados (com os nomes que a linha de comando dá) e para os sons na pasta do projeto
        const tl = W.film.timeline(model), v = $('expAnim').value, e = v !== '' ? tl.entries[+v] : null;
        const from = e ? e.start : 0, to = e ? e.start + e.frames : tl.frames;
        const ext = $('expNleExt').value, dir = $('expNleDir').value.trim().replace(/[\\/]+$/, '');
        const sep = dir.includes('\\') ? '\\' : '/';
        const at = (f) => (dir ? dir + sep + f.replace(/[\\/]+/g, sep) : f);
        const tag = (x) => '_' + x.name.replace(/[\\/]+/g, '-');
        const name = base + (e ? tag(e) : '');
        const videos = $('expNleSplit').value === 'shots'
          ? (e ? [e] : tl.entries).map((x) => ({ file: at(`${base}${tag(x)}.${ext}`), start: x.start, frames: x.frames }))
          : [{ file: at(`${name}.${ext}`), start: from, frames: to - from }];
        const pl = W.nle.plan(model, { from, to, videos, scale: o.scale, audioPath: (c) => at(c.a.file) });
        const files = [
          { name: name + '.fcpxml', blob: new Blob([W.nle.fcpxml(pl, name)], { type: 'application/xml' }) },
          { name: name + '.edl', blob: new Blob([W.nle.edl(pl, name)], { type: 'text/plain' }) },
        ];
        for (const lang of W.film.langs(model)) {
          const list = W.film.subtitles(model, from / tl.fps, to / tl.fps, lang);
          if (list.length) files.push({ name: `${name}${lang === model.film.lang ? '' : '.' + lang}.srt`, blob: new Blob([W.audio.srt(list)], { type: 'text/plain' }) });
        }
        // prévia: a própria linha do tempo, só do trecho
        const cv = document.createElement('canvas');
        Object.defineProperty(cv, 'clientWidth', { value: 720 });
        const none = () => {};
        W.timelineView(cv, { model: () => model, frame: () => from, setFrame: none, range: () => [from, to], editable: () => false, lineOf: () => -1, gotoLine: none, edit: none, open: none, hint: none }).draw();
        const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
        return { files, preview: cv.toDataURL(), info: `${n(videos.length, 'vídeo', 'vídeos')} · ${n(pl.audio.length, 'som', 'sons')} em ${n(pl.lanes, 'trilha', 'trilhas')} · ${n(pl.markers.length, 'marcador', 'marcadores')}` };
      }
      if (model.film && kind === 'subs') {
        // legendas do trecho escolhido, em .srt e .vtt (uma língua por arquivo)
        const tl = W.film.timeline(model), v = $('expAnim').value, e = v !== '' ? tl.entries[+v] : null;
        const from = e ? e.start / tl.fps : 0, to = e ? (e.start + e.frames) / tl.fps : tl.duration;
        const tag = e ? '_' + e.name.replace(/[\\/]+/g, '-') : '';
        const files = [];
        let count = 0;
        for (const lang of W.film.langs(model)) {
          const list = W.film.subtitles(model, from, to, lang);
          if (!list.length) continue;
          count += list.length;
          const name = `${base}${tag}${lang === model.film.lang ? '' : '.' + lang}`;
          files.push({ name: name + '.srt', blob: new Blob([W.audio.srt(list)], { type: 'text/plain' }) }, { name: name + '.vtt', blob: new Blob([W.audio.vtt(list)], { type: 'text/vtt' }) });
        }
        if (!files.length) throw new Error('não há legendas nesse trecho (use sub ou text= num audio)');
        const first = tl.subs.find((s) => s.end > from && s.start < to);
        const cv = W.film.renderFrame(model, Math.round(Math.max(first.start, from) * tl.fps), { scale: Math.min(0.5, o.scale), subs: true, lang: first.lang });
        return { files, preview: cv.toDataURL(), info: `${count} legenda${count > 1 ? 's' : ''} · ${W.film.langs(model).join(', ')}` };
      }
      if (kind === 'txt') {
        const cv = model.film ? W.film.renderFrame(model, st.frame, { scale: o.scale }) : imageCanvas(model, st.anim, st.frame, Object.assign({}, o, { transparent: false }));
        if (!cv.artText) throw new Error('o .txt sai quando o quadro inteiro está em art ascii');
        const blob = new Blob([cv.artText], { type: 'text/plain' });
        return { files: [{ name: `${base}.txt`, blob }], preview: cv.toDataURL(), info: `${cv.artText.split('\n').length - 1} linhas de letras · ${kb(blob.size)}` };
      }
      if (model.film) {
        const cv = W.film.renderFrame(model, st.frame, { scale: o.scale, transparent: o.transparent, subs: o.burn });
        const blob = await toBlob(cv, kind === 'jpg' ? 'image/jpeg' : 'image/png', kind === 'jpg' ? o.quality : undefined);
        return { files: [{ name: `${base}_${String(st.frame).padStart(5, '0')}.${kind}`, blob }], preview: cv.toDataURL(), info: `${cv.width} × ${cv.height} px · quadro ${st.frame} · ${kb(blob.size)}` };
      }
      if (kind === 'png' || kind === 'jpg') {
        const x = await image(model, st.anim, st.frame, o);
        return { files: [{ name: `${base}.${kind}`, blob: x.blob }], preview: x.canvas.toDataURL(), info: `${x.canvas.width} × ${x.canvas.height} px · ${kb(x.blob.size)}` };
      }
      if (kind === 'svg') {
        const s = svgText(model, st.anim, st.frame, o);
        const blob = new Blob([s], { type: 'image/svg+xml' });
        return { files: [{ name: `${base}.svg`, blob }], previewUrl: URL.createObjectURL(blob), info: screen(`SVG vetorial · ${kb(blob.size)}${model.art ? ` · sem o estilo (art ${model.art.style})` : ''}`) };
      }
      throw new Error(`exportação desconhecida "${kind}"`);
    }

    // ---------- o worker da exportação ----------
    // Um por vez: mudar uma opção, trocar o tipo ou fechar a janela o encerra na hora (stopJob). Sem worker (navegador
    // sem OffscreenCanvas, ou a página aberta como arquivo), o trabalho roda na página, como antes.
    const workerUrl = SELF ? SELF.replace(/export\.js(?=[?#]|$)/, 'worker.js') : null;
    let useWorker = !!workerUrl && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
    let stopJob = null;
    const cancelJob = () => { if (stopJob) stopJob(); };
    const PHASES = { recorte: 'Medindo o recorte', quadros: 'Desenhando', normal: 'Normal map', video: 'Gravando o vídeo' };
    function progress(phase, i, n) {
      const p = $('expProg');
      p.hidden = false;
      p.max = n;
      p.value = i;
      $('expInfo').textContent = `${PHASES[phase] || 'Gerando'}: quadro ${i} de ${n}…`;
    }
    function runJob(o, variants, all) {
      cancelJob();
      const p = $('expProg');
      p.hidden = false;
      p.removeAttribute('value');
      if (!useWorker) return exportJob(kind, o, (v) => app.parseFor(v), variants, all);
      const src = app.source();
      return new Promise((res, rej) => {
        let w;
        try { w = new Worker(workerUrl); } catch (e) { useWorker = false; res(runJob(o, variants, all)); return; }
        const end = () => { w.terminate(); if (stopJob === stop) stopJob = null; };
        const stop = () => { end(); res(null); };
        stopJob = stop;
        w.onmessage = (e) => {
          const m = e.data;
          // a janela fechou (sem depender do evento close, que nem todo navegador entrega na hora): para tudo
          if (!dlg.open) { stop(); $('expProg').hidden = true; return; }
          if (m.type === 'progress') { if (stopJob === stop) progress(m.phase, m.i, m.n); return; }
          end();
          if (m.type === 'done') res(m.result); else rej(new Error(m.message));
        };
        // o worker não abriu (sem OffscreenCanvas, scripts bloqueados…): faz na página
        w.onerror = (e) => { e.preventDefault(); end(); useWorker = false; res(runJob(o, variants, all)); };
        w.postMessage({ kind, o, text: src.text, file: src.file, files: src.files, variants, all });
      });
    }

    // mostra o resultado: a prévia, o resumo e os botões de baixar
    function show(r, transparent) {
      result = { blob: r.blob, name: r.name, png: r.png };
      const img = $('expImg');
      if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
      img.dataset.url = r.previewUrl || '';
      // o vídeo aparece num <video>, tocando sem parar; o resto (o GIF e o WebP animados também) numa imagem
      showVideo(r.video ? r.previewUrl : null);
      if (!r.video) img.src = r.previewUrl || r.preview;
      img.classList.toggle('checker', transparent);
      $('expInfo').textContent = r.info + (r.count > 1 ? ` · ${r.count} arquivos no .zip` : '');
      $('expDownload').textContent = r.count > 1 ? 'Baixar .zip' : `Baixar .${r.name.split('.').pop()}`;
      $('expDownload').disabled = false;
      $('expDownloadPng').disabled = !r.png;
    }

    function showVideo(url) {
      const vid = $('expVid');
      $('expImg').hidden = !!url;
      vid.hidden = !url;
      if (url) { vid.src = url; vid.play().catch(() => {}); } else if (vid.getAttribute('src')) { vid.pause(); vid.removeAttribute('src'); vid.load(); }
    }

    async function refresh() {
      const film = isFilm(), src = $('expAnim').value;
      $('expSpeedWrap').hidden = !(isAnim() && src === BUILD);
      // a sequência: o campo e o "Acrescentar"; começa com a animação do editor
      const seq = !film && isAnim() && src === SEQ;
      $('expSeqWrap').hidden = $('expSeqAddWrap').hidden = !seq;
      if (seq && !$('expSeq').value.trim()) $('expSeq').value = app.state().anim || app.model().anims[0].name;
      // a figurinha tem tamanho e fundo certos; o vídeo e o JPG não têm transparência
      const sticker = kind === 'webp' && $('expSticker').checked;
      $('expTransparent').disabled = kind === 'jpg' || kind === 'video' || sticker;
      $('expScale').disabled = $('expTrim').disabled = $('expMargin').disabled = sticker;
      const my = ++busy;
      cancelJob();
      result = null;
      $('expProg').hidden = true;
      $('expInfo').textContent = 'Gerando…';
      $('expDownload').disabled = $('expDownloadPng').disabled = true;
      await new Promise((r) => setTimeout(r, 30));
      if (my !== busy) return;
      const o = {
        scale: parseFloat($('expScale').value), transparent: $('expTransparent').checked && kind !== 'jpg' && kind !== 'video',
        trim: $('expTrim').checked, margin: parseInt($('expMargin').value, 10) || 0, quality: parseInt($('expQuality').value, 10) / 100,
        layout: $('expLayout').value, cols: parseInt($('expCols').value, 10) || 0, padding: parseInt($('expPad').value, 10) || 0,
        speed: parseFloat($('expSpeed').value) || 1, baseName: app.baseName(), format: kind, dither: $('expDither').checked, burn: $('expBurn').checked,
        seq: $('expSeq').value, minLength: parseFloat($('expMinLen').value) || 0, sticker, vfmt: $('expVidFmt').value,
      };
      if (heavy()) {
        // prévia do primeiro quadro; o resto só quando clicar
        try {
          const model = app.model(), tl = W.film.timeline(model), frames = filmFrames(model, $('expAnim').value);
          const cv = W.film.renderFrame(model, frames[0], { scale: o.scale, transparent: o.transparent && kind !== 'video', subs: o.burn });
          const img = $('expImg');
          if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
          img.dataset.url = '';
          showVideo(null);
          img.src = cv.toDataURL();
          img.classList.toggle('checker', o.transparent && kind !== 'video');
          $('expInfo').textContent = `${cv.width} × ${cv.height} px · ${frames.length} quadros · ${W.film.timecode(frames.length, tl.fps)} (min:seg:quadro)`;
          $('expDownload').textContent = { gif: 'Gerar GIF', video: `Gravar vídeo .${o.vfmt}`, seq: 'Gerar .zip' }[kind];
          $('expDownload').disabled = false;
          result = { lazy: true, o, frames, sel: $('expAnim').value };
        } catch (e) {
          $('expInfo').textContent = 'Não deu para exportar: ' + e.message;
        }
        return;
      }
      const vsel = $('expVariant').value;
      const variants = vsel === ALL ? ['', ...app.variants()] : [vsel];
      try {
        if (isJob()) {
          // a folha, o Godot, o GIF, o WebP e o vídeo: no worker (a página não trava), com a barra de progresso
          const r = await runJob(Object.assign(o, { anim: src, normal: $('expNormal').checked, rig: $('expRig').checked, scene: $('expGodotScene').checked, mirror: $('expMirror').checked }), variants, vsel === ALL);
          if (my !== busy || !r) return;
          $('expProg').hidden = true;
          show(Object.assign(r, { previewUrl: URL.createObjectURL(r.preview) }), o.transparent);
          return;
        }
        const all = [];
        let first = null;
        for (const v of variants) {
          const r = await produce(app.parseFor(v), Object.assign({}, o), v ? '_' + v : '');
          if (my !== busy) return;
          if (!first) first = r;
          all.push(...r.files);
        }
        let blob, name;
        if (all.length === 1) { blob = all[0].blob; name = all[0].name; } else {
          blob = W.zip(await Promise.all(all.map(async (f) => ({ name: f.name, data: await bytesOf(f.blob) }))));
          name = `${o.baseName}_${kind === 'godot' ? 'godot' : kind === 'sheet' ? 'sheet' : kind === 'nle' ? 'editor' : kind}${vsel === ALL ? '_variantes' : ''}.zip`;
        }
        if (my !== busy) return;
        const png = all.find((f) => f.png);
        show({ blob, name, png: png && vsel !== ALL ? png : null, info: first.info, count: all.length, previewUrl: first.previewUrl, preview: first.preview }, o.transparent);
      } catch (e) {
        if (my !== busy) return;
        $('expProg').hidden = true;
        $('expInfo').textContent = 'Não deu para exportar: ' + e.message;
      }
    }

    function filmFrames(model, v) {
      const tl = W.film.timeline(model), e = v !== '' ? tl.entries[+v] : null;
      const a = e ? e.start : 0, n = e ? e.frames : tl.frames;
      return Array.from({ length: n }, (_, i) => a + i);
    }
    // GIF, vídeo ou sequência de um filme, com progresso; fechar a janela cancela
    async function generate(r) {
      const my = ++busy;
      const model = app.model(), tl = W.film.timeline(model), o = r.o, n = r.frames.length;
      const e = r.sel !== '' ? tl.entries[+r.sel] : null;
      const base = o.baseName + (e ? '_' + e.name.replace(/[\\/]+/g, '-') : '');
      const cancelled = () => my !== busy || !dlg.open;
      const prog = (i) => { $('expInfo').textContent = `Gerando quadro ${i} de ${n}…`; };
      const btn = $('expDownload');
      btn.disabled = true;
      const t0 = performance.now();
      try {
        let blob, name;
        if (kind === 'video') {
          const first = W.film.renderFrame(model, r.frames[0], { scale: o.scale });
          const w = first.width + (first.width % 2), h = first.height + (first.height % 2);
          const pad = document.createElement('canvas');
          pad.width = w;
          pad.height = h;
          const px = pad.getContext('2d');
          // MP4 (H.264, toca no WhatsApp e no celular) ou WebM (VP9)
          const record = o.vfmt === 'webm' ? W.webm.record : W.mp4.record;
          const out = await record(n, tl.fps, w, h, (i) => {
            px.fillStyle = '#000';
            px.fillRect(0, 0, w, h);
            px.drawImage(W.film.renderFrame(model, r.frames[i], { scale: o.scale, subs: o.burn }), 0, 0);
            return pad;
          }, prog, cancelled);
          if (!out) return;
          blob = out.blob;
          name = `${base}.${o.vfmt === 'webm' ? 'webm' : 'mp4'}`;
        } else if (kind === 'seq') {
          const files = [];
          for (let i = 0; i < n; i++) {
            if (cancelled()) return;
            const cv = W.film.renderFrame(model, r.frames[i], { scale: o.scale, transparent: o.transparent, subs: o.burn });
            files.push({ name: `${o.baseName}_${String(r.frames[i]).padStart(5, '0')}.png`, data: await bytesOf(await toBlob(cv, 'image/png')) });
            prog(i + 1);
            if (i % 4 === 3) await W.webm.yieldTask();
          }
          blob = W.zip(files);
          name = `${base}_png.zip`;
        } else {
          const frames = [];
          for (let i = 0; i < n; i++) {
            if (cancelled()) return;
            const cv = W.film.renderFrame(model, r.frames[i], { scale: o.scale, transparent: o.transparent, subs: o.burn });
            frames.push(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height));
            prog(i + 1);
            if (i % 4 === 3) await W.webm.yieldTask();
          }
          blob = new Blob([W.gif.encode(frames, { delay: delays(n, tl.fps), loop: 0, transparent: o.transparent, dither: o.dither })], { type: 'image/gif' });
          name = `${base}.gif`;
        }
        if (cancelled()) return;
        download(blob, name);
        $('expInfo').textContent = `${name} · ${kb(blob.size)} · ${n} quadros em ${((performance.now() - t0) / 1000).toFixed(1)}s`;
      } catch (err) {
        if (my === busy) $('expInfo').textContent = 'Não deu para exportar: ' + err.message;
      } finally {
        if (my === busy) btn.disabled = false;
      }
    }

    function save(pngOnly) {
      if (!result) return;
      if (result.lazy) { generate(result); return; }
      if (pngOnly && result.png) download(result.png.blob, result.png.name);
      else download(result.blob, result.name);
    }

    dlg.addEventListener('close', () => { busy++; cancelJob(); $('expProg').hidden = true; $('expVid').pause(); });
    return {
      open(k) {
        kind = k || kind;
        const m = app.model();
        if (m.film) $('expBurn').checked = !!m.film.burn;
        dlg.showModal();
        sync();
      },
    };
  }

  W.exporter = { imageCanvas, trajectoryCanvas, svgText, gifBytes, webpBytes, videoFrames, frameList, parseSeq, isSeq, sheetCanvas, godotText, image, gif, sheet, contentRect, buildFiles, exportJob, download, setupDialog, BUILD, ALL, SEQ, solidBg };
})(window.Weasel = window.Weasel || {});
