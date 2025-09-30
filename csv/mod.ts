/**
 * Comma-separated values ([RFC 4180](https://www.rfc-editor.org/rfc/rfc4180)).
 *
 * @example Stringifying, parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const data = [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]];
 *
 * assertEquals(de_csv(en_csv(data)), data);
 * ```
 *
 * @module csv
 */

import type { CsvOptions, Row } from "./src/common.ts";
import { en_csv } from "./src/stringify.ts";
import { de_csv } from "./src/parse.ts";

export { type CsvOptions, de_csv, en_csv, type Row };
