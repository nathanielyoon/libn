/**
 * Comma-separated values.
 *
 * @example Stringifying, parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const data = [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]];
 *
 * assertEquals(deCsv(enCsv(data)), data);
 * ```
 *
 * @module csv
 */

import type { CsvOptions, Row } from "./lib.ts";
import { enCsv } from "./stringify.ts";
import { deCsv } from "./parse.ts";

export { type CsvOptions, deCsv, enCsv, type Row };
