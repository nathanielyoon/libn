import {
  deUtf8,
  enUtf8,
  uncase,
  uncode,
  unhtml,
  unline,
  unlone,
  unmark,
  unrexp,
} from "@libn/utf";
import { assertEquals, assertMatch, assertNotEquals } from "@std/assert";
import fc from "fast-check";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("enUtf8 :: built-in TextEncoder", () => {
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    assertEquals(enUtf8($), new TextEncoder().encode($));
  }));
});
Deno.test("deUtf8 :: built-in TextDecoder", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(deUtf8($), new TextDecoder().decode($));
  }));
});

Deno.test("unhtml : special entities", () => {
  fc.assert(fc.property(
    fc.string({
      unit: fc.oneof(
        fc.string({ minLength: 1, maxLength: 1, unit: "grapheme" }),
        fc.constantFrom(..."\"&'<>"),
      ),
    }),
    ($) => {
      const escaped = unhtml($);
      assertMatch(escaped, /^(?:[^&"'<>]|&#\d\d;)*$/);
      assertEquals(
        escaped.match(/(?<=&#)\d\d(?=;)/g) ?? [],
        $.match(/[&"'<>]/g)?.map(($) => `${$.charCodeAt(0)}`) ?? [],
      );
    },
  ));
});

Deno.test("unrexp : regex syntax characters", () => {
  for (const $ of "/^$\\*+?{}()[]|") assertEquals(unrexp($), `\\${$}`);
});
Deno.test("unrexp : hex-escaped characters", () => {
  for (let z = 0; z <= 0x23; ++z) {
    assertEquals(
      unrexp(String.fromCharCode(z)),
      `\\x${z.toString(16).padStart(2, "0")}`,
    );
  }
  for (const $ of "&',-:;<=>@_`~\x7f\x85\xa0") {
    assertEquals(unrexp($), `\\x${$.charCodeAt(0).toString(16)}`);
  }
  for (let z = 0x2000; z <= 0x200a; ++z) {
    assertEquals(unrexp(String.fromCodePoint(z)), `\\u${z.toString(16)}`);
  }
  for (const $ of "\u1680\u2028\u2029\u202f\u205f\u3000\uffef") {
    assertEquals(unrexp($), `\\u${$.charCodeAt(0).toString(16)}`);
  }
});
Deno.test("unrexp : leading alphanumeric character", () => {
  for (let z = 0; z <= 9; ++z) {
    assertEquals(
      unrexp(`${z}${z}`),
      `\\x${`${z}`.charCodeAt(0).toString(16)}${z}`,
    );
  }
  for (const $ of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") {
    assertEquals(unrexp(`${$}${$}`), `\\x${$.charCodeAt(0).toString(16)}${$}`);
  }
});

Deno.test("unlone :: built-in toWellFormed", () => {
  fc.assert(fc.property(
    fc.uint16Array().map(($) =>
      $.reduce((to, code) => to + String.fromCodePoint(code), "")
    ),
    ($) => {
      assertEquals(unlone($), $.toWellFormed());
    },
  ));
});

Deno.test("uncode : vectors", () => {
  const mapping = new Uint32Array(Uint8Array.fromBase64(vectors.uncode).buffer);
  for (let z = 0; z < 0x11000; ++z) {
    assertEquals(uncode(String.fromCodePoint(z)).codePointAt(0), mapping[z]);
  }
});
const assertReplaced = ($: number) =>
  assertEquals(uncode(String.fromCodePoint($)), "\ufffd");
Deno.test("uncode : c0/c1 control codes", () => {
  for (let z = 0; z <= 0x1f; ++z) {
    z !== 0x9 && z !== 0xa && z !== 0xd && assertReplaced(z);
  }
  for (let z = 0x7f; z <= 0x9f; ++z) assertReplaced(z);
});
Deno.test("uncode : lone surrogatees", () => {
  for (let z = 0xd800; z <= 0xdfff; ++z) assertReplaced(z);
});
Deno.test("uncode : noncharacters", () => {
  for (let z = 0; z <= 0x10; ++z) {
    assertReplaced(z << 16 | 0xfffe);
    assertReplaced(z << 16 | 0xffff);
  }
});

Deno.test("unline : line breaks", () => {
  for (const $ of ["\n", "\r\n", "\x85", "\u2028", "\u2029"]) {
    assertEquals(unline($), "\n");
  }
});

Deno.test("unmark : diacritics", () => {
  fc.assert(fc.property(
    fc.record({
      character: fc.oneof(
        fc.integer({ min: 0x41, max: 0x5a }),
        fc.integer({ min: 0x61, max: 0x7a }),
      ).map(String.fromCodePoint),
      mark: fc.integer({ min: 0x300, max: 0x36f }).map(String.fromCodePoint),
    }),
    ({ character, mark }) => {
      assertEquals(unmark(character + mark), character);
    },
  ));
});

Deno.test("uncase : vectors", () => {
  assertEquals(uncase(vectors.uncase[0]), vectors.uncase[1]);
});
Deno.test("uncase : mixed-case string", () => {
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    assertEquals(uncase($), uncase($.toLowerCase()));
  }));
});
Deno.test("uncase : full case folding", () => {
  for (const $ of "\xdf\u0130\u0149\u01f0") {
    assertNotEquals(uncase($).length, $.length);
  }
});
Deno.test("uncase : non-Turkic mapping", () => {
  assertEquals(uncase("\x49"), "\x69");
  assertEquals(uncase("\u0130"), "\x69\u0307");
});
