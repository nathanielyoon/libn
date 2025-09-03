import { assertEquals, assertMatch } from "@std/assert";
import fc from "fast-check";
import { DOMParser } from "@b-fuze/deno-dom/native";
import { fc_check, fc_num, fc_str } from "../test.ts";
import type { Tag, Writable } from "./src/types.ts";
import { escape, html } from "./src/escape.ts";
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
globalThis.document = new DOMParser().parseFromString("", "text/html") as any;
const fc_upper = fc.stringMatching(/^[A-Z]$/);
const ce = <A extends Tag>($: A, parent?: Node, set?: Partial<Writable<A>>) => {
  const a = document.createElement($);
  if (set) {
    parent?.appendChild(a); // @ts-expect-error: it'll be ok
    for (const $ of Object.keys(set)) if (set[$] !== undefined) a[$] = set[$];
  }
  return a;
};
const fc_ce =
  (tag: Tag, children?: (parent: Element) => fc.Arbitrary<Element>) =>
  (parent: Element) =>
    fc_upper.map((className) => ce(tag, parent, { className })).chain(($) =>
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
