import { expect } from "@std/expect/expect";
import fc from "fast-check";
import { chacha, xor } from "@libn/aead/chacha";
import { poly } from "@libn/aead/poly";
import { polyxchacha, xchachapoly } from "@libn/aead/aead";
import { cipher, decrypt, encrypt } from "@libn/aead";

const fcRight = ($: number) => fc.uint8Array({ minLength: $, maxLength: $ });
const fcWrong = ($: number) =>
  fc.oneof(
    fc.uint8Array({ minLength: $ + 1 }),
    fc.uint8Array({ maxLength: $ - 1 }),
  );
const fcWrongLength = <const A extends number[]>(...lengths: A) =>
  fc.oneof(...Array.from(lengths, (_, index) =>
    fc.tuple(
      ...lengths.map(($, z) => z !== index ? fcRight($) : fcWrong($)),
    ) as fc.Arbitrary<{ [_ in keyof A]: Uint8Array<ArrayBuffer> }>));
Deno.test("xchachapoly() rejects wrong-size arguments", () =>
  fc.assert(fc.property(fcWrongLength(32, 24), ($) => {
    expect(xchachapoly(...$, new Uint8Array(), new Uint8Array())).toBeNull();
  })));
Deno.test("polyxchacha() rejects wrong-size arguments", () =>
  fc.assert(fc.property(fcWrongLength(32, 24, 16), ($) => {
    expect(polyxchacha(...$, new Uint8Array(), new Uint8Array())).toBeNull();
  })));
Deno.test("encrypt() rejects wrong-size arguments", () =>
  fc.assert(fc.property(fcWrongLength(32), ($) => {
    expect(encrypt(...$, new Uint8Array())).toBeNull();
  })));
Deno.test("decrypt() rejects wrong-size arguments", () => {
  fc.assert(fc.property(fcWrongLength(32), ($) => {
    expect(decrypt(...$, new Uint8Array(40))).toBeNull();
  }));
  fc.assert(fc.property(
    fc.uint8Array({ minLength: 32, maxLength: 32 }),
    fc.uint8Array({ maxLength: 39 }),
    (key, text) => {
      expect(decrypt(key, text)).toBeNull();
    },
  ));
});
Deno.test("encrypt()", () =>
  fc.assert(fc.property(
    fcRight(32),
    fc.uint8Array(),
    fc.uint8Array(),
    (key, plaintext, data) => {
      const textWithAd = encrypt(key, plaintext, data);
      expect(textWithAd).not.toBeNull();
      expect(decrypt(key, textWithAd!, data)).toStrictEqual(plaintext);
      const textWithoutAd = encrypt(key, plaintext);
      expect(textWithoutAd).not.toBeNull();
      expect(decrypt(key, textWithoutAd!)).toStrictEqual(plaintext);
    },
  )));
const key = ($: string) => new Uint32Array(Uint8Array.fromHex($).buffer);
const iv = ($: string) =>
  [...new Uint32Array(Uint8Array.fromHex($).buffer)] as [
    number,
    number,
    number,
  ];
Deno.test("vectors", async (t) => {
  const vectors = await import("./vectors.json", { with: { type: "json" } });
  await t.step("chacha", () =>
    vectors.default.chacha.forEach(($) => {
      const state = new Uint32Array(16);
      chacha(key($.key), $.count, ...iv($.iv), state);
      expect(
        new Uint8Array(state.buffer).subarray(0, $.state.length >> 1),
      ).toStrictEqual(Uint8Array.fromHex($.state));
    }));
  await t.step("xor", () =>
    vectors.default.xor.forEach(($) => {
      const plaintext = Uint8Array.fromHex($.plaintext);
      xor(key($.key), ...iv($.iv), plaintext, $.count);
      expect(plaintext).toStrictEqual(Uint8Array.fromHex($.ciphertext));
    }));
  await t.step("poly", () =>
    vectors.default.poly.forEach(($) => {
      expect(poly(key($.key), Uint8Array.fromHex($.message))).toStrictEqual(
        Uint8Array.fromHex($.tag),
      );
    }));
  await t.step("aead", () =>
    vectors.default.aead.forEach(($) => {
      const key = Uint8Array.fromHex($.key);
      const iv = Uint8Array.fromHex($.iv);
      const plaintext = Uint8Array.fromHex($.plaintext);
      const ciphertext = Uint8Array.fromHex($.ciphertext);
      const ad = Uint8Array.fromHex($.ad);
      const tag = Uint8Array.fromHex($.tag);
      if ($.result !== false) {
        const text = new Uint8Array(plaintext);
        expect(xchachapoly(key, iv, text, ad)).toStrictEqual(tag);
        expect(text).toStrictEqual(ciphertext);
        expect(polyxchacha(key, iv, tag, text, ad)).toStrictEqual(true);
        expect(text).toStrictEqual(plaintext);
      } else {
        expect(polyxchacha(key, iv, tag, ciphertext, ad)).toStrictEqual(false);
      }
    }));
  await t.step("cipher", () =>
    vectors.default.cipher.forEach(($) => {
      const key = Uint8Array.fromHex($.key);
      const iv = Uint8Array.fromHex($.iv);
      const plaintext = Uint8Array.fromHex($.plaintext);
      const text = new Uint8Array(plaintext.length);
      cipher(key, iv, text);
      expect(text).toStrictEqual(Uint8Array.fromHex($.keystream));
      text.set(plaintext);
      cipher(key, iv, text);
      expect(text).toStrictEqual(Uint8Array.fromHex($.ciphertext));
    }));
});
const trim = ($: string) =>
  $.match(
    /(?<=(?:^|\b0x|\W)(?:[\da-f]{2})*)[\da-f]{2}(?=(?:[\da-f]{2})*(?:\W|$))/g,
  )?.join("") ?? "";
const into = <A extends string[], B>(keys: A, $: B[]) => {
  const size = keys.length, out = Array($.length / size);
  for (let at, target: { [key: string]: any }, z = 0, y; z < out.length; ++z) {
    at = z * size, target = out[z] = {}, y = 0;
    do if (keys[y]) target[keys[y]] = $[at + y]; while (++y < size);
  }
  return out;
};
const sections = <A extends string[]>(from: string[][], keys: A) =>
  Array.from(
    from.map(($) => {
      const size = keys.length + 1, out = Array($.length / size);
      for (let at, temp: { [_: string]: any }, z = 0, y; z < out.length; ++z) {
        at = z * size, temp = out[z] = {}, y = 1;
        do temp[keys[y - 1]] = $[at + y]; while (++y < size);
      }
      return out;
    }),
    ([{ count, ...$ }]) => ({
      ...(count === undefined ? {} : { count: Number(count) }),
      ...Object.keys($).reduce((to, key) => ({
        ...to,
        [key]: String($[key]).match(
          /(?<=^|[\da-f]{2}[\s(:])[\da-f]{2}(?=[\s.):]|$)|(?<=^|[\s(:])[\da-f]{2}(?=[\s.):][\da-f]{2}|$)/g,
        )?.join("") ?? "",
      }), {}),
    }),
  );
import.meta.main && await Promise.all([
  fetch("https://www.rfc-editor.org/rfc/rfc8439.txt").then(($) => $.text()),
  fetch("https://www.ietf.org/archive/id/draft-irtf-cfrg-xchacha-03.txt").then(
    ($) => $.text(),
  ),
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
  chacha: sections([
    rfc8439.slice(17603, 19535).match(
      /Key = (.+?)\..*?Nonce = \((.+?)\).*?Count = (\d+).*?Block:\n(.+)\n\n/s,
    )!,
    ...rfc8439.slice(57774, 62180).matchAll(
      /Key:\n(.+?)\n\n.*?Nonce:\n(.+?)\n\n.*?Counter = (\d+)\n.*?Keystream:\n(.+?)\n\n/gs,
    ),
  ], ["key", "iv", "count", "state"]).concat(
    sections([
      rfc8439.slice(35223, 36189).match(
        /Key:\n(.+?)\n\n.*?Nonce:\n(.+?)\n\n.*?Output bytes:\n(.+?)\n\n/s,
      )!,
      ...rfc8439.slice(78677, 80251).matchAll(
        /Key:?\n(.+?)\n\n.*?nonce:\n(.+?)\n\n.*?key:\n(.+?)\n\n/gs,
      ),
    ], ["key", "iv", "state"]).map(($) => ({ ...$, count: 0 })),
  ),
  xor: sections([
    rfc8439.slice(22184, 26014).match(
      /Key = (.+?)\..*?Nonce = \((.+?)\).*?Counter = (\d+).*?Plaintext Sunscreen:\n(.+?)\n\n.*?Ciphertext Sunscreen:\n(.+?)\n\n/s,
    )!,
    ...rfc8439.slice(62351, 69083).matchAll(
      /Key:\n(.+?)\n\n.*?Nonce:\n(.+?)\n\n.*?Counter = (\d+)\n\n.*?Plaintext:\n(.+?)\n\n.*?Ciphertext:\n(.+?)\n\n/gs,
    ),
  ], ["key", "iv", "count", "plaintext", "ciphertext"]),
  cipher: into(
    ["plaintext", "key", "iv", "keystream", "ciphertext"],
    xchacha.slice(31876, 34302).match(/(?:[\da-f]{32,}\s*)+/g)!.map(trim),
  ),
  poly: sections([
    rfc8439.slice(30257, 32670).replace(/(:0)\n {6}(3:)/, "$1$2").match(
      /Key Material: (.+?)\n.*?Message to be Authenticated:\n(.+?)\n\n.*?Tag: (.+)/s,
    )!,
    ...rfc8439.slice(69083, 75560).matchAll(
      /Key:\n(.+?)\n\n.*?Text to MAC:\n(.+?)\n\n.*?Tag:\n(.+?)\n\n/gs,
    ),
    ...rfc8439.slice(75560, 78677).toLowerCase().matchAll(
      /r:\n(.+?)\s*s:\n(.+?)\s*data:\n(.+?)\s*tag:\n(.+?)\n/gs,
    ).map(($) => [$[0], $[1] + $[2], $[3], $[4]]),
  ], ["key", "message", "tag"]).concat(Array.from(
    donna.matchAll(
      /key\[32\] = \{(.+?)\};.+?msg\[\d+\] = \{(.+?)\};.+?mac\[16\] = \{(.+?)\};/gs,
    ),
    ($) => into(["", "key", "message", "tag"], $.map(trim))[0],
  )),
  aead: wycheproof.testGroups.flatMap((group) =>
    group.ivSize !== 192 ? [] : group.tests.map(($) => ({
      key: $.key,
      iv: $.iv,
      plaintext: $.msg,
      ad: $.aad,
      ciphertext: $.ct,
      tag: $.tag,
      result: $.result === "valid",
    }))
  ).concat(into(
    ["plaintext", "ad", "key", "iv", "", "ciphertext", "tag"],
    xchacha.slice(30715, 31722).match(/(?:[\da-f]{24,}\s*)+/g)!.map(trim),
  )),
})).then(($) =>
  Deno.writeTextFile(
    new URL(import.meta.resolve("./vectors.json")).pathname,
    JSON.stringify($),
  )
);
