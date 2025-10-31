import {
  assertEquals,
  assertMatch,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import fc from "fast-check";
import {
  type And,
  hasOwn,
  isArray,
  type Json,
  type Keys,
  type Merge,
  type Sequence,
  type Tuple,
  type Writable,
  type Xor,
} from "./lib.ts";
import type {
  Arr,
  Bit,
  Instance,
  Int,
  Nil,
  Num,
  Obj,
  Schema,
  Str,
} from "./schema.ts";
import { dereference, deToken, enToken, type Pointer } from "./pointer.ts";
import { arr, bit, int, nil, num, obj, str } from "./build.ts";
import { assert, compile, is, parse } from "./check.ts";

const fcJson = fc.jsonValue() as fc.Arbitrary<Json>;
Deno.test("lib", async (t) => {
  await t.step("Merge<> combines intersections", () => {
    assertType<IsExact<Merge<{} & {}>, {}>>(true);
    assertType<IsExact<Merge<{ 0: 0 } & {}>, { 0: 0 }>>(true);
    assertType<IsExact<Merge<{ 0: 0 } & { 1: 1 }>, { 0: 0; 1: 1 }>>(true);
    assertType<
      IsExact<
        Merge<{ 0: { 0: 0 } & { 1: 1 } } & { 1: { 0: 0 } & { 1: 1 } }>,
        { 0: { 0: 0; 1: 1 }; 1: { 0: 0; 1: 1 } }
      >
    >(true);
  });
  await t.step("Writable<> strips readonly", () => {
    assertType<IsExact<Writable<{}>, {}>>(true);
    assertType<IsExact<Writable<{ readonly 0: 0 }>, { 0: 0 }>>(true);
  });
  await t.step("Xor<> disallows non-shared properties", () => {
    assertType<IsExact<Xor<[]>, never>>(true);
    assertType<
      IsExact<
        Xor<[{ 0: 0 }, { 1: 1 }]>,
        { 0: 0; 1?: never } | { 0?: never; 1: 1 }
      >
    >(true);
    assertType<
      IsExact<
        Xor<[{ 0: 0; 2: 2 }, { 1: 1; 2: 2 }]>,
        { 0: 0; 1?: never; 2: 2 } | { 0?: never; 1: 1; 2: 2 }
      >
    >(true);
  });
  await t.step("And<> converts a union to an intersection", () => {
    assertType<IsExact<And<{} | {}>, {}>>(true);
    assertType<IsExact<And<0 | never>, 0>>(true);
    assertType<IsExact<And<0 | 1>, never>>(true);
    assertType<IsExact<And<{ 0: 0 } | { 1: 1 }>, { 0: 0; 1: 1 }>>(true);
  });
  await t.step("Tuple<> converts a union to an array", () => {
    assertType<IsExact<Tuple<never>, []>>(true);
    assertType<IsExact<Tuple<0>, [0]>>(true);
    assertType<IsExact<Tuple<0 | 1>, [0, 1]>>(true);
    assertType<IsExact<Tuple<keyof { 0: 0; 1: 1 }>, [0, 1]>>(true);
  });
  await t.step("Keys<> extracts keys as tuple", () => {
    assertType<IsExact<Keys<{}>, []>>(true);
    assertType<IsExact<Keys<never>, [string]>>(true);
    assertType<IsExact<Keys<{ "0": 0 }>, ["0"]>>(true);
    assertType<IsExact<Keys<{ 1: 1 }>, ["1"]>>(true);
  });
  await t.step("Sequence<> creates an array", () => {
    assertType<IsExact<Sequence<never, 0>, []>>(true);
    assertType<IsExact<Sequence<0, 1>, [0]>>(true);
    assertType<IsExact<Sequence<1, 2>, [1, 1]>>(true);
  });
  await t.step("isArray() aliases Array.isArray", () => {
    assertStrictEquals(isArray, Array.isArray);
    fc.assert(fc.property(fc.constantFrom<0 | readonly [1]>(0, [1]), ($) => {
      if (isArray($)) {
        assertType<IsExact<typeof $, readonly [1]>>(true);
        assertEquals($, [1]);
      } else {
        assertType<IsExact<typeof $, 0>>(true);
        assertEquals($, 0);
      }
    }));
  });
  await t.step("hasOwn() aliases Object.hasOwn", () => {
    assertStrictEquals(hasOwn, Object.hasOwn);
    fc.assert(fc.property(fc.constantFrom({ 0: 0 }, {}), ($) => {
      if (hasOwn($, "0")) {
        assertType<IsExact<typeof $, { readonly 0: 0 }>>(true);
        assertEquals($, { 0: 0 });
      } else {
        assertType<IsExact<typeof $, { readonly 0?: never }>>(true);
        assertEquals($, {});
      }
    }));
  });
});
Deno.test("pointer", async (t) => {
  await t.step("enToken() encodes a reference token", () => {
    fc.assert(fc.property(fc.string(), ($) => {
      const encoded = enToken($);
      assertMatch(encoded, /^(?:~[01]|[^/~])*$/);
      assertEquals(encoded.length, $.length + ($.match(/[/~]/g)?.length ?? 0));
    }));
  });
  await t.step("deToken() decodes a reference token", () => {
    fc.assert(fc.property(fc.string(), ($) => {
      assertEquals(deToken(enToken($)), $);
    }));
  });
  await t.step("dereference() accesses keys/indices", () => {
    fc.assert(fc.property(
      fc.string(),
      fc.nat({ max: 1e2 }),
      fcJson,
      (key, index, value) => {
        assertEquals(
          dereference(
            Array(index + 1).with(index, { [key]: value }),
            `/${index}/${enToken(key)}`,
          ),
          value,
        );
        assertEquals(
          dereference(
            { [key]: Array(index + 1).with(index, value) },
            `/${enToken(key)}/${index}`,
          ),
          value,
        );
      },
    ));
  });
  await t.step("dereference() returns the root when pointer is empty", () => {
    fc.assert(fc.property(fcJson, ($) => {
      assertStrictEquals(dereference($, ""), $);
    }));
  });
  await t.step("dereference() rejects invalid pointers", () => {
    fc.assert(fc.property(
      fcJson,
      fc.stringMatching(/^.+(?:\/(?:~[01]|[^/~])*)*$/),
      ($, pointer) => {
        assertEquals(dereference($, pointer), undefined);
      },
    ));
  });
  await t.step("dereference() rejects non-objects", () => {
    fc.assert(fc.property(
      fc.oneof(fc.constant(null), fc.boolean(), fc.double(), fc.string()),
      fc.stringMatching(/^(?:\/(?:~[01]|[^/~])*)+$/),
      ($, pointer) => {
        assertEquals(dereference($, pointer), undefined);
      },
    ));
  });
  await t.step("dereference() rejects non-numeric array indices", () => {
    fc.assert(fc.property(
      fc.array(fcJson),
      fc.stringMatching(/^\/(?:\d*\D\d*|0\d=)(?:\/(?:~[01]|[^/~])*)*$/),
      ($, pointer) => {
        assertEquals(dereference($, pointer), undefined);
      },
    ));
  });
  await t.step("dereference() rejects missing indices/keys", () => {
    fc.assert(fc.property(
      fc.stringMatching(/^(?:\/(?:~[01]|[^/~])*)+$/),
      (pointer) => {
        assertEquals(dereference({}, pointer), undefined);
      },
    ));
    fc.assert(fc.property(fc.array(fcJson), ($) => {
      assertEquals(dereference($, `/${$.length || 1}`), undefined);
    }));
  });
});
type DeepWritable<A> = A extends object
  ? { -readonly [B in keyof A]: DeepWritable<A[B]> }
  : A;
Deno.test("build", async (t) => {
  const step = <A extends Schema>(
    type: string,
    tests: (
      test: <B extends A>(actual: B) => <const C extends A>(
        expected: IsExact<B, DeepWritable<C>> extends true ? C : never,
      ) => void,
    ) => void,
  ) =>
    t.step(
      `${type}() creates a${/^[aeiou]/.test(type) ? "n" : ""} ${type} schema`,
      () => {
        tests((actual) => (expected) => assertEquals<A>(actual, expected));
      },
    );
  await step<Nil>("nil", (test) => {
    test(nil())({ type: "null" });
  });
  await step<Bit>("bit", (test) => {
    test(bit())({ type: "boolean" });
    test(bit(false))({ type: "boolean", const: false });
    test(bit([true]))({ type: "boolean", enum: [true] });
    test(bit({}))({ type: "boolean" });
  });
  await step<Int>("int", (test) => {
    test(int())({ type: "integer" });
    test(int(0))({ type: "integer", const: 0 });
    test(int([1]))({ type: "integer", enum: [1] });
    test(int({
      minimum: 2,
      maximum: 3,
      exclusiveMinimum: 4,
      exclusiveMaximum: 5,
      multipleOf: 6,
    }))({
      type: "integer",
      minimum: 2,
      maximum: 3,
      exclusiveMinimum: 4,
      exclusiveMaximum: 5,
      multipleOf: 6,
    });
  });
  await step<Num>("num", (test) => {
    test(num())({ type: "number" });
    test(num(0))({ type: "number", const: 0 });
    test(num([1]))({ type: "number", enum: [1] });
    test(num({
      minimum: 2,
      maximum: 3,
      exclusiveMinimum: 4,
      exclusiveMaximum: 5,
      multipleOf: 6,
    }))({
      type: "number",
      minimum: 2,
      maximum: 3,
      exclusiveMinimum: 4,
      exclusiveMaximum: 5,
      multipleOf: 6,
    });
  });
  await step<Str>("str", (test) => {
    test(str())({ type: "string" });
    test(str("0"))({ type: "string", const: "0" });
    test(str(["1"]))({ type: "string", enum: ["1"] });
    test(str({
      minLength: 2,
      maxLength: 3,
      pattern: "4",
      format: "email",
      contentEncoding: "base16",
    }))({
      type: "string",
      minLength: 2,
      maxLength: 3,
      pattern: "4",
      format: "email",
      contentEncoding: "base16",
    });
  });
  await step<Arr>("arr", (test) => {
    test(arr(nil()))({ type: "array", items: { type: "null" } });
    test(arr(nil(), { minItems: 0, maxItems: 1, uniqueItems: false }))({
      type: "array",
      items: { type: "null" },
      minItems: 0,
      maxItems: 1,
      uniqueItems: false,
    });
    test(arr([]))({
      type: "array",
      prefixItems: [],
      items: false,
      minItems: 0,
      maxItems: 0,
    });
    test(arr([nil()]))({
      type: "array",
      prefixItems: [{ type: "null" }],
      items: false,
      minItems: 1,
      maxItems: 1,
    });
    test(arr([nil()], { minItems: 1, maxItems: 2, uniqueItems: true }))({
      type: "array",
      prefixItems: [{ type: "null" }],
      items: false,
      minItems: 1,
      maxItems: 2,
      uniqueItems: true,
    });
  });
  await step<Obj>("obj", (test) => {
    test(obj(nil()))({
      type: "object",
      additionalProperties: { type: "null" },
    });
    test(obj(nil(), {
      propertyKeys: str(),
      minProperties: 0,
      maxProperties: 1,
    }))({
      type: "object",
      additionalProperties: { type: "null" },
      minProperties: 0,
      maxProperties: 1,
      propertyKeys: { type: "string" },
    });
    test(obj({}))({
      type: "object",
      properties: {},
      additionalProperties: false,
      required: [],
    });
    test(obj({}, { minProperties: 0, maxProperties: 1, required: ["2"] }))({
      type: "object",
      properties: {},
      additionalProperties: false,
      minProperties: 0,
      maxProperties: 1,
      required: ["2"],
    });
    test(obj({ 0: nil() }))({
      type: "object",
      properties: { 0: { type: "null" } },
      additionalProperties: false,
      required: ["0"],
    });
    test(obj({ 0: nil(), 1: nil() }, {
      minProperties: 0,
      maxProperties: 1,
      required: ["2"],
    }))({
      type: "object",
      properties: { 0: { type: "null" }, 1: { type: "null" } },
      additionalProperties: false,
      minProperties: 0,
      maxProperties: 1,
      required: ["2"],
    });
    test(obj("0", { 1: obj({}) }))({
      type: "object",
      required: ["0"],
      oneOf: [obj({ 0: str("1") }, { required: [] })],
    });
    test(obj("0", {
      1: obj({ 1: int(1) }, { minProperties: 1 }),
      2: obj({ 2: int(2) }, { maxProperties: 2 }),
    }))({
      type: "object",
      required: ["0"],
      oneOf: [
        obj({ 0: str("1"), 1: int(1) }, { required: ["1"], minProperties: 1 }),
        obj({ 0: str("2"), 2: int(2) }, { required: ["2"], maxProperties: 2 }),
      ],
    });
  });
});
