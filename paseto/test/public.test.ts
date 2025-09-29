import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { generate } from "@libn/25519";
import { fc_assert, fc_bin, read } from "@libn/lib";
import { set_use } from "../src/key.ts";
import { de_public, en_public } from "../src/public.ts";
import { regex } from "../src/common.ts";
import { fc_wrong_use, unique } from "./common.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("en_public/de_public : spec", () =>
  read(vectors.public.spec).forEach(($) => {
    const token = de_public(
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
      assertEquals(token, { body: $.body, foot: $.foot });
    } else assert(!token);
  }));
Deno.test("en_public/de_public : wrong-use keys", () =>
  fc_assert(
    fc_wrong_use(["local", "public"]),
    fc_wrong_use(["local", "secret"]),
    fc_bin(),
    fc.stringMatching(regex("v4.public.")),
  )((secret_key, public_key, body, token) =>
    !en_public(secret_key as any, body) &&
    !de_public(public_key as any, token)
  ));

Deno.test("en_public/de_public : arbitrary round-trip", () =>
  fc_assert(
    fc.uniqueArray(fc_bin(32).map(($) => set_use("secret", $)), unique),
    fc_bin(),
    fc.option(fc_bin(), { nil: undefined }),
    fc.option(fc_bin(), { nil: undefined }),
  )(([key, wrong_key], body, foot, assertion) => {
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
  }));
