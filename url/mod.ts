/**
 * S3 URL signing.
 *
 * @example Signing query parameters
 * ```ts
 * import { assertMatch } from "@std/assert";
 *
 * assertMatch(
 *   new Signer({
 *     host: new URL("https://s3.amazonaws.com"),
 *     id: "AKIAIOSFODNN7EXAMPLE",
 *     key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
 *     region: "auto",
 *   }).sign("GET", "file.txt", 60),
 *   /X-Amz-Signature=\b[\da-f]{64}$/,
 * );
 * ```
 *
 * @module url
 */

import { en_b16, en_bin } from "@libn/base";
import { hmac_sha256, sha256 } from "@libn/hash";

/** S3 credentials common to each request. */
export interface S3 {
  /** Endpoint URL base. */
  host: URL;
  /** Access key ID. */
  id: string;
  /** Secret access key. */
  key: string;
  /** AWS region. */
  region: string;
}
/** @internal */
type Method = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "OPTIONS" | "PATCH";
const hex = ($: string, pattern = /[^-.\w~]/g) =>
  $.replace(
    pattern,
    ($) => "%" + $.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"),
  );
/** S3 query-parameter-request signer. */
export class Signer {
  private host;
  private search;
  private string; // without last (request-specific) line
  private key;
  /** Initializes a presigner with the specified environment conditions. */
  constructor(s3: S3, now: Date = new Date()) {
    // Convert to `{yyyy}{mm}{dd}T{HH}{MM}{ss}Z` format by removing the time's
    // fractional part and all "-" and ":" characters.
    const datetime = now.toISOString().replace(/\....|\W/g, "");
    const scope = `${datetime.slice(0, 8)}/${s3.region}/s3/aws4_request`;
    this.host = s3.host.hostname;
    this.search = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${
      hex(`${s3.id}/${scope}`)
    }&X-Amz-Date=${datetime}&X-Amz-Expires=`;
    this.string = `AWS4-HMAC-SHA256\n${datetime}\n${scope}\n`;
    this.key = en_bin(`AWS4${s3.key}`);
    for (const $ of [datetime.slice(0, 8), s3.region, "s3", "aws4_request"]) {
      this.key = hmac_sha256(this.key, en_bin($));
    }
  }
  /** Generates a signed URL. */
  sign(
    method: Method,
    path: string,
    expires: number,
    headers: { [name: string]: string } = {},
  ): string {
    path = hex(path, /[^-./\w~]/g).replace(/^(?!\/)/, "/"); // leading slash
    expires = Math.min(expires >>> 0 || 60, 604800); // 1 second to 1 week
    headers = Object.entries(headers).reduce(
      ($, [name, value]) => ({ ...$, [name.toLowerCase()]: value.trim() }),
      {},
    ), headers.host = this.host;
    const sorted = Object.keys(headers).sort(), names = sorted.join(";");
    const search = `${this.search}${expires}&X-Amz-SignedHeaders=${hex(names)}`;
    return `https://${this.host}${path}?${search}&X-Amz-Signature=${
      en_b16(hmac_sha256(
        this.key,
        en_bin(`${this.string}${
          en_b16(sha256(en_bin(`${
            sorted.reduce(
              ($, name) => `${$}${name}:${headers[name]}\n`,
              `${method}\n${path}\n${search}\n`,
            )
          }\n${names}\nUNSIGNED-PAYLOAD`)))
        }`),
      ))
    }`;
  }
}
