import {
  de_b32,
  de_c32,
  de_h32,
  de_z32,
  en_b32,
  en_c32,
  en_h32,
  en_z32,
} from "../src/32.ts";
import { rfc4648, round_trip } from "./common.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("en_b32/de_b32 : rfc4648 10", () =>
  rfc4648(en_b32, de_b32, vectors["32"].rfc4648[0]));
Deno.test("en_h32/de_h32 : rfc4648 10", () =>
  rfc4648(en_h32, de_h32, vectors["32"].rfc4648[1]));
Deno.test("en_b32/de_b32 : arbitrary round-trip", () =>
  round_trip(en_b32, de_b32));
Deno.test("en_h32/de_h32 : arbitrary round-trip", () =>
  round_trip(en_h32, de_h32));
Deno.test("en_z32/de_z32 : arbitrary round-trip", () =>
  round_trip(en_z32, de_z32));
Deno.test("en_c32/de_c32 : arbitrary round-trip", () =>
  round_trip(en_c32, de_c32));
