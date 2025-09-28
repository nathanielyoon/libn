import { assertEquals } from "@std/assert";
import { read } from "@libn/lib";
import { poly } from "../src/poly.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("poly", async ({ step }) => {
  await step("poly : rfc8439 2.5.2/rfc8439 A.3", () => {
    for (const $ of read(vectors.poly["rfc8439 2.5.2/rfc8439 A.3"])) {
      assertEquals(poly(new Uint32Array($.key.buffer), $.message), $.tag);
    }
  });
  await step("poly : poly1305donna", () => {
    for (const $ of read(vectors.poly.donna)) {
      assertEquals(poly(new Uint32Array($.key.buffer), $.message), $.tag);
    }
  });
});
