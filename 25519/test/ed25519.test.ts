import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_bin, fc_check, read } from "@libn/lib";
import { generate, sign, verify } from "../src/ed25519.ts";
import { export_pair, generate_pair } from "./pair.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("generate/sign/verify : rfc8032 7.1", () => {
  for (const $ of read(vectors.ed25519["rfc8032 7.1"])) {
    assertEquals(generate($.secret_key), $.public_key);
    assertEquals(sign($.secret_key, $.message), $.signature);
    assert(verify($.public_key, $.message, $.signature));
  }
});
Deno.test("verify : wycheproof", () => {
  for (const $ of read(vectors.ed25519.wycheproof)) {
    assertEquals(verify($.public_key, $.message, $.signature), $.result);
  }
});
Deno.test("verify : bad points", () => {
  const over = new Uint8Array([...new Uint8Array(31), 1]);
  const zero = new Uint8Array(32);
  assert(!verify(zero, zero, zero));
  assert(!verify(over, zero, new Uint8Array(64)));
  assert(!verify(zero, zero, new Uint8Array(64).fill(-1, 32)));
  assert(!verify(zero, zero, new Uint8Array([...over, ...zero])));
});
Deno.test("sign/verify : arbitrary signatures", () => {
  fc_check(fc.property(
    fc_bin(32),
    fc_bin(),
    (key, message) => verify(generate(key), message, sign(key, message)),
  ));
});
Deno.test("generate :: webcrypto", async () => {
  const pair = await export_pair(
    await generate_pair("Ed25519", ["sign", "verify"]),
  );
  assertEquals(generate(pair.secret_key), pair.public_key);
});
Deno.test("sign/verify :: webcrypto", async () => {
  await fc_check(fc.asyncProperty(fc_bin(), async (message) => {
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
      await crypto.subtle.verify("Ed25519", pair.publicKey, signature, message),
    );
  }));
});
