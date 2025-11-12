import { distance, includes } from "@libn/fuzzy";
import {
  assert,
  assertEquals,
  assertGreaterOrEqual,
  assertLessOrEqual,
} from "@std/assert";
import fc from "fast-check";
import { fcStr } from "../test.ts";

Deno.test("includes :: includes", () => {
  fc.assert(fc.property(fcStr(), fcStr(), (one, two) => {
    if (one.includes(two)) assert(includes(one, two));
    if (two.includes(one)) assert(includes(two, one));
  }));
});
Deno.test("includes : partial substring", () => {
  fc.assert(fc.property(
    fcStr().chain(($) =>
      fc.record({
        source: fc.constant($),
        target: fc.subarray($.split("")).map(($) => $.join("")),
      })
    ),
    ({ source, target }) => {
      assert(includes(source, target));
    },
  ));
});
Deno.test("includes : longer target", () => {
  fc.assert(fc.property(
    fcStr().chain(($) =>
      fc.record({
        shorter: fc.constant($),
        longer: fcStr({ minLength: [...$].length + 1 }),
      })
    ),
    ({ shorter, longer }) => {
      assert(!includes(shorter, longer));
    },
  ));
});
Deno.test("includes : same-length strings", () => {
  fc.assert(fc.property(
    fcStr().chain(($) =>
      fc.record({
        one: fc.constant($),
        two: fcStr({ minLength: $.length, maxLength: $.length }),
      })
    ),
    ({ one, two }) => {
      assertEquals(includes(one, two), one === two);
      assertEquals(includes(two, one), one === two);
    },
  ));
});
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
Deno.test("distance :: levenshtein", () => {
  fc.assert(fc.property(
    fcStr({ minLength: 1 }),
    fcStr({ minLength: 1 }),
    (one, two) => {
      assertEquals(distance(one, two), levenshtein(one, two));
    },
  ));
});
Deno.test("distance : levenshtein bounds", () => {
  fc.assert(fc.property(fcStr(), fcStr(), (one, two) => {
    assertLessOrEqual(distance(one, two), Math.max(one.length, two.length));
    assertGreaterOrEqual(
      distance(one, two),
      Math.abs(one.length - two.length),
    );
  }));
});
