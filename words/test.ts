import {
  lowerCamel,
  lowerKebab,
  lowerSnake,
  upperCamel,
  upperKebab,
  upperSnake,
} from "@libn/words";
import fc from "fast-check";
import { getText, save, test } from "../test.ts";
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
).map((words) => ({ all: words, one: ["", ...words, ""].join(" ") }));
const first = (delimiter: string) => (to: string, next: string) => {
  const [head = "", ...tail] = next;
  return to + delimiter + head.toUpperCase() + tail.join("").toLowerCase();
};

test("lowerCamel : words", fcWords, ({ all, one }) => {
  const [head = "", ...tail] = all;
  return [lowerCamel(one), tail.reduce(first(""), head.toLowerCase())];
}, { examples: [[{ all: [], one: "" }]] });
test("upperCamel : words", fcWords, ({ all, one }) => {
  return [upperCamel(one), all.reduce(first(""), "")];
}, { examples: [[{ all: [], one: "" }]] });

test("lowerKebab : words", fcWords, ({ all, one }) => {
  return [lowerKebab(one), all.join("-").toLowerCase()];
}, { examples: [[{ all: [], one: "" }]] });
test("upperKebab : words", fcWords, ({ all, one }) => {
  return [upperKebab(one), all.reduce(first("-"), "").slice(1)];
}, { examples: [[{ all: [], one: "" }]] });

test("lowerSnake : words", fcWords, ({ all, one }) => {
  return [lowerSnake(one), all.join("_").toLowerCase()];
}, { examples: [[{ all: [], one: "" }]] });
test("upperSnake : words", fcWords, ({ all, one }) => {
  return [upperSnake(one), all.join("_").toUpperCase()];
}, { examples: [[{ all: [], one: "" }]] });

import.meta.main && getText(
  "www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt",
).then((data) =>
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
).then(save(import.meta));
