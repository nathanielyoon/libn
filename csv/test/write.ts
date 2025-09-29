import { save } from "@libn/lib";

await Promise.all([
  fetch("https://www.rfc-editor.org/rfc/rfc4180.txt").then(async ($) =>
    (await $.text()).slice(2630, 4734)
  ),
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
      )
    )).then(async ($) => ({ csv: await $[0].text(), json: await $[1].json() }))
  ),
]).then(([rfc4180, ...csv_test_data]) => ({
  rfc4180: [
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
  csv_test_data,
})).then(save(import.meta));
