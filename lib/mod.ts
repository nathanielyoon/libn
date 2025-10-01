/**
 * Internal utilities.
 *
 * @example Hex parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(trim("0xabc123!"), "abc123");
 * ```
 *
 * @example Base arbitraries
 * ```ts
 * import fc from "fast-check";
 *
 * fc_assert(fc_num())(($) => !Number.isNaN($));
 * ```
 *
 * @module lib
 */

import type { Intersect, Json, Tuple } from "./src/types.ts";
import { into, read, save, trim } from "./src/vectors.ts";
import {
  fc_assert,
  fc_bench,
  fc_bin,
  fc_json,
  fc_num,
  fc_str,
} from "./src/fc.ts";
import { pure } from "./src/pure.ts";

export {
  fc_assert,
  fc_bench,
  fc_bin,
  fc_json,
  fc_num,
  fc_str,
  type Intersect,
  into,
  type Json,
  pure,
  read,
  save,
  trim,
  type Tuple,
};
