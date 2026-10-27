/* Weasel — exportação: PNG, JPG, GIF animado, SVG, sprite sheet (PNG + JSON) e SpriteFrames do Godot. */
(function (W) {
  'use strict';
  const S = W.scene;
  const BUILD = '__build__', ALL = '__all__';

  const frameIdx = (model, name) => {
    const a = name ? model.animMap.get(name) : null;
    return a ? Array.from({ length: a.frames }, (_, i) => i) : [0];
  };

  // Retângulo (em unidades do canvas) que contém tudo o que é desenhado nas animações dadas.
  function contentRect(model, names, margin) {
    const c = model.canvas;
    const s = Math.min(1, 640 / Math.max(c.w, c.h));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const name of names) {
      for (const f of frameIdx(model, name)) {
        const img = S.renderImage(model, S.makePose(model, name, f), { scale: s, transparent: true });
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
  const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));
  const solidBg = (model) => { const bg = model.canvas.bg; return typeof bg === 'string' ? bg : bg && bg.stops ? bg.stops[0].c : '#ffffff'; };

  // As funções *Canvas / *Bytes / *Text não dependem do navegador: a linha de comando usa as mesmas.
  function imageCanvas(model, animName, frame, o) {
    const rect = o.rect || (o.trim ? contentRect(model, [animName || null], o.margin) : fullRect(model));
    return S.renderImage(model, S.makePose(model, animName, frame), { scale: o.scale, rect, transparent: o.format !== 'jpg' && o.transparent, guides: o.guides });
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

  async function gifBytes(model, source, o) {
    const frames = [];
    let fps, d;
    let preview = null;
    if (source === BUILD) {
      const rect = o.trim ? contentRect(model, [null], o.margin) : fullRect(model);
      const plan = S.buildPlan(model, { speed: o.speed || 1, guides: o.guides });
      const pose = S.makePose(model, null, 0);
      fps = 20;
      const n = Math.ceil(plan.total * fps) + 1;
      for (let i = 0; i <= n; i++) {
        const bf = S.buildFilter(plan, i / fps);
        const cv = S.renderImage(model, pose, {
          scale: o.scale, rect, transparent: o.transparent, filter: bf.filter,
          after: (ctx, s) => S.drawTrace(ctx, model, pose, plan, bf.st, s),
        });
        frames.push(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height));
        preview = cv;
      }
      d = delays(frames.length, fps);
      d[d.length - 1] = 200;
    } else {
      const rect = o.trim ? contentRect(model, [source], o.margin) : fullRect(model);
      const anim = model.animMap.get(source);
      fps = anim ? anim.fps : 12;
      for (const f of frameIdx(model, source)) {
        const cv = S.renderImage(model, S.makePose(model, source, f), { scale: o.scale, rect, transparent: o.transparent, guides: o.guides });
        frames.push(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height));
        if (!preview) preview = cv;
      }
      d = delays(frames.length, fps);
    }
    await new Promise((r) => setTimeout(r, 0));
    const bytes = W.gif.encode(frames, { delay: d, loop: 0, transparent: o.transparent, dither: o.dither });
    return { bytes, width: frames[0].width, height: frames[0].height, frames: frames.length, preview };
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
    const rect = o.trim ? contentRect(model, list, o.margin) : fullRect(model);
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
        const cv = S.renderImage(model, S.makePose(model, name, f), { scale: o.scale, rect, transparent: o.transparent, guides: o.guides });
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
        for (const n of fe) events.push({ animation: key, frame: f, name: n });
        json.animations[key].push(id);
        flat++;
      }
      tags.push({ name: key, from, to: flat - 1, direction: 'forward', fps: anim ? anim.fps : 12, loop: anim ? anim.loop : false });
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
    return { canvas: out, json: JSON.stringify(json, null, 2), frames: cells.length, fw, fh, cells, list };
  }
  const round3 = (v) => Math.round(v * 1000) / 1000;

  // SpriteFrames do Godot 4 (.tres) apontando para a folha; deixe o .png e o .tres na mesma pasta.
  function godotText(model, r, imagePath) {
    const out = [`[gd_resource type="SpriteFrames" load_steps=${r.cells.length + 2} format=3]`, '', `[ext_resource type="Texture2D" path="${imagePath}" id="1_sheet"]`, ''];
    r.cells.forEach((c, i) => out.push(`[sub_resource type="AtlasTexture" id="AtlasTexture_${i}"]`, 'atlas = ExtResource("1_sheet")', `region = Rect2(${c.x}, ${c.y}, ${r.fw}, ${r.fh})`, ''));
    const anims = r.list.map((name) => {
      const a = name ? model.animMap.get(name) : null;
      const frames = [];
      r.cells.forEach((c, i) => { if (c.name === name) frames.push(`{\n"duration": 1.0,\n"texture": SubResource("AtlasTexture_${i}")\n}`); });
      return `{\n"frames": [${frames.join(', ')}],\n"loop": ${a ? a.loop : true},\n"name": &"${name || 'default'}",\n"speed": ${(a ? a.fps : 5).toFixed(1)}\n}`;
    });
    out.push('[resource]', `animations = [${anims.join(', ')}]`, '');
    return out.join('\n');
  }

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

  // ---------- janela de exportação ----------
  function setupDialog(app) {
    const dlg = document.getElementById('exportDlg');
    const $ = (id) => document.getElementById(id);
    let kind = 'png', result = null, busy = 0;

    dlg.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { kind = b.dataset.kind; sync(); }));
    for (const id of ['expAnim', 'expVariant', 'expScale', 'expTransparent', 'expTrim', 'expMargin', 'expQuality', 'expLayout', 'expCols', 'expPad', 'expSpeed', 'expDither']) {
      $(id).addEventListener('change', () => refresh());
    }
    $('expDownload').addEventListener('click', () => save(false));
    $('expDownloadPng').addEventListener('click', () => save(true));

    const isSheet = () => kind === 'sheet' || kind === 'godot';
    const isFrame = () => kind === 'png' || kind === 'jpg' || kind === 'svg';
    const isFilm = () => !!app.model().film;
    // filme: GIF, vídeo e sequência só são gerados quando a pessoa pede (podem ser muitos quadros)
    const heavy = () => isFilm() && (kind === 'gif' || kind === 'video' || kind === 'seq');

    function sync() {
      const film = isFilm();
      dlg.querySelectorAll('[data-kind]').forEach((b) => { b.hidden = b.dataset.for === (film ? 'draw' : 'film'); });
      if (dlg.querySelector(`[data-kind="${kind}"]`).hidden) kind = 'png';
      dlg.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('on', b.dataset.kind === kind));
      dlg.querySelectorAll('[data-show]').forEach((el) => { el.hidden = !el.dataset.show.split(' ').includes(kind); });
      dlg.querySelectorAll('[data-hide="film"]').forEach((el) => { el.hidden = film; });
      const model = app.model();
      const sel = $('expAnim');
      const prev = sel.value;
      sel.innerHTML = '';
      const add = (s, v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); };
      if (film) {
        const tl = W.film.timeline(model), st = app.state();
        if (kind === 'png' || kind === 'jpg') {
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
        if (kind === 'gif') add(sel, BUILD, 'Pintura passo a passo (como no vídeo)');
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
      $('expTransparent').disabled = kind === 'jpg';
      $('expDownloadPng').hidden = !isSheet();
      refresh();
    }

    // Gera os arquivos de uma variante.
    async function produce(model, o, suffix) {
      const base = o.baseName + suffix;
      const st = app.state();
      if (model.film) {
        const cv = W.film.renderFrame(model, st.frame, { scale: o.scale, transparent: o.transparent });
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
        return { files: [{ name: `${base}.svg`, blob }], previewUrl: URL.createObjectURL(blob), info: `SVG vetorial · ${kb(blob.size)}` };
      }
      if (kind === 'gif') {
        const src = $('expAnim').value;
        const x = await gif(model, src, o);
        return { files: [{ name: `${base}_${src === BUILD ? 'pintura' : src}.gif`, blob: x.blob }], previewUrl: URL.createObjectURL(x.blob), info: `${x.width} × ${x.height} px · ${x.frames} quadros · ${kb(x.blob.size)}` };
      }
      const v = $('expAnim').value;
      const names = v === ALL ? model.anims.map((a) => a.name) : [v || null];
      const tag = (v === ALL ? 'todas' : v || 'pose') + suffix;
      o.imageName = `${o.baseName}_${tag}.png`;
      const x = await sheet(model, names, o);
      const files = [{ name: o.imageName, blob: x.png, png: true }];
      if (kind === 'sheet') files.push({ name: `${o.baseName}_${tag}.json`, blob: new Blob([x.json], { type: 'application/json' }) });
      else files.push({ name: `${o.baseName}_${tag}.tres`, blob: new Blob([godotText(model, x, o.imageName)], { type: 'text/plain' }) });
      return { files, preview: x.canvas.toDataURL(), info: `${x.canvas.width} × ${x.canvas.height} px · ${x.frames} quadros de ${x.fw} × ${x.fh} · PNG ${kb(x.png.size)}` };
    }

    async function refresh() {
      $('expSpeedWrap').hidden = !(kind === 'gif' && $('expAnim').value === BUILD);
      const my = ++busy;
      result = null;
      $('expInfo').textContent = 'Gerando…';
      $('expDownload').disabled = $('expDownloadPng').disabled = true;
      await new Promise((r) => setTimeout(r, 30));
      if (my !== busy) return;
      const o = {
        scale: parseFloat($('expScale').value), transparent: $('expTransparent').checked && kind !== 'jpg',
        trim: $('expTrim').checked, margin: parseInt($('expMargin').value, 10) || 0, quality: parseInt($('expQuality').value, 10) / 100,
        layout: $('expLayout').value, cols: parseInt($('expCols').value, 10) || 0, padding: parseInt($('expPad').value, 10) || 0,
        speed: parseFloat($('expSpeed').value) || 1, baseName: app.baseName(), format: kind, dither: $('expDither').checked,
      };
      if (heavy()) {
        // prévia do primeiro quadro; o resto só quando clicar
        try {
          const model = app.model(), tl = W.film.timeline(model), frames = filmFrames(model, $('expAnim').value);
          const cv = W.film.renderFrame(model, frames[0], { scale: o.scale, transparent: o.transparent && kind !== 'video' });
          const img = $('expImg');
          if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
          img.dataset.url = '';
          img.src = cv.toDataURL();
          img.classList.toggle('checker', o.transparent && kind !== 'video');
          $('expInfo').textContent = `${cv.width} × ${cv.height} px · ${frames.length} quadros · ${W.film.timecode(frames.length, tl.fps)} (min:seg:quadro)`;
          $('expDownload').textContent = { gif: 'Gerar GIF', video: 'Gravar vídeo .webm', seq: 'Gerar .zip' }[kind];
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
          name = `${o.baseName}_${kind === 'godot' ? 'godot' : kind === 'sheet' ? 'sheet' : kind}${vsel === ALL ? '_variantes' : ''}.zip`;
        }
        if (my !== busy) return;
        const png = all.find((f) => f.png);
        result = { blob, name, png: png && vsel !== ALL ? png : null };
        const img = $('expImg');
        if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
        img.dataset.url = first.previewUrl || '';
        img.src = first.previewUrl || first.preview;
        img.classList.toggle('checker', o.transparent);
        $('expInfo').textContent = first.info + (all.length > 1 ? ` · ${all.length} arquivos no .zip` : '');
        $('expDownload').textContent = all.length > 1 ? 'Baixar .zip' : `Baixar .${name.split('.').pop()}`;
        $('expDownload').disabled = false;
        $('expDownloadPng').disabled = !result.png;
      } catch (e) {
        if (my !== busy) return;
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
          const out = await W.webm.record(n, tl.fps, w, h, (i) => {
            px.fillStyle = '#000';
            px.fillRect(0, 0, w, h);
            px.drawImage(W.film.renderFrame(model, r.frames[i], { scale: o.scale }), 0, 0);
            return pad;
          }, prog, cancelled);
          if (!out) return;
          blob = out.blob;
          name = `${base}.webm`;
        } else if (kind === 'seq') {
          const files = [];
          for (let i = 0; i < n; i++) {
            if (cancelled()) return;
            const cv = W.film.renderFrame(model, r.frames[i], { scale: o.scale, transparent: o.transparent });
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
            const cv = W.film.renderFrame(model, r.frames[i], { scale: o.scale, transparent: o.transparent });
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

    dlg.addEventListener('close', () => { busy++; });
    return {
      open(k) {
        kind = k || kind;
        dlg.showModal();
        sync();
      },
    };
  }

  W.exporter = { imageCanvas, svgText, gifBytes, sheetCanvas, godotText, image, gif, sheet, contentRect, download, setupDialog, BUILD, ALL, solidBg };
})(window.Weasel = window.Weasel || {});
