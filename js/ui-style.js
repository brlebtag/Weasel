/* Weasel — o acabamento e o estilo de arte pela tela (etapa 7c do plano docs/planos/interface-illustrator.md, seção
   11.8). A parte "Acabamento e estilo" da coluna da direita, no desenho e no filme:
   - Acabamento: o finish (game ou flat) e um controle deslizante para cada número dele (brilho, vinheta, granulado,
     posterizar, pixel, traço de dentro e os efeitos de tela). Arrastar escreve na linha finish, com um Ctrl+Z por
     arraste; sem a linha, ela nasce logo depois do canvas.
   - Estilo de arte: uma miniatura de cada estilo no desenho atual (no filme, no quadro do player); um clique escreve
     a linha art. Embaixo, as opções do estilo escolhido.
   As miniaturas são pequenas e recortadas do meio (os estilos custam de 100 a 700 ms num quadro inteiro, e num
   desenho grande, inteiro e pequeno, o estilo nem apareceria). Elas saem no worker da exportação (js/worker.js, com
   a conta de js/export.js), uma de cada vez, só com a parte aberta e à vista, e de novo quando o código para de mudar
   por um instante. */
(function (W) {
  'use strict';
  const A = W.app, L = W.lang, S = W.scene, F = W.film, ART = W.art, SE = W.sel;
  if (!A || !L || !S || !ART || !SE || !SE.kit) return;
  const K = SE.kit, st = A.st;
  const $ = (id) => document.getElementById(id);
  const dock = $('dock');
  if (!dock) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmtN = (v, d) => { const t = String(Number((+v).toFixed(d === undefined ? 2 : d))); return t === '-0' ? '0' : t; };
  const num = (t) => { const v = Number(String(t).trim().replace(',', '.')); return Number.isFinite(v) ? v : NaN; };
  const keyNow = (w) => 'style-' + w + Date.now();
  const isFilm = () => A.isFilm();
  const E = W.exporter;

  const NAMES = { none: 'nenhum', pixel: 'pixel art', ascii: 'ASCII', toon: 'desenho animado', engraving: 'gravura', woodcut: 'xilogravura', halftone: 'retícula', comic: 'HQ', manga: 'mangá', riso: 'risografia', stencil: 'estêncil', silhouette: 'silhueta', sketch: 'esboço', marker: 'marcador', pencil: 'lápis', crayon: 'giz de cera', chalk: 'giz', watercolor: 'aquarela', lines: 'só contorno', neon: 'neon', cutout: 'recorte', clay: 'massinha', glass: 'vitral', embroidery: 'bordado', stitch: 'ponto-cruz', mosaic: 'mosaico', knit: 'tricô' };
  const STYLES = ['none'].concat(L.ART_STYLES);
  const OPTS = L.ART_OPTS;
  const COMMON = ['boil', 'seed', 'actor'];
  const OPT_NAMES = { size: 'Tamanho', palette: 'Paleta', dither: 'Pontilhado', chars: 'Letras', steps: 'Tons', shadow: 'Sombra', gap: 'Espaço', levels: 'Níveis', paper: 'Papel', boil: 'Ferver', seed: 'Sorteio', angle: 'Ângulo', shift: 'Deslocar', tones: 'Tons', inks: 'Tintas', c: 'Cor', lead: 'Chumbo', grout: 'Rejunte', w: 'Largura' };
  const FLAG_NAMES = { outline: 'contorno', small: 'pequeno no jogo', color: 'colorido', old: 'antigo', bw: 'preto e branco', frame: 'moldura' };
  const OPT_LISTS = { palette: L.ART_PALETTES, dither: ['none', 'bayer'] };

  // os números do finish: [chave, nome, mínimo, máximo, passo, dica]; o padrão tira a chave da linha
  const FIN = [
    ['bloom', 'Brilho', 0, 3, 0.05, 'bloom=: o claro vaza em volta (de 0 a 3)'],
    ['vignette', 'Vinheta', 0, 1, 0.05, 'vignette=: escurece as bordas (de 0 a 1)'],
    ['grain', 'Granulado', 0, 0.33, 0.01, 'grain=: granulado de filme (de 0 a 0.33)'],
    ['posterize', 'Posterizar', 0, 32, 1, 'posterize=: só tantos níveis em cada cor (0 desliga; vai de 2 a 64). A caixinha: só as cores da palette'],
    ['pixel', 'Pixel', 1, 32, 1, 'pixel=: blocos de tantos pixels (1 desliga). Com um art, ele fica de fora'],
    ['inner', 'Traço de dentro', 0, 1, 0.05, 'inner=: a opacidade dos traços dentro de camadas com clip (1 = igual ao resto)'],
  ];
  const SCREEN = [['oldfilm', 'Filme antigo', 'oldfilm=: riscos, poeira e a luz que pisca'], ['vhs', 'VHS', 'vhs=: a fita: cores fora do lugar e a faixa que passa'], ['crt', 'Tubo (CRT)', 'crt=: a televisão de tubo: linhas e a tela curva'], ['glitch', 'Falha', 'glitch=: falha digital: faixas que pulam']];
  const DEF = { bloom: 0, vignette: 0, grain: 0, posterize: 0, pixel: 1, inner: 1, oldfilm: 0, vhs: 0, crt: 0, glitch: 0 };
  const RANGE = new Map(FIN.map((f) => [f[0], f]).concat(SCREEN.map(([k, n, t]) => [k, [k, n, 0, 1, 0.05, t]])));

  // ---------- as linhas ----------
  const lines = () => A.editor.value.split('\n');
  const recOf = (l) => (st.model && l >= 0 ? st.model.byLine.get(l) : null);
  function lineOfCmd(cmd) {
    const m = st.model;
    if (!m) return -1;
    let best = -1;
    for (const [l, r] of m.byLine) if (r && r.st && r.st.cmd === cmd && (best < 0 || l < best)) best = l;
    return best;
  }
  const finLine = () => lineOfCmd('finish');
  // a linha nova (finish ou art) entra logo depois do finish, senão do canvas, senão do film, senão no começo
  function headerAt() {
    const f = finLine();
    if (f >= 0) return f + 1;
    const c = lineOfCmd('canvas');
    if (c >= 0) return c + 1;
    const fl = lineOfCmd('film');
    return fl >= 0 ? fl + 1 : 0;
  }
  function insertAt(at, text, key) {
    const src = lines();
    const next = src.slice(0, at).concat([text], src.slice(at));
    K.rewrite(next, key, st.caret.line >= at ? st.caret.line + 1 : st.caret.line);
  }
  // o art que este painel muda: o do desenho; no filme, o do plano do player (quando ele tem um art próprio) ou o do
  // filme todo (a mesma conta das miniaturas, em js/export.js)
  const target = () => (st.model && E ? E.artTarget(st.model, st.frame) : null);
  const styleOf = (tg) => (tg && tg.art ? tg.art.style : 'none');

  // ---------- escrever ----------
  function ready() {
    if (!st.model) return false;
    if (st.playing) { A.hint('Pause o player para mudar o acabamento ou o estilo.', 2000); return false; }
    return true;
  }
  function setFin(k, v, key) {
    if (!ready()) return;
    const val = v === null || v === undefined || v === '' || (typeof v === 'number' && Math.abs(v - DEF[k]) < 1e-9) ? null : typeof v === 'number' ? fmtN(v, 3) : v;
    const l = finLine();
    if (l >= 0) { A.setAttrs([l], { [k]: val }, null, key || keyNow(k)); return; }
    if (val === null) return;
    insertAt(headerAt(), `finish ${k}=${val}`, key || keyNow(k));
  }
  function setFinStyle(s) {
    if (!ready()) return;
    const l = finLine(), key = keyNow('fstyle');
    if (l < 0) { if (s !== 'game') insertAt(headerAt(), 'finish ' + s, key); return; }
    const t = A.lineText(l), ws = L.splitLine(t).words;
    if (ws[1] && (ws[1].text === 'game' || ws[1].text === 'flat')) { A.setWord(l, 1, s, key); return; }
    if (s === 'game') return;
    A.setLines(new Map([[l, t.slice(0, ws[0].to) + ' ' + s + t.slice(ws[0].to)]]), key);
  }
  // a linha art com outro estilo: ficam as opções que valem nele (e as de todos: boil=, seed=, actor=)
  function artText(t, style) {
    const ws = L.splitLine(t).words, ind = /^[ \t]*/.exec(t)[0], own = OPTS[style] || { attrs: [], flags: [] }, out = [ind + 'art', style];
    for (const w of ws.slice(2)) {
      const eq = L.topIndex(w.text, '=');
      if (eq > 0) { const k = w.text.slice(0, eq); if (own.attrs.includes(k) || COMMON.includes(k)) out.push(w.text); } else if (own.flags.includes(w.text)) out.push(w.text);
    }
    return out.join(' ') + (ws.length ? t.slice(ws[ws.length - 1].to) : '');
  }
  function chooseStyle(style) {
    if (!ready()) return;
    const tg = target(), now = styleOf(tg), key = keyNow('art');
    if (!tg || style === now) return;
    if (tg.line >= 0) {
      // nenhum: no desenho e no filme todo, a linha sai; no plano, vira art none (senão ele pegaria o do filme)
      if (style === 'none' && tg.level !== 'shot') {
        const src = lines(), next = src.slice(0, tg.line).concat(src.slice(tg.line + 1));
        K.rewrite(next, key, st.caret.line > tg.line ? st.caret.line - 1 : st.caret.line === tg.line ? Math.max(0, tg.line - 1) : st.caret.line);
      } else A.setLines(new Map([[tg.line, artText(A.lineText(tg.line), style)]]), key);
    } else if (style !== 'none') insertAt(headerAt(), 'art ' + style, key);
    if (style !== 'none' && !st.show.art && $('tArt')) $('tArt').click();
    const where = tg.level === 'shot' ? ` no plano ${tg.shot.name}` : tg.level === 'film' ? ' no filme todo' : '';
    A.hint(style === 'none' ? `Sem estilo de arte${where}. Ctrl+Z desfaz.` : `art ${style} (${NAMES[style]})${where}. As opções dele ficam embaixo das miniaturas. Ctrl+Z desfaz.`, 2600);
  }
  function setOpt(k, v, flag) {
    if (!ready()) return;
    const tg = target();
    if (!tg || tg.line < 0) return;
    if (flag) A.setAttrs([tg.line], null, { [k]: !!v }, keyNow(k));
    else A.setAttrs([tg.line], { [k]: String(v).trim() === '' ? null : String(v).trim() }, null, keyNow(k));
  }

  // ---------- as miniaturas ----------
  // Feitas no worker da exportação (js/worker.js, com a conta de js/export.js): cada uma custa de 100 a 400 ms, e na
  // página travaria a digitação. Um pedido novo (o código, o quadro ou a variante mudou) abandona o anterior; as
  // miniaturas velhas ficam apagadas até as novas chegarem. Sem worker, elas saem na página, uma de cada vez.
  const TW = 72, TH = 54;
  const WORKER_URL = (() => { const me = document.currentScript && document.currentScript.src; return me ? me.replace(/ui-style\.js(?=[?#]|$)/, 'worker.js') : null; })();
  let useWorker = !!WORKER_URL && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
  let worker = null, jobId = 0, jobSig = null;
  const cache = new Map(); // estilo → { sig, img }
  let queue = [], timer = 0, lastSig = null;
  const size = () => { const k = Math.min(2, window.devicePixelRatio || 1); return [Math.round(TW * k), Math.round(TH * k)]; };
  function thumb(style) {
    const [w, h] = size();
    return E.artThumb(st.model, style, { w, h, frame: st.frame, pose: isFilm() ? null : A.pose() });
  }
  function startWorker() {
    if (worker || !useWorker) return worker;
    try { worker = new Worker(WORKER_URL); } catch (e) { useWorker = false; return null; }
    worker.onmessage = (e) => {
      const d = e.data;
      if (d.id !== jobId) { if (d.bmp) d.bmp.close(); return; }
      if (d.type === 'thumb' && d.bmp) { const old = cache.get(d.style); if (old && old.img && old.img.close) old.img.close(); cache.set(d.style, { sig: jobSig, img: d.bmp }); paintTile(d.style); }
      // o worker não conseguiu ler o arquivo: faz na página
      if (d.type === 'thumbs-error') { useWorker = false; lastSig = null; schedule(60); }
    };
    // o worker não abriu (sem OffscreenCanvas, scripts bloqueados…): faz na página
    worker.onerror = (e) => { e.preventDefault(); worker.terminate(); worker = null; useWorker = false; lastSig = null; schedule(60); };
    return worker;
  }
  // a galeria à vista na coluna (que rola)
  const inView = () => { if (!gal || !gal.isConnected) return false; const a = gal.getBoundingClientRect(), b = dock.getBoundingClientRect(); return a.height > 0 && a.bottom > b.top && a.top < b.bottom; };
  // o que muda as miniaturas: o código, o quadro, a variante, a animação e o tamanho dos pixels da tela
  const sigNow = () => [A.editor.value, st.frame, st.variant || '', st.anim || '', isFilm() ? 'f' : 'd', window.devicePixelRatio || 1].join('\u0001');
  const shown = () => !!st.model && !sec.hidden && !dock.hidden && !sec.classList.contains('fold') && inView();
  function schedule(delay) { clearTimeout(timer); timer = setTimeout(pump, delay === undefined ? 450 : delay); }
  function pump() {
    timer = 0;
    if (!shown() || !E) return;
    if (st.playing || st.drag || st.tdrag) { schedule(500); return; }
    const sig = sigNow();
    if (sig !== lastSig) {
      lastSig = sig;
      const cur = styleOf(target());
      const order = [cur].concat(STYLES.filter((x) => x !== cur));
      if (startWorker()) {
        const [w, h] = size();
        jobId++;
        jobSig = sig;
        worker.postMessage({ type: 'thumbs', id: jobId, text: A.editor.value, file: st.current, files: [...st.files].map(([k, v]) => [k, k === st.current ? A.editor.value : v]), variant: st.variant || null, anim: isFilm() ? null : st.anim || null, frame: st.frame, w, h, styles: order });
        queue = [];
        return;
      }
      queue = order;
    }
    if (useWorker) return;
    while (queue.length && cache.has(queue[0]) && cache.get(queue[0]).sig === sig) queue.shift();
    const style = queue.shift();
    if (!style) return;
    const t0 = performance.now();
    try { cache.set(style, { sig, img: thumb(style) }); } catch (e) { cache.set(style, { sig, img: null }); }
    paintTile(style);
    // um tempo para a tela respirar entre uma e outra
    schedule(Math.min(160, Math.max(16, (performance.now() - t0) * 0.5)));
  }
  function paintTile(style) {
    const cv = gal && gal.querySelector(`[data-style="${style}"] canvas`), c = cache.get(style);
    if (!cv || !c || !c.img) return;
    if (cv.width !== c.img.width || cv.height !== c.img.height) { cv.width = c.img.width; cv.height = c.img.height; }
    const x = cv.getContext('2d');
    x.clearRect(0, 0, cv.width, cv.height);
    x.drawImage(c.img, 0, 0);
    cv.parentNode.classList.toggle('old', c.sig !== lastSig);
  }

  // o art de um estilo com as opções padrão: o valor de cada opção aparece apagado no campo vazio
  const defaults = new Map();
  function defArt(style) {
    if (!defaults.has(style)) { let a = null; try { a = L.parse(`canvas 8 8\nart ${style}`, {}).art || null; } catch (e) { a = null; } defaults.set(style, a); }
    return defaults.get(style);
  }

  // ---------- a parte da coluna ----------
  const sec = document.createElement('section');
  sec.className = 'dk-sec st-sec';
  sec.dataset.sec = 'style';
  sec.innerHTML = `<div class="dk-head"><b>Acabamento e estilo</b><span class="dk-what"></span><button type="button" class="x" data-close="style" title="Fechar (Janela › Acabamento e estilo abre de novo)" aria-label="Fechar">✕</button></div><div class="dk-body"></div>`;
  dock.appendChild(sec);
  const body = sec.querySelector('.dk-body'), what = sec.querySelector('.dk-what');
  let gal = null, shape = '';
  const row = (label, inner, title) => `<div class="pp-row"${title ? ` title="${esc(title)}"` : ''}><span class="pp-k">${label}</span>${inner}</div>`;
  const slider = ([k, n, lo, hi, step, t]) => row(n, `<input type="range" class="pp-range" data-fin="${k}" min="${lo}" max="${hi}" step="${step}"><input type="text" class="pp-num" data-finv="${k}" spellcheck="false" autocomplete="off">`, t);
  function render() {
    if (sec.hidden || !body) return;
    const m = st.model;
    if (!m) { body.innerHTML = ''; shape = ''; return; }
    const tg = target(), style = styleOf(tg);
    const sig = [isFilm(), tg.level, tg.line, style, tg.shot ? tg.shot.name : ''].join('|');
    if (sig !== shape) {
      shape = sig;
      let h = `<div class="pp-grp"><div class="pp-t">Acabamento <span class="st-line" data-line="fin"></span></div>`;
      h += row('Contorno', '<select class="pp-sel" data-fstyle="1"><option value="game">game: com contorno</option><option value="flat">flat: sem contorno</option></select>', 'finish game desenha os contornos (ink=); finish flat tira todos');
      for (const f of FIN) {
        h += slider(f);
        if (f[0] === 'posterize') h += `<div class="pp-row st-sub"><span class="pp-k"></span><label class="pp-chk" title="posterize=palette: cada ponto vira a cor mais parecida da palette"><input type="checkbox" data-fpal="1"> só as cores da palette</label></div>`;
      }
      h += `<div class="pp-sub">Efeitos de tela (filme, vídeo, GIF e PNG)</div>`;
      for (const [k, n, t] of SCREEN) h += slider([k, n, 0, 1, 0.05, t]);
      h += '</div>';
      const where = tg.level === 'shot' ? `do plano ${esc(tg.shot.name)}` : tg.level === 'film' ? 'do filme todo' : '';
      h += `<div class="pp-grp"><div class="pp-t">Estilo de arte ${where ? `<span class="st-where">${where}</span>` : ''}<span class="st-line" data-line="art"></span></div><div class="st-gal">`;
      for (const s of STYLES) h += `<button type="button" data-style="${s}" class="${s === style ? 'on' : ''}" title="${s === 'none' ? 'sem estilo de arte' : `art ${s}`}"><canvas width="${TW}" height="${TH}"></canvas><span>${NAMES[s]}</span></button>`;
      h += '</div><div class="st-opts"></div></div>';
      body.innerHTML = h;
      gal = body.querySelector('.st-gal');
      for (const s of STYLES) paintTile(s);
      const ob = body.querySelector('.st-opts');
      if (style !== 'none' && tg.line >= 0) {
        const own = OPTS[style] || { attrs: [], flags: [] }, d = defArt(style) || {};
        let o = `<div class="pp-sub">Opções do ${esc(NAMES[style])} (<code>art ${style}</code>)</div>`;
        for (const k of own.attrs) {
          const t = `${k}=`;
          if (OPT_LISTS[k]) o += row(OPT_NAMES[k] || k, `<select class="pp-sel" data-opt="${k}"><option value="">(padrão)</option>${OPT_LISTS[k].map((v) => `<option value="${v}">${v}</option>`).join('')}</select>`, t);
          else { const ph = typeof d[k] === 'number' || typeof d[k] === 'string' ? String(d[k]) : ''; o += row(OPT_NAMES[k] || k, `<input type="text" class="pp-txt" data-opt="${k}" spellcheck="false" autocomplete="off" placeholder="${esc(ph)}">`, t); }
        }
        if (own.flags.length) o += `<div class="pp-row st-flags">${own.flags.map((f) => `<label class="pp-chk" title="${f}"><input type="checkbox" data-flag="${f}"> ${FLAG_NAMES[f] || f}</label>`).join('')}</div>`;
        ob.innerHTML = o;
      }
    }
    fill(tg);
    schedule();
  }
  function setV(el, v) { if (el && el !== document.activeElement) { if (el.type === 'checkbox') el.checked = !!v; else el.value = v; } }
  function fill(tg) {
    const m = st.model, fn = m.finish, fl = finLine();
    what.textContent = `${fn.style}${styleOf(tg) !== 'none' ? ' · art ' + styleOf(tg) : ''}`;
    setV(body.querySelector('[data-fstyle]'), fn.style);
    for (const k of RANGE.keys()) {
      const raw = fn[k], pal = k === 'posterize' && raw === 'palette', v = pal ? 0 : typeof raw === 'number' ? raw : DEF[k];
      setV(body.querySelector(`[data-fin="${k}"]`), v);
      setV(body.querySelector(`[data-finv="${k}"]`), pal ? 'palette' : fmtN(v, 2));
      const r = body.querySelector(`[data-fin="${k}"]`);
      if (r) r.disabled = pal;
    }
    setV(body.querySelector('[data-fpal]'), fn.posterize === 'palette');
    const ln = (sel, l) => { const s = body.querySelector(`[data-line="${sel}"]`); if (s) s.innerHTML = l >= 0 ? `<button type="button" class="pp-go" data-go="${l}" title="Ir para a linha no código">linha ${l + 1}</button>` : ''; };
    ln('fin', fl);
    ln('art', tg.line);
    if (gal) for (const b of gal.children) b.classList.toggle('on', b.dataset.style === styleOf(tg));
    const r = recOf(tg.line);
    if (r && r.st && styleOf(tg) !== 'none') {
      for (const el of body.querySelectorAll('[data-opt]')) { const a = r.st.attrs.get(el.dataset.opt); setV(el, a ? a.text : ''); }
      for (const el of body.querySelectorAll('[data-flag]')) setV(el, r.st.pos.slice(2).some((w) => w.text === el.dataset.flag));
    }
  }
  // arrastar um controle: um Ctrl+Z para o arraste inteiro; o texto vai para o código uma vez por quadro da tela
  let gesture = null, pend = null, raf = 0;
  const flush = () => { raf = 0; if (pend) { const p = pend; pend = null; setFin(p.k, p.v, p.key); } };
  body.addEventListener('pointerdown', (e) => { if (e.target.dataset && e.target.dataset.fin) gesture = keyNow('drag'); });
  body.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.dataset.fin) return;
    const k = t.dataset.fin, v = num(t.value);
    const box = body.querySelector(`[data-finv="${k}"]`);
    if (box) box.value = fmtN(v, 2);
    pend = { k, v: k === 'posterize' && v < 2 ? null : v, key: gesture || keyNow(k) };
    if (!raf) raf = requestAnimationFrame(flush);
  });
  body.addEventListener('change', (e) => {
    const t = e.target, d = t.dataset;
    if (d.fin) { if (raf) { cancelAnimationFrame(raf); flush(); } gesture = null; return; }
    if (d.finv) { changeNum(d.finv, t.value); return; }
    if (d.fstyle) { setFinStyle(t.value); return; }
    if (d.fpal) { setFin('posterize', t.checked ? 'palette' : null); return; }
    if (d.opt) { setOpt(d.opt, t.value, false); return; }
    if (d.flag) setOpt(d.flag, t.checked, true);
  });
  body.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.key !== 'Enter' || t.tagName !== 'INPUT') return;
    e.preventDefault();
    if (t.dataset.finv) changeNum(t.dataset.finv, t.value);
    else if (t.dataset.opt) setOpt(t.dataset.opt, t.value, false);
  });
  function changeNum(k, raw) {
    const s = String(raw).trim();
    if (k === 'posterize' && s === 'palette') { setFin(k, 'palette'); return; }
    const v = num(s), f = RANGE.get(k);
    if (!Number.isFinite(v)) { shape += '!'; render(); return; }
    let x = Math.max(f[2], k === 'posterize' ? Math.min(64, v) : Math.min(f[3], v));
    if (k === 'pixel' || k === 'posterize') x = Math.round(x);
    setFin(k, k === 'posterize' && x < 2 ? null : x);
  }
  body.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { A.editor.reveal(+g.dataset.go, 0); return; }
    const b = e.target.closest('[data-style]');
    if (b) chooseStyle(b.dataset.style);
  });
  // só desenha as miniaturas com a galeria à vista: rolar a coluna até ela começa
  dock.addEventListener('scroll', () => { if (!timer) schedule(150); }, { passive: true });
  new MutationObserver(() => { if (!sec.hidden) { shape = ''; render(); } else schedule(); }).observe(sec, { attributes: true, attributeFilter: ['hidden', 'class'] });

  A.on('model', () => render());
  let drawSig = '';
  A.on('draw', () => {
    // no filme, o quadro muda o art do plano (e as miniaturas); no desenho, o quadro da animação
    const s = `${st.frame}|${st.variant || ''}`;
    if (s !== drawSig) { drawSig = s; if (!st.playing) render(); }
  });
  render();

  W.styleUi = { chooseStyle, setFin, setFinStyle, setOpt, target, thumb, pump, worker: () => useWorker };
})(window.Weasel = window.Weasel || {});
