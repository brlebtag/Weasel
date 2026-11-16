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
  // A lista é a mesma para os botões, os títulos e as letras do teclado. shift: a letra vem com Shift.
  const svg = (inner) => `<svg viewBox="0 0 16 16" aria-hidden="true">${inner}</svg>`;
  const ARROW = 'M3.5 1.8v11.6l3.1-3 2.1 4.4 2-.95-2.1-4.35 4.3-.15z';
  const TOOLS = [
    { id: 'select', key: 'v', label: 'Seleção', tip: 'escolhe e move formas; a caixa gira e estica. Shift+clique soma; arrastar no vazio faz a caixa de seleção; Alt+arrastar copia', icon: svg(`<path class="f" d="${ARROW}"/>`) },
    { id: 'direct', key: 'a', label: 'Seleção direta', tip: 'os pontos e as alças da forma do cursor; arrastar no vazio faz a caixa de seleção', icon: svg(`<path d="${ARROW}"/>`) },
    { id: 'wand', key: 'y', label: 'Varinha mágica', tip: 'clique numa forma: escolhe todas com a mesma cor (Shift soma, Alt tira)', icon: svg('<path d="M2.5 13.5l7-7"/><path class="f" d="M11.6 1.6l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/><path d="M13.6 7.4v1.6M12.8 8.2h1.6M7.4 1.6v1.6M6.6 2.4h1.6"/>') },
    { id: 'lasso', key: 'q', label: 'Laço', tip: 'arraste em volta: escolhe as formas que o contorno pega (Shift soma, Alt tira)', icon: svg('<path d="M8 2.5c3.3 0 5.8 1.6 5.8 3.7S11.3 9.9 8 9.9 2.2 8.3 2.2 6.2 4.7 2.5 8 2.5z"/><path d="M4.3 9.2c-.9.9-.6 2.3.6 2.6 1 .3 1.4 1.1.9 2.2"/>') },
    '-',
    { id: 'text', key: 't', label: 'Texto', tip: 'clique para escrever um texto ali; clique num texto para mudar as letras', icon: svg('<path d="M3 3.5h10M8 3.5v10M6 13.5h4"/>') },
    { id: 'rect', key: 'm', label: 'Retângulo', tip: 'clique para pôr um retângulo ali', icon: svg('<rect x="2.5" y="3.5" width="11" height="9" rx=".6"/>') },
    { id: 'ellipse', key: 'l', label: 'Elipse', tip: 'clique para pôr um círculo ali', icon: svg('<ellipse cx="8" cy="8" rx="5.8" ry="5"/>') },
    { id: 'line', key: '\\', label: 'Linha', tip: 'clique para pôr uma linha reta ali', icon: svg('<path d="M3 13 13 3"/><circle class="f" cx="3" cy="13" r="1.3"/><circle class="f" cx="13" cy="3" r="1.3"/>') },
    '-',
    { id: 'measure', key: '', label: 'Medir', tip: 'arraste de um ponto a outro: distância, ângulo e quanto anda em x e em y', icon: svg('<path d="M2 8h12M2 5v6M14 5v6M4.5 6l-2 2 2 2M11.5 6l2 2-2 2"/>') },
    { id: 'pin', key: 'p', shift: true, label: 'Prender', tip: 'escolha pontos e prenda a um osso pelo botão direito (escreve @osso)', icon: svg('<path d="M9.2 1.6l5.2 5.2M10.4 2.8 7.6 6.1l-2.7.6 4.4 4.4.6-2.7 3.3-2.8M7.1 8.9 1.8 14.2"/>') },
    '-',
    { id: 'hand', key: 'h', label: 'Mão', tip: 'arraste para mover a vista (ou segure o Espaço, em qualquer ferramenta)', icon: svg('<path d="M5.4 8.6V3.9a1 1 0 0 1 2 0v3.8M7.4 7.5V2.9a1 1 0 0 1 2 0v4.6M9.4 7.6V3.9a1 1 0 0 1 2 0v5.3c0 2.9-1.9 4.9-4.3 4.9-1.6 0-2.6-.7-3.5-2L2.2 9.8a1 1 0 0 1 1.6-1.2l1.6 1.6"/>') },
    { id: 'zoom', key: 'z', label: 'Zoom', tip: 'clique para aproximar; Alt+clique afasta', icon: svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.3 10.3 14 14M5 7h4M7 5v4"/>') },
  ];
  const FILM_TOOLS = ['select', 'direct', 'hand', 'zoom'];
  const keyLabel = (t) => (t.key ? (t.shift ? 'Shift+' : '') + t.key.toUpperCase() : '');
  const bar = $('tools');
  for (const t of TOOLS) {
    if (t === '-') { bar.appendChild(document.createElement('hr')); continue; }
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.tool = t.id;
    b.innerHTML = t.icon;
    b.title = `${t.label}${t.key ? ` (${keyLabel(t)})` : ''}: ${t.tip}`;
    b.setAttribute('aria-label', t.label);
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => A.setTool(t.id));
    bar.appendChild(b);
  }
  function syncTools() {
    // no filme e na vista Camadas em 3D, só as ferramentas que valem lá
    const film = A.isFilm() || st.view3d;
    bar.querySelectorAll('button[data-tool]').forEach((b) => {
      b.classList.toggle('on', b.dataset.tool === st.tool);
      b.setAttribute('aria-pressed', String(b.dataset.tool === st.tool));
      b.hidden = film && !FILM_TOOLS.includes(b.dataset.tool);
    });
    // uma linha entre grupos só aparece entre botões que aparecem
    let prev = null;
    for (const el of bar.children) {
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

  // ---------- as letras das ferramentas (com o foco no desenho) ----------
  // As teclas que mudaram de lugar na etapa 1 avisam onde foram parar, enquanto as ferramentas delas não chegam.
  const MOVED = { f: 'Ajustar à tela agora é Ctrl+0 (e Ctrl+1 é 100%).', r: 'As réguas agora são Ctrl+R (o R vai ser a ferramenta Girar).', p: 'O Prender agora é Shift+P (o P vai ser a Caneta).' };
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || menus.isOpen()) return;
    const t = e.target, mod = e.ctrlKey || e.metaKey;
    if (t && t.closest && t.closest('textarea, input, select, dialog')) return;
    if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'o') { e.preventDefault(); A.openDialog(); return; }
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
