import type { Instance, Json, Obj, Rec, Schema } from "@libn/json/schema";
import fc from "fast-check";
import { assertFail, assertPass, fcBin, fcNum, fcStr } from "../test.ts";
import { type Check, to } from "@libn/json/check";
import { assert } from "@std/assert";
import { BASES, escape, FORMATS } from "../../json/lib.ts";
import { enB16 } from "@libn/base/16";
import { enB32, enH32 } from "@libn/base/32";
import { enB64, enU64 } from "@libn/base/64";

/** Properly-typed JSON value arbitrary. */
export const fcJson = fc.jsonValue() as fc.Arbitrary<Json>;
const fcUnique = <A>(
  $: fc.Arbitrary<A>,
  constraints?: fc.UniqueArraySharedConstraints,
) =>
  fc.uniqueArray($, {
    minLength: 2,
    comparator: "SameValueZero",
    ...constraints,
  }) as fc.Arbitrary<[A, A, ...A[]]>;
const fcLength = fc.integer({ min: 1, max: 64 });
export class Tester {
  private bind;
  constructor(bind: <A extends Schema>(schema: A) => Check<A>) {
    this.bind = bind;
  }
  private assert = <A extends Schema>(
    schema: A,
    pass: readonly Instance<A>[],
    fail: readonly { value: Json; error: { data?: string; type: string }[] }[],
  ) => {
    const check = this.bind(schema);
    for (const $ of pass) {
      const result = to(check, $);
      assertPass(result, $);
      if (typeof $ === "object" && $) assert(!Object.is(result.value, $));
    }
    for (const $ of fail) {
      const result = to(check, $.value);
      assertFail(result, {
        Invalid: $.error.map(({ data, type }) => ({ data: data ?? "", type })),
      });
    }
  };
  testNil(): void {
    this.assert(
      { oneOf: [{ type: "null" }, { type: "boolean" }] },
      [null, false, true],
      [10, .1, "", [null], { false: false }].map((value) => ({
        value,
        error: [{ type: "/oneOf/1/type" }],
      })),
    );
  }
  testOpt(): void {
    this.assert({ enum: [false] }, [false], [
      { value: true, error: [{ type: "/enum" }] },
    ]);
    this.assert({ enum: [true] }, [true], [
      { value: false, error: [{ type: "/enum" }] },
    ]);
    fc.assert(fc.property(
      fcUnique(fc.oneof(fcNum(), fcStr())),
      ([head, ...tail]) => {
        this.assert({ enum: tail }, tail, [
          { value: head, error: [{ type: "/enum" }] },
        ]);
      },
    ));
  }
  private assertType(schema: Schema, pass: Json[], fail: Json[]) {
    this.assert(
      schema,
      pass,
      fail.map((value) => ({ value, error: [{ type: "/type" }] })),
    );
  }
  testBit(): void {
    this.assertType(
      { type: "boolean" },
      [false, true],
      [null, 10, .1, "", [false], { true: true }],
    );
  }
  private assertNumeric(arbitrary: fc.Arbitrary<number>) {
    fc.assert(fc.property(
      fcUnique(arbitrary, { maxLength: 2 }).map(($) =>
        $.sort((one, two) => one - two)
      ),
      ([lo, hi]) => {
        this.assert({ type: "number", minimum: hi }, [hi], [
          { value: lo, error: [{ type: "/minimum" }] },
        ]);
        this.assert({ type: "number", maximum: lo }, [lo], [
          { value: hi, error: [{ type: "/maximum" }] },
        ]);
        this.assert({ type: "number", exclusiveMinimum: lo }, [hi], [
          { value: lo, error: [{ type: "/exclusiveMinimum" }] },
        ]);
        this.assert({ type: "number", exclusiveMaximum: hi }, [lo], [
          { value: hi, error: [{ type: "/exclusiveMaximum" }] },
        ]);
        hi % lo && this.assert({ type: "number", multipleOf: lo }, [lo], [
          { value: hi, error: [{ type: "/multipleOf" }] },
        ]);
      },
    ));
  }
  testInt(): void {
    this.assertType(
      { type: "integer" },
      [-1, 0, 1],
      [null, false, .1, "", [0], { 1: 1 }],
    );
    this.assertType(
      { type: "integer" },
      [-Number.MIN_SAFE_INTEGER - 2, Number.MAX_SAFE_INTEGER + 2],
      [-Infinity, NaN, Infinity],
    );
    this.assertNumeric(fc.maxSafeInteger());
  }
  testNum(): void {
    this.assertType(
      { type: "number" },
      [-1, -.1, 0, .1, -.1],
      [null, false, "", [-.1], { 0: 0 }],
    );
    this.assertType(
      { type: "number" },
      [-Number.MAX_VALUE, Number.MIN_VALUE, Number.MAX_VALUE],
      [-Infinity, NaN, Infinity],
    );
    this.assertNumeric(fcNum());
  }
  testStr(): void {
    this.assertType(
      { type: "string" },
      ["", "\0"],
      [null, false, 10, .1, [""], { a: "a" }],
    );
    this.assertType({ type: "string" }, ["\u{1f643}", "\ud800"], []);
    fc.assert(fc.property(fcLength, (length) => {
      this.assert(
        { type: "string", minLength: length, maxLength: length },
        ["\0".repeat(length)],
        [
          { value: "\0".repeat(length - 1), error: [{ type: "/minLength" }] },
          { value: "\0".repeat(length + 1), error: [{ type: "/maxLength" }] },
        ],
      );
    }));
    fc.assert(fc.property(fcStr(), (value) => {
      this.assert(
        { type: "string", pattern: `^${RegExp.escape(value)}$` },
        [value],
        [{ value: value + "!", error: [{ type: "/pattern" }] }],
      );
    }));
    this.assert({ type: "string", pattern: "[" }, [""], []); // invalid regex
    fc.assert(fc.property(
      fc.date({
        noInvalidDate: true,
        min: new Date("0000"),
        max: new Date("9999-12-31T23:59:59.999Z"),
      }).map(($) => $.toISOString()),
      (datetime) => {
        const date = datetime.slice(0, 10), time = datetime.slice(11, 24);
        const error = [{ type: "/format" }];
        this.assert({ type: "string", format: "date-time" }, [datetime], [
          { value: date, error },
          { value: time, error },
        ]);
        this.assert({ type: "string", format: "date" }, [date], [
          { value: datetime, error },
          { value: time, error },
        ]);
        this.assert({ type: "string", format: "time" }, [time], [
          { value: datetime, error },
          { value: date, error },
        ]);
      },
    ));
    for (const format of ["duration", "email", "uri", "uuid"] as const) {
      fc.assert(fc.property(
        fcStr(FORMATS[format]),
        fcStr().filter(($) => !FORMATS[format].test($)),
        (pass, fail) => {
          this.assert({ type: "string", format }, [pass], [
            { value: fail, error: [{ type: "/format" }] },
          ]);
        },
      ));
    }
    for (
      const [base, encode] of [
        ["base16", enB16],
        ["base32", enB32],
        ["base32hex", enH32],
        ["base64", enB64],
        ["base64url", enU64],
      ] as const
    ) {
      fc.assert(fc.property(
        fcBin().map(encode),
        fcStr().filter(($) => !BASES[base].test($)),
        (pass, fail) => {
          this.assert({ type: "string", contentEncoding: base }, [pass], [
            { value: fail, error: [{ type: "/contentEncoding" }] },
          ]);
        },
      ));
    }
  }
  testArr(): void {
    this.assertType(
      { type: "array", items: { type: "boolean" } },
      [[], [false], [true, true, true]],
      [null, false, 10, .1, "", { "[]": [] }],
    );
    this.assert(
      {
        type: "array",
        items: {
          type: "object",
          additionalProperties: { type: "integer", minimum: 1 },
        },
      },
      [[], [{ 1: 1 }], [{ 2: 2 }, { 3: 3, 4: 4 }]],
      [{
        value: [null, { 0: 0 }],
        error: [
          { data: "/0", type: "/items/type" },
          { data: "/1/0", type: "/items/additionalProperties/minimum" },
        ],
      }],
    );
    fc.assert(fc.property(fcLength, (length) => {
      const pass = Array(length).fill(false);
      this.assert(
        {
          type: "array",
          items: { type: "boolean" },
          minItems: length,
          maxItems: length,
        },
        [pass],
        [
          { value: pass.slice(1), error: [{ type: "/minItems" }] },
          { value: [...pass, false], error: [{ type: "/maxItems" }] },
        ],
      );
    }));
    fc.assert(fc.property(fcUnique(fcStr()), ([head, ...tail]) => {
      this.assert(
        { type: "array", items: { type: "string" }, uniqueItems: true },
        [[], [head], tail, [head, ...tail]],
        [
          { value: [head, head], error: [{ type: "/uniqueItems" }] },
          { value: [head, ...tail, head], error: [{ type: "/uniqueItems" }] },
        ],
      );
    }));
    this.assert(
      {
        type: "array",
        items: { type: "object", additionalProperties: { type: "integer" } },
        uniqueItems: true,
      },
      [[], [{ 0: 0 }, { 1: 1 }, { 0: 0, 1: 1 }, { 0: 1, 1: 0 }]],
      [{
        // Just `JSON.stringify`-ing these objects returns different results,
        // but the array check uses the deep-copied versions, which were created
        // with sorted keys.
        value: [{ 0: 0, 1: 1 }, { 1: 1, 0: 0 }],
        error: [{ type: "/uniqueItems" }],
      }],
    );
  }
  private assertObjectish(
    make: ([head, ...tail]: [string, string, ...string[]]) => Rec | Obj,
  ) {
    fc.assert(fc.property(fcUnique(fcStr()), ([head, ...tail]) => {
      const [less, pass, more] = [tail.slice(1), tail, [head, ...tail]].map(
        (keys) => keys.reduce(($, key) => ({ ...$, [key]: key }), {}),
      );
      this.assert(
        {
          ...make([head, ...tail]),
          minProperties: tail.length,
          maxProperties: tail.length,
        },
        [pass],
        [
          { value: less, error: [{ type: "/minProperties" }] },
          { value: more, error: [{ type: "/maxProperties" }] },
        ],
      );
    }));
  }
  testRec(): void {
    this.assertType(
      { type: "object", additionalProperties: { type: "boolean" } },
      [{}, { false: false }, { 0: true, one: true }],
      [null, false, 10, .1, "", [{}]],
    );
    this.assert(
      {
        type: "object",
        additionalProperties: { type: "integer", multipleOf: 2 },
      },
      [{}, { 0: 0 }, { 2: 2, 4: 4, 6: 6, 8: 8 }],
      [{
        value: { null: null, 1: 1 },
        error: [ // sorted
          { data: "/1", type: "/additionalProperties/multipleOf" },
          { data: "/null", type: "/additionalProperties/type" },
        ],
      }],
    );
    fc.assert(fc.property(fcUnique(fcStr()), ([head, ...tail]) => {
      this.assert(
        {
          type: "object",
          additionalProperties: { type: "string" },
          propertyNames: {
            type: "string",
            pattern: `^${RegExp.escape(head)}$`,
          },
        },
        [{}, { [head]: head }],
        tail.map((key) => ({
          value: { [key]: key },
          error: [{ data: escape(key), type: "/propertyNames/pattern" }],
        })),
      );
    }));
    this.assertObjectish((keys) => ({
      type: "object",
      additionalProperties: { enum: keys },
    }));
  }
  testObj(): void {
    this.assertType(
      {
        type: "object",
        properties: { "": { type: "boolean" } },
        required: [],
        additionalProperties: false,
      },
      [{}, { "": false }, { "": true }],
      [null, false, 10, .1, "", [{}]],
    );
    this.assert(
      {
        type: "object",
        properties: {
          strings: {
            type: "object",
            additionalProperties: { type: "string", maxLength: 2 },
          },
          numbers: {
            type: "array",
            items: { type: "number", maximum: 2 },
          },
          boolean: { type: "boolean" },
        },
        additionalProperties: false,
        required: [],
      },
      [{}, { boolean: true }, { numbers: [0, 1] }, { strings: { "": "" } }],
      [{
        value: {
          strings: { long: "long" },
          numbers: ["", 2, 3],
          boolean: null,
        },
        error: [ // sorted
          { data: "/boolean", type: "/properties/boolean/type" },
          { data: "/numbers/0", type: "/properties/numbers/items/type" },
          { data: "/numbers/2", type: "/properties/numbers/items/maximum" },
          {
            data: "/strings/long",
            type: "/properties/strings/additionalProperties/maxLength",
          },
        ],
      }],
    );
    fc.assert(fc.property(
      fcUnique(fcStr()).chain((keys) =>
        fc.record({
          fail: fc.nat({ max: keys.length - 2 }),
          keys: fc.constant(keys),
        })
      ),
      ({ fail, keys: [head, ...tail] }) => {
        const { [tail[fail]]: pass, ...rest } = tail.reduce(
          ($, key) => ({ ...$, [key]: key }),
          {} as { [_: string]: string },
        );
        const error = [{ data: escape(tail[fail]), type: `/required/${fail}` }];
        this.assert(
          {
            type: "object",
            properties: tail.reduce(
              ($, key) => ({ ...$, [key]: { enum: [key] } }),
              { [head]: { enum: [head] } },
            ),
            required: tail,
            additionalProperties: false,
          },
          [{ [pass]: pass, ...rest }, { [head]: head, [pass]: pass, ...rest }],
          [{ value: rest, error }, { value: { [head]: head, ...rest }, error }],
        );
      },
    ));
    fc.assert(fc.property(fcUnique(fcStr()), ([head, ...tail]) => {
      this.assert(
        {
          type: "object",
          properties: { [head]: { enum: [head] } },
          additionalProperties: false,
          required: [],
        },
        [{}, { [head]: head }],
        tail.keys().map((z) => tail.slice(z)).map((sub) => ({
          value: sub.reduce(($, key) => ({ ...$, [key]: key }), {}), // unsorted
          error: sub.sort(Intl.Collator("en").compare).map((key) => ({ // sorted
            data: escape(key),
            type: "/additionalProperties",
          })),
        })).toArray(),
      );
    }));
    this.assertObjectish((keys) => ({
      type: "object",
      properties: keys.reduce(
        ($, key) => ({ ...$, [key]: { enum: [key] } }),
        {},
      ),
      additionalProperties: false,
      required: [],
    }));
  }
}
