/* Weasel — exportação: PNG, JPG, GIF animado e sprite sheet (PNG + JSON). */
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
              if (x < x0) x0 = x; if (x > x1) x1 = x;
              if (y < y0) y0 = y; if (y > y1) y1 = y;
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

  // As funções *Canvas / *Bytes não dependem do navegador: a linha de comando usa as mesmas.
  function imageCanvas(model, animName, frame, o) {
    const rect = o.rect || (o.trim ? contentRect(model, [animName || null], o.margin) : fullRect(model));
    return S.renderImage(model, S.makePose(model, animName, frame), { scale: o.scale, rect, transparent: o.format !== 'jpg' && o.transparent, guides: o.guides });
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
    const bytes = W.gif.encode(frames, { delay: d, loop: 0, transparent: o.transparent });
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
      let k = 0;
      list.forEach((name, r) => frameIdx(model, name).forEach((f, i) => { cells[k].col = i; cells[k].r = r; k++; }));
    } else {
      cols = o.cols > 0 ? o.cols : Math.ceil(Math.sqrt(cells.length));
      rows = Math.ceil(cells.length / cols);
      cells.forEach((c, k) => { c.col = k % cols; c.r = Math.floor(k / cols); });
    }
    const out = document.createElement('canvas');
    out.width = pad + cols * (fw + pad);
    out.height = pad + rows * (fh + pad);
    if (out.width * out.height > 16384 * 16384 || out.width > 16384 || out.height > 16384) throw new Error('a folha ficaria grande demais: diminua a escala');
    const ctx = out.getContext('2d');
    if (!o.transparent) { ctx.fillStyle = model.canvas.bg || '#ffffff'; ctx.fillRect(0, 0, out.width, out.height); }
    const json = { frames: {}, animations: {}, meta: {} };
    const tags = [];
    let flat = 0;
    for (const name of list) {
      const anim = name ? model.animMap.get(name) : null;
      const key = name || 'pose';
      const from = flat;
      json.animations[key] = [];
      for (const f of frameIdx(model, name)) {
        const c = cells[flat];
        const x = pad + c.col * (fw + pad), y = pad + c.r * (fh + pad);
        const cv = S.renderImage(model, S.makePose(model, name, f), { scale: o.scale, rect, transparent: o.transparent, guides: o.guides });
        ctx.drawImage(cv, x, y);
        const id = `${key}_${String(f).padStart(2, '0')}`;
        const root = model.unity ? model.unity.root : [rect.x + rect.w / 2, rect.y + rect.h];
        json.frames[id] = {
          frame: { x, y, w: fw, h: fh }, rotated: false, trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: fw, h: fh }, sourceSize: { w: fw, h: fh },
          pivot: { x: round3((root[0] - rect.x) / rect.w), y: round3((root[1] - rect.y) / rect.h) },
          duration: Math.round(1000 / (anim ? anim.fps : 12)),
        };
        json.animations[key].push(id);
        flat++;
      }
      tags.push({ name: key, from, to: flat - 1, direction: 'forward', fps: anim ? anim.fps : 12, loop: anim ? anim.loop : false });
    }
    json.meta = {
      app: 'Weasel', version: '1.0', image: o.imageName || 'sprites.png', format: 'RGBA8888',
      size: { w: out.width, h: out.height }, scale: String(o.scale), frameSize: { w: fw, h: fh }, padding: pad,
      frameTags: tags, sourceRect: rect,
    };
    if (model.unity) {
      json.meta.unity = {
        pixelsPerUnit: round3(model.unity.unit * o.scale),
        pivotBottomLeft: { x: round3((model.unity.root[0] - rect.x) / rect.w), y: round3(1 - (model.unity.root[1] - rect.y) / rect.h) },
        collider: model.unity.collider,
      };
    }
    return { canvas: out, json: JSON.stringify(json, null, 2), frames: cells.length, fw, fh };
  }
  const round3 = (v) => Math.round(v * 1000) / 1000;

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  const kb = (n) => (n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

  // ---------- janela de exportação ----------
  function setupDialog(app) {
    const dlg = document.getElementById('exportDlg');
    const $ = (id) => document.getElementById(id);
    let kind = 'png', result = null, busy = 0;

    dlg.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { kind = b.dataset.kind; sync(); }));
    for (const id of ['expAnim', 'expScale', 'expTransparent', 'expTrim', 'expMargin', 'expQuality', 'expLayout', 'expCols', 'expPad', 'expSpeed']) {
      $(id).addEventListener('change', () => refresh());
    }
    $('expDownload').addEventListener('click', () => save(false));
    $('expDownloadPng').addEventListener('click', () => save(true));

    function sync() {
      dlg.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('on', b.dataset.kind === kind));
      dlg.querySelectorAll('[data-show]').forEach((el) => { el.hidden = !el.dataset.show.split(' ').includes(kind); });
      const model = app.model();
      const sel = $('expAnim');
      const prev = sel.value;
      sel.innerHTML = '';
      const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
      if (kind === 'png' || kind === 'jpg') {
        const st = app.state();
        add('', st.anim ? `Quadro atual — ${st.anim}, quadro ${st.frame + 1}` : 'Pose parada (sem animação)');
      } else {
        for (const a of model.anims) add(a.name, `${a.name} — ${a.frames} quadros, ${a.fps} fps`);
        if (kind === 'gif') add(BUILD, 'Pintura passo a passo (como no vídeo)');
        if (kind === 'sheet' && model.anims.length > 1) add(ALL, 'Todas as animações');
        if (!model.anims.length && kind === 'sheet') add('', 'Pose parada');
        const want = [prev, app.state().anim].find((v) => v && [...sel.options].some((o) => o.value === v));
        if (want) sel.value = want;
      }
      $('expTransparent').disabled = kind === 'jpg';
      $('expDownloadPng').hidden = kind !== 'sheet';
      $('expDownload').textContent = kind === 'sheet' ? 'Baixar .zip (PNG + JSON)' : `Baixar .${kind}`;
      $('expSpeedWrap').hidden = !(kind === 'gif' && sel.value === BUILD);
      refresh();
    }

    async function refresh() {
      $('expSpeedWrap').hidden = !(kind === 'gif' && $('expAnim').value === BUILD);
      const my = ++busy;
      result = null;
      $('expInfo').textContent = 'Gerando…';
      $('expDownload').disabled = $('expDownloadPng').disabled = true;
      await new Promise((r) => setTimeout(r, 30));
      if (my !== busy) return;
      const model = app.model();
      const o = {
        scale: parseFloat($('expScale').value), transparent: $('expTransparent').checked && kind !== 'jpg',
        trim: $('expTrim').checked, margin: parseInt($('expMargin').value, 10) || 0, quality: parseInt($('expQuality').value, 10) / 100,
        layout: $('expLayout').value, cols: parseInt($('expCols').value, 10) || 0, padding: parseInt($('expPad').value, 10) || 0,
        speed: parseFloat($('expSpeed').value) || 1, baseName: app.baseName(), format: kind,
      };
      try {
        let r;
        if (kind === 'png' || kind === 'jpg') {
          const st = app.state();
          const x = await image(model, st.anim, st.frame, o);
          r = { blob: x.blob, preview: x.canvas, name: `${o.baseName}.${kind}`, info: `${x.canvas.width} × ${x.canvas.height} px · ${kb(x.blob.size)}` };
        } else if (kind === 'gif') {
          const src = $('expAnim').value;
          const x = await gif(model, src, o);
          r = { blob: x.blob, previewUrl: URL.createObjectURL(x.blob), name: `${o.baseName}_${src === BUILD ? 'pintura' : src}.gif`, info: `${x.width} × ${x.height} px · ${x.frames} quadros · ${kb(x.blob.size)}` };
        } else {
          const v = $('expAnim').value;
          const names = v === ALL ? model.anims.map((a) => a.name) : [v || null];
          const tag = v === ALL ? 'todas' : v || 'pose';
          o.imageName = `${o.baseName}_${tag}.png`;
          const x = await sheet(model, names, o);
          r = {
            blob: W.zip([
              { name: o.imageName, data: new Uint8Array(await x.png.arrayBuffer()) },
              { name: `${o.baseName}_${tag}.json`, data: new TextEncoder().encode(x.json) },
            ]),
            png: x.png, preview: x.canvas, name: `${o.baseName}_${tag}_sheet.zip`, pngName: `${o.baseName}_${tag}.png`,
            info: `${x.canvas.width} × ${x.canvas.height} px · ${x.frames} quadros de ${x.fw} × ${x.fh} · PNG ${kb(x.png.size)}`,
          };
        }
        if (my !== busy) return;
        result = r;
        const img = $('expImg');
        if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
        img.dataset.url = r.previewUrl || '';
        img.src = r.previewUrl || r.preview.toDataURL();
        img.classList.toggle('checker', o.transparent);
        $('expInfo').textContent = r.info;
        $('expDownload').disabled = $('expDownloadPng').disabled = false;
      } catch (e) {
        if (my !== busy) return;
        $('expInfo').textContent = 'Não deu para exportar: ' + e.message;
      }
    }

    function save(pngOnly) {
      if (!result) return;
      if (pngOnly && result.png) download(result.png, result.pngName);
      else download(result.blob, result.name);
    }

    return {
      open(k) {
        kind = k || kind;
        dlg.showModal();
        sync();
      },
    };
  }

  W.exporter = { imageCanvas, gifBytes, sheetCanvas, image, gif, sheet, contentRect, download, setupDialog, BUILD, ALL };
})(window.Weasel = window.Weasel || {});
