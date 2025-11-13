import { h } from "@libn/element";
import { queryEvery, queryFirst } from "@libn/query";
import { assertStrictEquals } from "@std/assert";
import fc from "fast-check";
import { parseHTML } from "linkedom";
import { fcStr, type } from "../test.ts";

globalThis.document = parseHTML("").document;
const fcText = fcStr(/^[^'&"<>]*$/);
const fcId = fcStr(/^[a-z]$/);
const fcHtml = fc.letrec<{ element: Element }>((tie) => ({
  element: fc.tuple(
    fcId,
    fc.record({ id: fcId, class: fc.array(fcId).map(($) => $.join(" ")) }),
    fc.array(fc.oneof(fcText, tie("element"))),
  ).map(([tag, attributes, children]) => h(tag, attributes, ...children)),
})).element;
const fcQuery = fc.array(
  fcId.chain(($) => fc.constantFrom($, `#${$}`, `.${$}`)),
  { minLength: 1 },
).map(($) => $.join(" "));
Deno.test("select.qs :: built-in querySelector", () => {
  fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
    assertStrictEquals(queryFirst(query, html), html.querySelector(query));
  }));
});
Deno.test("select.qs : nested selector", () => {
  const a = h("a", { id: "a", class: "class" });
  const body = h("body", {}, h("main", {}, h("c", {}, h("b"), a)));
  const query = queryFirst("body > main b + a#a.class", body);
  assertStrictEquals(type<HTMLAnchorElement | null>()(query), a);
});
Deno.test("select.qa :: built-in querySelectorAll", () => {
  fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
    const actual = queryEvery(query, html);
    const expected = html.querySelectorAll(query);
    for (let z = 0; z < actual.length; ++z) {
      assertStrictEquals(actual[z], expected.item(z));
    }
  }));
});
Deno.test("select.qa : nested selector", () => {
  const a = h("a", { id: "a", class: "class" });
  const b = h("div", { id: "b", class: "class" });
  const body = h("body", {}, h("main", {}, h("c", {}, h("b", {}, a), b)));
  const query = queryEvery(
    "body > main > c a#a.class, body b ~ div#b.class",
    body,
  );
  type<(HTMLAnchorElement | HTMLDivElement)[]>()(query);
  assertStrictEquals(query[0], a), assertStrictEquals(query[1], b);
});
