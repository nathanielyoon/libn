/**
 * Functional result handling.
 *
 * @example Typed do-notation block
 * ```ts
 * import { exec, some } from "@libn/fp"
 * import { assertEquals } from "@std/assert";
 *
 * const ok = false;
 * assertEquals(
 *   exec(function* ($) {
 *     return yield* some($);
 *   })(ok).state,
 *   ok,
 * );
 * ```
 *
 * @module fp
 */

export {
  fail,
  type Falsy,
  type No,
  type Ok,
  pass,
  type Result,
  some,
} from "./result.ts";
export { exec, join, safe } from "./wrap.ts";
