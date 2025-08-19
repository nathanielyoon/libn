import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { de_csv, en_csv } from "../csv.ts";
import { de_header } from "../header.ts";

Deno.test("de_csv", () => {
  for (
    const [csv, json] of [
      ['"', null],
      ['a"', null],
      ['"a', null],
      ["\ufeff", [[""]]],
      ['""', [[""]]],
      [",a", [["", "a"]]],
      ["a\r\n", [["a"]]],
    ] satisfies [any, any][]
  ) assertEquals(de_csv(csv, ""), json);
});
Deno.test("en_csv", () => {
  for (
    const [json, csv] of [
      [null, "\n"],
      ["", "\n"],
      ["\r", "\r\n"],
      ["\r\n", '"\r\n"\n'],
      ["\n", '"\n"\n'],
      ['"', '""""\n'],
      [",", '","\n'],
      ["ok", "ok\n"],
    ] satisfies [any, any][]
  ) {
    assertEquals(en_csv([[json]]), csv);
    assertEquals(en_csv([[json]], ($) => $ === null), csv);
  }
});
Deno.test("header", () =>
  assertEquals(de_header([["__proto__"], [""]]), [{ ["__proto__"]: "" }]));
