import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { de_b16 } from "@libn/base";
import { fc_bin, fc_check, fc_key } from "../test.ts";
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
Deno.test("sign/verify match rfc8032 section 7.1", () =>
  vectors.rfc8032.forEach(($) => {
    const secret_key = de_b16($.secret_key), public_key = de_b16($.public_key);
    assertEquals(generate(secret_key), public_key);
    const data = de_b16($.data), signature = sign(secret_key, data);
    assertEquals(signature, de_b16($.signature));
    assert(verify(public_key, data, signature));
  }));
Deno.test("x25519 matches wycheproof", () =>
  vectors.wycheproof_x25519.forEach(($) =>
    assertEquals(
      x25519(de_b16($.secret_key), de_b16($.public_key)),
      $.shared_secret && de_b16($.shared_secret),
    )
  ));
Deno.test("verify matches wycheproof", () =>
  vectors.wycheproof_ed25519.forEach(($) =>
    assertEquals(
      verify(de_b16($.public_key), de_b16($.data), de_b16($.signature)),
      $.result,
    )
  ));
Deno.test("verify rejects bad points", () => {
  const big = de_b16((1n | 1n << 255n).toString(16)).reverse();
  const empty = new Uint8Array(32);
  assert(!verify(empty, empty, empty));
  assert(!verify(big, empty, new Uint8Array(64)));
  assert(!verify(empty, empty, new Uint8Array(64).fill(-1, 32)));
  assert(!verify(empty, empty, new Uint8Array([...big, ...empty])));
});
Deno.test("verify validates correctly-generated signatures", () =>
  fc_check(
    fc.property(fc_key, fc_bin(), (key, data) =>
      assert(verify(generate(key), data, sign(key, data)))),
  ));
Deno.test("x25519 works on montgomery or converted edwards keys", () =>
  fc_check(fc.property(fc_key, fc_key, (key_1, key_2) => {
    assertEquals(x25519(key_1, x25519(key_2)), x25519(key_2, x25519(key_1)));
    assertEquals(
      x25519(convert_secret(key_1), convert_public(generate(key_2))),
      x25519(convert_secret(key_2), convert_public(generate(key_1))),
    );
  })));
const generate_pair = (algorithm: `${"Ed" | "X"}25519`, use: KeyUsage[]) =>
  crypto.subtle.generateKey(algorithm, true, use) as Promise<CryptoKeyPair>;
const export_pair = ($: CryptoKeyPair) =>
  Promise.all([
    crypto.subtle.exportKey("pkcs8", $.privateKey),
    crypto.subtle.exportKey("raw", $.publicKey),
  ]).then(($) => ({
    secret_key: new Uint8Array($[0].slice(16)),
    public_key: new Uint8Array($[1]),
  }));
Deno.test("x25519 matches webcrypto", () =>
  Promise.all(
    Array.from({ length: 2 }, () => generate_pair("X25519", ["deriveBits"])),
  ).then(([pair_1, pair_2]) =>
    Promise.all([
      export_pair(pair_1),
      export_pair(pair_2),
      crypto.subtle.deriveBits(
        { name: "X25519", public: pair_2.publicKey },
        pair_1.privateKey,
        256,
      ).then(($) => new Uint8Array($)),
      crypto.subtle.deriveBits(
        { name: "X25519", public: pair_1.publicKey },
        pair_2.privateKey,
        256,
      ).then(($) => new Uint8Array($)),
    ])
  ).then(([pair_1, pair_2, secret_1, secret_2]) => {
    assertEquals(x25519(pair_1.secret_key), pair_1.public_key);
    assertEquals(x25519(pair_2.secret_key), pair_2.public_key);
    assertEquals({
      secret_1: x25519(pair_1.secret_key, pair_2.public_key),
      secret_2: x25519(pair_2.secret_key, pair_1.public_key),
    }, { secret_1, secret_2 });
  }));
Deno.test("generate matches webcrypto", () =>
  generate_pair("Ed25519", ["sign", "verify"])
    .then(export_pair)
    .then(($) => assertEquals(generate($.secret_key), $.public_key)));
Deno.test("sign/verify match webcrypto", () =>
  fc_check(fc.asyncProperty(fc_bin(), async ($) => {
    const pair = await generate_pair("Ed25519", ["sign", "verify"]);
    const { secret_key, public_key } = await export_pair(pair);
    const signature = sign(secret_key, $);
    assertEquals(
      signature,
      new Uint8Array(await crypto.subtle.sign("Ed25519", pair.privateKey, $)),
    );
    assert(verify(public_key, $, signature));
    assert(await crypto.subtle.verify("Ed25519", pair.publicKey, signature, $));
  })));
