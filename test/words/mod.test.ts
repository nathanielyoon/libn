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

const codes = (["Lu", "Ll", "Lt", "L", "N"] as const).reduce((to, key) => ({
  ...to,
  [key]: fc.constantFrom(
    ...vectors.categories[key].map(($) => String.fromCodePoint($)),
  ),
}), {} as { [_ in keyof typeof vectors.categories]: fc.Arbitrary<string> });
const fcWords = fc.array(
  fc.oneof(
    fc.tuple(codes.Lu, fc.array(codes.Ll, { minLength: 1 })),
    fc.array(codes.Ll, { minLength: 1 }),
    fc.array(codes.N, { minLength: 1 }),
    fc.array(codes.Lu, { minLength: 1 }),
    fc.tuple(codes.Lt, fc.array(codes.Ll)),
    fc.array(codes.L, { minLength: 1 }),
  ).map((letters) => letters.flat().join("")),
).map((words) => ({ all: words, one: ["", ...words, ""].join(" ") }));
const first = (delimiter: string) => (to: string, next: string) => {
  const [head = "", ...tail] = next;
  return to + delimiter + head.toUpperCase() + tail.join("").toLowerCase();
};

Deno.test("lowerCamel : vectors", () => {
  for (const [key, value] of Object.entries(vectors.examples.lowerCamel)) {
    assertEquals(lowerCamel(key), value);
  }
});
Deno.test("lowerCamel : arbitrary words", () => {
  fc.assert(fc.property(fcWords, ({ all: [head = "", ...tail], one }) => {
    assertEquals(lowerCamel(one), tail.reduce(first(""), head.toLowerCase()));
  }));
});
Deno.test("upperCamel : vectors", () => {
  for (const [key, value] of Object.entries(vectors.examples.upperCamel)) {
    assertEquals(upperCamel(key), value);
  }
});
Deno.test("upperCamel : arbitrary words", () => {
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(upperCamel(one), all.reduce(first(""), ""));
  }));
});

Deno.test("lowerKebab : vectors", () => {
  for (const [key, value] of Object.entries(vectors.examples.lowerKebab)) {
    assertEquals(lowerKebab(key), value);
  }
});
Deno.test("lowerKebab : arbitrary words", () => {
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(lowerKebab(one), all.join("-").toLowerCase());
  }));
});
Deno.test("upperKebab : vectors", () => {
  for (const [key, value] of Object.entries(vectors.examples.upperKebab)) {
    assertEquals(upperKebab(key), value);
  }
});
Deno.test("upperKebab : arbitrary words", () => {
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(upperKebab(one), all.reduce(first("-"), "").slice(1));
  }));
});

Deno.test("lowerSnake : vectors", () => {
  for (const [key, value] of Object.entries(vectors.examples.lowerSnake)) {
    assertEquals(lowerSnake(key), value);
  }
});
Deno.test("lowerSnake : arbitrary words", () => {
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(lowerSnake(one), all.join("_").toLowerCase());
  }));
});
Deno.test("upperSnake : vectors", () => {
  for (const [key, value] of Object.entries(vectors.examples.upperSnake)) {
    assertEquals(upperSnake(key), value);
  }
});
Deno.test("upperSnake : arbitrary words", () => {
  fc.assert(fc.property(fcWords, ({ all, one }) => {
    assertEquals(upperSnake(one), all.join("_").toUpperCase());
  }));
});
