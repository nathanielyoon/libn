/**
 * Functional programming.
 *
 * @example Imperative style
 * ```ts
 * import { or } from "@libn/fp/or";
 * import { Result } from "@libn/fp/result";
 * import { drop, exec, pass, safe } from "@libn/fp/wrap";
 * import { assert } from "@std/assert";
 *
 * const isMultipleOf4 = ($: number) => $ % 4 === 0 && "multiple of 4";
 * const big = ($: number) => $ < 3 ? Result.no("too small") : Result.ok($);
 * const isNot5 = ($: number) => $ === 5 && "five";
 * const unsafeNotMultipleOf3 = ($: number) => {
 *   if ($ % 3) return $;
 *   throw Error();
 * };
 *
 * const digit = Math.random() * 10 | 0;
 * const { either } = Result.or(or(digit))
 *   .bind(drop(isMultipleOf4))
 *   .bind(big)
 *   .bind(drop(isNot5))
 *   .bind(safe(unsafeNotMultipleOf3))
 *   .fmap(pass, ($) => `${$}` as const);
 *
 * assert(digit === 7 || !either.state);
 * ```
 *
 * @example Method-chaining style
 * ```ts
 * import { or } from "@libn/fp/or";
 * import { Result } from "@libn/fp/result";
 * import { drop, exec, pass, safe } from "@libn/fp/wrap";
 * import { assert } from "@std/assert";
 *
 * const isMultipleOf4 = ($: number) => $ % 4 === 0 && "multiple of 4";
 * const big = ($: number) => $ < 3 ? Result.no("too small") : Result.ok($);
 * const isNot5 = ($: number) => $ === 5 && "five";
 * const unsafeNotMultipleOf3 = ($: number) => {
 *   if ($ % 3) return $;
 *   throw Error();
 * };
 *
 * const digit = Math.random() * 10 | 0;
 * const { either } = exec(function* ($: number) {
 *   const not0 = yield* Result.or(or($)).fmap(pass, ($) => `${$}` as const);
 *   const notMultipleOf4 = yield* drop(isMultipleOf4)(not0);
 *   const notSmall = yield* big(notMultipleOf4);
 *   const not5 = yield* drop(isNot5)(notSmall);
 *   const notMultipleOf3 = yield* safe(unsafeNotMultipleOf3, () => "")(not5);
 *   return notMultipleOf3;
 * })(digit);
 *
 * assert(digit === 7 || !either.state);
 * ```
 *
 * @module fp
 */

export { type Falsy, type No, no, type Ok, ok, type Or, or } from "./or.ts";
export { Result } from "./result.ts";
export { drop, exec, join, pass, safe, some } from "./wrap.ts";
