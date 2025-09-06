/**
 * S3 presigned URLs.
 *
 * @example Sign query parameters
 * ```ts
 * import { assertMatch } from "@std/assert";
 *
 * assertMatch(
 *   presign(
 *     { S3_HOST: "https://s3.amazonaws.com", S3_ID: "", S3_KEY: "" },
 *     "GET",
 *     "file.txt",
 *   ),
 *   /\b[\da-f]{64}$/,
 * );
 * ```
 *
 * @module url
 */

import { en_b16, en_bin } from "@libn/base";
import { hmac, sha256 } from "@libn/hash";

type Method = "HEAD" | "GET" | "PUT" | "POST" | "PATCH" | "DELETE";
type S3 = { S3_HOST: string; S3_ID: string; S3_KEY: string };
/** Creates a request presigner. */
export const signer = (env: S3, region?: string, date?: Date): (
  method: Method,
  path: string,
  headers: { [name: string]: string },
  expiration: number,
) => string => {
  const a = (date ?? new Date()).toISOString().replace(/\....|\W/g, "");
  const b = a.slice(0, 8), c = `${b}/${region ??= "auto"}/s3/aws4_request`;
  const d = `AWS4-HMAC-SHA256\n${a}\n${c}\n`;
  const e = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${env.S3_ID}%2F${
    c.replace(/[^-.\w~]/g, ($) =>
      "%" + $.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
  }&X-Amz-Date=${a}&X-Amz-Expires=`;
  const f = hmac(
    hmac(
      hmac(hmac(en_bin(`AWS4${env.S3_KEY}`), en_bin(b)), en_bin(region)),
      en_bin("s3"),
    ),
    en_bin("aws4_request"),
  );
  return (method, path, headers, expiration) => {
    const { host, pathname, href } = new URL(path, env.S3_HOST);
    const g = Object.keys(headers), h: typeof headers = { host };
    for (let z = 0; z < g.length; ++z) h[g[z].toLowerCase()] = headers[g[z]];
    const i = Object.keys(h).sort();
    const j = `${e}${expiration}&X-Amz-SignedHeaders=${i.join("%3B")}`;
    let k = `${method}\n${pathname}\n${j}\n`, z = i.length;
    do k += `${i[--z]}:${h[i[z]]}\n`; while (z);
    return `${href}?${j}&X-Amz-Signature=${
      en_b16(hmac(
        f,
        en_bin(
          d + en_b16(sha256(en_bin(`${k}\n${i.join(";")}\nUNSIGNED-PAYLOAD`))),
        ),
      ))
    }`;
  };
};
/** Presigns a URL for the specified method, path, and headers. */
export const presign = (
  env: S3,
  method: Method,
  path: string,
  headers: { [header: string]: string } = {},
  expiration = 604800,
  region?: string,
  date?: Date,
): string => signer(env, region, date)(method, path, headers, expiration);
