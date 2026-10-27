/* Weasel — editor de código: textarea transparente sobre um <pre> colorido, com números de linha e histórico próprio. */
(function (W) {
  'use strict';
  const L = W.lang;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const FLAG_WORDS = new Set(['guide', 'hidden', 'once', 'loop', 'game', 'flat', 'bold', 'italic', 'linear', 'radial', 'box', 'lit', 'unlit', 'point', 'spot', 'dir', 'hatch', 'dots', 'cross']);

  function valueClass(v) {
    if (v.includes('{')) return 'expr';
    if (v[0] === '"') return 'str';
    if (L.HEX.test(v)) return 'col';
    if (v.split(',').every((p) => L.NUM.test(p))) return 'num';
    return 'val';
  }

  function highlightLine(text) {
    const sp = L.splitLine(text);
    const spans = [];
    const cmd = sp.words[0] && sp.words[0].text;
    sp.words.forEach((w, i) => {
      if (i === 0) { const g = L.KEYWORDS[w.text]; spans.push([w.from, w.to, g ? 'kw-' + g : 'bad']); return; }
      const eq = w.text[0] === '"' ? -1 : w.text.indexOf('=');
      if (eq > 0) {
        const v = w.text.slice(eq + 1);
        spans.push([w.from, w.from + eq, 'attr'], [w.from + eq, w.from + eq + 1, 'op']);
        if (v) spans.push([w.from + eq + 1, w.to, valueClass(v), L.HEX.test(v) ? v : null]);
      } else if (w.text.includes('{')) spans.push([w.from, w.to, 'expr']);
      else if (w.text[0] === '"') spans.push([w.from, w.to, 'str']);
      else if (w.text.split(',').every((p) => L.NUM.test(p))) spans.push([w.from, w.to, 'num']);
      else if (FLAG_WORDS.has(w.text)) spans.push([w.from, w.to, 'flag']);
      else spans.push([w.from, w.to, i === 1 ? 'name' : 'val']);
    });
    if (sp.colon >= 0) spans.push([sp.colon, sp.colon + 1, 'op']);
    for (const p of sp.points) {
      if (cmd === 'gradient') {
        const at = p.text.lastIndexOf('@'), c = at > 0 ? p.text.slice(0, at) : p.text;
        spans.push([p.from, p.from + c.length, L.HEX.test(c) ? 'col' : 'val', L.HEX.test(c) ? c : null]);
        if (at > 0) spans.push([p.from + at, p.to, 'num']);
      } else if (p.text.includes('{')) spans.push([p.from, p.to, 'expr']);
      else if (p.text.endsWith('!')) spans.push([p.from, p.to - 1, 'pt'], [p.to - 1, p.to, 'corner']);
      else if (p.text.includes('~')) { const t = p.text.indexOf('~'); spans.push([p.from, p.from + t, 'pt'], [p.from + t, p.to, 'tan']); } else spans.push([p.from, p.to, 'pt']);
    }
    if (sp.comment !== null) spans.push([sp.commentAt, text.length, 'com']);
    spans.sort((a, b) => a[0] - b[0]);
    let html = '', pos = 0;
    for (const [f, t, c, swatch] of spans) {
      if (f > pos) html += esc(text.slice(pos, f));
      const style = swatch ? ` style="--sw:${swatch}"` : '';
      html += `<span class="${c}${swatch ? ' sw' : ''}"${style}>${esc(text.slice(f, t))}</span>`;
      pos = t;
    }
    return html + esc(text.slice(pos));
  }

  class History {
    constructor() { this.stack = []; this.i = -1; this.key = null; this.time = 0; }
    reset(s) { this.stack = [s]; this.i = 0; this.key = null; }
    push(s, key) {
      const now = Date.now();
      if (key && key === this.key && now - this.time < 900 && this.i === this.stack.length - 1 && this.i > 0) this.stack[this.i] = s;
      else {
        this.stack.splice(this.i + 1);
        this.stack.push(s);
        if (this.stack.length > 400) this.stack.shift();
        this.i = this.stack.length - 1;
      }
      this.key = key; this.time = now;
    }
    undo() { if (this.i > 0) { this.key = null; return this.stack[--this.i]; } return null; }
    redo() { if (this.i < this.stack.length - 1) { this.key = null; return this.stack[++this.i]; } return null; }
  }

  class Editor {
    constructor(root, opts) {
      this.opts = opts || {};
      root.classList.add('ed');
      root.innerHTML = '<div class="ed-gutter"><div class="ed-gin"></div></div><div class="ed-body"><pre class="ed-hl" aria-hidden="true"></pre><textarea class="ed-ta" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="Código do desenho"></textarea></div>';
      this.gutter = root.querySelector('.ed-gin');
      this.hl = root.querySelector('.ed-hl');
      this.ta = root.querySelector('.ed-ta');
      this.errors = [];
      this.hist = new History();
      this.curLine = -1;
      this.lines = [];
      const ta = this.ta;
      this.pop = document.createElement('div');
      this.pop.className = 'ed-pop';
      this.pop.hidden = true;
      root.querySelector('.ed-body').appendChild(this.pop);
      this.items = [];
      this.sel = 0;
      ta.addEventListener('input', (e) => {
        this._changed('type');
        if (e.inputType === 'insertText' && /[\w.=-]/.test(e.data || '')) this._suggest(false);
        else if (e.inputType && e.inputType.startsWith('delete') && !this.pop.hidden) this._suggest(false);
        else this._closePop();
      });
      ta.addEventListener('scroll', () => { this._sync(); this._closePop(); });
      ta.addEventListener('keydown', (e) => this._key(e));
      ta.addEventListener('blur', () => setTimeout(() => this._closePop(), 150));
      ta.addEventListener('mousedown', (e) => this._altDown(e));
      for (const ev of ['keyup', 'mouseup', 'focus', 'select']) ta.addEventListener(ev, () => this._caret());
      ta.addEventListener('mousedown', () => requestAnimationFrame(() => this._caret()));
      document.addEventListener('selectionchange', () => { if (document.activeElement === ta) this._caret(); });
      this.pop.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const row = e.target.closest('[data-i]');
        if (row) this._accept(+row.dataset.i);
      });
    }

    // ---------- medidas do texto (fonte monoespaçada) ----------
    _metrics() {
      const cs = getComputedStyle(this.ta);
      const font = `${cs.fontSize} ${cs.fontFamily}`;
      if (!this._m || this._m.font !== font) {
        const c = (Editor._measure = Editor._measure || document.createElement('canvas').getContext('2d'));
        c.font = font;
        this._m = { font, cw: c.measureText('0').width, lh: parseFloat(cs.lineHeight) || 21, pl: parseFloat(cs.paddingLeft) || 12, pt: parseFloat(cs.paddingTop) || 10 };
      }
      return this._m;
    }

    _posFromMouse(e) {
      const m = this._metrics(), r = this.ta.getBoundingClientRect();
      const x = e.clientX - r.left + this.ta.scrollLeft - m.pl, y = e.clientY - r.top + this.ta.scrollTop - m.pt;
      return { line: Math.floor(y / m.lh), col: Math.max(0, Math.round(x / m.cw - 0.25)) };
    }

    // Alt+arrastar num número muda o valor; Alt+clique numa cor #hex abre o seletor de cor.
    _altDown(e) {
      if (!e.altKey || e.button !== 0) return;
      const { line, col } = this._posFromMouse(e);
      const text = this.ta.value.split('\n')[line];
      if (text === undefined) return;
      let mm;
      const hexRx = /#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/g;
      while ((mm = hexRx.exec(text))) {
        if (col >= mm.index && col <= mm.index + mm[0].length && [4, 5, 7, 9].includes(mm[0].length)) { e.preventDefault(); this._pickColor(line, mm.index, mm[0], e); return; }
      }
      const numRx = /-?\d+(\.\d+)?/g;
      while ((mm = numRx.exec(text))) {
        if (mm.index > 0 && /[\w#.]/.test(text[mm.index - 1])) continue;
        if (col >= mm.index && col <= mm.index + mm[0].length) { e.preventDefault(); this._scrub(line, mm.index, mm[0], e); return; }
      }
    }

    _scrub(line, from, text, e) {
      const start = parseFloat(text), dec = (text.split('.')[1] || '').length, step = Math.pow(10, -dec);
      const off0 = this.lineStart(line) + from, x0 = e.clientX, key = 'scrub' + Date.now();
      let len = text.length;
      document.body.classList.add('scrubbing');
      const move = (ev) => {
        const d = Math.round((ev.clientX - x0) / 3) * step * (ev.shiftKey ? 10 : 1);
        let s = (start + d).toFixed(dec);
        if (Number(s) === 0) s = (0).toFixed(dec);
        this.replaceRange(off0, off0 + len, s, { key, select: [off0 + s.length, off0 + s.length] });
        len = s.length;
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        document.body.classList.remove('scrubbing');
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }

    _pickColor(line, from, hex, e) {
      if (!this.colorInput) {
        this.colorInput = document.createElement('input');
        this.colorInput.type = 'color';
        Object.assign(this.colorInput.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', border: '0', padding: '0' });
        document.body.appendChild(this.colorInput);
      }
      const inp = this.colorInput;
      Object.assign(inp.style, { left: e.clientX + 'px', top: e.clientY + 'px' });
      const h = hex.slice(1);
      const full = h.length <= 4 ? h.slice(0, 3).split('').map((c) => c + c).join('') : h.slice(0, 6);
      const alpha = h.length === 8 ? h.slice(6) : h.length === 4 ? h[3] + h[3] : '';
      inp.value = '#' + full.toLowerCase();
      const off0 = this.lineStart(line) + from, key = 'color' + Date.now();
      let len = hex.length;
      inp.oninput = () => {
        const s = inp.value + alpha;
        this.replaceRange(off0, off0 + len, s, { key, select: [off0 + s.length, off0 + s.length] });
        len = s.length;
      };
      try { if (inp.showPicker) inp.showPicker(); else inp.click(); } catch (err) { inp.click(); }
    }

    // ---------- autocompletar ----------
    _suggest(force) {
      const ta = this.ta;
      if (!this.opts.complete || ta.selectionStart !== ta.selectionEnd) return this._closePop();
      const c = this.caret();
      const lineText = ta.value.split('\n')[c.line] || '';
      const before = lineText.slice(0, c.col);
      const word = /[\w.-]*$/.exec(before)[0];
      if (!force && !word && !before.endsWith('=')) return this._closePop();
      const low = word.toLowerCase();
      const items = this.opts.complete({ text: lineText, before, word, line: c.line })
        .filter((it) => it.label.toLowerCase().startsWith(low) && it.label !== word)
        .slice(0, 40);
      if (!items.length) return this._closePop();
      this.items = items;
      this.word = word;
      this.sel = 0;
      const m = this._metrics();
      this.pop.style.left = Math.max(0, m.pl + (c.col - word.length) * m.cw - ta.scrollLeft) + 'px';
      this.pop.style.top = m.pt + (c.line + 1) * m.lh - ta.scrollTop + 2 + 'px';
      this._renderPop();
      this.pop.hidden = false;
    }

    _renderPop() {
      this.pop.innerHTML = this.items.map((it, i) => `<div data-i="${i}" class="${i === this.sel ? 'on' : ''}"><span>${esc(it.label)}</span>${it.detail ? `<small>${esc(it.detail)}</small>` : ''}</div>`).join('');
      const on = this.pop.children[this.sel];
      if (on) on.scrollIntoView({ block: 'nearest' });
    }

    _closePop() { this.pop.hidden = true; this.items = []; }

    _accept(i) {
      const it = this.items[i];
      if (!it) return;
      const off = this.ta.selectionStart;
      const text = it.insert || it.label;
      this.replaceRange(off - this.word.length, off, text, {});
      this._closePop();
      if (text.endsWith('=') || text.endsWith('.')) this._suggest(true);
    }

    get popOpen() { return !this.pop.hidden && this.items.length > 0; }

    get value() { return this.ta.value; }

    setValue(v, fresh) {
      this.ta.value = v;
      this.ta.setSelectionRange(0, 0);
      if (fresh) this.hist.reset(this._snap());
      else this.hist.push(this._snap(), null);
      this.ta.scrollTop = 0;
      this._render();
      this._emit();
    }

    _snap() { return { v: this.ta.value, s: this.ta.selectionStart, e: this.ta.selectionEnd }; }

    _restore(s) {
      if (!s) return;
      this.ta.value = s.v;
      this.ta.setSelectionRange(s.s, s.e);
      this._render();
      this._emit();
    }

    _changed(key) {
      this.hist.push(this._snap(), key);
      this._render();
      this._emit();
    }

    _emit() {
      if (this.opts.onChange) this.opts.onChange(this.ta.value);
      this._caret(true);
    }

    replaceRange(start, end, text, o) {
      o = o || {};
      const ta = this.ta;
      ta.setRangeText(text, start, end, 'end');
      if (o.select) ta.setSelectionRange(o.select[0], o.select[1]);
      this._changed(o.key || null);
    }

    lineStart(line) {
      const v = this.ta.value;
      let off = 0;
      for (let i = 0; i < line; i++) { const n = v.indexOf('\n', off); if (n < 0) return v.length; off = n + 1; }
      return off;
    }

    caret() {
      const v = this.ta.value, off = this.ta.selectionStart;
      const before = v.lastIndexOf('\n', off - 1);
      let line = 0;
      for (let i = v.indexOf('\n'); i >= 0 && i < off; i = v.indexOf('\n', i + 1)) line++;
      return { line, col: off - (before + 1), offset: off };
    }

    goto(line, col) {
      const off = this.lineStart(line) + (col || 0);
      this.ta.focus();
      this.ta.setSelectionRange(off, off);
      const cs = getComputedStyle(this.ta);
      const lh = parseFloat(cs.lineHeight) || 20;
      const top = line * lh, view = this.ta.clientHeight;
      if (top < this.ta.scrollTop || top > this.ta.scrollTop + view - lh * 2) this.ta.scrollTop = Math.max(0, top - view / 3);
      const ctx = (Editor._measure = Editor._measure || document.createElement('canvas').getContext('2d'));
      ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
      const left = (col || 0) * ctx.measureText('0').width, wide = this.ta.clientWidth - 40;
      if (left < this.ta.scrollLeft || left > this.ta.scrollLeft + wide) this.ta.scrollLeft = Math.max(0, left - wide / 2);
      this._caret(true);
    }

    setErrors(errors) {
      this.errors = errors;
      this._render();
    }

    _caret(force) {
      const c = this.caret();
      if (!force && c.line === this._lastLine && c.col === this._lastCol) return;
      this._lastLine = c.line; this._lastCol = c.col;
      if (c.line !== this.curLine) {
        const prev = this.hl.children[this.curLine], next = this.hl.children[c.line];
        if (prev) prev.classList.remove('cur');
        if (next) next.classList.add('cur');
        const gp = this.gutter.children[this.curLine], gn = this.gutter.children[c.line];
        if (gp) gp.classList.remove('cur');
        if (gn) gn.classList.add('cur');
        this.curLine = c.line;
      }
      if (this.opts.onCaret) this.opts.onCaret(c);
    }

    _render() {
      const lines = this.ta.value.split('\n');
      const byLine = new Map();
      for (const e of this.errors) {
        const cur = byLine.get(e.line);
        if (!cur || (cur.level === 'warn' && e.level === 'error')) byLine.set(e.line, e);
      }
      const msgs = new Map();
      for (const e of this.errors) msgs.set(e.line, (msgs.get(e.line) ? msgs.get(e.line) + '\n' : '') + e.msg);
      const cur = this.caret().line;
      let hl = '', gut = '';
      lines.forEach((t, i) => {
        const e = byLine.get(i);
        const cls = (e ? ' ' + e.level : '') + (i === cur ? ' cur' : '');
        hl += `<div class="l${cls}">${highlightLine(t) || ' '}</div>`;
        gut += `<div class="g${cls}"${e ? ` title="${esc(msgs.get(i))}"` : ''}>${i + 1}</div>`;
      });
      this.hl.innerHTML = hl;
      this.gutter.innerHTML = gut;
      this.curLine = cur;
      this._sync();
    }

    _sync() {
      const x = this.ta.scrollLeft, y = this.ta.scrollTop;
      this.hl.style.transform = `translate(${-x}px, ${-y}px)`;
      this.gutter.style.transform = `translateY(${-y}px)`;
    }

    _key(e) {
      const ta = this.ta, mod = e.ctrlKey || e.metaKey;
      if (this.popOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          this.sel = (this.sel + (e.key === 'ArrowDown' ? 1 : -1) + this.items.length) % this.items.length;
          this._renderPop();
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); this._accept(this.sel); return; }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this._closePop(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') this._closePop();
      }
      if (mod && e.code === 'Space') { e.preventDefault(); this._suggest(true); return; }
      if (mod && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        this._restore(e.shiftKey ? this.hist.redo() : this.hist.undo());
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); this._restore(this.hist.redo()); return; }
      if (e.key === 'Tab' && !mod) {
        e.preventDefault();
        if (e.shiftKey) return;
        ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end');
        this._changed('type');
        return;
      }
      if (mod && e.key === '/') { e.preventDefault(); this._toggleComment(); return; }
      if (mod && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); this._duplicate(); return; }
      requestAnimationFrame(() => this._caret());
    }

    _lineRange() {
      const v = this.ta.value, s = this.ta.selectionStart, e = this.ta.selectionEnd;
      const a = v.lastIndexOf('\n', s - 1) + 1;
      let b = v.indexOf('\n', e > s && v[e - 1] === '\n' ? e - 1 : e);
      if (b < 0) b = v.length;
      return [a, b];
    }

    _toggleComment() {
      const [a, b] = this._lineRange();
      const block = this.ta.value.slice(a, b).split('\n');
      const all = block.filter((l) => l.trim()).every((l) => /^\s*#/.test(l));
      const out = block.map((l) => (!l.trim() ? l : all ? l.replace(/^(\s*)# ?/, '$1') : '# ' + l)).join('\n');
      this.ta.setRangeText(out, a, b, 'select');
      this._changed(null);
    }

    _duplicate() {
      const [a, b] = this._lineRange();
      const text = this.ta.value.slice(a, b);
      const s = this.ta.selectionStart - a, e = this.ta.selectionEnd - a;
      this.ta.setRangeText(text + '\n' + text, a, b, 'end');
      this.ta.setSelectionRange(b + 1 + s, b + 1 + e);
      this._changed(null);
    }
  }

  W.Editor = Editor;
})(window.Weasel = window.Weasel || {});
