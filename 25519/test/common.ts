/** Generates a Curve25519 key pair. */
export const get_pair = (algorithm: "X" | "Ed"): Promise<CryptoKeyPair> =>
  crypto.subtle.generateKey(
    `${algorithm}25519`,
    true,
    algorithm === "X" ? ["deriveBits"] : ["sign", "verify"],
  ) as Promise<CryptoKeyPair>;
/** Exports raw Curve25519 keys. */
export const set_pair = (pair: CryptoKeyPair): Promise<
  [secret_key: Uint8Array<ArrayBuffer>, public_key: Uint8Array<ArrayBuffer>]
> =>
  Promise.all([
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
    crypto.subtle.exportKey("raw", pair.publicKey),
  ]).then(($) => [new Uint8Array($[0].slice(16)), new Uint8Array($[1])]);
