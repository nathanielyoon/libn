import {
  assert,
  assertEquals,
  assertMatch,
  assertStrictEquals,
} from "@std/assert";
import { assertType, type Has, type IsExact } from "@std/testing/types";
import fc, { maxSafeInteger } from "fast-check";
import { isArray, type Json } from "@libn/json/lib";
import { deToken, enToken, get } from "@libn/json/pointer";
import { boolean, number, string, TYPE } from "@libn/json/schema";
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
Deno.test("schema", async (t) => {
  const BOOLEAN = Boolean();
  const NUMBER = Number();
  const STRING = String();
  const ARRAY = Array<Json>();
  const OBJECT: { [_: string]: Json } = Object();
  const assertSchema =
    <const A extends Schema>({ [TYPE]: _, ...expected }: A) =>
    <const B extends A>(
      $: IsExact<B, { -readonly [D in keyof A]: A[D] }> extends true ? B
        : never,
    ) => assertEquals($, expected);
  const union = <const A>(...$: [A, ...A[]]) => $[NaN]; // not checked
  await t.step("boolean() creates a schema", () => {
    assertSchema({ type: "boolean", [TYPE]: BOOLEAN })(boolean());
  });
  await t.step("boolean() creates a schema from meta", () => {
    assertSchema({ type: "boolean", [TYPE]: BOOLEAN })(boolean({}));
    assertSchema({ type: "boolean", [TYPE]: BOOLEAN })(
      boolean({ type: "boolean" }),
    );
    assertSchema({ type: ["boolean", "null"], [TYPE]: union(BOOLEAN, null) })(
      boolean({ type: ["boolean", "null"] }),
    );
  });
  await t.step("boolean() creates a schema from enum", () => {
    assertSchema({ type: "boolean", enum: [true], [TYPE]: true })(
      boolean([true]),
    );
    assertSchema({ type: "boolean", enum: [false], [TYPE]: false })(
      boolean([false]),
    );
    assertSchema({ type: "boolean", enum: [Boolean()], [TYPE]: BOOLEAN })(
      boolean([Boolean()]),
    );
    assertSchema({
      type: ["boolean", "null"],
      enum: [true, null],
      [TYPE]: union(true, null),
    })(boolean([true, null]));
    assertSchema({
      type: ["boolean", "null"],
      enum: [false, null],
      [TYPE]: union(false, null),
    })(boolean([false, null]));
    assertSchema({
      type: ["boolean", "null"],
      enum: [Boolean(), null],
      [TYPE]: union(BOOLEAN, null),
    })(boolean([Boolean(), null]));
  });
  await t.step("number() creates a schema", () => {
    assertSchema({ type: "number", [TYPE]: NUMBER })(number());
  });
  await t.step("number() creates a schema from meta", () => {
    assertSchema({ type: "number", [TYPE]: NUMBER })(number({}));
    assertSchema({ type: "number", [TYPE]: NUMBER })(
      number({ type: "number" }),
    );
    assertSchema({ type: "integer", [TYPE]: NUMBER })(
      number({ type: "integer" }),
    );
    assertSchema({ type: ["number", "null"], [TYPE]: union(NUMBER, null) })(
      number({ type: ["number", "null"] }),
    );
    assertSchema({ type: ["integer", "null"], [TYPE]: union(NUMBER, null) })(
      number({ type: ["integer", "null"] }),
    );
    assertSchema({
      type: "number",
      minimum: 1,
      maximum: 2,
      exclusiveMinimum: 3,
      exclusiveMaximum: 4,
      multipleOf: 5,
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
    assertSchema({ type: "number", enum: [0], [TYPE]: 0 })(number([0]));
    assertSchema({
      type: "number",
      enum: [1.2, -3.4, 5e+6, 7e-8, 0x9],
      [TYPE]: union(1.2, -3.4, 5e+6, 7e-8, 0x9),
    })(number([1.2, -3.4, 5e+6, 7e-8, 0x9]));
    assertSchema({ type: "number", enum: [Number()], [TYPE]: NUMBER })(
      number([Number()]),
    );
    assertSchema({
      type: ["number", "null"],
      enum: [0, null],
      [TYPE]: union(0, null),
    })(number([0, null]));
    assertSchema({
      type: ["number", "null"],
      enum: [1.2, -3.4, 5e+6, 7e-8, 0x9, null],
      [TYPE]: union(1.2, -3.4, 5e+6, 7e-8, 0x9, null),
    })(number([1.2, -3.4, 5e+6, 7e-8, 0x9, null]));
    assertSchema({
      type: ["number", "null"],
      enum: [Number(), null],
      [TYPE]: union(NUMBER, null),
    })(number([Number(), null]));
  });
  await t.step("string() creates a schema", () => {
    assertSchema({ type: "string", [TYPE]: STRING })(string());
  });
  await t.step("string() creates a schema from meta", () => {
    assertSchema({ type: "string", [TYPE]: STRING })(string({}));
    assertSchema({ type: "string", [TYPE]: STRING })(
      string({ type: "string" }),
    );
    assertSchema({ type: ["string", "null"], [TYPE]: union(STRING, null) })(
      string({ type: ["string", "null"] }),
    );
    assertSchema({
      type: "string",
      minLength: 1,
      maxLength: 2,
      pattern: "3",
      [TYPE]: STRING,
    })(string({ minLength: 1, maxLength: 2, pattern: "3" }));
  });
  await t.step("string() creates a schema from enum", () => {
    assertSchema({ type: "string", enum: [""], [TYPE]: "" })(string([""]));
    assertSchema({ type: "string", enum: ["\u{1F34C}"], [TYPE]: "\u{1F34C}" })(
      string(["\u{1F34C}"]),
    );
    assertSchema({ type: "string", enum: [String()], [TYPE]: STRING })(
      string([String()]),
    );
    assertSchema({
      type: ["string", "null"],
      enum: ["", null],
      [TYPE]: union("", null),
    })(string(["", null]));
    assertSchema({
      type: ["string", "null"],
      enum: ["\u{1F34C}", null],
      [TYPE]: union("\u{1F34C}", null),
    })(string(["\u{1F34C}", null]));
    assertSchema({
      type: ["string", "null"],
      enum: [String(), null],
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
      [TYPE]: "" as Format["email"],
    })(string("email"));
    assertSchema({
      type: ["string", "null"],
      format: "date",
      [TYPE]: union("" as Format["date"], null),
    })(string("date", { type: ["string", "null"] }));
    assertSchema({
      type: "string",
      format: "time",
      minLength: 1,
      maxLength: 2,
      pattern: "3",
      [TYPE]: "" as Format["time"],
    })(string("time", { minLength: 1, maxLength: 2, pattern: "3" }));
  });
  await t.step("string() creates a schema from encoding", () => {
    for (const $ of Object.keys(ENCODING) as (keyof Encoding)[]) {
      assertSchema({
        type: "string",
        contentEncoding: $,
        [TYPE]: "" as Encoding[typeof $],
      })(string($));
    }
    assertSchema({
      type: "string",
      contentEncoding: "base16",
      [TYPE]: "" as Encoding["base16"],
    })(string("base16"));
    assertSchema({
      type: ["string", "null"],
      contentEncoding: "base32",
      [TYPE]: union("" as Encoding["base32"], null),
    })(string("base32", { type: ["string", "null"] }));
    assertSchema({
      type: "string",
      contentEncoding: "base64",
      minLength: 1,
      maxLength: 2,
      pattern: "3",
      [TYPE]: "" as Encoding["base64"],
    })(string("base64", { minLength: 1, maxLength: 2, pattern: "3" }));
  });
  await t.step("string() ignores non-format non-encoding", () => {
    assertSchema({ type: "string", [TYPE]: STRING })(string("" as {}));
  });
});
