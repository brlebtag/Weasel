/* Weasel — o Traçado de imagem no editor (etapa 2 do plano docs/planos/tracado-de-imagem.md). Objeto › Traçado de
   imagem… traça a imagem de um ref: o da linha do cursor, o escolhido ou o único com a imagem aberta.
   - O painel mostra a imagem e o traçado lado a lado, com dois controles: Cores (o --colors da linha de comando) e
     Detalhe (o --tol ao contrário: mais detalhe, a curva mais perto da borda). A conta roda num worker
     (js/trace-worker.js), com uma barra de progresso; mexer num controle abandona a conta de antes. Enter (ou o
     botão Traçar) aplica e Esc cancela, como no Simplificar. A caixa Sem fundo tira o fundo chapado (o --no-bg).
   - A imagem é traçada no tamanho em que aparece no desenho (o scale= do ref, até 1:1), no máximo 4 Mpx.
   - O resultado vira uma camada nova (rascunho_trace), logo antes da primeira camada do desenho (logo na frente da
     automática, a mais de trás que uma camada pode ficar), com os pontos já no lugar, no tamanho e no giro do ref.
     Uma cor igual (o mesmo #hex) a uma da palette usa o nome de lá; as outras ganham nomes livres (color…), e os
     degradês e buracos também (gradient…, _hole…). O ref fica como estava, e um Ctrl+Z desfaz tudo. */
(function (W) {
  'use strict';
  const A = W.app, T = W.trace, S = W.scene, L = W.lang, G = W.geom;
  if (!A || !T || !S || !L) return;
  const st = A.st;
  const $ = (id) => document.getElementById(id);
  // o worker fica ao lado deste arquivo, com o mesmo ?v=
  const WORKER = (() => { const me = document.currentScript && document.currentScript.src; return me ? me.replace(/ui-trace\.js(?=[?#]|$)/, 'trace-worker.js') : null; })();
  const MAX_PX = 4e6; // como o aviso da linha de comando: acima disso, a imagem é traçada menor
  const THUMB = 196; // o lado das miniaturas, em px da tela
  const MANY = 2000; // formas a partir das quais o painel avisa que o editor fica mais lento

  // Cores: de 2 a 256, numa escala que anda devagar no começo. Detalhe: a tolerância de 3 px (0) a 0,1 px (100).
  const CMIN = 2, CMAX = 256, TMIN = 0.1, TMAX = 3;
  const cToS = (c) => Math.round((100 * Math.log(c / CMIN)) / Math.log(CMAX / CMIN));
  const sToC = (s) => Math.round(CMIN * Math.pow(CMAX / CMIN, s / 100));
  const tToS = (t) => Math.round((100 * Math.log(TMAX / t)) / Math.log(TMAX / TMIN));
  const sToT = (s) => { const t = TMAX * Math.pow(TMIN / TMAX, s / 100); return t < 1 ? Math.round(t * 100) / 100 : Math.round(t * 10) / 10; };
  const num = (v) => String(v).replace('.', ',');
  const last = { colors: T.DEFAULTS.colors, tol: T.DEFAULTS.tol, noBg: false };

  let tr = null, panel = null, worker = null, job = 0, later = 0, noWorker = !WORKER || typeof Worker === 'undefined';

  // ---------- o ref ----------
  // { r, info } ou { why }: o ref da linha do cursor, um escolhido, ou o único com a imagem aberta
  function target() {
    const m = st.model;
    if (!m || A.isFilm()) return { why: 'O Traçado de imagem é para desenhos (num filme, as imagens guia não aparecem).' };
    const refs = m.refs || [];
    if (!refs.length) return { why: 'Abra uma imagem (Arquivo › Abrir… ou arraste para o desenho): ela vira uma linha ref, e o Traçado de imagem faz as formas dela.' };
    const sel = A.selected(), open = refs.filter((x) => A.refInfo(x));
    const r = refs.find((x) => x.line === st.caret.line) || refs.find((x) => sel.includes(x.line)) || (open.length === 1 ? open[0] : null);
    if (!r) return { why: `Ponha o cursor na linha do ref que quer traçar (${refs.map((x) => x.name).join(', ')}).` };
    const info = A.refInfo(r);
    if (!info) return { why: `A imagem "${r.file}" (ref ${r.name}) não está aberta neste navegador: abra o arquivo dela (Arquivo › Abrir… ou o painel Referências).` };
    return { r, info };
  }
  // os pixels da imagem no tamanho em que ela aparece no desenho (até 1:1 e até MAX_PX)
  function pixels(info, scale) {
    const k = Math.min(1, scale, Math.sqrt(MAX_PX / (info.w * info.h)));
    const w = Math.max(1, Math.round(info.w * k)), h = Math.max(1, Math.round(info.h * k));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d', { willReadFrequently: true });
    // em 1:1, sem reamostrar (com tamanho e suavização, o canvas filtra os pixels mesmo sem mudar a escala)
    if (w === info.w && h === info.h) cx.drawImage(info.img, 0, 0);
    else { cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(info.img, 0, 0, w, h); }
    return { width: w, height: h, data: cx.getImageData(0, 0, w, h).data };
  }

  // ---------- o painel ----------
  function build() {
    panel = document.createElement('div');
    panel.id = 'tracePanel';
    panel.className = 'ref-panel trace-panel';
    panel.hidden = true;
    panel.innerHTML = '<div class="rp-head"><b>Traçado de imagem</b><span class="tr-src"></span><button type="button" class="x" title="Cancelar (Esc)" aria-label="Cancelar">×</button></div>'
      + '<div class="tr-pics"><figure><canvas class="tr-in"></canvas><figcaption>imagem</figcaption></figure><figure><canvas class="tr-out"></canvas><figcaption>traçado</figcaption></figure></div>'
      + '<label class="tr-row" title="Quantas cores o traçado procura na imagem: menos cores, menos formas (o --colors da linha de comando)"><span>Cores</span><input type="range" class="tr-c" min="0" max="100" step="1" aria-label="Cores"><output class="tr-cv"></output></label>'
      + '<label class="tr-row" title="Quanto a curva segue a borda da imagem: mais detalhe, mais pontos (o --tol da linha de comando, ao contrário: o valor é quanto a curva pode se afastar da borda)"><span>Detalhe</span><input type="range" class="tr-d" min="0" max="100" step="1" aria-label="Detalhe"><output class="tr-dv"></output></label>'
      + '<label class="tr-row" title="Tira o fundo chapado: a cor que ocupa a maior parte da borda da imagem (o --no-bg da linha de comando). Um fundo fechado dentro da figura, entre o braço e o corpo, fica."><span>Fundo</span><span class="tr-bgw"><input type="checkbox" class="tr-b">tirar o fundo chapado</span><output class="tr-bv"></output></label>'
      + '<div class="tr-state"><progress class="tr-prog" max="1" value="0"></progress><span class="tr-msg"></span></div>'
      + '<div class="tr-note" hidden></div>'
      + '<div class="rp-foot"><button type="button" class="tr-ok">Traçar</button><button type="button" class="tr-no">Cancelar</button><small>vira uma camada nova, no lugar da imagem (Ctrl+Z desfaz)</small></div>';
    $('stage').appendChild(panel);
    const rc = panel.querySelector('.tr-c'), rd = panel.querySelector('.tr-d');
    rc.addEventListener('input', () => set({ colors: sToC(Number(rc.value)) }, true));
    rd.addEventListener('input', () => set({ tol: sToT(Number(rd.value)) }, true));
    const rb = panel.querySelector('.tr-b');
    rb.addEventListener('change', () => set({ noBg: rb.checked }, false));
    panel.querySelector('.x').addEventListener('click', () => close(true));
    panel.querySelector('.tr-no').addEventListener('click', () => close(true));
    panel.querySelector('.tr-ok').addEventListener('click', apply);
  }
  function showValues() {
    panel.querySelector('.tr-c').value = String(cToS(tr.colors));
    panel.querySelector('.tr-d').value = String(tToS(tr.tol));
    panel.querySelector('.tr-cv').textContent = String(tr.colors);
    panel.querySelector('.tr-dv').textContent = `${num(tr.tol)} px`;
    panel.querySelector('.tr-b').checked = tr.noBg;
    const bv = panel.querySelector('.tr-bv');
    bv.textContent = tr.noBg && tr.res && !tr.busy ? tr.res.bg || 'nenhum' : '';
    bv.title = tr.noBg && tr.res && tr.res.bg ? `A cor do fundo que ficou de fora: ${tr.res.bg}` : '';
  }
  // arrastando um controle, a conta espera o mouse parar um pouquinho
  function set(ch, soon) {
    if (!tr) return;
    Object.assign(tr, ch);
    Object.assign(last, ch);
    tr.busy = true;
    showValues();
    clearTimeout(later);
    stop();
    progress(0, 'esperando');
    if (soon) later = setTimeout(() => { if (tr) run(); }, 250); else run();
  }
  function progress(f, what) {
    panel.querySelector('.tr-prog').value = f;
    panel.querySelector('.tr-prog').hidden = false;
    panel.querySelector('.tr-msg').textContent = `${what}… ${Math.round(f * 100)}%`;
    panel.querySelector('.tr-out').classList.add('old');
    panel.querySelector('.tr-ok').disabled = false;
  }
  function thumbSize(w, h) {
    const k = Math.min(THUMB / w, THUMB / h), dpr = window.devicePixelRatio || 1;
    return { cw: Math.max(1, Math.round(w * k)), ch: Math.max(1, Math.round(h * k)), dpr };
  }
  function fit(cv, w, h) {
    const { cw, ch, dpr } = thumbSize(w, h);
    cv.style.width = cw + 'px';
    const W2 = Math.round(cw * dpr), H2 = Math.round(ch * dpr);
    if (cv.width !== W2 || cv.height !== H2) { cv.width = W2; cv.height = H2; }
    const cx = cv.getContext('2d');
    cx.clearRect(0, 0, W2, H2);
    return cx;
  }

  // ---------- a conta ----------
  function stop() {
    job++;
    if (worker) { worker.terminate(); worker = null; }
  }
  function run() {
    stop();
    const id = job, img = tr.img, opts = { colors: tr.colors, tol: tr.tol, noBg: tr.noBg };
    tr.busy = true;
    tr.t0 = performance.now();
    progress(0, 'cores');
    const done = (res) => {
      if (id !== job || !tr) return;
      worker = null;
      tr.busy = false;
      tr.res = res;
      tr.secs = (performance.now() - tr.t0) / 1000;
      shown();
      if (tr.go) apply();
    };
    const fail = (msg) => {
      if (id !== job || !tr) return;
      worker = null;
      tr.busy = false;
      tr.res = null;
      tr.go = false;
      panel.querySelector('.tr-prog').hidden = true;
      panel.querySelector('.tr-msg').textContent = `não deu para traçar: ${msg}`;
      panel.querySelector('.tr-ok').disabled = true;
    };
    // sem worker (a página aberta como arquivo, sem servidor): na página mesmo, depois de mostrar a barra
    const here = () => setTimeout(() => {
      if (id !== job || !tr) return;
      try { done(T.trace(img, Object.assign({ body: false }, opts))); } catch (e) { fail(e.message || String(e)); }
    }, 30);
    if (noWorker) { here(); return; }
    try { worker = new Worker(WORKER); } catch (e) { noWorker = true; here(); return; }
    let heard = false;
    worker.onmessage = (e) => {
      const msg = e.data;
      if (id !== job) return;
      heard = true;
      if (msg.type === 'progress') progress(msg.f, msg.what);
      else if (msg.type === 'done') done(msg.res);
      else fail(msg.message);
    };
    // o worker nem abriu (file://, bloqueado): a conta vai para a página
    worker.onerror = (e) => {
      if (id !== job) return;
      e.preventDefault();
      if (!heard) { noWorker = true; worker = null; here(); } else fail(e.message || 'o worker parou');
    };
    const data = img.data.slice();
    worker.postMessage({ img: { width: img.width, height: img.height, data }, opts }, [data.buffer]);
  }
  // o traçado pronto: a miniatura (o desenho de verdade, pelo motor do Weasel) e as contas
  function shown() {
    const res = tr.res, s = res.stats;
    panel.querySelector('.tr-prog').hidden = true;
    const pl = (n, one, many) => `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`;
    panel.querySelector('.tr-msg').textContent = `${pl(s.shapes, 'forma', 'formas')} · ${pl(s.points, 'ponto', 'pontos')} · ${pl(s.colors, 'cor', 'cores')} na palette${s.gradients ? ` · ${pl(s.gradients, 'degradê', 'degradês')}` : ''} · ${num(tr.secs.toFixed(1))} s`;
    showValues();
    const note = panel.querySelector('.tr-note'), notes = [];
    if (tr.noBg && !res.bg) notes.push('Não achei um fundo chapado (uma cor só, opaca, em pelo menos metade da borda da imagem): o traçado ficou com tudo.');
    if (s.shapes >= MANY) notes.push('Muitas formas: o código fica grande e o editor, mais lento. Menos Cores (ou menos Detalhe) ajuda.');
    note.hidden = !notes.length;
    note.textContent = notes.join(' ');
    panel.querySelector('.tr-ok').disabled = !s.shapes;
    const out = panel.querySelector('.tr-out');
    out.classList.remove('old');
    const cx = fit(out, res.width, res.height);
    try {
      const m = L.parse(T.file(Object.assign({}, res, { body: T.lines(res) }), {}));
      const img = S.renderImage(m, S.makePose(m, null, 0), { scale: out.width / res.width, transparent: true, guides: false });
      cx.drawImage(img, 0, 0, out.width, out.height);
    } catch (e) { /* a miniatura é só para ver: sem ela, o traçado continua valendo */ }
  }

  // ---------- abrir, fechar, aplicar ----------
  function open() {
    const t = target();
    if (t.why) { A.hint(t.why, 4200); return; }
    if (W.pencil && W.pencil.simplifying()) return;
    if (!panel) build();
    if (tr) close(false);
    const { r, info } = t;
    tr = { name: r.name, file: r.file, colors: last.colors, tol: last.tol, noBg: last.noBg, img: pixels(info, r.scale), res: null, busy: false, go: false };
    const src = panel.querySelector('.tr-src');
    src.textContent = `${r.name} · ${tr.img.width}×${tr.img.height}${tr.img.width !== info.w ? ` de ${info.w}×${info.h}` : ''}`;
    src.title = tr.img.width !== info.w ? `A imagem tem ${info.w}×${info.h} px e é traçada em ${tr.img.width}×${tr.img.height}: o tamanho em que ela aparece no desenho (scale=${r.scale})${info.w * info.h * r.scale * r.scale > MAX_PX ? `, até ${MAX_PX / 1e6} Mpx` : ''}.` : `A imagem é traçada no tamanho dela (${info.w}×${info.h} px).`;
    const inp = panel.querySelector('.tr-in'), cx = fit(inp, info.w, info.h);
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(info.img, 0, 0, inp.width, inp.height);
    fit(panel.querySelector('.tr-out'), info.w, info.h);
    panel.querySelector('.tr-note').hidden = true;
    panel.hidden = false;
    showValues();
    run();
    A.draw();
    panel.querySelector('.tr-c').focus();
  }
  function close(cancel) {
    if (!tr) return;
    clearTimeout(later);
    stop();
    tr = null;
    panel.hidden = true;
    A.draw();
    if (cancel) A.hint('Traçado de imagem cancelado: nada mudou.', 1600);
  }
  // o ref de agora (o código pode ter mudado o lugar ou o tamanho dele com o painel aberto)
  const refNow = () => (st.model && !A.isFilm() ? (st.model.refs || []).find((x) => x.name === tr.name && x.file === tr.file) : null);
  // #rgb, #rgba, #rrggbb e #rrggbbaa no mesmo jeito (#rrggbbaa minúsculo), para achar a mesma cor na palette
  function hex8(v) {
    if (typeof v !== 'string' || !/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return null;
    let h = v.slice(1).toLowerCase();
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    return '#' + (h.length === 6 ? h + 'ff' : h);
  }
  function apply() {
    if (!tr) return;
    // ainda traçando: aplica quando terminar
    if (tr.busy) { tr.go = true; panel.querySelector('.tr-msg').textContent += ' · aplica quando terminar'; return; }
    if (!tr.res || !tr.res.stats.shapes) return;
    const K = W.sel && W.sel.kit;
    if (K && !K.ready('traçar a imagem')) { tr.go = false; return; }
    const r = refNow(), info = r && A.refInfo(r);
    if (!info) { close(false); A.hint('O ref sumiu do código: o Traçado de imagem fechou sem mudar nada.', 2800); return; }
    const m = st.model, res = tr.res, M = info.m, kx = tr.img.width / info.w, ky = tr.img.height / info.h;
    const ed = A.editor, v = ed.value, s = v.split('\n');
    // os nomes que o código já usa (as palavras dele): os novos não podem ser nenhum desses
    const used = new Set(v.match(/[A-Za-z_][\w-]*/g) || []);
    const free = (base, plain) => {
      if (plain && !used.has(base)) { used.add(base); return base; }
      for (let k = plain ? 2 : 1; ; k++) if (!used.has(base + k)) { used.add(base + k); return base + k; }
    };
    const have = new Map();
    for (const [name, val] of m.palette) { const h = hex8(val); if (h && !have.has(h)) have.set(h, name); }
    const pal = [], reused = new Set();
    const cname = res.palette.map((hx) => {
      const h = hex8(hx);
      if (have.has(h)) { reused.add(have.get(h)); return have.get(h); }
      const n = free('color');
      have.set(h, n);
      pal.push(`${n}=${hx}`);
      return n;
    });
    const gname = new Map(), hname = new Map();
    const named = (map, base) => (k) => { if (!map.has(k)) map.set(k, free(base)); return map.get(k); };
    const body = T.lines(res, {
      map: (x, y) => G.M.apply(M, x / kx, y / ky),
      color: (j) => cname[j],
      gradient: named(gname, 'gradient'),
      hole: named(hname, '_hole'),
    });
    const layer = free(`${tr.name}_trace`, true);
    const block = [`# traçado da imagem do ref ${tr.name} (Objeto › Traçado de imagem: Cores ${tr.colors}, Detalhe ${num(tr.tol)} px${res.bg ? `, sem o fundo ${res.bg}` : ''})`];
    for (let i = 0; i < pal.length; i += 8) block.push('palette ' + pal.slice(i, i + 8).join(' '));
    block.push(`layer ${layer}`, ...body);
    // logo antes da primeira camada (com os comentários de cima dela); sem camadas, no fim
    const first = A.layerTree(m).find((t) => t.line >= 0);
    const at = first ? (K ? K.noteTop(s, first.line, -1) : first.line) : s.length;
    // uma linha em branco antes do bloco (no fim do arquivo, a de antes é a última com texto)
    const prev = at < s.length ? s[at - 1] : s[s.length - (v.endsWith('\n') ? 2 : 1)];
    const gap = at > 0 && (prev || '').trim() ? '\n' : '';
    let off, txt;
    if (at >= s.length) {
      off = v.length;
      txt = (!v.length || v.endsWith('\n') ? '' : '\n') + gap + block.join('\n') + '\n';
    } else {
      off = ed.lineStart(at);
      txt = gap + block.join('\n') + '\n' + (s[at].trim() ? '\n' : '');
    }
    const layerOff = off + txt.indexOf(`\nlayer ${layer}\n`) + 1;
    const stats = res.stats;
    close(false);
    ed.replaceRange(off, off, txt, { key: 'trace' + Date.now(), select: [layerOff, layerOff] });
    A.deselect();
    ed.reveal(ed.caret().line, 0);
    A.hint(`Traçado: ${stats.shapes} formas na camada ${layer}${pal.length ? `, ${pal.length} cores novas na palette` : ''}${reused.size ? ` (${reused.size} já estavam lá)` : ''}. O ref continua igual; Ctrl+Z desfaz.`, 4200);
  }

  // o código mudou o ref (apagou, trocou a imagem) ou virou filme: o painel fecha
  A.on('model', () => { if (tr && !refNow()) { close(false); A.hint('O ref mudou: o Traçado de imagem fechou sem mudar nada.', 2400); } });
  window.addEventListener('keydown', (e) => {
    if (!tr || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('textarea, dialog, [contenteditable]')) return;
    if (t && t.closest && t.closest('input, select') && !panel.contains(t)) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(true); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); apply(); }
  }, true);
  // no desenho, o contorno da imagem que está sendo traçada
  A.addOverlay((ctx, z) => {
    if (!tr) return;
    const r = refNow(), info = r && A.refInfo(r);
    if (!info) return;
    const c = [[0, 0], [info.w, 0], [info.w, info.h], [0, info.h]].map(([x, y]) => G.M.apply(info.m, x, y));
    ctx.beginPath();
    c.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.setLineDash([6 / z, 4 / z]);
    ctx.lineWidth = 1.5 / z;
    ctx.strokeStyle = '#2f8cff';
    ctx.stroke();
    ctx.setLineDash([]);
  });

  W.traceUi = { open, tracing: () => !!tr, can: () => !target().why };
})(window.Weasel = window.Weasel || {});
