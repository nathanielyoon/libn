import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_json, fc_str, type Json } from "@libn/lib";
import type { Data, Fail, Type } from "../src/types.ts";
import { array, boolean, number, object, string } from "../src/build.ts";
import { BASES, FORMATS, parser } from "../src/parse.ts";
import {
  fc_base,
  fc_enum,
  fc_format,
  fc_formats,
  fc_ordered,
  fc_types,
  TYPERS,
  TYPES,
} from "./common.ts";

const fc_other = <A extends Type["type"]>(type: A) => {
  const { [type]: _, ...rest } = fc_types;
  return fc.oneof(
    ...Object.values<() => fc.Arbitrary<Json>>(rest).map(($) => $()),
  );
};
const test = <A extends Type["type"]>(
  type: A,
  name: string,
  $: fc.Arbitrary<
    readonly [
      type: fc.Arbitrary<{ type: Type<A> }> | { type: Type<A> },
      ok: { data?: fc.Arbitrary<Data<Type<A>>> | Data<Type<A>>; out?: any },
      no: { raw?: any; fail?: fc.Arbitrary<Fail> | Fail },
    ]
  >,
) =>
  Deno.test(`parser({ "type": "${type}" }) : ${name}`, () =>
    fc_assert($.chain(([type, { data, out }, { raw, fail }]) =>
      fc.record({
        type: type instanceof fc.Arbitrary
          ? type.map(($) => $.type)
          : fc.constant(type.type),
        ok: fc.record({
          data: data instanceof fc.Arbitrary ? data : fc.constant(data),
          out: out instanceof fc.Arbitrary ? out : fc.constant(out),
        }),
        no: fc.record({
          raw: raw instanceof fc.Arbitrary ? raw : fc.constant(raw),
          fail: fail instanceof fc.Arbitrary ? fail : fc.constant(fail),
        }),
      })
    ))(({ type, ok, no }) => {
      const parse = parser(type);
      if (ok.data !== undefined) {
        const result = parse(ok.data);
        assertEquals(result, { state: true, value: ok.out ?? ok.data });
        assert(
          type !== "array" || type !== "object" ||
            result.value !== (ok.out ?? ok.data),
        );
      }
      if (no.raw !== undefined) {
        const { type: _, ...rest } = type;
        assertEquals(parse(no.raw), {
          state: false,
          value: no.fail ??
            [{ path: "", raw: no.raw, error: Object.entries(rest)[0] }],
        });
      }
    }));
for (const type of TYPES) {
  test(
    type,
    "type",
    fc_other(type).map((raw) => [TYPERS[type](), { data: fc_types[type]() }, {
      raw,
      fail: [{ path: "", raw, error: ["type", type] }],
    }]),
  );
}
test(
  "boolean",
  "enum",
  fc.boolean().map(($) => [boolean().enum([$]), { data: $ }, { raw: !$ }]),
);
test(
  "number",
  "enum",
  fc_enum(fc_types.number()).chain(([head, ...rest]) =>
    fc.oneof(
      fc.constant([number().enum([head]), { data: head }, {
        raw: fc.constantFrom(...rest),
      }]),
      fc.constant([number().enum(rest), { data: fc.constantFrom(...rest) }, {
        raw: fc.constant(head),
      }]),
    )
  ),
);
test(
  "number",
  "minimum",
  fc_ordered(2).map(([min, max]) => [
    number().minimum(max),
    { data: max },
    { raw: min },
  ]),
);
test(
  "number",
  "maximum",
  fc_ordered(2).map(([min, max]) => [
    number().maximum(min),
    { data: min },
    { raw: max },
  ]),
);
test(
  "number",
  "exclusiveMinimum",
  fc_ordered(2).map(([min, max]) => [
    number().exclusiveMinimum(min),
    { data: max },
    { raw: min },
  ]),
);
test(
  "number",
  "exclusiveMaximum",
  fc_ordered(2).map(([min, max]) => [
    number().exclusiveMaximum(max),
    { data: min },
    { raw: max },
  ]),
);
test(
  "number",
  "multipleOf",
  fc_ordered(2).filter(([min, max]) => min !== 0 && max % min !== 0)
    .map(([min, max]) => [
      number().multipleOf(min),
      { data: min },
      { raw: max },
    ]),
);
test(
  "string",
  "enum",
  fc_enum(fc_types.string()).chain(([head, ...rest]) =>
    fc.oneof(
      fc.constant([string().enum([head]), { data: head }, {
        raw: fc.constantFrom(...rest),
      }]),
      fc.constant([string().enum(rest), { data: fc.constantFrom(...rest) }, {
        raw: head,
      }]),
    )
  ),
);
test(
  "string",
  "minLength",
  fc_types.string({ minLength: 1 }).map(($) => [
    string().minLength($.length),
    { data: $ },
    { raw: $.slice(1) },
  ]),
);
test(
  "string",
  "maxLength",
  fc_types.string({ minLength: 1 }).map(($) => [
    string().maxLength($.length - 1),
    { data: $.slice(1) },
    { raw: $ },
  ]),
);
const fc_not = (pattern: RegExp) => ({
  raw: fc_types.string().filter(($) => !pattern.test($)),
});
test(
  "string",
  "contentEncoding",
  fc_base.map((base) => [
    string().contentEncoding(base),
    { data: fc.stringMatching(BASES[base]) },
    fc_not(BASES[base]),
  ]),
);
test(
  "string",
  "format",
  fc_format.map((format) => [
    string().format(format),
    { data: fc_formats[format] },
    fc_not(FORMATS[format]),
  ]),
);
test(
  "string",
  "pattern",
  fc_types.string().map(($) =>
    RegExp(`^${$.replaceAll(/[$(-+./?[-^{|}]/g, "\\$&")}$`)
  ).map((pattern) => [
    string().pattern(pattern.source),
    { data: fc.stringMatching(pattern) },
    fc_not(pattern),
  ]),
);
test(
  "array",
  "items",
  fc.constantFrom(...TYPES).chain((type) =>
    fc.array(fc_other(type), { minLength: 1 }).map((raw) => [
      array().items(TYPERS[type]() as { type: Type }),
      { data: fc.array(fc_types[type]() as fc.Arbitrary<Json>) },
      {
        raw,
        fail: raw.map(($, z) => ({
          path: `/${z}`,
          raw: $,
          error: ["type", type],
        })),
      },
    ])
  ),
);
test(
  "array",
  "minItems",
  fc_types.array({ minLength: 1 }).map((data) => [
    array().minItems(data.length),
    { data },
    { raw: data.slice(1) },
  ]),
);
test(
  "array",
  "maxItems",
  fc_types.array({ minLength: 1 }).map((raw) => [
    array().maxItems(raw.length - 1),
    { data: raw.slice(1) },
    { raw },
  ]),
);
test(
  "array",
  "uniqueItems",
  fc_json().map(($) => [
    fc.constantFrom(array().uniqueItems(), array().uniqueItems(true)),
    { data: [$] },
    { raw: [$, $] },
  ]),
);
test(
  "object",
  "properties",
  fc_enum(fc_str()).chain((keys) =>
    fc.tuple(
      ...keys.map(($) => fc.tuple(fc.constant($), fc.constantFrom(...TYPES))),
    )
  ).chain((all) =>
    fc.tuple(
      fc.record(
        all.reduce((to, [key, type]) => ({
          ...to,
          [key]: fc_types[type](),
        }), {}),
      ),
      fc.tuple(
        ...all.map(([key, type]) => fc.tuple(fc.constant(key), fc_other(type))),
      ),
    ).map(([data, raw]) => [
      object().properties(all.reduce((to, [key, type]) => ({
        ...to,
        [key]: TYPERS[type](),
      }), {})),
      { data },
      {
        raw: Object.fromEntries(raw),
        fail: raw.map(([key, $], z) => ({
          path: `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
          raw: $,
          error: ["type", all[z][1]],
        })),
      },
    ])
  ),
);
test(
  "object",
  "required",
  fc_types.string().chain(($) =>
    fc.tuple(
      fc.constant($),
      fc.option(fc.constant([$]), { nil: undefined }),
    )
  ).chain(([key, required]) =>
    fc.constantFrom(
      [
        object().properties({ [key]: boolean() }).required(required!),
        { data: { [key]: true } },
        {
          raw: {},
          fail: [{ path: "", raw: null, error: ["required", key] }],
        },
      ],
      [
        object().properties({ [key]: boolean() }).required([]),
        { data: fc.constantFrom({}, { [key]: true }) },
        {},
      ],
      [object().required([]), {}, {}],
      [object().required(), {}, {}],
    )
  ),
);
test(
  "object",
  "additionalProperties",
  fc.tuple(
    fc_enum(fc_types.string()),
    fc.option(fc_types.boolean(), { nil: undefined }),
  ).map(([[key_1, key_2], $]) => [
    object().properties({ [key_1]: boolean() }).additionalProperties($!),
    { data: $ === false ? {} : { [key_2]: 0 }, out: {} },
    {
      raw: $ === false ? { [key_2]: 0 } : undefined,
      fail: [{
        path: "",
        raw: { [key_2]: 0 },
        error: ["additionalProperties", false],
      }],
    },
  ]),
);
