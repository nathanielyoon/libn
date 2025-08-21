/** Result of an operation. */
export type Or<A = any, B = any> =
  & { [Symbol.iterator]: () => Iterator<Or<A, B>, B> }
  & ({ is: false; or: A } | { is: true; or: B });
/** Unwrapped failure. */
export type No<A extends Or> = Extract<A, { is: false }>["or"];
/** Unwrapped success. */
export type Ok<A extends Or> = Extract<A, { is: true }>["or"];
function* iterator<A, B>(this: Or<A, B>): Iterator<Or<A, B>, B> {
  return yield this;
}
/** Wraps a failure. */
export const no = <const A = never, B = never>($?: A): Or<A, B> => (
  { [Symbol.iterator]: iterator, is: false, or: $! }
);
/** Wraps a success. */
export const ok = <A = never, const B = never>($?: B): Or<A, B> => (
  { [Symbol.iterator]: iterator, is: true, or: $! }
);
/** Runs operations with do-notation. */
export const run = <A extends Or, B>($: Generator<A, B>): Or<No<A>, B> =>
  function runner({ done, value }: IteratorResult<A, B>) {
    if (done) return ok(value);
    if (value.is) return runner($.next(value.or));
    return value;
  }($.next());
export const run_async = async <A extends Or, B>(
  $: AsyncGenerator<A, B, Ok<A>>,
): Promise<Or<No<A>, B>> =>
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
    bc: ($: Ok<B>) => C,
  ): No<B> | C;
  <A, B extends Or, C extends Or, D extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Ok<B>) => C,
    cd: ($: Ok<C>) => D,
  ): No<B | C> | D;
  <A, B extends Or, C extends Or, D extends Or, E extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Ok<B>) => C,
    cd: ($: Ok<C>) => D,
    de: ($: Ok<D>) => E,
  ): No<B | C | D> | E;
  <A, B extends Or, C extends Or, D extends Or, E extends Or, F extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Ok<B>) => C,
    cd: ($: Ok<C>) => D,
    de: ($: Ok<D>) => E,
    ef: ($: Ok<E>) => F,
  ): No<B | C | D | E> | F;
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
    bc: ($: Ok<B>) => C,
    cd: ($: Ok<C>) => D,
    de: ($: Ok<D>) => E,
    ef: ($: Ok<E>) => F,
    fg: ($: Ok<F>) => G,
  ): No<B | C | D | E | F> | G;
};
export const pipe_async =
  (async ($: any, ...$$: (($: any) => Or | Promise<Or>)[]) => {
    for (let z = 0, a; z < $$.length; $ = a.or, ++z) {
      if (!(a = await $$[z]($)).is) return $;
    }
    return ok($);
  }) as {
    <A, B extends Or | Promise<Or>>($: A, ab: ($: A) => B): B;
    <A, B extends Or | Promise<Or>, C extends Or | Promise<Or>>(
      $: A,
      ab: ($: A) => B,
      bc: ($: Ok<Awaited<B>>) => C,
    ): No<Awaited<B>> | C;
    <
      A,
      B extends Or | Promise<Or>,
      C extends Or | Promise<Or>,
      D extends Or | Promise<Or>,
    >(
      $: A,
      ab: ($: A) => B,
      bc: ($: Ok<Awaited<B>>) => C,
      cd: ($: Ok<Awaited<C>>) => D,
    ): No<Awaited<B | C>> | D;
    <
      A,
      B extends Or | Promise<Or>,
      C extends Or | Promise<Or>,
      D extends Or | Promise<Or>,
      E extends Or | Promise<Or>,
    >(
      $: A,
      ab: ($: A) => B,
      bc: ($: Ok<Awaited<B>>) => C,
      cd: ($: Ok<Awaited<C>>) => D,
      de: ($: Ok<Awaited<D>>) => E,
    ): No<Awaited<B | C | D>> | E;
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
      bc: ($: Ok<Awaited<B>>) => C,
      cd: ($: Ok<Awaited<C>>) => D,
      de: ($: Ok<Awaited<D>>) => E,
      ef: ($: Ok<Awaited<E>>) => F,
    ): No<Awaited<B | C | D | E>> | F;
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
      bc: ($: Ok<Awaited<B>>) => C,
      cd: ($: Ok<Awaited<C>>) => D,
      de: ($: Ok<Awaited<D>>) => E,
      ef: ($: Ok<Awaited<E>>) => F,
      fg: ($: Ok<Awaited<F>>) => G,
    ): No<Awaited<B | C | D | E | F>> | G;
  };
