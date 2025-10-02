import { bench } from "@libn/lib";
import { polyxchacha, xchachapoly } from "./src/aead.ts";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { XChaCha20Poly1305 } from "@stablelib/xchacha20poly1305";
import tweetnacl from "tweetnacl";

const key = crypto.getRandomValues(new Uint8Array(32));
const iv = crypto.getRandomValues(new Uint8Array(24));
const plaintext = crypto.getRandomValues(new Uint8Array(100));
const ad = crypto.getRandomValues(new Uint8Array(10));
const ciphertext = new Uint8Array(plaintext);
const tag = xchachapoly(key, iv, plaintext, ad)!;
const xchacha = new Uint8Array(ciphertext.length + tag.length);
xchacha.set(ciphertext), xchacha.set(tag, ciphertext.length);
const salsa = tweetnacl.secretbox(plaintext, iv, key);
bench({ group: "encrypt", assert: false }, {
  libn: () => {
    const ciphertext = new Uint8Array(plaintext);
    return { ciphertext, tag: xchachapoly(key, iv, ciphertext, ad) };
  },
  noble: () => {
    const output = xchacha20poly1305(key, iv, ad).encrypt(plaintext);
    return { ciphertext: output.subarray(0, -16), tag: output.subarray(-16) };
  },
  stablelib: () => {
    const output = new XChaCha20Poly1305(key).seal(iv, plaintext, ad);
    return { ciphertext: output.subarray(0, -16), tag: output.subarray(-16) };
  },
  tweetnacl: {
    fn: () => {
      const output = tweetnacl.secretbox(plaintext, iv, key);
      return { ciphertext: output.subarray(16), tag: output.subarray(0, 16) };
    },
    assert: false,
  },
});
bench({ group: "decrypt", assert: false }, {
  libn: () => {
    const plaintext = new Uint8Array(ciphertext);
    return polyxchacha(key, iv, tag, plaintext, ad) ? plaintext : null;
  },
  noble: () => {
    try {
      return xchacha20poly1305(key, iv, ad).decrypt(xchacha);
    } catch {
      return null;
    }
  },
  stablelib: () => new XChaCha20Poly1305(key).open(iv, xchacha, ad),
  tweetnacl: {
    fn: () => tweetnacl.secretbox.open(salsa, iv, key),
    assert: false,
  },
});
