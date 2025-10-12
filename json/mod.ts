/**
 * JSON schema subset.
 *
 * @example Building, decoding, parsing, encoding
 * ```ts
 * import { array, boolean, number, object, string } from "@libn/json/build";
 * import { coder } from "@libn/json/code";
 * import { parser } from "@libn/json/parse";
 * import { assert, assertEquals } from "@std/assert";
 *
 * const { type } = object().properties({
 *   true: boolean().enum([true]),
 *   numbers: array().items(number()),
 *   nested: object().properties({
 *     integer: number().multipleOf(1),
 *     string: string().format("email"),
 *   }).required({}),
 * }).required(["numbers", "nested"]);
 * const row = [null, "0, 3.14", "12345", "john@jh.edu"];
 *
 * const { decode, encode } = coder(type), parse = parser(type);
 * const result = parse(decode(row));
 * assert(result.state);
 * assertEquals(encode(result.value), row);
 * ```
 *
 * @module json
 */

export type { Base, Data, Fail, Formats, Type } from "./schema.ts";
export { array, boolean, number, object, string } from "./build.ts";
export { coder } from "./code.ts";
export { parser } from "./parse.ts";
