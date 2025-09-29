import { fc_assert, fc_str } from "@libn/lib";
import { distance } from "../src/distance.ts";

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
Deno.test("distance :: levenshtein", () =>
  fc_assert(fc_str(), fc_str())(
    (one, two) => distance(one, two) === levenshtein(one, two),
    { examples: [["", ""]] },
  ));
