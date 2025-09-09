import { iv, SHA256 } from "./common.ts";

const ROTATE = /* @__PURE__ */ iv("d951c840fb73ea62cb61fa50e943d872");
const SIGMA = /* @__PURE__ */ iv(
  "76543210fedcba986df984ae357b20c1df250c8b491763eaebcd13978f04a562fa427509d386cb1e38b0a6c291ef57d4a4def15cb8293670931ce7bda2684f05803b9ef65a417d2c5167482a0dc3e9bf",
);
const b2_mix = (to: Uint32Array, last: boolean) => {
  to.copyWithin(0, 16, 24), to.set(SHA256, 8), to[12] ^= to[25];
  to[13] ^= to[26], last && (to[14] = ~to[14]);
  let z = 0, y = 80, x, a, b, c;
  do do x = --y & 3,
    a = ROTATE[x >> 1 | z << 1 & 2] >> (x << 4 & 16),
    to[c = a >> 12 & 15] ^= to[a & 15] += to[b = a >> 4 & 15] +
      to[(SIGMA[z] >> (x << 3) & 15) + 27],
    to[b] ^= to[a >> 8 & 15] += to[c] = to[c] >>> 16 | to[c] << 16,
    to[b] = to[b] >>> 12 | to[b] << 20,
    to[c] ^= to[a & 15] += to[b] + to[(SIGMA[z] >> (x << 3) + 4 & 15) + 27],
    to[b] ^= to[a >> 8 & 15] += to[c] = to[c] >>> 8 | to[c] << 24,
    to[b] = to[b] >>> 7 | to[b] << 25; while (x); while (++z < 20);
  do to[x + 16] ^= to[x] ^ to[x + 8]; while (++x < 8);
};
/** Blake2s hasher. */
export class Blake2s {
  private state = new Uint32Array(43);
  /** Creates a new hash instance. */
  constructor(private length = 32, key?: Uint8Array) {
    this.state.set(SHA256, 16);
    this.state[16] ^= length | key?.length! << 8 | 0x01010000;
    if (key?.length) this.update(key), this.state[24] = 64;
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
    const a = new Uint8Array(this.length), b = new DataView(this.state.buffer);
    let c = this.state[24] + 108;
    this.state.fill(0, c + 3 >> 2)[25] += this.state[24];
    this.state[25] < this.state[24] && ++this.state[26];
    c & 3 && b.setUint8(c, 0), (c ^ c >> 1) & 1 && b.setUint8(c + 1, 0);
    c & 1 & ~c >> 1 && b.setUint8(c + 2, 0), b2_mix(this.state, true), c = 0;
    while (c < this.length) a[c] = this.state[c + 64 >> 2] >> (c++ << 3 & 24);
    return into ? (into.set(a.subarray(0, into.length)), into) : a as A;
  }
}
