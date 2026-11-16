/* Weasel — a vista Camadas em 3D (etapa 1b do plano docs/planos/interface-illustrator.md, seção 11.2).
   Cada linha do painel Camadas (uma forma, um use, um include) vira uma peça: uma tela pintada pelo próprio
   drawScene, só com aquela linha, posta num plano no espaço. As camadas se afastam umas das outras (e, se quiser,
   as formas dentro de cada camada), e a câmera gira em volta. Nada aqui muda o desenho: é só um jeito de olhar.
   A escolha é a mesma do desenho e do código (clicar numa peça escolhe a linha dela). */
(function (W) {
  'use strict';
  const A = W.app, S = W.scene;
  if (!A || !S) return;
  const st = A.st;
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const EYE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8s2.4-4.2 6.5-4.2S14.5 8 14.5 8s-2.4 4.2-6.5 4.2S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.9"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8s2.4-4.2 6.5-4.2S14.5 8 14.5 8s-2.4 4.2-6.5 4.2S1.5 8 1.5 8z" opacity=".45"/><path d="M2.5 13.5 13.5 2.5"/></svg>';
  const BG = '\u0000fundo';
  const TOP = 46; // a altura da barrinha de cima, com as margens
  // o blend= da camada (o modo do canvas) no mix-blend-mode da peça
  const CSS_BLEND = new Set(['multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity']);
  const blendOf = (b) => (CSS_BLEND.has(b) ? b : b === 'lighter' ? 'plus-lighter' : '');

  // ---------- a tela ----------
  const root = document.createElement('div');
  root.className = 'v3';
  root.hidden = true;
  root.innerHTML = `<div class="v3-space"></div><div class="v3-labels"></div>
    <div class="v3-bar" role="toolbar" aria-label="Camadas em 3D">
      <button type="button" data-go="explode" title="Afasta as camadas e gira um pouco">Explodir</button>
      <button type="button" data-go="front" title="Olha de frente, sem girar (Ctrl+0)">De frente</button>
      <button type="button" data-go="side" title="Olha quase de lado">De lado</button>
      <button type="button" data-go="join" title="Junta as camadas de volta, de frente">Juntar</button>
      <label title="Quanto as camadas se afastam umas das outras, em pixels do desenho">Camadas <input type="range" class="v3-gap" min="0" max="100" step="1"></label>
      <label title="Quanto as formas de uma mesma camada se afastam umas das outras">Formas <input type="range" class="v3-gapf" min="0" max="100" step="1"></label>
      <label title="As molduras do papel e os nomes das camadas"><input type="checkbox" class="v3-frames" checked> Molduras e nomes</label>
      <button type="button" class="ic v3-close" title="Fechar as camadas em 3D (volta ao desenho)" aria-label="Fechar">✕</button>
    </div>
    <div class="v3-info" hidden></div>`;
  stage.insertBefore(root, $('view').nextSibling);
  const space = root.querySelector('.v3-space'), labelBox = root.querySelector('.v3-labels'), info = root.querySelector('.v3-info');
  const gapIn = root.querySelector('.v3-gap'), gapFIn = root.querySelector('.v3-gapf'), framesIn = root.querySelector('.v3-frames');
  const z3d = $('z3d');

  // ---------- o estado ----------
  // a câmera olha para o meio da pilha (mais pan), de longe (D); F é a lente (o zoom: F/D é a escala no meio)
  const cam = { yaw: 0, pitch: 0, F: 1, pan: [0, 0, 0], gap: 0, gapF: 0 };
  let open = false, dims = null, lays = [], pieces = [], bg = null, order = [], built = null, hot = null, dimFn = null;
  let anim = 0, timer = 0, resTimer = 0, busyUntil = 0, hiddenVer = 0;
  const hidden = new Set(); // camadas escondidas só aqui (pelo olho); vale enquanto a página estiver aberta

  // ---------- as peças ----------
  function newCanvas(cls) {
    const c = document.createElement('canvas');
    c.className = cls || '';
    space.appendChild(c);
    return c;
  }
  // a resolução das telas: a da tela do computador no zoom atual (com degraus, para não repintar a cada passo)
  function quantK() {
    if (!dims) return 1;
    const k = clamp((window.devicePixelRatio || 1) * cam.F / dims.D, 0.25, 3);
    return Math.pow(2, Math.round(Math.log2(k) * 2) / 2);
  }
  // a caixa do que a linha pinta: a das curvas com uma folga; o que espalha (efeitos, partículas, luz) usa o papel
  function boxOf(m, pose, els, wide, limit) {
    if (wide) return limit;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const pad0 = 8 + 0.02 * dims.size;
    for (const el of els) {
      if (el.type === 'emitter' || el.emit) return limit;
      const g = S.geometry(m, pose, el);
      if (!g || !g.segs || !g.segs.length) return limit;
      const b = S.segsBox(g.segs), pad = pad0 + 4 * (Number(el.ink) || 0) + 2 * (Number(el.w) || 0);
      x0 = Math.min(x0, b.x - pad); y0 = Math.min(y0, b.y - pad);
      x1 = Math.max(x1, b.x + b.w + pad); y1 = Math.max(y1, b.y + b.h + pad);
    }
    x0 = Math.max(x0, limit.x); y0 = Math.max(y0, limit.y);
    x1 = Math.min(x1, limit.x + limit.w); y1 = Math.min(y1, limit.y + limit.h);
    if (!(x1 > x0 && y1 > y0)) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function sizeCanvas(p, k) {
    const b = p.box;
    k = Math.min(k, 4096 / b.w, 4096 / b.h, Math.sqrt(12e6 / (b.w * b.h)));
    const w = Math.max(1, Math.ceil(b.w * k)), h = Math.max(1, Math.ceil(b.h * k)), c = p.cv;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    c.style.width = `${w / k}px`;
    c.style.height = `${h / k}px`;
    p.k = k; p.cw = w / k; p.ch = h / k; p.alpha = null;
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, w, h);
    x.setTransform(k, 0, 0, k, -b.x * k, -b.y * k);
    return x;
  }
  function paint(p, m, pose, lighting, k, limit) {
    const draw = () => S.drawScene(sizeCanvas(p, k), m, pose, { background: false, glows: false, layers: new Set([p.layer]), items: new Set(p.items), lighting });
    draw();
    // se a folga não bastou (algo encosta na borda), pinta de novo com a caixa grande
    if (p.box !== limit && touchesEdge(p.cv)) { p.box = limit; draw(); }
  }
  function touchesEdge(c) {
    const x = c.getContext('2d'), w = c.width, h = c.height;
    const strips = [x.getImageData(0, 0, w, 1), x.getImageData(0, h - 1, w, 1), x.getImageData(0, 0, 1, h), x.getImageData(w - 1, 0, 1, h)];
    for (const s of strips) for (let i = 3; i < s.data.length; i += 4) if (s.data[i]) return true;
    return false;
  }

  // o papel (o do desenho, ou o da prévia de um def) e as medidas que saem dele
  function setDims() {
    const paper = A.paper(), size = Math.max(paper.w, paper.h);
    if (!dims || dims.paper.w !== paper.w || dims.paper.h !== paper.h) gapIn.max = gapFIn.max = String(Math.max(1, Math.round(size / 4)));
    // outro papel (outro arquivo, a prévia de um def): o zoom fica o mesmo
    if (dims && dims.size !== size) cam.F *= size / dims.size;
    dims = { paper, size, D: 2.6 * size };
    return paper;
  }
  function build() {
    const m = A.model();
    if (!m) { clear(); return; }
    const pose = A.pose(), paper = setDims();
    const k = quantK(), lighting = S.sceneLights(m, pose);
    const limit = { x: paper.x - paper.w / 2, y: paper.y - paper.h / 2, w: paper.w * 2, h: paper.h * 2 };
    const tree = A.layerTree(m), lineOf = new Map(), layerLine = new Map();
    for (const t of tree) {
      layerLine.set(t.layer, t.line);
      for (const kd of t.kids) for (const el of kd.els) lineOf.set(el, kd);
    }
    const old = new Map(pieces.map((p) => [p.id, p]));
    const next = [], nextLays = [];
    for (const L of S.orderLayers(m, pose)) {
      if (!S.layerVisible(L, pose, { guides: st.show.guides })) continue;
      const lp = pose.lprops.get(L.name) || {};
      if (lp.show === 0) continue;
      const lay = { layer: L, line: layerLine.has(L) ? layerLine.get(L) : -1, eye: !hidden.has(L.name), pieces: [], z: 0 };
      nextLays.push(lay);
      if (!lay.eye) continue;
      let items = S.orderItems(L.items, pose);
      if (L.zsort && m.has3d) items = S.zSort(m, pose, items);
      // uma peça por linha do painel Camadas, na ordem em que a camada pinta
      const groups = new Map();
      for (const it of items) {
        const el = it.el, pr = S.propsOf(pose, el);
        if ((el.hidden && !pr.reveal) || pr.show === 0) continue;
        const kd = lineOf.get(el), id = `${L.name}|${kd ? 'l' + kd.line : 'e' + el.id}`;
        let g = groups.get(id);
        if (!g) { g = { id, kid: kd || null, items: [], els: [] }; groups.set(id, g); }
        g.items.push(it);
        if (!g.els.includes(el)) g.els.push(el);
      }
      const wide = !!(S.layerFx(L, lp) || L.trail || (L.cast && lighting));
      for (const g of groups.values()) {
        const box = boxOf(m, pose, g.els, wide, limit);
        if (!box) continue;
        let p = old.get(g.id);
        if (p) old.delete(g.id);
        else p = { id: g.id, cv: newCanvas() };
        Object.assign(p, { layer: L, lay, kid: g.kid, line: g.kid ? g.kid.line : -1, items: g.items, els: g.els, box });
        paint(p, m, pose, lighting, k, limit);
        const bl = blendOf(L.blend);
        if (p.cv.style.mixBlendMode !== bl) p.cv.style.mixBlendMode = bl;
        lay.pieces.push(p);
        next.push(p);
      }
    }
    for (const p of old.values()) { p.cv.width = 0; p.cv.remove(); }
    pieces = next;
    lays = nextLays;
    // o fundo: o papel com o bg= (ou o xadrez, sem bg=)
    if (!bg) bg = { id: BG, bg: true, cv: newCanvas('v3-bg'), frame: null };
    bg.box = paper;
    bg.eye = !hidden.has(BG);
    bg.cv.hidden = !bg.eye;
    const bx = sizeCanvas(bg, Math.min(k, 1));
    if (m.canvas.bg) S.fillBg(bx, m, pose, paper);
    bg.cv.classList.toggle('checker', !m.canvas.bg);
    built = { m, key: buildKey(), k };
    makeFrames();
    syncSel();
    applyDim();
  }
  function clear() {
    for (const p of pieces) { p.cv.width = 0; p.cv.remove(); }
    pieces = [];
    lays = [];
    if (bg) { bg.cv.width = 0; bg.cv.remove(); bg = null; }
    space.querySelectorAll('.v3-frame').forEach((f) => f.remove());
    labelBox.textContent = '';
    built = null;
    hot = null;
  }
  const buildKey = () => [st.anim, st.frame, st.show.guides, st.variant, hiddenVer, quantK()].join('|');

  // as molduras (o papel de cada camada) e os nomes, com o olho
  function makeFrames() {
    space.querySelectorAll('.v3-frame').forEach((f) => f.remove());
    labelBox.textContent = '';
    const P = dims.paper;
    const add = (lay, name, n, key) => {
      const f = document.createElement('div');
      f.className = 'v3-frame';
      f.style.width = `${P.w}px`;
      f.style.height = `${P.h}px`;
      space.appendChild(f);
      const l = document.createElement('div');
      l.className = 'v3-label' + (lay.eye ? '' : ' off');
      l.innerHTML = `<button type="button" class="v3-eye" data-key="${esc(key)}" title="${lay.eye ? 'Esconder' : 'Mostrar'} só aqui na vista 3D (o desenho não muda)">${lay.eye ? EYE : EYE_OFF}</button><span></span>`;
      l.querySelector('span').textContent = n === null ? name : `${name} · ${n}`;
      labelBox.appendChild(l);
      lay.frame = f;
      lay.label = l;
    };
    add(bg, 'fundo', null, BG);
    for (const lay of lays) add(lay, lay.layer.name, lay.eye ? lay.pieces.length : '—', lay.layer.name);
  }
  labelBox.addEventListener('click', (e) => {
    const b = e.target.closest('.v3-eye');
    if (!b) return;
    const k = b.dataset.key;
    if (hidden.has(k)) hidden.delete(k); else hidden.add(k);
    hiddenVer++;
    rebuild();
  });
  labelBox.addEventListener('mousedown', (e) => e.preventDefault());

  // ---------- a câmera ----------
  // A câmera fica a D do alvo, na direção dir (yaw gira em volta do eixo de cima, pitch sobe). r e u são a direita e
  // o "para baixo" da tela; f é para onde ela olha. x vai para a direita, y para baixo e z sai da tela (as camadas de
  // cima ficam mais perto de quem olha de frente).
  function layoutZ() {
    let z = 0;
    lays.forEach((lay, i) => {
      if (i) z += cam.gap;
      lay.z = z;
      lay.pieces.forEach((p, j) => { if (j) z += cam.gapF; p.z = z; });
    });
    if (bg) bg.z = lays.length ? -Math.max(cam.gap, cam.gapF) : 0;
    return { z0: bg ? bg.z : 0, z1: z };
  }
  function basis() {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const dir = [sy * cp, -sp, cy * cp], r = [cy, 0, -sy];
    const u = [dir[1] * r[2] - dir[2] * r[1], dir[2] * r[0] - dir[0] * r[2], dir[0] * r[1] - dir[1] * r[0]];
    const f = [-dir[0], -dir[1], -dir[2]];
    const zz = layoutZ(), P = dims.paper, D = dims.D;
    const T = [P.x + P.w / 2 + cam.pan[0], P.y + P.h / 2 + cam.pan[1], (zz.z0 + zz.z1) / 2 + cam.pan[2]];
    const C = [T[0] + D * dir[0], T[1] + D * dir[1], T[2] + D * dir[2]];
    // o meio da vista fica no espaço abaixo da barrinha de cima
    return { r, u, f, C, T, cx: space.clientWidth / 2, cy: (TOP + space.clientHeight) / 2 };
  }
  // A matriz que leva um ponto (u, v) da peça (em pixels do desenho, a partir do canto x, y, na altura z) para a
  // tela, com a perspectiva: X/W, Y/W. É a matrix3d do CSS (a linha do z fica parada, para ela ter inversa).
  function matOf(B, x, y, z) {
    const o = [x - B.C[0], y - B.C[1], z - B.C[2]], F = cam.F, { r, u, f, cx, cy } = B;
    const w3 = dot(f, o);
    if (w3 <= 0) return null;
    const M = [F * r[0] + cx * f[0], F * r[1] + cx * f[1], F * dot(r, o) + cx * w3,
      F * u[0] + cy * f[0], F * u[1] + cy * f[1], F * dot(u, o) + cy * w3,
      f[0], f[1], w3];
    for (let i = 0; i < 9; i++) M[i] /= w3;
    return M;
  }
  const css3d = (M) => `matrix3d(${M[0]},${M[3]},0,${M[6]},${M[1]},${M[4]},0,${M[7]},0,0,1,0,${M[2]},${M[5]},0,${M[8]})`;
  // os quatro cantos têm de estar na frente da câmera (e não colados nela)
  function inFront(M, w, h) {
    const near = 0.05;
    return M[8] > near && M[6] * w + M[8] > near && M[7] * h + M[8] > near && M[6] * w + M[7] * h + M[8] > near;
  }
  function project(B, x, y, z) {
    const q = [x - B.C[0], y - B.C[1], z - B.C[2]], d = dot(q, B.f);
    if (d <= 1e-6) return null;
    return [B.cx + cam.F * dot(q, B.r) / d, B.cy + cam.F * dot(q, B.u) / d];
  }

  function render() {
    if (!open || !dims || !space.clientWidth) return;
    const B = basis(), P = dims.paper;
    space.style.setProperty('--v3px', `${(dims.D / cam.F).toFixed(3)}px`);
    const place = (el, M, w, h) => {
      const ok = !!M && inFront(M, w, h);
      el.style.visibility = ok ? '' : 'hidden';
      if (ok) el.style.transform = css3d(M);
      return ok;
    };
    // a ordem de pintura: os planos mais longe da câmera primeiro (todos são paralelos, então basta o z)
    const list = [];
    if (bg) { bg.M = matOf(B, P.x, P.y, bg.z); bg.vis = bg.eye && place(bg.cv, bg.M, P.w, P.h); list.push({ el: bg.cv, z: bg.z, n: -2 }); }
    let n = 0;
    for (const lay of lays) {
      const M = matOf(B, P.x, P.y, lay.z);
      if (lay.frame) { place(lay.frame, M, P.w, P.h); list.push({ el: lay.frame, z: lay.z, n: n - 0.5 }); }
      for (const p of lay.pieces) {
        p.M = matOf(B, p.box.x, p.box.y, p.z);
        p.vis = place(p.cv, p.M, p.cw, p.ch);
        p.n = n;
        list.push({ el: p.cv, z: p.z, n: n++, p });
      }
    }
    if (bg && bg.frame) { place(bg.frame, bg.M, P.w, P.h); list.push({ el: bg.frame, z: bg.z, n: -1 }); }
    const cz = B.C[2];
    list.sort((a, b) => Math.abs(b.z - cz) - Math.abs(a.z - cz) || a.n - b.n);
    order = [];
    list.forEach((it, i) => { it.el.style.zIndex = String(i + 1); if (it.p) order.push(it.p); });
    // as molduras e os nomes aparecem quando as camadas se afastam
    const sep = Math.max(cam.gap, cam.gapF), fo = framesIn.checked ? clamp(sep / (0.02 * dims.size), 0, 1) : 0;
    space.style.setProperty('--v3frame', fo.toFixed(3));
    labelBox.hidden = fo < 0.05;
    if (!labelBox.hidden) {
      // cada nome no canto do papel da camada; os que cairiam em cima de outro (mais perto da câmera) ficam
      // escondidos até as camadas se afastarem mais
      const all = [bg, ...lays].filter((l) => l && l.label).sort((a, b) => Math.abs(a.z - cz) - Math.abs(b.z - cz));
      const taken = [];
      for (const lay of all) {
        const q = project(B, P.x, P.y, lay.z), l = lay.label;
        if (!lay.lw) lay.lw = l.offsetWidth || 80;
        const r = q && { x: Math.round(q[0]), y: Math.round(q[1]) - 22, w: lay.lw, h: 20 };
        const ok = !!r && r.y > TOP - 4 && !taken.some((t) => r.x < t.x + t.w + 2 && t.x < r.x + r.w + 2 && r.y < t.y + t.h + 1 && t.y < r.y + r.h + 1);
        l.style.visibility = ok ? '' : 'hidden';
        if (!ok) continue;
        l.style.transform = `translate(${r.x}px, ${r.y}px)`;
        taken.push(r);
      }
      labelBox.style.opacity = fo.toFixed(3);
    }
    showZoom();
    if (document.activeElement !== gapIn) gapIn.value = String(Math.round(cam.gap));
    if (document.activeElement !== gapFIn) gapFIn.value = String(Math.round(cam.gapF));
  }
  function showZoom() {
    const z = $('zoomPct');
    if (!z || !dims) return;
    const t = Math.round((cam.F / dims.D) * 100) + '%';
    if (z.textContent !== t) z.textContent = t;
  }

  // ---------- os jeitos de olhar (com uma passagem suave) ----------
  function fitF(rotated) {
    const P = dims.paper, w = space.clientWidth || 800, h = Math.max(80, (space.clientHeight || 600) - TOP);
    return dims.D * Math.min((w * 0.86) / P.w, (h * 0.86) / P.h) * (rotated ? 0.78 : 1);
  }
  function presetOf(name) {
    const size = dims.size, nl = lays.length, np = lays.reduce((s, l) => s + l.pieces.length, 0);
    const gaps = () => (nl > 1
      ? { gap: clamp((0.9 * size) / nl, 0.03 * size, 0.12 * size), gapF: 0 }
      : { gap: 0.06 * size, gapF: clamp((0.6 * size) / Math.max(1, np), 2, 0.12 * size) });
    const max = size / 4;
    const cap = (o) => { if (o.gap !== undefined) o.gap = Math.min(o.gap, max); if (o.gapF !== undefined) o.gapF = Math.min(o.gapF, max); return o; };
    if (name === 'explode') return cap(Object.assign({ yaw: 45 * DEG, pitch: 18 * DEG, F: fitF(true), pan: [0, 0, 0] }, gaps()));
    if (name === 'side') return cap(Object.assign({ yaw: 68 * DEG, pitch: 6 * DEG, F: fitF(true), pan: [0, 0, 0] }, cam.gap || cam.gapF ? {} : gaps()));
    if (name === 'front') return { yaw: 0, pitch: 0, F: fitF(false), pan: [0, 0, 0] };
    if (name === 'join') return { yaw: 0, pitch: 0, F: fitF(false), pan: [0, 0, 0], gap: 0, gapF: 0 };
    return {};
  }
  function go(name, ms) {
    if (!dims) return;
    stopAnim();
    // o giro volta para perto de zero antes (para não dar voltas inteiras)
    cam.yaw = Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw));
    const to = presetOf(name), from = { yaw: cam.yaw, pitch: cam.pitch, F: cam.F, pan: cam.pan.slice(), gap: cam.gap, gapF: cam.gapF };
    const dur = ms === undefined ? 950 : ms, t0 = performance.now();
    const step = () => {
      const t = dur ? clamp((performance.now() - t0) / dur, 0, 1) : 1, s = smooth(t);
      for (const k of ['yaw', 'pitch', 'gap', 'gapF']) if (to[k] !== undefined) cam[k] = from[k] + (to[k] - from[k]) * s;
      // o zoom anda em escala (multiplicando), como o olho espera
      if (to.F !== undefined) cam.F = from.F * Math.pow(to.F / from.F, s);
      if (to.pan) cam.pan = from.pan.map((v, i) => v + (to.pan[i] - v) * s);
      render();
      if (t < 1) anim = requestAnimationFrame(step); else { anim = 0; afterZoom(); }
    };
    if (!dur) step(); else anim = requestAnimationFrame(step);
  }
  function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = 0; }
  root.querySelector('.v3-bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) go(b.dataset.go);
  });
  root.querySelector('.v3-bar').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  root.querySelector('.v3-close').addEventListener('click', () => A.set3d(false));
  gapIn.addEventListener('input', () => { stopAnim(); cam.gap = +gapIn.value; render(); });
  gapFIn.addEventListener('input', () => { stopAnim(); cam.gapF = +gapFIn.value; render(); });
  framesIn.addEventListener('change', render);

  // o zoom: no ponto (sx, sy) da tela, que fica parado
  function zoomAt(sx, sy, f) {
    if (!dims) return;
    stopAnim();
    const F2 = clamp(cam.F * f, dims.D * 0.02, dims.D * 32);
    const B = basis(), ox = sx - B.cx, oy = sy - B.cy, s = dims.D * (1 / cam.F - 1 / F2);
    for (let i = 0; i < 3; i++) cam.pan[i] += (ox * B.r[i] + oy * B.u[i]) * s;
    cam.F = F2;
    render();
    afterZoom();
  }
  // parou de mexer no zoom: repinta as telas na resolução nova
  function afterZoom() {
    clearTimeout(resTimer);
    resTimer = setTimeout(() => { if (open && built && built.k !== quantK()) schedule(); }, 250);
  }

  // ---------- o mouse ----------
  function localXY(e) { const r = space.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function alphaAt(p, u, v) {
    if (!p.alpha) { const c = p.cv; p.alpha = { w: c.width, h: c.height, d: c.getContext('2d').getImageData(0, 0, c.width, c.height).data }; }
    const a = p.alpha, k = p.k, rr = clamp(Math.round((2 * k * dims.D) / cam.F), 0, 4);
    const px = Math.floor(u * k), py = Math.floor(v * k);
    let best = 0;
    for (let y = py - rr; y <= py + rr; y += rr || 1) for (let x = px - rr; x <= px + rr; x += rr || 1) {
      if (x < 0 || y < 0 || x >= a.w || y >= a.h) continue;
      best = Math.max(best, a.d[(y * a.w + x) * 4 + 3]);
    }
    return best;
  }
  // a peça no ponto da tela: da mais perto para a mais longe, onde a tela dela tem tinta
  function hitAt(sx, sy) {
    for (let i = order.length - 1; i >= 0; i--) {
      const p = order[i], M = p.M;
      if (!p.vis || !M || (dimFn && !dimFn(p))) continue;
      const a1 = M[0] - sx * M[6], b1 = M[1] - sx * M[7], c1 = sx * M[8] - M[2];
      const a2 = M[3] - sy * M[6], b2 = M[4] - sy * M[7], c2 = sy * M[8] - M[5];
      const det = a1 * b2 - a2 * b1;
      if (Math.abs(det) < 1e-12) continue;
      const u = (c1 * b2 - c2 * b1) / det, v = (a1 * c2 - a2 * c1) / det;
      if (u < 0 || v < 0 || u >= p.cw || v >= p.ch || M[6] * u + M[7] * v + M[8] <= 0) continue;
      if (alphaAt(p, u, v) > 16) return p;
    }
    return null;
  }
  function setHot(p) {
    if (p === hot) return;
    if (hot) hot.cv.classList.remove('hot');
    hot = p;
    if (p) {
      p.cv.classList.add('hot');
      const kd = p.kid, what = kd ? `${kd.type}${kd.name ? ' ' + kd.name : ''}` : p.els[0].type;
      info.textContent = `${what} · camada ${p.layer.name}${p.line >= 0 ? ` · linha ${p.line + 1}` : ''}`;
      info.hidden = false;
    } else info.hidden = true;
  }
  let drag = null, hoverRaf = 0, lastMove = null;
  space.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1) e.preventDefault();
    try { space.setPointerCapture(e.pointerId); } catch (err) { /* um toque já solto */ }
    stopAnim();
    const pan = !!st.space || e.button === 1 || st.tool === 'hand';
    if (st.space) st.space.panned = true;
    drag = { x: e.clientX, y: e.clientY, mode: pan ? 'pan' : st.tool === 'zoom' ? 'zoom' : 'orbit', moved: false, yaw: cam.yaw, pitch: cam.pitch, pan: cam.pan.slice(), B: basis() };
    if (pan) space.classList.add('grabbing');
  });
  space.addEventListener('pointermove', (e) => {
    if (!drag) {
      lastMove = e;
      if (!hoverRaf) hoverRaf = requestAnimationFrame(() => { hoverRaf = 0; if (lastMove && !drag) { const q = localXY(lastMove); setHot(hitAt(q[0], q[1])); } });
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 3) { drag.moved = true; setHot(null); if (drag.mode === 'orbit') space.classList.add('grabbing'); }
    if (!drag.moved) return;
    if (drag.mode === 'orbit') {
      // arrastar para a direita gira o desenho para a direita (a câmera vai para a esquerda)
      cam.yaw = drag.yaw - dx * 0.4 * DEG;
      cam.pitch = clamp(drag.pitch + dy * 0.4 * DEG, -85 * DEG, 85 * DEG);
    } else if (drag.mode === 'pan') {
      const s = dims.D / cam.F, B = drag.B;
      for (let i = 0; i < 3; i++) cam.pan[i] = drag.pan[i] - (dx * B.r[i] + dy * B.u[i]) * s;
    }
    render();
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    space.classList.remove('grabbing');
    if (d.moved || !e || e.type === 'pointercancel') return;
    const q = localXY(e);
    if (d.mode === 'zoom') { zoomAt(q[0], q[1], e.altKey ? 0.8 : 1.25); return; }
    if (d.mode !== 'orbit') return;
    const p = hitAt(q[0], q[1]);
    if (p && p.line >= 0) A.pickLine(p.line, e.shiftKey);
    else if (!e.shiftKey) A.selectNone();
  };
  space.addEventListener('pointerup', endDrag);
  space.addEventListener('pointercancel', endDrag);
  space.addEventListener('pointerleave', () => { if (!drag) setHot(null); });
  space.addEventListener('wheel', (e) => {
    e.preventDefault();
    const q = localXY(e), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(q[0], q[1], Math.exp(-dy * 0.0015));
  }, { passive: false });
  function syncCursor() {
    space.dataset.tool = st.tool;
  }

  // ---------- a escolha e o painel Camadas ----------
  function syncSel() {
    const sel = new Set(A.selected());
    for (const p of pieces) p.cv.classList.toggle('sel', sel.has(p.line) || (p.lay.line >= 0 && sel.has(p.lay.line)));
  }
  function applyDim() {
    for (const p of pieces) p.cv.classList.toggle('dim', !!dimFn && !dimFn(p));
    if (bg) bg.cv.classList.toggle('dim', !!dimFn);
  }
  const lpanel = $('layerPanel');
  if (lpanel) {
    lpanel.addEventListener('mouseover', (e) => {
      if (!open) return;
      const el = e.target.closest('.lp-el[data-line]'), ly = e.target.closest('.lp-layer[data-name]');
      if (el) { const line = +el.dataset.line; dimFn = (p) => p.line === line; } else if (ly) { const name = ly.dataset.name; dimFn = (p) => p.layer.name === name; } else dimFn = null;
      applyDim();
    });
    lpanel.addEventListener('mouseleave', () => { if (!dimFn) return; dimFn = null; applyDim(); });
  }

  // ---------- quando repintar ----------
  // O desenho mudou (código, quadro do player, chaves): as telas são pintadas de novo, no máximo na metade do tempo
  // (se pintar custa 80 ms, espera 80 ms antes da próxima; tocando, a vista pula quadros em vez de travar).
  function schedule() {
    if (timer) return;
    const wait = Math.max(0, busyUntil - performance.now());
    timer = setTimeout(() => requestAnimationFrame(() => { timer = 0; rebuild(); }), wait);
  }
  function rebuild() {
    if (!open) return;
    const t0 = performance.now();
    build();
    render();
    busyUntil = performance.now() + (performance.now() - t0);
  }
  A.on('draw', () => {
    if (!open) return;
    syncSel();
    if (!built || built.m !== A.model() || built.key !== buildKey()) schedule();
  });
  function openView() {
    open = true;
    root.hidden = false;
    if (z3d) z3d.classList.add('on');
    hot = null;
    dimFn = null;
    if (!A.model()) return;
    // a câmera antes das telas, para elas já saírem na resolução certa
    setDims();
    Object.assign(cam, { yaw: 0, pitch: 0, pan: [0, 0, 0], gap: 0, gapF: 0 });
    cam.F = fitF(false);
    build();
    syncCursor();
    render();
    // abre de frente e se abre em leque
    setTimeout(() => { if (open) go('explode', 1100); }, 120);
    A.hint('Arraste para girar · Espaço ou a Mão movem · a roda aproxima · clique escolhe', 3600);
  }
  function closeView() {
    open = false;
    stopAnim();
    clearTimeout(timer);
    timer = 0;
    root.hidden = true;
    info.hidden = true;
    if (z3d) z3d.classList.remove('on');
    clear();
    dims = null;
  }
  A.on('view3d', () => { if (st.view3d && !open) openView(); else if (!st.view3d && open) closeView(); });
  A.on('tool', syncCursor);
  A.on('model', () => { if (z3d) z3d.hidden = A.isFilm(); });
  if (z3d) {
    z3d.hidden = A.isFilm();
    z3d.addEventListener('mousedown', (e) => e.preventDefault());
    z3d.addEventListener('click', () => A.set3d(!st.view3d));
  }
  if (window.ResizeObserver) new ResizeObserver(() => render()).observe(space);
  A.register3d({
    zoom: (f) => zoomAt(space.clientWidth / 2, space.clientHeight / 2, f),
    fit: () => go('front', 600),
    // 100%: um pixel do desenho, um da tela, no meio da pilha
    actual: () => { if (!dims) return; stopAnim(); cam.F = dims.D; cam.pan = [0, 0, 0]; render(); afterZoom(); },
  });
})(window.Weasel = window.Weasel || {});
