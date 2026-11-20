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
    loopPick: null, // o botão repetir / uma vez clicado: { key, loop, on } (veja repeating())
    speed: 1,
    lastT: 0,
    acc: 0,
    view: { z: 1, x: 0, y: 0, auto: true },
    show: { guides: true, boxes: true, bones: false, onion: false, traj: false, refs: true, art: true, rulers: store.get('weasel.rulers') === '1' },
    caret: { line: 0, col: 0 },
    drag: null,
    pan: null,
    build: null,
    media: new Map(), // sons (audio): nome → { buf, duração, amostras do .wav, áudio decodificado para tocar }
    images: new Map(), // imagens guia (ref): nome → { img, w, h }
    refDrag: null,
    // painel das camadas: as linhas escolhidas (linha → tipo e nome, para conferir depois de editar o código),
    // a linha do cursor quando a escolha foi feita, as camadas fechadas na árvore e o arraste da escolha
    sel: new Map(),
    selCaret: -1,
    selAnchor: -1,
    layerShut: new Set(),
    gdrag: null,
    // réguas: as linhas guia deste arquivo (v = em pé, em x; h = deitadas, em y), o arraste de uma delas e a que
    // está grudando agora; medir: ligado, a medida (pontas a e b) e o arraste de uma ponta
    guides: { v: [], h: [] },
    guideDrag: null,
    guideHot: null,
    measure: false,
    meas: null,
    mdrag: null,
    // prender: ligada, os pontos escolhidos ("linha:ponto" → a linha sem os @, para conferir depois de editar),
    // a caixa sendo arrastada, o último clique (para pegar o de baixo) e o peso usado da última vez
    pin: { on: false, sel: new Map(), box: null, pick: null, w: 1, spin: new Map() },
    sound: true, // tocar o som do filme no player
    subs: true, // mostrar as legendas do filme na tela
    timeline: true, // mostrar a linha do tempo do filme
    // a ferramenta da barra da esquerda (veja setTool), a vista (código, dividido ou design) e o Espaço segurado
    // (move a vista arrastando; solto sem ter arrastado, toca)
    tool: 'select',
    layout: 'split',
    space: null,
    vpress: null, // Seleção: apertou numa forma e ainda não arrastou ({ x, y, pick, alt })
    marq: null, // a caixa de seleção (ou o laço) sendo arrastada no vazio
    none: -1, // a escolha foi tirada de propósito (clique no vazio, Esc) com o cursor nesta linha: a forma dela não vale
    lastXf: null, // a última transformação da escolha (o Ctrl+D repete): { mode, dx, dy | deg | sx, sy, fx, fy, copy }
    iso: null, // o grupo do isolamento (duplo clique num grupo): { line, name }; o resto do desenho fica parado
    symIso: [], // os símbolos abertos (duplo clique num use, etapa 6b), de fora para dentro: { name, back, had, was }
    clip: null, // o que o Ctrl+C copiou ({ text, n }), para o Ctrl+F e o Ctrl+B (js/ui-select.js)
    view3d: false, // a vista Camadas em 3D (js/ui-3d.js) no lugar do desenho
  };
  // prévia do def: ligada/desligada por def (sem entrada, ligada só sem use), os valores do painel por def,
  // o def mostrado agora e a vista de antes da prévia (volta quando ela some)
  const pv = { mode: new Map(), params: new Map(), shown: null, view: null, sig: '' };
  let raf = 0, saveTimer = 0;
  // avisos para a casca (js/ui-shell.js): 'tool' (trocou a ferramenta), 'layout' (trocou a vista), 'model' (o
  // código mudou), 'film' (abriu ou fechou um filme)
  const listeners = {};
  const emit = (k) => { for (const f of listeners[k] || []) f(); };
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
    // o editor chama o onCaret logo depois do onChange (Editor._emit), e é ele quem pinta: uma pintura por tecla, já com
    // o cursor novo (antes eram duas; docs/planos/desempenho.md, 9e)
    onChange: () => { st.none = -1; reparse(false); },
    // o cursor indo para uma linha fora da escolha (no código) solta a escolha do painel das camadas
    onCaret: (c) => {
      st.caret = c;
      if (c.line !== st.none) st.none = -1;
      if (st.sel.size && c.line !== st.selCaret && !st.sel.has(c.line)) clearSel();
      // entrou num def (ou saiu dele): o desenho troca para a prévia (ou volta)
      if (st.model && pvWanted() !== (st.model.preview ? st.model.preview.def : null)) { reparse(); return; }
      updateCaretInfo();
      markLayerPanel();
      draw();
    },
    complete: (c) => complete(c),
    duplicate: (text) => renameCopy(text),
  });

  // Ctrl+D: na cópia, o nome que a linha cria ganha um número (olho → olho_1; de novo → olho_2): ref, camada, osso,
  // animação, forma… Copiando várias linhas juntas, as que usam esses nomes passam a usar os novos (um osso copiado
  // com as formas presas nele: as cópias das formas ficam no osso novo). Linhas sem nome (use, key…) não mudam.
  const NAMES_NEW = new Set([...L.DRAWABLE, 'def', 'group', 'variant', 'layer', 'bone', 'cloth', 'gradient', 'pattern', 'light', 'anim', 'expr', 'box', 'point', 'ref', 'tile', 'actor', 'shot', 'mark', 'audio']);
  // que tipo de nome cada atributo usa: só esses trocam (c=cloak é a cor da palette, mesmo com uma forma cloak)
  const DRAWN = [...L.DRAWABLE];
  const NAME_REFS = { bone: ['bone'], bones: ['bone'], parent: ['bone'], cloth: ['cloth'], clip: DRAWN, cut: DRAWN, mirror: DRAWN, cast: DRAWN, above: DRAWN, below: DRAWN, only: ['anim'], lips: ['actor'] };
  const PAINTS = ['gradient', 'pattern']; // nas cores (c=, inkc=…), o nome de um gradient ou pattern
  function renameCopy(block) {
    const v = editor.value, map = new Map(), lines = block.split('\n'), sps = lines.map((t) => L.splitLine(t));
    const taken = (n) => new RegExp(`(^|[^\\w-])${n}(?![\\w-])`).test(v) || [...map.values()].some((x) => x.to === n);
    const decl = new Set(), open = [];
    for (const sp of sps) {
      const cmd = sp.words[0] && sp.words[0].text;
      // def … end copiado inteiro: só o componente ganha nome novo; as formas de dentro são dele e continuam com os
      // nomes de antes (as keys que mexem nelas, como a do piscar, valem também para a cópia)
      if (cmd === 'end') open.pop();
      else if (cmd === 'def' || cmd === 'repeat' || cmd === 'group') open.push(cmd);
      if (!NAMES_NEW.has(cmd) || (L.DRAWABLE.has(cmd) && open.includes('def'))) continue;
      // o nome é a primeira palavra solta (sem =) depois da instrução; nas formas, pulando hidden, bold…
      const pos = sp.words.slice(1).filter((w) => (w.text[0] === '"' || L.topIndex(w.text, '=') < 0) && !(L.DRAWABLE.has(cmd) && L.DRAW_FLAGS.has(w.text)));
      const n = pos[0] && pos[0].text;
      if (!n || !L.IDENT.test(n)) continue;
      decl.add(pos[0]);
      if (map.has(n)) continue;
      const base = n.replace(/_\d+$/, '') || n;
      let k = 1;
      while (taken(`${base}_${k}`)) k++;
      map.set(n, { to: `${base}_${k}`, kind: cmd });
    }
    if (!map.size) return null;
    // troca o nome que a linha cria e, nas outras palavras, os nomes que apontam para ele: alvo.prop= (key, at),
    // bone=, clip=, only=… conforme o tipo, e o componente do use (fora de textos entre aspas e de cores #hex)
    const edits = [];
    const swap = (from, id) => edits.push({ from, to: from + id.length, text: map.get(id).to });
    const kindOk = (id, kinds) => map.has(id) && (!kinds || kinds.includes(map.get(id).kind));
    let off = 0;
    sps.forEach((sp, li) => {
      const cmd = sp.words[0] && sp.words[0].text;
      sp.words.slice(1).forEach((w, wi) => {
        if (decl.has(w)) { swap(off + w.from, w.text); return; }
        if (w.text[0] === '"') return;
        if (wi === 0 && cmd === 'use') { if (kindOk(w.text, ['def'])) swap(off + w.from, w.text); return; }
        const eq = L.topIndex(w.text, '=');
        if (eq < 0) return;
        const key = w.text.slice(0, eq), dot = key.indexOf('.');
        if (dot > 0 && kindOk(key.slice(0, dot))) swap(off + w.from, key.slice(0, dot));
        const kinds = dot > 0 ? PAINTS : NAME_REFS[key] || PAINTS;
        for (const mt of w.text.slice(eq + 1).matchAll(/[A-Za-z_][\w-]*/g)) {
          const id = mt[0], i = eq + 1 + mt.index, prev = w.text[i - 1];
          if ((prev && /[\w#.$-]/.test(prev)) || !kindOk(id, kinds)) continue;
          swap(off + w.from + i, id);
        }
      });
      off += lines[li].length + 1;
    });
    edits.sort((a, b) => a.from - b.from);
    let text = block;
    for (const e of [...edits].reverse()) text = text.slice(0, e.from) + e.text + text.slice(e.to);
    // o cursor fica no mesmo lugar da cópia (dentro de um nome trocado, no mesmo ponto dele ou no fim)
    const at = (i) => {
      let d = 0;
      for (const e of edits) {
        if (e.to <= i) d += e.text.length - (e.to - e.from);
        else if (e.from < i) return e.from + d + Math.min(i - e.from, e.text.length);
        else break;
      }
      return i + d;
    };
    hint(`Na cópia: ${[...map].map(([a, b]) => `${a} → ${b.to}`).join(', ')}.`, 2600);
    return { text, at };
  }

  // Renomear (painéis Camadas e Símbolos, etapa 6): o nome que a linha cria e, no arquivo inteiro, as palavras que
  // apontam para ele: alvo.prop= (key, at), clip=, cut=, inkon=, hide=, show=, above=, below=, mirror=, shape=, o
  // mouth, o use de um def, a cor que usa um gradient… Um nome que outra linha também cria (dois furos com o mesmo
  // nome) muda só nesta linha. Devolve { n: quantas palavras trocou, only } ou { why }.
  const REFS = Object.assign({}, NAME_REFS, {
    clip: [...DRAWN, 'layer'], cut: [...DRAWN, 'layer'], above: [...DRAWN, 'layer'], below: [...DRAWN, 'layer'],
    inkon: ['layer'], hide: [...DRAWN, 'layer'], show: [...DRAWN, 'layer'], from: ['layer'], shape: DRAWN,
  });
  // a palavra do nome que a linha cria (a primeira solta depois da instrução; nas formas, pulando hidden, bold…)
  function nameWord(sp) {
    const cmd = sp.words[0] && sp.words[0].text;
    if (!NAMES_NEW.has(cmd)) return null;
    const w = sp.words.slice(1).find((x) => (x.text[0] === '"' || L.topIndex(x.text, '=') < 0) && !(L.DRAWABLE.has(cmd) && L.DRAW_FLAGS.has(x.text)));
    return w && L.IDENT.test(w.text) ? w : null;
  }
  function renameAt(line, to, key) {
    const v = editor.value, lines = v.split('\n'), sp = L.splitLine(lines[line] || ''), cmd = sp.words[0] && sp.words[0].text;
    const dw = nameWord(sp), from = dw && dw.text;
    if (!from) return { why: cmd === 'use' ? 'o use não tem nome: renomeie o def dele (no painel Símbolos)' : 'esta linha não cria um nome' };
    to = String(to || '').trim();
    if (to === from) return { n: 0 };
    if (!L.IDENT.test(to)) return { why: `"${to}" não serve de nome: use letras, números, _ e -, começando por uma letra` };
    if (new RegExp(`(^|[^\\w-])${to.replace(/-/g, '\\-')}(?![\\w-])`).test(v)) return { why: `o nome ${to} já aparece no arquivo` };
    const kind = cmd, drawn = L.DRAWABLE.has(kind);
    // quantas linhas criam este nome (do mesmo tipo de coisa: forma com forma)
    let twins = 0;
    lines.forEach((t, i) => {
      if (i === line) return;
      const s2 = L.splitLine(t), c2 = s2.words[0] && s2.words[0].text, w2 = nameWord(s2);
      if (w2 && w2.text === from && (drawn ? L.DRAWABLE.has(c2) : c2 === kind)) twins++;
    });
    const edits = [];
    let off = 0;
    lines.forEach((t, li) => {
      const s2 = L.splitLine(t), c2 = s2.words[0] && s2.words[0].text;
      s2.words.slice(1).forEach((w, wi) => {
        if (li === line && w.from === dw.from) { edits.push(off + w.from); return; }
        if (twins || w.text[0] === '"') return;
        if (wi === 0 && (c2 === 'use' || c2 === 'mouth')) { if (w.text === from && ((c2 === 'use' && kind === 'def') || (c2 === 'mouth' && drawn))) edits.push(off + w.from); return; }
        const eq = L.topIndex(w.text, '=');
        if (eq < 0) return;
        const k = w.text.slice(0, eq), dot = k.indexOf('.');
        if (dot > 0 && k.slice(0, dot) === from && kind !== 'def') edits.push(off + w.from);
        const kinds = c2 === 'mouth' ? DRAWN : dot > 0 ? (k.slice(dot + 1) === 'shape' ? DRAWN : PAINTS) : REFS[k] || PAINTS;
        if (!kinds.includes(kind)) return;
        for (const mt of w.text.slice(eq + 1).matchAll(/[A-Za-z_][\w-]*/g)) {
          const i = eq + 1 + mt.index, prev = w.text[i - 1];
          if (mt[0] !== from || (prev && /[\w#.$-]/.test(prev))) continue;
          edits.push(off + w.from + i);
        }
      });
      off += t.length + 1;
    });
    // tudo numa edição só (do primeiro nome trocado ao último); o cursor fica onde estava
    const at = [...new Set(edits)].sort((a, b) => a - b), a = at[0], b = at[at.length - 1] + from.length;
    let mid = v.slice(a, b);
    for (const i of [...at].reverse()) mid = mid.slice(0, i - a) + to + mid.slice(i - a + from.length);
    const c0 = editor.ta.selectionStart, shift = (o) => o + at.filter((i) => i + from.length <= o).length * (to.length - from.length);
    editor.replaceRange(a, b, mid, { key: key || 'rename' + Date.now(), select: [shift(c0), shift(c0)] });
    return { n: at.length, only: twins > 0, from };
  }

  const resolveFile = (name) => {
    for (const k of [name, name + '.weasel']) if (st.files.has(k)) return k === st.current ? editor.value : st.files.get(k);
    return null;
  };
  // want: o def da prévia (com os valores do painel), só para o que aparece no editor
  const parseFor = (variant, want, params) => L.parse(editor.value, {
    file: st.current, resolve: resolveFile, media: mediaInfo, image: (f) => !!imageInfo(f), imageHint: 'abra a imagem no painel "Referências" para ela ficar guardada neste navegador', variant: variant || null,
    preview: want ? { def: want, params: params || Object.fromEntries(pv.params.get(pvKey(want)) || []) } : null,
  });

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

  // ---------- imagens guia (ref) ----------
  // Guardadas no navegador junto com os sons (IndexedDB), pelo nome; o ref acha a imagem pelo nome do arquivo.
  // Nunca entram nas exportações: só aparecem aqui, para desenhar por cima.
  const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
  const IMAGE_TYPE = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml' };
  async function addImage(name, buf, persist) {
    const img = new Image(), url = URL.createObjectURL(new Blob([buf], { type: IMAGE_TYPE[name.split('.').pop().toLowerCase()] || 'image/png' }));
    // espera o load, não o img.decode(): o decode pode nunca terminar (aba ou painel escondido, alguns navegadores
    // embutidos), e aí a imagem não entrava, sem aviso nenhum
    try {
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    } catch (e) { URL.revokeObjectURL(url); hint(`O navegador não conseguiu ler a imagem "${name}".`, 3000); return null; }
    img.onload = img.onerror = null;
    const old = st.images.get(name);
    if (old) URL.revokeObjectURL(old.img.src);
    const info = { name, img, w: img.naturalWidth || 300, h: img.naturalHeight || 150 };
    st.images.set(name, info);
    if (persist) idb.put(name, buf);
    return info;
  }
  function imageInfo(name) {
    if (st.images.has(name)) return st.images.get(name);
    const base = name.split(/[\\/]/).pop();
    for (const [k, v] of st.images) if (k.split(/[\\/]/).pop() === base) return v;
    return null;
  }
  const refImage = (file) => { const i = imageInfo(file); return i ? i.img : null; };
  // onde o ref está no desenho: a matriz da imagem e o tamanho dela (null se a imagem não foi aberta)
  function refBox(r) {
    const i = imageInfo(r.file);
    return i ? { m: S.refMatrix(r, i.w, i.h), w: i.w, h: i.h } : null;
  }

  // Reescreve a linha de um ref: ch.pos 'x,y'; ch.attrs { nome: valor ou null para tirar }; ch.flags { lock: true/false }.
  // ch.caret: põe o cursor nessa linha (arrastar); senão o cursor fica onde estava (painel).
  function editRef(r, ch, key) {
    const off = editor.lineStart(r.line), v = editor.value;
    let end = v.indexOf('\n', off);
    if (end < 0) end = v.length;
    const text = v.slice(off, end), sp = L.splitLine(text), ws = sp.words;
    const edits = [], tail = sp.code.replace(/\s+$/, '').length;
    const cut = (t) => { let a = t.from; while (a > 0 && /[ \t]/.test(text[a - 1])) a--; edits.push({ from: a, to: t.to, text: '' }); };
    if (ch.pos) {
      // ref nome "imagem.png" x,y: o x,y vem depois do arquivo, e o nome do arquivo (entre aspas) pode ter vírgula
      const file = ws.slice(2).find((t) => t.text[0] === '"');
      const pt = ws.slice(2).find((t) => t.text[0] !== '"' && L.topIndex(t.text, '=') < 0 && (t.text.includes(',') || t.text.includes('{')));
      const after = file || ws[1];
      if (pt) edits.push({ from: pt.from, to: pt.to, text: ch.pos });
      else if (after) edits.push({ from: after.to, to: after.to, text: ' ' + ch.pos });
    }
    for (const [k, val] of Object.entries(ch.attrs || {})) {
      const t = ws.find((w) => w.text.startsWith(k + '='));
      if (t && val === null) cut(t);
      else if (t) edits.push({ from: t.from, to: t.to, text: `${k}=${val}` });
      else if (val !== null) edits.push({ from: tail, to: tail, text: ` ${k}=${val}` });
    }
    for (const [k, on] of Object.entries(ch.flags || {})) {
      const t = ws.slice(2).find((w) => w.text === k);
      if (t && !on) cut(t);
      else if (!t && on) edits.push({ from: tail, to: tail, text: ' ' + k });
    }
    let out = text;
    edits.map((e, i) => [e, i]).sort((a, b) => b[0].from - a[0].from || b[1] - a[1]).forEach(([e]) => { out = out.slice(0, e.from) + e.text + out.slice(e.to); });
    if (out === text) return;
    const ta = editor.ta, d = out.length - text.length;
    const keep = (p) => (p >= end ? p + d : p > off ? Math.min(p, off + out.length) : p);
    const sel = ch.caret ? [off + out.length, off + out.length] : [keep(ta.selectionStart), keep(ta.selectionEnd)];
    editor.replaceRange(off, end, out, { key: key || null, select: sel });
  }

  // uma imagem nova vira uma linha ref: cabendo no desenho, e só na animação escolhida no player.
  // pos: o ponto do desenho onde o meio da imagem fica (onde ela foi solta); sem pos, no meio do desenho.
  function insertRef(info, pos) {
    const m = st.model, c = m.canvas;
    let base = info.name.split(/[\\/]/).pop().replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_]/g, '_');
    if (!L.IDENT.test(base)) base = 'guia';
    let name = base, n = 2;
    while (m.refs.some((r) => r.name === name)) name = base + n++;
    const sc = Number(Math.min(1, c.w / info.w, c.h / info.h).toFixed(3));
    const [cx, cy] = pos || [c.w / 2, c.h / 2];
    const x = Math.round(cx - (info.w * sc) / 2), y = Math.round(cy - (info.h * sc) / 2);
    const txt = `ref ${name} "${info.name}" ${x},${y}${sc !== 1 ? ` scale=${sc}` : ''} opacity=0.5${st.anim ? ` only=${st.anim}` : ''}`;
    // depois do último ref; senão depois do canvas; senão no começo
    const lines = editor.value.split('\n');
    let at = m.refs.length ? Math.max(...m.refs.map((r) => r.line)) + 1 : lines.findIndex((l) => /^\s*canvas\b/.test(l)) + 1;
    if (at >= lines.length) {
      const e = editor.value.length;
      editor.replaceRange(e, e, (editor.value.endsWith('\n') ? '' : '\n') + txt, { select: [e, e] });
    } else {
      const off = editor.lineStart(at);
      editor.replaceRange(off, off, txt + '\n', { select: [off, off + txt.length] });
    }
    hint(`Imagem guia "${name}" adicionada${st.anim ? ` (só em ${st.anim})` : ''}: arraste para mover, o canto para mudar o tamanho.`, 4200);
  }

  let refSig = '';
  function fillRefPanel() {
    const m = st.model, film = isFilm(), b = $('refBtn'), p = $('refPanel');
    b.hidden = film;
    // quantas imagens guia o desenho tem fica no título (o botão é só o ícone)
    b.title = `Referências${m && m.refs.length ? ` (${m.refs.length} neste desenho)` : ''}: imagens guia por baixo para desenhar por cima (não saem na exportação)`;
    b.classList.toggle('on', !p.hidden);
    if (film) p.hidden = true;
    if (p.hidden || !m) return;
    const refs = m.refs;
    const sig = refs.map((r) => `${r.name}|${r.file}|${r.line}|${!!imageInfo(r.file)}`).join('/') + '#' + [...st.images.keys()].join('/');
    if (sig === refSig) {
      // só os valores: refazer tudo cortaria o arraste da opacidade
      p.querySelectorAll('.rp-row').forEach((row, i) => {
        const r = refs[i];
        row.querySelector('.vis').checked = !r.hidden;
        const lk = row.querySelector('.lk');
        lk.classList.toggle('on', r.lock);
        lk.textContent = r.lock ? '🔒' : '🔓';
        const op = row.querySelector('.op');
        if (document.activeElement !== op) op.value = r.opacity;
        row.querySelector('.ov').textContent = Math.round(r.opacity * 100) + '%';
      });
      p.querySelector('#rpShow').checked = st.show.refs;
      return;
    }
    refSig = sig;
    p.innerHTML = `<div class="rp-head"><b>Imagens guia</b><label class="tog" title="Mostrar ou esconder todas"><input type="checkbox" id="rpShow"> mostrar</label><span class="grow"></span><button type="button" class="x" title="Fechar">✕</button></div>
      <div class="rp-rows"></div>
      <div class="rp-foot"><button type="button" id="rpAdd">Adicionar imagem…</button><small>Só no editor: nunca sai na exportação.</small></div>
      <div class="rp-store"></div>`;
    p.querySelector('#rpShow').checked = st.show.refs;
    p.querySelector('#rpShow').addEventListener('change', (e) => { st.show.refs = e.target.checked; draw(); });
    p.querySelector('.x').addEventListener('click', () => { p.hidden = true; fillRefPanel(); });
    p.querySelector('#rpAdd').addEventListener('click', () => { refTarget = null; $('refIn').click(); });
    const rows = p.querySelector('.rp-rows');
    if (!refs.length) rows.innerHTML = '<div class="rp-empty">Nenhuma ainda. Adicione uma imagem para desenhar por cima dela; para cada movimento, uma imagem com <code>only=</code> a animação.</div>';
    refs.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'rp-row';
      const ok = !!imageInfo(r.file);
      row.innerHTML = `<input type="checkbox" class="vis" title="Visível"><button type="button" class="rn" title="Ir para a linha ${r.line + 1}"></button>` +
        (ok ? `<input type="range" class="op" min="0" max="1" step="0.05" title="Opacidade"><span class="ov"></span>` : `<button type="button" class="load" title="Abrir a imagem neste navegador">abrir ${r.file.split(/[\\/]/).pop()}…</button><span class="ov" hidden></span><input type="range" class="op" hidden>`) +
        `<button type="button" class="lk" title="Travada: não arrasta com o mouse"></button>`;
      row.querySelector('.rn').textContent = r.name + (r.only ? ` · ${r.only.join(',')}` : '');
      // o painel só é refeito quando muda a lista: cada clique lê o ref de agora (o r daqui fica velho depois de editar)
      const cur = () => st.model.refs.find((x) => x.name === r.name) || r;
      row.querySelector('.rn').addEventListener('click', () => gotoCode(cur().line, 0));
      row.querySelector('.vis').addEventListener('change', (e) => editRef(cur(), { flags: { hidden: !e.target.checked } }));
      row.querySelector('.lk').addEventListener('click', () => { const c = cur(); editRef(c, { flags: { lock: !c.lock } }); });
      const op = row.querySelector('.op');
      let key = '';
      op.addEventListener('pointerdown', () => { key = 'refop' + Date.now(); });
      op.addEventListener('input', () => {
        row.querySelector('.ov').textContent = Math.round(op.value * 100) + '%';
        editRef(cur(), { attrs: { opacity: fmtN(+op.value, 2) } }, key || 'refop');
      });
      const ld = row.querySelector('.load');
      if (ld) ld.addEventListener('click', () => { refTarget = r.file; $('refIn').click(); });
      rows.appendChild(row);
    });
    if (st.images.size) {
      const box = p.querySelector('.rp-store');
      box.innerHTML = '<small>Guardadas neste navegador:</small>';
      for (const name of st.images.keys()) {
        const chip = document.createElement('span');
        chip.className = 'rp-chip';
        chip.innerHTML = '<span></span><button type="button" class="x" title="Tirar esta imagem do navegador">✕</button>';
        chip.firstChild.textContent = name;
        chip.querySelector('button').addEventListener('click', async () => {
          URL.revokeObjectURL(st.images.get(name).img.src);
          st.images.delete(name);
          await idb.del(name);
          reparse();
        });
        box.appendChild(chip);
      }
    }
    fillRefPanel(); // a mesma assinatura: só preenche os valores
  }
  // "abrir…" de um ref sem imagem: guarda com o nome escrito no ref; "Adicionar imagem…": guarda e cria a linha
  let refTarget = null;

  // ---------- painel das camadas ----------
  // A árvore: cada camada, na ordem do código, com as linhas que desenham nela. Cada nó é uma linha do editor:
  // a cópia de um componente é a linha do use, e o que vem de um include é a linha do include.
  function layerTree(m) {
    const map = (i) => (m.lineMap ? m.lineMap[i] : i);
    return m.layers.map((layer) => {
      const kids = [], at = new Map();
      for (const it of layer.items) {
        const el = it.el, line = map(el.use !== undefined ? el.use : el.line);
        if (line === undefined || line < 0) continue;
        let k = at.get(line);
        if (!k) { k = { line, els: [] }; at.set(line, k); kids.push(k); }
        if (!k.els.includes(el)) k.els.push(el);
      }
      for (const k of kids) Object.assign(k, nodeLabel(m, k));
      return { layer, line: layer.implicit ? -1 : map(layer.line), kids };
    });
  }
  function nodeLabel(m, k) {
    const rec = m.byLine.get(k.line), s = rec && rec.st, el = k.els[0];
    if (s && s.cmd === 'include') return { type: 'include', name: s.pos[0] ? s.pos[0].text : '', sig: 'include' };
    if (rec && rec.use) return { type: 'use', name: rec.use, sig: 'use ' + rec.use };
    return { type: el.type, name: el.name || '', sig: el.type + ' ' + (el.name || '') };
  }
  // o tipo e o nome de cada linha da árvore (para soltar da escolha uma linha que mudou de lugar no código)
  // (dentro de um símbolo, a prévia do def: as linhas de dentro dele, etapa 6b)
  const selModel = () => pvModel() || st.model;
  function nodeSigs() {
    const out = new Map();
    for (const t of layerTree(selModel())) for (const k of t.kids) out.set(k.line, k.sig);
    return out;
  }
  function setSel(lines, caretLine) {
    const sigs = nodeSigs(), B = blockInfo();
    lines = lines.filter((l) => !B.locked.has(l));
    st.none = -1;
    // o cursor vai antes: o goto avisa primeiro a linha antiga (ao focar o código), e isso soltaria a escolha nova
    st.sel = new Map();
    st.selCaret = caretLine;
    if (caretLine >= 0 && caretLine !== st.caret.line) editor.reveal(caretLine, 0);
    st.sel = new Map(lines.map((l) => [l, sigs.get(l)]));
    markLayerPanel();
    draw();
  }
  function clearSel() {
    if (!st.sel.size) return;
    st.sel = new Map();
    st.selAnchor = -1;
    markLayerPanel();
    draw();
  }
  // tirar a escolha de propósito (clique no vazio, Esc, Selecionar › Nada): nem a forma da linha do cursor fica
  // escolhida, até o cursor andar
  function deselect() {
    st.none = st.caret.line;
    selMemo = null;
    st.sel = new Map();
    st.selAnchor = -1;
    markLayerPanel();
    draw();
  }
  // depois de editar o código: fica na escolha só a linha que ainda é a mesma forma
  function checkSel() {
    if (!st.sel.size) return;
    const sigs = nodeSigs(), B = blockInfo();
    for (const [l, sig] of st.sel) if (sigs.get(l) !== sig || B.locked.has(l)) st.sel.delete(l);
  }
  // clique na árvore: escolhe só esta; Ctrl soma ou tira; Shift pega o trecho desde o último clique
  function pickRow(line, e) {
    if (blockInfo().locked.has(line)) { hint('Esta forma está travada (lock): clique no cadeado para destravar, ou Ctrl+Alt+2 destrava tudo.', 3000); return; }
    const rows = [...$('layerPanel').querySelectorAll('.lp-el')].map((r) => +r.dataset.line);
    if (e.shiftKey && st.selAnchor >= 0 && rows.includes(st.selAnchor)) {
      const a = rows.indexOf(st.selAnchor), b = rows.indexOf(line);
      setSel(rows.slice(Math.min(a, b), Math.max(a, b) + 1), line);
      return;
    }
    st.selAnchor = line;
    if (e.ctrlKey || e.metaKey) {
      const lines = [...st.sel.keys()];
      if (st.sel.has(line)) { const rest = lines.filter((l) => l !== line); setSel(rest, rest.length === 1 ? rest[0] : st.selCaret); } else setSel([...lines, line], line);
      return;
    }
    setSel([line], line);
  }
  // clique numa camada: todas as linhas dela (com Ctrl, somadas à escolha, ou tiradas se já estavam todas)
  function pickLayer(i, e) {
    const t = layerTree(st.model)[i];
    if (!t) return;
    const lines = t.kids.map((k) => k.line);
    if (e.ctrlKey || e.metaKey) {
      const all = lines.length && lines.every((l) => st.sel.has(l));
      const next = all ? [...st.sel.keys()].filter((l) => !lines.includes(l)) : [...new Set([...st.sel.keys(), ...lines])];
      setSel(next, next.length === 1 ? next[0] : st.selCaret);
      return;
    }
    st.selAnchor = -1;
    setSel(lines, lines.length === 1 ? lines[0] : t.line);
    if (lines.length > 1) hint(`${lines.length} linhas da camada ${t.layer.name}: arraste uma delas no desenho para mover, a bolinha verde para girar.`, 3200);
  }

  // ---------- esconder: o hidden escrito na linha ----------
  // O olho do painel e o Ctrl+3 (no código, também o Ctrl+H) ligam e desligam o hidden das formas (shape, stroke, line, ellipse, rect, text),
  // do emitter, da layer, do ref e do actor. O hidden entra depois da última palavra antes do ":" (ou do comentário).
  function hiddenTok(line) {
    if (line < 0) return null;
    const w = L.splitLine(lineOf(line)).words, cmd = w[0] && w[0].text;
    if (!cmd || !(L.FLAGS[cmd] || []).includes('hidden')) return null;
    const tok = w.slice(1).find((t) => t.text === 'hidden') || null;
    return { cmd, name: w[1] && w[1].text !== 'hidden' ? w[1].text : '', on: !!tok, tok, end: w[w.length - 1].to };
  }
  // as linhas do Ctrl+3: as escolhidas no painel; sem escolha, as do cursor (ou do trecho marcado no código)
  function hiddenTargets() {
    if (st.sel.size) return [...st.sel.keys()].sort((a, b) => a - b);
    const ta = editor.ta, v = editor.value, lineAt = (o) => v.slice(0, o).split('\n').length - 1;
    const a = ta.selectionStart;
    let b = ta.selectionEnd;
    if (b > a && v[b - 1] === '\n') b--;
    const out = [];
    for (let l = lineAt(a), e = lineAt(b); l <= e; l++) out.push(l);
    return out;
  }
  // se alguma das linhas aparece, todas somem; se todas estão escondidas, todas voltam (um Ctrl+Z desfaz tudo)
  function toggleHidden(lines, byKey) {
    const ok = lines.map((l) => [l, hiddenTok(l)]).filter(([, h]) => h);
    if (!ok.length) {
      const w = lines.length === 1 ? L.splitLine(lineOf(lines[0])).words : [], cmd = w[0] && w[0].text;
      hint(!cmd ? 'Escolha uma forma (ou linhas no painel Camadas) e aperte Ctrl+3.'
        : cmd === 'use' ? 'O use não aceita hidden: esconda as formas de dentro do def (ou a camada delas).'
        : cmd === 'include' ? 'O include não aceita hidden: esconda as formas no outro arquivo.'
        : `${lines.length > 1 ? 'Estas linhas não aceitam' : `"${cmd}" não aceita`} hidden: só as formas (shape, stroke, line, ellipse, rect, text), emitter, layer, ref e actor.`, 3600);
      return;
    }
    const hide = ok.some(([, h]) => !h.on), out = new Map();
    for (const [l, h] of ok) {
      if (h.on === hide) continue;
      const text = lineOf(l);
      if (hide) { out.set(l, text.slice(0, h.end) + ' hidden' + text.slice(h.end)); continue; }
      // tira a palavra e o espaço de antes dela
      let a = h.tok.from;
      while (a > 0 && /[ \t]/.test(text[a - 1])) a--;
      out.set(l, text.slice(0, a) + text.slice(h.tok.to));
    }
    writeLines(out, 'hidden' + Date.now());
    const what = ok.length === 1 ? `${ok[0][1].cmd}${ok[0][1].name ? ' ' + ok[0][1].name : ''}` : `${ok.length} linhas`;
    const left = lines.length - ok.length;
    hint(`${what}: ${hide ? (ok.length > 1 ? 'escondidas' : 'escondida') + ' (hidden)' : ok.length > 1 ? 'aparecem de novo' : 'aparece de novo'}${left && st.sel.size ? ` · ${left} não ${left > 1 ? 'aceitam' : 'aceita'} hidden` : ''}.${byKey ? ` ${byKey} de novo desfaz.` : ''}`, 2600);
  }
  // ---------- travar: o lock escrito na linha ----------
  // O cadeado do painel e o Ctrl+2 (js/ui-select.js) põem e tiram o lock das formas, do emitter, do use, do group e
  // da layer. Como o hidden, o lock entra depois da última palavra antes do ":" (ou do comentário).
  function lockTok(line) {
    if (line < 0) return null;
    const w = L.splitLine(lineOf(line)).words, cmd = w[0] && w[0].text;
    if (!cmd || cmd === 'ref' || !(L.FLAGS[cmd] || []).includes('lock')) return null;
    const tok = w.slice(1).find((t) => t.text === 'lock') || null;
    return { cmd, on: !!tok, tok, end: w[w.length - 1].to };
  }
  // on: true trava, false destrava; as linhas que mudam, numa edição só
  function setLock(lines, on, key) {
    const out = new Map();
    for (const l of lines) {
      const h = lockTok(l);
      if (!h || h.on === on) continue;
      const text = lineOf(l);
      if (on) { out.set(l, text.slice(0, h.end) + ' lock' + text.slice(h.end)); continue; }
      let a = h.tok.from;
      while (a > 0 && /[ \t]/.test(text[a - 1])) a--;
      out.set(l, text.slice(0, a) + text.slice(h.tok.to));
    }
    writeLines(out, key || 'lock' + Date.now());
    return out.size;
  }
  // o cadeado do painel: liga e desliga o lock de uma linha
  function toggleLock(line) {
    const h = lockTok(line);
    if (!h) return;
    setLock([line], !h.on);
    hint(h.on ? `${h.cmd}: destravada.` : `${h.cmd}: travada (lock). O desenho não deixa escolher nem arrastar; o código continua igual de mexer.`, 2600);
  }
  const LOCK_ON = '<svg viewBox="0 0 16 16"><rect x="3.5" y="7.2" width="9" height="6.3" rx="1.2"/><path d="M5.6 7.2V5.4a2.4 2.4 0 0 1 4.8 0v1.8"/></svg>';
  const LOCK_OFF = '<svg viewBox="0 0 16 16"><rect x="3.5" y="7.2" width="9" height="6.3" rx="1.2"/><path d="M5.6 7.2V5.4a2.4 2.4 0 0 1 4.6-.9"/></svg>';
  const EYE_ON = '<svg viewBox="0 0 16 16"><path d="M1.5 8S4 3.8 8 3.8 14.5 8 14.5 8 12 12.2 8 12.2 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 16 16"><path d="M1.5 8S4 3.8 8 3.8 14.5 8 14.5 8 12 12.2 8 12.2 1.5 8 1.5 8z"/><path d="M2.5 13.5 13.5 2.5"/></svg>';
  const TRASH = '<svg viewBox="0 0 16 16"><path d="M2.5 4.5h11M6 4.5V2.8h4v1.7M4 4.5l.8 9h6.4l.8-9M6.6 7v4.5M9.4 7v4.5"/></svg>';

  let layerSig = '';
  function fillLayerPanel() {
    const m = st.model, film = isFilm(), p = $('layerPanel');
    $('layerBtn').hidden = film;
    if (film) p.hidden = true;
    $('layerBtn').classList.toggle('on', !p.hidden);
    // na coluna da direita (js/ui-layers.js), o painel não empurra os de dentro do desenho
    stage.classList.toggle('lp-open', !p.hidden && p.parentNode === stage);
    if (p.hidden || !m) return;
    const tree = layerTree(m);
    const sig = tree.map((t) => `${t.layer.name}@${t.line}:${t.layer.guide ? 'g' : ''}${t.layer.hidden ? 'h' : ''}:` + t.kids.map((k) => `${k.line}=${k.sig}*${k.els.length}`).join(',')).join('/') + '#' + [...st.layerShut].join('/');
    if (sig !== layerSig) {
      layerSig = sig;
      p.innerHTML = '<div class="rp-head"><b>Camadas</b><small class="lp-count"></small><span class="grow"></span><button type="button" class="lp-add" title="Nova camada (layer): entra logo acima da camada onde se desenha, e passa a ser ela">＋</button><button type="button" class="x" title="Fechar">✕</button></div><div class="lp-tree"></div>' +
        '<div class="lp-foot"><small>Clique escolhe; <kbd>Ctrl</kbd> soma; <kbd>Shift</kbd> pega um trecho; a camada pega tudo dela. Arraste uma linha (ou as escolhidas) para mudar a ordem ou levar para outra camada, e uma camada para mudar a ordem das camadas. Duplo clique num nome renomeia. O olho (ou <kbd>Ctrl</kbd>+<kbd>3</kbd> nas escolhidas) liga e desliga o <code>hidden</code>; o cadeado (ou <kbd>Ctrl</kbd>+<kbd>2</kbd>), o <code>lock</code>; a lixeira apaga a camada. <kbd>Esc</kbd> solta.</small></div>';
      const box = p.querySelector('.lp-tree');
      if (!tree.length) box.innerHTML = '<div class="rp-empty">Nada desenhado ainda.</div>';
      tree.forEach((t, i) => {
        const shut = st.layerShut.has(t.layer.name), name = t.layer.name;
        const tags = [t.layer.implicit ? 'automática' : '', t.layer.guide ? 'guide' : '', t.layer.hidden ? 'hidden' : ''].filter(Boolean).join(' ');
        const row = document.createElement('div');
        row.className = 'lp-layer';
        row.dataset.li = i;
        row.dataset.name = t.layer.name;
        row.innerHTML = `<button type="button" class="tw" title="${shut ? 'Abrir' : 'Fechar'}">${shut ? '▸' : '▾'}</button><button type="button" class="ln" title="Escolher as ${t.kids.length} linhas desta camada"></button>${tags ? `<span class="lp-tag">${tags}</span>` : ''}<span class="cnt">${t.kids.length || 'vazia'}</span>${t.line >= 0 ? `<span class="lp-del" role="button" title="Apagar a camada ${esc(name)} e o que desenha nela (Ctrl+Z desfaz)">${TRASH}</span><span class="lp-lock" role="button" data-line="${t.line}"></span><span class="lp-eye" role="button" data-line="${t.line}"></span>` : '<span class="lp-del na"></span><span class="lp-lock na"></span><span class="lp-eye na"></span>'}`;
        row.querySelector('.ln').textContent = name;
        box.appendChild(row);
        if (shut) return;
        for (const k of t.kids) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'lp-el';
          el.dataset.line = k.line;
          el.innerHTML = `<span class="ty">${esc(k.type)}</span><span class="nm"></span>${k.els.length > 1 ? `<span class="cnt">${k.els.length} formas</span>` : ''}<span class="lno">${k.line + 1}</span><span class="lp-lock" role="button" data-line="${k.line}"></span><span class="lp-eye" role="button" data-line="${k.line}"></span>`;
          el.querySelector('.nm').textContent = k.name;
          box.appendChild(el);
        }
      });
    }
    markLayerPanel();
  }
  // só as marcas: escolhidas, a do cursor e as que não andam pelo desenho (com o motivo no título)
  function markLayerPanel() {
    const p = $('layerPanel');
    if (p.hidden || !st.model) return;
    p.querySelectorAll('.lp-el').forEach((r) => {
      const line = +r.dataset.line, why = editPlan(line).why;
      r.classList.toggle('sel', st.sel.has(line));
      r.classList.toggle('cur', line === st.caret.line);
      r.classList.toggle('dim', !!why);
      r.title = `Linha ${line + 1}${why ? ` · ${why}` : ''}`;
    });
    const tree = layerTree(st.model);
    p.querySelectorAll('.lp-layer').forEach((r) => {
      const t = tree[+r.dataset.li];
      r.classList.toggle('sel', !!t && t.kids.length > 0 && t.kids.every((k) => st.sel.has(k.line)));
      r.classList.toggle('cur', !!t && t.line >= 0 && t.line === st.caret.line);
      r.classList.toggle('off', !!t && t.layer.hidden);
    });
    // o olho: aberto, fechado (hidden escrito na linha) ou nenhum (a linha não aceita hidden, como o use)
    const shut = new Set();
    for (const t of tree) if (t.layer.hidden) for (const k of t.kids) shut.add(k.line);
    p.querySelectorAll('.lp-eye[data-line]').forEach((eye) => {
      const line = +eye.dataset.line, h = hiddenTok(line), state = !h ? 'na' : h.on ? 'off' : 'on';
      const row = eye.closest('.lp-el');
      if (row) { row.classList.toggle('off', state === 'off'); row.classList.toggle('under', shut.has(line)); }
      if (eye.dataset.state === state) return;
      eye.dataset.state = state;
      eye.classList.toggle('na', state === 'na');
      eye.classList.toggle('off', state === 'off');
      eye.innerHTML = state === 'off' ? EYE_OFF : state === 'on' ? EYE_ON : '';
      eye.title = state === 'off' ? 'Escondida (hidden): clique para mostrar' : state === 'on' ? 'Esconder (hidden). Com várias escolhidas: Ctrl+3' : '';
    });
    // o cadeado: fechado (lock na linha), apagado (travada pela camada ou por um grupo), aberto ou nenhum
    const B = blockInfo();
    p.querySelectorAll('.lp-lock[data-line]').forEach((lk) => {
      const line = +lk.dataset.line, h = lockTok(line), state = !h ? 'na' : h.on ? 'on' : B.locked.has(line) ? 'under' : 'off';
      const row = lk.closest('.lp-el');
      if (row) row.classList.toggle('locked', state === 'on' || state === 'under');
      if (lk.dataset.state === state) return;
      lk.dataset.state = state;
      for (const c of ['na', 'on', 'under']) lk.classList.toggle(c, state === c);
      lk.innerHTML = state === 'na' ? '' : state === 'off' ? LOCK_OFF : LOCK_ON;
      lk.title = state === 'on' ? 'Travada (lock): clique para destravar' : state === 'under' ? 'Travada pela camada ou pelo grupo (clique para travar esta também)' : state === 'off' ? 'Travar (lock): o desenho não deixa escolher nem arrastar. Nas escolhidas: Ctrl+2' : '';
    });
    const c = p.querySelector('.lp-count');
    if (c) c.textContent = st.sel.size ? `${st.sel.size} escolhida${st.sel.size > 1 ? 's' : ''}` : '';
  }
  $('layerBtn').addEventListener('click', () => { const p = $('layerPanel'); p.hidden = !p.hidden; layerSig = ''; fillLayerPanel(); });
  $('layerPanel').addEventListener('click', (e) => {
    const p = $('layerPanel');
    if (e.target.closest('.x')) { p.hidden = true; fillLayerPanel(); return; }
    // o ＋, a lixeira e o nome sendo renomeado são do js/ui-layers.js
    if (e.target.closest('.lp-add, .lp-del, .lp-ren')) return;
    const eye = e.target.closest('.lp-eye[data-line]');
    if (eye) { if (!eye.classList.contains('na')) toggleHidden([+eye.dataset.line]); return; }
    const lk = e.target.closest('.lp-lock[data-line]');
    if (lk) { if (!lk.classList.contains('na')) toggleLock(+lk.dataset.line); return; }
    const tw = e.target.closest('.tw');
    if (tw) {
      const name = tw.closest('.lp-layer').dataset.name;
      if (st.layerShut.has(name)) st.layerShut.delete(name); else st.layerShut.add(name);
      fillLayerPanel();
      return;
    }
    const lr = e.target.closest('.lp-layer');
    if (lr) { pickLayer(+lr.dataset.li, e); return; }
    const row = e.target.closest('.lp-el');
    if (row) pickRow(+row.dataset.line, e);
  });
  // Shift+clique na árvore não seleciona o texto do painel
  $('layerPanel').addEventListener('mousedown', (e) => { if (e.shiftKey) e.preventDefault(); });

  // ---------- mover e girar a escolha ----------
  // O que muda numa linha escolhida: os pontos (shape, stroke, line), a posição (ellipse, rect, text, emitter,
  // use) e o rot= (ellipse, rect, text, use). Guarda o texto da linha como estava: cada passo do arraste parte dele.
  function editPlan(line) {
    const m = st.model, rec = m && m.byLine.get(line), s = rec && rec.st;
    if (!s) return { why: 'não é uma forma' };
    if (s.cmd === 'include') return { why: 'vem de outro arquivo (include): mude lá' };
    if (rec.repeated) return { why: 'vem de um repeat: mude no código' };
    const text = lineOf(line), sp = L.splitLine(text), code = (sp.comment !== null ? text.slice(0, sp.commentAt) : text).trimEnd();
    const plan = { line, text, rec, pts: [], pos: null, rect: null, rot: null, ref: null, why: '', noSpin: '', end: code.length };
    // o rot= que já existe (ou onde escrever um)
    const rotOf = () => {
      const a = s.attrs.get('rot');
      if (!a) return { deg: 0, from: -1, to: -1, at: code.length };
      if (a.inherited || isNaN(Number(a.text))) { plan.noSpin = 'o rot= tem {conta}'; return null; }
      return { deg: Number(a.text), from: a.vfrom, to: a.to };
    };
    if (rec.use) {
      const h = rec.handles.find((q) => q.kind === 'pos');
      if (!h) return { why: 'o use não tem a posição x,y' };
      if (h.fixed) return { why: 'a posição tem {conta}' };
      plan.pos = { x: h.x, y: h.y, from: h.from, to: h.to };
      plan.rot = rotOf();
      plan.ref = { kind: 'pos', x: h.x, y: h.y };
      return plan;
    }
    const el = rec.el;
    if (!el) return { why: 'não é uma forma' };
    if (el.mirrorOf) return { why: `espelho de ${el.mirrorOf}: segue a forma de lá` };
    if (el.limb) return { why: 'membro com IK: mude o hip= e o foot= no código' };
    if (s.cmd === 'shape' || s.cmd === 'stroke' || s.cmd === 'line') {
      if (!s.pts.length) return { why: 'sem pontos' };
      if (s.pts.some((p) => p.fixed)) return { why: 'tem ponto com {conta}' };
      plan.pts = s.pts.map((p) => ({ x: p.x, y: p.y, corner: p.corner, tan: p.tan, tin: p.tin || null, from: p.from, xyTo: p.tan ? p.tanFrom - 1 : p.to, to: p.to }));
      plan.ref = { kind: 'pt', x: s.pts[0].x, y: s.pts[0].y };
      return plan;
    }
    // a posição é a alça do canto (rect) ou do centro (ellipse, text, emitter): o nome vem antes dela na linha
    const t = rec.handles.find((q) => q.kind === (s.cmd === 'rect' ? 'corner' : 'center'));
    if (!t) return { why: 'sem posição' };
    if (t.fixed) return { why: 'a posição tem {conta}' };
    if (s.cmd === 'rect') {
      const sz = rec.handles.find((q) => q.kind === 'size');
      if (!sz || sz.fixed) plan.noSpin = 'o tamanho tem {conta}';
      plan.rect = { x: t.x, y: t.y, w: el.size[0], h: el.size[1], from: t.from, to: t.to };
      plan.ref = { kind: 'corner', x: t.x, y: t.y };
      plan.rot = rotOf();
      return plan;
    }
    plan.pos = { x: t.x, y: t.y, from: t.from, to: t.to };
    plan.ref = { kind: 'center', x: t.x, y: t.y };
    // o círculo girado continua igual: só a elipse (e o texto) ganham rot=
    if (s.cmd === 'text' || (s.cmd === 'ellipse' && (el.radius[0] !== el.radius[1] || s.attrs.has('rot')))) plan.rot = rotOf();
    return plan;
  }
  // a linha nova: place(x, y) leva um ponto do código ao lugar novo; deg é o quanto girou
  function planText(plan, place, deg, dec) {
    const xy = (p) => `${fmtN(p[0], dec)},${fmtN(p[1], dec)}`, ed = [];
    for (const p of plan.pts) {
      let t = xy(place(p.x, p.y)) + (p.corner ? '!' : ''), end = p.xyTo;
      if (deg && p.tan) { t += '~' + (p.tin ? xy(turn(0, 0, deg, p.tin[0], p.tin[1])) + '~' : '') + xy(turn(0, 0, deg, p.tan[0], p.tan[1])); end = p.to; }
      ed.push([p.from, end, t]);
    }
    if (plan.pos) ed.push([plan.pos.from, plan.pos.to, xy(place(plan.pos.x, plan.pos.y))]);
    if (plan.rect) {
      // o retângulo gira em volta do meio: o meio vai para o lugar novo, e o canto fica a meia largura e meia altura dele
      const r = plan.rect, c = place(r.x + r.w / 2, r.y + r.h / 2);
      ed.push([r.from, r.to, xy([c[0] - r.w / 2, c[1] - r.h / 2])]);
    }
    if (deg && plan.rot) {
      let v = plan.rot.deg + deg;
      v = ((((v + 180) % 360) + 360) % 360) - 180;
      const txt = fmtN(v, 2);
      if (plan.rot.from >= 0) ed.push([plan.rot.from, plan.rot.to, txt]); else if (txt !== '0') ed.push([plan.rot.at, plan.rot.at, ` rot=${txt}`]);
    }
    ed.sort((a, b) => b[0] - a[0]);
    let out = plan.text;
    for (const [a, b, t] of ed) out = out.slice(0, a) + t + out.slice(b);
    return out;
  }
  // as alças da linha do cursor (pontos, tamanho, giro…): na Seleção direta e nas outras ferramentas; na Seleção (V),
  // só a caixa da escolha. No filme e na prévia do def não há formas para escolher: a Seleção mostra as alças também.
  // as ferramentas que escolhem formas inteiras (a caixa da escolha, sem os pontos)
  const SELECTY = new Set(['select', 'wand', 'lasso']);
  const pointsOn = () => !SELECTY.has(st.tool) || isFilm() || !!pvModel();
  // o que está escolhido: as linhas do painel Camadas (ou dos cliques no desenho); na Seleção, sem escolha, a forma
  // da linha do cursor (o cursor andando no código escolhe a forma da linha, como no Dreamweaver)
  let selMemo = null;
  function selSet() {
    if (st.sel.size || !SELECTY.has(st.tool) || !st.model) return st.sel;
    const line = st.caret.line;
    if (st.none === line || !selectable(line)) return st.sel;
    if (!selMemo || selMemo.m !== st.model || selMemo.line !== line) {
      const sig = nodeSigs().get(line);
      selMemo = { m: st.model, line, set: sig ? new Map([[line, sig]]) : new Map() };
    }
    return selMemo.set;
  }
  // a escolha vira uma caixa no desenho: na Seleção, já com uma forma; nas outras, com mais de uma (com uma só,
  // valem as alças de sempre)
  const groupOn = () => !!st.model && !isFilm() && !st.build && (SELECTY.has(st.tool) ? selSet().size > 0 : st.sel.size > 1);
  function groupBox(m, pose) {
    const lines = selSet(), geo = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const t of layerTree(m)) for (const k of t.kids) {
      if (!lines.has(k.line)) continue;
      for (const el of k.els) {
        const g = S.geometry(m, pose, el);
        if (g.segs.length) { geo.push(g); const t = tightBox(g.segs); add(t.x0, t.y0); add(t.x1, t.y1); } else if (el.at) add(el.at[0], el.at[1]);
      }
    }
    if (x0 > x1) return null;
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, geo };
  }
  // onde ficam o ✥ (no meio) e a bolinha de girar (acima da caixa); no giro, o meio fica parado
  function groupSpots(b, z) {
    const d = st.gdrag, c = d && d.mode === 'spin' ? [d.cx, d.cy] : [b.cx, b.cy];
    return { move: c, spin: [c[0], b.y0 - (6 + SPIN_GAP) / z], top: [c[0], b.y0 - 6 / z] };
  }
  function drawGroup(ctx, m, pose, z) {
    const b = groupBox(m, pose);
    if (!b) return;
    ctx.save();
    // o contorno de cada forma escolhida e a caixa em volta de todas
    ctx.strokeStyle = 'rgba(92,198,212,.95)';
    ctx.lineWidth = 1.5 / z;
    for (const g of b.geo) ctx.stroke(S.pathOf(g));
    const pad = GROUP_PAD / z;
    ctx.setLineDash([5 / z, 4 / z]);
    ctx.lineWidth = 1 / z;
    ctx.strokeRect(b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + 2 * pad, b.y1 - b.y0 + 2 * pad);
    ctx.setLineDash([]);
    const s = groupSpots(b, z);
    for (const [col, w] of [['#14141c', 3 / z], ['#8fd16a', 1.4 / z]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(s.top[0], s.top[1]);
      ctx.lineTo(s.spin[0], s.spin[1]);
      ctx.stroke();
    }
    // esticar: quadradinhos azuis nos cantos e no meio dos lados
    const r = 3.3 / z;
    for (const q of groupKnobs(b, z)) {
      ctx.beginPath();
      ctx.rect(q.x - r, q.y - r, r * 2, r * 2);
      ctx.fillStyle = '#5cc6d4';
      ctx.fill();
      ctx.lineWidth = 1.4 / z;
      ctx.strokeStyle = '#14141c';
      ctx.stroke();
    }
    drawKnob(ctx, s.spin[0], s.spin[1], 'rot', -Math.PI / 2, z);
    drawKnob(ctx, s.move[0], s.move[1], 'move', 0, z);
    ctx.restore();
  }
  // o ✥, a bolinha de girar ('spin', 'move') ou um quadradinho de esticar ({ k }) sob o mouse
  function hitGroup(e) {
    // a Varinha e o Laço só escolhem: a caixa aparece, mas não pega o clique
    if (!groupOn() || st.tool === 'wand' || st.tool === 'lasso') return null;
    const b = groupBox(selModel(), currentPose());
    if (!b) return null;
    const [x, y] = toCanvas(e), z = st.view.z, s = groupSpots(b, z), r = 10 / z;
    if (Math.hypot(s.spin[0] - x, s.spin[1] - y) < r) return 'spin';
    let k = null, kd = 9 / z;
    for (const q of groupKnobs(b, z)) { const d = Math.hypot(q.x - x, q.y - y); if (d < kd) { kd = d; k = q; } }
    const dm = Math.hypot(s.move[0] - x, s.move[1] - y);
    if (dm < r && (!k || dm < kd)) return 'move';
    if (k) return { k };
    // em cima de uma das formas escolhidas: arrastar move todas
    const line = linesAt(e)[0];
    if (line !== undefined && !e.shiftKey && selSet().has(line)) return 'move';
    return null;
  }
  function startGroup(mode, e, k, key) {
    const verb = mode === 'spin' ? 'girar' : mode === 'scale' ? 'esticar' : 'mover';
    if (st.playing || st.anim) { hint(`Para ${verb} a escolha, escolha "pose parada" no player.`, 2600); return; }
    const plans = [...selSet().keys()].map(editPlan);
    if (mode === 'scale') for (const p of plans) if (!p.why) p.noScale = scaleInfo(p);
    const stop = (p) => p.why || (mode === 'spin' && p.noSpin) || (mode === 'scale' && p.noScale) || '';
    const ok = plans.filter((p) => !stop(p)), left = plans.length - ok.length;
    if (!ok.length) { hint(`Nada aqui dá para ${verb} pelo desenho: ${stop(plans[0])}.`, 3200); return; }
    const b = groupBox(selModel(), currentPose()), [px, py] = toCanvas(e);
    for (const p of ok) {
      if (mode !== 'scale') {
        p.l0 = localOf(p.rec, p.ref, px, py);
        p.lc = localOf(p.rec, p.ref, b.cx, b.cy);
        continue;
      }
      // quanto o código da linha anda quando a tela anda um x ou um y (num osso ou componente girado, de viés)
      const W = Math.max(1, b.x1 - b.x0), H = Math.max(1, b.y1 - b.y0);
      const o = localOf(p.rec, p.ref, b.x0, b.y0), u = localOf(p.rec, p.ref, b.x0 + W, b.y0), v = localOf(p.rec, p.ref, b.x0, b.y0 + H);
      if (!o || !u || !v) continue;
      const J = [(u[0] - o[0]) / W, (v[0] - o[0]) / H, (u[1] - o[1]) / W, (v[1] - o[1]) / H];
      if (Math.abs(J[0] * J[3] - J[1] * J[2]) < 1e-12) continue;
      const kx = p.rec.xf ? Math.sqrt(Math.abs(M.det(p.rec.xf))) : 1;
      Object.assign(p, { J, o, dec: kx > 1.5 || st.view.z > 3 ? 1 : 0 });
    }
    const live = ok.filter((p) => (mode === 'scale' ? p.J : p.l0 && p.lc));
    st.gdrag = { mode, key: key || 'grupo' + Date.now(), copy: !!key, p0: [px, py], plans: live, cx: b.cx, cy: b.cy, a0: Math.atan2(py - b.cy, px - b.cx), ang: 0, left, sn: { self: false, ref: [px, py], box: b } };
    if (mode === 'scale') {
      // o lado (ou o canto) que anda gruda nas linhas guia, só no sentido em que ele anda
      const ex = b.x0 + k.bx * (b.x1 - b.x0), ey = b.y0 + k.by * (b.y1 - b.y0), gx = k.bx === 0.5 ? NaN : ex, gy = k.by === 0.5 ? NaN : ey;
      st.gdrag.sc = { bx: k.bx, by: k.by, b: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }, ex, ey, grab: [px - ex, py - ey], said: '' };
      st.gdrag.sn = { self: false, ref: [px, py], box: { x0: gx, x1: gx, y0: gy, y1: gy } };
    }
    if (left) {
      const why = plans.filter(stop).map((p) => `linha ${p.line + 1}: ${stop(p)}`);
      hint(`${left} ${left > 1 ? 'linhas ficam paradas' : 'linha fica parada'} (${why.slice(0, 2).join('; ')}${why.length > 2 ? '…' : ''}).`, 4200);
    } else if (mode === 'spin') hint('Girando a escolha em volta do meio da caixa. Com Shift, de 15 em 15 graus.', 2600);
    else if (mode === 'scale') hint('Esticando a escolha. Com Shift, sem perder a proporção; com Alt, a partir do meio. Passar do outro lado espelha.', 3200);
  }
  // cada passo do arraste reescreve as linhas escolhidas de uma vez (um Ctrl+Z só desfaz o arraste inteiro)
  function moveGroup(d, x, y, snap) {
    const dec = st.view.z > 3 ? 1 : 0, out = new Map();
    let deg = 0;
    if (d.mode === 'spin') {
      if (Math.hypot(x - d.cx, y - d.cy) * st.view.z < 2) return;
      deg = Math.round(((Math.atan2(y - d.cy, x - d.cx) - d.a0) * 180) / Math.PI);
      if (snap) deg = Math.round(deg / 15) * 15;
      deg = ((((deg + 180) % 360) + 360) % 360) - 180;
      d.ang = deg;
      d.done = { mode: 'spin', deg };
      hint(`girando ${deg}°${d.left ? ` (${d.left} ${d.left > 1 ? 'linhas paradas' : 'linha parada'})` : ''}`, 1500);
    }
    if (d.mode === 'move') d.done = { mode: 'move', dx: x - d.p0[0], dy: y - d.p0[1] };
    for (const p of d.plans) {
      if (d.mode === 'spin') { const [cx, cy] = p.lc; out.set(p.line, planText(p, (px, py) => turn(cx, cy, deg, px, py), deg, dec)); continue; }
      const l = localOf(p.rec, p.ref, x, y);
      if (!l) continue;
      const dx = l[0] - p.l0[0], dy = l[1] - p.l0[1];
      out.set(p.line, planText(p, (px, py) => [px + dx, py + dy], 0, dec));
    }
    writeLines(out, d.key);
  }
  // troca várias linhas inteiras numa edição só; o cursor fica na mesma linha e coluna (se couber)
  function writeLines(out, key) {
    if (!out.size) return;
    const v = editor.value, lines = v.split('\n'), keys = [...out.keys()], a = Math.min(...keys), b = Math.max(...keys);
    const block = lines.slice(a, b + 1).map((t, i) => (out.has(a + i) ? out.get(a + i) : t)).join('\n');
    const from = editor.lineStart(a), to = editor.lineStart(b) + lines[b].length;
    if (v.slice(from, to) === block) { draw(); return; }
    const next = lines.slice(0, a).concat(block.split('\n'), lines.slice(b + 1));
    const cl = Math.min(st.caret.line, next.length - 1);
    let off = 0;
    for (let i = 0; i < cl; i++) off += next[i].length + 1;
    off += Math.min(st.caret.col, next[cl].length);
    editor.replaceRange(from, to, block, { key, select: [off, off] });
  }

  // ---------- esticar a escolha ----------
  // Os quadradinhos da caixa da escolha esticam todas as linhas juntas, a partir do lado de lá (com Alt, do meio).
  // Em cada linha: os pontos e as alças de curva (shape, stroke, line), o centro e o raio da ellipse, o meio e o
  // tamanho do rect, o meio e o size= do text (pela altura das letras) e a posição e o scale= do use; o rot= acompanha
  // e, espelhando, o use ganha flip=. O w=, o ink= e o r= dos cantos não mudam; um emitter só anda.
  const GROUP_PAD = 6;
  // o que esticar precisa de cada linha (''), ou por que ela fica parada
  function scaleInfo(p) {
    const s = p.rec.st, A = s.attrs, el = p.rec.el;
    const rotW = () => {
      const a = A.get('rot');
      if (!a) return { deg: 0, from: -1, to: -1, at: p.end };
      if (a.inherited || isNaN(Number(a.text))) return null;
      return { deg: Number(a.text), from: a.vfrom, to: a.to, at: p.end };
    };
    if (p.pts.length) { p.sc = { kind: 'pts' }; return ''; }
    if (p.rec.use) {
      const rot = rotW(), sa = A.get('scale'), fa = A.get('flip');
      if (!rot) return 'o rot= tem {conta}';
      let sxy = [1, 1];
      if (sa) {
        const v = sa.text.split(',').map(Number);
        if (sa.inherited || v.length > 2 || v.some(isNaN)) return 'o scale= tem {conta}';
        sxy = [v[0], v.length > 1 ? v[1] : v[0]];
      }
      if (fa && (fa.inherited || !['x', 'y', 'xy'].includes(fa.text))) return 'o flip= tem {conta}';
      p.sc = { kind: 'use', rot, sxy, scale: sa ? { from: sa.vfrom, to: sa.to } : null, flip: fa ? { text: fa.text, from: fa.from, vfrom: fa.vfrom, to: fa.to } : null };
      return '';
    }
    if (el.type === 'ellipse' || el.type === 'rect' || el.type === 'text') {
      const rot = rotW();
      if (!rot) return 'o rot= tem {conta}';
      const h = p.rec.handles.find((q) => q.kind === (el.type === 'text' ? 'fsize' : 'size'));
      if (!h || h.fixed) return el.type === 'text' ? 'o size= tem {conta}' : el.type === 'rect' ? 'o tamanho tem {conta}' : 'o raio tem {conta}';
      p.sc = { kind: el.type, rot, h, box: el.type === 'text' ? S.textBox(el) : null };
      return '';
    }
    p.sc = { kind: 'pos' };
    return '';
  }
  // a linha esticada: T = [a, b, c, d] (x' = a·x + b·y, y' = c·x + d·y) nas coordenadas do código, em volta de o
  function scaleText(p, T, o, dec) {
    const vec = (x, y) => [T[0] * x + T[1] * y, T[2] * x + T[3] * y];
    const at = (x, y) => { const v = vec(x - o[0], y - o[1]); return [o[0] + v[0], o[1] + v[1]]; };
    const xy = (q) => `${fmtN(q[0], dec)},${fmtN(q[1], dec)}`, len = (v) => Math.hypot(v[0], v[1]), cross = (u, v) => u[0] * v[1] - u[1] * v[0];
    const size = (v, min) => fmtN(Math.max(min, v), v < 10 ? Math.max(1, dec) : dec);
    const ang = (v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI, norm = (v) => ((((v + 180) % 360) + 360) % 360) - 180;
    // o ângulo (de meia em meia volta) mais perto do giro de antes: o retângulo e a elipse são iguais virados, e o
    // texto continua de pé quando espelha
    const near = (v, ref) => v + Math.round((ref - v) / 180) * 180;
    // as duas direções da forma (largura ax e altura ay, já giradas) depois de esticar
    const cols = (deg, ax, ay) => { const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return [vec(ax * c, ax * s), vec(-ay * s, ay * c)]; };
    const sc = p.sc, ed = [];
    const rotEd = (r, v) => {
      if (Math.abs(norm(v - r.deg)) < 0.05) return;
      const t = fmtN(norm(v), 1);
      if (r.from >= 0) ed.push([r.from, r.to, t]); else if (t !== '0') ed.push([r.at, r.at, ` rot=${t}`]);
    };
    for (const q of p.pts) {
      let t = xy(at(q.x, q.y)) + (q.corner ? '!' : ''), end = q.xyTo;
      if (q.tan) { t += '~' + (q.tin ? xy(vec(q.tin[0], q.tin[1])) + '~' : '') + xy(vec(q.tan[0], q.tan[1])); end = q.to; }
      ed.push([q.from, end, t]);
    }
    if (sc.kind === 'pos') ed.push([p.pos.from, p.pos.to, xy(at(p.pos.x, p.pos.y))]);
    else if (sc.kind === 'ellipse') {
      const el = p.rec.el, th = sc.rot.deg, [c1, c2] = cols(th, el.radius[0], el.radius[1]), n1 = len(c1), n2 = len(c2);
      ed.push([p.pos.from, p.pos.to, xy(at(p.pos.x, p.pos.y))]);
      let r1 = n1, r2 = n2, d = ang(c1);
      if (Math.abs(c1[0] * c2[0] + c1[1] * c2[1]) > 1e-6 * n1 * n2) {
        // esticada de viés (num osso ou componente girado): os eixos novos da elipse
        const E = (c1[0] + c2[1]) / 2, F = (c1[0] - c2[1]) / 2, G = (c1[1] + c2[0]) / 2, H = (c1[1] - c2[0]) / 2, Q = Math.hypot(E, H), R = Math.hypot(F, G);
        r1 = Q + R;
        r2 = Math.abs(Q - R);
        d = ((Math.atan2(G, F) + Math.atan2(H, E)) / 2) * (180 / Math.PI);
      }
      const t1 = size(r1, 0.5), t2 = size(r2, 0.5), round = sc.h.one && t1 === t2;
      ed.push([sc.h.from, sc.h.to, round ? t1 : `${t1},${t2}`]);
      if (!round) rotEd(sc.rot, near(d, th));
    } else if (sc.kind === 'rect') {
      // o meio vai para o lugar novo; a largura segue a direção da largura, e a altura guarda a área
      const r = p.rect, th = sc.rot.deg, c = at(r.x + r.w / 2, r.y + r.h / 2), [c1, c2] = cols(th, r.w, r.h), n1 = len(c1);
      const w = n1, h = n1 > 1e-9 ? Math.abs(cross(c1, c2)) / n1 : len(c2), tw = size(w, 0.5), thh = size(h, 0.5);
      ed.push([r.from, r.to, xy([c[0] - Number(tw) / 2, c[1] - Number(thh) / 2])]);
      ed.push([sc.h.from, sc.h.to, `${tw},${thh}`]);
      rotEd(sc.rot, near(ang(c1), th));
    } else if (sc.kind === 'text') {
      // o meio das letras vai para o lugar novo; o size= muda pela altura (esticar só para o lado não muda as letras)
      const el = p.rec.el, th = sc.rot.deg, b = sc.box, mx = b.x + b.w / 2, my = b.y + b.h / 2;
      const q = turn(0, 0, th, mx, my), c = at(el.at[0] + q[0], el.at[1] + q[1]), [c1, c2] = cols(th, 1, 1), n1 = len(c1);
      const k = n1 > 1e-9 ? Math.abs(cross(c1, c2)) / n1 : 0, tz = size(el.size * k, 1), kk = Number(tz) / el.size, d = near(ang(c1), th);
      const q2 = turn(0, 0, d, mx * kk, my * kk);
      ed.push([p.pos.from, p.pos.to, xy([c[0] - q2[0], c[1] - q2[1]])]);
      if (tz !== fmtN(el.size, 2)) { if (sc.h.insert) ed.push([sc.h.at, sc.h.at, ` size=${tz}`]); else ed.push([sc.h.from, sc.h.to, tz]); }
      rotEd(sc.rot, d);
    } else if (sc.kind === 'use') {
      ed.push([p.pos.from, p.pos.to, xy(at(p.pos.x, p.pos.y))]);
      const th = sc.rot.deg, f0 = sc.flip ? sc.flip.text : '', fx = f0.includes('x') ? -1 : 1, fy = f0.includes('y') ? -1 : 1;
      const [c1, c2] = cols(th, sc.sxy[0] * fx, sc.sxy[1] * fy), n1 = len(c1), r = n1 > 1e-9 ? cross(c1, c2) / n1 : 0, d0 = ang(c1);
      // o mesmo desenho de dois jeitos (girar meia volta = virar nos dois sentidos): o que guarda o flip= de antes ou,
      // senão, o giro mais perto do de antes
      const cand = r >= 0 ? [[d0, ''], [d0 + 180, 'xy']] : [[d0, 'y'], [d0 + 180, 'x']], dist = (v) => Math.abs(norm(v - th));
      const pick = cand.find((q) => q[1] === f0) || (dist(cand[0][0]) <= dist(cand[1][0]) ? cand[0] : cand[1]);
      const sx = fmtN(Math.max(0.001, n1), 3), sy = fmtN(Math.max(0.001, Math.abs(r)), 3), ts = sx === sy ? sx : `${sx},${sy}`;
      if (sc.scale) ed.push([sc.scale.from, sc.scale.to, ts]); else if (ts !== '1') ed.push([p.end, p.end, ` scale=${ts}`]);
      rotEd(sc.rot, pick[0]);
      if (pick[1] !== f0) {
        if (!sc.flip) ed.push([p.end, p.end, ` flip=${pick[1]}`]);
        else if (pick[1]) ed.push([sc.flip.vfrom, sc.flip.to, pick[1]]);
        else ed.push([sc.flip.from - (p.text[sc.flip.from - 1] === ' ' ? 1 : 0), sc.flip.to, '']);
      }
    }
    ed.sort((a, b) => b[0] - a[0]);
    let out = p.text;
    for (const [a, b, t] of ed) out = out.slice(0, a) + t + out.slice(b);
    return out;
  }
  // os quadradinhos na caixa tracejada da escolha (nenhum girando, ou com a caixa pequena demais na tela)
  function groupKnobs(b, z) {
    if (st.gdrag && st.gdrag.mode === 'spin') return [];
    const sw = (b.x1 - b.x0) * z, sh = (b.y1 - b.y0) * z;
    if (Math.max(sw, sh) < 20) return [];
    const flatX = sw < 1, flatY = sh < 1, pad = GROUP_PAD / z, out = [];
    for (const by of [0, 0.5, 1]) for (const bx of [0, 0.5, 1]) {
      if (bx === 0.5 && by === 0.5) continue;
      const skip = bx !== 0.5 && by !== 0.5 ? flatX || flatY : bx === 0.5 ? flatY || (!flatX && sw < 40) : flatX || (!flatY && sh < 40);
      if (skip) continue;
      const ax = b.x0 + bx * (b.x1 - b.x0), ay = b.y0 + by * (b.y1 - b.y0);
      out.push({ bx, by, x: ax + (bx * 2 - 1) * pad, y: ay + (by * 2 - 1) * pad, at: [ax, ay] });
    }
    return out;
  }
  // cada passo parte do texto do começo do arraste: a caixa da tela estica em volta da âncora, e cada linha recebe
  // a mesma conta passada para as coordenadas dela (J = quanto o código anda por unidade da tela)
  function scaleGroup(d, x, y, e) {
    const c = d.sc, b = c.b, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    let ax = e.altKey ? cx : c.bx === 0 ? b.x1 : b.x0, ay = e.altKey ? cy : c.by === 0 ? b.y1 : b.y0;
    const dx = c.ex - ax, dy = c.ey - ay, mx = x - c.grab[0] - ax, my = y - c.grab[1] - ay;
    let sx = c.bx === 0.5 || Math.abs(dx) < 1e-9 ? 1 : mx / dx, sy = c.by === 0.5 || Math.abs(dy) < 1e-9 ? 1 : my / dy;
    if (e.shiftKey) {
      if (c.bx === 0.5) { sx = Math.abs(sy); ax = cx; } else if (c.by === 0.5) { sy = Math.abs(sx); ay = cy; } else {
        const s = (mx * dx + my * dy) / (dx * dx + dy * dy || 1);
        sx = s;
        sy = s;
      }
    }
    const out = new Map();
    for (const p of d.plans) {
      const [j0, j1, j2, j3] = p.J, det = j0 * j3 - j1 * j2, i0 = j3 / det, i1 = -j1 / det, i2 = -j2 / det, i3 = j0 / det;
      const T = [j0 * sx * i0 + j1 * sy * i2, j0 * sx * i1 + j1 * sy * i3, j2 * sx * i0 + j3 * sy * i2, j2 * sx * i1 + j3 * sy * i3];
      const o = [p.o[0] + j0 * (ax - b.x0) + j1 * (ay - b.y0), p.o[1] + j2 * (ax - b.x0) + j3 * (ay - b.y0)];
      out.set(p.line, scaleText(p, T, o, p.dec));
    }
    writeLines(out, d.key);
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
    d.done = { mode: 'scale', sx, sy, fx: bw > 1e-9 ? (ax - b.x0) / bw : 0, fy: bh > 1e-9 ? (ay - b.y0) / bh : 0 };
    const say = `${fmtN(Math.abs((b.x1 - b.x0) * sx), 0)} × ${fmtN(Math.abs((b.y1 - b.y0) * sy), 0)} (${Math.round(Math.abs(sx) * 100)}% × ${Math.round(Math.abs(sy) * 100)}%)${sx < 0 || sy < 0 ? ', espelhada' : ''}${d.left ? ` (${d.left} ${d.left > 1 ? 'linhas paradas' : 'linha parada'})` : ''}`;
    if (say !== c.said) { c.said = say; hint(`esticando: ${say}`, 1500); }
  }

  // ---------- editor de gradiente ----------
  // Aparece com o cursor numa linha gradient, ou numa figura pintada com um gradiente (c= ou inkc=). A barra mostra
  // as cores: arrastar uma marca muda a posição, clicar na barra põe uma cor nova, botão direito numa marca tira.
  // Tudo vai para a linha do gradient, e cada arraste é um Ctrl+Z só.
  const gp = { sig: '', sel: 0, drag: null, closed: '', key: '' };
  // o gradiente cai na figura que o usa: as coordenadas dele são as dela (com box, de 0 a 1 dentro dela);
  // sem figura, as do quadro. el = a figura escolhida (senão a primeira que usa o gradiente)
  const gradUsers = (m, g) => m.elements.filter((e) => e.fill === g || e.inkc === g || e.color === g);
  function gradFrame(m, pose, g, el) {
    el = el || gradUsers(m, g)[0] || null;
    const f = el && el.type !== 'text' ? S.fullMap(m, pose, el) : (x, y) => [x, y];
    const b = el ? S.localBox(el) : { x: 0, y: 0, w: m.canvas.w, h: m.canvas.h };
    return { el, f, b, rs: (b.w + b.h) / 2, box: !!g.box };
  }
  const gradLocal = (F, u, v) => (F.box ? [F.b.x + u * F.b.w, F.b.y + v * F.b.h] : [u, v]);
  // a linha do gradient e quem pediu: a própria linha, ou a figura com c=/inkc= dele (via)
  function gradTarget() {
    const m = st.model;
    if (!m || isFilm()) return null;
    const rec = m.byLine.get(st.caret.line);
    if (!rec) return null;
    let g = rec.grad, via = null;
    if (!g && rec.el && !rec.repeated) {
      const pick = [['c', rec.el.fill || rec.el.color], ['inkc', rec.el.inkc]].find(([, p]) => p && p.kind === 'grad');
      if (pick) { g = pick[1]; via = { el: rec.el, attr: pick[0] }; }
    }
    if (!g) return null;
    let line = -1;
    for (const [l, r] of m.byLine) if (r.grad === g) { line = l; break; }
    const grec = line >= 0 ? m.byLine.get(line) : null;
    if (!grec || !grec.gradSrc) return null;
    return { m, g, line, src: grec.gradSrc, via };
  }
  // as cores como estão na linha: o texto da cor (#hex, nome da palette…), se a posição está escrita, onde fica
  function gradStops(t) {
    return t.src.stops.map((s, i) => {
      const k = s.text.lastIndexOf('@'), r = t.g.stops[i] || { at: 0, c: '#000000' };
      return { ctext: k > 0 ? s.text.slice(0, k) : s.text, explicit: k > 0, at: r.at, c: r.c };
    });
  }
  // escreve sem tirar o cursor do lugar (ele pode estar em outra linha: a da figura)
  function writeKeep(start, end, txt, key) {
    const ta = editor.ta, d = txt.length - (end - start);
    if (editor.value.slice(start, end) === txt) return;
    const adj = (p) => (p <= start ? p : p >= end ? p + d : Math.min(p, start + txt.length));
    editor.replaceRange(start, end, txt, { key, select: [adj(ta.selectionStart), adj(ta.selectionEnd)] });
  }
  const fmtAt = (v) => String(Number(Math.min(1, Math.max(0, v)).toFixed(3)));
  function writeStops(t, list, key) {
    const a = t.src.stops[0], b = t.src.stops[t.src.stops.length - 1], off = editor.lineStart(t.line);
    // a primeira cor já fica no 0 e a última no 1: nas pontas, @0 e @1 não precisam ser escritos
    const n = list.length, bare = (s, i) => !s.explicit || (i === 0 && s.at === 0) || (i === n - 1 && n > 1 && s.at === 1);
    writeKeep(off + a.from, off + b.to, list.map((s, i) => s.ctext + (bare(s, i) ? '' : '@' + fmtAt(s.at))).join(' '), key);
  }
  // mexer em posição: todas ficam escritas (senão as do meio, calculadas, pulariam de lugar) e em ordem
  function placeStops(list, moved) {
    for (const s of list) s.explicit = true;
    list.sort((p, q) => p.at - q.at);
    return moved ? list.indexOf(moved) : -1;
  }
  // tipo (linear/radial) e box: reescreve do tipo até o último número, com o box no fim
  function writeGeom(t, type, p, box, key) {
    const dec = box ? 3 : 1, f = (v) => fmtN(v, dec);
    const nums = type === 'linear' ? `${f(p[0])},${f(p[1])} ${f(p[2])},${f(p[3])}` : `${f(p[0])},${f(p[1])} ${f(Math.max(box ? 0.001 : 0.5, p[2]))}${p.length >= 5 ? ` ${f(p[3])},${f(p[4])}` : ''}`;
    const toks = [t.src.type, ...t.src.vals, t.src.box].filter(Boolean), off = editor.lineStart(t.line);
    writeKeep(off + t.src.type.from, off + Math.max(...toks.map((q) => q.to)), `${type} ${nums}${box ? ' box' : ''}`, key);
  }
  // cor de qualquer jeito (#hex, nome do CSS, rgba) → [r, g, b, a]
  const colorCtx = document.createElement('canvas').getContext('2d');
  function rgbaOf(c) {
    colorCtx.fillStyle = '#000000';
    colorCtx.fillStyle = c;
    const v = colorCtx.fillStyle;
    if (v[0] === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1];
    const p = (/\(([^)]+)\)/.exec(v) || [0, '0,0,0,1'])[1].split(',').map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  const hx2 = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  const hexOf = (c, a) => '#' + hx2(c[0]) + hx2(c[1]) + hx2(c[2]) + (a < 0.995 ? hx2(a * 255) : '');
  // a cor do gradiente num ponto da barra (para a cor nova nascer igual ao que já estava ali)
  function gradColorAt(list, at) {
    let i = list.findIndex((s) => s.at >= at);
    if (i < 0) i = list.length - 1;
    if (i === 0 || list[i].at <= at) return rgbaOf(list[i].c);
    const a = list[i - 1], b = list[i], k = (at - a.at) / Math.max(1e-6, b.at - a.at), ca = rgbaOf(a.c), cb = rgbaOf(b.c);
    return ca.map((v, j) => v + (cb[j] - v) * k);
  }

  function fillGradPanel() {
    const p = $('gradPanel'), t = gradTarget();
    const where = t ? `${t.line}:${t.g.name}:${st.caret.line}` : '';
    if (gp.closed && gp.closed !== where) gp.closed = '';
    if (!t || gp.closed || st.build) { p.hidden = true; gp.sig = ''; gp.drag = null; return; }
    p.hidden = false;
    const list = gradStops(t), lockStops = !t.src.ok || t.src.stops.some((s) => s.text.includes('{'));
    const lockGeom = [...t.src.vals].some((v) => v.text.includes('{'));
    const sig = [t.line, t.g.name, list.length, lockStops, lockGeom, t.via ? t.via.el.name + t.via.attr : ''].join('|');
    gp.sel = Math.min(gp.sel, list.length - 1);
    if (sig !== gp.sig) {
      gp.sig = sig;
      p.innerHTML = `<div class="rp-head"><b>Gradiente</b><button type="button" class="gp-name" title="Ir para a linha do gradient"></button><span class="gp-via"></span><span class="grow"></span><button type="button" class="x" title="Fechar">✕</button></div>
        <div class="gp-row"><span class="gp-seg"><button type="button" data-type="linear" title="De um ponto a outro">linear</button><button type="button" data-type="radial" title="Do centro para fora">radial</button></span>
          <label class="tog" title="Com box, as coordenadas vão de 0 a 1 dentro de cada forma que usa o gradiente"><input type="checkbox" class="gp-box"> box</label><small class="gp-on"></small></div>
        <div class="gp-bar" title="Clique para pôr uma cor aqui"><div class="gp-fill"></div></div>
        <div class="gp-marks"></div>
        <div class="gp-stop">
          <input type="color" class="gp-col" title="Cor"><input type="text" class="gp-hex" spellcheck="false" autocomplete="off" title="Cor: #hex, um nome da palette ou de cor (Enter grava)">
          <label title="Opacidade desta cor">opac. <input type="range" class="gp-alpha" min="0" max="100" step="1"></label><span class="gp-av"></span>
          <label title="Posição na barra, de 0 a 1">pos. <input type="number" class="gp-at" min="0" max="1" step="0.01"></label>
          <button type="button" class="gp-del" title="Tirar esta cor (ou botão direito na marca)">Tirar</button>
        </div>
        <small class="gp-tip">${lockStops ? (t.src.ok ? 'As cores têm {conta}: mude no código.' : 'Corrija o erro das cores nesta linha para editar aqui.') : 'Arraste as marcas · clique na barra para pôr uma cor · botão direito numa marca tira'}</small>`;
      p.classList.toggle('lock-stops', lockStops);
      p.classList.toggle('lock-geom', lockGeom);
      const cur = () => { const c = gradTarget(); return c && c.g.name === t.g.name ? c : null; };
      p.querySelector('.x').addEventListener('click', () => { gp.closed = where; fillGradPanel(); });
      p.querySelector('.gp-name').addEventListener('click', () => { const c = cur(); if (c) gotoCode(c.line, 0); });
      p.querySelectorAll('.gp-seg button').forEach((b) => b.addEventListener('click', () => {
        const c = cur();
        if (!c || lockGeom || c.g.type === b.dataset.type) return;
        const q = c.g.p, r = c.g.type === 'linear' ? [(q[0] + q[2]) / 2, (q[1] + q[3]) / 2, Math.hypot(q[2] - q[0], q[3] - q[1]) / 2] : [q[0] - q[2], q[1], q[0] + q[2], q[1]];
        writeGeom(c, b.dataset.type, r, c.g.box, 'gradtype' + Date.now());
      }));
      p.querySelector('.gp-box').addEventListener('change', (e) => {
        const c = cur();
        if (!c || lockGeom) return;
        // as mesmas coordenadas, de pixel para 0 a 1 (ou de volta) dentro da figura de referência: o desenho não muda
        const F = gradFrame(c.m, currentPose(), c.g, c.via && c.via.el), on = e.target.checked, q = c.g.p, b = F.b;
        const px = on ? (v) => (v - b.x) / b.w : (v) => b.x + v * b.w, py = on ? (v) => (v - b.y) / b.h : (v) => b.y + v * b.h;
        const r = c.g.type === 'linear' ? [px(q[0]), py(q[1]), px(q[2]), py(q[3])] : [px(q[0]), py(q[1]), on ? q[2] / F.rs : q[2] * F.rs, ...(q.length >= 5 ? [px(q[3]), py(q[4])] : [])];
        writeGeom(c, c.g.type, r, on, 'gradbox' + Date.now());
      });
      const bar = p.querySelector('.gp-bar'), marks = p.querySelector('.gp-marks');
      const atOf = (e, snap) => { const r = bar.getBoundingClientRect(), v = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); return snap ? Math.round(v * 20) / 20 : Math.round(v * 100) / 100; };
      bar.addEventListener('pointerdown', (e) => {
        const c = cur();
        if (!c || lockStops || e.button !== 0) return;
        e.preventDefault();
        const l = gradStops(c), at = atOf(e, e.shiftKey), col = gradColorAt(l, at), s = { ctext: hexOf(col, col[3]), explicit: true, at };
        l.push(s);
        gp.sel = placeStops(l, s);
        gp.drag = { key: 'gradstop' + Date.now(), x0: e.clientX, at0: at, w: bar.getBoundingClientRect().width, moved: true };
        writeStops(c, l, gp.drag.key);
      });
      marks.addEventListener('pointerdown', (e) => {
        const mk = e.target.closest('[data-i]');
        if (!mk || e.button !== 0) return;
        e.preventDefault();
        gp.sel = +mk.dataset.i;
        // a marca anda o quanto o mouse andar (pegar fora do meio dela não dá pulo); só depois de uns pixels
        const c = cur(), s = c && gradStops(c)[gp.sel];
        if (!lockStops && s) gp.drag = { key: 'gradstop' + Date.now(), x0: e.clientX, at0: s.at, w: bar.getBoundingClientRect().width, moved: false };
        fillGradPanel();
      });
      marks.addEventListener('contextmenu', (e) => {
        const mk = e.target.closest('[data-i]');
        if (!mk) return;
        e.preventDefault();
        gp.sel = +mk.dataset.i;
        removeStop();
      });
      const edit = (fn) => {
        const c = cur();
        if (!c || lockStops) return;
        const l = gradStops(c), s = l[gp.sel];
        if (s && fn(s, l) !== false) writeStops(c, l, gp.key || 'gradedit');
      };
      const newKey = () => { gp.key = 'gradedit' + Date.now(); };
      const col = p.querySelector('.gp-col'), hex = p.querySelector('.gp-hex'), al = p.querySelector('.gp-alpha'), at = p.querySelector('.gp-at');
      col.addEventListener('click', newKey);
      col.addEventListener('input', () => edit((s) => { s.ctext = col.value + (rgbaOf(s.c)[3] < 0.995 ? hx2(rgbaOf(s.c)[3] * 255) : ''); }));
      hex.addEventListener('keydown', (e) => { if (e.key === 'Enter') hex.blur(); });
      hex.addEventListener('change', () => { newKey(); edit((s) => { const v = hex.value.trim(); if (!v || /[\s@:]/.test(v)) return false; s.ctext = v; }); });
      al.addEventListener('pointerdown', newKey);
      al.addEventListener('keydown', newKey);
      al.addEventListener('input', () => edit((s) => { s.ctext = hexOf(rgbaOf(s.c), al.value / 100); }));
      at.addEventListener('change', () => { newKey(); edit((s, l) => { s.at = Math.min(1, Math.max(0, +at.value || 0)); gp.sel = placeStops(l, s); }); });
      p.querySelector('.gp-del').addEventListener('click', removeStop);
    }
    // os valores (refeitos a cada mudança, sem perder o campo que está sendo usado)
    p.querySelector('.gp-name').textContent = t.g.name;
    p.querySelector('.gp-name').title = `Ir para a linha ${t.line + 1}, a do gradient`;
    p.querySelector('.gp-via').textContent = t.via ? `${t.via.attr}= de ${t.via.el.name}` : `linha ${t.line + 1}`;
    p.querySelectorAll('.gp-seg button').forEach((b) => b.classList.toggle('on', b.dataset.type === t.g.type));
    p.querySelector('.gp-box').checked = t.g.box;
    const users = [...new Set(gradUsers(t.m, t.g).map((e) => e.name))];
    if (t.m.canvas.bg === t.g) users.unshift('fundo');
    p.querySelector('.gp-on').textContent = users.length ? `em ${users.slice(0, 3).join(', ')}${users.length > 3 ? ` e mais ${users.length - 3}` : ''}` : `sem uso: escreva c=${t.g.name} numa forma`;
    p.querySelector('.gp-fill').style.background = `linear-gradient(to right, ${list.map((s) => `${s.c} ${(s.at * 100).toFixed(1)}%`).join(', ')})`;
    p.querySelector('.gp-marks').innerHTML = list.map((s, i) => `<i data-i="${i}" class="${i === gp.sel ? 'on' : ''}" style="left:${(s.at * 100).toFixed(2)}%;--c:${esc(s.c)}" title="${esc(s.ctext)} em ${fmtAt(s.at)}"></i>`).join('');
    const s = list[gp.sel], c = rgbaOf(s.c), act = document.activeElement;
    const set = (cls, v) => { const el = p.querySelector(cls); if (el !== act) el.value = v; };
    set('.gp-col', hexOf(c, 1));
    set('.gp-hex', s.ctext);
    set('.gp-alpha', Math.round(c[3] * 100));
    set('.gp-at', fmtAt(s.at));
    p.querySelector('.gp-av').textContent = Math.round(c[3] * 100) + '%';
    p.querySelector('.gp-del').disabled = lockStops || list.length <= 2;
  }
  function removeStop() {
    const c = gradTarget();
    if (!c || !c.src.ok) return;
    const l = gradStops(c);
    if (l.length <= 2) { hint('Um gradiente precisa de pelo menos duas cores.', 2400); return; }
    const gone = l.splice(gp.sel, 1)[0];
    placeStops(l, null);
    gp.sel = Math.max(0, Math.min(gp.sel, l.length - 1));
    writeStops(c, l, 'gradstop' + Date.now());
    hint(`Cor ${gone.ctext} tirada (Ctrl+Z traz de volta).`, 2200);
  }
  // arrastar uma marca da barra: a posição segue o mouse (com Shift, de 0.05 em 0.05); pode passar de outra
  document.addEventListener('pointermove', (e) => {
    const d = gp.drag;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 3) return;
    d.moved = true;
    const c = gradTarget();
    if (!c) { gp.drag = null; return; }
    const l = gradStops(c), s = l[gp.sel];
    if (!s) return;
    const v = Math.min(1, Math.max(0, d.at0 + dx / Math.max(1, d.w)));
    s.at = e.shiftKey ? Math.round(v * 20) / 20 : Math.round(v * 100) / 100;
    gp.sel = placeStops(l, s);
    writeStops(c, l, d.key);
  });
  document.addEventListener('pointerup', () => { gp.drag = null; });

  // ---------- linha do tempo do filme ----------
  // a linha do arquivo onde está um shot, audio ou sub (para o cursor e para reescrever o tempo)
  let srcLines = null;
  function srcLine(src) {
    if (!srcLines || srcLines.model !== st.model) {
      srcLines = { model: st.model, map: new Map() };
      for (const [line, rec] of st.model.byLine) {
        const s = rec.audio || rec.sub || rec.shot || rec.mark;
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
    if (kind === 'mark') { editor.replaceRange(off + sst.pos[1].from, off + sst.pos[1].to, fmt(sec - item.base), {}); return; }
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
    gotoLine: (line) => editor.reveal(line, 0),
    edit: timeEdit,
    open: (file) => { if (file && st.files.has(file)) openFile(file); else hint(file ? `Abra "${file}" com Abrir… para editar.` : 'Este bloco é deste arquivo.', 2600); },
    hint: (msg) => hint(msg, 2400),
    // as faixas dos at, uma por ator, uma da câmera e uma de cada luz, camada ou forma (js/ui-film.js)
    lanes: (m) => (W.filmUi ? W.filmUi.lanes(m) : []),
    atMove: (list, dt, copy) => W.filmUi && W.filmUi.atMove(list, dt, copy),
    atDel: (list) => W.filmUi && W.filmUi.atDel(list),
    atMenu: (x, y, list) => W.filmUi && W.filmUi.atMenu(x, y, list),
    shotMenu: (x, y, entry) => W.filmUi && W.filmUi.shotMenu(x, y, entry),
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

  // paint = false: refaz o modelo e os painéis sem pintar (quem chama pinta logo depois)
  function reparse(paint = true) {
    st.files.set(st.current, editor.value);
    const want = st.model ? pvWanted() : null;
    st.model = parseFor(st.variant, want);
    // o código mudou quem usa o def (um use novo, um apagado): a prévia liga ou desliga já
    const now = pvWanted();
    if (now !== want) st.model = parseFor(st.variant, now);
    pvSwitch();
    editor.setErrors(st.model.errors);
    if (st.anim && !st.model.animMap.has(st.anim)) st.anim = '';
    if (isFilm()) {
      const tl = tline();
      if (st.shot !== '' && !tl.entries[+st.shot]) st.shot = '';
      if (st.frame >= tl.frames) st.frame = 0;
    } else st.shot = '';
    $('tCameraWrap').hidden = !isFilm();
    // a linha do tempo: a do filme (js/timeline.js) ou, num desenho com anim, a das key (js/ui-anim.js)
    $('tTimelineWrap').hidden = !(isFilm() || st.model.anims.length > 0);
    $('timeline').hidden = !(isFilm() && st.timeline);
    $('bSound').hidden = !(isFilm() && tline().audios.length);
    $('bSubs').hidden = !(isFilm() && tline().subs.length);
    if (st.variant && !st.model.variants.includes(st.variant)) st.variant = '';
    if (st.build) stopBuild();
    fillAnimSelect();
    fillVariantSelect();
    fillRefPanel();
    checkSel();
    fillLayerPanel();
    syncRulers();
    updateErrors();
    if (isFilm() && !FILM_TOOLS.includes(st.tool)) { st.tool = 'select'; stage.dataset.tool = 'select'; emit('tool'); }
    selMemo = null;
    updateCaretInfo();
    emit('model');
    if (paint) draw();
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
      row.addEventListener('click', () => { list.hidden = true; gotoCode(e.line, e.from); });
      list.appendChild(row);
    }
    if (!errs.length) list.hidden = true;
  }

  const KIND = { pt: 'ponto', tan: 'alça', center: 'centro', corner: 'canto', pivot: 'pivô', hip: 'raiz do membro', foot: 'pé do ik', root: 'raiz', pos: 'posição', light: 'luz', box: 'caixa', point: 'ponto de encaixe', dir: 'direção da luz', size: 'tamanho', round: 'canto', move: 'mover a forma', rot: 'giro', mid: 'ponto novo', fsize: 'tamanho da letra', g1: 'começo do gradiente', g2: 'fim do gradiente', gc: 'centro do gradiente', gr: 'raio do gradiente', gf: 'foco do gradiente' };
  // de que lado vem uma luz de direção (dx,dy aponta para a luz; y cresce para baixo)
  function lightSide(dx, dy) {
    if (!dx && !dy) return 'lugar nenhum (0,0 não tem direção)';
    const k = Math.round((Math.atan2(dy, dx) * 4) / Math.PI);
    return ['da direita', 'de baixo, à direita', 'de baixo', 'de baixo, à esquerda', 'da esquerda', 'de cima, à esquerda', 'de cima', 'de cima, à direita'][(k + 8) % 8];
  }
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
      if (hi >= 0) { const h = rec.handles[hi]; s += ` · ${h.label ? esc(h.label) : `${KIND[h.kind]}${h.kind === 'pt' ? ' ' + (h.idx + 1) : ''} (${h.x}, ${h.y})`}${h.kind === 'dir' ? `: a luz vem ${lightSide(h.x, h.y)}${h.insert ? ' (o padrão; arraste a seta para escrever light=)' : ''}` : ''}${h.fixed ? ' · calculado' : ''}`; }
    }
    const err = st.model && st.model.errors.find((e) => e.line === st.caret.line);
    if (err) s += ` · <span style="color:${err.level === 'error' ? 'var(--err)' : 'var(--warn)'}">${esc(err.msg)}</span>`;
    $('caretInfo').innerHTML = s;
    showCrumbs();
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
    fillGradPanel();
    fillDefPanel();
  }

  // ---------- autocompletar ----------
  const KDESC = {
    canvas: 'tamanho e fundo', finish: 'acabamento', art: 'estilo de arte (pixel, ascii)', unity: 'escala da Unity', palette: 'cores e espessuras', gradient: 'gradiente', let: 'variáveis',
    variant: 'variação de cores', include: 'usar outro arquivo', layer: 'camada', shape: 'forma fechada', stroke: 'traço ou membro', line: 'linha reta',
    ellipse: 'elipse/círculo', rect: 'retângulo', text: 'texto', def: 'componente', end: 'fim do def, do repeat ou do group', use: 'usar componente', group: 'grupo: junta linhas até o end (só o editor usa)', bone: 'osso',
    cloth: 'tecido', ik: 'perna ou braço de ossos com IK', anim: 'animação', key: 'pose num quadro', event: 'evento num quadro',
    light: 'luz (lâmpada, spot, sol)', ambient: 'luz geral da cena', emitter: 'partículas', pattern: 'hachura ou pontos',
    film: 'este arquivo é um filme', shot: 'plano do filme', actor: 'outro arquivo em cena', camera: 'câmera do plano',
    at: 'muda algo num tempo', scene: 'planos de outro filme',
    audio: 'som de referência (fala, música)', sub: 'legenda', mouth: 'bocas do lip sync',
    box: 'colisão, golpe ou dano (jogo)', godot: 'cena do Godot', tileset: 'folha de blocos', tile: 'um bloco do tileset',
    point: 'ponto de encaixe (jogo)', repeat: 'repete as linhas até o end', mark: 'momento com nome (filme)', expr: 'expressão do personagem',
  };
  // o que dá para mudar com at, com o tipo de valor
  function atTargets(m) {
    const out = [];
    for (const a of filmActors()) for (const p of Object.keys(L.ACTOR_PROPS)) out.push({ label: `${a.name}.${p}=`, detail: 'ator' });
    for (const p of Object.keys(L.CAMERA_PROPS)) out.push({ label: `camera.${p}=`, detail: 'câmera' });
    for (const n of m.lights.keys()) for (const p of Object.keys(L.LIGHT_PROPS)) out.push({ label: `${n}.${p}=`, detail: 'luz' });
    for (const n of m.layerMap.keys()) for (const p of ['opacity', 'show', 'yaw', 'pitch']) out.push({ label: `${n}.${p}=`, detail: 'camada' });
    for (const n of m.named.keys()) for (const p of Object.keys(L.SHAPE_AT_PROPS)) out.push({ label: `${n}.${p}=`, detail: 'forma' });
    out.push({ label: 'ease=' });
    out.push({ label: 'blend=', detail: 'mistura a troca de anim= (ex.: 0.4s)' });
    out.push({ label: 'phase', detail: 'a troca de anim= continua na mesma fase da passada' });
    out.push({ label: 'dur=', detail: 'quanto tempo dura a metamorfose (morph=) da linha (ex.: 1.5s)' });
    out.push({ label: 'pairs=', detail: 'metamorfose: casa uma parte com outra (ex.: pata1->rabo)' });
    out.push({ label: 'born=', detail: 'metamorfose: de onde nasce uma parte (ex.: rabo->corpo)' });
    return out;
  }
  function complete({ before }) {
    const m = st.model;
    if (!m) return [];
    const sp = L.splitLine(before);
    // x,y@osso: depois do @ de um ponto, os ossos
    if (sp.comment === null && sp.colon >= 0 && /@[\w-]*$/.test(before) && sp.words[0] && ['shape', 'stroke', 'line'].includes(sp.words[0].text)) {
      return [...m.bones.keys()].map((n) => ({ label: n, detail: 'osso que este ponto segue' }));
    }
    if (sp.comment !== null || sp.colon >= 0) return [];
    const ws = sp.words;
    const typing = ws.length && !/\s$/.test(before);
    const cur = typing ? ws[ws.length - 1].text : '';
    // depois de um @ fora dos pontos (mirror=forma@x, A=forma@0.5) não há o que sugerir
    if (cur.includes('@')) return [];
    const idx = typing ? ws.length - 1 : ws.length;
    const names = (arr, detail) => arr.map((n) => ({ label: String(n), detail }));
    if (idx === 0) return Object.keys(L.KEYWORDS).map((k) => ({ label: k, detail: KDESC[k] || '' }));
    const cmd = ws[0].text;
    const colors = [...m.palette].filter(([, v]) => typeof v === 'string').map(([k]) => k);
    const widths = [...m.palette].filter(([, v]) => typeof v === 'number').map(([k]) => k);
    const els = [...m.named.keys()];
    const colorList = () => [...names(colors, 'cor'), ...names([...m.gradients.keys()], 'gradiente'), ...names([...m.patterns.keys()], 'padrão'), { label: 'none' }];
    const eq = L.topIndex(cur, '=');
    const actorOf = (name) => filmActors().find((a) => a.name === name);
    // speed= de um ator: auto (a animação acompanha o quanto ele anda) ou quantas vezes a velocidade normal
    const speedList = () => [...names(['auto'], 'a animação acompanha o quanto o ator anda (passada do feet=)'), ...names(['1', '0.5', '2', '0'], 'vezes a velocidade normal (0 congela)')];
    const fileList = () => names([...st.files.keys()].filter((f) => f !== st.current).map((f) => `"${f}"`), 'arquivo');
    if (eq > 0) {
      const key = cur.slice(0, eq);
      if (cmd === 'at' && key.includes('.')) {
        const target = key.slice(0, key.lastIndexOf('.')), prop = key.slice(key.lastIndexOf('.') + 1);
        const ac = actorOf(target);
        if (prop === 'anim') return ac && ac.model ? [...names(ac.model.anims.map((a) => a.name), 'animação'), { label: 'none' }] : [];
        if (prop === 'variant') return ac && ac.model ? [...names(ac.model.variants, 'variante'), { label: 'none' }] : [];
        if (prop === 'expr') return ac && ac.model ? [...names([...ac.model.exprs.keys()], 'expressão'), { label: 'none' }] : [];
        if (prop === 'along') return names(['0', '1'], '0 = começo do caminho, 1 = fim');
        if (prop === 'follow') return [...names(filmActors().map((a) => a.name), 'ator'), { label: 'none' }];
        if (prop === 'morph') return names(filmActors().map((a) => a.name).filter((n) => n !== target), 'ator em que este vira');
        if (prop === 'flip') return names(['x', 'y', 'xy', 'none']);
        if (prop === 'speed' && ac) return speedList();
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
        if (key === 'speed') return speedList();
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
      // anim … from= to=: as animações do arquivo e os nomes sem a direção (walk acha walk_right, walk_down…)
      if (cmd === 'anim' && (key === 'from' || key === 'to')) {
        const own = m.anims.filter((a) => !a.blendOf).map((a) => a.name);
        const bases = own.map((n) => n.replace(/_(down_right|down_left|up_right|up_left|right|left|down|up)$/, '')).filter((b, i, l) => !own.includes(b) && l.indexOf(b) === i);
        return [...names(bases, 'todas as direções'), ...names(own, 'animação')];
      }
      switch (key) {
        case 'c': case 'inkc': case 'bg': return colorList();
        case 'w': case 'ink': return cmd === 'art' ? names(['2', '3', '4'], 'espessura da linha') : names(widths, 'espessura');
        case 'bone': case 'on': case 'parent': case 'target': return names([...m.bones.keys()], 'osso');
        case 'bones': return names([...m.bones.keys()], 'osso (separe com vírgula)');
        case 'feet': return names([...m.points.keys()], 'ponto que é um pé (separe com vírgula)');
        case 'path': return names(els, 'linha, traço ou forma');
        case 'turn': return names(['1', '0'], '1 = vira com a curva');
        case 'mix': return names(m.anims.map((x) => x.name), 'base,ação');
        case 'cloth': return names([...m.cloths.keys()], 'tecido');
        case 'inkon': return names([...m.layerMap.keys()], 'camada');
        case 'clip': case 'cut': return [...names(els, 'forma'), ...names([...m.layerMap.keys()], 'camada')];
        case 'only': return [...names(m.anims.map((a) => a.name), 'animação'), { label: 'pose', detail: 'pose parada' }];
        case 'body': return names(L.GODOT_BODIES, 'nó raiz do Godot');
        case 'rig': return [{ label: 'frames', detail: 'quadros prontos (padrão)' }, { label: 'bones', detail: 'esqueleto de verdade: Bone2D e peças' }];
        case 'palette': return cmd === 'art' ? [{ label: 'own', detail: 'as cores do desenho (padrão)' }, { label: 'gameboy', detail: '4 verdes' }, { label: 'nes', detail: 'Nintendo 8 bits' }, { label: 'pico8', detail: '16 cores' }, { label: 'mono', detail: 'preto e branco (1 bit)' }] : [];
        case 'dither': return [{ label: 'bayer', detail: 'pontilhado nos degradês e na luz' }, { label: 'none', detail: 'sem pontilhado' }];
        case 'paper': case 'inks': return colorList();
        case 'boil': return cmd === 'art' ? [{ label: 'screen', detail: 'a textura fica parada na tela' }, { label: '0', detail: 'presa à forma, sem mudar' }, { label: '2', detail: 'presa à forma, sorteada de novo a cada 2 quadros' }] : [];
        case 'actor': return names(filmActors().map((a) => a.name), 'ator (separe com vírgula)');
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
        ...[...m.bones.keys()].flatMap((b) => Object.keys(L.BONE_PROPS).map((p) => ({ label: `${b}.${p}=`, detail: 'osso' }))),
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
      return [...names(L.ATTRS.use.map((a) => a + '='), 'atributo'), ...names(L.FLAGS.use, 'opção'), ...(def ? names([...def.st.attrs.keys()].map((k) => k + '='), 'parâmetro') : [])];
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
    if (cmd === 'at' && idx === 1) return [...names(['0s', '1s', '+1s', '+0.5s'], 'tempo'), ...names(m.film ? m.film.marks.map((k) => k.name) : [], 'marcador')];
    if (cmd === 'mark' && idx === 2) return names(['0s', '1m', '1m30s'], 'tempo');
    if (cmd === 'at' && idx >= 2) return atTargets(m);
    if (cmd === 'gradient' && idx === 2) return names(['linear', 'radial']);
    if (cmd === 'light' && idx === 2) return names(['point', 'spot', 'dir']);
    if (cmd === 'pattern' && idx === 2) return names(['hatch', 'dots']);
    if (cmd === 'art' && idx === 1) {
      return [
        { label: 'pixel', detail: 'pixel art nítido' }, { label: 'ascii', detail: 'letras (sai também em .txt)' },
        { label: 'toon', detail: 'cel shading: sombra dura e luz em degraus' }, { label: 'engraving', detail: 'gravura: hachura pelo tom' },
        { label: 'woodcut', detail: 'xilogravura: sulcos brancos no preto' }, { label: 'halftone', detail: 'retícula de pontos (color: quatro cores)' },
        { label: 'comic', detail: 'HQ (old: gibi antigo; old bw: tira de jornal)' }, { label: 'manga', detail: 'mangá: preto chapado e retícula' },
        { label: 'riso', detail: 'risografia: 2 ou 3 tintas em grão' }, { label: 'stencil', detail: 'estêncil: poucos tons e spray' },
        { label: 'silhouette', detail: 'silhueta de uma cor só' }, { label: 'sketch', detail: 'esboço: lápis tremido e cor fora do lugar' },
        { label: 'marker', detail: 'marcador: passadas de caneta e nanquim' }, { label: 'pencil', detail: 'lápis de cor: hachura e grão do papel' },
        { label: 'crayon', detail: 'giz de cera: passadas de vai-e-vem e grão' }, { label: 'chalk', detail: 'giz no quadro-negro' },
        { label: 'watercolor', detail: 'aquarela: aguada e linha de caneta' },
        { label: 'cutout', detail: 'recorte de papel: peças com sombra' }, { label: 'clay', detail: 'massinha: peças com volume' },
        { label: 'glass', detail: 'vitral: vidros com chumbo (frame: moldura)' }, { label: 'embroidery', detail: 'bordado à mão no linho' },
        { label: 'stitch', detail: 'ponto-cruz: um X em cada casa' }, { label: 'mosaic', detail: 'mosaico: pastilhas com rejunte' },
        { label: 'knit', detail: 'tricô: um V de lã em cada casa' },
        { label: 'lines', detail: 'só o contorno (livro de colorir)' }, { label: 'neon', detail: 'contornos de neon num fundo escuro' },
        { label: 'none', detail: 'sem estilo' },
      ];
    }
    if (cmd === 'art' && idx >= 2) {
      const o = L.ART_OPTS[ws[1] && ws[1].text];
      if (o) return [...names([...o.attrs, ...(isFilm() ? ['actor'] : [])].map((a) => a + '='), 'atributo'), ...names(o.flags, 'opção')];
    }
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
    showLoop();
  }
  function fillAnimSelect() {
    if (isFilm()) { fillFilmSelect(); return; }
    const sel = $('animSel');
    const m = st.model;
    const want = ['', ...m.anims.map((a) => a.name)];
    const have = [...sel.options].map((o) => o.value);
    // a lista vazia (a página abriu num arquivo sem animações) também precisa do "sem animações"
    if (want.join('\n') !== have.join('\n') || !have.length) {
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
    showLoop();
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

  // Repetir ou tocar uma vez. Sem clique, segue a animação: a `once` toca uma vez e para no último quadro (como no
  // Godot), a de loop repete; o filme repete o trecho. O clique vale para a animação (ou o filme) em que foi feito, até
  // o `once`/`loop` dela mudar no código. Só muda o que o player mostra: não escreve no código nem fica guardado.
  const loopKey = () => `${st.current}\t${isFilm() ? '' : '\t' + st.anim}`;
  function ownLoop() {
    if (isFilm()) return true;
    const a = currentAnim();
    return !a || a.loop !== false;
  }
  function repeating() {
    const p = st.loopPick;
    return p && p.key === loopKey() && p.loop === ownLoop() ? p.on : ownLoop();
  }
  function showLoop() {
    const b = $('bLoop'), on = repeating();
    b.classList.toggle('on', on);
    b.disabled = !isFilm() && !currentAnim();
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? 'Repetir: no fim, volta ao começo (clique para tocar uma vez)' : 'Tocar uma vez: para no último quadro (clique para repetir)';
  }
  function toggleLoop() {
    st.loopPick = { key: loopKey(), loop: ownLoop(), on: !repeating() };
    showLoop();
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
    // tocando uma vez, parado no último quadro: começa de novo
    if (on && !repeating() && st.frame >= currentAnim().frames - 1) st.frame = 0;
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
    // na prévia de um def, pinta o def
    const plan = S.buildPlan(pvModel() || st.model, { guides: false, speed: st.speed });
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
  // Tocando, a tela só pinta quando o quadro avança: numa animação de 12 fps e numa tela de 60 Hz, 4 de cada 5 voltas
  // pintavam o mesmo quadro, com todos os painéis. A pintura passo a passo, que anda pelo tempo, pinta em toda volta.
  // Quem muda outra coisa com o player andando (o código, a variante, a escolha) pinta por conta própria.
  let painted = null;
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
        if (st.frame + n >= hi && !repeating()) {
          // tocando uma vez: o trecho acabou, para no último quadro
          st.frame = hi - 1;
          st.playing = false;
          stopSound();
          fillAnimSelect();
        } else {
          const before = st.frame;
          st.frame = lo + ((st.frame - lo + n) % (hi - lo));
          if (st.frame < before) startSound(); // deu a volta: o som recomeça junto
          $('frameSl').value = st.frame;
          $('frameLbl').textContent = filmText();
        }
      }
      again = true;
    } else if (st.playing && a) {
      st.acc += ((t - st.lastT) / 1000) * a.fps * st.speed;
      st.lastT = t;
      if (st.acc >= 1) {
        const n = Math.floor(st.acc);
        st.acc -= n;
        if (st.frame + n >= a.frames && !repeating()) {
          // tocando uma vez: para no último quadro
          st.frame = a.frames - 1;
          st.playing = false;
          fillAnimSelect();
        } else {
          st.frame = (st.frame + n) % a.frames;
          $('frameSl').value = st.frame;
          const lbl = $('frameLbl');
          lbl.textContent = frameText(a, st.frame);
          lbl.classList.toggle('event', a.events.some((e) => e.frame === st.frame));
        }
      }
      again = true;
    }
    if (st.build) {
      if ((t - st.build.t0) / 1000 > st.build.plan.total + 0.8) stopBuild();
      else again = true;
    }
    const same = st.playing && !st.build && painted && painted.frame === st.frame && painted.anim === st.anim && painted.playing;
    if (!same) {
      draw();
      painted = { frame: st.frame, anim: st.anim, playing: st.playing };
    }
    if (again) kick();
  }

  // ---------- prévia do def ----------
  // Com o cursor dentro de def … end, o desenho dá lugar ao componente sozinho, em 0,0 (o x,y do use), com as
  // variáveis do painel. Sem nenhum use, na hora; usado, pela chave "Prévia do def". O painel nunca muda o código:
  // os valores ficam só enquanto a página está aberta.
  // o def onde está o cursor (da linha do def até a do end): { name, line } ou null
  function caretDef() {
    if (!st.model || isFilm()) return null;
    const ls = editor.value.split('\n'), line = st.caret.line, stack = [];
    for (let i = 0; i <= line && i < ls.length; i++) {
      const w = (/^\s*([A-Za-z_]\w*)/.exec(ls[i]) || [])[1];
      if (w === 'def' || w === 'repeat' || w === 'group') stack.push({ w, i }); else if (w === 'end' && i < line) stack.pop();
    }
    const d = stack.find((b) => b.w === 'def'), name = d && (/^\s*def\s+([A-Za-z_]\w*)/.exec(ls[d.i]) || [])[1];
    return name && st.model.defs.has(name) ? { name, line: d.i } : null;
  }
  // a chave e os valores do painel são de cada def de cada arquivo
  const pvKey = (name) => st.current + '\n' + name;
  function pvOn(name) { const k = pvKey(name); return pv.mode.has(k) ? pv.mode.get(k) : !st.model.defs.get(name).uses; }
  // a prévia que o cursor pede agora (o nome do def) ou null
  function pvWanted() {
    const d = caretDef();
    return d && pvOn(d.name) ? d.name : null;
  }
  function pvModel() { return (st.model && st.model.preview && st.model.preview.model) || null; }
  // o papel: o quadro do desenho ou, na prévia, a caixa do componente com uma folga (e o 0,0 sempre dentro)
  function viewRect() {
    const P = st.model.preview;
    if (!P || !P.model) return { x: 0, y: 0, w: st.model.canvas.w, h: st.model.canvas.h };
    if (!P.rect) {
      const pm = P.model, pose = S.makePose(pm, null, 0);
      let b = { x0: 0, y0: 0, x1: 0, y1: 0 };
      for (const el of pm.elements) {
        if (el.hidden) continue;
        const g = S.geometry(pm, pose, el);
        if (g.segs.length) b = tightBox(g.segs, b);
      }
      const pad = Math.max(16, Math.round(Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.12));
      const x = Math.floor(b.x0 - pad), y = Math.floor(b.y0 - pad);
      P.rect = { x, y, w: Math.max(40, Math.ceil(b.x1 + pad) - x), h: Math.max(40, Math.ceil(b.y1 + pad) - y) };
    }
    return P.rect;
  }

  // a prévia apareceu, trocou de def ou sumiu: a vista se ajusta ao def; ao sair, volta a de antes
  function pvSwitch() {
    const now = st.model.preview ? st.model.preview.def : null;
    if (now === pv.shown) return;
    if (!pv.shown) pv.view = Object.assign({}, st.view);
    if (now) st.view.auto = true;
    else if (pv.view) { Object.assign(st.view, pv.view); pv.view = null; }
    pv.shown = now;
  }
  // um valor do painel (igual ao padrão do def: sai da lista)
  function pvSet(key, text) {
    const P = st.model.preview, p = P && P.params.find((q) => q.key === key);
    if (!p) return;
    let mp = pv.params.get(pvKey(P.def));
    if (!mp) pv.params.set(pvKey(P.def), (mp = new Map()));
    if (text === p.def) mp.delete(key); else mp.set(key, text);
    reparse();
  }
  // a chave da prévia (só com o cursor num def) e o painel das variáveis (só com a prévia na tela)
  function fillDefPanel() {
    const d = caretDef(), tw = $('tPreviewWrap');
    tw.hidden = !d;
    if (d) {
      $('tPreview').checked = pvOn(d.name);
      tw.title = `Prévia do def: mostra o def ${d.name} sozinho, com um painel para mudar as variáveis dele (sem mudar o código). ${st.model.defs.get(d.name).uses ? 'Ele tem use, então a prévia só aparece com esta chave ligada' : 'Sem nenhum use, a prévia aparece sozinha; desligue aqui para ver o desenho'}.`;
    }
    const p = $('defPanel'), P = st.model.preview;
    if (!P || !P.model || isFilm()) { p.hidden = true; pv.sig = ''; return; }
    p.hidden = false;
    const sig = [P.def, P.line, ...P.params.map((q) => q.key + ':' + q.kind + ':' + q.def)].join('|');
    if (sig !== pv.sig) {
      pv.sig = sig;
      const opts = (list, cur) => [...new Set([...list, cur])].map((n) => `<option${n === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
      const colors = ['none', ...[...st.model.palette].filter(([, v]) => typeof v === 'string').map(([k]) => k)];
      const row = (q) => {
        const k = esc(q.key), t = esc(q.text);
        const ctl = q.kind === 'num' ? `<input type="text" class="dp-num" value="${t}" spellcheck="false" autocomplete="off" title="Número (Enter grava); arraste o nome para os lados para mudar (Shift: 10× mais)">`
          : q.kind === 'grad' ? `<select class="dp-sel">${opts([...st.model.gradients.keys()], q.text)}</select>`
            : q.kind === 'pattern' ? `<select class="dp-sel">${opts([...st.model.patterns.keys()], q.text)}</select>`
              : `<input type="color" class="dp-col" title="Escolher a cor"><input type="text" class="dp-txt" list="dpColors" value="${t}" spellcheck="false" autocomplete="off" title="Cor: #hex, um nome da palette, de cor ou none (Enter grava)">`;
        return `<div class="dp-row" data-k="${k}"><span class="dp-k${q.kind === 'num' ? ' scrub' : ''}">${k}</span>${ctl}<button type="button" class="dp-back" title="Voltar ao padrão do def (${esc(q.def)})">↺</button></div>`;
      };
      p.innerHTML = `<div class="rp-head"><b>Prévia</b><button type="button" class="dp-name" title="Ir para a linha do def">def ${esc(P.def)}</button><span class="grow"></span><small class="dp-uses"></small></div>
        ${P.params.length ? P.params.map(row).join('') : `<div class="rp-empty">O def ${esc(P.def)} não tem variáveis. Elas vêm na linha do def, com o valor padrão: <code>def ${esc(P.def)} r=20 c=red</code>.</div>`}
        <datalist id="dpColors">${colors.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
        <div class="dp-errs"></div>
        <div class="rp-foot"><button type="button" class="dp-reset">Voltar ao padrão</button><button type="button" class="dp-copy" title="Copia uma linha use com os valores que você mudou">Copiar como use</button></div>
        <small class="dp-tip">A cruz é o 0,0: o ponto que vai para o x,y do use. Os valores daqui não mudam o código; as alças mudam as linhas do def.</small>`;
      p.querySelector('.dp-name').addEventListener('click', () => { const P2 = st.model.preview; if (P2) gotoCode(P2.line, 0); });
      p.querySelector('.dp-reset').addEventListener('click', () => { const P2 = st.model.preview; if (P2) { pv.params.delete(pvKey(P2.def)); reparse(); } });
      p.querySelector('.dp-copy').addEventListener('click', () => {
        const P2 = st.model.preview;
        if (!P2) return;
        const line = `use ${P2.def} 0,0` + P2.params.filter((q) => q.changed).map((q) => ` ${q.key}=${q.text}`).join('');
        const done = () => hint(`Copiado: ${line}`, 2600);
        if (navigator.clipboard) navigator.clipboard.writeText(line).then(done, () => hint(line, 4000)); else hint(line, 4000);
      });
      p.querySelectorAll('.dp-row').forEach((r) => {
        const key = r.dataset.k, q = () => st.model.preview && st.model.preview.params.find((x) => x.key === key);
        r.querySelector('.dp-back').addEventListener('click', () => { const x = q(); if (x) pvSet(key, x.def); });
        const sel = r.querySelector('.dp-sel');
        if (sel) sel.addEventListener('change', () => pvSet(key, sel.value));
        const txt = r.querySelector('.dp-txt'), col = r.querySelector('.dp-col');
        if (txt) {
          txt.addEventListener('keydown', (e) => { if (e.key === 'Enter') txt.blur(); });
          txt.addEventListener('change', () => { const v = txt.value.trim(); if (v && !/\s/.test(v)) pvSet(key, v); });
          col.addEventListener('input', () => { txt.value = col.value; pvSet(key, col.value); });
        }
        const numIn = r.querySelector('.dp-num');
        if (numIn) {
          numIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') numIn.blur(); });
          numIn.addEventListener('change', () => { const v = numIn.value.trim(); if (v !== '' && !isNaN(Number(v))) pvSet(key, String(Number(v))); });
          // arrastar o nome: o número anda com o mouse (o passo vem do tamanho do padrão)
          const k = r.querySelector('.dp-k');
          k.addEventListener('pointerdown', (e) => {
            const x = q();
            if (!x || e.button !== 0) return;
            e.preventDefault();
            k.setPointerCapture(e.pointerId);
            const a = Math.abs(Number(x.def)) || Math.abs(x.value) || 1, step = a >= 20 ? 1 : a >= 2 ? 0.1 : 0.01, dec = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
            const x0 = e.clientX, v0 = x.value;
            const move = (ev) => {
              const v = Number((v0 + Math.round((ev.clientX - x0) / 3) * step * (ev.shiftKey ? 10 : 1)).toFixed(dec));
              if (String(v) !== numIn.value) { numIn.value = String(v); pvSet(key, String(v)); }
            };
            const up = () => { k.removeEventListener('pointermove', move); k.removeEventListener('pointerup', up); k.removeEventListener('pointercancel', up); };
            k.addEventListener('pointermove', move);
            k.addEventListener('pointerup', up);
            k.addEventListener('pointercancel', up);
          });
        }
      });
    }
    // os valores de agora (sem mexer no campo onde você está escrevendo)
    for (const q of P.params) {
      const r = p.querySelector(`.dp-row[data-k="${q.key}"]`);
      if (!r) continue;
      r.classList.toggle('changed', q.changed);
      const f = r.querySelector('.dp-num, .dp-txt, .dp-sel');
      if (f && f !== document.activeElement && f.value !== q.text) f.value = q.text;
      const col = r.querySelector('.dp-col');
      if (col) {
        const c = typeof q.value === 'string' ? rgbaOf(q.value) : null;
        if (c && col !== document.activeElement) col.value = hexOf(c, 1);
        col.classList.toggle('none', !c);
      }
    }
    const uses = st.model.defs.get(P.def).uses;
    p.querySelector('.dp-uses').textContent = uses ? `usado ${uses}×` : 'sem use';
    const errs = p.querySelector('.dp-errs');
    errs.innerHTML = P.errors.slice(0, 4).map((e) => `<div class="${e.level}">linha ${e.line + 1}: ${esc(e.msg)}</div>`).join('');
    p.querySelector('.dp-reset').disabled = !P.params.some((q) => q.changed);
  }

  function currentPose() {
    // a prévia é parada: o def como está escrito, sem animação
    const P = pvModel();
    if (P) return S.makePose(P, null, 0);
    // Testar giro (Prender, pose parada): os ossos girados só na tela
    if (spinOn() && st.pin.spin.size) return S.spinPose(st.model, st.pin.spin);
    return S.makePose(st.model, st.build ? '' : st.anim, st.frame);
  }

  function fit() {
    const cv = $('view'), m = viewRect();
    const w = cv.clientWidth, h = cv.clientHeight;
    // com as réguas ligadas, o desenho cabe no espaço que sobra ao lado delas
    const r = rulersOn() ? RULER : 0;
    // na prévia, o def fica acima do painel das variáveis
    const dp = $('defPanel'), ph = pvModel() && !dp.hidden ? Math.min(dp.offsetHeight + 8, (h - r) / 2) : 0;
    const z = Math.max(0.05, Math.min((w - r - 40) / m.w, (h - r - ph - 40) / m.h, pvModel() ? 4 : Infinity));
    st.view.z = z;
    st.view.x = r + (w - r - m.w * z) / 2 - m.x * z;
    st.view.y = r + (h - r - ph - m.h * z) / 2 - m.y * z;
    // na prévia, o papel muda de tamanho com o desenho: ajusta uma vez só (F ajusta de novo)
    if (pvModel()) st.view.auto = false;
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

  // a moldura em volta do desenho segue o tema (js/ui-theme.js); o desenho e o que vai por cima dele, não
  const theme = (dark, light) => (W.theme ? W.theme.pick(dark, light) : dark);
  const paperShadow = () => theme('rgba(0,0,0,.5)', 'rgba(20,30,45,.22)');
  const RULER_C = {
    dark: { bg: '#18202a', paper: '#243039', tick: '#6b7885', text: '#9aa7b4', edge: '#2c3843' },
    light: { bg: '#f0f2f5', paper: '#ffffff', tick: '#9aa5b1', text: '#5b6675', edge: '#d9dde3' },
  };
  if (W.theme) W.theme.on(() => draw());

  function draw() {
    if (!st.model) return;
    // quem acompanha o desenho (o painel Propriedades, a vista 3D) fica sabendo
    emit('draw');
    // com a vista Camadas em 3D aberta, ela pinta (o desenho de baixo fica parado, escondido)
    if (st.view3d) return;
    const cv = $('view'), ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(cv.clientWidth * dpr)), ch = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    if (st.view.auto) fit();
    showZoom();
    // na prévia de um def, o desenho é o do def sozinho, num papel do tamanho dele (R)
    const P = isFilm() ? null : pvModel(), m = P || st.model, c = m.canvas, z = st.view.z, R = viewRect();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const T = () => ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * st.view.x, dpr * st.view.y);
    T();
    if (isFilm()) { drawFilm(ctx, dpr, T); if (st.timeline) tlView.draw(); return; }
    const pose = currentPose();

    // papel
    ctx.save();
    ctx.shadowColor = paperShadow();
    ctx.shadowBlur = 26 * dpr;
    ctx.shadowOffsetY = 6 * dpr;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.restore();
    if (c.bg) S.fillBg(ctx, m, pose, R);
    else {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, dpr * st.view.x, dpr * st.view.y);
      ctx.fillStyle = checkerPattern(ctx);
      ctx.fillRect(R.x * z, R.y * z, R.w * z, R.h * z);
      ctx.restore();
    }

    let bf = null;
    if (st.build) bf = S.buildFilter(st.build.plan, (performance.now() - st.build.t0) / 1000);
    const refs = st.show.refs && m.refs.length && !st.build ? refImage : null;

    ctx.save();
    ctx.beginPath();
    ctx.rect(R.x, R.y, R.w, R.h);
    ctx.clip();
    // estilo (art): com a chave Estilo ligada; os estilos pesados mostram o desenho normal enquanto você arrasta
    const artOn = !!m.art && st.show.art && !(st.drag && W.art.heavy(m.art));
    const post = m.finish.pixel > 1 || S.hasPost(m) || artOn;
    if (refs && !post) S.drawRefs(ctx, m, pose, refs, false);
    const anim = pose.anim;
    if (st.show.onion && anim && anim.frames > 1 && !st.build && !P) {
      const s = Math.min(2, z * dpr);
      for (const d of [-1, 1]) {
        const img = S.renderImage(m, S.makePose(m, anim.name, st.frame + d), { scale: s, transparent: true, guides: false, art: artOn, screen: false });
        ctx.globalAlpha = 0.22;
        ctx.drawImage(img, 0, 0, c.w, c.h);
      }
      ctx.globalAlpha = 1;
    }
    if (post) {
      // acabamentos de imagem (pixel, bloom, vinheta, granulado) precisam da imagem pronta
      const cap = m.finish.posterize ? 2 : 4;
      const img = S.renderImage(m, pose, { scale: Math.min(cap, z * dpr), transparent: !c.bg, guides: st.show.guides, filter: bf && bf.filter, refs, rect: R, art: artOn });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, R.x, R.y, R.w, R.h);
      ctx.imageSmoothingEnabled = true;
    } else {
      S.drawScene(ctx, m, pose, { background: false, guides: st.show.guides, filter: bf && bf.filter });
      if (refs) S.drawRefs(ctx, m, pose, refs, true);
    }
    const iso = P || st.build ? null : isoGroup();
    if (iso) dimOutside(ctx, m, pose, iso, R);
    ctx.restore();

    T();
    if (refs) drawRefFrames(ctx, m, pose, z);
    if (st.show.guides && m.unity) drawUnity(ctx, m.unity, z);
    if (st.show.guides && m.tileset) drawTileset(ctx, m, z);
    if (m.boxes.size) drawBoxes(ctx, m, pose, z);
    if (st.show.guides && m.points.size) drawPoints(ctx, m, pose, z);
    if (st.show.guides && m.lights.size) drawLights(ctx, m, pose, z);
    // na ferramenta Prender, os ossos aparecem mesmo com a chave Ossos desligada
    const pinning = pinOn();
    if ((st.show.bones || pinning) && !P) drawBones(ctx, m, pose, z);
    if (P) drawOrigin(ctx, z);
    const gait = st.show.traj && anim && m.points.size && !st.build ? S.drawTrajectory(ctx, m, anim, z, { frame: st.frame }) : null;
    if (bf) S.drawTrace(ctx, m, pose, st.build.plan, bf.st, z);
    else if (pinning) drawPins(ctx, m, pose, z);
    else if (pointsOn()) { drawHandles(ctx, m, pose, z); if (groupOn()) drawGroup(ctx, m, pose, z); } else if (groupOn()) drawGroup(ctx, m, pose, z);
    if (st.marq && st.marq.moved) drawMarq(ctx, z);
    const tk = toolHooks[st.tool];
    if (tk && tk.overlay) { ctx.save(); tk.overlay(ctx, z, dpr); ctx.restore(); T(); }
    for (const f of overlays) { ctx.save(); f(ctx, z, dpr); ctx.restore(); T(); }
    const ro = rulersOn();
    if (ro) drawGuides(ctx, dpr);
    if (st.meas) drawMeasure(ctx, dpr);
    if (ro) drawRulers(ctx, dpr);
    if (gait) drawGaitNote(ctx, dpr, gait);
    else if (pinning && spinOn() && st.pin.spin.size) drawSpinNote(ctx, dpr);
    else if (iso) drawNote(ctx, dpr, [`grupo ${iso.name || '(sem nome)'}${iso.lock ? ' (travado)' : ''}`, 'Esc ou duplo clique fora: sai']);
  }
  // no isolamento, o resto do desenho fica apagado: um véu claro por cima, e as formas do grupo pintadas de novo
  function dimOutside(ctx, m, pose, g, R) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.restore();
    const map = (i) => (m.lineMap ? m.lineMap[i] : i);
    S.drawScene(ctx, m, pose, { background: false, guides: st.show.guides, filter: (el) => { const l = map(el.use !== undefined ? el.use : el.line); return l > g.line && l < g.end; } });
  }

  // prévia do def: a cruz no 0,0, o ponto que vai parar no x,y do use
  function drawOrigin(ctx, z) {
    const r = 10 / z;
    ctx.save();
    ctx.lineWidth = 1.5 / z;
    ctx.strokeStyle = '#ff3fa4';
    ctx.fillStyle = '#ff3fa4';
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${11 / z}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText('0,0', r * 0.6, r * 0.6);
    ctx.restore();
  }

  // trajetória com feet=: em cima, à esquerda, quanto o personagem anda e os pés que escorregam
  function drawGaitNote(ctx, dpr, g) {
    const t = S.gaitText(g, 1);
    drawNote(ctx, dpr, [`${g.anim.name}: ${t.head}`, ...t.slips]);
  }
  // Testar giro: quais ossos estão girados (só na tela)
  function drawSpinNote(ctx, dpr) {
    const list = [...st.pin.spin].filter(([n]) => st.model.bones.has(n)).map(([n, a]) => `${n} ${Math.round(a)}°`);
    if (list.length) drawNote(ctx, dpr, [`Testar giro: ${list.join(' · ')}`, 'só na tela, não escreve nada · Esc volta']);
  }
  // uma nota no canto de cima, à esquerda: a primeira linha clara, as outras em âmbar
  function drawNote(ctx, dpr, lines) {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '12px ui-monospace, Consolas, monospace';
    const r0 = rulersOn() ? RULER : 0, lh = 18, x = r0 + 8, y = r0 + 8;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16, h = lines.length * lh + 8;
    ctx.fillStyle = 'rgba(10,14,19,.85)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 0.5, y + 0.5, w, h, 5); else ctx.rect(x + 0.5, y + 0.5, w, h);
    ctx.fill();
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => {
      ctx.fillStyle = i ? '#ffb000' : '#e8eef5';
      ctx.fillText(l, x + 8, y + 4 + lh * i + lh / 2);
    });
    ctx.restore();
  }

  // Filme: na vista da câmera, o quadro como vai sair no vídeo; no mundo, tudo como foi desenhado
  // (sem câmera, sem recorte), com a moldura do quadro parado e a da câmera neste momento.
  function drawFilm(ctx, dpr, T) {
    const m = st.model, c = m.canvas, z = st.view.z;
    if (!tline().frames) return;
    ctx.save();
    ctx.shadowColor = paperShadow();
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
      const artOn = st.show.art && W.art.has(m);
      if (m.finish.pixel > 1 || S.hasPost(m) || artOn) {
        const img = W.film.renderFrame(m, st.frame, { scale: Math.min(m.finish.posterize ? 1 : 2, z * dpr), subs: st.subs, art: artOn });
        ctx.imageSmoothingEnabled = m.finish.pixel <= 1 && !artOn;
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
    if (pointsOn()) drawHandles(ctx, m, currentPose(), z);
    // as alças do painel Filme (js/ui-film.js): o zoom da câmera, o tamanho e o giro do ator
    for (const f of filmHooks) if (f.overlay) { ctx.save(); f.overlay(ctx, z, dpr); ctx.restore(); T(); }
  }

  // imagens guia soltas: moldura tracejada, o nome e o canto que muda o tamanho
  function drawRefFrames(ctx, m, pose, z) {
    ctx.save();
    ctx.font = `${11 / z}px ${getComputedStyle(document.body).getPropertyValue('--mono')}`;
    for (const r of m.refs) {
      if (r.lock || !S.refOn(r, pose)) continue;
      const b = refBox(r);
      if (!b) continue;
      const q = [[0, 0], [b.w, 0], [b.w, b.h], [0, b.h]].map((p) => M.apply(b.m, p[0], p[1]));
      ctx.lineWidth = 1.5 / z;
      ctx.setLineDash([6 / z, 4 / z]);
      ctx.strokeStyle = 'rgba(92,198,212,.85)';
      ctx.beginPath();
      q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      const s = 7 / z;
      ctx.fillStyle = '#5cc6d4';
      ctx.fillRect(q[2][0] - s / 2, q[2][1] - s / 2, s, s);
      ctx.fillText(r.name, q[0][0] + 4 / z, q[0][1] - 5 / z);
    }
    ctx.restore();
  }

  // caixas do jogo: corpo em verde, golpe em vermelho, dano em amarelo; desligadas, tracejadas
  const BOX_COLOR = { body: '#3fcf8e', hit: '#ff5a5a', hurt: '#ffd166' };
  // com Hitboxes desligado, só a caixa da linha do cursor (a que você está mexendo)
  function drawBoxes(ctx, m, pose, z) {
    ctx.save();
    for (const b of m.boxes.values()) {
      if (!st.show.boxes && (m.lineMap ? m.lineMap[b.line] : b.line) !== st.caret.line) continue;
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

  // ---------- posar arrastando os ossos ----------
  // Com Ossos ligado, uma animação escolhida e o player parado: arrastar a bolinha de um osso move o osso e
  // arrastar a alça (o traço que sai dele) gira. O Weasel escreve o osso na key daquele quadro (ou cria a key).
  // as peças de uma transição (anim … from= to=) são geradas: não têm key para escrever
  const posing = () => !!((st.show.bones || pinOn()) && !isFilm() && st.anim && !st.playing && !st.build && st.model && st.model.animMap.has(st.anim) && !st.model.animMap.get(st.anim).blendOf);
  // para onde o osso aponta parado: o meio das formas presas a ele (ou dos ossos filhos); sem nada, para baixo
  function boneDir(m, b) {
    m._boneDir = m._boneDir || new Map();
    if (m._boneDir.has(b.name)) return m._boneDir.get(b.name);
    const pose0 = S.makePose(m, null, 0), pts = [];
    for (const el of m.elements) {
      if (el.bone !== b.name || el.hidden || el.type === 'text' || el.type === 'emitter') continue;
      const g = S.geometry(m, pose0, el);
      if (g.segs.length) { const bb = S.segsBox(g.segs); pts.push([bb.x + bb.w / 2, bb.y + bb.h / 2]); }
    }
    for (const c of m.bones.values()) if (c.parent === b.name) pts.push(c.pivot);
    let a = Math.PI / 2;
    if (pts.length) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (Math.hypot(cx - b.pivot[0], cy - b.pivot[1]) > 2) a = Math.atan2(cy - b.pivot[1], cx - b.pivot[0]);
    }
    m._boneDir.set(b.name, a);
    return a;
  }
  // a bolinha (mover) e a ponta da alça (girar) de cada osso, na pose do quadro
  function boneGrips(m, pose, z) {
    return [...m.bones.values()].map((b) => {
      const wm = pose.bones.get(b.name), p = M.apply(wm, b.pivot[0], b.pivot[1]), a = boneDir(m, b);
      let dx = wm[0] * Math.cos(a) + wm[2] * Math.sin(a), dy = wm[1] * Math.cos(a) + wm[3] * Math.sin(a);
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      return { b, p, knob: [p[0] + (dx * 30) / z, p[1] + (dy * 30) / z] };
    });
  }
  function hitBone(e) {
    // testando giro, só as alças de girar valem (a bolinha do osso fica para escolher pontos)
    const spin = !posing() && spinOn();
    if (!posing() && !spin) return null;
    const [x, y] = toCanvas(e), r = 8 / st.view.z;
    let best = null, bd = r;
    for (const g of boneGrips(st.model, currentPose(), st.view.z)) {
      const dk = Math.hypot(g.knob[0] - x, g.knob[1] - y), dp = Math.hypot(g.p[0] - x, g.p[1] - y);
      if (dk < bd) { bd = dk; best = { bone: g.b.name, mode: 'rot' }; }
      if (dp < bd && !spin) { bd = dp; best = { bone: g.b.name, mode: 'move' }; }
    }
    return best;
  }
  function startPose(hb, e) {
    // a raiz e o meio de um ik são girados por ele: a key de giro deles não aparece
    const ik = st.model.iks.find((k) => { const i = k.bones.indexOf(hb.bone); return i === 1 || (i === 0 && hb.mode === 'rot'); });
    if (ik && !posing()) {
      const top = st.model.bones.get(ik.bones[0]).parent;
      hint(`O osso ${hb.bone} é girado pelo ik ${ik.name}: ${top ? `gire ${top} e veja o ik acompanhar` : ik.target ? `ele segue o alvo (${ik.target})` : 'ele segue o pé'}.`, 3200);
      return;
    }
    if (ik) { hint(`O osso ${hb.bone} é girado pelo ik ${ik.name}: mexa ${ik.target ? `no alvo (${ik.target})` : 'no corpo; o pé fica no chão'}.`, 3200); return; }
    // Testar giro: gira só na tela, sem key
    if (!posing()) {
      const wm = currentPose().bones.get(hb.bone), b = st.model.bones.get(hb.bone);
      st.pose = { spin: true, bone: hb.bone, v0: st.pin.spin.get(hb.bone) || 0, p: M.apply(wm, b.pivot[0], b.pivot[1]), flip: M.det(wm) < 0, start: toCanvas(e) };
      return;
    }
    // a ponta de um ik vai para onde o ik manda: arrastar a bolinha dela move o alvo (com foot=, o pé fica no chão)
    const tip = hb.mode === 'move' ? st.model.iks.find((k) => k.bones[2] === hb.bone) : null;
    if (tip && !tip.target) { hint(`O pé do ik ${tip.name} fica no chão (foot=): para animar o pé, use target= com um osso de alvo.`, 3600); return; }
    if (tip && st.model.bones.has(tip.target)) { hint(`A ponta do ik ${tip.name} segue o alvo: a key vai para ${tip.target}.`, 2400); hb = { bone: tip.target, mode: 'move' }; }
    const m = st.model, an = m.animMap.get(st.anim), b = m.bones.get(hb.bone), f = st.frame;
    const s = W.geom.segment(an.tracks.get(b.name), f, an.frames, an.loop);
    const v0 = s ? s.a.v.map((x, k) => x + (s.b.v[k] - x) * s.t) : [0, 0, 0, 1, 1];
    const pose = currentPose(), wm = pose.bones.get(b.name), parent = b.parent ? pose.bones.get(b.parent) : null;
    st.pose = { bone: b.name, mode: hb.mode, v0, p: M.apply(wm, b.pivot[0], b.pivot[1]), flip: M.det(wm) < 0, start: toCanvas(e), parentInv: parent ? M.invert(parent) : null, anim: an.name, frame: f, key: 'pose' + Date.now() };
  }
  function movePose(e) {
    const d = st.pose, [x, y] = toCanvas(e);
    if (d.spin) {
      let da = ((Math.atan2(y - d.p[1], x - d.p[0]) - Math.atan2(d.start[1] - d.p[1], d.start[0] - d.p[0])) * 180) / Math.PI;
      let a = d.v0 + (d.flip ? -da : da);
      while (a > 180) a -= 360;
      while (a <= -180) a += 360;
      st.pin.spin.set(d.bone, a);
      draw();
      return;
    }
    const v = d.v0.slice();
    if (d.mode === 'rot') {
      let da = ((Math.atan2(y - d.p[1], x - d.p[0]) - Math.atan2(d.start[1] - d.p[1], d.start[0] - d.p[0])) * 180) / Math.PI;
      while (da > 180) da -= 360;
      while (da < -180) da += 360;
      v[2] = d.v0[2] + (d.flip ? -da : da);
    } else {
      let dx = x - d.start[0], dy = y - d.start[1];
      if (d.parentInv) { const q = d.parentInv; [dx, dy] = [q[0] * dx + q[2] * dy, q[1] * dx + q[3] * dy]; }
      v[0] = d.v0[0] + dx;
      v[1] = d.v0[1] + dy;
    }
    writeKey(d, v);
  }
  // escreve osso=dx,dy,rot[,sx,sy] na key do quadro (troca o valor, acrescenta o osso ou cria a linha)
  function writeKey(d, v) {
    const f1 = (n) => String(Number(n.toFixed(1))), f3 = (n) => String(Number(n.toFixed(3)));
    const text = `${d.bone}=${[f1(v[0]), f1(v[1]), f1(v[2])].concat(v[3] !== 1 || v[4] !== 1 ? [f3(v[3]), f3(v[4])] : []).join(',')}`;
    const lineText = (line) => { const s = editor.lineStart(line), n = editor.value.indexOf('\n', s); return editor.value.slice(s, n < 0 ? editor.value.length : n).replace(/\r$/, ''); };
    let keyAt = -1, after = -1, best = -1;
    for (const [line, rec] of st.model.byLine) {
      if (!rec.anim || rec.anim.name !== d.anim) continue;
      if (rec.st.cmd === 'anim' && after < 0) after = line;
      if (rec.st.cmd === 'key' && rec.frame === d.frame && (keyAt < 0 || line < keyAt)) keyAt = line;
      if (rec.st.cmd === 'key' && rec.frame < d.frame && rec.frame >= best) { best = rec.frame; after = Math.max(after, line); }
    }
    if (keyAt < 0) {
      // linha nova, depois da key de quadro menor (ou logo depois do anim)
      const at = editor.lineStart(after + 1), v0 = editor.value;
      const ins = at >= v0.length && v0.length && !v0.endsWith('\n') ? `\nkey ${d.frame} ${text}` : `key ${d.frame} ${text}\n`;
      editor.replaceRange(at, at, ins, { key: d.key });
      return;
    }
    const off = editor.lineStart(keyAt), lt = lineText(keyAt);
    const esc = d.bone.replace(/[-]/g, '\\$&');
    const mm = new RegExp(`(^|\\s)${esc}=\\S*`).exec(lt);
    if (mm) { const s0 = off + mm.index + mm[1].length; editor.replaceRange(s0, s0 + mm[0].length - mm[1].length, text, { key: d.key }); return; }
    const c = /(^|\s)#(?![0-9a-fA-F]{3,8}\b)/.exec(lt), end = (c ? lt.slice(0, c.index) : lt).replace(/\s+$/, '').length;
    editor.replaceRange(off + end, off + end, ` ${text}`, { key: d.key });
  }

  function drawBones(ctx, m, pose, z) {
    ctx.save();
    // posando (ou testando giro no Prender): a alça de girar de cada osso
    if (posing() || spinOn()) {
      for (const g of boneGrips(m, pose, z)) {
        ctx.strokeStyle = '#7fe0d0';
        ctx.lineWidth = 1.5 / z;
        ctx.beginPath();
        ctx.moveTo(g.p[0], g.p[1]);
        ctx.lineTo(g.knob[0], g.knob[1]);
        ctx.stroke();
        ctx.fillStyle = '#7fe0d0';
        ctx.beginPath();
        ctx.arc(g.knob[0], g.knob[1], 4 / z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
  // direção (light= do canvas, light dir): uma seta que sai do centro do quadro e aponta para a luz,
  // sempre do mesmo tamanho na tela; a alça é a ponta
  const DIR_LEN = 90;
  const dirAnchor = (m) => [m.canvas.w / 2, m.canvas.h / 2];
  function dirTip(m, h) {
    const c = dirAnchor(m), l = Math.hypot(h.x, h.y) || 1, r = DIR_LEN / st.view.z;
    return [c[0] + (h.x / l) * r, c[1] + (h.y / l) * r];
  }
  // ponto (x,y) girado deg graus em volta de (cx,cy): as alças de tamanho de uma forma com rot=
  const turn = (cx, cy, deg, x, y) => (deg ? M.apply(M.mul(M.translate(cx, cy), M.mul(M.rotate(deg), M.translate(-cx, -cy))), x, y) : [x, y]);
  // a alça do r= fica onde começa a curva do canto; com r=0, um pouco para dentro, para não cobrir a do canto
  function roundShown(h) {
    const r = Math.max(Math.min(h.r, Math.abs(h.w) / 2, Math.abs(h.h) / 2), 10 / st.view.z);
    const p = turn(h.x0 + h.w / 2, h.y0 + h.h / 2, h.rot, h.x0 + r, h.y0);
    return Object.assign({}, h, { x: p[0], y: p[1] });
  }
  // a alça de giro: SPIN_GAP pixels acima da borda de cima, na direção do giro. Enquanto gira, segue o arraste
  // (numa forma de pontos o meio dos pontos anda ao girar, e a alça pularia).
  const SPIN_GAP = 24;
  function spinSpot(h, gap) {
    const s = st.drag && st.drag.spin && st.drag.line === st.caret.line ? st.drag.spin : null;
    const cx = s ? s.cx : h.cx, cy = s ? s.cy : h.cy, deg = s ? s.ang : h.rot, reach = s ? s.reach : h.reach;
    const p = turn(cx, cy, deg, cx, cy - reach - gap / st.view.z);
    return Object.assign({}, h, { x: p[0], y: p[1] });
  }
  // ---- esticar as formas de pontos (shape, stroke, line) ----
  // Uma caixa tracejada em volta da curva, com alças nos cantos e no meio dos lados, uns pixels para fora. Arrastar
  // uma alça estica os pontos (e as alças de curva) a partir do lado de lá: o canto muda a largura e a altura, o meio
  // de um lado só uma delas. Com Shift, sem perder a proporção; com Alt, a partir do meio. Passar do outro lado
  // espelha. O w= e o ink= não mudam. A caixa segue as coordenadas do código (num osso girado, gira junto).
  const BOX_PAD = 9;
  // a caixa da curva nas coordenadas do código (null se a linha não é uma forma de pontos que estica)
  function ptsBox(rec) {
    const el = rec && rec.el;
    if (!el || el.limb || !['shape', 'stroke', 'line'].includes(el.type)) return null;
    const pts = rec.handles.filter((h) => h.kind === 'pt').sort((a, b) => a.idx - b.idx);
    if (pts.length < 2) return null;
    if (el.type !== 'line') return tightBox(W.geom.smoothSegs(pts, el.closed, el.smooth));
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const p of pts) { b.x0 = Math.min(b.x0, p.x); b.x1 = Math.max(b.x1, p.x); b.y0 = Math.min(b.y0, p.y); b.y1 = Math.max(b.y1, p.y); }
    return b;
  }
  // a bolinha de girar de uma forma de pontos fica acima da caixa de esticar (e não em cima da alça do meio)
  function spinOf(rec, h) {
    const b = h.pts ? ptsBox(rec) : null;
    return b ? Object.assign({}, h, { reach: h.cy - b.y0 + BOX_PAD / st.view.z }) : h;
  }
  // as alças de esticar no desenho; null quando a forma não estica, está girando ou é pequena demais na tela
  function scaleKnobs(hl) {
    const { rec, scr, pts } = hl, mi = rec.handles.findIndex((h) => h.kind === 'move');
    if (mi < 0 || !pts[mi] || (st.drag && st.drag.spin)) return null;
    const b = ptsBox(rec);
    if (!b) return null;
    const mh = rec.handles[mi], at = (x, y) => scr(Object.assign({}, mh, { x, y }));
    const o = at(b.x0, b.y0), ox = at(b.x0 + 1, b.y0), oy = at(b.x0, b.y0 + 1);
    if (!o || !ox || !oy) return null;
    const lx = Math.hypot(ox[0] - o[0], ox[1] - o[1]), ly = Math.hypot(oy[0] - o[0], oy[1] - o[1]);
    if (lx < 1e-9 || ly < 1e-9) return null;
    // para onde vão o x e o y do código na tela, e o tamanho de cada lado em pixels
    const ex = [(ox[0] - o[0]) / lx, (ox[1] - o[1]) / lx], ey = [(oy[0] - o[0]) / ly, (oy[1] - o[1]) / ly];
    const z = st.view.z, sw = (b.x1 - b.x0) * lx * z, sh = (b.y1 - b.y0) * ly * z;
    if (Math.max(sw, sh) < 20) return null;
    // uma linha em pé ou deitada só tem as duas alças que a esticam; o meio de um lado só aparece se o lado couber
    const flatX = sw < 1, flatY = sh < 1, pad = BOX_PAD / z, knobs = [];
    const spot = (bx, by) => {
      const p = at(b.x0 + bx * (b.x1 - b.x0), b.y0 + by * (b.y1 - b.y0)), kx = bx * 2 - 1, ky = by * 2 - 1;
      return p && [p[0] + (ex[0] * kx + ey[0] * ky) * pad, p[1] + (ex[1] * kx + ey[1] * ky) * pad, p];
    };
    for (const by of [0, 0.5, 1]) for (const bx of [0, 0.5, 1]) {
      if (bx === 0.5 && by === 0.5) continue;
      const skip = bx !== 0.5 && by !== 0.5 ? flatX || flatY : bx === 0.5 ? flatY || (!flatX && sw < 40) : flatX || (!flatY && sh < 40);
      const s = skip ? null : spot(bx, by);
      if (s) knobs.push({ bx, by, x: s[0], y: s[1], at: s[2] });
    }
    const quad = flatX || flatY ? null : [[0, 0], [1, 0], [1, 1], [0, 1]].map(([bx, by]) => spot(bx, by));
    return { rec, mi, b, knobs, quad: quad && quad.every(Boolean) ? quad : null, fixed: !!mh.fixed };
  }
  // a alça de esticar sob o mouse (uma alça de verdade mais perto ganha dela)
  function hitScale(e) {
    if (!st.model || !pointsOn() || st.build) return null;
    const hl = handleList(st.model, currentPose()), sb = hl && scaleKnobs(hl);
    if (!sb) return null;
    const [x, y] = toCanvas(e);
    let k = null, kd = 9 / st.view.z;
    for (const q of sb.knobs) { const d = Math.hypot(q.x - x, q.y - y); if (d < kd) { kd = d; k = q; } }
    if (!k || hl.pts.some((p) => p && Math.hypot(p[0] - x, p[1] - y) < kd)) return null;
    return { sb, k };
  }
  const scaleCursor = (k) => (k.bx === 0.5 ? 'ns-resize' : k.by === 0.5 ? 'ew-resize' : k.bx === k.by ? 'nwse-resize' : 'nesw-resize');
  // A alça do tamanho da letra: no canto de cima das letras, do lado de onde o texto cresce (no align=right, o
  // canto da esquerda). Relativo à posição do texto, sem o giro; o texto cresce a partir da posição.
  function fsizeCorner(el) {
    const b = S.textBox(el);
    return [el.align === 'right' ? b.x : b.x + b.w, b.y];
  }
  function fsizeShown(h, rec) {
    if (!rec.el || rec.el.type !== 'text') return h;
    const [cx, cy] = fsizeCorner(rec.el), p = turn(h.ax, h.ay, h.rot, h.ax + cx, h.ay + cy);
    return Object.assign({}, h, { x: p[0], y: p[1] });
  }
  // alças do gradiente: no lugar onde ele cai na primeira figura que o usa (o raio, para a direita do centro)
  function gradScr(m, pose, h) {
    const g = m.gradients.get(h.grad);
    if (!g) return null;
    const F = gradFrame(m, pose, g);
    if (h.kind === 'gr') { const c = gradLocal(F, h.cx, h.cy); return F.f(c[0] + h.r * (F.box ? F.rs : 1), c[1]); }
    const l = gradLocal(F, h.x, h.y);
    return F.f(l[0], l[1]);
  }
  function handleList(m, pose) {
    // com várias linhas escolhidas no painel das camadas, valem só a caixa da escolha e as alças dela
    if (groupOn()) return null;
    // a escolha tirada de propósito (clique no vazio, Esc): os pontos somem até o cursor andar (no filme, não)
    if (st.none === st.caret.line && !isFilm()) return null;
    if (!isFilm() && !selectable(st.caret.line)) return null;
    const rec = m.byLine.get(st.caret.line);
    if (!rec || !rec.handles.length) return null;
    // onde uma alça (ou um ponto com o mesmo jeito de alça) aparece na tela
    const scr = (h) => {
      if (h.kind === 'dir') return dirTip(m, h);
      if (h.grad) return isFilm() ? null : gradScr(m, pose, h);
      if (!isFilm()) return S.handlePos(m, pose, rec, h);
      const d = handleDepth(rec, h);
      if (d === null) return null;
      const p = S.handlePos(m, pose, rec, h);
      return M.apply(filmView(d), p[0], p[1]);
    };
    const shown = (h) => (h.kind === 'round' ? roundShown(h) : h.kind === 'rot' ? spinSpot(spinOf(rec, h), SPIN_GAP) : h.kind === 'fsize' ? fsizeShown(h, rec) : h);
    const pts = rec.handles.map((h) => scr(shown(h)));
    // bolinhas de ponto novo: só nos lados que cabem uma na tela (e nunca numa linha repetida)
    const z = st.view.z, ptAt = new Map();
    rec.handles.forEach((h, i) => { if (h.kind === 'pt') ptAt.set(h.idx, i); });
    rec.handles.forEach((h, i) => {
      if (h.kind !== 'mid' || !pts[i]) return;
      const a = pts[ptAt.get(h.idx)], b = pts[ptAt.get((h.idx + 1) % ptAt.size)];
      if (h.fixed || !a || !b || Math.hypot(a[0] - b[0], a[1] - b[1]) < 26 / z) pts[i] = null;
    });
    // as alças automáticas (clarinhas) só aparecem no ponto escolhido (o laranja) ou no que está sendo arrastado
    const dg = st.drag && st.drag.line === st.caret.line ? st.drag : null, ah = dg ? null : rec.handles[activeHandle(rec)];
    const actIdx = dg ? (dg.mode === 'tan' || dg.mode === 'pull' || dg.mode === null ? dg.idx : -1) : ah && (ah.kind === 'pt' || ah.kind === 'tan') ? ah.idx : -1;
    rec.handles.forEach((h, i) => { if (h.auto && h.idx !== actIdx) pts[i] = null; });
    // numa linha de dois pontos o ✥ cairia em cima da bolinha do meio: desce um pouco
    const mi = rec.handles.findIndex((h) => h.kind === 'move');
    if (mi >= 0 && pts[mi] && rec.handles.some((h, i) => h.kind === 'mid' && pts[i] && Math.hypot(pts[i][0] - pts[mi][0], pts[i][1] - pts[mi][1]) < 14 / z)) {
      pts[mi] = scr(Object.assign({}, rec.handles[mi], { y: rec.handles[mi].y + 26 / z }));
    }
    return { rec, scr, pts };
  }

  function drawHandles(ctx, m, pose, z) {
    const hl = handleList(m, pose);
    if (!hl) return;
    const { rec, pts, scr } = hl;
    const active = st.drag ? (st.drag.mode === 'tan' || st.drag.mode === 'pull' ? rec.handles.findIndex((h) => h.kind === 'tan' && !h.auto && h.idx === st.drag.idx && h.side === (st.drag.side || 'out')) : st.drag.hi) : activeHandle(rec);
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
    // esticar: a caixa tracejada em volta da curva e as alças quadradinhas azuis nos cantos e no meio dos lados
    const sb = scaleKnobs(hl);
    if (sb) {
      if (sb.quad) {
        ctx.strokeStyle = 'rgba(92,198,212,.7)';
        ctx.lineWidth = 1 / z;
        ctx.setLineDash([5 / z, 4 / z]);
        ctx.beginPath();
        sb.quad.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const r = 3.3 / z;
      for (const q of sb.knobs) {
        ctx.beginPath();
        ctx.rect(q.x - r, q.y - r, r * 2, r * 2);
        ctx.fillStyle = sb.fixed ? '#9aa6b2' : '#5cc6d4';
        ctx.fill();
        ctx.lineWidth = 1.4 / z;
        ctx.strokeStyle = '#14141c';
        ctx.stroke();
      }
    }
    // alças de curva: uma linha do ponto até cada alça (a de chegada e a de saída; as automáticas, tracejadas)
    rec.handles.forEach((h, i) => {
      if (h.kind !== 'tan' || !pts[i]) return;
      const p = pts[rec.handles.findIndex((q) => q.kind === 'pt' && q.idx === h.idx)];
      if (!p) return;
      const t = pts[i];
      ctx.strokeStyle = h.auto ? 'rgba(92,198,212,.6)' : 'rgba(92,198,212,.9)';
      ctx.lineWidth = 1.2 / z;
      ctx.setLineDash(h.auto ? [3 / z, 3 / z] : []);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(t[0], t[1]);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    // direção da luz: traço do centro até a alça, ponta de seta e raios de sol em volta da alça
    rec.handles.forEach((h, i) => {
      if (h.kind !== 'dir' || !pts[i]) return;
      const c = dirAnchor(m), t = pts[i], a = Math.atan2(t[1] - c[1], t[0] - c[0]), ca = Math.cos(a), sa = Math.sin(a);
      const head = 17 / z, bx = t[0] - ca * head, by = t[1] - sa * head, wing = 7 / z;
      const arrow = new Path2D(), sun = new Path2D();
      arrow.moveTo(c[0], c[1]);
      arrow.lineTo(bx, by);
      sun.moveTo(bx - ca * wing - sa * wing, by - sa * wing + ca * wing);
      sun.lineTo(bx, by);
      sun.lineTo(bx - ca * wing + sa * wing, by - sa * wing - ca * wing);
      for (let k = 0; k < 8; k++) {
        const q = (k * Math.PI) / 4;
        sun.moveTo(t[0] + Math.cos(q) * (9.5 / z), t[1] + Math.sin(q) * (9.5 / z));
        sun.lineTo(t[0] + Math.cos(q) * (14 / z), t[1] + Math.sin(q) * (14 / z));
      }
      sun.moveTo(c[0] + 3 / z, c[1]);
      sun.arc(c[0], c[1], 3 / z, 0, Math.PI * 2);
      // contorno escuro por baixo: a seta aparece em fundo claro e escuro
      for (const [col, w] of [['#14141c', 4 / z], ['#ffd166', 2 / z]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.setLineDash(col === '#ffd166' ? [6 / z, 4 / z] : []);
        ctx.stroke(arrow);
        ctx.setLineDash([]);
        ctx.stroke(sun);
      }
    });
    // texto: a caixa das letras, tracejada (a alça do tamanho fica num canto dela)
    const fi = rec.handles.findIndex((h) => h.kind === 'fsize');
    if (fi >= 0 && pts[fi] && rec.el && rec.el.type === 'text') {
      const h = rec.handles[fi], b = S.textBox(rec.el);
      const box = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].map(([u, v]) => {
        const [x, y] = turn(h.ax, h.ay, h.rot, h.ax + u, h.ay + v);
        return scr(Object.assign({}, h, { x, y }));
      });
      if (box.every(Boolean)) {
        ctx.strokeStyle = 'rgba(255,138,31,.6)';
        ctx.lineWidth = 1 / z;
        ctx.setLineDash([4 / z, 3 / z]);
        ctx.beginPath();
        box.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // raio da elipse: traço fino do centro até cada alça de tamanho
    const ci = rec.handles.findIndex((h) => h.kind === 'center');
    rec.handles.forEach((h, i) => {
      if (h.kind !== 'size' || h.shape !== 'ellipse' || !pts[i] || ci < 0 || !pts[ci]) return;
      ctx.strokeStyle = 'rgba(255,138,31,.7)';
      ctx.lineWidth = 1 / z;
      ctx.setLineDash([4 / z, 3 / z]);
      ctx.beginPath();
      ctx.moveTo(pts[ci][0], pts[ci][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    // giro: a haste da borda de cima da forma até a alça
    rec.handles.forEach((h, i) => {
      if (h.kind !== 'rot' || !pts[i]) return;
      const b = scr(spinSpot(spinOf(rec, h), h.pts ? 4 : 0));
      if (!b) return;
      for (const [col, w] of [['#14141c', 3 / z], ['#8fd16a', 1.4 / z]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(b[0], b[1]);
        ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
    });
    // gradiente: a linha do começo ao fim (ou o círculo do raio), com uma bolinha de cada cor no lugar dela;
    // com box, o retângulo da figura onde 0 e 1 caem
    if (rec.grad && !isFilm()) {
      const g = rec.grad, at = (k) => { const i = rec.handles.findIndex((q) => q.kind === k); return i >= 0 ? pts[i] : null; };
      const a = at(g.type === 'linear' ? 'g1' : 'gc'), b = at(g.type === 'linear' ? 'g2' : 'gr'), fo = at('gf');
      const guide = new Path2D(), F = gradFrame(m, pose, g);
      if (g.box) {
        const q = [[F.b.x, F.b.y], [F.b.x + F.b.w, F.b.y], [F.b.x + F.b.w, F.b.y + F.b.h], [F.b.x, F.b.y + F.b.h]].map(([x, y]) => F.f(x, y));
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = 1 / z;
        ctx.setLineDash([3 / z, 3 / z]);
        ctx.beginPath();
        q.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])));
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (a && b) {
        guide.moveTo(a[0], a[1]);
        guide.lineTo(b[0], b[1]);
        const R = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (g.type === 'radial') { guide.moveTo(a[0] + R, a[1]); guide.arc(a[0], a[1], R, 0, Math.PI * 2); }
        if (fo) { guide.moveTo(fo[0], fo[1]); guide.lineTo(a[0], a[1]); }
        for (const [col, w, dash] of [['#14141c', 3 / z, []], ['#ffffff', 1.3 / z, [5 / z, 4 / z]]]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.setLineDash(dash);
          ctx.stroke(guide);
        }
        ctx.setLineDash([]);
        // as cores ao longo da linha (no radial, do foco ou do centro até a borda)
        const o = g.type === 'radial' && fo ? fo : a;
        for (const s of g.stops) {
          ctx.beginPath();
          ctx.arc(o[0] + (b[0] - o[0]) * s.at, o[1] + (b[1] - o[1]) * s.at, 3.4 / z, 0, Math.PI * 2);
          ctx.fillStyle = s.c;
          ctx.fill();
          ctx.lineWidth = 1.2 / z;
          ctx.strokeStyle = '#14141c';
          ctx.stroke();
        }
      }
    }
    // ponto novo: bolinha clara e menor no meio de cada lado, por baixo das outras alças
    rec.handles.forEach((h, i) => {
      if (h.kind !== 'mid' || !pts[i]) return;
      ctx.beginPath();
      ctx.arc(pts[i][0], pts[i][1], 3.4 / z, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fill();
      ctx.lineWidth = 1.2 / z;
      ctx.strokeStyle = 'rgba(20,20,28,.75)';
      ctx.stroke();
    });
    rec.handles.forEach((h, i) => {
      if (i === active || !pts[i] || h.kind === 'mid') return;
      const [x, y] = pts[i];
      if (h.kind === 'move') { drawKnob(ctx, x, y, 'move', 0, z, h.fixed); return; }
      if (h.kind === 'rot') {
        const base = scr(spinSpot(spinOf(rec, h), 0));
        drawKnob(ctx, x, y, 'rot', base ? Math.atan2(y - base[1], x - base[0]) : -Math.PI / 2, z, h.fixed);
        return;
      }
      const r = 4.5 / z;
      ctx.beginPath();
      // ponto: bolinha (canto vivo: quadrado); alça de curva e r= do retângulo: losango azul;
      // tamanho: quadrado com um risco na diagonal
      if (h.kind === 'tan' || h.kind === 'round') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); } else if (h.corner || h.kind === 'size' || h.kind === 'fsize') ctx.rect(x - r, y - r, r * 2, r * 2);
      else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = h.fixed ? '#9aa6b2' : h.auto ? '#d4eff3' : h.kind === 'tan' || h.kind === 'round' ? '#5cc6d4' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.6 / z;
      ctx.strokeStyle = '#14141c';
      ctx.stroke();
      if (h.kind === 'size') {
        ctx.beginPath();
        ctx.moveTo(x - r * 0.5, y - r * 0.5);
        ctx.lineTo(x + r * 0.5, y + r * 0.5);
        ctx.stroke();
      }
    });
    if (active >= 0 && pts[active]) S.drawPen(ctx, pts[active][0], pts[active][1], z);
    ctx.restore();
  }
  // mover a forma: bolinha maior com uma cruz de setas; girar: bolinha verde com uma seta curva do lado de fora
  // (up: a direção para longe da forma). Também na caixa da escolha do painel das camadas.
  function drawKnob(ctx, x, y, kind, up, z, fixed) {
    const r = 4.5 / z;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, kind === 'move' ? r * 1.6 : r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = fixed ? '#9aa6b2' : kind === 'rot' ? '#8fd16a' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.6 / z;
    ctx.strokeStyle = '#14141c';
    ctx.stroke();
    if (kind === 'move') {
      const a = r * 1.05, b = r * 0.45;
      ctx.beginPath();
      ctx.moveTo(x - a, y); ctx.lineTo(x + a, y);
      ctx.moveTo(x, y - a); ctx.lineTo(x, y + a);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.moveTo(x + dx * a - dy * b + dx * -b, y + dy * a + dx * b + dy * -b);
        ctx.lineTo(x + dx * a, y + dy * a);
        ctx.lineTo(x + dx * a + dy * b + dx * -b, y + dy * a - dx * b + dy * -b);
      }
      ctx.lineWidth = 1.3 / z;
      ctx.stroke();
    } else {
      const R = r * 2.4, b = r * 0.75;
      const arc = new Path2D(), from = up - 0.95, to = up + 0.95;
      arc.arc(x, y, R, from, to);
      for (const [a, s] of [[from, -1], [to, 1]]) {
        const px = x + R * Math.cos(a), py = y + R * Math.sin(a), tx = -Math.sin(a) * s, ty = Math.cos(a) * s, nx = Math.cos(a), ny = Math.sin(a);
        arc.moveTo(px - tx * b + nx * b * 0.8, py - ty * b + ny * b * 0.8);
        arc.lineTo(px, py);
        arc.lineTo(px - tx * b - nx * b * 0.8, py - ty * b - ny * b * 0.8);
      }
      for (const [col, w] of [['#14141c', 3 / z], ['#8fd16a', 1.4 / z]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.stroke(arc);
      }
    }
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

  // ---------- réguas, linhas guia e medir ----------
  // As réguas (em cima e à esquerda) contam os pixels do desenho. Delas saem linhas guia: arrastar da régua de cima
  // põe uma linha deitada; da régua da esquerda, uma em pé. Arrastar uma linha a muda de lugar; soltar em cima de uma
  // régua a apaga; duplo clique no quadradinho do canto apaga todas. Os pontos e as formas arrastados grudam nas
  // linhas (a menos de 6 pixels na tela; segurando Ctrl, não grudam). As linhas ficam neste navegador, por arquivo,
  // e não entram no código. Medir: arrastar no desenho mede a distância e o ângulo entre dois pontos.
  const RULER = 20, SNAP_PX = 6, GUIDE_C = '#ff4fd8', MEAS_C = '#ffd166';
  const rulersOn = () => st.show.rulers && !!st.model && !isFilm();
  // em qual régua está o mouse: 'top', 'left', 'corner' (o quadradinho) ou null
  function rulerAt(e) {
    if (!rulersOn()) return null;
    const r = view.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    return x < RULER && y < RULER ? 'corner' : y < RULER ? 'top' : x < RULER ? 'left' : null;
  }
  // as linhas guia de cada arquivo: { "nome.weasel": { v: [x, …], h: [y, …] } } (v = em pé, h = deitada)
  function guideStore() {
    try { const o = JSON.parse(store.get('weasel.guides') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
  }
  function loadGuides(name) {
    const g = guideStore()[name] || {}, nums = (a) => (Array.isArray(a) ? a.filter(Number.isFinite) : []);
    st.guides = { v: nums(g.v), h: nums(g.h) };
  }
  function saveGuides(name, g) {
    const all = guideStore();
    if (g && (g.v.length || g.h.length)) all[name] = { v: g.v, h: g.h }; else delete all[name];
    store.set('weasel.guides', JSON.stringify(all));
  }
  function clearGuides() {
    const n = st.guides.v.length + st.guides.h.length;
    if (!n) { hint('Não há linhas guia neste arquivo. Arraste de uma régua para pôr uma.', 2400); return; }
    st.guides = { v: [], h: [] };
    saveGuides(st.current, st.guides);
    hint(n > 1 ? `${n} linhas guia apagadas.` : 'A linha guia foi apagada.', 2000);
    draw();
  }
  // a linha guia sob o mouse (a menos de 4 pixels na tela)
  function hitGuide(e) {
    if (!rulersOn()) return null;
    const [x, y] = toCanvas(e), r = 4 / st.view.z;
    let best = null, bd = r;
    for (const axis of ['v', 'h']) st.guides[axis].forEach((g, i) => { const d = Math.abs(g - (axis === 'v' ? x : y)); if (d < bd) { bd = d; best = { axis, i }; } });
    return best;
  }
  const roundTo = (v) => { const q = st.view.z > 3 ? 10 : 1; return Math.round(v * q) / q; };
  const numBR = (v) => String(Number(v.toFixed(1))).replace('.', ',');
  // os pontos da forma do cursor, na tela do desenho (para grudar a régua de medir e as linhas guia neles)
  function shapeSpots() {
    if (!pointsOn() || st.build) return [];
    const hl = handleList(st.model, currentPose());
    if (!hl) return [];
    return hl.pts.filter((p, i) => p && ['pt', 'center', 'corner', 'pos', 'size', 'pivot'].includes(hl.rec.handles[i].kind));
  }
  function startGuide(axis, i, e) {
    st.guideDrag = { axis, i, pos: i >= 0 ? st.guides[axis][i] : 0, out: i < 0 };
    if (i < 0) hint(axis === 'v' ? 'Arraste para dentro do desenho: uma linha guia em pé.' : 'Arraste para dentro do desenho: uma linha guia deitada.', 2000);
  }
  // a linha anda com o mouse, em pixels inteiros; gruda nas bordas e no meio do papel e nos pontos da forma do cursor
  function moveGuide(d, e) {
    const r = view.getBoundingClientRect();
    d.out = !!rulerAt(e) || e.clientX < r.left || e.clientY < r.top || e.clientX > r.right || e.clientY > r.bottom;
    if (d.out) { hint(d.i >= 0 ? 'Solte aqui para apagar a linha guia.' : 'Arraste para dentro do desenho.', 1200); draw(); return; }
    const p = toCanvas(e), k = d.axis === 'v' ? 0 : 1, c = st.model.canvas, size = k ? c.h : c.w;
    let pos = roundTo(p[k]);
    if (!(e.ctrlKey || e.metaKey)) {
      let bd = SNAP_PX / st.view.z;
      for (const v of [0, size / 2, size].concat(shapeSpots().map((s) => s[k]))) { const dd = Math.abs(v - p[k]); if (dd < bd) { bd = dd; pos = Math.round(v * 10) / 10; } }
    }
    d.pos = pos;
    hint(`linha guia ${d.axis === 'v' ? 'em pé: x' : 'deitada: y'} = ${numBR(pos)}`, 1200);
    draw();
  }
  function endGuide(d) {
    const list = st.guides[d.axis];
    if (d.out) { if (d.i >= 0) { list.splice(d.i, 1); hint('A linha guia foi apagada.', 1600); } } else if (d.i >= 0) list[d.i] = d.pos;
    else list.push(d.pos);
    saveGuides(st.current, st.guides);
  }
  // grudar: o quanto falta para um dos valores (o mais perto) chegar numa linha guia; 0 se nenhuma está perto
  function snapOff(vals, axis, hot) {
    let off = 0, bd = SNAP_PX / st.view.z, hit;
    for (const v of vals) for (const g of st.guides[axis]) { const d = Math.abs(g - v); if (d < bd) { bd = d; off = g - v; hit = g; } }
    if (hit !== undefined) hot[axis] = hit;
    return off;
  }
  const snapping = (e) => rulersOn() && !(e.ctrlKey || e.metaKey) && (st.guides.v.length > 0 || st.guides.h.length > 0);
  // o mouse ajustado para que a alça (self) ou as bordas e o meio da forma (box) caiam na linha guia mais perto;
  // ref = onde estava o que anda quando o mouse está em [x, y] (a forma anda o mesmo que o mouse a partir dali)
  function snapMouse(sn, x, y, e) {
    st.guideHot = null;
    if (!sn || !snapping(e)) return [x, y];
    const ox = x - sn.ref[0], oy = y - sn.ref[1], b = sn.box, hot = {};
    const xs = sn.self ? [x] : [], ys = sn.self ? [y] : [];
    if (b) { xs.push(b.x0 + ox, (b.x0 + b.x1) / 2 + ox, b.x1 + ox); ys.push(b.y0 + oy, (b.y0 + b.y1) / 2 + oy, b.y1 + oy); }
    x += snapOff(xs, 'v', hot);
    y += snapOff(ys, 'h', hot);
    if (hot.v !== undefined || hot.h !== undefined) st.guideHot = hot;
    return [x, y];
  }
  // a caixa justa de curvas (as alças de uma curva podem ficar fora dela); b acumula várias
  function tightBox(segs, b) {
    b = b || { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const add = (x, y) => { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); };
    const at = (p0, p1, p2, p3, t) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };
    // onde a curva vira (a derivada zera), entre o começo e o fim
    const turns = (p0, p1, p2, p3) => {
      const A = p1 - p0, B = p2 - p1, C = p3 - p2, a = A - 2 * B + C, b2 = 2 * (B - A), out = [];
      if (Math.abs(a) < 1e-9) { if (Math.abs(b2) > 1e-9) out.push(-A / b2); } else {
        const disc = b2 * b2 - 4 * a * A;
        if (disc >= 0) { const r = Math.sqrt(disc); out.push((-b2 + r) / (2 * a), (-b2 - r) / (2 * a)); }
      }
      return out.filter((t) => t > 0 && t < 1);
    };
    for (const s of segs) {
      add(s[0], s[1]);
      add(s[6], s[7]);
      for (const t of turns(s[0], s[2], s[4], s[6]).concat(turns(s[1], s[3], s[5], s[7]))) add(at(s[0], s[2], s[4], s[6], t), at(s[1], s[3], s[5], s[7], t));
    }
    return b;
  }
  // a caixa da forma de uma linha, na tela do desenho (dentro de componentes: a dos pontos)
  function elBox(rec) {
    const m = st.model, pose = currentPose();
    if (rec.el && !rec.xf) { const g = S.geometry(m, pose, rec.el); if (g.segs.length) return tightBox(g.segs); }
    const pts = rec.handles.filter((h) => h.kind === 'pt').map((h) => S.handlePos(m, pose, rec, h));
    if (!pts.length) return null;
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const [x, y] of pts) { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); }
    return b;
  }
  // o que gruda num arraste de alça: o ponto em si (pt, size), a forma inteira pelas bordas e pelo meio (✥, Shift)
  // ou as duas coisas (as alças de posição: center, corner, pos)
  function snapPlan(rec, h, hi, mode, e) {
    if (isFilm()) return null;
    if (mode === 'move') return { self: false, ref: toCanvas(e), box: elBox(rec) };
    if (mode || h.grad || !['pt', 'center', 'corner', 'pos', 'size'].includes(h.kind)) return null;
    const hl = handleList(st.model, currentPose()), at = hl && hl.pts[hi];
    return { self: true, ref: at || toCanvas(e), box: ['center', 'corner', 'pos'].includes(h.kind) && rec.el ? elBox(rec) : null };
  }
  // ---- prender pontos a um osso (ferramenta Prender, Shift+P) ----
  // Mostra os pontos de todas as formas com pontos escritos (shape, stroke, line), não só os da linha do cursor.
  // Um clique escolhe todos os pontos que estão naquele lugar (formas coladas dividem o ponto e precisam ir
  // juntas); clicar de novo no mesmo lugar pega só o de uma forma, a de cima primeiro. Shift soma, Alt tira e
  // arrastar no fundo faz uma caixa. O botão direito abre o menu dos ossos, que escreve @osso (ou @osso:peso)
  // depois de cada ponto escolhido, num Ctrl+Z só. Os presos ficam com a cor do osso; os soltos, cinza.
  const BONE_COLORS = ['#ff6b6b', '#4dabf7', '#8ce99a', '#ffd43b', '#da77f2', '#ff922b', '#3bc9db', '#f783ac', '#c0eb75', '#91a7ff'];
  function pinOn() { return !!(st.pin.on && st.model && !isFilm() && !pvModel() && !st.build); }
  // Testar giro: no Prender com a pose parada, a alça de um osso gira só na tela (os pontos presos vão junto)
  function spinOn() { return pinOn() && !st.anim; }
  let boneCols = null;
  function boneColor(m, name) {
    if (!boneCols || boneCols.m !== m) boneCols = { m, map: new Map([...m.bones.keys()].map((n, i) => [n, BONE_COLORS[i % BONE_COLORS.length]])) };
    return boneCols.map.get(name) || '#9aa6b2';
  }
  // a linha sem os @osso: a escolha confere com ela (prender e soltar não desfazem a escolha; mudar o resto, sim)
  const pinSig = (t) => t.replace(/@\S*/g, '');
  // os pontos que dá para prender, na pose do quadro: das formas visíveis (com o painel Camadas aberto e linhas
  // escolhidas nele, só delas). Ficam de fora as cópias de componente (use), as linhas de repeat e de include,
  // as formas com bones= (os @ não valem junto) e os membros com IK. order: a de cima tem o número maior.
  let pinCache = null;
  function pinSpots() {
    const m = st.model, only = !$('layerPanel').hidden && st.sel.size ? st.sel : null;
    const spin = spinOn() ? [...st.pin.spin].map(([n, a]) => `${n}${a.toFixed(2)}`).join(',') : '';
    const key = [st.anim, st.frame, st.show.guides, only ? [...only.keys()].join(',') : '', spin].join('|');
    if (pinCache && pinCache.m === m && pinCache.key === key) return pinCache.list;
    const pose = currentPose(), list = [];
    let order = 0;
    for (const layer of S.orderLayers(m, pose)) {
      if (!S.layerVisible(layer, pose, { guides: st.show.guides })) continue;
      const lp = pose.lprops.get(layer.name);
      if (lp && lp.show === 0) continue;
      let items = S.orderItems(layer.items, pose);
      if (layer.zsort && m.has3d) items = S.zSort(m, pose, items);
      for (const it of items) {
        const el = it.el, pr = S.propsOf(pose, el);
        if (el.use !== undefined || (el.hidden && !pr.reveal) || pr.show === 0 || el.bones || el.limb) continue;
        if (el.type !== 'shape' && el.type !== 'stroke' && el.type !== 'line') continue;
        const line = m.lineMap ? m.lineMap[el.line] : el.line, rec = line >= 0 ? m.byLine.get(line) : null;
        if (!rec || rec.el !== el || rec.repeated || (only && !only.has(line))) continue;
        order++;
        for (const h of rec.handles) {
          if (h.kind !== 'pt') continue;
          const p = S.handlePos(m, pose, rec, h);
          if (p) list.push({ key: `${line}:${h.idx}`, line, idx: h.idx, x: p[0], y: p[1], pin: h.pin || null, w: h.pinW === undefined ? 1 : h.pinW, h, name: el.name || `linha ${line + 1}`, order });
        }
      }
    }
    pinCache = { m, key, list };
    return list;
  }
  // os pontos escolhidos que ainda valem (a linha deles não mudou, fora os @)
  function pinChosen() {
    if (!st.pin.sel.size) return [];
    const now = new Map(), out = [];
    for (const s of pinSpots()) {
      const sig = st.pin.sel.get(s.key);
      if (sig === undefined) continue;
      if (!now.has(s.line)) now.set(s.line, pinSig(lineOf(s.line)));
      if (now.get(s.line) === sig) out.push(s);
    }
    return out;
  }
  // how: 'set' (só estes), 'add', 'sub' ou 'toggle' (tira se todos já estavam, senão soma)
  function pinSelect(list, how) {
    const sel = st.pin.sel;
    if (how === 'set') sel.clear();
    if (how === 'toggle') how = list.length && list.every((s) => sel.has(s.key)) ? 'sub' : 'add';
    const sigs = new Map();
    for (const s of list) {
      if (how === 'sub') { sel.delete(s.key); continue; }
      if (!sigs.has(s.line)) sigs.set(s.line, pinSig(lineOf(s.line)));
      sel.set(s.key, sigs.get(s.line));
    }
  }
  // os pontos sob o mouse: o mais perto e todos os que estão no mesmo lugar que ele, a forma de cima primeiro
  function pinsAt(e) {
    const [x, y] = toCanvas(e), z = st.view.z, spots = pinSpots();
    let best = null, bd = 8 / z;
    for (const s of spots) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
    if (!best) return [];
    return spots.filter((s) => Math.hypot(s.x - best.x, s.y - best.y) <= 1.5 / z).sort((a, b) => b.order - a.order);
  }
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  function pinCount() {
    const n = pinChosen().length;
    hint(n ? `${plural(n, 'ponto escolhido', 'pontos escolhidos')}: o botão direito escolhe o osso.` : 'Nenhum ponto escolhido.', 2400);
  }
  function pinLabel(here) {
    if (here.length > 1) return `${here.length} pontos aqui (${[...new Set(here.map((s) => s.name))].join(', ')})`;
    const s = here[0];
    return `${s.name}, ponto ${s.idx + 1}: ${s.pin ? `@${s.pin}${s.w !== 1 ? `:${s.w}` : ''}` : 'solto'}`;
  }
  function pinClick(e) {
    const here = pinsAt(e), how = e.altKey ? 'sub' : e.shiftKey ? 'toggle' : 'set';
    if (!here.length) {
      st.pin.pick = null;
      if (how === 'set' && st.pin.sel.size) { st.pin.sel.clear(); draw(); }
      return;
    }
    // clicar de novo no mesmo lugar: só o ponto de uma forma (a de cima, depois a de baixo…), e de volta a todos
    const lines = [...new Set(here.map((s) => s.line))];
    const p = st.pin.pick, same = p && Math.hypot(p.x - e.clientX, p.y - e.clientY) < 6 && p.lines.join() === lines.join();
    const k = lines.length > 1 && same ? (p.k + 1) % (lines.length + 1) : 0;
    st.pin.pick = { x: e.clientX, y: e.clientY, lines, k };
    pinSelect(k ? here.filter((s) => s.line === lines[k - 1]) : here, how);
    draw();
    const name = (l) => here.find((s) => s.line === l).name;
    if (lines.length > 1) hint(k ? `Só o de ${name(lines[k - 1])} (${k} de ${lines.length}): clique de novo para o próximo.` : `${here.length} pontos aqui (${lines.map(name).join(', ')}): clique de novo para pegar só um.`, 3600);
    else pinCount();
  }
  // soltou a caixa: os pontos dentro dela (sem ter arrastado, foi um clique)
  function pinBoxEnd(b, e) {
    if (!b.moved) { pinClick(e); return; }
    const x0 = Math.min(b.a[0], b.b[0]), x1 = Math.max(b.a[0], b.b[0]), y0 = Math.min(b.a[1], b.b[1]), y1 = Math.max(b.a[1], b.b[1]);
    pinSelect(pinSpots().filter((s) => s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1), b.sub ? 'sub' : b.add ? 'add' : 'set');
    st.pin.pick = null;
    draw();
    pinCount();
  }
  // a distância de x,y até um osso, na pose do quadro: até o pedaço do pivô dele ao pivô de cada filho (é o
  // pedaço que ele gira); um osso sem filho, até o pivô. O pedaço para um pouco antes do filho: um ponto em
  // volta da junta (a ponta do braço em volta da mão) fica com o filho.
  function boneReach(m, pose) {
    const piv = new Map();
    for (const b of m.bones.values()) { const wm = pose.bones.get(b.name); piv.set(b.name, wm ? M.apply(wm, b.pivot[0], b.pivot[1]) : b.pivot); }
    const kids = new Map([...m.bones.keys()].map((n) => [n, []]));
    for (const b of m.bones.values()) {
      if (!b.parent || !kids.has(b.parent)) continue;
      const p = piv.get(b.parent), q = piv.get(b.name);
      kids.get(b.parent).push([p[0] + (q[0] - p[0]) * 0.85, p[1] + (q[1] - p[1]) * 0.85]);
    }
    const seg = (x, y, p, q) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / l2)) : 0;
      return Math.hypot(x - p[0] - dx * t, y - p[1] - dy * t);
    };
    return (name, x, y) => {
      const p = piv.get(name), ks = kids.get(name);
      return ks.length ? Math.min(...ks.map((q) => seg(x, y, p, q))) : Math.hypot(x - p[0], y - p[1]);
    };
  }
  function drawPins(ctx, m, pose, z) {
    const spots = pinSpots(), chosen = new Set(pinChosen().map((s) => s.key));
    const pivot = (name) => { const b = m.bones.get(name), wm = pose.bones.get(name); return wm ? M.apply(wm, b.pivot[0], b.pivot[1]) : b.pivot; };
    ctx.save();
    // cada osso com a cor dele: um anel em volta da bolinha
    ctx.lineWidth = 2.5 / z;
    for (const b of m.bones.values()) {
      const p = pivot(b.name);
      ctx.strokeStyle = boneColor(m, b.name);
      ctx.beginPath();
      ctx.arc(p[0], p[1], 8.5 / z, 0, Math.PI * 2);
      ctx.stroke();
    }
    // um ponto escolhido e preso: um fio tracejado até o osso dele
    ctx.setLineDash([3 / z, 3 / z]);
    ctx.lineWidth = 1.2 / z;
    for (const s of spots) {
      if (!s.pin || !chosen.has(s.key) || !m.bones.has(s.pin)) continue;
      const p = pivot(s.pin);
      ctx.strokeStyle = boneColor(m, s.pin);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // os pontos: preso, na cor do osso (com peso menor que 1, mais apagado e com o anel da cor); solto, cinza
    const r = 3.8 / z;
    const dot = (s) => {
      const col = s.pin && m.bones.has(s.pin) ? boneColor(m, s.pin) : null;
      ctx.beginPath();
      ctx.arc(s.x, s.y, col ? r : r * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = '#14141c';
      ctx.fill();
      ctx.globalAlpha = col ? 0.3 + 0.7 * Math.max(0, Math.min(1, s.w)) : 1;
      ctx.fillStyle = col || '#c3ccd6';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = (col && s.w < 1 ? 1.6 : 1.2) / z;
      ctx.strokeStyle = col && s.w < 1 ? col : '#14141c';
      ctx.stroke();
      if (!chosen.has(s.key)) return;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 2.8 / z, 0, Math.PI * 2);
      ctx.lineWidth = 2 / z;
      ctx.strokeStyle = '#ff8a1f';
      ctx.stroke();
    };
    for (const s of spots) if (!chosen.has(s.key)) dot(s);
    for (const s of spots) if (chosen.has(s.key)) dot(s);
    // a caixa sendo arrastada
    const b = st.pin.box;
    if (b && b.moved) {
      const x = Math.min(b.a[0], b.b[0]), y = Math.min(b.a[1], b.b[1]), w = Math.abs(b.a[0] - b.b[0]), h = Math.abs(b.a[1] - b.b[1]);
      ctx.fillStyle = b.sub ? 'rgba(255,107,107,.08)' : 'rgba(255,138,31,.08)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = b.sub ? '#ff6b6b' : '#ff8a1f';
      ctx.lineWidth = 1 / z;
      ctx.setLineDash([4 / z, 3 / z]);
      ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
  }
  function setPin(on) {
    st.pin.on = on;
    // a ferramenta acompanha: ligar escolhe o Prender, desligar (por qualquer caminho) volta para a Seleção
    if (on !== (st.tool === 'pin')) { st.tool = on ? 'pin' : 'select'; selMemo = null; stage.dataset.tool = st.tool; emit('tool'); }
    st.pin.box = null;
    st.pin.pick = null;
    if (!on) { st.pin.sel.clear(); st.pin.spin.clear(); closePinMenu(false); }
    if (on && st.measure) setMeasure(false);
    $('pinBtn').classList.toggle('on', on);
    if (on) hint(pvModel() ? 'Prender: os pontos aparecem no desenho, fora da prévia do def (tire o cursor de dentro do def).' : `Prender: clique nos pontos (Shift soma, Alt tira) ou arraste uma caixa; o botão direito escolhe o osso.${!st.anim && st.model.bones.size ? ' A alça de um osso gira só na tela, para testar.' : ''}`, 4200);
    draw();
  }
  // o menu dos ossos (botão direito): o osso mais perto dos pontos primeiro, o peso, cada um no mais perto e soltar
  const pinMenu = $('pinMenu');
  let pmenu = null;
  function openPinMenu(cx, cy) {
    const m = st.model, chosen = pinChosen();
    if (!chosen.length) { hint('Escolha pontos primeiro: clique num ponto ou arraste uma caixa em volta deles.', 2800); return; }
    if (!m.bones.size) { hint('Este desenho ainda não tem ossos: escreva uma linha bone antes (capítulo 6 do guia).', 3200); return; }
    const reach = boneReach(m, currentPose()), n = chosen.length;
    const mx = chosen.reduce((a, s) => a + s.x, 0) / n, my = chosen.reduce((a, s) => a + s.y, 0) / n;
    const bones = [...m.bones.keys()].sort((a, b) => reach(a, mx, my) - reach(b, mx, my));
    const pinned = chosen.filter((s) => s.pin).length, shapes = new Set(chosen.map((s) => s.line)).size;
    pmenu = { items: bones.map((b) => ({ bone: b })).concat([{ near: true }], pinned ? [{ free: true }] : []), sel: 0, back: document.activeElement === editor.ta };
    const rows = bones.map((b, i) => {
      const k = chosen.filter((s) => s.pin === b).length, note = [k ? (k === n ? 'todos já' : `${k} já`) : '', i < 9 ? String(i + 1) : ''].filter(Boolean).join(' · ');
      return `<div data-i="${i}"><span><i class="pm-dot" style="background:${boneColor(m, b)}"></i>${esc(b)}</span><small>${note}</small></div>`;
    });
    pinMenu.innerHTML = `<header>Prender ${plural(n, 'ponto', 'pontos')}${shapes > 1 ? ` de ${shapes} formas` : ''} a</header>${rows.join('')}`
      + `<label class="pm-w">Peso <input id="pinW" type="number" min="0" max="1" step="0.1" value="${st.pin.w}"><small>1 vai junto; 0.5, metade</small></label>`
      + `<div data-i="${bones.length}"><span>Cada um no osso mais perto</span><small></small></div>`
      + (pinned ? `<div data-i="${bones.length + 1}"><span>Soltar (tirar o @)</span><small>${pinned}</small></div>` : '');
    pinMenu.hidden = false;
    const w = pinMenu.offsetWidth, h = pinMenu.offsetHeight;
    pinMenu.style.left = Math.max(4, Math.min(window.innerWidth - w - 4, cx)) + 'px';
    pinMenu.style.top = Math.max(4, Math.min(window.innerHeight - h - 4, cy)) + 'px';
    markPinMenu();
    pinMenu.focus();
  }
  function markPinMenu() { [...pinMenu.querySelectorAll('[data-i]')].forEach((d) => d.classList.toggle('on', +d.dataset.i === pmenu.sel)); }
  function closePinMenu(refocus) {
    if (!pmenu) return;
    const back = pmenu.back;
    pmenu = null;
    pinMenu.hidden = true;
    if (refocus && back) editor.ta.focus();
  }
  // escreve (ou troca, ou tira) o @osso de cada ponto escolhido, da direita para a esquerda em cada linha
  function applyPin(item) {
    if (!item || !pmenu) return;
    const m = st.model, f = $('pinW'), w0 = f ? parseFloat(String(f.value).replace(',', '.')) : st.pin.w;
    const w = isNaN(w0) ? 1 : Math.min(1, Math.max(0, w0)), wt = w === 1 ? '' : `:${Number(w.toFixed(3))}`;
    closePinMenu(true);
    const chosen = pinChosen();
    if (!chosen.length) return;
    st.pin.w = w;
    const reach = item.near ? boneReach(m, currentPose()) : null, names = [...m.bones.keys()];
    const boneFor = (s) => (item.free ? '' : item.near ? names.reduce((a, b) => (reach(b, s.x, s.y) < reach(a, s.x, s.y) ? b : a)) : item.bone);
    const byLine = new Map(), out = new Map(), count = new Map();
    for (const s of chosen) (byLine.get(s.line) || byLine.set(s.line, []).get(s.line)).push(s);
    let bad = 0;
    for (const [line, list] of byLine) {
      let text = lineOf(line), touched = false;
      for (const s of list.sort((a, b) => b.h.from - a.h.from)) {
        const h = s.h, tok = text.slice(h.from, h.tokEnd), tail = text.slice(h.end, h.tokEnd);
        if (!tok || /\s/.test(tok) || (tail && tail[0] !== '@')) { bad++; continue; }
        const b = boneFor(s), suf = b ? `@${b}${wt}` : '';
        count.set(b, (count.get(b) || 0) + 1);
        if (tail === suf) continue;
        text = text.slice(0, h.end) + suf + text.slice(h.tokEnd);
        touched = true;
      }
      if (touched) out.set(line, text);
    }
    if (out.size) writeLines(out, 'pin' + Date.now());
    const done = chosen.length - bad, weight = wt ? ` com peso ${Number(w.toFixed(3))}` : '';
    let msg = item.free ? `${plural(done, 'ponto solto', 'pontos soltos')} (sem @).`
      : item.near ? `Cada ponto no osso mais perto${weight}: ${[...count].map(([b, k]) => `${b} ${k}`).join(', ')}.`
      : `${plural(done, 'ponto preso', 'pontos presos')} a ${item.bone}${weight}.`;
    if (out.size) msg += ' Ctrl+Z desfaz.';
    if (bad) msg += ` ${plural(bad, 'ponto ficou', 'pontos ficaram')} como estava: o código mudou, escolha de novo.`;
    hint(msg, 3600);
  }
  pinMenu.addEventListener('mousedown', (e) => {
    const row = e.target.closest('[data-i]');
    // o campo do peso recebe o foco normalmente
    if (!row || !pmenu) return;
    e.preventDefault();
    applyPin(pmenu.items[+row.dataset.i]);
  });
  pinMenu.addEventListener('mousemove', (e) => {
    const row = e.target.closest('[data-i]');
    if (row && pmenu && +row.dataset.i !== pmenu.sel) { pmenu.sel = +row.dataset.i; markPinMenu(); }
  });
  pinMenu.addEventListener('keydown', (e) => {
    // enquanto o menu está aberto, as teclas são dele (no campo do peso, os números são do campo)
    e.stopPropagation();
    if (!pmenu) return;
    const n = pmenu.items.length, bones = pmenu.items.filter((it) => it.bone).length;
    if (e.key === 'Escape') { e.preventDefault(); closePinMenu(true); return; }
    if (e.key === 'Enter') { e.preventDefault(); applyPin(pmenu.items[pmenu.sel]); return; }
    if (e.target.id === 'pinW') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); pmenu.sel = (pmenu.sel + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; markPinMenu(); } else if (/^[1-9]$/.test(e.key) && +e.key <= bones) { e.preventDefault(); applyPin(pmenu.items[+e.key - 1]); } else if (e.key !== 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) e.preventDefault();
  });
  pinMenu.addEventListener('focusout', () => setTimeout(() => { if (pmenu && !pinMenu.contains(document.activeElement)) closePinMenu(false); }, 0));

  // ---- medir ----
  function setMeasure(on) {
    st.measure = on;
    if (on !== (st.tool === 'measure')) { st.tool = on ? 'measure' : 'select'; selMemo = null; stage.dataset.tool = st.tool; emit('tool'); }
    if (!on) { st.meas = null; st.mdrag = null; }
    if (on && st.pin.on) setPin(false);
    $('measureBtn').classList.toggle('on', on);
    if (on) hint('Medir: arraste no desenho de um ponto a outro. Com Shift, de 45 em 45 graus. As pontas grudam nos pontos da forma e nas linhas guia (segurando Ctrl, não).', 4600);
    draw();
  }
  // a ponta da régua de medir sob o mouse
  function measureEnd(e) {
    if (!st.meas) return null;
    const [x, y] = toCanvas(e), r = 8 / st.view.z;
    for (const k of ['b', 'a']) if (Math.hypot(st.meas[k][0] - x, st.meas[k][1] - y) < r) return k;
    return null;
  }
  function measurePoint(e, other) {
    let [x, y] = toCanvas(e);
    st.guideHot = null;
    if (e.shiftKey && other) {
      const dx = x - other[0], dy = y - other[1], len = roundTo(Math.hypot(dx, dy)), a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      return [Math.round((other[0] + Math.cos(a) * len) * 10) / 10, Math.round((other[1] + Math.sin(a) * len) * 10) / 10];
    }
    if (!(e.ctrlKey || e.metaKey)) {
      let best = null, bd = 8 / st.view.z;
      for (const p of shapeSpots()) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = p; } }
      if (best) return [Math.round(best[0] * 10) / 10, Math.round(best[1] * 10) / 10];
      if (snapping(e)) {
        const hot = {}, ox = snapOff([x], 'v', hot), oy = snapOff([y], 'h', hot);
        if (hot.v !== undefined || hot.h !== undefined) st.guideHot = hot;
        return [hot.v !== undefined ? x + ox : roundTo(x), hot.h !== undefined ? y + oy : roundTo(y)];
      }
    }
    return [roundTo(x), roundTo(y)];
  }
  function moveMeasure(d, e) {
    const m = st.meas;
    m[d.end] = measurePoint(e, d.end === 'a' ? m.b : m.a);
    draw();
  }
  // a distância, o ângulo (como no rot=: em graus, girando no sentido do relógio) e quanto anda em x e em y
  function measText(m) {
    const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1];
    return `${numBR(Math.hypot(dx, dy))} px · ${numBR((Math.atan2(dy, dx) * 180) / Math.PI)}° · dx ${numBR(dx)} · dy ${numBR(dy)}`;
  }
  // ---- desenho (por cima de tudo, nos pixels da tela) ----
  function drawGuides(ctx, dpr) {
    const v = st.view, w = view.clientWidth, h = view.clientHeight, d = st.guideDrag, hot = st.guideHot || {};
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 1;
    const line = (axis, g, lit) => {
      const s = Math.round(axis === 'v' ? v.x + g * v.z : v.y + g * v.z) + 0.5;
      ctx.strokeStyle = lit ? '#ffffff' : GUIDE_C;
      ctx.globalAlpha = lit ? 1 : 0.8;
      ctx.beginPath();
      if (axis === 'v') { ctx.moveTo(s, 0); ctx.lineTo(s, h); } else { ctx.moveTo(0, s); ctx.lineTo(w, s); }
      ctx.stroke();
    };
    for (const axis of ['v', 'h']) st.guides[axis].forEach((g, i) => { if (!(d && d.axis === axis && d.i === i)) line(axis, g, hot[axis] === g); });
    if (d && !d.out) line(d.axis, d.pos, true);
    ctx.restore();
  }
  function drawMeasure(ctx, dpr) {
    const m = st.meas, v = st.view;
    const A = [v.x + m.a[0] * v.z, v.y + m.a[1] * v.z], B = [v.x + m.b[0] * v.z, v.y + m.b[1] * v.z];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    // as pontas: um traço de lado (como numa régua)
    const nx = len ? -(B[1] - A[1]) / len : 0, ny = len ? (B[0] - A[0]) / len : 1;
    const path = new Path2D();
    path.moveTo(A[0], A[1]);
    path.lineTo(B[0], B[1]);
    for (const P of [A, B]) { path.moveTo(P[0] - nx * 7, P[1] - ny * 7); path.lineTo(P[0] + nx * 7, P[1] + ny * 7); }
    for (const [c, lw] of [['#14141c', 3.5], [MEAS_C, 1.5]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.stroke(path); }
    for (const P of [A, B]) {
      ctx.beginPath();
      ctx.arc(P[0], P[1], 3, 0, Math.PI * 2);
      ctx.fillStyle = MEAS_C;
      ctx.fill();
      ctx.strokeStyle = '#14141c';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (len >= 1) {
      const txt = measText(m);
      ctx.font = '12px ui-monospace, Consolas, monospace';
      // o rótulo fica ao lado do meio da régua, longe o bastante para a caixa não cobrir a linha
      const tw = ctx.measureText(txt).width + 14, th = 22, side = ny > 0 ? -1 : 1, off = 10 + (Math.abs(nx) * tw + Math.abs(ny) * th) / 2;
      let lx = (A[0] + B[0]) / 2 + nx * side * off - tw / 2, ly = (A[1] + B[1]) / 2 + ny * side * off - th / 2;
      const r0 = rulersOn() ? RULER : 0;
      lx = Math.max(r0 + 4, Math.min(view.clientWidth - tw - 4, lx));
      ly = Math.max(r0 + 4, Math.min(view.clientHeight - th - 4, ly));
      ctx.fillStyle = 'rgba(10,14,19,.9)';
      ctx.strokeStyle = MEAS_C;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(lx + 0.5, ly + 0.5, tw, th, 5); else ctx.rect(lx + 0.5, ly + 0.5, tw, th);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffe7a8';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, lx + 7.5, ly + th / 2 + 1);
    }
    ctx.restore();
  }
  // o passo das marcas com número: o menor que fica a pelo menos 50 pixels um do outro na tela
  const RULER_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000];
  function drawRulers(ctx, dpr) {
    const v = st.view, z = v.z, w = view.clientWidth, h = view.clientHeight, R = viewRect();
    const step = RULER_STEPS.find((s) => s * z >= 50) || RULER_STEPS[RULER_STEPS.length - 1];
    const lead = step / Math.pow(10, Math.floor(Math.log10(step) + 1e-9));
    const n = (lead === 1 ? [10, 5, 2] : lead === 2 ? [4, 2] : [5]).find((k) => (step / k) * z >= 5) || 1, minor = step / n;
    const C = theme(RULER_C.dark, RULER_C.light);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, RULER);
    ctx.fillRect(0, 0, RULER, h);
    // o papel aparece mais claro nas réguas
    ctx.fillStyle = C.paper;
    const px0 = v.x + R.x * z, py0 = v.y + R.y * z;
    ctx.fillRect(Math.max(RULER, px0), 0, Math.max(0, Math.min(w, px0 + R.w * z) - Math.max(RULER, px0)), RULER);
    ctx.fillRect(0, Math.max(RULER, py0), RULER, Math.max(0, Math.min(h, py0 + R.h * z) - Math.max(RULER, py0)));
    ctx.font = '10px system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 1;
    // as marcas: compridas com número, médias no meio, curtas entre elas
    const ticks = (o, len0, len1) => {
      const out = [];
      for (let i = Math.floor((RULER - o) / z / minor), end = Math.ceil((len1 - o) / z / minor); i <= end; i++) {
        const s = Math.round(o + i * minor * z) + 0.5;
        if (s < len0 || s > len1) continue;
        out.push({ s, val: i * minor, size: i % n === 0 ? RULER : n % 2 === 0 && i % (n / 2) === 0 ? 9 : 5 });
      }
      return out;
    };
    ctx.strokeStyle = C.tick;
    ctx.fillStyle = C.text;
    ctx.beginPath();
    for (const t of ticks(v.x, RULER, w)) {
      ctx.moveTo(t.s, RULER - t.size);
      ctx.lineTo(t.s, RULER);
      if (t.size === RULER) ctx.fillText(String(Math.round(t.val)), t.s + 3, 10);
    }
    for (const t of ticks(v.y, RULER, h)) {
      ctx.moveTo(RULER - t.size, t.s);
      ctx.lineTo(RULER, t.s);
      if (t.size === RULER) {
        const txt = String(Math.round(t.val)), tw = ctx.measureText(txt).width;
        ctx.save();
        ctx.translate(10, t.s + 3 + tw);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(txt, 0, 0);
        ctx.restore();
      }
    }
    ctx.stroke();
    // as linhas guia marcadas nas réguas
    ctx.fillStyle = GUIDE_C;
    for (const g of st.guides.v) { const s = v.x + g * z; if (s > RULER && s < w) ctx.fillRect(Math.round(s) - 1, RULER - 4, 3, 4); }
    for (const g of st.guides.h) { const s = v.y + g * z; if (s > RULER && s < h) ctx.fillRect(RULER - 4, Math.round(s) - 1, 4, 3); }
    // bordas e o quadradinho do canto
    ctx.strokeStyle = C.edge;
    ctx.beginPath();
    ctx.moveTo(0, RULER - 0.5);
    ctx.lineTo(w, RULER - 0.5);
    ctx.moveTo(RULER - 0.5, 0);
    ctx.lineTo(RULER - 0.5, h);
    ctx.stroke();
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, RULER - 1, RULER - 1);
    ctx.fillStyle = C.tick;
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillText('px', 4, 13);
    ctx.restore();
  }
  // liga as réguas, o Medir e a chave Hitboxes de acordo com o arquivo (no filme, não há nenhum deles)
  function syncRulers() {
    const film = isFilm();
    $('tRulersWrap').hidden = film;
    $('tBoxesWrap').hidden = film;
    $('measureBtn').hidden = film;
    if (film && st.measure) setMeasure(false);
    $('pinBtn').hidden = film;
    if (film && st.pin.on) setPin(false);
    // a chave Estilo só aparece quando o arquivo (ou o filme) tem art
    $('tArtWrap').hidden = !W.art.has(st.model);
    stage.classList.toggle('ruled', rulersOn());
  }

  function hitHandle(e) {
    if (!pointsOn() || st.build) return -1;
    const hl = handleList(st.model, currentPose());
    if (!hl) return -1;
    const [x, y] = toCanvas(e);
    // as bolinhas de ponto novo só ganham quando não há outra alça perto
    let best = -1, bd = 10 / st.view.z, mid = -1, md = 8 / st.view.z;
    hl.pts.forEach((p, i) => {
      if (!p) return;
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (hl.rec.handles[i].kind === 'mid') { if (d < md) { md = d; mid = i; } } else if (d < bd) { bd = d; best = i; }
    });
    return best >= 0 ? best : mid;
  }
  const fmtN = (v, dec) => String(Number(v.toFixed(dec)));
  // imagem guia solta sob o mouse (as da frente primeiro): mover, ou o canto de baixo à direita para o tamanho
  function hitRef(e) {
    const m = st.model;
    if (!st.show.refs || st.build || isFilm() || !m.refs.length) return null;
    const pose = currentPose(), [x, y] = toCanvas(e);
    const list = [...m.refs.filter((r) => !r.front), ...m.refs.filter((r) => r.front)].reverse();
    for (const r of list) {
      if (r.lock || !S.refOn(r, pose)) continue;
      const b = refBox(r);
      if (!b) continue;
      const br = M.apply(b.m, b.w, b.h);
      if (Math.hypot(br[0] - x, br[1] - y) < 9 / st.view.z) return { r, b, mode: 'scale' };
      const [u, v] = M.apply(M.invert(b.m), x, y);
      if (u >= 0 && v >= 0 && u <= b.w && v <= b.h) return { r, b, mode: 'move' };
    }
    return null;
  }
  function moveRef(d, x, y) {
    const r = st.model.refs.find((q) => q.name === d.name);
    if (!r) { st.refDrag = null; return; }
    const dec = st.view.z > 3 ? 1 : 0;
    if (d.mode === 'move') { editRef(r, { pos: `${fmtN(d.x + x - d.px, dec)},${fmtN(d.y + y - d.py, dec)}`, caret: true }, d.key); return; }
    // tamanho: pela diagonal, com o canto de cima à esquerda parado (mesmo girada)
    const [dx, dy] = [d.br[0] - d.tl[0], d.br[1] - d.tl[1]];
    const t = ((x - d.tl[0]) * dx + (y - d.tl[1]) * dy) / (dx * dx + dy * dy);
    const s = Number(Math.max(0.01, d.scale * t).toFixed(3));
    const hw = (d.w * s) / 2, hh = (d.h * s) / 2, c = M.apply(M.rotate(r.rot), -hw, -hh);
    editRef(r, { pos: `${fmtN(d.tl[0] - hw - c[0], dec)},${fmtN(d.tl[1] - hh - c[1], dec)}`, attrs: { scale: s === 1 ? null : String(s) }, caret: true }, d.key);
  }

  // ---------- ferramentas e vistas (a casca no jeito do Illustrator) ----------
  // A ferramenta da barra da esquerda. Medir e Prender continuam sendo os modos de antes (st.measure, st.pin.on):
  // ligar um deles pela barra, pelo teclado ou pelo menu escolhe a ferramenta, e desligar volta para a Seleção.
  const TOOLS = ['select', 'direct', 'pen', 'curve', 'anchor', 'pencil', 'smooth', 'patherase', 'join', 'brush', 'blob', 'eraser', 'scissors', 'knife', 'builder', 'wand', 'lasso', 'text', 'rect', 'ellipse', 'polygon', 'star', 'line', 'eyedrop', 'gradient', 'measure', 'pin', 'hand', 'zoom'];
  const FILM_TOOLS = ['select', 'direct', 'hand', 'zoom'];
  // o Texto põe o texto pronto com um clique; as formas, o Conta-gotas e o Degradê moram em js/ui-draw.js
  const INSERT_TOOLS = { text: 'text' };
  // As ferramentas de fora (js/ui-draw.js) se registram aqui: { down(e) → true se o aperto é dela, move(e), up(e),
  // overlay(ctx, z, dpr), cursor(e), handles: as alças da forma do cursor continuam valendo nela }
  const toolHooks = {};
  // desenhos por cima que não são de uma ferramenta (a prévia do Simplificar, js/ui-pencil.js)
  const overlays = [];
  // no filme: { overlay(ctx, z, dpr), down(e) → true se o aperto é dela, move(e), up(e), cursor(e) } (js/ui-film.js)
  const filmHooks = [];
  let ctxMenu = null;
  function setTool(id) {
    if (!TOOLS.includes(id) || ((isFilm() || st.view3d) && !FILM_TOOLS.includes(id))) return;
    if (id === 'pin' && pvModel()) { hint('O Prender não funciona dentro da prévia do def: tire o cursor de dentro do def.', 3200); return; }
    st.tool = id;
    if (id !== 'measure' && st.measure) setMeasure(false);
    if (id !== 'pin' && st.pin.on) setPin(false);
    if (id === 'measure' && !st.measure) setMeasure(true);
    if (id === 'pin' && !st.pin.on) setPin(true);
    selMemo = null;
    stage.dataset.tool = st.tool;
    updateCaretInfo();
    emit('tool');
    draw();
  }
  // a vista Camadas em 3D (js/ui-3d.js): toma o lugar do desenho (no filme, é a vista do palco). Nela valem as
  // ferramentas do filme; o zoom e o ajustar da barra de baixo e do teclado vão para ela (v3, que ela registra).
  let v3 = null;
  function set3d(on) {
    on = !!on && !!st.model;
    if (on === st.view3d) return;
    st.view3d = on;
    stage.classList.toggle('v3-on', on);
    if (on && !FILM_TOOLS.includes(st.tool)) setTool('select');
    emit('view3d');
    emit('tool');
    draw();
  }
  const zoomBy = (f) => { if (st.view3d && v3) v3.zoom(f); else zoomAt(view.clientWidth / 2, view.clientHeight / 2, f); };
  const fitView = () => { if (st.view3d && v3) v3.fit(); else { st.view.auto = true; draw(); } };
  // a vista: só o código, os dois lado a lado ou só o desenho (o código continua lá, escondido)
  function setLayout(v, keep) {
    if (!['code', 'split', 'design'].includes(v)) v = 'split';
    st.layout = v;
    document.body.dataset.layout = v;
    if (keep !== false) store.set('weasel.vista', v);
    if (v === 'design' && document.activeElement === editor.ta) editor.ta.blur();
    updateCaretInfo();
    emit('layout');
    draw();
  }
  // Ctrl+': a vista seguinte, Código → Dividido → Design → Código (back: a de antes). No Código o desenho some, e o
  // cursor vai para o código (senão as letras trocariam de ferramenta sem ninguém ver)
  const LAYOUTS = ['code', 'split', 'design'];
  function cycleLayout(back) {
    const v = LAYOUTS[(LAYOUTS.indexOf(st.layout) + (back ? 2 : 1)) % 3];
    setLayout(v);
    if (v === 'code' && document.activeElement !== editor.ta) editor.ta.focus();
  }
  // desfazer e refazer pelo desenho (ou pelo menu): a escolha continua a mesma. O desfazer do código põe o cursor
  // onde ele estava na edição de antes, e isso soltaria a escolha (com o número de linhas mudando, ela se perde).
  function undoRedo(redo) {
    const lines = () => editor.value.split('\n').length;
    const sel = [...st.sel.keys()], line = st.caret.line, n = lines();
    if (redo) editor.redo(); else editor.undo();
    if (lines() !== n) return;
    const sigs = nodeSigs(), ok = sel.filter((l) => sigs.has(l));
    if (ok.length) setSel(ok, ok.includes(line) ? line : ok[0]);
    else if (st.caret.line !== line) editor.reveal(line, 0);
  }
  // ir para uma linha no código de propósito (o nome num painel, um erro): no Design, abre o Dividido
  function gotoCode(line, col) {
    if (st.layout === 'design') setLayout('split');
    editor.goto(line, col);
  }
  // as setas: empurram a escolha (1 px; com Shift, 10). false: nada escolhido
  function nudge(dx, dy) {
    if (!groupOn()) return false;
    if (st.playing || st.anim) { hint('Para empurrar a escolha, escolha "pose parada" no player.', 2600); return true; }
    const b = groupBox(selModel(), currentPose());
    if (!b) return false;
    const out = new Map(), dec = st.view.z > 3 ? 1 : 0, stuck = [];
    for (const line of selSet().keys()) {
      const p = editPlan(line);
      const a = p.why ? null : localOf(p.rec, p.ref, b.cx, b.cy), c = a && localOf(p.rec, p.ref, b.cx + dx, b.cy + dy);
      if (!c) { stuck.push(`linha ${line + 1}: ${p.why || 'não anda pelo desenho'}`); continue; }
      out.set(line, planText(p, (px, py) => [px + c[0] - a[0], py + c[1] - a[1]], 0, dec));
    }
    if (out.size) { writeLines(out, 'nudge' + Date.now()); st.lastXf = { mode: 'move', dx, dy, copy: false }; }
    if (stuck.length) hint(`${stuck.length > 1 ? `${stuck.length} linhas ficam paradas` : 'Fica parada'} (${stuck.slice(0, 2).join('; ')}${stuck.length > 2 ? '…' : ''}).`, 3600);
    return true;
  }
  // Ctrl+D no desenho, até a etapa 3 (quando vira "repetir a última transformação"): duplica as formas escolhidas
  // (ou a da linha do cursor) como o Ctrl+D do código. A cópia ganha nome novo e entra logo abaixo da original, no
  // mesmo lugar do desenho, e vira a escolha: é só arrastar. Linhas seguidas ficam juntas; os nomes que uma cópia usa
  // de outra mudam junto (renameCopy recebe todas as linhas de uma vez). Um Ctrl+Z desfaz tudo.
  function duplicateSel(key) {
    if (!st.model || isFilm() || st.build) return false;
    let lines = [...selSet().keys()];
    if (!lines.length && nodeSigs().has(st.caret.line)) lines = [st.caret.line];
    if (!lines.length) return false;
    // um grupo escolhido inteiro vai inteiro (do group ao end), e a cópia nasce logo depois do end
    const base = lines;
    lines = [];
    for (const u of selUnits(base)) for (let l = u.a; l <= u.b; l++) lines.push(l);
    lines = [...new Set(lines)].sort((a, b) => a - b);
    const all = editor.value.split('\n'), sel = new Set(lines), first = lines[0], last = lines.at(-1);
    const copy = renameCopy(lines.map((l) => all[l]).join('\n'));
    const twin = new Map((copy ? copy.text : lines.map((l) => all[l]).join('\n')).split('\n').map((t, i) => [lines[i], t]));
    // da primeira escolhida à última: no fim de cada trecho de linhas seguidas, as cópias dele. seg[i] é a linha
    // first + i do código novo; fresh guarda onde cada cópia ficou (na ordem das escolhidas)
    const seg = [], fresh = [];
    for (let l = first; l <= last; l++) {
      seg.push(all[l]);
      if (!sel.has(l) || sel.has(l + 1)) continue;
      let a = l;
      while (sel.has(a - 1)) a--;
      for (let m = a; m <= l; m++) { fresh.push(first + seg.length); seg.push(twin.get(m)); }
    }
    const from = editor.lineStart(first), to = editor.lineStart(last) + all[last].length;
    const caret = sel.has(st.caret.line) ? fresh[lines.indexOf(st.caret.line)] : fresh[0];
    let off = from;
    for (let i = 0; i < caret - first; i++) off += seg[i].length + 1;
    editor.replaceRange(from, to, seg.join('\n'), { select: [off, off], key: key || null });
    const sigs = nodeSigs(), ok = fresh.filter((l) => sigs.has(l));
    setSel(ok, ok.includes(caret) ? caret : ok[0] !== undefined ? ok[0] : caret);
    if (!copy) hint(`${fresh.length > 1 ? `${fresh.length} cópias` : 'Cópia'} na linha ${fresh[0] + 1}: arraste para o lugar (Ctrl+Z desfaz).`, 2600);
    return true;
  }
  // Ctrl+D no desenho (Objeto › Transformar › Repetir): a última transformação da escolha de novo, com as mesmas
  // contas do painel Propriedades. Se ela veio de uma cópia (Alt+arrastar), copia de novo antes: cópias em fila.
  function transformAgain() {
    const x = st.lastXf;
    if (!st.model || isFilm()) return;
    if (!x) { hint('Ctrl+D repete a última transformação da escolha (mover, girar ou esticar). Ainda não houve nenhuma.', 3200); return; }
    if (!selSet().size) { hint('Escolha uma forma para repetir a transformação (Ctrl+D).', 2600); return; }
    const key = 'again' + Date.now();
    if (x.copy && !duplicateSel(key)) return;
    const lines = [...selSet().keys()].sort((a, b) => a - b);
    transformLines(lines, x.mode, x, key);
    st.lastXf = x;
  }
  // o caminho da barra de status no Design: arquivo › camada › forma › ponto
  function crumbs() {
    const m = st.model, line = st.caret.line, out = [{ t: st.current }];
    if (!m || isFilm()) return out;
    if (st.sel.size > 1) { out.push({ t: `${st.sel.size} formas escolhidas` }); return out; }
    const tree = layerTree(m), li = tree.findIndex((t) => t.line === line || t.kids.some((k) => k.line === line));
    if (li >= 0) out.push({ t: tree[li].layer.name, li });
    const rec = m.byLine.get(line);
    if (!rec || (li >= 0 && tree[li].line === line)) return out;
    const k = li >= 0 ? tree[li].kids.find((q) => q.line === line) : null;
    out.push({ t: k ? `${k.type} ${k.name}`.trim() : `${rec.el ? rec.el.type : rec.st.cmd}${rec.el && rec.el.name ? ' ' + rec.el.name : ''}` });
    const hi = activeHandle(rec), h = hi >= 0 ? rec.handles[hi] : null;
    if (h && h.kind === 'pt') out.push({ t: `ponto ${h.idx + 1}` });
    return out;
  }
  function showCrumbs() {
    const box = $('crumbs');
    if (!box || st.layout !== 'design') return;
    const list = crumbs(), sig = list.map((c) => c.t + (c.li !== undefined ? '@' + c.li : '')).join('›');
    if (box.dataset.sig === sig) return;
    box.dataset.sig = sig;
    box.innerHTML = list.map((c, i) => (c.li !== undefined ? `<button type="button" data-li="${c.li}" title="Escolher tudo o que desenha na camada ${esc(c.t)}">${esc(c.t)}</button>` : `<span${i === list.length - 1 ? ' class="last"' : ''}>${esc(c.t)}</span>`)).join('<i>›</i>');
  }
  // o zoom na barra de status
  function showZoom() {
    const z = $('zoomPct'), t = Math.round(st.view.z * 100) + '%';
    if (z && z.textContent !== t) z.textContent = t;
  }
  // 100%: um pixel do desenho, um pixel da tela, com o meio da vista parado
  function zoomActual() {
    if (st.view3d && v3) { v3.actual(); return; }
    const f = 1 / st.view.z;
    if (Math.abs(f - 1) > 1e-9) zoomAt(view.clientWidth / 2, view.clientHeight / 2, f);
  }

  function hint(msg, ms) {
    const h = $('hint');
    h.textContent = msg;
    h.hidden = false;
    clearTimeout(hint.t);
    hint.t = setTimeout(() => { h.hidden = true; }, ms || 2000);
  }

  view.addEventListener('pointerdown', (e) => {
    // clicar no desenho com a caixinha do texto aberta: grava o que foi escrito (como clicar fora)
    if (textEd) closeTextEd(true, false);
    view.setPointerCapture(e.pointerId);
    // a Mão, o Espaço segurado e o botão do meio movem a vista, em cima do que for
    if (st.space || e.button === 1 || (e.button === 0 && st.tool === 'hand')) {
      if (st.space) st.space.panned = true;
      st.pan = { x: e.clientX, y: e.clientY, vx: st.view.x, vy: st.view.y, click: false, moved: false };
      return;
    }
    // o Zoom: clique aproxima, Alt+clique afasta (no lugar do clique)
    if (e.button === 0 && st.tool === 'zoom') {
      const r = view.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.altKey ? 0.8 : 1.25);
      return;
    }
    // numa régua: puxar uma linha guia nova (no quadradinho do canto, só o duplo clique faz algo: apaga todas)
    const ru = e.button === 0 ? rulerAt(e) : null;
    if (ru) { if (ru !== 'corner') startGuide(ru === 'top' ? 'h' : 'v', -1, e); return; }
    // no filme, as alças de js/ui-film.js pegam o aperto antes das outras
    if (e.button === 0 && isFilm() && !st.playing) for (const f of filmHooks) if (f.down && f.down(e)) { st.tdrag = f; draw(); return; }
    // o Laço: arrastar desenha o contorno, em cima do que for (Shift soma, Alt tira)
    if (e.button === 0 && st.tool === 'lasso' && !isFilm() && !st.build) { const p = toCanvas(e); st.marq = { lasso: true, pts: [p], a: p, b: p, x: e.clientX, y: e.clientY, add: e.shiftKey, sub: e.altKey, moved: false }; return; }
    // prender: o clique escolhe pontos e arrastar no fundo faz uma caixa (com uma animação escolhida, a bolinha
    // de um osso ainda posa, para ver os pontos presos irem junto)
    if (e.button === 0 && pinOn()) {
      const hb = hitBone(e);
      if (hb) { startPose(hb, e); return; }
      const p = toCanvas(e);
      st.pin.box = { a: p, b: p.slice(), add: e.shiftKey, sub: e.altKey, x: e.clientX, y: e.clientY, moved: false };
      return;
    }
    // Ctrl+clique escreve a coordenada no cursor do código (no Design o código não aparece: não escreve). No Mac,
    // Cmd+clique: lá o Ctrl+clique é o botão direito, que abre o menu
    if (e.button === 0 && (MAC ? e.metaKey : e.ctrlKey || e.metaKey) && st.layout !== 'design') {
      const [x, y] = toWorld(e);
      const ta = editor.ta, s = ta.selectionStart;
      const before = ta.value[s - 1];
      const txt = (before && !/\s/.test(before) ? ' ' : '') + `${Math.round(x)},${Math.round(y)}`;
      editor.replaceRange(s, ta.selectionEnd, txt, {});
      ta.focus();
      return;
    }
    // medir: arrastar faz uma medida nova; perto de uma das pontas, arrasta essa ponta
    if (e.button === 0 && st.measure && !isFilm()) {
      const end = measureEnd(e);
      if (!end) { const p = measurePoint(e, null); st.meas = { a: p, b: p.slice() }; }
      st.mdrag = { end: end || 'b' };
      draw();
      return;
    }
    // as ferramentas de desenhar (js/ui-draw.js) pegam o aperto, menos numa alça da forma do cursor: dá para
    // arredondar o canto do retângulo que acabou de nascer sem trocar de ferramenta
    const tk = e.button === 0 && !isFilm() && !st.build ? toolHooks[st.tool] : null;
    if (tk && !(tk.handles && pointsOn() && hitHandle(e) >= 0) && tk.down(e)) { st.tdrag = tk; draw(); return; }
    // no Texto, apertar num texto é para mudar as letras: as alças dele (mover, tamanho) não pegam o clique
    if (e.button === 0 && st.tool === 'text' && !isFilm() && (hitsAt(e)[0] || {}).type === 'text') {
      st.pan = { x: e.clientX, y: e.clientY, vx: st.view.x, vy: st.view.y, click: true, moved: false };
      return;
    }
    const hb = e.button === 0 ? hitBone(e) : null;
    if (hb) { startPose(hb, e); return; }
    const hg = e.button === 0 ? hitGroup(e) : null;
    // na Seleção, mover espera o mouse andar: um clique sem arrastar só escolhe (e pega a forma de baixo)
    if (hg === 'move' && st.tool === 'select') { st.vpress = { x: e.clientX, y: e.clientY, pick: false, alt: e.altKey }; return; }
    if (hg) { if (hg.k) startGroup('scale', e, hg.k); else startGroup(hg, e); return; }
    const hs = e.button === 0 ? hitScale(e) : null;
    if (hs) { startScale(hs, e); return; }
    const hi = e.button === 0 ? hitHandle(e) : -1;
    const hgd = e.button === 0 && hi < 0 ? hitGuide(e) : null;
    if (hgd) { startGuide(hgd.axis, hgd.i, e); return; }
    const hr = e.button === 0 && hi < 0 ? hitRef(e) : null;
    if (hr) {
      const rec = st.model.byLine.get(hr.r.line);
      if (rec && (rec.repeated || (rec.refPos && rec.refPos.text.includes('{')))) { hint('A posição desta imagem guia vem de uma {expressão}: mude no código.', 2800); return; }
      const [px, py] = toCanvas(e);
      st.refDrag = { name: hr.r.name, mode: hr.mode, key: 'ref' + Date.now(), px, py, x: hr.r.x, y: hr.r.y, scale: hr.r.scale, w: hr.b.w, h: hr.b.h, tl: M.apply(hr.b.m, 0, 0), br: M.apply(hr.b.m, hr.b.w, hr.b.h) };
      return;
    }
    if (hi >= 0) {
      const rec = st.model.byLine.get(st.caret.line);
      const h = rec.handles[hi];
      if (h.kind === 'mid') { addPoint(h); return; }
      // clicar num ponto o escolhe (fica laranja): o cursor do código vai para ele, e Delete o apaga
      if (h.kind === 'pt') editor.place(st.caret.line, h.to);
      // a alça ✥ ou Shift+arrastar um ponto: a forma inteira anda; a alça azul (ou a clarinha, automática): a curva;
      // Alt+arrastar um ponto: leva uma cópia da forma (como no Illustrator); a alça verde: girar.
      // Com o Ponto de ancoragem (Shift+C): arrastar um ponto puxa as alças (pull), e o clique troca canto e liso.
      const anchorT = st.tool === 'anchor';
      const mode = h.kind === 'rot' ? 'spin' : h.kind === 'move' || (e.shiftKey && h.kind === 'pt') ? 'move' : h.kind === 'tan' ? 'tan' : anchorT && h.kind === 'pt' ? 'pull' : e.altKey && h.kind === 'pt' && !isFilm() ? 'copy' : null;
      const pts = rec.handles.filter((q) => q.kind === 'pt');
      if (mode === 'move' ? pts.some((q) => q.fixed) : h.fixed) { hint(mode === 'move' || h.pts ? 'Algum ponto desta forma vem de uma {expressão}: mude no código.' : mode === 'spin' ? 'O rot= desta forma vem de uma {expressão}: mude no código.' : h.kind === 'fsize' ? 'O size= deste texto vem de uma {expressão}: mude no código.' : 'Este ponto vem de uma {expressão}: mude o valor no código.', 2800); return; }
      // a direção não muda com a pose: dá para girar com uma animação escolhida, só não tocando
      if (st.playing || (!isFilm() && st.anim && h.kind !== 'dir' && !h.grad)) { hint(isFilm() ? 'Pause o player para arrastar pontos.' : 'Para arrastar pontos, escolha "pose parada" no player.', 2600); return; }
      if (h.kind === 'dir') hint('Gire a seta: ela aponta para onde a luz está. Com Shift, gira de 15 em 15 graus.', 3200);
      else if (h.grad) hint({ g1: 'O começo do gradiente (a primeira cor). Com Shift, a direção anda de 45 em 45 graus.', g2: 'O fim do gradiente (a última cor). Com Shift, a direção anda de 45 em 45 graus.', gc: 'O centro do gradiente. Com Shift, anda em passos.', gr: 'O raio: até onde vai a última cor. Com Shift, em passos.', gf: 'O foco: de onde sai a primeira cor. Com Shift, anda em passos.' }[h.kind], 3000);
      else if (mode === 'move') hint('Movendo a forma inteira: todos os pontos andam juntos.', 2400);
      else if (mode === 'pull') hint('Puxe as alças da curva (clique sem arrastar: canto ou liso). Solte em cima do ponto para tirar.', 3000);
      else if (mode === 'tan') hint(h.auto ? 'Alça automática: arrastar escreve as alças no código, do jeito que a curva está. Alt mexe só neste lado.' : anchorT ? 'Mexendo só este lado da alça (alça quebrada, ~chegada~saída).' : h.sym ? 'Arraste a alça (os dois lados juntos). Alt quebra: mexe só este lado.' : 'Arraste este lado da alça. Alt solta da direção do outro lado; duplo clique junta os dois lados.', 3200);
      else if (h.kind === 'size') hint('Com Shift, o tamanho muda sem perder a proporção.', 2400);
      else if (h.kind === 'round') hint('Arraste para o lado: o canto fica mais redondo. De volta ao canto, r=0.', 2600);
      else if (h.kind === 'fsize') hint('Arraste o canto: as letras crescem ou diminuem (size=). Com Shift, de 4 em 4.', 2600);
      else if (mode === 'spin') hint(h.pts ? 'Girando a forma inteira em volta do meio dos pontos. Com Shift, de 15 em 15 graus.' : 'Gire em volta do meio. Com Shift, de 15 em 15 graus; duplo clique volta a rot=0.', 3000);
      st.drag = { line: st.caret.line, hi, key: 'drag' + Date.now(), mode, idx: h.idx };
      st.drag.sn = snapPlan(rec, h, hi, mode, e);
      if (mode === 'move' || mode === 'spin') {
        // os pontos como estavam no começo: cada movimento parte deles (sem acumular arredondamento)
        st.drag.orig = [];
        for (const q of pts) st.drag.orig[q.idx] = { x: q.x, y: q.y, tan: q.tan, tin: q.tin };
        const [px, py] = toCanvas(e), l = localOf(rec, h, px, py);
        if (mode === 'move') st.drag.l0 = l;
        else st.drag.spin = { cx: h.cx, cy: h.cy, reach: spinOf(rec, h).reach, rot0: h.rot, ang: h.rot, a0: l ? Math.atan2(l[1] - h.cy, l[0] - h.cx) : null };
      } else if (mode === 'pull') st.drag.corner = !!(pts.find((q) => q.idx === h.idx) || {}).corner;
      else if (mode === 'tan') {
        // como as alças estavam: a chegada (a0) e a saída (b0); se estavam na mesma direção (col), o outro lado
        // acompanha a direção do arrastado, como num ponto liso do Illustrator
        // (nas pontas de um traço aberto, o lado sem curva não conta)
        const pt = pts.find((q) => q.idx === h.idx) || {}, cl = !!(rec.el && rec.el.closed);
        const a0 = cl || h.idx > 0 ? (h.auto ? h.ain : pt.tin || pt.tan) : null, b0 = cl || h.idx < pts.length - 1 ? (h.auto ? h.aout : pt.tan) : null;
        const la = a0 ? Math.hypot(a0[0], a0[1]) : 0, lb = b0 ? Math.hypot(b0[0], b0[1]) : 0;
        const col = !!(a0 && b0 && la > 1e-6 && lb > 1e-6 && (a0[0] * b0[0] + a0[1] * b0[1]) / (la * lb) > 0.9994);
        Object.assign(st.drag, { side: h.side, sym: !!h.sym, auto: !!h.auto, a0, b0, col, anchor: anchorT, alt: e.altKey });
      } else if (mode === 'copy') Object.assign(st.drag, { cx: e.clientX, cy: e.clientY });
      else if (h.kind === 'size') st.drag.orig = { rx: h.rx, ry: h.ry, w: h.w, h: h.h };
      return;
    }
    // na Seleção, apertar numa forma e arrastar: ela vira a escolha e anda junto (sem arrastar, é um clique)
    // (com Alt, arrastar faz uma cópia e leva a cópia)
    if (e.button === 0 && st.tool === 'select' && !e.shiftKey && !isFilm() && linesAt(e).length) { st.vpress = { x: e.clientX, y: e.clientY, pick: true, alt: e.altKey }; return; }
    // nas duas seleções, arrastar no vazio faz a caixa de seleção (Shift soma, Alt tira); soltar sem ter arrastado
    // é um clique (escolhe a forma sob o mouse, ou tira a escolha)
    if (e.button === 0 && (st.tool === 'select' || st.tool === 'direct') && !isFilm() && !st.build) { const p = toCanvas(e); st.marq = { a: p, b: p, x: e.clientX, y: e.clientY, add: e.shiftKey, sub: e.altKey, moved: false }; return; }
    // nas outras, arrastar move a vista; o clique simples escolhe a figura sob o mouse (ou, nas ferramentas de
    // forma, põe uma ali)
    if (e.button === 0) st.pan = { x: e.clientX, y: e.clientY, vx: st.view.x, vy: st.view.y, click: true, moved: false };
  });
  // o clique sem arrastar: escolher, pôr uma forma pronta ou, no Texto, escrever
  function clickAt(e) {
    // a Varinha: as formas com a mesma cor da clicada (js/ui-select.js)
    if (st.tool === 'wand' && !isFilm()) { const l = linesAt(e)[0]; if (W.sel) W.sel.wand(l === undefined ? -1 : l, e); return; }
    const ins = INSERT_TOOLS[st.tool];
    if (!ins || isFilm()) { pickShape(e); return; }
    if (ins === 'text') {
      const el = hitsAt(e)[0];
      if (el && el.type === 'text') { editText(el); return; }
    }
    insertShapeAt(NEW_SHAPES.findIndex((s) => s.cmd === ins), toWorld(e), { edit: ins === 'text' });
  }

  view.addEventListener('pointermove', (e) => {
    const [x, y] = toCanvas(e);
    const wp = toWorld(e);
    $('coords').textContent = `x ${Math.round(wp[0])}  y ${Math.round(wp[1])}`;
    if (st.guideDrag) { moveGuide(st.guideDrag, e); return; }
    if (st.mdrag) { moveMeasure(st.mdrag, e); return; }
    if (st.tdrag) { st.tdrag.move(e); return; }
    if (st.pose) { movePose(e); return; }
    if (st.pin.box) {
      const b = st.pin.box;
      if (!b.moved && Math.hypot(e.clientX - b.x, e.clientY - b.y) < 4) return;
      b.moved = true;
      b.b = [x, y];
      draw();
      return;
    }
    // com as réguas ligadas, o que se arrasta gruda nas linhas guia
    if (st.gdrag) {
      const [sx, sy] = st.gdrag.mode !== 'spin' ? snapMouse(st.gdrag.sn, x, y, e) : [x, y];
      if (st.gdrag.mode === 'scale') scaleGroup(st.gdrag, sx, sy, e); else moveGroup(st.gdrag, sx, sy, e.shiftKey);
      return;
    }
    if (st.drag) {
      if (st.drag.mode === 'copy' && !startCopy(st.drag, e)) return;
      st.drag.alt = e.altKey;
      const [sx, sy] = snapMouse(st.drag.sn, x, y, e);
      if (st.drag.mode === 'scale') scaleShape(st.drag, sx, sy, e); else moveHandle(st.drag, sx, sy, e.shiftKey);
      return;
    }
    if (st.refDrag) { moveRef(st.refDrag, x, y); return; }
    // Seleção: o mouse andou depois de apertar numa forma, então é arraste (escolhe a forma, se ainda não era)
    if (st.vpress) {
      const v = st.vpress;
      if (Math.hypot(e.clientX - v.x, e.clientY - v.y) < 4) return;
      st.vpress = null;
      const at = { clientX: v.x, clientY: v.y, shiftKey: false };
      if (v.pick) pickShape(at);
      // Alt: a cópia nasce no lugar (logo abaixo da original no código, na frente dela) e é ela que anda
      let key = null;
      if (v.alt && groupOn()) { key = 'grupo' + Date.now(); if (!duplicateSel(key)) key = null; else hint('Levando uma cópia (Ctrl+D depois repete: cópias em fila).', 2400); }
      if (groupOn()) startGroup('move', at, null, key);
      if (st.gdrag) { const [sx, sy] = snapMouse(st.gdrag.sn, x, y, e); moveGroup(st.gdrag, sx, sy, e.shiftKey); }
      return;
    }
    if (st.marq) {
      const q = st.marq;
      if (!q.moved && Math.hypot(e.clientX - q.x, e.clientY - q.y) < 4) return;
      q.moved = true;
      q.b = [x, y];
      if (q.lasso) q.pts.push([x, y]);
      draw();
      return;
    }
    if (st.pan) {
      // uns pixels de tremida não são arraste: o clique continua sendo clique
      if (!st.pan.moved && Math.hypot(e.clientX - st.pan.x, e.clientY - st.pan.y) < 4) return;
      st.pan.moved = true;
      stage.classList.add('pan');
      st.view.auto = false;
      st.view.x = st.pan.vx + (e.clientX - st.pan.x);
      st.view.y = st.pan.vy + (e.clientY - st.pan.y);
      draw();
      return;
    }
    if (st.space || st.tool === 'hand') { view.style.cursor = 'grab'; return; }
    if (st.tool === 'zoom') { view.style.cursor = e.altKey ? 'zoom-out' : 'zoom-in'; return; }
    const ru = rulerAt(e);
    if (ru) { view.style.cursor = ru === 'top' ? 'ns-resize' : ru === 'left' ? 'ew-resize' : 'default'; return; }
    if (isFilm()) for (const f of filmHooks) { const c = f.cursor && f.cursor(e); if (c) { view.style.cursor = c; return; } }
    if (pinOn()) {
      // sob o mouse: de que forma é o ponto e a que osso está preso
      const here = pinsAt(e), hb = here.length ? null : hitBone(e);
      if (here.length) $('coords').textContent += ` · ${pinLabel(here)}`;
      view.style.cursor = here.length ? 'pointer' : hb ? (hb.mode === 'rot' ? 'alias' : 'move') : 'crosshair';
      return;
    }
    if (st.measure && !isFilm()) { view.style.cursor = measureEnd(e) ? 'move' : 'crosshair'; return; }
    const tk = !isFilm() && toolHooks[st.tool];
    if (tk) {
      if (tk.hover) tk.hover(e);
      const hi = tk.handles && pointsOn() ? hitHandle(e) : -1;
      view.style.cursor = hi >= 0 ? handleCursor(st.model.byLine.get(st.caret.line).handles[hi]) : tk.cursor ? tk.cursor(e) : 'crosshair';
      return;
    }
    const hb = hitBone(e), hg = hb ? null : hitGroup(e), hs = hb || hg ? null : hitScale(e), hi = hb || hg || hs ? -1 : hitHandle(e);
    const hgd = hb || hg || hs || hi >= 0 ? null : hitGuide(e);
    const hr = hb || hg || hs || hi >= 0 || hgd ? null : hitRef(e);
    view.style.cursor = hb ? (hb.mode === 'rot' ? 'alias' : 'move') : hg ? (hg === 'spin' ? 'alias' : hg.k ? scaleCursor(hg.k) : 'move') : hs ? scaleCursor(hs.k) : hi >= 0 ? handleCursor(st.model.byLine.get(st.caret.line).handles[hi]) : hgd ? (hgd.axis === 'v' ? 'ew-resize' : 'ns-resize') : hr ? (hr.mode === 'scale' ? 'nwse-resize' : 'move') : (e.ctrlKey || e.metaKey) && st.layout !== 'design' ? 'crosshair' : st.tool === 'text' ? 'text' : INSERT_TOOLS[st.tool] || st.tool === 'lasso' ? 'crosshair' : st.tool === 'wand' ? 'cell' : 'default';
  });

  const endPointer = () => { st.tdrag = null; st.vpress = null; st.marq = null; st.drag = null; st.gdrag = null; st.refDrag = null; st.pose = null; st.pan = null; st.guideDrag = null; st.mdrag = null; st.guideHot = null; st.pin.box = null; stage.classList.remove('pan'); draw(); };
  view.addEventListener('pointerup', (e) => {
    const p = st.pan, pb = st.pin.box, vp = st.vpress, mq = st.marq, gd = st.gdrag, td = st.tdrag, dg = st.drag;
    if (st.guideDrag) endGuide(st.guideDrag);
    // a transformação que o Ctrl+D repete
    if (gd && gd.done) st.lastXf = Object.assign({ copy: gd.copy }, gd.done);
    // no Medir, um clique sem arrastar tira a medida
    const mm = st.meas;
    if (st.mdrag && mm && mm.a[0] === mm.b[0] && mm.a[1] === mm.b[1]) st.meas = null;
    endPointer();
    if (dg && dg.mode === 'pull' && !dg.moved) toggleCorner(dg);
    if (td) td.up(e);
    if (pb) pinBoxEnd(pb, e);
    if (vp) pickShape(e);
    if (mq) { if (mq.moved) marqueeEnd(mq); else clickAt(e); }
    if (p && p.click && !p.moved) clickAt(e);
  });
  view.addEventListener('pointercancel', endPointer);

  // ---------- clique numa figura: o cursor do editor vai para a linha dela ----------
  let pickCtx = null;
  // as linhas das figuras sob o mouse, da de cima para a de baixo (cópia de um def: a linha do use)
  // as figuras sob o mouse, a de cima primeiro
  // as figuras que aparecem no desenho (e que o clique pega), de baixo para cima: fn(el, geometria)
  function eachShown(fn) {
    const m = pvModel() || st.model, pose = currentPose();
    for (const layer of S.orderLayers(m, pose)) {
      if (!S.layerVisible(layer, pose, { guides: st.show.guides })) continue;
      const lp = pose.lprops.get(layer.name);
      if (lp && (lp.show === 0 || lp.opacity === 0)) continue;
      let items = S.orderItems(layer.items, pose);
      if (layer.zsort && m.has3d) items = S.zSort(m, pose, items);
      for (const it of items) {
        const el = it.el, pr = S.propsOf(pose, el);
        if ((el.hidden && !pr.reveal) || pr.show === 0 || pr.opacity === 0) continue;
        const g = S.geometry(m, pose, el);
        if (g.segs.length) fn(el, g, layer, it.part);
      }
    }
  }
  function hitsAt(e) {
    if (!st.model || isFilm() || st.build) return [];
    const R = viewRect(), [x, y] = toCanvas(e), z = st.view.z;
    if (x < R.x || y < R.y || x > R.x + R.w || y > R.y + R.h) return [];
    const ctx = pickCtx || (pickCtx = document.createElement('canvas').getContext('2d'));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const hits = [];
    eachShown((el, g, layer, part) => {
      const path = S.pathOf(g), open = el.type === 'stroke' || el.type === 'line';
      // a borda conta, com uns pixels de folga (um traço fino também dá para pegar); o contorno que uma forma com
      // inkon= pinta em outra camada só pega pela borda
      ctx.lineWidth = (open ? el.w || 1 : el.ink || 0) + 10 / z;
      if ((!open && part !== 'ink' && ctx.isPointInPath(path, x, y)) || ctx.isPointInStroke(path, x, y)) hits.push(el);
    });
    return hits.reverse();
  }
  // a linha do código de uma figura (a cópia de um componente leva à linha do use)
  const lineOfEl = (el) => { const m = st.model, i = el.use !== undefined ? el.use : el.line; return m.lineMap ? m.lineMap[i] : i; };
  // A caixa de seleção e o Laço: as formas que eles tocam (um pedaço do contorno dentro). O contorno é lido em 16
  // pedaços retos por curva; na caixa, um pedaço que só a atravessa também conta. As camadas guia ficam de fora
  // (o clique ainda pega uma linha guia).
  function linesInArea(inside, cross) {
    const out = [];
    const at = (s, t) => { const u = 1 - t; return [u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6], u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7]]; };
    eachShown((el, g, layer) => {
      const line = lineOfEl(el);
      if (layer.guide || line === undefined || line < 0 || out.includes(line)) return;
      const hit = g.segs.some((s) => {
        let prev = null;
        for (let k = 0; k <= 16; k++) {
          const q = at(s, k / 16);
          if (inside(q[0], q[1]) || (cross && prev && cross(prev[0], prev[1], q[0], q[1]))) return true;
          prev = q;
        }
        return false;
      });
      if (hit) out.push(line);
    });
    return out;
  }
  // um pedaço reto passa pela caixa? (o recorte de Liang-Barsky)
  function segInRect(ax, ay, bx, by, r) {
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dy = by - ay;
    for (const [p, q] of [[-dx, ax - r.x0], [dx, r.x1 - ax], [-dy, ay - r.y0], [dy, r.y1 - ay]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const t = q / p;
      if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  }
  // o ponto está dentro do contorno do Laço? (o raio que cruza as bordas)
  function inPoly(P, x, y) {
    let inside = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // soltou a caixa (ou o Laço): escolhe o que ela tocou; Shift soma, Alt tira
  function marqueeEnd(q) {
    let inside, cross = null;
    if (q.lasso) {
      if (q.pts.length < 3) return;
      inside = (x, y) => inPoly(q.pts, x, y);
    } else {
      const r = { x0: Math.min(q.a[0], q.b[0]), y0: Math.min(q.a[1], q.b[1]), x1: Math.max(q.a[0], q.b[0]), y1: Math.max(q.a[1], q.b[1]) };
      inside = (x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
      cross = (ax, ay, bx, by) => segInRect(ax, ay, bx, by, r);
    }
    const sigs = nodeSigs(), hit = linesInArea(inside, cross).filter((l) => sigs.has(l) && selectable(l));
    const got = q.lasso ? hit : [...new Set(hit.flatMap(pickUnit))];
    const cur = [...st.sel.keys()];
    if (!cur.length && (q.add || q.sub)) cur.push(...selSet().keys());
    const next = q.sub ? cur.filter((l) => !got.includes(l)) : q.add ? [...new Set([...cur, ...got])] : got;
    if (!next.length) { deselect(); return; }
    next.sort((a, b) => a - b);
    setSel(next, next.includes(st.caret.line) ? st.caret.line : next[0]);
    if (next.length > 1) hint(`${next.length} formas escolhidas.`, 1600);
  }
  // pode ser escolhida pelo desenho? Não as travadas (lock) nem, no isolamento, as de fora do grupo
  const selectable = (line) => line >= 0 && !blockInfo().locked.has(line) && (!st.iso || groupIn(line, isoGroup()) !== undefined);

  // ---------- grupos e travas (etapa 3b): group nome … end e lock, lidos do código ----------
  // Só o editor usa os dois: o grupo junta linhas para escolher e mover juntas, e o lock não deixa escolher nem
  // arrastar pelo desenho (a imagem não muda). inner[i]: o grupo mais de dentro que tem a linha i (entre o group e
  // o end); locked: as linhas travadas (lock na própria linha, na camada ou num grupo de fora).
  let blockMemo = null;
  function blockInfo() {
    const v = editor.value;
    if (blockMemo && blockMemo.v === v) return blockMemo;
    const ls = v.split('\n'), groups = [], inner = [], locked = new Set(), stack = [];
    let layerLock = false;
    const top = () => { for (let k = stack.length - 1; k >= 0; k--) if (stack[k].g) return stack[k].g; return null; };
    ls.forEach((t, i) => {
      inner[i] = top();
      const w = L.splitLine(t).words, cmd = w[0] && w[0].text;
      if (!cmd) return;
      const flag = (f) => w.slice(1).some((x) => x.text === f), inDef = stack.some((b) => b.kind === 'def');
      if (cmd === 'group') {
        const name = w[1] && w[1].text !== 'lock' && L.IDENT.test(w[1].text) ? w[1].text : '';
        const g = { line: i, end: -1, name, lock: flag('lock'), parent: inner[i], inDef };
        groups.push(g);
        stack.push({ kind: cmd, g });
        return;
      }
      if (cmd === 'def' || cmd === 'repeat') { stack.push({ kind: cmd }); return; }
      if (cmd === 'end') { const b = stack.pop(); if (b && b.g) b.g.end = i; return; }
      if (inDef) return;
      if (cmd === 'layer') { layerLock = flag('lock'); return; }
      if (layerLock || stack.some((b) => b.g && b.g.lock) || (cmd !== 'ref' && flag('lock'))) locked.add(i);
    });
    // um group sem end (o código avisa) vai até o fim
    for (const g of groups) if (g.end < 0) g.end = ls.length;
    blockMemo = { v, groups, inner, locked };
    return blockMemo;
  }
  // o grupo do isolamento, achado de novo depois de editar o código (pela linha e pelo nome); se sumiu, sai
  function isoGroup() {
    if (!st.iso) return null;
    const gs = blockInfo().groups;
    const g = gs.find((x) => x.line === st.iso.line && x.name === st.iso.name) || (st.iso.name && gs.find((x) => x.name === st.iso.name));
    if (!g) { st.iso = null; return null; }
    st.iso.line = g.line;
    return g;
  }
  // visto de dentro de ctx (um grupo, ou null: a camada), o grupo mais de fora que tem a linha. null: a linha está
  // solta ali; undefined: a linha está fora de ctx
  function groupIn(line, ctx) {
    let g = blockInfo().inner[line] || null, top = null;
    while (g && g !== ctx) { top = g; g = g.parent; }
    return g === ctx ? top : undefined;
  }
  // as formas de um grupo que dá para escolher (sem as travadas)
  function groupNodes(g, sigs) {
    const B = blockInfo(), out = [];
    for (const l of (sigs || nodeSigs()).keys()) if (l > g.line && l < g.end && !B.locked.has(l)) out.push(l);
    return out.sort((a, b) => a - b);
  }
  // na Seleção (V), uma forma de um grupo leva o grupo inteiro (no isolamento, o grupo de dentro dele)
  function pickUnit(line) {
    if (st.tool !== 'select' || line < 0) return [line];
    const g = groupIn(line, isoGroup());
    if (!g) return [line];
    const ns = groupNodes(g);
    return ns.length ? ns : [line];
  }
  // As peças da escolha: um grupo com todas as formas escolhidas vira uma peça só, do group ao end (o mais de fora,
  // a partir do isolamento); as outras linhas são peças sozinhas. [{ a, b, g, parent }], na ordem do código
  function selUnits(lines) {
    const B = blockInfo(), set = new Set(lines), ctx = isoGroup(), sigs = nodeSigs(), full = new Map(), out = [], seen = new Set();
    const whole = (g) => {
      if (!full.has(g)) { const ns = groupNodes(g, sigs); full.set(g, ns.length > 0 && ns.every((n) => set.has(n))); }
      return full.get(g);
    };
    for (const l of [...set].sort((x, y) => x - y)) {
      const chain = [];
      for (let g = B.inner[l]; g && g !== ctx; g = g.parent) chain.unshift(g);
      const g = chain.find(whole) || null, a = g ? g.line : l;
      if (seen.has(a)) continue;
      seen.add(a);
      out.push({ a, b: g ? g.end : l, g, parent: g ? g.parent : B.inner[l] || null });
    }
    // um grupo de dentro de outro que também entrou inteiro já vai com ele
    return out.filter((u) => !out.some((o) => o !== u && o.g && o.a < u.a && u.b <= o.b)).sort((x, y) => x.a - y.a);
  }
  // duplo clique num grupo: entra nele; o resto do desenho fica apagado e parado
  function enterIso(g, line) {
    st.iso = { line: g.line, name: g.name };
    const u = pickUnit(line);
    setSel(u, line);
    hint(`Dentro do grupo ${g.name || '(sem nome)'}: só as formas dele se escolhem. Esc ou duplo clique fora sai.`, 3200);
  }
  // sai um nível (de um grupo de dentro, para o de fora); o grupo de onde saiu fica escolhido
  function exitIso() {
    const g = isoGroup();
    if (!g) return false;
    st.iso = g.parent ? { line: g.parent.line, name: g.parent.name } : null;
    const ns = groupNodes(g);
    if (ns.length) setSel(pickUnit(ns[0]), ns[0]); else deselect();
    hint(st.iso ? `De volta ao grupo ${st.iso.name || '(sem nome)'}.` : 'Fora do isolamento.', 1600);
    return true;
  }
  // Editar um símbolo (etapa 6b): o duplo clique num use (ou no painel Símbolos) leva o cursor para dentro do def
  // dele com a prévia ligada: o desenho mostra só o componente, em volta do 0,0, e as formas dele se mexem como
  // sempre. back: a linha do use (ou -1); Esc (ou duplo clique no vazio) volta para ela.
  function defLines(name) {
    const m = st.model, d = m && m.defs.get(name);
    if (!d) return null;
    const line = m.lineMap ? m.lineMap[d.st.line] : d.st.line, ls = editor.value.split('\n');
    if (!new RegExp(`^\\s*def\\s+${name}(?![\\w-])`).test(ls[line] || '')) return null;
    let depth = 0, end = -1;
    for (let i = line; i < ls.length; i++) {
      const w = (/^\s*([A-Za-z_]\w*)/.exec(ls[i]) || [])[1];
      if (w === 'def' || w === 'repeat' || w === 'group') depth++;
      else if (w === 'end' && --depth === 0) { end = i; break; }
    }
    return { line, end };
  }
  function enterDef(name, back) {
    if (isFilm()) return false;
    const at = defLines(name);
    if (!at) { hint(`O def ${name} vem de outro arquivo (include): abra o arquivo dele para mudar.`, 3000); return false; }
    if (st.symIso.some((s) => s.name === name)) { hint(`O símbolo ${name} já está aberto.`, 2000); return false; }
    const k = pvKey(name);
    st.symIso.push({ name, back, had: pv.mode.has(k), was: pv.mode.get(k) });
    pv.mode.set(k, true);
    st.iso = null;
    // o cursor vai para a primeira linha de dentro (o def vazio: a linha dele)
    const first = at.end > at.line + 1 ? at.line + 1 : at.line;
    st.sel = new Map();
    editor.reveal(first, /^\s*/.exec(editor.value.split('\n')[first])[0].length);
    deselect();
    reparse();
    hint(`Dentro do símbolo ${name}: o desenho mostra só ele, e a cruz é o 0,0 (o ponto que vai para o x,y do use). Mexa nas formas como sempre; Esc ou duplo clique no vazio volta.`, 4200);
    return true;
  }
  // sai do símbolo aberto (o de mais dentro); false se não há (ou se o cursor já saiu dele por outro caminho)
  function exitDef() {
    const s = st.symIso[st.symIso.length - 1], d = caretDef();
    if (!s) return false;
    if (!d || d.name !== s.name) { st.symIso = []; return false; }
    st.symIso.pop();
    const k = pvKey(s.name);
    if (s.had) pv.mode.set(k, s.was); else pv.mode.delete(k);
    // o use de onde se entrou (se as linhas mudaram de número lá dentro, o use desse símbolo mais perto dela)
    let back = s.back;
    const isUse = (l) => { const r = l >= 0 ? st.model.byLine.get(l) : null; return !!(r && r.use === s.name); };
    if (back >= 0 && !isUse(back)) {
      let best = -1;
      for (const [l, r] of st.model.byLine) if (r.use === s.name && (best < 0 || Math.abs(l - s.back) < Math.abs(best - s.back))) best = l;
      back = best;
    }
    if (isUse(back)) setSel([back], back);
    else { editor.reveal(defLines(s.name) ? defLines(s.name).line : st.caret.line, 0); deselect(); }
    reparse();
    hint(st.symIso.length ? `De volta ao símbolo ${st.symIso[st.symIso.length - 1].name}.` : `Fora do símbolo ${s.name}.`, 1800);
    return true;
  }
  function drawMarq(ctx, z) {
    const q = st.marq;
    ctx.save();
    ctx.beginPath();
    if (q.lasso) { q.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); } else ctx.rect(Math.min(q.a[0], q.b[0]), Math.min(q.a[1], q.b[1]), Math.abs(q.b[0] - q.a[0]), Math.abs(q.b[1] - q.a[1]));
    ctx.fillStyle = 'rgba(92,198,212,.08)';
    ctx.fill();
    ctx.lineWidth = 1 / z;
    ctx.strokeStyle = '#14141c';
    ctx.stroke();
    ctx.setLineDash([4 / z, 3 / z]);
    ctx.strokeStyle = '#5cc6d4';
    ctx.stroke();
    ctx.restore();
  }
  // as linhas das figuras sob o mouse (a cópia de um componente leva à linha do use)
  function linesAt(e) {
    const out = [];
    for (const el of hitsAt(e)) {
      const line = lineOfEl(el);
      if (line !== undefined && line >= 0 && !out.includes(line) && selectable(line)) out.push(line);
    }
    return out;
  }
  // clicar de novo no mesmo lugar pega a figura de baixo (e depois volta para a de cima)
  function pickShape(e) {
    const lines = linesAt(e);
    if (!lines.length) { st.pick = null; if (!e.shiftKey) deselect(); return; }
    // Shift+clique: soma a forma à escolha do painel das camadas (ou tira, se já estava)
    if (e.shiftKey) {
      const line = lines[0], cur = [...st.sel.keys()], unit = pickUnit(line);
      if (!cur.length && nodeSigs().has(st.caret.line) && selectable(st.caret.line)) cur.push(...pickUnit(st.caret.line));
      const next = unit.every((l) => cur.includes(l)) ? cur.filter((l) => !unit.includes(l)) : [...new Set([...cur, ...unit])];
      setSel(next, next.length === 1 ? next[0] : next.includes(line) ? line : st.caret.line);
      if (next.length > 1) hint(`${next.length} formas escolhidas: arraste uma delas para mover todas, a bolinha verde para girar.`, 2600);
      return;
    }
    const p = st.pick, same = p && Math.hypot(p.x - e.clientX, p.y - e.clientY) < 6 && p.lines.join() === lines.join();
    const k = same ? (p.k + 1) % lines.length : 0;
    st.pick = { x: e.clientX, y: e.clientY, lines, k };
    // o código mostra o começo da linha (o foco continua no desenho)
    const line = lines[k];
    editor.reveal(line, 0);
    // a forma clicada vira a escolha do painel (só ela; na Seleção, o grupo dela inteiro)
    const unit = nodeSigs().has(line) ? pickUnit(line) : [];
    setSel(unit, line);
    st.selAnchor = line;
    const g = unit.length > 1 ? groupIn(line, isoGroup()) : null;
    if (g && lines.length < 2) hint(`Grupo ${g.name || '(sem nome)'}: ${unit.length} formas. Duplo clique entra nele; a Seleção direta (A) pega uma forma só.`, 2600);
    else if (lines.length > 1) hint(`${k + 1} de ${lines.length} figuras aqui: clique de novo no mesmo lugar para pegar a de baixo.`, 2600);
  }
  // escolher uma linha de fora do desenho (a vista Camadas em 3D): como o clique; add (Shift) soma ou tira
  function pickLine(line, add) {
    if (add) {
      const cur = [...st.sel.keys()];
      if (!cur.length && nodeSigs().has(st.caret.line)) cur.push(st.caret.line);
      const next = cur.includes(line) ? cur.filter((l) => l !== line) : [...cur, line];
      setSel(next, next.length === 1 ? next[0] : st.caret.line);
      return;
    }
    editor.reveal(line, 0);
    setSel(nodeSigs().has(line) ? pickUnit(line) : [], line);
    st.selAnchor = line;
  }
  view.addEventListener('pointerleave', () => { if (!st.drag && !st.pan) $('coords').textContent = ''; });

  // ---------- para o painel Propriedades (js/ui-props.js) ----------
  // as linhas que o painel mostra: as escolhidas ou, sem escolha, a forma (ou a camada) da linha do cursor
  function propTargets() {
    if (!st.model || isFilm()) return [];
    if (st.sel.size) return [...st.sel.keys()].sort((a, b) => a - b);
    const line = st.caret.line, rec = st.model.byLine.get(line);
    if (st.none === line) return [];
    if (nodeSigs().has(line) || (rec && rec.layer && !rec.layer.implicit)) return [line];
    return [];
  }
  // A caixa das linhas (sem a grossura do contorno), nas coordenadas do desenho.
  function boxOf(lines) {
    const m = selModel(), pose = currentPose(), set = new Set(lines);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const t of layerTree(m)) for (const k of t.kids) {
      if (!set.has(k.line)) continue;
      for (const el of k.els) {
        const g = S.geometry(m, pose, el);
        if (g.segs.length) { const b = tightBox(g.segs); add(b.x0, b.y0); add(b.x1, b.y1); } else if (el.at) add(el.at[0], el.at[1]);
      }
    }
    return x0 > x1 ? null : { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  // Troca, põe ou tira atributos (attrs: { chave: valor, ou null para tirar }) e palavras soltas (flags: { bold: true })
  // nas linhas, numa edição só. O que entra vai depois da última palavra antes do ":" (ou do comentário).
  function setAttrs(lines, attrs, flags, key) {
    const out = new Map();
    const cut = (text, a, b) => { while (a > 0 && /[ \t]/.test(text[a - 1])) a--; return [a, b, '']; };
    for (const line of lines) {
      const text = lineOf(line), ws = L.splitLine(text).words;
      if (!ws.length) continue;
      const ed = [], end = ws[ws.length - 1].to;
      let tail = '';
      for (const [k, v] of Object.entries(attrs || {})) {
        const w = ws.slice(1).find((t) => t.text.startsWith(k + '='));
        if (v === null || v === undefined || v === '') { if (w) ed.push(cut(text, w.from, w.to)); } else if (w) ed.push([w.from + k.length + 1, w.to, String(v)]);
        else tail += ` ${k}=${v}`;
      }
      for (const [f, on] of Object.entries(flags || {})) {
        const w = ws.slice(1).find((t) => t.text === f);
        if (on && !w) tail += ' ' + f;
        else if (!on && w) ed.push(cut(text, w.from, w.to));
      }
      if (tail) ed.push([end, end, tail]);
      ed.sort((a, b) => b[0] - a[0]);
      let t = text;
      for (const [a, b, x] of ed) t = t.slice(0, a) + x + t.slice(b);
      if (t !== text) out.set(line, t);
    }
    if (out.size) writeLines(out, key || 'props' + Date.now());
    return out.size;
  }
  // troca uma palavra da linha (pela posição: 1 = a que vem depois do comando) por outro texto
  function setWord(line, i, txt, key) {
    const text = lineOf(line), w = L.splitLine(text).words[i];
    if (!w || w.text === txt) return false;
    writeLines(new Map([[line, text.slice(0, w.from) + txt + text.slice(w.to)]]), key || 'props' + Date.now());
    return true;
  }
  // Mover, esticar e girar as linhas por número (o painel Propriedades), com as mesmas contas da caixa da escolha:
  // move { dx, dy }, scale { sx, sy } a partir de um ponto da caixa (fx, fy: de 0 a 1; sem eles, o canto de cima à
  // esquerda), spin { deg } em volta do meio. Vira a transformação que o Ctrl+D repete.
  function transformLines(lines, mode, o, key) {
    if (st.anim) { hint('Para mudar a posição ou o tamanho, escolha "pose parada" no player.', 2600); return 0; }
    const plans = lines.map(editPlan);
    if (mode === 'scale') for (const p of plans) if (!p.why) p.noScale = scaleInfo(p);
    const stop = (p) => p.why || (mode === 'spin' && p.noSpin) || (mode === 'scale' && p.noScale) || '';
    const ok = plans.filter((p) => !stop(p));
    if (!ok.length) { if (plans.length) hint(`Isto não muda pelo painel: ${stop(plans[0])}.`, 3000); return 0; }
    const b = boxOf(lines);
    if (!b) return 0;
    const dec = st.view.z > 3 ? 1 : 0, out = new Map();
    for (const p of ok) {
      if (mode === 'move') {
        const a = localOf(p.rec, p.ref, b.x0, b.y0), c = localOf(p.rec, p.ref, b.x0 + o.dx, b.y0 + o.dy);
        if (a && c) out.set(p.line, planText(p, (x, y) => [x + c[0] - a[0], y + c[1] - a[1]], 0, dec));
      } else if (mode === 'spin') {
        const c = localOf(p.rec, p.ref, b.cx, b.cy);
        if (c) out.set(p.line, planText(p, (x, y) => turn(c[0], c[1], o.deg, x, y), o.deg, dec));
      } else {
        const W = Math.max(1e-6, b.x1 - b.x0), H = Math.max(1e-6, b.y1 - b.y0);
        const q = localOf(p.rec, p.ref, b.x0, b.y0), u = localOf(p.rec, p.ref, b.x0 + W, b.y0), v = localOf(p.rec, p.ref, b.x0, b.y0 + H);
        const qa = localOf(p.rec, p.ref, b.x0 + (o.fx || 0) * W, b.y0 + (o.fy || 0) * H);
        if (!q || !u || !v || !qa) continue;
        const J = [(u[0] - q[0]) / W, (v[0] - q[0]) / H, (u[1] - q[1]) / W, (v[1] - q[1]) / H], det = J[0] * J[3] - J[1] * J[2];
        if (Math.abs(det) < 1e-12) continue;
        const i0 = J[3] / det, i1 = -J[1] / det, i2 = -J[2] / det, i3 = J[0] / det, sx = o.sx, sy = o.sy;
        const T = [J[0] * sx * i0 + J[1] * sy * i2, J[0] * sx * i1 + J[1] * sy * i3, J[2] * sx * i0 + J[3] * sy * i2, J[2] * sx * i1 + J[3] * sy * i3];
        const kx = p.rec.xf ? Math.sqrt(Math.abs(M.det(p.rec.xf))) : 1;
        out.set(p.line, scaleText(p, T, qa, kx > 1.5 || st.view.z > 3 ? 1 : 0));
      }
    }
    if (out.size) {
      writeLines(out, key || 'props' + Date.now());
      st.lastXf = mode === 'move' ? { mode, dx: o.dx, dy: o.dy, copy: false } : mode === 'spin' ? { mode, deg: o.deg, copy: false } : { mode, sx: o.sx, sy: o.sy, fx: o.fx || 0, fy: o.fy || 0, copy: false };
    }
    const left = plans.length - ok.length;
    if (left) hint(`${left} ${left > 1 ? 'linhas ficam paradas' : 'linha fica parada'}: ${stop(plans.find(stop))}.`, 3200);
    return out.size;
  }

  const handleCursor = (h) => (h.kind === 'size' ? (h.axis === 'x' ? 'ew-resize' : h.axis === 'y' ? 'ns-resize' : 'nwse-resize') : h.kind === 'round' ? 'ew-resize' : h.kind === 'fsize' ? (h.align === 'right' ? 'nwse-resize' : 'nesw-resize') : h.kind === 'rot' ? 'alias' : h.kind === 'mid' ? 'copy' : 'move');

  // bolinha do meio de um lado: escreve um ponto ali (logo depois do ponto idx) e já começa a arrastá-lo;
  // inserir e arrastar ficam num Ctrl+Z só
  function addPoint(h) {
    if (st.playing || (!isFilm() && st.anim)) { hint(isFilm() ? 'Pause o player para criar pontos.' : 'Para criar pontos, escolha "pose parada" no player.', 2600); return; }
    const line = st.caret.line, off = editor.lineStart(line), dec = st.view.z > 3 ? 1 : 0, key = 'drag' + Date.now();
    // num trecho curvo, o ponto novo divide a curva sem mudar o desenho (as pontas ganham alças); num reto, entra solto
    const r0 = st.model.byLine.get(line), ed = r0 ? splitEdits(r0, h, line) : null;
    if (ed) {
      const text = lineOf(line);
      let out = text;
      for (const [a, b, t] of ed.slice().sort((x, y) => y[0] - x[0] || y[1] - x[1])) out = out.slice(0, a) + t + out.slice(b);
      // o cursor vai para o fim do x,y do ponto novo (ele fica laranja): onde ele entrou, mais o que mudou antes
      const ins = ed[1];
      let caret = ins[0] + ins[2].indexOf('~');
      for (const x of [ed[0], ed[2]]) if (x[0] < ins[0]) caret += x[2].length - (x[1] - x[0]);
      editor.replaceRange(off, off + text.length, out, { key, select: [off + caret, off + caret] });
    } else {
      const txt = ` ${fmtN(h.x, dec)},${fmtN(h.y, dec)}${h.corner ? '!' : ''}`, at = off + h.at;
      editor.replaceRange(at, at, txt, { key, select: [at + txt.length, at + txt.length] });
    }
    const rec = st.model.byLine.get(line), hi = rec ? rec.handles.findIndex((q) => q.kind === 'pt' && q.idx === h.idx + 1) : -1;
    if (hi < 0) return;
    hint(ed ? 'Ponto novo, sem mudar a curva (as alças vieram de como ela estava): arraste para onde quiser.' : 'Ponto novo: arraste para onde quiser. Duplo clique nele liga o canto vivo (!).', 2600);
    st.drag = { line, hi, key, mode: null, idx: h.idx + 1 };
    view.style.cursor = 'move';
  }

  // Delete (ou Backspace) com o foco no desenho: apaga o ponto escolhido (o laranja, o do cursor) e o espaço
  // antes dele. Depois, nenhum ponto fica escolhido: outro Delete não apaga o vizinho.
  function deletePoint() {
    const m = st.model;
    if (!m || !pointsOn() || st.build || groupOn()) return false;
    const line = st.caret.line, rec = m.byLine.get(line), hi = activeHandle(rec), h = hi >= 0 ? rec.handles[hi] : null;
    if (!h || h.kind !== 'pt') return false;
    if (st.playing || (!isFilm() && st.anim)) { hint(isFilm() ? 'Pause o player para apagar pontos.' : 'Para apagar pontos, escolha "pose parada" no player.', 2600); return true; }
    if (h.fixed) { hint('Este ponto vem de uma {expressão}: apague no código.', 2800); return true; }
    const n = rec.handles.filter((q) => q.kind === 'pt').length, min = rec.el && rec.el.limb ? 0 : rec.st.cmd === 'shape' ? 3 : 2;
    if (n <= min) { hint(`${rec.st.cmd} precisa de pelo menos ${min} pontos: este não dá para apagar.`, 2800); return true; }
    const text = lineOf(line), off = editor.lineStart(line);
    let a = h.from, b = h.tokEnd || h.end;
    while (a > 0 && /[ \t]/.test(text[a - 1])) a--;
    if (a === h.from) while (b < text.length && /[ \t]/.test(text[b])) b++;
    editor.replaceRange(off + a, off + b, '', { select: [off, off] });
    hint(`Ponto ${h.idx + 1} apagado (Ctrl+Z desfaz).`, 2400);
    return true;
  }

  // duplo clique num ponto: liga/desliga o canto vivo (!); num ponto com alça de curva (ou na alça), tira a alça
  view.addEventListener('dblclick', (e) => {
    // duplo clique no quadradinho do canto das réguas: apaga as linhas guia deste arquivo
    const ru = rulerAt(e);
    if (ru === 'corner') { clearGuides(); return; }
    const hgk = hitGroup(e);
    if (ru || (st.measure && !isFilm()) || hitScale(e) || (hgk && hgk.k)) return;
    // a Caneta e a Curvatura usam o duplo clique para elas
    const tkd = !isFilm() && toolHooks[st.tool];
    if (tkd && tkd.dbl) { tkd.dbl(e); return; }
    // na Seleção: duplo clique num use (solto, ou dentro do símbolo aberto) entra no def dele (etapa 6b)
    if (st.tool === 'select' && !isFilm()) {
      const l = linesAt(e)[0], rec = l !== undefined ? st.model.byLine.get(l) : null;
      if (rec && rec.use && selectable(l) && (pvModel() || groupIn(l, isoGroup()) === null)) { enterDef(rec.use, l); return; }
      if (l === undefined && st.symIso.length && pvModel()) { exitDef(); return; }
    }
    // na Seleção: duplo clique numa forma de um grupo entra nele (isolamento); no vazio, sai
    if (st.tool === 'select' && !isFilm() && !pvModel()) {
      const l = linesAt(e)[0], g = l === undefined ? null : groupIn(l, isoGroup());
      if (g) { enterIso(g, l); return; }
      if (l === undefined && st.iso) { exitIso(); return; }
    }
    const hi = hitHandle(e);
    const rec = st.model.byLine.get(st.caret.line);
    const h0 = hi >= 0 && rec ? rec.handles[hi] : null;
    // nas letras de um texto (fora das alças de ponto e de giro): editar o texto ali mesmo
    if (!h0 || !['rot', 'pt', 'tan'].includes(h0.kind)) {
      const el = hitsAt(e).find((x) => selectable(lineOfEl(x)));
      if (el && el.type === 'text') editText(el);
      return;
    }
    if (st.anim && !isFilm()) return;
    // na alça de giro: volta a rot=0
    if (h0.kind === 'rot') { if (!h0.pts && !h0.fixed && !h0.insert) writeTok(st.caret.line, h0.from, h0.to, '0'); return; }
    if (h0.auto) return;
    const h = h0.kind === 'tan' ? rec.handles.find((q) => q.kind === 'pt' && q.idx === h0.idx) : h0;
    if (!h || h.kind !== 'pt' || h.fixed) return;
    const off = editor.lineStart(st.caret.line);
    // na alça quebrada (~a~b): os dois lados juntos de novo, com o lado do clique
    if (h0.kind === 'tan' && h.tin) {
      const v = h0.side === 'in' ? h.tin : h.tan, xy = lineOf(st.caret.line).slice(h.from, h.to), t = `${xy}~${fmtN(v[0], 1)},${fmtN(v[1], 1)}`;
      editor.replaceRange(off + h.from, off + h.end, t, { select: [off + h.from + t.length, off + h.from + t.length] });
      hint('As duas alças juntas de novo (~dx,dy). Duplo clique outra vez tira a alça.', 2400);
      return;
    }
    if (h.tan) { editor.replaceRange(off + h.to, off + h.end, '', { select: [off + h.to, off + h.to] }); return; }
    const txt = editor.value.slice(off + h.from, off + h.to).replace(/!$/, '') + (h.corner ? '' : '!');
    editor.replaceRange(off + h.from, off + h.to, txt, { select: [off + h.from + txt.length, off + h.from + txt.length] });
  });

  // ---------- duplo clique num texto: editar as letras ali mesmo ----------
  // Uma caixinha por cima do texto com o que está entre aspas. Enter (ou clicar fora) grava; Esc desiste.
  // As aspas (") viram ” : o texto do Weasel vai entre aspas, e uma aspa no meio fecharia o texto.
  let textEd = null, textMeasure = null;
  // as aspas do text na linha do editor (null se a linha não é um text com "…")
  function textToken(line) {
    const sp = L.splitLine(lineOf(line));
    if (!sp.words.length || sp.words[0].text !== 'text') return null;
    const q = sp.words.slice(1).find((w) => w.text[0] === '"');
    return q && q.text.length >= 2 && q.text.endsWith('"') ? q : null;
  }
  function editText(el) {
    const m = st.model, line = m.lineMap ? m.lineMap[el.line] : el.line;
    const tok = line !== undefined && line >= 0 ? textToken(line) : null;
    if (!tok || tok.text.slice(1, -1) !== el.str) { hint('Este texto vem de outra linha (mirror=) ou de outro arquivo: mude as letras lá no código.', 3000); return; }
    editor.reveal(line, tok.to);
    // onde as letras estão na tela: a caixa do texto (com giro, osso e componente) e o tamanho da letra na tela
    const g = S.geometry(m, currentPose(), el), z = st.view.z;
    const xs = g.segs.flatMap((sg) => [sg[0], sg[6]]), ys = g.segs.flatMap((sg) => [sg[1], sg[7]]);
    const b = S.textBox(el), s0 = g.segs[0], scale = b.w > 0 && s0 ? Math.hypot(s0[6] - s0[0], s0[7] - s0[1]) / b.w : 1;
    const inp = $('textEdit'), stage = $('stage').getBoundingClientRect();
    const px = Math.min(72, Math.max(13, el.size * scale * z));
    inp.style.font = S.textFont(Object.assign({}, el, { size: Math.round(px) }));
    inp.value = el.str;
    const left = Math.max(4, Math.min(stage.width - 80, Math.min(...xs) * z + st.view.x - 6));
    const top = Math.max(4, Math.min(stage.height - px - 16, Math.min(...ys) * z + st.view.y - 4));
    inp.style.left = left + 'px';
    inp.style.top = top + 'px';
    inp.dataset.max = Math.max(80, stage.width - left - 8);
    textEd = { line };
    inp.hidden = false;
    fitTextEd();
    inp.focus();
    inp.select();
    hint('Escreva o texto novo: Enter grava, Esc desiste.', 2600);
  }
  function fitTextEd() {
    const inp = $('textEdit');
    textMeasure = textMeasure || document.createElement('canvas').getContext('2d');
    textMeasure.font = inp.style.font;
    inp.style.width = Math.min(+inp.dataset.max, Math.max(80, textMeasure.measureText(inp.value + 'MM').width + 16)) + 'px';
  }
  function closeTextEd(save, refocus) {
    const t = textEd, inp = $('textEdit');
    if (!t) return;
    textEd = null;
    inp.hidden = true;
    const tok = save ? textToken(t.line) : null;
    const v = inp.value.replace(/[\r\n]+/g, ' ').replace(/"/g, '”');
    if (tok && v !== tok.text.slice(1, -1)) {
      const off = editor.lineStart(t.line), end = off + tok.from + v.length + 2;
      editor.replaceRange(off + tok.from, off + tok.to, `"${v}"`, { select: [end, end] });
      hint(v ? `Texto novo: "${v}" (Ctrl+Z desfaz).` : 'Texto vazio: escreva entre as aspas no código.', 2400);
    }
    // o foco volta para o desenho (a caixinha some e o foco fica no corpo da página), não para o código
    if (refocus && document.activeElement === inp) inp.blur();
  }
  $('textEdit').addEventListener('input', fitTextEd);
  $('textEdit').addEventListener('keydown', (e) => {
    // as teclas ficam na caixinha: Espaço não toca o player, Ctrl+Z não desfaz o código
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); closeTextEd(true, true); } else if (e.key === 'Escape') { e.preventDefault(); closeTextEd(false, true); }
  });
  $('textEdit').addEventListener('focusout', () => closeTextEd(true, false));

  // ---------- as alças de curva (etapa 4b): ~d inteira, ~a~b quebrada (a chegada e a saída) ----------
  // o texto das alças de um ponto: só uma (a de uma ponta de traço aberto), as duas iguais (~d) ou quebradas (~a~b)
  function handText(a, b, dec) {
    const f = (v) => `${fmtN(v[0], dec)},${fmtN(v[1], dec)}`;
    if (!a && !b) return '';
    if (!a || !b) return `~${f(a || b)}`;
    const fa = f(a), fb = f(b);
    return fa === fb ? `~${fb}` : `~${fa}~${fb}`;
  }
  // Arrastar uma alça. side: 'in' (a de chegada, em x-a) ou 'out' (a de saída, em x+b). Na inteira, os dois lados
  // andam juntos; Alt (ou o Ponto de ancoragem) quebra e mexe só um lado. Na quebrada e na automática, o lado
  // arrastado anda, e o outro acompanha a direção se os dois estavam na mesma reta (ponto liso), sem mudar de
  // tamanho; com Alt, fica onde estava. Com Shift, de 45 em 45 graus. Solto em cima do ponto: aquele lado some.
  function moveTan(d, rec, x, y, snap) {
    const p = rec.handles.find((q) => q.kind === 'pt' && q.idx === d.idx);
    if (!p) { st.drag = null; return; }
    const l = localOf(rec, p, x, y);
    if (!l) return;
    const k = rec.xf ? Math.sqrt(Math.abs(M.det(rec.xf))) : 1, dec = k > 1.5 ? 1 : 0;
    let v = d.side === 'in' ? [p.x - l[0], p.y - l[1]] : [l[0] - p.x, l[1] - p.y];
    if (snap) { const len = Math.hypot(v[0], v[1]), t = Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)) * (Math.PI / 4); v = [Math.cos(t) * len, Math.sin(t) * len]; }
    const near = Math.hypot(v[0], v[1]) * k * st.view.z < 6, xy = lineOf(d.line).slice(p.from, p.to).replace(/!$/, '');
    const brk = d.alt || d.anchor || !d.sym;
    let txt;
    if (!brk) txt = near ? xy : xy + handText(null, v, dec);
    else {
      if (near) v = [0, 0];
      let o = d.side === 'in' ? d.b0 : d.a0;
      if (o && d.col && !d.alt && !d.anchor && !near) {
        const lo = Math.hypot(o[0], o[1]), lv = Math.hypot(v[0], v[1]);
        if (lv > 1e-6) o = [(v[0] / lv) * lo, (v[1] / lv) * lo];
      }
      const a = d.side === 'in' ? v : o, b = d.side === 'in' ? o : v;
      txt = near && (!o || Math.hypot(o[0], o[1]) < 1e-6) ? xy + (o ? '!' : '') : xy + handText(a, b, dec);
    }
    d.moved = true;
    writeTok(d.line, p.from, p.end, txt, d.key);
  }
  // Alt+arrastar um ponto (Seleção direta): no primeiro movimento, a forma ganha uma cópia logo abaixo dela no
  // código (na frente), e é a cópia que anda inteira (um Ctrl+Z desfaz as duas coisas)
  function startCopy(d, e) {
    if (Math.hypot(e.clientX - d.cx, e.clientY - d.cy) < 4) return false;
    if (!duplicateSel(d.key)) { st.drag = null; return false; }
    const rec = st.model.byLine.get(st.caret.line), hi = rec ? rec.handles.findIndex((q) => q.kind === 'pt' && q.idx === d.idx) : -1;
    if (hi < 0) { st.drag = null; return false; }
    const h = rec.handles[hi];
    Object.assign(d, { line: st.caret.line, hi, mode: 'move', orig: [] });
    for (const q of rec.handles) if (q.kind === 'pt') d.orig[q.idx] = { x: q.x, y: q.y, tan: q.tan, tin: q.tin };
    const [px, py] = toCanvas({ clientX: d.cx, clientY: d.cy });
    d.l0 = localOf(rec, h, px, py);
    d.sn = snapPlan(rec, h, hi, 'move', { clientX: d.cx, clientY: d.cy });
    hint('Levando uma cópia da forma (Alt+arrastar). Para puxar alças, use o Ponto de ancoragem (Shift+C).', 2600);
    return true;
  }
  // o clique do Ponto de ancoragem num ponto: com alça ou liso vira canto (!); o canto vira liso
  function toggleCorner(d) {
    const rec = st.model && st.model.byLine.get(d.line), p = rec && rec.handles.find((q) => q.kind === 'pt' && q.idx === d.idx);
    if (!p || p.fixed) return;
    const xy = lineOf(d.line).slice(p.from, p.to).replace(/!$/, ''), corner = p.tan || !p.corner;
    writeTok(d.line, p.from, p.end, xy + (corner ? '!' : ''), 'canto' + Date.now());
    hint(corner ? 'Canto vivo (!). Clique de novo: liso; arraste o ponto para puxar alças.' : 'Ponto liso (a curva automática). Clique de novo: canto vivo.', 2400);
  }
  // Ponto novo sem mudar o desenho (De Casteljau): o trecho entre os pontos i e i+1 se divide no meio, e as duas
  // pontas ganham as alças de como a curva já estava. Num trecho reto (entre dois cantos), na line, ou com
  // {contas} nas pontas, devolve null (o ponto novo entra solto, como antes).
  function splitEdits(rec, h, line) {
    const el = rec.el;
    if (!el || el.type === 'line' || el.limb) return null;
    const hp = rec.handles.filter((q) => q.kind === 'pt').sort((a, b) => a.idx - b.idx), n = hp.length;
    if (n < 2) return null;
    const i = h.idx, j = (i + 1) % n, P = hp[i], Q = hp[j];
    if (!P || !Q || P.fixed || Q.fixed) return null;
    const segs = W.geom.smoothSegs(hp.map((q) => ({ x: q.x, y: q.y, corner: q.corner, tan: q.tan, tin: q.tin })), el.closed, el.smooth);
    const s = segs[i];
    if (!s) return null;
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    if (near(s[2], s[0] + (s[6] - s[0]) / 3) && near(s[3], s[1] + (s[7] - s[1]) / 3) && near(s[4], s[6] - (s[6] - s[0]) / 3) && near(s[5], s[7] - (s[7] - s[1]) / 3)) return null;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const P0 = [s[0], s[1]], P1 = [s[2], s[3]], P2 = [s[4], s[5]], P3 = [s[6], s[7]];
    const p01 = mid(P0, P1), p12 = mid(P1, P2), p23 = mid(P2, P3), a = mid(p01, p12), b = mid(p12, p23), m = mid(a, b);
    const sIn = el.closed || i > 0 ? segs[(i - 1 + n) % n] : null, sOut = el.closed || j < n - 1 ? segs[j] : null;
    const pIn = sIn && sIn !== s ? [P0[0] - sIn[4], P0[1] - sIn[5]] : null, qOut = sOut && sOut !== s ? [sOut[2] - P3[0], sOut[3] - P3[1]] : null;
    const text = lineOf(line);
    const xyOf = (q) => text.slice(q.from, q.to).replace(/!$/, ''), D = 1;
    return [
      [P.from, P.end, xyOf(P) + handText(pIn, [p01[0] - P0[0], p01[1] - P0[1]], D)],
      [P.tokEnd || P.end, P.tokEnd || P.end, ` ${fmtN(m[0], D)},${fmtN(m[1], D)}${handText([m[0] - a[0], m[1] - a[1]], [b[0] - m[0], b[1] - m[1]], D)}`],
      [Q.from, Q.end, xyOf(Q) + handText([P3[0] - p23[0], P3[1] - p23[1]], qOut, D)],
    ];
  }

  // Arrastar: posição do mouse → coordenadas do código (dentro de um componente, as dele).
  function moveHandle(d, x, y, snap) {
    const rec = st.model.byLine.get(d.line);
    if (rec && d.mode === 'tan') { moveTan(d, rec, x, y, snap); return; }
    const h = rec && rec.handles[d.hi];
    if (!h) { st.drag = null; return; }
    if (h.kind === 'dir') { moveDir(d, h, x, y, snap); return; }
    if (h.grad) { moveGrad(d, rec, h, x, y, snap); return; }
    if (h.kind === 'rot') { spinShape(d, rec, h, x, y, snap); return; }
    // a alça de curva é achada pelo número do ponto: aparece e some enquanto você arrasta
    const p = d.mode === 'pull' ? rec.handles.find((q) => q.kind === 'pt' && q.idx === d.idx) : h;
    if (!p) { st.drag = null; return; }
    const l = localOf(rec, p, x, y);
    if (!l) return;
    const [lx, ly] = l;
    const k = rec.xf ? Math.sqrt(Math.abs(M.det(rec.xf))) : 1;
    const dec = k > 1.5 ? 1 : 0;
    if (d.mode === 'move') { if (d.l0) moveAll(d, rec, lx - d.l0[0], ly - d.l0[1], dec); return; }
    if (d.mode === 'pull') {
      // perto do ponto (menos de 6 pixels na tela): sem alça, e o ponto volta a ser como era (canto vivo ou não)
      const tx = lx - p.x, ty = ly - p.y, xy = lineOf(d.line).slice(p.from, p.to).replace(/!$/, '');
      if (Math.hypot(tx, ty) * k * st.view.z >= 6) d.moved = true;
      writeTok(d.line, p.from, p.end, Math.hypot(tx, ty) * k * st.view.z < 6 ? xy + (d.corner ? '!' : '') : `${xy}~${fmtN(tx, dec)},${fmtN(ty, dec)}`, d.key);
      return;
    }
    if (h.kind === 'size') { writeTok(d.line, h.from, h.to, sizeText(h, d.orig, lx, ly, snap, dec), d.key); return; }
    if (h.kind === 'fsize') {
      // o tamanho que leva o canto das letras até o mouse (o canto anda junto com o size=; a posição fica parada)
      if (!rec.el || rec.el.type !== 'text') return;
      const [cx, cy] = fsizeCorner(rec.el), ux = cx / rec.el.size, uy = cy / rec.el.size;
      const [mx, my] = turn(h.ax, h.ay, -h.rot, lx, ly);
      const s = Math.max(1, ((mx - h.ax) * ux + (my - h.ay) * uy) / (ux * ux + uy * uy));
      const txt = snap ? String(Math.max(4, Math.round(s / 4) * 4)) : fmtN(s, dec);
      if (h.insert) writeTok(d.line, h.at, h.at, ` size=${txt}`, d.key); else writeTok(d.line, h.from, h.to, txt, d.key);
      return;
    }
    if (h.kind === 'round') {
      // r= é a distância do canto até onde começa a curva, na borda de cima (sem o giro do rot=)
      const [ux] = turn(h.x0 + h.w / 2, h.y0 + h.h / 2, -h.rot, lx, ly);
      const r = ux - h.x0 < 8 / (k * st.view.z) ? 0 : Math.min(Math.abs(h.w) / 2, Math.abs(h.h) / 2, ux - h.x0);
      if (h.insert) { if (r > 0) writeTok(d.line, h.at, h.at, ` r=${fmtN(r, dec)}`, d.key); } else writeTok(d.line, h.from, h.to, fmtN(r, dec), d.key);
      return;
    }
    writeTok(d.line, h.from, h.to, `${fmtN(lx, dec)},${fmtN(ly, dec)}${h.kind === 'pt' && h.corner ? '!' : ''}`, d.key);
  }

  // alça do gradiente: o mouse volta para as coordenadas da figura de referência (com box, de 0 a 1 nela)
  function moveGrad(d, rec, h, x, y, snap) {
    const g = st.model.gradients.get(h.grad);
    if (!g) return;
    const F = gradFrame(st.model, currentPose(), g), k = F.box ? F.rs : 1;
    const g0 = h.kind === 'gr' ? gradLocal(F, h.cx, h.cy) : gradLocal(F, h.x, h.y);
    let [lx, ly] = unmap(F.f, x, y, g0[0], g0[1]);
    const dec = F.box ? 2 : st.view.z > 3 ? 1 : 0;
    if (h.kind === 'gr') {
      const c = gradLocal(F, h.cx, h.cy);
      let r = Math.hypot(lx - c[0], ly - c[1]) / k;
      if (snap) r = F.box ? Math.round(r * 20) / 20 : Math.round(r / 10) * 10;
      writeTok(d.line, h.from, h.to, fmtN(Math.max(F.box ? 0.01 : 1, r), dec), d.key);
      return;
    }
    // com Shift: a ponta anda de 45 em 45 graus em volta da outra; o centro e o foco andam em passos (0.05 ou 10 px)
    if (snap && (h.kind === 'g1' || h.kind === 'g2')) {
      const o = rec.handles.find((q) => q.kind === (h.kind === 'g1' ? 'g2' : 'g1'));
      if (o) {
        const c = gradLocal(F, o.x, o.y), len = Math.hypot(lx - c[0], ly - c[1]), a = Math.round(Math.atan2(ly - c[1], lx - c[0]) / (Math.PI / 4)) * (Math.PI / 4);
        lx = c[0] + Math.cos(a) * len;
        ly = c[1] + Math.sin(a) * len;
      }
    }
    let u = F.box ? (lx - F.b.x) / F.b.w : lx, v = F.box ? (ly - F.b.y) / F.b.h : ly;
    if (snap && (h.kind === 'gc' || h.kind === 'gf')) { const s = F.box ? 0.05 : 10; u = Math.round(u / s) * s; v = Math.round(v / s) * s; }
    writeTok(d.line, h.from, h.to, `${fmtN(u, dec)},${fmtN(v, dec)}`, d.key);
  }
  // o mouse nas coordenadas do código da alça: filme (pela câmera), 3D (giro, chão, iso) e dentro de componentes
  function localOf(rec, h, x, y) {
    if (isFilm()) {
      const dep = handleDepth(rec, h);
      if (dep === null) return null;
      [x, y] = M.apply(M.invert(filmView(dep)), x, y);
    }
    const pose = currentPose();
    const f3 = rec.el && S.ELEMENT_HANDLES.has(h.kind) && S.el3(st.model, pose, rec.el) ? S.fullMap(st.model, pose, rec.el) : null;
    return f3 ? unmap(f3, x, y, h.x, h.y) : rec.xf ? M.apply(M.invert(rec.xf), x, y) : [x, y];
  }
  function lineOf(line) {
    const off = editor.lineStart(line), v = editor.value, n = v.indexOf('\n', off);
    return v.slice(off, n < 0 ? v.length : n);
  }
  // troca um pedaço da linha (colunas from..to) e deixa o cursor logo depois dele; key junta o arraste num só Ctrl+Z
  function writeTok(line, from, to, txt, key) {
    const off = editor.lineStart(line);
    if (editor.value.slice(off + from, off + to) === txt) return;
    const end = off + from + txt.length;
    editor.replaceRange(off + from, off + to, txt, { key, select: [end, end] });
  }
  // tamanho novo pela posição do mouse, sem o giro (rot=); com Shift, a proporção do começo do arraste
  function sizeText(h, o, lx, ly, keep, dec) {
    if (h.shape === 'rect') {
      const [ux, uy] = turn(h.x0 + h.w / 2, h.y0 + h.h / 2, -h.rot, lx, ly);
      let w = Math.max(1, ux - h.x0), hh = Math.max(1, uy - h.y0);
      if (keep && o.w && o.h) { const s = Math.max(w / o.w, hh / o.h); w = o.w * s; hh = o.h * s; }
      return `${fmtN(w, dec)},${fmtN(hh, dec)}`;
    }
    const [ux, uy] = turn(h.cx, h.cy, -h.rot, lx, ly), dx = ux - h.cx, dy = uy - h.cy;
    if (h.axis === 'r') return fmtN(Math.max(0.5, Math.hypot(dx, dy)), dec);
    let rx = h.rx, ry = h.ry;
    if (h.axis === 'x') rx = Math.max(0.5, Math.abs(dx)); else ry = Math.max(0.5, Math.abs(dy));
    if (keep && o.rx && o.ry) { const s = h.axis === 'x' ? rx / o.rx : ry / o.ry; rx = o.rx * s; ry = o.ry * s; }
    return `${fmtN(rx, dec)},${fmtN(ry, dec)}`;
  }
  // a forma inteira: cada ponto = onde estava no começo do arraste + o quanto o mouse andou (! e ~alça ficam)
  function moveAll(d, rec, dx, dy, dec) {
    rewritePts(d, rec, (o) => [o.x + dx, o.y + dy], dec);
  }
  // Reescreve todos os pontos da linha de uma vez (um só Ctrl+Z). place(ponto do começo do arraste) dá [x, y] e,
  // se a alça de curva também muda, [x, y, [dx, dy]]; sem o terceiro, o ~dx,dy fica como está.
  function rewritePts(d, rec, place, dec) {
    const pts = rec.handles.filter((q) => q.kind === 'pt').sort((a, b) => b.from - a.from);
    if (!pts.length) return;
    const text = lineOf(d.line);
    let out = text;
    for (const q of pts) {
      const o = d.orig[q.idx];
      if (!o) continue;
      const [x, y, tan, tin] = place(o);
      let t = `${fmtN(x, dec)},${fmtN(y, dec)}${q.corner ? '!' : ''}`, end = q.to;
      if (tan && q.tan) { t += `~${tin && q.tin ? `${fmtN(tin[0], dec)},${fmtN(tin[1], dec)}~` : ''}${fmtN(tan[0], dec)},${fmtN(tan[1], dec)}`; end = q.end; }
      out = out.slice(0, q.from) + t + out.slice(end);
    }
    if (out === text) return;
    const off = editor.lineStart(d.line), first = off + pts[pts.length - 1].from;
    editor.replaceRange(off, off + text.length, out, { key: d.key, select: [first, first] });
  }
  // Girar: o ângulo do mouse em volta do pivô, somado ao giro do começo (com Shift, de 15 em 15 graus).
  // Elipse, retângulo e texto: escreve o rot= (acrescenta um no fim da linha, se não houver).
  // shape, stroke e line: gira cada ponto em volta do meio, e cada alça de curva junto.
  function spinShape(d, rec, h, x, y, snap) {
    const s = d.spin, l = s && localOf(rec, h, x, y);
    if (!l || s.a0 === null || Math.hypot(l[0] - s.cx, l[1] - s.cy) * st.view.z < 2) return;
    let deg = s.rot0 + ((Math.atan2(l[1] - s.cy, l[0] - s.cx) - s.a0) * 180) / Math.PI;
    deg = snap ? Math.round(deg / 15) * 15 : Math.round(deg);
    deg = ((((deg + 180) % 360) + 360) % 360) - 180;
    if (deg === s.ang) return;
    s.ang = deg;
    // escrever redesenha; se o código ficou igual (arredondamento), redesenha só para a alça acompanhar o mouse
    const before = editor.value;
    if (h.pts) {
      const k = rec.xf ? Math.sqrt(Math.abs(M.det(rec.xf))) : 1, dec = k > 1.5 ? 1 : 0;
      rewritePts(d, rec, (o) => {
        const p = turn(s.cx, s.cy, deg, o.x, o.y);
        return o.tan ? [p[0], p[1], turn(0, 0, deg, o.tan[0], o.tan[1]), o.tin && turn(0, 0, deg, o.tin[0], o.tin[1])] : p;
      }, dec);
      hint(`girando ${deg}°`, 1500);
    } else {
      const v = fmtN(deg, 0);
      if (h.insert) { if (deg !== 0) writeTok(d.line, h.at, h.at, ` rot=${v}`, d.key); } else writeTok(d.line, h.from, h.to, v, d.key);
    }
    if (editor.value === before) draw();
  }

  // Esticar: o começo guarda os pontos e a caixa; cada passo estica a partir deles (sem acumular arredondamento),
  // e o arraste inteiro é um Ctrl+Z só
  function startScale(hs, e) {
    const { sb, k } = hs, rec = sb.rec;
    if (st.playing || (!isFilm() && st.anim)) { hint(isFilm() ? 'Pause o player para esticar formas.' : 'Para esticar formas, escolha "pose parada" no player.', 2600); return; }
    if (sb.fixed) { hint('Algum ponto desta forma vem de uma {expressão}: mude no código.', 2800); return; }
    const [px, py] = toCanvas(e), l = localOf(rec, rec.handles[sb.mi], px, py);
    if (!l) return;
    const b = sb.b, ex = b.x0 + k.bx * (b.x1 - b.x0), ey = b.y0 + k.by * (b.y1 - b.y0), orig = [];
    for (const q of rec.handles) if (q.kind === 'pt') orig[q.idx] = { x: q.x, y: q.y, tan: q.tan, tin: q.tin };
    st.drag = { line: st.caret.line, hi: -1, mi: sb.mi, key: 'drag' + Date.now(), mode: 'scale', orig, sc: { bx: k.bx, by: k.by, b, ex, ey, grab: [l[0] - ex, l[1] - ey], said: '' } };
    // com as réguas, o canto (ou o lado) que anda gruda nas linhas guia, só no sentido em que ele anda
    if (!isFilm()) {
      const gx = k.bx === 0.5 ? NaN : k.at[0], gy = k.by === 0.5 ? NaN : k.at[1];
      st.drag.sn = { self: false, ref: [px, py], box: { x0: gx, x1: gx, y0: gy, y1: gy } };
    }
    hint('Esticando a forma. Com Shift, sem perder a proporção; com Alt, a partir do meio. Passar do outro lado espelha.', 3200);
  }
  function scaleShape(d, x, y, e) {
    const rec = st.model.byLine.get(d.line), mh = rec && rec.handles[d.mi];
    if (!mh || mh.kind !== 'move') { st.drag = null; return; }
    const l = localOf(rec, mh, x, y);
    if (!l) return;
    const c = d.sc, b = c.b, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    // o que fica parado: o lado de lá (com Alt, o meio)
    let ax = e.altKey ? cx : c.bx === 0 ? b.x1 : b.x0, ay = e.altKey ? cy : c.by === 0 ? b.y1 : b.y0;
    const dx = c.ex - ax, dy = c.ey - ay, mx = l[0] - c.grab[0] - ax, my = l[1] - c.grab[1] - ay;
    let sx = c.bx === 0.5 || Math.abs(dx) < 1e-9 ? 1 : mx / dx, sy = c.by === 0.5 || Math.abs(dy) < 1e-9 ? 1 : my / dy;
    if (e.shiftKey) {
      // a mesma conta nos dois sentidos: no canto, o quanto o mouse andou na diagonal da caixa; no meio de um lado,
      // o outro sentido acompanha a partir do meio (sem espelhar)
      if (c.bx === 0.5) { sx = Math.abs(sy); ax = cx; } else if (c.by === 0.5) { sy = Math.abs(sx); ay = cy; } else {
        const s = (mx * dx + my * dy) / (dx * dx + dy * dy || 1);
        sx = s;
        sy = s;
      }
    }
    const k = rec.xf ? Math.sqrt(Math.abs(M.det(rec.xf))) : 1, dec = k > 1.5 ? 1 : 0;
    rewritePts(d, rec, (o) => [ax + (o.x - ax) * sx, ay + (o.y - ay) * sy, o.tan && [o.tan[0] * sx, o.tan[1] * sy], o.tin && [o.tin[0] * sx, o.tin[1] * sy]], dec);
    const w = Math.abs((b.x1 - b.x0) * sx), h = Math.abs((b.y1 - b.y0) * sy);
    const say = `${fmtN(w, dec)} × ${fmtN(h, dec)} (${Math.round(Math.abs(sx) * 100)}% × ${Math.round(Math.abs(sy) * 100)}%)${sx < 0 || sy < 0 ? ', espelhada' : ''}`;
    if (say !== c.said) { c.said = say; hint(`esticando: ${say}`, 1500); }
  }

  // Girar a seta: do centro do quadro até o mouse vira dx,dy de tamanho 1 (com Shift, de 15 em 15 graus).
  // Sem light= no canvas, a primeira escrita acrescenta o atributo no fim da linha.
  function moveDir(d, h, x, y, snap) {
    const c = dirAnchor(st.model);
    if (Math.hypot(x - c[0], y - c[1]) < 2 / st.view.z) return;
    let a = Math.atan2(y - c[1], x - c[0]);
    if (snap) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);
    const v = `${fmtN(Math.cos(a), 2)},${fmtN(Math.sin(a), 2)}`, txt = h.insert ? ` light=${v}` : v;
    const off = editor.lineStart(d.line);
    if (editor.value.slice(off + h.from, off + h.to) === txt) return;
    const end = off + h.from + txt.length;
    editor.replaceRange(off + h.from, off + h.to, txt, { key: d.key, select: [end, end] });
  }

  // inversa de um mapa qualquer (o do 3D): Newton a partir do palpite, com a derivada medida
  function unmap(f, x, y, u, v) {
    for (let i = 0; i < 16; i++) {
      const p = f(u, v), ex = x - p[0], ey = y - p[1];
      if (Math.abs(ex) + Math.abs(ey) < 0.01) break;
      const a = f(u + 1, v), b = f(u, v + 1);
      const j00 = a[0] - p[0], j10 = a[1] - p[1], j01 = b[0] - p[0], j11 = b[1] - p[1], det = j00 * j11 - j01 * j10;
      if (Math.abs(det) < 1e-9) break;
      u += (j11 * ex - j01 * ey) / det;
      v += (j00 * ey - j10 * ex) / det;
    }
    return [u, v];
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
  $('tBoxes').addEventListener('change', (e) => { st.show.boxes = e.target.checked; draw(); });
  // prévia do def: a escolha vale para este def (igual ao jeito de sempre dele: volta a seguir os use)
  $('tPreview').addEventListener('change', (e) => {
    const d = caretDef();
    if (!d) return;
    if (e.target.checked === !st.model.defs.get(d.name).uses) pv.mode.delete(pvKey(d.name)); else pv.mode.set(pvKey(d.name), e.target.checked);
    reparse();
  });
  $('tBones').addEventListener('change', (e) => { st.show.bones = e.target.checked; draw(); });
  $('tOnion').addEventListener('change', (e) => { st.show.onion = e.target.checked; draw(); });
  $('tArt').addEventListener('change', (e) => { st.show.art = e.target.checked; draw(); });
  $('tTraj').addEventListener('change', (e) => { st.show.traj = e.target.checked; draw(); });
  $('tRulers').checked = st.show.rulers;
  $('tRulers').addEventListener('change', (e) => {
    st.show.rulers = e.target.checked;
    store.set('weasel.rulers', st.show.rulers ? '1' : '0');
    syncRulers();
    if (st.show.rulers && !st.guides.v.length && !st.guides.h.length) hint('Arraste de uma régua para dentro do desenho: sai uma linha guia. O que você arrasta gruda nela (segurando Ctrl, não gruda).', 4200);
    draw();
  });
  const toggleRulers = () => $('tRulers').click();
  $('measureBtn').addEventListener('click', () => setMeasure(!st.measure));
  $('pinBtn').addEventListener('click', () => setPin(!st.pin.on));
  $('zFit').addEventListener('click', () => fitView());
  $('zoomPct').addEventListener('click', () => zoomActual());
  $('zIn').addEventListener('click', () => zoomBy(1.25));
  $('zOut').addEventListener('click', () => zoomBy(0.8));
  $('variantSel').addEventListener('change', (e) => { st.variant = e.target.value; reparse(); });

  $('animSel').addEventListener('change', (e) => {
    if (isFilm()) { stopSound(); st.playing = false; st.shot = e.target.value; st.frame = filmRange()[0]; fillAnimSelect(); draw(); return; }
    st.anim = e.target.value; st.frame = 0; st.pin.spin.clear(); stopBuild(); if (!st.anim) st.playing = false; fillAnimSelect(); draw();
  });
  $('tCamera').addEventListener('change', (e) => { st.camView = e.target.checked; draw(); });
  $('bPlay').addEventListener('click', () => play(!st.playing));
  $('bLoop').addEventListener('click', toggleLoop);
  $('bPrev').addEventListener('click', () => step(-1));
  $('bNext').addEventListener('click', () => step(1));
  $('frameSl').addEventListener('input', (e) => { st.playing = false; stopSound(); st.frame = +e.target.value; fillAnimSelect(); draw(); });
  $('speedSel').addEventListener('change', (e) => { st.speed = parseFloat(e.target.value); if (st.playing) startSound(); });
  $('bSound').addEventListener('click', () => { st.sound = !st.sound; $('bSound').classList.toggle('on', st.sound); if (st.playing) startSound(); else stopSound(); });
  $('tTimeline').addEventListener('change', (e) => { st.timeline = e.target.checked; $('timeline').hidden = !(isFilm() && st.timeline); draw(); });
  $('bSubs').addEventListener('click', () => { st.subs = !st.subs; $('bSubs').classList.toggle('on', st.subs); draw(); });
  $('mediaBtn').addEventListener('click', () => { const l = $('mediaList'); l.hidden = !l.hidden; });
  $('refBtn').addEventListener('click', () => { const p = $('refPanel'); p.hidden = !p.hidden; refSig = ''; fillRefPanel(); });
  $('refIn').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const target = refTarget;
    refTarget = null;
    const info = await addImage(target || f.name, await f.arrayBuffer(), true);
    if (!info) return;
    if (target) { reparse(); hint(`Imagem guardada neste navegador como "${target}".`, 3000); } else insertRef(info);
  });
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
    loadGuides(name);
    st.meas = null;
    st.pin.sel.clear();
    st.pin.pick = null;
    st.pin.spin.clear();
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
    // as linhas guia vão junto para o nome novo
    saveGuides(name, st.guides);
    saveGuides(st.current, null);
    st.files.delete(st.current);
    openFile(name, src);
  });
  $('fileDel').addEventListener('click', () => {
    if (st.files.size < 2) { hint('Este é o único arquivo.', 2000); return; }
    if (!confirm(`Excluir "${st.current}" deste navegador? (o arquivo baixado, se houver, continua no seu computador)`)) return;
    saveGuides(st.current, null);
    st.files.delete(st.current);
    openFile([...st.files.keys()].sort()[0]);
  });
  $('fileZip').addEventListener('click', () => {
    const enc = new TextEncoder();
    st.files.set(st.current, editor.value);
    W.exporter.download(W.zip([...st.files].map(([n, s]) => ({ name: n, data: enc.encode(s) }))), 'weasel_arquivos.zip');
  });

  // Arquivo › Exemplos
  function openExample(id) {
    const x = W.examples.find((e) => e.id === id);
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
  }
  function newFile() { openFile(uniqueName('desenho.weasel'), W.blankProgram); hint('Arquivo novo criado.', 2000); }
  const openDialog = () => $('fileIn').click();
  $('fileIn').addEventListener('change', (e) => {
    const list = [...e.target.files];
    e.target.value = '';
    if (list.length) openFiles(list);
  });
  // Abrir… e arrastar arquivos para a janela: sons e imagens ficam guardados neste navegador, textos viram arquivos.
  // drop: soltou na janela. Aí as imagens (sem texto junto) já viram linhas ref, abaixo do canvas: o meio da
  // imagem fica onde ela caiu no desenho (drop.at) ou, solta no código, no meio do desenho.
  const TEXT_EXT = /\.(weasel|txt|json|tsv)$/i;
  async function openFiles(list, drop) {
    const sounds = list.filter((f) => AUDIO_EXT.test(f.name)), images = list.filter((f) => IMAGE_EXT.test(f.name));
    const rest = list.filter((f) => !AUDIO_EXT.test(f.name) && !IMAGE_EXT.test(f.name));
    const texts = drop ? rest.filter((f) => TEXT_EXT.test(f.name)) : rest, skip = rest.filter((f) => !texts.includes(f));
    for (const f of sounds) await addMedia(f.name, await f.arrayBuffer(), true);
    const infos = [];
    for (const f of images) { const i = await addImage(f.name, await f.arrayBuffer(), true); if (i) infos.push(i); }
    for (const f of texts) st.files.set(f.name, await f.text());
    fillMediaList();
    if (texts.length) openFile(texts[0].name); else reparse();
    if (drop && infos.length && !texts.length && !isFilm()) {
      const c = st.model.canvas, [x, y] = drop.at || [c.w / 2, c.h / 2];
      // várias de uma vez: uma um pouco abaixo da outra, para dar para ver que são várias
      infos.forEach((info, k) => insertRef(info, [x + k * 24, y + k * 24]));
      if (infos.length > 1) hint(`${infos.length} imagens guia adicionadas, cada uma numa linha ref: arraste para mover, o canto para mudar o tamanho.`, 4200);
      editor.ta.focus();
    } else if (images.length && !texts.length) hint(`${images.length > 1 ? `${images.length} imagens guardadas` : 'Imagem guardada'} neste navegador${isFilm() ? ': imagens guia são para desenhos (num filme, não aparecem).' : `: use no painel "Referências" ou com ref nome "${images[0].name}" x,y.`}`, 4200);
    else if (sounds.length) hint(`${sounds.length} som${sounds.length > 1 ? 's' : ''} aberto${sounds.length > 1 ? 's' : ''}: ficam guardados neste navegador (♪ na barra de arquivos).`, 3600);
    else if (texts.length > 1) hint(`${texts.length} arquivos abertos — o include encontra os outros pelo nome.`, 3200);
    else if (skip.length && !texts.length) hint(`Não sei abrir "${skip[0].name}": solte desenhos (.weasel), imagens ou sons.`, 3200);
  }
  // Arquivos arrastados por cima da janela: a área onde vão cair fica marcada. Soltar nunca deixa o navegador
  // trocar a página pelo arquivo (o que perderia o que não foi salvo).
  const hasFiles = (e) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  const onDrawing = (e) => !!(e.target.closest && e.target.closest('#stage')) && !isFilm() && !st.build;
  let dropEl = null;
  const dropMark = (el, label) => {
    if (dropEl && dropEl !== el) dropEl.classList.remove('drop-on');
    dropEl = el;
    if (el) { el.dataset.drop = label; el.classList.add('drop-on'); }
  };
  window.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const items = [...e.dataTransfer.items], pics = items.length && items.every((i) => i.kind === 'file' && /^image\//.test(i.type));
    const here = onDrawing(e), many = items.length > 1;
    const label = !pics ? 'Solte para abrir' : isFilm() ? `Solte para guardar ${many ? 'as imagens' : 'a imagem'} (imagens guia são para desenhos)` : here ? `Solte: ${many ? 'as imagens guia ficam' : 'a imagem guia fica'} neste ponto do desenho` : `Solte: ${many ? 'cada imagem vira uma linha' : 'a imagem vira uma linha'} ref, abaixo do canvas`;
    dropMark(here ? $('stage') : document.querySelector('.code'), label);
    clearTimeout(dropMark.t);
    dropMark.t = setTimeout(() => dropMark(null), 250);
  });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    clearTimeout(dropMark.t);
    dropMark(null);
    const list = [...e.dataTransfer.files];
    if (!list.length) return;
    let at = null;
    if (onDrawing(e)) {
      const c = st.model.canvas, p = toWorld(e);
      at = [Math.min(c.w, Math.max(0, p[0])), Math.min(c.h, Math.max(0, p[1]))];
    }
    openFiles(list, { at });
  });
  function saveFile() {
    W.exporter.download(new Blob([editor.value], { type: 'text/plain;charset=utf-8' }), st.current);
  }

  // a versão: a mesma do ?v= dos scripts (muda a cada versão nova); aparece ao lado do nome e na referência
  const appSrc = (document.querySelector('script[src*="js/app.js"]') || {}).src || '';
  const version = (/[?&]v=([\w.-]+)/.exec(appSrc) || [])[1];
  if (version) {
    $('ver').textContent = 'v' + version;
    $('helpVer').textContent = 'Weasel ' + version;
  }

  // referência
  const help = $('help');
  // a referência (F1) e a folha de atalhos (Shift+F1, js/ui-keys.js) ficam no mesmo lugar: abrir uma fecha a outra
  const toggleHelp = (on) => {
    help.hidden = on === undefined ? !help.hidden : !on;
    if (!help.hidden && W.keysPanel) W.keysPanel.toggle(false);
  };
  const toggleKeys = (on) => { if (W.keysPanel) W.keysPanel.toggle(on); };
  $('helpClose').addEventListener('click', () => toggleHelp(false));

  // ---------- formas prontas (Objeto › Inserir e o botão direito › Inserir forma) ----------
  // A forma nasce onde as desenhadas nascem (drawPlace: na frente de tudo da camada do cursor), no meio da tela ou
  // onde o botão direito foi clicado, com um tamanho que cabe no que está à vista. Ela vira a escolha.
  const NEW_SHAPES = [
    { cmd: 'ellipse', name: 'ellipse', label: 'círculo', make: (f, x, y, s) => `${f(x)},${f(y)} ${f(s)} c=#4a90d9 ink=4` },
    { cmd: 'rect', name: 'rect', label: 'retângulo', make: (f, x, y, s) => `${f(x - s)},${f(y - s * 0.7)} ${f(s * 2)},${f(s * 1.4)} c=#ffb000 ink=4` },
    { cmd: 'shape', name: 'shape', label: 'forma livre', make: (f, x, y, s) => `c=#6cbb3c ink=4 : ${f(x)},${f(y - s)}! ${f(x + s)},${f(y + s * 0.8)}! ${f(x - s)},${f(y + s * 0.8)}!` },
    { cmd: 'stroke', name: 'stroke', label: 'traço', make: (f, x, y, s) => `c=#ff6b4a w=6 : ${f(x - s)},${f(y + s * 0.4)} ${f(x)},${f(y - s * 0.4)} ${f(x + s)},${f(y + s * 0.4)}` },
    { cmd: 'line', name: 'line', label: 'linha reta', make: (f, x, y, s) => `c=#c44536 w=3 : ${f(x - s)},${f(y)} ${f(x + s)},${f(y)}` },
    { cmd: 'text', name: 'text', label: 'texto', make: (f, x, y, s) => `${f(x)},${f(y)} "Texto" size=${f(Math.max(8, s * 0.5))} align=center` },
  ];
  function viewCenter() {
    const r = view.getBoundingClientRect(), p = toWorld({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }), R = viewRect();
    return [Math.min(R.x + R.w, Math.max(R.x, p[0])), Math.min(R.y + R.h, Math.max(R.y, p[1]))];
  }
  // um nome que ainda não existe no arquivo: rect1, rect2… (em inglês, pela palavra da linha)
  function freeName(base) {
    const v = editor.value;
    for (let k = 1; ; k++) if (!new RegExp(`(^|[\\s=,])${base}${k}(?![\\w.])`).test(v)) return base + k;
  }
  // dentro de def … end as coordenadas são as do componente: o ponto passa pelo avesso da primeira cópia
  // (sem cópia ainda, 0,0, a posição do use)
  function defLocal(line, at) {
    const ls = editor.value.split('\n'), word = (t) => (/^\s*([A-Za-z_]\w*)/.exec(t) || [])[1], stack = [];
    for (let i = 0; i <= line && i < ls.length; i++) {
      const w = word(ls[i]);
      if (w === 'def' || w === 'repeat' || w === 'group') stack.push({ w, i }); else if (w === 'end') stack.pop();
    }
    const d = stack.find((b) => b.w === 'def');
    if (!d) return at;
    // na prévia do def, o desenho já está nas coordenadas dele
    if (pvModel()) return at;
    let depth = 0, xf = null;
    for (let i = d.i; i < ls.length && !xf; i++) {
      const w = word(ls[i]);
      if (w === 'def' || w === 'repeat' || w === 'group') depth++; else if (w === 'end' && --depth === 0) break;
      const rec = st.model.byLine.get(i);
      if (rec && rec.el && rec.xf) xf = rec.xf;
    }
    return xf ? M.apply(M.invert(xf), at[0], at[1]) : [0, 0];
  }
  // Onde entra uma forma desenhada (etapa 4a): na frente de tudo da camada do cursor (no fim dela; com o modo
  // Desenhar atrás, no começo), no grupo isolado (antes do end dele) ou, na prévia do def, logo abaixo do cursor.
  // Devolve { at: a linha nova entra antes desta, indent, local(p): o ponto do desenho nas coordenadas do código
  // ali (dentro de def, as do componente) } ou { why } quando não dá (camada ou grupo travado).
  function drawPlace(behind) {
    const m = st.model;
    if (!m || isFilm()) return null;
    const ls = editor.value.split('\n'), ind = (i) => /^\s*/.exec(ls[i] || '')[0];
    const word = (t) => (/^\s*([A-Za-z_]\w*)/.exec(t) || [])[1], opens = (w) => w === 'def' || w === 'repeat' || w === 'group';
    const mk = (at, indent) => ({ at, indent, local: (p) => defLocal(Math.max(0, at - 1), p) });
    if (pvModel()) {
      const line = st.caret.line;
      return mk(line + 1, ind(line) + (opens(word(ls[line] || '')) ? '  ' : ''));
    }
    const iso = isoGroup();
    if (iso) {
      let up = iso;
      while (up && !up.lock) up = up.parent;
      if (up || (layerAt(m, iso.line) || {}).lock) return { why: `O grupo ${iso.name || ''} está travado (lock): destrave para desenhar dentro dele.` };
      return mk(behind ? iso.line + 1 : iso.end, ind(iso.line) + '  ');
    }
    const Ly = drawLayer(m);
    if (!Ly) return mk(ls.length, '');
    if (Ly.lock) return { why: `A camada ${Ly.name} está travada (lock): destrave pelo cadeado do painel Camadas para desenhar nela.` };
    const map = (i) => (m.lineMap ? m.lineMap[i] : i), start = Ly.line >= 0 ? map(Ly.line) : -1;
    let first = Infinity, last = start;
    for (const it of Ly.items) {
      const l = lineOfEl(it.el);
      if (l === undefined || l < 0) continue;
      first = Math.min(first, l);
      last = Math.max(last, l);
    }
    // os blocos (group, repeat) em volta de uma linha da camada: a forma nova fica fora deles
    let depth = 0, top = -1;
    const lo = Math.max(0, start + 1);
    if (behind) {
      if (start >= 0) return mk(start + 1, ind(start));
      if (first === Infinity) return mk(ls.length, '');
      for (let i = lo; i <= first; i++) { const w = word(ls[i]); if (opens(w)) { if (depth++ === 0) top = i; } else if (w === 'end' && depth > 0) depth--; }
      const at = depth > 0 ? top : first;
      return mk(at, ind(at));
    }
    if (last === start) return mk(start + 1, start >= 0 ? ind(start) : '');
    let end = last;
    for (let i = lo; i < ls.length; i++) {
      const w = word(ls[i]);
      if (opens(w)) depth++;
      else if (w === 'end' && depth > 0) depth--;
      if (i >= last && depth === 0) { end = i; break; }
    }
    return mk(end + 1, ind(end));
  }
  // a camada onde se desenha: a do cursor (a última linha layer acima dele) ou, com o cursor antes de todas, a de
  // cima (a última que não é guia); sem linha layer, a camada base
  function drawLayer(m) {
    const Ly = layerAt(m, st.caret.line), real = m.layers.filter((x) => x.line >= 0);
    if (Ly) return Ly;
    if (real.length) return [...real].reverse().find((x) => !x.guide) || real[real.length - 1];
    return m.layers[0] || null;
  }
  // a camada de uma linha do código: a última linha layer acima dela
  function layerAt(m, line) {
    const map = (i) => (m.lineMap ? m.lineMap[i] : i);
    let Ly = null;
    for (const x of m.layers) if (x.line >= 0 && map(x.line) <= line && (!Ly || map(x.line) > map(Ly.line))) Ly = x;
    return Ly;
  }
  // escreve a linha nova no lugar (pl, de drawPlace) com um nome livre (base1, base2…) e escolhe ela.
  // o: { key, text: o "Texto" fica selecionado no código }. Devolve o número da linha nova, ou -1.
  function addLine(pl, cmd, base, rest, o) {
    if (!pl || pl.why) { if (pl && pl.why) hint(pl.why, 3200); return -1; }
    // o use (o.name: o def) não cria nome novo
    const name = o && o.name ? o.name : freeName(base), body = `${pl.indent}${cmd} ${name} ${rest}`;
    const v = editor.value, n = v.split('\n').length;
    let off, txt, nl;
    if (pl.at >= n) {
      const bare = !v.length || v.endsWith('\n');
      off = v.length;
      txt = (bare ? '' : '\n') + body;
      nl = bare ? n - 1 : n;
    } else {
      off = editor.lineStart(pl.at);
      txt = body + '\n';
      nl = pl.at;
    }
    const ls = off + (txt[0] === '\n' ? 1 : 0), q = body.indexOf('"Texto"'), k = ls + pl.indent.length + cmd.length + 1 + name.length;
    const sel = o && o.text && q >= 0 ? [ls + q + 1, ls + q + 6] : [k, k];
    editor.replaceRange(off, off, txt, { key: (o && o.key) || 'novo' + Date.now(), select: sel });
    if (nodeSigs().has(nl)) setSel([nl], nl);
    return nl;
  }
  // a forma pronta i em at (no desenho), no lugar das desenhadas. Ela vira a escolha; o foco fica no desenho.
  // edit: o texto já abre a caixinha para escrever
  function insertShapeAt(i, at0, opts) {
    const item = NEW_SHAPES[i];
    if (!item || !at0 || !st.model) return;
    const pl = drawPlace();
    if (!pl || pl.why) { if (pl) hint(pl.why, 3200); return; }
    const at = pl.local(at0);
    const z = st.view.z, dec = z > 3 ? 1 : 0, f = (v) => fmtN(v, dec), c = st.model.canvas;
    const s = Math.max(4, Number((Math.min(view.clientWidth / z, view.clientHeight / z, c.w, c.h) * 0.12).toFixed(dec)));
    const nl = addLine(pl, item.cmd, item.name, item.make(f, at[0], at[1], s), { text: item.cmd === 'text' });
    if (nl < 0) return;
    const rec = opts && opts.edit && st.model.byLine.get(nl);
    if (rec && rec.el && rec.el.type === 'text') { editText(rec.el); return; }
    hint(`${item.cmd} ${lineOf(nl).trim().split(/\s+/)[1]} na linha ${nl + 1}: ${pointsOn() ? 'arraste as alças para mudar' : 'arraste para mover; os quadradinhos esticam'}.`, 2600);
  }
  view.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (st.build) return;
    if (pinOn()) {
      // botão direito num ponto que não estava escolhido: ele (com os do mesmo lugar) vira a escolha
      const here = pinsAt(e);
      if (here.length && !here.some((s) => st.pin.sel.has(s.key))) { pinSelect(here, 'set'); st.pin.pick = null; draw(); }
      openPinMenu(e.clientX, e.clientY);
      return;
    }
    // o menu do objeto (js/ui-shell.js): o botão direito numa forma que não estava escolhida escolhe ela antes
    if (!isFilm() && st.model) {
      const lines = linesAt(e), cur = selSet();
      if (lines.length && !lines.some((l) => cur.has(l))) pickShape({ clientX: e.clientX, clientY: e.clientY, shiftKey: false });
    }
    if (ctxMenu) ctxMenu(e, toWorld(e));
  });

  // exportar
  const exportUI = W.exporter.setupDialog({
    model: () => st.model,
    parseFor: (v) => (v === st.variant ? st.model : parseFor(v)),
    variants: () => st.model.variants,
    variant: () => st.variant,
    state: () => ({ anim: st.anim, frame: st.frame, shot: st.shot }),
    // o código e os outros arquivos do projeto: o worker da exportação lê o desenho de novo, longe da página
    source: () => ({ text: editor.value, file: st.current, files: [...st.files].map(([k, v]) => [k, k === st.current ? editor.value : v]) }),
    baseName,
  });
  function openExport() { st.playing = false; fillAnimSelect(); exportUI.open(); }
  $('btnExport').addEventListener('click', openExport);

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

  // teclado. Com o foco no desenho, valem os atalhos do Illustrator (docs/planos/interface-illustrator.md, 7.2);
  // no código, os do editor de código. As letras das ferramentas ficam na casca (js/ui-shell.js).
  const inField = (t) => !!(t && t.closest && t.closest('textarea, input, select, dialog'));
  // o botão ou link que ganhou o foco pelo Tab, e não por um clique (o :focus-visible não serve: o Chrome liga ele
  // em qualquer tecla apertada, também depois de um clique)
  let tabbed = null, viaTab = false;
  document.addEventListener('keydown', (e) => { if (e.key === 'Tab') viaTab = true; }, true);
  document.addEventListener('pointerdown', () => { viaTab = false; tabbed = null; }, true);
  document.addEventListener('focusin', (e) => { tabbed = viaTab ? e.target : null; viaTab = false; });
  const keyFocused = (t) => !!(t && t === tabbed && t.closest && t.closest('button, a'));
  const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const inDialog = (t) => !!(t && t.closest && t.closest('dialog'));
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey, k = e.key, low = k.length === 1 ? k.toLowerCase() : k, t = e.target;
    if (mod && low === 's') { e.preventDefault(); saveFile(); return; }
    if (mod && low === 'e') { e.preventDefault(); openExport(); return; }
    if (k === 'F1' && !e.shiftKey) { e.preventDefault(); toggleHelp(); return; }
    // a folha de atalhos: Shift+F1 ou Ctrl+? (Ctrl+Shift+/; no teclado brasileiro, a tecla /? ao lado do Shift direito)
    if ((k === 'F1' && e.shiftKey) || (mod && !e.altKey && (k === '?' || (e.shiftKey && e.code === 'IntlRo')))) { e.preventDefault(); toggleKeys(); return; }
    // Ctrl+O: abrir, em qualquer lugar (também no código, onde o navegador abriria o "Abrir arquivo" dele)
    if (mod && !e.shiftKey && !e.altKey && low === 'o' && !inDialog(t)) { e.preventDefault(); openDialog(); return; }
    // zoom: Ctrl+0 ajusta à tela, Ctrl+1 é 100%, Ctrl+= e Ctrl+- aproximam e afastam; no desenho e também no código
    // (lá, o navegador daria zoom na página inteira, e o Ctrl+1 trocaria de aba)
    if (mod && !e.altKey && (k === '0' || k === '1' || k === '=' || k === '+' || k === '-') && (t === editor.ta || !inField(t))) {
      e.preventDefault();
      if (k === '0') fitView(); else if (k === '1') zoomActual(); else zoomBy(k === '-' ? 0.8 : 1.25);
      return;
    }
    // Ctrl+R: as réguas, em qualquer lugar (no navegador, recarregaria a página)
    if (mod && !e.shiftKey && !e.altKey && low === 'r' && !inDialog(t)) { e.preventDefault(); if (!isFilm()) toggleRulers(); return; }
    // Ctrl+' (a tecla à esquerda do 1; no teclado americano, a do acento grave): troca de vista, em qualquer lugar; com
    // Shift, volta uma. No Mac também é o Ctrl, porque lá o ⌘ com essa tecla troca de janela. Vale a posição da tecla
    // (Backquote) ou a letra dela (' e " no teclado brasileiro, o acento grave no americano)
    const quoteKey = e.code === 'Backquote' || k === "'" || k === '"' || k === '`';
    if (e.ctrlKey && !e.metaKey && !e.altKey && quoteKey && !inDialog(t)) { e.preventDefault(); cycleLayout(e.shiftKey); return; }
    // Ctrl+3: liga e desliga o hidden das linhas escolhidas (ou da linha do cursor); no código, o Ctrl+H também
    if (mod && !e.shiftKey && !e.altKey && (k === '3' || (low === 'h' && t === editor.ta)) && (t === editor.ta || !inField(t))) { e.preventDefault(); toggleHidden(hiddenTargets(), low === 'h' ? 'Ctrl+H' : 'Ctrl+3'); return; }
    // Esc com a folha de atalhos aberta só fecha a folha (não solta a escolha do desenho)
    if (k === 'Escape' && W.keysPanel && W.keysPanel.isOpen() && !inDialog(t)) { toggleKeys(false); return; }
    // Esc: na ferramenta Prender, volta primeiro os giros de teste e depois solta os pontos escolhidos
    if (k === 'Escape' && st.pin.spin.size && spinOn() && !inDialog(t)) { st.pin.spin.clear(); st.pose = null; draw(); return; }
    if (k === 'Escape' && pinOn() && st.pin.sel.size && !inDialog(t)) { st.pin.sel.clear(); st.pin.pick = null; draw(); return; }
    if (k === 'Escape') { if (!help.hidden) toggleHelp(false); $('errList').hidden = true; if (st.marq) { st.marq = null; draw(); } if (inField(t)) clearSel(); else if (!exitDef() && !exitIso()) deselect(); if (st.meas) { st.meas = null; draw(); } return; }
    if (inField(t)) return;
    // daqui em diante, o foco está no desenho (ou num botão)
    if (mod && !e.altKey && low === 'z') { e.preventDefault(); undoRedo(e.shiftKey); return; }
    if (mod && low === 'y') { e.preventDefault(); undoRedo(true); return; }
    // Ctrl+D no desenho: repete a última transformação (no código, continua duplicando a linha)
    if (mod && low === 'd') { e.preventDefault(); transformAgain(); return; }
    if ((k === 'Delete' || k === 'Backspace') && !mod && !e.altKey && pinOn()) { e.preventDefault(); hint('No Prender, o Delete não apaga pontos: para tirar o @, use o botão direito → Soltar.', 2800); return; }
    // Delete: na Seleção direta, o ponto escolhido; com formas escolhidas (a caixa), as formas (js/ui-select.js)
    if ((k === 'Delete' || k === 'Backspace') && !mod && !e.altKey) { if (deletePoint()) { e.preventDefault(); return; } if (groupOn() && W.sel) { e.preventDefault(); W.sel.del(); } return; }
    // Espaço: tocado (sem arrastar), toca e pausa; segurado, arrastar no desenho move a vista. Num botão que recebeu
    // o foco pelo teclado (Tab), o Espaço aperta o botão, como no resto da página; depois de um clique com o mouse,
    // continua tocando e movendo a vista
    if (k === ' ' && keyFocused(t)) return;
    if (k === ' ') { e.preventDefault(); if (!st.space && !e.repeat) { st.space = { panned: false }; stage.classList.add('space'); } return; }
    // Enter também toca e pausa (num botão, o Enter é do botão)
    if (k === 'Enter' && !mod && !e.altKey && !(t.closest && t.closest('button, a'))) { e.preventDefault(); play(!st.playing); return; }
    // , e . trocam de quadro
    if (!mod && !e.altKey && (k === ',' || k === '.' || k === '<' || k === '>')) { e.preventDefault(); step(k === ',' || k === '<' ? -1 : 1); return; }
    // as setas empurram a escolha (Shift: 10 px)
    if (!mod && !e.altKey && k.startsWith('Arrow')) {
      e.preventDefault();
      const d = e.shiftKey ? 10 : 1, v = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[k];
      if (v && !nudge(v[0], v[1])) hint(isFilm() ? 'No filme, as setas empurram os at escolhidos na linha do tempo (clique num losango; Ctrl+A escolhe todos). Para trocar de quadro: , e .' : 'As setas empurram a forma escolhida (clique numa com a Seleção, V). Para trocar de quadro: , e .', 3200);
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key !== ' ' || !st.space) return;
    const sp = st.space;
    st.space = null;
    stage.classList.remove('space');
    if (!sp.panned && !inField(e.target)) play(!st.playing);
  });
  window.addEventListener('blur', () => { st.space = null; stage.classList.remove('space'); });

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
    for (const [k, v] of list) { if (IMAGE_EXT.test(k)) await addImage(k, v, false); else await addMedia(k, v, false); }
    if (list.length) { fillMediaList(); reparse(); }
  });

  // o caminho da barra de status: clicar na camada escolhe tudo o que desenha nela
  $('crumbs').addEventListener('click', (e) => { const b = e.target.closest('[data-li]'); if (b) pickLayer(+b.dataset.li, e); });

  stage.dataset.tool = st.tool;
  setLayout(store.get('weasel.vista') || 'split', false);

  // o que a casca (js/ui-shell.js: menus, barra de ferramentas, vistas) usa daqui
  W.app = {
    st, editor, draw, reparse, parseFor, hint,
    on: (k, f) => { (listeners[k] = listeners[k] || []).push(f); },
    isFilm, defPreview: () => !!pvModel(),
    setTool, setLayout, cycleLayout, toggleRulers, toggleHelp, toggleKeys,
    newFile, openDialog, saveFile, openExport, openExample, openFile: (n) => openFile(n), files: () => [...st.files.keys()].sort(),
    undo: () => undoRedo(false), redo: () => undoRedo(true),
    hide: () => toggleHidden(hiddenTargets(), 'Ctrl+3'),
    duplicate: () => { if (!duplicateSel()) hint('Escolha uma forma (clique nela com a Seleção, V) para duplicar.', 2800); },
    shapes: () => NEW_SHAPES.map((x) => ({ cmd: x.cmd, label: x.label })),
    insert: (i) => { if (st.model && !isFilm()) insertShapeAt(i, viewCenter()); },
    fit: fitView,
    zoomIn: () => zoomBy(1.25),
    zoomOut: () => zoomBy(0.8),
    zoomActual,
    selectNone: () => { deselect(); },
    // para a vista Camadas em 3D (js/ui-3d.js)
    set3d,
    register3d: (o) => { v3 = o; },
    model: () => (isFilm() ? null : pvModel() || st.model),
    pose: () => currentPose(),
    paper: () => viewRect(),
    layerTree: (m) => layerTree(m),
    selected: () => [...selSet().keys()],
    pickLine,
    // para o painel Propriedades e as Amostras (js/ui-props.js)
    targets: propTargets,
    boxOf,
    setAttrs,
    setWord,
    transformLines,
    lineText: (line) => lineOf(line),
    setLines: (map, key) => writeLines(map, key),
    gotoCode,
    setVariant: (v) => { const sel = $('variantSel'); if (sel && [...sel.options].some((o) => o.value === v)) { sel.value = v; sel.dispatchEvent(new Event('change')); } },
    insertLine: (at, text, key) => { const off = editor.lineStart(at); editor.replaceRange(off, off, text + '\n', { key: key || 'props' + Date.now() }); },
    // o Traçado de imagem (js/ui-trace.js): a imagem de um ref, se foi aberta, e a matriz da imagem para o desenho
    refInfo: (r) => { const i = imageInfo(r.file); return i ? { img: i.img, w: i.w, h: i.h, m: S.refMatrix(r, i.w, i.h) } : null; },
    // para a seleção completa (js/ui-select.js)
    sigs: () => nodeSigs(),
    setSel: (lines, caret) => { const l = [...new Set(lines)].sort((a, b) => a - b); if (!l.length) deselect(); else setSel(l, caret !== undefined ? caret : l.includes(st.caret.line) ? st.caret.line : l[0]); },
    deselect,
    renameCopy: (block) => renameCopy(block),
    // renomear pelo painel (etapa 6): o nome da linha e as palavras que apontam para ele
    rename: (line, to, key) => renameAt(line, to, key),
    nameOf: (line) => { const w = nameWord(L.splitLine(lineOf(line))); return w ? w.text : ''; },
    fillLayers: () => { layerSig = ''; fillLayerPanel(); },
    // os símbolos (js/ui-symbols.js, etapa 6b): o componente sozinho com os valores padrão (para a miniatura),
    // entrar e sair dele, e onde está o def
    defModel: (name) => {
      if (!st.model || isFilm() || !st.model.defs.has(name)) return null;
      try { const m = parseFor(st.variant, name, {}); return (m.preview && m.preview.model) || null; } catch (e) { return null; }
    },
    enterDef: (name, back) => enterDef(name, back === undefined ? -1 : back),
    exitDef: () => exitDef(),
    symIso: () => st.symIso.map((s) => s.name),
    defLines: (name) => defLines(name),
    duplicate2: (key) => duplicateSel(key),
    again: transformAgain,
    viewCenter: () => viewCenter(),
    editPlan: (line) => editPlan(line),
    groupOn: () => groupOn(),
    selectable: (line) => selectable(line),
    // grupos e travas (etapa 3b)
    blocks: () => blockInfo(),
    iso: () => isoGroup(),
    exitIso: () => exitIso(),
    units: (lines) => selUnits(lines),
    groupNodes: (g) => groupNodes(g),
    freeName: (base) => freeName(base),
    lockTok: (line) => lockTok(line),
    setLock,
    // as ferramentas de desenhar (js/ui-draw.js, etapa 4a) e o menu do botão direito (js/ui-shell.js)
    addTool: (id, hooks) => { toolHooks[id] = hooks; },
    addOverlay: (f) => { overlays.push(f); },
    addFilmHook: (f) => { filmHooks.push(f); },
    tlDraw: () => { if (isFilm() && st.timeline) tlView.draw(); },
    // um ponto nas coordenadas da linha (x, y) até o desenho, como os pontos dela aparecem agora (com os ossos;
    // i é o índice do ponto, para o @osso dele)
    localMap: (line) => {
      const m = st.model, rec = m && !isFilm() ? m.byLine.get(line) : null;
      if (!rec || !rec.el) return null;
      const pose = currentPose();
      return (x, y, i) => S.handlePos(m, pose, rec, { kind: 'pt', idx: i === undefined ? -1 : i, x, y });
    },
    setCtxMenu: (f) => { ctxMenu = f; },
    toCanvas: (e) => toCanvas(e),
    snapPt: (e, x, y) => snapMouse({ self: true, ref: [x, y] }, x, y, e),
    hitsAt: (e) => hitsAt(e),
    linesAt: (e) => linesAt(e),
    ownLine: (el) => { const m = st.model; return m.lineMap ? m.lineMap[el.line] : el.line; },
    drawPlace: (behind) => drawPlace(behind),
    // a camada onde se desenha (a do cursor) e a de uma linha, para o Pincel de bolha e a Borracha (js/ui-paths.js)
    drawLayer: () => (st.model && !isFilm() ? drawLayer(st.model) : null),
    layerOf: (line) => (st.model && !isFilm() ? layerAt(st.model, line) : null),
    addLine: (pl, cmd, base, rest, o) => addLine(pl, cmd, base, rest, o),
    insertAt: (i, at) => { if (st.model && !isFilm()) insertShapeAt(i, at); },
    pointsOn: () => pointsOn(),
    // o ponto do desenho nas coordenadas do gradiente de uma forma (com box, de 0 a 1 na caixa dela); rs: o tanto
    // que o raio do box vale
    gradCoords: (line, box, pts) => {
      const m = st.model, rec = m.byLine.get(line), F = gradFrame(m, currentPose(), { box }, (rec && rec.el) || null);
      const px = pts.map(([x, y]) => unmap(F.f, x, y, x, y));
      return { px, pts: px.map((l) => (F.box ? [(l[0] - F.b.x) / F.b.w, (l[1] - F.b.y) / F.b.h] : l)), rs: F.box ? F.rs : 1 };
    },
  };
})(window.Weasel = window.Weasel || {});
