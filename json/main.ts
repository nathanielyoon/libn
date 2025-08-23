/**
 * Process typed data.
 * @module json
 *
 * @example
 * ```ts
 * import {
 *   arr,
 *   bin,
 *   bit,
 *   coder,
 *   fmt,
 *   int,
 *   map,
 *   num,
 *   obj,
 *   ord,
 *   str,
 *   validator,
 *   vec,
 * } from "@nyoon/lib/json";
 * import { assert, assertEquals } from "jsr:@std/assert@^1.0.14";
 *
 * const { type } = obj({
 *   booleans: ord([bit().enum([true]), bit().enum([false])]),
 *   digits: vec(int().enum([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).uniqueItems(),
 *   number: num().minimum(0).maximum(30).multipleOf(0.25),
 *   strings: arr(
 *     obj({
 *       emails: map(/^[A-Za-z]+$/, fmt("email"), 2),
 *       key: obj({ secret: bin("base16"), public: bin("base64url") }),
 *       name: str(),
 *     }, ["key", "name"]),
 *     2,
 *   ),
 * });
 * const validate = validator(type), { encode, decode } = coder(type);
 * const data = [
 *   ["true", "false"],
 *   "1, 5, 4",
 *   "25",
 *   "1",
 *   ["hop", "john@jh.edu", null, null, "abcdef", "ABCDEF", "John"],
 *   Array(7).fill(null),
 * ].flat();
 * const decoded=decode(data),result = validate(decoded);
 * console.log(decoded,result);
 * assert(result.is);
 * assertEquals(encode(result.or), data);
 * ```
 */
export * from "./schema.ts";
export * from "./build.ts";
export * from "./code.ts";
export * from "./validate.ts";
