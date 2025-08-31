import { de_bin, de_u64, en_bin, en_u64 } from "@nyoon/base";
import { sign, verify } from "@nyoon/25519";
import { type Data, object, string, validator } from "@nyoon/json";
import { lift, no, ok, type Or, run, try_catch } from "@nyoon/result";

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
