import { assertEquals } from "jsr:@std/assert@^1.0.14";
import fc from "npm:fast-check@^4.2.0";
import {
  convert_public,
  convert_secret,
  generate,
  sign,
  verify,
  x25519,
} from "../25519.ts";

Deno.test("verify", () =>
  fc.assert(fc.property(
    fc.uint8Array({ minLength: 32, maxLength: 32 }),
    fc.uint8Array(),
    (key, data) => verify(generate(key), data, sign(key, data)),
  )));
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
