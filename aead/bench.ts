import fc from "fast-check";
import { fc_bench, fc_bin } from "@libn/lib";
import { polyxchacha, xchachapoly } from "./src/aead.ts";
import { xchacha20poly1305 as noble } from "@noble/ciphers/chacha.js";
import * as stablelib from "@stablelib/xchacha20poly1305";

fc_bench(
  { group: "encrypt" },
  fc.tuple(fc_bin(32), fc_bin(24), fc_bin(), fc_bin()),
  {
    libn: (key, iv, plaintext, ad) => ({
      ciphertext: plaintext,
      tag: xchachapoly(key, iv, plaintext, ad),
    }),
    noble: (key, iv, plaintext, ad) => {
      const output = noble(key, iv, ad).encrypt(plaintext);
      return { ciphertext: output.subarray(0, -16), tag: output.subarray(-16) };
    },
    stablelib: (key, iv, plaintext, ad) => {
      const output = new stablelib.XChaCha20Poly1305(key).seal(
        iv,
        plaintext,
        ad,
      );
      return { ciphertext: output.subarray(0, -16), tag: output.subarray(-16) };
    },
  },
);
fc_bench(
  { group: "decrypt" },
  fc.tuple(fc_bin(32), fc_bin(24), fc_bin(), fc_bin()).map(
    ([key, iv, plaintext, ad]) =>
      [key, iv, xchachapoly(key, iv, plaintext, ad)!, plaintext, ad] as const,
  ),
  {
    libn: (key, iv, tag, ciphertext, ad) => {
      polyxchacha(key, iv, tag, ciphertext, ad);
      return ciphertext;
    },
    noble: (key, iv, tag, ciphertext, ad) => {
      const buffer = new Uint8Array(ciphertext.length + 16);
      buffer.set(ciphertext), buffer.set(tag, ciphertext.length);
      return noble(key, iv, ad).decrypt(buffer);
    },
    stablelib: (key, iv, tag, ciphertext, ad) => {
      const buffer = new Uint8Array(ciphertext.length + 16);
      buffer.set(ciphertext), buffer.set(tag, ciphertext.length);
      return new stablelib.XChaCha20Poly1305(key).open(iv, buffer, ad);
    },
  },
);
