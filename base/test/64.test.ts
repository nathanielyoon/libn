import { de_b64, de_u64, en_b64, en_u64 } from "../src/64.ts";
import { rfc4648, round_trip } from "./common.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("en_b64/de_b64 : rfc4648 10", () =>
  rfc4648(en_b64, de_b64, vectors["64"].rfc4648[0]));
Deno.test("en_u64/de_u64 : rfc4648 10", () =>
  rfc4648(en_u64, de_u64, vectors["64"].rfc4648[1]));
Deno.test("en_b64/de_b64 : arbitrary round-trip", () =>
  round_trip(en_b64, de_b64));
Deno.test("en_u64/de_u64 : arbitrary round-trip", () =>
  round_trip(en_u64, de_u64));
