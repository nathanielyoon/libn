/**
 * Result type.
 *
 * @example Construction
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(no(0).result, { state: false, value: 0 });
 * assertEquals(ok(0).result, { state: true, value: 0 });
 * ```
 *
 * @module result
 */

/** Result type. */
export class Or<A = any, B = any> {
  /** Creates a failure or success. */
  constructor(state: false, value: A);
  constructor(state: true, value: B);
  constructor(private state: boolean, private value: any) {}
  /** Just yields itself, for delegation in generator functions. */
  protected *[Symbol.iterator](): Iterator<Or<A, B>, B> {
    return yield this;
  }
  /** Applies functions to the inner value. */
  fmap<C, D = A>(if_ok: ($: B) => C, if_no?: ($: A) => D): Or<D, C> {
    if (this.state) return new Or(true, if_ok(this.value));
    else if (if_no) return new Or(false, if_no(this.value));
    return this as Or;
  }
  /** Maps a successful result to a new result. */
  bind<C, D>($: ($: B) => Or<C, D>): Or<A | C, D> {
    return this.state ? $(this.value) : this as Or;
  }
  /** Extracts the result as a discriminated union. */
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
export const no = <const A = void>($?: A): Or<A, never> => new Or(false, $!);
/** Creates a success. */
export const ok = <const A = void>($?: A): Or<never, A> => new Or(true, $!);
/** Runs a function if the passed-in value exists. */
export const some = <A, const B = void, C = NonNullable<A>>(
  if_nullish?: B,
  if_nonnull?: ($: NonNullable<A>) => C,
): ($: A) => Or<B, C> =>
($) => $ == null ? no(if_nullish) : ok(if_nonnull ? if_nonnull($) : $ as C);
type Falsy = undefined | null | false | 0 | 0n | "";
/** Wraps a type guard. */
export const drop =
  <A, B extends {}>($$: ($: A) => B | Falsy): ($: A) => Or<B, A> => ($) => {
    const a = $$($);
    return a ? no(a) : ok($);
  };
/** Wraps an imperative block. */
export const exec =
  <A, B, C, D>($$: ($: A) => Generator<Or<B, C>, D, C>): ($: A) => Or<B, D> =>
  ($) => {
    const a = $$($);
    const b = ($: IteratorResult<Or<B, C>, D>): Or<B, D> =>
      $.done ? ok($.value) : $.value.bind(($) => b(a.next($)));
    return b(a.next());
  };
/** Wraps a possibly-throwing function. */
export const save = <A, B, C = Error>(
  unsafe: ($: A) => B,
  if_thrown?: ($: unknown) => C,
): ($: A) => Or<C, B> =>
($) => {
  try {
    return ok(unsafe($));
  } catch (cause) {
    return no(if_thrown ? if_thrown(cause) : Error(undefined, { cause }) as C);
  }
};
