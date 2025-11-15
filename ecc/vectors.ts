import { get, set } from "../test.ts";

const [rfc7748, rfc8032, x25519, ed25519] = await Promise.all([
  get`www.rfc-editor.org/rfc/rfc7748.txt`,
  get`www.rfc-editor.org/rfc/rfc8032.txt${46947}${52155}`,
  get`/C2SP/wycheproof/6b17607867ce8e3c3a2a4e1e35ccc3b42bfd75e3/testvectors_v1/x25519_test.json`,
  get`/C2SP/wycheproof/0d2dab394df1eb05b0865977f7633d010a98bccd/testvectors_v1/ed25519_test.json`,
]);

const loop = rfc7748.slice(21688, 22554).match(/\b[\da-f]{64}\b/g)!;
const ecdh = rfc7748.slice(23217, 25093).match(/\b[\da-f]{64}\b/g)!;
const vectors = Array.from(
  rfc8032.replace(/\n{3}.+?\n\f\n.+?\n{3}/g, "").matchAll(
    /SECRET KEY:\s*([\da-f]{32}\s*[\da-f]{32}\n).*?PUBLIC KEY:\s*([\da-f]{32}\s*[\da-f]{32}\n).*?MESSAGE \(length \d+ bytes?\):\n((?: {3}(?:[\da-f]{2})+\n)*).*?SIGNATURE:\s*([\da-f]{32}\s*[\da-f]{32}\s*[\da-f]{32}\s*[\da-f]{32}\n)/gs,
  ).map((all) => all.slice(1).map((group) => group.replace(/\s+/g, ""))),
  ([secretKey, publicKey, message, signature]) => (
    { secret: secretKey, public: publicKey, message, signature }
  ),
);
await set(import.meta, {
  ladder: {
    k: loop[0],
    u: loop[0],
    after: [
      { iterations: 1e0, k: loop[1] },
      { iterations: 1e3, k: loop[2] },
      { iterations: 1e6, k: loop[3] },
    ],
  },
  derive: [
    { secret: ecdh[0], public: ecdh[1] },
    { secret: ecdh[2], public: ecdh[3] },
  ],
  exchange: [
    ...Array.from(
      rfc7748.slice(18300, 19695).matchAll(
        /scalar:\s*(?<secret>[\da-f]{64}).*?coordinate:\s*(?<public>[\da-f]{64}).*?coordinate:\s*(?<shared>[\da-f]{64})/gs,
      ),
      ({ groups }) => groups!,
    ),
    ...Array.from(
      rfc7748.slice(18300, 19695).matchAll(
        /scalar:\s*(?<secret>[\da-f]{64}).*?coordinate:\s*(?<public>[\da-f]{64}).*?coordinate:\s*(?<shared>[\da-f]{64})/gs,
      ),
      ({ groups }) => groups!,
    ),
    { secret: ecdh[0], public: ecdh[3], shared: ecdh[4] },
    { secret: ecdh[2], public: ecdh[1], shared: ecdh[4] },
    ...JSON.parse(x25519).testGroups.flatMap((group: {
      tests: { private: string; public: string; shared: string }[];
    }) =>
      group.tests.map(($) => ({
        secret: $.private,
        public: $.public,
        shared: /^0{64}$/.test($.shared) ? null : $.shared,
      }))
    ),
  ],
  generate: vectors.map(($) => ({ secret: $.secret, public: $.public })),
  sign: vectors.map(($) => ({
    secret: $.secret,
    message: $.message,
    signature: $.signature,
  })),
  verify: [
    ...vectors.map(($) => ({
      public: $.public,
      message: $.message,
      signature: $.signature,
      result: true,
    })),
    ...JSON.parse(ed25519).testGroups.flatMap((group: {
      publicKey: { pk: string };
      tests: { msg: string; sig: string; result: "valid" | "invalid" }[];
    }) =>
      group.tests.map(($) => ({
        public: group.publicKey.pk,
        message: $.msg,
        signature: $.sig,
        result: $.result === "valid",
      }))
    ),
  ],
}, "624d70a3c46fa12d7d7ec7399d26ffc8fa372429b6c06674f7be1d5a28019a32");
