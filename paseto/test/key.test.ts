import fc from "fast-check";
import { fc_assert, fc_bin } from "@libn/lib";
import { is_local, is_public, is_secret, set_use } from "../src/key.ts";

const is = { is_local, is_secret, is_public };
for (const use of ["local", "secret", "public"] as const) {
  Deno.test(`is_${use} : validate`, () => {
    const check = is[`is_${use}`];
    const set = set_use.bind(null, use);
    fc_assert(fc_bin(32).map(set))(check);
    fc_assert(fc.oneof(
      fc_bin({ maxLength: 31 }).map(set),
      fc_bin({ minLength: 33 }).map(set),
      fc_bin(32),
    ))(($) => !check($));
  });
}
