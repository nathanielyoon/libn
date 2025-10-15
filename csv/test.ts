import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { deCsv } from "@libn/csv/parse";
import { enCsv } from "@libn/csv/stringify";
import vectors from "./vectors.json" with { type: "json" };

const parse = (csv: string) => {
  const rows: string[][] = [];
  for (let quoted = false, z = 0, y = 0, x = 0; z < csv.length; ++z) {
    (rows[y] ??= [])[x] ??= "";
    const char = csv[z];
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
Deno.test("parse", async (t) => {
  await t.step("deCsv() passes reference vectors", () => {
    for (const $ of vectors.deCsv) {
      assertEquals(deCsv($.csv, { empty: { value: "" } }), $.json);
    }
  });
  await t.step("deCsv() strips byte-order marker", () => {
    assertEquals(deCsv("\ufeff"), []);
    assertEquals(deCsv("\ufeffa"), [["a"]]);
  });
  await t.step("deCsv() rejects unclosed quoted fields", () => {
    assertEquals(deCsv('"'), null);
    assertEquals(deCsv('"a'), null);
    assertEquals(deCsv('a\n"'), null);
  });
  await t.step("deCsv() rejects quotes inside unquoted fields", () => {
    assertEquals(deCsv('a"'), null);
  });
  await t.step("deCsv() rejects quotes after quoted fields", () => {
    assertEquals(deCsv('""a"'), null);
    assertEquals(deCsv('"a"\n"a""'), null);
  });
  await t.step("deCsv() distinguishes quoted and unquoted empty fields", () => {
    assertEquals(deCsv('""'), [[""]]);
    assertEquals(deCsv(",a"), [[null, "a"]]);
  });
  await t.step("deCsv() strips trailing newlines", () => {
    assertEquals(deCsv("a\r\n"), [["a"]]);
  });
  await t.step("deCsv() parses leading newlines", () => {
    assertEquals(deCsv("\r\na"), [[null], ["a"]]);
  });
  await t.step("deCsv() eagerly parses same-length rows", () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 64 }).chain(($) =>
        fcRows(null, { minLength: $, maxLength: $ })
      ),
      ($) => {
        const csv = enCsv($);
        assertEquals(deCsv(csv), $);
        assertEquals(deCsv(csv, { empty: { value: "" } }), parse(csv));
      },
    ));
  });
  await t.step("deCsv() parses different-length rows if not eager", () => {
    fc.assert(fc.property(fcRows(null), ($) => {
      const csv = enCsv($);
      assertEquals(deCsv(csv, { eager: false }), $);
      assertEquals(
        deCsv(csv, { eager: false, empty: { value: "" } }),
        parse(csv),
      );
    }));
  });
});
Deno.test("stringify", async (t) => {
  await t.step("enCsv() appends newline", () => {
    assertEquals(enCsv([["ok"]]), "ok\n");
  });
  await t.step("enCsv() distinguishes quoted and unquoted empty fields", () => {
    assertEquals(enCsv([[null]]), "\n");
    assertEquals(enCsv([[""]]), '""\n');
  });
  await t.step("enCsv() quotes special characters", () => {
    assertEquals(enCsv([["\n"]]), '"\n"\n');
    assertEquals(enCsv([['"']]), '""""\n');
    assertEquals(enCsv([[","]]), '","\n');
  });
  await t.step("enCsv() recognizes different newlines as special", () => {
    assertEquals(enCsv([["\n"]]), '"\n"\n');
    assertEquals(enCsv([["\r"]]), '"\r"\n');
    assertEquals(enCsv([["\r\n"]]), '"\r\n"\n');
  });
  await t.step("enCsv() takes custom empty predicate", () => {
    fc.assert(fc.property(
      fc.string().chain(($) =>
        fc.record({ nil: fc.constant($), rows: fcRows($) })
      ),
      ({ nil, rows }) => {
        assert(
          deCsv(
            enCsv(rows, {
              empty: { value: nil, check: ($): $ is typeof nil => $ === nil },
            }),
            { eager: false },
          )?.flat().every(($) => $ !== nil),
        );
      },
    ));
  });
});
import.meta.main && await Promise.all([
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
    Promise.all([
      fetch(
        `https://raw.githubusercontent.com/sineemore/csv-test-data/e4c25ebd65902671bc53eedc67275c2328067dbe/csv/${name}.csv`,
      ).then(($) => $.text()),
      fetch(
        `https://raw.githubusercontent.com/sineemore/csv-test-data/e4c25ebd65902671bc53eedc67275c2328067dbe/json/${name}.json`,
      ).then(($) => $.json()),
    ])
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
    ...csvTestData.map(([csv, json]) => ({ csv, json })),
  ],
})).then(($) =>
  Deno.writeTextFile(
    new URL(import.meta.resolve("./vectors.json")).pathname,
    JSON.stringify($),
  )
);
