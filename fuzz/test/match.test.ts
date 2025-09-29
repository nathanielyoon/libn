import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_str } from "@libn/lib";
import { Matcher } from "../src/match.ts";

const fc_width = fc.integer({ min: 2, max: 6 });
Deno.test("Matcher : self-match", () =>
  fc_assert(fc_width, fc.array(fc_str()))((width, terms) => {
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
  }));
Deno.test("Matcher : ignore repeats", () =>
  fc_assert(fc_width, fc_str())((width, term) => {
    const matcher = new Matcher(width, [term]);
    assertEquals(matcher.terms, matcher.add(term).terms);
  }));
