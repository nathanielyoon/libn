import {
  lowerCamel,
  lowerKebab,
  lowerSnake,
  upperCamel,
  upperKebab,
  upperSnake,
} from "@libn/words";
import { assertEquals } from "@std/assert";
import fc from "fast-check";
import vectors from "./vectors.json" with { type: "json" };

const codes = (["Lu", "Ll", "Lt", "L", "N"] as const).reduce((to, key) => ({
  ...to,
  [key]: fc.constantFrom(...vectors[key].map(($) => String.fromCodePoint($))),
}), {} as { [_ in keyof typeof vectors]: fc.Arbitrary<string> });
const fcWords = fc.array(
  fc.oneof(
    fc.tuple(codes.Lu, fc.array(codes.Ll, { minLength: 1 })),
    fc.array(codes.Ll, { minLength: 1 }),
    fc.array(codes.N, { minLength: 1 }),
    fc.array(codes.Lu, { minLength: 1 }),
    fc.tuple(codes.Lt, fc.array(codes.Ll)),
    fc.array(codes.L, { minLength: 1 }),
  ).map((letters) => letters.flat().join("")),
  { minLength: 1 },
).map((words) => ({
  all: words,
  one: words.reduce(
    (to, word, z) => to + " -._"[z & 3] + word,
  ).padStart(words.length + 1).padEnd(words.length + 2),
}));
const first = (delimiter: string) => (to: string, next: string) => {
  const [head = "", ...tail] = next;
  return to + delimiter + head.toUpperCase() + tail.join("").toLowerCase();
};
Deno.test("lowerCamel() converts to lower camel case", () =>
  fc.assert(
    fc.property(fcWords, ({ all: [head = "", ...tail], one }) => {
      assertEquals(lowerCamel(one), tail.reduce(first(""), head.toLowerCase()));
    }),
    { examples: [[{ all: [], one: "" }]] },
  ));
Deno.test("upperCamel() converts to upper camel case", () =>
  fc.assert(
    fc.property(fcWords, ({ all, one }) => {
      assertEquals(upperCamel(one), all.reduce(first(""), ""));
    }),
    { examples: [[{ all: [], one: "" }]] },
  ));
Deno.test("lowerKebab() converts to lower kebab case", () =>
  fc.assert(
    fc.property(fcWords, ({ all, one }) => {
      assertEquals(lowerKebab(one), all.join("-").toLowerCase());
    }),
    { examples: [[{ all: [], one: "" }]] },
  ));
Deno.test("upperKebab() converts to upper kebab case", () =>
  fc.assert(
    fc.property(fcWords, ({ all, one }) => {
      assertEquals(upperKebab(one), all.reduce(first("-"), "").slice(1));
    }),
    { examples: [[{ all: [], one: "" }]] },
  ));
Deno.test("lowerSnake() converts to lower snake case", () =>
  fc.assert(
    fc.property(fcWords, ({ all, one }) => {
      assertEquals(lowerSnake(one), all.join("_").toLowerCase());
    }),
    { examples: [[{ all: [], one: "" }]] },
  ));
Deno.test("upperSnake() converts to upper snake case", () =>
  fc.assert(
    fc.property(fcWords, ({ all, one }) => {
      assertEquals(upperSnake(one), all.join("_").toUpperCase());
    }),
    { examples: [[{ all: [], one: "" }]] },
  ));
import.meta.main && fetch(
  "https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt",
).then(($) => $.text()).then((data) =>
  data.matchAll(
    /^([\dA-F]{4,6});[^;]*;((L[ult](?=;)|L(?=[mo];)|N(?=[dlo];))[modl]?)/gm,
  ).reduce<{ [_: string]: number[] }>((to, [_, hex, subcategory, category]) => {
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
).then(($) =>
  Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
);
