import { get, set } from "../test.ts";

import.meta.main && await Promise.all([
  get`www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt`,
  get`en.wikipedia.org/w/index.php?title=Naming_convention_(programming)&oldid=1321148243`
    .then((html) => html.match(/(?<=<td><code>)[^<]+(?=<\/code>)/g)!),
]).then(([data, wikipedia]) =>
  set(import.meta.resolve("./vectors.json"), {
    categories: data.matchAll(
      /^([\dA-F]{4,6});[^;]*;((L[ult](?=;)|L(?=[mo];)|N(?=[dlo];))[modl]?)/gm,
    ).reduce<{ [_: string]: number[] }>(
      (to, [, hex, subcategory, category]) => {
        const code = parseInt(hex, 16);
        RegExp(
          `^(?!${
            "|\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nd}|\\p{Nl}|\\p{No}"
              .replace(`|\\p{${subcategory}}`, "").slice(1)
          })\\p{${category}}$`,
          "u",
        ).test(String.fromCodePoint(code)) && to[category].push(code);
        return to;
      },
      { Lu: [], Ll: [], Lt: [], L: [], N: [] },
    ),
    examples: [
      ["lowerCamel", wikipedia[2]],
      ["upperCamel", wikipedia[3]],
      ["lowerSnake", wikipedia[4]],
      ["upperSnake", wikipedia[5]],
      ["lowerKebab", wikipedia[8]],
      ["upperKebab", wikipedia[10]],
    ].reduce((to, [key, value]) => ({
      ...to,
      [key]: { "two words": value, "": "", " . ": "" },
    }), {}),
  }, "lNb0/9oUjCh6y3aYN8PXK+XNKN9w7Ps3wnNK5oXou7I=")
);
