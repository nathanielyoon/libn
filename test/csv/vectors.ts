import { get, set } from "../test.ts";

import.meta.main && await Promise.all([
  get`www.rfc-editor.org/rfc/rfc4180.txt${2630}${4734}`,
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
  ].flatMap((name) =>
    ["csv", "json"].map((type) =>
      get([
        `/sineemore/csv-test-data/e4c25ebd65902671bc53eedc67275c2328067dbe/${type}/${name}.${type}`,
      ])
    )
  ),
]).then(([rfc4180, ...csvTestData]) =>
  set(import.meta.resolve("./vectors.json"), [
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
    ...csvTestData.flatMap(($, z) =>
      z & 1 ? [] : [{ csv: $, json: JSON.parse(csvTestData[z + 1]) }]
    ),
  ], "dquZkhz2P/XemFkeXVET7HPQqbXE7Vq87cIlVQRVhig=")
);
