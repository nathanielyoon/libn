import { IV, LOWER } from "./iv.ts";

const b2_mix = (to: Uint32Array, last: boolean) => {
  to.copyWithin(0, 16, 24), to.set(LOWER, 8), to[12] ^= to[25];
  to[13] ^= to[26], last && (to[14] = ~to[14]);
  let z = 0, y = 80, x, a, b, c;
  do do x = --y & 3,
    a = IV[(x >> 1 | z << 1 & 2) + 196] >> (x << 4 & 16),
    to[c = a >> 12 & 15] ^= to[a & 15] += to[b = a >> 4 & 15] +
      to[(IV[z + 176] >> (x << 3) & 15) + 27],
    to[b] ^= to[a >> 8 & 15] += to[c] = to[c] >>> 16 | to[c] << 16,
    to[b] = to[b] >>> 12 | to[b] << 20,
    to[c] ^= to[a & 15] += to[b] + to[(IV[z + 176] >> (x << 3) + 4 & 15) + 27],
    to[b] ^= to[a >> 8 & 15] += to[c] = to[c] >>> 8 | to[c] << 24,
    to[b] = to[b] >>> 7 | to[b] << 25; while (x); while (++z < 20);
  do to[x + 16] ^= to[x] ^ to[x + 8]; while (++x < 8);
};
/** Blake2s hasher. */
export class Blake2s {
  private state = new Uint32Array(43);
  /** Creates a new hash instance. */
  constructor(private out_len = 32, key?: Uint8Array) {
    const key_len = key?.length!;
    this.state.set(LOWER, 16);
    this.state[16] ^= out_len | key_len << 8 | 0x01010000;
    if (key_len) this.update(key), this.state[24] = 64;
  }
  /** Updates the hash state. */
  update(data: Uint8Array): this {
    for (let z = 0; z < data.length; ++z) {
      if (this.state[24] === 64) {
        this.state[25] += 64, this.state[25] < 64 && ++this.state[26];
        b2_mix(this.state, false), this.state[24] = 0;
      }
      const a = this.state[24] << 3 & 24, b = ++this.state[24] + 107 >> 2;
      this.state[b] = this.state[b] & ~(255 << a) | data[z] << a & (255 << a);
    }
    return this;
  }
  /** Computes a digest from the current state. */
  finalize<A extends Uint8Array = Uint8Array<ArrayBuffer>>(into?: A): A {
    const out = new Uint8Array(this.out_len);
    const view = new DataView(this.state.buffer), len = this.state[24] + 108;
    this.state.fill(0, len + 3 >> 2)[25] += this.state[24];
    this.state[25] < this.state[24] && ++this.state[26];
    len & 3 && view.setUint8(len, 0);
    (len ^ len >> 1) & 1 && view.setUint8(len + 1, 0);
    len & 1 & ~len >> 1 && view.setUint8(len + 2, 0);
    b2_mix(this.state, true);
    for (let z = 0; z < this.out_len; ++z) {
      out[z] = this.state[z + 64 >> 2] >> (z << 3 & 24);
    }
    if (into) return into.set(out.subarray(0, into.length)), into;
    return out as A;
  }
}
