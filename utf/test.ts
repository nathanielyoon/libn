import {
  uncase,
  uncode,
  unhtml,
  unline,
  unlone,
  unmark,
  unrexp,
  unwide,
} from "@libn/utf";
import {
  assertEquals,
  assertMatch,
  assertNotEquals,
  assertNotMatch,
} from "@std/assert";
import fc from "fast-check";
import vectors from "./vectors.json" with { type: "json" };

const from = String.fromCodePoint;
Deno.test("normalize.uncode() passes reference vectors", () => {
  const to = new Uint32Array(0x110000).fill(0xfffd);
  for (const $ of vectors.uncode) {
    if (typeof $ === "number") to[$] = $;
    else for (let z = $[0]; z <= $[1]; ++z) to[z] = z;
  }
  for (let z = 0; z < 0x110000; ++z) {
    assertEquals(to[uncode(from(z)).codePointAt(0)!], to[z]);
  }
});
Deno.test("normalize.unlone() replaces lone surrogates", () =>
  fc.assert(fc.property(
    fc.uint16Array().map(($) => $.reduce((to, code) => to + from(code), "")),
    ($) => {
      assertEquals(unlone($), $.toWellFormed());
    },
  )));
Deno.test("normalize.unlone() never changes string length", () =>
  fc.assert(fc.property(
    fc.stringMatching(
      /^(?:[\ud800-\udbff](?:[^\udc00-\udfff]|$)|(?:^|[^\ud800-\udbff])[\udc00-\udfff])*$/,
    ),
    ($) => {
      assertEquals(unlone($).length, $.length);
    },
  )));
const assertReplaced = ($: number) => assertEquals(uncode(from($)), "\ufffd");
Deno.test("normalize.uncode() replaces all control codes", () => {
  for (let z = 0x00; z <= 0x1f; ++z) {
    z === 0x9 || z === 0xa || z === 0xd || assertReplaced(z);
  }
  for (let z = 0x7f; z <= 0x9f; ++z) assertReplaced(z);
});
Deno.test("normalize.uncode() replaces all un-paired surrogates", () => {
  for (let z = 0xd800; z <= 0xdfff; ++z) assertReplaced(z);
  for (let z = 0x10000; z <= 0x10ffff; ++z) {
    assertEquals(
      from(0xd800 | z - 0x10000 >> 10) + from(0xdc00 | z - 0x10000 & 0x3ff),
      from(z),
    );
  }
});
Deno.test("normalize.uncode() replaces all noncharacters", () =>
  Array(0x11).keys().forEach(($) => {
    assertReplaced($ << 16 | 0xfffe);
    assertEquals(uncode(from($ << 16 | 0xffff)), "\ufffd");
  }));
Deno.test("normalize.unline() replaces weird breaks with linefeeds", () =>
  fc.assert(fc.property(
    fc.nat({ max: 255 }).chain(($) =>
      fc.record({
        string: fc.array(
          fc.constantFrom("\r\n", "\n", "\u2028", "\u2029"),
          { minLength: $, maxLength: $ },
        ).map(($) => $.join("")),
        length: fc.constant($),
      })
    ),
    ({ string, length }) => {
      assertEquals(unline(string), "\n".repeat(length));
    },
  )));
Deno.test("normalize.unline() matches any break", () =>
  ["\r\n", "\x85", "\u2028", "\u2029"].forEach(($) => {
    assertEquals(unline($), "\n");
  }));
Deno.test("normalize.unwide() trims", () =>
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    assertNotMatch(unwide($), /^\s|\s$/);
  })));
Deno.test("normalize.unwide() collapses consecutive spaces", () =>
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    assertMatch(unwide($), /^(?:\S|(\s|\r\n)(?!\1))*$/);
  })));
Deno.test("normalize.unwide() matches any space", () =>
  Array.from({ length: 11 }, (_, z) => z + 0x2000).concat(
    [0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff],
  ).map(($) => from($)).concat(
    ["\t", "\n", "\v", "\f", "\r", "\r\n", " ", "\xa0"],
  ).forEach(($) => {
    for (let z = 1; z < 9; ++z) {
      assertEquals(unwide(`\0${$.repeat(z)}\0`).slice(1, -1), $);
    }
  }));
Deno.test("normalize.unmark() removes diacritics", () =>
  fc.assert(fc.property(
    fc.record({
      character: fc.oneof(
        fc.integer({ min: 0x41, max: 0x5a }),
        fc.integer({ min: 0x61, max: 0x7a }),
      ).map(from),
      mark: fc.integer({ min: 0x300, max: 0x36f }).map(from),
    }),
    ({ character, mark }) => {
      assertEquals(unmark(character + mark), character);
    },
  )));
Deno.test("normalize.unhtml() removes special html characters", () =>
  fc.assert(fc.property(fc.string(), ($) => {
    assertMatch(unhtml($), /^(?:[^&"'<>]|&#\d\d;)*$/);
  })));
Deno.test("normalize.unhtml() escapes with right codes", () =>
  fc.assert(fc.property(
    fc.string({ unit: fc.constantFrom('"', "&", "'", "<", ">") }),
    ($) => {
      const codes = unhtml($).match(/&#[\da-f]{2};/g) ?? [];
      assertEquals(codes.length, $.length);
      for (let z = 0; z < $.length; ++z) {
        assertEquals(+codes[z].slice(2, -1), $.charCodeAt(z));
      }
    },
  )));
Deno.test("normalize.unrexp() makes literal", () =>
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    assertMatch($, RegExp(`^${unrexp($)}$`));
  })));
Deno.test("normalize.unrexp() escapes all regex syntax characters", () => {
  for (const $ of "/^$\\*+?{}()[]|") assertEquals(unrexp($), `\\${$}`);
});
Deno.test("normalize.unrexp() escapes all directly-escapable characters", () => {
  assertEquals(unrexp("\t"), "\\t");
  assertEquals(unrexp("\n"), "\\n");
  assertEquals(unrexp("\v"), "\\v");
  assertEquals(unrexp("\f"), "\\f");
  assertEquals(unrexp("\r"), "\\r");
});
Deno.test("normalize.unrexp() escapes all weird characters", () => {
  for (let z = 0; z < 0x08; ++z) {
    assertEquals(unrexp(from(z)), `\\x${z.toString(16).padStart(2, "0")}`);
  }
  for (let z = 0x0e; z <= 0x23; ++z) {
    assertEquals(unrexp(from(z)), `\\x${z.toString(16).padStart(2, "0")}`);
  }
  for (const $ of "&',-:;<=>@_`~\x7f\x85\xa0") {
    assertEquals(unrexp($), `\\x${$.charCodeAt(0).toString(16)}`);
  }
  for (let z = 0x2000; z <= 0x200a; ++z) {
    assertEquals(unrexp(from(z)), `\\u${z.toString(16)}`);
  }
  for (const $ of "\u1680\u2028\u2029\u202f\u205f\u3000\uffef") {
    assertEquals(unrexp($), `\\u${$.charCodeAt(0).toString(16)}`);
  }
});
Deno.test("normalize.unrexp() escapes the first character if alphanumeric", () => {
  for (let z = 0; z < 10; ++z) {
    assertEquals(unrexp(`${z}${z}`), `\\x${(z + 0x30).toString(16)}${z}`);
  }
  for (let $ of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    assertEquals(unrexp(`${$}${$}`), `\\x${$.charCodeAt(0).toString(16)}${$}`);
    assertEquals(
      unrexp(`${$ = $.toLowerCase()}${$}`),
      `\\x${$.charCodeAt(0).toString(16)}${$}`,
    );
  }
});
Deno.test("fold.uncase() passes reference vectors", () => {
  assertEquals(uncase(vectors.uncase[0]), vectors.uncase[1]);
});
Deno.test("fold.uncase() un-mixes case", () =>
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    assertEquals(uncase($), uncase($.toLowerCase()));
  })));
Deno.test("fold.uncase() uses full case folding", () => {
  assertNotEquals("\xdf".length, uncase("\xdf").length);
  assertNotEquals("\u0130".length, uncase("\u0130").length);
  assertNotEquals("\u0149".length, uncase("\u0149").length);
  assertNotEquals("\u01f0".length, uncase("\u01f0").length);
});
Deno.test("fold.uncase() uses non-Turkic mappings", () => {
  assertEquals(uncase("\x49"), "\x69");
  assertEquals(uncase("\u0130"), "\x69\u0307");
});
import.meta.main && Promise.all([
  fetch(
    "https://www.rfc-editor.org/rfc/rfc9839.txt",
  ).then(($) => $.text()).then(($) => $.slice(14538, 15597)),
  fetch(
    "https://www.unicode.org/Public/UNIDATA/CaseFolding.txt",
  ).then(($) => $.text()).then(async ($) => {
    await Deno.writeTextFile(`${import.meta.dirname}/CaseFolding.txt`, $);
    return $.slice(2990, 87528);
  }),
]).then(([rfc9839, fold]) => ({
  uncode: rfc9839.match(/(?<=%x)\w+(?:-\w+)?/g)!.map((hex) =>
    hex.length === 1
      ? parseInt(hex, 16)
      : hex.split("-").map(($) => parseInt($, 16))
  ),
  uncase: fold.matchAll(/^([\dA-F]{4,}); [CF]; ([^;]+)/gm).reduce((to, $) => [
    to[0] + from(parseInt($[1], 16)),
    to[1] + from(...$[2].split(" ").map((hex) => parseInt(hex, 16))),
  ], ["", ""]),
})).then(($) =>
  Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
);
