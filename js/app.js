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
    shot: '', // filme: '' = o filme inteiro; senão o número do plano na linha do tempo
    camView: true, // filme: o que a câmera filma (ou o mundo inteiro como foi desenhado)
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
    media: new Map(), // sons (audio): nome → { buf, duração, amostras do .wav, áudio decodificado para tocar }
    sound: true, // tocar o som do filme no player
    subs: true, // mostrar as legendas do filme na tela
    timeline: true, // mostrar a linha do tempo do filme
  };
  let raf = 0, saveTimer = 0;
  const baseName = () => st.current.replace(/\.[^.]+$/, '') || 'desenho';
  // ---------- filme ----------
  const isFilm = () => !!(st.model && st.model.film);
  const tline = () => W.film.timeline(st.model);
  // trecho que o player toca: o filme inteiro ou um plano
  function filmRange() {
    const tl = tline(), e = st.shot !== '' ? tl.entries[+st.shot] : null;
    return e ? [e.start, e.start + e.frames] : [0, Math.max(1, tl.frames)];
  }
  const filmActors = () => (isFilm() ? [...st.model.film.actors, ...st.model.film.shots.flatMap((s) => s.actors)] : []);
  // mundo → quadro (na tela) para a profundidade d: na vista da câmera, o que a câmera faz; no mundo, nada
  const filmView = (d) => W.film.viewAt(st.model, st.frame, d, st.camView ? 'camera' : 'world');
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
  const parseFor = (variant) => L.parse(editor.value, { file: st.current, resolve: resolveFile, media: mediaInfo, variant: variant || null });

  // ---------- sons (audio) ----------
  // Guardados no navegador (IndexedDB, que aguenta arquivos grandes), pelo nome. O .wav é lido aqui (o lip
  // sync automático precisa das amostras); todos são decodificados pelo navegador para tocar no player.
  const idb = {
    db: undefined,
    open() {
      if (this.db !== undefined) return Promise.resolve(this.db);
      return new Promise((res) => {
        try {
          const r = indexedDB.open('weasel', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('media');
          r.onsuccess = () => res((this.db = r.result));
          r.onerror = () => res((this.db = null));
        } catch (e) { res((this.db = null)); }
      });
    },
    async run(mode, fn) {
      const db = await this.open();
      if (!db) return null;
      return new Promise((res) => {
        try { const rq = fn(db.transaction('media', mode).objectStore('media')); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); }
      });
    },
    put(name, buf) { return this.run('readwrite', (s) => s.put(buf, name)); },
    del(name) { return this.run('readwrite', (s) => s.delete(name)); },
    async all() {
      const keys = (await this.run('readonly', (s) => s.getAllKeys())) || [];
      const out = [];
      for (const k of keys) { const v = await this.run('readonly', (s) => s.get(k)); if (v) out.push([k, v]); }
      return out;
    },
  };
  let audioCtx = null;
  const actx = () => {
    if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; audioCtx = AC ? new AC() : null; }
    return audioCtx;
  };
  const AUDIO_EXT = /\.(wav|mp3|ogg|oga|opus|m4a|aac|flac|webm)$/i;
  async function addMedia(name, buf, persist) {
    const info = { name, buf, kind: 'other', duration: null, sampleRate: null, mono: null, audio: null };
    try { Object.assign(info, W.audio.parseWav(buf)); } catch (e) { /* não é .wav: só para ouvir */ }
    st.media.set(name, info);
    if (persist) idb.put(name, buf);
    try {
      const ac = actx();
      if (ac) { info.audio = await ac.decodeAudioData(buf.slice(0)); if (!info.duration) info.duration = info.audio.duration; }
    } catch (e) { if (info.kind !== 'wav') hint(`O navegador não conseguiu ler o som "${name}".`, 3000); }
  }
  // o som pelo nome escrito no audio (também só pelo nome do arquivo, sem a pasta)
  function mediaInfo(name) {
    if (st.media.has(name)) return st.media.get(name);
    const base = name.split(/[\\/]/).pop();
    for (const [k, v] of st.media) if (k.split(/[\\/]/).pop() === base) return v;
    return null;
  }
  function fillMediaList() {
    const b = $('mediaBtn'), list = $('mediaList');
    b.hidden = !st.media.size;
    b.textContent = `♪ ${st.media.size}`;
    list.innerHTML = '';
    for (const [name, m] of st.media) {
      const row = document.createElement('div');
      row.className = 'media-row';
      row.innerHTML = `<span class="mn"></span><span class="md">${m.duration ? m.duration.toFixed(1) + 's' : '?'}${m.kind === 'wav' ? ` · ${m.sampleRate} Hz` : ''}</span><button type="button" class="x" title="Tirar este som do navegador">✕</button>`;
      row.querySelector('.mn').textContent = name;
      row.querySelector('button').addEventListener('click', async () => {
        st.media.delete(name);
        await idb.del(name);
        fillMediaList();
        reparse();
      });
      list.appendChild(row);
    }
    if (!st.media.size) list.hidden = true;
  }

  // ---------- linha do tempo do filme ----------
  // a linha do arquivo onde está um shot, audio ou sub (para o cursor e para reescrever o tempo)
  let srcLines = null;
  function srcLine(src) {
    if (!srcLines || srcLines.model !== st.model) {
      srcLines = { model: st.model, map: new Map() };
      for (const [line, rec] of st.model.byLine) {
        const s = rec.audio || rec.sub || rec.shot;
        if (s) srcLines.map.set(s, line);
      }
    }
    return srcLines.map.has(src) ? srcLines.map.get(src) : -1;
  }
  // arrastou na linha do tempo: o novo tempo vai para o código (at= e dur= do audio, tempo e dur= do sub, dur= do shot)
  function timeEdit(kind, item, field, sec) {
    const src = kind === 'shot' ? item.shot : kind === 'audio' ? item.a : item.src;
    const line = srcLine(src);
    if (line < 0) return;
    const sst = st.model.byLine.get(line).st, off = editor.lineStart(line);
    const fmt = (s) => `${+Math.max(0, s).toFixed(3)}s`;
    const setAttr = (key, val, after) => {
      const a = sst.attrs.get(key);
      if (a) editor.replaceRange(off + a.vfrom, off + a.to, val, {});
      else editor.replaceRange(off + after.to, off + after.to, ` ${key}=${val}`, {});
    };
    const isAudio = kind === 'audio' || item.fromAudio;
    if (kind === 'shot') setAttr('dur', fmt(sec), sst.pos[0]);
    else if (isAudio) setAttr(field === 'start' ? 'at' : 'dur', fmt(field === 'start' ? sec - item.base : sec), sst.pos[1]);
    else if (field === 'start') editor.replaceRange(off + sst.pos[0].from, off + sst.pos[0].to, fmt(sec - item.base), {});
    else setAttr('dur', fmt(sec), sst.pos[1]);
  }
  const tlView = W.timelineView($('tlCanvas'), {
    model: () => st.model,
    frame: () => st.frame,
    setFrame: (f) => {
      st.playing = false;
      stopSound();
      st.frame = f;
      const [a, b] = filmRange();
      if (f < a || f >= b) st.shot = '';
      fillAnimSelect();
      draw();
    },
    range: () => filmRange(),
    editable: (owner) => owner === st.model,
    lineOf: srcLine,
    gotoLine: (line) => editor.goto(line, 0),
    edit: timeEdit,
    open: (file) => { if (file && st.files.has(file)) openFile(file); else hint(file ? `Abra "${file}" com Abrir… para editar.` : 'Este bloco é deste arquivo.', 2600); },
    hint: (msg) => hint(msg, 2400),
  });

  // ---------- tocar o som do filme ----------
  const voices = [];
  function stopSound() {
    for (const n of voices) { try { n.stop(); } catch (e) { /* já parou */ } }
    voices.length = 0;
  }
  // toca, a partir do quadro atual, os sons do trecho que o player está tocando
  function startSound() {
    stopSound();
    if (!isFilm() || !st.playing || !st.sound) return;
    const ac = actx();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const fps = tline().fps, hi = filmRange()[1], when = ac.currentTime + 0.04;
    for (const c of W.film.audioClips(st.model, st.frame / fps, hi / fps)) {
      const buf = c.media && c.media.audio;
      if (!buf) continue;
      const src = ac.createBufferSource(), gain = ac.createGain();
      src.buffer = buf;
      src.loop = c.loop;
      src.playbackRate.value = st.speed;
      gain.gain.value = c.vol;
      src.connect(gain).connect(ac.destination);
      const t0 = when + c.at / st.speed;
      if (c.loop) { src.start(t0, c.offset % buf.duration); src.stop(t0 + c.dur / st.speed); } else src.start(t0, c.offset, c.dur);
      voices.push(src);
    }
  }

  function reparse() {
    st.files.set(st.current, editor.value);
    st.model = parseFor(st.variant);
    editor.setErrors(st.model.errors);
    if (st.anim && !st.model.animMap.has(st.anim)) st.anim = '';
    if (isFilm()) {
      const tl = tline();
      if (st.shot !== '' && !tl.entries[+st.shot]) st.shot = '';
      if (st.frame >= tl.frames) st.frame = 0;
    } else st.shot = '';
    $('tCameraWrap').hidden = !isFilm();
    $('tTimelineWrap').hidden = !isFilm();
    $('timeline').hidden = !(isFilm() && st.timeline);
    $('bSound').hidden = !(isFilm() && tline().audios.length);
    $('bSubs').hidden = !(isFilm() && tline().subs.length);
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

  const KIND = { pt: 'ponto', tan: 'alça', center: 'centro', corner: 'canto', pivot: 'pivô', hip: 'raiz do membro', root: 'raiz', pos: 'posição', light: 'luz', box: 'caixa', point: 'ponto de encaixe' };
  function activeHandle(rec) {
    if (!rec) return -1;
    return rec.handles.findIndex((h) => st.caret.col >= h.from && st.caret.col <= h.to);
  }
  function updateCaretInfo() {
    const rec = st.model && st.model.byLine.get(st.caret.line);
    let s = `linha <b>${st.caret.line + 1}</b>`;
    if (rec) {
      const what = rec.el ? rec.el.type : rec.st.cmd;
      const name = rec.el ? rec.el.name : rec.layer ? rec.layer.name : rec.bone ? rec.bone.name : rec.cloth ? rec.cloth.name : rec.anim ? rec.anim.name : rec.def ? rec.def.name : rec.grad ? rec.grad.name : rec.light ? rec.light.name : rec.pat ? rec.pat.name : rec.actor ? rec.actor.name : rec.shot ? rec.shot.name : rec.box ? rec.box.name : rec.point ? rec.point.name : rec.tile ? rec.tile.name : rec.audio ? rec.audio.name : rec.mouth ? rec.mouth.name : rec.use || rec.scene || '';
      s += ` · ${what}${name ? ` <b>${esc(name)}</b>` : ''}`;
      if (rec.actor) s += ` · ${esc(rec.actor.file)}${rec.actor.model ? '' : ' <span style="color:var(--err)">(não carregou)</span>'}`;
      if (rec.shot) s += ` · ${Math.round(rec.shot.dur * 1000) / 1000}s${rec.shot.trans ? ` · entra com ${rec.shot.trans.type} (${Math.round(rec.shot.trans.dur * 1000) / 1000}s)` : ''}`;
      if (rec.at) s += ` · ${Math.round(rec.at.t * 1000) / 1000}s no shot ${esc(rec.at.shot.name)}`;
      if (rec.audio) {
        const a = rec.audio;
        s += ` · ${esc(a.file)}${a.media ? ` · ${a.media.duration ? a.media.duration.toFixed(1) + 's' : ''}` : ' <span style="color:var(--warn)">(abra o arquivo de som com Abrir…)</span>'}${a.lips ? ` · boca de ${esc(a.lips)}${a.cues ? ' (Rhubarb)' : ''}` : ''}`;
      }
      if (rec.sub) s += ` · legenda de ${rec.sub.dur.toFixed(1)}s`;
      if (rec.mouth) s += ` · bocas ${Object.keys(rec.mouth.map).join(' ')}`;
      if (rec.box) s += ` · ${{ body: 'colisão do corpo', hit: 'golpe (hitbox)', hurt: 'leva dano (hurtbox)' }[rec.box.kind]}`;
      if (rec.point) s += ` · ponto de encaixe${rec.point.bone ? ` no osso ${esc(rec.point.bone)}` : ''} (Marker2D no Godot)`;
      if (rec.tile) s += ` · célula ${rec.tile.col},${rec.tile.row}${rec.tile.collision ? ` · colisão ${esc(rec.tile.collision.name)}` : rec.tile.solid ? ' · sólido' : ''}${rec.tile.oneway ? ' · só por cima' : ''}`;
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
    // Cursor num at ou shot do filme: vai para aquele momento
    if (rec && (rec.audio || rec.sub) && isFilm() && !st.playing) {
      const tl = tline();
      const c = rec.audio ? tl.audios.find((x) => x.a === rec.audio) : tl.subs.find((x) => x.src === rec.sub);
      if (c) { st.frame = Math.min(tl.frames - 1, Math.round(c.start * tl.fps)); const [a, b] = filmRange(); if (st.frame < a || st.frame >= b) st.shot = ''; fillAnimSelect(); }
    }
    if (rec && (rec.at || rec.shot) && isFilm() && !st.playing) {
      const f = rec.at ? W.film.frameOfShot(st.model, rec.at.shot, rec.at.t) : W.film.frameOfShot(st.model, rec.shot, 0);
      if (f !== null && f !== st.frame) {
        st.frame = f;
        const [a, b] = filmRange();
        if (f < a || f >= b) st.shot = '';
        fillAnimSelect();
      }
    }
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
    film: 'este arquivo é um filme', shot: 'plano do filme', actor: 'outro arquivo em cena', camera: 'câmera do plano',
    at: 'muda algo num tempo', scene: 'planos de outro filme',
    audio: 'som de referência (fala, música)', sub: 'legenda', mouth: 'bocas do lip sync',
    box: 'colisão, golpe ou dano (jogo)', godot: 'cena do Godot', tileset: 'folha de blocos', tile: 'um bloco do tileset',
    point: 'ponto de encaixe (jogo)',
  };
  // o que dá para mudar com at, com o tipo de valor
  function atTargets(m) {
    const out = [];
    for (const a of filmActors()) for (const p of Object.keys(L.ACTOR_PROPS)) out.push({ label: `${a.name}.${p}=`, detail: 'ator' });
    for (const p of Object.keys(L.CAMERA_PROPS)) out.push({ label: `camera.${p}=`, detail: 'câmera' });
    for (const n of m.lights.keys()) for (const p of Object.keys(L.LIGHT_PROPS)) out.push({ label: `${n}.${p}=`, detail: 'luz' });
    for (const n of m.layerMap.keys()) for (const p of ['opacity', 'show']) out.push({ label: `${n}.${p}=`, detail: 'camada' });
    for (const n of m.named.keys()) for (const p of Object.keys(L.SHAPE_AT_PROPS)) out.push({ label: `${n}.${p}=`, detail: 'forma' });
    out.push({ label: 'ease=' });
    return out;
  }
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
    const actorOf = (name) => filmActors().find((a) => a.name === name);
    const fileList = () => names([...st.files.keys()].filter((f) => f !== st.current).map((f) => `"${f}"`), 'arquivo');
    if (eq > 0) {
      const key = cur.slice(0, eq);
      if (cmd === 'at' && key.includes('.')) {
        const target = key.slice(0, key.lastIndexOf('.')), prop = key.slice(key.lastIndexOf('.') + 1);
        const ac = actorOf(target);
        if (prop === 'anim') return ac && ac.model ? [...names(ac.model.anims.map((a) => a.name), 'animação'), { label: 'none' }] : [];
        if (prop === 'variant') return ac && ac.model ? [...names(ac.model.variants, 'variante'), { label: 'none' }] : [];
        if (prop === 'follow') return [...names(filmActors().map((a) => a.name), 'ator'), { label: 'none' }];
        if (prop === 'flip') return names(['x', 'y', 'xy', 'none']);
        if (prop === 'show') return names(['1', '0']);
        if (prop === 'draw') return names(['0', '1'], '0 = nada, 1 = inteira');
        if (prop === 'c' || prop === 'fadec') return names(colors, 'cor');
        return [];
      }
      if (cmd === 'shot' && key === 'in') return names(L.TRANSITIONS.map((t) => t + ',0.5s'), 'transição');
      if (cmd === 'actor') {
        const rec = m.byLine.get(st.caret.line), ac = rec && rec.actor;
        if (key === 'anim') return ac && ac.model ? names(ac.model.anims.map((a) => a.name), 'animação') : [];
        if (key === 'variant') return ac && ac.model ? names(ac.model.variants, 'variante') : [];
        if (key === 'hide') return ac && ac.model ? names([...ac.model.layerMap.keys()], 'camada') : [];
        if (key === 'flip') return names(['x', 'y', 'xy', 'none']);
      }
      if (cmd === 'camera' && key === 'follow') return names(filmActors().map((a) => a.name), 'ator');
      if (cmd === 'camera' && key === 'fadec') return names(colors, 'cor');
      if (cmd === 'key' && key.includes('.')) {
        const prop = key.slice(key.lastIndexOf('.') + 1);
        if (prop === 'shape') return names(els, 'forma');
        if (prop === 'c' || prop === 'inkc') return m.lights.has(key.slice(0, key.lastIndexOf('.'))) ? names(colors, 'cor') : colorList();
        if (prop === 'show') return names(['1', '0']);
        if (prop === 'draw') return names(['0', '1'], '0 = nada, 1 = inteira');
        if (prop === 'above' || prop === 'below') {
          const target = key.slice(0, key.lastIndexOf('.'));
          // forma: só as da mesma camada; camada: as outras camadas
          const mine = m.named.has(target) ? new Set(m.named.get(target).map((e) => e.layer)) : null;
          const pool = mine ? els.filter((n) => n !== target && m.named.get(n).some((e) => mine.has(e.layer))) : [...m.layerMap.keys()].filter((n) => n !== target);
          return [...names(pool, prop === 'above' ? 'pinta logo depois desta' : 'pinta logo antes desta'), { label: 'none', detail: 'volta para a ordem do arquivo' }];
        }
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
      if (cmd === 'variant' && (key === 'show' || key === 'hide')) return [...names(els, 'forma'), ...names([...m.layerMap.keys()], 'camada')];
      if (cmd === 'palette' || cmd === 'variant' || cmd === 'def') return colorList();
      switch (key) {
        case 'c': case 'inkc': case 'bg': return colorList();
        case 'w': case 'ink': return names(widths, 'espessura');
        case 'bone': case 'on': case 'parent': case 'target': return names([...m.bones.keys()], 'osso');
        case 'cloth': return names([...m.cloths.keys()], 'tecido');
        case 'inkon': return names([...m.layerMap.keys()], 'camada');
        case 'clip': case 'cut': return [...names(els, 'forma'), ...names([...m.layerMap.keys()], 'camada')];
        case 'only': return [...names(m.anims.map((a) => a.name), 'animação'), { label: 'pose', detail: 'pose parada' }];
        case 'body': return names(L.GODOT_BODIES, 'nó raiz do Godot');
        case 'collision': return names(els.filter((n) => m.named.get(n)[0].closed), 'forma');
        case 'lips': return names(filmActors().filter((a) => a.model && a.model.mouth).map((a) => a.name), 'ator com boca');
        case 'cues': return names([...st.files.keys()].filter((f) => /\.(json|tsv|txt)$/i.test(f)).map((f) => `"${f}"`), 'bocas do Rhubarb');
        case 'subs': return names(['burn', 'file']);
        case 'A': case 'B': case 'C': case 'D': case 'E': case 'F': case 'G': case 'H': case 'X':
          if (cmd === 'mouth') return names(els.filter((n) => n !== (ws[1] && ws[1].text)), 'forma (nome@0.5 = metade do morph)');
          return [];
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
        ...[...m.boxes.keys()].map((n) => ({ label: `${n}.show=`, detail: 'caixa: 1 liga, 0 desliga' })),
        { label: 'ease=' },
      ];
    }
    if (cmd === 'box' && idx === 2) return names(['body', 'hit', 'hurt'], 'tipo');
    if (cmd === 'box' && idx === 3) return names(['rect', 'circle', 'capsule'], 'formato');
    if (cmd === 'use' && idx === 1) return names([...m.defs.keys()], 'componente');
    if (cmd === 'use' && idx >= 2) {
      const def = m.defs.get(ws[1] && ws[1].text);
      return [...names(L.ATTRS.use.map((a) => a + '='), 'atributo'), ...(def ? names([...def.st.attrs.keys()].map((k) => k + '='), 'parâmetro') : [])];
    }
    if (cmd === 'include' && idx === 1) return names([...st.files.keys()].filter((f) => f !== st.current), 'arquivo');
    if ((cmd === 'actor' && idx === 2) || (cmd === 'scene' && idx === 1)) return fileList();
    if (cmd === 'audio' && idx === 2) return names([...st.media.keys()].map((f) => `"${f}"`), 'som aberto');
    if (cmd === 'sub' && idx === 1) return names(['0s', '1s', '+0.3s'], 'tempo');
    if (cmd === 'mouth' && idx === 1) return names(els, 'forma da boca');
    if (cmd === 'mouth' && idx >= 2) {
      const what = { A: 'fechada (M, B, P)', B: 'pouco aberta', C: 'aberta', D: 'bem aberta', E: 'arredondada (O)', F: 'biquinho (U)', G: 'dentes no lábio (F, V)', H: 'língua (L)', X: 'descanso' };
      return L.VISEMES.map((v) => ({ label: v + '=', detail: what[v] }));
    }
    if (cmd === 'at' && idx === 1) return names(['0s', '1s', '+1s', '+0.5s'], 'tempo');
    if (cmd === 'at' && idx >= 2) return atTargets(m);
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
  // filme: código de tempo, plano e o tempo dentro dele
  function filmText() {
    const tl = tline(), loc = W.film.locate(st.model, st.frame);
    if (!loc) return 'filme sem planos';
    return `${W.film.timecode(st.frame, tl.fps)} · ${loc.entry.name} +${loc.t.toFixed(2)}s`;
  }
  function fillFilmSelect() {
    const sel = $('animSel'), tl = tline();
    const secs = (n) => `${Math.round((n / tl.fps) * 10) / 10}s`;
    const want = [['', `filme inteiro · ${secs(tl.frames)}`], ...tl.entries.map((e, i) => [String(i), `${i + 1}. ${e.name} · ${secs(e.frames)}`])];
    if (want.map((w) => w.join('=')).join('\n') !== [...sel.options].map((o) => `${o.value}=${o.textContent}`).join('\n')) {
      sel.innerHTML = '';
      for (const [v, t] of want) { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }
    }
    sel.value = st.shot;
    const [a, b] = filmRange();
    if (st.frame < a || st.frame >= b) st.frame = a;
    const sl = $('frameSl');
    sl.min = a;
    sl.max = b - 1;
    sl.value = st.frame;
    sl.disabled = b - a < 2;
    const lbl = $('frameLbl');
    lbl.textContent = filmText();
    lbl.classList.remove('event');
    $('bPlay').classList.toggle('on', st.playing);
  }
  function fillAnimSelect() {
    if (isFilm()) { fillFilmSelect(); return; }
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
    sl.min = 0;
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
    if (isFilm()) {
      const [a, b] = filmRange();
      if (on && st.frame >= b - 1) st.frame = a;
      st.playing = on;
      if (on) { stopBuild(); st.lastT = performance.now(); st.acc = 0; }
      if (on) startSound(); else stopSound();
      fillAnimSelect();
      kick();
      return;
    }
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
    if (isFilm()) {
      const [a, b] = filmRange();
      st.playing = false;
      stopSound();
      st.frame = a + ((st.frame - a + d) % (b - a) + (b - a)) % (b - a);
      fillAnimSelect();
      draw();
      return;
    }
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
    if (isFilm()) { hint('A pintura passo a passo é para desenhos; num filme, use o player.', 2600); return; }
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
    if (st.playing && isFilm()) {
      const fps = tline().fps, [lo, hi] = filmRange();
      st.acc += ((t - st.lastT) / 1000) * fps * st.speed;
      st.lastT = t;
      if (st.acc >= 1) {
        const n = Math.floor(st.acc);
        st.acc -= n;
        const before = st.frame;
        st.frame = lo + ((st.frame - lo + n) % (hi - lo));
        if (st.frame < before) startSound(); // deu a volta: o som recomeça junto
        $('frameSl').value = st.frame;
        $('frameLbl').textContent = filmText();
      }
      again = true;
    } else if (st.playing && a) {
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
    if (isFilm()) { drawFilm(ctx, dpr, T); if (st.timeline) tlView.draw(); return; }
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
    if (st.show.guides && m.tileset) drawTileset(ctx, m, z);
    if (st.show.guides && m.boxes.size) drawBoxes(ctx, m, pose, z);
    if (st.show.guides && m.points.size) drawPoints(ctx, m, pose, z);
    if (st.show.guides && m.lights.size) drawLights(ctx, m, pose, z);
    if (st.show.bones) drawBones(ctx, m, pose, z);
    if (bf) S.drawTrace(ctx, m, pose, st.build.plan, bf.st, z);
    else if (st.show.points) drawHandles(ctx, m, pose, z);
  }

  // Filme: na vista da câmera, o quadro como vai sair no vídeo; no mundo, tudo como foi desenhado
  // (sem câmera, sem recorte), com a moldura do quadro parado e a da câmera neste momento.
  function drawFilm(ctx, dpr, T) {
    const m = st.model, c = m.canvas, z = st.view.z;
    if (!tline().frames) return;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 26 * dpr;
    ctx.shadowOffsetY = 6 * dpr;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, c.w, c.h);
    ctx.restore();
    if (st.camView) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, c.w, c.h);
      ctx.clip();
      if (m.finish.pixel > 1 || S.hasPost(m)) {
        const img = W.film.renderFrame(m, st.frame, { scale: Math.min(m.finish.posterize ? 1 : 2, z * dpr), subs: st.subs });
        ctx.imageSmoothingEnabled = m.finish.pixel <= 1;
        ctx.drawImage(img, 0, 0, c.w, c.h);
        ctx.imageSmoothingEnabled = true;
      } else W.film.drawFrame(ctx, m, st.frame, { subs: st.subs });
      ctx.restore();
    } else {
      W.film.drawFrame(ctx, m, st.frame, { view: 'world', guides: st.show.guides });
      T();
      ctx.save();
      ctx.lineWidth = 1.5 / z;
      ctx.setLineDash([8 / z, 6 / z]);
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.strokeRect(0, 0, c.w, c.h);
      const q = W.film.cameraQuad(m, st.frame);
      if (q) {
        ctx.setLineDash([]);
        ctx.lineWidth = 2.5 / z;
        ctx.strokeStyle = '#ff8a1f';
        ctx.beginPath();
        q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#ff8a1f';
        ctx.font = `${12 / z}px ${getComputedStyle(document.body).getPropertyValue('--mono')}`;
        ctx.fillText('câmera', q[0][0] + 6 / z, q[0][1] + 16 / z);
      }
      ctx.restore();
    }
    T();
    if (st.show.guides && m.lights.size) {
      ctx.save();
      const v = filmView(1);
      ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
      drawLights(ctx, m, W.film.frameState(m, st.frame).who[0].pose, z * Math.sqrt(Math.abs(W.geom.M.det(v))));
      ctx.restore();
    }
    if (st.show.points) drawHandles(ctx, m, currentPose(), z);
  }

  // caixas do jogo: corpo em verde, golpe em vermelho, dano em amarelo; desligadas, tracejadas
  const BOX_COLOR = { body: '#3fcf8e', hit: '#ff5a5a', hurt: '#ffd166' };
  function drawBoxes(ctx, m, pose, z) {
    ctx.save();
    for (const b of m.boxes.values()) {
      const s = S.boxState(m, pose, b);
      ctx.save();
      ctx.translate(s.cx, s.cy);
      ctx.rotate((s.rot * Math.PI) / 180);
      ctx.lineWidth = 2 / z;
      ctx.strokeStyle = BOX_COLOR[b.kind];
      ctx.fillStyle = BOX_COLOR[b.kind] + (s.on ? '26' : '00');
      ctx.globalAlpha = s.on ? 1 : 0.45;
      ctx.setLineDash(s.on ? [] : [5 / z, 4 / z]);
      ctx.beginPath();
      if (b.shape === 'rect') ctx.rect(-b.w / 2, -b.h / 2, b.w, b.h);
      else if (b.shape === 'circle') ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      else {
        const w = b.w / 2, h = b.h / 2, r = Math.min(w, h);
        if (b.h >= b.w) { ctx.arc(0, -h + r, r, Math.PI, 0); ctx.arc(0, h - r, r, 0, Math.PI); } else { ctx.arc(-w + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2); ctx.arc(w - r, 0, r, -Math.PI / 2, Math.PI / 2); }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // pontos de encaixe: uma mira com o nome e uma seta para onde o osso aponta
  function drawPoints(ctx, m, pose, z) {
    ctx.save();
    ctx.lineWidth = 1.5 / z;
    ctx.strokeStyle = ctx.fillStyle = '#c77dff';
    ctx.font = `${11 / z}px ${getComputedStyle(document.body).getPropertyValue('--mono')}`;
    for (const p of m.points.values()) {
      const s = S.pointState(m, pose, p), r = 6 / z, a = (s.rot * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.moveTo(s.x - r * 1.8, s.y);
      ctx.lineTo(s.x + r * 1.8, s.y);
      ctx.moveTo(s.x, s.y - r * 1.8);
      ctx.lineTo(s.x, s.y + r * 1.8);
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(a) * r * 3.2, s.y + Math.sin(a) * r * 3.2);
      ctx.stroke();
      ctx.fillText(p.name, s.x + r * 1.4, s.y - r * 1.4);
    }
    ctx.restore();
  }
  // tileset: a grade das células, o nome de cada bloco e a colisão dele
  function drawTileset(ctx, m, z) {
    const T = m.tileset, [tw, th] = T.size;
    ctx.save();
    ctx.lineWidth = 1 / z;
    ctx.strokeStyle = 'rgba(120,140,170,.55)';
    ctx.setLineDash([3 / z, 3 / z]);
    ctx.beginPath();
    for (let c = 0; c <= T.cols; c++) { ctx.moveTo(c * tw, 0); ctx.lineTo(c * tw, T.rows * th); }
    for (let r = 0; r <= T.rows; r++) { ctx.moveTo(0, r * th); ctx.lineTo(T.cols * tw, r * th); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `${10 / z}px ${getComputedStyle(document.body).getPropertyValue('--mono')}`;
    const pose = S.makePose(m, null, 0);
    for (const t of T.tiles) {
      const x = t.col * tw, y = t.row * th;
      ctx.strokeStyle = '#3fcf8e';
      ctx.lineWidth = 1.5 / z;
      if (t.collision) ctx.stroke(S.pathOf(S.geometry(m, pose, t.collision)));
      else if (t.solid) ctx.strokeRect(x + 1 / z, y + 1 / z, tw - 2 / z, th - 2 / z);
      if (t.oneway) { ctx.lineWidth = 3 / z; ctx.beginPath(); ctx.moveTo(x, y + 1 / z); ctx.lineTo(x + tw, y + 1 / z); ctx.stroke(); }
      ctx.fillStyle = 'rgba(20,24,34,.75)';
      ctx.fillRect(x, y + th - 12 / z, Math.min(tw, ctx.measureText(t.name).width + 6 / z), 12 / z);
      ctx.fillStyle = '#e8edf5';
      ctx.fillText(t.name, x + 3 / z, y + th - 3 / z);
    }
    ctx.restore();
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

  // filme: em que profundidade está a alça (null = não aparece nesta vista)
  function handleDepth(rec, h) {
    if (h.camera) return st.camView ? null : 1;
    const ac = h.actor ? filmActors().find((a) => a.name === h.actor) : rec.actor;
    if (ac) return ac.screen ? Infinity : ac.depth;
    const Ly = rec.el && rec.el.layer;
    if (Ly) return Ly.screen ? Infinity : Ly.depth || 1;
    return 1;
  }
  function handleList(m, pose) {
    const rec = m.byLine.get(st.caret.line);
    if (!rec || !rec.handles.length) return null;
    if (isFilm()) {
      return {
        rec,
        pts: rec.handles.map((h) => {
          const d = handleDepth(rec, h);
          if (d === null) return null;
          const p = S.handlePos(m, pose, rec, h);
          return M.apply(filmView(d), p[0], p[1]);
        }),
      };
    }
    return { rec, pts: rec.handles.map((h) => S.handlePos(m, pose, rec, h)) };
  }

  function drawHandles(ctx, m, pose, z) {
    const hl = handleList(m, pose);
    if (!hl) return;
    const { rec, pts } = hl;
    const active = st.drag ? st.drag.hi : activeHandle(rec);
    ctx.save();
    const ptIdx = rec.handles.map((h, i) => (h.kind === 'pt' && pts[i] ? i : -1)).filter((i) => i >= 0);
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
      if (h.kind !== 'tan' || !pts[i]) return;
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
      if (i === active || !pts[i]) return;
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
  // no filme, o ponto do mundo (no plano da ação) que está sob o mouse
  const toWorld = (e) => {
    const p = toCanvas(e);
    return isFilm() ? M.apply(M.invert(filmView(1)), p[0], p[1]) : p;
  };
  function hitHandle(e) {
    if (!st.show.points || st.build) return -1;
    const hl = handleList(st.model, currentPose());
    if (!hl) return -1;
    const [x, y] = toCanvas(e);
    let best = -1, bd = 10 / st.view.z;
    hl.pts.forEach((p, i) => { if (!p) return; const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } });
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
      const [x, y] = toWorld(e);
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
      if (st.playing || (!isFilm() && st.anim)) { hint(isFilm() ? 'Pause o player para arrastar pontos.' : 'Para arrastar pontos, escolha "pose parada" no player.', 2600); return; }
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
    const wp = toWorld(e);
    $('coords').textContent = `x ${Math.round(wp[0])}  y ${Math.round(wp[1])}`;
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
    if (hi < 0 || (st.anim && !isFilm())) return;
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
    if (isFilm()) {
      const dep = handleDepth(rec, h);
      if (dep === null) return;
      [x, y] = M.apply(M.invert(filmView(dep)), x, y);
    }
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

  $('animSel').addEventListener('change', (e) => {
    if (isFilm()) { stopSound(); st.playing = false; st.shot = e.target.value; st.frame = filmRange()[0]; fillAnimSelect(); draw(); return; }
    st.anim = e.target.value; st.frame = 0; stopBuild(); if (!st.anim) st.playing = false; fillAnimSelect(); draw();
  });
  $('tCamera').addEventListener('change', (e) => { st.camView = e.target.checked; draw(); });
  $('bPlay').addEventListener('click', () => play(!st.playing));
  $('bPrev').addEventListener('click', () => step(-1));
  $('bNext').addEventListener('click', () => step(1));
  $('frameSl').addEventListener('input', (e) => { st.playing = false; stopSound(); st.frame = +e.target.value; fillAnimSelect(); draw(); });
  $('speedSel').addEventListener('change', (e) => { st.speed = parseFloat(e.target.value); if (st.playing) startSound(); });
  $('bSound').addEventListener('click', () => { st.sound = !st.sound; $('bSound').classList.toggle('on', st.sound); if (st.playing) startSound(); else stopSound(); });
  $('tTimeline').addEventListener('change', (e) => { st.timeline = e.target.checked; $('timeline').hidden = !(isFilm() && st.timeline); draw(); });
  $('bSubs').addEventListener('click', () => { st.subs = !st.subs; $('bSubs').classList.toggle('on', st.subs); draw(); });
  $('mediaBtn').addEventListener('click', () => { const l = $('mediaList'); l.hidden = !l.hidden; });
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
    st.shot = '';
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
    const want = (W.exampleMedia ? Object.keys(W.exampleMedia) : []).filter((k) => x.src.includes(`"${k}"`) && !st.media.has(k));
    for (const k of want) addMedia(k, W.exampleMedia[k]().buffer, true).then(() => { fillMediaList(); reparse(); });
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
    const sounds = list.filter((f) => AUDIO_EXT.test(f.name)), texts = list.filter((f) => !AUDIO_EXT.test(f.name));
    for (const f of sounds) await addMedia(f.name, await f.arrayBuffer(), true);
    for (const f of texts) st.files.set(f.name, await f.text());
    fillMediaList();
    if (texts.length) openFile(texts[0].name); else reparse();
    if (sounds.length) hint(`${sounds.length} som${sounds.length > 1 ? 's' : ''} aberto${sounds.length > 1 ? 's' : ''}: ficam guardados neste navegador (♪ na barra de arquivos).`, 3600);
    else if (texts.length > 1) hint(`${texts.length} arquivos abertos — o include encontra os outros pelo nome.`, 3200);
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
    state: () => ({ anim: st.anim, frame: st.frame, shot: st.shot }),
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

  idb.all().then(async (list) => {
    for (const [k, v] of list) await addMedia(k, v, false);
    if (list.length) { fillMediaList(); reparse(); }
  });

  W.app = { st, editor, draw, reparse, parseFor };
})(window.Weasel = window.Weasel || {});
