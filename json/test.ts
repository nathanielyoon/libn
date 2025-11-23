import { enB16 } from "@libn/base/b16";
import { enB32 } from "@libn/base/b32";
import { enB64 } from "@libn/base/b64";
import { enH32 } from "@libn/base/h32";
import { enU64 } from "@libn/base/u64";
import {
  BASES,
  compile,
  dereference,
  FORMATS,
  is,
  parse,
} from "@libn/json/check";
import {
  type Arr,
  arr,
  type Bit,
  bit,
  type Data,
  type Int,
  int,
  type Nil,
  nil,
  type Num,
  num,
  type Obj,
  obj,
  type Str,
  str,
  type Type,
} from "@libn/json/schema";
import type { Json } from "@libn/types";
import { type Is, type } from "@libn/types";
import { unrexp } from "@libn/utf";
import { assertEquals, assertStrictEquals } from "@std/assert";
import fc from "fast-check";
import { fcBin, fcStr } from "../test.ts";
import { hasOwn, isArray, type Writable, type Xor } from "./lib.ts";

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
const fcNumber = fc.double({ noDefaultInfinity: true, noNaN: true });
Deno.test("pointer.dereference : keys/indices", () => {
  fc.assert(fc.property(fcStr(), fc.nat({ max: 1e2 }), fcJson, (on, at, $) => {
    assertEquals(
      dereference(
        Array(at + 1).with(at, { [on]: $ }),
        `/${at}/${on.replaceAll("~", "~0").replaceAll("/", "~1")}`,
      ),
      $,
    );
    assertEquals(
      dereference(
        { [on]: Array(at + 1).with(at, $) },
        `/${on.replaceAll("~", "~0").replaceAll("/", "~1")}/${at}`,
      ),
      $,
    );
  }));
});
Deno.test("pointer.dereference : empty pointer", () => {
  fc.assert(fc.property(fcJson, ($) => {
    assertStrictEquals(dereference($, ""), $);
  }));
});
Deno.test("pointer.dereference : invalid pointers", () => {
  fc.assert(fc.property(
    fcJson,
    fcStr(/^.+(?:\/(?:~[01]|[^/~])*)*$/),
    ($, pointer) => {
      assertEquals(dereference($, pointer), undefined);
    },
  ));
});
Deno.test("pointer.dereference : non-objects", () => {
  fc.assert(fc.property(
    fc.oneof(fc.constant(null), fc.boolean(), fcNumber, fcStr()),
    fcStr(/^(?:\/(?:~[01]|[^/~])*)+$/),
    ($, pointer) => {
      assertEquals(dereference($, pointer), undefined);
    },
  ));
});
Deno.test("pointer.dereference : non-numeric array indices", () => {
  fc.assert(fc.property(
    fc.array(fcJson),
    fcStr(/^\/(?:\d*\D\d*|0\d=)(?:\/(?:~[01]|[^/~])*)*$/),
    ($, pointer) => {
      assertEquals(dereference($, pointer), undefined);
    },
  ));
});
Deno.test("pointer.dereference : missing keys", () => {
  fc.assert(fc.property(
    fcStr(/^(?:\/(?:~[01]|[^/~])*)+$/).filter(($) =>
      !($.slice(1).replaceAll("~1", "/").replaceAll("~0", "~") in {})
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

Deno.test("schema.nil :: Nil schemas", () => {
  type(nil() satisfies Nil)({ type: "null" });
  type(nil(bit()) satisfies Nil)({
    type: ["null", "boolean"],
    oneOf: [{ type: "null" }, { type: "boolean" }],
  });
});
Deno.test("schema.bit :: Bit schemas", () => {
  type(bit() satisfies Bit)({ type: "boolean" });
  type(bit(false) satisfies Bit)({ type: "boolean", const: false });
  type(bit([true]) satisfies Bit)({ type: "boolean", enum: [true] as const });
});
Deno.test("schema.int :: Int schemas", () => {
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
Deno.test("schema.num :: Num schemas", () => {
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
Deno.test("schema.str :: Str schemas", () => {
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
Deno.test("schema.arr :: Arr schemas", () => {
  type(arr(nil(), {}) satisfies Arr)({
    type: "array",
    items: { type: "null" },
  });
  arr(nil(), { minItems: 0, maxItems: 1, uniqueItems: false });
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
Deno.test("schema.obj :: Obj schemas", () => {
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
  $: A extends Type ?
      | fc.Arbitrary<{
        type: A;
        ok: readonly Data<A>[];
        no: { [_: string]: readonly Json[] };
      }>
      | {
        type: A;
        ok: readonly Data<A>[];
        no: { [_: string]: readonly Json[] };
      }
    : never,
) => {
  const [arbitrary, numRuns]: [
    fc.Arbitrary<
      A extends Type ? {
          type: A;
          ok: readonly Data<A>[];
          no: { [_: string]: readonly Json[] };
        }
        : never
    >,
    number,
  ] = ($ instanceof fc.Arbitrary ? [$, 64] : [fc.constant($), 1]) as any;
  fc.assert(
    fc.property(arbitrary, ({ type, ok, no }) => {
      const check = compile(type);
      for (const $ of ok) {
        assertEquals(parse(check, $), { state: true, value: $ });
        assertEquals(is(check, $), true);
      }
      for (const key of Object.keys(no) as (keyof typeof no & string)[]) {
        for (const $ of no[key]) {
          assertEquals(parse(check, $), { state: false, value: [key] });
          assertEquals(is(check, $), false);
        }
      }
    }),
    { numRuns },
  );
};
const not = (...value: Extract<Type["type"], string>[]): Json[] =>
  ([
    ["null", null],
    ["boolean", false],
    ["integer", 0],
    ["number", Number.MIN_VALUE],
    ["string", ""],
    ["array", []],
    ["object", {}],
  ] as const).filter(($) => !value.includes($[0])).map(($) => $[1]);
const fcUnique = <A>($: fc.Arbitrary<A>) =>
  fc.uniqueArray($, {
    minLength: 2,
    comparator: "SameValueZero",
  }) as fc.Arbitrary<[A, A, ...A[]]>;
type Sequence<A, B extends number, C extends A[] = []> = B extends B
  ? C["length"] extends B ? C : Sequence<A, B, [...C, A]>
  : never;
const fcOrdered = <A extends number>(size: A, value?: fc.Arbitrary<number>) =>
  fc.uniqueArray(value ?? fcNumber, {
    minLength: size,
    maxLength: size,
    comparator: "SameValueZero",
  }).map(($) => [...new Float64Array($).sort()] as Sequence<number, A>);
const fcLength = fc.integer({ min: 1, max: 64 });
Deno.test("check.compile : Nil schemas", () => {
  assertCheck({ type: nil(), ok: [null], no: { "/type~": not("null") } });
  assertCheck({
    type: nil(bit(false)),
    ok: [null, false],
    no: { "/oneOf/1/type~": not("null", "boolean"), "/oneOf/1/const~": [true] },
  });
});
Deno.test("check.compile : Bit schemas", () => {
  assertCheck({
    type: bit(),
    ok: [false, true],
    no: { "/type~": not("boolean") },
  });
  assertCheck(
    fc.boolean().map(($) => ({
      type: bit($),
      ok: [$],
      no: { "/type~": [], "/const~": [!$] },
    })),
  );
  assertCheck(
    fc.boolean().map(($) => ({
      type: bit([$]),
      ok: [$],
      no: { "/type~": [], "/enum~": [!$] },
    })),
  );
  assertCheck({
    type: bit([false, true]),
    ok: [false, true],
    no: { "/type~": [], "/enum~": [] },
  });
});
Deno.test("check.compile : Int schemas", () => {
  const fcInteger = fcNumber.map(Math.round);
  assertCheck({ type: int(), ok: [0], no: { "/type~": not("integer") } });
  const fcEnum = fcUnique(fcInteger);
  assertCheck(fcEnum.map(([head, ...tail]) => ({
    type: int(head),
    ok: [head],
    no: { "/type~": [], "/const~": tail },
  })));
  assertCheck(fcEnum.map(([head, ...tail]) => ({
    type: int(tail),
    ok: tail,
    no: { "/type~": [], "/enum~": [head] },
  })));
  const fcPair = fcOrdered(2, fcInteger);
  assertCheck(fcPair.map(([min, max]) => ({
    type: int({ minimum: max }),
    ok: [max],
    no: { "/type~": [], "/minimum~": [min] },
  })));
  assertCheck(fcPair.map(([min, max]) => ({
    type: int({ maximum: min }),
    ok: [min],
    no: { "/type~": [], "/maximum~": [max] },
  })));
  assertCheck(fcPair.map(([min, max]) => ({
    type: int({ exclusiveMinimum: min }),
    ok: [max],
    no: { "/type~": [], "/exclusiveMinimum~": [min] },
  })));
  assertCheck(fcPair.map(([min, max]) => ({
    type: int({ exclusiveMaximum: max }),
    ok: [min],
    no: { "/type~": [], "/exclusiveMaximum~": [max] },
  })));
  assertCheck(
    fcPair.filter(($) => !!$[0] && !!($[1] % $[0])).map(([min, max]) => ({
      type: int({ multipleOf: min }),
      ok: [min],
      no: { "/type~": [], "/multipleOf~": [max] },
    })),
  );
});
Deno.test("check.compile : Num schemas", () => {
  assertCheck({
    type: num(),
    ok: [Number.MIN_VALUE],
    no: { "/type~": not("integer", "number") },
  });
  const fcEnum = fcUnique(fcNumber);
  assertCheck(fcEnum.map(([head, ...tail]) => ({
    type: num(head),
    ok: [head],
    no: { "/type~": [], "/const~": tail },
  })));
  assertCheck(fcEnum.map(([head, ...tail]) => ({
    type: num(tail),
    ok: tail,
    no: { "/type~": [], "/enum~": [head] },
  })));
  const fcPair = fcOrdered(2, fcNumber);
  assertCheck(fcPair.map(([min, max]) => ({
    type: num({ minimum: max }),
    ok: [max],
    no: { "/type~": [], "/minimum~": [min] },
  })));
  assertCheck(fcPair.map(([min, max]) => ({
    type: num({ maximum: min }),
    ok: [min],
    no: { "/type~": [], "/maximum~": [max] },
  })));
  assertCheck(fcPair.map(([min, max]) => ({
    type: num({ exclusiveMinimum: min }),
    ok: [max],
    no: { "/type~": [], "/exclusiveMinimum~": [min] },
  })));
  assertCheck(fcPair.map(([min, max]) => ({
    type: num({ exclusiveMaximum: max }),
    ok: [min],
    no: { "/type~": [], "/exclusiveMaximum~": [max] },
  })));
  assertCheck(
    fcPair.filter(($) => !!$[0] && !!($[1] % $[0])).map(([min, max]) => ({
      type: num({ multipleOf: min }),
      ok: [min],
      no: { "/type~": [], "/multipleOf~": [max] },
    })),
  );
});
Deno.test("check.compile : Str schemas()", () => {
  assertCheck({ type: str(), ok: [""], no: { "/type~": not("string") } });
  const fcEnum = fcUnique(fcStr());
  assertCheck(fcEnum.map(([head, ...tail]) => ({
    type: str(head),
    ok: [head],
    no: { "/type~": [], "/const~": tail },
  })));
  assertCheck(fcEnum.map(([head, ...tail]) => ({
    type: str(tail),
    ok: tail,
    no: { "/type~": [], "/enum~": [head] },
  })));
  const fcPair = fcOrdered(2, fcLength);
  assertCheck(fcPair.map(([min, max]) => ({
    type: str({ minLength: max }),
    ok: ["\0".repeat(max)],
    no: { "/type~": [], "/minLength~": ["\0".repeat(min)] },
  })));
  assertCheck(fcPair.map(([min, max]) => ({
    type: str({ maxLength: min }),
    ok: ["\0".repeat(min)],
    no: { "/type~": [], "/maxLength~": ["\0".repeat(max)] },
  })));
  assertCheck(
    fcStr().map(($) => ({
      type: str({ pattern: `^${unrexp($)}$` }),
      ok: [$],
      no: { "/type~": [], "/pattern~": [$ + "\0"] },
    })),
  );
  assertCheck({
    type: str({ pattern: "\\" }),
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
          }).map(($) => $.toISOString().slice(min, max)).chain(($) =>
            fc.constantFrom(
              ...new Set([
                $,
                $.replace("T", " "),
                $.replace("Z", ""),
                $.replace("Z", "+00:00"),
                $.replace(/\.\d+/, ""),
                $.replace(/(\.\d)\d*/, "$1"),
              ]),
            )
          ),
        }),
        {} as { [_ in "date" | "time" | "date-time"]: fc.Arbitrary<string> },
      ),
    ...(["email", "uri", "uuid"] as const).reduce((to, key) => ({
      ...to,
      [key]: fcStr(FORMATS[key]).map(($) => $.trim().normalize())
        .filter(RegExp.prototype.test.bind(FORMATS[key])),
    }), {} as { [_ in "email" | "uri" | "uuid"]: fc.Arbitrary<string> }),
  };
  assertCheck(
    fc.constantFrom(...Object.keys(FORMATS) as (keyof typeof FORMATS)[])
      .chain((format) =>
        fc.record({
          type: fc.constant(str({ format })),
          ok: fc.tuple(formats[format]),
          no: fc.record({
            "/type~": fc.constant(not("string")),
            "/format~": fc.tuple(
              fcStr().filter(($) => !FORMATS[format].test($)),
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
          type: fc.constant(str({ contentEncoding: base })),
          ok: fc.tuple(fcBin().map(bases[base])),
          no: fc.record({
            "/type~": fc.constant(not("string")),
            "/contentEncoding~": fc.tuple(
              fcStr().filter(($) => !BASES[base].test($)),
            ),
          }),
        })
      ),
  );
});
Deno.test("check.compile : Arr schemas", () => {
  assertCheck({ type: arr(nil()), ok: [[]], no: { "/type~": not("array") } });
  assertCheck({
    type: arr([nil()]),
    ok: [[null]] as [null][],
    no: {
      "/type~": [],
      "/items~": [],
      "/prefixItems/0/type~/0": [[not("array")]],
      "/minItems~": [[]],
    },
  });
  assertCheck(fcLength.map(($) => ({
    type: arr(nil()),
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
    type: arr(nil(), { minItems: $ + 1 }),
    ok: [Array($ + 1).fill(null)],
    no: { "/type~": [], "/minItems~": [[], Array($).fill(null)] },
  })));
  assertCheck(fcLength.map(($) => ({
    type: arr([nil(), ...Array<{ type: "null" }>($).fill(nil())], {
      minItems: $,
    }),
    ok: [Array($).fill(null) as [null]],
    no: { "/type~": [], "/minItems~": [[]], "/items~": [] },
  })));
  assertCheck(fcLength.map(($) => ({
    type: arr(nil(), { maxItems: $ }),
    ok: [[], Array($).fill(null)],
    no: { "/type~": [], "/maxItems~": [Array($ + 1).fill(null)] },
  })));
  assertCheck(fcLength.map(($) => ({
    type: arr(Array<{ type: "null" }>($).fill(nil())),
    ok: [],
    no: {
      "/type~": [],
      "/items~": [Array($ + 1).fill(null)],
      "/minItems~": [],
    },
  })));
  assertCheck({
    type: arr(nil(), { uniqueItems: true }),
    ok: [[], [null]],
    no: { "/type~": [], "/uniqueItems~": [[null, null]] },
  });
  assertCheck({
    type: arr([bit(), bit()], { uniqueItems: true }),
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
    fcUnique(fcStr()).map((keys) => (offset: number) =>
      keys.reduce<{ [_: string]: number }>(
        (to, $, z) => ({ ...to, [$]: z + offset }),
        {},
      )
    ).map((object) => ({
      type: arr(obj(int()), { uniqueItems: true }),
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
    type: obj(nil()),
    ok: [{}, { "": null }],
    no: {
      "/type~": not("object"),
      "/additionalProperties/type~/": [{ "": not("null") }],
    },
  });
  assertCheck({
    type: obj({ "": nil() }),
    ok: [{ "": null }],
    no: {
      "/type~": not("object"),
      "/properties//type~/": [{ "": not("null") }],
      "/required/0~": [{}],
    },
  });
  assertCheck({
    type: obj("", { 0: obj({ 0: nil() }), 1: obj({ 1: nil() }) }),
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
    fcUnique(fcStr()).map(([head, ...tail]) => ({
      type: obj(nil(), { propertyNames: str(head) }),
      ok: [{}, { [head]: null }],
      no: {
        "/type~": [],
        ...tail.reduce((to, key) => ({
          ...to,
          [
            `/propertyNames/const~/${
              key.replaceAll("~", "~0").replaceAll("/", "~1")
            }`
          ]: [{ [key]: null }],
        }), {}),
      },
    })),
  );
  const object = (size: number) =>
    Array(size).keys().reduce((to, key) => ({ ...to, [key]: null }), {});
  assertCheck(fcLength.map(($) => ({
    type: obj(nil(), { minProperties: $ }),
    ok: [object($)],
    no: { "/type~": [], "/minProperties~": [{}, object($ - 1)] },
  })));
  assertCheck(fcLength.map(($) => ({
    type: obj(nil(), { maxProperties: $ }),
    ok: [{}],
    no: { "/type~": [], "/maxProperties~": [object($ + 1)] },
  })));
});
