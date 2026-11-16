/* Weasel — a casca no jeito do Illustrator: a barra de menus, a barra de ferramentas, o seletor das vistas
   (Código · Dividido · Design, como no Dreamweaver) e as letras das ferramentas.
   O desenho, o código e os modos ficam no app.js; aqui só se arruma a tela em volta e se chama o que ele expõe
   em W.app. O plano está em docs/planos/interface-illustrator.md (etapa 1). */
(function (W) {
  'use strict';
  const A = W.app;
  if (!A) return;
  const $ = (id) => document.getElementById(id);
  const st = A.st;

  // ---------- a barra de ferramentas ----------
  // A lista é a mesma para os botões, os títulos e as letras do teclado. shift: a letra vem com Shift. grp: as
  // ferramentas parecidas dividem uma casa (como no Illustrator): a casa mostra a última usada, e segurar o botão (ou
  // o botão direito nele) mostra as outras.
  const svg = (inner) => `<svg viewBox="0 0 16 16" aria-hidden="true">${inner}</svg>`;
  const ARROW = 'M3.5 1.8v11.6l3.1-3 2.1 4.4 2-.95-2.1-4.35 4.3-.15z';
  const TOOLS = [
    { id: 'select', key: 'v', label: 'Seleção', tip: 'escolhe e move formas; a caixa gira e estica. Shift+clique soma; arrastar no vazio faz a caixa de seleção; Alt+arrastar copia', icon: svg(`<path class="f" d="${ARROW}"/>`) },
    { id: 'direct', key: 'a', label: 'Seleção direta', tip: 'os pontos e as alças da forma do cursor; arrastar no vazio faz a caixa de seleção', icon: svg(`<path d="${ARROW}"/>`) },
    { id: 'wand', key: 'y', label: 'Varinha mágica', tip: 'clique numa forma: escolhe todas com a mesma cor (Shift soma, Alt tira)', icon: svg('<path d="M2.5 13.5l7-7"/><path class="f" d="M11.6 1.6l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/><path d="M13.6 7.4v1.6M12.8 8.2h1.6M7.4 1.6v1.6M6.6 2.4h1.6"/>') },
    { id: 'lasso', key: 'q', label: 'Laço', tip: 'arraste em volta: escolhe as formas que o contorno pega (Shift soma, Alt tira)', icon: svg('<path d="M8 2.5c3.3 0 5.8 1.6 5.8 3.7S11.3 9.9 8 9.9 2.2 8.3 2.2 6.2 4.7 2.5 8 2.5z"/><path d="M4.3 9.2c-.9.9-.6 2.3.6 2.6 1 .3 1.4 1.1.9 2.2"/>') },
    '-',
    { id: 'pen', key: 'p', grp: 'pen', label: 'Caneta', tip: 'clique põe um canto; apertar e arrastar puxa as alças (Alt, no meio: só a de saída). Clique no primeiro ponto fecha um shape; Enter ou Esc termina um stroke; Backspace tira o último ponto', icon: svg('<path d="M8 1.8l4.4 6.6L8 14.2 3.6 8.4z"/><path d="M8 1.8v5.6"/><circle class="f" cx="8" cy="8.6" r="1.1"/>') },
    { id: 'curve', key: '~', shift: true, grp: 'pen', label: 'Curvatura', tip: 'cada clique põe um ponto liso, e a curva passa por ele; duplo clique ou Alt+clique põe um canto. Clique no primeiro ponto fecha um shape; Enter ou Esc termina um stroke', icon: svg('<path d="M2.4 12.6C3.6 6 8.4 3.4 13.6 5.4"/><circle class="f" cx="2.6" cy="12.4" r="1.3"/><circle class="f" cx="7.6" cy="5" r="1.3"/><circle class="f" cx="13.4" cy="5.4" r="1.3"/>') },
    { id: 'anchor', key: 'c', shift: true, grp: 'pen', label: 'Ponto de ancoragem', tip: 'clique num ponto troca canto e liso; arraste um ponto para puxar as alças; arraste um lado da alça para mexer só nele (alça quebrada)', icon: svg('<path d="M2.6 13.4 8 3.6l5.4 9.8"/><rect class="f" x="6.7" y="2.3" width="2.6" height="2.6"/>') },
    { id: 'text', key: 't', label: 'Texto', tip: 'clique para escrever um texto ali; clique num texto para mudar as letras', icon: svg('<path d="M3 3.5h10M8 3.5v10M6 13.5h4"/>') },
    { id: 'rect', key: 'm', grp: 'shape', label: 'Retângulo', tip: 'arraste para desenhar (Shift: quadrado; Alt: a partir do meio); um clique põe um pronto ali', icon: svg('<rect x="2.5" y="3.5" width="11" height="9" rx=".6"/>') },
    { id: 'ellipse', key: 'l', grp: 'shape', label: 'Elipse', tip: 'arraste para desenhar (Shift: círculo; Alt: a partir do meio); um clique põe um círculo ali', icon: svg('<ellipse cx="8" cy="8" rx="5.8" ry="5"/>') },
    { id: 'polygon', key: '', grp: 'shape', label: 'Polígono', tip: 'arraste do meio para fora; arrastando, ↑ e ↓ põem e tiram lados; Shift: em pé', icon: svg('<path d="M8 2.2l5.3 3.1v5.9L8 14.2l-5.3-3V5.3z"/>') },
    { id: 'star', key: '', grp: 'shape', label: 'Estrela', tip: 'arraste do meio para fora; arrastando, ↑ e ↓ põem e tiram pontas; Shift: em pé', icon: svg('<path d="M8 1.8l1.9 4 4.3.5-3.2 3 .8 4.3L8 11.5l-3.8 2.1.8-4.3-3.2-3 4.3-.5z"/>') },
    { id: 'line', key: '\\', label: 'Linha', tip: 'arraste de uma ponta à outra (Shift: de 45 em 45 graus; Alt: a partir do meio)', icon: svg('<path d="M3 13 13 3"/><circle class="f" cx="3" cy="13" r="1.3"/><circle class="f" cx="13" cy="3" r="1.3"/>') },
    { id: 'brush', key: 'b', grp: 'brush', label: 'Pincel', tip: 'arraste para pintar: um stroke com a grossura do contorno e as pontas afinando (taper=). [ e ] mudam a grossura', icon: svg('<path d="M14.2 1.8 8.4 7.6"/><path d="M8.4 7.6 6.8 6.2c-1.5.2-2.4 1.2-2.6 2.6-.2 1.6-1 2.8-2.6 3.6 2.4 1.2 5.6.6 6.6-1.4.6-1.1.6-2.2.2-3z"/>') },
    { id: 'pencil', key: 'n', grp: 'pencil', label: 'Lápis', tip: 'arraste para desenhar à mão livre: o traço vira poucos pontos (um stroke); terminando perto do começo, fecha um shape. [ e ] mudam a grossura', icon: svg('<path d="M11 2.4l2.6 2.6-8 8-3.5.9.9-3.5z"/><path d="M9.4 4l2.6 2.6"/>') },
    '-',
    { id: 'gradient', key: 'g', label: 'Degradê', tip: 'arraste sobre uma forma: o degradê vai de onde apertou até onde soltou (Alt: redondo; Shift: de 45 em 45 graus); escreve um gradient e põe o nome no c=', icon: svg('<rect x="2.5" y="2.5" width="11" height="11" rx="1"/><path class="f" d="M2.5 3.5a1 1 0 0 1 1-1h2v11h-2a1 1 0 0 1-1-1z"/><path class="f" d="M5.5 2.5h2.2v11H5.5z" opacity=".6"/><path class="f" d="M7.7 2.5h2v11h-2z" opacity=".3"/>') },
    { id: 'eyedrop', key: 'i', grp: 'eye', label: 'Conta-gotas', tip: 'clique numa forma: as escolhidas pegam a cor, o contorno e a opacidade dela (sem escolha, as caixinhas de cor pegam); Alt+clique pinta a clicada com as caixinhas', icon: svg('<path d="M2.3 13.7l.8-2.9 6.2-6.2 2.1 2.1-6.2 6.2z"/><path class="f" d="M9.6 3.4l1.6-1.6a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1l-1.6 1.6z"/>') },
    { id: 'measure', key: '', grp: 'eye', label: 'Medir', tip: 'arraste de um ponto a outro: distância, ângulo e quanto anda em x e em y', icon: svg('<path d="M2 8h12M2 5v6M14 5v6M4.5 6l-2 2 2 2M11.5 6l2 2-2 2"/>') },
    { id: 'pin', key: 'p', shift: true, label: 'Prender', tip: 'escolha pontos e prenda a um osso pelo botão direito (escreve @osso)', icon: svg('<path d="M9.2 1.6l5.2 5.2M10.4 2.8 7.6 6.1l-2.7.6 4.4 4.4.6-2.7 3.3-2.8M7.1 8.9 1.8 14.2"/>') },
    '-',
    { id: 'hand', key: 'h', label: 'Mão', tip: 'arraste para mover a vista (ou segure o Espaço, em qualquer ferramenta)', icon: svg('<path d="M5.4 8.6V3.9a1 1 0 0 1 2 0v3.8M7.4 7.5V2.9a1 1 0 0 1 2 0v4.6M9.4 7.6V3.9a1 1 0 0 1 2 0v5.3c0 2.9-1.9 4.9-4.3 4.9-1.6 0-2.6-.7-3.5-2L2.2 9.8a1 1 0 0 1 1.6-1.2l1.6 1.6"/>') },
    { id: 'zoom', key: 'z', label: 'Zoom', tip: 'clique para aproximar; Alt+clique afasta', icon: svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.3 10.3 14 14M5 7h4M7 5v4"/>') },
  ];
  const FILM_TOOLS = ['select', 'direct', 'hand', 'zoom'];
  const keyLabel = (t) => (t.key ? (t.shift ? 'Shift+' : '') + t.key.toUpperCase() : '');
  const bar = $('tools'), slots = [];
  let fly = null, holdT = 0;
  for (const t of TOOLS) {
    if (t === '-') { bar.appendChild(document.createElement('hr')); continue; }
    const same = t.grp && slots.find((x) => x.grp === t.grp);
    if (same) { same.tools.push(t); continue; }
    const b = document.createElement('button');
    b.type = 'button';
    const slot = { grp: t.grp || null, tools: [t], cur: t, b, shown: null, held: false };
    slots.push(slot);
    b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      clearTimeout(holdT);
      if (e.button === 0 && slot.tools.length > 1) holdT = setTimeout(() => { slot.held = true; openFly(slot); }, 380);
    });
    b.addEventListener('mouseup', () => clearTimeout(holdT));
    b.addEventListener('mouseleave', () => clearTimeout(holdT));
    // o clique que solta o segurar deixa as outras à mostra; os outros escolhem a ferramenta da casa
    b.addEventListener('click', () => { if (slot.held) { slot.held = false; return; } closeFly(); A.setTool(slot.cur.id); });
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); if (slot.tools.length > 1) openFly(slot); });
    bar.appendChild(b);
  }
  function paintSlot(s) {
    if (s.shown === s.cur.id) return;
    s.shown = s.cur.id;
    const t = s.cur, many = s.tools.length > 1;
    s.b.dataset.tool = t.id;
    s.b.innerHTML = t.icon + (many ? '<i class="fly-mark"></i>' : '');
    s.b.title = `${t.label}${t.key ? ` (${keyLabel(t)})` : ''}: ${t.tip}${many ? `. Segure (ou botão direito) para ver ${s.tools.filter((x) => x !== t).map((x) => x.label).join(', ')}` : ''}`;
    s.b.setAttribute('aria-label', t.label);
  }
  // as outras ferramentas da casa, ao lado dela
  function openFly(s) {
    closeFly();
    const el = document.createElement('div');
    el.className = 'tool-fly';
    el.setAttribute('role', 'menu');
    el.innerHTML = s.tools.map((t) => `<button type="button" role="menuitem" data-id="${t.id}"${t.id === st.tool ? ' class="on"' : ''}>${t.icon}<span>${t.label}</span><kbd>${keyLabel(t)}</kbd></button>`).join('');
    document.body.appendChild(el);
    const r = s.b.getBoundingClientRect();
    el.style.left = r.right + 4 + 'px';
    el.style.top = Math.max(4, Math.min(window.innerHeight - el.offsetHeight - 4, r.top)) + 'px';
    el.addEventListener('mousedown', (e) => e.preventDefault());
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) { closeFly(); A.setTool(b.dataset.id); } });
    fly = { el, s };
  }
  function closeFly() { if (fly) { fly.el.remove(); fly.s.held = false; fly = null; } }
  document.addEventListener('mousedown', (e) => { if (fly && !fly.el.contains(e.target) && !fly.s.b.contains(e.target)) closeFly(); }, true);
  document.addEventListener('keydown', (e) => { if (fly && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeFly(); } }, true);
  window.addEventListener('blur', closeFly);
  function syncTools() {
    // no filme e na vista Camadas em 3D, só as ferramentas que valem lá
    const film = A.isFilm() || st.view3d;
    for (const s of slots) {
      const t = s.tools.find((x) => x.id === st.tool);
      if (t) s.cur = t;
      paintSlot(s);
      s.b.classList.toggle('on', !!t);
      s.b.setAttribute('aria-pressed', String(!!t));
      s.b.hidden = film && !s.tools.some((x) => FILM_TOOLS.includes(x.id));
    }
    // uma linha entre grupos só aparece entre botões que aparecem
    let prev = null;
    for (const el of bar.children) {
      if (el.tagName !== 'HR' && el.tagName !== 'BUTTON') continue;
      if (el.tagName === 'HR') { el.hidden = !prev || prev.tagName === 'HR'; if (!el.hidden) prev = el; } else if (!el.hidden) prev = el;
    }
    if (prev && prev.tagName === 'HR') prev.hidden = true;
  }

  // ---------- as vistas ----------
  const sw = $('layoutSw');
  sw.addEventListener('mousedown', (e) => e.preventDefault());
  sw.addEventListener('click', (e) => { const b = e.target.closest('[data-layout]'); if (b) A.setLayout(b.dataset.layout); });
  function syncLayout() {
    sw.querySelectorAll('[data-layout]').forEach((b) => { b.classList.toggle('on', b.dataset.layout === st.layout); b.setAttribute('aria-pressed', String(b.dataset.layout === st.layout)); });
  }

  // ---------- os menus ----------
  // as chaves de antes (escondidas na barra de cima do desenho): o menu mexe nelas, e o app.js segue como sempre
  const chk = (id) => ({ on: () => $(id).checked, run: () => $(id).click() });
  const shown = (id) => () => !$(id).hidden;
  const panelOn = (id) => () => !$(id).hidden;
  const film = () => A.isFilm();
  const drawing = () => !A.isFilm();
  // o painel Propriedades carrega depois desta casca (js/ui-props.js)
  const NOP = new Proxy({}, { get: () => () => false });
  const P = () => W.props || NOP;
  // a seleção completa também (js/ui-select.js)
  const X = () => W.sel || NOP;
  const hasSel = () => drawing() && X().has();
  const MENUS = [
    { label: 'Arquivo', items: [
      { label: 'Novo', run: A.newFile },
      { label: 'Abrir…', key: 'Ctrl+O', run: A.openDialog },
      { label: 'Exemplos', sub: () => W.examples.map((x) => ({ label: x.title, run: () => A.openExample(x.id) })) },
      { label: 'Arquivos deste projeto', sub: () => A.files().map((f) => ({ label: f, radio: true, on: f === st.current, run: () => A.openFile(f) })) },
      '-',
      { label: 'Salvar', key: 'Ctrl+S', run: A.saveFile },
      { label: 'Baixar todos os arquivos (.zip)', enabled: () => A.files().length > 1, run: () => $('fileZip').click() },
      '-',
      { label: 'Renomear este arquivo…', run: () => $('fileRen').click() },
      { label: 'Excluir este arquivo…', enabled: () => A.files().length > 1, run: () => $('fileDel').click() },
      '-',
      { label: 'Exportar…', key: 'Ctrl+E', run: A.openExport },
    ] },
    { label: 'Editar', items: [
      { label: 'Desfazer', key: 'Ctrl+Z', run: A.undo },
      { label: 'Refazer', key: 'Ctrl+Shift+Z', run: A.redo },
      '-',
      { label: 'Recortar', key: 'Ctrl+X', enabled: hasSel, run: () => X().cut() },
      { label: 'Copiar', key: 'Ctrl+C', enabled: hasSel, run: () => X().copy() },
      { label: 'Colar', key: 'Ctrl+V', enabled: () => drawing() && X().hasClip(), run: () => X().paste('view') },
      { label: 'Colar na frente', key: 'Ctrl+F', enabled: () => drawing() && X().hasClip(), run: () => X().paste('front') },
      { label: 'Colar atrás', key: 'Ctrl+B', enabled: () => drawing() && X().hasClip(), run: () => X().paste('back') },
      { label: 'Apagar', key: 'Delete', enabled: hasSel, run: () => X().del() },
      '-',
      { label: 'Duplicar', enabled: drawing, run: A.duplicate },
    ] },
    { label: 'Objeto', items: [
      { label: 'Transformar', enabled: drawing, sub: () => [
        { label: 'Repetir a transformação', key: 'Ctrl+D', enabled: () => !!st.lastXf, run: A.again },
      ] },
      { label: 'Organizar', enabled: hasSel, sub: () => [
        { label: 'Trazer para a frente', key: 'Ctrl+Shift+]', run: () => X().arrange('front') },
        { label: 'Trazer para cima', key: 'Ctrl+]', run: () => X().arrange('fwd') },
        { label: 'Enviar para baixo', key: 'Ctrl+[', run: () => X().arrange('bwd') },
        { label: 'Enviar para trás', key: 'Ctrl+Shift+[', run: () => X().arrange('back') },
      ] },
      { label: 'Alinhar', enabled: hasSel, sub: () => [
        { label: 'À esquerda', run: () => X().align('left') },
        { label: 'No centro (horizontal)', run: () => X().align('hcenter') },
        { label: 'À direita', run: () => X().align('right') },
        '-',
        { label: 'Em cima', run: () => X().align('top') },
        { label: 'No centro (vertical)', run: () => X().align('vcenter') },
        { label: 'Embaixo', run: () => X().align('bottom') },
        '-',
        { label: 'Distribuir na horizontal', run: () => X().align('hdist') },
        { label: 'Distribuir na vertical', run: () => X().align('vdist') },
      ] },
      '-',
      { label: 'Agrupar', key: 'Ctrl+G', enabled: hasSel, run: () => X().group() },
      { label: 'Desagrupar', key: 'Ctrl+Shift+G', enabled: () => hasSel() && X().isGroup(), run: () => X().ungroup() },
      { label: 'Sair do grupo', key: 'Esc', enabled: () => drawing() && !!A.iso(), run: () => A.exitIso() },
      '-',
      { label: 'Travar a escolha', key: 'Ctrl+2', enabled: hasSel, run: () => X().lock() },
      { label: 'Destravar tudo', key: 'Ctrl+Alt+2', enabled: drawing, run: () => X().unlockAll() },
      '-',
      { label: 'Caminho', enabled: hasSel, sub: () => [
        { label: 'Simplificar…', run: () => (W.pencil || NOP).simplify() },
      ] },
      '-',
      { label: 'Inserir', enabled: drawing, sub: () => A.shapes().map((s, i) => ({ label: `${s.label} (${s.cmd})`, run: () => A.insert(i) })) },
      '-',
      { label: 'Esconder / mostrar (hidden)', key: 'Ctrl+3', enabled: drawing, run: A.hide },
    ] },
    // Texto e Efeito: o que o painel Propriedades também faz, pelo menu (js/ui-props.js)
    { label: 'Texto', items: [
      { label: 'Negrito', enabled: () => P().textOn(), on: () => P().flagOn('bold'), run: () => P().flag('bold') },
      { label: 'Itálico', enabled: () => P().textOn(), on: () => P().flagOn('italic'), run: () => P().flag('italic') },
      '-',
      { label: 'Alinhar à esquerda', enabled: () => P().textOn(), radio: true, on: () => P().alignOn('left'), run: () => P().align('left') },
      { label: 'Centralizar', enabled: () => P().textOn(), radio: true, on: () => P().alignOn('center'), run: () => P().align('center') },
      { label: 'Alinhar à direita', enabled: () => P().textOn(), radio: true, on: () => P().alignOn('right'), run: () => P().align('right') },
      '-',
      { label: 'Aumentar o tamanho', enabled: () => P().textOn(), run: () => P().bump(1) },
      { label: 'Diminuir o tamanho', enabled: () => P().textOn(), run: () => P().bump(-1) },
    ] },
    { label: 'Selecionar', items: [
      { label: 'Tudo', key: 'Ctrl+A', enabled: drawing, run: () => X().all() },
      { label: 'Nada', key: 'Ctrl+Shift+A', enabled: hasSel, run: () => X().none() },
      { label: 'Inverter', enabled: drawing, run: () => X().invert() },
      '-',
      { label: 'A mesma', enabled: hasSel, sub: () => [
        { label: 'Cor de preenchimento', run: () => X().same('c') },
        { label: 'Cor do contorno', run: () => X().same('inkc') },
        { label: 'Camada', run: () => X().same('layer') },
      ] },
    ] },
    { label: 'Efeito', items: () => [
      ...P().FX.map((x) => ({ label: x.label, enabled: () => P().layerOk(), on: () => P().fxOn(x.k), run: () => P().fx(x.k) })),
      '-',
      { label: 'Tirar os efeitos', enabled: () => P().layerOk() && P().FX.some((x) => P().fxOn(x.k)), run: () => P().fxNone() },
    ] },
    { label: 'Exibir', items: [
      { label: 'Código', radio: true, on: () => st.layout === 'code', run: () => A.setLayout('code') },
      { label: 'Dividido', radio: true, on: () => st.layout === 'split', run: () => A.setLayout('split') },
      { label: 'Design', radio: true, on: () => st.layout === 'design', run: () => A.setLayout('design') },
      '-',
      { label: 'Aproximar', key: 'Ctrl+=', run: A.zoomIn },
      { label: 'Afastar', key: 'Ctrl+-', run: A.zoomOut },
      { label: 'Ajustar à tela', key: 'Ctrl+0', run: A.fit },
      { label: 'Tamanho real (100%)', key: 'Ctrl+1', run: A.zoomActual },
      '-',
      { label: 'Camadas em 3D', visible: drawing, on: () => st.view3d, run: () => A.set3d(!st.view3d) },
      '-',
      Object.assign({ label: 'Réguas', key: 'Ctrl+R', visible: drawing }, chk('tRulers')),
      Object.assign({ label: 'Guias (camadas guide, luzes, encaixes)' }, chk('tGuides')),
      Object.assign({ label: 'Hitboxes', visible: drawing }, chk('tBoxes')),
      Object.assign({ label: 'Ossos' }, chk('tBones')),
      Object.assign({ label: 'Papel vegetal' }, chk('tOnion')),
      Object.assign({ label: 'Trajetória' }, chk('tTraj')),
      Object.assign({ label: 'Estilo de arte', visible: shown('tArtWrap') }, chk('tArt')),
      Object.assign({ label: 'Câmera (o que ela filma)', visible: film }, chk('tCamera')),
      Object.assign({ label: 'Linha do tempo', visible: film }, chk('tTimeline')),
    ] },
    { label: 'Janela', items: [
      { label: 'Propriedades', visible: drawing, on: () => P().isOn('props'), run: () => P().toggle('props') },
      { label: 'Amostras', visible: drawing, on: () => P().isOn('sw'), run: () => P().toggle('sw') },
      { label: 'Camadas', visible: drawing, on: panelOn('layerPanel'), run: () => $('layerBtn').click() },
      { label: 'Referências', visible: drawing, on: panelOn('refPanel'), run: () => $('refBtn').click() },
      { label: 'Sons guardados', visible: shown('mediaBtn'), on: panelOn('mediaList'), run: () => $('mediaBtn').click() },
    ] },
    { label: 'Ajuda', items: [
      { label: 'Referência da linguagem', key: 'F1', run: () => A.toggleHelp() },
    ] },
  ];
  const menus = W.ui.menubar($('menubar'), MENUS);

  // ---------- o menu do botão direito no desenho (etapa 4a) ----------
  // O do Illustrator: o que vale para a escolha (Organizar, Agrupar, Transformar…), sem os itens apagados. A forma
  // pronta (Inserir forma) nasce no lugar do clique.
  const findItem = (menu, label) => MENUS.find((m) => m.label === menu).items.find((it) => it && it.label === label);
  const pickItems = (menu, labels) => labels.map((l) => (l === '-' ? '-' : findItem(menu, l)));
  const onlyOn = (it) => Object.assign({}, it, { visible: () => (it.enabled === undefined ? true : typeof it.enabled === 'function' ? it.enabled() : !!it.enabled) });
  function ctxItems(at) {
    if (A.isFilm()) return pickItems('Editar', ['Desfazer', 'Refazer']);
    return [
      ...pickItems('Editar', ['Desfazer', 'Refazer', '-', 'Recortar', 'Copiar', 'Colar', 'Apagar']).map((it) => (it === '-' || it.label.startsWith('Desfazer') || it.label.startsWith('Refazer') || it.label === 'Colar' ? it : onlyOn(it))),
      '-',
      ...pickItems('Objeto', ['Transformar', 'Organizar', 'Alinhar', '-', 'Agrupar', 'Desagrupar', 'Sair do grupo', '-', 'Travar a escolha', 'Destravar tudo', '-', 'Caminho', 'Esconder / mostrar (hidden)']).map((it) => (it === '-' ? it : onlyOn(it))),
      '-',
      { label: 'Selecionar', sub: () => MENUS.find((m) => m.label === 'Selecionar').items },
      { label: 'Inserir forma', sub: () => A.shapes().map((x, i) => ({ label: `${x.label} (${x.cmd})`, run: () => A.insertAt(i, at) })) },
    ];
  }
  A.setCtxMenu((e, at) => { closeFly(); menus.popup(ctxItems(at), e.clientX + 1, e.clientY + 1); });

  // ---------- as letras das ferramentas (com o foco no desenho) ----------
  // As teclas que mudaram de lugar na etapa 1 avisam onde foram parar, enquanto as ferramentas delas não chegam.
  const MOVED = { f: 'Ajustar à tela agora é Ctrl+0 (e Ctrl+1 é 100%).', r: 'As réguas agora são Ctrl+R (o R vai ser a ferramenta Girar).' };
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || menus.isOpen()) return;
    const t = e.target, mod = e.ctrlKey || e.metaKey;
    if (t && t.closest && t.closest('textarea, input, select, dialog')) return;
    if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'o') { e.preventDefault(); A.openDialog(); return; }
    // a Curvatura é Shift+~: no teclado brasileiro, o ~ é uma tecla morta (Dead, na posição da aspa do americano)
    if (!mod && !e.altKey && e.key === 'Dead' && e.code === 'Quote' && !A.isFilm() && !st.view3d) { e.preventDefault(); A.setTool('curve'); return; }
    if (mod || e.altKey || e.key.length !== 1) return;
    const k = e.key.toLowerCase();
    const tool = TOOLS.find((x) => x !== '-' && x.key === k && !!x.shift === e.shiftKey);
    if (tool) {
      e.preventDefault();
      if ((A.isFilm() || st.view3d) && !FILM_TOOLS.includes(tool.id)) return;
      A.setTool(tool.id);
      return;
    }
    if (!e.shiftKey && MOVED[k]) { e.preventDefault(); A.hint(MOVED[k], 3000); }
  });

  A.on('tool', syncTools);
  A.on('model', syncTools);
  A.on('view3d', syncTools);
  A.on('layout', syncLayout);
  syncTools();
  syncLayout();
})(window.Weasel = window.Weasel || {});
