import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_num, fc_str } from "@libn/lib";
import type { Type } from "../src/types.ts";
import { object } from "../src/build.ts";
import {
  fc_base,
  fc_enum,
  fc_format,
  fc_max,
  fc_object,
  fc_ordered,
  fc_types,
  TYPERS,
  TYPES,
} from "./common.ts";

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
    title: fc_str(),
    description: fc_str(),
    enum: fc.constantFrom([true], [false]),
  }, { noNullPrototype: true, requiredKeys: ["type"] }),
  number: fc_ordered(4).chain(([min_lo, min_hi, max_lo, max_hi]) =>
    fc.record({
      type: fc.constant("number"),
      title: fc_str(),
      description: fc_str(),
      enum: fc_enum(fc_types.number()),
      exclusiveMinimum: fc.constant(min_lo),
      minimum: fc.constant(min_hi),
      maximum: fc.constant(max_lo),
      exclusiveMaximum: fc.constant(max_hi),
      multipleOf: fc_num(),
    }, { noNullPrototype: true, requiredKeys: ["type"] })
  ),
  string: fc_ordered(2, fc_max).chain(([min, max]) =>
    fc.record({
      type: fc.constant("string"),
      title: fc_str(),
      description: fc_str(),
      enum: fc_enum(fc_types.string()),
      minLength: fc.constant(min),
      maxLength: fc.constant(max),
      contentEncoding: fc_base,
      format: fc_format,
      pattern: fc_str().map(($) => $.replace(/[$(-+./?[-^{|}]/g, "\\$&")),
    }, { noNullPrototype: true, requiredKeys: ["type"] })
  ),
  array: fc_ordered(2, fc_max).chain(([min, max]) =>
    fc.record({
      type: fc.constant("array"),
      title: fc_str(),
      description: fc_str(),
      items: tie("any"),
      minItems: fc.constant(min),
      maxItems: fc.constant(max),
      uniqueItems: fc.boolean(),
    }, { noNullPrototype: true, requiredKeys: ["type"] })
  ),
  object: fc.tuple(fc_object(tie("any")), fc_ordered(2, fc_max)).chain(($) =>
    fc.record({
      type: fc.constant("object"),
      title: fc_str(),
      description: fc_str(),
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
for (const type of TYPES) {
  Deno.test(`${type} :: { "type": "${type}" }`, () =>
    fc_assert(fc_schema[type])((schema) => {
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
          const { [key as keyof typeof parent.type]: _, ...rest } = parent.type;
          assertEquals(
            parent[key as Exclude<keyof typeof parent, "type">]().type,
            rest,
          );
        }
      }
    }));
}
Deno.test("required : no arguments", () =>
  fc_assert(
    fc_object(fc_schema.any.map((type) => ({ type }))).map(($) =>
      object().properties($)
    ),
  )(($) =>
    assertEquals(
      $.required().type,
      $.required(Object.keys($.type.properties)).type,
    )
  ));
