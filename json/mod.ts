/**
 * JSON schema subset.
 *
 * @example Building, decoding, parsing, encoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const { type } = object().properties({
 *   true: boolean().enum([true]),
 *   numbers: array().items(number()),
 *   nested: object().properties({
 *     integer: number().multipleOf(1),
 *     string: string().format("email"),
 *   }).required(),
 * }).required(["numbers", "nested"]);
 * const row = [null, "0, 3.14", "12345", "john@jh.edu"];
 *
 * const { decode, encode } = coder(type), parse = parser(type);
 * assertEquals(encode(parse(decode(row)).unwrap(true)), row);
 * ```
 *
 * @module json
 */

export type { Base, Data, Fail, Formats, Type } from "./src/types.ts";
import { array, boolean, number, object, string } from "./src/build.ts";
import { coder } from "./src/code.ts";
import { parser } from "./src/parse.ts";

export { array, boolean, coder, number, object, parser, string };
