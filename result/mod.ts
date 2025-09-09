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
  private promise?: Promise<Result<any, any>>;
  /** Creates a failure or success. */
  constructor(value: A, state: false);
  constructor(value: B, state: true);
  constructor(value: Promise<Result<A, B>>);
  constructor(private value: any, private state = false) {
    if (value instanceof Promise) this.promise = value;
  }
  private await(then: ($: Result<A, B>) => Promise<Result<any, any>>) {
    return new Or((this.promise ?? Promise.resolve(this.result)).then(then));
  }
  /** Just yields itself, for delegation in generator functions. */
  protected *[Symbol.iterator](): Iterator<Or<A, B>, B> {
    return yield this;
  }
  /** Applies functions to the inner value. */
  fmap<C, D = A>(if_ok: ($: B) => C, if_no?: ($: A) => D): Or<D, C> {
    if (this.promise) return this.fmap_async(if_ok, if_no);
    if (this.state) return new Or(if_ok(this.value), true);
    if (if_no) return new Or(if_no(this.value), false);
    return this as Or;
  }
  /** Applies possibly-asynchronous functions to the inner value. */
  fmap_async<C, D = A>(
    if_ok: ($: B) => C | Promise<C>,
    if_no?: ($: A) => D | Promise<D>,
  ): Or<D, C> {
    return this.await(async ({ state, value }) => ({
      state,
      value: state ? await if_ok(value) : if_no ? await if_no(value) : value,
    }));
  }
  /** Maps a successful result to a new result. */
  bind<C, D>(or: ($: B) => Or<C, D>): Or<A | C, D> {
    if (this.promise) return this.bind_async(or);
    if (this.state) return or(this.value);
    return this as Or;
  }
  /** Maps a successful result to a possibly-asynchronous new result. */
  bind_async<C, D>(or: ($: B) => Or<C, D> | Promise<Or<C, D>>): Or<A | C, D> {
    return this.await(async ($) =>
      $.state ? await (await or($.value)).result_async : $
    );
  }
  /** Extracts the result as a discriminated union. */
  get result(): Result<A, B> {
    if (this.promise) throw Error("result is asynchronous, use result_async");
    return { state: this.state, value: this.value };
  }
  /** Awaits the result as a discriminated union. */
  get result_async(): Promise<Result<A, B>> {
    return this.promise ??
      Promise.resolve({ state: this.state, value: this.value });
  }
  /** Gets the result's value, optionally throwing if the state is wrong. */
  unwrap<C extends boolean>(only_if?: C):
    | (C extends false ? A : never)
    | (C extends true ? B : never) {
    if (this.promise) throw Error("result is asynchronous, use unwrap_async()");
    if (only_if === !this.state) throw Error("", { cause: this.value });
    return this.value;
  }
  /** Awaits the result's value, optionally throwing if the state is wrong. */
  async unwrap_async<C extends boolean>(only_if?: C): Promise<
    | (C extends false ? A : never)
    | (C extends true ? B : never)
  > {
    const { state, value } = await this.promise ?? await this.result_async;
    if (only_if === !state) throw Error("", { cause: value });
    return value;
  }
}
type Result<A, B> = { state: false; value: A } | { state: true; value: B };
/** Creates a failure. */
export const no = <const A = void>($?: A): Or<A, never> => new Or($!, false);
/** Creates a success. */
export const ok = <const A = void>($?: A): Or<never, A> => new Or($!, true);
/** Runs a function if the passed-in value exists. */
export const some = <A, const B = void, C = NonNullable<A>>(
  if_nullish?: B,
  if_nonnull?: ($: NonNullable<A>) => C,
): ($: A) => Or<B, C> =>
($) => $ == null ? no(if_nullish) : ok(if_nonnull ? if_nonnull($) : $ as C);
type Falsy = undefined | null | false | 0 | 0n | "";
/** Wraps a type guard. */
export const drop =
  <A, B>(not: ($: A) => B | Falsy): ($: A) => Or<B, A> => ($) => {
    const maybe_error = not($);
    return maybe_error ? no(maybe_error) : ok($);
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
    return no(if_thrown ? if_thrown(cause) : Error("", { cause }) as C);
  }
};
/** Wraps a possibly-rejecting function. */
export const save_async = <A, B, C = Error>(
  unsafe: ($: A) => B | Promise<B>,
  if_thrown?: ($: unknown) => C | Promise<C>,
): ($: A) => Promise<Or<C, B>> =>
async ($) => {
  try {
    return ok(await unsafe($));
  } catch (cause) {
    return no(if_thrown ? await if_thrown(cause) : Error("", { cause }) as C);
  }
};
/** Wraps an imperative block. */
export const exec =
  <A, B, C, D>(doer: ($: A) => Generator<Or<B, C>, D, C>): ($: A) => Or<B, D> =>
  ($) => {
    const generator = doer($);
    const next = ($: IteratorResult<Or<B, C>, D>): Or<B, D> =>
      $.done ? ok($.value) : $.value.bind(($) => next(generator.next($)));
    return next(generator.next());
  };
/** Wraps an asychronous imperative block. */
export const exec_async = <A, B, C, D>(
  doer: ($: A) => AsyncGenerator<Or<B, C>, D, C>,
): ($: A) => Promise<Or<B, D>> =>
async ($) => {
  const generator = doer($);
  const next = ($: IteratorResult<Or<B, C>, D>): Or<B, D> =>
    $.done
      ? ok($.value)
      : $.value.bind_async(async ($) => next(await generator.next($)));
  return next(await generator.next());
};
type Wrapped<A extends Or[]> = Or<
  { [B in keyof A]: A[B] extends Or<infer C, infer D> ? Result<C, D> : never },
  { [B in keyof A]: A[B] extends Or<any, infer C> ? C : A[B] }
>;
/** Wraps a list of results. */
export const wrap = <const A extends Or[]>($: A): Wrapped<A> => {
  const results = Array($.length), oks = [];
  for (let z = 0; z < $.length; ++z) {
    (results[z] = $[z].result).state && oks.push(results[z].value);
  }
  return oks.length === $.length ? ok<any>(oks) : no<any>(results);
};
/** Wraps a possibly-asynchronous list of results. */
export const wrap_async = async <const A extends Or[]>(
  $: A,
): Promise<Wrapped<A>> => {
  const promised_results = Array<Promise<Result<any, any>>>($.length);
  for (let z = 0; z < $.length; ++z) promised_results[z] = $[z].result_async;
  const results = await Promise.all(promised_results), oks = [];
  for (let z = 0; z < results.length; ++z) {
    if (results[z].state) oks.push(results[z].value);
    else return no<any>(results);
  }
  return ok<any>(oks);
};
