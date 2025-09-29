import { assertEquals } from "@std/assert";
import { crypto } from "@std/crypto";
import { de_b16 } from "@libn/base";
import { fc_assert, fc_bin, read } from "@libn/lib";
import { b3, b3_derive, b3_keyed } from "../src/blake3.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("b3/b3_keyed/b3_derive : reference", () => {
  const keyed = b3_keyed.bind(null, de_b16(vectors.blake3.reference.key));
  const derive = b3_derive(de_b16(vectors.blake3.reference.context));
  const length = vectors.blake3.reference.output_length;
  for (const $ of read(vectors.blake3.reference.cases)) {
    const input = Uint8Array.from({ length: $.input }, (_, z) => z % 251);
    assertEquals(b3(input, length), $.hash);
    assertEquals(keyed(input, length), $.keyed);
    assertEquals(derive(input, length), $.derive);
  }
});
Deno.test("b3 :: webcrypto", () =>
  fc_assert(fc_bin())(async ($) =>
    assertEquals(
      b3($),
      new Uint8Array(await crypto.subtle.digest("BLAKE3", $)),
    ), { async: true }));
Deno.test("b3 : clamp key to 256 bits", () =>
  fc_assert(fc_bin({ minLength: 32 }), fc_bin())((key, input) =>
    assertEquals(
      b3_keyed(key, input),
      b3_keyed(key.subarray(0, 32), input),
    )
  ));
