/* Weasel — exporta um quadro como SVG (vetorial), seguindo as mesmas camadas do desenho no canvas. */
(function (W) {
  'use strict';
  const S = W.scene, G = W.geom;
  const n2 = (v) => String(Math.round(v * 100) / 100);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function pathD(segs, closed) {
    if (!segs.length) return '';
    let d = `M${n2(segs[0][0])} ${n2(segs[0][1])}`;
    for (const s of segs) d += `C${n2(s[2])} ${n2(s[3])} ${n2(s[4])} ${n2(s[5])} ${n2(s[6])} ${n2(s[7])}`;
    return closed ? d + 'Z' : d;
  }
  function polyD(p, i, j) {
    let d = `M${n2(p[i * 2])} ${n2(p[i * 2 + 1])}`;
    for (let k = i + 1; k <= j; k++) d += `L${n2(p[k * 2])} ${n2(p[k * 2 + 1])}`;
    return d;
  }
  // '#rrggbbaa' vira cor + opacidade (nem todo programa entende a cor com alpha)
  function colorAttr(c) {
    const p = G.parseHex(c);
    if (!p) return { c, o: 1 };
    return { c: '#' + [p[0], p[1], p[2]].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''), o: p[3] };
  }

  function render(model, pose, o) {
    o = o || {};
    const c = model.canvas;
    const rect = o.rect || { x: 0, y: 0, w: c.w, h: c.h };
    const scale = o.scale || 1;
    const defs = [];
    let uid = 0;
    const id = (p) => `${p}${++uid}`;

    function paintRef(spec, el, inText) {
      if (!spec) return { v: 'none', o: 1 };
      if (typeof spec === 'string') { const ca = colorAttr(spec); return { v: ca.c, o: ca.o }; }
      const q = inText ? S.textGradGeom(el, spec) : S.gradGeom(model, pose, el, spec);
      const gid = id('g');
      const stops = spec.stops.map((s) => { const ca = colorAttr(s.c); return `<stop offset="${n2(s.at)}" stop-color="${ca.c}"${ca.o < 1 ? ` stop-opacity="${n2(ca.o)}"` : ''}/>`; }).join('');
      if (q.type === 'linear') defs.push(`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${n2(q.x1)}" y1="${n2(q.y1)}" x2="${n2(q.x2)}" y2="${n2(q.y2)}">${stops}</linearGradient>`);
      else defs.push(`<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${n2(q.cx)}" cy="${n2(q.cy)}" r="${n2(q.r)}" fx="${n2(q.fx)}" fy="${n2(q.fy)}">${stops}</radialGradient>`);
      return { v: `url(#${gid})`, o: 1 };
    }
    const fillA = (spec, el, inText) => { const p = paintRef(spec, el, inText); return `fill="${p.v}"${p.o < 1 ? ` fill-opacity="${n2(p.o)}"` : ''}`; };
    const strokeA = (spec, el, w, inText) => { const p = paintRef(spec, el, inText); return `stroke="${p.v}"${p.o < 1 ? ` stroke-opacity="${n2(p.o)}"` : ''} stroke-width="${n2(w)}"`; };

    // traço de espessura variável: trechos com pontas redondas, num grupo com a opacidade da cor
    function varStroke(p, widths, spec, el) {
      const pr = paintRef(spec, el);
      const body = G.varBatches(p, widths).map((b) => `<path d="${polyD(p, b.i, b.j)}" fill="none" stroke="${pr.v}" stroke-width="${n2(b.w)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
      return pr.o < 1 ? `<g opacity="${n2(pr.o)}">${body}</g>` : body;
    }
    const elPath = (e) => pathD(S.geometry(model, pose, e).segs, true);
    function clipDef(els) {
      const cid = id('c');
      defs.push(`<clipPath id="${cid}">${els.filter((e) => e.closed).map((e) => `<path d="${elPath(e)}"/>`).join('')}</clipPath>`);
      return cid;
    }
    function maskOut(els) {
      const mid = id('m'), big = 'x="-100000" y="-100000" width="200000" height="200000"';
      defs.push(`<mask id="${mid}" maskUnits="userSpaceOnUse" ${big}><rect ${big} fill="#fff"/>${els.filter((e) => e.closed).map((e) => `<path d="${elPath(e)}" fill="#000"/>`).join('')}</mask>`);
      return mid;
    }

    function textSvg(el, pr) {
      if (!el.str) return '';
      const fill = pr.c !== undefined ? pr.c : el.fill;
      const ink = pr.ink !== undefined ? pr.ink : el.ink;
      const inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
      const m = S.textMatrix(pose, el);
      const anchor = { left: 'start', center: 'middle', right: 'end' }[el.align];
      let a = `transform="matrix(${m.map(n2).join(' ')})" font-family="${esc(el.font)}" font-size="${n2(el.size)}" text-anchor="${anchor}"`;
      if (el.bold) a += ' font-weight="bold"';
      if (el.italic) a += ' font-style="italic"';
      if (ink > 0 && inkc && model.finish.style !== 'flat') a += ` ${strokeA(inkc, el, ink * 2, true)} stroke-linejoin="round" paint-order="stroke"`;
      return `<text ${a} ${fillA(fill, el, true)}>${esc(el.str)}</text>`;
    }

    function item(el, part, layer, base) {
      if (el.hidden) return '';
      const pr = pose.props.get(el.id) || {};
      if (pr.show === 0) return '';
      let alpha = base * el.opacity * (pr.opacity !== undefined ? pr.opacity : 1);
      if (alpha <= 0.001) return '';
      let body = '';
      if (el.type === 'text') body = textSvg(el, pr);
      else {
        const g = S.geometry(model, pose, el);
        if (!g.segs.length) return '';
        if (el.closed) {
          const fill = pr.c !== undefined ? pr.c : el.fill;
          const ink = pr.ink !== undefined ? pr.ink : el.ink;
          const inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
          const withInk = part !== 'fill' && ink > 0 && model.finish.style !== 'flat' && inkc;
          const d = pathD(g.segs, true);
          if (part !== 'ink' && fill) body += `<path d="${d}" ${fillA(fill, el)}/>`;
          if (withInk) {
            if (el.weight > 0) { const p = S.flatOf(g); body += varStroke(p, G.inkWidths(p, ink, el.weight, model.canvas.light), inkc, el); } else body += `<path d="${d}" fill="none" ${strokeA(inkc, el, ink)} stroke-linejoin="round" stroke-linecap="round"/>`;
          }
          if (el.cuts) {
            body = `<g mask="url(#${maskOut(el.cuts)})">${body}</g>`;
            if (withInk) {
              const cid = clipDef([el]);
              body += `<g clip-path="url(#${cid})">${el.cuts.map((cu) => `<path d="${elPath(cu)}" fill="none" ${strokeA(inkc, el, ink)} stroke-linejoin="round"/>`).join('')}</g>`;
            }
          }
        } else {
          const color = pr.c !== undefined ? pr.c : el.color;
          if (!color) return '';
          const w = pr.w !== undefined ? pr.w : el.w;
          if (el.type === 'line') body = `<path d="${pathD(g.segs, false)}" fill="none" ${strokeA(color, el, w)} stroke-linejoin="round"${el.dash ? ` stroke-dasharray="${el.dash.map(n2).join(' ')}"` : ''}/>`;
          else {
            if (layer.clip && !el.limb) alpha *= model.finish.inner;
            if (el.limb) {
              const p = S.flatOf(g), s = w / (el.w || 1);
              body = varStroke(p, G.taperWidths(p, el.limb[0] * s, el.limb[1] * s, [0, 0]), color, el);
            } else if (el.taper[0] > 0 || el.taper[1] > 0) {
              const p = S.flatOf(g);
              body = varStroke(p, G.taperWidths(p, w, w, el.taper), color, el);
            } else body = `<path d="${pathD(g.segs, false)}" fill="none" ${strokeA(color, el, w)} stroke-linecap="${el.cap}" stroke-linejoin="round"/>`;
          }
        }
      }
      return alpha < 0.999 ? `<g opacity="${n2(alpha)}">${body}</g>` : body;
    }

    const parts = [];
    if (!o.transparent && c.bg) parts.push(`<rect x="${n2(rect.x)}" y="${n2(rect.y)}" width="${n2(rect.w)}" height="${n2(rect.h)}" ${fillA(c.bg, null)}/>`);
    else if (!o.transparent) parts.push(`<rect x="${n2(rect.x)}" y="${n2(rect.y)}" width="${n2(rect.w)}" height="${n2(rect.h)}" fill="#ffffff"/>`);
    for (const layer of model.layers) {
      if (!S.layerVisible(layer, pose, o)) continue;
      const lp = pose.lprops.get(layer.name);
      if (lp && lp.show === 0) continue;
      const alpha = layer.opacity * (lp && lp.opacity !== undefined ? lp.opacity : 1);
      if (alpha <= 0.001) continue;
      const items = layer.items.map((it) => item(it.el, it.part, layer, alpha)).join('');
      if (!items) continue;
      let attrs = ` data-layer="${esc(layer.name)}"`;
      if (layer.blend !== 'source-over') attrs += ` style="mix-blend-mode:${layer.blend}"`;
      if (layer.clip) attrs += ` clip-path="url(#${clipDef(S.clipEls(model, layer.clip))})"`;
      if (layer.cut) attrs += ` mask="url(#${maskOut(S.clipEls(model, layer.cut))})"`;
      parts.push(`<g${attrs}>${items}</g>`);
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${n2(rect.w * scale)}" height="${n2(rect.h * scale)}" viewBox="${n2(rect.x)} ${n2(rect.y)} ${n2(rect.w)} ${n2(rect.h)}">\n` +
      (defs.length ? `<defs>${defs.join('')}</defs>\n` : '') + parts.join('\n') + '\n</svg>\n';
  }

  W.svg = { render };
})(window.Weasel = window.Weasel || {});
