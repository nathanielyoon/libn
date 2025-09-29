import { assertEquals } from "@std/assert";
import { crypto } from "@std/crypto";
import { fc_assert, fc_bin, read } from "@libn/lib";
import { sha224, sha256, sha384, sha512 } from "../src/sha2.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("sha224 : nist aft", () =>
  read(vectors.sha2.nist_224).forEach(($) =>
    assertEquals(sha224($.data), $.digest)
  ));
Deno.test("sha256 : nist aft", () =>
  read(vectors.sha2.nist_256).forEach(($) =>
    assertEquals(sha256($.data), $.digest)
  ));
Deno.test("sha384 : nist aft", () =>
  read(vectors.sha2.nist_384).forEach(($) =>
    assertEquals(sha384($.data), $.digest)
  ));
Deno.test("sha512 : nist aft", () =>
  read(vectors.sha2.nist_512).forEach(($) =>
    assertEquals(sha512($.data), $.digest)
  ));
Deno.test("sha224 :: webcrypto", () =>
  fc_assert(fc_bin())(async ($) =>
    assertEquals(
      sha224($),
      new Uint8Array(await crypto.subtle.digest("SHA-224", $)),
    ), { async: true }));
Deno.test("sha256 :: webcrypto", () =>
  fc_assert(fc_bin())(async ($) =>
    assertEquals(
      sha256($),
      new Uint8Array(await crypto.subtle.digest("SHA-256", $)),
    ), { async: true }));
Deno.test("sha384 :: webcrypto", () =>
  fc_assert(fc_bin())(async ($) =>
    assertEquals(
      sha384($),
      new Uint8Array(await crypto.subtle.digest("SHA-384", $)),
    ), { async: true }));
Deno.test("sha512 :: webcrypto", () =>
  fc_assert(fc_bin())(async ($) =>
    assertEquals(
      sha512($),
      new Uint8Array(await crypto.subtle.digest("SHA-512", $)),
    ), { async: true }));
