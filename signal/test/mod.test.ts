import { assert, assertEquals, assertThrows } from "@std/assert";
import { pure } from "@libn/lib";
import { derive, effect, signal } from "../mod.ts";

Deno.test("signal/derive : custom equality", () => {
  const never = signal([0], { is: () => false });
  const index = derive(() => [never()[0] + 1], {
    is: (prev, next) => prev?.[0] === next[0],
  });
  const sized = derive(() => [index()[0] + 1], {
    is: (prev, next) => prev?.length === next.length,
  });
  const value = derive(() => sized()[0]);
  let sets = 0, gets = 0;
  effect(() => (never(), ++sets));
  effect(() => (value(), ++gets));
  assertEquals(sized(), [2]), assertEquals(value(), 2);
  assertEquals(sets, 1), assertEquals(gets, 1);
  never(never());
  assertEquals(sized(), [2]), assertEquals(value(), 2);
  assertEquals(sets, 2), assertEquals(gets, 1);
  never(([$]) => [$ + 1]);
  assertEquals(sized(), [3]), assertEquals(value(), 2);
  assertEquals(sets, 3), assertEquals(gets, 1);
});
Deno.test("effect : dispose when nested", () => {
  const outer = signal(0);
  effect(() => effect(() => assert(outer() !== 1))());
  outer(1);
});
Deno.test("derive : catch inner recursion", () => {
  const inner = signal(0);
  const outer = derive(() => inner(inner() + 1));
  assertEquals(outer(), 1);
  inner(1);
  assertEquals(outer(), 2);
});
Deno.test("derive : catch outer recursion", () => {
  let monotonic = 0;
  const one = signal(0);
  const two = signal(0);
  const both = derive(() => (two(), one(++monotonic)));
  const just = derive(() => (one(), one(++monotonic)));
  effect(() => (both(), just()));
  const each = derive(() => (both(), two(++monotonic)));
  const over = derive(() => (each(), two(++monotonic)));
  effect(() => (each(), over()));
  assertEquals(over(), 9);
  one(100);
  assertEquals(over(), 9);
});
Deno.test("derive : break invalid links", () => {
  const set = signal(0);
  const get = derive(() => (set(0), set()));
  assertEquals(get(), 0);
  set(1);
  assertEquals(get(), 0);
});
Deno.test("derive : circular (sometimes)", () => {
  assertThrows(() => {
    let monotonic = 0;
    const one = signal(++monotonic);
    const two = signal(++monotonic);
    const one_two = derive(() => (one(), two(++monotonic)));
    const two_one = derive(() => (two(), one(++monotonic)));
    effect(() => one_two());
    effect(() => two_one());
    effect(() => (one_two(), two_one()));
  });
  assertThrows(() => {
    const one = signal(0);
    const two = signal(0);
    const read = derive(() => one(one() + two()));
    effect(() => (one(), two(), read()));
    two(1);
  });
});
Deno.test("bundle : pure", pure);
