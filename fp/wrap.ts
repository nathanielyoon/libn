import { type Falsy, no, ok, type Or } from "./or.ts";
import { type Both, Result, type Sync } from "./result.ts";

/** Does nothing. */
export const pass = <const A>($: A) => $;
/** Lifts a value into a non-nullable success or nullish failure. */
export const some = <const A, const B = undefined>(
  $: Sync<A>,
  ifNullish?: Sync<B>,
): Result<B, NonNullable<A>, false> =>
  // deno-lint-ignore eqeqeq
  $ == null ? Result.no(ifNullish!) : Result.ok($);
const error = ($: unknown) => $ instanceof Error ? $ : Error("", { cause: $ });
/** Wraps an unsafe function. */
export const safe =
  ((unsafe: ($: any) => any, ifThrown?: ($: any, thrown: any) => any) =>
  ($: any) => {
    try {
      const next = unsafe($);
      if (next instanceof Promise) {
        return Result.or(
          next.then(ok).catch(async (cause) =>
            no(ifThrown ? await ifThrown($, cause) : error(cause))
          ),
        );
      }
      return Result.ok(next);
    } catch (cause) {
      return Result.no(ifThrown ? ifThrown($, cause) : error(cause));
    }
  }) as {
    <A, B, C = Error>(
      unsafe: ($: A) => Sync<B>,
      ifThrown?: ($: A, thrown: unknown) => Sync<C>,
    ): ($: A) => Result<C, B, false>;
    <A, B, C = Error>(
      unsafe: ($: A) => Promise<B>,
      ifThrown?: ($: A, thrown: unknown) => Both<C>,
    ): ($: A) => Result<C, B, true>;
    <A, B, C>(
      unsafe: ($: A) => Sync<B>,
      ifThrown: ($: A, thrown: unknown) => Both<C>,
    ): ($: A) => Result<C, B, boolean>;
  };
const every = ($: Or[]) => { // empty lists returned early, so `$.length >= 1`
  let z = $.length;
  const out = Array(z);
  do if ($[--z].state) out[z] = $[z].value;
  else return no($); while (z);
  return ok(out);
};
/** Combines a list of results. */
export const join = (($: Result[]) => {
  const all = Array($.length);
  if (!$.length) return Result.ok(all);
  // Since the async-ness of the returned result depends on the async-ness of
  // the list elements, results from empty lists are always sync, and results
  // from non-tuples (i.e. without a known length) are sync if all their members
  // would've been and indeterminate otherwise.
  let async = false;
  for (let z = 0; z < $.length; ++z) {
    all[z] = $[z].either, async ||= all[z] instanceof Promise;
  }
  return Result.or(async ? Promise.all(all).then(every) : every(all));
}) as {
  ($: []): Result<never, [], false>;
  <const A extends [Result, ...Result[]]>($: A): Result<
    { [B in keyof A]: Awaited<A[B]["either"]> },
    { [B in keyof A]: A[B] extends Result<any, infer C> ? C : never },
    A[number] extends Result<any, any, infer B> ? B : never
  >;
  <A extends Result>($: A[]): Result<
    Awaited<A["either"]>[],
    A extends Result<any, infer B> ? B[] : never,
    A extends Result<any, any, infer B> ? B | false : never
  >;
};
/** Wraps a guard that returns an error, or something falsy when successful. */
export const drop = ((not: ($: any) => Both<any>) => ($: any) => {
  const next = not($);
  if (next instanceof Promise) {
    return Result.or(next.then((error) => error ? no(error) : ok($)));
  } else if (next) return Result.no(next);
  return Result.ok($);
}) as {
  <A, B>(not: ($: A) => Sync<Falsy | B>): ($: A) => Result<B, A, false>;
  <A, B>(not: ($: A) => Promise<Falsy | B>): ($: A) => Result<B, A, true>;
};
/** Wraps an imperative block. */
export const exec =
  (<A>(run: ($: A) => AsyncGenerator<Result> | Generator<Result>) => ($: A) => {
    const generator = run($);
    return (function get(argument?: any): Both<Result> {
      const result = generator.next(argument);
      if (result instanceof Promise) {
        return result.then(async (next) => {
          if (next.done) return Result.ok(await next.value);
          const { state, value } = await next.value.either;
          if (state) return get(value);
          return Result.no(value);
        });
      } else if (result.done) return Result.ok(result.value);
      return result.value.bind(get);
    })();
  }) as {
    <A, B, C, D extends boolean, E>(
      block: ($: A) => Generator<Result<B, C, D>, E, C>,
    ): ($: A) => Result<B, E, D>;
    <A, B, C, D>(
      block: ($: A) => AsyncGenerator<Result<B, C, boolean>, D, C>,
    ): ($: A) => Promise<Result<B, D, false>>;
  };
