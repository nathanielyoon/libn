import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_binary, fc_check, read } from "@libn/lib";
import {
  convert_public,
  convert_secret,
  derive,
  exchange,
} from "../src/x25519.ts";
import { generate } from "../src/ed25519.ts";
import vectors from "./vectors.json" with { type: "json" };
import { export_pair, generate_pair } from "./pair.ts";

Deno.test("x25519", async ({ step }) => {
  await step("exchange : rfc7748 5.2", () => {
    for (const $ of read(vectors.x25519["rfc7748 5.2"])) {
      assertEquals(exchange($.scalar, $.coordinate), $.output);
    }
  });
  await step("derive/exchange : rfc7748 6.1", () => {
    const [$] = read([vectors.x25519["rfc7748 6.1"]]);
    assertEquals(derive($.secret_a), $.public_a);
    assertEquals(derive($.secret_b), $.public_b);
    assertEquals(exchange($.secret_a, $.public_b), $.shared);
    assertEquals(exchange($.secret_b, $.public_a), $.shared);
  });
  await step("exchange : wycheproof", () => {
    for (const $ of read(vectors.x25519.wycheproof)) {
      assertEquals(exchange($.secret_key, $.public_key), $.shared_secret);
    }
  });
  await step("derive/exchange : arbitrary exchange", () => {
    fc_check(fc.property(
      fc_binary(32),
      fc_binary(32),
      (key_1, key_2) =>
        assertEquals(
          exchange(key_1, derive(key_2)),
          exchange(key_2, derive(key_1)),
        ),
    ));
  });
  await step("convert_secret/convert_public : arbitrary exchange", () => {
    fc_check(fc.property(
      fc_binary(32),
      fc_binary(32),
      (key_1, key_2) =>
        assertEquals(
          exchange(convert_secret(key_1), convert_public(generate(key_2))),
          exchange(convert_secret(key_2), convert_public(generate(key_1))),
        ),
    ));
  });
  await step("derive/exchange :: webcrypto", async () => {
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
    assertEquals(derive(keys_1.secret_key), keys_1.public_key);
    assertEquals(derive(keys_2.secret_key), keys_2.public_key);
    assertEquals({
      secret_1: exchange(keys_1.secret_key, keys_2.public_key),
      secret_2: exchange(keys_2.secret_key, keys_1.public_key),
    }, { secret_1, secret_2 });
  });
});
