import { Document, Element as DenoDomElement } from "@b-fuze/deno-dom/native";
import { h } from "@libn/element";
import { is } from "@libn/is";
import { queryEvery, queryFirst } from "@libn/query";
import { assertStrictEquals } from "@std/assert";
import fc from "fast-check";

Deno.test.beforeAll(() => {
  globalThis.document = new Document() as any;
  globalThis.Element = DenoDomElement as any;
});
const fcText = fc.stringMatching(/^[^'&"<>]*$/);
const fcId = fc.stringMatching(/^[a-z]$/);
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
Deno.test("select.qs() follows built-in querySelector", () =>
  fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
    assertStrictEquals(queryFirst(query, html), html.querySelector(query));
  })));
Deno.test("select.qs() strips selector", () => {
  const a = h("a", { id: "a", class: "class" });
  const body = h("body", {}, h("main", {}, h("c", {}, h("b"), a)));
  const query = queryFirst("body > main b + a#a.class", body);
  assertStrictEquals(is<HTMLAnchorElement | null>()(query), a);
});
Deno.test("select.qa() follows built-in querySelectorAll", () =>
  fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
    const actual = queryEvery(query, html);
    const expected = html.querySelectorAll(query);
    for (let z = 0; z < actual.length; ++z) {
      assertStrictEquals(actual[z], expected.item(z));
    }
  })));
Deno.test("select.qa() strips selector", () => {
  const a = h("a", { id: "a", class: "class" });
  const b = h("div", { id: "b", class: "class" });
  const body = h("body", {}, h("main", {}, h("c", {}, h("b", {}, a), b)));
  const query = queryEvery(
    "body > main > c a#a.class, body b ~ div#b.class",
    body,
  );
  is<(HTMLAnchorElement | HTMLDivElement)[]>()(query);
  assertStrictEquals(query[0], a), assertStrictEquals(query[1], b);
});
