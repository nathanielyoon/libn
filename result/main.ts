/**
 * Result type.
 * @module result
 *
 * @example
 * ```ts
 * import { lift, no, ok } from "@nyoon/lib/result";
 * import { assert } from "jsr:@std/assert@^1.0.14";
 *
 * const base = Math.random();
 * const { result } = ok(base * 4)
 *   .fmap(($) => $ & 3)
 *   .bind(($) => $ & 1 ? no("odd") : ok($ || null))
 *   .bind(lift("zero"));
 *
 * if (result.state) assert(result.value === 2);
 * else if (result.value === "zero") assert(base < 1);
 * else assert(base >= 0.25 && base < 0.5 || base >= 0.75);
 * ```
 */

/** Dang! */
export type No<A = any> = Or<A, never>;
/** Nice! */
export type Ok<A = any> = Or<never, A>;
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
  /** Applies functions to the inner value. */
  fmap<C, D = A>(if_ok: ($: B) => C, if_no?: ($: A) => D): Or<D, C> {
    if (this.state) this.value = if_ok(this.value);
    else if (if_no) this.value = if_no(this.value);
    return this as Or;
  }
  /** Maps a successful result to a new result. */
  bind<C, D>($: ($: B) => Or<C, D>): Or<A | C, D> {
    return this.state ? $(this.value) : this as Or;
  }
  /** Checks for failure. */
  is_no(): this is No<A> {
    return !this.state;
  }
  /** Checks for success. */
  is_ok(): this is Ok<B> {
    return this.state;
  }
  /** Gets the result as a discriminated union. */
  get result(): { state: false; value: A } | { state: true; value: B } {
    return { state: this.state, value: this.value };
  }
  /** Gets the result's value, optionally throwing if the state is wrong. */
  unwrap<C extends boolean>(only_if?: C):
    | (C extends false ? A : never)
    | (C extends true ? B : never) {
    if (only_if === !this.state) throw Error(undefined, { cause: this.value });
    return this.value;
  }
}
/** Creates a failure. */
export const no = <const A = void>($?: A): No<A> => new Or(false, $!);
/** Creates a success. */
export const ok = <const A = void>($?: A): Ok<A> => new Or(true, $!);
/** Runs a function if the passed-in value exists. */
export const lift = <A, const B = void, C = NonNullable<A>>(
  if_none?: B,
  if_some?: ($: NonNullable<A>) => C,
): ($: A) => Or<B, C> =>
($) => $ == null ? no(if_none) : ok(if_some ? if_some($) : $ as C);
/** Tries a possibly-throwing function. */
export const try_catch =
  <A, B, C = Error>($$: ($: A) => B, or?: ($: any) => C): ($: A) => Or<C, B> =>
  ($) => {
    try {
      return ok($$($));
    } catch (cause) {
      return no(or ? or(cause) : Error(undefined, { cause }) as C);
    }
  };
type Falsy = undefined | null | false | 0 | 0n | "";
/** Wraps a type guard. */
export const not =
  <A, B extends {}>($$: ($: A) => B | Falsy): ($: A) => Or<B, A> => ($) => {
    const a = $$($);
    return a ? no(a) : ok($);
  };
/** Executes an imperative block. */
export const run =
  <A, B, C, D>($$: ($: A) => Generator<Or<B, C>, D, C>): ($: A) => Or<B, D> =>
  ($) => {
    const a = $$($);
    const b = ($: IteratorResult<Or<B, C>, D>): Or<B, D> =>
      $.done ? ok($.value) : $.value.bind(($) => b(a.next($)));
    return b(a.next());
  };
