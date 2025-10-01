import fc from "fast-check";
import { fc_bench, fc_bin } from "@libn/lib";
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
import * as noble_sha2 from "@noble/hashes/sha2.js";
import { hmac as noble_hmac } from "@noble/hashes/hmac.js";
import { hkdf as noble_hkdf } from "@noble/hashes/hkdf.js";
import * as noble_b2 from "@noble/hashes/blake2.js";
import { blake3 as noble_b3 } from "@noble/hashes/blake3.js";
import { hash as stablelib_sha224 } from "@stablelib/sha224";
import { hash as stablelib_sha256, SHA256 } from "@stablelib/sha256";
import { hash as stablelib_sha384 } from "@stablelib/sha384";
import { hash as stablelib_sha512 } from "@stablelib/sha512";
import { hmac as stablelib_hmac } from "@stablelib/hmac";
import { HKDF as stablelib_hkdf } from "@stablelib/hkdf";
import { hash as stablelib_b2s } from "@stablelib/blake2s";
import { hash as stablelib_b2b } from "@stablelib/blake2b";

fc_bench({ group: "sha224" }, fc.tuple(fc_bin()), {
  libn: sha224,
  noble: noble_sha2.sha224,
  stablelib: stablelib_sha224,
});
fc_bench({ group: "sha256" }, fc.tuple(fc_bin()), {
  libn: sha256,
  noble: noble_sha2.sha256,
  stablelib: stablelib_sha256,
});
fc_bench({ group: "sha384" }, fc.tuple(fc_bin()), {
  libn: sha384,
  noble: noble_sha2.sha384,
  stablelib: stablelib_sha384,
});
fc_bench({ group: "sha512" }, fc.tuple(fc_bin()), {
  libn: sha512,
  noble: noble_sha2.sha512,
  stablelib: stablelib_sha512,
});
fc_bench({ group: "hmac" }, fc.tuple(fc_bin(32), fc_bin()), {
  libn: hmac_sha256,
  noble: noble_hmac.bind(null, noble_sha2.sha256),
  stablelib: stablelib_hmac.bind(null, SHA256),
});
fc_bench(
  { group: "hkdf" },
  fc.tuple(fc_bin(32), fc_bin(), fc_bin(32), fc.integer({ min: 1, max: 8160 })),
  {
    libn: hkdf_sha256,
    noble: (key, info, salt, size) =>
      noble_hkdf(noble_sha2.sha256, key, salt, info, size),
    stablelib: (key, info, salt, size) =>
      new stablelib_hkdf(SHA256, key, salt, info).expand(size),
  },
);
fc_bench({ group: "blake2s" }, fc.tuple(fc_bin()), {
  libn: b2s,
  noble: noble_b2.blake2s,
  stablelib: stablelib_b2s,
});
fc_bench({ group: "blake2b" }, fc.tuple(fc_bin()), {
  libn: b2b,
  noble: noble_b2.blake2b,
  stablelib: stablelib_b2b,
});
fc_bench({ group: "blake3" }, fc.tuple(fc_bin()), {
  libn: b3,
  noble: noble_b3,
});
