import { save } from "@libn/lib";
import { en_b16, en_bin } from "@libn/base";

const get_nist = (size: number) =>
  fetch(
    `https://raw.githubusercontent.com/usnistgov/ACVP-Server/fb44dce5257aba23088256e63c9b950db6967610/gen-val/json-files/SHA2-${size}-1.0/internalProjection.json`,
  ).then<
    { testGroups: { tests: { msg: string; len: number; md: string }[] }[] }
  >(($) => $.json());
const set_nist = ($: Awaited<ReturnType<typeof get_nist>>) =>
  $.testGroups[0].tests.filter(($) => $.len % 8 === 0).map(({ msg, md }) => ({
    data: msg,
    digest: md,
  }));
const get_blake2 = (flavor: string) =>
  fetch(
    `https://raw.githubusercontent.com/BLAKE2/BLAKE2/eec32b7170d8dbe4eb59c9afad2ee9297393fb5b/testvectors/blake2${flavor}-kat.txt`,
  ).then(($) => $.text());
const set_blake2 = ($: Awaited<ReturnType<typeof get_blake2>>) =>
  $.trim().split("\n\n").map(($) =>
    Object.fromEntries($.split("\n").map((line) => line.split(":\t")))
  );
await Promise.all([
  get_nist(224),
  get_nist(256),
  get_nist(384),
  get_nist(512),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/427a648c39e2edea11b75bcdcd72eea3da482d6f/testvectors_v1/hmac_sha256_test.json",
  ).then<{
    testGroups: {
      tests: {
        key: string;
        msg: string;
        tag: string;
        result: "valid" | "invalid";
      }[];
    }[];
  }>(($) => $.json()),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/427a648c39e2edea11b75bcdcd72eea3da482d6f/testvectors_v1/hkdf_sha256_test.json",
  ).then<{
    testGroups: {
      tests: {
        ikm: string;
        salt: string;
        info: string;
        size: number;
        okm: string;
        result: "valid" | "invalid";
      }[];
    }[];
  }>(($) => $.json()),
  get_blake2("s"),
  get_blake2("b"),
  fetch(
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
  }>(($) => $.json()),
]).then(([
  nist_224,
  nist_256,
  nist_384,
  nist_512,
  wycheproof_hmac_sha256,
  wycheproof_hkdf_sha256,
  blake2s,
  blake2b,
  blake3,
]) => ({
  sha2: {
    nist_224: set_nist(nist_224),
    nist_256: set_nist(nist_256),
    nist_384: set_nist(nist_384),
    nist_512: set_nist(nist_512),
  },
  hmac: {
    wycheproof_hmac_sha256: wycheproof_hmac_sha256.testGroups.flatMap((group) =>
      group.tests.map(($) => ({
        key: $.key,
        data: $.msg,
        tag: $.tag,
        result: $.result === "valid",
      }))
    ),
    wycheproof_hkdf_sha256: wycheproof_hkdf_sha256.testGroups.flatMap((group) =>
      group.tests.map(($) => ({
        key: $.ikm,
        info: $.info,
        salt: $.salt,
        out: $.size,
        derived: $.result === "valid" ? $.okm : "",
      }))
    ),
  },
  blake2: {
    reference_s: set_blake2(blake2s),
    reference_b: set_blake2(blake2b),
  },
  blake3: {
    reference: {
      key: en_b16(en_bin(blake3.key)),
      context: en_b16(en_bin(blake3.context_string)),
      output_length: blake3.cases[0].hash.length >> 1,
      cases: blake3.cases.map(($) => ({
        input: $.input_len,
        hash: $.hash,
        keyed: $.keyed_hash,
        derive: $.derive_key,
      })),
    },
  },
}));
