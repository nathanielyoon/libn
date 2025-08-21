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
/** Result of an operation. */
export type Or<A = any, B = any> = No<A, B> | Ok<A, B>;
/** Unwrapped failure. */
export type Failure<A extends Or> = Extract<A, { is: false }>["or"];
/** Unwrapped success. */
export type Success<A extends Or> = Extract<A, { is: true }>["or"];
function* iterator<A extends Or>(this: A): Iterator<A, Success<A>> {
  return yield this;
}
/** Wraps a failure. */
export const no = <const A = never, B = never>($?: A): No<A, B> => (
  { [Symbol.iterator]: iterator, is: false, or: $! }
);
/** Wraps a success. */
export const ok = <A = never, const B = never>($?: B): Ok<A, B> => (
  { [Symbol.iterator]: iterator, is: true, or: $! }
);
/** Runs operations with do-notation. */
export const run = <A extends Or, B>($: Generator<A, B>): Or<Failure<A>, B> =>
  function runner({ done, value }: IteratorResult<A, B>) {
    if (done) return ok(value);
    if (value.is) return runner($.next(value.or));
    return value;
  }($.next());
export const run_async = async <A extends Or, B>(
  $: AsyncGenerator<A, B, Success<A>>,
): Promise<Or<Failure<A>, B>> =>
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
    bc: ($: Success<B>) => C,
  ): Failure<B> | C;
  <A, B extends Or, C extends Or, D extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Success<B>) => C,
    cd: ($: Success<C>) => D,
  ): Failure<B | C> | D;
  <A, B extends Or, C extends Or, D extends Or, E extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Success<B>) => C,
    cd: ($: Success<C>) => D,
    de: ($: Success<D>) => E,
  ): Failure<B | C | D> | E;
  <A, B extends Or, C extends Or, D extends Or, E extends Or, F extends Or>(
    $: A,
    ab: ($: A) => B,
    bc: ($: Success<B>) => C,
    cd: ($: Success<C>) => D,
    de: ($: Success<D>) => E,
    ef: ($: Success<E>) => F,
  ): Failure<B | C | D | E> | F;
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
    bc: ($: Success<B>) => C,
    cd: ($: Success<C>) => D,
    de: ($: Success<D>) => E,
    ef: ($: Success<E>) => F,
    fg: ($: Success<F>) => G,
  ): Failure<B | C | D | E | F> | G;
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
      bc: ($: Success<Awaited<B>>) => C,
    ): Failure<Awaited<B>> | C;
    <
      A,
      B extends Or | Promise<Or>,
      C extends Or | Promise<Or>,
      D extends Or | Promise<Or>,
    >(
      $: A,
      ab: ($: A) => B,
      bc: ($: Success<Awaited<B>>) => C,
      cd: ($: Success<Awaited<C>>) => D,
    ): Failure<Awaited<B | C>> | D;
    <
      A,
      B extends Or | Promise<Or>,
      C extends Or | Promise<Or>,
      D extends Or | Promise<Or>,
      E extends Or | Promise<Or>,
    >(
      $: A,
      ab: ($: A) => B,
      bc: ($: Success<Awaited<B>>) => C,
      cd: ($: Success<Awaited<C>>) => D,
      de: ($: Success<Awaited<D>>) => E,
    ): Failure<Awaited<B | C | D>> | E;
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
      bc: ($: Success<Awaited<B>>) => C,
      cd: ($: Success<Awaited<C>>) => D,
      de: ($: Success<Awaited<D>>) => E,
      ef: ($: Success<Awaited<E>>) => F,
    ): Failure<Awaited<B | C | D | E>> | F;
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
      bc: ($: Success<Awaited<B>>) => C,
      cd: ($: Success<Awaited<C>>) => D,
      de: ($: Success<Awaited<D>>) => E,
      ef: ($: Success<Awaited<E>>) => F,
      fg: ($: Success<Awaited<F>>) => G,
    ): Failure<Awaited<B | C | D | E | F>> | G;
  };
