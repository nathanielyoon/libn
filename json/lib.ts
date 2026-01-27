import { B16 } from "@libn/base/16";
import { B32, H32 } from "@libn/base/32";
import { B64, U64 } from "@libn/base/64";
import type { Str } from "@libn/json/schema";

/** Better-typed `Object.hasOwn`. */
export const hasOwn = /* @__PURE__ */ (() => Object.hasOwn)() as <
  A extends PropertyKey,
>(o: object, v: A) => o is { [_ in A]: unknown };
/** Better-typed `Array.isArray`. */
export const isArray = /* @__PURE__ */ (() => Array.isArray)() as (
  arg: unknown,
) => arg is unknown[] | readonly unknown[];
/** Object type predicate. */
export const isObject = ($: unknown): $ is { [_: PropertyKey]: unknown } =>
  typeof $ === "object" && $ !== null && !Array.isArray($);
/** Escapes and prefixes a reference token. */
export const escape = ($: string): string =>
  "/" + $.replaceAll("~", "~0").replaceAll("/", "~1");
/** Finds the divider between concatenated data and type pointers. */
export const bisect = (raw: string): number => raw.indexOf("~/");

/** @internal */
type Regexes<A extends string | undefined> = { [_ in NonNullable<A>]: RegExp };
/** String formats. */
export const FORMATS: Regexes<Str["format"]> = /* @__PURE__ */ (() => {
  const date =
    /^(?:(?:(?:(?:(?:(?:[02468][048])|(?:[13579][26]))00)|(?:[0-9][0-9](?:(?:0[48])|(?:[2468][048])|(?:[13579][26]))))[-]02[-]29)|(?:\d{4}[-](?:(?:(?:0[13578]|1[02])[-](?:0[1-9]|[12]\d|3[01]))|(?:(?:0[469]|11)[-](?:0[1-9]|[12]\d|30))|(?:02[-](?:0[1-9]|1[0-9]|2[0-8])))))$/;
  const time =
    /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5][0-9])?$/;
  return {
    date,
    time,
    "date-time": RegExp((date.source + time.source).replace("$^", "[ T]")),
    duration:
      /^-?P(?:\d+Y(?:\d+M)?(?:\d+[DW])?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?|(?:\d+Y)?\d+M(?:\d+[DW])?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?|(?:\d+Y)?(?:\d+M)?\d+[DW](?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?|(?:\d+Y)?(?:\d+M)?(?:\d+[DW])?T\d+H(?:\d+M)?(?:\d+(?:\.\d+)?S)?|(?:\d+Y)?(?:\d+M)?(?:\d+[DW])?T(?:\d+H)?\d+M(?:\d+(?:\.\d+)?S)?|(?:\d+Y)?(?:\d+M)?(?:\d+[DW])?T(?:\d+H)?(?:\d+M)?\d+(?:\.\d+)?S)$/,
    email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
    uri: /^[^\s#/:?]+:(?:\/\/[^\s\/?#]*)?[^\s#?]*(?:\?[^\s#]*)?(?:#\S*)?$/,
    uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
  };
})();
/** String encodings. */
export const BASES: Regexes<Str["contentEncoding"]> = {
  base16: B16,
  base32: B32,
  base32hex: H32,
  base64: B64,
  base64url: U64,
};
