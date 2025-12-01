import { assertEquals, assertMatch } from "@std/assert";
import fc from "fast-check";
import { fcStr } from "../test.ts";
import { Signer } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("signer.sign : signature v4 documentation", () => {
  assertEquals(
    new Signer({
      host: new URL(`https://${vectors.sign.bucket}.s3.amazonaws.com`),
      id: vectors.sign.id,
      key: vectors.sign.key,
      region: vectors.sign.region,
    }, new Date(vectors.sign.date)).sign(
      "GET",
      vectors.sign.path,
      +vectors.sign.time,
    ),
    vectors.sign.url,
  );
});
Deno.test("signer.sign : additional headers", () => {
  fc.assert(fc.property(fc.dictionary(fcStr(), fcStr()), (headers) => {
    assertMatch(
      new Signer({
        host: new URL("https://example.com"),
        id: "",
        key: "",
        region: "auto",
      }).sign("GET", "", 0, headers),
      RegExp(
        `&X-Amz-SignedHeaders=${
          ["host", ...Object.keys(headers)].map(($) => $.toLowerCase()).sort()
            .join(";").replace(/[^-.\w~]/g, ($) =>
              "%" + $.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
        }`,
      ),
    );
  }));
});
