import fc from "fast-check";
import { type Or, or } from "../src/or.ts";

/** True or false result arbitrary. */
export const fc_or: fc.Arbitrary<Or<boolean, boolean>> = fc.boolean().map(($) =>
  or({ state: $, value: $ })
);
