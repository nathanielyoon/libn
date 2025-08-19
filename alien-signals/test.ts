import {
  assertEquals,
  assertLess,
  assertNotEquals,
  assertThrows,
} from "jsr:@std/assert@^1.0.14";
import {
  assertSpyCall,
  assertSpyCalls,
  spy,
} from "jsr:@std/testing@^1.0.15/mock";
import { atom, from, set, user } from "./main.ts";

Deno.test("computed", () => {
  {
    const src = atom(0);
    const c1 = from(() => src() % 2);
    const c2 = from(() => c1());
    const c3 = from(() => c2());
    c3(), src(1), c2(), src(3), assertEquals(c3(), 1);
  }
  {
    const src = atom(0);
    const a = from(() => src());
    const b = from(() => a() % 2);
    const c = from(() => src());
    const d = from(() => b() + c());
    assertEquals(d(), 0), src(2), assertEquals(d(), 2);
  }
  {
    const a = atom(false);
    const b = from(() => a());
    const c = from(() => (b(), 0));
    const d = from(() => (c(), b()));
    assertEquals(d(), false), a(true), assertEquals(d(), true);
  }
  {
    let times = 0;
    const src = atom(0);
    const c1 = from(() => (++times, src()));
    c1(), assertEquals(times, 1), src(1), src(0), c1(), assertEquals(times, 1);
  }
});
Deno.test("effect", () => {
  {
    let bRunTimes = 0;
    const a = atom(1);
    const b = from(() => (++bRunTimes, a() * 2));
    const stopEffect = user(() => b());
    assertEquals(bRunTimes, 1), a(2), assertEquals(bRunTimes, 2);
    stopEffect(), a(3), assertEquals(bRunTimes, 2);
  }
  {
    const a = atom(3);
    const b = from(() => a() > 0);
    user(() => b() && user(() => assertNotEquals(a(), 0)));
    a(2), a(1), a(0);
  }
  {
    const a = atom(0);
    const b = from(() => a() % 2);
    let innerTriggerTimes = 0;
    user(() => user(() => (b(), assertLess(++innerTriggerTimes, 3))));
    a(2);
  }
  {
    const src1 = atom(0);
    const src2 = atom(0);
    const order: number[] = [];
    user(() => {
      order.push(0);
      const currentSub = set(undefined);
      const isOne = src2() === 1;
      set(currentSub);
      isOne && src1(), src2(), src1();
    });
    user(() => (order.push(1), src1()));
    src2(1), order.length = 0, src1(src1() + 1), assertEquals(order, [0, 1]);
  }
  {
    const a = atom(0);
    const b = atom(0);
    const order: number[] = [];
    user(() => {
      user(() => (a(), order.push(0)));
      user(() => (b(), order.push(1)));
      assertEquals(order, [0, 1]);
      order.length = 0, b(1), a(1), assertEquals(order, [1, 0]);
    });
  }
  {
    const a = atom(false);
    const b = from(() => a());
    const c = from(() => (b(), 0));
    const d = from(() => (c(), b()));
    let triggers = 0;
    user(() => (d(), ++triggers));
    assertEquals(triggers, 1), a(true), assertEquals(triggers, 2);
  }
});
const untracked = <A>(callback: () => A) => {
  const currentSub = set(undefined);
  try {
    return callback();
  } finally {
    set(currentSub);
  }
};
interface ReactionOptions<A, B extends boolean = boolean> {
  fireImmediately?: B;
  equals?: B extends true ? (a: A, b: A | undefined) => boolean
    : (a: A, b: A) => boolean;
  onError?: (error: unknown) => void;
  scheduler?: (fn: () => void) => void;
  once?: boolean;
}
const reaction = <A>(
  dataFn: () => A,
  effectFn: (newValue: A, oldValue: A | undefined) => void,
  options: ReactionOptions<A> = {},
) => {
  const {
    scheduler = (fn) => fn(),
    equals = Object.is,
    onError,
    once = false,
    fireImmediately = false,
  } = options;
  let prevValue: A | undefined, version = 0;
  const tracked = from(() => {
    try {
      return dataFn();
    } catch (error) {
      return untracked(() => onError?.(error)), prevValue!;
    }
  });
  const dispose = user(() => {
    const current = tracked();
    if (!fireImmediately && version) prevValue = current;
    ++version;
    if (equals(current, prevValue!)) return;
    const oldValue = prevValue;
    prevValue = current;
    untracked(() =>
      scheduler(() => {
        try {
          effectFn(current, oldValue);
        } catch (error) {
          onError?.(error);
        } finally {
          if (once) {
            if (fireImmediately && version > 1) dispose();
            else if (!fireImmediately && version > 0) dispose();
          }
        }
      })
    );
  });
};
Deno.test("issue_48", () => {
  const source = atom(0);
  let disposeInner;
  reaction(
    () => source(),
    (val) => {
      if (val === 1) disposeInner = reaction(() => source(), () => {});
      else if (val === 2) disposeInner!();
    },
  );
  source(1), source(2), source(3);
});
Deno.test("untrack", () => {
  {
    const src = atom(0);
    let computedTriggerTimes = 0;
    const c = from(() => {
      ++computedTriggerTimes;
      const currentSub = set(undefined);
      const value = src();
      set(currentSub);
      return value;
    });
    assertEquals(c(), 0), assertEquals(computedTriggerTimes, 1);
    src(1), src(2), src(3);
    assertEquals(c(), 0), assertEquals(computedTriggerTimes, 1);
  }
  {
    const src = atom(0);
    const is = atom(0);
    let effectTriggerTimes = 0;
    user(() => {
      ++effectTriggerTimes;
      if (is()) {
        const currentSub = set(undefined);
        src(), set(currentSub);
      }
    });
    assertEquals(effectTriggerTimes, 1);
    is(1), assertEquals(effectTriggerTimes, 2);
    src(1), src(2), src(3), assertEquals(effectTriggerTimes, 2);
    is(2), assertEquals(effectTriggerTimes, 3);
    src(4), src(5), src(6), assertEquals(effectTriggerTimes, 3);
    is(0), assertEquals(effectTriggerTimes, 4);
    src(7), src(8), src(9), assertEquals(effectTriggerTimes, 4);
  }
});
Deno.test("graph updates", () => {
  {
    const a = atom(2);
    const b = from(() => a() - 1);
    const c = from(() => a() + b());
    const computer = () => spy(() => `d: ${c()}`);
    let compute = computer();
    let d = from(compute);
    assertEquals(d(), "d: 3"), assertSpyCalls(compute, 1);
    // Reassign for `.mockClear()`.
    d = from(compute = computer());
    a(4), d(), assertSpyCalls(compute, 1);
  }
  {
    const a = atom("a");
    const b = from(() => a());
    const c = from(() => a());
    const compute = spy(() => `${b()} ${c()}`);
    const d = from(compute);
    assertEquals(d(), "a a"), assertSpyCalls(compute, 1);
    a("aa"), assertEquals(d(), "aa aa"), assertSpyCalls(compute, 2);
  }
  {
    const a = atom("a");
    const b = from(() => a());
    const c = from(() => a());
    const d = from(() => `${b()} ${c()}`);
    const compute = spy(() => d());
    const e = from(compute);
    assertEquals(e(), "a a"), assertSpyCalls(compute, 1);
    a("aa"), assertEquals(e(), "aa aa"), assertSpyCalls(compute, 2);
  }
  {
    const a = atom("a");
    const b = from(() => (a(), "foo"));
    const compute = spy(() => b());
    const c = from(compute);
    assertEquals(c(), "foo"), assertSpyCalls(compute, 1);
    a("aa"), assertEquals(c(), "foo"), assertSpyCalls(compute, 1);
  }
  {
    const a = atom("a");
    const b = from(() => a());
    const c = from(() => a());
    const d = from(() => c());
    const calls: string[] = [];
    const computer_e = () => spy(() => (calls.push("e"), `${b()} ${d()}`));
    let eSpy = computer_e();
    let e = from(eSpy);
    const computer_f = () => spy(() => (calls.push("f"), e()));
    let fSpy = computer_f();
    let f = from(fSpy);
    const computer_g = () => spy(() => (calls.push("g"), e()));
    let gSpy = computer_g();
    let g = from(gSpy);
    assertEquals(f(), "a a"), assertSpyCalls(fSpy, 1);
    assertEquals(g(), "a a"), assertSpyCalls(gSpy, 1);
    e = from(eSpy = computer_e());
    f = from(fSpy = computer_f());
    g = from(gSpy = computer_g());
    a("b");
    assertEquals(e(), "b b"), assertSpyCalls(eSpy, 1);
    assertEquals(f(), "b b"), assertSpyCalls(fSpy, 1);
    assertEquals(g(), "b b"), assertSpyCalls(gSpy, 1);
    e = from(eSpy = computer_e());
    f = from(fSpy = computer_f());
    g = from(gSpy = computer_g());
    calls.length = 0;
    a("c");
    assertEquals(e(), "c c"), assertSpyCalls(eSpy, 1);
    assertEquals(f(), "c c"), assertSpyCalls(fSpy, 1);
    assertEquals(g(), "c c"), assertSpyCalls(gSpy, 1);
    const order = ["e", "f", "g"].map(($) => calls.indexOf($));
    assertLess(order[0], order[1]), assertLess(order[1], order[2]);
  }
  {
    const a = atom("a");
    const b = from(() => a());
    const compute = spy(() => a());
    from(compute);
    assertEquals(b(), "a"), assertSpyCalls(compute, 0);
    a("aa"), assertEquals(b(), "aa"), assertSpyCalls(compute, 0);
  }
  {
    const a = atom("a");
    const compute_b = () => spy(() => a());
    let bSpy = compute_b();
    let b = from(bSpy);
    const compute_c = () => spy(() => b());
    let cSpy = compute_c();
    let c = from(cSpy);
    const d = from(() => a());
    let result = "";
    const unsub = user(() => result = c());
    assertEquals(result, "a"), assertEquals(d(), "a");
    b = from(bSpy = compute_b());
    c = from(cSpy = compute_c());
    unsub();
    a("aa");
    assertSpyCalls(bSpy, 0), assertSpyCalls(cSpy, 0), assertEquals(d(), "aa");
  }
  {
    const a = atom("a");
    const b = from(() => a());
    const c = from(() => (a(), "c"));
    const computer = () => spy(() => `${b()} ${c()}`);
    let compute = computer();
    let d = from(compute);
    assertEquals(d(), "a c");
    d = from(compute = computer());
    a("aa"), d(), assertSpyCall(compute, 0, { returned: "aa c" });
  }
  {
    const a = atom("a");
    const b = from(() => a());
    const c = from(() => (a(), "c"));
    const d = from(() => (a(), "d"));
    const computer = () => spy(() => `${b()} ${c()} ${d()}`);
    let compute = computer();
    let e = from(compute);
    assertEquals(e(), "a c d");
    e = from(compute = computer());
    a("aa"), e(), assertSpyCall(compute, 0, { returned: "aa c d" });
  }
  {
    const a = atom(0);
    const b = from(() => a());
    const c = from(() => a() > 0 ? a() : b());
    assertEquals(c(), 0), a(1), assertEquals(c(), 1);
    a(0), assertEquals(c(), 0);
  }
  {
    const a = atom("a");
    const b = from(() => (a(), "b"));
    const c = from(() => (a(), "c"));
    const computer = () => spy(() => `${b()} ${c()}`);
    let compute = computer();
    let d = from(compute);
    assertEquals(d(), "b c");
    d = from(compute = computer());
    a("aa"), assertSpyCalls(compute, 0);
  }
});
Deno.test("error handling", () => {
  {
    const a = atom(0);
    const b = from(() => {
      throw new Error();
    });
    const c = from(() => a());
    assertThrows(() => b());
    a(1), assertEquals(c(), 1);
  }
  {
    const a = atom(0);
    const b = from(() => {
      if (a() === 1) throw new Error();
      return a();
    });
    const c = from(() => b());
    assertEquals(c(), 0), a(1), assertThrows(() => b());
    a(2), assertEquals(c(), 2);
  }
});
