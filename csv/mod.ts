/**
 * Parsing and stringifying comma-separated values.
 *
 * @example Stringifying, parsing
 * ```ts
 * import { deCsv, enCsv } from "@libn/csv";
 * import { assertEquals } from "@std/assert";
 *
 * const data = [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]];
 *
 * assertEquals(deCsv(enCsv(data)), data);
 * ```
 *
 * @module csv
 */

export type { CsvOptions, Row } from "./lib.ts";
export { enCsv } from "./stringify.ts";
export { deCsv } from "./parse.ts";
