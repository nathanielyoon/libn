/**
 * Sign and verify version 4 PASETOs.
 * @module paseto
 *
 * @example
 * ```ts
 * import { en_u64 } from "@nyoon/lib/base";
 * import { generate } from "@nyoon/lib/crypto";
 * import { type Formats } from "@nyoon/lib/json";
 * import { de_token, en_token } from "@nyoon/lib/paseto";
 * import { assertEquals } from "jsr:@std/assert@^1.0.14";
 *
 * const secret_key = crypto.getRandomValues(new Uint8Array(32));
 * const payload = {
 *   iss: en_u64(generate(secret_key)),
 *   sub: en_u64(crypto.getRandomValues(new Uint8Array(32))),
 *   aud: en_u64(crypto.getRandomValues(new Uint8Array(32))),
 *   exp: new Date(Date.now() + 1000).toISOString() as Formats["date-time"],
 *   nbf: new Date(Date.now() - 1000).toISOString() as Formats["date-time"],
 * };
 * const footer = crypto.getRandomValues(new Uint8Array(100));
 * assertEquals(
 *   de_token(en_token(secret_key, payload, footer)).unwrap(),
 *   { payload, footer },
 * );
 * ```
 *
 * @see [PASETO website](https://paseto.io/)
 * @see [PASETO spec](https://github.com/paseto-standard/paseto-spec)
 */

import { de_bin, de_u64, en_bin, en_u64 } from "../base/main.ts";
import { sign, verify } from "../crypto/main.ts";
import { type Data, object, string, validator } from "../json/main.ts";
import { lift, no, ok, type Or, run, try_catch } from "../result/main.ts";

const pae = (payload: Uint8Array, footer: Uint8Array) => {
  const a = payload.length, b = new Uint8Array(50 + a + footer.length);
  b[0] = 4, b[8] = 10, b.set([118, 52, 46, 112, 117, 98, 108, 105, 99, 46], 16);
  const c = new DataView(b.buffer);
  c.setBigUint64(26, BigInt(a), true), b.set(payload, 34);
  c.setBigUint64(34 + a, BigInt(footer.length), true), b.set(footer, 42 + a);
  return b;
};
/** PASETO payload. */
export const PAYLOAD: {
  type: "object";
  properties: {
    iss: { type: "string"; contentEncoding: "base64url" };
    sub: { type: "string"; contentEncoding: "base64url" };
    aud: { type: "string"; contentEncoding: "base64url" };
    nbf: { type: "string"; format: "date-time" };
    exp: { type: "string"; format: "date-time" };
  };
  required: ["iss", "sub", "aud", "nbf", "exp"];
  additionalProperties: true;
} = object().properties({
  iss: string().contentEncoding("base64url"),
  sub: string().contentEncoding("base64url"),
  aud: string().contentEncoding("base64url"),
  nbf: string().format("date-time"),
  exp: string().format("date-time"),
}).required(["iss", "sub", "aud", "nbf", "exp"]).additionalProperties().type;
/** Encodes and signs a PASETO. */
export const en_token = (
  secret_key: Uint8Array,
  payload: Data<typeof PAYLOAD>,
  footer: Uint8Array,
): string => {
  const a = en_bin(JSON.stringify(payload)), b = new Uint8Array(a.length + 64);
  b.set(a), b.set(sign(secret_key, pae(a, footer)), a.length);
  return `v4.public.${en_u64(b)}.${en_u64(footer)}`;
};
/** Decodes and verifies a PASETO. */
export const de_token = ($: string | null): Or<
  400 | 401 | 403,
  { payload: Data<typeof PAYLOAD>; footer: Uint8Array<ArrayBuffer> }
> =>
  ok(/^v4\.public\.(?<body>[-\w]{383,})\.(?<footer>[-\w]*)$/.exec($ ?? ""))
    .bind(lift(401))
    .bind(run(function* ([_, body, footer]) {
      const a = de_u64(body), b = de_u64(footer), c = a.subarray(0, -64);
      const d = yield* try_catch(JSON.parse, () => 400 as const)(de_bin(c));
      const e = yield* validator(PAYLOAD)(d).fmap(($) => $, () => 400 as const);
      if (!verify(de_u64(e.iss), pae(c, b), a.subarray(-64))) yield* no(403);
      const f = Date.now();
      if (+new Date(e.nbf) > f || +new Date(e.exp) < f) yield* no(403);
      return { payload: e, footer: b };
    }));
