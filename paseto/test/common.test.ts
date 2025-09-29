import { assertEquals } from "@std/assert";
import { read } from "@libn/lib";
import { en_bin } from "@libn/base";
import { pae } from "../src/common.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("pae : spec examples", () =>
  read(vectors.common.pae).forEach(($) =>
    assertEquals(pae(...$.pieces.map(en_bin)), $.output)
  ));
