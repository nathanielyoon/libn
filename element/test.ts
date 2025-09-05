import { assertEquals, assertMatch } from "@std/assert";
import fc from "fast-check";
import { DOMParser } from "@b-fuze/deno-dom/native";
import { fc_check, fc_str } from "../test.ts";
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
await import("./src/create.ts").then(({ html, svg }) => {
  const fc_upper = fc.stringMatching(/^[A-Z]$/);
  const fc_parts = fc.tuple(
    fc.constantFrom(1, 2, 3, 4, 5, 6).map(($) => `h${$}` as const),
    fc_upper,
    fc.constantFrom("b", "i", "q", "s", "u"),
    fc_upper,
  );
  const is_element = ({ parts: [parent, id, child, text], element }: {
    parts: [parent: string, id: string, child: string, text: string];
    element: Element;
  }) =>
    assertEquals(
      (element.parentElement ?? element).outerHTML,
      `<${parent} id="${id}"><${child}>${text}</${child}></${parent}>`,
    );
  Deno.test("html directly creates html elements", () =>
    fc_check(fc.property(
      fc_parts.map(($) => ({
        parts: $,
        element: html($[2], html($[0], null, { id: $[1] }), {
          textContent: $[3],
        }),
      })),
      is_element,
    )));
  Deno.test("html builds chained html elements", () =>
    fc_check(fc.property(
      fc_parts.chain(($) =>
        fc.record({
          parts: fc.constant($),
          element: fc.constantFrom(
            html[$[0]].id($[1])(html[$[2]]($[3])),
            html[$[0]].id($[1])(() => html[$[2]]([$[3]])),
          ),
        })
      ),
      is_element,
    )));
  const fc_html = (
    tag: keyof HTMLElementTagNameMap,
    children?: (parent: Element) => fc.Arbitrary<Element>,
  ) =>
  (parent: Element) =>
    fc_upper.map((className) => html(tag, parent, { className })).chain(($) =>
      children ? fc.array(children($)).map(() => parent) : fc.constant(parent)
    );
  const fc_tree = fc_html("div", fc_html("span", fc_html("br")))(html("html"));
  const fc_selector = fc.array(
    fc.array(fc_upper.map(($) => `.${$}`), { minLength: 1, maxLength: 8 })
      .map(($) => `:is(${$.join(", ")})`),
    { minLength: 3, maxLength: 3 },
  ).map(([div, span, br]) => `html>div${div}>span${span}>br${br}`);
  Deno.test("qs matches querySelector", () =>
    fc_check(
      fc.property(fc_tree, fc_selector, (html, selector) =>
        assertEquals(qs(selector, html), html.querySelector(selector))),
    ));
  Deno.test("qa matches querySelectorAll", () =>
    fc_check(fc.property(fc_tree, fc_selector, (html, selector) =>
      assertEquals(
        qa(selector, html),
        [...html.querySelectorAll(selector)],
      ))));
});
