import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { chacha, hchacha, xor } from "@libn/aead/chacha";
import { poly } from "@libn/aead/poly";
import { polyXchacha, xchachaPoly } from "@libn/aead/aead";
import { cipher, decrypt, encrypt } from "@libn/aead";
import vectors from "./vectors.json" with { type: "json" };

const u32 = ($: string) => new Uint32Array(Uint8Array.fromHex($).buffer);
const fcRight = ($: number) => fc.uint8Array({ minLength: $, maxLength: $ });
const fcWrongLength = <const A extends number[]>(...lengths: A) =>
  fc.oneof(...Array.from(lengths, (_, index) =>
    fc.tuple(
      ...lengths.map(($, z) =>
        z !== index ? fcRight($) : fc.oneof(
          fc.uint8Array({ minLength: $ + 1 }),
          fc.uint8Array({ maxLength: $ - 1 }),
        )
      ),
    ) as fc.Arbitrary<{ [_ in keyof A]: Uint8Array<ArrayBuffer> }>));
Deno.test("chacha", async (t) => {
  await t.step("chacha() passes reference vectors", () => {
    for (const $ of vectors.chacha) {
      const state = new Uint32Array(16);
      const [iv0, iv1, iv2] = u32($.iv);
      chacha(u32($.key), $.count, iv0, iv1, iv2, state);
      assertEquals(
        new Uint8Array(state.buffer).subarray(0, $.state.length >> 1),
        Uint8Array.fromHex($.state),
      );
    }
  });
  await t.step("hchacha() passes reference vectors", () => {
    for (const $ of vectors.hchacha) {
      assertEquals(
        hchacha(Uint8Array.fromHex($.key), Uint8Array.fromHex($.iv)),
        u32($.subkey),
      );
    }
  });
  await t.step("xor() passes reference vectors", () => {
    for (const $ of vectors.xor) {
      const plaintext = Uint8Array.fromHex($.plaintext);
      const [iv0, iv1, iv2] = u32($.iv);
      xor(u32($.key), iv0, iv1, iv2, plaintext, $.count);
      assertEquals(plaintext, Uint8Array.fromHex($.ciphertext));
    }
  });
});
Deno.test("poly", async (t) => {
  await t.step("poly() passes reference vectors", () => {
    for (const $ of vectors.poly) {
      assertEquals(
        poly(u32($.key), Uint8Array.fromHex($.message)),
        Uint8Array.fromHex($.tag),
      );
    }
  });
  await t.step("poly() ignores empty key and message", () => {
    assertEquals(
      poly(new Uint32Array(8), new Uint8Array()),
      new Uint8Array(16),
    );
  });
});
Deno.test("aead", async (t) => {
  await t.step("xchachapoly() passes reference vectors", () => {
    for (const $ of vectors.xchachaPoly) {
      const plaintext = Uint8Array.fromHex($.plaintext);
      assertEquals(
        xchachaPoly(
          Uint8Array.fromHex($.key),
          Uint8Array.fromHex($.iv),
          plaintext,
          Uint8Array.fromHex($.ad),
        ),
        Uint8Array.fromHex($.tag),
      );
      assertEquals(plaintext, Uint8Array.fromHex($.ciphertext));
    }
  });
  await t.step("polyxchacha() passes reference vectors", () => {
    for (const $ of vectors.polyXchacha) {
      const key = Uint8Array.fromHex($.key);
      const iv = Uint8Array.fromHex($.iv);
      const ciphertext = Uint8Array.fromHex($.ciphertext);
      const ad = Uint8Array.fromHex($.ad);
      const tag = Uint8Array.fromHex($.tag);
      if ($.result) {
        assertEquals(polyXchacha(key, iv, tag, ciphertext, ad), true);
        assertEquals(ciphertext, Uint8Array.fromHex($.plaintext));
      } else assertEquals(polyXchacha(key, iv, tag, ciphertext, ad), false);
    }
  });
  await t.step("xchachaPoly() rejects wrong-size arguments", () => {
    fc.assert(fc.property(fcWrongLength(32, 24), ($) => {
      assertEquals(xchachaPoly(...$, new Uint8Array(), new Uint8Array()), null);
    }));
  });
  await t.step("polyXchacha() rejects wrong-size arguments", () => {
    fc.assert(fc.property(fcWrongLength(32, 24, 16), ($) => {
      assertEquals(polyXchacha(...$, new Uint8Array(), new Uint8Array()), null);
    }));
  });
});
Deno.test("mod", async (t) => {
  await t.step("cipher() passes reference vectors", () => {
    for (const $ of vectors.cipher) {
      const key = Uint8Array.fromHex($.key);
      const iv = Uint8Array.fromHex($.iv);
      const plaintext = Uint8Array.fromHex($.plaintext);
      const text = new Uint8Array(plaintext.length);
      cipher(key, iv, text);
      assertEquals(text, Uint8Array.fromHex($.keystream));
      text.set(plaintext);
      cipher(key, iv, text);
      assertEquals(text, Uint8Array.fromHex($.ciphertext));
    }
  });
  await t.step("mod round-trips losslessly", () => {
    fc.assert(fc.property(
      fcRight(32),
      fc.uint8Array(),
      fc.uint8Array(),
      (key, plaintext, data) => {
        const textWithAd = encrypt(key, plaintext, data);
        assert(textWithAd);
        assertEquals(decrypt(key, textWithAd!, data), plaintext);
        const textWithoutAd = encrypt(key, plaintext);
        assert(textWithoutAd);
        assertEquals(decrypt(key, textWithoutAd!), plaintext);
      },
    ));
  });
  await t.step("encrypt() rejects wrong-size arguments", () => {
    fc.assert(fc.property(fcWrongLength(32), ($) => {
      assertEquals(encrypt(...$, new Uint8Array()), null);
    }));
  });
  await t.step("decrypt() rejects wrong-size arguments", () => {
    fc.assert(fc.property(fcWrongLength(32), ($) => {
      assertEquals(decrypt(...$, new Uint8Array(40)), null);
    }));
    fc.assert(fc.property(
      fcRight(32),
      fc.uint8Array({ maxLength: 39 }),
      (key, text) => {
        assertEquals(decrypt(key, text), null);
      },
    ));
  });
});
import.meta.main && await Promise.all([
  fetch(
    "https://www.rfc-editor.org/rfc/rfc8439.txt",
  ).then(($) => $.text()).then(
    (rfc8439) => (...sources: [from: [number, number], regex: RegExp][]) =>
      sources.flatMap(([from, regex]) =>
        Array.from(
          regex.global
            ? rfc8439.slice(...from).matchAll(regex)
            : [rfc8439.slice(...from).match(regex)!],
          ($) => $.groups!,
        )
      ).map(({ count, ...$ }) =>
        Object.keys($).reduce((to, key) => ({
          ...to,
          [key]: String($[key]).match(
            /(?<=^|[\da-f]{2}[\s:])[\da-f](?:\n {6})?[\da-f](?=[\s).:]|$)|(?<=^|[\s(:])[\da-f]{2}(?=[\s:][\da-f]{2}|$)/gi,
          )?.join("").replaceAll("\n      ", "") ?? "",
        }), count === undefined ? {} : { count: Number(count) })
      ),
  ),
  fetch(
    "https://www.ietf.org/archive/id/draft-irtf-cfrg-xchacha-03.txt",
  ).then(($) => $.text()).then((xchacha) => ({
    "2.2.1": xchacha.slice(9906, 11288).match(
      /Key = ([\da-f]{2}(?::\s*[\da-f]{2})+).*?Nonce = \(([^)]+)\).*?key:((?:\s+[\da-f]{8})+)/s,
    )!.slice(1).map(($) => $.replace(/[\s\W]+/g, "")),
    "A.3.1": xchacha.slice(30715, 31722).match(
      /(?:[\da-f]{24,}\s*)+/g,
    )!.map(($) => $.replace(/\s+/g, "")),
    "A.3.2.1": xchacha.slice(31876, 34302).match(
      /(?:[\da-f]{24,}\s*)+/g,
    )!.map(($) => $.replace(/\s+/g, "")),
  })),
  fetch(
    "https://raw.githubusercontent.com/floodyberry/poly1305-donna/e6ad6e091d30d7f4ec2d4f978be1fcfcbce72781/poly1305-donna.c",
  ).then(($) => $.text()),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/9261e367c14fb762ae28dda9bb5e84b606cdc2fc/testvectors_v1/xchacha20_poly1305_test.json",
  ).then<{
    testGroups: {
      ivSize: number;
      tests: {
        key: string;
        iv: string;
        aad: string;
        msg: string;
        ct: string;
        tag: string;
        result: "valid" | "invalid";
      }[];
    }[];
  }>(($) => $.json()),
]).then(([rfc8439, xchacha, donna, wycheproof]) => ({
  chacha: rfc8439([
    [17603, 19535],
    /Key = (?<key>.+?)\..*?Nonce = \((?<iv>.+?)\).*?Count = (?<count>\d+).*?Block:\n(?<state>.+)\n\n/s,
  ], [
    [35223, 36189],
    /Key:\n(?<key>.+?)\n\n.*?Nonce:\n(?<iv>.+?)\n\n(?<count>).*?Output bytes:\n(?<state>.+?)\n\n/s,
  ], [
    [57774, 62180],
    /Key:\n(?<key>.+?)\n\n.*?Nonce:\n(?<iv>.+?)\n\n.*?Counter = (?<count>\d+)\n.*?Keystream:\n(?<state>.+?)\n\n/gs,
  ], [
    [78677, 80251],
    /Key:?\n(?<key>.+?)\n\n.*?nonce:\n(?<iv>.+?)\n\n(?<count>).*?key:\n(?<state>.+?)\n\n/gs,
  ]),
  hchacha: [{
    key: xchacha["2.2.1"][0],
    iv: xchacha["2.2.1"][1],
    subkey: xchacha["2.2.1"][2],
  }],
  xor: rfc8439([
    [22184, 26014],
    /Key = (?<key>.+?)\..*?Nonce = \((?<iv>.+?)\).*?Counter = (?<count>\d+).*?Plaintext Sunscreen:\n(?<plaintext>.+?)\n\n.*?Ciphertext Sunscreen:\n(?<ciphertext>.+?)\n\n/s,
  ], [
    [62351, 69083],
    /Key:\n(?<key>.+?)\n\n.*?Nonce:\n(?<iv>.+?)\n\n.*?Counter = (?<count>\d+)\n\n.*?Plaintext:\n(?<plaintext>.+?)\n\n.*?Ciphertext:\n(?<ciphertext>.+?)\n\n/gs,
  ]),
  cipher: [{
    plaintext: xchacha["A.3.2.1"][0],
    key: xchacha["A.3.2.1"][1],
    iv: xchacha["A.3.2.1"][2],
    keystream: xchacha["A.3.2.1"][3],
    ciphertext: xchacha["A.3.2.1"][4],
  }],
  poly: [
    ...rfc8439([
      [30257, 32670],
      /Key Material: (?<key>.+?\n.+?)\n.*?Message to be Authenticated:\n(?<message>.+?)\n\n.*?Tag: (?<tag>.+)/s,
    ], [
      [69083, 75560],
      /Key:\n(?<key>.+?)\n\n.*?Text to MAC:\n(?<message>.+?)\n\n.*?Tag:\n(?<tag>.+?)\n\n/gs,
    ], [
      [75560, 78677],
      /R:\n(?<key>.+?)\s*data:\n(?<message>.+?)\s*tag:\n(?<tag>.+?)\n/gs,
    ]),
    ...Array.from(
      donna.slice(2098, 5823).matchAll(
        /key\[32\] = \{(.+?)\};.+?msg\[\d+\] = \{(.+?)\};.+?mac\[16\] = \{(.+?)\};/gs,
      ).map((match) =>
        match.slice(1).map(($) => $.match(/(?<=0x)[\da-f]{2}\b/g)!.join(""))
      ),
      ([key, message, tag]) => ({ key, message, tag }),
    ),
  ],
  ...[
    {
      key: xchacha["A.3.1"][2],
      iv: xchacha["A.3.1"][3],
      plaintext: xchacha["A.3.1"][0],
      ad: xchacha["A.3.1"][1],
      ciphertext: xchacha["A.3.1"][5],
      tag: xchacha["A.3.1"][6],
      result: true,
    },
    ...wycheproof.testGroups.flatMap((group) =>
      group.ivSize !== 192 ? [] : group.tests.map(($) => ({
        key: $.key,
        iv: $.iv,
        plaintext: $.msg,
        ad: $.aad,
        ciphertext: $.ct,
        tag: $.tag,
        result: $.result === "valid",
      }))
    ),
  ].reduce<{ [_: string]: { [_: string]: string | boolean }[] }>(
    (to, $) => {
      if ($.result) {
        const { result: _, ...rest } = $;
        to.xchachaPoly.push(rest);
      }
      to.polyXchacha.push($);
      return to;
    },
    { xchachaPoly: [], polyXchacha: [] },
  ),
})).then(($) =>
  Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
);
