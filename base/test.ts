import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_check, get_rfc, vectors } from "@nyoon/test";
import { de_b16, en_b16 } from "./16.ts";
import { de_b32, de_h32, en_b32, en_h32 } from "./32.ts";
import { de_b64, de_u64, en_b64, en_u64 } from "./64.ts";
import { de_bin, en_bin } from "./mod.ts";

Deno.test("encode/decode functions convert losslessly", () =>
  ([
    [en_b16, de_b16],
    [en_b32, de_b32],
    [en_h32, de_h32],
    [en_b64, de_b64],
    [en_u64, de_u64],
  ] as const).forEach(([encode, decode]) =>
    fc_check(({ bin }) =>
      fc.property(bin(), ($) => assertEquals(decode(encode($)), $))
    )
  ));
await vectors(import.meta, () =>
  get_rfc(4648, 25691, 26723).then((text) => {
    const all: { [base: string]: {} } = {};
    for (const base of ["16", "32", "32-hex", "64", "64url"]) {
      all[`base${base.replace("-", "")}`] = text.slice(25691, 26723).matchAll(
        RegExp(`^ {3}BASE${base.toUpperCase()}\\("(.*)"\\) = "(.*)"$`, "gm"),
      ).map(([_, ascii, binary]) => {
        if (base === "16") return { ascii, binary: binary.toLowerCase() };
        if (base === "64") return { ascii, binary };
        return { ascii, binary: binary.replace(/=+$/, "") };
      }).toArray();
    }
    return all;
  }));
Deno.test("match RFC4648 test vectors", async () => {
  const { default: { base16, base32, base32hex, base64, base64url } } =
    await import("./vectors.json", { with: { type: "json" } });
  ([
    [en_b16, de_b16, base16],
    [en_b32, de_b32, base32],
    [en_h32, de_h32, base32hex],
    [en_b64, de_b64, base64],
    [en_u64, de_u64, base64url],
  ] as const).forEach(([encode, decode, data]) =>
    data.forEach(({ ascii, binary }) => {
      assertEquals(encode(en_bin(ascii)), binary);
      assertEquals(de_bin(decode(binary)), ascii);
    })
  );
});
Deno.test("bound functions match separate instantiations", () => {
  fc_check(({ str }) =>
    fc.property(
      str(),
      ($) => assertEquals(en_bin($), new TextEncoder().encode($)),
    )
  );
  fc_check(({ bin }) =>
    fc.property(
      bin(),
      ($) => assertEquals(de_bin($), new TextDecoder().decode($)),
    )
  );
});
