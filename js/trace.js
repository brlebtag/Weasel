/* Weasel — Traçado de imagem (etapa 1 do plano docs/planos/tracado-de-imagem.md). Uma imagem de vector art (pixels
   RGBA) vira um desenho .weasel o mais fiel possível. É o porte do protótipo em Python (.claude/vetorizar/
   vetorizar.py, medido em 12 imagens: ΔE médio 1,67); as contas são as mesmas, passo a passo.
   - Regiões: k-means (Lab + alfa) sobre os pixels chapados, cada pixel para a cor mais perto, regiões ligadas;
     vizinhas parecidas se juntam, as faixas de serrilhado entre duas cores se desfazem nelas, as pequenas e
     fracas vão para a vizinha mais parecida, as com sombreado se dividem em duas.
   - Degradês: vizinhas com borda macia se juntam enquanto uma rampa linear explica as duas; uma região que muda
     de cor sai com `gradient linear` (paradas = a média de cada faixa ao longo da mudança).
   - Ordem: as semitransparentes primeiro, depois da maior para a menor (caixa em volta). Cada região continua uns
     px por baixo das que vêm depois: cada borda é traçada uma vez, pela de cima, sem fresta.
   - Bordas: num pixel de borda, a parte da cor da região sai de desmisturar as duas cores (ou do alfa, contra o
     fundo); o contorno passa onde ela vale 0,5. Pontos: os menos possíveis cuja curva lisa do Weasel (a conta
     do geom.smoothSegs) fica a até `tol` px da borda.
   Sem DOM: recebe { width, height, data } (o ImageData de um canvas) e devolve as linhas do desenho. */
(function (W) {
  'use strict';

  // Os padrões medidos no protótipo (varredura nas 12 imagens). Só colors, tol e blur saem na linha de comando.
  const DEFAULTS = {
    colors: 48,       // cores do k-means na parte opaca
    softColors: 10,   // ... e na semitransparente
    alphaW: 60,       // peso do alfa junto do Lab
    merge: 3,         // vizinhas mais perto que isso (ΔE) se juntam
    minArea: 5,
    mass: 300,        // regiões pequenas com pixels × ΔE abaixo disso se juntam à mais parecida
    grad: 2,          // RMS (ΔE) que uma rampa linear pode deixar para juntar duas regiões (0: sem degradês)
    jump: 1.5,        // salto médio de cor numa borda que é sempre macia
    softRatio: 0.35,  // ... ou um salto abaixo dessa parte da diferença das duas cores
    gradGain: 1,      // RMS que um degradê precisa economizar sobre a cor chapada
    split: 4,         // divide regiões com RMS acima disso (0: não divide)
    splitGain: 4,     // ΔE² por pixel que a divisão precisa economizar
    tol: 0.5,         // quanto a curva pode se afastar da borda (px)
    loose: 1.5,       // ... onde a borda fica escondida embaixo de outra região
    start: 1.5,       // Douglas-Peucker dos primeiros pontos
    ext: 3,           // quantos px cada região continua por baixo das de depois
    blur: 0,          // layer ... blur= no desenho todo
  };

  // ---------------------------------------------------------------- cor
  const LIN = new Float64Array(256);
  for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const fl = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  // Lab (D65) de um RGB linear, em out[o..o+2]
  function labLin(R, G, B, out, o) {
    const x = fl((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047);
    const y = fl(0.2126729 * R + 0.7151522 * G + 0.0721750 * B);
    const z = fl((0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / 1.08883);
    out[o] = 116 * y - 16; out[o + 1] = 500 * (x - y); out[o + 2] = 200 * (y - z);
  }
  const clip255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  function labOf(r, g, b, out, o) { labLin(lin(clip255(r)), lin(clip255(g)), lin(clip255(b)), out, o); }

  // arredonda como o numpy (metade para o par)
  function rint(v) { const r = Math.round(v); return r - v === 0.5 && r % 2 !== 0 ? r - 1 : r; }

  // ---------------------------------------------------------------- sorteio com semente (o k-means sai sempre igual)
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- k-means (D = 4: Lab + alfa)
  const D = 4;
  // X: Float64Array de n×4. Aprende numa amostra de até 50 mil pontos; devolve os centros (k×4).
  function kmeans(X, n, k, iters, seed) {
    const r = rng(seed === undefined ? 3 : seed);
    const m = Math.min(n, 50000);
    const S = new Float64Array(m * D);
    if (m < n) {
      const idx = new Int32Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      for (let i = 0; i < m; i++) {
        const j = i + Math.floor(r() * (n - i));
        const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
        for (let c = 0; c < D; c++) S[i * D + c] = X[idx[i] * D + c];
      }
    } else S.set(X.subarray(0, n * D));
    k = Math.min(k, m);
    const C = new Float64Array(k * D);
    // k-means++
    const first = Math.floor(r() * m);
    for (let c = 0; c < D; c++) C[c] = S[first * D + c];
    const d = new Float64Array(m);
    const dist = (i, ci) => { let s = 0; for (let c = 0; c < D; c++) { const v = S[i * D + c] - C[ci * D + c]; s += v * v; } return s; };
    for (let i = 0; i < m; i++) d[i] = dist(i, 0);
    for (let ci = 1; ci < k; ci++) {
      let sum = 0;
      for (let i = 0; i < m; i++) sum += d[i];
      let pick;
      if (sum > 0) {
        const target = r() * sum;
        let acc = 0;
        pick = m - 1;
        for (let i = 0; i < m; i++) { acc += d[i]; if (acc > target && d[i] > 0) { pick = i; break; } }
      } else pick = Math.floor(r() * m);
      for (let c = 0; c < D; c++) C[ci * D + c] = S[pick * D + c];
      for (let i = 0; i < m; i++) { const v = dist(i, ci); if (v < d[i]) d[i] = v; }
    }
    // Lloyd
    const lab = new Int32Array(m), sums = new Float64Array(k * D), cnt = new Float64Array(k);
    for (let it = 0; it < iters; it++) {
      nearestInto(S, m, C, k, lab);
      sums.fill(0); cnt.fill(0);
      for (let i = 0; i < m; i++) { const l = lab[i]; cnt[l]++; for (let c = 0; c < D; c++) sums[l * D + c] += S[i * D + c]; }
      for (let l = 0; l < k; l++) if (cnt[l] > 0) for (let c = 0; c < D; c++) C[l * D + c] = sums[l * D + c] / cnt[l];
    }
    return { C, k };
  }

  // o centro mais perto de cada ponto (o primeiro, num empate)
  function nearestInto(X, n, C, k, out) {
    for (let i = 0; i < n; i++) {
      const o = i * D, x0 = X[o], x1 = X[o + 1], x2 = X[o + 2], x3 = X[o + 3];
      let best = 0, bd = Infinity;
      for (let l = 0; l < k; l++) {
        const q = l * D, a = x0 - C[q], b = x1 - C[q + 1], c = x2 - C[q + 2], e = x3 - C[q + 3];
        const s = a * a + b * b + c * c + e * e;
        if (s < bd) { bd = s; best = l; }
      }
      out[i] = best;
    }
    return out;
  }

  // ---------------------------------------------------------------- máscaras
  // dilata uma máscara (Uint8Array w×h) num quadrado de lado 2r+1 (o near() do protótipo)
  function near(m, w, h, r) {
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let last = -Infinity;
      // passada horizontal: distância ao último 1 à esquerda e ao próximo à direita
      for (let x = 0; x < w; x++) { if (m[row + x]) last = x; if (x - last <= r) t[row + x] = 1; }
      last = Infinity;
      for (let x = w - 1; x >= 0; x--) { if (m[row + x]) last = x; if (last - x <= r) t[row + x] = 1; }
    }
    for (let x = 0; x < w; x++) {
      let last = -Infinity;
      for (let y = 0; y < h; y++) { if (t[y * w + x]) last = y; if (y - last <= r) o[y * w + x] = 1; }
      last = Infinity;
      for (let y = h - 1; y >= 0; y--) { if (t[y * w + x]) last = y; if (last - y <= r) o[y * w + x] = 1; }
    }
    return o;
  }

  // ---------------------------------------------------------------- regiões ligadas (vizinhança de 4)
  function find(p, i) { while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; }

  // Regiões de cls igual dentro de valid -> rótulos 0..n-1 na ordem em que aparecem (-1 fora).
  function labelCC(cls, valid, w, h) {
    const N = w * h, par = new Int32Array(N), L = new Int32Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!valid[p]) { par[p] = -1; continue; }
      par[p] = p;
      const c = cls[p];
      if (x > 0 && valid[p - 1] && cls[p - 1] === c) { const a = find(par, p - 1), b = find(par, p); if (a !== b) { if (a < b) par[b] = a; else par[a] = b; } }
      if (y > 0 && valid[p - w] && cls[p - w] === c) { const a = find(par, p - w), b = find(par, p); if (a !== b) { if (a < b) par[b] = a; else par[a] = b; } }
    }
    const id = new Int32Array(N).fill(-1);
    let n = 0;
    for (let p = 0; p < N; p++) {
      if (par[p] < 0) { L[p] = -1; continue; }
      const r = find(par, p);
      if (id[r] < 0) id[r] = n++;
      L[p] = id[r];
    }
    return { L, n };
  }

  // Componentes de um grafo de n nós com as arestas u-v -> rótulo por nó (pela ordem do menor nó), m.
  function unionEdges(n, u, v, cnt) {
    const par = new Int32Array(n);
    for (let i = 0; i < n; i++) par[i] = i;
    for (let e = 0; e < cnt; e++) {
      const a = find(par, u[e]), b = find(par, v[e]);
      if (a !== b) { if (a < b) par[b] = a; else par[a] = b; }
    }
    const lab = new Int32Array(n);
    let m = 0;
    for (let i = 0; i < n; i++) { const r = find(par, i); lab[i] = r === i ? m++ : lab[r]; }
    return { root: lab, n: m };
  }

  function relabel(L, root) {
    const out = new Int32Array(L.length);
    for (let p = 0; p < L.length; p++) out[p] = L[p] >= 0 ? root[L[p]] : -1;
    return out;
  }

  function compact(L) {
    let mx = -1;
    for (let p = 0; p < L.length; p++) if (L[p] > mx) mx = L[p];
    const used = new Uint8Array(mx + 1);
    for (let p = 0; p < L.length; p++) if (L[p] >= 0) used[L[p]] = 1;
    const map = new Int32Array(mx + 1);
    let n = 0;
    for (let i = 0; i <= mx; i++) map[i] = used[i] ? n++ : -1;
    return { L: relabel(L, map), n };
  }

  // Pares de rótulos diferentes que se tocam (a < b, ordenados), quantas vezes, e (com F) o salto médio de cor.
  function pairs(L, w, h, n, F) {
    const keys = [];
    const jumpOf = F ? new Map() : null;
    const visit = (p, q) => {
      const a = L[p], b = L[q];
      if (a === b || a < 0 || b < 0) return;
      const key = a < b ? a * n + b : b * n + a;
      keys.push(key);
      if (F) {
        let s = 0;
        for (let c = 0; c < D; c++) { const v = F[p * D + c] - F[q * D + c]; s += v * v; }
        jumpOf.set(key, (jumpOf.get(key) || 0) + Math.sqrt(s));
      }
    };
    for (let y = 0; y < h; y++) for (let x = 0; x + 1 < w; x++) visit(y * w + x, y * w + x + 1);
    for (let y = 0; y + 1 < h; y++) for (let x = 0; x < w; x++) visit(y * w + x, y * w + x + w);
    const k = Float64Array.from(keys).sort();
    const A = [], B = [], C = [], J = [];
    for (let i = 0; i < k.length;) {
      let j = i + 1;
      while (j < k.length && k[j] === k[i]) j++;
      const a = Math.floor(k[i] / n), b = k[i] - a * n;
      A.push(a); B.push(b); C.push(j - i);
      if (F) J.push(jumpOf.get(k[i]) / (j - i));
      i = j;
    }
    return { a: Int32Array.from(A), b: Int32Array.from(B), c: Float64Array.from(C), j: F ? Float64Array.from(J) : null, len: A.length };
  }

  function regionStats(L, n, F) {
    const cnt = new Float64Array(n), mean = new Float64Array(n * D);
    for (let p = 0; p < L.length; p++) {
      const l = L[p];
      if (l < 0) continue;
      cnt[l]++;
      for (let c = 0; c < D; c++) mean[l * D + c] += F[p * D + c];
    }
    for (let l = 0; l < n; l++) { const m = Math.max(cnt[l], 1); for (let c = 0; c < D; c++) mean[l * D + c] /= m; }
    return { cnt, mean };
  }

  const dist4 = (M, a, b) => { let s = 0; for (let c = 0; c < D; c++) { const v = M[a * D + c] - M[b * D + c]; s += v * v; } return Math.sqrt(s); };

  // Para cada nó, a vizinha com o menor d entre as arestas ok (ou -1); num empate, a primeira.
  function bestPartner(n, P, d, ok) {
    const best = new Int32Array(n).fill(-1), bd = new Float64Array(n).fill(Infinity);
    for (let e = 0; e < P.len; e++) if (ok(e) && d[e] < bd[P.a[e]]) { bd[P.a[e]] = d[e]; best[P.a[e]] = P.b[e]; }
    for (let e = 0; e < P.len; e++) if (ok(e) && d[e] < bd[P.b[e]]) { bd[P.b[e]] = d[e]; best[P.b[e]] = P.a[e]; }
    return best;
  }

  function edgeDist(P, mean) {
    const d = new Float64Array(P.len);
    for (let e = 0; e < P.len; e++) d[e] = dist4(mean, P.a[e], P.b[e]);
    return d;
  }

  function mergeInto(L, n, best) {
    const src = [], dst = [];
    for (let i = 0; i < n; i++) if (best[i] >= 0) { src.push(i); dst.push(best[i]); }
    if (!src.length) return null;
    const u = unionEdges(n, src, dst, src.length);
    return { L: relabel(L, u.root), n: u.n };
  }

  // Rodadas: cada região se junta à vizinha mais parecida se ficar a menos de mergeDe; depois as menores que minArea
  // se juntam à mais parecida; de novo as parecidas.
  function mergeRegions(L, n, F, w, h, mergeDe, minArea) {
    for (const phase of ['similar', 'small', 'similar']) {
      for (let round = 0; round < 60; round++) {
        const { cnt, mean } = regionStats(L, n, F);
        const P = pairs(L, w, h, n);
        if (!P.len) break;
        const d = edgeDist(P, mean);
        let best;
        if (phase === 'similar') best = bestPartner(n, P, d, (e) => d[e] < mergeDe);
        else {
          best = bestPartner(n, P, d, () => true);
          for (let i = 0; i < n; i++) if (cnt[i] >= minArea) best[i] = -1;
        }
        const r = mergeInto(L, n, best);
        if (!r) break;
        L = r.L; n = r.n;
      }
    }
    return { L, n };
  }

  // As listas de vizinhas de cada região, na ordem do número da vizinha: [vizinha, contagem].
  function neighborLists(n, P) {
    const nb = Array.from({ length: n }, () => []);
    for (let e = 0; e < P.len; e++) { nb[P.a[e]].push([P.b[e], P.c[e]]); nb[P.b[e]].push([P.a[e], P.c[e]]); }
    for (const l of nb) l.sort((x, y) => x[0] - y[0]);
    return nb;
  }

  // Uma região fina cuja cor é a mistura de duas vizinhas é o serrilhado entre elas: cada pixel vai para a mais perto.
  function dissolveMixes(L, n, F, w, h) {
    const resid = 5;
    for (let round = 0; round < 2; round++) {
      const { cnt, mean } = regionStats(L, n, F);
      const P = pairs(L, w, h, n);
      const per = new Float64Array(n);
      for (let e = 0; e < P.len; e++) { per[P.a[e]] += P.c[e]; per[P.b[e]] += P.c[e]; }
      const nb = neighborLists(n, P);
      const pa = new Int32Array(n).fill(-1), pb = new Int32Array(n).fill(-1);
      const dd4 = new Float64Array(D);
      for (let r = 0; r < n; r++) {
        if (!(cnt[r] > 0) || !(cnt[r] / Math.max(per[r], 1) < 1.6 || cnt[r] < 40)) continue;
        const ns = nb[r].slice().sort((x, y) => y[1] - x[1]).slice(0, 6).map((v) => v[0]);
        let best = resid;
        for (let x = 0; x < ns.length; x++) for (let y = x + 1; y < ns.length; y++) {
          const A = ns[x] * D, B = ns[y] * D;
          let dd = 0;
          for (let c = 0; c < D; c++) { dd4[c] = mean[B + c] - mean[A + c]; dd += dd4[c] * dd4[c]; }
          if (dd < 9) continue;
          let t = 0;
          for (let c = 0; c < D; c++) t += (mean[r * D + c] - mean[A + c]) * dd4[c];
          t /= dd;
          if (!(t > 0.04 && t < 0.96)) continue;
          let e = 0;
          for (let c = 0; c < D; c++) { const v = mean[r * D + c] - mean[A + c] - t * dd4[c]; e += v * v; }
          e = Math.sqrt(e);
          if (e < best) { best = e; pa[r] = ns[x]; pb[r] = ns[y]; }
        }
      }
      const mixed = new Uint8Array(n);
      for (let r = 0; r < n; r++) if (pa[r] >= 0) mixed[r] = 1;
      const m0 = [];
      for (let r = 0; r < n; r++) if (mixed[r]) m0.push(r);
      for (const r of m0) mixed[pa[r]] = 0;
      const m1 = [];
      for (let r = 0; r < n; r++) if (mixed[r] && pb[r] >= 0) m1.push(r);
      for (const r of m1) mixed[pb[r]] = 0;
      let any = false;
      for (let r = 0; r < n; r++) if (mixed[r]) { any = true; break; }
      if (!any) break;
      const L2 = L.slice();
      for (let p = 0; p < L.length; p++) {
        const r = L[p];
        if (r < 0 || !mixed[r]) continue;
        let dA = 0, dB = 0;
        for (let c = 0; c < D; c++) {
          const f = F[p * D + c], u = f - mean[pa[r] * D + c], v = f - mean[pb[r] * D + c];
          dA += u * u; dB += v * v;
        }
        L2[p] = dA <= dB ? pa[r] : pb[r];
      }
      L = L2;
    }
    return L;
  }

  // Regiões pequenas cujo erro, pintadas como a vizinha mais parecida, é pequeno (pixels × ΔE < mass) se juntam a ela.
  function dropFaint(L, n, F, w, h, mass) {
    const maxCnt = 80;
    for (let round = 0; round < 10; round++) {
      const { cnt, mean } = regionStats(L, n, F);
      const P = pairs(L, w, h, n);
      if (!P.len) break;
      const d = edgeDist(P, mean);
      const best = bestPartner(n, P, d, () => true);
      const go = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        if (best[i] < 0 || !(cnt[i] > 0) || !(cnt[i] < maxCnt)) continue;
        if (cnt[i] * dist4(mean, i, best[i]) < mass) go[i] = 1;
      }
      const target = new Uint8Array(n);
      for (let i = 0; i < n; i++) if (go[i]) target[best[i]] = 1;
      for (let i = 0; i < n; i++) if (go[i] && target[i] && !(cnt[i] < 3)) go[i] = 0;
      const b2 = new Int32Array(n).fill(-1);
      for (let i = 0; i < n; i++) if (go[i]) b2[i] = best[i];
      const r = mergeInto(L, n, b2);
      if (!r) break;
      L = r.L; n = r.n;
    }
    return { L, n };
  }

  // Os pixels de cada região, em ordem de varredura: idx (posições) e start[i]..start[i+1].
  function byRegion(L, n, mask) {
    const start = new Int32Array(n + 1);
    for (let p = 0; p < L.length; p++) if (L[p] >= 0 && (!mask || mask[p])) start[L[p] + 1]++;
    for (let i = 0; i < n; i++) start[i + 1] += start[i];
    const fill = start.slice(0, n), idx = new Int32Array(start[n]);
    for (let p = 0; p < L.length; p++) if (L[p] >= 0 && (!mask || mask[p])) idx[fill[L[p]]++] = p;
    return { idx, start };
  }

  // Regiões que ainda variam muito (RMS > rmsMin) se dividem em duas (2-means), se isso economizar gainMin.
  function splitRegions(L, n, F, w, h, o) {
    for (let round = 0; round < 4; round++) {
      const { cnt, mean } = regionStats(L, n, F);
      const sse = new Float64Array(n);
      for (let p = 0; p < L.length; p++) {
        const l = L[p];
        if (l < 0) continue;
        for (let c = 0; c < D; c++) { const v = F[p * D + c] - mean[l * D + c]; sse[l] += v * v; }
      }
      const cand = [];
      for (let i = 0; i < n; i++) if (Math.sqrt(sse[i] / Math.max(cnt[i], 1)) > o.split && cnt[i] >= 150) cand.push(i);
      if (!cand.length) break;
      const { idx, start } = byRegion(L, n);
      L = L.slice();
      let nxt = n, changed = false;
      for (const i of cand) {
        const s0 = start[i], m = start[i + 1] - s0;
        const X = new Float64Array(m * D);
        for (let q = 0; q < m; q++) for (let c = 0; c < D; c++) X[q * D + c] = F[idx[s0 + q] * D + c];
        const km = kmeans(X, m, 2, 10);
        const lab = nearestInto(X, m, km.C, km.k, new Int32Array(m));
        const sum = new Float64Array(2 * D), cn = new Float64Array(2);
        for (let q = 0; q < m; q++) { cn[lab[q]]++; for (let c = 0; c < D; c++) sum[lab[q] * D + c] += X[q * D + c]; }
        if (!cn[0] || !cn[1]) continue;
        let sse2 = 0;
        for (let q = 0; q < m; q++) for (let c = 0; c < D; c++) { const v = X[q * D + c] - sum[lab[q] * D + c] / cn[lab[q]]; sse2 += v * v; }
        if ((sse[i] - sse2) / cnt[i] < o.splitGain) continue;
        for (let q = 0; q < m; q++) if (lab[q] === 1) L[idx[s0 + q]] = nxt;
        nxt++;
        changed = true;
      }
      if (!changed) break;
      // as metades podem sair em pedaços: cada pedaço uma região, os farelos de volta para uma vizinha
      const valid = new Uint8Array(L.length);
      for (let p = 0; p < L.length; p++) valid[p] = L[p] >= 0 ? 1 : 0;
      ({ L, n } = labelCC(L, valid, w, h));
      ({ L, n } = mergeRegions(L, n, F, w, h, 0, o.minArea));
      ({ L, n } = dropFaint(L, n, F, w, h, o.mass));
    }
    return { L, n };
  }

  // Pixels com as 4 vizinhas da mesma região (fora da borda).
  function innerMask(L, w, h) {
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x, l = L[p];
      if (l < 0) continue;
      if (y > 0 && L[p - w] !== l) continue;
      if (y + 1 < h && L[p + w] !== l) continue;
      if (x > 0 && L[p - 1] !== l) continue;
      if (x + 1 < w && L[p + 1] !== l) continue;
      m[p] = 1;
    }
    return m;
  }

  // ---------------------------------------------------------------- rampas lineares (mínimos quadrados)
  // Para cada região, as somas de cor = c0 + gx·x + gy·y nos pixels de mask: A (3×3 de [1,x,y]), B (3×4), S (|cor|²).
  function linStats(L, n, F, mask, w, h) {
    const A = new Float64Array(n * 9), B = new Float64Array(n * 12), S = new Float64Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x, l = L[p];
      if (l < 0 || !mask[p]) continue;
      const bs = [1, (x - w / 2) / 100, (y - h / 2) / 100];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) A[l * 9 + i * 3 + j] += bs[i] * bs[j];
        for (let c = 0; c < D; c++) B[l * 12 + i * 4 + c] += bs[i] * F[p * D + c];
      }
      let s = 0;
      for (let c = 0; c < D; c++) s += F[p * D + c] * F[p * D + c];
      S[l] += s;
    }
    return { A, B, S };
  }

  // Resolve (A + 1e-6·I)·th = B, A 3×3, B 3×4 (eliminação com pivô). null se for singular.
  function solve3(A, ao, B, bo) {
    const a = [A[ao] + 1e-6, A[ao + 1], A[ao + 2], A[ao + 3], A[ao + 4] + 1e-6, A[ao + 5], A[ao + 6], A[ao + 7], A[ao + 8] + 1e-6];
    const b = Array.from(B.subarray(bo, bo + 12));
    for (let c = 0; c < 3; c++) {
      let piv = c;
      for (let r = c + 1; r < 3; r++) if (Math.abs(a[r * 3 + c]) > Math.abs(a[piv * 3 + c])) piv = r;
      if (a[piv * 3 + c] === 0) return null;
      if (piv !== c) {
        for (let k = 0; k < 3; k++) { const t = a[c * 3 + k]; a[c * 3 + k] = a[piv * 3 + k]; a[piv * 3 + k] = t; }
        for (let k = 0; k < 4; k++) { const t = b[c * 4 + k]; b[c * 4 + k] = b[piv * 4 + k]; b[piv * 4 + k] = t; }
      }
      for (let r = c + 1; r < 3; r++) {
        const f = a[r * 3 + c] / a[c * 3 + c];
        for (let k = c; k < 3; k++) a[r * 3 + k] -= f * a[c * 3 + k];
        for (let k = 0; k < 4; k++) b[r * 4 + k] -= f * b[c * 4 + k];
      }
    }
    const th = new Float64Array(12);
    for (let r = 2; r >= 0; r--) for (let k = 0; k < 4; k++) {
      let s = b[r * 4 + k];
      for (let j = r + 1; j < 3; j++) s -= a[r * 3 + j] * th[j * 4 + k];
      th[r * 4 + k] = s / a[r * 3 + r];
    }
    return th;
  }

  // fila de prioridade de [e, x, y] (o menor primeiro, como as tuplas do heapq)
  class Heap {
    constructor() { this.h = []; }
    static lt(p, q) { return p[0] < q[0] || (p[0] === q[0] && (p[1] < q[1] || (p[1] === q[1] && p[2] < q[2]))); }
    push(v) {
      const h = this.h;
      h.push(v);
      let i = h.length - 1;
      while (i > 0) { const j = (i - 1) >> 1; if (!Heap.lt(h[i], h[j])) break; [h[i], h[j]] = [h[j], h[i]]; i = j; }
    }
    pop() {
      const h = this.h, top = h[0], last = h.pop();
      if (h.length) {
        h[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let s = i;
          if (l < h.length && Heap.lt(h[l], h[s])) s = l;
          if (r < h.length && Heap.lt(h[r], h[s])) s = r;
          if (s === i) break;
          [h[i], h[s]] = [h[s], h[i]];
          i = s;
        }
      }
      return top;
    }
    get size() { return this.h.length; }
  }

  // Vizinhas com borda macia (salto médio de cor < jump) se juntam enquanto uma rampa linear explica as duas
  // (RMS < tau), a mais barata primeiro.
  function gradientMerge(L, n, F, w, h, o) {
    const tau = o.grad;
    const st = linStats(L, n, F, innerMask(L, w, h), w, h);
    const A = [], B = [], S = st.S.slice();
    for (let i = 0; i < n; i++) { A.push(st.A.slice(i * 9, i * 9 + 9)); B.push(st.B.slice(i * 12, i * 12 + 12)); }
    const P = pairs(L, w, h, n, F);
    const nb = Array.from({ length: n }, () => new Map());
    for (let e = 0; e < P.len; e++) { const v = [P.c[e], P.c[e] * P.j[e]]; nb[P.a[e]].set(P.b[e], v); nb[P.b[e]].set(P.a[e], v); }
    const alive = new Uint8Array(n).fill(1), parent = new Int32Array(n);
    for (let i = 0; i < n; i++) parent[i] = i;
    const AB = new Float64Array(9), BB = new Float64Array(12);

    // a pior das duas partes (RMS) sob a rampa das duas juntas (Infinity se a borda não é macia)
    function cost(x, y) {
      const na = A[x][0], nbb = A[y][0];
      if (na < 4 || nbb < 4) return Infinity;
      const [z, zw] = nb[x].get(y);
      let d = 0;
      for (let c = 0; c < D; c++) { const v = B[x][c] / na - B[y][c] / nbb; d += v * v; }
      d = Math.sqrt(d);
      if (zw / z > Math.max(o.jump, o.softRatio * d)) return Infinity;
      for (let k = 0; k < 9; k++) AB[k] = A[x][k] + A[y][k];
      for (let k = 0; k < 12; k++) BB[k] = B[x][k] + B[y][k];
      const th = solve3(AB, 0, BB, 0);
      if (!th) return Infinity;
      let worst = 0;
      for (const p of [x, y]) {
        const Ap = A[p], Bp = B[p];
        let tb = 0, tat = 0;
        for (let k = 0; k < 12; k++) tb += th[k] * Bp[k];
        // sum(th * (A @ th))
        for (let i = 0; i < 3; i++) for (let c = 0; c < D; c++) {
          let v = 0;
          for (let j = 0; j < 3; j++) v += Ap[i * 3 + j] * th[j * 4 + c];
          tat += th[i * 4 + c] * v;
        }
        const sse = S[p] - 2 * tb + tat;
        worst = Math.max(worst, Math.sqrt(Math.max(sse, 0) / Ap[0]));
      }
      return worst;
    }

    const heap = new Heap();
    for (let e = 0; e < P.len; e++) { const c = cost(P.a[e], P.b[e]); if (c < tau) heap.push([c, P.a[e], P.b[e]]); }
    while (heap.size) {
      let [e, x, y] = heap.pop();
      if (!(alive[x] && alive[y]) || !nb[x].has(y)) continue;
      const e2 = cost(x, y);
      if (Math.abs(e2 - e) > 1e-9) { if (e2 < tau) heap.push([e2, x, y]); continue; }
      if (A[x][0] > A[y][0]) { const t = x; x = y; y = t; }
      // x entra em y
      for (let k = 0; k < 9; k++) A[y][k] += A[x][k];
      for (let k = 0; k < 12; k++) B[y][k] += B[x][k];
      S[y] += S[x];
      alive[x] = 0;
      parent[x] = y;
      for (const [k, v] of nb[x]) {
        if (k === y) continue;
        const has = nb[y].get(k);
        if (has) { has[0] += v[0]; has[1] += v[1]; nb[k].set(y, has); }
        else { const nv = [v[0], v[1]]; nb[y].set(k, nv); nb[k].set(y, nv); }
        nb[k].delete(x);
      }
      nb[y].delete(x);
      nb[x] = new Map();
      for (const k of nb[y].keys()) { const c = cost(y, k); if (c < tau) heap.push([c, Math.min(y, k), Math.max(y, k)]); }
    }
    const root = new Int32Array(n);
    for (let i = 0; i < n; i++) { let r = i; while (parent[r] !== r) r = parent[r]; root[i] = r; }
    return compact(relabel(L, root));
  }

  // ---------------------------------------------------------------- as cores de cada região
  function percentile(sorted, q) {
    const pos = (q / 100) * (sorted.length - 1), lo = Math.floor(pos), hi = Math.min(lo + 1, sorted.length - 1);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function interp(t, xp, fp) {
    const n = xp.length;
    if (t <= xp[0]) return fp[0];
    if (t >= xp[n - 1]) return fp[n - 1];
    let j = 0;
    while (j + 1 < n && xp[j + 1] <= t) j++;
    return fp[j] + (t - xp[j]) * (fp[j + 1] - fp[j]) / (xp[j + 1] - xp[j]);
  }

  // A cor de cada região: chapada (a média RGBA) ou um degradê linear ao longo da direção u, entre as projeções
  // lo e hi, com paradas em pos (0..1) e as cores cols (a média dos pixels de cada faixa).
  function makeModels(L, n, img, F, w, h, o) {
    const data = img.data;
    const inner = innerMask(L, w, h);
    const hasInner = new Uint8Array(n);
    for (let p = 0; p < L.length; p++) if (inner[p]) hasInner[L[p]] = 1;
    const use = new Uint8Array(L.length);
    for (let p = 0; p < L.length; p++) if (L[p] >= 0) use[p] = hasInner[L[p]] ? inner[p] : 1;
    const cnt = new Float64Array(n), flat = new Float64Array(n * 4);
    for (let p = 0; p < L.length; p++) {
      if (!use[p]) continue;
      const l = L[p];
      cnt[l]++;
      for (let c = 0; c < 4; c++) flat[l * 4 + c] += data[p * 4 + c];
    }
    for (let l = 0; l < n; l++) for (let c = 0; c < 4; c++) flat[l * 4 + c] /= Math.max(cnt[l], 1);
    const grad = new Uint8Array(n), spec = new Map();
    const models = { flat, grad, spec, color: null };
    models.color = (i, x, y, out) => {
      if (!grad[i]) { for (let c = 0; c < 4; c++) out[c] = flat[i * 4 + c]; return out; }
      const g = spec.get(i);
      let t = (x * g.u[0] + y * g.u[1] - g.lo) / (g.hi - g.lo);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      for (let c = 0; c < 4; c++) out[c] = interp(t, g.pos, g.cols[c]);
      return out;
    };
    if (o.grad <= 0) return models;
    const st = linStats(L, n, F, use, w, h);
    const { idx, start } = byRegion(L, n, use);
    const lab = new Float64Array(3);
    for (let i = 0; i < n; i++) {
      if (cnt[i] < 60) continue;
      const Ai = st.A.subarray(i * 9, i * 9 + 9), Bi = st.B.subarray(i * 12, i * 12 + 12), cn = Ai[0];
      if (cn < 4) continue;
      let mu2 = 0;
      for (let c = 0; c < D; c++) mu2 += (Bi[c] / cn) * (Bi[c] / cn);
      const flatRms = Math.sqrt(Math.max(st.S[i] - cn * mu2, 0) / cn);
      if (flatRms < o.gradGain) continue;
      const th = solve3(st.A, i * 9, st.B, i * 12);
      if (!th) continue;
      // G = as linhas x e y de th (só o Lab); u = o autovetor do maior autovalor de G·Gᵀ
      let p = 0, q = 0, r = 0;
      for (let c = 0; c < 3; c++) { const gx = th[4 + c], gy = th[8 + c]; p += gx * gx; q += gx * gy; r += gy * gy; }
      const lam = (p + r) / 2 + Math.sqrt(((p - r) / 2) ** 2 + q * q);
      let u = p >= r ? [lam - r, q] : [q, lam - p];
      const ul = Math.hypot(u[0], u[1]);
      u = ul > 1e-12 ? [u[0] / ul, u[1] / ul] : [1, 0];
      if (Math.abs(u[1]) > Math.abs(u[0]) ? u[1] < 0 : u[0] < 0) u = [-u[0], -u[1]];
      const s0 = start[i], m = start[i + 1] - s0;
      const s = new Float64Array(m);
      for (let k = 0; k < m; k++) { const pp = idx[s0 + k]; s[k] = (pp % w) * u[0] + Math.floor(pp / w) * u[1]; }
      const sorted = s.slice().sort();
      const lo = percentile(sorted, 0.5), hi = percentile(sorted, 99.5);
      if (hi - lo < 4) continue;
      const nb = Math.trunc(Math.min(Math.max((hi - lo) / 12, 2), 8));
      const t = new Float64Array(m), band = new Int32Array(m), bc = new Float64Array(nb);
      const cols = Array.from({ length: 4 }, () => new Float64Array(nb)), pos = new Float64Array(nb);
      for (let k = 0; k < m; k++) {
        let v = (s[k] - lo) / (hi - lo);
        v = v < 0 ? 0 : v > 1 ? 1 : v;
        t[k] = v;
        const b = Math.min(Math.floor(v * nb), nb - 1);
        band[k] = b;
        bc[b]++;
        pos[b] += v;
        for (let c = 0; c < 4; c++) cols[c][b] += data[idx[s0 + k] * 4 + c];
      }
      let empty = false;
      for (let b = 0; b < nb; b++) if (!bc[b]) empty = true;
      if (empty) continue;
      for (let b = 0; b < nb; b++) { pos[b] /= bc[b]; for (let c = 0; c < 4; c++) cols[c][b] /= bc[b]; }
      let sse = 0;
      for (let k = 0; k < m; k++) {
        const pr = [0, 0, 0, 0];
        for (let c = 0; c < 4; c++) pr[c] = interp(t[k], pos, cols[c]);
        labOf(pr[0], pr[1], pr[2], lab, 0);
        const fo = idx[s0 + k] * D;
        const e0 = lab[0] - F[fo], e1 = lab[1] - F[fo + 1], e2 = lab[2] - F[fo + 2], e3 = pr[3] / 255 * o.alphaW - F[fo + 3];
        sse += e0 * e0 + e1 * e1 + e2 * e2 + e3 * e3;
      }
      const rms = Math.sqrt(sse / m);
      if (flatRms - rms > o.gradGain) { grad[i] = 1; spec.set(i, { u, lo, hi, pos: Array.from(pos), cols: cols.map((a) => Array.from(a)) }); }
    }
    return models;
  }

  // ---------------------------------------------------------------- contornos e pontos
  // Douglas-Peucker numa linha aberta (xs, ys) -> os índices que ficam.
  function dp(xs, ys, n, tol) {
    const keep = new Uint8Array(n);
    keep[0] = keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      if (b <= a + 1) continue;
      const dx = xs[b] - xs[a], dy = ys[b] - ys[a], len = Math.hypot(dx, dy);
      let best = -1, bi = -1;
      for (let i = a + 1; i < b; i++) {
        const sx = xs[i] - xs[a], sy = ys[i] - ys[a];
        const d = len > 0 ? Math.abs(sx * dy - sy * dx) / len : Math.hypot(sx, sy);
        if (d > best) { best = d; bi = i; }
      }
      if (best > tol) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
    return out;
  }

  // Linhas fechadas de F (hp×wp) no nível t (marching squares; F baixo na borda): [{ x: [], y: [] }].
  function contours(F, wp, hp, t) {
    const E = 2 * wp * hp, a0 = new Int32Array(E).fill(-1), a1 = new Int32Array(E).fill(-1), order = [];
    const add = (p, q) => {
      if (a0[p] === -1) { a0[p] = q; order.push(p); } else a1[p] = q;
    };
    const link = (p, q) => { add(p, q); add(q, p); };
    for (let i = 0; i + 1 < hp; i++) for (let j = 0; j + 1 < wp; j++) {
      const o = i * wp + j;
      const tl = F[o] > t, tr = F[o + 1] > t, br = F[o + wp + 1] > t, bl = F[o + wp] > t;
      const cs = (tl ? 8 : 0) + (tr ? 4 : 0) + (br ? 2 : 0) + (bl ? 1 : 0);
      if (cs === 0 || cs === 15) continue;
      const T = o * 2, B = (o + wp) * 2, Lf = o * 2 + 1, R = (o + 1) * 2 + 1;
      switch (cs) {
        case 1: link(Lf, B); break;
        case 2: link(B, R); break;
        case 3: link(Lf, R); break;
        case 4: link(T, R); break;
        case 6: link(T, B); break;
        case 7: link(T, Lf); break;
        case 8: link(T, Lf); break;
        case 9: link(T, B); break;
        case 11: link(T, R); break;
        case 12: link(Lf, R); break;
        case 13: link(B, R); break;
        case 14: link(Lf, B); break;
        case 5: case 10: {
          const center = (F[o] + F[o + 1] + F[o + wp + 1] + F[o + wp]) / 4 > t;
          if ((cs === 5) === center) { link(T, Lf); link(B, R); } else { link(T, R); link(Lf, B); }
          break;
        }
      }
    }
    const seen = new Uint8Array(E), loops = [];
    for (const start of order) {
      if (seen[start]) continue;
      const loop = [start];
      let prev = -1, cur = start;
      seen[start] = 1;
      for (;;) {
        let nx = -1;
        if (a0[cur] !== -1 && a0[cur] !== prev) nx = a0[cur];
        else if (a1[cur] !== -1 && a1[cur] !== prev) nx = a1[cur];
        if (nx === -1 || nx === start) break;
        prev = cur; cur = nx;
        if (seen[cur]) break;
        seen[cur] = 1;
        loop.push(cur);
      }
      if (loop.length > 2) {
        const xs = new Float64Array(loop.length), ys = new Float64Array(loop.length);
        loop.forEach((e, k) => {
          const o = e >> 1, i = Math.floor(o / wp), j = o - i * wp;
          if (e & 1) { const a = F[o], c = F[o + wp]; xs[k] = j; ys[k] = i + (t - a) / (c - a); }
          else { const a = F[o], c = F[o + 1]; xs[k] = j + (t - a) / (c - a); ys[k] = i; }
        });
        loops.push({ x: xs, y: ys });
      }
    }
    return loops;
  }

  function polyArea(xs, ys) {
    const n = xs.length;
    let s = 0;
    for (let i = 0; i < n; i++) { const j = (i - 1 + n) % n; s += xs[i] * ys[j] - ys[i] * xs[j]; }
    return 0.5 * Math.abs(s);
  }

  // true se a linha cerca uma parte de F > t (borda de fora), false se cerca um buraco.
  function classify(xs, ys, F, w, h, t) {
    const n = xs.length;
    let sg = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; sg += xs[i] * ys[j] - xs[j] * ys[i]; }
    sg = Math.sign(sg);
    let inside = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, dx = xs[j] - xs[i], dy = ys[j] - ys[i];
      let nx = -dy * sg, ny = dx * sg;
      const l = Math.hypot(nx, ny) + 1e-9;
      nx /= l; ny /= l;
      const mx = (xs[i] + xs[j]) / 2 + 0.3 * nx, my = (ys[i] + ys[j]) / 2 + 0.3 * ny;
      const yi = Math.min(Math.max(rint(my), 0), h - 1), xi = Math.min(Math.max(rint(mx), 0), w - 1);
      if (F[yi * w + xi] > t) inside++;
    }
    return inside / n > 0.5;
  }

  // O giro (graus) em cada ponto de uma linha fechada densa, medido s px antes e depois: > 0 ponta, < 0 dente.
  function turns(xs, ys, s) {
    const n = xs.length, T = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; T[i + 1] = T[i] + Math.hypot(xs[j] - xs[i], ys[j] - ys[i]); }
    const total = T[n];
    const at = (u, out) => {
      u = ((u % total) + total) % total;
      let lo = 0, hi = n;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= u) lo = mid; else hi = mid; }
      const j = (lo + 1) % n, f = (u - T[lo]) / (T[lo + 1] - T[lo]);
      out[0] = xs[lo] + (xs[j] - xs[lo]) * f; out[1] = ys[lo] + (ys[j] - ys[lo]) * f;
    };
    const tr = new Float64Array(n), A = [0, 0], B = [0, 0];
    for (let i = 0; i < n; i++) {
      at(T[i] - s, A); at(T[i] + s, B);
      const ax = A[0] - xs[i], ay = A[1] - ys[i], bx = B[0] - xs[i], by = B[1] - ys[i];
      let cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) + 1e-9);
      cos = Math.min(Math.max(cos, -1), 1);
      const ang = 180 - Math.acos(cos) * 180 / Math.PI;
      tr[i] = ang * Math.sign(-ax * by + ay * bx);
    }
    return { tr, T };
  }

  function findCorners(xs, ys, s = 3, limit = 45) {
    const { tr, T } = turns(xs, ys, s), n = xs.length, total = T[n];
    const ord = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(tr[b]) - Math.abs(tr[a]));
    const picks = [];
    for (const i of ord) {
      if (Math.abs(tr[i]) < limit) break;
      if (picks.every((j) => { const d = Math.abs(T[i] - T[j]); return Math.min(d, total - d) > 2.2 * s; })) picks.push(i);
    }
    return picks.sort((a, b) => a - b);
  }

  const K_SMOOTH = 0.36;   // js/geom.js smoothSegs: alça = 0,36 × o trecho, na direção anterior→seguinte

  // Os menos pontos (guloso) cuja curva do Weasel fica a até tolp (por ponto denso) da linha densa.
  function fitLoop(xs, ys, tolp, o) {
    const N = xs.length;
    const corners = N >= 12 ? findCorners(xs, ys) : Array.from({ length: N }, (_, i) => i);
    const isCorner = new Uint8Array(N);
    for (const c of corners) isCorner[c] = 1;
    const key = new Uint8Array(N);
    for (const c of corners) key[c] = 1;
    const cx = Float64Array.from([...xs, xs[0]]), cy = Float64Array.from([...ys, ys[0]]);
    for (const i of dp(cx, cy, N + 1, o.start)) key[i % N] = 1;
    let nk = 0;
    for (let i = 0; i < N; i++) nk += key[i];
    if (nk < 3) { key[0] = 1; key[Math.floor(N / 3)] = 1; key[Math.floor(2 * N / 3)] = 1; }
    const NS = 16, sx = new Float64Array(NS), sy = new Float64Array(NS);
    for (let it = 0; it < 40; it++) {
      const K = [];
      for (let i = 0; i < N; i++) if (key[i]) K.push(i);
      const m = K.length;
      const dir = K.map((k, s) => {
        if (isCorner[k]) return null;
        const a = K[(s - 1 + m) % m], b = K[(s + 1) % m];
        const dx = xs[b] - xs[a], dy = ys[b] - ys[a], l = Math.hypot(dx, dy);
        return l > 1e-9 ? [dx / l, dy / l] : null;
      });
      const add = [];
      for (let s = 0; s < m; s++) {
        const a = K[s], b = K[(s + 1) % m];
        if ((b - a + N) % N <= 1) continue;          // nenhum ponto denso entre os dois
        const px = xs[a], py = ys[a], qx = xs[b], qy = ys[b], sl = Math.hypot(qx - px, qy - py);
        const d1 = dir[s], d2 = dir[(s + 1) % m];
        const c1x = d1 ? px + d1[0] * sl * K_SMOOTH : px + (qx - px) / 3, c1y = d1 ? py + d1[1] * sl * K_SMOOTH : py + (qy - py) / 3;
        const c2x = d2 ? qx - d2[0] * sl * K_SMOOTH : qx - (qx - px) / 3, c2y = d2 ? qy - d2[1] * sl * K_SMOOTH : qy - (qy - py) / 3;
        for (let k = 0; k < NS; k++) {
          const t = k / (NS - 1), u = 1 - t;
          sx[k] = u * u * u * px + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * qx;
          sy[k] = u * u * u * py + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * qy;
        }
        let worst = 0, wi = -1;
        for (let i = (a + 1) % N; i !== b; i = (i + 1) % N) {
          let best = Infinity;
          for (let k = 0; k + 1 < NS; k++) {
            const ax = sx[k], ay = sy[k], abx = sx[k + 1] - ax, aby = sy[k + 1] - ay;
            const l2 = Math.max(abx * abx + aby * aby, 1e-12);
            let tt = ((xs[i] - ax) * abx + (ys[i] - ay) * aby) / l2;
            tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
            const ex = xs[i] - (ax + tt * abx), ey = ys[i] - (ay + tt * aby), dd = ex * ex + ey * ey;
            if (dd < best) best = dd;
          }
          const ex = Math.sqrt(best) - tolp[i];
          if (wi < 0 || ex > worst) { worst = ex; wi = i; }
        }
        if (wi >= 0 && worst > 0) add.push(wi);
      }
      if (!add.length) break;
      for (const i of add) key[i] = 1;
    }
    const pts = [];
    for (let i = 0; i < N; i++) if (key[i]) pts.push([xs[i], ys[i], !!isCorner[i]]);
    return pts;
  }

  // Traça a região i: as formas de fora e os buracos, em unidades do desenho.
  function traceRegion(i, ctx, bb) {
    const { L, w: Wd, h: Hd, rank, img, models, o } = ctx;
    const data = img.data;
    const mg = o.ext + 3;
    const x0 = Math.max(0, bb[0] - mg), y0 = Math.max(0, bb[1] - mg), x1 = Math.min(Wd, bb[2] + mg), y1 = Math.min(Hd, bb[3] + mg);
    const w = x1 - x0, h = y1 - y0, N = w * h;
    const Lw = new Int32Array(N), own = new Uint8Array(N), later = new Uint8Array(N), barrier = new Uint8Array(N);
    const ri = rank[i];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x, l = L[(y0 + y) * Wd + x0 + x];
      Lw[p] = l;
      if (l === i) own[p] = 1;
      else if (l >= 0 && rank[l] > ri) later[p] = 1;
      else barrier[p] = 1;
    }
    const nearOwn = near(own, w, h, o.ext), E = new Uint8Array(N);
    for (let p = 0; p < N; p++) E[p] = own[p] || (later[p] && nearOwn[p]) ? 1 : 0;
    // buracos feitos só de regiões de depois são tapados (elas pintam por cima de qualquer jeito)
    const notE = new Uint8Array(N);
    for (let p = 0; p < N; p++) notE[p] = E[p] ? 0 : 1;
    const cc = labelCC(new Int32Array(N), notE, w, h);
    if (cc.n) {
      const keepOpen = new Uint8Array(cc.n);
      for (let p = 0; p < N; p++) if (cc.L[p] >= 0 && barrier[p]) keepOpen[cc.L[p]] = 1;
      const mark = (p) => { if (cc.L[p] >= 0) keepOpen[cc.L[p]] = 1; };
      for (let x = 0; x < w; x++) { mark(x); mark((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { mark(y * w); mark(y * w + w - 1); }
      for (let p = 0; p < N; p++) if (cc.L[p] >= 0 && !keepOpen[cc.L[p]]) E[p] = 1;
    }
    // o campo macio: 1 dentro, 0 fora; na borda com o fundo ou uma região de antes, a parte da cor desta região no
    // pixel (desmisturada), mantida do seu lado de 0,5 para a forma ser a dos rótulos
    const Fd = new Float64Array(N);
    for (let p = 0; p < N; p++) Fd[p] = E[p];
    const mi = [0, 0, 0, 0], mk = [0, 0, 0, 0];
    const share = (p, k) => {
      const gx = x0 + p % w, gy = y0 + Math.floor(p / w), g = gy * Wd + gx;
      models.color(i, gx, gy, mi);
      if (k < 0) {
        const ai = Math.min(Math.max(mi[3] / 255, 0.05), 1);
        return data[g * 4 + 3] / 255 / ai;
      }
      models.color(k, gx, gy, mk);
      let n2 = 0, dot = 0;
      for (let c = 0; c < 3; c++) { const d = mi[c] - mk[c]; n2 += d * d; dot += (data[g * 4 + c] - mk[c]) * d; }
      if (!(n2 > 225)) return null;
      const t = dot / Math.max(n2, 1e-9);
      return t < 0 ? 0 : t > 1 ? 1 : t;
    };
    for (const [dy, dx] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      for (let y = Math.max(0, -dy); y < h - Math.max(0, dy); y++) for (let x = Math.max(0, -dx); x < w - Math.max(0, dx); x++) {
        const p = y * w + x, q = p + dy * w + dx;
        if (E[p] && barrier[q]) {
          let t = share(p, Lw[q]);
          if (t === null) t = 1;
          Fd[p] = Math.min(Fd[p], Math.min(Math.max(t, 0.5001), 1));
        } else if (barrier[p] && E[q]) {
          let t = share(p, Lw[p]);
          if (t === null) t = 0;
          Fd[p] = Math.max(Fd[p], Math.min(Math.max(t, 0), 0.4999));
        }
      }
    }
    const nb2 = near(barrier, w, h, 2), no1 = near(own, w, h, 1);
    const wp = w + 2, hp = h + 2, Fp = new Float64Array(wp * hp);
    for (let y = 0; y < h; y++) Fp.set(Fd.subarray(y * w, y * w + w), (y + 1) * wp + 1);
    const shapes = [], holes = [];
    for (const lp of contours(Fp, wp, hp, 0.5)) {
      const n = lp.x.length;
      for (let k = 0; k < n; k++) { lp.x[k] -= 1; lp.y[k] -= 1; }
      const ar = polyArea(lp.x, lp.y);
      if (ar < 1.5) continue;
      const outer = classify(lp.x, lp.y, Fd, w, h, 0.5);
      const cx = Float64Array.from([...lp.x, lp.x[0]]), cy = Float64Array.from([...lp.y, lp.y[0]]);
      const keep = dp(cx, cy, n + 1, 0.05);
      keep.pop();
      if (keep.length < 3) continue;
      const xs = Float64Array.from(keep, (k) => cx[k]), ys = Float64Array.from(keep, (k) => cy[k]);
      const tolp = new Float64Array(keep.length);
      for (let k = 0; k < keep.length; k++) {
        const yi = Math.min(Math.max(rint(ys[k]), 0), h - 1), xi = Math.min(Math.max(rint(xs[k]), 0), w - 1), p = yi * w + xi;
        tolp[k] = !nb2[p] && !no1[p] ? Math.max(o.tol, o.loose) : o.tol;
      }
      const pts = fitLoop(xs, ys, tolp, o);
      if (pts.length < 3) continue;
      for (const pt of pts) { pt[0] += x0 + 0.5; pt[1] += y0 + 0.5; }
      (outer ? shapes : holes).push(pts);
    }
    return { shapes, holes };
  }

  // ---------------------------------------------------------------- saída
  const f2 = (v) => v.toFixed(2).replace(/\.00$/, '');
  const fmt = (pts) => pts.map((p) => `${f2(p[0])},${f2(p[1])}${p[2] ? '!' : ''}`).join(' ');
  const hex2 = (v) => rint(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  function hexa(r, g, b, a) { const al = rint(Math.min(255, Math.max(0, a))); return '#' + hex2(r) + hex2(g) + hex2(b) + (al >= 250 ? '' : hex2(a)); }

  // A imagem (pixels RGBA) vira o desenho: { width, height, palette: ['#rrggbb', ...], body: [linhas], stats }.
  // As linhas usam color1…, gradient1… e _hole1…; o desenho inteiro sai de file().
  function trace(img, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const w = img.width, h = img.height, N = w * h, data = img.data;
    const t0 = Date.now();
    // ---- os pixels: Lab, alfa, o que conta
    const lab = new Float64Array(N * 3), alpha = new Float64Array(N);
    for (let p = 0; p < N; p++) {
      labLin(LIN[data[p * 4]], LIN[data[p * 4 + 1]], LIN[data[p * 4 + 2]], lab, p * 3);
      alpha[p] = data[p * 4 + 3] / 255;
    }
    const opaque = new Uint8Array(N);
    for (let p = 0; p < N; p++) opaque[p] = alpha[p] > 0.5 ? 1 : 0;
    const nearOpaque = near(opaque, w, h, 2);
    const soft = new Uint8Array(N), valid = new Uint8Array(N);
    for (let p = 0; p < N; p++) { soft[p] = alpha[p] > 0.03 && !opaque[p] && !nearOpaque[p] ? 1 : 0; valid[p] = opaque[p] || soft[p]; }
    // ---- as características: Lab e o alfa (com peso), menos na orla serrilhada da parte opaca (alfa 1 ali)
    const outerRim = new Uint8Array(N);
    for (let p = 0; p < N; p++) outerRim[p] = !valid[p] || soft[p] ? 1 : 0;
    const nearRim = near(outerRim, w, h, 1);
    const F = new Float64Array(N * D);
    for (let p = 0; p < N; p++) {
      const rim = valid[p] && !soft[p] && nearRim[p];
      const af = rim || (!soft[p] && alpha[p] > 0.9) ? 1 : alpha[p];
      F[p * D] = lab[p * 3]; F[p * D + 1] = lab[p * 3 + 1]; F[p * D + 2] = lab[p * 3 + 2]; F[p * D + 3] = af * o.alphaW;
    }
    const jump = new Float64Array(N);
    for (const [dy, dx] of [[0, 1], [1, 0]]) {
      for (let y = dy; y < h; y++) for (let x = dx; x < w; x++) {
        const p = y * w + x, q = p - dy * w - dx;
        let s = 0;
        for (let c = 0; c < D; c++) { const v = F[p * D + c] - F[q * D + c]; s += v * v; }
        s = Math.sqrt(s);
        if (s > jump[p]) jump[p] = s;
        if (s > jump[q]) jump[q] = s;
      }
    }
    // ---- k-means: a parte opaca e a semitransparente, cada uma com as suas cores
    const centers = [];
    for (const [isSoft, k] of [[0, o.colors], [1, o.softColors]]) {
      let nCore = 0, nPart = 0;
      for (let p = 0; p < N; p++) if (valid[p] && soft[p] === isSoft) { nPart++; if (jump[p] < 6) nCore++; }
      const useCore = nCore > 500, m = useCore ? nCore : nPart;
      if (m <= 50) continue;
      const X = new Float64Array(m * D);
      let q = 0;
      for (let p = 0; p < N; p++) if (valid[p] && soft[p] === isSoft && (!useCore || jump[p] < 6)) { for (let c = 0; c < D; c++) X[q * D + c] = F[p * D + c]; q++; }
      const km = kmeans(X, m, k, 25);
      for (let l = 0; l < km.k; l++) centers.push(Array.from(km.C.subarray(l * D, l * D + D)));
    }
    if (!centers.length) throw new Error('a imagem não tem pixels visíveis para traçar');
    const cls = nearestInto(F, N, Float64Array.from(centers.flat()), centers.length, new Int32Array(N));
    for (let p = 0; p < N; p++) if (!valid[p]) cls[p] = -1;
    // ---- as regiões
    let { L, n } = labelCC(cls, valid, w, h);
    ({ L, n } = mergeRegions(L, n, F, w, h, o.merge, o.minArea));
    if (o.mass > 0) {
      L = dissolveMixes(L, n, F, w, h);
      ({ L, n } = compact(L));
      ({ L, n } = dropFaint(L, n, F, w, h, o.mass));
    }
    if (o.split > 0) ({ L, n } = splitRegions(L, n, F, w, h, o));
    if (o.grad > 0) ({ L, n } = gradientMerge(L, n, F, w, h, o));
    const models = makeModels(L, n, img, F, w, h, o);
    const { flat, grad } = models;
    // ---- a ordem: as semitransparentes primeiro, depois a maior caixa primeiro (e o mais pixels)
    const bx0 = new Int32Array(n).fill(w), by0 = new Int32Array(n).fill(h), bx1 = new Int32Array(n), by1 = new Int32Array(n), cnt = new Int32Array(n);
    for (let p = 0; p < N; p++) {
      const l = L[p];
      if (l < 0) continue;
      const x = p % w, y = (p - x) / w;
      if (x < bx0[l]) bx0[l] = x;
      if (y < by0[l]) by0[l] = y;
      if (x + 1 > bx1[l]) bx1[l] = x + 1;
      if (y + 1 > by1[l]) by1[l] = y + 1;
      cnt[l]++;
    }
    const translucent = (i) => flat[i * 4 + 3] < 0.97 * 255;
    const area = (i) => (bx1[i] - bx0[i]) * (by1[i] - by0[i]);
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) =>
      (translucent(b) - translucent(a)) || (area(b) - area(a)) || (cnt[b] - cnt[a]) || (a - b));
    const rank = new Int32Array(n);
    order.forEach((i, r) => { rank[i] = r; });
    // ---- a palette: cores chapadas a menos de 1 ΔE (com o mesmo alfa) dividem o nome
    const colorOf = new Int32Array(n).fill(-1), palette = [], palKey = [], c3 = new Float64Array(3);
    for (const i of order) {
      if (grad[i]) continue;
      const hx = hexa(flat[i * 4], flat[i * 4 + 1], flat[i * 4 + 2], flat[i * 4 + 3]);
      labOf(flat[i * 4], flat[i * 4 + 1], flat[i * 4 + 2], c3, 0);
      const al = hx.slice(7);
      let j = palKey.findIndex((k) => k.al === al && Math.hypot(k.lab[0] - c3[0], k.lab[1] - c3[1], k.lab[2] - c3[2]) < 1);
      if (j < 0) { j = palette.length; palette.push(hx); palKey.push({ lab: [c3[0], c3[1], c3[2]], al }); }
      colorOf[i] = j;
    }
    // ---- o traçado, região por região
    const ctx = { L, w, h, rank, img, models, o };
    const body = [];
    let npts = 0, nshapes = 0, ngrad = 0, nhole = 0;
    for (const i of order) {
      const { shapes, holes } = traceRegion(i, ctx, [bx0[i], by0[i], bx1[i], by1[i]]);
      if (!shapes.length) continue;
      let cname;
      if (grad[i]) {
        const g = models.spec.get(i);
        let sx = 0, sy = 0, sn = 0;
        for (let y = by0[i]; y < by1[i]; y++) for (let x = bx0[i]; x < bx1[i]; x++) if (L[y * w + x] === i) { sx += x; sy += y; sn++; }
        const cx = sx / sn, cy = sy / sn, base = cx * g.u[0] + cy * g.u[1];
        const p1 = [cx + g.u[0] * (g.lo - base) + 0.5, cy + g.u[1] * (g.lo - base) + 0.5];
        const p2 = [cx + g.u[0] * (g.hi - base) + 0.5, cy + g.u[1] * (g.hi - base) + 0.5];
        ngrad++;
        cname = `gradient${ngrad}`;
        const stops = g.pos.map((pp, b) => `${hexa(g.cols[0][b], g.cols[1][b], g.cols[2][b], g.cols[3][b])}@${pp.toFixed(3)}`);
        body.push(`gradient ${cname} linear ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} : ${stops.join(' ')}`);
      } else cname = `color${colorOf[i] + 1}`;
      let cut = '';
      if (holes.length) {
        nhole++;
        cut = ` cut=_hole${nhole}`;
        for (const pts of holes) { body.push(`shape _hole${nhole} hidden : ${fmt(pts)}`); npts += pts.length; }
      }
      for (const pts of shapes) { body.push(`shape c=${cname}${cut} : ${fmt(pts)}`); npts += pts.length; nshapes++; }
    }
    let ntrans = 0;
    for (let i = 0; i < n; i++) if (translucent(i)) ntrans++;
    return { width: w, height: h, palette, body, stats: { regions: n, gradients: ngrad, translucent: ntrans, shapes: nshapes, points: npts, colors: palette.length, ms: Date.now() - t0 } };
  }

  // O arquivo .weasel inteiro. info: { header: [linhas de comentário], ref: 'linha ref' ou null, blur }.
  function file(res, info) {
    const out = [];
    for (const l of (info && info.header) || []) out.push('# ' + l);
    if (out.length) out.push('');
    out.push(`canvas ${res.width} ${res.height} bg=none`);
    if (info && info.ref) out.push(info.ref);
    if (info && info.blur > 0) out.push(`layer arte blur=${info.blur}`);
    for (let s = 0; s < res.palette.length; s += 8) {
      out.push('palette ' + res.palette.slice(s, s + 8).map((hx, j) => `color${s + j + 1}=${hx}`).join(' '));
    }
    out.push('');
    return out.concat(res.body).join('\n') + '\n';
  }

  W.trace = { trace, file, DEFAULTS };
})(window.Weasel = window.Weasel || {});
