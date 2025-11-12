import { get, set } from "../test.ts";

import.meta.main && Promise.all([
  get`www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt`,
]).then(([data]) =>
  data.matchAll(
    /^([\dA-F]{4,6});[^;]*;((L[ult](?=;)|L(?=[mo];)|N(?=[dlo];))[modl]?)/gm,
  ).reduce<{ [_: string]: number[] }>((to, [, hex, subcategory, category]) => {
    const code = parseInt(hex, 16);
    RegExp(
      `^(?!${
        "|\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nd}|\\p{Nl}|\\p{No}"
          .replace(`|\\p{${subcategory}}`, "").slice(1)
      })\\p{${category}}$`,
      "u",
    ).test(String.fromCodePoint(code)) && to[category].push(code);
    return to;
  }, { Lu: [], Ll: [], Lt: [], L: [], N: [] })
).then(set(import.meta));
