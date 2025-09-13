/** Raw success or failure. */
export type Result<A, B> =
  | { state: false; value: A }
  | { state: true; value: B };
/** Result type. */
export class Or<A = any, B = any> {
  private promise?: Promise<Result<any, any>>;
  /** Creates a failure. */
  constructor(state: false, value: A);
  /** Creates a success. */
  constructor(state: true, value: B);
  /** Creates a failure or success. */
  constructor(state: boolean, value: A | B);
  /** Creates a promised failure or success. */
  constructor(state: null, value: Promise<Result<A, B>>);
  constructor(private state: boolean | null, private value: any) {
    if (state === null && value instanceof Promise) this.promise = value;
  }
  /** Promises a result. */
  private await(then: ($: Result<A, B>) => Promise<Result<any, any>>): Or {
    return new Or(null, this.promise?.then(then) ?? then(this.result));
  }
  /** Just yields itself, for delegation in generator functions. */
  protected *[Symbol.iterator](): Iterator<Or<A, B>, B> {
    return yield this;
  }
  /** Applies functions to the inner value. */
  fmap<C, D = A>(if_ok: ($: B) => C, if_no?: ($: A) => D): Or<D, C> {
    if (this.promise) return this.fmap_async(if_ok, if_no);
    if (this.state) return new Or(true, if_ok(this.value));
    if (if_no) return new Or(false, if_no(this.value));
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
      $.state ? (await or($.value)).result_async : $
    );
  }
  /** Extracts the result as a discriminated union. */
  get result(): Result<A, B> {
    if (this.promise) throw Error("result is asynchronous, use result_async");
    return { state: this.state!, value: this.value };
  }
  /** Awaits the result as a discriminated union. */
  get result_async(): Promise<Result<A, B>> {
    return this.promise ??
      Promise.resolve({ state: this.state!, value: this.value });
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
/** Creates a failure. */
export const no = <const A = void>($?: A): Or<A, never> => new Or(false, $!);
/** Creates a success. */
export const ok = <const A = void>($?: A): Or<never, A> => new Or(true, $!);
/** Converts a result. */
export const or = (($: Result<any, any>) => new Or($.state, $.value)) as {
  <const A, const B>($: Result<A, B>): Or<A, B>;
  <const A extends Result<any, any>>($: A): Or<
    Extract<A, { state: false }>["value"],
    Extract<A, { state: true }>["value"]
  >;
};
