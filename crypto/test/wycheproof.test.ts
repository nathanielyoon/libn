import { assert, assertEquals } from "jsr:@std/assert@^1.0.14";
import { de_b16, en_b16 } from "../../base/main.ts";
import { get_json, write } from "../../test.ts";
import { verify, x25519 } from "../25519.ts";
import { hkdf, hmac } from "../hash.ts";
import { polyxchacha, xchachapoly } from "../aead.ts";

Deno.test("wycheproof", async ($) => {
  const { default: vectors } = await import("./vectors/wycheproof.json", {
    with: { type: "json" },
  });
  await $.step("x25519", () =>
    vectors.x25519.forEach(($) =>
      assertEquals(
        x25519(de_b16($.secret_key), de_b16($.public_key)),
        $.shared_secret && de_b16($.shared_secret),
      )
    ));
  await $.step("ed25519", () =>
    vectors.ed25519.forEach(($) =>
      assertEquals(
        verify(de_b16($.public_key), de_b16($.data), de_b16($.signature)),
        $.result,
      )
    ));
  await $.step("hmac", () =>
    vectors.hmac.forEach(($) =>
      assertEquals(
        en_b16(
          hmac(de_b16($.key), de_b16($.data)).subarray(0, $.tag.length >> 1),
        ) === $.tag,
        $.result,
      )
    ));
  await $.step("hkdf", () =>
    vectors.hkdf.forEach(($) =>
      assertEquals(
        hkdf(de_b16($.key), de_b16($.info), de_b16($.salt), $.out),
        de_b16($.derived),
      )
    ));
  await $.step("aead", () =>
    vectors.aead.forEach(($) => {
      const key = de_b16($.key), iv = de_b16($.iv);
      const raw = de_b16($.raw), data = de_b16($.data);
      const ct_and_tag = xchachapoly(key, iv, raw, data);
      if (ct_and_tag) {
        if ($.result) {
          assertEquals(ct_and_tag, de_b16($.ct_and_tag));
          assertEquals(polyxchacha(key, iv, ct_and_tag, data), raw);
        } else assert(!polyxchacha(key, iv, de_b16($.ct_and_tag), data));
      } else assert(!$.result);
    }));
});

import.meta.main && await Promise.all([
  ["x25519", ($: {
    tests: { private: string; public: string; shared: string }[];
  }) =>
    $.tests.map((test) => ({
      secret_key: test.private,
      public_key: test.public,
      shared_secret: test.shared,
    }))],
  ["ed25519", ($: {
    publicKey: { pk: string };
    tests: { msg: string; sig: string; result: "valid" | "invalid" }[];
  }) =>
    $.tests.map((test) => ({
      public_key: $.publicKey.pk,
      data: test.msg,
      signature: test.sig,
      result: test.result === "valid",
    }))],
  ["hmac_sha256", ($: {
    tests: {
      key: string;
      msg: string;
      tag: string;
      result: "valid" | "invalid";
    }[];
  }) =>
    $.tests.map(($) => ({
      key: $.key,
      data: $.msg,
      tag: $.tag,
      result: $.result === "valid",
    }))],
  ["hkdf_sha256", ($: {
    tests: {
      ikm: string;
      salt: string;
      info: string;
      size: number;
      okm: string;
      result: "valid" | "invalid";
    }[];
  }) =>
    $.tests.map(($) => ({
      key: $.ikm,
      info: $.info,
      salt: $.salt,
      out: $.size,
      derived: $.result === "valid" ? $.okm : "",
    }))],
  ["xchacha20_poly1305", ($: {
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
  }) =>
    $.ivSize !== 192 ? [] : $.tests.map(($) => ({
      key: $.key,
      iv: $.iv,
      raw: $.msg,
      data: $.aad,
      ct_and_tag: $.ct + $.tag,
      result: $.result === "valid",
    }))],
].map(([name, get]) =>
  get_json(
    `raw.githubusercontent.com/C2SP/wycheproof/df4e933efef449fc88af0c06e028d425d84a9495/testvectors_v1/${name}_test.json`,
  ).then(($) => $.testGroups.flatMap(get))
)).then(write(import.meta, ["x25519", "ed25519", "hmac", "hkdf", "aead"]));
