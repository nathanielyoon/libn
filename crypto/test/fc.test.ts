import { convert_public, convert_secret, generate, x25519 } from "../25519.ts";
import { assertEquals } from "jsr:@std/assert@^1.0.13";
import fc from "npm:fast-check@^4.2.0";

Deno.test("exchange", () =>
  fc.assert(fc.property(
    fc.uint8Array({ minLength: 32, maxLength: 32 }),
    fc.uint8Array({ minLength: 32, maxLength: 32 }),
    (key_1, key_2) => {
      assertEquals(x25519(key_1, x25519(key_2)), x25519(key_2, x25519(key_1)));
      assertEquals(
        x25519(convert_secret(key_1), convert_public(generate(key_2))),
        x25519(convert_secret(key_2), convert_public(generate(key_1))),
      );
    },
  )));
