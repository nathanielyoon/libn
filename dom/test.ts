import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { DOMParser } from "@b-fuze/deno-dom/native";
import { fc_check, fc_str } from "../test.ts";
import { html, qa, qs } from "./mod.ts";

globalThis.document = new DOMParser().parseFromString("", "text/html") as any;
const fc_tag = fc.constantFrom("b", "u", "s");
const fc_letter = fc.string({
  minLength: 1,
  maxLength: 1,
  unit: fc.constantFrom("A", "B", "C"),
});
const { fc_html } = fc.letrec<{ fc_html: Element }>((tie) => ({
  fc_html: fc.tuple(
    fc_tag,
    fc.record({
      className: fc_letter,
    }),
    fc.array(
      fc.oneof(
        fc.constantFrom(undefined, () => null),
        fc_str(),
        tie("fc_html"),
      ),
    ),
  ).map(([tag, assign, children]) => html(tag, assign)(...children)),
}));
const fc_selector = fc.array(
  fc.oneof(fc_tag, fc_letter.map(($) => "." + $)),
  {
    minLength: 1,
  },
).map(($) => $.join(" "));
Deno.test("qs matches querySelector", () =>
  fc_check(fc.property(fc_html, fc_selector, (html, selector) =>
    assertEquals(
      qs(selector, html)?.outerHTML,
      html.querySelector(selector)?.outerHTML,
    ))));
Deno.test("qa matches querySelector", () =>
  fc_check(fc.property(fc_html, fc_selector, (html, selector) =>
    assertEquals(
      qa(selector, html).map(($) => $.outerHTML),
      [...html.querySelectorAll(selector)].map(($) => $.outerHTML),
    ))));
