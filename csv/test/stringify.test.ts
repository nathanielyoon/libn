import { assertEquals } from "@std/assert";
import { en_csv } from "../src/stringify.ts";

Deno.test("en_csv : edge cases", () =>
  ([
    [null, "\n"],
    ["", '""\n'],
    ["\r", '"\r"\n'],
    ["\r\n", '"\r\n"\n'],
    ["\n", '"\n"\n'],
    ['"', '""""\n'],
    [",", '","\n'],
    ["ok", "ok\n"],
  ] satisfies [any, any][]).forEach(($) =>
    assertEquals(
      $[0] === null ? en_csv([[$[0]]]) : en_csv<number>([[$[0]]], {
        empty: { check: ($) => typeof $ === "number" },
      }),
      $[1],
    )
  ));
