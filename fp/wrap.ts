import { fail, type Ok, pass, type Result } from "./result.ts";

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
  ((unsafe: (...$: any[]) => any, or?: (error: Error, ...$: any[]) => any) =>
  (...$: any[]) => {
    try {
      return sync(unsafe(...$), pass, async (cause) => {
        const error = cause instanceof Error ? cause : Error("", { cause });
        return fail(or ? await or(error, ...$) : error);
      });
    } catch (cause) {
      const error = cause instanceof Error ? cause : Error("", { cause });
      return or ? sync(or(error, ...$), fail) : fail(error);
    }
  }) as {
    <A extends unknown[], B, C = Error>(
      unsafe: (...$: A) => B extends Promise<any> ? never : B,
      or?: (error: Error, ...$: A) => C extends Promise<any> ? never : C,
    ): (...$: A) => Result<C, B>;
    <A extends unknown[], B, C = Error>(
      unsafe: (...$: A) => Promise<B>,
      or?: (error: Error, ...$: A) => C | Promise<C>,
    ): (...$: A) => Promise<Result<C, B>>;
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
