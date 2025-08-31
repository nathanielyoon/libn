import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertThrows,
} from "@std/assert";
import fc from "fast-check";
import { fc_check, fc_num, fc_str } from "../test.ts";
import { array, boolean, number, object, string } from "./src/build.ts";
import { coder } from "./src/code.ts";
import type { Data, Fail, Type } from "./src/types.ts";
import { BASES, FORMATS, parser } from "./src/parse.ts";

const test = <A extends Type>(
  $: fc.Arbitrary<readonly [type: A, ok: Data<A>, no: Fail<A>, raw?: {}]>,
) =>
  fc_check(fc.property($, ([type, data, fail, raw]) => {
    const a = parser(type), b = a(data).unwrap(true);
    assertEquals(b, data);
    assertArrayIncludes(a(raw ?? fail.raw).unwrap(false), [fail]);
    const c = coder(type), d = c.encode(b);
    assertEquals(d.length, c.length), assertEquals(c.decode(d), data);
  }));
const type = <A extends Type>(type: A, to: ($: unknown) => any, or: any) =>
  test(
    fc.jsonValue().map(($) => [type, to($) ? $ : or, {
      path: "",
      raw: to($) ? null : $,
      error: ["type", type.type] as const,
    } as Fail<A>]),
  );
Deno.test("boolean", () => {
  type(boolean().type, ($) => typeof $ === "boolean", true);
  test(
    fc.boolean().map(($) => [
      boolean().enum([$]).type,
      $,
      { path: "", raw: !$, error: ["enum", [$]] } as const,
    ]),
  );
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
Deno.test("number", () => {
  type(number().type, Number.isFinite as ($: any) => $ is number, 0);
  test(
    fc_enum(fc_num()).map(([head, ...rest]) => [
      number().enum(rest).type,
      rest[0],
      { path: "", raw: head, error: ["enum", rest] },
    ]),
  );
  test(fc_min_max.map(({ min, max }) => [
    number().minimum(max).type,
    max,
    { path: "", raw: min, error: ["minimum", max] },
  ]));
  test(fc_min_max.map(({ min, max }) => [
    number().maximum(min).type,
    min,
    { path: "", raw: max, error: ["maximum", min] },
  ]));
  test(
    fc_min_max.filter(({ min, max }) => min !== 0 && max % min !== 0)
      .map(({ min, max }) => [
        number().multipleOf(min).type,
        min,
        { path: "", raw: max, error: ["multipleOf", min] },
      ]),
  );
});
const fc_iso = fc.date({
  noInvalidDate: true,
  min: new Date("0000"),
  max: new Date("9999-12-31T23:59:59.999Z"),
}).map(($) => $.toISOString());
Deno.test("string", () => {
  type(string().type, ($) => typeof $ === "string" && $ === $.normalize(), "");
  test(
    fc_enum(fc_str().map(($) => $.normalize())).map(([head, ...rest]) => [
      string().enum(rest).type,
      rest[0],
      { path: "", raw: head, error: ["enum", rest] },
    ]),
  );
  test(
    fc_str({ minLength: 1 }).map(($) => $.normalize()).map(($) => [
      string().minLength($.length).type,
      $,
      { path: "", raw: $.slice(1), error: ["minLength", $.length] },
    ]),
  );
  test(
    fc_str().map(($) => $.normalize()).map(($) => [
      string().maxLength($.length).type,
      $,
      { path: "", raw: $ + "!", error: ["maxLength", $.length] },
    ]),
  );
  test(
    fc.constantFrom(...Object.keys(BASES) as (keyof typeof BASES)[]).chain(
      ($) =>
        fc.tuple(
          fc.constant(string().contentEncoding($).type),
          fc.stringMatching(BASES[$]),
          fc.constant({
            path: "",
            raw: "!",
            error: ["contentEncoding", $],
          } as any),
        ),
    ),
  );
  test(
    fc.constantFrom(...Object.keys(FORMATS) as (keyof typeof FORMATS)[]).chain(
      ($) =>
        fc.tuple(
          fc.constant(string().format($).type),
          ($ === "date"
            ? fc_iso.map(($) => $.slice(0, 10))
            : $ === "time"
            ? fc_iso.map(($) => $.slice(11))
            : $ === "date-time"
            ? fc_iso
            : fc.stringMatching(FORMATS[$]).map(($) => $.normalize().trim())
              .filter(RegExp.prototype.test.bind(FORMATS[$]))) as fc.Arbitrary<
              Data<Type<"string"> & { format: typeof $ }>
            >,
          fc.constant({
            path: "",
            raw: "!",
            error: ["format", $],
          } as any),
        ),
    ),
  );
  test(
    fc.string().map(($) => {
      const a = `^${$.replaceAll(/[$(-+./?[-^{|}]/g, "\\$&")}$`;
      return [
        string().pattern(a).type,
        $,
        { path: "", raw: $ + "!", error: ["pattern", a] },
      ];
    }),
  );
  assertThrows(() => parser(string().pattern("(").type));
});
Deno.test("array", () => {
  type(array().type, Array.isArray, []);
  test(
    fc.boolean().map(($) => [
      array().items(boolean().enum([$])).type,
      [$],
      { path: "/0", raw: !$, error: ["enum", [$] as const] },
      [!$],
    ]),
  );
  test(
    fc.array(fc.jsonValue(), { minLength: 1 }).map(($) => [
      array().minItems($.length).type,
      $,
      { path: "", raw: $.slice(1), error: ["minItems", $.length] },
    ]),
  );
  test(
    fc.array(fc.jsonValue()).map(($) => [
      array().maxItems($.length).type,
      $,
      { path: "", raw: [...$, null], error: ["maxItems", $.length] },
    ]),
  );
  test(
    fc.boolean().map(($) => [
      array().items(boolean()).uniqueItems().type,
      [$],
      { path: "", raw: [$, $], error: ["uniqueItems", true as const] },
    ]),
  );
  assert(parser({ type: "array", uniqueItems: false })([0, 0]).is_ok());
  test(fc.oneof(
    fc.array(fc.boolean()).map(($) =>
      [
        array().items(boolean()).type,
        $,
        { path: "", raw: {}, error: ["type", "array"] },
      ] as const
    ),
  ));
});
Deno.test("object", () => {
  type(
    object().type,
    ($) => typeof $ === "object" && $ && !Array.isArray($),
    {},
  );
  test(
    fc.boolean().map(($) => [
      object().properties({ "": boolean().enum([$]) }).type,
      { "": $ },
      { path: "/", raw: !$, error: ["enum", [$] as const] },
      { "": !$ },
    ]),
  );
  test(
    fc_str().map(($) => [
      object().properties({ [$]: boolean() }).required([$]).type,
      { [$]: true },
      { path: "", raw: null, error: ["required", $] },
      {},
    ]),
  );
  test(
    fc_str().map(($) => [
      object().properties({ [$]: boolean() }).required().type,
      { [$]: true },
      { path: "", raw: null, error: ["required", $] },
      {},
    ]),
  );
  test(
    fc_str().map(($) => [object().properties({}).type, {}, {
      path: "",
      raw: { [$]: {} },
      error: ["additionalProperties", false as const],
    }]),
  );
  assert(
    parser({
      type: "object",
      properties: {},
      additionalProperties: true,
    })({ "": 0 }).is_ok(),
  );
  test(
    fc_str().map(($) => [
      object().properties({ [$]: boolean() }).minProperties(1).type,
      { [$]: true },
      { path: "", raw: {}, error: ["minProperties", 1 as const] },
    ]),
  );
  test(
    fc_str().map(($) => [
      object().properties({ [$]: boolean() }).maxProperties(0).type,
      {},
      { path: "", raw: { [$]: true }, error: ["maxProperties", 0 as const] },
    ]),
  );
});
