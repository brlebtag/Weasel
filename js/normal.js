/* Weasel — normal maps para a luz 2D do Godot. Cada forma vira um relevo: alta no meio, caindo em curva
   até a borda, empilhada sobre o que já estava embaixo (o olho fica em cima da cabeça). A inclinação
   desse relevo vira a cor da normal (convenção OpenGL, Y para cima, que é a que o Godot usa). */
(function (W) {
  'use strict';
  const S = W.scene;
  const NOPROPS = {};

  let maskCv = null;
  function maskCtx(w, h) {
    if (!maskCv) maskCv = document.createElement('canvas');
    if (maskCv.width !== w || maskCv.height !== h) { maskCv.width = w; maskCv.height = h; }
    const x = maskCv.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, w, h);
    return x;
  }

  // Distância euclidiana exata de cada pixel de dentro até a borda (Felzenszwalb & Huttenlocher):
  // uma passada por coluna e outra por linha, com o envelope de parábolas.
  const FAR = 1e10;
  function edt1d(f, n, d, v, z) {
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  }
  function distance(inside, w, h) {
    const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    const g = new Float64Array(w * h);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) f[y] = inside[y * w + x] ? FAR : 0;
      edt1d(f, h, d, v, z);
      for (let y = 0; y < h; y++) g[y * w + x] = d[y];
    }
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) f[x] = g[y * w + x];
      edt1d(f, w, d, v, z);
      for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]);
    }
    return out;
  }
  // desfoque de caixa (duas passadas, por linha e por coluna), para tirar o vinco do meio das formas
  function boxBlur(a, w, h, r) {
    if (r < 1) return;
    const tmp = new Float32Array(Math.max(w, h));
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[x] = acc / (2 * r + 1);
        acc += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)];
      }
      for (let x = 0; x < w; x++) a[y * w + x] = tmp[x];
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += a[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        tmp[y] = acc / (2 * r + 1);
        acc += a[Math.min(h - 1, y + r + 1) * w + x] - a[Math.max(0, y - r) * w + x];
      }
      for (let y = 0; y < h; y++) a[y * w + x] = tmp[y];
    }
  }

  // Altura (em pixels da imagem) de cada ponto do quadro.
  function heights(model, pose, rect, s, strength) {
    const Wd = Math.max(1, Math.round(rect.w * s)), Hd = Math.max(1, Math.round(rect.h * s));
    const H = new Float32Array(Wd * Hd);
    const x = maskCtx(Wd, Hd);
    const flatInk = model.finish.style === 'flat';
    for (const layer of model.layers) {
      // camadas de sombreado (clip, dentro de outra forma) e o que não recebe luz (unlit) não fazem relevo
      if (layer.clip || layer.unlit || !S.layerVisible(layer, pose, { guides: false })) continue;
      const lp = pose.lprops.get(layer.name) || NOPROPS;
      if (lp.show === 0 || layer.opacity * (lp.opacity !== undefined ? lp.opacity : 1) <= 0.02) continue;
      for (const it of layer.items) {
        const el = it.el;
        if (el.hidden || el.emit || el.type === 'emitter' || el.type === 'text') continue;
        const pr = pose.props.get(el.id) || NOPROPS;
        if (pr.show === 0 || el.opacity * (pr.opacity !== undefined ? pr.opacity : 1) <= 0.02) continue;
        const g = S.geometry(model, pose, el);
        if (!g.segs.length) continue;
        let lw = 0;
        if (el.closed) { const ink = pr.ink !== undefined ? pr.ink : el.ink; if (it.part !== 'fill' && ink > 0 && !flatInk) lw = ink; } else lw = el.limb ? Math.max(el.limb[0], el.limb[1]) : pr.w !== undefined ? pr.w : el.w;
        if (!el.closed && !(lw > 0)) continue;
        const bb = S.segsBox(g.segs);
        const x0 = Math.max(0, Math.floor((bb.x - lw - rect.x) * s) - 3), y0 = Math.max(0, Math.floor((bb.y - lw - rect.y) * s) - 3);
        const x1 = Math.min(Wd, Math.ceil((bb.x + bb.w + lw - rect.x) * s) + 3), y1 = Math.min(Hd, Math.ceil((bb.y + bb.h + lw - rect.y) * s) + 3);
        if (x1 - x0 < 1 || y1 - y0 < 1) continue;
        const bw = x1 - x0, bh = y1 - y0;
        x.setTransform(1, 0, 0, 1, 0, 0);
        x.clearRect(x0, y0, bw, bh);
        x.setTransform(s, 0, 0, s, -rect.x * s, -rect.y * s);
        x.fillStyle = x.strokeStyle = '#ffffff';
        x.lineJoin = 'round';
        x.lineCap = 'round';
        const path = S.pathOf(g);
        if (el.closed && it.part !== 'ink') x.fill(path);
        if (lw > 0) { x.lineWidth = lw; x.stroke(path); }
        const img = x.getImageData(x0, y0, bw, bh).data;
        const inside = new Uint8Array(bw * bh), a = new Float32Array(bw * bh);
        for (let i = 0; i < bw * bh; i++) { a[i] = img[i * 4 + 3] / 255; inside[i] = a[i] > 0.5 ? 1 : 0; }
        const d = distance(inside, bw, bh);
        let R = 0;
        for (let i = 0; i < d.length; i++) if (d[i] > R) R = d[i];
        if (R < 0.5) continue;
        // perfil de meio círculo (sobe rápido na borda e achata no meio), suavizado e recortado pela forma
        const hb = new Float32Array(bw * bh);
        for (let q = 0; q < hb.length; q++) { const t = Math.min(1, d[q] / R); hb[q] = R * Math.sqrt(1 - (1 - t) * (1 - t)); }
        const rb = Math.round(R * 0.18);
        boxBlur(hb, bw, bh, rb);
        boxBlur(hb, bw, bh, rb);
        for (let j = 0; j < bh; j++) {
          for (let i = 0; i < bw; i++) {
            const q = j * bw + i;
            if (a[q]) H[(y0 + j) * Wd + x0 + i] += hb[q] * a[q] * strength;
          }
        }
      }
    }
    return { H, Wd, Hd };
  }

  // Normal map de um quadro. alpha: os pixels do quadro colorido (a transparência é copiada dele).
  function frame(model, pose, o) {
    const s = o.scale || 1, rect = o.rect;
    const { H, Wd, Hd } = heights(model, pose, rect, s, o.strength !== undefined ? o.strength : 1);
    const out = document.createElement('canvas');
    out.width = Wd;
    out.height = Hd;
    const oc = out.getContext('2d');
    const im = oc.createImageData(Wd, Hd), D = im.data, A = o.alpha;
    const at = (x, y) => H[Math.min(Hd - 1, Math.max(0, y)) * Wd + Math.min(Wd - 1, Math.max(0, x))];
    for (let y = 0; y < Hd; y++) {
      for (let x = 0; x < Wd; x++) {
        const i = y * Wd + x;
        // inclinação pelo filtro de Sobel
        const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 8;
        const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8;
        const l = Math.sqrt(gx * gx + gy * gy + 1);
        D[i * 4] = Math.round(((-gx / l) * 0.5 + 0.5) * 255);
        D[i * 4 + 1] = Math.round(((gy / l) * 0.5 + 0.5) * 255); // Y para cima: o lado de cima da forma fica verde
        D[i * 4 + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
        D[i * 4 + 3] = A ? A[i * 4 + 3] : 255;
      }
    }
    oc.putImageData(im, 0, 0);
    return out;
  }

  // Normal map da sprite sheet inteira, na mesma arrumação (r = resultado de exporter.sheetCanvas).
  function sheet(model, r, o) {
    const out = document.createElement('canvas');
    out.width = r.canvas.width;
    out.height = r.canvas.height;
    const ctx = out.getContext('2d');
    const color = r.canvas.getContext('2d');
    for (const c of r.cells) {
      const alpha = color.getImageData(c.x, c.y, r.fw, r.fh).data;
      const n = frame(model, S.makePose(model, c.name, c.f), { rect: r.rect, scale: r.scale, strength: o && o.strength, alpha });
      ctx.drawImage(n, c.x, c.y);
    }
    return out;
  }

  W.normal = { frame, sheet };
})(window.Weasel = window.Weasel || {});
