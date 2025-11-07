import { assertEquals } from "@std/assert";
import fc from "fast-check";
import {
  lowerCamel,
  lowerKebab,
  lowerSnake,
  upperCamel,
  upperKebab,
  upperSnake,
} from "@libn/words";
import vectors from "./vectors.json" with { type: "json" };

const { Lu, Ll, Lt, L, N } = Object.keys(vectors).reduce((to, key) => ({
  ...to,
  [key]: fc.constantFrom(
    ...vectors[key as keyof typeof vectors].map(($) => String.fromCodePoint($)),
  ),
}), {} as { [_ in keyof typeof vectors]: fc.Arbitrary<string> });
const fcWords = fc.array(
  fc.oneof(
    fc.tuple(Lu, fc.array(Ll, { minLength: 1 })).map(($) => $.flat()),
    fc.array(Ll, { minLength: 1 }),
    fc.array(N, { minLength: 1 }),
    fc.array(Lu, { minLength: 1 }),
    fc.tuple(Lt, fc.array(Ll)).map(($) => $.flat()),
    fc.array(L, { minLength: 1 }),
  ).map(($) => $.join("")),
  { minLength: 1 },
).map(($) => ({
  separate: $,
  together: $.reduce(
    (to, word, z) => to + " -._"[z & 3] + word,
  ).padStart($.length + 1).padEnd($.length + 2),
}));
const capitalize = (delimiter: string) => (to: string, next: string) => {
  const [head = "", ...tail] = next;
  return to + delimiter + head.toUpperCase() + tail.join("").toLowerCase();
};
Deno.test("convert ignores empty strings", () => {
  assertEquals(lowerCamel(""), "");
  assertEquals(upperCamel(""), "");
  assertEquals(lowerKebab(""), "");
  assertEquals(upperKebab(""), "");
  assertEquals(lowerSnake(""), "");
  assertEquals(upperSnake(""), "");
});
Deno.test("convert.lowerCamel() converts to lower camel case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(
      lowerCamel(together),
      separate.slice(1).reduce(capitalize(""), separate[0].toLowerCase()),
    );
  })));
Deno.test("convert.upperCamel() converts to upper camel case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(upperCamel(together), separate.reduce(capitalize(""), ""));
  })));
Deno.test("convert.lowerKebab() converts to lower kebab case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(lowerKebab(together), separate.join("-").toLowerCase());
  })));
Deno.test("convert.upperKebab() converts to upper kebab case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(
      upperKebab(together),
      separate.reduce(capitalize("-"), "").slice(1),
    );
  })));
Deno.test("convert.lowerSnake() converts to lower snake case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(lowerSnake(together), separate.join("_").toLowerCase());
  })));
Deno.test("convert.upperSnake() converts to upper snake case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(upperSnake(together), separate.join("_").toUpperCase());
  })));
import.meta.main && fetch(
  "https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt",
).then(($) => $.text()).then((data) =>
  data.matchAll(
    /^([\dA-F]{4,6});[^;]*;((L[ult](?=;)|L(?=[mo];)|N(?=[dlo];))[modl]?)/gm,
  ).reduce<{ [_ in `L${"u" | "l" | "t" | ""}` | "N"]: number[] }>(
    (categories, [_, hex, subcategory, category]) => {
      const character = String.fromCodePoint(parseInt(hex, 16));
      if (
        RegExp(`^\\p{${category}}$`, "u").test(character) &&
        !RegExp(
          `^(?:${
            "|\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nd}|\\p{Nl}|\\p{No}"
              .replace(RegExp(`\\|\\\\p\\{${subcategory}\\}`), "").slice(1)
          })$`,
          "u",
        ).test(character)
      ) categories[category as keyof typeof categories].push(parseInt(hex, 16));
      return categories;
    },
    { Lu: [], Ll: [], Lt: [], L: [], N: [] },
  )
).then(($) =>
  Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
);
