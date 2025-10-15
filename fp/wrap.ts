import { fail, type Ok, pass, type Result } from "./or.ts";

/** Aggregates results. */
export const join = <const A extends [Result, ...Result[]]>(
  $: A,
): Result<A, { [B in keyof A]: Ok<A[B]> }> => {
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
    ): ($: A) => Result<C, B>;
    <A, B, C = Error>(
      unsafe: ($: A) => Promise<B>,
      or?: ($: A, cause: unknown) => C | Promise<C>,
    ): ($: A) => Promise<Result<C, B>>;
  };
/** Runs an imperative block, returning failures early. */
export const exec = (($: () => Generator<Result> | AsyncGenerator<Result>) => {
  const generator = $();
  const next = (prev?: any): Result | Promise<Result> =>
    sync(generator.next(prev), ({ done, value }): Result | Promise<Result> => {
      if (done) return pass(value);
      else if (value.state) return next(value.value);
      return value;
    });
  return next();
}) as {
  <A, B, C>($: () => Generator<Result<A, B>, C, B>): Result<A, C>;
  <A, B, C>($: () => AsyncGenerator<Result<A, B>, C, B>): Promise<Result<A, C>>;
};
