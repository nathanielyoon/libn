import { assertEquals, assertMatch } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_str } from "@libn/lib";
import { uncode, unlone } from "../src/normalize.ts";
import vectors from "./vectors.json" with { type: "json" };
import { uncase, unline, unmark, unwide } from "@libn/fuzz";

Deno.test("unlone : lone surrogates", () =>
  fc_assert(fc.stringMatching(
    /[\ud800-\udbff](?:[^\udc00-\udfff]|$)|(?:^|[^\ud800-\udbff])[\udc00-\udfff]/,
  ))(($) => assertEquals(unlone($), $.toWellFormed())));
Deno.test("uncode : unicode (un)assignables", () =>
  fc_assert(fc.integer({ min: 0, max: 0x10ffff }))(($) =>
    assertEquals(
      uncode(String.fromCodePoint($)),
      vectors.normalize.uncode.some((valid) =>
          typeof valid === "number"
            ? valid === $
            : $ >= valid[0] && $ <= valid[1]
        )
        ? String.fromCodePoint($)
        : "\ufffd",
    ), { numRuns: 1e5 }));
Deno.test("unline : weird breaks", () =>
  fc_assert(
    fc.nat({ max: 255 }).chain(($) =>
      fc.record({
        string: fc.array(fc.constantFrom("\r\n", "\n", "\u2028", "\u2029"), {
          minLength: $,
          maxLength: $,
        }).map(($) => $.join("")),
        length: fc.constant($),
      })
    ),
  )(($) => assertEquals(unline($.string), "\n".repeat($.length))));
Deno.test("unwide : multiple spaces", () =>
  fc_assert(fc_str({
    unit: fc.oneof(fc.stringMatching(/\s|\x85/), fc.stringMatching(/\S/)),
  }))(($) => assertMatch(unwide($), /^(?:\S|(?<!\s)\s(?!\s))*$/)));
Deno.test("unmark : diacritics", () =>
  fc_assert(
    fc.oneof(
      fc.integer({ min: 0x41, max: 0x5a }),
      fc.integer({ min: 0x61, max: 0x7a }),
    ).map(String.fromCharCode),
    fc.integer({ min: 0x300, max: 0x36f }).map(String.fromCharCode),
  )(($, mark) => assertEquals(unmark(($ + mark).normalize("NFC")), $)));
Deno.test("uncase : mixed-case", () =>
  fc_assert(
    fc_str().chain(($) =>
      fc.array(fc.mixedCase(fc.constant($)), { minLength: 1 })
    ),
  )(($) => assertEquals(new Set($.map(uncase)), new Set([uncase($[0])]))));
