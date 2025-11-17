import { sign, verify } from "@libn/ecc/ed25519";
import { enUtf8 } from "@libn/utf";
import {
  type DeToken,
  deToken,
  type EnToken,
  enToken,
  type Keyer,
  keyer,
  pae,
} from "./lib.ts";

const BIN = /* @__PURE__ */ enUtf8("v4.public.");
/** Constructs a secret key. */
export const secretKey: Keyer<"secret"> = /* @__PURE__ */ keyer("secret");
/** Constructs a public key. */
export const publicKey: Keyer<"public"> = /* @__PURE__ */ keyer("public");
/** Signs and encodes a public PASETO. */
export const enPublic: EnToken<"secret"> = /* @__PURE__ */
  enToken("secret", (key, payload, footer, assertion) => {
    const length = payload.length, body = new Uint8Array(length + 64);
    body.set(sign(key, pae([BIN, payload, footer, assertion])), length);
    return body.set(payload), body;
  });
/** Decodes and verifies a public PASETO. */
export const dePublic: DeToken<"public"> = /* @__PURE__ */
  deToken("public", (key, body, footer, assertion) => {
    const message = pae([BIN, body.subarray(0, -64), footer, assertion]);
    if (!verify(key, message, body.subarray(-64))) return null;
    return { payload: new Uint8Array(body.subarray(0, -64)), footer };
  });
