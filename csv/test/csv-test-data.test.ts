import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { write } from "../../test.ts";
import { de_csv } from "../csv.ts";

Deno.test("csv-test-data", () =>
  import("./vectors/csv-test-data.json", { with: { type: "json" } }).then(($) =>
    $.default.forEach(({ csv, json }) => assertEquals(de_csv(csv, ""), json))
  ));
import.meta.main && await Promise.all([
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
].map(($) =>
  Promise.all(["csv", "json"].map((type) =>
    fetch(
      `https://raw.githubusercontent.com/sineemore/csv-test-data/e4c25ebd65902671bc53eedc67275c2328067dbe/${type}/${$}.${type}`,
    ).then((response) => response.text())
  ))
)).then(($) => $.map(($) => ({ csv: $[0], json: JSON.parse($[1]) }))).then(
  write(import.meta),
);
