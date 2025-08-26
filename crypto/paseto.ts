import { de_bin, de_u64, en_bin, en_u64 } from "@nyoon/lib/base";
import { type Data, object, string, validator } from "@nyoon/lib/json";
import { lift, no, ok, run, try_catch } from "@nyoon/lib/result";
import { sign, verify } from "./25519.ts";

const pae = (...$: Uint8Array[]) => {
  const a = $.length;
  let b = a + 1 << 8;
  for (let z = 0; z < a; ++z) b += $[z].length;
  const c = new Uint8Array(b), d = new DataView(c.buffer);
  for (let z = 0, y = 8; z < a; y += $[z++].length) {
    d.setBigUint64(y, BigInt($[z].length), true), c.set($[z], y += 8);
  }
  return d.setBigUint64(0, BigInt(a), true), c;
};
const HEAD = "v4.public.", PRE = en_bin(HEAD);
/** PASETO body. */
export const BODY = object().properties({
  iss: string().pattern("^[-\\w]{43}$"),
  sub: string().pattern("^[-\\w]{43}$"),
  aud: string().pattern("^[-\\w]{43}$"),
  nbf: string().format("date-time"),
  exp: string().format("date-time"),
}).required().type;
/** Encodes and signs a PASETO. */
export const en_token = (key: Uint8Array, body: Data<typeof BODY>): string => {
  const a = en_bin(JSON.stringify(body)), b = new Uint8Array(a.length + 64);
  b.set(a), b.set(sign(key, pae(PRE, a)), b.length);
  return HEAD + en_u64(b);
};
/** Decodes and verifies a PASETO. */
export const de_token = ($: string | null) =>
  ok(/(?<=^v4\.public\.)[-\w]+$/.exec($ ?? "")?.[0])
    .bind(lift(400))
    .fmap(de_u64)
    .fmap(($) => ({ payload: $.subarray(0, -64), signature: $.subarray(-64) }))
    .bind(run(function* ({ payload, signature }) {
      const a = yield* try_catch(JSON.parse, () => 400)(de_bin(payload));
      const b = yield* validator(BODY)(a).fmap(($) => $, () => 400);
      if (!verify(de_u64(b.iss), pae(PRE, payload), signature)) yield* no(403);
      const c = Date.now();
      if (+new Date(b.nbf) > c || +new Date(b.exp) < c) yield* no(410);
      return b;
    }));
