import { no, ok, type Or } from "./or.ts";

/** @internal */
type When<A, B, C> = C extends false ? A : C extends true ? B : A | B;
/** Maybe asynchronous. */
export type Both<A = unknown> = Promise<A> | A;
/** Not asynchronous. */
export type Sync<A> = A extends Promise<any> ? never : A;
/** Chainable result type. */
export class Result<A = any, B = any, C extends boolean = boolean> {
  /** Creates an asynchronous failure. */
  static no<const A>($: Promise<A>): Result<A, never, true>;
  /** Creates a synchronous failure. */
  static no<const A>($: Sync<A>): Result<A, never, false>;
  /** Creates a failure. */
  static no<const A>($: Both<A>): Result<A, never, boolean>;
  static no<const A>($: A): Result {
    return $ instanceof Promise ? new Result($.then(no)) : new Result($, false);
  }
  /** Creates an asynchronous failure. */
  static ok<const A>($: Promise<A>): Result<never, A, true>;
  /** Creates a synchronous failure. */
  static ok<const A>($: Sync<A>): Result<never, A, false>;
  /** Creates a failure. */
  static ok<const A>($: Both<A>): Result<never, A, boolean>;
  static ok<const A>($: A): Result {
    return $ instanceof Promise ? new Result($.then(ok)) : new Result($, true);
  }
  /** Creates an asynchronous result. */
  static or<const A, const B>($: Promise<Or<A, B>>): Result<A, B, true>;
  /** Creates a synchronous result. */
  static or<const A, const B>($: Or<A, B>): Result<A, B, false>;
  /** Creates a result. */
  static or<const A, const B>($: Both<Or<A, B>>): Result<A, B, boolean>;
  static or($: Both<Or>): Result {
    return $ instanceof Promise ? new Result($) : new Result($.value, $.state);
  }
  // Even if some steps are async, this might not be defined, since the chain
  // might've short-circuited before getting there.
  private next?: Promise<Or>;
  /** Instantiates a failure. */
  private constructor(value: A, state: false);
  /** Instantiates a success. */
  private constructor(value: B, state: true);
  /** Instantiates a failure or success. */
  private constructor(value: A | B, state: boolean);
  /** Instantiates a promised failure or success. */
  private constructor(value: Promise<Or<A, B>>);
  // This class isn't publicly accessible since the constructor can't define the
  // free-floating is-async generic. Separate functions are exposed that account
  // for it when calling the constructor, and type-assert the return.
  private constructor(private value: any, private state?: boolean) {
    if (state === undefined && value instanceof Promise) this.next = value;
  }
  /** Yields itself, for delegation in generator functions. */
  protected *[Symbol.iterator](): Iterator<Result<A, B, C>, B> {
    return yield this;
  }
  /** Applies asynchronous functions. */
  fmap<D, E = A>(
    ifOk: ($: B) => Promise<D>,
    ifNo: ($: A) => Promise<E>,
  ): Result<E, D, true>;
  /** Applies synchronous functions. */
  fmap<D, E = A>(
    ifOk: ($: B) => Sync<D>,
    ifNo?: ($: A) => Sync<E>,
  ): Result<E, D, C>;
  /** Applies functions. */
  fmap<D, E = A>(
    ifOk: ($: B) => Both<D>,
    ifNo?: ($: A) => Both<E>,
  ): Result<E, D, When<boolean, C, C>>;
  fmap(ifOk: ($: B) => Both, ifNo?: ($: A) => Both): Result {
    if (this.next) {
      return new Result(this.next.then(async ({ state, value }) => ({
        state,
        value: state ? await ifOk(value) : ifNo ? await ifNo(value) : value,
      })));
    }
    let to, state; // need to keep state as separate variable to satisfy union
    if (this.state) to = ifOk(this.value), state = true;
    else if (ifNo) to = ifNo(this.value), state = false;
    else return this;
    return to instanceof Promise
      ? new Result(to.then((value) => ({ state, value })))
      : new Result(to, state);
  }
  /** Chains asynchronous functions. */
  bind<D, E, F = D, G = E>(
    ifOk: ($: B) => Promise<Result<D, E, boolean>> | Result<D, E, true>,
    ifNo: ($: A) => Promise<Result<F, G, boolean>> | Result<D, E, true>,
  ): Result<A | D | F, E | G, true>;
  /** Chains synchronous functions. */
  bind<D, E, F = D, G = E>(
    ifOk: ($: B) => Result<D, E, false>,
    ifNo?: ($: A) => Result<F, G, false>,
  ): Result<A | D | F, E | G, C>;
  /** Chains functions. */
  bind<D, E, F = D, G = E>(
    ifOk: ($: B) => Both<Result<D, E, boolean>>,
    ifNo?: ($: A) => Both<Result<F, G, boolean>>,
  ): Result<A | D | F, E | G, When<boolean, C, C>>;
  bind(ifOk: ($: B) => Both<Result>, ifNo?: ($: A) => Both<Result>): Result {
    if (this.next) {
      return new Result(this.next.then(async ($) => {
        if ($.state) return (await ifOk($.value)).either;
        else if (ifNo) return (await ifNo($.value)).either;
        return $;
      }));
    }
    let to;
    if (this.state) to = ifOk(this.value);
    else if (ifNo) to = ifNo(this.value);
    else return this;
    return to instanceof Promise ? new Result(to.then(($) => $.either)) : to;
  }
  /** Possibly-promised discriminated union. */
  get either(): When<Or<A, B>, Promise<Or<A, B>>, C> {
    return (this.next ?? { state: this.state, value: this.value }) as any;
  }
  /** Extracts the inner value, and optionally asserts the state. */
  unwrap<D extends boolean>(
    onlyIf?: D,
  ): When<When<A, B, D>, Promise<When<A, B, D>>, C> {
    if (this.next) {
      return this.next.then(({ state, value }) => {
        // Comparing `only_if !== state` would throw when there's no argument
        // (i.e. `undefined !== true` and `undefined !== false`).
        if (onlyIf === !state) throw Error(`${state}`, { cause: value });
        return value;
      }) as any;
      // See above.
    } else if (onlyIf === !this.state) {
      throw Error(`${this.state}`, { cause: this.value });
    }
    return this.value;
  }
}
