import { Document, Element } from "@b-fuze/deno-dom/native";
import { h } from "@libn/element";
import { lowerKebab } from "@libn/words";
import { is } from "@libn/is";
import { assertEquals } from "@std/assert";
import fc from "fast-check";

Deno.test.beforeAll(() => {
  globalThis.document = new Document() as any;
  globalThis.Element = Element as any;
});
Deno.test("h() creates tags", () => {
  const a = h("a");
  assertEquals(is<HTMLAnchorElement>()(a).outerHTML, "<a></a>");
  const b = h("b");
  assertEquals(is<HTMLElement>()(b).outerHTML, "<b></b>");
  const c = h("c");
  assertEquals(is<HTMLUnknownElement>()(c).outerHTML, "<c></c>");
});
Deno.test("h() sets style", () => {
  for (const $ of ["color", "fontSize", "bottomBorder", "wordWrap"] as const) {
    assertEquals(
      h("a", { style: { [$]: "0" } }).outerHTML,
      `<a style="${lowerKebab($)}:0"></a>`,
    );
  }
});
Deno.test("h() attaches known listeners", () =>
  fc.assert(fc.property(fc.nat({ max: 1e3 }), (count) => {
    let actual = 0;
    const element = h("a", {
      on: {
        click: ($) => {
          is<PointerEvent & { currentTarget: typeof element }>()($);
          ++actual;
        },
      },
    });
    for (let z = 0; z < count; ++z) element.dispatchEvent(new Event("click"));
    assertEquals(actual, count);
  })));
Deno.test("h() sets attributes", () =>
  fc.assert(fc.property(
    fc.dictionary(
      fc.string().map(($) => $.toLowerCase()).filter(($) =>
        $ !== "on" && $ !== "style"
      ),
      fc.option(fc.string()),
    ),
    ($) => {
      const element = h("a", $);
      for (const [key, value] of Object.entries($)) {
        assertEquals(element.getAttribute(key), value);
      }
    },
  )));
