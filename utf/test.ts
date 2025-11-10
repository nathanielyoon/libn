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
import { getText, save, test } from "../test.ts";
import vectors from "./vectors.json" with { type: "json" };

test["enUtf8 :: built-in TextEncoder"](
  fc.string({ unit: "grapheme" }),
  ($) => [enUtf8($), new TextEncoder().encode($)],
);
test["deUtf8 :: built-in TextDecoder"](
  fc.uint8Array(),
  ($) => [deUtf8($), new TextDecoder().decode($)],
);

test["unhtml : special entities"](fc.string(), ($) => {
  const escaped = unhtml($);
  assertMatch(escaped, /^(?:[^&"'<>]|&#\d\d;)*$/);
  return [
    escaped.match(/(?<=&#)\d\d(?=;)/g) ?? [],
    $.match(/[&"'<>]/g)?.map(($) => `${$.charCodeAt(0)}`) ?? [],
  ];
});

test["unrexp : regex syntax character"](
  [..."/^$\\*+?{}()[]|"],
  ($) => assertEquals(unrexp($), `\\${$}`),
);
test["unrexp : two-digit hex character"]([
  ...Array(0x24).keys(),
  ...Array.from("&',-:;<=>@_`~\x7f\x85\xa0", ($) => $.charCodeAt(0)),
], ($) => [
  unrexp(String.fromCodePoint($)),
  `\\x${$.toString(16).padStart(2, "0")}`,
]);
test["unrexp : four-digit hex character"]([
  ...Array(0xb).keys().map(($) => $ + 0x2000),
  ...[0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xffef],
], ($) => [unrexp(String.fromCodePoint($)), `\\u${$.toString(16)}`]);
test["unrexp : leading alphanumeric character"]([
  ...Array(10).keys().map(String),
  ...[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].flatMap(($) => [$, $.toLowerCase()]),
], ($) => [unrexp(`${$}${$}`), `\\x${$.charCodeAt(0).toString(16)}${$}`]);
test["unrexp : string"](
  fc.string({ unit: "grapheme" }),
  ($) => assertMatch($, RegExp(`^${unrexp($)}$`)),
);

test["unlone :: built-in toWellFormed"](
  fc.uint16Array().map(($) =>
    $.reduce((to, code) => to + String.fromCodePoint(code), "")
  ),
  ($) => [unlone($), $.toWellFormed()],
);

const assertReplaced = ($: number) =>
  assertEquals(uncode(String.fromCodePoint($)), "\ufffd");
test["uncode : c0/c1 control code"]([
  ...Array(32).keys().filter(($) => $ !== 0x9 && $ !== 0xa && $ !== 0xd),
  ...Array(33).keys().map(($) => $ + 0x7f),
], assertReplaced);
test["uncode : lone surrogates"]([
  ...Array(2048).keys().map(($) => $ + 0xd800),
], assertReplaced);
test["uncode : noncharacter"]([
  ...Array(0x11).keys().flatMap(($) => [$ << 16 | 0xfffe, $ << 16 | 0xffff]),
], assertReplaced);
test["uncode : vectors"]([
  ...new Uint32Array(Uint8Array.fromBase64(vectors.uncode).buffer),
], (_, z) => [uncode(String.fromCodePoint(z)).codePointAt(0)!]);

test["unline : breaks"](
  ["\n", "\r\n", "\x85", "\u2028", "\u2029"],
  ($) => [unline($), "\n"],
);

test["unmark : diacritics"]({
  character: fc.oneof(
    fc.integer({ min: 0x41, max: 0x5a }),
    fc.integer({ min: 0x61, max: 0x7a }),
  ).map(String.fromCodePoint),
  mark: fc.integer({ min: 0x300, max: 0x36f }).map(String.fromCodePoint),
}, ({ character, mark }) => [unmark(character + mark), character]);

test["uncase : vectors"]([vectors.uncase], ($) => [uncase($[0]), $[1]]);
test["uncase : mixed-case string"](
  fc.string({ unit: "grapheme" }),
  ($) => [uncase($), uncase($.toLowerCase())],
);
test["uncase : full case folding"](
  ["\xdf", "\u0130", "\u0149", "\u01f0"],
  ($) => assertNotEquals(uncase($).length, $.length),
);
test["uncase : non-Turkic mapping"]([
  ["\x49", "\x69"],
  ["\u0130", "\x69\u0307"],
], ($) => [uncase($[0]), $[1]]);

import.meta.main && Promise.all([
  getText("www.rfc-editor.org/rfc/rfc9839.txt", 14538, 15597),
  getText("www.unicode.org/Public/UNIDATA/CaseFolding.txt", 2990, 87528),
]).then(([rfc9839, fold]) => ({
  uncode: new Uint8Array(
    rfc9839.match(/(?<=%x)\w+(?:-\w+)?/g)!.reduce((to, hex) => {
      const range = hex.split("-").map(($) => parseInt($, 16));
      if (range.length === 1) to[range[0]] = range[0];
      else for (let z = range[0]; z <= range[1]; ++z) to[z] = z;
      return to;
    }, new Uint32Array(0x110000).fill(0xfffd)).buffer,
  ).toBase64({ omitPadding: true }),
  uncase: fold.matchAll(/^([\dA-F]{4,}); [CF]; ([^;]+)/gm).reduce((to, $) => [
    to[0] + String.fromCodePoint(parseInt($[1], 16)),
    $[2].split(" ").reduce(
      (mapping, hex) => mapping + String.fromCodePoint(parseInt(hex, 16)),
      to[1],
    ),
  ], ["", ""]),
})).then(save(import.meta));
