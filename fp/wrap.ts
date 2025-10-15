import { fail, type Ok, type Or, pass } from "./or.ts";

/** Aggregates results. */
export const join = <const A extends [Or, ...Or[]]>(
  $: A,
): Or<A, { [B in keyof A]: Ok<A[B]> }> => {
  const ok = Array($.length) as { [B in keyof A]: Ok<A[B]> };
  let z = 0;
  do if ($[z].state) ok[z] = $[z].value;
  else return fail($); while (++z < $.length);
  return pass(ok);
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
      return sync(unsafe($), pass, async (cause) => {
        if (or) return fail(await or($, cause));
        return fail(cause instanceof Error ? cause : Error("", { cause }));
      });
    } catch (cause) {
      if (or) return sync(or($, cause), fail);
      return fail(cause instanceof Error ? cause : Error("", { cause }));
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
      if (done) return pass(value);
      else if (value.state) return next(value.value);
      return value;
    });
  return next();
}) as {
  <A, B, C>(block: () => Generator<Or<A, B>, C, B>): Or<A, C>;
  <A, B, C>(block: () => AsyncGenerator<Or<A, B>, C, B>): Promise<Or<A, C>>;
};
