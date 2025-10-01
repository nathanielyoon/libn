import { assertEquals, assertMatch } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_str, pure } from "@libn/lib";
import { Signer } from "../mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("Signer.sign : signature v4 documentation", () =>
  assertEquals(
    new Signer({
      host: new URL(`https://${vectors.docs.bucket}.s3.amazonaws.com`),
      id: vectors.docs.id,
      key: vectors.docs.key,
      region: vectors.docs.region,
    }, new Date(vectors.docs.date)).sign(
      "GET",
      vectors.docs.path,
      +vectors.docs.time,
      {},
    ),
    vectors.docs.url.replaceAll("&amp;", "&"),
  ));
Deno.test("Signer.sign : additional headers", () =>
  fc_assert(fc.dictionary(fc_str(), fc_str()))((headers) =>
    assertMatch(
      new Signer({
        host: new URL("https://example.com"),
        id: "",
        key: "",
        region: "auto",
      }).sign("GET", "", 0, headers),
      RegExp(
        `&X-Amz-SignedHeaders=${
          ["host", ...Object.keys(headers)].map(($) => $.toLowerCase())
            .sort().join(";").replace(/[^-.\w~]/g, ($) =>
              "%" +
              $.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
        }`,
      ),
    )
  ));
Deno.test("bundle : pure", pure);
