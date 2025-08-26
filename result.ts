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
 *   .bind(($) => $ & 1 ? no("odd") : ok($))
 *   .lift("zero", ($) => $ || null);
 * if (result.is) assert(result.value === 2);
 * else if (result.value === "zero") assert(base < 1);
 * else assert(base >= 0.25 && base < 0.5 || base >= 0.75);
 * ```
 */

/** Result type, either a {@linkcode A | failure} or {@linkcode B | success}. */
export class Or<A = any, B = any> {
  /** Success! */
  constructor(state: false, value: A);
  /** Failure! */
  constructor(state: true, value: B);
  /** Creates a success or failure. */
  constructor(private state: boolean, private value: any) {}
  protected *[Symbol.iterator](): Iterator<Or<A, B>, B> {
    return yield this;
  }
  /** Maps a successful result. */
  fmap<C>($: ($: B) => C): Or<A, C> {
    return this.state && (this.value = $(this.value)), this as Or;
  }
  /** Maps a successful result to a new result. */
  bind<C, D>($: ($: B) => Or<C, D>): Or<A | C, D> {
    return this.state ? $(this.value) : this as Or;
  }
  /** Tests a successful result. */
  lift(): Or<A | null, NonNullable<B>>;
  lift<const C>($: C): Or<A | C, NonNullable<B>>;
  lift<const C, D extends B>($: C, test: ($: B) => $ is D): Or<A | C, D>;
  lift<const C>($: C, test: ($: B) => any): Or<A | C, B>;
  lift($?: unknown, test?: ($: B) => any) {
    if (this.state && (test ? !test(this.value) : this.value == null)) {
      this.state = false, this.value = $ ?? null;
    }
    return this as Or;
  }
  /** Runs an imperative block, exiting early on failure. */
  do<C, D, E>(block: ($: B) => Generator<Or<C, D>, E>): Or<A | C, E> {
    if (!this.state) return this as Or;
    const a = block(this.value);
    const b = ($: IteratorResult<Or<C, D>, E>): Or<C, E> =>
      $.done ? ok($.value) : $.value.bind(($) => b(a.next($)));
    return b(a.next());
  }
  /** Catches a possibly-throwing function. */
  try<C, D = Error>(tryer: ($: B) => C, catcher?: ($: any) => D): Or<A | D, C> {
    try {
      return this.fmap(tryer);
    } catch (thrown) {
      this.state = false;
      this.value = catcher?.(thrown) ?? Error(undefined, { cause: thrown });
      return this as Or;
    }
  }
  /** Checks for failure. */
  is_no(): this is No<A> {
    return !this.state;
  }
  /** Checks for success. */
  is_ok(): this is Ok<B> {
    return this.state;
  }
  /** Gets the result's value, optionally throwing if the state is wrong. */
  unwrap(): A | B;
  unwrap(only_if: false): A;
  unwrap(only_if: true): B;
  unwrap<C extends boolean>($?: C) {
    if ($ === !this.state) throw Error(undefined, { cause: this.value });
    return this.value;
  }
  /** Gets the result as a discriminated union. */
  get result(): { state: false; value: A } | { state: true; value: B } {
    return { state: this.state, value: this.value };
  }
  /** Applies a function based on the result state. */
  match<C, D = C>(if_no: ($: A) => C, if_ok?: ($: B) => D): Or<C, D> {
    this.value = this.state && if_ok ? if_ok(this.value) : if_no(this.value);
    return this as Or;
  }
}
/** Dang! */
export type No<A = any> = Or<A, never>;
/** Nice! */
export type Ok<A = any> = Or<never, A>;
/** Creates a failure. */
export const no = <const A = void>($?: A): No<A> => new Or(false, $!);
/** Creates a success. */
export const ok = <const A = void>($?: A): Ok<A> => new Or(true, $!);
