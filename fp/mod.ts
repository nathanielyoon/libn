/**
 * Functional result handling.
 *
 * @example Typed do-notation block
 * ```ts
 * import { some } from "@libn/fp/result";
 * import { exec } from "@libn/fp/wrap";
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
