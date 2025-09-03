import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_check, fc_num, fc_str } from "../test.ts";
import type { Data, Type } from "./src/types.ts";
import { array, boolean, number, object, string } from "./src/build.ts";
import { coder } from "./src/code.ts";
import { BASES, FORMATS, parser } from "./src/parse.ts";

const test_fc = <A extends Type["type"]>(type: A, tests: {
  [step: string]: fc.Arbitrary<{
    type: { type: Type<A> };
    data?: Data<Type<A>>;
    fail?: any;
    raw?: {};
    out?: {};
  }>;
}) =>
  Deno.test(type, async ($) => {
    const { [type]: data, ...fail } = {
      boolean: fc.boolean(),
      number: fc_num(),
      string: fc_str().map(($) => $.normalize()),
      array: fc.array(fc.jsonValue()),
      object: fc.dictionary(fc_str(), fc.jsonValue()),
    };
    const a: typeof tests = {
      type: fc.tuple(
        data,
        fc.oneof(...Object.values<fc.Arbitrary<fc.JsonValue>>(fail)),
      ).map(([data, fail]) => ({
        type: { type: { type } as Type<A> },
        data: data as Data<Type<A>>,
        fail: { path: "", raw: fail, error: ["type", type] },
      })),
      ...tests,
    };
    for (let b = Object.keys(a), z = 0; z < b.length; ++z) {
      await $.step(b[z], () =>
        fc_check(fc.property(a[b[z]], ({ type, data, fail, raw, out }) => {
          const c = parser(type.type), d = coder(type.type);
          if (data !== undefined) {
            const e = c(data).unwrap(true), f = d.encode(e);
            assertEquals(e, out ?? data);
            assertEquals(f.length, d.length);
            assertEquals(d.decode(f), out ?? data);
          }
          if (fail !== undefined) {
            assertEquals(c(raw ?? fail.raw).unwrap(false), [fail]);
          }
        })));
    }
  });
test_fc("boolean", {
  enum: fc.boolean().map(($) => ({
    type: boolean().enum([$]),
    data: $,
    fail: { path: "", raw: !$, error: ["enum", [$]] },
  })),
});
const fc_enum = <A>($: fc.Arbitrary<A>) =>
  fc.uniqueArray($, {
    minLength: 2,
    comparator: "SameValueZero",
  }) as fc.Arbitrary<[A, A, ...A[]]>;
const fc_min_max = fc.uniqueArray(fc_num(), {
  minLength: 2,
  maxLength: 2,
  comparator: "SameValueZero",
}).map(($) => {
  const [min, max] = new Float64Array($).sort();
  return { min, max };
});
test_fc("number", {
  enum: fc_enum(fc_num()).chain(([head, ...rest]) =>
    fc.oneof(
      fc.record({
        type: fc.constant(number().enum([head])),
        data: fc.constant(head),
        fail: fc.record({
          path: fc.constant(""),
          raw: fc.constantFrom(...rest),
          error: fc.constant(["enum", [head]]),
        }),
      }),
      fc.record({
        type: fc.constant(number().enum(rest)),
        data: fc.constantFrom(...rest),
        fail: fc.constant({
          path: "",
          raw: head,
          error: ["enum", rest],
        }),
      }),
    )
  ),
  minimum: fc_min_max.map(({ min, max }) => ({
    type: number().minimum(max),
    data: max,
    fail: { path: "", raw: min, error: ["minimum", max] },
  })),
  maximum: fc_min_max.map(({ min, max }) => ({
    type: number().maximum(min),
    data: min,
    fail: { path: "", raw: max, error: ["maximum", min] },
  })),
  exclusiveMinimum: fc_min_max.map(({ min, max }) => ({
    type: number().exclusiveMinimum(min),
    data: max,
    fail: { path: "", raw: min, error: ["exclusiveMinimum", min] },
  })),
  exclusiveMaximum: fc_min_max.map(({ min, max }) => ({
    type: number().exclusiveMaximum(max),
    data: min,
    fail: { path: "", raw: max, error: ["exclusiveMaximum", max] },
  })),
  multipleOf: fc_min_max.filter(({ min, max }) => min !== 0 && max % min !== 0)
    .map(({ min, max }) => ({
      type: number().multipleOf(min),
      data: min,
      fail: { path: "", raw: max, error: ["multipleOf", min] },
    })),
});
const fc_iso = fc.date({
  noInvalidDate: true,
  min: new Date("0000"),
  max: new Date("9999-12-31T23:59:59.999Z"),
}).map(($) => $.toISOString());
const formats = [
  ["date", fc_iso.map(($) => $.slice(0, 10))],
  ["time", fc_iso.map(($) => $.slice(11))],
  ["date-time", fc_iso],
  ...(["duration", "email", "uri", "uuid"] as const).map(($) =>
    [
      $,
      fc.stringMatching(FORMATS[$]).map(($) => $.trim().normalize()).filter(
        RegExp.prototype.test.bind(FORMATS[$]),
      ),
    ] as const
  ),
] as const;
const bases = Object.entries(BASES).map(([key, value]) =>
  [key as keyof typeof BASES, fc.stringMatching(value)] as const
);
test_fc("string", {
  enum: fc_enum(fc_str().map(($) => $.normalize())).chain(([head, ...rest]) =>
    fc.oneof(
      fc.record({
        type: fc.constant(string().enum([head])),
        data: fc.constant(head),
        fail: fc.record({
          path: fc.constant(""),
          raw: fc.constantFrom(...rest),
          error: fc.constant(["enum", [head]]),
        }),
      }),
      fc.record({
        type: fc.constant(string().enum(rest)),
        data: fc.constantFrom(...rest),
        fail: fc.constant({
          path: "",
          raw: head,
          error: ["enum", rest],
        }),
      }),
    )
  ),
  minLength: fc_str({ minLength: 1 }).map(($) => ($ = $.normalize(), {
    type: string().minLength($.length),
    data: $,
    fail: { path: "", raw: $.slice(1), error: ["minLength", $.length] },
  })),
  maxLength: fc_str({ minLength: 1 }).map(($) => ($ = $.normalize(), {
    type: string().maxLength($.length - 1),
    data: $.slice(1),
    fail: { path: "", raw: $, error: ["maxLength", $.length - 1] },
  })),
  contentEncoding: fc.oneof(...bases.map(([base, data]) =>
    fc.record({
      type: fc.constant(string().contentEncoding(base)),
      data,
      fail: fc_str().map(($) => ({
        path: "",
        raw: $.normalize(),
        error: ["contentEncoding", base],
      })).filter(($) => !BASES[base].test($.raw)),
    })
  )),
  format: fc.oneof(...formats.map(([format, data]) =>
    fc.record({
      type: fc.constant(string().format(format)),
      data,
      fail: fc_str().map(($) => ({
        path: "",
        raw: $.normalize(),
        error: ["format", format],
      })).filter(($) => !FORMATS[format].test($.raw)),
    })
  )),
  pattern: fc_str().map(($) =>
    RegExp(`^${$.normalize().replaceAll(/[$(-+./?[-^{|}]/g, "\\$&")}$`)
  ).chain((pattern) =>
    fc.record({
      type: fc.constant(string().pattern(pattern.source)),
      data: fc.stringMatching(pattern),
      fail: fc_str().map(($) => ({
        path: "",
        raw: $.normalize(),
        error: ["pattern", pattern.source],
      })).filter(($) => !pattern.test($.raw)),
    })
  ),
});
test_fc("array", {
  items: fc.boolean().map(($) => ({
    type: array().items(boolean().enum([$])),
    data: [$],
    fail: { path: "/0", raw: !$, error: ["enum", [$]] },
    raw: [!$],
  })),
  minItems: fc.array(fc.jsonValue(), { minLength: 1 }).map(($) => ({
    type: array().minItems($.length),
    data: $,
    fail: { path: "", raw: $.slice(1), error: ["minItems", $.length] },
  })),
  maxItems: fc.array(fc.jsonValue(), { minLength: 1 }).map(($) => ({
    type: array().maxItems($.length - 1),
    data: $.slice(1),
    fail: { path: "", raw: $, error: ["maxItems", $.length - 1] },
  })),
  uniqueItems: fc.jsonValue().map(($) => ({
    type: array().uniqueItems(),
    data: [$],
    fail: { path: "", raw: [$, $], error: ["uniqueItems", true] },
  })),
});
test_fc("object", {
  properties: fc.tuple(fc_str(), fc.boolean()).map(([key, value]) => ({
    type: object().properties({
      [key = key.normalize()]: boolean().enum([value]),
    }),
    data: { [key]: value },
    fail: {
      path: `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
      raw: !value,
      error: ["enum", [value]],
    },
    raw: { [key]: !value },
  })),
  required: fc_str().chain(($) =>
    fc.tuple(
      fc.constant($ = $.normalize()),
      fc.option(fc.constant([$]), { nil: undefined }),
    )
  ).map(([key, required]) => ({
    type: object().properties({ [key]: boolean() }).required(required!),
    data: { [key]: true },
    fail: { path: "", raw: null, error: ["required", key] },
    raw: {},
  })),
  additionalProperties: fc.tuple(fc_str(), fc.boolean()).map(([key, $]) => ({
    type: object().properties({}).additionalProperties($),
    data: $ ? { [key.normalize()]: 0 } : {},
    out: {},
    fail: $ ? undefined : {
      path: "",
      raw: { [key.normalize()]: 0 },
      error: ["additionalProperties", false],
    },
  })),
});
Deno.test("arrays encode/decode with any items", () =>
  fc_check(fc.property(
    fc.oneof(
      fc.oneof(
        fc.tuple(fc.constant(boolean()), fc.array(fc.boolean())),
        fc.tuple(fc.constant(number()), fc.array(fc_num())),
        ...formats.map(([format, data]) =>
          fc.tuple(fc.constant(string().format(format)), fc.array(data))
        ),
        fc_enum(fc.oneof(
          fc.stringMatching(/^(?:.*,.*|)$/),
          fc.stringMatching(/^[^,]+$/),
        )).chain(($) =>
          fc.tuple(
            fc.constant(string().enum($)),
            fc.array(fc.constantFrom(...$)),
          )
        ),
      ).map(([typer, data]) => [array().items<Type>(typer), data] as const),
      fc.oneof(...bases.map(([base, data]) =>
        fc.nat({ max: 99 }).chain((min) =>
          fc.tuple(
            fc.constant(
              array().items(string().contentEncoding(base)).minItems(min),
            ),
            fc.array(data, { minLength: min }),
          )
        )
      )),
      fc.tuple(
        fc.tuple(fc.boolean(), fc.nat({ max: 99 })),
        fc.oneof(
          fc.tuple(fc.constant(array()), fc.array(fc.array(fc.jsonValue()))),
          fc.tuple(
            fc.constant(object()),
            fc.array(fc.dictionary(fc_str(), fc.jsonValue())),
          ),
        ),
      ).map(([[use_max, max], [typer, data]]) => {
        const a = array().items<Type>(typer);
        return use_max
          ? [a.maxItems(max), data.slice(0, max)] as const
          : [a, data] as const;
      }),
      fc.tuple(fc.constant(array()), fc.array(fc.jsonValue())),
    ),
    ([{ type }, data]) => {
      const { encode, decode } = coder(type);
      assertEquals(decode(encode(parser(type)(data).unwrap(true))), data);
    },
  )));
