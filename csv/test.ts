import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect/expect";
import fc from "fast-check";
import { decodeCsv } from "@libn/csv/parse";
import { encodeCsv } from "@libn/csv/stringify";

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
Deno.test("spec", async () => {
  const vectors = await import("./vectors.json", { with: { type: "json" } });
  for (const $ of vectors.default.parse) {
    expect(decodeCsv($.csv, { empty: { value: "" } })).toStrictEqual($.json);
  }
});
describe("parse", () => {
  it("decodeCsv() strips byte-order marker", () => {
    expect(decodeCsv("\ufeff")).toStrictEqual([]);
    expect(decodeCsv("\ufeffa")).toStrictEqual([["a"]]);
  });
  it("decodeCsv() rejects unclosed quoted fields", () => {
    expect(decodeCsv('"')).toBeNull();
    expect(decodeCsv('"a')).toBeNull();
    expect(decodeCsv('a\n"')).toBeNull();
  });
  it("decodeCsv() rejects quotes inside unqouted fields", () => {
    expect(decodeCsv('a"')).toBeNull();
  });
  it("decodeCsv() rejects quotes after quoted fields", () => {
    expect(decodeCsv('""a"')).toBeNull();
    expect(decodeCsv('"a"\n"a""')).toBeNull();
  });
  it("decodeCsv() differentiates quoted and unquoted empty fields", () => {
    expect(decodeCsv('""')).toStrictEqual([[""]]);
    expect(decodeCsv(",a")).toStrictEqual([[null, "a"]]);
  });
  it("decodeCsv() strips trailing newlines", () => {
    expect(decodeCsv("a\r\n")).toStrictEqual([["a"]]);
  });
  it("decodeCsv() parses leading newlines", () => {
    expect(decodeCsv("\r\na")).toStrictEqual([[null], ["a"]]);
  });
  it("decodeCsv() eagerly parses same-length rows", () =>
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 64 }).chain(($) =>
        fcRows(fc.constant(null), { minLength: $, maxLength: $ })
      ),
      ($) => {
        const csv = encodeCsv($);
        expect(decodeCsv(csv)).toStrictEqual($);
        expect(decodeCsv(csv, { empty: { value: "" } })).toStrictEqual(
          parse(csv),
        );
      },
    )));
  it("decodeCsv() parses different-length rows if not eager", () =>
    fc.assert(fc.property(fcRows(fc.constant(null)), ($) => {
      const csv = encodeCsv($);
      expect(decodeCsv(csv, { eager: false })).toStrictEqual($);
      expect(decodeCsv(csv, { eager: false, empty: { value: "" } }))
        .toStrictEqual(parse(csv));
    })));
});
describe("stringify", () => {
  it("encodeCsv() appends newline", () => {
    expect(encodeCsv([["ok"]])).toBe("ok\n");
  });
  it("encodeCsv() differentiates quoted and unquoted empty fields", () => {
    expect(encodeCsv([[null]])).toBe("\n");
    expect(encodeCsv([[""]])).toBe('""\n');
  });
  it("encodeCsv() quotes special characters", () => {
    expect(encodeCsv([["\n"]])).toBe('"\n"\n');
    expect(encodeCsv([['"']])).toBe('""""\n');
    expect(encodeCsv([[","]])).toBe('","\n');
  });
  it("encodeCsv() recognizes different newlines as special", () => {
    expect(encodeCsv([["\n"]])).toBe('"\n"\n');
    expect(encodeCsv([["\r"]])).toBe('"\r"\n');
    expect(encodeCsv([["\r\n"]])).toBe('"\r\n"\n');
  });
  it("encodeCsv() takes custom empty predicate", () =>
    fc.assert(fc.property(
      fc.string().chain(($) =>
        fc.record({ nil: fc.constant($), rows: fcRows(fc.constant($)) })
      ),
      ({ nil, rows }) => {
        expect(
          decodeCsv(
            encodeCsv(rows, {
              empty: { value: nil, check: ($): $ is typeof nil => $ === nil },
            }),
            { eager: false },
          )?.flat().every(($) => $ !== nil),
        ).toBe(true);
      },
    )));
});
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
]).then(([rfc4180, earthquakes, ...csvTestData]) => {
  return {
    parse: [
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
  };
}).then(($) =>
  Deno.writeTextFile(
    new URL(import.meta.resolve("./vectors.json")).pathname,
    JSON.stringify($),
  )
);
