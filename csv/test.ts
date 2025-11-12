import { deCsv } from "@libn/csv/parse";
import { enCsv } from "@libn/csv/stringify";
import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import vectors from "./vectors.json" with { type: "json" };
import { fcStr } from "../test.ts";

Deno.test("parse.deCsv : vectors", () => {
  for (const $ of vectors) assertEquals(deCsv($.csv, { empty: "" }), $.json);
});
Deno.test("parse.deCsv : byte-order marker", () => {
  assertEquals(deCsv("\ufeff"), []);
  assertEquals(deCsv("\ufeffa"), [["a"]]);
});
Deno.test("parse.deCsv : unclosed quoted fields", () => {
  assertEquals(deCsv('"'), null);
  assertEquals(deCsv('"a'), null);
  assertEquals(deCsv('a\n"'), null);
});
Deno.test("parse.deCsv : quote inside unquoted fields", () => {
  assertEquals(deCsv('a"'), null);
});
Deno.test("parse.deCsv : quote after quoted fields", () => {
  assertEquals(deCsv('""a"'), null);
  assertEquals(deCsv('"a"\n"a""'), null);
});
Deno.test("parse.deCsv : quoted and unquoted empty fields", () => {
  assertEquals(deCsv('""'), [[""]]);
  assertEquals(deCsv(",a"), [[null, "a"]]);
});
Deno.test("parse.deCsv : trailing newlines", () => {
  assertEquals(deCsv("a\r\n"), [["a"]]);
});
Deno.test("parse.deCsv : leading newlines", () => {
  assertEquals(deCsv("\r\na"), [[null], ["a"]]);
});
const fcRows = <A>($: A, row?: fc.ArrayConstraints) =>
  fc.array(
    fc.array(
      fc.oneof(
        { weight: 15, arbitrary: fcStr({ size: "small" }) },
        { weight: 1, arbitrary: fc.constant($) },
      ),
      { minLength: 1, maxLength: 64, ...row },
    ),
    { minLength: 1 },
  );
const parse = (csv: string) => {
  const rows: string[][] = [];
  for (let quoted = false, char, z = 0, y = 0, x = 0; z < csv.length; ++z) {
    (rows[y] ??= [])[x] ??= "", char = csv[z];
    if (char === '"') {
      if (quoted && csv[z + 1] === '"') rows[y][x] += char, ++z;
      else quoted = !quoted;
    } else if (char === "," && !quoted) ++x;
    else if (char === "\r" && csv[z + 1] === "\n" && !quoted) ++z, ++y, x = 0;
    else if ((char === "\n" || char === "\r") && !quoted) ++y, x = 0;
    else rows[y][x] += char;
  }
  return rows;
};
Deno.test("parse.deCsv : same-length rows", () => {
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 64 }).chain(($) =>
      fcRows(null, { minLength: $, maxLength: $ })
    ),
    ($) => {
      const csv = enCsv($);
      assertEquals(deCsv(csv), $);
      assertEquals(deCsv(csv, { empty: "" }), parse(csv));
    },
  ));
});
Deno.test("parse.deCsv : different-length rows", () => {
  fc.assert(fc.property(fcRows(null), ($) => {
    const csv = enCsv($);
    assertEquals(deCsv(csv, { eager: false }), $);
    assertEquals(deCsv(csv, { eager: false, empty: "" }), parse(csv));
  }));
});

Deno.test("stringify.enCsv : quoted and unquoted empty fields", () => {
  assertEquals(enCsv([[null]]), "\n");
  assertEquals(enCsv([[""]]), '""\n');
});
Deno.test("stringify.enCsv : special characters", () => {
  assertEquals(enCsv([["\n"]]), '"\n"\n');
  assertEquals(enCsv([['"']]), '""""\n');
  assertEquals(enCsv([[","]]), '","\n');
});
Deno.test("stringify.enCsv : different newlines", () => {
  assertEquals(enCsv([["\n"]]), '"\n"\n');
  assertEquals(enCsv([["\r"]]), '"\r"\n');
  assertEquals(enCsv([["\r\n"]]), '"\r\n"\n');
});
Deno.test("stringify.enCsv : custom empty predicate", () => {
  fc.assert(fc.property(
    fcStr().chain(($) => fc.record({ nil: fc.constant($), rows: fcRows($) })),
    ({ nil, rows }) => {
      assert(
        deCsv(
          enCsv(rows, ($): $ is typeof nil => $ === nil),
          { eager: false },
        )?.flat().every(($) => $ !== nil),
      );
    },
  ));
});
