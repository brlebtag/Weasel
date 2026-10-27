/* Weasel — a interface: editor à esquerda, desenho ao vivo à direita, player embaixo. */
(function (W) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const S = W.scene, M = W.geom.M, L = W.lang;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento: segue sem salvar */ } },
  };

  const st = {
    model: null,
    files: new Map(), // nome do arquivo → código (include procura aqui)
    current: '',
    variant: '',
    anim: '',
    frame: 0,
    playing: false,
    speed: 1,
    lastT: 0,
    acc: 0,
    view: { z: 1, x: 0, y: 0, auto: true },
    show: { guides: true, points: true, bones: false, onion: false },
    caret: { line: 0, col: 0 },
    drag: null,
    pan: null,
    build: null,
  };
  let raf = 0, saveTimer = 0;
  const baseName = () => st.current.replace(/\.[^.]+$/, '') || 'desenho';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- editor ----------
  const editor = new W.Editor($('editor'), {
    onChange: () => reparse(),
    onCaret: (c) => { st.caret = c; updateCaretInfo(); draw(); },
    complete: (c) => complete(c),
  });

  const resolveFile = (name) => {
    for (const k of [name, name + '.weasel']) if (st.files.has(k)) return k === st.current ? editor.value : st.files.get(k);
    return null;
  };
  const parseFor = (variant) => L.parse(editor.value, { file: st.current, resolve: resolveFile, variant: variant || null });

  function reparse() {
    st.files.set(st.current, editor.value);
    st.model = parseFor(st.variant);
    editor.setErrors(st.model.errors);
    if (st.anim && !st.model.animMap.has(st.anim)) st.anim = '';
    if (st.variant && !st.model.variants.includes(st.variant)) st.variant = '';
    if (st.build) stopBuild();
    fillAnimSelect();
    fillVariantSelect();
    updateErrors();
    updateCaretInfo();
    draw();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWorkspace, 400);
  }

  function saveWorkspace() {
    store.set('weasel.files', JSON.stringify(Object.fromEntries(st.files)));
    store.set('weasel.current', st.current);
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

  const KIND = { pt: 'ponto', tan: 'alça', center: 'centro', corner: 'canto', pivot: 'pivô', hip: 'raiz do membro', root: 'raiz', pos: 'posição', light: 'luz' };
  function activeHandle(rec) {
    if (!rec) return -1;
    return rec.handles.findIndex((h) => st.caret.col >= h.from && st.caret.col <= h.to);
  }
  function updateCaretInfo() {
    const rec = st.model && st.model.byLine.get(st.caret.line);
    let s = `linha <b>${st.caret.line + 1}</b>`;
    if (rec) {
      const what = rec.el ? rec.el.type : rec.st.cmd;
      const name = rec.el ? rec.el.name : rec.layer ? rec.layer.name : rec.bone ? rec.bone.name : rec.cloth ? rec.cloth.name : rec.anim ? rec.anim.name : rec.def ? rec.def.name : rec.grad ? rec.grad.name : rec.light ? rec.light.name : rec.pat ? rec.pat.name : rec.use || '';
      s += ` · ${what}${name ? ` <b>${esc(name)}</b>` : ''}`;
      if (rec.el && rec.el.layer && !rec.el.layer.implicit && rec.el.layer.name !== '(def)') s += ` na camada ${esc(rec.el.layer.name)}`;
      if (rec.st.inDef) s += ` · dentro de def ${esc(rec.st.inDef.name)}`;
      if (rec.def && rec.st.cmd === 'def') s += ` · usado ${rec.def.uses}×`;
      if (rec.el && rec.el.mirrorOf) s += ` · espelho de ${esc(rec.el.mirrorOf)}`;
      const hi = activeHandle(rec);
      if (hi >= 0) { const h = rec.handles[hi]; s += ` · ${KIND[h.kind]}${h.kind === 'pt' ? ' ' + (h.idx + 1) : ''} (${h.x}, ${h.y})${h.fixed ? ' · calculado' : ''}`; }
    }
    const err = st.model && st.model.errors.find((e) => e.line === st.caret.line);
    if (err) s += ` · <span style="color:${err.level === 'error' ? 'var(--err)' : 'var(--warn)'}">${esc(err.msg)}</span>`;
    $('caretInfo').innerHTML = s;
    // Cursor numa key ou event: mostra aquele quadro
    if (rec && (rec.st.cmd === 'key' || rec.st.cmd === 'event') && rec.anim && !st.playing && (st.anim !== rec.anim.name || st.frame !== rec.frame % rec.anim.frames)) {
      st.anim = rec.anim.name;
      st.frame = rec.frame % rec.anim.frames;
      fillAnimSelect();
    }
  }

  // ---------- autocompletar ----------
  const KDESC = {
    canvas: 'tamanho e fundo', finish: 'acabamento', unity: 'escala da Unity', palette: 'cores e espessuras', gradient: 'gradiente', let: 'variáveis',
    variant: 'variação de cores', include: 'usar outro arquivo', layer: 'camada', shape: 'forma fechada', stroke: 'traço ou membro', line: 'linha reta',
    ellipse: 'elipse/círculo', rect: 'retângulo', text: 'texto', def: 'componente', end: 'fim do def', use: 'usar componente', bone: 'osso',
    cloth: 'tecido', anim: 'animação', key: 'pose num quadro', event: 'evento num quadro',
    light: 'luz (lâmpada, spot, sol)', ambient: 'luz geral da cena', emitter: 'partículas', pattern: 'hachura ou pontos',
  };
  function complete({ before }) {
    const m = st.model;
    if (!m) return [];
    const sp = L.splitLine(before);
    if (sp.comment !== null || sp.colon >= 0) return [];
    const ws = sp.words;
    const typing = ws.length && !/\s$/.test(before);
    const cur = typing ? ws[ws.length - 1].text : '';
    const idx = typing ? ws.length - 1 : ws.length;
    const names = (arr, detail) => arr.map((n) => ({ label: String(n), detail }));
    if (idx === 0) return Object.keys(L.KEYWORDS).map((k) => ({ label: k, detail: KDESC[k] || '' }));
    const cmd = ws[0].text;
    const colors = [...m.palette].filter(([, v]) => typeof v === 'string').map(([k]) => k);
    const widths = [...m.palette].filter(([, v]) => typeof v === 'number').map(([k]) => k);
    const els = [...m.named.keys()];
    const colorList = () => [...names(colors, 'cor'), ...names([...m.gradients.keys()], 'gradiente'), ...names([...m.patterns.keys()], 'padrão'), { label: 'none' }];
    const eq = cur.indexOf('=');
    if (eq > 0) {
      const key = cur.slice(0, eq);
      if (cmd === 'key' && key.includes('.')) {
        const prop = key.slice(key.lastIndexOf('.') + 1);
        if (prop === 'shape') return names(els, 'forma');
        if (prop === 'c' || prop === 'inkc') return m.lights.has(key.slice(0, key.lastIndexOf('.'))) ? names(colors, 'cor') : colorList();
        if (prop === 'show') return names(['1', '0']);
        if (prop === 'w' || prop === 'ink') return names(widths, 'espessura');
        return [];
      }
      if (cmd === 'emitter' && key === 'shape') return names(L.PARTICLE_SHAPES, 'forma da partícula');
      if (cmd === 'emitter' && key === 'c') return names(colors, 'cor (pode ser cor1,cor2)');
      if (['glow', 'shadow', 'tint', 'rim', 'emit'].includes(key)) return names(colors, 'cor,…');
      if (cmd === 'light' || cmd === 'ambient' || cmd === 'pattern') { if (key === 'c' || key === 'bg') return names(colors, 'cor'); }
      if (key === 'cast') return names(els.filter((n) => m.named.get(n)[0].type === 'line'), 'linha do chão');
      if (key === 'posterize') return names(['palette', '4', '8'], 'cores');
      if (cmd === 'use') {
        const def = m.defs.get(ws[1] && ws[1].text);
        if (def && def.st.attrs.has(key)) return isNaN(Number(def.st.attrs.get(key).text)) ? colorList() : names(widths, 'espessura');
      }
      if (cmd === 'palette' || cmd === 'variant' || cmd === 'def') return colorList();
      switch (key) {
        case 'c': case 'inkc': case 'bg': return colorList();
        case 'w': case 'ink': return names(widths, 'espessura');
        case 'bone': case 'on': case 'parent': case 'target': return names([...m.bones.keys()], 'osso');
        case 'cloth': return names([...m.cloths.keys()], 'tecido');
        case 'inkon': return names([...m.layerMap.keys()], 'camada');
        case 'clip': case 'cut': return [...names(els, 'forma'), ...names([...m.layerMap.keys()], 'camada')];
        case 'only': return names(m.anims.map((a) => a.name), 'animação');
        case 'mirror': return names(els, 'forma');
        case 'ease': return names(Object.keys(W.geom.EASE), 'ease');
        case 'flip': return names(['x', 'y', 'xy']);
        case 'align': return names(['left', 'center', 'right']);
        case 'cap': return names(['round', 'butt', 'square']);
        case 'blend': return names(['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'soft-light', 'hard-light', 'difference']);
        case 'foot': return names(els.filter((n) => m.named.get(n)[0].type === 'line').map((n) => n + ','), 'linha do chão');
        default: return [];
      }
    }
    if (cmd === 'key' && idx >= 2) {
      return [
        ...names([...m.bones.keys()].map((b) => b + '='), 'osso: dx,dy,rot,sx,sy'),
        ...els.flatMap((n) => Object.keys(L.PROPS).map((p) => ({ label: `${n}.${p}=`, detail: 'forma' }))),
        ...[...m.lights.keys()].flatMap((n) => Object.keys(L.LIGHT_PROPS).map((p) => ({ label: `${n}.${p}=`, detail: 'luz' }))),
        ...[...m.layerMap.keys()].flatMap((n) => Object.keys(L.LAYER_PROPS).map((p) => ({ label: `${n}.${p}=`, detail: 'camada' }))),
        { label: 'ease=' },
      ];
    }
    if (cmd === 'use' && idx === 1) return names([...m.defs.keys()], 'componente');
    if (cmd === 'use' && idx >= 2) {
      const def = m.defs.get(ws[1] && ws[1].text);
      return [...names(L.ATTRS.use.map((a) => a + '='), 'atributo'), ...(def ? names([...def.st.attrs.keys()].map((k) => k + '='), 'parâmetro') : [])];
    }
    if (cmd === 'include' && idx === 1) return names([...st.files.keys()].filter((f) => f !== st.current), 'arquivo');
    if (cmd === 'gradient' && idx === 2) return names(['linear', 'radial']);
    if (cmd === 'light' && idx === 2) return names(['point', 'spot', 'dir']);
    if (cmd === 'pattern' && idx === 2) return names(['hatch', 'dots']);
    return [...names((L.ATTRS[cmd] || []).map((a) => a + '='), 'atributo'), ...names(L.FLAGS[cmd] || [], 'opção')];
  }

  // ---------- player ----------
  function frameText(anim, f) {
    if (!anim) return '—';
    const ev = anim.events.filter((e) => e.frame === f).map((e) => e.name);
    return `${f + 1} / ${anim.frames} · ${anim.fps} fps${ev.length ? ` · ⚑ ${ev.join(', ')}` : ''}`;
  }
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
    const lbl = $('frameLbl');
    lbl.textContent = frameText(anim, st.frame);
    lbl.classList.toggle('event', !!anim && anim.events.some((e) => e.frame === st.frame));
    $('bPlay').classList.toggle('on', st.playing);
  }
  const currentAnim = () => (st.anim ? st.model.animMap.get(st.anim) : null);

  function fillVariantSelect() {
    const sel = $('variantSel');
    const vs = st.model.variants;
    sel.hidden = !vs.length;
    const want = ['', ...vs];
    if (want.join('\n') !== [...sel.options].map((o) => o.value).join('\n')) {
      sel.innerHTML = '';
      for (const v of want) { const o = document.createElement('option'); o.value = v; o.textContent = v ? `variante: ${v}` : 'variante: padrão'; sel.appendChild(o); }
    }
    sel.value = st.variant;
  }

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
        const lbl = $('frameLbl');
        lbl.textContent = frameText(a, st.frame);
        lbl.classList.toggle('event', a.events.some((e) => e.frame === st.frame));
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
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#dcdcdc';
      x.fillRect(0, 0, 8, 8);
      x.fillRect(8, 8, 8, 8);
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
    const pose = currentPose();

    // papel
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 26 * dpr;
    ctx.shadowOffsetY = 6 * dpr;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.w, c.h);
    ctx.restore();
    if (c.bg) S.fillBg(ctx, m, pose, { x: 0, y: 0, w: c.w, h: c.h });
    else {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, dpr * st.view.x, dpr * st.view.y);
      ctx.fillStyle = checkerPattern(ctx);
      ctx.fillRect(0, 0, c.w * z, c.h * z);
      ctx.restore();
    }

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
    if (m.finish.pixel > 1 || S.hasPost(m)) {
      // acabamentos de imagem (pixel, bloom, vinheta, granulado) precisam da imagem pronta
      const cap = m.finish.posterize ? 2 : 4;
      const img = S.renderImage(m, pose, { scale: Math.min(cap, z * dpr), transparent: !c.bg, guides: st.show.guides, filter: bf && bf.filter });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, c.w, c.h);
      ctx.imageSmoothingEnabled = true;
    } else {
      S.drawScene(ctx, m, pose, { background: false, guides: st.show.guides, filter: bf && bf.filter });
    }
    ctx.restore();

    T();
    if (st.show.guides && m.unity) drawUnity(ctx, m.unity, z);
    if (st.show.guides && m.lights.size) drawLights(ctx, m, pose, z);
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
    ctx.moveTo(u.root[0] - r, u.root[1]);
    ctx.lineTo(u.root[0] + r, u.root[1]);
    ctx.moveTo(u.root[0], u.root[1] - r);
    ctx.lineTo(u.root[0], u.root[1] + r);
    ctx.stroke();
    ctx.restore();
  }

  // ícone de cada luz: sol com raios, círculo tracejado do alcance, cone do spot
  function drawLights(ctx, m, pose, z) {
    const lighting = S.sceneLights(m, pose);
    if (!lighting) return;
    ctx.save();
    ctx.lineWidth = 1.2 / z;
    for (const L of lighting.lights) {
      if (L.type === 'dir') continue;
      ctx.strokeStyle = 'rgba(255,209,102,.55)';
      ctx.setLineDash([5 / z, 5 / z]);
      ctx.beginPath();
      if (L.type === 'spot') {
        const a = (L.aim * Math.PI) / 180, h = (L.cone * Math.PI) / 180;
        ctx.moveTo(L.x, L.y);
        ctx.arc(L.x, L.y, L.radius, a - h, a + h);
        ctx.closePath();
      } else ctx.arc(L.x, L.y, L.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const r = 6 / z;
      ctx.strokeStyle = '#ffd166';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.moveTo(L.x + Math.cos(a) * r * 1.5, L.y + Math.sin(a) * r * 1.5);
        ctx.lineTo(L.x + Math.cos(a) * r * 2.3, L.y + Math.sin(a) * r * 2.3);
      }
      ctx.stroke();
      ctx.fillStyle = L.c;
      ctx.beginPath();
      ctx.arc(L.x, L.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a1f05';
      ctx.stroke();
    }
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
        ctx.beginPath();
        ctx.moveTo(q[0], q[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
      }
      ctx.fillStyle = b.spring || b.sway || b.bob || b.jitter ? '#ffd166' : '#e391d6';
      ctx.strokeStyle = '#2a1028';
      ctx.lineWidth = 1.5 / z;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 5 / z, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = `${11 / z}px ${getComputedStyle(document.body).getPropertyValue('--mono')}`;
      ctx.fillStyle = '#f6c8ef';
      ctx.fillText(b.name, p[0] + 8 / z, p[1] - 6 / z);
    }
    for (const c of m.cloths.values()) {
      const mm = c.bone ? pose.bones.get(c.bone) : null;
      const p = mm ? M.apply(mm, c.pivot[0], c.pivot[1]) : c.pivot;
      const r = 6 / z;
      ctx.fillStyle = '#5cc6d4';
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] - r);
      ctx.lineTo(p[0] + r, p[1]);
      ctx.lineTo(p[0], p[1] + r);
      ctx.lineTo(p[0] - r, p[1]);
      ctx.closePath();
      ctx.fill();
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
    const ptIdx = rec.handles.map((h, i) => (h.kind === 'pt' ? i : -1)).filter((i) => i >= 0);
    if (ptIdx.length > 1) {
      ctx.strokeStyle = 'rgba(255,138,31,.55)';
      ctx.lineWidth = 1 / z;
      ctx.setLineDash([4 / z, 3 / z]);
      ctx.beginPath();
      ptIdx.forEach((i, k) => (k ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1])));
      if (rec.el && rec.el.closed) ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // alças de curva: linha do ponto até a alça e o reflexo do outro lado
    rec.handles.forEach((h, i) => {
      if (h.kind !== 'tan') return;
      const p = pts[rec.handles.findIndex((q) => q.kind === 'pt' && q.idx === h.idx)];
      if (!p) return;
      const t = pts[i];
      ctx.strokeStyle = 'rgba(92,198,212,.9)';
      ctx.lineWidth = 1.2 / z;
      ctx.beginPath();
      ctx.moveTo(2 * p[0] - t[0], 2 * p[1] - t[1]);
      ctx.lineTo(t[0], t[1]);
      ctx.stroke();
    });
    rec.handles.forEach((h, i) => {
      if (i === active) return;
      const [x, y] = pts[i];
      const r = 4.5 / z;
      ctx.beginPath();
      if (h.kind === 'tan') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); } else if (h.corner) ctx.rect(x - r, y - r, r * 2, r * 2);
      else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = h.fixed ? '#9aa6b2' : h.kind === 'tan' ? '#5cc6d4' : '#ffffff';
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
  const fmtN = (v, dec) => String(Number(v.toFixed(dec)));

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
      const txt = (before && !/\s/.test(before) ? ' ' : '') + `${Math.round(x)},${Math.round(y)}`;
      editor.replaceRange(s, ta.selectionEnd, txt, {});
      ta.focus();
      return;
    }
    const hi = e.button === 0 ? hitHandle(e) : -1;
    if (hi >= 0) {
      const rec = st.model.byLine.get(st.caret.line);
      if (rec.handles[hi].fixed) { hint('Este ponto vem de uma {expressão}: mude o valor no código.', 2800); return; }
      if (st.anim || st.playing) { hint('Para arrastar pontos, escolha "pose parada" no player.', 2600); return; }
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
    $('coords').textContent = `x ${Math.round(x)}  y ${Math.round(y)}`;
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
    if (h.kind !== 'pt' || h.tan || h.fixed) return;
    const off = editor.lineStart(st.caret.line);
    const txt = editor.value.slice(off + h.from, off + h.to).replace(/!$/, '') + (h.corner ? '' : '!');
    editor.replaceRange(off + h.from, off + h.to, txt, { select: [off + h.from + txt.length, off + h.from + txt.length] });
  });

  // Arrastar: posição do mouse → coordenadas do código (dentro de um componente, as dele).
  function moveHandle(d, x, y) {
    const rec = st.model.byLine.get(d.line);
    const h = rec && rec.handles[d.hi];
    if (!h) { st.drag = null; return; }
    let [lx, ly] = rec.xf ? M.apply(M.invert(rec.xf), x, y) : [x, y];
    const k = rec.xf ? Math.sqrt(Math.abs(M.det(rec.xf))) : 1;
    const dec = k > 1.5 ? 1 : 0;
    let txt;
    if (h.kind === 'tan') txt = `${fmtN(lx - h.px, dec)},${fmtN(ly - h.py, dec)}`;
    else txt = `${fmtN(lx, dec)},${fmtN(ly, dec)}${h.kind === 'pt' && h.corner ? '!' : ''}`;
    const off = editor.lineStart(d.line);
    if (editor.value.slice(off + h.from, off + h.to) === txt) return;
    const end = off + h.from + txt.length;
    editor.replaceRange(off + h.from, off + h.to, txt, { key: d.key, select: [end, end] });
  }

  view.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = view.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
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
  $('variantSel').addEventListener('change', (e) => { st.variant = e.target.value; reparse(); });

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

  // ---------- arquivos ----------
  function fillFileSelect() {
    const sel = $('fileSel');
    sel.innerHTML = [...st.files.keys()].sort().map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
    sel.value = st.current;
    $('fileZip').hidden = st.files.size < 2;
  }
  function openFile(name, src) {
    if (src !== undefined) st.files.set(name, src);
    st.current = name;
    st.anim = '';
    st.frame = 0;
    st.playing = false;
    st.view.auto = true;
    stopBuild();
    fillFileSelect();
    editor.setValue(st.files.get(name) || '', true);
    saveWorkspace();
  }
  function uniqueName(base) {
    if (!st.files.has(base)) return base;
    const stem = base.replace(/\.weasel$/, '');
    for (let i = 2; ; i++) if (!st.files.has(`${stem}${i}.weasel`)) return `${stem}${i}.weasel`;
  }
  $('fileSel').addEventListener('change', (e) => openFile(e.target.value));
  $('fileAdd').addEventListener('click', () => openFile(uniqueName('desenho.weasel'), W.blankProgram));
  $('fileRen').addEventListener('click', () => {
    let name = prompt('Novo nome do arquivo:', st.current);
    if (!name || name === st.current) return;
    if (!/\.\w+$/.test(name)) name += '.weasel';
    if (st.files.has(name)) { hint(`Já existe um arquivo "${name}".`, 2600); return; }
    const src = editor.value;
    st.files.delete(st.current);
    openFile(name, src);
  });
  $('fileDel').addEventListener('click', () => {
    if (st.files.size < 2) { hint('Este é o único arquivo.', 2000); return; }
    if (!confirm(`Excluir "${st.current}" deste navegador? (o arquivo baixado, se houver, continua no seu computador)`)) return;
    st.files.delete(st.current);
    openFile([...st.files.keys()].sort()[0]);
  });
  $('fileZip').addEventListener('click', () => {
    const enc = new TextEncoder();
    st.files.set(st.current, editor.value);
    W.exporter.download(W.zip([...st.files].map(([n, s]) => ({ name: n, data: enc.encode(s) }))), 'weasel_arquivos.zip');
  });

  const exSel = $('exampleSel');
  exSel.innerHTML = '<option value="">Exemplos…</option>' + W.examples.map((x) => `<option value="${x.id}">${esc(x.title)}</option>`).join('');
  exSel.addEventListener('change', () => {
    const x = W.examples.find((e) => e.id === exSel.value);
    exSel.value = '';
    if (!x) return;
    const name = x.file + '.weasel';
    // exemplos que usam include trazem junto os arquivos de que precisam (sem apagar versões editadas)
    for (const depId of x.deps || []) {
      const dep = W.examples.find((e) => e.id === depId);
      if (dep && !st.files.has(dep.file + '.weasel')) st.files.set(dep.file + '.weasel', dep.src);
    }
    if (st.files.has(name) && st.files.get(name) !== x.src && !confirm(`Substituir "${name}" pelo exemplo original?`)) { openFile(name); return; }
    openFile(name, x.src);
    hint(`Exemplo "${x.title}" aberto em ${name}.`, 3000);
  });
  $('btnNew').addEventListener('click', () => { openFile(uniqueName('desenho.weasel'), W.blankProgram); hint('Arquivo novo criado.', 2000); });
  $('btnOpen').addEventListener('click', () => $('fileIn').click());
  $('fileIn').addEventListener('change', async (e) => {
    const list = [...e.target.files];
    e.target.value = '';
    if (!list.length) return;
    for (const f of list) st.files.set(f.name, await f.text());
    openFile(list[0].name);
    if (list.length > 1) hint(`${list.length} arquivos abertos — o include encontra os outros pelo nome.`, 3200);
  });
  $('btnSave').addEventListener('click', saveFile);
  function saveFile() {
    W.exporter.download(new Blob([editor.value], { type: 'text/plain;charset=utf-8' }), st.current);
  }

  // referência
  const help = $('help');
  const toggleHelp = (on) => { help.hidden = on === undefined ? !help.hidden : !on; };
  $('btnHelp').addEventListener('click', () => toggleHelp());
  $('helpClose').addEventListener('click', () => toggleHelp(false));

  // exportar
  const exportUI = W.exporter.setupDialog({
    model: () => st.model,
    parseFor: (v) => (v === st.variant ? st.model : parseFor(v)),
    variants: () => st.model.variants,
    variant: () => st.variant,
    state: () => ({ anim: st.anim, frame: st.frame }),
    baseName,
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
    if (e.key === ' ') { e.preventDefault(); play(!st.playing); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } else if (e.key === 'f' || e.key === 'F') { st.view.auto = true; draw(); }
  });

  // ---------- início ----------
  let files = null;
  try { files = JSON.parse(store.get('weasel.files') || 'null'); } catch (e) { files = null; }
  if (files && Object.keys(files).length) {
    for (const [k, v] of Object.entries(files)) st.files.set(k, v);
    const cur = store.get('weasel.current');
    openFile(st.files.has(cur) ? cur : [...st.files.keys()][0]);
  } else {
    const old = store.get('weasel.src');
    if (old && old.trim()) openFile((store.get('weasel.name') || 'desenho') + '.weasel', old);
    else openFile(W.examples[0].file + '.weasel', W.examples[0].src);
  }

  W.app = { st, editor, draw, reparse, parseFor };
})(window.Weasel = window.Weasel || {});
