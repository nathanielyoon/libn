import { get, set } from "../test.ts";

const [data, wikipedia] = await Promise.all([
  get`www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt`,
  get`en.wikipedia.org/w/index.php?title=Naming_convention_(programming)&oldid=1321148243${79003}${89797}`,
]);

const examples = wikipedia.match(/(?<=<td><code>)[^<]+(?=<\/code>)/g)!;
await set(import.meta, {
  categories: data.matchAll(
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
  }, { Lu: [], Ll: [], Lt: [], L: [], N: [] }),
  examples: [
    ["lowerCamel", examples[2]],
    ["upperCamel", examples[3]],
    ["lowerSnake", examples[4]],
    ["upperSnake", examples[5]],
    ["lowerKebab", examples[8]],
    ["upperKebab", examples[10]],
  ].reduce((to, [key, value]) => ({
    ...to,
    [key]: { "two words": value, "": "", " . ": "" },
  }), {}),
});
