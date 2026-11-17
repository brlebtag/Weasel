/* Weasel — a folha de atalhos (Ajuda › Atalhos do teclado, Shift+F1 ou Ctrl+?). Mostra a lista de js/keys.js num
   painel à direita, no mesmo lugar da referência (F1), com uma busca em cima. O painel não trava o desenho: dá para
   ler e testar a tecla ao mesmo tempo. Abrir a folha fecha a referência, e o contrário também. */
(function (W) {
  'use strict';
  const A = W.app, K = W.keys;
  if (!A || !K) return;
  const $ = (id) => document.getElementById(id);
  const panel = $('keys'), body = $('keysBody'), find = $('keysFind');
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // a busca não liga para maiúsculas nem acentos ("selecao" acha "Seleção")
  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // as teclas da linha como aparecem aqui: no Mac, ⌘ e ⌥ (ou o mac= da linha)
  const shown = (it) => (mac && it.mac ? K.list(it.mac) : K.list(it.k).map((k) => (mac ? K.macKey(k) : k)));
  let built = false, back = null;

  function build() {
    let h = `<p class="keys-intro">${esc(K.intro)}${mac ? ' ' + esc(K.macNote) : ''}</p>`;
    for (const g of K.groups) {
      h += `<section><h3>${esc(g.title)}</h3>${g.note ? `<p class="keys-note">${esc(g.note)}</p>` : ''}<table>`;
      for (const it of g.items) {
        const keys = shown(it);
        const text = fold([g.title, ...K.list(it.k), ...keys, it.d, it.w || ''].join(' '));
        h += `<tr data-t="${esc(text)}"><td>${keys.map((k) => `<kbd>${esc(k)}</kbd>`).join(' ')}</td><td>${esc(it.d)}${it.w ? ` <small>· ${esc(it.w)}</small>` : ''}</td></tr>`;
      }
      h += '</table></section>';
    }
    h += '<p class="keys-none" hidden>Nenhum atalho com esse texto.</p>';
    body.innerHTML = h;
    built = true;
  }

  function filter() {
    const q = fold(find.value.trim());
    let any = false;
    for (const sec of body.querySelectorAll('section')) {
      let n = 0;
      for (const tr of sec.querySelectorAll('tr')) {
        const on = !q || tr.dataset.t.includes(q);
        tr.hidden = !on;
        if (on) n++;
      }
      sec.hidden = !n;
      if (n) any = true;
    }
    body.querySelector('.keys-none').hidden = any;
  }

  // on: true abre, false fecha, sem nada troca. Ao abrir, o cursor vai para a busca; ao fechar, volta para onde estava.
  function toggle(on) {
    const open = on === undefined ? panel.hidden : !!on;
    if (open === !panel.hidden) return;
    if (open) {
      if (!built) build();
      A.toggleHelp(false);
      back = document.activeElement;
      panel.hidden = false;
      find.focus();
      find.select();
    } else {
      panel.hidden = true;
      const a = document.activeElement;
      if (a === find || !a || a === document.body) {
        if (back && back !== document.body && document.contains(back) && back.focus) back.focus();
        else find.blur();
      }
      back = null;
    }
  }

  find.addEventListener('input', filter);
  $('keysClose').addEventListener('click', () => toggle(false));
  W.keysPanel = { toggle, isOpen: () => !panel.hidden };
})(window.Weasel = window.Weasel || {});
