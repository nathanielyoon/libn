import { assertEquals, assertNotEquals } from "@std/assert";
import { crypto } from "@std/crypto";
import fc from "fast-check";
import { fc_assert, fc_bin, read } from "@libn/lib";
import { b2b, b2s } from "../src/blake2.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("b2s : reference", () =>
  read(vectors.blake2.reference_s).forEach(($) =>
    assertEquals(b2s($.in, $.key, $.hash.length), $.hash)
  ));
Deno.test("b2b : reference", () =>
  read(vectors.blake2.reference_b).forEach(($) =>
    assertEquals(b2b($.in, $.key, $.hash.length), $.hash)
  ));
Deno.test("b2s :: webcrypto", () =>
  fc_assert(fc_bin())(async ($) =>
    assertEquals(
      b2s($),
      new Uint8Array(await crypto.subtle.digest("BLAKE2S", $)),
    ), { async: true }));
Deno.test("b2b :: webcrypto", () =>
  fc_assert(fc_bin())(async ($) =>
    assertEquals(
      b2b($),
      new Uint8Array(await crypto.subtle.digest("BLAKE2B", $)),
    ), { async: true }));
Deno.test("blake2s/blake2b track long inputs", () =>
  ([
    [25, b2s.create, b2s.update, b2s.digest],
    [49, b2b.create, b2b.update, b2b.digest],
  ] as const).forEach(([offset, create, update, digest]) => {
    const one = create().fill(-1, offset, -2);
    assertNotEquals(
      digest(update(one, new Uint8Array(1))),
      digest(update(one.with(-2, 1), new Uint8Array(1))),
    );
  }));
Deno.test("blake2s/blake2b clamp key/output lengths", () =>
  ([[32, b2s], [64, b2b]] as const).forEach(([size, hash]) =>
    fc_assert(fc_bin(), fc_bin({ minLength: size }), fc.nat({ max: size }))(
      (input, key, length) => {
        assertEquals(hash(input, key), hash(input, key.subarray(0, size)));
        const keyed = hash.bind(null, input, key);
        assertEquals(keyed(), keyed(size));
        assertEquals(keyed(length + size), keyed(size));
        assertEquals(keyed(-length), keyed(-length >>> 0 || 1));
      },
    )
  ));
