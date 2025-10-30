import { add128, enInteger, type I64, mul128, mul64 } from "./lib.ts";

/** Permuted congruential generator. */
export class Rng extends Iterator<number, never> {
  /** Initializes with a 64-bit seed and an optional 64-bit increment. */
  static make(seed: bigint, inc?: bigint): Rng {
    const rng = new Rng();
    if (inc !== undefined) rng.increment = enInteger(inc << 1n | 1n);
    return rng.i32(), add128(rng.state, enInteger(seed)), rng.i32(), rng;
  }
  /** Initializes from a saved state and increment. */
  static load(saved: { state: I64; increment: I64 }): Rng {
    const rng = new Rng();
    return rng.state = saved.state, rng.increment = saved.increment, rng;
  }
  /** Inner state, should be initialized to the generator's starting point. */
  private state: I64 = { hi: 0, lo: 0 };
  /** Step taken on each iteration, with an arbitrary default value. */
  private increment: I64 = { hi: 335903614, lo: 4150755663 };
  /** Saves a copy of the state and increment. */
  save(): { state: I64; increment: I64 } {
    return {
      state: { hi: this.state.hi, lo: this.state.lo },
      increment: { hi: this.increment.hi, lo: this.increment.lo },
    };
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
  /** Yields the next signed 32-bit integer. */
  next(): IteratorResult<number, never> {
    return { value: this.i32(), done: false };
  }
}
