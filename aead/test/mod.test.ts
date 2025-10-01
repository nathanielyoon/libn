import { assert, assertEquals } from "@std/assert";
import { fc_assert, fc_bin, pure, read } from "@libn/lib";
import { cipher, decrypt, encrypt } from "../mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("cipher : xchacha-03 A.3.2.1", () =>
  read(vectors.mod["xchacha-03 A.3.2.1"]).forEach(($) => {
    const text = new Uint8Array($.plaintext.length);
    cipher($.key, $.iv, text);
    assertEquals(text, $.keystream);
    text.set($.plaintext);
    cipher($.key, $.iv, text);
    assertEquals(text, $.ciphertext);
  }));
Deno.test("encrypt/decrypt : arbitrary round-trip", () =>
  fc_assert(fc_bin(32), fc_bin(), fc_bin())((key, plaintext, data) => {
    const text_1 = encrypt(key, plaintext, data);
    assert(text_1);
    assertEquals(decrypt(key, text_1, data)!, plaintext);
    const text_2 = encrypt(key, plaintext);
    assert(text_2);
    assertEquals(decrypt(key, text_2), plaintext);
  }));
Deno.test("encrypt/decrypt : wrong-size arguments", () =>
  fc_assert(fc_bin(-32), fc_bin(), fc_bin())((key, $, data) => {
    assertEquals(encrypt(key, $, data), null);
    assertEquals(decrypt(key, $, data), null);
  }));
Deno.test("bundle : pure", pure);
