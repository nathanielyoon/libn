import type { Row } from "./main.ts";

/** Decodes CSV string -> array of rows. */
export const de_csv = <const A extends {} | null = null>(
  $: string,
  or?: A,
): Row<A>[] | null => {
  $.charCodeAt(0) === 0xfeff && ($ = $.slice(1)), or ??= null!;
  const a = /(?:("?)([^\n\r",]+)\1|"((?:[^"]|"")*)"|)(,|\r?\n|(?:\r?\n)?$)/y;
  for (let b = [], c, d = []; c = a.exec($);) {
    if (d.push(c[2] ?? c[3]?.replaceAll('""', '"') ?? or), c[4] !== ",") {
      if (b.push(d), d = [], a.lastIndex === $.length) return b;
    }
  }
  return null;
};
/** Encodes array of rows -> CSV string. */
export const en_csv = <A>($: Row<A>[], is?: ($: unknown) => $ is A): string => {
  is ??= (($) => !$) as ($: unknown) => $ is A;
  let a = "";
  for (let z = 0, y, b, c, d; z < $.length; a += c.replace(/,?$/, "\n"), ++z) {
    for (y = 0, b = $[z], c = ""; y < b.length; ++y) {
      c += is(d = b[y])
        ? ","
        : /(?:[",]|\r?\n)/.test(d)
        ? `"${d.replaceAll('"', '""')}",`
        : d + ",";
    }
  }
  return a;
};
