import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { de_b16, en_b16 } from "../../base/16.ts";
import { get_json, write } from "../../test.ts";
import { verify, x25519 } from "../25519.ts";
import { hkdf, hmac } from "../hash.ts";

Deno.test("x25519", () =>
  import("./vectors/wycheproof.json", { with: { type: "json" } }).then(($) =>
    $.default.x25519.forEach(($) =>
      assertEquals(
        x25519(de_b16($.secret_key), de_b16($.public_key)),
        $.shared_secret && de_b16($.shared_secret),
      )
    )
  ));
Deno.test("ed25519", () =>
  import("./vectors/wycheproof.json", { with: { type: "json" } }).then(($) =>
    $.default.ed25519.forEach(($) =>
      assertEquals(
        verify(de_b16($.public_key), de_b16($.data), de_b16($.signature)),
        $.result,
      )
    )
  ));
Deno.test("hmac", () =>
  import("./vectors/wycheproof.json", { with: { type: "json" } }).then(($) =>
    $.default.hmac.forEach(($) =>
      assertEquals(
        en_b16(
          hmac(de_b16($.key), de_b16($.data)).subarray(0, $.tag.length >> 1),
        ) === $.tag,
        $.result,
      )
    )
  ));
Deno.test("hkdf", () =>
  import("./vectors/wycheproof.json", { with: { type: "json" } }).then(($) =>
    $.default.hkdf.forEach(($) =>
      assertEquals(
        hkdf(de_b16($.key), de_b16($.info), de_b16($.salt), $.out),
        de_b16($.derived),
      )
    )
  ));

import.meta.main && await Promise.all([
  ["x25519", ($: {
    tests: { private: string; public: string; shared: string }[];
  }) =>
    $.tests.map((test) => ({
      secret_key: test.private,
      public_key: test.public,
      shared_secret: test.shared,
    }))] as const,
  ["ed25519", ($: {
    publicKey: { pk: string };
    tests: { msg: string; sig: string; result: "valid" | "invalid" }[];
  }) =>
    $.tests.map((test) => ({
      public_key: $.publicKey.pk,
      data: test.msg,
      signature: test.sig,
      result: test.result === "valid",
    }))] as const,
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
    }))] as const,
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
    }))] as const,
].map(([name, get]) =>
  get_json(
    `raw.githubusercontent.com/C2SP/wycheproof/df4e933efef449fc88af0c06e028d425d84a9495/testvectors_v1/${name}_test.json`,
  ).then(($) => $.testGroups.flatMap(get))
)).then(write(import.meta, ["x25519", "ed25519", "hmac", "hkdf"]));
