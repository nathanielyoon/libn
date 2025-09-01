/**
 * Weighted matching.
 *
 * @example Bipartite
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *   assign([[8, 4, 7], [5, 2, 3], [9, 4, 8]]),
 *   new Int32Array([0, 2, 1]),
 * );
 * ```
 *
 * @example General
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *   new Blossom([
 *     [0, 3, -8],
 *     [0, 4, -4],
 *     [0, 5, -7],
 *     [1, 3, -5],
 *     [1, 4, -2],
 *     [1, 5, -3],
 *     [2, 3, -9],
 *     [2, 4, -4],
 *     [2, 5, -8],
 *   ], true).mate.subarray(3),
 *   new Int32Array([0, 2, 1]),
 * );
 * ```
 *
 * @module weight
 */

import { assign } from "./src/assign.ts";
import { Blossom } from "./src/blossom.ts";

export { assign, Blossom };
