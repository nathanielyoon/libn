import { assertEquals } from "jsr:@std/assert@^1.0.13";
import { get_text, write } from "../../test.ts";
import { de_csv } from "../csv.ts";

Deno.test("rfc4180", () =>
  import("./vectors/rfc.json", { with: { type: "json" } }).then(($) =>
    $.default.forEach(({ csv, json }) => assertEquals(de_csv(csv), json))
  ));
import.meta.main && await get_text(4180, 2630, 4734).then(($) => {
  const a = /For example:\s+(.+?)\n\n/gs;
  return [
    [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]],
    [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]],
    [
      ["field_name", "field_name", "field_name"],
      ["aaa", "bbb", "ccc"],
      ["zzz", "yyy", "xxx"],
    ],
    [["aaa", "bbb", "ccc"]],
    [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]],
    [["aaa", "b\r\nbb", "ccc"], ["zzz", "yyy", "xxx"]],
    [["aaa", 'b"bb', "ccc"]],
  ].map((json) => ({ csv: a.exec($)?.[1].replace(/ CRLF\s*/g, "\r\n"), json }));
}).then(write(import.meta));
