import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_str, pure } from "@libn/lib";
import { de_csv, en_csv } from "../mod.ts";

const fc_rows = (size?: number) =>
  fc.array(
    fc.array(
      fc.oneof(
        { weight: 7, arbitrary: fc_str() },
        { weight: 1, arbitrary: fc.constant(null) },
      ),
      { minLength: size ?? 1, maxLength: size ?? 64 },
    ),
    { minLength: 1 },
  ).map(($) => ({ json: $, csv: en_csv($) }));
Deno.test("en_csv/de_csv : arbitrary round-trip", () =>
  fc_assert(fc_rows())(({ json, csv }) =>
    assertEquals(de_csv(csv, { eager: false }), json)
  ));
Deno.test("en_csv/de_csv : eager round-trip", () =>
  fc_assert(fc.integer({ min: 1, max: 64 }).chain(fc_rows))(({ json, csv }) =>
    assertEquals(de_csv(csv), json)
  ));
Deno.test("bundle : pure", pure);
