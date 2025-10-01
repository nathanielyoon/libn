import fc from "fast-check";
import { fc_bench, fc_str } from "@libn/lib";
import { distance, includes, Matcher } from "./mod.ts";
import fastest from "fastest-levenshtein";
import leven from "leven";
import js from "js-levenshtein";
import fuzzysearch from "fuzzysearch";
import FuzzySet from "fuzzyset";

fc_bench(
  { group: "distance" },
  fc.tuple(
    fc_str({ unit: "grapheme-ascii" }),
    fc_str({ unit: "grapheme-ascii" }),
  ),
  {
    libn: distance,
    "fastest-levenshtein": fastest.distance,
    "js-levenshtein": js,
    leven: leven,
  },
);
fc_bench(
  { group: "includes" },
  fc_str({ unit: "grapheme-ascii" }).chain(($) =>
    fc.tuple(
      fc.constant($),
      fc.oneof(
        fc.subarray($.split("")).map(($) => $.join("")),
        fc_str({ unit: "grapheme-ascii" }),
      ),
    )
  ),
  {
    libn: includes,
    fuzzysearch: (source, target) => fuzzysearch(target, source),
  },
);
fc_bench(
  { group: "match", assert: false },
  fc.tuple(
    fc.array(fc_str({ unit: "grapheme-ascii" }), { minLength: 1e3 }),
    fc.array(fc_str({ unit: "grapheme-ascii" }), { maxLength: 1e2 }),
  ),
  {
    libn: (terms, queries) => {
      const matcher = new Matcher(2, terms);
      const out = Array(queries.length);
      for (let z = 0; z < queries.length; ++z) out[z] = matcher.get(queries[z]);
      return out;
    },
    fuzzyset: (terms, queries) => {
      const matcher = FuzzySet(terms, false, 2, 2);
      const out = Array(queries.length);
      for (let z = 0; z < queries.length; ++z) {
        out[z] = matcher.get(queries[z], [], 0);
      }
      return out;
    },
  },
);
