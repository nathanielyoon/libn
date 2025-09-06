import { assertEquals, assertMatch } from "@std/assert";
import { presign, signer } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("match signature v4 documentation example", () => {
  const S3 = {
    S3_HOST: `https://${vectors.docs.bucket}.s3.amazonaws.com`,
    S3_ID: vectors.docs.id,
    S3_KEY: vectors.docs.key,
  };
  const a = ["GET", vectors.docs.path, {}, +vectors.docs.time] as const;
  const b = vectors.docs.url.replaceAll("&amp;", "&");
  assertEquals(presign(S3, ...a), b);
  assertEquals(
    signer(S3, vectors.docs.region, new Date(vectors.docs.date))(...a),
    b,
  );
  assertMatch(
    presign(S3, "PUT", "", { "content-type": "text/plain" }),
    /X-Amz-SignedHeaders=content-type%3Bhost/,
  );
});
