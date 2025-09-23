import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import {
  bundle,
  fc_check,
  fc_json,
  fc_number,
  fc_string,
  type Json,
  type Tuple,
} from "@libn/lib";
import type { Data, Fail, Type } from "./src/types.ts";
import { array, boolean, number, object, string } from "./src/build.ts";
import { coder } from "./src/code.ts";
import { BASES, FORMATS, parser } from "./src/parse.ts";

const TYPES = ["boolean", "number", "string", "array", "object"] as const;
const TYPERS = { boolean, number, string, array, object };
const fc_object = <A>(value: fc.Arbitrary<A>, $?: fc.DictionaryConstraints) =>
  fc.dictionary(fc_string(), value, { noNullPrototype: true, ...$ });
const fc_types = {
  boolean: fc.boolean,
  number: fc_number,
  string: ($?: fc.StringConstraints) => fc_string($).map(($) => $.normalize()),
  array: ($?: fc.ArrayConstraints) => fc.array(fc_json(), $),
  object: ($?: fc.DictionaryConstraints) => fc_object(fc_json(), $),
};
const fc_other = <A extends Type["type"]>(type: A) => {
  const { [type]: _, ...rest } = fc_types;
  return fc.oneof(
    ...Object.values<() => fc.Arbitrary<Json>>(rest).map(($) => $()),
  );
};
const fc_base = fc.constantFrom(
  ...Object.keys(BASES) as Tuple<keyof typeof BASES>,
);
const fc_format = fc.constantFrom(
  ...Object.keys(FORMATS) as Tuple<keyof typeof FORMATS>,
);
const fc_formats = {
  ...([["date", 0, 10], ["time", 11, 24], ["date-time", 0, 24]] as const)
    .reduce((to, [key, lo, hi]) => ({
      ...to,
      [key]: fc.date({
        noInvalidDate: true,
        min: new Date("0000"),
        max: new Date("9999-12-31T23:59:59.999Z"),
      }).map(($) => $.toISOString().slice(lo, hi)),
    }), {} as { [_ in "date" | "time" | "date-time"]: fc.Arbitrary<string> }),
  ...(["email", "uri", "uuid"] as const).reduce((to, key) => ({
    ...to,
    [key]: fc.stringMatching(FORMATS[key]).map(($) => $.trim().normalize())
      .filter(RegExp.prototype.test.bind(FORMATS[key])),
  }), {} as { [_ in "email" | "uri" | "uuid"]: fc.Arbitrary<string> }),
};
const fc_enum = <A>($: fc.Arbitrary<A>) =>
  fc.uniqueArray($, {
    minLength: 2,
    comparator: "SameValueZero",
  }) as fc.Arbitrary<[A, A, ...A[]]>;
const fc_ordered = (count: number, arbitrary?: fc.Arbitrary<number>) =>
  fc.uniqueArray(arbitrary ?? fc_number(), {
    minLength: count,
    maxLength: count,
    comparator: "SameValueZero",
  }).map(($) => [...new Float64Array($).sort()]);
const fc_max = fc.nat({ max: 255 });
Deno.test("build", async ({ step }) => {
  const fc_schema = fc.letrec<
    & { any: Type }
    & { [A in Type["type"]]: Type<A> }
  >((tie) => ({
    any: fc.oneof(
      { weight: 1, arbitrary: tie("boolean") },
      { weight: 4, arbitrary: tie("number") },
      { weight: 4, arbitrary: tie("string") },
      { weight: 1, arbitrary: tie("array") },
      { weight: 1, arbitrary: tie("object") },
    ),
    boolean: fc.record({
      type: fc.constant("boolean"),
      title: fc_string(),
      description: fc_string(),
      enum: fc.constantFrom([true], [false]),
    }, { noNullPrototype: true, requiredKeys: ["type"] }),
    number: fc_ordered(4).chain(([min_lo, min_hi, max_lo, max_hi]) =>
      fc.record({
        type: fc.constant("number"),
        title: fc_string(),
        description: fc_string(),
        enum: fc_enum(fc_types.number()),
        exclusiveMinimum: fc.constant(min_lo),
        minimum: fc.constant(min_hi),
        maximum: fc.constant(max_lo),
        exclusiveMaximum: fc.constant(max_hi),
        multipleOf: fc_number(),
      }, { noNullPrototype: true, requiredKeys: ["type"] })
    ),
    string: fc_ordered(2, fc_max).chain(([min, max]) =>
      fc.record({
        type: fc.constant("string"),
        title: fc_string(),
        description: fc_string(),
        enum: fc_enum(fc_types.string()),
        minLength: fc.constant(min),
        maxLength: fc.constant(max),
        contentEncoding: fc_base,
        format: fc_format,
        pattern: fc_string().map(($) => $.replace(/[$(-+./?[-^{|}]/g, "\\$&")),
      }, { noNullPrototype: true, requiredKeys: ["type"] })
    ),
    array: fc_ordered(2, fc_max).chain(([min, max]) =>
      fc.record({
        type: fc.constant("array"),
        title: fc_string(),
        description: fc_string(),
        items: tie("any"),
        minItems: fc.constant(min),
        maxItems: fc.constant(max),
        uniqueItems: fc.boolean(),
      }, { noNullPrototype: true, requiredKeys: ["type"] })
    ),
    object: fc.tuple(fc_object(tie("any")), fc_ordered(2, fc_max)).chain(($) =>
      fc.record({
        type: fc.constant("object"),
        title: fc_string(),
        description: fc_string(),
        properties: fc.constant($[0]),
        required: Object.keys($[0]).length
          ? fc.uniqueArray(fc.constantFrom(...Object.keys($[0])))
          : fc.constant([]),
        additionalProperties: fc.boolean(),
        minProperties: fc.constant($[1][0]),
        maxProperties: fc.constant($[1][1]),
      }, { noNullPrototype: true, requiredKeys: ["type"] })
    ),
  }));
  const test = <A extends Type["type"]>(type: A) =>
    step(`${type} :: { "type": "${type}" }`, () => {
      fc_check(fc.property(
        fc_schema[type],
        (schema) => {
          const entries = Object.entries(schema).filter(($) => $[0] !== "type");
          let parent = TYPERS[type]();
          for (const [key, value] of entries) {
            const argument = key === "items"
              ? { type: value }
              : key === "properties"
              ? Object.entries(value).reduce((to, [name, property]) => ({
                ...to,
                [name]: { type: property },
              }), {})
              : value;
            // @ts-expect-error: definitely compatible
            parent = parent[key](argument);
          }
          assertEquals(parent.type, schema);
          for (const [key, value] of entries) {
            if (key !== "required" && typeof value !== "boolean") {
              const { [key as keyof typeof parent.type]: _, ...rest } =
                parent.type;
              assertEquals(
                parent[key as Exclude<keyof typeof parent, "type">]().type,
                rest,
              );
            }
          }
        },
      ));
    });
  await test("boolean");
  await test("number");
  await test("string");
  await test("array");
  await test("object");
  await step("required : no arguments", () => {
    fc_check(fc.property(
      fc_object(fc_schema.any.map((type) => ({ type }))).map(($) =>
        object().properties($)
      ),
      ($) =>
        assertEquals(
          $.required().type,
          $.required(Object.keys($.type.properties)).type,
        ),
    ));
  });
});
Deno.test("code", async ({ step }) => {
  const test = <A extends Type>(
    $: fc.Arbitrary<[{ type: A }, Data<Type<A["type"]>>]>,
  ) =>
    fc_check(fc.property(
      $,
      ([typer, value]) => {
        const { length, encode, decode } = coder(typer.type);
        const result = parser(typer.type)(value);
        assert(result.state);
        const encoded = encode(result.value);
        assertEquals(encoded.length, length);
        assertEquals(decode(encoded), value);
      },
    ));
  await step('coder({ "type": "boolean" }) : arbitrary round-trip', () => {
    test(fc.tuple(fc.constant(boolean()), fc_types.boolean()));
  });
  await step('coder({ "type": "number" }) : arbitrary round-trip', () => {
    test(fc.tuple(fc.constant(number()), fc_types.number()));
  });
  await step('coder({ "type": "string" }) : arbitrary round-trip', () => {
    test(
      fc.tuple(fc.constant(string()), fc_types.string()),
    );
    test(
      fc_format.chain((format) =>
        fc.tuple(
          fc.constant(string().format(format)),
          fc_formats[format],
        )
      ),
    );
  });
  await step('coder({ "type": "array" }) : arbitrary round-trip', () => {
    test(fc.tuple(fc.constant(array()), fc_types.array()));
    test(
      fc_format.chain((format) =>
        fc.tuple(
          fc.constant(array().items(string().format(format))),
          fc.array(fc_formats[format]),
        )
      ),
    );
    test(
      fc_base.chain((base) =>
        fc.tuple(
          fc.constant(
            array().items(string().contentEncoding(base).minLength(1)),
          ),
          fc.array(fc.stringMatching(
            RegExp(`${BASES[base].source.replace("*", "{1,}")}`),
          )),
        )
      ),
    );
    test(
      fc_enum(fc_types.string()).chain(($) =>
        fc.tuple(
          fc.constant(array().items(string().enum($))),
          fc.array(fc.constantFrom(...$)),
        )
      ),
    );
    test(
      fc.constantFrom(...TYPES).chain(($) =>
        fc.tuple(
          fc.constant(array().items(TYPERS[$]() as { type: Type })),
          fc.array(fc_types[$]() as fc.Arbitrary<Json>),
        )
      ),
    );
    test(
      fc.tuple(fc.constantFrom(...TYPES), fc_max).chain(([type, max]) =>
        fc.tuple(
          fc.constant(
            array().items(TYPERS[type]() as { type: Type }).maxItems(max),
          ),
          fc.array(fc_types[type]() as fc.Arbitrary<Json>, { maxLength: max }),
        )
      ),
    );
  });
  await step('coder({ "type": "object" }) : arbitrary round-trip', () => {
    test(fc.tuple(fc.constant(object()), fc_object(fc_json())));
    test(
      fc.constantFrom(...TYPES).chain(($) =>
        fc.tuple(
          fc.constant(object().properties({ [$]: TYPERS[$]() })),
          fc.record({ [$]: fc_types[$]() }, {
            requiredKeys: [],
          }) as fc.Arbitrary<{ [_: string]: Json }>,
        )
      ),
    );
    test(
      fc.constantFrom(...TYPES).chain(($) =>
        fc.tuple(
          fc.constant(object().properties({ [$]: TYPERS[$]() }).required()),
          fc.record({ [$]: fc_types[$]() }, {
            requiredKeys: [$],
          }) as fc.Arbitrary<{ [_: string]: Json }>,
        )
      ),
    );
  });
});
Deno.test("parse", async ({ step }) => {
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
    step(`parser({ "type": "${type}" }) : ${name}`, () => {
      fc_check(
        fc.property(
          $.chain(([type, { data, out }, { raw, fail }]) =>
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
          ),
          ({ type, ok, no }) => {
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
          },
        ),
      );
    });
  for (const type of TYPES) {
    await test(
      type,
      "type",
      fc_other(type).map((raw) => [TYPERS[type](), { data: fc_types[type]() }, {
        raw,
        fail: [{
          path: "",
          raw,
          error: ["type", type],
        }],
      }]),
    );
  }
  await test(
    "boolean",
    "enum",
    fc.boolean().map(($) => [boolean().enum([$]), { data: $ }, { raw: !$ }]),
  );
  await test(
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
  await test(
    "number",
    "minimum",
    fc_ordered(2).map(([min, max]) => [
      number().minimum(max),
      { data: max },
      { raw: min },
    ]),
  );
  await test(
    "number",
    "maximum",
    fc_ordered(2).map(([min, max]) => [
      number().maximum(min),
      { data: min },
      { raw: max },
    ]),
  );
  await test(
    "number",
    "exclusiveMinimum",
    fc_ordered(2).map(([min, max]) => [
      number().exclusiveMinimum(min),
      { data: max },
      { raw: min },
    ]),
  );
  await test(
    "number",
    "exclusiveMaximum",
    fc_ordered(2).map(([min, max]) => [
      number().exclusiveMaximum(max),
      { data: min },
      { raw: max },
    ]),
  );
  await test(
    "number",
    "multipleOf",
    fc_ordered(2).filter(([min, max]) => min !== 0 && max % min !== 0)
      .map(([min, max]) => [
        number().multipleOf(min),
        { data: min },
        { raw: max },
      ]),
  );
  await test(
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
  await test(
    "string",
    "minLength",
    fc_types.string({ minLength: 1 }).map(($) => [
      string().minLength($.length),
      { data: $ },
      { raw: $.slice(1) },
    ]),
  );
  await test(
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
  await test(
    "string",
    "contentEncoding",
    fc_base.map((base) => [
      string().contentEncoding(base),
      { data: fc.stringMatching(BASES[base]) },
      fc_not(BASES[base]),
    ]),
  );
  await test(
    "string",
    "format",
    fc_format.map((format) => [
      string().format(format),
      { data: fc_formats[format] },
      fc_not(FORMATS[format]),
    ]),
  );
  await test(
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
  await test(
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
  await test(
    "array",
    "minItems",
    fc_types.array({ minLength: 1 }).map((data) => [
      array().minItems(data.length),
      { data },
      { raw: data.slice(1) },
    ]),
  );
  await test(
    "array",
    "maxItems",
    fc_types.array({ minLength: 1 }).map((raw) => [
      array().maxItems(raw.length - 1),
      { data: raw.slice(1) },
      { raw },
    ]),
  );
  await test(
    "array",
    "uniqueItems",
    fc_json().map(($) => [
      fc.constantFrom(array().uniqueItems(), array().uniqueItems(true)),
      { data: [$] },
      { raw: [$, $] },
    ]),
  );
  await test(
    "object",
    "properties",
    fc_enum(fc_string()).chain((keys) =>
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
          ...all.map(([key, type]) =>
            fc.tuple(fc.constant(key), fc_other(type))
          ),
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
  await test(
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
  await test(
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
});
Deno.test("mod", async ({ step }) => {
  await step("bundle : pure", async () => {
    assertEquals(await bundle(import.meta), "");
  });
});
