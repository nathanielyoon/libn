import { Err } from "./error.ts";
import { no, ok, type Or, type Result } from "./or.ts";

/** Converts a value to a non-nullable success or nullish failure. */
export const some = <const A, const B = void>(
  $: A,
  if_nullish?: B,
): Or<B, NonNullable<A>> => $ == null ? no(if_nullish) : ok($);
type Falsy = undefined | null | false | 0 | 0n | "";
/** Wraps a type guard. */
export const drop =
  <A, B>(not: ($: A) => B | Falsy): ($: A) => Or<B, A> => ($) => {
    const maybe_error = not($);
    return maybe_error ? no(maybe_error) : ok($);
  };
/** Wraps a possibly-throwing function. */
export const save = <A, B, C = Err<"unknown", unknown>>(
  unsafe: ($: A) => B,
  if_thrown?: ($: unknown) => C,
): ($: A) => Or<C, B> =>
($) => {
  try {
    return ok(unsafe($));
  } catch ($) {
    return no(if_thrown ? if_thrown($) : new Err("unknown", $) as C);
  }
};
/** Wraps a possibly-rejecting function. */
export const save_async = <A, B, C = Err<"unknown", unknown>>(
  unsafe: ($: A) => B | Promise<B>,
  if_thrown?: ($: unknown) => C | Promise<C>,
): ($: A) => Promise<Or<C, B>> =>
async ($) => {
  try {
    return ok(await unsafe($));
  } catch ($) {
    return no(if_thrown ? await if_thrown($) : new Err("unknown", $) as C);
  }
};
/** Wraps an imperative block. */
export const exec =
  <A, B, C, D>(doer: ($: A) => Generator<Or<B, C>, D, C>): ($: A) => Or<B, D> =>
  ($) => {
    const generator = doer($);
    const next = ($: IteratorResult<Or<B, C>, D>): Or<B, D> =>
      $.done ? ok($.value) : $.value.bind(($) => next(generator.next($)));
    return next(generator.next());
  };
/** Wraps an asychronous imperative block. */
export const exec_async = <A, B, C, D>(
  doer: ($: A) => AsyncGenerator<Or<B, C>, D, C>,
): ($: A) => Promise<Or<B, D>> =>
async ($) => {
  const generator = doer($);
  const next = ($: IteratorResult<Or<B, C>, D>): Or<B, D> =>
    $.done
      ? ok($.value)
      : $.value.bind_async(async ($) => next(await generator.next($)));
  return next(await generator.next());
};
type Each<A extends Or[]> = Or<
  { [B in keyof A]: A[B] extends Or<infer C, infer D> ? Result<C, D> : never },
  { [B in keyof A]: A[B] extends Or<any, infer C> ? C : A[B] }
>;
/** Wraps a list of results. */
export const each = <const A extends Or[]>($: A): Each<A> => {
  const results = Array($.length), oks = [];
  for (let z = 0; z < $.length; ++z) {
    (results[z] = $[z].result).state && oks.push(results[z].value);
  }
  return oks.length === $.length ? ok<any>(oks) : no<any>(results);
};
/** Wraps a possibly-asynchronous list of results. */
export const each_async = async <const A extends Or[]>(
  $: A,
): Promise<Each<A>> => {
  const promised_results = Array<Promise<Result<any, any>>>($.length);
  for (let z = 0; z < $.length; ++z) promised_results[z] = $[z].result_async;
  const results = await Promise.all(promised_results), oks = [];
  for (let z = 0; z < results.length; ++z) {
    if (results[z].state) oks.push(results[z].value);
    else return no<any>(results);
  }
  return ok<any>(oks);
};
