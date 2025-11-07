import { distance, includes } from "@libn/fuzzy";
import {
  assert,
  assertEquals,
  assertGreaterOrEqual,
  assertLessOrEqual,
} from "@std/assert";
import fc from "fast-check";

Deno.test("match.includes() follows built-in includes", () =>
  fc.assert(fc.property(
    fc.string({ size: "medium", unit: "grapheme" }),
    fc.string({ size: "medium", unit: "grapheme" }),
    (one, two) => {
      if (one.includes(two)) assert(includes(one, two));
      if (two.includes(one)) assert(includes(two, one));
    },
  )));
Deno.test("match.includes() returns true for any partial substring", () =>
  fc.assert(fc.property(
    fc.string().chain(($) =>
      fc.record({
        source: fc.constant($),
        target: fc.subarray($.split("")).map(($) => $.join("")),
      })
    ),
    ({ source, target }) => {
      assert(includes(source, target));
    },
  )));
Deno.test("match.includes() returns false for longer targets", () =>
  fc.assert(fc.property(
    fc.string({ unit: "grapheme" }).chain(($) =>
      fc.record({
        shorter: fc.constant($),
        longer: fc.string({
          unit: "grapheme",
          minLength: [...$].length + 1,
        }),
      })
    ),
    ({ shorter, longer }) => {
      assert(!includes(shorter, longer));
    },
  )));
Deno.test("match.includes() checks equality for same-length strings", () =>
  fc.assert(fc.property(
    fc.string({ unit: "grapheme" }).chain(($) =>
      fc.record({
        one: fc.constant($),
        two: fc.string({
          unit: "grapheme",
          minLength: $.length,
          maxLength: $.length,
        }),
      })
    ),
    ({ one, two }) => {
      assertEquals(includes(one, two), one === two);
      assertEquals(includes(two, one), one === two);
    },
  )));
const levenshtein = (one: string, two: string) => {
  const c = [...Array(two.length).keys(), two.length];
  for (let d, e, z = 1, y; z <= one.length; c[two.length] = d, ++z) {
    for (d = z, y = 1; y <= two.length; c[y - 1] = d, d = e, ++y) {
      if (one[z - 1] === two[y - 1]) e = c[y - 1];
      else e = Math.min(c[y - 1] + 1, d + 1, c[y] + 1);
    }
  }
  return c[two.length];
};
Deno.test("match.distance() follows levenshtein", () =>
  fc.assert(fc.property(
    fc.string({ size: "medium", unit: "grapheme", minLength: 1 }),
    fc.string({ size: "medium", unit: "grapheme", minLength: 1 }),
    (one, two) => {
      assertEquals(distance(one, two), levenshtein(one, two));
    },
  )));
Deno.test("match.distance() falls inside levenshtein bounds", () =>
  fc.assert(fc.property(
    fc.string({ size: "medium", unit: "grapheme" }),
    fc.string({ size: "medium", unit: "grapheme" }),
    (one, two) => {
      assertLessOrEqual(distance(one, two), Math.max(one.length, two.length));
      assertGreaterOrEqual(
        distance(one, two),
        Math.abs(one.length - two.length),
      );
    },
  )));
