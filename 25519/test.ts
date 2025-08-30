import { de_b16 } from "@nyoon/base";
import fc from "fast-check";
import { assert, assertEquals } from "@std/assert";
import { fc_bin, fc_check, fc_key, hex } from "@nyoon/test";
import { generate, sign, verify } from "./src/ed25519.ts";
import { convert_public, convert_secret, x25519 } from "./src/x25519.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("x25519 matches rfc7748 sections 5.2, 6.1", () =>
  vectors.rfc7748.forEach(($) =>
    assertEquals(
      x25519(de_b16($.secret_key), de_b16($.public_key)),
      de_b16($.shared_secret),
    )
  ));
Deno.test("ed25519 matches rfc8032 section 7.1", () =>
  vectors.rfc8032.forEach(($) => {
    const secret_key = de_b16($.secret_key), public_key = de_b16($.public_key);
    assertEquals(generate(secret_key), public_key);
    const data = de_b16($.data), signature = sign(secret_key, data);
    assertEquals(signature, de_b16($.signature));
    assert(verify(public_key, data, signature));
  }));
Deno.test("x25519 passes wycheproof x25519", () =>
  vectors.wycheproof_x25519.forEach(($) =>
    assertEquals(
      x25519(de_b16($.secret_key), de_b16($.public_key)),
      $.shared_secret && de_b16($.shared_secret),
    )
  ));
Deno.test("ed25519 passes wycheproof ed25519", () =>
  vectors.wycheproof_ed25519.forEach(($) =>
    assertEquals(
      verify(de_b16($.public_key), de_b16($.data), de_b16($.signature)),
      $.result,
    )
  ));
Deno.test("verification rejects bad points", () => {
  const big = de_b16((1n | 1n << 255n).toString(16)).reverse();
  const empty = new Uint8Array(32);
  assert(!verify(empty, empty, empty));
  assert(!verify(big, empty, new Uint8Array(64)));
  assert(!verify(empty, empty, new Uint8Array(64).fill(-1, 32)));
  assert(!verify(empty, empty, new Uint8Array([...big, ...empty])));
});
Deno.test("valid signatures verify", () =>
  fc_check(
    fc.property(fc_key, fc_bin(), (key, data) =>
      assert(verify(generate(key), data, sign(key, data)))),
  ));
Deno.test("key exchange works on montgomery directly or when converted", () =>
  fc_check(fc.property(fc_key, fc_key, (key_1, key_2) => {
    assertEquals(x25519(key_1, x25519(key_2)), x25519(key_2, x25519(key_1)));
    assertEquals(
      x25519(convert_secret(key_1), convert_public(generate(key_2))),
      x25519(convert_secret(key_2), convert_public(generate(key_1))),
    );
  })));
