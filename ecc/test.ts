import { expect } from "@std/expect/expect";
import fc from "fast-check";
import {
  convertPublic,
  convertSecret,
  derive,
  exchange,
} from "@libn/ecc/x25519";
import { generate, sign, verify } from "@libn/ecc/ed25519";

Deno.test("vectors", async (t) => {
  const vectors = await import("./vectors.json", { with: { type: "json" } });
  await t.step("derive", () =>
    vectors.default.derive.forEach(($) => {
      expect(derive(Uint8Array.fromHex($.secret))).toStrictEqual(
        Uint8Array.fromHex($.public),
      );
    }));
  await t.step("exchange", () =>
    vectors.default.exchange.forEach(($) => {
      expect(
        exchange(Uint8Array.fromHex($.secret), Uint8Array.fromHex($.public)),
      ).toStrictEqual($.shared && Uint8Array.fromHex($.shared));
    }));
  await t.step("generate", () =>
    vectors.default.generate.forEach(($) => {
      expect(generate(Uint8Array.fromHex($.secret))).toStrictEqual(
        Uint8Array.fromHex($.public),
      );
    }));
  await t.step("sign", () =>
    vectors.default.sign.forEach(($) => {
      expect(sign(Uint8Array.fromHex($.secret), Uint8Array.fromHex($.message)))
        .toStrictEqual(Uint8Array.fromHex($.signature));
    }));
  await t.step("verify", () =>
    vectors.default.verify.forEach(($) => {
      expect(verify(
        Uint8Array.fromHex($.public),
        Uint8Array.fromHex($.message),
        Uint8Array.fromHex($.signature),
      )).toStrictEqual($.result);
    }));
});
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
        (await crypto.subtle.exportKey("pkcs8", pair.privateKey)).slice(16),
      ),
      public: new Uint8Array(
        await crypto.subtle.exportKey("raw", pair.publicKey),
      ),
    },
  };
};
const PKCS8 = Uint8Array.fromHex("302e020100300506032b65ff04220420");
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
Deno.test("derive() follows built-in generateKey", async () => {
  const { keys } = await generateExport("X");
  expect(derive(keys.secret)).toStrictEqual(keys.public);
});
Deno.test("exchange() follows built-in deriveBits", () =>
  fc.assert(fc.asyncProperty(fcKey, fcKey, async (secret1, secret2) => {
    const public1 = derive(secret1), public2 = derive(secret2);
    expect(exchange(secret1, public2)).toStrictEqual(
      new Uint8Array(
        await crypto.subtle.deriveBits(
          { name: "X25519", public: await importPublic("X", public2) },
          await importSecret("X", secret1),
          256,
        ),
      ),
    );
    expect(exchange(secret2, public1)).toStrictEqual(
      new Uint8Array(
        await crypto.subtle.deriveBits(
          { name: "X25519", public: await importPublic("X", public1) },
          await importSecret("X", secret2),
          256,
        ),
      ),
    );
  })));
Deno.test("exchange() shares a secret with x25519 keys", () =>
  fc.assert(fc.property(fcKey, fcKey, (key1, key2) => {
    expect(exchange(key1, derive(key2))).toStrictEqual(
      exchange(key2, derive(key1)),
    );
  })));
Deno.test("exchange() shares a secret with ed25519 keys", () =>
  fc.assert(fc.property(fcKey, fcKey, (key1, key2) => {
    expect(exchange(convertSecret(key1), convertPublic(generate(key2))))
      .toStrictEqual(
        exchange(convertSecret(key2), convertPublic(generate(key1))),
      );
  })));
Deno.test("exchange() rejects all-zero shared secrets", () =>
  fc.assert(fc.property(fcKey, ($) => {
    expect(exchange($, new Uint8Array(32))).toBeNull();
  })));
Deno.test("generate() follows built-in generateKey", async () => {
  const { keys } = await generateExport("Ed");
  expect(generate(keys.secret)).toStrictEqual(keys.public);
});
Deno.test("sign() follows built-in sign", () =>
  fc.assert(fc.asyncProperty(fcKey, fc.uint8Array(), async (key, message) => {
    expect(sign(key, message)).toStrictEqual(
      new Uint8Array(
        await crypto.subtle.sign(
          "Ed25519",
          await importSecret("Ed", key),
          message,
        ),
      ),
    );
  })));
Deno.test("verify() follows built-in verify", () =>
  fc.assert(fc.asyncProperty(fcKey, fc.uint8Array(), async (key, message) => {
    const publicKey = generate(key), signature = sign(key, message);
    expect(verify(publicKey, message, signature)).toStrictEqual(
      await crypto.subtle.verify(
        "Ed25519",
        await importPublic("Ed", publicKey),
        signature,
        message,
      ),
    );
    ++signature[0];
    expect(verify(publicKey, message, signature)).toStrictEqual(
      await crypto.subtle.verify(
        "Ed25519",
        await importPublic("Ed", publicKey),
        signature,
        message,
      ),
    );
  })));
Deno.test("verify() rejects bad points", () => {
  const zero32 = new Uint8Array(32), zer64 = new Uint8Array(64);
  expect(verify(zero32.with(-1, 1), zero32, zer64)).toStrictEqual(false);
  for (const $ of [zero32, zer64.with(-1, 1), zer64.fill(-1, 32)]) {
    expect(verify(zero32, zero32, $)).toStrictEqual(false);
  }
});
Deno.test("verify() accepts valid signatures", () =>
  fc.assert(fc.property(fcKey, fc.uint8Array(), (key, message) => {
    expect(verify(generate(key), message, sign(key, message))).toStrictEqual(
      true,
    );
  })));
import.meta.main && await Promise.all([
  fetch(
    "https://www.rfc-editor.org/rfc/rfc7748.txt",
  ).then(($) => $.text()).then(($) => ({
    "5.2": Array.from(
      $.slice(18300, 19695).matchAll(
        /scalar:\s*(?<secret>[\da-f]{64}).*?coordinate:\s*(?<public>[\da-f]{64}).*?coordinate:\s*(?<shared>[\da-f]{64})/gs,
      ),
      ($) => $.groups!,
    ),
    "6.1": $.slice(23217, 25093).match(/(?<=^ {5})[\da-f]{64}$/gm)!,
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
  derive: [
    { secret: rfc7748["6.1"][0], public: rfc7748["6.1"][1] },
    { secret: rfc7748["6.1"][2], public: rfc7748["6.1"][3] },
  ],
  exchange: [
    ...rfc7748["5.2"],
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
  Deno.writeTextFile(
    new URL(import.meta.resolve("./vectors.json")).pathname,
    JSON.stringify($),
  )
);
