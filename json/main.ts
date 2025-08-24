/**
 * Process typed data.
 * @module json
 *
 * @example
 * ```ts
 * import { assertEquals } from "jsr:@std/assert@^1.0.13";
 * import {
 *   array,
 *   boolean,
 *   coder,
 *   number,
 *   object,
 *   string,
 *   validator,
 * } from "@nyoon/lib/json";
 *
 * const { type } = object({
 *   true: boolean().enum([true]),
 *   integer: number().multipleOf(1),
 *   strings: array(string().format("email"), 2),
 * }, ["integer", "strings"]);
 * const data = [null, "12345", "1", "john@jh.edu", null];
 * const { encode, decode } = coder(type), validate = validator(type);
 * assertEquals(encode(validate(decode(data)).unwrap(true)), data);
 * ```
 */
export * from "./schema.ts";
export * from "./build.ts";
export * from "./code.ts";
export * from "./validate.ts";
