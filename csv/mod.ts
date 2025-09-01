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

/** Parses CSV. */
export const de_csv = ($: string): (string | null)[][] | null => {
  if ($.charCodeAt(0) === 0xfeff) $ = $.slice(1);
  const a = /(?:("?)([^\n\r",]+)\1|"((?:[^"]|"")*)"|)(,|\r?\n|(?:\r?\n)?$)/y;
  for (let b = [], c = [], d; d = a.exec($);) {
    c.push(d[2] ?? d[3]?.replaceAll('""', '"') ?? null);
    if (d[4] !== ",") {
      b.push(c), c = [];
      if (a.lastIndex === $.length) return b;
    }
  }
  return null;
};
/** Stringifies CSV. */
export const en_csv = ($: (string | null)[][]): string => {
  let a = "";
  for (let b, c, d, z = 0, y; z < $.length; a += c.replace(/,?$/, "\n"), ++z) {
    for (b = $[z], c = "", y = 0; y < b.length; ++y) {
      if ((d = b[y]) === null) c += ",";
      else if (/^[^\n\r",]+$/.test(d)) c += d + ",";
      else c += `"${d.replaceAll('"', '""')}",`;
    }
  }
  return a;
};
