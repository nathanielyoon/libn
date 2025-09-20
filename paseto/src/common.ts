import type { Key, Use } from "./key.ts";

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
