import { assert, assertEquals } from "jsr:@std/assert@^1.0.14";
import { de_b16, en_b16 } from "../../base/main.ts";
import { get_text, write } from "../../test.ts";
import { generate, sign, verify, x25519 } from "../25519.ts";

Deno.test("rfc7748", () =>
  import("./vectors/rfc.json", { with: { type: "json" } }).then(($) =>
    $.default.rfc7748.forEach(($) =>
      assertEquals(
        x25519(de_b16($.secret_key), de_b16($.public_key)),
        de_b16($.shared_secret),
      )
    )
  ));
Deno.test("rfc8032", () =>
  import("./vectors/rfc.json", { with: { type: "json" } }).then(($) =>
    $.default.rfc8032.forEach(($) => {
      const secret_key = de_b16($.secret_key),
        public_key = de_b16($.public_key);
      assertEquals(generate(secret_key), public_key);
      const message = de_b16($.data), signature = sign(secret_key, message);
      assertEquals(en_b16(signature), $.signature);
      assert(verify(public_key, message, signature));
    })
  ));
Deno.test("bad points", () => {
  const big = de_b16((1n | 1n << 255n).toString(16)).reverse();
  const empty = new Uint8Array(32);
  assert(!verify(empty, empty, empty));
  assert(!verify(big, empty, new Uint8Array(64)));
  assert(!verify(empty, empty, new Uint8Array(64).fill(-1, 32)));
  assert(!verify(empty, empty, new Uint8Array([...big, ...empty])));
});

import.meta.main && await Promise.all([
  [7748, 18645, ($: string) => [{
    secret_key: $.slice(0, 64),
    public_key: $.slice(221, 285),
    shared_secret: $.slice(449, 513),
  }, {
    secret_key: $.slice(537, 601),
    public_key: $.slice(758, 822),
    shared_secret: $.slice(985, 1049),
  }, {
    secret_key: $.slice(5979, 6043),
    public_key: $.slice(6286, 6350),
    shared_secret: $.slice(6383, 6447),
  }, {
    secret_key: $.slice(6181, 6245),
    public_key: $.slice(6086, 6150),
    shared_secret: $.slice(6383, 6447),
  }]] as const,
  [8032, 47250, ($: string) => [{
    secret_key: $.slice(0, 68),
    public_key: $.slice(88, 156),
    data: $.slice(186, 186),
    signature: $.slice(205, 345),
  }, {
    secret_key: $.slice(407, 475),
    public_key: $.slice(495, 563),
    data: $.slice(596, 598),
    signature: $.slice(617, 757),
  }, {
    secret_key: $.slice(971, 1039),
    public_key: $.slice(1059, 1127),
    data: $.slice(1161, 1165),
    signature: $.slice(1184, 1324),
  }, {
    secret_key: $.slice(1389, 1457),
    public_key: $.slice(1477, 1545),
    data: $.slice(1582, 2010) + $.slice(2167, 3891) + $.slice(4048, 4186),
    signature: $.slice(4205, 4345),
  }, {
    secret_key: $.slice(4414, 4482),
    public_key: $.slice(4502, 4570),
    data: $.slice(4605, 4745),
    signature: $.slice(4764, 4904),
  }]] as const,
].map(([rfc, start, get]) =>
  get_text(rfc, start).then((text) =>
    get(text).map(($) =>
      (Object.keys($) as (keyof typeof $)[]).reduce((all, key) => ({
        ...all,
        [key]: $[key].match(/[\dA-Fa-f]{2}/g)?.join("") ?? "",
      }), {})
    )
  )
)).then(write(import.meta, ["rfc7748", "rfc8032"]));
