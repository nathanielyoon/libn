import { type Hash, min, Mod, SHA256 } from "./common.ts";

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
  DERIVE_CTX = 1 << 5,
  DERIVE_KEY = 1 << 6,
}
const PERMUTE = /* @__PURE__ */ Uint8Array.from(
  "0123456789abcdef263a704d1bc59ef834acd27e6590bf81a7c9e3df40b25816cd9bfae8725301649eb58cf1d30a2647bf501986ea2c347d",
  ($) => parseInt($, 16) << 2,
);
const mix = (
  key: Uint32Array,
  $: DataView,
  at: number,
  byte: number,
  flag: number,
  to: Uint32Array,
) => {
  let a = key[0], b = key[1], c = key[2], d = key[3], e = key[4], f = key[5];
  let g = key[6], h = key[7], i = SHA256[0], j = SHA256[1], k = SHA256[2];
  let l = SHA256[3], m = at, n = at / Mod.U, o = byte, p = flag, z = 0;
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
    to[8] = i ^ key[0], to[9] = j ^ key[1], to[10] = k ^ key[2];
    to[11] = l ^ key[3], to[12] = m ^ key[4], to[13] = n ^ key[5];
    to[14] = o ^ key[6], to[15] = p ^ key[7];
  }
};
const merge = (left: Uint32Array<ArrayBuffer>, right: Uint32Array) => (
  left.set(right.subarray(0, 8), 8), new DataView(left.buffer)
);
const blake3 = (
  flags: number,
  key: Uint8Array,
  $: Uint8Array,
  length = 32,
  seek = 0,
) => {
  const stack = [], block = new Uint8Array(Size.BLOCK), a = new Uint32Array(8);
  let b = new DataView(block.buffer), c = 0, d = 0, e, z = 8, y = 0;
  do a[--z] = key[e = z << 2] | key[e + 1] << 8 | key[e + 2] << 16 |
    key[e + 3] << 24; while (z);
  const f = new Uint32Array(a), g = new Uint32Array(16), max = $.length;
  while (z < max) {
    if (c + d * Size.BLOCK === Size.CHUNK) {
      for (mix(f, b, y, c, flags | Flag.END, g), e = ++y; e & 1 ^ 1; e >>= 1) {
        mix(a, merge(stack.pop()!, g), 0, Size.BLOCK, flags | Flag.PARENT, g);
      }
      stack.push(new Uint32Array(g)), f.set(a), block.fill(c = d = 0);
    }
    const take = min(z + Size.CHUNK - c - d * Size.BLOCK, max);
    do c < Size.BLOCK ||
      (mix(f, b, y, c, flags | +!d++ & Flag.START, f), block.fill(c = 0)),
      block.set($.subarray(z, z += e = min(Size.BLOCK - c, take - z)), c),
      c += e; while (z < take);
  }
  if (e = flags | +!d & Flag.START | Flag.END, z = stack.length) {
    mix(f, b, y, c, e, g), e = flags | Flag.PARENT;
    while (--z) mix(a, merge(stack[z], g), 0, Size.BLOCK, e, g);
    f.set(a), b = merge(stack[0], g), c = Size.BLOCK;
  }
  const out = new Uint8Array(length);
  do {
    mix(f, b, seek++, c, e | Flag.ROOT, g), y = min(z + Size.BLOCK, length);
    do out[z] = g[z >> 2 & 15] >> (z << 3); while (++z < y);
  } while (z < length);
  return out;
};
const B3 = /* @__PURE__ */ Uint8Array.from(
  { length: 32 },
  (_, z) => SHA256[z >> 2] >> (z << 3),
);
/** Hashes with BLAKE3 (unkeyed). */
export const b3: Hash<[$: Uint8Array, length?: number, seek?: number]> =
  /* @__PURE__ */ blake3.bind(null, 0, B3);
/** Hashes with BLAKE3 (keyed). */
export const b3_keyed: Hash<
  [key: Uint8Array, $: Uint8Array, length?: number, seek?: number]
> = /* @__PURE__ */ blake3.bind(null, Flag.KEYED);
/** Creates a key derivation function with BLAKE3. */
export const b3_derive = (context: Uint8Array): Hash<
  [$: Uint8Array, length?: number, seek?: number]
> => blake3.bind(null, Flag.DERIVE_KEY, blake3(Flag.DERIVE_CTX, B3, context));
