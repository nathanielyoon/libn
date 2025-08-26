import { de_bin, de_u64, en_bin, en_u64 } from "@nyoon/lib/base";
import { type Data, object, string, validator } from "@nyoon/lib/json";
import { lift, no, ok, run, try_catch } from "@nyoon/lib/result";
import { sign, verify } from "./25519.ts";

const pae = (payload: Uint8Array, footer: Uint8Array) => {
  const a = payload.length, b = new Uint8Array(50 + a + footer.length);
  b[0] = 4, b[8] = 10, b.set([118, 52, 46, 112, 117, 98, 108, 105, 99, 46], 16);
  const c = new DataView(b.buffer);
  c.setBigUint64(26, BigInt(a), true), b.set(payload, 34);
  c.setBigUint64(34 + a, BigInt(footer.length), true), b.set(footer, 42 + a);
  return b;
};
/** PASETO payload. */
export const PAYLOAD = object().properties({
  iss: string().pattern("^[-\\w]{43}$"),
  sub: string().pattern("^[-\\w]{43}$"),
  aud: string().pattern("^[-\\w]{43}$"),
  nbf: string().format("date-time"),
  exp: string().format("date-time"),
}).required().type;
export const validate = validator(PAYLOAD);
/** Encodes and signs a PASETO. */
export const en_token = (
  secret_key: Uint8Array,
  payload: Data<typeof PAYLOAD>,
  footer: Uint8Array,
): string => {
  const a = en_bin(JSON.stringify(payload)), b = new Uint8Array(a.length + 64);
  b.set(a), b.set(sign(secret_key, pae(a, footer)), a.length);
  return `v4.public.${en_u64(a)}.${en_u64(footer)}`;
};
/** Decodes and verifies a PASETO. */
export const de_token = ($: string | null) =>
  ok(/^v4\.public\.(?<body>[-\w]{384})\.(?<footer>[-\w]*)$/.exec($ ?? ""))
    .bind(lift(400))
    .bind(run(function* ([_, body, footer]) {
      const a = de_u64(body), b = de_u64(footer), c = a.subarray(0, -64);
      const d = yield* try_catch(JSON.parse, () => 400)(de_bin(c));
      const e = yield* validator(PAYLOAD)(d).fmap(($) => $, () => 400);
      if (!verify(de_u64(e.iss), pae(c, b), a.subarray(-64))) yield* no(403);
      const f = Date.now();
      if (+new Date(e.nbf) > f || +new Date(e.exp) < f) yield* no(410);
      return { payload: e, footer: b };
    }));
