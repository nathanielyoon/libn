import fc from "fast-check";
import { fc_check, fc_str } from "../test.ts";
import { myers } from "./mod.ts";

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
Deno.test("myers matches levenshtein", () =>
  fc_check(
    fc.property(fc_str(), fc_str(), (one, two) =>
      myers(one, two) === levenshtein(one, two)),
  ));
