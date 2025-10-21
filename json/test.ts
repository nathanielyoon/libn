import {
  assert,
  assertEquals,
  assertMatch,
  assertStrictEquals,
} from "@std/assert";
import { assertType, type Has, type IsExact } from "@std/testing/types";
import fc from "fast-check";
import { isArray, type Json } from "@libn/json/lib";
import { deToken, enToken, get } from "@libn/json/pointer";
import {
  array,
  boolean,
  number,
  object,
  string,
  TYPE,
} from "@libn/json/schema";
import { ENCODING, type Encoding, type Schema } from "@libn/json";
import { FORMAT, type Format } from "@libn/json/regex";

const fcJson = fc.jsonValue as (
  constraints?: fc.JsonSharedConstraints,
) => fc.Arbitrary<Json>;
Deno.test("lib", async (t) => {
  await t.step("isArray() is Array.isArray", () => {
    assertStrictEquals(isArray, Array.isArray);
  });
  await t.step("isArray() checks mutable and readonly arrays", () => {
    fc.assert(fc.property(fc.option(fc.constant<[]>([])), ($) => {
      assertType<Has<typeof $, any[]>>(true);
      if (isArray($)) assertType<IsExact<typeof $, []>>(true), assert($);
      else assertType<IsExact<typeof $, null>>(true), assert(!$);
    }));
    fc.assert(fc.property(fc.option(fc.constant([])), ($) => {
      assertType<Has<typeof $, readonly any[]>>(true);
      if (isArray($)) {
        assertType<IsExact<typeof $, readonly []>>(true), assert($);
      } else assertType<IsExact<typeof $, null>>(true), assert(!$);
    }));
  });
});
Deno.test("pointer", async (t) => {
  await t.step('enToken() encodes "~" and "/"', () => {
    fc.assert(fc.property(fc.string(), ($) => {
      const encoded = enToken($);
      assertMatch(encoded, /^(?:~[01]|[^/~])*$/);
      assertEquals(encoded.length, $.length + ($.match(/[/~]/g)?.length ?? 0));
    }));
  });
  await t.step('deToken() decodes "/" and "~"', () => {
    fc.assert(fc.property(fc.string(), ($) => {
      const encoded = enToken($);
      const decoded = deToken(encoded);
      assertEquals(decoded, $);
      assertEquals(
        decoded.length,
        encoded.length - ($.match(/[/~]/g)?.length ?? 0),
      );
    }));
  });
  await t.step("get() returns the root for empty pointers", () => {
    fc.assert(fc.property(fcJson(), ($) => {
      assertEquals(get($, ""), $);
    }));
  });
  const fcPointer = fc.stringMatching(/^(?:\/(?:[^/~]|~[01])*)+$/);
  await t.step("get() rejects invalid pointers", () => {
    fc.assert(fc.property(
      fc.stringMatching(/^[^/]+$/),
      fcPointer,
      (prefix, pointer) => {
        assertEquals(get(null, prefix + pointer), undefined);
      },
    ));
  });
  await t.step("get() rejects non-object instances", () => {
    fc.assert(fc.property(
      fc.oneof(fc.boolean(), fc.double(), fc.string()),
      fcPointer,
      (instance, pointer) => {
        assertEquals(get(instance, pointer), undefined);
      },
    ));
  });
  await t.step("get() accesses object properties", () => {
    const object = { a: 0, "0": 1, "-": 2, "~": 3, "/": 4 };
    for (const $ of Object.keys(object) as (keyof typeof object)[]) {
      assertEquals(get(object, `/${enToken($)}`), object[$]);
    }
  });
  await t.step("get() accesses array elements", () => {
    const array = Array.from(Array(5).keys());
    for (const [key, value] of array.entries()) {
      assertEquals(get(array, `/${key}`), value);
    }
  });
  await t.step("get() accesses a path", () => {
    assertEquals(get({ a: [[{}, { b: { c: [0] } }]] }, "/a/0/1/b/c/0"), 0);
  });
  await t.step("get() rejects non-numeric or leading-zero indices", () => {
    for (const $ of ["a", "", "~0", "~1", "00", "01"]) {
      assertEquals(get([], `/${$}`), undefined);
    }
  });
  await t.step("get() rejects missing keys", () => {
    for (const $ of ["a", "", "~0", "~1", "00", "01"]) {
      assertEquals(get({}, `/${$}`), undefined);
    }
  });
});
const removeSymbol = <A>($: A): any => {
  if (isArray($)) return $.map(removeSymbol) as A;
  if (typeof $ !== "object" || $ === null) return $;
  const { [TYPE]: _, ...rest } = $ as { [TYPE]?: Json; [_: string]: Json };
  for (const key of Object.keys(rest)) rest[key] = removeSymbol(rest[key]);
  return rest as A;
};
Deno.test("schema", async (t) => {
  const BOOLEAN = Boolean();
  const NUMBER = Number();
  const STRING = String();
  const assertSchema =
    <A extends Schema>(expected: A) =>
    <B extends Schema>(actual: IsExact<A, B> extends true ? B : never) =>
      assertEquals(actual, removeSymbol(expected));
  const fixed = <const A>($: A) => $;
  const union = <const A>(...$: [A, ...A[]]) => $[NaN]; // not checked
  const tuple = <const A extends readonly any[]>(...$: A) => $;
  const index = <const A>($: A): readonly A[] => [union($)];
  const field = <A>($: A): { [_: string]: A } => ({ "": union($) });
  const items = <A extends Schema[]>(...$: A) => [...$] as const;
  const parts = <const A extends string[]>(...$: A) => $;
  await t.step("boolean() creates a schema", () => {
    assertSchema({ type: "boolean", [TYPE]: BOOLEAN })(boolean());
  });
  await t.step("boolean() creates a schema from meta", () => {
    assertSchema({ type: "boolean", [TYPE]: BOOLEAN })(boolean({}));
    assertSchema({
      type: "boolean",
      [TYPE]: BOOLEAN,
    })(boolean({ type: "boolean" }));
    assertSchema({
      type: tuple("boolean", "null"),
      [TYPE]: union(BOOLEAN, null),
    })(boolean({ type: ["boolean", "null"] }));
  });
  await t.step("boolean() creates a schema from enum", () => {
    assertSchema({
      type: "boolean",
      enum: tuple(true),
      [TYPE]: true,
    })(boolean([true]));
    assertSchema({
      type: "boolean",
      enum: tuple(false),
      [TYPE]: false,
    })(boolean([false]));
    assertSchema({
      type: "boolean",
      enum: tuple(Boolean()),
      [TYPE]: BOOLEAN,
    })(boolean([Boolean()]));
    assertSchema({
      type: tuple("boolean", "null"),
      enum: tuple(true, null),
      [TYPE]: union(true, null),
    })(boolean([true, null]));
    assertSchema({
      type: tuple("boolean", "null"),
      enum: tuple(false, null),
      [TYPE]: union(false, null),
    })(boolean([false, null]));
    assertSchema({
      type: tuple("boolean", "null"),
      enum: tuple(Boolean(), null),
      [TYPE]: union(BOOLEAN, null),
    })(boolean([Boolean(), null]));
  });
  await t.step("number() creates a schema", () => {
    assertSchema({ type: "number", [TYPE]: NUMBER })(number());
  });
  await t.step("number() creates a schema from meta", () => {
    assertSchema({ type: "number", [TYPE]: NUMBER })(number({}));
    assertSchema({
      type: "number",
      [TYPE]: NUMBER,
    })(number({ type: "number" }));
    assertSchema({
      type: "integer",
      [TYPE]: NUMBER,
    })(number({ type: "integer" }));
    assertSchema({
      type: tuple("number", "null"),
      [TYPE]: union(NUMBER, null),
    })(number({ type: ["number", "null"] }));
    assertSchema({
      type: tuple("integer", "null"),
      [TYPE]: union(NUMBER, null),
    })(number({ type: ["integer", "null"] }));
    assertSchema({
      type: "number",
      minimum: fixed(1),
      maximum: fixed(2),
      exclusiveMinimum: fixed(3),
      exclusiveMaximum: fixed(4),
      multipleOf: fixed(5),
      [TYPE]: NUMBER,
    })(number({
      minimum: 1,
      maximum: 2,
      exclusiveMinimum: 3,
      exclusiveMaximum: 4,
      multipleOf: 5,
    }));
  });
  await t.step("number() creates a schema from enum", () => {
    assertSchema({
      type: "number",
      enum: tuple(0),
      [TYPE]: fixed(0),
    })(number([0]));
    assertSchema({
      type: "number",
      enum: tuple(1.2, -3.4, 5e+6, 7e-8, 0x9),
      [TYPE]: union(1.2, -3.4, 5e+6, 7e-8, 0x9),
    })(number([1.2, -3.4, 5e+6, 7e-8, 0x9]));
    assertSchema({
      type: "number",
      enum: tuple(Number()),
      [TYPE]: NUMBER,
    })(number([Number()]));
    assertSchema({
      type: tuple("number", "null"),
      enum: tuple(0, null),
      [TYPE]: union(0, null),
    })(number([0, null]));
    assertSchema({
      type: tuple("number", "null"),
      enum: tuple(1.2, -3.4, 5e+6, 7e-8, 0x9, null),
      [TYPE]: union(1.2, -3.4, 5e+6, 7e-8, 0x9, null),
    })(number([1.2, -3.4, 5e+6, 7e-8, 0x9, null]));
    assertSchema({
      type: tuple("number", "null"),
      enum: tuple(Number(), null),
      [TYPE]: union(NUMBER, null),
    })(number([Number(), null]));
  });
  await t.step("string() creates a schema", () => {
    assertSchema({ type: "string", [TYPE]: STRING })(string());
  });
  await t.step("string() creates a schema from meta", () => {
    assertSchema({ type: "string", [TYPE]: STRING })(string({}));
    assertSchema({
      type: "string",
      [TYPE]: STRING,
    })(string({ type: "string" }));
    assertSchema({
      type: tuple("string", "null"),
      [TYPE]: union(STRING, null),
    })(string({ type: ["string", "null"] }));
    assertSchema({
      type: "string",
      minLength: fixed(1),
      maxLength: fixed(2),
      pattern: fixed("3"),
      [TYPE]: STRING,
    })(string({ minLength: 1, maxLength: 2, pattern: "3" }));
  });
  await t.step("string() creates a schema from enum", () => {
    assertSchema({
      type: "string",
      enum: tuple(""),
      [TYPE]: fixed(""),
    })(string([""]));
    assertSchema({
      type: "string",
      enum: tuple("\u{1F34C}"),
      [TYPE]: fixed("\u{1F34C}"),
    })(string(["\u{1F34C}"]));
    assertSchema({
      type: "string",
      enum: tuple(String()),
      [TYPE]: STRING,
    })(string([String()]));
    assertSchema({
      type: tuple("string", "null"),
      enum: tuple("", null),
      [TYPE]: union("", null),
    })(string(["", null]));
    assertSchema({
      type: tuple("string", "null"),
      enum: tuple("\u{1F34C}", null),
      [TYPE]: union("\u{1F34C}", null),
    })(string(["\u{1F34C}", null]));
    assertSchema({
      type: tuple("string", "null"),
      enum: tuple(String(), null),
      [TYPE]: union(STRING, null),
    })(string([String(), null]));
  });
  await t.step("string() creates a schema from format", () => {
    for (const $ of Object.keys(FORMAT) as (keyof Format)[]) {
      assertSchema({
        type: "string",
        format: $,
        [TYPE]: "" as Format[typeof $],
      })(string($));
    }
    assertSchema({
      type: "string",
      format: "email",
      [TYPE]: fixed<Format["email"]>("a@a.a"),
    })(string("email"));
    assertSchema({
      type: tuple("string", "null"),
      format: "date",
      [TYPE]: union<Format["date"] | null>("0000-00-00", null),
    })(string("date", { type: ["string", "null"] }));
    assertSchema({
      type: "string",
      format: "time",
      minLength: fixed(1),
      maxLength: fixed(2),
      pattern: fixed("3"),
      [TYPE]: fixed<Format["time"]>("00:00:00Z"),
    })(string("time", { minLength: 1, maxLength: 2, pattern: "3" }));
  });
  await t.step("string() creates a schema from encoding", () => {
    for (const $ of Object.keys(ENCODING) as (keyof Encoding)[]) {
      assertSchema({
        type: "string",
        contentEncoding: $,
        [TYPE]: fixed<Encoding[typeof $]>(""),
      })(string($));
    }
    assertSchema({
      type: "string",
      contentEncoding: "base16",
      [TYPE]: fixed<Encoding["base16"]>(""),
    })(string("base16"));
    assertSchema({
      type: tuple("string", "null"),
      contentEncoding: "base32",
      [TYPE]: union<Encoding["base32"] | null>("", null),
    })(string("base32", { type: ["string", "null"] }));
    assertSchema({
      type: "string",
      contentEncoding: "base64",
      minLength: fixed(1),
      maxLength: fixed(2),
      pattern: fixed("3"),
      [TYPE]: fixed<Encoding["base64"]>(""),
    })(string("base64", { minLength: 1, maxLength: 2, pattern: "3" }));
  });
  await t.step("string() ignores non-format non-encoding", () => {
    assertSchema({ type: "string", [TYPE]: STRING })(string("" as {}));
  });
  await t.step("array() creates a schema from items", () => {
    assertSchema({
      type: "array",
      items: { type: "boolean", [TYPE]: BOOLEAN },
      [TYPE]: index(union(BOOLEAN)),
    })(array(boolean()));
    assertSchema({
      type: "array",
      items: {
        type: "array",
        items: { type: "boolean", [TYPE]: BOOLEAN },
        [TYPE]: index(union(BOOLEAN)),
      },
      [TYPE]: index(index(union(BOOLEAN))),
    })(array(array(boolean())));
    assertSchema({
      type: "array",
      prefixItems: items({
        type: "array",
        items: {
          type: "array",
          items: { type: "boolean", [TYPE]: BOOLEAN },
          [TYPE]: index(BOOLEAN),
        },
        [TYPE]: index(index(BOOLEAN)),
      }),
      minItems: fixed(1),
      maxItems: fixed(1),
      [TYPE]: tuple(index(index(BOOLEAN))),
    })(array([array(array(boolean()))]));
    assertSchema({
      type: "array",
      items: { type: "boolean", enum: tuple(true), [TYPE]: true },
      [TYPE]: index(true),
    })(array(boolean([true])));
    assertSchema({
      type: tuple("array", "null"),
      items: { type: "boolean", [TYPE]: BOOLEAN },
      [TYPE]: union(index(BOOLEAN), null),
    })(array(boolean(), { type: ["array", "null"] }));
    assertSchema({
      type: "array",
      items: { type: "boolean", [TYPE]: BOOLEAN },
      minItems: fixed(1),
      maxItems: fixed(2),
      [TYPE]: index(union(BOOLEAN)),
    })(array(boolean(), { minItems: 1, maxItems: 2 }));
  });
  await t.step("array() creates a schema from prefixItems", () => {
    assertSchema({
      type: "array",
      prefixItems: items({ type: "boolean", [TYPE]: BOOLEAN }),
      minItems: fixed(1),
      maxItems: fixed(1),
      [TYPE]: tuple(BOOLEAN),
    })(array([boolean()]));
    assertSchema({
      type: "array",
      prefixItems: items({
        type: "array",
        [TYPE]: tuple(BOOLEAN),
        prefixItems: items({ type: "boolean", [TYPE]: BOOLEAN }),
        minItems: fixed(1),
        maxItems: fixed(1),
      }),
      minItems: fixed(1),
      maxItems: fixed(1),
      [TYPE]: tuple(tuple(BOOLEAN)),
    })(array([array([boolean()])]));
    assertSchema({
      type: "array",
      items: {
        type: "array",
        prefixItems: items({
          type: "array",
          [TYPE]: tuple(BOOLEAN),
          prefixItems: items({ type: "boolean", [TYPE]: BOOLEAN }),
          minItems: fixed(1),
          maxItems: fixed(1),
        }),
        minItems: fixed(1),
        maxItems: fixed(1),
        [TYPE]: tuple(tuple(BOOLEAN)),
      },
      [TYPE]: index(tuple(tuple(BOOLEAN))),
    })(array(array([array([boolean()])])));
    assertSchema({
      type: "array",
      prefixItems: items({ type: "boolean", enum: tuple(true), [TYPE]: true }),
      minItems: fixed(1),
      maxItems: fixed(1),
      [TYPE]: tuple(true),
    })(array([boolean([true])]));
    assertSchema({
      type: tuple("array", "null"),
      prefixItems: items({ type: "boolean", [TYPE]: BOOLEAN }),
      minItems: fixed(1),
      maxItems: fixed(1),
      [TYPE]: union([BOOLEAN], null),
    })(array([boolean()], { type: ["array", "null"] }));
  });
  await t.step("object() creates a schema from patternProperties", () => {
    assertSchema({
      type: "object",
      patternProperties: { "0": { type: "boolean", [TYPE]: BOOLEAN } },
      additionalProperties: false,
      [TYPE]: field(BOOLEAN),
    })(object(["0", boolean()]));
    assertSchema({
      type: "object",
      patternProperties: {
        "1": {
          type: "object",
          patternProperties: { "0": { type: "boolean", [TYPE]: BOOLEAN } },
          additionalProperties: false,
          [TYPE]: field(BOOLEAN),
        },
      },
      additionalProperties: false,
      [TYPE]: field(field(BOOLEAN)),
    })(object(["1", object(["0", boolean()])]));
    assertSchema({
      type: "object",
      properties: {
        "2": {
          type: "object",
          patternProperties: {
            "1": {
              type: "object",
              patternProperties: { "0": { type: "boolean", [TYPE]: BOOLEAN } },
              additionalProperties: false,
              [TYPE]: field(BOOLEAN),
            },
          },
          additionalProperties: false,
          [TYPE]: field(field(BOOLEAN)),
        },
      },
      required: parts("2"),
      additionalProperties: false,
      [TYPE]: { "2": field(field(BOOLEAN)) },
    })(object({ "2": object(["1", object(["0", boolean()])]) }));
    assertSchema({
      type: "object",
      patternProperties: {
        "0": { type: "boolean", enum: tuple(true), [TYPE]: true },
      },
      additionalProperties: false,
      [TYPE]: field<true>(true),
    })(object(["0", boolean([true])]));
    assertSchema({
      type: tuple("object", "null"),
      patternProperties: { "0": { type: "boolean", [TYPE]: BOOLEAN } },
      additionalProperties: false,
      [TYPE]: union(field(BOOLEAN), null),
    })(object(["0", boolean()], { type: ["object", "null"] }));
    assertSchema({
      type: "object",
      patternProperties: {
        "0": { type: "boolean", [TYPE]: BOOLEAN },
      },
      minProperties: fixed(1),
      maxProperties: fixed(2),
      additionalProperties: false,
      [TYPE]: field(BOOLEAN),
    })(object(["0", boolean()], { minProperties: 1, maxProperties: 2 }));
  });
  await t.step("object() creates a schema from properties", () => {
    assertSchema({
      type: "object",
      properties: {},
      required: parts(),
      additionalProperties: false,
      [TYPE]: {},
    })(object({}));
    assertSchema({
      type: "object",
      properties: { "0": { type: "boolean", [TYPE]: BOOLEAN } },
      required: parts("0"),
      additionalProperties: false,
      [TYPE]: { "0": BOOLEAN },
    })(object({ "0": boolean() }));
    assertSchema({
      type: "object",
      properties: {
        "1": {
          type: "object",
          properties: { "0": { type: "boolean", [TYPE]: BOOLEAN } },
          required: parts("0"),
          additionalProperties: false,
          [TYPE]: { "0": BOOLEAN },
        },
      },
      required: parts("1"),
      additionalProperties: false,
      [TYPE]: { "1": { "0": BOOLEAN } },
    })(object({ "1": object({ "0": boolean() }) }));
    assertSchema({
      type: "object",
      patternProperties: {
        "2": {
          type: "object",
          properties: {
            "1": {
              type: "object",
              properties: { "0": { type: "boolean", [TYPE]: BOOLEAN } },
              required: parts("0"),
              additionalProperties: false,
              [TYPE]: { "0": BOOLEAN },
            },
          },
          required: parts("1"),
          additionalProperties: false,
          [TYPE]: { "1": { "0": BOOLEAN } },
        },
      },
      additionalProperties: false,
      [TYPE]: field({ "1": { "0": BOOLEAN } }),
    })(object(["2", object({ "1": object({ "0": boolean() }) })]));
    assertSchema({
      type: "object",
      properties: { "0": { type: "boolean", enum: tuple(true), [TYPE]: true } },
      required: parts("0"),
      additionalProperties: false,
      [TYPE]: { "0": true },
    })(object({ "0": boolean([true]) }));
    assertSchema({
      type: tuple("object", "null"),
      properties: {},
      required: parts(),
      additionalProperties: false,
      [TYPE]: union({}, null),
    })(object({}, { type: ["object", "null"] }));
    assertSchema({
      type: "object",
      properties: {},
      required: parts(),
      minProperties: fixed(1),
      maxProperties: fixed(2),
      additionalProperties: false,
      [TYPE]: {},
    })(object({}, { minProperties: 1, maxProperties: 2 }));
  });
});
