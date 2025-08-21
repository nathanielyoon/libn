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
export const run = <A extends Or, B>($: Generator<A, B, Ok<A>>): Or<No<A>, B> =>
  function runner({ done, value }: IteratorResult<A, B>): Or<No<A>, B> {
    if (done) return ok(value);
    return value.is ? runner($.next(value.or)) : value;
  }($.next());
/** Chains unary result-returning functions. */
export const pipe = (($: any, ...$$: (($: any) => Or)[]) => {
  let z = 0;
  do $ = $$[z]($); while ($.ok && ($ = $.is, ++z < $$.length));
  return $;
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
