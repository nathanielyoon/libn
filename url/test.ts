import { assertEquals, assertMatch } from "@std/assert";
import { presign, presigner } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("match signature v4 documentation example", () => {
  const S3 = {
    S3_HOST: `https://${vectors.docs.bucket}.s3.amazonaws.com`,
    S3_ID: vectors.docs.id,
    S3_KEY: vectors.docs.key,
  };
  const a = [vectors.docs.region, new Date(vectors.docs.date)] as const;
  const b = ["GET", vectors.docs.path, {}, +vectors.docs.time] as const;
  const c = vectors.docs.url.replaceAll("&amp;", "&");
  assertEquals(presigner(S3, ...a)(...b), c);
  assertEquals(presign(S3, ...b, ...a), c);
  assertMatch(
    presign(S3, "PUT", "", { "content-type": "text/plain" }),
    /X-Amz-SignedHeaders=content-type%3Bhost/,
  );
});
