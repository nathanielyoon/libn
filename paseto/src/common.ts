import { generate } from "@libn/25519";

/** Key type property. */
export const USE = Symbol("use");
/** Key usage values, with additional distinction between keys in a pair. */
export type Use = "local" | "secret" | "public";
/** Typed key. */
export type Key<A extends Use> = Uint8Array<ArrayBuffer> & { [USE]: A };
const to = <A extends Use>(use: A, key: Uint8Array) =>
  Object.defineProperty<any>(key, USE, { value: use });
/** Generates a local key. */
export const make_local = (
  $: Uint8Array = crypto.getRandomValues(new Uint8Array(32)),
): Key<"local"> => to("local", $);
/** Generates a public key pair. */
export const make_public = (
  $: Uint8Array = crypto.getRandomValues(new Uint8Array(32)),
): { secret_key: Key<"secret">; public_key: Key<"public"> } => (
  { secret_key: to("secret", $), public_key: to("public", generate($)) }
);
const is = <A extends Use>(use: A) => ($: Uint8Array): $ is Key<A> =>
  $.length === 32 && Object.hasOwn($, USE) && $[USE as any] as any === use;
/** Checks for local-use keys. */
export const is_local: ($: Uint8Array) => $ is Key<"local"> = is("local");
/** Checks for secret public-use keys. */
export const is_secret: ($: Uint8Array) => $ is Key<"secret"> = is("secret");
/** Checks for public public-use keys. */
export const is_public: ($: Uint8Array) => $ is Key<"public"> = is("public");
/** PASETO-encoding function. */
export type Entoken<A extends Use = Use> = (
  key: Key<A>,
  body: Uint8Array,
  foot?: Uint8Array,
  assertion?: Uint8Array,
) => null | `v4.${string}`;
/** PASETO-decoding function. */
export type Detoken<A extends Use = Use> = (
  key: Key<A>,
  token: string,
  assertion?: Uint8Array,
) => null | { body: Uint8Array<ArrayBuffer>; foot: Uint8Array<ArrayBuffer> };
/** Pre-auth-encodes a list of binary pieces. */
export const pae = (...pieces: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  let size = 8; // room at start for `pieces.length`
  for (let z = 0; z < pieces.length; ++z) size += 8 + pieces[z].length;
  const out = new Uint8Array(size), view = new DataView(out.buffer);
  for (let z = 0, y = 8; z < pieces.length; ++z) {
    view.setBigUint64(y, BigInt(pieces[z].length), true);
    out.set(pieces[z], y += 8), y += pieces[z].length;
  }
  return view.setBigUint64(0, BigInt(pieces.length), true), out;
};
/** Creates a pattern that matches a token with the given prefix. */
export const regex = (prefix: string): RegExp =>
  RegExp(`^${prefix.replaceAll(".", "\\.")}([-\\w]{86,})(?:\\.([-\\w]+))?$`);
