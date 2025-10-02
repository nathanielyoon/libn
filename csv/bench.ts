import { fc_bench, fc_str } from "@libn/lib";
import fc from "fast-check";
import { de_csv, en_csv } from "./mod.ts";
import { inferSchema, initParser } from "udsv";
import parse from "csv-simple-parser";
import Papa from "papaparse";

fc_bench(
  { group: "parse", runs: 8, assert: false },
  fc.tuple(
    fc.integer({ min: 4, max: 64 }).chain(($) =>
      fc.array(
        fc.array(
          fc.option(fc_str({
            unit: fc.oneof({
              weight: 1,
              arbitrary: fc.constantFrom("\n", ",", '"'),
            }, {
              weight: 8,
              arbitrary: fc_str({
                unit: "grapheme-ascii",
                minLength: 1,
                maxLength: 1,
              }),
            }),
          })),
          { minLength: $, maxLength: $ },
        ),
        { minLength: 2 },
      )
    ).map(($) => en_csv($).trim()),
  ),
  {
    libn: ($) => de_csv($, { empty: { value: "" } }),
    udsv: ($) => initParser(inferSchema($, { header: () => [] })).stringArrs($),
    simple: ($) => parse($),
    papa: ($) => Papa.parse($).data,
  },
);
