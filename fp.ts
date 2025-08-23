/** Result type. */
export class Or<A = any, B = any> {
  /** Success! */
  constructor(state: false, value: A);
  /** Failure! */
  constructor(state: true, value: B);
  /** Creates a success or failure. */
  constructor(private state: boolean, private inner: any) {}
  protected *[Symbol.iterator](): Iterator<Or<A, B>, B> {
    return yield this;
  }
  /** Maps successes. */
  fmap<C>(ok: ($: B) => C): Or<A, C> { // @ts-expect-error
    return this.state && (this.inner = ok(this.inner)), this;
  }
  /** Flat-maps successes. */
  bind<C, D>(ok: ($: B) => Or<C, D>): Or<A | C, D> { // @ts-expect-error
    return this.state ? this.copy(ok(this.inner)) : this;
  }
  /** Maps successes, into failures if the result is nullish. */
  lift<C, D = never>(ok: ($: B) => C, no?: D): Or<A | D, NonNullable<C>> {
    if (this.state) {
      this.inner = ok(this.inner), this.inner ??= (this.state = false, no);
    } // @ts-expect-error
    return this;
  }
  /** Runs an imperative block, exiting early on failure. */
  do<C, D, E>(block: ($: B) => Generator<Or<C, D>, E>): Or<A | C, E> { // @ts-expect-error
    if (!this.state) return this;
    const a = block(this.inner);
    const b = ({ done, value }: IteratorResult<Or<C, D>, E>): Or<C, E> =>
      done ? ok(value) : value.bind(($) => b(a.next($)));
    return b(a.next());
  }
  /** Maps states. */
  match<C, D>(no: ($: A) => C, ok: ($: B) => D): Or<C, D> { // @ts-expect-error
    return this.inner = this.state ? ok(this.inner) : no(this.inner), this;
  }
  /** Checks the state. */
  is(): this is Ok<B> {
    return this.state;
  }
  /** Gets the successful value or throws. */
  unwrap(wrap?: (no: A) => any): B {
    if (this.state) return this.inner;
    throw wrap ? wrap(this.inner) : this.inner;
  }
}
/** Failure! */
export type No<A = any> = Or<A, never>;
/** Success! */
export type Ok<A = any> = Or<never, A>;
/** Creates a failure. */
export const no = <const A = never>($?: A): No<A> => new Or(false, $!);
/** Creates a success. */
export const ok = <const A = never>($?: A): Ok<A> => new Or(true, $!);
