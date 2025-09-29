import { assertEquals } from "@std/assert";
import { fc_assert, fc_bin, fc_str, pure } from "@libn/lib";
import { de_bin, en_bin } from "../mod.ts";

Deno.test("en_bin :: separate instantiations and calls", () =>
  fc_assert(fc_str())(($) =>
    assertEquals(en_bin($), new TextEncoder().encode($))
  ));
Deno.test("de_bin :: separate instantiations and calls", () =>
  fc_assert(fc_bin())(($) =>
    assertEquals(de_bin($), new TextDecoder().decode($))
  ));
Deno.test("bundle : pure", pure);
