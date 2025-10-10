/**
 * String matching.
 *
 * @example Fuzzy comparison
 * ```ts
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

import { distance, includes } from "./fuzzy.ts";
import {
  uncode,
  unhtml,
  unline,
  unlone,
  unmark,
  unrexp,
  unwide,
} from "./normalize.ts";
import { uncase } from "./case.ts";

export {
  distance,
  includes,
  uncase,
  uncode,
  unhtml,
  unline,
  unlone,
  unmark,
  unrexp,
  unwide,
};
