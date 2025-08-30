import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_check, fc_str } from "@nyoon/test";
import { de_csv, en_csv } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("de_csv matches rfc4180 section 2", () =>
  vectors.rfc4180.forEach(({ csv, json }) => assertEquals(de_csv(csv), json)));
Deno.test("de_csv matches csv-test-data", () =>
  vectors.csv_test_data.forEach(({ csv, json }) =>
    assertEquals(de_csv(csv)?.map(($) => $.map(($) => $ ?? "")), json)
  ));
Deno.test("de_csv/en_csv match expected cases", () => {
  for (
    const [csv, json] of [
      ['"', null],
      ['a"', null],
      ['"a', null],
      ["\ufeff", [[null]]],
      ['""', [[""]]],
      [",a", [[null, "a"]]],
      ["a\r\n", [["a"]]],
    ] satisfies [any, any][]
  ) assertEquals(de_csv(csv), json);
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
    ]
  ) assertEquals(en_csv([[json]]), csv);
});
Deno.test("encoding/decoding round-trip losslessly", () =>
  fc_check(fc.property(
    fc.array(
      fc.array(
        fc.oneof(
          { weight: 7, arbitrary: fc_str() },
          { weight: 1, arbitrary: fc.constant(null) },
        ),
        { minLength: 1 },
      ),
      { minLength: 1 },
    ),
    ($) => assertEquals(de_csv(en_csv($)), $),
  )));
