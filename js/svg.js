/* Weasel — exporta um quadro como SVG (vetorial), seguindo as mesmas camadas do desenho no canvas.
   A luz vira cor por forma (mais o degradê do lado iluminado), os efeitos viram filtros do SVG. */
(function (W) {
  'use strict';
  const S = W.scene, G = W.geom, M = G.M;
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
  const circleD = (x, y, r) => `M${n2(x - r)} ${n2(y)}a${n2(r)} ${n2(r)} 0 1 0 ${n2(2 * r)} 0a${n2(r)} ${n2(r)} 0 1 0 ${n2(-2 * r)} 0`;
  const matAttr = (m) => `matrix(${m.map(n2).join(' ')})`;

  function render(model, pose, o) {
    o = o || {};
    const c = model.canvas;
    const rect = o.rect || { x: 0, y: 0, w: c.w, h: c.h };
    const scale = o.scale || 1;
    const defs = [];
    let uid = 0;
    const id = (p) => `${p}${++uid}`;
    const lighting = S.sceneLights(model, pose);

    function paintRef(spec, el, inText, Lp, noAdd) {
      if (!spec) return { v: 'none', o: 1 };
      if (typeof spec === 'string') { const ca = colorAttr(Lp ? S.litColor(spec, lighting, Lp[0], Lp[1], noAdd) : spec); return { v: ca.c, o: ca.o }; }
      if (spec.kind === 'pat') return paintRef(spec.c, el, inText, Lp, noAdd);
      const q = inText ? S.textGradGeom(el, spec) : S.gradGeom(model, pose, el, spec);
      const gid = id('g');
      const stops = spec.stops.map((s) => { const ca = colorAttr(Lp ? S.litColor(s.c, lighting, Lp[0], Lp[1]) : s.c); return `<stop offset="${n2(s.at)}" stop-color="${ca.c}"${ca.o < 1 ? ` stop-opacity="${n2(ca.o)}"` : ''}/>`; }).join('');
      if (q.type === 'linear') defs.push(`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${n2(q.x1)}" y1="${n2(q.y1)}" x2="${n2(q.x2)}" y2="${n2(q.y2)}">${stops}</linearGradient>`);
      else defs.push(`<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${n2(q.cx)}" cy="${n2(q.cy)}" r="${n2(q.r)}" fx="${n2(q.fx)}" fy="${n2(q.fy)}">${stops}</radialGradient>`);
      return { v: `url(#${gid})`, o: 1 };
    }
    const fillA = (spec, el, inText, Lp) => { const p = paintRef(spec, el, inText, Lp); return `fill="${p.v}"${p.o < 1 ? ` fill-opacity="${n2(p.o)}"` : ''}`; };
    const strokeA = (spec, el, w, inText, Lp, noAdd) => { const p = paintRef(spec, el, inText, Lp, noAdd); return `stroke="${p.v}"${p.o < 1 ? ` stroke-opacity="${n2(p.o)}"` : ''} stroke-width="${n2(w)}"`; };

    // traço de espessura variável: trechos com pontas redondas, num grupo com a opacidade da cor
    function varStroke(p, widths, spec, el, Lp, noAdd) {
      const pr = paintRef(spec, el, false, Lp, noAdd);
      const body = G.varBatches(p, widths).map((b) => `<path d="${polyD(p, b.i, b.j)}" fill="none" stroke="${pr.v}" stroke-width="${n2(b.w)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
      return pr.o < 1 ? `<g opacity="${n2(pr.o)}">${body}</g>` : body;
    }
    const elPath = (e, P) => pathD(S.geometry(model, P, e).segs, true);
    function clipDef(els, P) {
      const cid = id('c');
      defs.push(`<clipPath id="${cid}">${els.filter((e) => e.closed).map((e) => `<path d="${elPath(e, P)}"/>`).join('')}</clipPath>`);
      return cid;
    }
    function maskOut(ds) {
      const mid = id('m'), big = 'x="-100000" y="-100000" width="200000" height="200000"';
      defs.push(`<mask id="${mid}" maskUnits="userSpaceOnUse" ${big}><rect ${big} fill="#fff"/>${ds.map((d) => `<path d="${d}" fill="#000"/>`).join('')}</mask>`);
      return mid;
    }
    const glowFilters = new Map();
    function glowFilter(color, std) {
      const key = color + ':' + n2(std);
      if (glowFilters.has(key)) return glowFilters.get(key);
      const fid = id('f'), ca = colorAttr(color);
      defs.push(`<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="${n2(std)}" result="b"/><feFlood flood-color="${ca.c}"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
      glowFilters.set(key, fid);
      return fid;
    }

    function patternSvg(el, g, pat, P, Lp) {
      const cid = clipDef([el], P);
      const { lines, dots } = S.patternLines(model, P, el, pat);
      const col = paintRef(pat.c, el, false, Lp);
      let body = '';
      if (pat.bg) body += `<path d="${pathD(g.segs, true)}" ${fillA(pat.bg, el, false, Lp)}/>`;
      if (lines.length) body += `<path d="${lines.map(([a, b]) => `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}`).join('')}" fill="none" stroke="${col.v}" stroke-width="${n2(pat.w * (el.ws || 1))}"/>`;
      if (dots.length) body += `<path d="${dots.map((d) => circleD(d[0], d[1], pat.r * (el.ws || 1))).join('')}" fill="${col.v}"/>`;
      return `<g clip-path="url(#${cid})">${body}</g>`;
    }

    function textSvg(el, pr, P, lit) {
      if (!el.str) return '';
      const fill = pr.c !== undefined ? pr.c : el.fill;
      const ink = pr.ink !== undefined ? pr.ink : el.ink;
      const inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
      const m = S.textMatrix(P, el);
      const Lp = lit ? [m[4], m[5]] : null;
      const anchor = { left: 'start', center: 'middle', right: 'end' }[el.align];
      let a = `transform="${matAttr(m)}" font-family="${esc(el.font)}" font-size="${n2(el.size)}" text-anchor="${anchor}"`;
      if (el.bold) a += ' font-weight="bold"';
      if (el.italic) a += ' font-style="italic"';
      if (ink > 0 && inkc && model.finish.style !== 'flat') a += ` ${strokeA(inkc, el, ink * 2, true, Lp)} stroke-linejoin="round" paint-order="stroke"`;
      return `<text ${a} ${fillA(fill, el, true, Lp)}>${esc(el.str)}</text>`;
    }

    function particlesSvg(el, P, lit) {
      let out = '';
      for (const p of S.particles(model, P, el)) {
        if (p.size <= 0.05) continue;
        const col = lit ? S.litColor(p.color, lighting, p.x, p.y) : p.color;
        const ca = colorAttr(col);
        if (ca.o <= 0.004) continue;
        const r = p.size / 2, op = ca.o < 1 ? ` opacity="${n2(ca.o)}"` : '';
        if (el.pshape === 'streak') {
          const v = Math.hypot(p.vx, p.vy) || 1, len = p.size * 4;
          out += `<path d="M${n2(p.x - (p.vx / v) * len)} ${n2(p.y - (p.vy / v) * len)}L${n2(p.x)} ${n2(p.y)}" stroke="${ca.c}" stroke-width="${n2(Math.max(0.6, p.size * 0.35))}" stroke-linecap="round"${op}/>`;
        } else if (el.pshape === 'square') out += `<rect x="${n2(-r)}" y="${n2(-r)}" width="${n2(2 * r)}" height="${n2(2 * r)}" transform="translate(${n2(p.x)} ${n2(p.y)}) rotate(${n2((p.spin * 180) / Math.PI)})" fill="${ca.c}"${op}/>`;
        else if (el.pshape === 'star') {
          let d = '';
          for (let i = 0; i < 8; i++) { const a = p.spin + (i * Math.PI) / 4, rr = i % 2 ? r * 0.35 : r * 1.2; d += `${i ? 'L' : 'M'}${n2(p.x + Math.cos(a) * rr)} ${n2(p.y + Math.sin(a) * rr)}`; }
          out += `<path d="${d}Z" fill="${ca.c}"${op}/>`;
        } else if (el.pshape === 'soft') out += `<circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(r * 1.5)}" fill="${ca.c}" opacity="${n2(ca.o * 0.6)}"/>`;
        else out += `<circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(r)}" fill="${ca.c}"${op}/>`;
      }
      return out;
    }

    // um elemento da camada; P = pose (o rastro usa poses de quadros anteriores)
    function item(el, part, layer, base, P, lit, flat) {
      if (el.hidden) return '';
      const pr = P.props.get(el.id) || {};
      if (pr.show === 0) return '';
      let alpha = base * el.opacity * (pr.opacity !== undefined ? pr.opacity : 1);
      if (alpha <= 0.001) return '';
      const L = lit && !el.emit;
      let body = '';
      if (el.type === 'text') body = textSvg(el, pr, P, L);
      else if (el.type === 'emitter') body = particlesSvg(el, P, L);
      else {
        const g = S.geometry(model, P, el);
        if (!g.segs.length) return '';
        const bb = S.segsBox(g.segs), Lp = L ? [bb.x + bb.w / 2, bb.y + bb.h / 2] : null;
        if (el.closed) {
          const fill = pr.c !== undefined ? pr.c : el.fill;
          const ink = pr.ink !== undefined ? pr.ink : el.ink;
          const inkc = pr.inkc !== undefined ? pr.inkc : el.inkc;
          const withInk = part !== 'fill' && ink > 0 && model.finish.style !== 'flat' && inkc;
          const d = pathD(g.segs, true);
          if (part !== 'ink' && fill) {
            body += fill.kind === 'pat' ? patternSvg(el, g, fill, P, Lp) : `<path d="${d}" ${fillA(fill, el, false, Lp)}/>`;
            if (L) {
              const la = S.lightAt(lighting, Lp[0], Lp[1]);
              const k = la ? layer.shade * Math.min(1, la.I) * la.dir : 0;
              if (k >= 0.01) {
                const half = Math.abs(la.ux) * bb.w / 2 + Math.abs(la.uy) * bb.h / 2 || 1, gd = id('g'), gl = id('g');
                const lc = colorAttr(G.toHex([la.rgb[0], la.rgb[1], la.rgb[2], 1])).c;
                const ax = `gradientUnits="userSpaceOnUse" x1="${n2(Lp[0] - la.ux * half)}" y1="${n2(Lp[1] - la.uy * half)}" x2="${n2(Lp[0] + la.ux * half)}" y2="${n2(Lp[1] + la.uy * half)}"`;
                defs.push(`<linearGradient id="${gd}" ${ax}><stop offset="0" stop-color="#000" stop-opacity="${n2(Math.min(0.85, 0.55 * k))}"/><stop offset="0.55" stop-color="#000" stop-opacity="0"/></linearGradient>`);
                defs.push(`<linearGradient id="${gl}" ${ax}><stop offset="0.45" stop-color="${lc}" stop-opacity="0"/><stop offset="1" stop-color="${lc}" stop-opacity="${n2(Math.min(0.9, 0.6 * k))}"/></linearGradient>`);
                body += `<path d="${d}" fill="url(#${gd})" style="mix-blend-mode:multiply"/><path d="${d}" fill="url(#${gl})" style="mix-blend-mode:overlay"/>`;
              }
              const rim = layer.rim || lighting.rim;
              if (rim && la && la.dir >= 0.05) {
                const w = rim.w * (el.ws || 1);
                const shifted = pathD(g.segs.map((s) => s.map((v, i) => v - (i % 2 ? la.uy : la.ux) * w)), true);
                const rc = rim.c || G.toHex(la.rgb.map((v) => Math.min(255, v * 1.15 + 30)).concat(1));
                body += `<path d="${d}" ${fillA(rc, el)} opacity="${n2(Math.min(1, la.I) * Math.min(1, la.dir * 1.3))}" mask="url(#${maskOut([shifted])})"/>`;
              }
            }
            if (el.emit) body = `<g filter="url(#${glowFilter(el.emit.c, 8 * el.emit.s)})">${body}</g>`;
          }
          if (withInk) {
            if (el.weight > 0) { const p = S.flatOf(g); body += varStroke(p, G.inkWidths(p, ink, el.weight, model.canvas.light), inkc, el, Lp, true); } else body += `<path d="${d}" fill="none" ${strokeA(inkc, el, ink, false, Lp, true)} stroke-linejoin="round" stroke-linecap="round"/>`;
          }
          if (el.cuts) {
            body = `<g mask="url(#${maskOut(el.cuts.map((cu) => elPath(cu, P)))})">${body}</g>`;
            if (withInk) body += `<g clip-path="url(#${clipDef([el], P)})">${el.cuts.map((cu) => `<path d="${elPath(cu, P)}" fill="none" ${strokeA(inkc, el, ink, false, Lp)} stroke-linejoin="round"/>`).join('')}</g>`;
          }
        } else {
          const color = pr.c !== undefined ? pr.c : el.color;
          if (!color) return '';
          const w = pr.w !== undefined ? pr.w : el.w;
          if (el.type === 'line') body = `<path d="${pathD(g.segs, false)}" fill="none" ${strokeA(color, el, w, false, Lp)} stroke-linejoin="round"${el.dash ? ` stroke-dasharray="${el.dash.map(n2).join(' ')}"` : ''}/>`;
          else {
            if (layer.clip && !el.limb) alpha *= model.finish.inner;
            if (el.limb) {
              const p = S.flatOf(g), s = w / (el.w || 1);
              body = varStroke(p, G.taperWidths(p, el.limb[0] * s, el.limb[1] * s, [0, 0]), color, el, Lp);
            } else if (el.taper[0] > 0 || el.taper[1] > 0) {
              const p = S.flatOf(g);
              body = varStroke(p, G.taperWidths(p, w, w, el.taper), color, el, Lp);
            } else body = `<path d="${pathD(g.segs, false)}" fill="none" ${strokeA(color, el, w, false, Lp)} stroke-linecap="${el.cap}" stroke-linejoin="round"/>`;
          }
        }
      }
      if (el.emit && !flat && (el.type === 'text' || el.type === 'emitter' || !el.closed)) body = `<g filter="url(#${glowFilter(el.emit.c, 8 * el.emit.s)})">${body}</g>`;
      return alpha < 0.999 ? `<g opacity="${n2(alpha)}">${body}</g>` : body;
    }

    // efeitos da camada como filtro do SVG
    function fxFilter(fx) {
      const prims = [];
      let cur = 'SourceGraphic';
      const step = (p) => { const r = id('r'); prims.push(p.replace('RESULT', r)); cur = r; };
      if (fx.tint > 0 && fx.tintc) {
        const ca = colorAttr(fx.tintc), fl = id('r');
        prims.push(`<feFlood flood-color="${ca.c}" flood-opacity="${n2(Math.min(1, fx.tint))}" result="${fl}"/>`);
        const atop = id('r');
        prims.push(`<feComposite in="${fl}" in2="${cur}" operator="in" result="${atop}"/>`);
        step(`<feMerge result="RESULT"><feMergeNode in="${cur}"/><feMergeNode in="${atop}"/></feMerge>`);
      }
      if (fx.brightness !== undefined && fx.brightness !== 1) step(`<feComponentTransfer in="${cur}" result="RESULT"><feFuncR type="linear" slope="${fx.brightness}"/><feFuncG type="linear" slope="${fx.brightness}"/><feFuncB type="linear" slope="${fx.brightness}"/></feComponentTransfer>`);
      if (fx.contrast !== undefined && fx.contrast !== 1) { const k = fx.contrast, b = n2(0.5 - 0.5 * k); step(`<feComponentTransfer in="${cur}" result="RESULT"><feFuncR type="linear" slope="${k}" intercept="${b}"/><feFuncG type="linear" slope="${k}" intercept="${b}"/><feFuncB type="linear" slope="${k}" intercept="${b}"/></feComponentTransfer>`); }
      if (fx.saturate !== undefined && fx.saturate !== 1) step(`<feColorMatrix in="${cur}" type="saturate" values="${fx.saturate}" result="RESULT"/>`);
      if (fx.hue) step(`<feColorMatrix in="${cur}" type="hueRotate" values="${fx.hue}" result="RESULT"/>`);
      if (fx.blur > 0) step(`<feGaussianBlur in="${cur}" stdDeviation="${n2(fx.blur / 2)}" result="RESULT"/>`);
      const under = [];
      if (fx.shadow) {
        const ca = colorAttr(fx.shadow.c), r = id('r');
        prims.push(`<feDropShadow in="${cur}" dx="${n2(fx.shadow.dx)}" dy="${n2(fx.shadow.dy)}" stdDeviation="${n2(fx.shadow.b / 2)}" flood-color="${ca.c}" flood-opacity="${n2(ca.o)}" result="${r}"/>`);
        cur = r;
      }
      if (fx.glow > 0) {
        const ca = colorAttr(fx.glowc || '#ffffff'), b = id('r'), gl = id('r');
        prims.push(`<feGaussianBlur in="${cur}" stdDeviation="${n2(fx.glow / 2)}" result="${b}"/><feFlood flood-color="${ca.c}"/><feComposite in2="${b}" operator="in" result="${gl}"/>`);
        for (let i = 0; i < Math.ceil(fx.glows || 1); i++) under.push(gl);
      }
      if (under.length) step(`<feMerge result="RESULT">${under.map((u) => `<feMergeNode in="${u}"/>`).join('')}<feMergeNode in="${cur}"/></feMerge>`);
      if (!prims.length) return null;
      const fid = id('f');
      defs.push(`<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">${prims.join('')}</filter>`);
      return fid;
    }
    let shadowFilterId = null;
    function shadowFilter(blur) {
      const fid = id('f');
      defs.push(`<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>${blur > 0 ? `<feGaussianBlur stdDeviation="${n2(blur / 2)}"/>` : ''}</filter>`);
      return fid;
    }

    function layerBody(layer, items, P, lit) {
      let attrs = '';
      if (layer.clip) attrs += ` clip-path="url(#${clipDef(S.clipEls(model, layer.clip), P)})"`;
      if (layer.cut) attrs += ` mask="url(#${maskOut(S.clipEls(model, layer.cut).filter((e) => e.closed).map((e) => elPath(e, P)))})"`;
      const inner = items.map((it) => item(it.el, it.part, layer, 1, P, lit)).join('');
      return inner ? `<g${attrs}>${inner}</g>` : '';
    }

    const parts = [];
    if (!o.transparent) parts.push(`<rect x="${n2(rect.x)}" y="${n2(rect.y)}" width="${n2(rect.w)}" height="${n2(rect.h)}" ${c.bg ? fillA(c.bg, null) : 'fill="#ffffff"'}/>`);
    for (const layer of model.layers) {
      if (!S.layerVisible(layer, pose, o)) continue;
      const lp = pose.lprops.get(layer.name) || {};
      if (lp.show === 0) continue;
      const alpha = layer.opacity * (lp.opacity !== undefined ? lp.opacity : 1);
      if (alpha <= 0.001) continue;
      const lit = !!lighting && !layer.unlit && !layer.guide;
      const useOf = (ref, extra) => `<use href="#${ref}" xlink:href="#${ref}"${extra || ''}/>`;
      if (layer.cast && lighting) {
        // silhueta: a própria camada ou as camadas de from=
        const sil = S.castSources(layer, layer.items).filter((s) => S.layerVisible(s.layer, pose, o)).map((s) => layerBody(s.layer, s.items, pose, false)).join('');
        if (sil) {
          const sid = id('L');
          defs.push(`<g id="${sid}">${sil}</g>`);
          for (const sh of S.castShadows(model, pose, lighting, layer, layer.items)) {
            shadowFilterId = shadowFilter(layer.cast.blur);
            parts.push(useOf(sid, ` transform="${matAttr(sh.A)}" filter="url(#${shadowFilterId})" opacity="${n2(alpha * sh.opacity)}"`));
          }
        }
      }
      const body = layerBody(layer, layer.items, pose, lit);
      if (!body) continue;
      const lid = id('L');
      defs.push(`<g id="${lid}">${body}</g>`);
      const use = (extra) => useOf(lid, extra);
      let g = '';
      if (layer.trail && pose.anim) {
        for (let k = layer.trail.n; k >= 1; k--) {
          const tb = layerBody(layer, layer.items, S.makePose(model, pose.anim.name, pose.frame - k), lit);
          if (!tb) continue;
          const tf = layer.trail.c ? fxFilter({ tint: 0.65, tintc: layer.trail.c }) : null;
          g += `<g opacity="${n2(Math.pow(layer.trail.decay, k))}"${tf ? ` filter="url(#${tf})"` : ''}>${tb}</g>`;
        }
      }
      g += use();
      const fx = S.layerFx(layer, lp);
      const fid = fx ? fxFilter(fx) : null;
      let attrs = ` data-layer="${esc(layer.name)}"`;
      if (alpha < 0.999) attrs += ` opacity="${n2(alpha)}"`;
      if (layer.blend !== 'source-over') attrs += ` style="mix-blend-mode:${layer.blend}"`;
      if (fid) attrs += ` filter="url(#${fid})"`;
      parts.push(`<g${attrs}>${g}</g>`);
    }
    // halos das lâmpadas
    if (lighting) {
      for (const L of lighting.lights) {
        if (L.type === 'dir' || !(L.glow > 0)) continue;
        const gid = id('g'), ca = colorAttr(L.c).c, p = Math.min(1.3, L.power);
        defs.push(`<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${n2(L.x)}" cy="${n2(L.y)}" r="${n2(L.glow)}"><stop offset="0" stop-color="${ca}" stop-opacity="${n2(Math.min(1, 0.75 * p))}"/><stop offset="0.3" stop-color="${ca}" stop-opacity="${n2(Math.min(1, 0.28 * p))}"/><stop offset="1" stop-color="${ca}" stop-opacity="0"/></radialGradient>`);
        parts.push(`<circle cx="${n2(L.x)}" cy="${n2(L.y)}" r="${n2(L.glow)}" fill="url(#${gid})" style="mix-blend-mode:screen"/>`);
      }
    }
    // acabamentos: bloom (filtro na cena), vinheta e granulado por cima
    const f = model.finish;
    let scene = parts.join('\n');
    if (f.bloom > 0) {
      const fid = id('f'), k = n2(1.87 * Math.min(2, f.bloom)), b = n2(-0.6 * Math.min(2, f.bloom));
      defs.push(`<filter id="${fid}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${k} 0 0 0 ${b}  0 ${k} 0 0 ${b}  0 0 ${k} 0 ${b}  0 0 0 1 0" result="hi"/><feGaussianBlur in="hi" stdDeviation="${n2(Math.max(rect.w, rect.h) * 0.0125)}" result="bl"/><feBlend in="SourceGraphic" in2="bl" mode="screen"/></filter>`);
      scene = `<g filter="url(#${fid})">${scene}</g>`;
    }
    const over = [];
    if (f.vignette > 0) {
      const gid = id('g');
      defs.push(`<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${n2(rect.x + rect.w / 2)}" cy="${n2(rect.y + rect.h / 2)}" r="${n2(Math.hypot(rect.w, rect.h) / 2)}"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${n2(Math.min(1, f.vignette))}"/></radialGradient>`);
      over.push(`<rect x="${n2(rect.x)}" y="${n2(rect.y)}" width="${n2(rect.w)}" height="${n2(rect.h)}" fill="url(#${gid})"/>`);
    }
    if (f.grain > 0) {
      const fid = id('f');
      defs.push(`<filter id="${fid}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${pose.frame || 0}"/><feColorMatrix type="saturate" values="0"/></filter>`);
      over.push(`<rect x="${n2(rect.x)}" y="${n2(rect.y)}" width="${n2(rect.w)}" height="${n2(rect.h)}" filter="url(#${fid})" opacity="${n2(Math.min(1, f.grain * 2))}" style="mix-blend-mode:overlay"/>`);
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n2(rect.w * scale)}" height="${n2(rect.h * scale)}" viewBox="${n2(rect.x)} ${n2(rect.y)} ${n2(rect.w)} ${n2(rect.h)}">\n` +
      (defs.length ? `<defs>${defs.join('\n')}</defs>\n` : '') + scene + (over.length ? '\n' + over.join('\n') : '') + '\n</svg>\n';
  }

  W.svg = { render };
})(window.Weasel = window.Weasel || {});
