import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_check, fc_string } from "@libn/lib";
import { de_csv } from "./src/parse.ts";
import { en_csv } from "./src/stringify.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("parse", async ({ step }) => {
  await step("de_csv : rfc4180 2", () => {
    for (const $ of vectors.rfc4180) {
      assertEquals(de_csv($.csv), $.json);
    }
  });
  await step("de_csv : csv-test-data", () => {
    for (const $ of vectors.csv_test_data) {
      assertEquals(de_csv($.csv)?.map(($) => $.map(($) => $ ?? "")), $.json);
    }
  });
  await step("de_csv :: csv-simple-parser", () => {
    assertEquals(de_csv(""), []);
    assertEquals(de_csv("  "), [["  "]]);
    assertEquals(de_csv("abc"), [["abc"]]);
    assertEquals(de_csv("123"), [["123"]]);
    assertEquals(de_csv("-123"), [["-123"]]);
    assertEquals(de_csv("123.123"), [["123.123"]]);
    assertEquals(de_csv(" \ta\t "), [[" \ta\t "]]);
    assertEquals(de_csv('"abc"'), [["abc"]]);
    assertEquals(de_csv('"abc""123"'), [['abc"123']]);
    assertEquals(de_csv("abc,123"), [["abc", "123"]]);
    assertEquals(
      de_csv(' \tabc,123,-123,"abc","abc""123"'),
      [[" \tabc", "123", "-123", "abc", 'abc"123']],
    );
    assertEquals(de_csv('abc\n123\n"abc"'), [["abc"], ["123"], ["abc"]]);
    assertEquals(
      de_csv('abc,123\n-123,123.123\n"abc", \ta\t '),
      [["abc", "123"], ["-123", "123.123"], ["abc", " \ta\t "]],
    );
    assertEquals(de_csv('"abc,\'\r\n\`,123"'), [["abc,'\r\n\`,123"]]);
    assertEquals(de_csv('""'), [[""]]);
    assertEquals(de_csv('"",""'), [["", ""]]);
    assertEquals(de_csv(",foo", { empty: { value: "" } }), [["", "foo"]]);
    assertEquals(
      de_csv("foo,\n,bar", { empty: { value: "" } }),
      [["foo", ""], ["", "bar"]],
    );
    assertEquals(de_csv('"'), null);
    assertEquals(de_csv('"foo'), null);
    assertEquals(de_csv('foo"'), null);
    assertEquals(de_csv('"foo""'), null);
    assertEquals(de_csv('""foo"'), null);
    assertEquals(de_csv(',\n"foo""'), null);
  });
  await step("de_csv : edge cases", () => {
    for (
      const [csv, json] of [
        ['"', null],
        ['a"', null],
        ['"a', null],
        ["\ufeff", []],
        ["\ufeffa", [["a"]]],
        ['""', [[""]]],
        [",a", [[null, "a"]]],
        ["a\r\n", [["a"]]],
        ["\r\na", [[null], ["a"]]],
      ] satisfies [any, any][]
    ) assertEquals(de_csv(csv), json);
  });
});
Deno.test("stringify", async ({ step }) => {
  await step("en_csv : edge cases", () => {
    for (
      const [json, csv] of [
        [null, "\n"],
        ["", '""\n'],
        ["\r", '"\r"\n'],
        ["\r\n", '"\r\n"\n'],
        ["\n", '"\n"\n'],
        ['"', '""""\n'],
        [",", '","\n'],
        ["ok", "ok\n"],
      ] satisfies [any, any][]
    ) {
      assertEquals(
        json === null ? en_csv([[json]]) : en_csv<number>([[json]], {
          empty: { check: ($) => typeof $ === "number" },
        }),
        csv,
      );
    }
  });
});
const fc_rows = (size?: number) =>
  fc.array(
    fc.array(
      fc.oneof(
        { weight: 7, arbitrary: fc_string() },
        { weight: 1, arbitrary: fc.constant(null) },
      ),
      { minLength: size ?? 1, maxLength: size ?? 64 },
    ),
    { minLength: 1 },
  ).map(($) => ({ json: $, csv: en_csv($) }));
Deno.test("mod", async ({ step }) => {
  await step("en_csv/de_csv : arbitrary round-trip", () => {
    fc_check(fc.property(
      fc_rows(),
      ({ json, csv }) => assertEquals(de_csv(csv, { eager: false }), json),
    ));
  });
  await step("en_csv/de_csv : eager round-trip", () => {
    fc_check(fc.property(
      fc.integer({ min: 1, max: 64 }).chain(fc_rows),
      ({ json, csv }) => assertEquals(de_csv(csv), json),
    ));
  });
});
