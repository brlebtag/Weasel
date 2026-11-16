/* Weasel — a Caneta e a Curvatura (etapa 4b do plano da interface, docs/planos/interface-illustrator.md).
   As duas montam um caminho ponto a ponto, na tela, e escrevem a linha inteira quando ele termina (um Ctrl+Z só):
   fechado no primeiro ponto, um shape; terminado com Enter ou Esc, um stroke.
   - Caneta (P): o clique põe um canto (x,y!); apertar e arrastar puxa as alças (x,y~dx,dy); com Alt, no meio do
     arraste, só a alça de saída anda (a alça quebrada, x,y~ax,ay~bx,by).
   - Curvatura (Shift+~): o jeito Weasel. Cada clique põe um ponto liso (x,y, a curva automática); o duplo clique ou
     o Alt+clique, um canto (x,y!).
   O app.js dá o mouse (A.addTool) e escreve no código (A.drawPlace, A.addLine); as cores vêm das caixinhas da barra
   de ferramentas (js/ui-draw.js). */
(function (W) {
  'use strict';
  const A = W.app, G = W.geom, D = W.draw;
  if (!A || !G || !D) return;
  const st = A.st;
  const fx = (v) => String(Number(v.toFixed(st.view.z > 3 ? 1 : 0)));
  const CLOSE = 8; // pixels da tela: perto assim do primeiro ponto, o clique fecha o caminho

  // o caminho sendo montado: { tool, pts: [{ x, y, corner, tan, tin }], hover: [x, y] | null, drag: {…} | null }
  let path = null, lastDown = null;

  const scr = (p) => [st.view.x + p[0] * st.view.z, st.view.y + p[1] * st.view.z];
  function nearFirst(p) {
    if (!path || path.pts.length < 3) return false;
    const a = scr([path.pts[0].x, path.pts[0].y]), b = scr(p);
    return Math.hypot(a[0] - b[0], a[1] - b[1]) < CLOSE;
  }
  // com Shift, o ponto novo fica de 45 em 45 graus a partir do último
  function at(e) {
    const c = A.toCanvas(e);
    let p = A.snapPt(e, c[0], c[1]);
    const last = path && path.pts[path.pts.length - 1];
    if (e.shiftKey && last) {
      const dx = p[0] - last.x, dy = p[1] - last.y, len = Math.hypot(dx, dy), t = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      p = [last.x + Math.cos(t) * len, last.y + Math.sin(t) * len];
    }
    return p;
  }

  // ---------- escrever ----------
  function finish(closed) {
    const P = path;
    path = null;
    A.draw();
    if (!P || !st.model) return;
    const pts = P.pts;
    if (pts.length < (closed ? 3 : 2)) { if (pts.length) A.hint(closed ? 'Um shape precisa de 3 pontos: nada foi escrito.' : 'O caminho tinha um ponto só: nada foi escrito.', 2400); return; }
    const pl = A.drawPlace(D.behind());
    if (!pl || pl.why) { if (pl) A.hint(pl.why, 3200); return; }
    const lc = (p) => pl.local(p);
    const vec = (p, v, s) => { const a = lc([p.x, p.y]), b = lc([p.x + s * v[0], p.y + s * v[1]]); return [s * (b[0] - a[0]), s * (b[1] - a[1])]; };
    const n = pts.length;
    const txt = pts.map((p, i) => {
      const q = lc([p.x, p.y]);
      let t = `${fx(q[0])},${fx(q[1])}`;
      // nas pontas de um traço aberto, o lado de fora não conta (e o ! também não muda nada)
      const inOk = closed || i > 0, outOk = closed || i < n - 1;
      if (p.tan) {
        const b = outOk ? vec(p, p.tan, 1) : null, a = inOk ? vec(p, p.tin || p.tan, -1) : null;
        const fa = a && `${fx(a[0])},${fx(a[1])}`, fb = b && `${fx(b[0])},${fx(b[1])}`;
        t += !fa || !fb ? `~${fa || fb}` : fa === fb ? `~${fb}` : `~${fa}~${fb}`;
      } else if (p.corner && inOk && outOk) t += '!';
      return t;
    }).join(' ');
    const cmd = closed ? 'shape' : 'stroke', rest = `${closed ? D.closedPaint() : D.openPaint()} : ${txt}`;
    const nl = A.addLine(pl, cmd, cmd, rest, { key: 'caminho' + Date.now() });
    if (nl < 0) return;
    const name = (W.lang.splitLine(A.lineText(nl)).words[1] || {}).text || '';
    A.hint(`${cmd} ${name} com ${n} pontos na linha ${nl + 1}. A Seleção direta (A) mexe nos pontos; o Ponto de ancoragem (Shift+C), nas alças.`, 3000);
  }

  // ---------- as duas ferramentas ----------
  function tool(id) {
    return {
      handles: false,
      down(e) {
        if (!st.model) return false;
        const p = at(e);
        // o segundo clique de um duplo clique cai no mesmo lugar: não vira outro ponto
        const now = Date.now(), dbl = lastDown && now - lastDown.t < 450 && Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y) < 5;
        lastDown = { t: now, x: e.clientX, y: e.clientY };
        if (path && path.tool !== id) finish(false);
        if (dbl && path) { path.drag = null; return true; }
        if (nearFirst(p)) {
          path.drag = { i: 0, a: [path.pts[0].x, path.pts[0].y], x: e.clientX, y: e.clientY, moved: false, close: true };
          return true;
        }
        // o primeiro ponto tira a escolha (como no Illustrator): as alças da forma de antes não atrapalham
        if (!path) { path = { tool: id, pts: [], hover: null, drag: null }; A.selectNone(); }
        path.pts.push({ x: p[0], y: p[1], corner: id === 'pen' || e.altKey, tan: null, tin: null });
        path.drag = { i: path.pts.length - 1, a: p, x: e.clientX, y: e.clientY, moved: false };
        A.draw();
        return true;
      },
      move(e) {
        const d = path && path.drag;
        if (!d) return;
        if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
        d.moved = true;
        const c = A.toCanvas(e), q = path.pts[d.i];
        if (id === 'curve' && !d.close) {
          // a Curvatura: arrastar leva o ponto novo
          const p = A.snapPt(e, c[0], c[1]);
          q.x = p[0];
          q.y = p[1];
        } else {
          // a Caneta (ou fechar arrastando): as alças do ponto. Alt: daí em diante, só a de saída anda
          let v = [c[0] - d.a[0], c[1] - d.a[1]];
          if (e.shiftKey) { const len = Math.hypot(v[0], v[1]), t = Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)) * (Math.PI / 4); v = [Math.cos(t) * len, Math.sin(t) * len]; }
          const tiny = Math.hypot(v[0], v[1]) * st.view.z < 3;
          if (d.close) {
            // fechando, o arraste no primeiro ponto deixa ele liso (as duas alças); com Alt, só a de chegada (a
            // curva que volta para ele) anda, e a de saída fica como estava
            if (tiny) return;
            if (e.altKey) {
              const nx = path.pts[1];
              if (!q.tan) q.tan = [(nx.x - q.x) / 3, (nx.y - q.y) / 3];
              q.tin = v;
            } else { q.tan = v; q.tin = null; }
            q.corner = false;
          } else if (tiny) { q.tan = null; q.tin = null; q.corner = id === 'pen'; } else {
            // apertar o Alt no meio quebra a alça: a de chegada fica onde estava e só a de saída segue o mouse
            if (e.altKey && !d.broke) { d.broke = true; q.tin = q.tan || v; }
            q.tan = v;
            if (!d.broke) q.tin = null;
            q.corner = false;
          }
        }
        A.draw();
      },
      up() {
        const d = path && path.drag;
        if (!d) return;
        path.drag = null;
        if (d.close) { finish(true); return; }
        A.draw();
      },
      hover(e) {
        if (!path || path.tool !== id || path.drag) return;
        path.hover = at(e);
        A.draw();
      },
      // na Curvatura, o duplo clique troca o último ponto entre liso e canto; na Caneta, não faz nada
      dbl() {
        if (id !== 'curve' || !path || !path.pts.length) return;
        const q = path.pts[path.pts.length - 1];
        q.corner = !q.corner;
        A.hint(q.corner ? 'Canto vivo (!). Duplo clique de novo: liso.' : 'Ponto liso.', 1800);
        A.draw();
      },
      cursor(e) {
        const c = A.toCanvas(e);
        return nearFirst([c[0], c[1]]) ? 'cell' : 'crosshair';
      },
      overlay(ctx, z, dpr) {
        if (!path || path.tool !== id || !path.pts.length) return;
        const pts = path.pts.slice();
        const closing = path.hover && nearFirst(path.hover);
        // o próximo trecho, até o mouse (na Curvatura, já curvo: o mouse entra como um ponto liso)
        if (path.hover && !path.drag && !closing) pts.push({ x: path.hover[0], y: path.hover[1], corner: id === 'pen', tan: null, tin: null });
        const segs = G.smoothSegs(pts, !!closing, 1);
        ctx.beginPath();
        segs.forEach((s, i) => { if (!i) ctx.moveTo(s[0], s[1]); ctx.bezierCurveTo(s[2], s[3], s[4], s[5], s[6], s[7]); });
        ctx.lineWidth = 1.6 / z;
        ctx.strokeStyle = '#2f8cff';
        ctx.stroke();
        // as alças do último ponto (e do primeiro, fechando)
        const r = 4 / z;
        const hands = (q) => {
          if (!q.tan) return;
          const a = q.tin || q.tan;
          ctx.beginPath();
          ctx.moveTo(q.x - a[0], q.y - a[1]);
          ctx.lineTo(q.x, q.y);
          ctx.lineTo(q.x + q.tan[0], q.y + q.tan[1]);
          ctx.lineWidth = 1.1 / z;
          ctx.strokeStyle = 'rgba(92,198,212,.95)';
          ctx.stroke();
          for (const t of [[q.x - a[0], q.y - a[1]], [q.x + q.tan[0], q.y + q.tan[1]]]) {
            ctx.beginPath();
            ctx.moveTo(t[0], t[1] - r);
            ctx.lineTo(t[0] + r, t[1]);
            ctx.lineTo(t[0], t[1] + r);
            ctx.lineTo(t[0] - r, t[1]);
            ctx.closePath();
            ctx.fillStyle = '#5cc6d4';
            ctx.fill();
          }
        };
        hands(path.pts[path.pts.length - 1]);
        if (path.pts.length > 1) hands(path.pts[0]);
        // os pontos: quadradinho no canto, bolinha no liso; o primeiro maior quando o clique vai fechar
        path.pts.forEach((q, i) => {
          const rr = (i === 0 && closing ? 6 : 3.4) / z;
          ctx.beginPath();
          if (q.corner) ctx.rect(q.x - rr, q.y - rr, rr * 2, rr * 2); else ctx.arc(q.x, q.y, rr, 0, Math.PI * 2);
          ctx.fillStyle = i === path.pts.length - 1 ? '#2f8cff' : '#ffffff';
          ctx.fill();
          ctx.lineWidth = 1.3 / z;
          ctx.strokeStyle = '#2f8cff';
          ctx.stroke();
        });
        if (closing) D.tag(ctx, dpr, path.hover, 'fechar (shape)');
        else if (path.pts.length === 1 && !path.drag) D.tag(ctx, dpr, path.hover || [path.pts[0].x, path.pts[0].y], 'Enter ou Esc termina um stroke');
      },
    };
  }
  A.addTool('pen', tool('pen'));
  A.addTool('curve', tool('curve'));

  // Enter e Esc terminam (um stroke); Backspace e Delete tiram o último ponto. Trocar de ferramenta também termina.
  window.addEventListener('keydown', (e) => {
    if (!path || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('textarea, input, select, dialog, [contenteditable]')) return;
    const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (e.key === 'Enter' || e.key === 'Escape') { stop(); finish(false); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      stop();
      path.pts.pop();
      if (!path.pts.length) path = null;
      A.draw();
    }
  }, true);
  A.on('tool', () => { if (path && st.tool !== path.tool) finish(false); });
})(window.Weasel = window.Weasel || {});
