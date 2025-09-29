import { assertEquals, assertMatch } from "@std/assert";
import { de_b16 } from "@libn/base";
import { fc_assert, fc_bin, fc_num } from "@libn/lib";
import { de_a85, de_z85, en_a85, en_z85 } from "../src/85.ts";
import { round_trip } from "./common.ts";
import vectors from "./vectors.json" with { type: "json" };

const fc_multiple = fc_num({ min: 0, max: 1e3 }).map(($) => $ >> 2 << 2);
Deno.test("en_a85/de_a85 : arbitrary round-trip", () =>
  round_trip(en_a85, de_a85, fc_multiple.chain(fc_bin)));
Deno.test("en_z85/de_z85 : arbitrary round-trip", () =>
  round_trip(en_z85, de_z85, fc_multiple.chain(fc_bin)));
Deno.test("en_a85 : compress", () =>
  fc_assert(fc_multiple.map(($) => new Uint8Array($)))(($) =>
    assertMatch(en_a85($), RegExp(`^z{${$.length >> 2}}$`))
  ));
Deno.test("en_z85/de_z85 : z85 spec_32", () =>
  vectors["85"].spec_32.forEach(($) => {
    const bytes = de_b16($.bytes);
    assertEquals(en_z85(bytes), $.encoded);
    assertEquals(de_z85($.encoded), bytes);
  }));
