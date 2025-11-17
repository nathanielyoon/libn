import { deU64, enU64 } from "@libn/base/u64";

/** Key use brand. */
export const USE: unique symbol = /* @__PURE__ */ Symbol("use");
/** PASETO key types. */
export type Use = "local" | "secret" | "public";
/** Typed key. */
export type Key<A extends Use, B extends ArrayBufferLike = ArrayBufferLike> =
  & Uint8Array<B>
  & { [USE]: A };
/** Use-purpose map. */
export const TO = {
  local: "local",
  public: "public",
  secret: "public",
} as const;
const hasUse = ($: any, use: Use) => $.length === 32 && $[USE] === use;
/** Key type constructor. */
export type Keyer<A extends Use> = (source?: Uint8Array) => Key<A, ArrayBuffer>;
/** Creates a key type constructor. */
export const keyer = <A extends Use>(value: A): Keyer<A> => (source) => {
  const key = crypto.getRandomValues(new Uint8Array(32));
  source && key.set(source.subarray(0, 32));
  return Object.defineProperty<any>(key, USE, { value, enumerable: true });
};
/** Uniquely encodes a list of binary pieces. */
export const pae = ($: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  let size = 8;
  for (let z = 0; z < $.length; ++z) size += 8 + $[z].length;
  const out = new Uint8Array(size), view = new DataView(out.buffer);
  for (let piece, z = 0, y = 8; z < $.length; ++z) {
    piece = $[z], view.setBigUint64(y, BigInt(piece.length), true);
    out.set(piece, y += 8), y += piece.length;
  }
  return view.setBigUint64(0, BigInt($.length), true), out;
};
/** PASETO-encoding function. */
export type EnToken<A extends Use> = (
  key: Key<A>,
  payload: Uint8Array,
  footer?: Uint8Array,
  assertion?: Uint8Array,
) => null | `v4.${typeof TO[A]}.${string}`;
/** PASETO-decoding function. */
export type DeToken<A extends Use> = (
  key: Key<A>,
  token: string,
  assertion?: Uint8Array,
) => null | { [_ in "payload" | "footer"]: Uint8Array<ArrayBuffer> };
/** Checks key usage, then encodes. */
export const enToken = <A extends Use>(
  use: A,
  en: (
    key: Key<A>,
    payload: Uint8Array,
    footer: Uint8Array,
    assertion: Uint8Array,
  ) => Uint8Array,
): EnToken<A> =>
(key, payload, footer, assertion) => {
  if (!hasUse(key, use)) return null;
  return `v4.${TO[use]}.${
    enU64(en(
      key,
      payload,
      footer ?? new Uint8Array(),
      assertion ?? new Uint8Array(),
    ))
  }${footer?.length ? `.${enU64(footer)}` : ""}`;
};
/** Checks key usage and token structure, then decodes. */
export const deToken = <A extends Use>(
  use: A,
  de: (
    key: Key<A>,
    body: Uint8Array<ArrayBuffer>,
    footer: Uint8Array<ArrayBuffer>,
    assertion: Uint8Array,
  ) => ReturnType<DeToken<A>>,
): DeToken<A> =>
(key, token, assertion) => {
  if (!hasUse(key, use)) return null;
  const exec = RegExp(
    `^v4\\.${TO[use]}\\.([-\\w]{86,})(?:\\.(?=.)|)([-\\w]*)$`,
  ).exec(token);
  if (!exec) return null;
  return de(key, deU64(exec[1]), deU64(exec[2]), assertion ?? new Uint8Array());
};
