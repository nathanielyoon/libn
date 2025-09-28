/**
 * Fuzzy string matching.
 *
 * @example String comparison
 * ```ts
 * import { assert } from "@std/assert";
 *
 * assert(distance("winners", "spurs") < distance("winners", "arsenal"));
 * ```
 *
 * @example Includes
 * ```ts
 * import { assert } from "@std/assert";
 *
 * assert(includes("a b c", "abc"));
 * assert(!includes("a   c", "abc"))
 * ```
 *
 * @module fuzz
 */

import { distance } from "./src/distance.ts";
import { includes } from "./src/includes.ts";
import { type Match, Matcher } from "./src/match.ts";

export { distance, includes, type Match, Matcher };
