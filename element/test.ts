import { assertEquals, assertMatch } from "@std/assert";
import fc from "fast-check";
import { DOMParser } from "@b-fuze/deno-dom/native";
import { fc_check, fc_str } from "../test.ts";
import type { Html } from "./src/types.ts";
import { escape } from "./src/escape.ts";
import { qa, qs } from "./src/query.ts";

const fc_special = fc_str({
  unit: fc.oneof(
    fc.constantFrom('"', "&", "<", ">"),
    fc_str({ minLength: 1, maxLength: 1 }),
  ),
});
const ESCAPED = /^(?:[^"&<>]|&(?:quot|amp|[lg]t);)*$/;
Deno.test("escape escapes special characters", () =>
  fc_check(fc.property(fc_special, ($) => assertMatch(escape($), ESCAPED))));
globalThis.document = new DOMParser().parseFromString("", "text/html") as any;
const fc_upper = fc.stringMatching(/^[A-Z]$/);
const ce = <A extends keyof Html>($: A, parent?: Node, className?: string) => {
  const a = document.createElement($);
  return parent?.appendChild(a), className && (a.className = className), a;
};
const fc_ce =
  (tag: keyof Html, children?: (parent: Element) => fc.Arbitrary<Element>) =>
  (parent: Element) =>
    fc_upper.map((className) => ce(tag, parent, className)).chain(($) =>
      children ? fc.array(children($)).map(() => parent) : fc.constant(parent)
    );
const fc_html = fc_ce("div", fc_ce("span", fc_ce("br")))(ce("html"));
const fc_selector = fc.array(
  fc.array(fc_upper.map(($) => `.${$}`), { minLength: 1, maxLength: 8 })
    .map(($) => `:is(${$.join(", ")})`),
  { minLength: 3, maxLength: 3 },
).map(([div, span, br]) => `html>div${div}>span${span}>br${br}`);
Deno.test("qs matches querySelector", () =>
  fc_check(
    fc.property(fc_html, fc_selector, (html, selector) =>
      assertEquals(qs(selector, html), html.querySelector(selector))),
  ));
Deno.test("qa matches querySelectorAll", () =>
  fc_check(fc.property(fc_html, fc_selector, (html, selector) =>
    assertEquals(
      qa(selector, html),
      [...html.querySelectorAll(selector)],
    ))));
