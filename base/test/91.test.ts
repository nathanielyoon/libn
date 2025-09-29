import { de_b91, en_b91 } from "../src/91.ts";
import { round_trip } from "./common.ts";

Deno.test("en_b91/de_b91 : arbitrary round-trip", () =>
  round_trip(en_b91, de_b91));
