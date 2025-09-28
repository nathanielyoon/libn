import { assertEquals } from "@std/assert";
import { read } from "@libn/lib";
import { chacha, xor } from "../src/chacha.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("chacha", async ({ step }) => {
  const get = ($: Uint8Array) =>
    [...new Uint32Array($.buffer)] as [number, number, number];
  await step("chacha : rfc8439 2.3.2/rfc 8439 A.1", () => {
    for (const $ of read(vectors.chacha["rfc8439 2.3.2/rfc8439 A.1"])) {
      const state = new Uint32Array(16);
      chacha(new Uint32Array($.key.buffer), $.count, ...get($.iv), state);
      assertEquals(new Uint8Array(state.buffer), $.state);
    }
  });
  await step("xor : rfc8439 2.4.2/rfc8439 A.2", () => {
    for (const $ of read(vectors.chacha["rfc8439 2.4.2/rfc8439 A.2"])) {
      xor(new Uint32Array($.key.buffer), ...get($.iv), $.plaintext, $.count);
      assertEquals($.plaintext, $.ciphertext);
    }
  });
  await step("chacha : rfc8439 2.6.2/rfc8439 A.4", () => {
    for (const $ of read(vectors.chacha["rfc8439 2.6.2/rfc8439 A.4"])) {
      const state = new Uint32Array(16);
      chacha(new Uint32Array($.key.buffer), 0, ...get($.iv), state);
      assertEquals(new Uint8Array(state.buffer).subarray(0, 32), $.subkey);
    }
  });
});
