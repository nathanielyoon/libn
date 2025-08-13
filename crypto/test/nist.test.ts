import { assertEquals } from "jsr:@std/assert@^1.0.13";
import { de_b16 } from "../../base/16.ts";
import { get_json, write } from "../../test.ts";
import { sha256, sha512 } from "../hash.ts";
import vectors from "./vectors/nist.json" with { type: "json" };

Deno.test("sha256", () =>
  vectors.sha256.forEach(($) =>
    assertEquals(sha256(de_b16($.data)), de_b16($.digest))
  ));
Deno.test("sha512", () =>
  vectors.sha512.forEach(($) =>
    assertEquals(sha512(de_b16($.data)), de_b16($.digest))
  ));

import.meta.main && await Promise.all(
  [256, 512].map(($) =>
    get_json<{ testGroups: { tests: { msg: string; md: string }[] }[] }>(
      `raw.githubusercontent.com/usnistgov/ACVP-Server/fb44dce5257aba23088256e63c9b950db6967610/gen-val/json-files/SHA2-${$}-1.0/internalProjection.json`,
    ).then(($) =>
      $.testGroups[0].tests.map(($) => ({ data: $.msg, digest: $.md }))
    )
  ),
).then(write(import.meta, ["sha256", "sha512"]));
