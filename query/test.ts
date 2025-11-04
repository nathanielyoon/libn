import { assertEquals, assertStrictEquals } from "@std/assert";
import { assertType, type Has, type IsExact } from "@std/testing/types";
import fc from "fast-check";
import { Document, Element as DenoDomElement } from "@b-fuze/deno-dom/native";
import { unhtml } from "@libn/text/normalize";
import { ce } from "./create.ts";
import { qa, qs } from "./select.ts";

Deno.test.beforeAll(() => {
  globalThis.document = new Document() as any;
  globalThis.Element = DenoDomElement as any;
});
const fcText = fc.stringMatching(/^[^'&"<>]*$/);
Deno.test("create", async (t) => {
  await t.step("ce() creates tags", () => {
    const a = ce("a");
    assertType<IsExact<typeof a, HTMLAnchorElement>>(true);
    assertEquals(a.outerHTML, "<a></a>");
    const b = ce("b");
    assertType<IsExact<typeof b, HTMLElement>>(true);
    assertEquals(b.outerHTML, "<b></b>");
    const c = ce("c");
    assertType<IsExact<typeof c, HTMLUnknownElement>>(true);
    assertEquals(c.outerHTML, "<c></c>");
  });
  await t.step("ce() sets attributes", () => {
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
    ));
  });
  await t.step("ce() attaches listeners", () => {
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
      assertEquals(actual, count);
    }));
    fc.assert(fc.property(fc.string(), fc.nat({ max: 1e3 }), (event, count) => {
      let actual = 0;
      const element = ce("a", { [`on${event}`]: () => ++actual });
      for (let z = 0; z < count; ++z) element.dispatchEvent(new Event(event));
      assertEquals(actual, count);
    }));
  });
  await t.step("ce() appends children", () => {
    const fcNode = fc.oneof(
      fc.tuple(fcText, fcText).map(([tag, text]) => ce(tag, {}, text)),
      fcText,
      fc.constantFrom(null, undefined),
    );
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
    ));
  });
});
Deno.test("select", async (t) => {
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
  await t.step("qs() follows built-in querySelector", () => {
    fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
      assertStrictEquals(qs(query, html), html.querySelector(query));
    }));
  });
  await t.step("qs() strips selector", () => {
    const a = ce("a", { id: "a", class: "class" });
    const body = ce("body", {}, ce("main", {}, ce("c", {}, ce("b"), a)));
    const query = qs("body > main b + a#a.class", body);
    assertType<IsExact<typeof query, HTMLAnchorElement | null>>(true);
    assertStrictEquals(query, a);
  });
  await t.step("qa() follows built-in querySelectorAll", () => {
    fc.assert(fc.property(fcHtml, fcQuery, (html, query) => {
      const actual = qa(query, html);
      const expected = html.querySelectorAll(query);
      for (let z = 0; z < actual.length; ++z) {
        assertStrictEquals(actual[z], expected.item(z));
      }
    }));
  });
  await t.step("qa() strips selector", () => {
    const a = ce("a", { id: "a", class: "class" });
    const b = ce("div", { id: "b", class: "class" });
    const body = ce("body", {}, ce("main", {}, ce("c", {}, ce("b", {}, a), b)));
    const query = qa("body > main > c a#a.class, body b ~ div#b.class", body);
    assertType<IsExact<typeof query, (HTMLAnchorElement | HTMLDivElement)[]>>(
      true,
    );
    assertStrictEquals(query[0], a);
    assertStrictEquals(query[1], b);
  });
});
