import { assertEquals, assertMatch } from "@std/assert";
import fc from "fast-check";
import { fc_check, fc_num, fc_str } from "../test.ts";
import { escape, html } from "./mod.ts";

const fc_special = fc_str({
  unit: fc.oneof(
    fc.constantFrom('"', "&", "<", ">"),
    fc_str({ minLength: 1, maxLength: 1 }),
  ),
});
const ESCAPED = /^(?:[^"&<>]|&(?:quot|amp|[lg]t);)*$/;
Deno.test("escape escapes special characters", () =>
  fc_check(fc.property(fc_special, ($) => assertMatch(escape($), ESCAPED))));
Deno.test("html escapes special characters", () =>
  fc_check(fc.property(
    fc.oneof(fc.option(fc_num()), fc_special, fc.array(fc_special)),
    ($) => assertMatch(html({ raw: ["", ""] }, $), ESCAPED),
  )));
Deno.test("html doesn't escape when prefixed with $", () =>
  fc_check(fc.property(
    fc_special,
    ($) => assertEquals(html({ raw: ["$", ""] }, $), $),
  )));
