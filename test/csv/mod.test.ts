import { deCsv, enCsv } from "@libn/csv";
import { assertEquals } from "@std/assert";
import fc from "fast-check";
import vectors from "./vectors.json" with { type: "json" };
import { assertFail, assertPass, fcNum, fcStr } from "../test.ts";

Deno.test("deCsv : vectors", () => {
  for (const $ of vectors) {
    assertPass(deCsv($.csv, { empty: "", eol: "" }), $.json);
  }
});
Deno.test("deCsv : unclosed quote", () => {
  assertFail(deCsv('",'), { UnclosedQuote: [0, 2] });
  assertFail(deCsv('"a'), { UnclosedQuote: [0, 2] });
  assertFail(deCsv('a\n",'), { UnclosedQuote: [2, 3] });
  assertFail(deCsv('a\n",', { eager: false }), { UnclosedQuote: [2, 4] });
});
Deno.test("deCsv : lone quote", () => {
  assertFail(deCsv('a"'), { LoneQuote: [0, 2] });
  assertPass(deCsv(',\na",'), [[null, null], ['a"']]);
  assertFail(deCsv(',\na",', { eager: false }), { LoneQuote: [2, 4] });
  assertFail(deCsv('\na"'), { LoneQuote: [1, 3] });
});
Deno.test("deCsv : early close", () => {
  assertFail(deCsv('""a'), { EarlyClose: [2, 3] });
  assertFail(deCsv('"a"\n""a'), { EarlyClose: [6, 7] });
  assertFail(deCsv(',\n""a,\n'), { EarlyClose: [4, 5] });
});
Deno.test("deCsv : emtpy fields", () => {
  assertPass(deCsv('""'), [[""]]);
  assertPass(deCsv(",a"), [[null, "a"]]);
});
Deno.test("deCsv : leading newlines", () => {
  assertPass(deCsv("a\n"), [["a"]]);
  assertPass(deCsv("a\r\n"), [["a"]]);
});
Deno.test("deCsv : trailing newlines", () => {
  assertPass(deCsv("\r\na"), [[null], ["a"]]);
  assertPass(deCsv("\na"), [[null], ["a"]]);
});
Deno.test("deCsv : fcRows", () => {
  fc.assert(fc.property(
    fc.oneof(fc.constant(null), fc.boolean(), fcNum(), fcStr()).chain((empty) =>
      fc.record({
        empty: fc.constant(empty),
        rows: fc.array(
          fc.array(
            fc.oneof(
              { weight: 15, arbitrary: fcStr({ size: "small" }) },
              { weight: 1, arbitrary: fc.constant(empty) },
            ),
            { minLength: 1, maxLength: 64 },
          ),
        ),
      })
    ),
    ({ empty, rows }) => {
      const csv = enCsv(rows, { empty });
      const sizes = new Set<number>();
      const slow: string[][] = [];
      for (let quoted = false, char, z = 0, y = 0, x = 0; z < csv.length; ++z) {
        sizes.add(x), (slow[y] ??= [])[x] ??= "", char = csv[z];
        if (char === '"') {
          if (quoted && csv[z + 1] === '"') slow[y][x] += char, ++z;
          else quoted = !quoted;
        } else if (char === "," && !quoted) ++x;
        else if (char === "\r" && csv[z + 1] === "\n" && !quoted) {
          ++z, ++y, x = 0;
        } else if ((char === "\n" || char === "\r") && !quoted) ++y, x = 0;
        else slow[y][x] += char;
      }
      assertPass(deCsv(csv, { empty: "", eager: sizes.size === 1 }), slow);
    },
  ));
});

Deno.test("enCsv : empty fields", () => {
  assertEquals(enCsv([[null]]), "\n");
  assertEquals(enCsv([[""]]), '""\n');
  assertEquals(enCsv([["", ""], [null, null]]), '"",""\n,\n');
  fc.assert(fc.property(
    fc.oneof(fc.constant(null), fc.boolean(), fcNum(), fcStr()),
    (empty) => {
      assertEquals(enCsv([[empty]], { empty }), "\n");
    },
  ));
});
Deno.test("enCsv : special characters", () => {
  assertEquals(enCsv([["\n"]]), '"\n"\n');
  assertEquals(enCsv([['"']]), '""""\n');
  assertEquals(enCsv([[","]]), '","\n');
});
Deno.test("enCsv : different newlines", () => {
  assertEquals(enCsv([["\n"]]), '"\n"\n');
  assertEquals(enCsv([["\r"]]), '"\r"\n');
  assertEquals(enCsv([["\r\n"]]), '"\r\n"\n');
});
