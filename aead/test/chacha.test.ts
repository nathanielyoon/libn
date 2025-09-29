import { assertEquals } from "@std/assert";
import { read } from "@libn/lib";
import { chacha, xor } from "../src/chacha.ts";
import vectors from "./vectors.json" with { type: "json" };

const iv = ($: Uint8Array) =>
  [...new Uint32Array($.buffer)] as [number, number, number];
Deno.test("chacha : rfc8439 2.3.2/rfc 8439 A.1", () =>
  read(vectors.chacha["rfc8439 2.3.2/rfc8439 A.1"]).forEach(($) => {
    const state = new Uint32Array(16);
    chacha(new Uint32Array($.key.buffer), $.count, ...iv($.iv), state);
    assertEquals(new Uint8Array(state.buffer), $.state);
  }));
Deno.test("xor : rfc8439 2.4.2/rfc8439 A.2", () =>
  read(vectors.chacha["rfc8439 2.4.2/rfc8439 A.2"]).forEach(($) => {
    xor(new Uint32Array($.key.buffer), ...iv($.iv), $.plaintext, $.count);
    assertEquals($.plaintext, $.ciphertext);
  }));
Deno.test("chacha : rfc8439 2.6.2/rfc8439 A.4", () =>
  read(vectors.chacha["rfc8439 2.6.2/rfc8439 A.4"]).forEach(($) => {
    const state = new Uint32Array(16);
    chacha(new Uint32Array($.key.buffer), 0, ...iv($.iv), state);
    assertEquals(new Uint8Array(state.buffer).subarray(0, 32), $.subkey);
  }));
