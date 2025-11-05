import { assertEquals, assertStrictEquals } from "@std/assert";
import fc from "fast-check";
import { Document, Element as DenoDomElement } from "@b-fuze/deno-dom/native";
import { type } from "@libn/json/lib";
import { unhtml } from "@libn/text/normalize";
import { ce } from "./create.ts";
import { qa, qs } from "./select.ts";

Deno.test.beforeAll(() => {
  globalThis.document = new Document() as any;
  globalThis.Element = DenoDomElement as any;
});
const fcText = fc.stringMatching(/^[^'&"<>]*$/);
Deno.test("create.ce() creates tags", () => {
  const a = ce("a");
  assertEquals(type<HTMLAnchorElement>()(a).outerHTML, "<a></a>");
  const b = ce("b");
  assertEquals(type<HTMLElement>()(b).outerHTML, "<b></b>");
  const c = ce("c");
  assertEquals(type<HTMLUnknownElement>()(c).outerHTML, "<c></c>");
});
Deno.test("create.ce() sets attributes", () =>
  fc.assert(fc.property(
    fc.dictionary(
      fc.string().map(($) => $.toLowerCase()),
      fc.option(fc.string()),
    ),
    ($) => {
      const element = ce("a", $);
      for (const [key, value] of Object.entries($)) {
        assertEquals(element.getAttribute(key), value);
      }
    },
  )));
Deno.test("create.ce() attaches known listeners", () =>
  fc.assert(fc.property(fc.nat({ max: 1e3 }), (count) => {
    let actual = 0;
    const element = ce("a", {
      onclick: ($) => {
        type<PointerEvent & { currentTarget: typeof element }>()($);
        ++actual;
      },
    });
    for (let z = 0; z < count; ++z) element.dispatchEvent(new Event("click"));
    assertEquals(actual, count);
  })));
Deno.test("create.ce() attaches custom listeners", () =>
  fc.assert(fc.property(fc.string(), fc.nat({ max: 1e3 }), (event, count) => {
    let actual = 0;
    const element = ce("a", { [`on${event}`]: () => ++actual });
    for (let z = 0; z < count; ++z) element.dispatchEvent(new Event(event));
    assertEquals(actual, count);
  })));
const fcNode = fc.oneof(
  fc.tuple(fcText, fcText).map(([tag, text]) => ce(tag, {}, text)),
  fcText,
  fc.constantFrom(null, undefined),
);
Deno.test("create.ce() appends children", () =>
  fc.assert(fc.property(
    fc.array(
      fc.oneof(fcNode, fc.array(fcNode)).chain(($) =>
        fc.constantFrom($, () => $)
      ),
    ),
    ($) => {
      assertEquals(
        ce("a", {}, ...$).innerHTML,
        $.flat().map(($) => typeof $ === "function" ? $() : $).flat().reduce(
          (to, node) =>
            `${to}${
              typeof node === "string" ? unhtml(node) : node?.outerHTML ?? ""
            }`,
          "",
        ),
      );
    },
  )));
const fcId = fc.stringMatching(/^[a-z]$/);
const fcHtml = fc.letrec<{ element: Element }>((tie) => ({
  element: fc.tuple(
    fcId,
    fc.record({ id: fcId, class: fc.array(fcId).map(($) => $.join(" ")) }),
    fc.array(fc.oneof(fcText, tie("element"))),
  ).map(([tag, attributes, children]) => ce(tag, attributes, ...children)),
})).element;
const fcQuery = fc.array(
  fcId.chain(($) => fc.constantFrom($, `#${$}`, `.${$}`)),
  { minLength: 1 },
).map(($) => $.join(" "));
Deno.test("select.qs() follows built-in querySelector", () =>
  fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
    assertStrictEquals(qs(query, html), html.querySelector(query));
  })));
Deno.test("select.qs() strips selector", () => {
  const a = ce("a", { id: "a", class: "class" });
  const body = ce("body", {}, ce("main", {}, ce("c", {}, ce("b"), a)));
  const query = qs("body > main b + a#a.class", body);
  assertStrictEquals(type<HTMLAnchorElement | null>()(query), a);
});
Deno.test("select.qa() follows built-in querySelectorAll", () =>
  fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
    const actual = qa(query, html);
    const expected = html.querySelectorAll(query);
    for (let z = 0; z < actual.length; ++z) {
      assertStrictEquals(actual[z], expected.item(z));
    }
  })));
Deno.test("select.qa() strips selector", () => {
  const a = ce("a", { id: "a", class: "class" });
  const b = ce("div", { id: "b", class: "class" });
  const body = ce("body", {}, ce("main", {}, ce("c", {}, ce("b", {}, a), b)));
  const query = qa("body > main > c a#a.class, body b ~ div#b.class", body);
  type<(HTMLAnchorElement | HTMLDivElement)[]>()(query);
  assertStrictEquals(query[0], a), assertStrictEquals(query[1], b);
});
