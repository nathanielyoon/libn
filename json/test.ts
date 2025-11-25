import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import type { Json } from "@libn/types";
import { B16, enB16 } from "@libn/base/b16";
import { B32, enB32 } from "@libn/base/b32";
import { enH32, H32 } from "@libn/base/h32";
import { B64, enB64 } from "@libn/base/b64";
import { enU64, U64 } from "@libn/base/u64";
import { compile, is, point, to } from "./check.ts";
import type { Instance, Schema } from "./schema.ts";
import { fcBin, fcStr } from "../test.ts";

const fcJson = fc.jsonValue() as fc.Arbitrary<Json>;
const fcNumber = fc.double({ noDefaultInfinity: true, noNaN: true });
Deno.test("check.point : keys/indices", () => {
  fc.assert(fc.property(fcStr(), fc.nat({ max: 1e2 }), fcJson, (on, at, $) => {
    assertEquals(
      point(
        Array(at + 1).with(at, { [on]: $ }),
        `/${at}/${on.replaceAll("~", "~0").replaceAll("/", "~1")}`,
      ),
      $,
    );
    assertEquals(
      point(
        { [on]: Array(at + 1).with(at, $) },
        `/${on.replaceAll("~", "~0").replaceAll("/", "~1")}/${at}`,
      ),
      $,
    );
  }));
  fc.assert(fc.property(fcJson, ($) => {
    assertEquals(point($, ""), $);
  }));
});
Deno.test("check.point : bad pointers", () => {
  fc.assert(fc.property(
    fcJson,
    fcStr(/^[^/]+(?:\/(?:~[01]|[^/~])*)*$/),
    ($, pointer) => {
      assertEquals(point($, pointer), undefined);
    },
  ));
  fc.assert(fc.property(
    fc.array(fcJson),
    fcStr(/^\/(?:\d*\D\d*|0\d=)(?:\/(?:~[01]|[^/~])*)*$/),
    ($, pointer) => {
      assertEquals(point($, pointer), undefined);
    },
  ));
});
Deno.test("check.point : bad objects", () => {
  fc.assert(fc.property(
    fc.oneof(fc.constant(null), fc.boolean(), fcNumber, fcStr()),
    fcStr(/^(?:\/(?:~[01]|[^/~])*)+$/),
    ($, pointer) => {
      assertEquals(point($, pointer), undefined);
    },
  ));
});
Deno.test("check.point : missing keys/indices", () => {
  fc.assert(fc.property(
    fcStr(/^(?:\/(?:~[01]|[^/~])*)+$/).filter(($) =>
      !($.slice(1).replaceAll("~1", "/").replaceAll("~0", "~") in {})
    ),
    (pointer) => {
      assertEquals(point({}, pointer), undefined);
    },
  ));
  fc.assert(fc.property(fc.array(fcJson), ($) => {
    assertEquals(point($, `/${$.length || 1}`), undefined);
  }));
});

const assertCheck = <A extends Schema>({ schema, pass, fail }: {
  schema: A;
  pass: readonly Instance<A>[];
  fail: readonly (readonly [instance: Json, type: string, data?: string])[];
}) => {
  const check = compile(schema);
  for (const $ of pass) {
    assertEquals(is(check, $), true);
    const result = to(check, $);
    assert(result.state);
    assertEquals(result.value, $);
    typeof $ === "object" && $ && assert(result.value !== $);
  }
  for (const [$, type, data] of fail) {
    assertEquals(is(check, $), false);
    const result = to(check, $);
    assert(!result.state);
    assertEquals(result.cause, [{ type, data: data ?? "" }]);
  }
};
const FC_BASE = {
  boolean: fc.boolean(),
  number: fcNumber,
  string: fcStr(),
  array: fc.array(fc.boolean()),
  object: fc.constant({}),
};
const assertBase = <A extends keyof typeof FC_BASE>(
  schema: Extract<Schema, { type: A }>,
) => {
  const { [schema.type]: pass, ...fail } = FC_BASE;
  fc.assert(fc.property(
    fc.tuple(
      fc.array(pass as fc.Arbitrary<Instance<typeof schema>>),
      fc.array(fc.oneof(...Object.values<fc.Arbitrary<Json>>(fail))),
    ).map(($) => ({
      schema: schema,
      pass: $[0],
      fail: [null, ...$[1]].map((value) => [value, "/type"] as const),
    })),
    assertCheck,
  ));
};
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
Deno.test("check.compile : Nil", () => {
  assertCheck({
    schema: { oneOf: [{ type: "null" }, { type: "boolean" }] },
    pass: [null, false, true],
    fail: [0, "", [], {}].map(($) => [$, "/oneOf/1/type"] as const),
  });
});
Deno.test("check.compile : Opt", () => {
  fc.assert(fc.property(
    fc.oneof(
      fcUnique(fc.boolean()),
      fcUnique(fcNumber),
      fcUnique(fcStr()),
      fcUnique(fc.oneof(fc.boolean(), fcNumber, fcStr())),
    ),
    ([head, ...tail]) => {
      assertCheck({
        schema: { enum: tail },
        pass: tail,
        fail: [[head, "/enum"]],
      });
    },
  ));
});
Deno.test("check.compile : Bit", () => {
  assertBase({ type: "boolean" });
});
Deno.test("check.compile : Num", () => {
  assertBase({ type: "number" });
  assertCheck({
    schema: { type: "number" },
    pass: [-Number.MAX_VALUE, Number.MIN_VALUE, Number.MAX_VALUE],
    fail: [-Infinity, NaN, Infinity].map(($) => [$, "/type"] as const),
  });
  fc.assert(fc.property(fcOrdered(2), ([lower, upper]) => {
    assertCheck({
      schema: { type: "number", minimum: upper },
      pass: [upper],
      fail: [[lower, "/minimum"]],
    });
    assertCheck({
      schema: { type: "number", maximum: lower },
      pass: [lower],
      fail: [[upper, "/maximum"]],
    });
    assertCheck({
      schema: { type: "number", exclusiveMinimum: lower },
      pass: [upper],
      fail: [[lower, "/exclusiveMinimum"]],
    });
    assertCheck({
      schema: { type: "number", exclusiveMaximum: upper },
      pass: [lower],
      fail: [[upper, "/exclusiveMaximum"]],
    });
  }));
  fc.assert(fc.property(
    fcOrdered(2, fc.integer({ min: 1 })).filter(($) => $[1] % $[0] !== 0),
    ([divisor, dividend]) => {
      assertCheck({
        schema: { type: "number", multipleOf: divisor },
        pass: [divisor],
        fail: [[dividend, "/multipleOf"]],
      });
    },
  ));
});
Deno.test("check.compile : Str", () => {
  assertBase({ type: "string" });
  fc.assert(fc.property(fcLength, (length) => {
    const pass = ["\0".repeat(length)];
    assertCheck({
      schema: { type: "string", minLength: length },
      pass,
      fail: [["\0".repeat(length - 1), "/minLength"]],
    });
    assertCheck({
      schema: { type: "string", maxLength: length },
      pass,
      fail: [["\0".repeat(length + 1), "/maxLength"]],
    });
    assertCheck({
      schema: { type: "string", pattern: `^\\0{${length}}$` },
      pass,
      fail: [length - 1, length + 1].map(($) =>
        ["\0".repeat($), "/pattern"] as const
      ),
    });
  }));
  assertCheck({
    schema: { type: "string", pattern: "\\" },
    pass: [""],
    fail: [],
  });
  const assertStr = (
    schema: Omit<Extract<Schema, { type: "string" }>, "type">,
    pattern: RegExp,
    pass: fc.Arbitrary<string> = fcStr(pattern),
  ) =>
    fc.assert(fc.property(
      fc.tuple(pass, fcStr().filter(($) => !pattern.test($))).map(($) => ({
        schema: { type: "string", ...schema },
        pass: [$[0]],
        fail: [[$[1], `/${Object.keys(schema)[0]}`]],
      } as const)),
      assertCheck,
    ));
  const fcDate = (...slice: [number, number]) =>
    fc.date({
      noInvalidDate: true,
      min: new Date("0000"),
      max: new Date("9999-12-31T23:59:59.999Z"),
    }).map(($) => $.toISOString().slice(...slice)).chain(($) =>
      fc.constantFrom(
        $,
        $.replace("T", " "),
        $.replace("Z", ""),
        $.replace("Z", "+00:00"),
        $.replace(/\.\d+/, ""),
        $.replace(/(\.\d)\d*/, "$1"),
      )
    );
  assertStr(
    { format: "date" },
    /^(?:(?:(?:(?:(?:[02468][048])|(?:[13579][26]))00)|(?:[0-9][0-9](?:(?:0[48])|(?:[2468][048])|(?:[13579][26]))))[-]02[-]29)|(?:\d{4}[-](?:(?:(?:0[13578]|1[02])[-](?:0[1-9]|[12]\d|3[01]))|(?:(?:0[469]|11)[-](?:0[1-9]|[12]\d|30))|(?:02[-](?:0[1-9]|1[0-9]|2[0-8]))))$/,
    fcDate(0, 10),
  );
  assertStr(
    { format: "time" },
    /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5][0-9])?$/,
    fcDate(11, 24),
  );
  assertStr(
    { format: "date-time" },
    /^(?:(?:(?:(?:(?:[02468][048])|(?:[13579][26]))00)|(?:[0-9][0-9](?:(?:0[48])|(?:[2468][048])|(?:[13579][26]))))[-]02[-]29)|(?:\d{4}[-](?:(?:(?:0[13578]|1[02])[-](?:0[1-9]|[12]\d|3[01]))|(?:(?:0[469]|11)[-](?:0[1-9]|[12]\d|30))|(?:02[-](?:0[1-9]|1[0-9]|2[0-8]))))[ T](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5][0-9])?$/,
    fcDate(0, 24),
  );
  assertStr(
    { format: "email" },
    /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
  );
  assertStr(
    { format: "uri" },
    /^[^\s#/:?]+:(?:\/\/[^\s\/?#]*)?[^\s#?]*(?:\?[^\s#]*)?(?:#\S*)?$/,
  );
  assertStr(
    { format: "uuid" },
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
  );
  for (
    const [base, pattern, encode] of [
      ["base16", B16, enB16],
      ["base32", B32, enB32],
      ["base32hex", H32, enH32],
      ["base64", B64, enB64],
      ["base64url", U64, enU64],
    ] as const
  ) assertStr({ contentEncoding: base }, pattern, fcBin().map(encode));
});
Deno.test("check.compile : Arr", () => {
  assertBase({ type: "array", items: { type: "boolean" } });
  fc.assert(fc.property(fcLength, (length) => {
    assertCheck({
      schema: { type: "array", items: { type: "boolean" } },
      pass: [[], [false], [true, true]],
      fail: [[[null], "/items/type", "/0"], [[true, ""], "/items/type", "/1"]],
    });
    const pass = [Array(length).keys().toArray()];
    assertCheck({
      schema: { type: "array", items: { type: "number" }, minItems: length },
      pass,
      fail: [[Array(length - 1).fill(0), "/minItems"]],
    });
    assertCheck({
      schema: { type: "array", items: { type: "number" }, maxItems: length },
      pass,
      fail: [[Array(length + 1).fill(0), "/maxItems"]],
    });
  }));
  fc.assert(fc.property(
    fcUnique(fcStr()).chain(($) =>
      fc.subarray($, { minLength: 1 }).map((subarray) => ({
        schema: { type: "array", items: { type: "string" }, uniqueItems: true },
        pass: [$],
        fail: [[[...$, ...subarray], "/uniqueItems"]],
      } as const))
    ),
    assertCheck,
  ));
});
Deno.test("check.compile : Obj", () => {
  assertBase({ type: "object", properties: {}, additionalProperties: false });
  fc.assert(fc.property(fcLength, (length) => {
    assertCheck({
      schema: {
        type: "object",
        properties: { "0": { type: "boolean" } },
        additionalProperties: false,
      },
      pass: [{}, { "0": true }],
      fail: [[{ "0": null }, "/properties/0/type", "/0"], [
        { "1": true },
        "/additionalProperties",
        "/1",
      ]],
    });
    const keys = Array(length).keys().map(String).toArray();
    const properties = Object.fromEntries(
      [...keys, ""].map(($) => [$, { type: "boolean" } as const]),
    );
    const data = Object.fromEntries(keys.map(($, z) => [$, !(z & 1)]));
    assertCheck({
      schema: {
        type: "object",
        properties,
        additionalProperties: false,
        minProperties: length + 1,
      },
      pass: [{ ...data, "": true }],
      fail: [[data, "/minProperties"]],
    });
    assertCheck({
      schema: {
        type: "object",
        properties,
        additionalProperties: false,
        maxProperties: length,
      },
      pass: [data],
      fail: [[{ ...data, "": true }, "/maxProperties"]],
    });
    assertCheck({
      schema: {
        type: "object",
        properties,
        additionalProperties: false,
        required: [""],
      },
      pass: [{ "": true }, { ...data, "": true }],
      fail: [[data, "/required/0"]],
    });
  }));
});
