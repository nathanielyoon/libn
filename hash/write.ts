import { get_wycheproof, write_vectors } from "@nyoon/test";

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
});
