import { assertEquals, assertThrows } from "@std/assert";
import fc from "fast-check";
import { fc_assert } from "@libn/lib";
import { html } from "../src/create.ts";
import { fc_letter, fc_tag } from "./common.ts";

Deno.test("html :: document.createElement", () =>
  fc_assert(
    fc_tag,
    fc_letter,
    fc.uniqueArray(fc_letter).map(($) => $.join(" ")),
    fc_letter.map(($) => `data-${$}`),
    fc_letter,
    fc_tag.map(html),
    fc.nat({ max: 10 }),
    fc.nat(),
  )((tag, id, class_name, key, value, child, repeat, $) => {
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
  }));
Deno.test("html : invalid selector", () =>
  fc_assert(
    fc_tag,
    fc.stringMatching(
      /^(?:[^-A-Za-z\\_\u00a0-\uffff]|-\d)[^-\w\\\u00a0-\uffff]*$/,
    ),
  )((tag, id) => void assertThrows(() => html(`${tag}#${id}`))));
