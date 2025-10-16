import {
  assert,
  assertEquals,
  assertGreaterOrEqual,
  assertLessOrEqual,
  assertMatch,
  assertNotEquals,
  assertNotMatch,
} from "@std/assert";
import fc from "fast-check";
import { de, en } from "@libn/base";
import { dePoint, enPoint } from "./lib.ts";
import {
  uncode,
  unhtml,
  unline,
  unlone,
  unmark,
  unrexp,
  unwide,
} from "@libn/text/normalize";
import { createRanges, uncase } from "@libn/text/case";
import { distance, includes } from "@libn/text/fuzzy";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("normalize", async (t) => {
  await t.step("uncode() passes reference vectors", () => {
    const to = new Uint32Array(0x110000).fill(0xfffd);
    for (const $ of vectors.uncode) {
      if (typeof $ === "number") to[$] = $;
      else for (let z = $[0]; z <= $[1]; ++z) to[z] = z;
    }
    for (let z = 0; z < 0x110000; ++z) {
      assertEquals(to[enPoint.call(uncode(dePoint(z)))], to[z]);
    }
  });
  await t.step("unlone() replaces lone surrogates", () => {
    fc.assert(fc.property(
      fc.uint16Array().map(($) => $.reduce((to, code) => to + de(code), "")),
      ($) => {
        assertEquals(unlone($), $.toWellFormed());
      },
    ));
  });
  await t.step("unlone() never changes string length", () => {
    fc.assert(fc.property(
      fc.stringMatching(
        /^(?:[\ud800-\udbff](?:[^\udc00-\udfff]|$)|(?:^|[^\ud800-\udbff])[\udc00-\udfff])*$/,
      ),
      ($) => {
        assertEquals(unlone($).length, $.length);
      },
    ));
  });
  await t.step("uncode() replaces all control codes", () => {
    for (let z = 0x00; z <= 0x1f; ++z) {
      z === 0x9 || z === 0xa || z === 0xd ||
        assertEquals(uncode(de(z)), "\ufffd");
    }
    for (let z = 0x7f; z <= 0x9f; ++z) assertEquals(uncode(de(z)), "\ufffd");
  });
  await t.step("uncode() replaces all un-paired surrogates", () => {
    for (let z = 0xd800; z <= 0xdfff; ++z) {
      assertEquals(uncode(de(z)), "\ufffd");
    }
    for (let z = 0x10000; z <= 0x10ffff; ++z) {
      assertEquals(
        de(0xd800 | z - 0x10000 >> 10) + de(0xdc00 | z - 0x10000 & 0x3ff),
        dePoint(z),
      );
    }
  });
  await t.step("uncode() replaces all noncharacters", () => {
    for (let z = 0x00; z <= 0x10; ++z) {
      assertEquals(uncode(dePoint(z << 16 | 0xfffe)), "\ufffd");
      assertEquals(uncode(dePoint(z << 16 | 0xffff)), "\ufffd");
    }
  });
  await t.step("unline() replaces weird breaks with linefeeds", () => {
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
    ));
  });
  await t.step("unline() matches any break", () => {
    for (const $ of ["\r\n", "\x85", "\u2028", "\u2029"]) {
      assertEquals(unline($), "\n");
    }
  });
  await t.step("unwide() trims", () => {
    fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
      assertNotMatch(unwide($), /^\s|\s$/);
    }));
  });
  await t.step("unwide() collapses consecutive spaces", () => {
    fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
      assertMatch(unwide($), /^(?:\S|(\s|\r\n)(?!\1))*$/);
    }));
  });
  await t.step("unwide() matches any space", () => {
    for (
      const $ of Array.from({ length: 11 }, (_, z) => z + 0x2000).concat(
        [0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff],
      ).map(($) => de($)).concat(
        ["\t", "\n", "\v", "\f", "\r", "\r\n", " ", "\xa0"],
      )
    ) {
      for (let z = 1; z < 9; ++z) {
        assertEquals(unwide(`\0${$.repeat(z)}\0`).slice(1, -1), $);
      }
    }
  });
  await t.step("unmark() removes diacritics", () => {
    fc.assert(fc.property(
      fc.record({
        character: fc.oneof(
          fc.integer({ min: 0x41, max: 0x5a }),
          fc.integer({ min: 0x61, max: 0x7a }),
        ).map(de),
        mark: fc.integer({ min: 0x300, max: 0x36f }).map(de),
      }),
      ({ character, mark }) => {
        assertEquals(unmark(character + mark), character);
      },
    ));
  });
  await t.step("unhtml() removes special html characters", () => {
    fc.assert(fc.property(fc.string(), ($) => {
      assertMatch(unhtml($), /^(?:[^&"'<>]|&#\d\d;)*$/);
    }));
  });
  await t.step("unhtml() escapes with right codes", () => {
    fc.assert(fc.property(
      fc.string({ unit: fc.constantFrom('"', "&", "'", "<", ">") }),
      ($) => {
        const codes = unhtml($).match(/&#[\da-f]{2};/g) ?? [];
        assertEquals(codes.length, $.length);
        for (let z = 0; z < $.length; ++z) {
          assertEquals(+codes[z].slice(2, -1), en.call($, z));
        }
      },
    ));
  });
  await t.step("unrexp() makes literal", () => {
    fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
      assertMatch($, RegExp(`^${unrexp($)}$`));
    }));
  });
  await t.step("unrexp() escapes all regex syntax characters", () => {
    for (const $ of "/^$\\*+?{}()[]|") assertEquals(unrexp($), `\\${$}`);
  });
  await t.step("unrexp() escapes all directly-escapable characters", () => {
    assertEquals(unrexp("\b"), "\\b");
    assertEquals(unrexp("\t"), "\\t");
    assertEquals(unrexp("\n"), "\\n");
    assertEquals(unrexp("\v"), "\\v");
    assertEquals(unrexp("\f"), "\\f");
    assertEquals(unrexp("\r"), "\\r");
  });
  await t.step("unrexp() escapes all weird characters", () => {
    for (let z = 0; z < 0x08; ++z) {
      assertEquals(unrexp(de(z)), `\\x${z.toString(16).padStart(2, "0")}`);
    }
    for (let z = 0x0e; z <= 0x23; ++z) {
      assertEquals(unrexp(de(z)), `\\x${z.toString(16).padStart(2, "0")}`);
    }
    for (const $ of "&',-:;<=>@_`~\x7f\x85\xa0") {
      assertEquals(unrexp($), `\\x${en.call($).toString(16)}`);
    }
    for (let z = 0x2000; z <= 0x200a; ++z) {
      assertEquals(unrexp(de(z)), `\\u${z.toString(16)}`);
    }
    for (const $ of "\u1680\u2028\u2029\u202f\u205f\u3000\uffef") {
      assertEquals(unrexp($), `\\u${en.call($).toString(16)}`);
    }
  });
  await t.step("unrexp() escapes the first character if alphanumeric", () => {
    for (let z = 0; z < 10; ++z) {
      assertEquals(unrexp(`${z}${z}`), `\\x${(z + 0x30).toString(16)}${z}`);
    }
    for (let $ of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      assertEquals(unrexp(`${$}${$}`), `\\x${en.call($).toString(16)}${$}`);
      assertEquals(
        unrexp(`${$ = $.toLowerCase()}${$}`),
        `\\x${en.call($).toString(16)}${$}`,
      );
    }
  });
});
Deno.test("case", async (t) => {
  await t.step("createRanges() creates same ranges", async () => {
    const text = await fetch(
      "https://www.unicode.org/Public/UNIDATA/CaseFolding.txt",
    ).then(($) => $.text()).catch(async () =>
      (await import("./unicode.txt", { with: { type: "text" } })).default
    );
    assertEquals(
      createRanges(text),
      (await import("./ranges.json", { with: { type: "json" } })).default,
    );
  });
  await t.step("uncase() passes reference vectors", () => {
    for (const $ of vectors.uncase) assertEquals(uncase($.source), $.target);
  });
  await t.step("uncase() un-mixes case", () => {
    fc.assert(fc.property(
      fc.string({ unit: "grapheme" }).chain(($) =>
        fc.array(fc.mixedCase(fc.constant($)), { minLength: 2 })
      ),
      ($) => {
        assertEquals(new Set($.map(uncase)), new Set([uncase($[0])]));
      },
    ));
  });
  await t.step("uncase() uses full case folding", () => {
    assertNotEquals("\xdf".length, uncase("\xdf").length);
    assertNotEquals("\u0130".length, uncase("\u0130").length);
    assertNotEquals("\u0149".length, uncase("\u0149").length);
    assertNotEquals("\u01f0".length, uncase("\u01f0").length);
  });
  await t.step("uncase() uses non-Turkic mappings", () => {
    assertEquals(uncase("\x49"), "\x69");
    assertEquals(uncase("\u0130"), "\x69\u0307");
  });
});
Deno.test("fuzzy", async (t) => {
  await t.step("includes() follows built-in includes", () => {
    fc.assert(fc.property(
      fc.string({ size: "medium", unit: "grapheme" }),
      fc.string({ size: "medium", unit: "grapheme" }),
      (one, two) => {
        if (one.includes(two)) assert(includes(one, two));
        if (two.includes(one)) assert(includes(two, one));
      },
    ));
  });
  await t.step("includes() returns true for any partial substring", () => {
    fc.assert(fc.property(
      fc.string().chain(($) =>
        fc.record({
          source: fc.constant($),
          target: fc.subarray($.split("")).map(($) => $.join("")),
        })
      ),
      ({ source, target }) => {
        assert(includes(source, target));
      },
    ));
  });
  await t.step("includes() returns false for longer targets", () => {
    fc.assert(fc.property(
      fc.string({ unit: "grapheme" }).chain(($) =>
        fc.record({
          shorter: fc.constant($),
          longer: fc.string({
            unit: "grapheme",
            minLength: [...$].length + 1,
          }),
        })
      ),
      ({ shorter, longer }) => {
        assert(!includes(shorter, longer));
      },
    ));
  });
  await t.step("includes() checks equality for same-length strings", () => {
    fc.assert(fc.property(
      fc.string({ unit: "grapheme" }).chain(($) =>
        fc.record({
          one: fc.constant($),
          two: fc.string({
            unit: "grapheme",
            minLength: [...$].length,
            maxLength: [...$].length,
          }),
        })
      ),
      ({ one, two }) => {
        assertEquals(includes(one, two), one === two);
        assertEquals(includes(two, one), one === two);
      },
    ));
  });
  const levenshtein = (one: string, two: string) => {
    const a = [...one], b = [...two], c = [...b.map((_, z) => z), b.length];
    for (let d, e, z = 1, y; z <= a.length; c[b.length] = d, ++z) {
      for (d = z, y = 1; y <= b.length; c[y - 1] = d, d = e, ++y) {
        if (a[z - 1] === b[y - 1]) e = c[y - 1];
        else e = Math.min(c[y - 1] + 1, d + 1, c[y] + 1);
      }
    }
    return c[b.length];
  };
  await t.step("distance() follows levenshtein", () => {
    fc.assert(fc.property(
      fc.string({ size: "medium", unit: "grapheme" }),
      fc.string({ size: "medium", unit: "grapheme" }),
      (one, two) => {
        assertEquals(distance(one, two), levenshtein(one, two));
      },
    ));
  });
  await t.step("distance() falls inside levenshtein bounds", () => {
    fc.assert(fc.property(
      fc.string({ size: "medium", unit: "grapheme" }),
      fc.string({ size: "medium", unit: "grapheme" }),
      (one, two) => {
        const length1 = [...one].length, length2 = [...two].length;
        assertLessOrEqual(distance(one, two), Math.max(length1, length2));
        assertGreaterOrEqual(distance(one, two), Math.abs(length1 - length2));
      },
    ));
  });
  await t.step("distance() accounts for high code points", () => {
    fc.assert(fc.property(
      fc.record({
        points: fc.uniqueArray(fc.integer({ min: 0x10000, max: 0x10ffff }), {
          minLength: 2,
          maxLength: 2,
          comparator: "SameValueZero",
        }).map((points) => points.map(($) => dePoint($))),
        repeat: fc.integer({ min: 1, max: 1e3 }),
      }),
      ({ points: [one, two], repeat }) => {
        assertEquals(distance(one, two), 1);
        assertEquals(distance(one.repeat(repeat), two.repeat(repeat)), repeat);
      },
    ));
  });
  await t.step("distance() checks surrogate pairs together", () => {
    assertEquals(distance("\u{1f4a9}", "\u{1f4a9}"), 0);
    assertEquals(distance("\u{1f4a9}", "x"), 1);
    assertEquals(distance("\u{1f4a9}", "\u{1f4ab}"), 1);
    assertEquals(distance("\u{1f4ab}", "\u{1f984}"), 1);
  });
});
import.meta.main && await Promise.all([
  fetch(
    "https://www.rfc-editor.org/rfc/rfc9839.txt",
  ).then(($) => $.text()).then(($) => $.slice(14538, 15597)),
  fetch(
    "https://www.unicode.org/Public/UNIDATA/CaseFolding.txt",
  ).then(($) => $.text()).then(($) => $.slice(2990, 87528)),
]).then(([rfc9839, fold]) => ({
  uncode: rfc9839.match(/(?<=%x)\w+(?:-\w+)?/g)!.map((hex) =>
    hex.length === 1
      ? parseInt(hex, 16)
      : hex.split("-").map(($) => parseInt($, 16))
  ),
  uncase: fold.match(/^[\dA-F]{4,5}; [CF];(?: [\dA-F]{4,5})+/gm)!.map(($) => {
    const [code, _, mapping] = $.split("; ");
    return {
      source: dePoint(parseInt(code, 16)),
      target: mapping.split(" ").reduce(
        (to, point) => to + dePoint(parseInt(point, 16)),
        "",
      ),
    };
  }),
  createRanges: fold,
})).then(($) =>
  Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
);
