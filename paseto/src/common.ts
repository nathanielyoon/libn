import { generate } from "@libn/25519";

/** Pre-auth-encodes a list of binary pieces. */
export const pae = (...pieces: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  let size = 8; // room at start for `pieces.length`
  for (let z = 0; z < pieces.length; ++z) size += pieces[z].length + 8;
  const out = new Uint8Array(size), view = new DataView(out.buffer);
  view.setBigUint64(0, BigInt(pieces.length), true);
  for (let z = 0, y = 8; z < pieces.length; ++z) {
    view.setBigUint64(y, BigInt(pieces[z].length), true);
    out.set(pieces[z], y += 8), y += pieces[z].length;
  }
  return out;
};
const V4_LOCAL = Symbol("v4.local"), V4_PUBLIC = Symbol("v4.public");
const KEY_USE = Symbol("use");
/** PASETO key for "local" usage. */
export type Local = Uint8Array<ArrayBuffer> & { [KEY_USE]: typeof V4_LOCAL };
/** PASETO key for "public" usage. */
export type Public = Uint8Array<ArrayBuffer> & { [KEY_USE]: typeof V4_PUBLIC };
const key = () => crypto.getRandomValues(new Uint8Array(32));
const define = <A>(use: A, key: Uint8Array) =>
  Object.defineProperty(key, KEY_USE, { value: use }) as
    & Uint8Array<ArrayBuffer>
    & { [KEY_USE]: A };
/** Generates a local key. */
export const key_local = ($: Uint8Array = key()): Local => define(V4_LOCAL, $);
/** Generates a public key pair. */
export const key_public = (
  $: Uint8Array = key(),
): { secret_key: Public; public_key: Public } => ({
  secret_key: define(V4_PUBLIC, $),
  public_key: define(V4_PUBLIC, generate($)),
});
const is =
  <A>(use: A) =>
  ($: Uint8Array): $ is Uint8Array<ArrayBuffer> & { [KEY_USE]: A } =>
    $.length === 32 && Object.hasOwn($, KEY_USE) && $[KEY_USE as any] === use;
/** Checks whether a key is for "local" usage. */
export const is_local: ($: Uint8Array) => $ is Local = is(V4_LOCAL);
/** Checks whether a key is for "public" usage. */
export const is_public: ($: Uint8Array) => $ is Public = is(V4_PUBLIC);
/** Creates a pattern that matches a token with the given prefix. */
export const regex = (prefix: string): RegExp =>
  RegExp(`^${prefix.replaceAll(".", "\\.")}([-\\w]{86,})(?:\\.([-\\w]+))?$`);
