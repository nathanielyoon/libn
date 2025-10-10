import { assertType, type Has, type IsExact } from "@std/testing/types";
import { expect } from "@std/expect/expect";
import fc from "fast-check";
import { Document, Element as DenoDomElement } from "@b-fuze/deno-dom";
import { unhtml } from "@libn/text/normalize";
import { ce } from "@libn/query/create";
import { qa, qs } from "@libn/query/query";

Deno.test.beforeAll(() => {
  globalThis.Element = DenoDomElement as any;
  globalThis.document = new Document() as any;
});
const fcText = fc.stringMatching(/^[^'&"<>]*$/);
Deno.test("ce() creates tags", () => {
  const a = ce("a");
  assertType<IsExact<typeof a, HTMLAnchorElement>>(true);
  expect(a.outerHTML).toBe("<a></a>");
  const b = ce("b");
  assertType<IsExact<typeof b, HTMLElement>>(true);
  expect(b.outerHTML).toBe("<b></b>");
  const c = ce("c");
  assertType<IsExact<typeof c, HTMLUnknownElement>>(true);
  expect(c.outerHTML).toBe("<c></c>");
});
Deno.test("ce() sets attributes", () =>
  fc.assert(fc.property(
    fc.dictionary(
      fc.string().map(($) => $.toLowerCase()),
      fc.option(fc.string()),
    ),
    ($) => {
      const element = ce("a", $);
      for (const [key, value] of Object.entries($)) {
        expect(element.getAttribute(key)).toBe(value);
      }
    },
  )));
Deno.test("ce() attaches known listeners", () =>
  fc.assert(fc.property(fc.nat({ max: 1e3 }), (count) => {
    let actual = 0;
    const element = ce("a", {
      onclick: ($) => {
        assertType<Has<typeof $, PointerEvent>>(true);
        assertType<Has<typeof $.currentTarget, typeof element>>(true);
        ++actual;
      },
    });
    for (let z = 0; z < count; ++z) element.dispatchEvent(new Event("click"));
    expect(actual).toBe(count);
  })));
Deno.test("ce() attaches arbitrary listeners", () =>
  fc.assert(fc.property(fc.string(), fc.nat({ max: 1e3 }), (event, count) => {
    let actual = 0;
    const element = ce("a", { [`on${event}`]: () => ++actual });
    for (let z = 0; z < count; ++z) element.dispatchEvent(new Event(event));
    expect(actual).toBe(count);
  })));
const fcNode = fc.oneof(
  fc.tuple(fcText, fcText).map(([tag, text]) => ce(tag, {}, text)),
  fcText,
  fc.constantFrom(null, undefined),
);
Deno.test("ce() appends children", () =>
  fc.assert(fc.property(
    fc.array(
      fc.oneof(fcNode, fc.array(fcNode)).chain(($) =>
        fc.constantFrom($, () => $)
      ),
    ),
    ($) => {
      expect(ce("a", {}, ...$).innerHTML).toBe(
        $.flat().map(($) => typeof $ === "function" ? $() : $).flat()
          .reduce((to, node) =>
            `${to}${
              typeof node === "string" ? unhtml(node) : node?.outerHTML ?? ""
            }`, ""),
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
Deno.test("qs() follows built-in querySelector", () =>
  fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
    expect(qs(query, html)).toBe(html.querySelector(query));
  })));
Deno.test("qs() strips selector", () => {
  const a = ce("a", { id: "a", class: "class" });
  const body = ce("body", {}, ce("main", {}, ce("c", {}, ce("b"), a)));
  const query = qs("body > main b + a#a.class", body);
  assertType<IsExact<typeof query, HTMLAnchorElement | null>>(true);
  expect(query).toBe(a);
});
Deno.test("qa() follows built-in querySelectorAll", () =>
  fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
    expect(qa(query, html).map(($) => $.outerHTML)).toStrictEqual(
      [...html.querySelectorAll(query)].map(($) => $.outerHTML),
    );
  })));
Deno.test("qa() strips selector", () => {
  const a = ce("a", { id: "a", class: "class" });
  const b = ce("div", { id: "b", class: "class" });
  const body = ce("body", {}, ce("main", {}, ce("c", {}, ce("b", {}, a), b)));
  const query = qa("body > main > c a#a.class, body b ~ div#b.class", body);
  assertType<IsExact<typeof query, (HTMLAnchorElement | HTMLDivElement)[]>>(
    true,
  );
  expect(query.map(($) => $.outerHTML)).toStrictEqual([
    a.outerHTML,
    b.outerHTML,
  ]);
});
