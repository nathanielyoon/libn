import { de_b16, en_b16 } from "../src/16.ts";
import { rfc4648, round_trip } from "./common.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("en_b16/de_b16 : rfc4648 10", () =>
  rfc4648(en_b16, de_b16, vectors["16"].rfc4648[0]));
Deno.test("en_b16/de_b16 : arbitrary round-trip", () =>
  round_trip(en_b16, de_b16));
