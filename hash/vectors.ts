import { get, set } from "../test.ts";

const [sha224, sha256, sha384, sha512, hmac, hkdf, blake2s, blake2b, blake3] =
  await Promise.all([
    get`/usnistgov/ACVP-Server/fb44dce5257aba23088256e63c9b950db6967610/gen-val/json-files/SHA2-224-1.0/internalProjection.json`,
    get`/usnistgov/ACVP-Server/fb44dce5257aba23088256e63c9b950db6967610/gen-val/json-files/SHA2-256-1.0/internalProjection.json`,
    get`/usnistgov/ACVP-Server/fb44dce5257aba23088256e63c9b950db6967610/gen-val/json-files/SHA2-384-1.0/internalProjection.json`,
    get`/usnistgov/ACVP-Server/fb44dce5257aba23088256e63c9b950db6967610/gen-val/json-files/SHA2-512-1.0/internalProjection.json`,
    get`/C2SP/wycheproof/427a648c39e2edea11b75bcdcd72eea3da482d6f/testvectors_v1/hmac_sha256_test.json`,
    get`/C2SP/wycheproof/427a648c39e2edea11b75bcdcd72eea3da482d6f/testvectors_v1/hkdf_sha256_test.json`,
    ...["s", "b"].map((flavor) =>
      get([
        `/BLAKE2/BLAKE2/eec32b7170d8dbe4eb59c9afad2ee9297393fb5b/testvectors/blake2${flavor}-kat.txt`,
      ])
    ) as [Promise<string>, Promise<string>],
    get`/BLAKE3-team/BLAKE3/ae3e8e6b3a5ae3190ca5d62820789b17886a0038/test_vectors/test_vectors.json`
      .then<{
        key: string;
        context_string: string;
        cases: {
          input_len: number;
          hash: string;
          keyed_hash: string;
          derive_key: string;
        }[];
      }>(JSON.parse),
  ]);

const nist = ($: string) =>
  JSON.parse($).testGroups[0].tests
    .filter(($: { len: number }) => $.len % 8 === 0)
    .map(($: { msg: string; md: string }) => ({
      data: $.msg,
      digest: $.md,
    }));
const blake2 = ($: string) =>
  $.trim().split("\n\n").map((chunk) =>
    Object.fromEntries(chunk.split("\n").map((line) => line.split(":\t")))
  );
await set(import.meta, {
  sha224: nist(sha224),
  sha256: nist(sha256),
  sha384: nist(sha384),
  sha512: nist(sha512),
  hmac: JSON.parse(hmac).testGroups.flatMap((group: {
    tests: {
      key: string;
      msg: string;
      tag: string;
      result: "valid" | "invalid";
    }[];
  }) =>
    group.tests.map(($) => ({
      key: $.key,
      data: $.msg,
      tag: $.tag,
      result: $.result === "valid",
    }))
  ),
  hkdf: JSON.parse(hkdf).testGroups.flatMap((group: {
    tests: {
      ikm: string;
      salt: string;
      info: string;
      size: number;
      okm: string;
      result: "valid" | "invalid";
    }[];
  }) =>
    group.tests.map(($) => ({
      key: $.ikm,
      info: $.info,
      salt: $.salt,
      out: $.size,
      derived: $.result === "valid" ? $.okm : "",
    }))
  ),
  blake2s: blake2(blake2s),
  blake2b: blake2(blake2b),
  blake3: {
    key: blake3.key,
    context: blake3.context_string,
    length: blake3.cases[0].hash.length >> 1,
    cases: blake3.cases.map(($) => ({
      input: $.input_len,
      hash: $.hash,
      keyed: $.keyed_hash,
      derive: $.derive_key,
    })),
  },
});
