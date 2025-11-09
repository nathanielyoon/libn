import { generate, sign, verify } from "@libn/25519/ed25519";
import {
  convertPublic,
  convertSecret,
  derive,
  exchange,
  ladder,
} from "@libn/25519/x25519";
import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { deBig, enBig, mod } from "./lib.ts";
import vectors from "./vectors.json" with { type: "json" };

const generateExport = async (type: "Ed" | "X") => {
  const pair = await crypto.subtle.generateKey(
    `${type}25519`,
    true,
    type === "X" ? ["deriveBits"] : ["sign", "verify"],
  ) as CryptoKeyPair;
  return {
    pair,
    keys: {
      secret: new Uint8Array(
        await crypto.subtle.exportKey("pkcs8", pair.privateKey),
      ).subarray(16),
      public: new Uint8Array(
        await crypto.subtle.exportKey("raw", pair.publicKey),
      ),
    },
  };
};
const PKCS8 = Uint8Array.fromHex("302e020100300506032b65FF04220420");
const importSecret = (type: "Ed" | "X", $: Uint8Array) =>
  crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array([...PKCS8.with(11, type === "X" ? 110 : 112), ...$]),
    `${type}25519`,
    true,
    type === "X" ? ["deriveBits"] : ["sign"],
  );
const importPublic = (type: "Ed" | "X", $: Uint8Array) =>
  crypto.subtle.importKey(
    "raw",
    new Uint8Array($),
    `${type}25519`,
    true,
    type === "X" ? [] : ["verify"],
  );
const fcKey = fc.uint8Array({ minLength: 32, maxLength: 32 });
Deno.test("x25519.ladder() passes reference vectors", () => {
  let k = enBig(Uint8Array.fromHex(vectors.ladder.k));
  let u = enBig(Uint8Array.fromHex(vectors.ladder.u));
  let y = 0;
  for (const step of vectors.ladder.after) {
    do {
      const next = ladder(k, u);
      u = k, k = next;
    } while (++y < step.iterations);
    assertEquals(deBig(k), Uint8Array.fromHex(step.k));
    // Remove to run the remaining two steps, which take a while.
    // ./test.ts => x25519.ladder() passes reference vectors ... ok (7m49s)
    break;
  }
});
Deno.test("x25519.derive() passes reference vectors", () =>
  vectors.derive.forEach(($) => {
    assertEquals(
      derive(Uint8Array.fromHex($.secret)),
      Uint8Array.fromHex($.public),
    );
  }));
Deno.test("x25519.exchange() passes reference vectors", () =>
  vectors.exchange.forEach(($) => {
    assertEquals(
      exchange(Uint8Array.fromHex($.secret), Uint8Array.fromHex($.public)),
      $.shared && Uint8Array.fromHex($.shared),
    );
  }));
Deno.test("x25519.derive() follows built-in generateKey", async () => {
  const { keys } = await generateExport("X");
  assertEquals(derive(keys.secret), keys.public);
});
Deno.test("x25519.exchange() follows built-in deriveBits", () =>
  fc.assert(fc.asyncProperty(fcKey, fcKey, async (secret1, secret2) => {
    const public1 = derive(secret1), public2 = derive(secret2);
    assertEquals(
      exchange(secret1, public2),
      new Uint8Array(
        await crypto.subtle.deriveBits(
          { name: "X25519", public: await importPublic("X", public2) },
          await importSecret("X", secret1),
          256,
        ),
      ),
    );
    assertEquals(
      exchange(secret2, public1),
      new Uint8Array(
        await crypto.subtle.deriveBits(
          { name: "X25519", public: await importPublic("X", public1) },
          await importSecret("X", secret2),
          256,
        ),
      ),
    );
  })));
Deno.test("x25519.exchange() shares a secret with x25519 keys", () =>
  fc.assert(fc.property(fcKey, fcKey, (key1, key2) => {
    assertEquals(exchange(key1, derive(key2)), exchange(key2, derive(key1)));
  })));
Deno.test("x25519.exchange() shares a secret with ed25519 keys", () =>
  fc.assert(fc.property(fcKey, fcKey, (key1, key2) => {
    assertEquals(
      exchange(convertSecret(key1), convertPublic(generate(key2))),
      exchange(convertSecret(key2), convertPublic(generate(key1))),
    );
  })));
Deno.test("x25519.exchange() rejects all-zero shared secrets", () =>
  fc.assert(fc.property(fcKey, ($) => {
    assertEquals(exchange($, new Uint8Array(32)), null);
  })));
Deno.test("x25519.exchange() accepts non-canonical values", () => {
  const key = new Uint8Array(32);
  for (let z = (1n << 255n) - 19n; z < 1n << 255n; ++z) {
    assertEquals(exchange(key, deBig(z)), exchange(key, deBig(mod(z))));
  }
});
Deno.test("ed25519.generate() passes reference vectors", () =>
  vectors.generate.forEach(($) => {
    assertEquals(
      generate(Uint8Array.fromHex($.secret)),
      Uint8Array.fromHex($.public),
    );
  }));
Deno.test("ed25519.sign() passes reference vectors", () =>
  vectors.sign.forEach(($) => {
    assertEquals(
      sign(Uint8Array.fromHex($.secret), Uint8Array.fromHex($.message)),
      Uint8Array.fromHex($.signature),
    );
  }));
Deno.test("ed25519.verify() passes reference vectors", () =>
  vectors.verify.forEach(($) => {
    assertEquals(
      verify(
        Uint8Array.fromHex($.public),
        Uint8Array.fromHex($.message),
        Uint8Array.fromHex($.signature),
      ),
      $.result,
    );
  }));
Deno.test("ed25519.generate() follows built-in generateKey", async () => {
  const { keys } = await generateExport("Ed");
  assertEquals(generate(keys.secret), keys.public);
});
Deno.test("ed25519.sign() follows built-in sign", () =>
  fc.assert(fc.asyncProperty(fcKey, fc.uint8Array(), async (key, $) => {
    assertEquals(
      sign(key, $),
      new Uint8Array(
        await crypto.subtle.sign("Ed25519", await importSecret("Ed", key), $),
      ),
    );
  })));
Deno.test("ed25519.verify() follows built-in verify", () =>
  fc.assert(fc.asyncProperty(fcKey, fc.uint8Array(), async (key, message) => {
    const publicKey = generate(key), signature = sign(key, message);
    assertEquals(
      verify(publicKey, message, signature),
      await crypto.subtle.verify(
        "Ed25519",
        await importPublic("Ed", publicKey),
        signature,
        message,
      ),
    );
    ++signature[0];
    assertEquals(
      verify(publicKey, message, signature),
      await crypto.subtle.verify(
        "Ed25519",
        await importPublic("Ed", publicKey),
        signature,
        message,
      ),
    );
  })));
Deno.test("ed25519.verify() rejects bad points", () => {
  const zero32 = new Uint8Array(32), zer64 = new Uint8Array(64);
  assertEquals(verify(zero32.with(-1, 1), zero32, zer64), false);
  for (const $ of [zero32, zer64.with(-1, 1), zer64.fill(-1, 32)]) {
    assertEquals(verify(zero32, zero32, $), false);
  }
});
Deno.test("ed25519.verify() accepts valid signatures", () => {
  fc.assert(fc.property(fcKey, fc.uint8Array(), (key, message) => {
    assertEquals(verify(generate(key), message, sign(key, message)), true);
  }));
});
import.meta.main && Promise.all([
  fetch(
    "https://www.rfc-editor.org/rfc/rfc7748.txt",
  ).then(($) => $.text()).then((rfc7748) => ({
    "5.2.1": Array.from(
      rfc7748.slice(18300, 19695).matchAll(
        /scalar:\s*(?<secret>[\da-f]{64}).*?coordinate:\s*(?<public>[\da-f]{64}).*?coordinate:\s*(?<shared>[\da-f]{64})/gs,
      ),
      ($) => $.groups!,
    ),
    "5.2.2": rfc7748.slice(21688, 22554).match(/\b[\da-f]{64}\b/g)!,
    "6.1": rfc7748.slice(23217, 25093).match(/\b[\da-f]{64}\b/g)!,
  })),
  fetch(
    "https://www.rfc-editor.org/rfc/rfc8032.txt",
  ).then(($) => $.text()).then(($) =>
    Array.from(
      $.slice(46947, 52155).replace(/\n{3}.+?\n\f\n.+?\n{3}/g, "").matchAll(
        /SECRET KEY:\s*([\da-f]{32}\s*[\da-f]{32}\n).*?PUBLIC KEY:\s*([\da-f]{32}\s*[\da-f]{32}\n).*?MESSAGE \(length \d+ bytes?\):\n((?: {3}(?:[\da-f]{2})+\n)*).*?SIGNATURE:\s*([\da-f]{32}\s*[\da-f]{32}\s*[\da-f]{32}\s*[\da-f]{32}\n)/gs,
      ).map((match) => match.slice(1).map(($) => $.replace(/\s+/g, ""))),
      ([secretKey, publicKey, message, signature]) => (
        { secret: secretKey, public: publicKey, message, signature }
      ),
    )
  ),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/6b17607867ce8e3c3a2a4e1e35ccc3b42bfd75e3/testvectors_v1/x25519_test.json",
  ).then<{
    testGroups: {
      tests: { private: string; public: string; shared: string }[];
    }[];
  }>(($) => $.json()),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/0d2dab394df1eb05b0865977f7633d010a98bccd/testvectors_v1/ed25519_test.json",
  ).then<{
    testGroups: {
      publicKey: { pk: string };
      tests: { msg: string; sig: string; result: "valid" | "invalid" }[];
    }[];
  }>(($) => $.json()),
]).then(([rfc7748, rfc8032, x25519, ed25519]) => ({
  ladder: {
    k: rfc7748["5.2.2"][0],
    u: rfc7748["5.2.2"][0],
    after: [
      { iterations: 1e0, k: rfc7748["5.2.2"][1] },
      { iterations: 1e3, k: rfc7748["5.2.2"][2] },
      { iterations: 1e6, k: rfc7748["5.2.2"][3] },
    ],
  },
  derive: [
    { secret: rfc7748["6.1"][0], public: rfc7748["6.1"][1] },
    { secret: rfc7748["6.1"][2], public: rfc7748["6.1"][3] },
  ],
  exchange: [
    ...rfc7748["5.2.1"],
    {
      secret: rfc7748["6.1"][0],
      public: rfc7748["6.1"][3],
      shared: rfc7748["6.1"][4],
    },
    {
      secret: rfc7748["6.1"][2],
      public: rfc7748["6.1"][1],
      shared: rfc7748["6.1"][4],
    },
    ...x25519.testGroups.flatMap((group) =>
      group.tests.map(($) => ({
        secret: $.private,
        public: $.public,
        shared: /^0{64}$/.test($.shared) ? null : $.shared,
      }))
    ),
  ],
  generate: rfc8032.map(($) => ({ secret: $.secret, public: $.public })),
  sign: rfc8032.map(($) => ({
    secret: $.secret,
    message: $.message,
    signature: $.signature,
  })),
  verify: [
    ...rfc8032.map(($) => ({
      public: $.public,
      message: $.message,
      signature: $.signature,
      result: true,
    })),
    ...ed25519.testGroups.flatMap((group) =>
      group.tests.map(($) => ({
        public: group.publicKey.pk,
        message: $.msg,
        signature: $.sig,
        result: $.result === "valid",
      }))
    ),
  ],
})).then(($) =>
  Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
);
