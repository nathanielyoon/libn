/**
 * String matching.
 *
 * @example Fuzzy comparison
 * ```ts
 * import { distance, includes } from "@libn/text/fuzzy"
 * import { assert } from "@std/assert";
 *
 * assert(includes("a b c", "abc"));
 * assert(!includes("a   c", "abc"))
 *
 * assert(distance("winners", "spurs") < distance("winners", "arsenal"));
 * ```
 *
 * @module text
 */

export {
  uncode,
  unhtml,
  unline,
  unlone,
  unmark,
  unrexp,
  unwide,
} from "./normalize.ts";
export { uncase } from "./case.ts";
export { distance, includes } from "./fuzzy.ts";
