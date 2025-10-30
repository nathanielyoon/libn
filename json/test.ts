import { assertEquals, assertStrictEquals } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import fc from "fast-check";
import {
  type And,
  hasOwn,
  isArray,
  type Keys,
  type Merge,
  type Sequence,
  type Tuple,
  type Writable,
  type Xor,
} from "./lib.ts";
import { arr, bit, int, nil, num, obj, one, str } from "./build.ts";

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
    assertType<
      IsExact<Writable<{ readonly 0: { readonly 0: 0 } }>, { 0: { 0: 0 } }>
    >(true);
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
const assertBuild =
  <A>(actual: A) =>
  <B extends A>(expected: IsExact<A, B> extends true ? B : never) =>
    assertEquals(actual, expected);
Deno.test("build", async (t) => {
  await t.step("nil() creates a Nil schema", () => {
    assertBuild(nil())({ type: "null" });
  });
  await t.step("bit() creates a Bit schema", () => {
    assertBuild(bit())({ type: "boolean" });
    assertBuild(bit(false))({ type: "boolean", const: false });
    assertBuild(bit([true]))({ type: "boolean", enum: [true] });
    assertBuild(bit({}))({ type: "boolean" });
  });
  await t.step("int() creates an Int schema", () => {
    assertBuild(int())({ type: "integer" });
    assertBuild(int(0))({ type: "integer", const: 0 });
    assertBuild(int([1]))({ type: "integer", enum: [1] });
    assertBuild(int({
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
  await t.step("num() creates an Num schema", () => {
    assertBuild(num())({ type: "number" });
    assertBuild(num(0))({ type: "number", const: 0 });
    assertBuild(num([1]))({ type: "number", enum: [1] });
    assertBuild(num({
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
  await t.step("str() creates a Str schema", () => {
    assertBuild(str())({ type: "string" });
    assertBuild(str("0"))({ type: "string", const: "0" });
    assertBuild(str(["1"]))({ type: "string", enum: ["1"] });
    assertBuild(str({
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
  await t.step("arr() creates an Arr schema", () => {
    assertBuild(arr(nil()))({ type: "array", items: { type: "null" } });
    assertBuild(arr(nil(), { minItems: 0, maxItems: 1, uniqueItems: false }))({
      type: "array",
      items: { type: "null" },
      minItems: 0,
      maxItems: 1,
      uniqueItems: false,
    });
    assertBuild(arr([]))({
      type: "array",
      prefixItems: [],
      items: false,
      minItems: 0,
      maxItems: 0,
    });
    assertBuild(arr([nil()]))({
      type: "array",
      prefixItems: [{ type: "null" }],
      items: false,
      minItems: 1,
      maxItems: 1,
    });
    assertBuild(arr([nil()], { minItems: 1, maxItems: 2, uniqueItems: true }))({
      type: "array",
      prefixItems: [{ type: "null" }],
      items: false,
      minItems: 1,
      maxItems: 2,
      uniqueItems: true,
    });
  });
  await t.step("obj() creates an Obj schema", () => {
    assertBuild(obj(nil()))({
      type: "object",
      additionalProperties: { type: "null" },
    });
    assertBuild(obj(nil(), {
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
    assertBuild(obj({}))({
      type: "object",
      properties: {},
      additionalProperties: false,
      required: [],
    });
    assertBuild(obj({}, {
      minProperties: 0,
      maxProperties: 1,
      required: ["2"],
    }))({
      type: "object",
      properties: {},
      additionalProperties: false,
      minProperties: 0,
      maxProperties: 1,
      required: ["2"],
    });
    assertBuild(obj({ 0: nil() }))({
      type: "object",
      properties: { 0: { type: "null" } },
      additionalProperties: false,
      required: ["0"],
    });
    assertBuild(obj({ 0: nil(), 1: nil() }, {
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
  });
  await t.step("one() creates a One schema", () => {
    assertBuild(one("0", { 1: obj({}) }))({
      type: "object",
      required: ["0"],
      oneOf: [obj({ 0: str("1") }, { required: [] })],
    });
    assertBuild(one("0", {
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
