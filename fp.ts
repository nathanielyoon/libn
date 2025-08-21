/** Result of an operation. */
export type Or<A = any, B = any> = No<A, B> | Ok<A, B>;
/** Success of an operation. */
export type No<A = any, B = never> = {
  [Symbol.iterator]: () => Iterator<No<A, B>, B>;
  is: false;
  or: A;
};
/** Failure of an operation. */
export type Ok<A = never, B = any> = {
  [Symbol.iterator]: () => Iterator<Ok<A, B>, B>;
  is: true;
  or: B;
};
type Nos<A extends Or> = Extract<A, No>;
type Oks<A extends Or> = Extract<A, Ok>;
function* iterator<A extends Or>(this: A): Iterator<A, Oks<A>["or"]> {
  return yield this;
}
const or = (is: boolean): any =>
  Object.assign(($?: any) => ({ is, or: $, [Symbol.iterator]: iterator }), {
    [Symbol.hasInstance]: ($: Or) => $.is === is,
  });
/** Wraps a failure. */
export const no:
  & { [Symbol.hasInstance]: <A extends Or>($: A) => $ is Extract<A, No> }
  & (<const A = never, B = never>($?: A) => No<A, B>) = or(false);

/** Wraps a success. */
export const ok:
  & { [Symbol.hasInstance]: <A extends Or>($: A) => $ is Extract<A, Ok> }
  & (<A = never, const B = never>($?: B) => Ok<A, B>) = or(true);
/** Wraps a possibly-undefined value. */
export const maybe = <const A, const B extends {}>(error: A, $?: B): Or<A, B> =>
  $ == null ? no(error) : ok($);
/** Runs operations with do-notation. */
export const run = <A extends Or, B>($: Generator<A, B>): Or<Nos<A>["or"], B> =>
  function runner({ done, value }: IteratorResult<A, B>) {
    if (done) return ok(value);
    if (value.is) return runner($.next(value.or));
    return value;
  }($.next());
/** Runs possibly-asynchronous operations with do-notation. */
export const run_async = async <A extends Or, B>(
  $: AsyncGenerator<A, B>,
): Promise<Or<Nos<A>["or"], B>> =>
  async function runner({ done, value }: IteratorResult<A, B>) {
    if (done) return ok(value);
    if (value.is) return runner(await $.next());
    return value;
  }(await $.next());
/** Chains unary result-returning functions. */
export const pipe = (($: any, ...$$: (($: any) => Or)[]) => {
  for (let z = 0, a; z < $$.length; $ = a.or, ++z) {
    if (!(a = $$[z]($)).is) return $;
  }
  return ok($);
}) as {
  <A, B extends Or>($: A, ab: ($: A) => B): B;
  <A, B extends Or, C extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Oks<B>["or"]) => C,
  ): Nos<B> | C;
  <A, B extends Or, C extends Or, D extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Oks<B>["or"]) => C,
    cd: ($: Oks<C>["or"]) => D,
  ): Nos<B | C> | D;
  <A, B extends Or, C extends Or, D extends Or, E extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Oks<B>["or"]) => C,
    cd: ($: Oks<C>["or"]) => D,
    de: ($: Oks<D>["or"]) => E,
  ): Nos<B | C | D> | E;
  <A, B extends Or, C extends Or, D extends Or, E extends Or, F extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Oks<B>["or"]) => C,
    cd: ($: Oks<C>["or"]) => D,
    de: ($: Oks<D>["or"]) => E,
    ef: ($: Oks<E>["or"]) => F,
  ): Nos<B | C | D | E> | F;
  <
    A,
    B extends Or,
    C extends Or,
    D extends Or,
    E extends Or,
    F extends Or,
    G extends Or,
  >(
    $: A,
    ab: ($: A) => B,
    bc: ($: Oks<B>["or"]) => C,
    cd: ($: Oks<C>["or"]) => D,
    de: ($: Oks<D>["or"]) => E,
    ef: ($: Oks<E>["or"]) => F,
    fg: ($: Oks<F>["or"]) => G,
  ): Nos<B | C | D | E | F> | G;
};
/** Chains possibly-asynchronous unary result-returning functions. */
export const pipe_async =
  (async ($: any, ...$$: (($: any) => Or | Promise<Or>)[]) => {
    for (let z = 0, a; z < $$.length; $ = a.or, ++z) {
      if (!(a = await $$[z]($)).is) return $;
    }
    return ok($);
  }) as {
    <A, B extends Or | Promise<Or>>($: A, ab: ($: A) => B): Promise<Awaited<B>>;
    <A, B extends Or | Promise<Or>, C extends Or | Promise<Or>>(
      $: A,
      ab: ($: A) => B,
      bc: ($: Oks<Awaited<B>>["or"]) => C,
    ): Promise<Nos<Awaited<B>> | Awaited<C>>;
    <
      A,
      B extends Or | Promise<Or>,
      C extends Or | Promise<Or>,
      D extends Or | Promise<Or>,
    >(
      $: A,
      ab: ($: A) => B,
      bc: ($: Oks<Awaited<B>>["or"]) => C,
      cd: ($: Oks<Awaited<C>>["or"]) => D,
    ): Promise<Nos<Awaited<B | C>> | Awaited<D>>;
    <
      A,
      B extends Or | Promise<Or>,
      C extends Or | Promise<Or>,
      D extends Or | Promise<Or>,
      E extends Or | Promise<Or>,
    >(
      $: A,
      ab: ($: A) => B,
      bc: ($: Oks<Awaited<B>>["or"]) => C,
      cd: ($: Oks<Awaited<C>>["or"]) => D,
      de: ($: Oks<Awaited<D>>["or"]) => E,
    ): Promise<Nos<Awaited<B | C | D>> | Awaited<E>>;
    <
      A,
      B extends Or | Promise<Or>,
      C extends Or | Promise<Or>,
      D extends Or | Promise<Or>,
      E extends Or | Promise<Or>,
      F extends Or | Promise<Or>,
    >(
      $: A,
      ab: ($: A) => B,
      bc: ($: Oks<Awaited<B>>["or"]) => C,
      cd: ($: Oks<Awaited<C>>["or"]) => D,
      de: ($: Oks<Awaited<D>>["or"]) => E,
      ef: ($: Oks<Awaited<E>>["or"]) => F,
    ): Promise<Nos<Awaited<B | C | D | E>> | Awaited<F>>;
    <
      A,
      B extends Or | Promise<Or>,
      C extends Or | Promise<Or>,
      D extends Or | Promise<Or>,
      E extends Or | Promise<Or>,
      F extends Or | Promise<Or>,
      G extends Or | Promise<Or>,
    >(
      $: A,
      ab: ($: A) => B,
      bc: ($: Oks<Awaited<B>>["or"]) => C,
      cd: ($: Oks<Awaited<C>>["or"]) => D,
      de: ($: Oks<Awaited<D>>["or"]) => E,
      ef: ($: Oks<Awaited<E>>["or"]) => F,
      fg: ($: Oks<Awaited<F>>["or"]) => G,
    ): Promise<Nos<Awaited<B | C | D | E | F>> | Awaited<G>>;
  };
