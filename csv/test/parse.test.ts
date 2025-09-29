import { assertEquals } from "@std/assert";
import { de_csv } from "../src/parse.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("de_csv : rfc4180 2", () =>
  vectors.rfc4180.forEach(($) => assertEquals(de_csv($.csv), $.json)));
Deno.test("de_csv : csv-test-data", () =>
  vectors.csv_test_data.forEach(($) =>
    assertEquals(de_csv($.csv)?.map(($) => $.map(($) => $ ?? "")), $.json)
  ));
Deno.test("de_csv :: csv-simple-parser", () => {
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
Deno.test("de_csv : edge cases", () =>
  ([
    ['"', null],
    ['a"', null],
    ['"a', null],
    ["\ufeff", []],
    ["\ufeffa", [["a"]]],
    ['""', [[""]]],
    [",a", [[null, "a"]]],
    ["a\r\n", [["a"]]],
    ["\r\na", [[null], ["a"]]],
  ] satisfies [any, any][]).forEach(($) => assertEquals(de_csv($[0]), $[1])));
