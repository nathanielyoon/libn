import { expect } from "@std/expect/expect";
import fc from "fast-check";
import { distance, includes } from "@libn/text/fuzzy";
import {
  uncode,
  unhtml,
  unline,
  unlone,
  unmark,
  unrexp,
  unwide,
} from "@libn/text/normalize";
import { createRanges, source, uncase } from "@libn/text/case";

Deno.test("vectors", async (t) => {
  const vectors = await import("./vectors.json", { with: { type: "json" } });
  await t.step("uncode", () => {
    const all = new Uint32Array(0x110000).fill(0xfffd);
    for (const $ of vectors.default.uncode) {
      if (typeof $ === "number") all[$] = $;
      else for (let z = $[0]; z <= $[1]; ++z) all[z] = z;
    }
    for (let z = 0; z < 0x110000; ++z) {
      expect(all[uncode(String.fromCodePoint(z)).codePointAt(0)!]).toBe(all[z]);
    }
  });
  await t.step("uncase", () =>
    vectors.default.uncase.forEach(($) => {
      expect(uncase($.source)).toBe($.target);
    }));
});
const fcPair = fc.record({
  one: fc.string({ size: "medium", unit: "grapheme" }),
  two: fc.string({ size: "medium", unit: "grapheme" }),
});
Deno.test("includes() follows built-in includes", () =>
  fc.assert(fc.property(fcPair, ({ one, two }) => {
    if (one.includes(two)) expect(includes(one, two)).toBe(true);
    if (two.includes(one)) expect(includes(two, one)).toBe(true);
  })));
Deno.test("includes() returns true for any partial substring", () =>
  fc.assert(fc.property(
    fc.string().chain(($) =>
      fc.record({
        source: fc.constant($),
        target: fc.subarray($.split("")).map(($) => $.join("")),
      })
    ),
    ({ source, target }) => {
      expect(includes(source, target)).toBe(true);
    },
  )));
Deno.test("includes() returns false for longer targets", () =>
  fc.assert(fc.property(
    fc.string({ unit: "grapheme" }).chain(($) =>
      fc.record({
        shorter: fc.constant($),
        longer: fc.string({ unit: "grapheme", minLength: [...$].length + 1 }),
      })
    ),
    ({ shorter, longer }) => {
      expect(includes(shorter, longer)).toBe(false);
    },
  )));
Deno.test("includes() checks equality for same-length strings", () =>
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
      expect(includes(one, two)).toBe(one === two);
      expect(includes(two, one)).toBe(one === two);
    },
  )));
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
Deno.test("distance() follows levenshtein", () =>
  fc.assert(fc.property(fcPair, ({ one, two }) => {
    expect(distance(one, two)).toBe(levenshtein(one, two));
  })));
Deno.test("distance() falls inside levenshtein bounds", () =>
  fc.assert(fc.property(fcPair, ({ one, two }) => {
    const length1 = [...one].length, length2 = [...two].length;
    expect(distance(one, two)).toBeLessThanOrEqual(
      Math.max(length1, length2),
    );
    expect(distance(one, two)).toBeGreaterThanOrEqual(
      Math.abs(length1 - length2),
    );
  })));
Deno.test("distance() accounts for high code points", () =>
  fc.assert(fc.property(
    fc.record({
      points: fc.uniqueArray(fc.integer({ min: 0x10000, max: 0x10ffff }), {
        minLength: 2,
        maxLength: 2,
        comparator: "SameValueZero",
      }).map((points) => points.map(($) => String.fromCodePoint($))),
      repeat: fc.integer({ min: 1, max: 1e3 }),
    }),
    ({ points: [one, two], repeat }) => {
      expect(distance(one, two)).toBe(1);
      expect(distance(one.repeat(repeat), two.repeat(repeat))).toBe(repeat);
    },
  )));
Deno.test("distance() checks surrogate pairs together", () => {
  expect(distance("\u{1f4a9}", "\u{1f4a9}")).toBe(0);
  expect(distance("\u{1f4a9}", "x")).toBe(1);
  expect(distance("\u{1f4a9}", "\u{1f4ab}")).toBe(1);
  expect(distance("\u{1f4ab}", "\u{1f984}")).toBe(1);
});
Deno.test("unlone() replaces lone surrogates", () =>
  fc.assert(fc.property(
    fc.uint16Array().map(($) =>
      $.reduce((to, code) => to + String.fromCharCode(code), "")
    ),
    ($) => {
      expect(unlone($)).toBe($.toWellFormed());
    },
  )));
Deno.test("unlone() never changes string length", () =>
  fc.assert(fc.property(
    fc.stringMatching(
      /^(?:[\ud800-\udbff](?:[^\udc00-\udfff]|$)|(?:^|[^\ud800-\udbff])[\udc00-\udfff])*$/,
    ),
    ($) => {
      expect(unlone($).length).toBe($.length);
    },
  )));
const replaced = ($: string) => expect(uncode($)).toBe("\ufffd");
Deno.test("uncode() replaces any unassignable code point", () =>
  fc.assert(fc.property(
    fc.stringMatching(
      /^[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\ud800-\udfff\ufdd0-\ufdef\ufffe\uffff\u{1fffe}\u{1ffff}\u{2fffe}\u{2ffff}\u{3fffe}\u{3ffff}\u{4fffe}\u{4ffff}\u{5fffe}\u{5ffff}\u{6fffe}\u{6ffff}\u{7fffe}\u{7ffff}\u{8fffe}\u{8ffff}\u{9fffe}\u{9ffff}\u{afffe}\u{affff}\u{bfffe}\u{bffff}\u{cfffe}\u{cffff}\u{dfffe}\u{dffff}\u{efffe}\u{effff}\u{ffffe}\u{fffff}]$/u,
    ),
    replaced,
  )));
Deno.test("uncode() replaces all lone surrogates", () => {
  for (let z = 0xd800; z <= 0xdfff; ++z) replaced(String.fromCharCode(z));
});
Deno.test("uncode() replaces all control codes", () => {
  for (let z = 0x00; z <= 0x1f; ++z) {
    if (z !== 0x9 && z !== 0xa && z !== 0xd) {
      replaced(String.fromCharCode(z));
    }
  }
  for (let z = 0x7f; z <= 0x9f; ++z) replaced(String.fromCharCode(z));
});
Deno.test("uncode() replaces all noncharacters", () => {
  for (let z = 0x00; z <= 0x10; ++z) {
    replaced(String.fromCodePoint(z << 16 | 0xfffe));
    replaced(String.fromCodePoint(z << 16 | 0xffff));
  }
});
Deno.test("unline() replaces weird breaks with linefeeds", () =>
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
      expect(unline(string)).toBe("\n".repeat(length));
    },
  )));
Deno.test("unline() matches any break", () => {
  expect(unline("\r\n")).toBe("\n");
  expect(unline("\x85")).toBe("\n");
  expect(unline("\u2028")).toBe("\n");
  expect(unline("\u2029")).toBe("\n");
});
Deno.test("unwide() trims", () =>
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    expect(unwide($)).not.toMatch(/^\s|\s$/);
  })));
Deno.test("unwide() collapses consecutive spaces", () =>
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    expect(unwide($)).toMatch(/^(?:\S|(\s|\r\n)(?!\1))*$/);
  })));
Deno.test("unwide() matches any space", () =>
  Array.from({ length: 11 }, (_, z) => z + 0x2000).concat(
    [0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff],
  ).map(($) => String.fromCharCode($)).concat(
    ["\t", "\n", "\v", "\f", "\r", "\r\n", " ", "\xa0"],
  ).forEach(($) => {
    expect(unwide(`\0${$}\0`).slice(1, -1)).toBe($);
    expect(unwide(`\0${$ + $}\0`).slice(1, -1)).toBe($);
  }));
Deno.test("unmark() removes diacritics", () =>
  fc.assert(fc.property(
    fc.record({
      character: fc.oneof(
        fc.integer({ min: 0x41, max: 0x5a }),
        fc.integer({ min: 0x61, max: 0x7a }),
      ).map(String.fromCharCode),
      mark: fc.integer({ min: 0x300, max: 0x36f }).map(String.fromCharCode),
    }),
    ({ character, mark }) => {
      expect(unmark(character + mark)).toBe(character);
    },
  )));
Deno.test("unhtml() removes special html characters", () =>
  fc.assert(fc.property(fc.string(), ($) => {
    expect(unhtml($)).toMatch(/^(?:[^&"'<>]|&#\d\d;)*$/);
  })));
Deno.test("unhtml() escapes with right codes", () =>
  fc.assert(fc.property(
    fc.string({ unit: fc.constantFrom('"', "&", "'", "<", ">") }),
    ($) => {
      const codes = unhtml($).match(/&#[\da-f]{2};/g) ?? [];
      expect(codes.length).toBe($.length);
      for (let z = 0; z < $.length; ++z) {
        expect(+codes[z].slice(2, -1)).toBe($.charCodeAt(z));
      }
    },
  )));
Deno.test("unrexp() makes literal", () =>
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    expect(RegExp(`^${unrexp($)}$`).exec($)?.[0]).toBe($);
  })));
Deno.test("unrexp() escapes all regex syntax characters", () => {
  for (const $ of "/^$\\*+?{}()[]|") expect(unrexp($)).toBe(`\\${$}`);
});
Deno.test("unrexp() directly escapes all directly-escapable characters", () => {
  expect(unrexp("\b")).toBe("\\b");
  expect(unrexp("\t")).toBe("\\t");
  expect(unrexp("\n")).toBe("\\n");
  expect(unrexp("\v")).toBe("\\v");
  expect(unrexp("\f")).toBe("\\f");
  expect(unrexp("\r")).toBe("\\r");
});
Deno.test("unrexp() hex-encodes all weird characters", () => {
  for (let z = 0; z < 0x08; ++z) {
    expect(unrexp(String.fromCharCode(z))).toBe(
      `\\x${z.toString(16).padStart(2, "0")}`,
    );
  }
  for (let z = 0x0e; z <= 0x23; ++z) {
    expect(unrexp(String.fromCharCode(z))).toBe(
      `\\x${z.toString(16).padStart(2, "0")}`,
    );
  }
  for (const $ of "&',-:;<=>@_`~\x7f\x85\xa0") {
    expect(unrexp($)).toBe(`\\x${$.charCodeAt(0).toString(16)}`);
  }
  for (let z = 0x2000; z <= 0x200a; ++z) {
    expect(unrexp(String.fromCharCode(z))).toBe(`\\u${z.toString(16)}`);
  }
  for (const $ of "\u1680\u2028\u2029\u202f\u205f\u3000\uffef") {
    expect(unrexp($)).toBe(`\\u${$.charCodeAt(0).toString(16)}`);
  }
});
Deno.test("unrexp() hex-encodes the first character if alphanumeric", () => {
  for (let z = 0; z < 10; ++z) {
    expect(unrexp(`${z}${z}`)).toBe(`\\x${(z + 0x30).toString(16)}${z}`);
  }
  for (let $ of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    expect(unrexp(`${$}${$}`)).toBe(`\\x${$.charCodeAt(0).toString(16)}${$}`);
    $ = $.toLowerCase();
    expect(unrexp(`${$}${$}`)).toBe(`\\x${$.charCodeAt(0).toString(16)}${$}`);
  }
});
Deno.test("uncase() case-folds", () =>
  fc.assert(fc.property(
    fc.string().chain(($) =>
      fc.array(fc.mixedCase(fc.constant($)), { minLength: 2 })
    ),
    ($) => {
      expect(new Set($.map(uncase))).toStrictEqual(new Set([uncase($[0])]));
    },
  )));
Deno.test("createRanges() matches source", async () => {
  expect(createRanges(
    await source().catch(($) => {
      if ($ instanceof TypeError) {
        return Deno.readTextFile(
          new URL(import.meta.resolve("./unicode.txt")).pathname,
        );
      }
      throw $;
    }),
  )).toStrictEqual(
    (await import("./ranges.json", { with: { type: "json" } })).default,
  );
});
import.meta.main && await Promise.all([
  fetch(
    "https://rfc-editor.org/rfc/rfc9839.txt",
  ).then(($) => $.text()).then(($) => $.slice(14538, 15597)),
  fetch(
    "https://www.unicode.org/Public/UNIDATA/CaseFolding.txt",
  ).then(($) => $.text()).then(($) => $.slice(2990, 87528)),
]).then(([rfc9839, fold]) => {
  return {
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
  };
}).then(($) =>
  Deno.writeTextFile(
    new URL(import.meta.resolve("./vectors.json")).pathname,
    JSON.stringify($),
  )
);
