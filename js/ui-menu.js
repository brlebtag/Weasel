/* Weasel — a barra de menus no jeito dos programas de desenho: clique abre, passar o mouse troca de menu, Esc fecha.
   Não sabe nada do Weasel: quem monta os menus é a casca (js/ui-shell.js).

   Cada menu: { label, items }. Cada item é '-' (uma linha), { head: 'texto' } (um título apagado) ou
   { label, key, run, on, radio, enabled, visible, sub }:
   - key: o atalho, só para mostrar;
   - on: marca ✓ (ou ●, com radio); enabled e visible: false apaga ou esconde;
   - sub: os itens de um submenu (uma lista, ou uma função que devolve a lista na hora).
   on, enabled, visible e label também podem ser funções: são lidas toda vez que o menu abre. */
(function (W) {
  'use strict';

  const val = (v, d) => (typeof v === 'function' ? v() : v === undefined ? d : v);

  function menubar(root, menus) {
    let open = -1; // o menu aberto (índice), ou -1
    const pops = []; // os menus abertos na tela: o de cima e os submenus, cada um { el, rows }
    const btns = menus.map((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = m.label;
      b.setAttribute('aria-haspopup', 'menu');
      // o foco fica onde estava (no desenho): as teclas de atalho continuam valendo com o menu aberto
      b.addEventListener('mousedown', (e) => { e.preventDefault(); if (open === i) close(); else show(i); });
      b.addEventListener('mouseenter', () => { if (open >= 0 && open !== i) show(i); });
      root.appendChild(b);
      return b;
    });

    // monta um menu (ou submenu) e põe na tela em x, y; level 0 é o de cima
    function build(items, level, place) {
      const el = document.createElement('div');
      el.className = 'menu-pop';
      el.setAttribute('role', 'menu');
      const rows = [];
      let lastSep = true;
      for (const it of val(items, [])) {
        if (it === '-') { if (!lastSep) { el.appendChild(document.createElement('hr')); lastSep = true; } continue; }
        if (!it || !val(it.visible, true)) continue;
        if (it.head) { const h = document.createElement('div'); h.className = 'mh'; h.textContent = val(it.head, ''); el.appendChild(h); lastSep = false; continue; }
        const row = document.createElement('div'), on = val(it.on, null), ok = val(it.enabled, true);
        row.className = 'mi' + (on ? ' on' : '') + (it.radio ? ' radio' : '') + (ok ? '' : ' dis') + (it.sub ? ' sub' : '');
        row.setAttribute('role', on === null ? 'menuitem' : it.radio ? 'menuitemradio' : 'menuitemcheckbox');
        if (on !== null) row.setAttribute('aria-checked', String(!!on));
        if (!ok) row.setAttribute('aria-disabled', 'true');
        const t = document.createElement('span');
        t.textContent = val(it.label, '');
        row.appendChild(t);
        if (it.key) { const k = document.createElement('span'); k.className = 'kb'; k.textContent = it.key; row.appendChild(k); }
        const r = { row, it, ok };
        row.addEventListener('mouseenter', () => hot(level, rows.indexOf(r)));
        row.addEventListener('mousedown', (e) => e.preventDefault());
        row.addEventListener('click', () => pick(level, rows.indexOf(r)));
        rows.push(r);
        el.appendChild(row);
        lastSep = false;
      }
      if (el.lastChild && el.lastChild.tagName === 'HR') el.removeChild(el.lastChild);
      el.addEventListener('mousedown', (e) => e.preventDefault());
      document.body.appendChild(el);
      place(el);
      while (pops.length > level) pops.pop().el.remove();
      pops.push({ el, rows, sel: -1 });
      return el;
    }
    // o menu i, embaixo do botão dele
    function show(i) {
      closePops(0);
      open = i;
      btns.forEach((b, k) => { b.classList.toggle('open', k === i); b.setAttribute('aria-expanded', String(k === i)); });
      const r = btns[i].getBoundingClientRect();
      build(menus[i].items, 0, (el) => {
        el.style.left = Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, r.left)) + 'px';
        el.style.top = r.bottom + 2 + 'px';
      });
    }
    // o submenu do item, ao lado dele (do outro lado, se não couber)
    function openSub(level, idx) {
      const p = pops[level], r = p && p.rows[idx];
      if (!r || !r.it.sub || !r.ok) return;
      const box = r.row.getBoundingClientRect();
      build(r.it.sub, level + 1, (el) => {
        const w = el.offsetWidth, h = el.offsetHeight;
        el.style.left = (box.right + w + 2 < window.innerWidth ? box.right + 2 : Math.max(4, box.left - w - 2)) + 'px';
        el.style.top = Math.max(4, Math.min(window.innerHeight - h - 4, box.top - 5)) + 'px';
      });
    }
    function closePops(from) { while (pops.length > from) pops.pop().el.remove(); }
    function close() {
      closePops(0);
      open = -1;
      btns.forEach((b) => { b.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); });
    }
    // marca o item idx do menu level (o mouse em cima, ou as setas); num item com submenu, abre o submenu
    function hot(level, idx) {
      const p = pops[level];
      if (!p) return;
      closePops(level + 1);
      p.sel = idx;
      p.rows.forEach((r, k) => r.row.classList.toggle('hot', k === idx));
      if (idx >= 0 && p.rows[idx].it.sub) openSub(level, idx);
    }
    function pick(level, idx) {
      const p = pops[level], r = p && p.rows[idx];
      if (!r || !r.ok) return;
      if (r.it.sub) { openSub(level, idx); return; }
      close();
      if (r.it.run) r.it.run();
    }

    // o teclado com um menu aberto: setas andam, Enter escolhe, Esc fecha (as outras teclas seguem para o resto)
    document.addEventListener('keydown', (e) => {
      if (open < 0) return;
      const lv = pops.length - 1, p = pops[lv], n = p ? p.rows.length : 0;
      const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      // Esc num submenu fecha só ele (o item dele continua marcado, sem abrir de novo)
      if (e.key === 'Escape') { stop(); if (lv > 0) closePops(lv); else close(); return; }
      if (!n) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        stop();
        let k = p.sel;
        for (let t = 0; t < n; t++) { k = (k + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; if (p.rows[k].ok) break; }
        p.sel = k;
        p.rows.forEach((r, j) => r.row.classList.toggle('hot', j === k));
        closePops(lv + 1);
        return;
      }
      if (e.key === 'ArrowRight') { stop(); if (p.sel >= 0 && p.rows[p.sel].it.sub) { openSub(lv, p.sel); hot(lv + 1, 0); } else show((open + 1) % menus.length); return; }
      if (e.key === 'ArrowLeft') { stop(); if (lv > 0) { closePops(lv); } else show((open - 1 + menus.length) % menus.length); return; }
      if (e.key === 'Enter' || e.key === ' ') { stop(); if (p.sel >= 0) { pick(lv, p.sel); if (pops[lv + 1]) hot(lv + 1, 0); } }
    }, true);
    // clicar fora, trocar de janela ou mudar o tamanho fecha
    document.addEventListener('mousedown', (e) => {
      if (open < 0 || root.contains(e.target) || pops.some((p) => p.el.contains(e.target))) return;
      close();
    }, true);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    return { close, isOpen: () => open >= 0 };
  }

  W.ui = W.ui || {};
  W.ui.menubar = menubar;
})(window.Weasel = window.Weasel || {});
