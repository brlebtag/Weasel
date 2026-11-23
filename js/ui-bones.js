/* Weasel — o painel Testar ossos (plano docs/planos/testar-ossos.md, etapa 1). Com a ferramenta Testar ossos
   (tecla O), a coluna da direita ganha esta parte: o osso na mão (escolhido no desenho ou na lista), os valores
   dele para digitar como numa key (x, y, giro, escala x e escala y; along, yaw e pitch quando o osso usa; z, yaw e
   pitch num arquivo com três vistas, nos valores da animação base) e os
   botões de zerar. Nada vai para o código: os valores vivem em js/app.js (A.boneTest) e somem ao trocar de
   ferramenta. Etapa 2: a forma clicada (a que osso ela segue), acender o que segue o osso e Escrever como key, que
   grava o teste numa key de verdade (um Ctrl+Z desfaz). */
(function (W) {
  'use strict';
  const A = W.app;
  if (!A || !A.boneTest) return;
  const T = A.boneTest, st = A.st;
  const dock = document.getElementById('dock');
  if (!dock) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmtN = (v, d) => { const t = String(Number(v.toFixed(d))); return t === '-0' ? '0' : t; };

  // os campos: o que mostra, de onde lê, quantas casas e quanto anda por pixel ao arrastar o nome
  const FIELDS = [
    { k: 'x', label: 'x', get: (t) => t.v[0], set: (t, n) => ({ v: put(t.v, 0, n) }), d: 2, step: 0.5, tip: 'quanto o osso anda para o lado (o dx de uma key, na direção do pai)' },
    { k: 'y', label: 'y', get: (t) => t.v[1], set: (t, n) => ({ v: put(t.v, 1, n) }), d: 2, step: 0.5, tip: 'quanto o osso anda para baixo (o dy de uma key, na direção do pai)' },
    { k: 'z', label: 'z', get: (t) => t.z, set: (t, n) => ({ z: n }), d: 1, step: 0.5, tip: 'quanto o osso anda para a frente (osso.z= das três vistas; negativo: para trás), na direção do pai', when: (b, m, vw) => vw },
    { k: 'rot', label: 'giro', get: (t) => t.v[2], set: (t, n) => ({ v: put(t.v, 2, n) }), d: 1, step: 1, tip: 'o giro do osso, em graus' },
    { k: 'sx', label: 'escala x', get: (t) => t.v[3], set: (t, n) => ({ v: put(t.v, 3, n) }), d: 3, step: 0.01, tip: 'quanto o osso estica ao longo de x (1 = como é; negativo espelha)' },
    { k: 'sy', label: 'escala y', get: (t) => t.v[4], set: (t, n) => ({ v: put(t.v, 4, n) }), d: 3, step: 0.01, tip: 'quanto o osso estica ao longo de y (1 = como é; negativo espelha)' },
    { k: 'along', label: 'along', get: (t) => t.along, set: (t, n) => ({ along: n }), d: 3, step: 0.005, tip: 'quanto do caminho (path=) o osso já andou, de 0 a 1', when: (b) => !!b.path },
    { k: 'yaw', label: 'yaw', get: (t) => t.yaw, set: (t, n) => ({ yaw: n }), d: 1, step: 1, tip: 'o giro 3D para os lados, em graus', when: (b, m, vw) => !!(vw || m.has3d || b.yaw || b.pitch || b.round) },
    { k: 'pitch', label: 'pitch', get: (t) => t.pitch, set: (t, n) => ({ pitch: n }), d: 1, step: 1, tip: 'o giro 3D para cima e para baixo, em graus', when: (b, m, vw) => !!(vw || m.has3d || b.yaw || b.pitch || b.round) },
  ];
  function put(v, i, n) { const o = v.slice(); o[i] = n; return o; }

  // ---------- a parte da coluna ----------
  const sec = document.createElement('section');
  sec.className = 'dk-sec bt-sec';
  sec.dataset.sec = 'bonetest';
  sec.hidden = true;
  sec.innerHTML = `<div class="dk-head"><b>Testar ossos</b><span class="dk-what"></span></div>
    <div class="dk-body">
      <div class="pp-row"><span class="pp-k" title="o osso na mão: clique na bolinha dele no desenho, ou escolha aqui">osso</span><select class="pp-sel bt-bone"></select></div>
      <div class="bt-vals"></div>
      <div class="bt-foot"><button type="button" data-act="one" title="Volta o osso na mão para como estava (o duplo clique numa alça faz o mesmo)">Zerar este osso</button><button type="button" data-act="all" title="Volta todos os ossos (o Esc faz o mesmo)">Zerar tudo</button></div>
      <div class="bt-foot"><button type="button" data-act="write" class="bt-write"></button></div>
      <label class="pp-chk bt-glow" title="Com o mouse numa alça, ou com um osso na mão, o que vai junto com ele fica aceso e o resto fica apagado"><input type="checkbox" checked> Acender o que segue o osso</label>
      <div class="pp-note bt-shape" hidden></div>
      <small class="pp-note bt-tip"></small>
    </div>`;
  dock.insertBefore(sec, dock.firstChild);
  const what = sec.querySelector('.dk-what'), pick = sec.querySelector('.bt-bone'), vals = sec.querySelector('.bt-vals'), tip = sec.querySelector('.bt-tip');
  const btnOne = sec.querySelector('[data-act=one]'), btnAll = sec.querySelector('[data-act=all]'), btnWrite = sec.querySelector('[data-act=write]');
  const glow = sec.querySelector('.bt-glow input'), shapeEl = sec.querySelector('.bt-shape');

  let shape = ''; // os campos mostrados agora (osso e quais campos): muda só quando é preciso refazer
  let names = '';  // os nomes da lista de ossos
  function fill() {
    const on = T.on();
    if (sec.hidden === on) {
      sec.hidden = !on;
      if (W.props && W.props.sync) W.props.sync();
    }
    if (!on) { shape = ''; return; }
    const m = st.model, sel = T.sel(), changed = new Set(T.changed());
    // a lista: os ossos do arquivo, com um • nos mexidos
    const nm = [...m.bones.keys()].map((n) => (changed.has(n) ? '•' : '') + n).join('\n');
    if (nm !== names) {
      names = nm;
      pick.innerHTML = '<option value="">(clique num osso)</option>' + [...m.bones.keys()].map((n) => `<option value="${esc(n)}">${changed.has(n) ? '• ' : ''}${esc(n)}</option>`).join('');
    }
    if (pick.value !== (sel || '')) pick.value = sel || '';
    what.textContent = changed.size ? `${changed.size} mexido${changed.size > 1 ? 's' : ''}` : '';
    btnAll.disabled = !changed.size;
    btnOne.disabled = !sel || !changed.has(sel);
    // Escrever como key: no quadro do player, ou numa anim nova (nas três vistas, na animação base)
    const an = T.anim(), vw = !!(T.views && T.views());
    btnWrite.textContent = an ? `Escrever como key ${an.frame} em ${an.name}` : 'Escrever como key (anim nova teste)';
    btnWrite.title = an ? `Grava os ossos mexidos na key ${an.frame} da anim ${an.name} (o quadro do player). Um Ctrl+Z desfaz.` : 'Sem animação no player: grava os ossos mexidos numa anim nova, teste, na key 0, no fim do arquivo. Um Ctrl+Z desfaz.';
    btnWrite.disabled = !changed.size;
    glow.checked = !!T.glow();
    const shp = T.shape();
    shapeEl.hidden = !shp;
    shapeEl.textContent = shp ? `forma: ${shp}` : '';
    if (!m.bones.size) { tip.textContent = 'Este desenho não tem ossos (bone).'; }
    else if (!sel) tip.textContent = 'Clique na bolinha de um osso no desenho (ou escolha na lista) para digitar os valores dele. A bolinha move, a ponta da haste gira, o quadradinho estica. Um clique numa forma diz a que osso ela segue. Nada vai para o código até Escrever como key.';
    else if (vw) tip.textContent = `Os valores são os de uma key da animação base${an ? ` (anim ${an.name})` : ' (a pose parada)'}: a vista do player mostra o que o Weasel gera deles. De lado, a bolinha anda para a frente e para trás (z) e a ponta da haste gira o pitch. Arraste o nome de um campo para os lados (Shift: 10× mais). Nada vai para o código até Escrever como key.`;
    else tip.textContent = 'Os valores são os de uma key deste osso. Arraste o nome de um campo para os lados (Shift: 10× mais). Nada vai para o código até Escrever como key: o Esc zera, e trocar de ferramenta volta tudo.';
    // os campos
    const b = sel && m.bones.get(sel), list = b ? FIELDS.filter((f) => !f.when || f.when(b, m, vw)) : [];
    const sh = sel ? sel + '|' + list.map((f) => f.k).join(',') : '';
    if (sh !== shape) {
      shape = sh;
      vals.innerHTML = list.map((f) => `<div class="pp-row"><span class="pp-k scrub" data-scrub="${f.k}" title="${esc(f.tip)} · arraste para os lados para mudar (Shift: 10× mais)">${f.label}</span><input type="text" class="pp-num" data-f="${f.k}" spellcheck="false" title="${esc(f.tip)}"></div>`).join('');
    }
    if (!sel) return;
    const t = T.vals(sel);
    for (const inp of vals.querySelectorAll('input[data-f]')) {
      if (inp === document.activeElement) continue; // não atropela quem está digitando
      const f = FIELDS.find((x) => x.k === inp.dataset.f), v = f.get(t);
      const txt = v === null || v === undefined ? '' : fmtN(v, f.d);
      if (inp.value !== txt) inp.value = txt;
      inp.placeholder = v === null || v === undefined ? '—' : '';
    }
  }

  // ---------- digitar ----------
  function apply(inp) {
    const sel = T.sel(), f = FIELDS.find((x) => x.k === inp.dataset.f);
    if (!sel || !f) return;
    const n = parseFloat(String(inp.value).replace(',', '.'));
    if (!isFinite(n)) { fill(); return; }
    T.set(sel, f.set(T.vals(sel), n));
  }
  vals.addEventListener('keydown', (e) => {
    const inp = e.target.closest('input[data-f]');
    if (!inp) return;
    if (e.key === 'Enter') { e.preventDefault(); apply(inp); inp.select(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); inp.blur(); }
  });
  vals.addEventListener('change', (e) => { const inp = e.target.closest('input[data-f]'); if (inp) apply(inp); });
  vals.addEventListener('focusout', () => { setTimeout(fill, 0); });

  // ---------- arrastar o nome do campo ----------
  vals.addEventListener('pointerdown', (e) => {
    const k = e.target.closest('[data-scrub]'), sel = T.sel();
    if (!k || !sel || e.button !== 0) return;
    const f = FIELDS.find((x) => x.k === k.dataset.scrub);
    const v0 = f.get(T.vals(sel));
    const start = v0 === null || v0 === undefined ? 0 : v0, x0 = e.clientX;
    e.preventDefault();
    k.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const n = start + (ev.clientX - x0) * f.step * (ev.shiftKey ? 10 : 1);
      T.set(sel, f.set(T.vals(sel), Number(n.toFixed(f.d))));
    };
    const up = () => { k.removeEventListener('pointermove', move); k.removeEventListener('pointerup', up); k.removeEventListener('pointercancel', up); };
    k.addEventListener('pointermove', move);
    k.addEventListener('pointerup', up);
    k.addEventListener('pointercancel', up);
  });

  // ---------- a lista e os botões ----------
  pick.addEventListener('change', () => { T.choose(pick.value || null); });
  btnOne.addEventListener('click', () => { const sel = T.sel(); if (sel) T.reset(sel); });
  btnAll.addEventListener('click', () => T.reset());
  btnWrite.addEventListener('click', () => T.write());
  glow.addEventListener('change', () => T.glow(glow.checked));

  A.on('bonetest', fill);
  A.on('tool', fill);
  A.on('model', () => { names = ''; shape = ''; fill(); });
  A.on('draw', () => { if (!sec.hidden || T.on()) fill(); });
  fill();
})(window.Weasel = window.Weasel || {});
