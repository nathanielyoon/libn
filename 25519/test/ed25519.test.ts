import { assert, assertEquals } from "@std/assert";
import { fc_assert, fc_bin, read } from "@libn/lib";
import { generate, sign, verify } from "../src/ed25519.ts";
import { get_pair, set_pair } from "./common.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("generate/sign/verify : rfc8032 7.1", () =>
  read(vectors.ed25519["rfc8032 7.1"]).forEach(($) => {
    assertEquals(generate($.secret_key), $.public_key);
    assertEquals(sign($.secret_key, $.message), $.signature);
    assert(verify($.public_key, $.message, $.signature));
  }));
Deno.test("verify : wycheproof", () =>
  read(vectors.ed25519.wycheproof).forEach(($) =>
    assertEquals(verify($.public_key, $.message, $.signature), $.result)
  ));
Deno.test("verify : bad points", () => {
  const over = new Uint8Array([...new Uint8Array(31), 1]);
  const zero = new Uint8Array(32);
  assert(!verify(zero, zero, zero));
  assert(!verify(over, zero, new Uint8Array(64)));
  assert(!verify(zero, zero, new Uint8Array(64).fill(-1, 32)));
  assert(!verify(zero, zero, new Uint8Array([...over, ...zero])));
});
Deno.test("sign/verify : arbitrary signatures", () =>
  fc_assert(fc_bin(32), fc_bin())((key, message) =>
    verify(generate(key), message, sign(key, message))
  ));
Deno.test("generate :: webcrypto", () =>
  get_pair("Ed").then(set_pair).then(([secret_key, public_key]) =>
    assertEquals(generate(secret_key), public_key)
  ));
Deno.test("sign/verify :: webcrypto", () =>
  fc_assert(fc_bin())(async ($) => {
    const pair = await get_pair("Ed");
    const [secret_key, public_key] = await set_pair(pair);
    const signature = sign(secret_key, $);
    assertEquals(
      signature,
      new Uint8Array(await crypto.subtle.sign("Ed25519", pair.privateKey, $)),
    );
    assertEquals(
      verify(public_key, $, signature),
      await crypto.subtle.verify("Ed25519", pair.publicKey, signature, $),
    );
  }, { async: true }));
