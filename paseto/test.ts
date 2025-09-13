import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_bin, fc_check, fc_key } from "../test.ts";
import { de_b16, de_bin } from "@libn/base";
import {
  is_local,
  is_public,
  is_secret,
  make_local,
  make_public,
  pae,
  regex,
} from "./src/common.ts";
import { de_local, en_local } from "./src/local.ts";
import { de_public, en_public } from "./src/public.ts";
import vectors from "./vectors.json" with { type: "json" };
import { generate } from "@libn/25519";

Deno.test("pae matches spec examples", () =>
  vectors.pae.forEach(({ pieces, output }) =>
    assertEquals(pae(...pieces.map(de_b16)), de_b16(output))
  ));
Deno.test("is_local/is_secret/is_public validate correctly", () => {
  fc_check(fc.property(
    fc.oneof(fc_key, fc.constant(undefined)).map(make_local),
    is_local,
  ));
  const fc_wrong_length = fc.oneof(
    fc_bin({ maxLength: 31 }),
    fc_bin({ minLength: 33 }),
  );
  fc_check(fc.property(
    fc.oneof(fc_wrong_length.map(make_local), fc_bin()),
    ($) => !is_local($),
  ));
  fc_check(fc.property(
    fc.oneof(fc_key, fc.constant(undefined)).map(make_public),
    ($) =>
      is_secret($.secret_key) && !is_public($.secret_key) &&
      is_public($.public_key) && !is_secret($.public_key),
  ));
  fc_check(fc.property(
    fc.oneof(
      fc_wrong_length.map(make_public).map(($) => ({
        secret_key: $.secret_key.subarray(1),
        public_key: $.public_key.subarray(1),
      })),
      fc.record({ secret_key: fc_bin(), public_key: fc_bin() }),
    ),
    ($) =>
      !is_secret($.secret_key) && !is_public($.secret_key) &&
      !is_secret($.public_key) && !is_public($.public_key),
  ));
});
Deno.test("en_local/de_local match spec", () =>
  vectors.spec.local.forEach(($) => {
    const key = make_local(de_b16($.key)), assertion = de_b16($.assertion);
    const maybe = de_local(key, $.token, assertion);
    if ($.result) {
      const body = de_b16($.body), foot = de_b16($.foot);
      // Forces randomly-generated nonce to match the test vector.
      const { getRandomValues } = crypto;
      crypto.getRandomValues = (buffer) => (
        buffer instanceof Uint8Array && buffer.set(de_b16($.nonce)), buffer
      );
      assertEquals(en_local(key, body, foot, assertion), $.token);
      crypto.getRandomValues = getRandomValues;
      assertEquals(maybe, { body, foot });
    } else {
      assert(
        !maybe || +new Date(JSON.parse(de_bin(maybe.body)).exp) < Date.now(),
      );
    }
  }));
Deno.test("en_public/de_public match spec", () =>
  vectors.spec.public.forEach(($) => {
    const { secret_key, public_key } = make_public(de_b16($.secret_key));
    assertEquals(public_key, de_b16($.public_key));
    const assertion = de_b16($.assertion);
    const maybe = de_public(public_key, $.token, assertion);
    if ($.result) {
      const body = de_b16($.body), foot = de_b16($.foot);
      assertEquals(en_public(secret_key, body, foot, assertion), $.token);
      assertEquals(maybe, { body, foot });
    } else assert(!maybe);
  }));
Deno.test("en_local/de_local reject wrong-use keys", () =>
  fc_check(fc.property(
    fc_key,
    fc_bin(),
    fc.stringMatching(regex("v4.local.")),
    (key, body, token) =>
      !en_local(key as any, body) && !de_local(key as any, token),
  )));
Deno.test("en_public/de_public reject wrong-use keys", () =>
  fc_check(fc.property(
    fc_key.map(($) => ({ secret_key: $, public_key: generate($) })),
    fc_bin(),
    fc.stringMatching(regex("v4.public.")),
    ({ secret_key, public_key }, message, token) =>
      !en_public(secret_key as any, message) &&
      !de_public(public_key as any, token),
  )));
Deno.test("en_local/de_local round-trip losslessly", () =>
  fc_check(fc.property(
    fc.uniqueArray(fc_key.map(make_local), {
      minLength: 2,
      maxLength: 2,
      comparator: (one, two) => {
        for (let z = 0; z < 32; ++z) if (one[z] !== two[z]) return false;
        return true;
      },
    }),
    fc_bin(),
    fc.option(fc_bin(), { nil: undefined }),
    fc.option(fc_bin(), { nil: undefined }),
    ([key, wrong_key], body, foot, assertion) => {
      const token = en_local(key, body, foot, assertion);
      assert(token);
      assertEquals(
        de_local(key, token, assertion),
        { body, foot: foot ?? new Uint8Array() },
      );
      assert(!de_local(wrong_key, token, assertion));
      assertion?.length && assert(!de_local(key, token));
    },
  )));
Deno.test("en_public/de_public round-trip losslessly", () =>
  fc_check(fc.property(
    fc.uniqueArray(fc_key.map(make_public), {
      minLength: 2,
      maxLength: 2,
      comparator: ({ public_key: one }, { public_key: two }) => {
        for (let z = 0; z < 32; ++z) if (one[z] !== two[z]) return false;
        return true;
      },
    }),
    fc_bin(),
    fc.option(fc_bin(), { nil: undefined }),
    fc.option(fc_bin(), { nil: undefined }),
    ([keys, wrong_keys], body, foot, assertion) => {
      const token = en_public(keys.secret_key, body, foot, assertion);
      assert(token);
      assert(!de_public(wrong_keys.public_key, token, assertion));
      assertion?.length && assert(!de_public(keys.public_key, token));
    },
  )));
