import { de, en } from "@libn/base/utf";
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
import {
  lowerCamel,
  lowerKebab,
  lowerSnake,
  upperCamel,
  upperKebab,
  upperSnake,
} from "@libn/text/convert";
import { createRanges, uncase } from "@libn/text/fold";
import { distance, includes } from "@libn/text/match";
import {
  uncode,
  unhtml,
  unline,
  unlone,
  unmark,
  unrexp,
  unwide,
} from "@libn/text/normalize";
import vectors from "./vectors.json" with { type: "json" };

const { Lu, Ll, Lt, L, N } =
  (Object.keys(vectors.convert) as (keyof typeof vectors.convert)[]).reduce(
    (to, key) => ({
      ...to,
      [key]: fc.constantFrom(
        ...vectors.convert[key].map(($) => String.fromCodePoint($)),
      ),
    }),
    {} as { [_ in keyof typeof vectors.convert]: fc.Arbitrary<string> },
  );
const fcWords = fc.array(
  fc.oneof(
    fc.tuple(Lu, fc.array(Ll, { minLength: 1 })).map(($) => $.flat()),
    fc.array(Ll, { minLength: 1 }),
    fc.array(N, { minLength: 1 }),
    fc.array(Lu, { minLength: 1 }),
    fc.tuple(Lt, fc.array(Ll)).map(($) => $.flat()),
    fc.array(L, { minLength: 1 }),
  ).map(($) => $.join("")),
  { minLength: 1 },
).map(($) => ({
  separate: $,
  together: $.reduce(
    (to, word, z) => to + " -._"[z & 3] + word,
  ).padStart($.length + 1).padEnd($.length + 2),
}));
const capitalize = (delimiter: string) => (to: string, next: string) => {
  const [head = "", ...tail] = next;
  return to + delimiter + head.toUpperCase() + tail.join("").toLowerCase();
};
Deno.test("convert ignores empty strings", () => {
  assertEquals(lowerCamel(""), "");
  assertEquals(upperCamel(""), "");
  assertEquals(lowerKebab(""), "");
  assertEquals(upperKebab(""), "");
  assertEquals(lowerSnake(""), "");
  assertEquals(upperSnake(""), "");
});
Deno.test("convert.lowerCamel() converts to lower camel case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(
      lowerCamel(together),
      separate.slice(1).reduce(capitalize(""), separate[0].toLowerCase()),
    );
  })));
Deno.test("convert.upperCamel() converts to upper camel case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(upperCamel(together), separate.reduce(capitalize(""), ""));
  })));
Deno.test("convert.lowerKebab() converts to lower kebab case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(lowerKebab(together), separate.join("-").toLowerCase());
  })));
Deno.test("convert.upperKebab() converts to upper kebab case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(
      upperKebab(together),
      separate.reduce(capitalize("-"), "").slice(1),
    );
  })));
Deno.test("convert.lowerSnake() converts to lower snake case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(lowerSnake(together), separate.join("_").toLowerCase());
  })));
Deno.test("convert.upperSnake() converts to upper snake case", () =>
  fc.assert(fc.property(fcWords, ({ separate, together }) => {
    assertEquals(upperSnake(together), separate.join("_").toUpperCase());
  })));
Deno.test("normalize.uncode() passes reference vectors", () => {
  const to = new Uint32Array(0x110000).fill(0xfffd);
  for (const $ of vectors.uncode) {
    if (typeof $ === "number") to[$] = $;
    else for (let z = $[0]; z <= $[1]; ++z) to[z] = z;
  }
  for (let z = 0; z < 0x110000; ++z) {
    assertEquals(to[uncode(String.fromCodePoint(z)).codePointAt(0)!], to[z]);
  }
});
Deno.test("normalize.unlone() replaces lone surrogates", () =>
  fc.assert(fc.property(
    fc.uint16Array().map(($) => $.reduce((to, code) => to + de(code), "")),
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
Deno.test("normalize.uncode() replaces all control codes", () => {
  for (let z = 0x00; z <= 0x1f; ++z) {
    z === 0x9 || z === 0xa || z === 0xd || // "useful"
      assertEquals(uncode(de(z)), "\ufffd");
  }
  for (let z = 0x7f; z <= 0x9f; ++z) assertEquals(uncode(de(z)), "\ufffd");
});
Deno.test("normalize.uncode() replaces all un-paired surrogates", () => {
  for (let z = 0xd800; z <= 0xdfff; ++z) {
    assertEquals(uncode(de(z)), "\ufffd");
  }
  for (let z = 0x10000; z <= 0x10ffff; ++z) {
    assertEquals(
      de(0xd800 | z - 0x10000 >> 10) + de(0xdc00 | z - 0x10000 & 0x3ff),
      String.fromCodePoint(z),
    );
  }
});
Deno.test("normalize.uncode() replaces all noncharacters", () =>
  Array(0x11).keys().forEach(($) => {
    assertEquals(uncode(String.fromCodePoint($ << 16 | 0xfffe)), "\ufffd");
    assertEquals(uncode(String.fromCodePoint($ << 16 | 0xffff)), "\ufffd");
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
  ).map(($) => de($)).concat(
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
      ).map(de),
      mark: fc.integer({ min: 0x300, max: 0x36f }).map(de),
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
        assertEquals(+codes[z].slice(2, -1), en.call($, z));
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
Deno.test("normalize.unrexp() escapes the first character if alphanumeric", () => {
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
Deno.test("fold.createRanges() creates same ranges", async () => {
  const text = await fetch(
    "https://www.unicode.org/Public/UNIDATA/CaseFolding.txt",
  ).then(($) => $.text()).catch(async () =>
    (await import("./CaseFolding.txt", { with: { type: "text" } })).default
  );
  assertEquals(
    createRanges(text),
    (await import("./ranges.json", { with: { type: "json" } })).default,
  );
});
Deno.test("fold.uncase() passes reference vectors", () =>
  vectors.uncase.forEach(($) => {
    assertEquals(uncase($.source), $.target);
  }));
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
Deno.test("match.includes() follows built-in includes", () =>
  fc.assert(fc.property(
    fc.string({ size: "medium", unit: "grapheme" }),
    fc.string({ size: "medium", unit: "grapheme" }),
    (one, two) => {
      if (one.includes(two)) assert(includes(one, two));
      if (two.includes(one)) assert(includes(two, one));
    },
  )));
Deno.test("match.includes() returns true for any partial substring", () =>
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
  )));
Deno.test("match.includes() returns false for longer targets", () =>
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
  )));
Deno.test("match.includes() checks equality for same-length strings", () =>
  fc.assert(fc.property(
    fc.string({ unit: "grapheme" }).chain(($) =>
      fc.record({
        one: fc.constant($),
        two: fc.string({
          unit: "grapheme",
          minLength: $.length,
          maxLength: $.length,
        }),
      })
    ),
    ({ one, two }) => {
      assertEquals(includes(one, two), one === two);
      assertEquals(includes(two, one), one === two);
    },
  )));
const levenshtein = (one: string, two: string) => {
  const c = [...Array(two.length).keys(), two.length];
  for (let d, e, z = 1, y; z <= one.length; c[two.length] = d, ++z) {
    for (d = z, y = 1; y <= two.length; c[y - 1] = d, d = e, ++y) {
      if (one[z - 1] === two[y - 1]) e = c[y - 1];
      else e = Math.min(c[y - 1] + 1, d + 1, c[y] + 1);
    }
  }
  return c[two.length];
};
Deno.test("match.distance() follows levenshtein", () =>
  fc.assert(fc.property(
    fc.string({ size: "medium", unit: "grapheme", minLength: 1 }),
    fc.string({ size: "medium", unit: "grapheme", minLength: 1 }),
    (one, two) => {
      assertEquals(distance(one, two), levenshtein(one, two));
    },
  )));
Deno.test("match.distance() falls inside levenshtein bounds", () =>
  fc.assert(fc.property(
    fc.string({ size: "medium", unit: "grapheme" }),
    fc.string({ size: "medium", unit: "grapheme" }),
    (one, two) => {
      assertLessOrEqual(distance(one, two), Math.max(one.length, two.length));
      assertGreaterOrEqual(
        distance(one, two),
        Math.abs(one.length - two.length),
      );
    },
  )));
import.meta.main && Promise.all([
  fetch(
    "https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt",
  ).then(($) => $.text()),
  fetch(
    "https://www.rfc-editor.org/rfc/rfc9839.txt",
  ).then(($) => $.text()).then(($) => $.slice(14538, 15597)),
  fetch(
    "https://www.unicode.org/Public/UNIDATA/CaseFolding.txt",
  ).then(($) => $.text()).then(async ($) => {
    await Deno.writeTextFile(`${import.meta.dirname}/CaseFolding.txt`, $);
    return $.slice(2990, 87528);
  }),
]).then(([data, rfc9839, fold]) => ({
  convert: data.matchAll(
    /^([\dA-F]{4,6});[^;]*;((L[ult](?=;)|L(?=[mo];)|N(?=[dlo];))[modl]?)/gm,
  ).reduce<{ [_ in `L${"u" | "l" | "t" | ""}` | "N"]: number[] }>(
    (categories, [_, hex, subcategory, category]) => {
      const character = String.fromCodePoint(parseInt(hex, 16));
      if (
        RegExp(`^\\p{${category}}$`, "u").test(character) &&
        !RegExp(
          `^(?:${
            "|\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nd}|\\p{Nl}|\\p{No}"
              .replace(RegExp(`\\|\\\\p\\{${subcategory}\\}`), "").slice(1)
          })$`,
          "u",
        ).test(character)
      ) categories[category as keyof typeof categories].push(parseInt(hex, 16));
      return categories;
    },
    { Lu: [], Ll: [], Lt: [], L: [], N: [] },
  ),
  uncode: rfc9839.match(/(?<=%x)\w+(?:-\w+)?/g)!.map((hex) =>
    hex.length === 1
      ? parseInt(hex, 16)
      : hex.split("-").map(($) => parseInt($, 16))
  ),
  uncase: fold.match(/^[\dA-F]{4,5}; [CF];(?: [\dA-F]{4,5})+/gm)!.map(($) => {
    const [code, _, mapping] = $.split("; ");
    return {
      source: String.fromCodePoint(parseInt(code, 16)),
      target: mapping.split(" ").reduce(
        (to, point) => to + String.fromCodePoint(parseInt(point, 16)),
        "",
      ),
    };
  }),
  createRanges: fold,
})).then(($) =>
  Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
);
