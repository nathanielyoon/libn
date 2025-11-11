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
import { save, source } from "../test.ts";
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

Deno.test("lowerCamel : words", () => {
  assertEquals(lowerCamel(""), "");
  fc.assert(fc.property(fcWords, ({ all: [head = "", ...tail], one }) => {
    assertEquals(lowerCamel(one), tail.reduce(first(""), head.toLowerCase()));
  }));
});
Deno.test("upperCamel : words", () => {
  assertEquals(upperCamel(""), "");
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(upperCamel(one), all.reduce(first(""), ""));
  }));
});

Deno.test("lowerKebab : words", () => {
  assertEquals(lowerKebab(""), "");
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(lowerKebab(one), all.join("-").toLowerCase());
  }));
});
Deno.test("upperKebab : words", () => {
  assertEquals(upperKebab(""), "");
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(upperKebab(one), all.reduce(first("-"), "").slice(1));
  }));
});

Deno.test("lowerSnake : words", () => {
  assertEquals(lowerSnake(""), "");
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(lowerSnake(one), all.join("_").toLowerCase());
  }));
});
Deno.test("upperSnake : words", () => {
  assertEquals(upperSnake(""), "");
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(upperSnake(one), all.join("_").toUpperCase());
  }));
});

import.meta.main && source`
${[]} www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt
`.then(([data]) =>
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
