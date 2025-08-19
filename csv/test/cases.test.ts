import { assertEquals } from "jsr:@std/assert@^1.0.13";
import { de_csv, en_csv } from "../csv.ts";

Deno.test("de_csv", () => {
  for (
    const [csv, json] of [
      ['""', [[""]]],
      ['"', null],
      ['a"', null],
      ['"a', null],
      [",a", [["", "a"]]],
      ["a\r\n", [["a"]]],
    ] satisfies [any, any][]
  ) assertEquals(de_csv(csv, ""), json);
});
Deno.test("en_csv", () => {
  for (
    const [json, csv] of [
      [null, ""],
      ["", ""],
      ["\r", "\r"],
      ["\r\n", '"\r\n"'],
      ["\n", '"\n"'],
      ['"', '""""'],
      [",", '","'],
      ["ok", "ok"],
    ] satisfies [any, any][]
  ) assertEquals(en_csv([[json]], ($) => $ === null), csv + "\n");
});
