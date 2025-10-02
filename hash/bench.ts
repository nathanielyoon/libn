import { bench } from "@libn/lib";
import {
  b2b,
  b2s,
  b3,
  hkdf_sha256,
  hmac_sha256,
  sha224,
  sha256,
  sha384,
  sha512,
} from "./mod.ts";
import {
  sha224 as noble_sha224,
  sha256 as noble_sha256,
  sha384 as noble_sha384,
  sha512 as noble_sha512,
} from "@noble/hashes/sha2.js";
import { hmac as noble_hmac } from "@noble/hashes/hmac.js";
import { hkdf as noble_hkdf } from "@noble/hashes/hkdf.js";
import {
  blake2b as noble_b2b,
  blake2s as noble_b2s,
} from "@noble/hashes/blake2.js";
import { blake3 as noble_b3 } from "@noble/hashes/blake3.js";
import { hash as stablelib_sha224 } from "@stablelib/sha224";
import { hash as stablelib_sha256, SHA256 } from "@stablelib/sha256";
import { hash as stablelib_sha384 } from "@stablelib/sha384";
import { hash as stablelib_sha512 } from "@stablelib/sha512";
import { hmac as stablelib_hmac } from "@stablelib/hmac";
import { HKDF } from "@stablelib/hkdf";
import { hash as stablelib_b2s } from "@stablelib/blake2s";
import { hash as stablelib_b2b } from "@stablelib/blake2b";

const data = crypto.getRandomValues(new Uint8Array(100));
bench({ group: "sha224", assert: false }, {
  libn: () => sha224(data),
  noble: () => noble_sha224(data),
  stablelib: () => stablelib_sha224(data),
});
bench({ group: "sha256", assert: false }, {
  libn: () => sha256(data),
  noble: () => noble_sha256(data),
  stablelib: () => stablelib_sha256(data),
});
bench({ group: "sha384", assert: false }, {
  libn: () => sha384(data),
  noble: () => noble_sha384(data),
  stablelib: () => stablelib_sha384(data),
});
bench({ group: "sha512", assert: false }, {
  libn: () => sha512(data),
  noble: () => noble_sha512(data),
  stablelib: () => stablelib_sha512(data),
});
const key = crypto.getRandomValues(new Uint8Array(32));
bench({ group: "hmac", assert: false }, {
  libn: () => hmac_sha256(key, data),
  noble: () => noble_hmac(noble_sha256, key, data),
  stablelib: () => stablelib_hmac(SHA256, key, data),
});
const salt = crypto.getRandomValues(new Uint8Array(32));
bench({ group: "hkdf", assert: false }, {
  libn: () => hkdf_sha256(key, data, salt, 32),
  noble: () => noble_hkdf(noble_sha256, key, salt, data, 32),
  stablelib: () => new HKDF(SHA256, key, salt, data).expand(32),
});
bench({ group: "blake2s", assert: false }, {
  libn: () => b2s(data, key, 32),
  noble: () => noble_b2s(data, { key, dkLen: 32 }),
  stablelib: () => stablelib_b2s(data, 32, { key }),
});
bench({ group: "blake2b", assert: false }, {
  libn: () => b2b(data, key, 64),
  noble: () => noble_b2b(data, { key, dkLen: 64 }),
  stablelib: () => stablelib_b2b(data, 64, { key }),
});
bench({ group: "blake3", assert: false }, {
  libn: () => b3(data),
  noble: () => noble_b3(data),
});
