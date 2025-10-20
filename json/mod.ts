/**
 * JSON data.
 *
 * @example JSON schema
 * ```ts
 * import { array, boolean, number, object, string } from "./schema.ts";
 * import { compile } from "./compile.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const check = compile(object({
 *   primitive: boolean(),
 *   constant: boolean([false]),
 *   enum: number([1, 2, 3, 4, 5]),
 *   nullable: number({ type: ["integer", "null"] }),
 *   constrained: string({ minLength: 1, maxLength: 16 }),
 *   format: string("email"),
 *   encoded: string("base16"),
 *   array: array(number()),
 *   tuple: array([string(), string()]),
 *   map: object(["^[ -~]+$", boolean()]),
 * }));
 * const value = {
 *   primitive: true,
 *   constant: false,
 *   enum: 4,
 *   nullable: null,
 *   constrained: "string",
 *   format: "email@example.com",
 *   encoded: "0123456789abcdef",
 *   array: [6, 7, 8, 9],
 *   tuple: ["one", "two"],
 *   map: {
 *     abc: true,
 *     "!@#": false,
 *   },
 * } as const;
 * const result = check(value);
 * assertEquals(result.next(), { done: true, value });
 * ```
 *
 * @module json
 */
export {
  type And,
  isArray,
  type Join,
  type Json,
  type Tuple,
  type Xor,
} from "./lib.ts";
export { get, type Pointer } from "./pointer.ts";
export { ENCODING, type Encoding, FORMAT, type Format } from "./regex.ts";
export {
  array,
  boolean,
  type Instance,
  number,
  object,
  type Schema,
  string,
} from "./schema.ts";
export { compile } from "./compile.ts";
