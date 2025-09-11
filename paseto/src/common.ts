import { generate } from "@libn/25519";

/** PASETO-encoding function. */
export type Encode = (
  key: Uint8Array,
  message: Uint8Array,
  footer?: Uint8Array,
  assertion?: Uint8Array,
) => void | `v4.${string}`;
/** PASETO-decoding function. */
export type Decode = (key: Uint8Array, token: string, assertion?: Uint8Array) =>
  | void
  | { message: Uint8Array<ArrayBuffer>; footer: Uint8Array<ArrayBuffer> };
/** Pre-auth-encodes a list of binary pieces. */
export const pae = (...pieces: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  let size = 8; // room at start for `pieces.length`
  for (let z = 0; z < pieces.length; ++z) size += 8 + pieces[z].length;
  const out = new Uint8Array(size), view = new DataView(out.buffer);
  view.setBigUint64(0, BigInt(pieces.length), true);
  for (let z = 0, y = 8; z < pieces.length; ++z) {
    view.setBigUint64(y, BigInt(pieces[z].length), true);
    out.set(pieces[z], y += 8), y += pieces[z].length;
  }
  return out;
};
const USE = Symbol("use"), LOCAL = Symbol("local"), PUBLIC = Symbol("public");
/** PASETO key for "local" usage. */
export type Local = Uint8Array<ArrayBuffer> & { [USE]: typeof LOCAL };
/** PASETO key for "public" usage. */
export type Public = Uint8Array<ArrayBuffer> & { [USE]: typeof PUBLIC };
const key = () => crypto.getRandomValues(new Uint8Array(32));
const define = <A>(use: A, key: Uint8Array) =>
  Object.defineProperty(key, USE, { value: use }) as
    & Uint8Array<ArrayBuffer>
    & { [USE]: A };
/** Generates a local key. */
export const key_local = ($: Uint8Array = key()): Local => define(LOCAL, $);
/** Generates a public key pair. */
export const key_public = (
  $: Uint8Array = key(),
): { secret_key: Public; public_key: Public } => ({
  secret_key: define(PUBLIC, $),
  public_key: define(PUBLIC, generate($)),
});
const is =
  <A>(use: A) => ($: Uint8Array): $ is Uint8Array<ArrayBuffer> & { [USE]: A } =>
    $.length === 32 && Object.hasOwn($, USE) && $[USE as any] === use;
/** Checks whether a key is for "local" usage. */
export const is_local: ($: Uint8Array) => $ is Local = is(LOCAL);
/** Checks whether a key is for "public" usage. */
export const is_public: ($: Uint8Array) => $ is Public = is(PUBLIC);
/** Creates a pattern that matches a token with the given prefix. */
export const regex = (prefix: string): RegExp =>
  RegExp(`^${prefix.replaceAll(".", "\\.")}([-\\w]{86,})(?:\\.([-\\w]+))?$`);
