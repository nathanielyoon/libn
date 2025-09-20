import { assertAlmostEquals, assertEquals } from "@std/assert";
import { assign } from "./src/assign.ts";
import { Blossom } from "./src/blossom.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("assign", async ({ step }) => {
  await step("assign : munkres.py", () => {
    for (const $ of vectors.assign.munkres) {
      assertAlmostEquals(
        assign($.weights).reduce((to, col, row) => to + $.weights[row][col], 0),
        $.total,
      );
    }
  });
});
Deno.test("blossom", async ({ step }) => {
  await step("Blossom : mwmatching.py", () => {
    for (const $ of vectors.blossom.mwmatching) {
      assertEquals(
        new Blossom($.edges as [number, number, number][], $.max).mate,
        new Int32Array($.matching),
      );
    }
  });
});
