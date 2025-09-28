import { assertEquals, assertThrows } from "@std/assert";
import fc from "fast-check";
import { DOMParser, Element } from "@b-fuze/deno-dom/native";
import { fc_check, fc_str } from "@libn/lib";
import { html } from "./src/create.ts";
import { qa, qs } from "./src/query.ts";

Deno.test.beforeAll(() => {
  globalThis.document = new DOMParser().parseFromString("", "text/html") as any;
  globalThis.Element = Element as any;
});
const fc_tag = fc.constantFrom("b", "u", "s");
const fc_letter = fc.string({
  minLength: 1,
  maxLength: 1,
  unit: fc.integer({ min: 97, max: 122 }).map(String.fromCharCode),
});
Deno.test("create", async ({ step }) => {
  await step("html :: document.createElement", () => {
    fc_check(fc.property(
      fc_tag,
      fc_letter,
      fc.uniqueArray(fc_letter).map(($) => $.join(" ")),
      fc_letter.map(($) => `data-${$}`),
      fc_letter,
      fc_tag.map(html),
      fc.nat({ max: 10 }),
      fc.nat(),
      (tag, id, class_name, key, value, child, repeat, $) => {
        const temp: number[] = [];
        const element = html(
          `${tag}#${id}${
            class_name && "." + class_name.replaceAll(" ", ".")
          }[${key}="${value}"]`,
          tag,
          child,
          { click: () => temp.push($) },
        );
        assertEquals(
          element.outerHTML,
          `<${tag} id="${id}"${
            class_name && ` class="${class_name}"`
          } ${key}="${value}">${tag}${child.outerHTML}</${tag}>`,
        );
        assertEquals(element.id, id);
        assertEquals(element.className, class_name);
        assertEquals(element.getAttribute(key), value);
        for (let z = 0; z < repeat; ++z) {
          element.dispatchEvent(new Event("click"));
        }
        assertEquals(temp, Array(repeat).fill($));
      },
    ));
  });
  await step("html : invalid selector", () => {
    fc_check(fc.property(
      fc_tag,
      fc.stringMatching(
        /^(?:[^-A-Za-z\\_\u00a0-\uffff]|-\d)[^-\w\\\u00a0-\uffff]*$/,
      ),
      (tag, id) => void assertThrows(() => html(`${tag}#${id}`)),
    ));
  });
});
Deno.test("query", async ({ step }) => {
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
  await step("qs :: document.queryselector", () => {
    fc_check(fc.property(fc_html, fc_selector, (html, selector) =>
      assertEquals(
        qs(selector, html)?.outerHTML,
        html.querySelector(selector)?.outerHTML,
      )));
  });
  await step("qa :: document.querySelectorAll", () => {
    fc_check(fc.property(fc_html, fc_selector, (html, selector) =>
      assertEquals(
        qa(selector, html).map(($) => $.outerHTML),
        [...html.querySelectorAll(selector)].map(($) => $.outerHTML),
      )));
  });
});
