import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { deCsv } from "@libn/csv/parse";
import { enCsv } from "@libn/csv/stringify";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("parse.deCsv() passes reference vectors", () =>
  vectors.deCsv.forEach(($) => {
    assertEquals(deCsv($.csv, { empty: "" }), $.json);
  }));
Deno.test("parse.deCsv() strips byte-order marker", () => {
  assertEquals(deCsv("\ufeff"), []);
  assertEquals(deCsv("\ufeffa"), [["a"]]);
});
Deno.test("parse.deCsv() rejects unclosed quoted fields", () => {
  assertEquals(deCsv('"'), null);
  assertEquals(deCsv('"a'), null);
  assertEquals(deCsv('a\n"'), null);
});
Deno.test("parse.deCsv() rejects quotes inside unquoted fields", () => {
  assertEquals(deCsv('a"'), null);
});
Deno.test("parse.deCsv() rejects quotes after quoted fields", () => {
  assertEquals(deCsv('""a"'), null);
  assertEquals(deCsv('"a"\n"a""'), null);
});
Deno.test("parse.deCsv() detects quoted and unquoted empty fields", () => {
  assertEquals(deCsv('""'), [[""]]);
  assertEquals(deCsv(",a"), [[null, "a"]]);
});
Deno.test("parse.deCsv() strips trailing newlines", () => {
  assertEquals(deCsv("a\r\n"), [["a"]]);
});
Deno.test("parse.deCsv() parses leading newlines", () => {
  assertEquals(deCsv("\r\na"), [[null], ["a"]]);
});
const fcRows = <A>($: A, row?: fc.ArrayConstraints) =>
  fc.array(
    fc.array(
      fc.oneof(
        { weight: 15, arbitrary: fc.string() },
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
Deno.test("parse.deCsv() eagerly parses same-length rows", () =>
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 64 }).chain(($) =>
      fcRows(null, { minLength: $, maxLength: $ })
    ),
    ($) => {
      const csv = enCsv($);
      assertEquals(deCsv(csv), $);
      assertEquals(deCsv(csv, { empty: "" }), parse(csv));
    },
  )));
Deno.test("parse.deCsv() parses different-length rows if not eager", () =>
  fc.assert(fc.property(fcRows(null), ($) => {
    const csv = enCsv($);
    assertEquals(deCsv(csv, { eager: false }), $);
    assertEquals(deCsv(csv, { eager: false, empty: "" }), parse(csv));
  })));
Deno.test("stringify.enCsv() appends newline", () => {
  assertEquals(enCsv([["ok"]]), "ok\n");
});
Deno.test("stringify.enCsv() detects quoted and unquoted empty fields", () => {
  assertEquals(enCsv([[null]]), "\n");
  assertEquals(enCsv([[""]]), '""\n');
});
Deno.test("stringify.enCsv() quotes special characters", () => {
  assertEquals(enCsv([["\n"]]), '"\n"\n');
  assertEquals(enCsv([['"']]), '""""\n');
  assertEquals(enCsv([[","]]), '","\n');
});
Deno.test("stringify.enCsv() recognizes different newlines as special", () => {
  assertEquals(enCsv([["\n"]]), '"\n"\n');
  assertEquals(enCsv([["\r"]]), '"\r"\n');
  assertEquals(enCsv([["\r\n"]]), '"\r\n"\n');
});
Deno.test("stringify.enCsv() takes custom empty predicate", () =>
  fc.assert(fc.property(
    fc.string().chain(($) =>
      fc.record({ nil: fc.constant($), rows: fcRows($) })
    ),
    ({ nil, rows }) => {
      assert(
        deCsv(
          enCsv(rows, ($): $ is typeof nil => $ === nil),
          { eager: false },
        )?.flat().every(($) => $ !== nil),
      );
    },
  )));
import.meta.main && Promise.all([
  fetch(
    "https://www.rfc-editor.org/rfc/rfc4180.txt",
  ).then(($) => $.text()).then(($) => $.slice(2630, 4734)),
  fetch(
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.csv",
  ).then(($) => $.text()),
  ...[
    "all-empty",
    "empty-field",
    "empty-one-column",
    "leading-space",
    "one-column",
    "quotes-empty",
    "quotes-with-comma",
    "quotes-with-escaped-quote",
    "quotes-with-newline",
    "quotes-with-space",
    "simple-crlf",
    "simple-lf",
    "trailing-newline-one-field",
    "trailing-newline",
    "trailing-space",
    "utf8",
  ].map((name) =>
    Promise.all(["csv", "json"].map((type) =>
      fetch(
        `https://raw.githubusercontent.com/sineemore/csv-test-data/e4c25ebd65902671bc53eedc67275c2328067dbe/${type}/${name}.${type}`,
      ).then(($) => $.text())
    ))
  ),
]).then(([rfc4180, earthquakes, ...csvTestData]) => ({
  deCsv: [
    ...[
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
    ].reduce<[RegExp, { csv: string; json: string[][] }[]]>(
      ([regex, to], json) => [regex, [...to, {
        csv: regex.exec(rfc4180)![1].replace(/ CRLF\s*/g, "\r\n"),
        json,
      }]],
      [/For example:\s+(.+?)\n\n/gs, []],
    )[1],
    { csv: earthquakes, json: parse(earthquakes) },
    ...csvTestData.map(([csv, json]) => ({ csv, json: JSON.parse(json) })),
  ],
})).then(($) =>
  Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
);
