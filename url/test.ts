import { assertEquals, assertMatch } from "@std/assert";
import { presign } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("match signature v4 documentation example", () => {
  const S3 = {
    S3_HOST: `https://${vectors.signature_v4.bucket}.s3.amazonaws.com`,
    S3_ID: vectors.signature_v4.id,
    S3_KEY: vectors.signature_v4.key,
  };
  // From <https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html#query-string-auth-v4-signing-example>.
  assertEquals(
    presign(
      S3,
      "GET",
      vectors.signature_v4.path,
      {},
      +vectors.signature_v4.time,
      vectors.signature_v4.region,
      new Date(vectors.signature_v4.date),
    ),
    vectors.signature_v4.url.replaceAll("&amp;", "&"),
  );
  assertMatch(
    presign(S3, "PUT", "", { "content-type": "text/plain" }),
    /X-Amz-SignedHeaders=content-type%3Bhost/,
  );
});
