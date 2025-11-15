import { h } from "@libn/element";
import { lowerKebab } from "@libn/words";
import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { parseHTML } from "linkedom";
import { fcStr, type } from "../test.ts";

globalThis.document = parseHTML("").document;
Deno.test("h : tags", () => {
  const a = h("a");
  assertEquals(type<HTMLAnchorElement>()(a).outerHTML, "<a></a>");
  const b = h("b");
  assertEquals(type<HTMLElement>()(b).outerHTML, "<b></b>");
  const c = h("c");
  assertEquals(type<HTMLUnknownElement>()(c).outerHTML, "<c></c>");
});
Deno.test("h : style", () => {
  for (const $ of ["color", "fontSize", "bottomBorder", "wordWrap"] as const) {
    assertEquals(
      h("a", { style: { [$]: "0" } }).outerHTML,
      `<a style="${lowerKebab($)}:0"></a>`,
    );
  }
});
Deno.test("h : event listeners", () => {
  fc.assert(fc.property(fc.nat({ max: 1e3 }), (count) => {
    let actual = 0;
    const element = h("a", {
      on: {
        click: ($) => {
          type<PointerEvent & { currentTarget: typeof element }>()($);
          ++actual;
        },
      },
    });
    for (let z = 0; z < count; ++z) element.click();
    assertEquals(actual, count);
  }));
});
Deno.test("h : attributes", () => {
  fc.assert(fc.property(
    fc.dictionary(
      fcStr().map(($) => $.toLowerCase()).filter(($) =>
        $ !== "on" && $ !== "style"
      ),
      fc.option(fcStr()),
    ),
    ($) => {
      const element = h("a", $);
      for (const [key, value] of Object.entries($)) {
        assertEquals(element.getAttribute(key), value);
      }
    },
  ));
});
const fcText = fcStr(/^[^'&"<>]*$/);
const fcNode = fc.oneof(
  fc.tuple(fcText, fcText).map(([tag, text]) => h(tag, {}, text)),
  fcText,
  fc.constantFrom(null, undefined),
);
Deno.test("h : children", () => {
  fc.assert(fc.property(
    fc.array(
      fc.oneof(fcNode, fc.array(fcNode)).chain(($) =>
        fc.constantFrom($, () => $, (parent: HTMLElement) => {
          for (const child of [$].flat()) child && parent.append(child);
        })
      ),
    ),
    ($) => {
      assertEquals(
        h("a", {}, ...$).innerHTML.trim(),
        $.flat().flatMap((child) => {
          if (typeof child === "string") {
            return child.replaceAll("&", "&amp;").replaceAll('"', "&#34;")
              .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
          }
          if (typeof child !== "function") return child;
          const parent = h("a");
          return child(parent) ?? parent.innerHTML;
        }).reduce<string>(
          (to, $) => to + (typeof $ === "string" ? $ : $?.outerHTML ?? ""),
          "",
        ).trim(),
      );
    },
  ));
});
