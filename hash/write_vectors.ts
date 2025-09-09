import { en_b16, en_bin } from "@libn/base";
import { get_rfc, get_wycheproof, hex, write_vectors } from "../test.ts";

await write_vectors(import.meta, {
  nist: await Promise.all(
    [256, 512].map(($) =>
      fetch(
        `https://raw.githubusercontent.com/usnistgov/ACVP-Server/fb44dce5257aba23088256e63c9b950db6967610/gen-val/json-files/SHA2-${$}-1.0/internalProjection.json`,
      ).then<{ testGroups: { tests: { msg: string; md: string }[] }[] }>(($) =>
        $.json()
      ).then(({ testGroups: [{ tests }] }) => [
        `sha${$}`,
        tests.map(({ msg, md }) => ({ data: msg, digest: md })),
      ])
    ),
  ).then(Object.fromEntries),
  wycheproof: {
    hmac: await get_wycheproof<
      { key: string; msg: string; tag: string; result: "valid" | "invalid" }
    >(
      "427a648c39e2edea11b75bcdcd72eea3da482d6f",
      "hmac_sha256",
      ({ tests }) =>
        tests.map(($) => ({
          key: $.key,
          data: $.msg,
          tag: $.tag,
          result: $.result === "valid",
        })),
    ),
    hkdf: await get_wycheproof<{
      ikm: string;
      salt: string;
      info: string;
      size: number;
      okm: string;
      result: "valid" | "invalid";
    }>(
      "427a648c39e2edea11b75bcdcd72eea3da482d6f",
      "hkdf_sha256",
      ({ tests }) =>
        tests.map(($) => ({
          key: $.ikm,
          info: $.info,
          salt: $.salt,
          out: $.size,
          derived: $.result === "valid" ? $.okm : "",
        })),
    ),
  },
  blake2: await get_rfc(7693, 49161, 54202).then(($) =>
    $.matchAll(/blake2([bs])_res\[32\] = \{(.+?)\}.+?\{(.+?)\}.+?\{(.+?)\}/gs)
      .reduce((to, [_, flavor, result, md_len, in_len]) => ({
        ...to,
        [flavor]: {
          result: hex(result.toLowerCase()),
          md: JSON.parse(`[${md_len}]`),
          in: JSON.parse(`[${in_len}]`),
        },
      }), {})
  ),
  blake3: await fetch(
    "https://raw.githubusercontent.com/BLAKE3-team/BLAKE3/ae3e8e6b3a5ae3190ca5d62820789b17886a0038/test_vectors/test_vectors.json",
  ).then<{
    key: string;
    context_string: string;
    cases: {
      input_len: number;
      hash: string;
      keyed_hash: string;
      derive_key: string;
    }[];
  }>(($) => $.json()).then(($) => ({
    key: en_b16(en_bin($.key)),
    context: en_b16(en_bin($.context_string)),
    output_length: $.cases[0].hash.length >> 1,
    cases: $.cases.map(({ input_len, hash, keyed_hash, derive_key }) => ({
      input: en_b16(Uint8Array.from({ length: input_len }, (_, z) => z % 251)),
      hash,
      keyed: keyed_hash,
      derive: derive_key,
    })),
  })),
});
