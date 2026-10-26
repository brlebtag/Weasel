/* Weasel — a interface: editor à esquerda, desenho ao vivo à direita, player embaixo. */
(function (W) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const S = W.scene, M = W.geom.M;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento: segue sem salvar */ } },
  };

  const st = {
    model: null,
    anim: '',
    frame: 0,
    playing: false,
    speed: 1,
    lastT: 0,
    acc: 0,
    view: { z: 1, x: 0, y: 0, auto: true },
    show: { guides: true, points: true, bones: false, onion: false },
    caret: { line: 0, col: 0 },
    hover: null,
    drag: null,
    pan: null,
    build: null,
    baseName: 'desenho',
  };
  let raf = 0, saveTimer = 0;

  // ---------- editor ----------
  const editor = new W.Editor($('editor'), {
    onChange: () => reparse(),
    onCaret: (c) => { st.caret = c; updateCaretInfo(); draw(); },
  });

  function reparse() {
    st.model = W.lang.parse(editor.value);
    editor.setErrors(st.model.errors);
    if (st.anim && !st.model.animMap.has(st.anim)) st.anim = '';
    if (st.build) stopBuild();
    fillAnimSelect();
    updateErrors();
    updateCaretInfo();
    draw();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { store.set('weasel.src', editor.value); store.set('weasel.name', st.baseName); }, 400);
  }

  function updateErrors() {
    const errs = st.model.errors, n = errs.filter((e) => e.level === 'error').length, w = errs.length - n;
    const b = $('errBtn');
    b.className = 'errs ' + (n ? 'bad-n' : w ? 'warn-n' : 'ok');
    b.textContent = n ? `${n} erro${n > 1 ? 's' : ''}${w ? ` · ${w} aviso${w > 1 ? 's' : ''}` : ''}` : w ? `${w} aviso${w > 1 ? 's' : ''}` : 'sem erros';
    const list = $('errList');
    list.innerHTML = '';
    for (const e of errs) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = e.level;
      row.innerHTML = `<span class="ln">linha ${e.line + 1}</span><span class="msg"></span>`;
      row.querySelector('.msg').textContent = e.msg;
      row.addEventListener('click', () => { list.hidden = true; editor.goto(e.line, e.from); });
      list.appendChild(row);
    }
    if (!errs.length) list.hidden = true;
  }

  const KIND = { pt: 'ponto', center: 'centro', corner: 'canto', pivot: 'pivô', hip: 'quadril', root: 'raiz' };
  function activeHandle(rec) {
    if (!rec) return -1;
    return rec.handles.findIndex((h) => st.caret.col >= h.from && st.caret.col <= h.to);
  }
  function updateCaretInfo() {
    const rec = st.model && st.model.byLine.get(st.caret.line);
    let s = `linha <b>${st.caret.line + 1}</b>`;
    if (rec) {
      const what = rec.el ? rec.el.type : rec.st.cmd;
      const name = rec.el ? rec.el.name : rec.layer ? rec.layer.name : rec.bone ? rec.bone.name : rec.cloth ? rec.cloth.name : rec.anim ? rec.anim.name : '';
      s += ` · ${what}${name ? ` <b>${esc(name)}</b>` : ''}`;
      if (rec.el && rec.el.layer && !rec.el.layer.implicit) s += ` na camada ${esc(rec.el.layer.name)}`;
      const hi = activeHandle(rec);
      if (hi >= 0) { const h = rec.handles[hi]; s += ` · ${KIND[h.kind]}${h.kind === 'pt' ? ' ' + (h.idx + 1) : ''} (${h.x}, ${h.y})`; }
      if (rec.st.cmd === 'key' && rec.anim) s += ' · clique para ver este quadro';
    }
    const err = st.model && st.model.errors.find((e) => e.line === st.caret.line);
    if (err) s += ` · <span style="color:${err.level === 'error' ? 'var(--err)' : 'var(--warn)'}">${esc(err.msg)}</span>`;
    $('caretInfo').innerHTML = s;
    // Cursor numa key: mostra aquele quadro
    if (rec && rec.st.cmd === 'key' && rec.anim && !st.playing && (st.anim !== rec.anim.name || st.frame !== rec.frame % rec.anim.frames)) {
      st.anim = rec.anim.name;
      st.frame = rec.frame % rec.anim.frames;
      fillAnimSelect();
    }
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- player ----------
  function fillAnimSelect() {
    const sel = $('animSel');
    const m = st.model;
    const want = ['', ...m.anims.map((a) => a.name)];
    const have = [...sel.options].map((o) => o.value);
    if (want.join('\n') !== have.join('\n')) {
      sel.innerHTML = '';
      const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
      add('', m.anims.length ? 'pose parada' : 'sem animações');
      for (const a of m.anims) add(a.name, a.name);
    }
    sel.value = st.anim;
    const anim = currentAnim();
    if (anim && st.frame >= anim.frames) st.frame = 0;
    const sl = $('frameSl');
    sl.max = anim ? anim.frames - 1 : 0;
    sl.value = anim ? st.frame : 0;
    sl.disabled = !anim;
    $('frameLbl').textContent = anim ? `${st.frame + 1} / ${anim.frames} · ${anim.fps} fps` : '—';
    $('bPlay').classList.toggle('on', st.playing);
  }
  const currentAnim = () => (st.anim ? st.model.animMap.get(st.anim) : null);

  function play(on) {
    if (on && !currentAnim()) {
      if (!st.model.anims.length) return hint('Este desenho não tem animações (use anim e key).', 2500);
      st.anim = st.model.anims[0].name;
      st.frame = 0;
    }
    st.playing = on;
    if (on) { stopBuild(); st.lastT = performance.now(); st.acc = 0; }
    fillAnimSelect();
    kick();
  }

  function step(d) {
    const a = currentAnim();
    if (!a) return;
    st.playing = false;
    st.frame = (st.frame + d + a.frames) % a.frames;
    fillAnimSelect();
    draw();
  }

  // ---------- pintura passo a passo ----------
  function startBuild() {
    if (st.build) { stopBuild(); draw(); return; }
    st.playing = false;
    const plan = S.buildPlan(st.model, { guides: false, speed: st.speed });
    if (!plan.order.length) return;
    st.build = { plan, t0: performance.now() };
    $('btnBuild').classList.add('on');
    fillAnimSelect();
    kick();
  }
  function stopBuild() {
    st.build = null;
    $('btnBuild').classList.remove('on');
  }

  // ---------- laço de desenho ----------
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick(t) {
    raf = 0;
    let again = false;
    const a = currentAnim();
    if (st.playing && a) {
      st.acc += ((t - st.lastT) / 1000) * a.fps * st.speed;
      st.lastT = t;
      if (st.acc >= 1) {
        st.frame = (st.frame + Math.floor(st.acc)) % a.frames;
        st.acc -= Math.floor(st.acc);
        $('frameSl').value = st.frame;
        $('frameLbl').textContent = `${st.frame + 1} / ${a.frames} · ${a.fps} fps`;
      }
      again = true;
    }
    if (st.build) {
      if ((t - st.build.t0) / 1000 > st.build.plan.total + 0.8) stopBuild();
      else again = true;
    }
    draw();
    if (again) kick();
  }

  function currentPose() {
    return S.makePose(st.model, st.build ? '' : st.anim, st.frame);
  }

  function fit() {
    const cv = $('view'), m = st.model.canvas;
    const w = cv.clientWidth, h = cv.clientHeight;
    const z = Math.max(0.05, Math.min((w - 40) / m.w, (h - 40) / m.h));
    st.view.z = z;
    st.view.x = (w - m.w * z) / 2;
    st.view.y = (h - m.h * z) / 2;
  }

  let checker = null;
  function checkerPattern(ctx) {
    if (!checker) {
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const x = c.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#dcdcdc'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8);
      checker = c;
    }
    return ctx.createPattern(checker, 'repeat');
  }

  function draw() {
    if (!st.model) return;
    const cv = $('view'), ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(cv.clientWidth * dpr)), ch = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    if (st.view.auto) fit();
    const m = st.model, c = m.canvas, z = st.view.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const T = () => ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * st.view.x, dpr * st.view.y);
    T();

    // papel
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 26 * dpr;
    ctx.shadowOffsetY = 6 * dpr;
    ctx.fillStyle = c.bg || '#ffffff';
    ctx.fillRect(0, 0, c.w, c.h);
    ctx.restore();
    if (!c.bg) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, dpr * st.view.x, dpr * st.view.y);
      ctx.fillStyle = checkerPattern(ctx);
      ctx.fillRect(0, 0, c.w * z, c.h * z);
      ctx.restore();
    }

    const pose = currentPose();
    let bf = null;
    if (st.build) bf = S.buildFilter(st.build.plan, (performance.now() - st.build.t0) / 1000);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, c.w, c.h);
    ctx.clip();
    const anim = pose.anim;
    if (st.show.onion && anim && anim.frames > 1 && !st.build) {
      const s = Math.min(2, z * dpr);
      for (const d of [-1, 1]) {
        const img = S.renderImage(m, S.makePose(m, anim.name, st.frame + d), { scale: s, transparent: true, guides: false });
        ctx.globalAlpha = 0.22;
        ctx.drawImage(img, 0, 0, c.w, c.h);
      }
      ctx.globalAlpha = 1;
    }
    if (m.finish.pixel > 1) {
      const img = S.renderImage(m, pose, { scale: Math.min(4, z * dpr), transparent: true, guides: st.show.guides, filter: bf && bf.filter });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, c.w, c.h);
      ctx.imageSmoothingEnabled = true;
    } else {
      S.drawScene(ctx, m, pose, { background: false, guides: st.show.guides, filter: bf && bf.filter });
    }
    ctx.restore();

    T();
    if (st.show.guides && m.unity) drawUnity(ctx, m.unity, z);
    if (st.show.bones) drawBones(ctx, m, pose, z);
    if (bf) S.drawTrace(ctx, m, pose, st.build.plan, bf.st, z);
    else if (st.show.points) drawHandles(ctx, m, pose, z);
  }

  function drawUnity(ctx, u, z) {
    ctx.save();
    ctx.lineWidth = 1.2 / z;
    ctx.strokeStyle = 'rgba(60,170,120,.9)';
    ctx.setLineDash([6 / z, 4 / z]);
    if (u.collider) {
      const [cw, chh, ox, oy] = u.collider;
      const w = cw * u.unit, h = chh * u.unit;
      const cx = u.root[0] + ox * u.unit, cy = u.root[1] - oy * u.unit;
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    }
    ctx.setLineDash([]);
    const r = 9 / z;
    ctx.beginPath();
    ctx.moveTo(u.root[0] - r, u.root[1]); ctx.lineTo(u.root[0] + r, u.root[1]);
    ctx.moveTo(u.root[0], u.root[1] - r); ctx.lineTo(u.root[0], u.root[1] + r);
    ctx.stroke();
    ctx.restore();
  }

  function drawBones(ctx, m, pose, z) {
    ctx.save();
    for (const b of m.bones.values()) {
      const p = M.apply(pose.bones.get(b.name), b.pivot[0], b.pivot[1]);
      if (b.parent && m.bones.has(b.parent)) {
        const pb = m.bones.get(b.parent);
        const q = M.apply(pose.bones.get(pb.name), pb.pivot[0], pb.pivot[1]);
        ctx.strokeStyle = 'rgba(227,145,214,.85)';
        ctx.lineWidth = 2 / z;
        ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      }
      ctx.fillStyle = '#e391d6';
      ctx.strokeStyle = '#2a1028';
      ctx.lineWidth = 1.5 / z;
      ctx.beginPath(); ctx.arc(p[0], p[1], 5 / z, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = `${11 / z}px ${getComputedStyle(document.body).getPropertyValue('--mono')}`;
      ctx.fillStyle = '#f6c8ef';
      ctx.fillText(b.name, p[0] + 8 / z, p[1] - 6 / z);
    }
    for (const c of m.cloths.values()) {
      const mm = c.bone ? pose.bones.get(c.bone) : null;
      const p = mm ? M.apply(mm, c.pivot[0], c.pivot[1]) : c.pivot;
      const r = 6 / z;
      ctx.fillStyle = '#5cc6d4';
      ctx.beginPath(); ctx.moveTo(p[0], p[1] - r); ctx.lineTo(p[0] + r, p[1]); ctx.lineTo(p[0], p[1] + r); ctx.lineTo(p[0] - r, p[1]); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function handleList(m, pose) {
    const rec = m.byLine.get(st.caret.line);
    if (!rec || !rec.handles.length) return null;
    return { rec, pts: rec.handles.map((h) => S.handlePos(m, pose, rec, h)) };
  }

  function drawHandles(ctx, m, pose, z) {
    const hl = handleList(m, pose);
    if (!hl) return;
    const { rec, pts } = hl;
    const active = st.drag ? st.drag.hi : activeHandle(rec);
    ctx.save();
    const isPts = rec.handles.filter((h) => h.kind === 'pt');
    if (isPts.length > 1) {
      ctx.strokeStyle = 'rgba(255,138,31,.55)';
      ctx.lineWidth = 1 / z;
      ctx.setLineDash([4 / z, 3 / z]);
      ctx.beginPath();
      let first = true;
      rec.handles.forEach((h, i) => { if (h.kind !== 'pt') return; if (first) { ctx.moveTo(pts[i][0], pts[i][1]); first = false; } else ctx.lineTo(pts[i][0], pts[i][1]); });
      if (rec.el && rec.el.closed) ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    rec.handles.forEach((h, i) => {
      if (i === active) return;
      const [x, y] = pts[i];
      const r = 4.5 / z;
      ctx.beginPath();
      if (h.corner) ctx.rect(x - r, y - r, r * 2, r * 2);
      else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.6 / z;
      ctx.strokeStyle = '#14141c';
      ctx.stroke();
    });
    if (active >= 0 && pts[active]) S.drawPen(ctx, pts[active][0], pts[active][1], z);
    ctx.restore();
  }

  // ---------- mouse no desenho ----------
  const stage = $('stage'), view = $('view');
  const toCanvas = (e) => {
    const r = view.getBoundingClientRect();
    return [(e.clientX - r.left - st.view.x) / st.view.z, (e.clientY - r.top - st.view.y) / st.view.z];
  };
  function hitHandle(e) {
    if (!st.show.points || st.build) return -1;
    const hl = handleList(st.model, currentPose());
    if (!hl) return -1;
    const [x, y] = toCanvas(e);
    let best = -1, bd = 10 / st.view.z;
    hl.pts.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  const fmt = (v) => String(Math.round(v));

  function hint(msg, ms) {
    const h = $('hint');
    h.textContent = msg;
    h.hidden = false;
    clearTimeout(hint.t);
    hint.t = setTimeout(() => { h.hidden = true; }, ms || 2000);
  }

  view.addEventListener('pointerdown', (e) => {
    view.setPointerCapture(e.pointerId);
    if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
      const [x, y] = toCanvas(e);
      const ta = editor.ta, s = ta.selectionStart;
      const before = ta.value[s - 1];
      const txt = (before && !/\s/.test(before) ? ' ' : '') + `${fmt(x)},${fmt(y)}`;
      editor.replaceRange(s, ta.selectionEnd, txt, {});
      ta.focus();
      return;
    }
    const hi = e.button === 0 ? hitHandle(e) : -1;
    if (hi >= 0) {
      if (st.anim || st.playing) {
        hint('Para arrastar pontos, escolha "pose parada" no player.', 2600);
        return;
      }
      st.drag = { line: st.caret.line, hi, key: 'drag' + Date.now() };
      return;
    }
    if (e.button === 0 || e.button === 1) {
      st.pan = { x: e.clientX, y: e.clientY, vx: st.view.x, vy: st.view.y };
      stage.classList.add('pan');
    }
  });

  view.addEventListener('pointermove', (e) => {
    const [x, y] = toCanvas(e);
    $('coords').textContent = `x ${fmt(x)}  y ${fmt(y)}`;
    if (st.drag) { moveHandle(st.drag, x, y); return; }
    if (st.pan) {
      st.view.auto = false;
      st.view.x = st.pan.vx + (e.clientX - st.pan.x);
      st.view.y = st.pan.vy + (e.clientY - st.pan.y);
      draw();
      return;
    }
    view.style.cursor = hitHandle(e) >= 0 ? 'move' : e.ctrlKey || e.metaKey ? 'crosshair' : 'grab';
  });

  const endPointer = () => { st.drag = null; st.pan = null; stage.classList.remove('pan'); draw(); };
  view.addEventListener('pointerup', endPointer);
  view.addEventListener('pointercancel', endPointer);
  view.addEventListener('pointerleave', () => { if (!st.drag && !st.pan) $('coords').textContent = ''; });

  view.addEventListener('dblclick', (e) => {
    const hi = hitHandle(e);
    if (hi < 0 || st.anim) return;
    const rec = st.model.byLine.get(st.caret.line);
    const h = rec.handles[hi];
    if (h.kind !== 'pt') return;
    const off = editor.lineStart(st.caret.line);
    const txt = `${h.x},${h.y}${h.corner ? '' : '!'}`;
    editor.replaceRange(off + h.from, off + h.to, txt, { select: [off + h.from + txt.length, off + h.from + txt.length] });
  });

  function moveHandle(d, x, y) {
    const rec = st.model.byLine.get(d.line);
    const h = rec && rec.handles[d.hi];
    if (!h) { st.drag = null; return; }
    const txt = `${fmt(x)},${fmt(y)}${h.kind === 'pt' && h.corner ? '!' : ''}`;
    const off = editor.lineStart(d.line);
    if (editor.value.slice(off + h.from, off + h.to) === txt) return;
    const end = off + h.from + txt.length;
    editor.replaceRange(off + h.from, off + h.to, txt, { key: d.key, select: [end, end] });
  }

  view.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = view.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    zoomAt(mx, my, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  function zoomAt(mx, my, f) {
    const v = st.view;
    const z = Math.min(40, Math.max(0.05, v.z * f));
    v.x = mx - (mx - v.x) * (z / v.z);
    v.y = my - (my - v.y) * (z / v.z);
    v.z = z;
    v.auto = false;
    draw();
  }

  new ResizeObserver(() => draw()).observe(stage);

  // ---------- controles ----------
  $('tGuides').addEventListener('change', (e) => { st.show.guides = e.target.checked; draw(); });
  $('tPoints').addEventListener('change', (e) => { st.show.points = e.target.checked; draw(); });
  $('tBones').addEventListener('change', (e) => { st.show.bones = e.target.checked; draw(); });
  $('tOnion').addEventListener('change', (e) => { st.show.onion = e.target.checked; draw(); });
  $('zFit').addEventListener('click', () => { st.view.auto = true; draw(); });
  $('zIn').addEventListener('click', () => zoomAt(view.clientWidth / 2, view.clientHeight / 2, 1.25));
  $('zOut').addEventListener('click', () => zoomAt(view.clientWidth / 2, view.clientHeight / 2, 0.8));

  $('animSel').addEventListener('change', (e) => { st.anim = e.target.value; st.frame = 0; stopBuild(); if (!st.anim) st.playing = false; fillAnimSelect(); draw(); });
  $('bPlay').addEventListener('click', () => play(!st.playing));
  $('bPrev').addEventListener('click', () => step(-1));
  $('bNext').addEventListener('click', () => step(1));
  $('frameSl').addEventListener('input', (e) => { st.playing = false; st.frame = +e.target.value; fillAnimSelect(); draw(); });
  $('speedSel').addEventListener('change', (e) => { st.speed = parseFloat(e.target.value); });
  $('btnBuild').addEventListener('click', startBuild);

  $('errBtn').addEventListener('click', () => {
    const list = $('errList');
    if (!st.model.errors.length) return;
    list.hidden = !list.hidden;
  });

  // exemplos e arquivos
  const exSel = $('exampleSel');
  exSel.innerHTML = '<option value="">Exemplos…</option>' + W.examples.map((x) => `<option value="${x.id}">${esc(x.title)}</option>`).join('');
  exSel.addEventListener('change', () => {
    const x = W.examples.find((e) => e.id === exSel.value);
    exSel.value = '';
    if (!x) return;
    loadProgram(x.src, x.file, false);
    hint(`Exemplo "${x.title}" aberto — Ctrl+Z volta ao código anterior.`, 3200);
  });
  $('btnNew').addEventListener('click', () => { loadProgram(W.blankProgram, 'desenho', false); hint('Desenho novo — Ctrl+Z volta ao anterior.', 2600); });
  $('btnOpen').addEventListener('click', () => $('fileIn').click());
  $('fileIn').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    loadProgram(await f.text(), f.name.replace(/\.[^.]+$/, ''), false);
  });
  $('btnSave').addEventListener('click', saveFile);
  function saveFile() {
    W.exporter.download(new Blob([editor.value], { type: 'text/plain;charset=utf-8' }), `${st.baseName}.weasel`);
  }

  function loadProgram(src, name, fresh) {
    st.baseName = name || 'desenho';
    st.anim = '';
    st.frame = 0;
    st.playing = false;
    st.view.auto = true;
    stopBuild();
    editor.setValue(src, fresh);
  }

  // referência
  const help = $('help');
  const toggleHelp = (on) => { help.hidden = on === undefined ? !help.hidden : !on; };
  $('btnHelp').addEventListener('click', () => toggleHelp());
  $('helpClose').addEventListener('click', () => toggleHelp(false));

  // exportar
  const exportUI = W.exporter.setupDialog({
    model: () => st.model,
    state: () => ({ anim: st.anim, frame: st.frame }),
    baseName: () => st.baseName,
  });
  $('btnExport').addEventListener('click', () => { st.playing = false; fillAnimSelect(); exportUI.open(); });

  // divisória
  const divider = $('divider');
  divider.addEventListener('pointerdown', (e) => {
    divider.setPointerCapture(e.pointerId);
    divider.classList.add('drag');
    const main = $('main').getBoundingClientRect();
    const vertical = getComputedStyle($('main')).gridTemplateRows.split(' ').length > 2;
    const move = (ev) => {
      if (vertical) $('main').style.gridTemplateRows = `${Math.min(85, Math.max(15, ((ev.clientY - main.top) / main.height) * 100))}% 6px minmax(0,1fr)`;
      else document.documentElement.style.setProperty('--code-w', `${Math.min(80, Math.max(18, ((ev.clientX - main.left) / main.width) * 100))}%`);
      draw();
    };
    const up = () => { divider.classList.remove('drag'); divider.removeEventListener('pointermove', move); divider.removeEventListener('pointerup', up); };
    divider.addEventListener('pointermove', move);
    divider.addEventListener('pointerup', up);
  });

  // teclado
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveFile(); return; }
    if (mod && (e.key === 'e' || e.key === 'E')) { e.preventDefault(); $('btnExport').click(); return; }
    if (e.key === 'F1') { e.preventDefault(); toggleHelp(); return; }
    if (e.key === 'Escape') { if (!help.hidden) toggleHelp(false); $('errList').hidden = true; return; }
    const t = e.target;
    if (t.closest && t.closest('textarea, input, select, dialog')) return;
    if (e.key === ' ') { e.preventDefault(); play(!st.playing); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'f' || e.key === 'F') { st.view.auto = true; draw(); }
  });

  // ---------- início ----------
  const saved = store.get('weasel.src');
  if (saved && saved.trim()) loadProgram(saved, store.get('weasel.name') || 'desenho', true);
  else loadProgram(W.examples[0].src, W.examples[0].file, true);

  W.app = { st, editor, draw, reparse };
})(window.Weasel = window.Weasel || {});
