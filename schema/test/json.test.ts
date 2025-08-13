import { assertEquals } from "jsr:@std/assert@^1.0.13";
import fc from "npm:fast-check@^4.2.0";
import { fc_number, fc_string } from "../../test.ts";
import {
  array,
  boolean,
  type Data,
  type Fail,
  FORMAT,
  number,
  object,
  string,
  type Type,
  type Typer,
} from "../json.ts";

const fc_setter = <A>($: fc.Arbitrary<A>) =>
  fc.uniqueArray($, {
    minLength: 2,
    comparator: "SameValueZero",
  }) as fc.Arbitrary<[A, ...A[]]>;
const test = <A extends Type["kind"]>(
  kind: A,
  all: {
    [B in keyof Type<A>]:
      Type<A> & { [C in B]-?: Exclude<Type<A>[C], false> } extends
        infer C extends Type ? fc.Arbitrary<[Typer<C>, Data<C>, Fail<C>?, any?]>
        : never;
  },
) =>
  Deno.test(
    kind,
    () =>
      (Object.keys(all) as (keyof typeof all & string)[]).forEach((key) =>
        fc.assert(fc.property(all[key], ([typer, ok, no, as]) => {
          const parse = typer.build();
          assertEquals(parse(ok), ok);
          no && assertEquals(parse(as ?? no.data), new Set([no]));
        }))
      ),
  );
const OK = {
  boolean: fc.boolean,
  number: fc_number,
  _nonfinite: () => fc.constantFrom(NaN, -Infinity, Infinity),
  string: ($?: fc.StringConstraints) => fc_string($).map(($) => $.normalize()),
  array: () => fc.constant([]),
  object: () => fc.constant({}),
};
const rest = <A extends Type["kind"]>(kind: A) =>
  fc.oneof(
    ...Object.values({ ...OK, [kind]: () => fc.constant(null) }).map(($) =>
      $()
    ),
  ).map(($) => ({
    path: "" as const,
    data: $,
    error: $ === null ? ["nullable", false] as never : ["kind", kind] as const,
  }));
const fail = <const A, const B>(key: A, value: B) => (data: unknown) => (
  { path: "", data, error: [key, value] } as const
);
test("boolean", {
  kind: fc.tuple(fc.constant(boolean()), OK.boolean(), rest("boolean")),
  nullable: fc.constant([boolean().nullable(), null]),
  enum: OK.boolean().map(($) => [boolean().enum([$]), $, {
    path: "",
    data: !$,
    error: ["enum", [$]] as const,
  }]),
});
test("number", {
  kind: fc.tuple(fc.constant(number()), OK.number(), rest("number")),
  nullable: fc.constant([number().nullable(), null]),
  enum: fc_setter(OK.number()).chain(([ok, ...no]) =>
    fc.tuple(
      fc.constant(number().enum([ok])),
      fc.constant(ok),
      fc.constantFrom(...no).map(fail("enum", [ok])),
    )
  ),
  min_value: fc_setter(OK.number())
    .map(($) => $.sort((one, two) => two - one))
    .chain(([min, ...lower]) =>
      fc.tuple(
        fc.constant(number().min_value(min)),
        fc.constantFrom(min),
        fc.constantFrom(...lower).map(fail("min_value", min)),
      )
    ),
  max_value: fc_setter(OK.number())
    .map(($) => $.sort((one, two) => one - two))
    .chain(([max, ...upper]) =>
      fc.tuple(
        fc.constant(number().max_value(max)),
        fc.constant(max),
        fc.constantFrom(...upper).map(fail("max_value", max)),
      )
    ),
  step: fc.uniqueArray(OK.number(), { minLength: 2, maxLength: 2 })
    .filter(($) => Boolean($[1] % $[0])).chain(($) =>
      fc.tuple(
        fc.constant(number().step($[0])),
        fc.constant($[0]),
        fc.constant($[1]).map(fail("step", $[0])),
      )
    ),
});
test("string", {
  kind: fc.tuple(fc.constant(string()), OK.string(), rest("string")),
  nullable: fc.constant([string().nullable(), null]),
  enum: fc_setter(OK.string()).chain(([ok, ...no]) =>
    fc.tuple(
      fc.constant(string().enum([ok])),
      fc.constant(ok),
      fc.constantFrom(...no).map(fail("enum", [ok])),
    )
  ),
  min_length: fc_setter(fc.nat({ max: 100 }))
    .map(($) => $.sort((one, two) => two - one))
    .chain(([min, ...lower]) =>
      fc.tuple(
        fc.constant(string().min_length(min)),
        fc.constant("\0".repeat(min)),
        fc.constantFrom(...lower.map(($) => "\0".repeat($))).map(
          fail("min_length", min),
        ),
      )
    ),
  max_length: fc_setter(fc.nat({ max: 100 }))
    .map(($) => $.sort((one, two) => one - two))
    .chain(([max, ...upper]) =>
      fc.tuple(
        fc.constant(string().max_length(max)),
        fc.constant("\0".repeat(max)),
        fc.constantFrom(...upper.map(($) => "\0".repeat($))).map(
          fail("max_length", max),
        ),
      )
    ),
  format: fc.constantFrom(...Object.keys(FORMAT) as (keyof typeof FORMAT)[])
    .chain(($) =>
      fc.tuple(
        fc.constant(string().format($)),
        fc.stringMatching(FORMAT[$]) as fc.Arbitrary<any>,
        fc.constant(fail("format", $)("")),
      )
    ),
  pattern: fc.constantFrom(...Object.values(FORMAT)).chain(($) =>
    fc.tuple(
      fc.constant(string().pattern($)),
      fc.stringMatching($),
      fc.constant(fail("pattern", $)("")),
    )
  ),
});
test("array", {
  kind: fc.tuple(fc.constant(array()), OK.array(), rest("array")),
  nullable: fc.constant([array().nullable(), null]),
  items: fc.constant([array().items(array()), [[]], {
    path: "/0",
    data: null,
    error: ["nullable", false],
  }, [null]]),
  min_items: fc_setter(fc.nat({ max: 100 }))
    .map(($) => $.sort((one, two) => two - one))
    .chain(([min, ...lower]) =>
      fc.tuple(
        fc.constant(array().min_items(min)),
        fc.constant(Array(min).fill(null)),
        fc.constantFrom(...lower.map(($) => Array($).fill(null))).map(
          fail("min_items", min),
        ),
      )
    ),
  max_items: fc_setter(fc.nat({ max: 100 }))
    .map(($) => $.sort((one, two) => one - two))
    .chain(([max, ...upper]) =>
      fc.tuple(
        fc.constant(array().max_items(max)),
        fc.constant(Array(max).fill(null)),
        fc.constantFrom(...upper.map(($) => Array($).fill(null))).map(
          fail("max_items", max),
        ),
      )
    ),
  unique_items: fc.constant([
    array().unique_items(),
    [null],
    fail("unique_items", true)([null, null]),
  ]),
});
test("object", {
  kind: fc.tuple(fc.constant(object()), OK.object(), rest("object")),
  nullable: fc.constant([object().nullable(), null]),
  properties: fc.constant([object().properties({ "": object() }), { "": {} }, {
    path: "/",
    data: null,
    error: ["nullable", false],
  }, { "": null }]),
  unique_properties: fc.constant([
    object().unique_properties(),
    { 0: null },
    fail("unique_properties", true)({ 0: null, 1: null }),
  ]),
});
