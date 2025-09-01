import { assertAlmostEquals, assertEquals } from "@std/assert";
import { assign } from "./src/assign.ts";
import vectors from "./vectors.json" with { type: "json" };
import { Blossom } from "./src/blossom.ts";

Deno.test("assign matches munkres.py", () =>
  vectors.munkres.forEach(({ weights, total }) =>
    assertAlmostEquals(
      assign(weights).reduce((to, col, row) => to + weights[row][col], 0),
      total,
    )
  ));
Deno.test("blossom matches mwmatching.py", () =>
  vectors.mwmatching.forEach(({ edges, max, matching }) =>
    assertEquals(
      new Blossom(edges as [number, number, number][], max).mate,
      new Int32Array(matching),
    )
  ));
