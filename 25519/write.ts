import { get_rfc, get_wycheproof, hex, write_vectors } from "../test.ts";

await write_vectors(import.meta, {
  rfc7748: await get_rfc(7748, 18645, 25092).then(($) => [{
    secret_key: hex($.slice(0, 64)),
    public_key: hex($.slice(221, 285)),
    shared_secret: hex($.slice(449, 513)),
  }, {
    secret_key: hex($.slice(537, 601)),
    public_key: hex($.slice(758, 822)),
    shared_secret: hex($.slice(985, 1049)),
  }, {
    secret_key: hex($.slice(5979, 6043)),
    public_key: hex($.slice(6286, 6350)),
    shared_secret: hex($.slice(6383, 6447)),
  }, {
    secret_key: hex($.slice(6181, 6245)),
    public_key: hex($.slice(6086, 6150)),
    shared_secret: hex($.slice(6383, 6447)),
  }]),
  rfc8032: await get_rfc(8032, 47250, 52154).then(($) => [{
    secret_key: hex($.slice(0, 68)),
    public_key: hex($.slice(88, 156)),
    data: hex($.slice(186, 186)),
    signature: hex($.slice(205, 345)),
  }, {
    secret_key: hex($.slice(407, 475)),
    public_key: hex($.slice(495, 563)),
    data: hex($.slice(596, 598)),
    signature: hex($.slice(617, 757)),
  }, {
    secret_key: hex($.slice(971, 1039)),
    public_key: hex($.slice(1059, 1127)),
    data: hex($.slice(1161, 1165)),
    signature: hex($.slice(1184, 1324)),
  }, {
    secret_key: hex($.slice(1389, 1457)),
    public_key: hex($.slice(1477, 1545)),
    data: hex($.slice(1582, 2010) + $.slice(2167, 3891) + $.slice(4048, 4186)),
    signature: hex($.slice(4205, 4345)),
  }, {
    secret_key: hex($.slice(4414, 4482)),
    public_key: hex($.slice(4502, 4570)),
    data: hex($.slice(4605, 4745)),
    signature: hex($.slice(4764, 4904)),
  }]),
  wycheproof_x25519: await get_wycheproof<
    { private: string; public: string; shared: string }
  >(
    "6b17607867ce8e3c3a2a4e1e35ccc3b42bfd75e3",
    "x25519",
    ({ tests }) =>
      tests.map(($) => ({
        secret_key: $.private,
        public_key: $.public,
        shared_secret: $.shared,
      })),
  ),
  wycheproof_ed25519: await get_wycheproof<
    { msg: string; sig: string; result: "valid" | "invalid" },
    { publicKey: { pk: string } }
  >(
    "0d2dab394df1eb05b0865977f7633d010a98bccd",
    "ed25519",
    ({ publicKey: { pk }, tests }) =>
      tests.map(($) => ({
        public_key: pk,
        data: $.msg,
        signature: $.sig,
        result: $.result === "valid",
      })),
  ),
});
