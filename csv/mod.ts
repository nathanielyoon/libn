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

/** Decodes CSV string -> array of rows, mapping empty fields to `null`s. */
export const de_csv = ($: string): (string | null)[][] | null => {
  if ($.charCodeAt(0) === 0xfeff) $ = $.slice(1);
  const next = /(?:("?)([^\n\r",]+)\1|"((?:[^"]|"")*)"|)(,|\r?\n|(?:\r?\n)?$)/y;
  for (let rows = [], row = [], result; result = next.exec($);) {
    row.push(result[2] ?? result[3]?.replaceAll('""', '"') ?? null);
    if (result[4] !== ",") {
      rows.push(row), row = [];
      if (next.lastIndex === $.length) return rows;
    }
  }
  return null;
};
/** Encodes array of rows -> CSV string, mapping `null`s to empty fields. */
export const en_csv = ($: (string | null)[][]): string => {
  let csv = "", row, line, field;
  for (let z = 0, y; z < $.length; csv += line.replace(/,?$/, "\n"), ++z) {
    for (row = $[z], line = "", y = 0; y < row.length; ++y) {
      if ((field = row[y]) === null) line += ",";
      else if (/^[^\n\r",]+$/.test(field)) line += field + ",";
      else line += `"${field.replaceAll('"', '""')}",`;
    }
  }
  return csv;
};
