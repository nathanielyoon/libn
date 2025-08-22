/**
 * Match with weights.
 * @module match
 *
 * ```ts
 * import { myers } from "jsr:@nyoon/lib/match";
 * import { assertLess } from "jsr:@std/assert@^1.0.14";
 *
 * assertLess(myers("nathan", "nathaniel"), myers("nathan", "mathaniel"));
 * ```
 *
 * @see [Hungarian algorithm](https://en.wikipedia.org/wiki/Hungarian_algorithm#Implementation_in_C++)
 * @see [Blossom algorithm](https://en.wikipedia.org/wiki/Blossom_algorithm)
 * @see [Myers diff source](https://github.com/ka-weihe/fastest-levenshtein)
 */

export * from "./assign.ts";
export * from "./blossom.ts";
export * from "./fuzz.ts";
