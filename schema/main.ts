/**
 * Process typed data.
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "jsr:@std/assert@^1.0.14";
 * import * as $ from "@nyoon/lib/schema";
 *
 * const { type } = $.obj({
 *   true: $.bit().enum([true]),
 *   digits: $.vec($.int().enum([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).uniqueItems(),
 *   number: $.num().minimum(0).maximum(30).multipleOf(0.25),
 *   strings: $.arr(
 *     $.obj({
 *       emails: $.map(/^[A-Za-z]+$/, $.str("email"), 2),
 *       datetime: $.str("date-time"),
 *     }, []),
 *     2,
 *   ),
 * }, ["digits", "number", "strings"]);
 * const validate = $.validator(type), { encode, decode } = $.coder(type);
 * const data = [
 *   null,
 *   "1, 2, 3",
 *   "7.5",
 *   "1",
 *   "j",
 *   "john@jh.edu",
 *   null,
 *   null,
 *   new Date().toISOString(),
 *   null,
 *   null,
 *   null,
 *   null,
 *   null,
 * ];
 * assertEquals(encode(validate(decode(data))), data);
 * ```
 *
 * @see [JSON Schema](https://json-schema.org/draft/2020-12)
 */
export * from "./json.ts";
export * from "./build.ts";
export * from "./code.ts";
export * from "./validate.ts";
