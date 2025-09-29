import { assert } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_str } from "@libn/lib";
import { includes } from "../src/includes.ts";

Deno.test("includes : substring", () =>
  fc_assert(
    fc_str().chain(($) =>
      fc.tuple(fc.constant($), fc.subarray($.split("")).map(($) => $.join("")))
    ),
  )(([source, target]) => includes(source, target)));
Deno.test("includes :: String.prototype.includes", () =>
  fc_assert(fc_str(), fc_str())((source, target) => {
    if (source.includes(target)) assert(includes(source, target));
  }));
Deno.test("includes : shorter target", () =>
  fc_assert(
    fc_str({ minLength: 1 }).chain(($) =>
      fc.tuple(fc_str({ maxLength: $.length - 1 }), fc.constant($))
    ),
  )(([source, target]) => !includes(source, target)));
