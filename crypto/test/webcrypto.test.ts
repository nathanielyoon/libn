import { assertEquals } from "jsr:@std/assert@^1.0.13";
import fc from "npm:fast-check@^4.2.0";
import { sign, x25519 } from "../25519.ts";
import { hkdf, hmac, sha256, sha512 } from "../hash.ts";

const pkcs8 = ($: Uint8Array, type: 110 | 112, name: string, usage: KeyUsage) =>
  crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array(
      [48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, type, 4, 34, 4, 3, ...$],
    ),
    name,
    false,
    [usage],
  );
const webcrypto = <
  A extends (fc.IntArrayConstraints | fc.Arbitrary<unknown>)[],
  B extends {
    [C in keyof A]: A[C] extends fc.Arbitrary<infer D> ? D : Uint8Array;
  },
>(name: string, ...arbitraries: A) =>
(actual: (...$: B) => Uint8Array, expect: (...$: B) => Promise<ArrayBuffer>) =>
  Deno.test(name, () =>
    fc.assert(fc.asyncProperty(
      fc.tuple(...arbitraries.map(($) =>
        $ instanceof fc.Arbitrary ? $ : fc.uint8Array($)
      )) as fc.Arbitrary<B>,
      async ($) =>
        assertEquals(actual(...$), new Uint8Array(await expect(...$))),
    )));
webcrypto(
  "x25519",
  { minLength: 32, maxLength: 32 },
  { minLength: 32, maxLength: 32 },
)(x25519, (key_1, key_2) =>
  Promise.all([
    pkcs8(key_1, 110, "x25519", "deriveBits"),
    crypto.subtle.importKey("raw", key_2, "x25519", false, []),
  ]).then(([secret_key, public_key]) =>
    crypto.subtle.deriveBits(
      { name: "x25519", public: public_key },
      secret_key,
      256,
    )
  ));
webcrypto("ed25519", { minLength: 32, maxLength: 32 }, {})(
  sign,
  (key, data) =>
    pkcs8(key, 112, "ed25519", "sign").then(($) =>
      crypto.subtle.sign("ed25519", $, data)
    ),
);
webcrypto("SHA-256", {})(sha256, ($) => crypto.subtle.digest("SHA-256", $));
webcrypto("SHA-512", {})(sha512, ($) => crypto.subtle.digest("SHA-512", $));
webcrypto("hmac", { minLength: 1 }, {})(
  hmac,
  (key, data) =>
    crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ).then(($) => crypto.subtle.sign("HMAC", $, data)),
);
webcrypto("hkdf", {}, {}, {}, fc.integer({ min: 1, max: 8160 }))(
  hkdf,
  (key, info, salt, out) =>
    crypto.subtle.importKey("raw", key, "HKDF", false, ["deriveBits"])
      .then(($) =>
        crypto.subtle.deriveBits(
          { name: "HKDF", hash: "SHA-256", info, salt },
          $,
          out << 3,
        )
      ),
);
