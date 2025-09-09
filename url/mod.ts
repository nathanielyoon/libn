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
 *   }).presign("GET", "file.txt"),
 *   /X-Amz-Signature=\b[\da-f]{64}$/,
 * );
 * ```
 *
 * @module url
 */

import { en_b16, en_bin } from "@libn/base";
import { hmac, sha256 } from "@libn/hash";

const escape = ($: string) =>
  "%" + $.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
const URI_BYTE = /[^-.\w~]/g; // encode the forward slash everywhere
const URI_PATH = /[^-./\w~]/g; // except in the object key name
const search_parameterize = ($: [string, string]) => `X-Amz-${$[0]}=${$[1]}`;
/** S3 query-parameter-request presigner. */
export class Presigner {
  private host;
  private query;
  private string_to_sign; // except last line, which is request-specific
  private signing_key;
  /** Initializes a presigner with the specified environment conditions. */
  constructor(
    env: { [_ in `S3_${"ENDPOINT" | "ID" | "KEY" | "REGION"}`]: string },
    timestamp: Date = new Date(),
  ) {
    // Endpoint should be a valid URL (i.e. with scheme) but this only preserves
    // the hostname and uses `https://` for all outputs.
    this.host = new URL(env.S3_ENDPOINT).hostname; // no need for port
    // Converts to `yyyyMMddTHHmmssZ` format by removing the time's fractional
    // part and all the "-" and ":" characters.
    const datetime = timestamp.toISOString().replace(/\....|\W/g, "");
    const date = datetime.slice(0, 8);
    const scope = `${date}/${env.S3_REGION}/s3/aws4_request`;
    this.query = {
      Algorithm: "AWS4-HMAC-SHA256",
      Credential: `${env.S3_ID}/${scope}`.replace(URI_BYTE, escape),
      Date: datetime,
    };
    this.string_to_sign = `AWS4-HMAC-SHA256\n${datetime}\n${scope}\n`;
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
    expires?: number,
  ): string {
    // Prepend a forward slash if there isn't one.
    const pathname = path.replace(URI_PATH, escape).replace(/^(?!\/)/, "/");
    const canonical_headers: { [name: string]: string } = { host: this.host };
    for (let names = Object.keys(headers), z = 0; z < names.length; ++z) {
      canonical_headers[names[z].toLowerCase()] = headers[names[z]].trim();
    }
    const names = Object.keys(canonical_headers).sort();
    const search = Object.entries({
      ...this.query,
      Expires: `${Math.min(expires! >>> 0 || 1, 604800)}`, // 1 second to 1 week
      SignedHeaders: names.join(";").replace(URI_BYTE, escape),
    }).map(search_parameterize).join("&");
    let canonical_request = `${method}\n${pathname}\n${search}\n`;
    for (let z = 0; z < names.length; ++z) {
      canonical_request += `${names[z]}:${canonical_headers[names[z]]}\n`;
    }
    const string_to_sign = this.string_to_sign + en_b16(sha256(
      en_bin(`${canonical_request}\n${names.join(";")}\nUNSIGNED-PAYLOAD`),
    ));
    return `https://${this.host}${pathname}?${search}&${
      search_parameterize([
        "Signature",
        en_b16(hmac(this.signing_key, en_bin(string_to_sign))),
      ])
    }`;
  }
}
