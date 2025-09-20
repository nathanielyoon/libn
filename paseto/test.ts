import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_binary, fc_check, read } from "@libn/lib";
import { de_bin, en_bin } from "@libn/base";
import {
  is_local,
  is_public,
  is_secret,
  set_use,
  type Use,
} from "./src/key.ts";
import { pae, regex } from "./src/common.ts";
import { de_local, en_local } from "./src/local.ts";
import { de_public, en_public } from "./src/public.ts";
import vectors from "./vectors.json" with { type: "json" };
import { generate } from "@libn/25519";

Deno.test("key", async ({ step }) => {
  for (
    const [use, is] of [
      ["local", is_local],
      ["secret", is_secret],
      ["public", is_public],
    ] as const
  ) {
    await step(`is_${use} : validate`, () => {
      const set = set_use.bind(null, use);
      fc_check(fc.property(fc_binary(32).map(set), is));
      fc_check(fc.property(
        fc.oneof(
          fc_binary({ maxLength: 31 }).map(set),
          fc_binary({ minLength: 33 }).map(set),
          fc_binary(32),
        ),
        ($) => !is($),
      ));
    });
  }
});
Deno.test("common", async ({ step }) => {
  await step("pae : spec examples", () => {
    for (const $ of read(vectors.common.pae)) {
      assertEquals(pae(...$.pieces.map(en_bin)), $.output);
    }
  });
});
const fc_wrong_use = (wrong: Use[]) =>
  fc.tuple(fc.option(fc.constantFrom(...wrong)), fc_binary(32)).map((
    [use, key],
  ) => use ? set_use(use, key) : key);
const unique: fc.UniqueArrayConstraintsCustomCompare<Uint8Array> = {
  minLength: 2,
  maxLength: 2,
  comparator: (one, two) => {
    for (let z = 0; z < 32; ++z) if (one[z] !== two[z]) return false;
    return true;
  },
};
Deno.test("local", async ({ step }) => {
  await step("en_local/de_local : spec", () => {
    for (const $ of read(vectors.local.spec)) {
      const key = set_use("local", $.key);
      const maybe = de_local(key, $.token[0], $.assertion);
      if ($.result) {
        const body = $.body, foot = $.foot;
        // Force randomly-generated nonce to match the test vector.
        const { getRandomValues } = crypto;
        crypto.getRandomValues = (buffer) => (
          buffer instanceof Uint8Array && buffer.set($.nonce), buffer
        );
        assertEquals(en_local(key, body, foot, $.assertion), $.token[0]);
        crypto.getRandomValues = getRandomValues;
        assertEquals(maybe, { body, foot });
      } else {
        assert(
          !maybe || +new Date(JSON.parse(de_bin(maybe.body)).exp) < Date.now(),
        );
      }
    }
  });
  await step("en_local/de_local : wrong-use keys", () => {
    fc_check(fc.property(
      fc_wrong_use(["secret", "public"]),
      fc_binary(),
      fc.stringMatching(regex("v4.local.")),
      (key, body, token) =>
        !en_local(key as any, body) && !de_local(key as any, token),
    ));
  });
  await step("en_local/de_local : arbitrary round-trip", () => {
    fc_check(fc.property(
      fc.uniqueArray(fc_binary(32).map(($) => set_use("local", $)), unique),
      fc_binary(),
      fc.option(fc_binary(), { nil: undefined }),
      fc.option(fc_binary(), { nil: undefined }),
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
    ));
  });
});
Deno.test("public", async ({ step }) => {
  await step("en_public/de_public : spec", () => {
    for (const $ of read(vectors.public.spec)) {
      const maybe = de_public(
        set_use("public", $.public_key),
        $.token[0],
        $.assertion,
      );
      if ($.result) {
        assertEquals(
          en_public(
            set_use("secret", $.secret_key),
            $.body,
            $.foot,
            $.assertion,
          ),
          $.token[0],
        );
        assertEquals(maybe, { body: $.body, foot: $.foot });
      } else assert(!maybe);
    }
  });
  await step("en_public/de_public : wrong-use keys", () => {
    fc_check(fc.property(
      fc_wrong_use(["local", "public"]),
      fc_wrong_use(["local", "secret"]),
      fc_binary(),
      fc.stringMatching(regex("v4.public.")),
      (secret_key, public_key, body, token) =>
        !en_public(secret_key as any, body) &&
        !de_public(public_key as any, token),
    ));
  });
  fc_check(fc.property(
    fc.uniqueArray(fc_binary(32).map(($) => set_use("secret", $)), unique),
    fc_binary(),
    fc.option(fc_binary(), { nil: undefined }),
    fc.option(fc_binary(), { nil: undefined }),
    ([key, wrong_key], body, foot, assertion) => {
      const token = en_public(key, body, foot, assertion);
      assert(token);
      assertEquals(
        de_public(set_use("public", generate(key)), token, assertion),
        { body, foot: foot ?? new Uint8Array() },
      );
      assert(
        !de_public(set_use("public", generate(wrong_key)), token, assertion),
      );
      assertion?.length &&
        assert(!de_public(set_use("public", generate(key)), token));
    },
  ));
});
