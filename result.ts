/**
 * Result type.
 * @module result
 *
 * @example
 * ```ts
 * import { no, ok } from "@nyoon/lib/result";
 * import { assert } from "jsr:@std/assert@^1.0.14";
 *
 * const base = Math.random() * 4;
 * const { result } = ok(base)
 *   .fmap(($) => $ & 3)
 *   .assert(($) => $ % 4 === 0)
 *   .assert(Number.isInteger)
 *   .bind(($) => $ & 1 ? no("odd") : ok($))
 *   .lift(($) => $ || null, "zero");
 * if (result.is) assert(result.value === 2);
 * else if (result.value === "zero") assert(base < 1);
 * else assert(base >= 0.25 && base < 0.5 || base >= 0.75);
 * ```
 */

/** Result type, either a {@linkcode A | failure} or {@linkcode B | success}. */
export class Or<A = any, B = any> {
  /** Success! */
  constructor(is: false, as: A);
  /** Failure! */
  constructor(is: true, as: B);
  /** Creates a success or failure. */
  constructor(private is: boolean, private value: any) {}
  protected *[Symbol.iterator](): Iterator<Or<A, B>, B> {
    return yield this;
  }
  private copy($: Or): Or {
    return this.is = $.is, this.value = $.value, this;
  }
  /** Mutates a successful result. */
  fmap<C>(ok: ($: B) => C): Or<A, C> {
    return this.is && (this.value = ok(this.value)), this as any;
  }
  /** Maps a successful result to a new result. */
  bind<C, D>(ok: ($: B) => Or<C, D>): Or<A | C, D> {
    return this.is ? this.copy(ok(this.value)) : this as any;
  }
  /** Mutates a successful result, and fails if the new value is nullish. */
  lift<C, const D = never>(ok: ($: B) => C, no?: D): Or<A | D, NonNullable<C>> {
    if (this.is) {
      this.value = ok(this.value), this.value ??= (this.is = false, no);
    }
    return this as any;
  }
  /** Restricts a successful result with a type predicate. */
  assert<C extends B = B, const D = never>(
    is: (($: B) => $ is C) | (($: B) => any),
    no?: D,
  ): Or<A | D, C> {
    if (this.is) (this.is = is(this.value)) || (this.value = no);
    return this as any;
  }
  /** Runs an imperative block, exiting early on failure. */
  do<C, D, E>(block: ($: B) => Generator<Or<C, D>, E>): Or<A | C, E> {
    if (!this.is) return this as any;
    const a = block(this.value);
    const b = ($: IteratorResult<Or<C, D>, E>): Or<C, E> =>
      $.done ? ok($.value) : $.value.bind(($) => b(a.next($)));
    return b(a.next());
  }
  /** Catches a possibly-throwing function. */
  try<C, const D = Error>(ok: ($: B) => C, no?: ($: any) => D): Or<A | D, C> {
    try {
      return this.fmap(ok);
    } catch (thrown) {
      this.is = false;
      this.value = no?.(thrown) ?? Error(undefined, { cause: thrown });
      return this as any;
    }
  }
  /** Checks for failure. */
  is_no(): this is No<A> {
    return !this.is;
  }
  /** Checks for success. */
  is_ok(): this is Ok<B> {
    return this.is;
  }
  /** Gets the result's value, optionally throwing if the state is wrong. */
  unwrap(): A | B;
  unwrap(only_if: false): A;
  unwrap(only_if: true): B;
  unwrap(only_if?: boolean): A | B {
    if (only_if === !this.is) throw Error(`${this.is}`, { cause: this.value });
    return this.value;
  }
  /** Gets the result as a discriminated union. */
  get result(): { is: false; value: A } | { is: true; value: B } {
    return { is: this.is, value: this.value };
  }
  /** Applies a function based on the result state. */
  match<C>(no: ($: A | B) => C): Or<C, C>;
  match<C, D>(no: ($: A) => C, ok: ($: B) => D): Or<C | D>;
  match<C, D>(no: ($: A) => C, ok?: ($: B) => D): Or<C | D> {
    this.value = this.is && ok ? ok(this.value) : no(this.value);
    return this as any;
  }
}
/** Failure! */
export type No<A = any> = Or<A, never>;
/** Success! */
export type Ok<A = any> = Or<never, A>;
/** Creates a failure. */
export const no = <const A = void>($?: A): No<A> => new Or(false, $!);
/** Creates a success. */
export const ok = <const A = void>($?: A): Ok<A> => new Or(true, $!);
