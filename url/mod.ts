/**
 * S3 presigned URLs.
 *
 * @example Sign query parameters
 * ```ts
 * import { assertMatch } from "@std/assert";
 *
 * assertMatch(
 *   new Presigner({
 *     S3_ENDPOINT: "https://s3.amazonaws.com",
 *     S3_ID: "AKIAIOSFODNN7EXAMPLE",
 *     S3_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
 *     S3_REGION: "auto",
 *   }).presign("GET", "file.txt").href,
 *   /\b[\da-f]{64}$/,
 * );
 * ```
 *
 * @module url
 */

import { en_b16, en_bin } from "@libn/base";
import { hmac, sha256 } from "@libn/hash";

/** S3 query-parameter request presigner. */
export class Presigner extends URL {
  static readonly ALGORITHM = "AWS4-HMAC-SHA256";
  static readonly PAYLOAD = "UNSIGNED-PAYLOAD";
  private string_to_sign;
  private signing_key;
  /** Initializes a URL that can create and sign its query parameters. */
  constructor(
    env: { [_ in `S3_${"ENDPOINT" | "ID" | "KEY" | "REGION"}`]: string },
    timestamp: Date = new Date(),
  ) {
    super(env.S3_ENDPOINT);
    const datetime = timestamp.toISOString().replace(/\....|\W/g, "");
    const date = datetime.slice(0, 8);
    const scope = `${date}/${env.S3_REGION}/s3/aws4_request`;
    this.searchParams.set("X-Amz-Algorithm", Presigner.ALGORITHM);
    this.searchParams.set("X-Amz-Credential", `${env.S3_ID}/${scope}`);
    this.searchParams.set("X-Amz-Date", datetime);
    this.string_to_sign = `${Presigner.ALGORITHM}\n${datetime}\n${scope}\n`;
    const date_key = hmac(en_bin(`AWS4${env.S3_KEY}`), en_bin(date));
    const date_region_key = hmac(date_key, en_bin(env.S3_REGION));
    const date_region_service_key = hmac(date_region_key, en_bin("s3"));
    this.signing_key = hmac(date_region_service_key, en_bin("aws4_request"));
  }
  /** Generates a presigned URL. */
  presign(
    method: "HEAD" | "GET" | "PUT" | "POST" | "PATCH" | "DELETE",
    path: string,
    headers: { [name: string]: string } = {},
    expires = 604800,
  ): this {
    this.pathname = path;
    this.searchParams.set("X-Amz-Expires", `${expires >>> 0 || 1}`);
    this.searchParams.delete("X-Amz-Signature");
    const canonical_headers: { [name: string]: string } = { host: this.host };
    for (let names = Object.keys(headers), z = 0; z < names.length; ++z) {
      canonical_headers[names[z].toLowerCase()] = headers[names[z]];
    }
    const names = Object.keys(canonical_headers).sort();
    const signed_headers = names.join(";");
    this.searchParams.set("X-Amz-SignedHeaders", signed_headers);
    let request = `${method}\n${this.pathname}\n${this.search.slice(1)}\n`;
    for (let name, z = 0; z < names.length; ++z) {
      request += `${name = names[z]}:${canonical_headers[name]}\n`;
    }
    const string_to_sign = this.string_to_sign + en_b16(sha256(
      en_bin(`${request}\n${signed_headers}\n${Presigner.PAYLOAD}`),
    ));
    this.searchParams.set(
      "X-Amz-Signature",
      en_b16(hmac(this.signing_key, en_bin(string_to_sign))),
    );
    return this;
  }
}
