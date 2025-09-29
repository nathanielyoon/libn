import { assertEquals } from "@std/assert";
import { fc_assert, fc_bin, read } from "@libn/lib";
import {
  convert_public,
  convert_secret,
  derive,
  exchange,
} from "../src/x25519.ts";
import { generate } from "../src/ed25519.ts";
import { get_pair, set_pair } from "./common.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("exchange : rfc7748 5.2", () =>
  read(vectors.x25519["rfc7748 5.2"]).forEach(($) =>
    assertEquals(exchange($.scalar, $.coordinate), $.output)
  ));
Deno.test("derive/exchange : rfc7748 6.1", () =>
  read([vectors.x25519["rfc7748 6.1"]]).forEach(($) => {
    assertEquals(derive($.secret_a), $.public_a);
    assertEquals(derive($.secret_b), $.public_b);
    assertEquals(exchange($.secret_a, $.public_b), $.shared);
    assertEquals(exchange($.secret_b, $.public_a), $.shared);
  }));
Deno.test("exchange : wycheproof", () =>
  read(vectors.x25519.wycheproof).forEach(($) =>
    assertEquals(exchange($.secret_key, $.public_key), $.shared_secret)
  ));
Deno.test("derive/exchange : arbitrary exchange", () =>
  fc_assert(fc_bin(32), fc_bin(32))((key_1, key_2) =>
    assertEquals(exchange(key_1, derive(key_2)), exchange(key_2, derive(key_1)))
  ));
Deno.test("convert_secret/convert_public : arbitrary exchange", () =>
  fc_assert(fc_bin(32), fc_bin(32))((key_1, key_2) =>
    assertEquals(
      exchange(convert_secret(key_1), convert_public(generate(key_2))),
      exchange(convert_secret(key_2), convert_public(generate(key_1))),
    )
  ));
Deno.test("derive/exchange :: webcrypto", async () => {
  const pair_1 = await get_pair("X25519", ["deriveBits"]);
  const pair_2 = await get_pair("X25519", ["deriveBits"]);
  const keys_1 = await set_pair(pair_1);
  const keys_2 = await set_pair(pair_2);
  assertEquals(derive(keys_1.secret_key), keys_1.public_key);
  assertEquals(derive(keys_2.secret_key), keys_2.public_key);
  assertEquals(
    exchange(keys_1.secret_key, keys_2.public_key),
    new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "X25519", public: pair_2.publicKey },
        pair_1.privateKey,
        256,
      ),
    ),
  );
  assertEquals(
    exchange(keys_2.secret_key, keys_1.public_key),
    new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "X25519", public: pair_1.publicKey },
        pair_2.privateKey,
        256,
      ),
    ),
  );
});
