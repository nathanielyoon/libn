const create = (key: Uint8Array) => {
  const state = new Uint32Array([
    key[0] | key[1] << 8 | key[2] << 16 | key[3] << 24,
    key[4] | key[5] << 8 | key[6] << 16 | key[7] << 24,
    0x6c796765,
    0x74656462,
  ]);
  return state[2] ^= state[0], state[3] ^= state[1], state;
};
const update = (state: Uint32Array, $: Uint8Array, xor: number) => {
  let [a, b, c, d] = state, e, z = 0, y;
  const end = $.length & ~3;
  while (z < end) {
    d ^= e = $[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24, y = 2;
    do a += b,
      b = b << 5 | b >>> 27,
      b ^= a,
      a = a << 16 | a >>> 16,
      c += d,
      d = d << 8 | d >>> 24,
      d ^= c,
      a += d,
      d = d << 7 | d >>> 25,
      d ^= a,
      c += b,
      b = b << 13 | b >>> 19,
      b ^= c,
      c = c << 16 | c >>> 16; while (--y);
    a ^= e;
  }
  d ^= e = $[end] | $[end + 1] << 8 | $[end + 2] << 16 | $.length << 24, z = 2;
  do a += b,
    b = b << 5 | b >>> 27,
    b ^= a,
    a = a << 16 | a >>> 16,
    c += d,
    d = d << 8 | d >>> 24,
    d ^= c,
    a += d,
    d = d << 7 | d >>> 25,
    d ^= a,
    c += b,
    b = b << 13 | b >>> 19,
    b ^= c,
    c = c << 16 | c >>> 16; while (--z);
  a ^= e, c ^= xor, z = 4;
  do a += b,
    b = b << 5 | b >>> 27,
    b ^= a,
    a = a << 16 | a >>> 16,
    c += d,
    d = d << 8 | d >>> 24,
    d ^= c,
    a += d,
    d = d << 7 | d >>> 25,
    d ^= a,
    c += b,
    b = b << 13 | b >>> 19,
    b ^= c,
    c = c << 16 | c >>> 16; while (--z);
  state[0] = a, state[1] = b, state[2] = c, state[3] = d;
};
/** Hashes to a 32-bit unsigned integer with HalfSipHash. */
export const halfsiphash32 = ($: Uint8Array, key: Uint8Array): number => {
  const state = create(key);
  return update(state, $, 0xff), (state[1] ^ state[3]) >>> 0;
};
/** Hashes to a 64-bit unsigned integer with HalfSipHash. */
export const halfsiphash64 = ($: Uint8Array, key: Uint8Array): bigint => {
  const state = create(key);
  state[1] ^= 0xee, update(state, $, 0xee);
  let [a, b, c, d] = state, z = 4;
  const out = b ^ d;
  b ^= 0xdd;
  do a += b,
    b = b << 5 | b >>> 27,
    b ^= a,
    a = a << 16 | a >>> 16,
    c += d,
    d = d << 8 | d >>> 24,
    d ^= c,
    a += d,
    d = d << 7 | d >>> 25,
    d ^= a,
    c += b,
    b = b << 13 | b >>> 19,
    b ^= c,
    c = c << 16 | c >>> 16; while (--z);
  return BigInt((b ^ d) >>> 0) << 32n | BigInt(out >>> 0);
};
