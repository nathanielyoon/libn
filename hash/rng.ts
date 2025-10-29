import { add128, enInteger, type I64, mul128, mul64 } from "./lib.ts";

/** Permuted congruential generator. */
export class Rng {
  /** Initializes with a 64-bit seed and an optional 64-bit increment. */
  static make(seed: bigint, inc = 721347520444481703n): Rng {
    const rng = new Rng({ hi: 0, lo: 0 }, enInteger(inc << 1n | 1n));
    return rng.i32(), add128(rng.state, enInteger(seed)), rng.i32(), rng;
  }
  /** Initializes from a saved state and increment. */
  static load(state: I64, increment: I64): Rng {
    return new Rng(state, increment);
  }
  /** Instantiates a new generator. */
  private constructor(private state: I64, private increment: I64) {}
  /** Saves the internal state to re-construct later. */
  save(): { state: I64; increment: I64 } {
    return { state: this.state, increment: this.increment };
  }
  /** Generates a signed 32-bit integer. */
  i32(): number {
    const { hi, lo } = this.state;
    mul128(this.state, { hi: 1481765933, lo: 1284865837 });
    add128(this.state, this.increment);
    const state = (hi >>> 18 ^ hi) << 5 | ((hi << 14 | lo >>> 18) ^ lo) >>> 27;
    return state >>> (hi >>> 27) | state << 32 - (hi >>> 27);
  }
  /** Generates an unsigned 32-bit integer. */
  u32(): number {
    return this.i32() >>> 0;
  }
  /** Generates a single-precision float. */
  f32(): number {
    return Math.fround((this.i32() >>> 8) * 5.9604645e-8);
  }
  /** Generates an unsigned integer within the given bounds. */
  bounded(exclusiveMaximum: number, inclusiveMinimum = 0): number {
    const end = exclusiveMaximum - inclusiveMinimum;
    let map = mul64(this.i32(), end);
    if (map.lo >>> 0 < end) {
      const threshold = (-end >>> 0) % end;
      while (map.lo >>> 0 < threshold) map = mul64(this.i32(), end);
    }
    return (map.hi >>> 0) + inclusiveMinimum;
  }
}
