import { assertEquals, assertMatch } from "@std/assert";
import fc from "fast-check";
import { fc_check, fc_str } from "../test.ts";
import { Presigner } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("mod", async ({ step }) => {
  await step("Presigner.presign : signature v4 documentation", () => {
    assertEquals(
      new Presigner({
        S3_ENDPOINT: `https://${vectors.docs.bucket}.s3.amazonaws.com`,
        S3_ID: vectors.docs.id,
        S3_KEY: vectors.docs.key,
        S3_REGION: vectors.docs.region,
      }, new Date(vectors.docs.date)).presign(
        "GET",
        vectors.docs.path,
        {},
        +vectors.docs.time,
      ),
      vectors.docs.url.replaceAll("&amp;", "&"),
    );
  });
  await step("Presigner.presign : additional headers", () => {
    fc_check(fc.property(
      fc.dictionary(fc_str(), fc_str()),
      (headers) =>
        assertMatch(
          new Presigner({
            S3_ENDPOINT: "https://example.com",
            S3_ID: "",
            S3_KEY: "",
            S3_REGION: "auto",
          }).presign("GET", "", headers),
          RegExp(
            `&X-Amz-SignedHeaders=${
              ["host", ...Object.keys(headers)].map(($) => $.toLowerCase())
                .sort().join(";").replace(/[^-.\w~]/g, ($) =>
                  "%" +
                  $.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
            }`,
          ),
        ),
    ));
  });
});
