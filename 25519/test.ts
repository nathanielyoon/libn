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
import { fcBytes, get, set } from "../test.ts";
import { deBig, enBig, mod } from "./lib.ts";
import vectors from "./vectors.json" with { type: "json" };

const generateExport = async (type: "Ed" | "X") => {
  const pair = await crypto.subtle.generateKey(
    `${type}25519`,
    true,
    type === "X" ? ["deriveBits"] : ["sign", "verify"],
  ) as CryptoKeyPair;
  const secretKey = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const publicKey = await crypto.subtle.exportKey("raw", pair.publicKey);
  return {
    pair,
    keys: {
      secret: new Uint8Array(secretKey.slice(16)),
      public: new Uint8Array(publicKey),
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
const importPublic = (type: "Ed" | "X", $: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey(
    "raw",
    $,
    `${type}25519`,
    true,
    type === "X" ? [] : ["verify"],
  );

Deno.test("x25519.ladder : vectors", () => {
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
    // ./test.ts => x25519.ladder : vectors ... ok (18m46s)
    if (step.iterations > 1) break;
  }
});
Deno.test("x25519.derive : reference vectors", () => {
  for (const $ of vectors.derive) {
    assertEquals(
      derive(Uint8Array.fromHex($.secret)),
      Uint8Array.fromHex($.public),
    );
  }
});
Deno.test("x25519.exchange : vectors", () => {
  for (const $ of vectors.exchange) {
    assertEquals(
      exchange(Uint8Array.fromHex($.secret), Uint8Array.fromHex($.public)),
      $.shared && Uint8Array.fromHex($.shared),
    );
  }
});
Deno.test("x25519.derive :: built-in generateKey", async () => {
  const { keys } = await generateExport("X");
  assertEquals(derive(keys.secret), keys.public);
});
Deno.test("x25519.exchange :: built-in deriveBits", async () => {
  await fc.assert(
    fc.asyncProperty(fcBytes(32), fcBytes(32), async (key1, key2) => {
      const public1 = derive(key1), public2 = derive(key2);
      assertEquals(
        exchange(key1, public2)?.buffer,
        await crypto.subtle.deriveBits(
          { name: "X25519", public: await importPublic("X", public2) },
          await importSecret("X", key1),
          256,
        ),
      );
      assertEquals(
        exchange(key2, public1)?.buffer,
        await crypto.subtle.deriveBits(
          { name: "X25519", public: await importPublic("X", public1) },
          await importSecret("X", key2),
          256,
        ),
      );
    }),
    { numRuns: 32 },
  );
});
Deno.test("x25519.exchange : x25519 keys", () => {
  fc.assert(
    fc.property(fcBytes(32), fcBytes(32), (key1, key2) => {
      assertEquals(exchange(key1, derive(key2)), exchange(key2, derive(key1)));
    }),
    { numRuns: 32 },
  );
});
Deno.test("x25519.exchange : ed25519 keys", () => {
  fc.assert(
    fc.property(fcBytes(32), fcBytes(32), (key1, key2) => {
      assertEquals(
        exchange(convertSecret(key1), convertPublic(generate(key2))),
        exchange(convertSecret(key2), convertPublic(generate(key1))),
      );
    }),
    { numRuns: 32 },
  );
});
Deno.test("x25519.exchange : all-zero shared secret", () => {
  fc.assert(fc.property(fcBytes(32), ($) => {
    assertEquals(exchange($, new Uint8Array(32)), null);
  }));
});
Deno.test("x25519.exchange : non-canonical values", () => {
  const key = new Uint8Array(32);
  for (let z = (1n << 255n) - 19n; z < 1n << 255n; ++z) {
    assertEquals(exchange(key, deBig(z)), exchange(key, deBig(mod(z))));
  }
});

Deno.test("ed25519.generate : vectors", () => {
  for (const $ of vectors.generate) {
    assertEquals(
      generate(Uint8Array.fromHex($.secret)),
      Uint8Array.fromHex($.public),
    );
  }
});
Deno.test("ed25519.sign : vectors", () => {
  for (const $ of vectors.sign) {
    assertEquals(
      sign(Uint8Array.fromHex($.secret), Uint8Array.fromHex($.message)),
      Uint8Array.fromHex($.signature),
    );
  }
});
Deno.test("ed25519.verify : vectors", () => {
  for (const $ of vectors.verify) {
    assertEquals(
      verify(
        Uint8Array.fromHex($.public),
        Uint8Array.fromHex($.message),
        Uint8Array.fromHex($.signature),
      ),
      $.result,
    );
  }
});
Deno.test("ed25519.generate :: built-in generateKey", async () => {
  const { keys } = await generateExport("Ed");
  assertEquals(generate(keys.secret), keys.public);
});
Deno.test("ed25519.sign :: built-in sign", async () => {
  await fc.assert(
    fc.asyncProperty(fcBytes(32), fcBytes(), async (key, $) => {
      assertEquals(
        sign(key, $).buffer,
        await crypto.subtle.sign("Ed25519", await importSecret("Ed", key), $),
      );
    }),
    { numRuns: 32 },
  );
});
Deno.test("ed25519.verify :: built-in verify", async () => {
  await fc.assert(
    fc.asyncProperty(fcBytes(32), fc.uint8Array(), async (key, message) => {
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
    }),
    { numRuns: 32 },
  );
});
Deno.test("ed25519.verify : valid signatures", () => {
  fc.assert(
    fc.property(fcBytes(32), fcBytes(), (key, message) => {
      assertEquals(verify(generate(key), message, sign(key, message)), true);
    }),
    { numRuns: 32 },
  );
});
Deno.test("ed25519.verify : bad points", () => {
  const zero32 = new Uint8Array(32), zer64 = new Uint8Array(64);
  assertEquals(verify(zero32.with(-1, 1), zero32, zer64), false);
  for (const $ of [zero32, zer64.with(-1, 1), zer64.fill(-1, 32)]) {
    assertEquals(verify(zero32, zero32, $), false);
  }
});

import.meta.main && Promise.all([
  get`www.rfc-editor.org/rfc/rfc7748.txt`.then((rfc7748) => ({
    "5.2.1": Array.from(
      rfc7748.slice(18300, 19695).matchAll(
        /scalar:\s*(?<secret>[\da-f]{64}).*?coordinate:\s*(?<public>[\da-f]{64}).*?coordinate:\s*(?<shared>[\da-f]{64})/gs,
      ),
      ($) => $.groups!,
    ),
    "5.2.2": rfc7748.slice(21688, 22554).match(/\b[\da-f]{64}\b/g)!,
    "6.1": rfc7748.slice(23217, 25093).match(/\b[\da-f]{64}\b/g)!,
  })),
  get`www.rfc-editor.org/rfc/rfc8032.txt${46947}${52155}`.then((rfc8032) =>
    Array.from(
      rfc8032.replace(/\n{3}.+?\n\f\n.+?\n{3}/g, "").matchAll(
        /SECRET KEY:\s*([\da-f]{32}\s*[\da-f]{32}\n).*?PUBLIC KEY:\s*([\da-f]{32}\s*[\da-f]{32}\n).*?MESSAGE \(length \d+ bytes?\):\n((?: {3}(?:[\da-f]{2})+\n)*).*?SIGNATURE:\s*([\da-f]{32}\s*[\da-f]{32}\s*[\da-f]{32}\s*[\da-f]{32}\n)/gs,
      ).map((match) => match.slice(1).map(($) => $.replace(/\s+/g, ""))),
      ([secretKey, publicKey, message, signature]) => (
        { secret: secretKey, public: publicKey, message, signature }
      ),
    )
  ),
  get`/C2SP/wycheproof/6b17607867ce8e3c3a2a4e1e35ccc3b42bfd75e3/testvectors_v1/x25519_test.json`,
  get`/C2SP/wycheproof/0d2dab394df1eb05b0865977f7633d010a98bccd/testvectors_v1/ed25519_test.json`,
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
    ...JSON.parse(x25519).testGroups.flatMap((group: {
      tests: { private: string; public: string; shared: string }[];
    }) =>
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
    ...JSON.parse(ed25519).testGroups.flatMap((group: {
      publicKey: { pk: string };
      tests: { msg: string; sig: string; result: "valid" | "invalid" }[];
    }) =>
      group.tests.map(($) => ({
        public: group.publicKey.pk,
        message: $.msg,
        signature: $.sig,
        result: $.result === "valid",
      }))
    ),
  ],
})).then(set(import.meta));
