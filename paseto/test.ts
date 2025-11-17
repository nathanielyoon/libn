import { generate } from "@libn/ecc/ed25519";
import { deLocal, enLocal, keyLocal } from "@libn/paseto/local4";
import { dePublic, enPublic, keyPublic, keySecret } from "@libn/paseto/public4";
import { deUtf8, enUtf8 } from "@libn/utf";
import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fcBin } from "../test.ts";
import { keyer, pae, USE, type Use } from "./lib.ts";
import vectors from "./vectors.json" with { type: "json" };

const wrong = (uses: Use[]) => (key: Uint8Array): fc.Arbitrary<any> =>
  fc.constantFrom(key, ...uses.map((use) => keyer(use)(key)));
const fcRight = <A extends Use>(use: A) =>
  fc.uniqueArray(fcBin(32).map(keyer(use)), {
    minLength: 2,
    maxLength: 2,
    comparator: (one, two) => {
      for (let z = 0; z < 32; ++z) if (one[z] !== two[z]) return false;
      return true;
    },
  });
const fcMaybe = <A>($: fc.Arbitrary<A>) =>
  fc.option($, { nil: undefined, freq: 2 });

Deno.test("lib.pae : vectors", () => {
  for (const $ of vectors.pae) {
    assertEquals(pae($.pieces.map(enUtf8)), enUtf8($.output));
  }
});
Deno.test("local : vectors", () => {
  for (const $ of vectors.local) {
    const key = keyLocal(Uint8Array.fromHex($.key));
    const assertion = enUtf8($.assertion);
    const token = deLocal(key, $.token, assertion);
    if ($.result) {
      const payload = enUtf8($.payload);
      const footer = enUtf8($.footer);
      const { getRandomValues } = crypto;
      crypto.getRandomValues = (buffer) => (
        buffer instanceof Uint8Array &&
        buffer.set(Uint8Array.fromHex($.nonce)), buffer
      );
      assertEquals(enLocal(key, payload, footer, assertion), $.token);
      crypto.getRandomValues = getRandomValues;
      assertEquals(token, { payload, footer });
    } else if (token) {
      assert(+new Date(JSON.parse(deUtf8(token.payload)).exp) < Date.now());
    }
  }
});
Deno.test("local.keyLocal : arbitrary key", () => {
  fc.assert(fc.property(fcMaybe(fcBin()), ($) => {
    const key = keyLocal($);
    assertEquals(key.length, 32);
    assertEquals(key[USE], "local");
    $ && assertEquals(key.subarray(0, $.length), $.subarray(0, 32));
  }));
});
Deno.test("local.enLocal : wrong-use key", () => {
  fc.assert(fc.property(
    fcBin(32).chain(wrong(["secret", "public"])),
    fcBin(),
    (key, payload) => {
      assertEquals(enLocal(key, payload), null);
    },
  ));
});
Deno.test("local.deLocal : wrong-use key", () => {
  fc.assert(fc.property(
    fcBin().chain(wrong(["secret", "public"])),
    fcBin(),
    (key, payload) => {
      const token = enLocal(keyLocal(key), payload);
      assert(token);
      assertEquals(deLocal(key, token), null);
    },
  ));
});
Deno.test("local : arbitrary binary", () => {
  fc.assert(fc.property(
    fcRight("local"),
    fcBin(),
    fcMaybe(fcBin()),
    fcMaybe(fcBin()),
    ([key0, key1], payload, footer, assertion) => {
      const token = enLocal(key0, payload, footer, assertion);
      assert(token);
      assertEquals(deLocal(key0, token, assertion), {
        payload,
        footer: footer ?? new Uint8Array(),
      });
      assertEquals(deLocal(key1, token, assertion), null);
      assertEquals(
        deLocal(key0, token, assertion?.length ? undefined : new Uint8Array(1)),
        null,
      );
    },
  ));
});
Deno.test("public : vectors", () => {
  for (const $ of vectors.public) {
    const assertion = enUtf8($.assertion);
    const token = dePublic(
      keyPublic(Uint8Array.fromHex($.publicKey)),
      $.token,
      assertion,
    );
    if ($.result) {
      const payload = enUtf8($.payload);
      const footer = enUtf8($.footer);
      assertEquals(
        enPublic(
          keySecret(Uint8Array.fromHex($.secretKey)),
          payload,
          footer,
          assertion,
        ),
        $.token,
      );
      assertEquals(token, { payload, footer });
    } else assert(!token);
  }
});
Deno.test("public.keyPublic : arbitrary key", () => {
  fc.assert(fc.property(fcMaybe(fcBin()), ($) => {
    const key = keyPublic($);
    assertEquals(key.length, 32);
    assertEquals(key[USE], "public");
    $ && assertEquals(key.subarray(0, $.length), $.subarray(0, 32));
  }));
});
Deno.test("public.keySecret : arbitrary key", () => {
  fc.assert(fc.property(fcMaybe(fcBin()), ($) => {
    const key = keySecret($);
    assertEquals(key.length, 32);
    assertEquals(key[USE], "secret");
    $ && assertEquals(key.subarray(0, $.length), $.subarray(0, 32));
  }));
});
Deno.test("public.enPublic : wrong-use key", () => {
  fc.assert(fc.property(
    fcBin().chain(wrong(["local", "public"])),
    fcBin(),
    (key, payload) => {
      assertEquals(enPublic(key, payload), null);
    },
  ));
});
Deno.test("public.dePublic : wrong-use key", () => {
  fc.assert(fc.property(
    fcBin(32).chain(($) =>
      fc.record({
        secret: fc.constant($),
        public: wrong(["local", "secret"])(generate($)),
      })
    ),
    fcBin(),
    (keys, payload) => {
      const token = enPublic(keySecret(keys.secret), payload);
      assert(token);
      assertEquals(dePublic(keys.public, token), null);
    },
  ));
});
Deno.test("public : arbitrary binary", () => {
  fc.assert(fc.property(
    fcRight("secret"),
    fcBin(),
    fcMaybe(fcBin()),
    fcMaybe(fcBin()),
    ([secret0, secret1], payload, footer, assertion) => {
      const token = enPublic(secret0, payload, footer, assertion);
      assert(token);
      const public0 = keyPublic(generate(secret0));
      assertEquals(dePublic(public0, token, assertion), {
        payload,
        footer: footer ?? new Uint8Array(),
      });
      assertEquals(
        dePublic(keyPublic(generate(secret1)), token, assertion),
        null,
      );
      assertEquals(
        dePublic(
          public0,
          token,
          assertion?.length ? undefined : new Uint8Array(1),
        ),
        null,
      );
    },
  ));
});
