/**
 * Functional result handling.
 *
 * @example Typed do-syntax block
 * ```ts
 * import { some } from "@libn/fp/result";
 * import { exec, safe } from "@libn/fp/wrap";
 * import { assertEquals } from "@std/assert";
 *
 * const ok = Math.random() > 0.5;
 * assertEquals(
 *   exec(function* () {
 *     return yield* safe(() => {
 *       if (ok) return ok;
 *       throw ok;
 *     }, () => ok)();
 *   }),
 *   some(ok),
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
