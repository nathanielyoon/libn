/** Finds a minimum-weight matching in a bipartite graph (rows <= cols). */
export const assign = (weights: Float64Array[]): Int32Array<ArrayBuffer> => {
  const a = weights.length, b = weights[0].length, c = new Float64Array(b);
  const d = new Uint8Array(a), e = new Uint8Array(b), f = new Float64Array(a);
  const g = new Float64Array(b), h = new Int32Array(b).fill(-1);
  const i = new Int32Array(b).fill(-1), j = new Int32Array(a).fill(-1);
  let z = 0, y, x, k, l, m, n, o;
  do {
    y = -1, c.fill(Infinity), k = z, l = 0;
    do {
      x = 0, d[k] = 1, m = Infinity, n = -1;
      do if (!e[x]) {
        if ((o = l + weights[k][x] - f[k] - g[x]) < c[x]) c[x] = o, h[x] = k;
        if (c[x] < m || c[x] === m && i[x] === -1) m = c[x], n = x;
      } while (++x < b);
    } while (l = m, e[n] = 1, ~i[n] ? k = i[n] : y = n, y === -1);
    f[z] += l;
    do if (e[--x]) g[x] -= l - c[x]; while (x);
    do if (d[x] && x !== z) f[x] += l - c[j[x]]; while (++x < a);
    do l = j[k = i[y] = h[y]], j[k] = y, y = l; while (k !== z);
  } while (d.fill(0), e.fill(0), ++z < a);
  return j;
};
