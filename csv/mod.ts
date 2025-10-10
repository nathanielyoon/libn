/**
 * Comma-separated values.
 *
 * @example Stringifying, parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const data = [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]];
 *
 * assertEquals(decodeCsv(encodeCsv(data)), data);
 * ```
 *
 * @module csv
 */

import type { CsvOptions, Row } from "./lib.ts";
import { encodeCsv } from "./stringify.ts";
import { decodeCsv } from "./parse.ts";

export { type CsvOptions, decodeCsv, encodeCsv, type Row };
