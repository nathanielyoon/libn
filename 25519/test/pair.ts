/** Generates a Curve25519 key pair. */
export const generate_pair = (
  algorithm: `${"Ed" | "X"}25519`,
  use: KeyUsage[],
): Promise<CryptoKeyPair> =>
  crypto.subtle.generateKey(algorithm, true, use) as Promise<CryptoKeyPair>;
/** Exports raw Curve25519 keys. */
export const export_pair = (
  pair: CryptoKeyPair,
): Promise<{ [_ in `${"secret" | "public"}_key`]: Uint8Array<ArrayBuffer> }> =>
  Promise.all([
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
    crypto.subtle.exportKey("raw", pair.publicKey),
  ]).then(($) => ({
    secret_key: new Uint8Array($[0].slice(16)),
    public_key: new Uint8Array($[1]),
  }));
