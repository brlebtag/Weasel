/* Weasel — o tema do editor: Claro (o padrão), Escuro ou Do sistema (segue o Windows, o macOS ou o Linux).
   O index.html já põe o data-theme no <html> antes de pintar, para a tela não piscar; aqui ficam a troca pelo
   menu Exibir › Tema, a escolha guardada no navegador (localStorage) e o aviso para quem pinta em canvas (as
   réguas e as duas linhas do tempo têm uma tabela de cores para cada tema). Só a moldura muda: o desenho e o
   que vai por cima dele (alças, ossos, guias) ficam iguais nos dois temas. */
(function (W) {
  'use strict';
  const KEY = 'weasel.theme', PREFS = ['light', 'dark', 'system'];
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let pref = 'light';
  try { const p = localStorage.getItem(KEY); if (PREFS.includes(p)) pref = p; } catch (e) { /* sem armazenamento: fica o Claro */ }
  const subs = [];
  const current = () => (pref === 'system' ? (mq && mq.matches ? 'dark' : 'light') : pref);
  function apply() {
    const t = current();
    if (document.documentElement.dataset.theme !== t) document.documentElement.dataset.theme = t;
    for (const fn of subs) fn(t);
  }
  const follow = () => { if (pref === 'system') apply(); };
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', follow); else if (mq.addListener) mq.addListener(follow); }
  W.theme = {
    // a escolha do menu ('light', 'dark' ou 'system') e o tema que vale agora ('light' ou 'dark')
    pref: () => pref,
    current,
    set(p) {
      if (!PREFS.includes(p)) return;
      pref = p;
      try { localStorage.setItem(KEY, p); } catch (e) { /* sem armazenamento: vale só até fechar */ }
      apply();
    },
    // quem pinta em canvas pede para ser avisado e pinta de novo; pick escolhe a tabela de cores do tema
    on(fn) { subs.push(fn); },
    pick: (dark, light) => (current() === 'dark' ? dark : light),
  };
  apply();
})(window.Weasel = window.Weasel || {});
