/* Weasel — editor de código: textarea transparente sobre um <pre> colorido, com números de linha e histórico próprio. */
(function (W) {
  'use strict';
  const L = W.lang;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const FLAG_WORDS = new Set(['guide', 'hidden', 'once', 'loop', 'game', 'flat']);

  function valueClass(v) {
    if (L.HEX.test(v)) return 'col';
    if (v.split(',').every((p) => L.NUM.test(p))) return 'num';
    return 'val';
  }

  function highlightLine(text) {
    const sp = L.splitLine(text);
    const spans = [];
    sp.words.forEach((w, i) => {
      if (i === 0) { const g = L.KEYWORDS[w.text]; spans.push([w.from, w.to, g ? 'kw-' + g : 'bad']); return; }
      const eq = w.text.indexOf('=');
      if (eq > 0) {
        const v = w.text.slice(eq + 1);
        spans.push([w.from, w.from + eq, 'attr'], [w.from + eq, w.from + eq + 1, 'op']);
        if (v) spans.push([w.from + eq + 1, w.to, valueClass(v), L.HEX.test(v) ? v : null]);
      } else if (w.text.split(',').every((p) => L.NUM.test(p))) spans.push([w.from, w.to, 'num']);
      else if (FLAG_WORDS.has(w.text)) spans.push([w.from, w.to, 'flag']);
      else spans.push([w.from, w.to, i === 1 ? 'name' : 'val']);
    });
    if (sp.colon >= 0) spans.push([sp.colon, sp.colon + 1, 'op']);
    for (const p of sp.points) {
      if (p.text.endsWith('!')) spans.push([p.from, p.to - 1, 'pt'], [p.to - 1, p.to, 'corner']);
      else spans.push([p.from, p.to, 'pt']);
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
      ta.addEventListener('input', () => this._changed('type'));
      ta.addEventListener('scroll', () => this._sync());
      ta.addEventListener('keydown', (e) => this._key(e));
      for (const ev of ['keyup', 'mouseup', 'focus', 'select']) ta.addEventListener(ev, () => this._caret());
      ta.addEventListener('mousedown', () => requestAnimationFrame(() => this._caret()));
      document.addEventListener('selectionchange', () => { if (document.activeElement === ta) this._caret(); });
    }

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
