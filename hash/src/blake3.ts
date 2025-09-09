import { iv, min, SHA256 } from "./common.ts";

const enum Size {
  BLOCK = 64,
  CHUNK = 1024,
}
const enum Flag {
  START = 1 << 0,
  END = 1 << 1,
  PARENT = 1 << 2,
  ROOT = 1 << 3,
  KEYED = 1 << 4,
  DERIVE_CONTEXT = 1 << 5,
  DERIVE_KEY = 1 << 6,
}
const PERMUTE = /* @__PURE__ */ Uint8Array.from(
  "0123456789abcdef263a704d1bc59ef834acd27e6590bf81a7c9e3df40b25816cd9bfae8725301649eb58cf1d30a2647bf501986ea2c347d",
  (Z) => parseInt(Z, 16) << 2,
);
const mix = (
  use: Uint32Array,
  $: DataView,
  at: number,
  byte: number,
  flag: number,
  to: Uint32Array,
) => {
  let a = use[0], b = use[1], c = use[2], d = use[3], e = use[4], f = use[5];
  let g = use[6], h = use[7], i = SHA256[0], j = SHA256[1], k = SHA256[2];
  let l = SHA256[3], m = at, n = at / 0x100000000, o = byte, p = flag, z = 0;
  do m ^= a = a + e + $.getUint32(PERMUTE[z++], true) | 0,
    m = m << 16 | m >>> 16,
    e ^= i = i + m | 0,
    e = e << 20 | e >>> 12,
    m ^= a = a + e + $.getUint32(PERMUTE[z++], true) | 0,
    m = m << 24 | m >>> 8,
    e ^= i = i + m | 0,
    e = e << 25 | e >>> 7,
    n ^= b = b + f + $.getUint32(PERMUTE[z++], true) | 0,
    n = n << 16 | n >>> 16,
    f ^= j = j + n | 0,
    f = f << 20 | f >>> 12,
    n ^= b = b + f + $.getUint32(PERMUTE[z++], true) | 0,
    n = n << 24 | n >>> 8,
    f ^= j = j + n | 0,
    f = f << 25 | f >>> 7,
    o ^= c = c + g + $.getUint32(PERMUTE[z++], true) | 0,
    o = o << 16 | o >>> 16,
    g ^= k = k + o | 0,
    g = g << 20 | g >>> 12,
    o ^= c = c + g + $.getUint32(PERMUTE[z++], true) | 0,
    o = o << 24 | o >>> 8,
    g ^= k = k + o | 0,
    g = g << 25 | g >>> 7,
    p ^= d = d + h + $.getUint32(PERMUTE[z++], true) | 0,
    p = p << 16 | p >>> 16,
    h ^= l = l + p | 0,
    h = h << 20 | h >>> 12,
    p ^= d = d + h + $.getUint32(PERMUTE[z++], true) | 0,
    p = p << 24 | p >>> 8,
    h ^= l = l + p | 0,
    h = h << 25 | h >>> 7,
    p ^= a = a + f + $.getUint32(PERMUTE[z++], true) | 0,
    p = p << 16 | p >>> 16,
    f ^= k = k + p | 0,
    f = f << 20 | f >>> 12,
    p ^= a = a + f + $.getUint32(PERMUTE[z++], true) | 0,
    p = p << 24 | p >>> 8,
    f ^= k = k + p | 0,
    f = f << 25 | f >>> 7,
    m ^= b = b + g + $.getUint32(PERMUTE[z++], true) | 0,
    m = m << 16 | m >>> 16,
    g ^= l = l + m | 0,
    g = g << 20 | g >>> 12,
    m ^= b = b + g + $.getUint32(PERMUTE[z++], true) | 0,
    m = m << 24 | m >>> 8,
    g ^= l = l + m | 0,
    g = g << 25 | g >>> 7,
    n ^= c = c + h + $.getUint32(PERMUTE[z++], true) | 0,
    n = n << 16 | n >>> 16,
    h ^= i = i + n | 0,
    h = h << 20 | h >>> 12,
    n ^= c = c + h + $.getUint32(PERMUTE[z++], true) | 0,
    n = n << 24 | n >>> 8,
    h ^= i = i + n | 0,
    h = h << 25 | h >>> 7,
    o ^= d = d + e + $.getUint32(PERMUTE[z++], true) | 0,
    o = o << 16 | o >>> 16,
    e ^= j = j + o | 0,
    e = e << 20 | e >>> 12,
    o ^= d = d + e + $.getUint32(PERMUTE[z++], true) | 0,
    o = o << 24 | o >>> 8,
    e ^= j = j + o | 0,
    e = e << 25 | e >>> 7; while (z < 112);
  to[0] = a ^ i, to[1] = b ^ j, to[2] = c ^ k, to[3] = d ^ l, to[4] = e ^ m;
  to[5] = f ^ n, to[6] = g ^ o, to[7] = h ^ p;
  if (flag & Flag.ROOT) {
    to[8] = i ^ use[0], to[9] = j ^ use[1], to[10] = k ^ use[2];
    to[11] = l ^ use[3], to[12] = m ^ use[4], to[13] = n ^ use[5];
    to[14] = o ^ use[6], to[15] = p ^ use[7];
  }
};
const merge = (left: Uint32Array<ArrayBuffer>, right: Uint32Array) => (
  left.set(right.subarray(0, 8), 8), new DataView(left.buffer)
);
const blake3 = (
  key: Uint32Array,
  flags: number,
  $: Uint8Array,
  out = 32,
  at = 0,
) => {
  const a = [], b = new Uint32Array(key), c = new Uint8Array(Size.BLOCK);
  let d = new DataView(c.buffer), e = 0, f = 0, z = 0, y = 0, x;
  const g = new Uint32Array(16), h = new Uint8Array(out);
  while (z < $.length) {
    if (e + f * Size.BLOCK === Size.CHUNK) {
      for (mix(b, d, y, e, flags | Flag.END, g), x = ++y; x & 1 ^ 1; x >>= 1) {
        mix(key, merge(a.pop()!, g), 0, Size.BLOCK, flags | Flag.PARENT, g);
      }
      a.push(new Uint32Array(g)), b.set(key), c.fill(e = f = 0);
    }
    const i = min(z + Size.CHUNK - e - f * Size.BLOCK, $.length);
    do e < Size.BLOCK ||
      (mix(b, d, y, e, flags | +!f++ & Flag.START, b), c.fill(e = 0)),
      c.set($.subarray(z, z += x = min(Size.BLOCK - e, i - z)), e),
      e += x; while (z < i);
  }
  if (x = flags | +!f & Flag.START | Flag.END, z = a.length) {
    mix(b, d, y, e, x, g), x = flags | Flag.PARENT;
    while (--z) mix(key, merge(a[z], g), 0, Size.BLOCK, x, g);
    b.set(key), d = merge(a[0], g), e = Size.BLOCK;
  }
  do {
    mix(b, d, at++, e, x | Flag.ROOT, g), y = min(z + Size.BLOCK, out);
    do h[z] = g[z >> 2 & 15] >> (z << 3); while (++z < y);
  } while (z < out);
  return h;
};
const b_b32 = ($: Uint8Array) => {
  const a = new Uint32Array(8);
  for (let z = 0; z < 32; ++z) a[z >> 2] |= $[z] << (z << 3);
  return a;
};
/** Hashes with Blake3 (unkeyed). */
export const blake3_hash = (
  $: Uint8Array,
  out?: number,
): Uint8Array<ArrayBuffer> => blake3(SHA256.subarray(0, 8), 0, $, out);
/** Hashes with Blake3 (keyed). */
export const blake3_keyed = (
  key: Uint8Array,
  $: Uint8Array,
  out?: number,
): Uint8Array<ArrayBuffer> => blake3(b_b32(key), Flag.KEYED, $, out);
/** Creates a key derivation function with Blake3 (that can skip blocks). */
export const blake3_derive = (
  context: Uint8Array,
): ($: Uint8Array, out?: number, at?: number) => Uint8Array<ArrayBuffer> => {
  const a = b_b32(blake3(SHA256.subarray(0, 8), Flag.DERIVE_CONTEXT, context));
  return ($, out, at) => blake3(a, Flag.DERIVE_KEY, $, out, at);
};
