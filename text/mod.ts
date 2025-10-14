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
import { includes } from "./includes.ts";
import { distance } from "./distance.ts";

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
