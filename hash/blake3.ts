/** @module blake3 */
import { type Hash, perm } from "./lib.ts";

const PERMUTE = /* @__PURE__ */ perm(
  "0123456789abcdef263a704d1bc59ef834acd27e6590bf81a7c9e3df40b25816cd9bfae8725301649eb58cf1d30a2647bf501986ea2c347d",
  2,
);
const KEY = /* @__PURE__ */ new Uint32Array(16);
const mix = (
  key: number,
  block: DataView,
  t: number,
  size: number,
  flag: number,
  to: Uint32Array,
) => {
  let a = KEY[key], b = KEY[key + 1], c = KEY[key + 2], d = KEY[key + 3];
  let e = KEY[key + 4], f = KEY[key + 5], g = KEY[key + 6], h = KEY[key + 7];
  let i = 0x6a09e667, j = 0xbb67ae85, k = 0x3c6ef372, l = 0xa54ff53a;
  let m = t % 0x100000000, n = t / 0x100000000, o = size, p = flag, z = 0;
  do m ^= a = a + e + block.getUint32(PERMUTE[z++], true) | 0,
    m = m << 16 | m >>> 16,
    e ^= i = i + m | 0,
    e = e << 20 | e >>> 12,
    m ^= a = a + e + block.getUint32(PERMUTE[z++], true) | 0,
    m = m << 24 | m >>> 8,
    e ^= i = i + m | 0,
    e = e << 25 | e >>> 7,
    n ^= b = b + f + block.getUint32(PERMUTE[z++], true) | 0,
    n = n << 16 | n >>> 16,
    f ^= j = j + n | 0,
    f = f << 20 | f >>> 12,
    n ^= b = b + f + block.getUint32(PERMUTE[z++], true) | 0,
    n = n << 24 | n >>> 8,
    f ^= j = j + n | 0,
    f = f << 25 | f >>> 7,
    o ^= c = c + g + block.getUint32(PERMUTE[z++], true) | 0,
    o = o << 16 | o >>> 16,
    g ^= k = k + o | 0,
    g = g << 20 | g >>> 12,
    o ^= c = c + g + block.getUint32(PERMUTE[z++], true) | 0,
    o = o << 24 | o >>> 8,
    g ^= k = k + o | 0,
    g = g << 25 | g >>> 7,
    p ^= d = d + h + block.getUint32(PERMUTE[z++], true) | 0,
    p = p << 16 | p >>> 16,
    h ^= l = l + p | 0,
    h = h << 20 | h >>> 12,
    p ^= d = d + h + block.getUint32(PERMUTE[z++], true) | 0,
    p = p << 24 | p >>> 8,
    h ^= l = l + p | 0,
    h = h << 25 | h >>> 7,
    p ^= a = a + f + block.getUint32(PERMUTE[z++], true) | 0,
    p = p << 16 | p >>> 16,
    f ^= k = k + p | 0,
    f = f << 20 | f >>> 12,
    p ^= a = a + f + block.getUint32(PERMUTE[z++], true) | 0,
    p = p << 24 | p >>> 8,
    f ^= k = k + p | 0,
    f = f << 25 | f >>> 7,
    m ^= b = b + g + block.getUint32(PERMUTE[z++], true) | 0,
    m = m << 16 | m >>> 16,
    g ^= l = l + m | 0,
    g = g << 20 | g >>> 12,
    m ^= b = b + g + block.getUint32(PERMUTE[z++], true) | 0,
    m = m << 24 | m >>> 8,
    g ^= l = l + m | 0,
    g = g << 25 | g >>> 7,
    n ^= c = c + h + block.getUint32(PERMUTE[z++], true) | 0,
    n = n << 16 | n >>> 16,
    h ^= i = i + n | 0,
    h = h << 20 | h >>> 12,
    n ^= c = c + h + block.getUint32(PERMUTE[z++], true) | 0,
    n = n << 24 | n >>> 8,
    h ^= i = i + n | 0,
    h = h << 25 | h >>> 7,
    o ^= d = d + e + block.getUint32(PERMUTE[z++], true) | 0,
    o = o << 16 | o >>> 16,
    e ^= j = j + o | 0,
    e = e << 20 | e >>> 12,
    o ^= d = d + e + block.getUint32(PERMUTE[z++], true) | 0,
    o = o << 24 | o >>> 8,
    e ^= j = j + o | 0,
    e = e << 25 | e >>> 7; while (z < 112);
  to[0] = a ^ i, to[1] = b ^ j, to[2] = c ^ k, to[3] = d ^ l, to[4] = e ^ m;
  to[5] = f ^ n, to[6] = g ^ o, to[7] = h ^ p;
  if (flag & 0b0001000) { // root
    to[8] = i ^ KEY[key], to[9] = j ^ KEY[key + 1], to[10] = k ^ KEY[key + 2];
    to[11] = l ^ KEY[key + 3], to[12] = m ^ KEY[key + 4];
    to[13] = n ^ KEY[key + 5], to[14] = o ^ KEY[key + 6];
    to[15] = p ^ KEY[key + 7];
  }
};
const merge = (left: Uint32Array<ArrayBuffer>, right: Uint32Array) => (
  left.set(right.subarray(0, 8), 8), new DataView(left.buffer)
);
const min = (a: number, b: number) => b + (a - b & a - b >> 31);
const TEMP = /* @__PURE__ */ new Uint32Array(16);
const BLOCK = /* @__PURE__ */ new Uint8Array(64);
const VIEW = /* @__PURE__ */ (() => new DataView(BLOCK.buffer))();
// Table 3 of the spec defines the following flags:
// 0b0000000
//   |||||||_ CHUNK_START
//   ||||||__ CHUNK_END
//   |||||___ PARENT
//   ||||____ ROOT
//   |||_____ KEYED_HASH
//   ||______ DERIVE_KEY_CONTEXT
//   |_______ DERIVE_KEY_MATERIAL
const b3 = (
  flags: number,
  key: Uint8Array,
  $: Uint8Array,
  length = 32,
  seek = 0,
) => {
  const stack = [], out = new Uint8Array(length);
  let a = VIEW, b = 0, c = 0, d, e, z = 8, y = 0;
  do KEY[--z] = KEY[z + 8] = key[d = z << 2] | key[d + 1] << 8 |
    key[d + 2] << 16 | key[d + 3] << 24; while (z);
  while (z < $.length) {
    if (b + (c << 6) === 1024) {
      mix(8, a, y, b, flags | 0b0000010, TEMP), d = flags | 0b0000100;
      for (e = ++y; e & 1 ^ 1; e >>= 1) {
        mix(0, merge(stack.pop()!, TEMP), 0, 64, d, TEMP);
      }
      stack.push(new Uint32Array(TEMP)), KEY.copyWithin(8, 0, 8);
      BLOCK.fill(b = c = 0);
    }
    d = min(z + 1024 - b - (c << 6), $.length);
    do {
      if (b >= 64) {
        mix(8, a, y, b, flags | +!c++ & 0b0000001, KEY.subarray(8));
        BLOCK.fill(b = 0);
      }
      BLOCK.set($.subarray(z, z += e = min(64 - b, d - z)), b), b += e;
    } while (z < d);
  }
  c = flags | +!c & 0b0000001 | 0b0000010;
  if (z = stack.length) {
    mix(8, a, y, b, c, TEMP), c = flags | 0b0000100;
    while (--z) mix(0, merge(stack[z], TEMP), 0, 64, c, TEMP);
    KEY.copyWithin(8, 0, 8), a = merge(stack[0], TEMP), b = 64;
  }
  do {
    mix(8, a, seek++, b, c | 0b0001000, TEMP), y = min(z + 64, length);
    do out[z] = TEMP[z >> 2 & 15] >> (z << 3); while (++z < y);
  } while (z < length);
  return BLOCK.fill(0), out;
};
const B3 = /* @__PURE__ */ perm(
  /* @__PURE__ */ "67e6096a85ae67bb72f36e3c3af54fa57f520e518c68059babd9831f19cde05b"
    .match(/../g)!,
);
/** Hashes with BLAKE3. */
export const blake3:
  & Hash<[data: Uint8Array, _?: undefined, length?: number, seek?: number]>
  & Hash<[data: Uint8Array, key: Uint8Array, length?: number, seek?: number]>
  & Hash<[key: Uint8Array, context: string, length?: number, seek?: number]> = (
    data,
    $,
    length,
    seek,
  ) => {
    if ($ === undefined) return b3(0, B3, data, length, seek);
    else if (typeof $ === "object") {
      return b3(0b0010000, $, data, length, seek);
    }
    const ctx = b3(0b0100000, B3, new TextEncoder().encode($));
    return b3(0b1000000, ctx, data, length, seek);
  };
