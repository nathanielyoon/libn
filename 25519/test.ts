import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_binary, fc_check, read } from "@libn/lib";
import { generate, sign, verify } from "./src/ed25519.ts";
import { convert_public, convert_secret, x25519 } from "./src/x25519.ts";
import vectors from "./vectors.json" with { type: "json" };

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
Deno.test("x25519", async ({ step }) => {
  await step("x25519 : rfc7748 5.2", () => {
    for (const $ of read(vectors.x25519["rfc7748 5.2"])) {
      assertEquals(x25519($.scalar, $.coordinate), $.output);
    }
  });
  await step("x25519 : rfc7748 6.1", () => {
    const [$] = read([vectors.x25519["rfc7748 6.1"]]);
    assertEquals(x25519($.secret_a), $.public_a);
    assertEquals(x25519($.secret_b), $.public_b);
    assertEquals(x25519($.secret_a, $.public_b), $.shared);
    assertEquals(x25519($.secret_b, $.public_a), $.shared);
  });
  await step("x25519 : wycheproof", () => {
    for (const $ of read(vectors.x25519.wycheproof)) {
      assertEquals(x25519($.secret_key, $.public_key), $.shared_secret);
    }
  });
  await step("x25519 : arbitrary exchange", () => {
    fc_check(fc.property(
      fc_binary(32),
      fc_binary(32),
      (key_1, key_2) =>
        assertEquals(
          x25519(key_1, x25519(key_2)),
          x25519(key_2, x25519(key_1)),
        ),
    ));
  });
  await step("convert_secret/convert_public : arbitrary exchange", () => {
    fc_check(fc.property(
      fc_binary(32),
      fc_binary(32),
      (key_1, key_2) =>
        assertEquals(
          x25519(convert_secret(key_1), convert_public(generate(key_2))),
          x25519(convert_secret(key_2), convert_public(generate(key_1))),
        ),
    ));
  });
  await step("x25519 :: webcrypto", async () => {
    const [pair_1, pair_2] = await Promise.all([
      generate_pair("X25519", ["deriveBits"]),
      generate_pair("X25519", ["deriveBits"]),
    ]);
    const [keys_1, keys_2, secret_1, secret_2] = await Promise.all([
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
    ]);
    assertEquals(x25519(keys_1.secret_key), keys_1.public_key);
    assertEquals(x25519(keys_2.secret_key), keys_2.public_key);
    assertEquals({
      secret_1: x25519(keys_1.secret_key, keys_2.public_key),
      secret_2: x25519(keys_2.secret_key, keys_1.public_key),
    }, { secret_1, secret_2 });
  });
});
Deno.test("ed25519", async ({ step }) => {
  await step("generate/sign/verify : rfc8032 7.1", () => {
    for (const $ of read(vectors.ed25519["rfc8032 7.1"])) {
      assertEquals(generate($.secret_key), $.public_key);
      assertEquals(sign($.secret_key, $.message), $.signature);
      assert(verify($.public_key, $.message, $.signature));
    }
  });
  await step("verify : wycheproof", () => {
    for (const $ of read(vectors.ed25519.wycheproof)) {
      assertEquals(verify($.public_key, $.message, $.signature), $.result);
    }
  });
  await step("verify : bad points", () => {
    const over = new Uint8Array([...new Uint8Array(31), 1]);
    const zero = new Uint8Array(32);
    assert(!verify(zero, zero, zero));
    assert(!verify(over, zero, new Uint8Array(64)));
    assert(!verify(zero, zero, new Uint8Array(64).fill(-1, 32)));
    assert(!verify(zero, zero, new Uint8Array([...over, ...zero])));
  });
  await step("sign/verify : arbitrary signatures", () => {
    fc_check(fc.property(
      fc_binary(32),
      fc_binary(),
      (key, message) =>
        assert(verify(generate(key), message, sign(key, message))),
    ));
  });
  await step("generate :: webcrypto", async () => {
    const { secret_key, public_key } = await export_pair(
      await generate_pair("Ed25519", ["sign", "verify"]),
    );
    assertEquals(generate(secret_key), public_key);
  });
  await step("sign/verify :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary(),
      async (message) => {
        const pair = await generate_pair("Ed25519", ["sign", "verify"]);
        const { secret_key, public_key } = await export_pair(pair);
        const signature = sign(secret_key, message);
        assertEquals(
          signature,
          new Uint8Array(
            await crypto.subtle.sign("Ed25519", pair.privateKey, message),
          ),
        );
        assertEquals(
          verify(public_key, message, signature),
          await crypto.subtle.verify(
            "Ed25519",
            pair.publicKey,
            signature,
            message,
          ),
        );
      },
    ));
  });
});
