import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import fc from "fast-check";
import { bundle, fc_check, fc_string } from "@libn/lib";
import { distance } from "./src/distance.ts";
import { includes } from "./src/includes.ts";
import { Matcher } from "./src/match.ts";

const levenshtein = (one: string, two: string) => {
  if (one.length > two.length) [one, two] = [two, one];
  const a = one.length, b = two.length;
  if (!a) return b;
  const c = Array<number>(a + 1);
  for (let z = 0; z <= a; ++z) c[z] = z;
  for (let d, e, z = 1, y; z <= b; c[a] = d, ++z) {
    for (d = z, y = 1; y <= a; c[y - 1] = d, d = e, ++y) {
      e = two[z - 1] === one[y - 1]
        ? c[y - 1]
        : Math.min(c[y - 1] + 1, d + 1, c[y] + 1);
    }
  }
  return c[a];
};
Deno.test("distance", async ({ step }) => {
  await step("distance :: levenshtein", () => {
    fc_check(
      fc.property(
        fc_string({ size: "large" }),
        fc_string({ size: "large" }),
        (one, two) => distance(one, two) === levenshtein(one, two),
      ),
      { examples: [["", ""]] },
    );
  });
});
Deno.test("includes", async ({ step }) => {
  await step("includes : substring", () => {
    fc_check(fc.property(
      fc_string().chain(($) =>
        fc.tuple(
          fc.constant($),
          fc.subarray($.split("")).map(($) => $.join("")),
        )
      ),
      ([source, target]) => includes(source, target),
    ));
  });
  await step("includes :: String.prototype.includes", () => {
    fc_check(fc.property(
      fc_string(),
      fc_string(),
      (source, target) => {
        if (source.includes(target)) assert(includes(source, target));
      },
    ));
  });
  await step("includes : shorter target", () => {
    fc_check(fc.property(
      fc_string({ minLength: 1 }).chain(($) =>
        fc.tuple(
          fc_string({ maxLength: $.length - 1 }),
          fc.constant($),
        )
      ),
      ([source, target]) => !includes(source, target),
    ));
  });
});
Deno.test("match", async ({ step }) => {
  await step("Matcher : self-match", () => {
    fc_check(fc.property(
      fc.integer({ min: 2, max: 6 }),
      fc.array(fc_string()),
      (width, terms) => {
        const matcher = new Matcher(width, []);
        for (const $ of terms) {
          const [match] = new Matcher(width, [$]).get($);
          assert(match);
          assertEquals(match.term, $);
          assertAlmostEquals(match.ratio, 1);
          matcher.add($);
        }
        for (const $ of terms) {
          const [match] = matcher.get($);
          assert(match);
          assertEquals(match.term, $);
          assertAlmostEquals(match.ratio, 1);
        }
      },
    ));
  });
  await step("Matcher : ignore repeats", () => {
    fc_check(fc.property(
      fc.integer({ min: 2, max: 6 }),
      fc_string(),
      (width, term) => {
        const matcher = new Matcher(width, [term]);
        assertEquals(matcher.terms, matcher.add(term).terms);
      },
    ));
  });
});
Deno.test("mod", async ({ step }) => {
  await step("bundle : pure", async () => {
    assertEquals(await bundle(import.meta), "");
  });
});
