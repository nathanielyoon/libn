import { no, type Ok, ok, type Or } from "./or.ts";

/** Aggregates results. */
export const join = <const A extends [Or, ...Or[]]>(
  $: A,
): Or<A, { [B in keyof A]: Ok<A[B]> }> => {
  const oks = Array($.length) as { [B in keyof A]: Ok<A[B]> };
  let z = 0;
  do if ($[z].is) oks[z] = $[z].of;
  else return no($); while (++z < $.length);
  return ok(oks);
};
const sync = <A, B, C = never>(
  $: A | Promise<A>,
  use: ($: A) => B | Promise<B>,
  or?: ($: unknown) => C,
) => $ instanceof Promise ? $.then(use).catch(or) : use($);
/** Try-catches a possibly-throwing function. */
export const safe =
  ((unsafe: ($: any) => any, or?: ($: any, thrown: unknown) => any) =>
  ($: any) => {
    try {
      return sync(unsafe($), ok, async (cause) => {
        if (or) return no(await or($, cause));
        return no(cause instanceof Error ? cause : Error("", { cause }));
      });
    } catch (cause) {
      if (or) return sync(or($, cause), no);
      return no(cause instanceof Error ? cause : Error("", { cause }));
    }
  }) as {
    <A, B, C = Error>(
      unsafe: B extends Promise<any> ? never : ($: A) => B,
      or?: C extends Promise<any> ? never : ($: A, cause: unknown) => C,
    ): ($: A) => Or<C, B>;
    <A, B, C = Error>(
      unsafe: ($: A) => Promise<B>,
      or?: ($: A, cause: unknown) => C | Promise<C>,
    ): ($: A) => Promise<Or<C, B>>;
  };
/** Runs an imperative block, returning failures early. */
export const exec = ((block: () => Generator<Or> | AsyncGenerator<Or>) => {
  const generator = block();
  const next = ($?: any): Or | Promise<Or> =>
    sync(generator.next($), ({ done, value }): Or | Promise<Or> => {
      if (done) return ok(value);
      else if (value.is) return next(value.of);
      return value;
    });
  return next();
}) as {
  <A, B, C>(block: () => Generator<Or<A, B>, C, B>): Or<A, C>;
  <A, B, C>(block: () => AsyncGenerator<Or<A, B>, C, B>): Promise<Or<A, C>>;
};
