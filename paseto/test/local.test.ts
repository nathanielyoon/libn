import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { de_bin } from "@libn/base";
import { fc_assert, fc_bin, read } from "@libn/lib";
import { set_use } from "../src/key.ts";
import { regex } from "../src/common.ts";
import { de_local, en_local } from "../src/local.ts";
import { fc_wrong_use, unique } from "./common.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("en_local/de_local : spec", () =>
  read(vectors.local.spec).forEach(($) => {
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
  }));
Deno.test("en_local/de_local : wrong-use keys", () =>
  fc_assert(
    fc_wrong_use(["secret", "public"]),
    fc_bin(),
    fc.stringMatching(regex("v4.local.")),
  )((key, body, token) =>
    !en_local(key as any, body) && !de_local(key as any, token)
  ));
Deno.test("en_local/de_local : arbitrary round-trip", () =>
  fc_assert(
    fc.uniqueArray(fc_bin(32).map(($) => set_use("local", $)), unique),
    fc_bin(),
    fc.option(fc_bin(), { nil: undefined }),
    fc.option(fc_bin(), { nil: undefined }),
  )(([key, wrong_key], body, foot, assertion) => {
    const token = en_local(key, body, foot, assertion);
    assert(token);
    assertEquals(
      de_local(key, token, assertion),
      { body, foot: foot ?? new Uint8Array() },
    );
    assert(!de_local(wrong_key, token, assertion));
    assertion?.length && assert(!de_local(key, token));
  }));
