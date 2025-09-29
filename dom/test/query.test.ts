import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_str } from "@libn/lib";
import { html } from "../src/create.ts";
import { qa, qs } from "../src/query.ts";
import { fc_letter, fc_tag } from "./common.ts";

const { fc_html } = fc.letrec<{ fc_html: HTMLElement }>((tie) => ({
  fc_html: fc.tuple(
    fc_tag,
    fc_letter,
    fc.array(fc.oneof(
      fc.constantFrom(undefined, () => null),
      fc_str(),
      tie("fc_html"),
    )),
  ).map(([tag, name, children]) => html(`${tag}.${name}`, {}, ...children)),
}));
const fc_selector = fc.array(
  fc.oneof(fc_tag, fc_letter.map(($) => "." + $)),
  { minLength: 1 },
).map(($) => $.join(" "));
Deno.test("qs :: Element.prototype.queryselector", () =>
  fc_assert(fc_html, fc_selector)((html, selector) =>
    assertEquals(
      qs(selector, html)?.outerHTML,
      html.querySelector(selector)?.outerHTML,
    )
  ));
Deno.test("qa :: Element.prototype.querySelectorAll", () =>
  fc_assert(fc_html, fc_selector)((html, selector) =>
    assertEquals(
      qa(selector, html).map(($) => $.outerHTML),
      [...html.querySelectorAll(selector)].map(($) => $.outerHTML),
    )
  ));
