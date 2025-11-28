import { deCsv } from "@libn/csv/parse";
import { enCsv } from "@libn/csv/stringify";
import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import vectors from "./vectors.json" with { type: "json" };
import { fcStr } from "../test.ts";

Deno.test("parse.deCsv : vectors", () => {
  for (const $ of vectors) {
    assertEquals(deCsv($.csv, { empty: "" }), { error: null, value: $.json });
  }
});
Deno.test("parse.deCsv : byte-order marker", () => {
  assertEquals(deCsv("\ufeff"), { error: null, value: [] });
  assertEquals(deCsv("\ufeffa"), { error: null, value: [["a"]] });
});
Deno.test("parse.deCsv : unclosed quoted field", () => {
  assertEquals(deCsv('",'), { error: "UnclosedQuotedField", value: [0, 2] });
  assertEquals(deCsv('"a'), { error: "UnclosedQuotedField", value: [0, 2] });
  assertEquals(deCsv('a\n",'), { error: "UnclosedQuotedField", value: [2, 3] });
});
Deno.test("parse.deCsv : quote in unquoted field", () => {
  assertEquals(deCsv('a"'), { error: "QuoteInUnquotedField", value: [0, 2] });
  assertEquals(deCsv(',\na",'), { error: null, value: [[null, null], ['a"']] });
  assertEquals(
    deCsv(',\na",', { eager: false }),
    { error: "QuoteInUnquotedField", value: [2, 4] },
  );
  assertEquals(deCsv('\na"'), { error: "QuoteInUnquotedField", value: [1, 3] });
});
Deno.test("parse.deCsv : stuff after quoted fields", () => {
  assertEquals(
    deCsv('""a'),
    { error: "NonSeparatorAfterClosingQuote", value: [2, 3] },
  );
  assertEquals(
    deCsv('"a"\n""a'),
    { error: "NonSeparatorAfterClosingQuote", value: [6, 7] },
  );
  assertEquals(
    deCsv(',\n""a,\n'),
    { error: "NonSeparatorAfterClosingQuote", value: [4, 5] },
  );
});
Deno.test("parse.deCsv : quoted and unquoted empty fields", () => {
  assertEquals(deCsv('""'), { error: null, value: [[""]] });
  assertEquals(deCsv(",a"), { error: null, value: [[null, "a"]] });
});
Deno.test("parse.deCsv : trailing newlines", () => {
  assertEquals(deCsv("a\r\n"), { error: null, value: [["a"]] });
});
Deno.test("parse.deCsv : leading newlines", () => {
  assertEquals(deCsv("\r\na"), { error: null, value: [[null], ["a"]] });
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
      assertEquals(deCsv(csv), { error: null, value: $ });
      assertEquals(
        deCsv(csv, { empty: "" }),
        { error: null, value: parse(csv) },
      );
    },
  ));
});
Deno.test("parse.deCsv : different-length rows", () => {
  fc.assert(fc.property(fcRows(null), ($) => {
    const csv = enCsv($);
    assertEquals(deCsv(csv, { eager: false }), { error: null, value: $ });
    assertEquals(
      deCsv(csv, { eager: false, empty: "" }),
      { error: null, value: parse(csv) },
    );
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
      const result = deCsv(
        enCsv(rows, ($): $ is typeof nil => $ === nil),
        { eager: false },
      );
      assert(result.error === null);
      assert(result.value.flat().every(($) => $ !== nil));
    },
  ));
});
