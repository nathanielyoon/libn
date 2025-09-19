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
 * fc_check(fc.property(fc_number(), ($) => !Number.isNaN($)));
 * ```
 *
 * @module lib
 */

import type { Intersect, Json, Tuple } from "./src/types.ts";
import { into, read, save, trim } from "./src/vectors.ts";
import { fc_binary, fc_check, fc_number, fc_string } from "./src/fc.ts";

export {
  fc_binary,
  fc_check,
  fc_number,
  fc_string,
  type Intersect,
  into,
  type Json,
  read,
  save,
  trim,
  type Tuple,
};
