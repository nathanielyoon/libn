import { is, point, to } from "@libn/json/check";
import fc from "fast-check";
import { assertFail, assertPass, fcNum, fcStr, type Json } from "../test.ts";
import { escape } from "../../json/lib.ts";
import { assertEquals, fail } from "@std/assert";
import { fcJson } from "./lib.ts";

const TOKEN = /(?:\/(?:[^/~]|~[01])*)/.source;
Deno.test("is : single step", () => {
  fc.assert(fc.property(fcStr(), (error) => {
    assertEquals(
      is(function* () {
        yield error;
        return fail(); // check should stop evaluating before reaching here
      }, {}),
      false,
    );
  }));
  fc.assert(fc.property(fcJson, (value) => {
    assertEquals(
      is(function* () {
        return value;
      }, {}),
      true,
    );
  }));
});
Deno.test("to : all errors", () => {
  fc.assert(fc.property(
    fc.array(
      fc.record({ type: fcStr(`^${TOKEN}+$`), data: fcStr(`^${TOKEN}+$`) }),
    ),
    fcJson,
    (errors, value) => {
      const result = to(function* ($) {
        yield* errors.map(($) => `${$.data}~${$.type}`);
        return $ as Json;
      }, value);
      if (errors.length) assertFail(result, { Invalid: errors });
      else assertPass(result, value);
    },
  ));
});

const head = (pointer: string) =>
  pointer.slice(1, ~(~pointer.indexOf("/", 1) || ~pointer.length));
const unescape = (token: string) =>
  token.replaceAll("~1", "/").replaceAll("~0", "~");
Deno.test("point : keys/indices", () => {
  fc.assert(
    fc.property(fcStr(), fc.nat({ max: 1e2 }), fcJson, (on, at, value) => {
      assertPass(
        point(Array(at + 1).with(at, { [on]: value }), `/${at}${escape(on)}`),
        value,
      );
      assertPass(
        point({ [on]: Array(at + 1).with(at, value) }, `${escape(on)}/${at}`),
        value,
      );
    }),
  );
  fc.assert(fc.property(fcJson, (value) => {
    assertPass(point(value, ""), value);
  }));
});
Deno.test("point : nonslash start", () => {
  fc.assert(fc.property(
    fcJson,
    fcStr(`^[^/]+${TOKEN}*$`),
    (value, pointer) => {
      assertFail(point(value, pointer), {
        NonslashStart: pointer.slice(
          0,
          ~(~pointer.indexOf("/") || ~pointer.length),
        ),
      });
    },
  ));
});
Deno.test("point : nonnumeric index", () => {
  fc.assert(fc.property(
    fc.array(fcJson),
    fcStr(`^/(?:\\d*[^\\d/~]\\d*|0\\d+)${TOKEN}*$`),
    (value, pointer) => {
      assertFail(point(value, pointer), {
        NonnumericIndex: { value, index: unescape(head(pointer)) },
      });
    },
  ));
});
Deno.test("point : unused tokens", () => {
  fc.assert(fc.property(
    fc.oneof(fc.constant(null), fc.boolean(), fcNum(), fcStr()),
    fcStr(`^${TOKEN}+$`),
    (value, pointer) => {
      const expected = {
        UnusedTokens: { value, tokens: pointer.split("/").slice(1) },
      };
      assertFail(point(value, pointer), expected);
      assertFail(point([value], `/0${pointer}`), expected);
      assertFail(
        point({ [pointer]: value }, escape(pointer) + pointer),
        expected,
      );
    },
  ));
});
Deno.test("point : nonexistent index/key", () => {
  fc.assert(fc.property(fc.array(fcJson), (value) => {
    assertFail(point(value, `/${value.length}`), {
      NonexistentIndex: { value, index: value.length },
    });
  }));
  fc.assert(fc.property(
    fc.dictionary(fcStr(), fcJson).chain(($) =>
      fc.record({
        value: fc.constant($),
        pointer: fcStr(`^${TOKEN}+$`).filter((pointer) =>
          !(unescape(head(pointer)) in $)
        ),
      })
    ),
    ({ value, pointer }) => {
      assertFail(point(value, pointer), {
        NonexistentKey: { value, key: unescape(head(pointer)) },
      });
    },
  ));
});
