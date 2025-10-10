import { expect } from "@std/expect/expect";
import fc from "fast-check";
import { deCsv } from "@libn/csv/parse";
import { enCsv } from "@libn/csv/stringify";

Deno.test("vectors", async (t) => {
  const vectors = await import("./vectors.json", { with: { type: "json" } });
  await t.step("deCsv", () =>
    vectors.default.deCsv.forEach(($) => {
      expect(deCsv($.csv, { empty: { value: "" } })).toStrictEqual($.json);
    }));
});
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
const fcRows = <A extends {} | null>(
  empty: fc.Arbitrary<A>,
  row?: fc.ArrayConstraints,
) =>
  fc.array(
    fc.array(
      fc.oneof(
        { weight: 15, arbitrary: fc.string() },
        { weight: 1, arbitrary: empty },
      ),
      { minLength: 1, maxLength: 64, ...row },
    ),
    { minLength: 1 },
  );
Deno.test("deCsv() strips byte-order marker", () => {
  expect(deCsv("\ufeff")).toStrictEqual([]);
  expect(deCsv("\ufeffa")).toStrictEqual([["a"]]);
});
Deno.test("deCsv() rejects unclosed quoted fields", () => {
  expect(deCsv('"')).toBeNull();
  expect(deCsv('"a')).toBeNull();
  expect(deCsv('a\n"')).toBeNull();
});
Deno.test("deCsv() rejects quotes inside unqouted fields", () => {
  expect(deCsv('a"')).toBeNull();
});
Deno.test("deCsv() rejects quotes after quoted fields", () => {
  expect(deCsv('""a"')).toBeNull();
  expect(deCsv('"a"\n"a""')).toBeNull();
});
Deno.test("deCsv() differentiates quoted and unquoted empty fields", () => {
  expect(deCsv('""')).toStrictEqual([[""]]);
  expect(deCsv(",a")).toStrictEqual([[null, "a"]]);
});
Deno.test("deCsv() strips trailing newlines", () => {
  expect(deCsv("a\r\n")).toStrictEqual([["a"]]);
});
Deno.test("deCsv() parses leading newlines", () => {
  expect(deCsv("\r\na")).toStrictEqual([[null], ["a"]]);
});
Deno.test("deCsv() eagerly parses same-length rows", () =>
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 64 }).chain(($) =>
      fcRows(fc.constant(null), { minLength: $, maxLength: $ })
    ),
    ($) => {
      const csv = enCsv($);
      expect(deCsv(csv)).toStrictEqual($);
      expect(deCsv(csv, { empty: { value: "" } })).toStrictEqual(parse(csv));
    },
  )));
Deno.test("deCsv() parses different-length rows if not eager", () =>
  fc.assert(fc.property(fcRows(fc.constant(null)), ($) => {
    const csv = enCsv($);
    expect(deCsv(csv, { eager: false })).toStrictEqual($);
    expect(deCsv(csv, { eager: false, empty: { value: "" } })).toStrictEqual(
      parse(csv),
    );
  })));
Deno.test("enCsv() appends newline", () => {
  expect(enCsv([["ok"]])).toStrictEqual("ok\n");
});
Deno.test("enCsv() differentiates quoted and unquoted empty fields", () => {
  expect(enCsv([[null]])).toStrictEqual("\n");
  expect(enCsv([[""]])).toStrictEqual('""\n');
});
Deno.test("enCsv() quotes special characters", () => {
  expect(enCsv([["\n"]])).toStrictEqual('"\n"\n');
  expect(enCsv([['"']])).toStrictEqual('""""\n');
  expect(enCsv([[","]])).toStrictEqual('","\n');
});
Deno.test("enCsv() recognizes different newlines as special", () => {
  expect(enCsv([["\n"]])).toStrictEqual('"\n"\n');
  expect(enCsv([["\r"]])).toStrictEqual('"\r"\n');
  expect(enCsv([["\r\n"]])).toStrictEqual('"\r\n"\n');
});
Deno.test("enCsv() takes custom empty predicate", () =>
  fc.assert(fc.property(
    fc.string().chain(($) =>
      fc.record({ nil: fc.constant($), rows: fcRows(fc.constant($)) })
    ),
    ({ nil, rows }) => {
      expect(
        deCsv(
          enCsv(rows, {
            empty: { value: nil, check: ($): $ is typeof nil => $ === nil },
          }),
          { eager: false },
        )?.flat().every(($) => $ !== nil),
      ).toStrictEqual(true);
    },
  )));
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
