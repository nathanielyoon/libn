import { enB16 } from "@libn/base/b16";
import { enB32 } from "@libn/base/b32";
import { enB64 } from "@libn/base/b64";
import { enH32 } from "@libn/base/h32";
import { enU64 } from "@libn/base/u64";
import { unrexp } from "@libn/utf";
import {
  assertEquals,
  assertInstanceOf,
  assertMatch,
  assertStrictEquals,
  fail,
} from "@std/assert";
import fc from "fast-check";
import { arr, bit, int, nil, num, obj, str } from "@libn/json/build";
import { assert, BASES, compile, FORMATS, is, parse } from "@libn/json/check";
import {
  type And,
  hasOwn,
  isArray,
  type Json,
  type Merge,
  type Tuple,
  type Writable,
  type Xor,
} from "@libn/json/lib";
import {
  dereference,
  deToken,
  enToken,
  type Pointer,
} from "@libn/json/pointer";
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
} from "@libn/json/schema";
import { type Is, type } from "../test.ts";

Deno.test("lib.Json : JSON values", () => {
  type<Json>(null);
  type<Json>(true), type<Json>(false);
  type<Json>(0), type<Json>(0.1);
  type<Json>("");
  type<Json>([]), type<Json>([null]);
  type<Json>({}), type<Json>({ "": "" });
});
type Sequence<A, B extends number, C extends A[] = []> = B extends B
  ? C["length"] extends B ? C : Sequence<A, B, [...C, A]>
  : never;
Deno.test("lib.Merge : intersections", () => {
  type<Is<Merge<{} & {}>, {}>>(true);
  type<Is<Merge<{ 0: 0 } & {}>, { 0: 0 }>>(true);
  type<Is<Merge<{ 0: 0 } & { 1: 1 }>, { 0: 0; 1: 1 }>>(true);
  type<
    Is<
      Merge<{ 0: { 0: 0 } & { 1: 1 } } & { 1: { 0: 0 } & { 1: 1 } }>,
      { 0: { 0: 0; 1: 1 }; 1: { 0: 0; 1: 1 } }
    >
  >(true);
});
Deno.test("lib.Writable : readonly", () => {
  type<Is<Writable<{}>, {}>>(true);
  type<Is<Writable<{ readonly 0: 0 }>, { 0: 0 }>>(true);
});
Deno.test("lib.Xor disallows non-shared properties", () => {
  type<Is<Xor<[]>, never>>(true);
  type<
    Is<
      Xor<[{ 0: 0 }, { 1: 1 }]>,
      { 0: 0; 1?: never } | { 0?: never; 1: 1 }
    >
  >(true);
  type<
    Is<
      Xor<[{ 0: 0; 2: 2 }, { 1: 1; 2: 2 }]>,
      { 0: 0; 1?: never; 2: 2 } | { 0?: never; 1: 1; 2: 2 }
    >
  >(true);
});
Deno.test("lib.And : union", () => {
  type<Is<And<{} | {}>, {}>>(true);
  type<Is<And<0 | never>, 0>>(true);
  type<Is<And<0 | 1>, never>>(true);
  type<Is<And<{ 0: 0 } | { 1: 1 }>, { 0: 0; 1: 1 }>>(true);
});
Deno.test("lib.Tuple : union", () => {
  type<Is<Tuple<never>, []>>(true);
  type<Is<Tuple<0>, [0]>>(true);
  type<Is<Tuple<0 | 1>, [0, 1]>>(true);
  type<Is<Tuple<keyof { 0: 0; 1: 1 }>, [0, 1]>>(true);
});
Deno.test("lib.isArray :: Array.isArray", () => {
  fc.assert(fc.property(fc.constantFrom<0 | readonly [1]>(0, [1]), ($) => {
    if (isArray($)) assertEquals(type<readonly [1]>()($), [1]);
    else assertEquals(type<0>()($), 0);
  }));
});
Deno.test("lib.hasOwn :: Object.hasOwn", () => {
  fc.assert(fc.property(fc.constantFrom({ 0: 0 }, {}), ($) => {
    if (hasOwn($, "0")) assertEquals(type<{ readonly 0: 0 }>()($), { 0: 0 });
    else assertEquals(type<{ readonly 0?: never }>()($), {});
  }));
});

const fcJson = fc.jsonValue() as fc.Arbitrary<Json>;
Deno.test("pointer.enToken : reference token", () => {
  fc.assert(fc.property(fc.string(), ($) => {
    const encoded = enToken($);
    assertMatch(encoded, /^(?:~[01]|[^/~])*$/);
    assertEquals(encoded.length, $.length + ($.match(/[/~]/g)?.length ?? 0));
  }));
});
Deno.test("pointer.deToken : reference token", () => {
  fc.assert(fc.property(fc.string(), ($) => {
    assertEquals(deToken(enToken($)), $);
  }));
});
Deno.test("pointer.dereference : keys/indices", () => {
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
Deno.test("pointer.dereference : empty pointer", () => {
  fc.assert(fc.property(fcJson, ($) => {
    assertStrictEquals(dereference($, ""), $);
  }));
});
Deno.test("pointer.dereference : invalid pointers", () => {
  fc.assert(fc.property(
    fcJson,
    fc.stringMatching(/^.+(?:\/(?:~[01]|[^/~])*)*$/),
    ($, pointer) => {
      assertEquals(dereference($, pointer), undefined);
    },
  ));
});
Deno.test("pointer.dereference : non-objects", () => {
  fc.assert(fc.property(
    fc.oneof(fc.constant(null), fc.boolean(), fc.double(), fc.string()),
    fc.stringMatching(/^(?:\/(?:~[01]|[^/~])*)+$/),
    ($, pointer) => {
      assertEquals(dereference($, pointer), undefined);
    },
  ));
});
Deno.test("pointer.dereference : non-numeric array indices", () => {
  fc.assert(fc.property(
    fc.array(fcJson),
    fc.stringMatching(/^\/(?:\d*\D\d*|0\d=)(?:\/(?:~[01]|[^/~])*)*$/),
    ($, pointer) => {
      assertEquals(dereference($, pointer), undefined);
    },
  ));
});
Deno.test("pointer.dereference : missing keys", () => {
  fc.assert(fc.property(
    fc.stringMatching(/^(?:\/(?:~[01]|[^/~])*)+$/).filter(($) =>
      !(deToken($.slice(1)) in {})
    ),
    (pointer) => {
      assertEquals(dereference({}, pointer), undefined);
    },
  ));
});
Deno.test("pointer.dereference : missing indices", () => {
  fc.assert(fc.property(fc.array(fcJson), ($) => {
    assertEquals(dereference($, `/${$.length || 1}`), undefined);
  }));
});

Deno.test("build.nil :: Nil schemas", () => {
  type(nil() satisfies Nil)({ type: "null" });
  type(nil(bit()) satisfies Nil)({
    type: ["null", "boolean"],
    oneOf: [{ type: "null" }, { type: "boolean" }],
  });
});
Deno.test("build.bit :: Bit schemas", () => {
  type(bit() satisfies Bit)({ type: "boolean" });
  type(bit(false) satisfies Bit)({ type: "boolean", const: false });
  type(bit([true]) satisfies Bit)({ type: "boolean", enum: [true] as const });
  type(bit({}) satisfies Bit)({ type: "boolean" });
});
Deno.test("build.int :: Int schemas", () => {
  type(int() satisfies Int)({ type: "integer" });
  type(int(0) satisfies Int)({ type: "integer", const: 0 });
  type(int([1]) satisfies Int)({ type: "integer", enum: [1] as const });
  type(
    int({
      minimum: 2,
      maximum: 3,
      exclusiveMinimum: 4,
      exclusiveMaximum: 5,
      multipleOf: 6,
    }) satisfies Int,
  )({
    type: "integer",
    minimum: 2,
    maximum: 3,
    exclusiveMinimum: 4,
    exclusiveMaximum: 5,
    multipleOf: 6,
  });
});
Deno.test("build.num :: Num schemas", () => {
  type(num() satisfies Num)({ type: "number" });
  type(num(0) satisfies Num)({ type: "number", const: 0 });
  type(num([1]) satisfies Num)({ type: "number", enum: [1] as const });
  type(
    num({
      minimum: 2,
      maximum: 3,
      exclusiveMinimum: 4,
      exclusiveMaximum: 5,
      multipleOf: 6,
    }) satisfies Num,
  )({
    type: "number",
    minimum: 2,
    maximum: 3,
    exclusiveMinimum: 4,
    exclusiveMaximum: 5,
    multipleOf: 6,
  });
});
Deno.test("build.str :: Str schemas", () => {
  type(str() satisfies Str)({ type: "string" });
  type(str("0") satisfies Str)({ type: "string", const: "0" });
  type(str(["1"]) satisfies Str)({ type: "string", enum: ["1"] as const });
  type(
    str({
      minLength: 2,
      maxLength: 3,
      pattern: "4",
      format: "email",
      contentEncoding: "base16",
    }) satisfies Str,
  )({
    type: "string",
    minLength: 2,
    maxLength: 3,
    pattern: "4",
    format: "email",
    contentEncoding: "base16",
  });
});
Deno.test("build.arr :: Arr schemas", () => {
  type(arr(nil(), {}) satisfies Arr)({
    type: "array",
    items: { type: "null" },
  });
  type(
    arr(nil(), { minItems: 0, maxItems: 1, uniqueItems: false }) satisfies Arr,
  )({
    type: "array",
    items: { type: "null" },
    minItems: 0,
    maxItems: 1,
    uniqueItems: false,
  });
  type(arr([]) satisfies Arr)({
    type: "array",
    prefixItems: [],
    items: false,
    minItems: 0,
  });
  type(arr([nil()]) satisfies Arr)({
    type: "array",
    prefixItems: [{ type: "null" }],
    items: false,
    minItems: 1,
  });
  type(arr([nil()], { minItems: 1, uniqueItems: true }) satisfies Arr)({
    type: "array",
    prefixItems: [{ type: "null" }],
    items: false,
    minItems: 1,
    uniqueItems: true,
  });
});
Deno.test("build.obj :: Obj schemas", () => {
  type(obj(nil(), {}) satisfies Obj)({
    type: "object",
    additionalProperties: { type: "null" },
  });
  type(
    obj(nil(), {
      propertyNames: str(),
      minProperties: 0,
      maxProperties: 1,
    }) satisfies Obj,
  )({
    type: "object",
    additionalProperties: { type: "null" },
    minProperties: 0,
    maxProperties: 1,
    propertyNames: { type: "string" },
  });
  type(obj({}) satisfies Obj)({
    type: "object",
    properties: {},
    additionalProperties: false,
    required: [],
  });
  type(obj({}, { required: [""] }) satisfies Obj)({
    type: "object",
    properties: {},
    additionalProperties: false,
    required: [""],
  });
  type(obj({ 0: nil() }) satisfies Obj)({
    type: "object",
    properties: { 0: { type: "null" } },
    additionalProperties: false,
    required: ["0"],
  });
  type(obj({ 0: nil(), 1: nil() }, { required: [""] }) satisfies Obj)({
    type: "object",
    properties: { 0: { type: "null" }, 1: { type: "null" } },
    additionalProperties: false,
    required: [""],
  });
  type(obj("0", { 1: obj({}) }) satisfies Obj)({
    type: "object",
    required: ["0"],
    oneOf: [obj({ 0: str("1") }, { required: [] })],
  });
});

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
Deno.test("check.compile : Nil schemas", () => {
  assertCheck({ schema: nil(), ok: [null], no: { "/type~": not("null") } });
  assertCheck({
    schema: nil(bit(false)),
    ok: [null, false],
    no: { "/oneOf/1/type~": not("null", "boolean"), "/oneOf/1/const~": [true] },
  });
});
Deno.test("check.compile : Bit schemas", () => {
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
Deno.test("check.compile : Int schemas", () => {
  const fcInteger = fcNumber.map(Math.round);
  assertCheck({ schema: int(), ok: [0], no: { "/type~": not("integer") } });
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
Deno.test("check.compile : Num schemas", () => {
  assertCheck({
    schema: num(),
    ok: [Number.MIN_VALUE],
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
Deno.test("check.compile : Str schemas()", () => {
  const fcString = fc.string({ unit: "grapheme", size: "medium" });
  assertCheck({ schema: str(), ok: [""], no: { "/type~": not("string") } });
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
Deno.test("check.compile : Arr schemas", () => {
  assertCheck({ schema: arr(nil()), ok: [[]], no: { "/type~": not("array") } });
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
Deno.test("check.compile : Obj schemas", () => {
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
