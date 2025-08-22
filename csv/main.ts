/**
 * Work with CSV data.
 * @module csv
 *
 * @example
 * ```ts
 * import { de_csv, de_header, en_csv, en_header } from "@nyoon/lib/csv";
 * import { assertEquals } from "jsr:@std/assert@^1.0.14";
 *
 * const a = "aaa,bbb,ccc\nzzz,yyy,xxx\n";
 * assertEquals(en_csv(en_header(de_header(de_csv(a)))), a);
 * ```
 *
 * @see [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180)
 */

/** Parsed CSV row. */
export type Row<A = string> = (string | A)[];
export * from "./csv.ts";
export * from "./header.ts";
