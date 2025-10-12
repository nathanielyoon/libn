import { assertType, type IsExact } from "@std/testing/types";
import { expect } from "@std/expect/expect";
import fc from "fast-check";
import type {
  Base,
  Data,
  Format,
  Formats,
  Json,
  Type,
} from "@libn/json/schema";
import { array, boolean, number, object, string } from "@libn/json/build";
import { BASES, FORMATS, parser } from "@libn/json/parse";
import { coder } from "@libn/json/code";
import { enB16, enB32, enB64, enH32, enU64 } from "@libn/base";
import { unrexp } from "@libn/text/normalize";

const fcObject = <A>(value: fc.Arbitrary<A>, $?: fc.DictionaryConstraints) =>
  fc.dictionary(fc.string(), value, { noNullPrototype: true, ...$ });
const fcJson = fc.letrec<
  { json: Json } & { [A in Type["type"]]: Data<Type<A>> }
>((tie) => ({
  json: fc.oneof(
    { weight: 1, arbitrary: tie("boolean") },
    { weight: 4, arbitrary: tie("number") },
    { weight: 4, arbitrary: tie("string") },
    { weight: 1, arbitrary: tie("array") },
    { weight: 1, arbitrary: tie("object") },
  ),
  boolean: fc.boolean(),
  number: fc.double({ noDefaultInfinity: true, noNaN: true }),
  string: fc.string({ unit: "grapheme" }).map(($) => $.normalize()),
  array: fc.array(tie("json")),
  object: fcObject(tie("json")),
}));
const fcSplit = <A extends Type["type"]>(type: A) => {
  const { json: _, [type]: ok, ...rest } = fcJson;
  return { ok, no: fc.oneof(...Object.values<fc.Arbitrary<Json>>(rest)) };
};
const TYPE = ["boolean", "number", "string", "array", "object"] as const;
const fcType = fc.constantFrom(...TYPE);
const fcBase = fc.constantFrom(
  ...Object.keys(BASES) as (keyof typeof BASES)[],
);
const fcFormat = fc.constantFrom(
  ...Object.keys(FORMATS) as (keyof typeof FORMATS)[],
);
type FcFormat<A extends Format> = { [B in A]: fc.Arbitrary<Formats[A]> };
const fcFormats = {
  ...([["date", 0, 10], ["time", 11, 24], ["date-time", 0, 24]] as const)
    .reduce((to, [key, min, max]) => ({
      ...to,
      [key]: fc.date({
        noInvalidDate: true,
        min: new Date("0000"),
        max: new Date("9999-12-31T23:59:59.999Z"),
      }).map(($) => $.toISOString().slice(min, max)),
    }), {} as FcFormat<"date" | "time" | "date-time">),
  ...(["email", "uri", "uuid"] as const).reduce((to, key) => ({
    ...to,
    [key]: fc.stringMatching(FORMATS[key]).map(($) => $.trim().normalize())
      .filter(RegExp.prototype.test.bind(FORMATS[key])),
  }), {} as FcFormat<"email" | "uri" | "uuid">),
};
const fcBases = ([
  ["base16", enB16],
  ["base32", enB32],
  ["base32hex", enH32],
  ["base64", enB64],
  ["base64url", enU64],
] as const).reduce((bases, [base, encode]) => ({
  ...bases,
  [base]: fc.uint8Array().map(encode),
}), {} as { [_ in Base]: fc.Arbitrary<string> });
const fcEnum = <A>($: fc.Arbitrary<A>) =>
  fc.uniqueArray($, {
    minLength: 2,
    comparator: "SameValueZero",
  }) as fc.Arbitrary<[A, A, ...A[]]>;
const fcOrdered = (count: number, arbitrary?: fc.Arbitrary<number>) =>
  fc.uniqueArray(arbitrary ?? fcJson.number, {
    minLength: count,
    maxLength: count,
    comparator: "SameValueZero",
  }).map(($) => [...new Float64Array($).sort()]);
const fcMax = fc.nat({ max: 255 });
const fcBaseSchema = <A extends Type["type"]>(
  type: A,
  $: { [B in Exclude<keyof Type<A>, keyof Type>]: fc.Arbitrary<Type<A>[B]> },
) =>
  fc.record({
    type: fc.constant(type),
    title: fcJson.string,
    description: fcJson.string,
    ...$,
  }, { noNullPrototype: true, requiredKeys: ["type"] });
const fcSchema = fc.letrec<
  { json: Type } & { [A in Type as A["type"]]: A }
>((tie) => ({
  json: fc.oneof(
    { weight: 1, arbitrary: tie("boolean") },
    { weight: 4, arbitrary: tie("number") },
    { weight: 4, arbitrary: tie("string") },
    { weight: 1, arbitrary: tie("array") },
    { weight: 1, arbitrary: tie("object") },
  ),
  boolean: fcBaseSchema("boolean", { enum: fc.tuple(fcJson.boolean) }),
  number: fcOrdered(4).chain(([min_lo, min_hi, max_lo, max_hi]) =>
    fcBaseSchema("number", {
      enum: fcEnum(fcJson.number),
      exclusiveMinimum: fc.constant(min_lo),
      minimum: fc.constant(min_hi),
      maximum: fc.constant(max_lo),
      exclusiveMaximum: fc.constant(max_hi),
      multipleOf: fcJson.number,
    })
  ),
  string: fcOrdered(2, fcMax).chain(([min, max]) =>
    fcBaseSchema("string", {
      enum: fcEnum(fcJson.string),
      minLength: fc.constant(min),
      maxLength: fc.constant(max),
      contentEncoding: fcBase,
      format: fcFormat,
      pattern: fcJson.string.map(($) => $.replace(/[$(-+./?[-^{|}]/g, "\\$&")),
    })
  ),
  array: fcOrdered(2, fcMax).chain(([min, max]) =>
    fcBaseSchema("array", {
      items: tie("json"),
      minItems: fc.constant(min),
      maxItems: fc.constant(max),
      uniqueItems: fc.boolean(),
    })
  ),
  object: fc.record({
    properties: fcObject(tie("json")),
    range: fcOrdered(2, fcMax),
  }).chain(({ properties, range: [min, max] }) =>
    fcBaseSchema("object", {
      properties: fc.constant(properties),
      required: Object.keys(properties).length
        ? fc.uniqueArray(fc.constantFrom(...Object.keys(properties)))
        : fc.constant([]),
      additionalProperties: fc.boolean(),
      minProperties: fc.constant(min),
      maxProperties: fc.constant(max),
    }).map(({ properties, required, ...rest }) => ({
      ...properties
        ? { properties, ...required ? { required } : {} }
        : required
        ? { required: [] }
        : {},
      ...rest,
    }))
  ),
}));
Deno.test("boolean() builds boolean schema", () =>
  fc.assert(fc.property(fcSchema.boolean, ($) => {
    let typer = boolean();
    assertType<IsExact<typeof typer.type, { type: "boolean" }>>(true);
    if ($.title !== undefined) {
      const next = typer.title($.title);
      assertType<
        IsExact<typeof next.type, { type: "boolean"; title: typeof $.title }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.title();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.description !== undefined) {
      const next = typer.description($.description);
      assertType<
        IsExact<
          typeof next.type,
          { type: "boolean"; description: typeof $.description }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.description();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.enum !== undefined) {
      const next = typer.enum($.enum);
      assertType<
        IsExact<typeof next.type, { type: "boolean"; enum: typeof $.enum }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.enum();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    expect(typer.type).toStrictEqual($);
  })));
Deno.test("number() builds number schema", () =>
  fc.assert(fc.property(fcSchema.number, ($) => {
    let typer = number();
    if ($.title !== undefined) {
      const next = typer.title($.title);
      assertType<
        IsExact<typeof next.type, { type: "number"; title: typeof $.title }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.title();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.description !== undefined) {
      const next = typer.description($.description);
      assertType<
        IsExact<
          typeof next.type,
          { type: "number"; description: typeof $.description }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.description();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.enum !== undefined) {
      const next = typer.enum($.enum);
      assertType<
        IsExact<typeof next.type, { type: "number"; enum: typeof $.enum }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.enum();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.minimum !== undefined) {
      const next = typer.minimum($.minimum);
      assertType<
        IsExact<typeof next.type, { type: "number"; minimum: typeof $.minimum }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.minimum();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.maximum !== undefined) {
      const next = typer.maximum($.maximum);
      assertType<
        IsExact<typeof next.type, { type: "number"; maximum: typeof $.maximum }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.maximum();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.exclusiveMinimum !== undefined) {
      const next = typer.exclusiveMinimum($.exclusiveMinimum);
      assertType<
        IsExact<
          typeof next.type,
          { type: "number"; exclusiveMinimum: typeof $.exclusiveMinimum }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.exclusiveMinimum();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.exclusiveMaximum !== undefined) {
      const next = typer.exclusiveMaximum($.exclusiveMaximum);
      assertType<
        IsExact<
          typeof next.type,
          { type: "number"; exclusiveMaximum: typeof $.exclusiveMaximum }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.exclusiveMaximum();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.multipleOf !== undefined) {
      const next = typer.multipleOf($.multipleOf);
      assertType<
        IsExact<
          typeof next.type,
          { type: "number"; multipleOf: typeof $.multipleOf }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.multipleOf();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    expect(typer.type).toStrictEqual($);
  })));
Deno.test("string() builds string schema", () =>
  fc.assert(fc.property(fcSchema.string, ($) => {
    let typer = string();
    if ($.title !== undefined) {
      const next = typer.title($.title);
      assertType<
        IsExact<typeof next.type, { type: "string"; title: typeof $.title }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.title();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.description !== undefined) {
      const next = typer.description($.description);
      assertType<
        IsExact<
          typeof next.type,
          { type: "string"; description: typeof $.description }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.description();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.enum !== undefined) {
      const next = typer.enum($.enum);
      assertType<
        IsExact<typeof next.type, { type: "string"; enum: typeof $.enum }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.enum();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.minLength !== undefined) {
      const next = typer.minLength($.minLength);
      assertType<
        IsExact<
          typeof next.type,
          { type: "string"; minLength: typeof $.minLength }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.minLength();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.maxLength !== undefined) {
      const next = typer.maxLength($.maxLength);
      assertType<
        IsExact<
          typeof next.type,
          { type: "string"; maxLength: typeof $.maxLength }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.maxLength();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.contentEncoding !== undefined) {
      const next = typer.contentEncoding($.contentEncoding);
      assertType<
        IsExact<
          typeof next.type,
          { type: "string"; contentEncoding: typeof $.contentEncoding }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.contentEncoding();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.format !== undefined) {
      const next = typer.format($.format);
      assertType<
        IsExact<typeof next.type, { type: "string"; format: typeof $.format }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.format();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.pattern !== undefined) {
      const next = typer.pattern($.pattern);
      assertType<
        IsExact<typeof next.type, { type: "string"; pattern: typeof $.pattern }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.pattern();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    expect(typer.type).toStrictEqual($);
  })));
Deno.test("array() builds array schema", () =>
  fc.assert(fc.property(fcSchema.array, ($) => {
    let typer = array();
    if ($.title !== undefined) {
      const next = typer.title($.title);
      assertType<
        IsExact<typeof next.type, { type: "array"; title: typeof $.title }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.title();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.description !== undefined) {
      const next = typer.description($.description);
      assertType<
        IsExact<
          typeof next.type,
          { type: "array"; description: typeof $.description }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.description();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.items !== undefined) {
      {
        const next = typer.items($.items);
        assertType<
          IsExact<typeof next.type, { type: "array"; items: typeof $.items }>
        >(true);
        expect(next).not.toBe(typer);
        const prev = next.items();
        assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
        expect(prev).not.toBe(next);
        expect(prev.type).toStrictEqual(typer.type);
      }
      {
        const next = typer.items({ type: $.items });
        assertType<
          IsExact<typeof next.type, { type: "array"; items: typeof $.items }>
        >(true);
        expect(next).not.toBe(typer);
        const prev = next.items();
        assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
        expect(prev).not.toBe(next);
        expect(prev.type).toStrictEqual(typer.type);
        typer = next;
      }
    }
    if ($.minItems !== undefined) {
      const next = typer.minItems($.minItems);
      assertType<
        IsExact<
          typeof next.type,
          { type: "array"; minItems: typeof $.minItems }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.minItems();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.maxItems !== undefined) {
      const next = typer.maxItems($.maxItems);
      assertType<
        IsExact<
          typeof next.type,
          { type: "array"; maxItems: typeof $.maxItems }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.maxItems();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.uniqueItems !== undefined) {
      const next = typer.uniqueItems($.uniqueItems);
      assertType<
        IsExact<
          typeof next.type,
          { type: "array"; uniqueItems: typeof $.uniqueItems }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.uniqueItems();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    expect(typer.type).toStrictEqual($);
  })));
Deno.test("object() builds object schema", () =>
  fc.assert(fc.property(fcSchema.object, ($) => {
    let typer = object();
    if ($.title !== undefined) {
      const next = typer.title($.title);
      assertType<
        IsExact<typeof next.type, { type: "object"; title: typeof $.title }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.title();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.description !== undefined) {
      const next = typer.description($.description);
      assertType<
        IsExact<
          typeof next.type,
          { type: "object"; description: typeof $.description }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.description();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.properties !== undefined) {
      {
        const next = typer.properties($.properties);
        assertType<
          IsExact<
            typeof next.type,
            { type: "object"; properties: typeof $.properties }
          >
        >(true);
        expect(next).not.toBe(typer);
        const prev = next.properties();
        assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
        expect(prev).not.toBe(next);
        expect(prev.type).toStrictEqual(typer.type);
      }
      {
        const next = typer.properties(
          Object.entries($.properties).reduce<{ [_: string]: { type: Type } }>(
            (all, [key, value]) => ({ ...all, [key]: { type: value } }),
            {},
          ),
        );
        assertType<
          IsExact<
            typeof next.type,
            { type: "object"; properties: typeof $.properties }
          >
        >(true);
        expect(next).not.toBe(typer);
        const prev = next.properties();
        assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
        expect(prev).not.toBe(next);
        expect(prev.type).toStrictEqual(typer.type);
        typer = next;
      }
    }
    if ($.required !== undefined) {
      if ($.properties !== undefined) {
        const base = typer.properties($.properties);
        const next = base.required($.required);
        assertType<
          IsExact<typeof next.type, {
            type: "object";
            properties: typeof $.properties;
            required: typeof $.required;
          }>
        >(true);
        expect(next).not.toBe(base);
        const prev = next.required();
        assertType<IsExact<typeof prev.type, typeof base.type>>(true);
        expect(prev).not.toBe(next);
        expect(prev.type).toStrictEqual(base.type);
        typer = next;
      } else {
        expect($.required).toStrictEqual([]);
        const next = typer.required({});
        assertType<
          IsExact<typeof next.type, { type: "object"; required: readonly [] }>
        >(true);
        expect(next).not.toBe(typer);
        const prev = next.required();
        assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
        expect(prev).not.toBe(next);
        expect(prev.type).toStrictEqual(typer.type);
        typer = next;
      }
    }
    if ($.minProperties !== undefined) {
      const next = typer.minProperties($.minProperties);
      assertType<
        IsExact<
          typeof next.type,
          { type: "object"; minProperties: typeof $.minProperties }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.minProperties();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.maxProperties !== undefined) {
      const next = typer.maxProperties($.maxProperties);
      assertType<
        IsExact<
          typeof next.type,
          { type: "object"; maxProperties: typeof $.maxProperties }
        >
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.maxProperties();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    if ($.additionalProperties !== undefined) {
      const next = typer.additionalProperties($.additionalProperties);
      assertType<
        IsExact<typeof next.type, {
          type: "object";
          additionalProperties: typeof $.additionalProperties;
        }>
      >(true);
      expect(next).not.toBe(typer);
      const prev = next.additionalProperties();
      assertType<IsExact<typeof prev.type, typeof typer.type>>(true);
      expect(prev).not.toBe(next);
      expect(prev.type).toStrictEqual(typer.type);
      typer = next;
    }
    expect(typer.type).toStrictEqual($);
  })));
Deno.test("coder() encodes/decodes booleans", () =>
  fc.assert(fc.property(fcJson.boolean, (data) => {
    const { encode, decode, length } = coder(boolean());
    const raw = encode(data);
    expect(raw.length).toStrictEqual(length);
    expect(decode(raw)).toStrictEqual(data);
  })));
Deno.test("coder() encodes/decodes numbers", () =>
  fc.assert(fc.property(fcJson.number, (data) => {
    const { encode, decode, length } = coder(number());
    const raw = encode(data);
    expect(raw.length).toStrictEqual(length);
    expect(decode(raw)).toStrictEqual(data);
  })));
Deno.test("coder() encodes/decodes strings", () =>
  fc.assert(fc.property(fcJson.string, (data) => {
    const { encode, decode, length } = coder(string());
    const raw = encode(data);
    expect(raw.length).toStrictEqual(length);
    expect(decode(raw)).toStrictEqual(data);
  })));
Deno.test("coder() encodes/decodes arrays of booleans", () =>
  fc.assert(fc.property(fc.array(fcJson.boolean), (data) => {
    const { encode, decode, length } = coder(array().items(boolean()));
    const raw = encode(data);
    expect(raw.length).toStrictEqual(length);
    expect(decode(raw)).toStrictEqual(data);
  })));
Deno.test("coder() encodes/decodes arrays of numbers", () =>
  fc.assert(fc.property(fc.array(fcJson.number), (data) => {
    const { encode, decode, length } = coder(array().items(number()));
    const raw = encode(data);
    expect(raw.length).toStrictEqual(length);
    expect(decode(raw)).toStrictEqual(data);
  })));
Deno.test("coder() encodes/decodes arrays of formatted strings", () =>
  fc.assert(fc.property(
    fcFormat.chain(($) =>
      fc.record({
        format: fc.constant($),
        data: fc.array(fcFormats[$]),
      })
    ),
    ({ format, data }) => {
      const { encode, decode, length } = coder(
        array().items(string().format(format)),
      );
      const raw = encode(data);
      expect(raw.length).toStrictEqual(length);
      expect(decode(raw)).toStrictEqual(data);
    },
  )));
Deno.test("coder() encodes/decodes arrays of encoded nonempty strings", () =>
  fc.assert(fc.property(
    fcBase.chain(($) =>
      fc.record({
        base: fc.constant($),
        data: fc.array(fcBases[$]),
      })
    ),
    ({ base, data }) => {
      const { encode, decode, length } = coder(
        array().items(string().contentEncoding(base)),
      );
      const raw = encode(data);
      expect(raw.length).toStrictEqual(length);
      expect(decode(raw)).toStrictEqual(data);
    },
  )));
Deno.test("coder() encodes/decodes arrays of nonempty comma-free enums", () =>
  fc.assert(fc.property(
    fcEnum(fc.stringMatching(/^[^,]+$/)).chain(($) =>
      fc.record({
        items: fc.constant($),
        data: fc.array(fc.constantFrom(...$)),
      })
    ),
    ({ items, data }) => {
      const { encode, decode, length } = coder(
        array().items(string().enum(items)),
      );
      const raw = encode(data);
      expect(raw.length).toStrictEqual(length);
      expect(decode(raw)).toStrictEqual(data);
    },
  )));
Deno.test("coder() encodes/decodes bounded arrays of specified json", () =>
  fc.assert(fc.property(
    fc.tuple(fcType, fcMax).chain(([type, max]) =>
      fc.record({
        items: fc.constant({ type }),
        max: fc.constantFrom(max),
        data: fc.array<Json>(fcJson[type], { maxLength: max }),
      })
    ),
    ({ items, max, data }) => {
      const { encode, decode, length } = coder(
        array().items(items).maxItems(max),
      );
      const raw = encode(data);
      expect(raw.length).toStrictEqual(length);
      expect(decode(raw)).toStrictEqual(data);
    },
  )));
Deno.test("coder() encodes/decodes arrays of specified json", () =>
  fc.assert(fc.property(
    fcType.chain(($) =>
      fc.record({
        items: fc.constant({ type: $ }),
        data: fc.array<Json>(fcJson[$]),
      })
    ),
    ({ items, data }) => {
      const { encode, decode, length } = coder(array().items(items));
      const raw = encode(data);
      expect(raw.length).toStrictEqual(length);
      expect(decode(raw)).toStrictEqual(data);
    },
  )));
Deno.test("coder() encodes/decodes arrays of json", () =>
  fc.assert(fc.property(fc.array(fcJson.json), ($) => {
    const { encode, decode, length } = coder(array());
    const raw = encode($);
    expect(raw.length).toStrictEqual(length);
    expect(decode(raw)).toStrictEqual($);
  })));
Deno.test("coder() encodes/decodes objects of specified required json", () =>
  fc.assert(fc.property(
    fcObject(fcType, { minKeys: 1 }).chain(($) =>
      fc.record({
        properties: fc.constant(
          Object.entries($).reduce<{ [_: string]: Type }>(
            (to, [key, type]) => ({ ...to, [key]: { type } }),
            {},
          ),
        ),
        required: fc.uniqueArray(fc.constantFrom(...Object.keys($)), {
          minLength: 1,
        }),
      })
    ).chain(({ properties, required }) =>
      fc.record({
        properties: fc.constant(properties),
        required: fc.constant(required),
        data: fc.record(
          Object.entries(properties).reduce<
            { [_: string]: fc.Arbitrary<Json> }
          >((to, [key, { type }]) => ({ ...to, [key]: fcJson[type] }), {}),
          { requiredKeys: required },
        ),
      })
    ),
    ({ properties, required, data }) => {
      const { encode, decode, length } = coder(
        object().properties(properties).required(required),
      );
      const raw = encode(data);
      expect(raw.length).toStrictEqual(length);
      expect(decode(raw)).toStrictEqual(data);
    },
  )));
Deno.test("coder() encodes/decodes objects of specified json", () =>
  fc.assert(fc.property(
    fc.dictionary(fcJson.string, fcType).chain(($) =>
      fc.record({
        properties: fc.constant(
          Object.entries($).reduce<{ [_: string]: Type }>(
            (to, [key, type]) => ({ ...to, [key]: { type } }),
            {},
          ),
        ),
        data: fc.record(
          Object.entries($).reduce(
            (to, [key, type]) => ({ ...to, [key]: fcJson[type] }),
            {},
          ),
        ),
      })
    ),
    ({ properties, data }) => {
      const { encode, decode, length } = coder(
        object().properties(properties),
      );
      const raw = encode(data);
      expect(raw.length).toStrictEqual(length);
      expect(decode(raw)).toStrictEqual(data);
    },
  )));
Deno.test("coder() encodes/decodes objects of json", () =>
  fc.assert(fc.property(fc.dictionary(fcJson.string, fcJson.json), ($) => {
    const { encode, decode, length } = coder(object());
    const raw = encode($);
    expect(raw.length).toStrictEqual(length);
    expect(decode(raw)).toStrictEqual($);
  })));
Deno.test("parser() parses booleans", () =>
  fc.assert(fc.property(fc.record(fcSplit("boolean")), ({ ok, no }) => {
    const parse = parser(boolean());
    expect(parse(ok)).toStrictEqual({ state: true, value: ok });
    expect(parse(no)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: no, error: ["type", "boolean"] }],
    });
  })));
Deno.test("parser() parses enumerated booleans", () =>
  fc.assert(fc.property(fcJson.boolean, ($) => {
    const parse = parser(boolean().enum([$]));
    expect(parse($)).toStrictEqual({ state: true, value: $ });
    expect(parse(!$)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: !$, error: ["enum", [$]] }],
    });
  })));
Deno.test("parser() parses numbers", () =>
  fc.assert(fc.property(fc.record(fcSplit("number")), ({ ok, no }) => {
    const parse = parser(number());
    expect(parse(ok)).toStrictEqual({ state: true, value: ok });
    expect(parse(no)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: no, error: ["type", "number"] }],
    });
  })));
Deno.test("parser() parses enumerated numbers", () =>
  fc.assert(fc.property(fcEnum(fcJson.number), ([head, ...rest]) => {
    const parse = parser(number().enum(rest));
    for (const $ of rest) {
      expect(parse($)).toStrictEqual({ state: true, value: $ });
    }
    expect(parse(head)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: head, error: ["enum", rest] }],
    });
  })));
Deno.test("parser() parses bound-inclusive numbers", () =>
  fc.assert(fc.property(fcOrdered(2), ([lower, upper]) => {
    const parseMin = parser(number().minimum(upper));
    expect(parseMin(upper)).toStrictEqual({ state: true, value: upper });
    expect(parseMin(lower)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: lower, error: ["minimum", upper] }],
    });
    const parseMax = parser(number().maximum(lower));
    expect(parseMax(lower)).toStrictEqual({ state: true, value: lower });
    expect(parseMax(upper)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: upper, error: ["maximum", lower] }],
    });
  })));
Deno.test("parser() parses bound-exclusive numbers", () =>
  fc.assert(fc.property(fcOrdered(2), ([lower, upper]) => {
    const parseMin = parser(number().exclusiveMinimum(lower));
    expect(parseMin(upper)).toStrictEqual({ state: true, value: upper });
    expect(parseMin(lower)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: lower, error: ["exclusiveMinimum", lower] }],
    });
    const parseMax = parser(number().exclusiveMaximum(upper));
    expect(parseMax(lower)).toStrictEqual({ state: true, value: lower });
    expect(parseMax(upper)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: upper, error: ["exclusiveMaximum", upper] }],
    });
  })));
Deno.test("parser() parses number multiples", () =>
  fc.assert(fc.property(
    fcOrdered(2).filter(([lower, upper]) => lower !== 0 && upper % lower !== 0),
    ([lower, upper]) => {
      const parse = parser(number().multipleOf(lower));
      expect(parse(lower)).toStrictEqual({ state: true, value: lower });
      expect(parse(upper)).toStrictEqual({
        state: false,
        value: [{ path: "", raw: upper, error: ["multipleOf", lower] }],
      });
    },
  )));
Deno.test("parser() parses strings", () =>
  fc.assert(fc.property(fc.record(fcSplit("string")), ({ ok, no }) => {
    const parse = parser(string());
    expect(parse(ok)).toStrictEqual({ state: true, value: ok });
    expect(parse(no)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: no, error: ["type", "string"] }],
    });
  })));
Deno.test("parser() parses enumerated strings", () =>
  fc.assert(fc.property(fcEnum(fcJson.string), ([head, ...rest]) => {
    const parse = parser(string().enum(rest));
    for (const $ of rest) {
      expect(parse($)).toStrictEqual({ state: true, value: $ });
    }
    expect(parse(head)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: head, error: ["enum", rest] }],
    });
  })));
Deno.test("parser() parses bounded strings", () =>
  fc.assert(fc.property(fc.string({ minLength: 1 }), ($) => {
    const parseMin = parser(string().minLength($.length));
    expect(parseMin($)).toStrictEqual({ state: true, value: $ });
    expect(parseMin($.slice(1))).toStrictEqual({
      state: false,
      value: [{ path: "", raw: $.slice(1), error: ["minLength", $.length] }],
    });
    const parseMax = parser(string().maxLength($.length - 1));
    expect(parseMax($.slice(1))).toStrictEqual({
      state: true,
      value: $.slice(1),
    });
    expect(parseMax($)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: $, error: ["maxLength", $.length - 1] }],
    });
  })));
Deno.test("parser() parses encoded strings", () =>
  fc.assert(fc.property(
    fcBase.chain((base) =>
      fc.record({
        base: fc.constant(base),
        ok: fcBases[base],
        no: fcJson.string.filter(($) => !BASES[base].test($)),
      })
    ),
    ({ base, ok, no }) => {
      const parse = parser(string().contentEncoding(base));
      expect(parse(ok)).toStrictEqual({ state: true, value: ok });
      expect(parse(no)).toStrictEqual({
        state: false,
        value: [{ path: "", raw: no, error: ["contentEncoding", base] }],
      });
    },
  )));
Deno.test("parser() parses formatted strings", () =>
  fc.assert(fc.property(
    fcFormat.chain((format) =>
      fc.record({
        format: fc.constant(format),
        ok: fcFormats[format],
        no: fcJson.string.filter(($) => !FORMATS[format].test($)),
      })
    ),
    ({ format, ok, no }) => {
      const parse = parser(string().format(format));
      expect(parse(ok)).toStrictEqual({ state: true, value: ok });
      expect(parse(no)).toStrictEqual({
        state: false,
        value: [{ path: "", raw: no, error: ["format", format] }],
      });
    },
  )));
Deno.test("parser() parses patterned strings", () =>
  fc.assert(fc.property(
    fcJson.string.map(($) => RegExp(`^${unrexp($)}$`)).chain((pattern) =>
      fc.record({
        pattern: fc.constant(pattern.source),
        ok: fc.stringMatching(pattern),
        no: fcJson.string.filter(($) => !pattern.test($)),
      })
    ),
    ({ pattern, ok, no }) => {
      const parse = parser(string().pattern(pattern));
      expect(parse(ok)).toStrictEqual({ state: true, value: ok });
      expect(parse(no)).toStrictEqual({
        state: false,
        value: [{ path: "", raw: no, error: ["pattern", pattern] }],
      });
    },
  )));
Deno.test("parser() parses arrays", () =>
  fc.assert(fc.property(fc.record(fcSplit("array")), ({ ok, no }) => {
    const parse = parser(array());
    expect(parse(ok)).toStrictEqual({ state: true, value: ok });
    expect(parse(no)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: no, error: ["type", "array"] }],
    });
  })));
Deno.test("parser() parses specified arrays", () =>
  fc.assert(fc.property(
    fcType.chain((type) => {
      const { ok, no } = fcSplit(type);
      return fc.record({
        items: fc.constant({ type }),
        ok: fc.array<Data<Type<typeof type>>>(ok),
        no: fc.array(no, { minLength: 1 }),
      });
    }),
    ({ items, ok, no }) => {
      const parse = parser(array().items(items));
      expect(parse(ok)).toStrictEqual({ state: true, value: ok });
      expect(parse(no)).toStrictEqual({
        state: false,
        value: no.map(($, z) => ({
          path: `/${z}`,
          raw: $,
          error: ["type", items.type],
        })),
      });
    },
  )));
Deno.test("parser() parses bounded arrays", () =>
  fc.assert(fc.property(fc.array(fcJson.json, { minLength: 1 }), ($) => {
    const parseMin = parser(array().minItems($.length));
    expect(parseMin($)).toStrictEqual({ state: true, value: $ });
    expect(parseMin($.slice(1))).toStrictEqual({
      state: false,
      value: [{ path: "", raw: $.slice(1), error: ["minItems", $.length] }],
    });
    const parseMax = parser(array().maxItems($.length - 1));
    expect(parseMax($.slice(1))).toStrictEqual({
      state: true,
      value: $.slice(1),
    });
    expect(parseMax($)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: $, error: ["maxItems", $.length - 1] }],
    });
  })));
Deno.test("parser() parses unique arrays", () =>
  fc.assert(fc.property(fcJson.json, ($) => {
    const parse = parser(array().uniqueItems(true));
    expect(parse([$])).toStrictEqual({ state: true, value: [$] });
    expect(parse([$, $])).toStrictEqual({
      state: false,
      value: [{ path: "", raw: [$, $], error: ["uniqueItems", true] }],
    });
  })));
Deno.test("parser() parses objects", () =>
  fc.assert(fc.property(fc.record(fcSplit("object")), ({ ok, no }) => {
    const parse = parser(object());
    expect(parse(ok)).toStrictEqual({ state: true, value: ok });
    expect(parse(no)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: no, error: ["type", "object"] }],
    });
  })));
Deno.test("parser() parses specified objects", () =>
  fc.assert(fc.property(
    fcObject(fcType, { minKeys: 1 }).chain(($) =>
      fc.record({
        properties: fc.constant(
          Object.entries($).reduce<{ [_: string]: Type }>(
            (to, [key, value]) => ({ ...to, [key]: { type: value } }),
            {},
          ),
        ),
        ok: fc.record(
          Object.entries($).reduce(
            (to, [key, value]) => ({ ...to, [key]: fcJson[value] }),
            {},
          ),
        ),
        no: fc.record(
          Object.entries($).reduce(
            (to, [key, value]) => ({ ...to, [key]: fcSplit(value).no }),
            {},
          ),
        ),
      })
    ),
    ({ properties, ok, no }) => {
      const parse = parser(object().properties(properties));
      expect(parse(ok)).toStrictEqual({ state: true, value: ok });
      expect(parse(no)).toStrictEqual({
        state: false,
        value: Object.entries(no).map(([key, value]) => ({
          path: `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
          raw: value,
          error: ["type", properties[key].type],
        })),
      });
    },
  )));
Deno.test("parser() parses required objects", () =>
  fc.assert(fc.property(fcObject(fcJson.json, { minKeys: 1 }), ($) => {
    const parse = parser(object().required(Object.keys($)));
    expect(parse($)).toStrictEqual({ state: true, value: $ });
    expect(parse({})).toStrictEqual({
      state: false,
      value: Object.keys($).map((key) => ({
        path: "",
        raw: null,
        error: ["required", key],
      })),
    });
  })));
Deno.test("parser() parses bounded objects", () =>
  fc.assert(fc.property(fcObject(fcJson.json, { minKeys: 1 }), ($) => {
    const length = Object.keys($).length;
    const parseMin = parser(object().minProperties(length));
    expect(parseMin($)).toStrictEqual({ state: true, value: $ });
    expect(parseMin({})).toStrictEqual({
      state: false,
      value: [{ path: "", raw: {}, error: ["minProperties", length] }],
    });
    const parseMax = parser(object().maxProperties(length - 1));
    expect(parseMax({})).toStrictEqual({ state: true, value: {} });
    expect(parseMax($)).toStrictEqual({
      state: false,
      value: [{ path: "", raw: $, error: ["maxProperties", length - 1] }],
    });
  })));
Deno.test("parser() parses limited objects", () =>
  fc.assert(fc.property(
    fcEnum(fcJson.string).chain(([head, ...rest]) =>
      fc.record({
        properties: fc.constant(
          rest.reduce(
            (to, key) => ({ ...to, [key]: { type: "boolean" } }),
            {},
          ),
        ),
        ok: fc.record(
          rest.reduce((to, key) => ({ ...to, [key]: fcJson.boolean }), {}),
        ),
        no: fc.record({ [head]: fcJson.boolean }),
      })
    ),
    ({ properties, ok, no }) => {
      const parse = parser(
        object().properties(properties).additionalProperties(false),
      );
      expect(parse(ok)).toStrictEqual({ state: true, value: ok });
      expect(parse(no)).toStrictEqual({
        state: false,
        value: [{ path: "", raw: no, error: ["additionalProperties", false] }],
      });
    },
  )));
