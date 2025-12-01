import { enB16 } from "@libn/base/b16";
import { hmac } from "@libn/hash/hmac";
import { sha256 } from "@libn/hash/sha2";
import { enUtf8 } from "@libn/utf";

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
const hex = (raw: string, pattern = /[^-.\w~]/g) =>
  raw.replace(
    pattern,
    ($) => "%" + $.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"),
  );
/** S3 query-parameter-request signer. */
export class Signer {
  private search;
  private string;
  private host;
  private key;
  /** Creates a signer for a set of credentials. */
  constructor(s3: S3, now: Date = new Date()) {
    // Convert to `{yyyy}{mm}{dd}T{HH}{MM}{ss}Z` format by removing the time's
    // fractional part and all "-" and ":" characters.
    const datetime = now.toISOString().replace(/\....|\W/g, "");
    const scope = `${datetime.slice(0, 8)}/${s3.region}/s3/aws4_request`;
    this.search = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${
      hex(`${s3.id}/${scope}`)
    }&X-Amz-Date=${datetime}&X-Amz-Expires=`;
    this.string = `AWS4-HMAC-SHA256\n${datetime}\n${scope}\n`;
    this.host = s3.host.hostname, this.key = enUtf8(`AWS4${s3.key}`);
    for (const $ of [datetime.slice(0, 8), s3.region, "s3", "aws4_request"]) {
      this.key = hmac(this.key, enUtf8($));
    }
  }
  /** Presigns a URL. */
  sign(
    method: string,
    path: string,
    expires?: number,
    headers?: { [name: string]: string },
  ): string {
    path = hex(path, /[^-./\w~]/g).replace(/^(?!\/)/, "/"); // prepend slash
    expires = Math.min(expires! >>> 0 || 60, 604800); // 1 second to 1 week
    const canonical: { [_: string]: string } = {};
    for (const [name, value] of Object.entries(headers ?? {})) {
      canonical[name.toLowerCase()] = value.trim();
    }
    canonical.host = this.host;
    const sorted = Object.keys(canonical).sort(), names = sorted.join(";");
    const search = `${this.search}${expires}&X-Amz-SignedHeaders=${hex(names)}`;
    return `https://${this.host}${path}?${search}&X-Amz-Signature=${
      enB16(hmac(
        this.key,
        enUtf8(`${this.string}${
          enB16(sha256(enUtf8(`${
            sorted.reduce(
              ($, name) => `${$}${name}:${canonical[name]}\n`,
              `${method.toUpperCase()}\n${path}\n${search}\n`,
            )
          }\n${names}\nUNSIGNED-PAYLOAD`))).toLowerCase()
        }`),
      )).toLowerCase()
    }`;
  }
}
