import {
  assertEquals,
  assertInstanceOf,
  assertMatch,
  assertStrictEquals,
  fail,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import fc from "fast-check";
import { unrexp } from "@libn/text/normalize";
import { enB16 } from "@libn/base/b16";
import { enB32 } from "@libn/base/b32";
import { enB64 } from "@libn/base/b64";
import { enH32 } from "@libn/base/h32";
import { enU64 } from "@libn/base/u64";
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
import { assert, BASES, compile, FORMATS, is, parse } from "./check.ts";

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
  const fcJson = fc.jsonValue() as fc.Arbitrary<Json>;
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
      fc.stringMatching(/^(?:\/(?:~[01]|[^/~])*)+$/).filter(($) =>
        !(deToken($.slice(1)) in {})
      ),
      (pointer) => {
        assertEquals(dereference({}, pointer), undefined);
      },
    ));
    fc.assert(fc.property(fc.array(fcJson), ($) => {
      assertEquals(dereference($, `/${$.length || 1}`), undefined);
    }));
  });
});
Deno.test("build", async (t) => {
  type DeepWritable<A> = A extends object
    ? { -readonly [B in keyof A]: DeepWritable<A[B]> }
    : A;
  const step = <A extends Schema>(
    type: string,
    tests: (
      test: <B extends A>(actual: B) => <const C extends A>(
        expected: IsExact<B, DeepWritable<C>> extends true ? C : never,
      ) => void,
    ) => void,
  ) =>
    t.step(`${type}() creates ${type} schemas`, () => {
      tests((actual) => (expected) => assertEquals<A>(actual, expected));
    });
  await step<Nil>("nil", (test) => {
    test(nil())({ type: "null" });
    test(nil(bit()))({
      type: ["null", "boolean"],
      oneOf: [{ type: "null" }, { type: "boolean" }],
    });
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
    });
    test(arr([nil()]))({
      type: "array",
      prefixItems: [{ type: "null" }],
      items: false,
      minItems: 1,
    });
    test(arr([nil()], { minItems: 1, uniqueItems: true }))({
      type: "array",
      prefixItems: [{ type: "null" }],
      items: false,
      minItems: 1,
      uniqueItems: true,
    });
  });
  await step<Obj>("obj", (test) => {
    test(obj(nil()))({
      type: "object",
      additionalProperties: { type: "null" },
    });
    test(obj(nil(), {
      propertyNames: str(),
      minProperties: 0,
      maxProperties: 1,
    }))({
      type: "object",
      additionalProperties: { type: "null" },
      minProperties: 0,
      maxProperties: 1,
      propertyNames: { type: "string" },
    });
    test(obj({}))({
      type: "object",
      properties: {},
      additionalProperties: false,
      required: [],
    });
    test(obj({}, { required: [""] }))({
      type: "object",
      properties: {},
      additionalProperties: false,
      required: [""],
    });
    test(obj({ 0: nil() }))({
      type: "object",
      properties: { 0: { type: "null" } },
      additionalProperties: false,
      required: ["0"],
    });
    test(obj({ 0: nil(), 1: nil() }, { required: [""] }))({
      type: "object",
      properties: { 0: { type: "null" }, 1: { type: "null" } },
      additionalProperties: false,
      required: [""],
    });
    test(obj("0", { 1: obj({}) }))({
      type: "object",
      required: ["0"],
      oneOf: [obj({ 0: str("1") }, { required: [] })],
    });
  });
});
Deno.test("check", async (t) => {
  const assertCheck = <const A>(
    $: A extends Schema ?
        | fc.Arbitrary<{
          schema: A;
          ok: readonly Instance<A>[];
          no: { [_ in Pointer<A>]: readonly Json[] };
        }>
        | {
          schema: A;
          ok: readonly Instance<A>[];
          no: { [_ in Pointer<A>]: readonly Json[] };
        }
      : never,
  ) => {
    const [arbitrary, numRuns]: [
      fc.Arbitrary<
        A extends Schema ? {
            schema: A;
            ok: readonly Instance<A>[];
            no: { [_ in Pointer<A>]: readonly Json[] };
          }
          : never
      >,
      number,
    ] = ($ instanceof fc.Arbitrary ? [$, 64] : [fc.constant($), 1]) as any;
    fc.assert(
      fc.property(arbitrary, ({ schema, ok, no }) => {
        const check = compile(schema);
        for (const $ of ok) {
          assertEquals(parse(check, $), { state: true, value: $ });
          assertEquals(is(check, $), true);
          assert(check, $);
        }
        for (const key of Object.keys(no) as (keyof typeof no)[]) {
          for (const $ of no[key]) {
            assertEquals(parse(check, $), { state: false, value: [key] });
            assertEquals(is(check, $), false);
            try {
              assert(check, $);
            } catch (thrown) {
              assertInstanceOf(thrown, Error);
              assertEquals(thrown.message, "1");
              assertEquals(thrown.cause, [key]);
              continue;
            }
            fail();
          }
        }
      }),
      { numRuns },
    );
  };
  const not = (...value: Extract<Schema["type"], string>[]): Json[] =>
    ([
      ["null", null],
      ["boolean", false],
      ["integer", 0],
      ["number", Number.MIN_VALUE],
      ["string", ""],
      ["array", []],
      ["object", {}],
    ] as const).filter(($) => !value.includes($[0])).map(($) => $[1]);
  const fcNumber = fc.double({ noDefaultInfinity: true, noNaN: true });
  const fcUnique = <A>($: fc.Arbitrary<A>) =>
    fc.uniqueArray($, {
      minLength: 2,
      comparator: "SameValueZero",
    }) as fc.Arbitrary<[A, A, ...A[]]>;
  const fcOrdered = <A extends number>(size: A, value?: fc.Arbitrary<number>) =>
    fc.uniqueArray(value ?? fcNumber, {
      minLength: size,
      maxLength: size,
      comparator: "SameValueZero",
    }).map(($) => [...new Float64Array($).sort()] as Sequence<number, A>);
  const fcLength = fc.integer({ min: 1, max: 64 });
  await t.step("compile() checks nil schemas", () => {
    assertCheck({
      schema: nil(),
      ok: [null],
      no: { "/type~": not("null") },
    });
    assertCheck({
      schema: nil(bit(false)),
      ok: [null, false],
      no: {
        "/oneOf/1/type~": not("null", "boolean"),
        "/oneOf/1/const~": [true],
      },
    });
  });
  await t.step("compile() checks bit schemas", () => {
    assertCheck({
      schema: bit(),
      ok: [false, true],
      no: { "/type~": not("boolean") },
    });
    assertCheck(
      fc.boolean().map(($) => ({
        schema: bit($),
        ok: [$],
        no: { "/type~": [], "/const~": [!$] },
      })),
    );
    assertCheck(
      fc.boolean().map(($) => ({
        schema: bit([$]),
        ok: [$],
        no: { "/type~": [], "/enum~": [!$] },
      })),
    );
    assertCheck({
      schema: bit([false, true]),
      ok: [false, true],
      no: { "/type~": [], "/enum~": [] },
    });
  });
  await t.step("compile() checks int schemas", () => {
    const fcInteger = fcNumber.map(Math.round);
    assertCheck({
      schema: int(),
      ok: [0],
      no: { "/type~": not("integer") },
    });
    const fcEnum = fcUnique(fcInteger);
    assertCheck(fcEnum.map(([head, ...tail]) => ({
      schema: int(head),
      ok: [head],
      no: { "/type~": [], "/const~": tail },
    })));
    assertCheck(fcEnum.map(([head, ...tail]) => ({
      schema: int(tail),
      ok: tail,
      no: { "/type~": [], "/enum~": [head] },
    })));
    const fcPair = fcOrdered(2, fcInteger);
    assertCheck(fcPair.map(([min, max]) => ({
      schema: int({ minimum: max }),
      ok: [max],
      no: { "/type~": [], "/minimum~": [min] },
    })));
    assertCheck(fcPair.map(([min, max]) => ({
      schema: int({ maximum: min }),
      ok: [min],
      no: { "/type~": [], "/maximum~": [max] },
    })));
    assertCheck(fcPair.map(([min, max]) => ({
      schema: int({ exclusiveMinimum: min }),
      ok: [max],
      no: { "/type~": [], "/exclusiveMinimum~": [min] },
    })));
    assertCheck(fcPair.map(([min, max]) => ({
      schema: int({ exclusiveMaximum: max }),
      ok: [min],
      no: { "/type~": [], "/exclusiveMaximum~": [max] },
    })));
    assertCheck(
      fcPair.filter(($) => !!$[0] && !!($[1] % $[0])).map(([min, max]) => ({
        schema: int({ multipleOf: min }),
        ok: [min],
        no: { "/type~": [], "/multipleOf~": [max] },
      })),
    );
  });
  await t.step("compile() checks num schemas", () => {
    assertCheck({
      schema: num(),
      ok: [0],
      no: { "/type~": not("integer", "number") },
    });
    const fcEnum = fcUnique(fcNumber);
    assertCheck(fcEnum.map(([head, ...tail]) => ({
      schema: num(head),
      ok: [head],
      no: { "/type~": [], "/const~": tail },
    })));
    assertCheck(fcEnum.map(([head, ...tail]) => ({
      schema: num(tail),
      ok: tail,
      no: { "/type~": [], "/enum~": [head] },
    })));
    const fcPair = fcOrdered(2, fcNumber);
    assertCheck(fcPair.map(([min, max]) => ({
      schema: num({ minimum: max }),
      ok: [max],
      no: { "/type~": [], "/minimum~": [min] },
    })));
    assertCheck(fcPair.map(([min, max]) => ({
      schema: num({ maximum: min }),
      ok: [min],
      no: { "/type~": [], "/maximum~": [max] },
    })));
    assertCheck(fcPair.map(([min, max]) => ({
      schema: num({ exclusiveMinimum: min }),
      ok: [max],
      no: { "/type~": [], "/exclusiveMinimum~": [min] },
    })));
    assertCheck(fcPair.map(([min, max]) => ({
      schema: num({ exclusiveMaximum: max }),
      ok: [min],
      no: { "/type~": [], "/exclusiveMaximum~": [max] },
    })));
    assertCheck(
      fcPair.filter(($) => !!$[0] && !!($[1] % $[0])).map(([min, max]) => ({
        schema: num({ multipleOf: min }),
        ok: [min],
        no: { "/type~": [], "/multipleOf~": [max] },
      })),
    );
  });
  await t.step("compile() checks str schemas()", () => {
    const fcString = fc.string({ unit: "grapheme", size: "medium" });
    assertCheck({
      schema: str(),
      ok: [""],
      no: { "/type~": not("string") },
    });
    const fcEnum = fcUnique(fcString);
    assertCheck(fcEnum.map(([head, ...tail]) => ({
      schema: str(head),
      ok: [head],
      no: { "/type~": [], "/const~": tail },
    })));
    assertCheck(fcEnum.map(([head, ...tail]) => ({
      schema: str(tail),
      ok: tail,
      no: { "/type~": [], "/enum~": [head] },
    })));
    const fcPair = fcOrdered(2, fcLength);
    assertCheck(fcPair.map(([min, max]) => ({
      schema: str({ minLength: max }),
      ok: ["\0".repeat(max)],
      no: { "/type~": [], "/minLength~": ["\0".repeat(min)] },
    })));
    assertCheck(fcPair.map(([min, max]) => ({
      schema: str({ maxLength: min }),
      ok: ["\0".repeat(min)],
      no: { "/type~": [], "/maxLength~": ["\0".repeat(max)] },
    })));
    assertCheck(fcString.map(($) => ({
      schema: str({ pattern: `^${unrexp($)}$` }),
      ok: [$],
      no: { "/type~": [], "/pattern~": [$ + "\0"] },
    })));
    assertCheck({
      schema: str({ pattern: "\\" }),
      ok: [""],
      no: { "/type~": [], "/pattern~": [] },
    });
    const formats = {
      ...([["date", 0, 10], ["time", 11, 24], ["date-time", 0, 24]] as const)
        .reduce(
          (to, [key, min, max]) => ({
            ...to,
            [key]: fc.date({
              noInvalidDate: true,
              min: new Date("0000"),
              max: new Date("9999-12-31T23:59:59.999Z"),
            }).map(($) => $.toISOString().slice(min, max)),
          }),
          {} as { [_ in "date" | "time" | "date-time"]: fc.Arbitrary<string> },
        ),
      ...(["email", "uri", "uuid"] as const).reduce((to, key) => ({
        ...to,
        [key]: fc.stringMatching(FORMATS[key]).map(($) => $.trim().normalize())
          .filter(RegExp.prototype.test.bind(FORMATS[key])),
      }), {} as { [_ in "email" | "uri" | "uuid"]: fc.Arbitrary<string> }),
    };
    assertCheck(
      fc.constantFrom(...Object.keys(FORMATS) as (keyof typeof FORMATS)[])
        .chain((format) =>
          fc.record({
            schema: fc.constant(str({ format })),
            ok: fc.tuple(formats[format]),
            no: fc.record({
              "/type~": fc.constant(not("string")),
              "/format~": fc.tuple(
                fc.string().filter(($) => !FORMATS[format].test($)),
              ),
            }),
          })
        ),
    );
    const bases = {
      "base16": enB16,
      "base32": enB32,
      "base32hex": enH32,
      "base64": enB64,
      "base64url": enU64,
    };
    assertCheck(
      fc.constantFrom(...Object.keys(BASES) as (keyof typeof BASES)[])
        .chain((base) =>
          fc.record({
            schema: fc.constant(str({ contentEncoding: base })),
            ok: fc.tuple(fc.uint8Array().map(bases[base])),
            no: fc.record({
              "/type~": fc.constant(not("string")),
              "/contentEncoding~": fc.tuple(
                fc.string().filter(($) => !BASES[base].test($)),
              ),
            }),
          })
        ),
    );
  });
  await t.step("compile() checks arr schemas", () => {
    assertCheck({
      schema: arr(nil()),
      ok: [[]],
      no: { "/type~": not("array") },
    });
    assertCheck({
      schema: arr([nil()]),
      ok: [[null]] as [null][],
      no: {
        "/type~": [],
        "/items~": [],
        "/prefixItems/0/type~/0": [[not("array")]],
        "/minItems~": [[]],
      },
    });
    assertCheck(fcLength.map(($) => ({
      schema: arr(nil()),
      ok: [[], [null], Array($).fill(null)],
      no: {
        "/type~": [],
        ...Array($).keys().reduce((to, z) => ({
          ...to,
          [`/items/type~/${z}`]: [Array(z + 1).fill(null).with(z, not("null"))],
        }), {}),
      },
    })));
    assertCheck(fcLength.map(($) => ({
      schema: arr(nil(), { minItems: $ + 1 }),
      ok: [Array($ + 1).fill(null)],
      no: { "/type~": [], "/minItems~": [[], Array($).fill(null)] },
    })));
    assertCheck(fcLength.map(($) => ({
      schema: arr([nil(), ...Array<{ type: "null" }>($).fill(nil())], {
        minItems: $,
      }),
      ok: [Array($).fill(null) as [null]],
      no: { "/type~": [], "/minItems~": [[]], "/items~": [] },
    })));
    assertCheck(fcLength.map(($) => ({
      schema: arr(nil(), { maxItems: $ }),
      ok: [[], Array($).fill(null)],
      no: { "/type~": [], "/maxItems~": [Array($ + 1).fill(null)] },
    })));
    assertCheck(fcLength.map(($) => ({
      schema: arr(Array<{ type: "null" }>($).fill(nil())),
      ok: [],
      no: {
        "/type~": [],
        "/items~": [Array($ + 1).fill(null)],
        "/minItems~": [],
      },
    })));
    assertCheck({
      schema: arr(nil(), { uniqueItems: true }),
      ok: [[], [null]],
      no: { "/type~": [], "/uniqueItems~": [[null, null]] },
    });
    assertCheck({
      schema: arr([bit(), bit()], { uniqueItems: true }),
      ok: [[false, true], [true, false]] as [boolean, boolean][],
      no: {
        "/type~": [],
        "/items~": [],
        "/minItems~": [],
        "/uniqueItems~": [[true, true], [false, false]],
        "/prefixItems/0/type~/0": [],
        "/prefixItems/1/type~/1": [],
      },
    });
    assertCheck(
      fcUnique(fc.string()).map((keys) => (offset: number) =>
        keys.reduce<{ [_: string]: number }>(
          (to, $, z) => ({ ...to, [$]: z + offset }),
          {},
        )
      ).map((object) => ({
        schema: arr(obj(int()), { uniqueItems: true }),
        ok: [[], [object(0)], [object(0), object(1), object(2)]],
        no: {
          "/type~": [],
          "/uniqueItems~": [[object(0), object(0)], [
            object(0),
            object(1),
            Object.fromEntries(Object.entries(object(0)).reverse()),
          ], [
            object(0),
            object(1),
            Object.fromEntries(Object.entries(object(1)).reverse()),
          ]],
        },
      })),
    );
  });
  await t.step("compile() checks obj schemas", () => {
    assertCheck({
      schema: obj(nil()),
      ok: [{}, { "": null }],
      no: {
        "/type~": not("object"),
        "/additionalProperties/type~/": [{ "": not("null") }],
      },
    });
    assertCheck({
      schema: obj({ "": nil() }),
      ok: [{ "": null }],
      no: {
        "/type~": not("object"),
        "/properties//type~/": [{ "": not("null") }],
        "/required/0~": [{}],
      },
    });
    assertCheck({
      schema: obj("", { 0: obj({ 0: nil() }), 1: obj({ 1: nil() }) }),
      ok: [{ "": "0", 0: null }, { "": "1", 1: null }],
      no: {
        "/type~": not("object"),
        "/required/0~": [{}, { 0: null }, { 1: null }],
        "/oneOf~": [{ "": "" }, { "": not("string") }],
        "/oneOf/0/properties/0/type~/0": [{ "": "0", 0: not("null") }],
        "/oneOf/1/properties/1/type~/1": [{ "": "1", 1: not("null") }],
        "/oneOf/0/required/0~": [{ "": "0" }],
        "/oneOf/1/required/0~": [{ "": "1" }],
      },
    });
    assertCheck(
      fcUnique(fc.string()).map(([head, ...tail]) => ({
        schema: obj(nil(), { propertyNames: str(head) }),
        ok: [{}, { [head]: null }],
        no: {
          "/type~": [],
          ...tail.reduce((to, key) => ({
            ...to,
            [`/propertyNames/const~/${enToken(key)}`]: [{ [key]: null }],
          }), {}),
        },
      })),
    );
    const object = (size: number) =>
      Array(size).keys().reduce((to, key) => ({ ...to, [key]: null }), {});
    assertCheck(fcLength.map(($) => ({
      schema: obj(nil(), { minProperties: $ }),
      ok: [object($)],
      no: { "/type~": [], "/minProperties~": [{}, object($ - 1)] },
    })));
    assertCheck(fcLength.map(($) => ({
      schema: obj(nil(), { maxProperties: $ }),
      ok: [{}],
      no: { "/type~": [], "/maxProperties~": [object($ + 1)] },
    })));
  });
});
