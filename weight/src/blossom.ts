/** Max-weight perfect matching for an undirected general graph. */
export class Blossom {
  private back;
  private base;
  private best: Int32Array;
  private bester;
  private dual;
  private end: Int32Array;
  private label: Int32Array;
  /** Each index's match, or `-1` if unmatched. */
  mate: Int32Array<ArrayBuffer>;
  private max;
  private next;
  private ok: Uint8Array;
  private open;
  private queue: number[] = [];
  private stop;
  private to: Int32Array;
  private up: Int32Array;
  /** Constructs a matching. */
  constructor(private edges: [number, number, number][], all: boolean) {
    const size = edges.length, end = this.end = new Int32Array(size << 1);
    const ok = this.ok = new Uint8Array(size), queue = this.queue;
    let a = 0, b, c, d, e, f, g = 0, h = 0, i, z = 0, y = 0, x = 0, w = 0, v, u;
    do b = edges[z],
      (end[z << 1] = b[0]) > a && (a = b[0]),
      (end[z + z + 1] = b[1]) > a && (a = b[1]),
      b[2] > g && (g = b[2]); while (++z < size);
    const two = ++a << 1, bester = this.bester = Array<number[] | null>(two);
    const to = this.to = new Int32Array(two).fill(-1), no = new Int32Array(two);
    const label = this.label = new Int32Array(two), down = Array<number[]>(a);
    const dual = this.dual = new Float64Array(two).fill(g, z = 0, a);
    const open = this.open = Array<number>(this.max = a);
    const mate = this.mate = new Int32Array(a).fill(-1);
    const base = this.base = new Int32Array(two).fill(-1);
    const back = this.back = new Int32Array(two).fill(-1);
    const next = this.next = Array<number[] | null>(two);
    const stop = this.stop = Array<number[] | null>(two);
    const best = this.best = new Int32Array(two);
    const up = this.up = new Int32Array(a);
    do open[up[x] = base[x] = x] = x + a, down[x] = []; while (++x < a);
    do down[edges[w][0]].push(w + w + 1),
      down[edges[w][1]].push(w << 1); while (++w < size);
    do {
      best.fill(-1), label.fill(queue.length = y = c = 0), ok.fill(0);
      do ~mate[y] || label[up[y]] || this.assign(y, -1, 1),
        bester[y + a] = null; while (++y < a);
      z: do {
        while (queue.length) {
          for (x = 0, f = down[e = queue.pop()!]; x < f.length; ++x) {
            if (up[e] !== up[h = end[g = f[x]]]) {
              if (ok[i = g >> 1] ||= (d = this.slack(i)) <= 0 ? 1 : 0) {
                switch (label[up[h]]) {
                  case 0:
                    this.assign(h, g ^ 1, 2);
                    break;
                  case 1: {
                    let j: number[] = [], k = -1, l, m;
                    while (~e || ~h) {
                      if (label[l = up[e]] & 4) {
                        k = base[l];
                        break;
                      }
                      e = ~to[l] ? end[to[up[end[to[l]]]]] : -1;
                      ~h && (e ^= h ^ (h = e)), j.push(l), label[l] = 5;
                    }
                    for (w = 0; w < j.length; ++w) label[j[w]] = 1;
                    if (~k) {
                      b = edges[i];
                      const n = [];
                      let o = [], p = b[0], q = b[1], r = up[p], s = up[q], t;
                      base[l = back[m = up[k]] = open.pop()!] = k, back[l] = -1;
                      while (r !== m) {
                        back[r] = l, n.push(r), o.push(to[r]);
                        r = up[end[to[r]]];
                      }
                      n.push(m), n.reverse(), o.reverse().push(i << 1);
                      while (s !== m) {
                        back[s] = l, n.push(s), o.push(to[s] ^ 1);
                        s = up[end[to[s]]];
                      }
                      label[l] = 1, to[l] = to[m], dual[l] = w = v = 0;
                      next[l] = n, stop[l] = o, j = this.leaf(l), no.fill(-1);
                      do label[up[j[v]]] === 2 && queue.push(j[v]),
                        up[j[v]] = l; while (++v < j.length);
                      do {
                        if (!(o = bester[k = n[w]]!)) {
                          j = this.leaf(k), o = [], t = down[j[u = v = 0]];
                          do do o.push(t[u] >> 1); while (
                            ++u < t.length
                          ); while (t = down[j[++v]], u = 0, v < j.length);
                        }
                        for (v = 0; v < o.length; ++v) {
                          s = up[edges[r = o[v]][up[edges[r][1]] ^ l && 1]];
                          s === l || ~-label[s] ||
                            ~no[s] && this.slack(r) >= this.slack(no[s]) ||
                            (no[s] = r);
                        }
                        bester[k] = null, best[k] = -1;
                      } while (++w < n.length);
                      j = bester[l] = [], w = 0;
                      do ~no[w] && j.push(no[w]); while (++w < two);
                      if (j.length) {
                        for (p = this.slack(r = j[v = 0]); ++v < j.length;) {
                          q = this.slack(s = j[v]), q < p && (r = s, p = q);
                        }
                        best[l] = r;
                      } else best[l] = -1;
                    } else {
                      for (w = c++; w < 2; ++w) {
                        for (e = edges[i][w], h = (i << 1) + w ^ 1;;) {
                          k = up[e], k < a || this.add(k, e), mate[e] = h;
                          if (!~to[k]) break;
                          m = end[to[l = up[end[to[k]]]] ^ 1], e = end[to[l]];
                          l < a || this.add(l, m), h = (mate[m] = to[l]) ^ 1;
                        }
                      }
                      break z;
                    }
                    break;
                  }
                  default:
                    label[h] ||= (to[h] = g ^ 1, 2);
                }
              } else {
                const j = ~-label[up[h]], k = j ? h : up[e];
                j && label[h] || ~best[k] && d >= this.slack(best[k]) ||
                  (best[k] = i);
              }
            }
          }
        }
        e = all ? -1 : (g = this.min(), 1), v = w = x = 0;
        do label[up[x]] || ~best[x] &&
            (d = this.slack(best[x]), !~e || d < g) &&
            (e = 2, g = d, h = best[x]); while (++x < a);
        do ~back[w] || ~-label[w] || ~best[w] &&
            (d = this.slack(best[w]), !~e || d / 2 < g) &&
            (e = 3, g = d / 2, h = best[w]); while (++w < two);
        do !~base[x] || ~back[x] || label[x] !== 2 || ~e && dual[x] >= g ||
          (e = 4, g = dual[i = x]); while (++x < two);
        ~e || (e = 1, g = Math.max(0, this.min()));
        do if (~-label[up[v]]) label[up[v]] === 2 && (dual[v] += g);
        else dual[v] -= g; while (++v < a);
        do if (~base[v] && !~back[v]) {
          ~-label[v] ? label[v] === 2 && (dual[v] -= g) : dual[v] += g;
        } while (++v < two);
        if (e === 1) break z;
        if (e === 4) this.expand(i!, false);
        else ok[h] = 1, queue.push(edges[h][e - 3 && +!label[up[edges[h][0]]]]);
      } while (true);
      if (!c) break;
      do ~back[y] || !~base[y] || ~-label[y] || dual[y] ||
        this.expand(y, true); while (++y < two);
    } while (++z < a);
    do if (~mate[--a]) mate[a] = end[mate[a]]; while (a);
  }
  /** Recursively collects child nodes. */
  private leaf(Z: number): number[] {
    if (Z < this.max) return [Z];
    const a = this.next[Z]!, b = [];
    let z = 0;
    do if (a[z] > this.max) b.push.apply(b, this.leaf(a[z]));
    else b.push(a[z]); while (++z < a.length);
    return b;
  }
  /** Finds the lowest dual-var value. */
  private min(): number {
    let a = this.dual[0], z = 0;
    while (++z < this.max) if (this.dual[z] < a) a = this.dual[z];
    return a;
  }
  /** Finds slack for a given edge. */
  private slack(Z: number): number {
    const a = this.edges[Z];
    return this.dual[a[0]] + this.dual[a[1]] - a[2] * 2;
  }
  /** Labels a blossom. */
  private assign(Z: number, Y: number, X: number): void {
    let a = this.up[Z];
    this.label[Z] = this.label[a] = X, this.to[Z] = this.to[a] = Y;
    this.best[Z] = this.best[a] = -1;
    if (~-X) this.assign(this.end[a = this.mate[this.base[a]]], a ^ 1, 1);
    else this.queue.push.apply(this.queue, this.leaf(a));
  }
  /** Expands a blossom. */
  private expand(Z: number, Y: boolean): void {
    const a = this.next[Z]!;
    for (let z = 0, y, b, c; z < a.length; ++z) {
      this.back[b = a[z]] = -1;
      if (b < this.max) this.up[b] = b;
      else if (!Y || this.dual[b]) {
        c = this.leaf(b), y = 0;
        do this.up[c[y]] = b; while (++y < c.length);
      } else this.expand(b, Y);
    }
    if (this.label[Z] === 2 && !Y) {
      const b = this.up[this.end[this.to[Z] ^ 1]], c = this.next[Z]!;
      let d = this.to[Z], e = this.stop[Z]!, f = a.indexOf(b);
      let [g, h, i, j] = f & 1 ? [1, 0, 0, a.length] : [-1, 1, a.length, 0], k;
      while (k = this.end[d ^ 1], f !== j) {
        this.label[this.end[e[f -= h] ^ h ^ 1]] = this.label[k] = 0;
        this.assign(k, d, 2), this.ok[e[f] >> 1] = 1, d = e[f += g] ^ h;
        this.ok[d >> 1] = 1, f += g + h;
      }
      this.label[k] = this.label[f = c[0]] = 2, this.to[k] = this.to[f] = d;
      this.best[f] = -1;
      while (c[i += g] !== b) {
        if (~-this.label[f = c[i]]) {
          e = this.leaf(f), h = 0;
          do if (this.label[j = e[h]]) {
            this.label[this.end[this.mate[this.base[f]]]] = this.label[j] = 0;
            this.assign(j, this.to[j], 2);
            break;
          } while (++h < e.length);
        }
      }
    }
    this.open.push(Z), this.stop[Z] = this.next[Z] = this.bester[Z] = null;
    this.label[Z] = -1, this.to[Z] = this.base[Z] = this.best[Z] = -1;
  }
  /** Adds a blossom. */
  private add(Z: number, Y: number): void {
    let a = Y, b, c;
    while (this.back[a] !== Z) a = this.back[a];
    a < this.max || this.add(a, Y);
    const d = this.next[Z]!, e = this.stop[Z]!, f = b = d.indexOf(a);
    const [g, h, i] = f & 1 ? [1, 0, d.length] : [-1, 1, 0];
    while (b !== i) {
      a = d[b += g], c = e[b - h] ^ h, a < this.max || this.add(a, this.end[c]);
      b += g, a = d[b % d.length], a < this.max || this.add(a, this.end[c ^ 1]);
      this.mate[this.end[this.mate[this.end[c]] = c ^ 1]] = c;
    }
    d.push.apply(d, d.splice(0, f)), e.push.apply(e, e.splice(0, f));
    this.base[Z] = this.base[d[0]];
  }
}
