import { assertEquals } from "@std/assert";
import { read } from "@libn/lib";
import { poly } from "../src/poly.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("poly : rfc8439 2.5.2/rfc8439 A.3", () =>
  read(vectors.poly["rfc8439 2.5.2/rfc8439 A.3"]).forEach(($) =>
    assertEquals(poly(new Uint32Array($.key.buffer), $.message), $.tag)
  ));
Deno.test("poly : poly1305donna", () =>
  read(vectors.poly.donna).forEach(($) =>
    assertEquals(poly(new Uint32Array($.key.buffer), $.message), $.tag)
  ));
