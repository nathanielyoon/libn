import { assertEquals, assertLess, assertThrows } from "@std/assert";
import {
  assertSpyCall,
  assertSpyCalls,
  type Spy,
  spy,
} from "@std/testing/mock";
import { batch, effect, scoper, set_actor, signal } from "./mod.ts";

Deno.test("alien-signals", async ({ step }) => {
  await step("signal", async ({ step }) => {
    await step("correctly propagate changes through signal signals", () => {
      const a = signal(0);
      const b = signal(() => a() % 2);
      const c = signal(() => b());
      const d = signal(() => c());
      d();
      a(1); // c1 -> dirty, c2 -> toCheckDirty, c3 -> toCheckDirty
      c(); // c1 -> none, c2 -> none
      a(3); // c1 -> dirty, c2 -> toCheckDirty
      assertEquals(d(), 1);
    });
    await step("propagate updated source through chained computations", () => {
      const a = signal(0);
      const b = signal(() => a());
      const c = signal(() => b() % 2);
      const d = signal(() => a());
      const e = signal(() => c() + d());
      assertEquals(e(), 0);
      a(2), assertEquals(e(), 2);
    });
    await step("handle flags are indirectly updated during checkDirty", () => {
      const a = signal(false);
      const b = signal(() => a());
      const c = signal(() => (b(), 0));
      const d = signal(() => (c(), b()));
      assertEquals(d(), false);
      a(true), assertEquals(d(), true);
    });
    await step("not update if the signal value is reverted", () => {
      let a = 0;
      const b = signal(0);
      const c = signal(() => (a++, b()));
      c(), assertEquals(a, 1);
      b(1), b(0), c(), assertEquals(a, 1);
    });
  });
  await step("effect", async ({ step }) => {
    await step("clear subscriptions when untracked by all subscribers", () => {
      let a = 0;
      const b = signal(1);
      const c = signal(() => (a++, b() * 2));
      const d = effect(() => c());
      assertEquals(a, 1);
      b(2), assertEquals(a, 2);
      d(), b(3), assertEquals(a, 2);
    });
    await step("not run untracked inner effect", () => {
      const a = signal(3);
      const b = signal(() => a() > 0);
      effect(() =>
        b() && effect(() => {
          if (!a()) throw 0;
        })
      );
      a(2), a(1), a(0);
    });
    await step("run outer effect first", () => {
      const a = signal(1);
      const b = signal(1);
      effect(() =>
        a() && effect(() => {
          if (b(), !a()) throw 0;
        })
      );
      batch(() => (b(0), a(0)));
    });
    await step("not trigger inner effect when resolve maybe dirty", () => {
      const a = signal(0);
      const b = signal(() => a() % 2);
      let c = 0;
      effect(() =>
        effect(() => {
          if (b(), ++c >= 2) throw 0;
        })
      ), a(2);
    });
    await step("trigger inner effects in sequence", () => {
      const a = signal(0);
      const b = signal(0);
      const c = signal(() => a() - b());
      const d: string[] = [];
      effect(() => {
        c();
        effect(() => (d.push("first inner"), a()));
        effect(() => (d.push("last inner"), a(), b()));
      });
      d.length = 0;
      batch(() => (b(1), a(1)));
      assertEquals(d, ["first inner", "last inner"]);
    });
    await step("trigger inner effects in sequence in effect scope", () => {
      const a = signal(0);
      const b = signal(0);
      const c: string[] = [];
      scoper(() => {
        effect(() => (c.push("first inner"), a()));
        effect(() => (c.push("last inner"), a(), b()));
      });
      c.length = 0;
      batch(() => (b(1), a(1)));
      assertEquals(c, ["first inner", "last inner"]);
    });
    await step("custom effect support batch", () => {
      const batch_effect = ($: () => void) => batch(() => effect($));
      const a: string[] = [];
      const b = signal(0);
      const c = signal(0);
      const d = signal(() => (a.push("aa-0"), b() || c(1), a.push("aa-1")));
      const e = signal(() => (a.push("bb"), c()));
      batch_effect(() => e());
      batch_effect(() => d());
      assertEquals(a, ["bb", "aa-0", "aa-1", "bb"]);
    });
    await step("duplicate subscribers do not affect the notify order", () => {
      const a = signal(0);
      const b = signal(0);
      const c: string[] = [];
      effect(() => {
        c.push("a");
        const d = set_actor(null), e = b() === 1;
        set_actor(d), e && a(), b(), a();
      });
      effect(() => (c.push("b"), a()));
      b(1); // src1.subs: a -> b -> a
      c.length = 0, a(a() + 1), assertEquals(c, ["a", "b"]);
    });
    await step("handle side effect with inner effects", () => {
      const a = signal(0);
      const b = signal(0);
      const c: string[] = [];
      effect(() => {
        effect(() => (a(), c.push("a")));
        effect(() => (b(), c.push("b")));
        assertEquals(c, ["a", "b"]);
        c.length = 0, b(1), a(1), assertEquals(c, ["b", "a"]);
      });
    });
    await step("handle flags are indirectly updated during checkDirty", () => {
      const a = signal(false);
      const b = signal(() => a());
      const c = signal(() => (b(), 0));
      const d = signal(() => (c(), b()));
      let e = 0;
      effect(() => (d(), ++e));
      assertEquals(e, 1);
      a(true), assertEquals(e, 2);
    });
  });
  await step("scoper", async ({ step }) => {
    await step("not trigger after stop", () => {
      const a = signal(1);
      let b = 0;
      const c = scoper(() => {
        effect(() => (b++, a())), assertEquals(b, 1);
        a(2), assertEquals(b, 2);
      });
      a(3), assertEquals(b, 3);
      c(), a(4), assertEquals(b, 3);
    });
    await step("dispose inner effects if created in an effect", () => {
      const a = signal(1);
      let b = 0;
      effect(() => {
        const c = scoper(() => effect(() => (a(), b++)));
        assertEquals(b, 1);
        a(2), assertEquals(b, 2);
        c(), a(3), assertEquals(b, 2);
      });
    });
  });
  await step("issue 48", () => {
    const untracked = <A>(callback: () => A) => {
      const currentSub = set_actor(null);
      try {
        return callback();
      } finally {
        set_actor(currentSub);
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
      const tracked = signal(() => {
        try {
          return dataFn();
        } catch (error) {
          return untracked(() => onError?.(error)), prevValue!;
        }
      });
      const dispose = effect(() => {
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
    const source = signal(0);
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
  await step("graph updates", async ({ step }) => {
    await step("drop A->B->A updates", () => {
      //     A
      //   / |
      //  B  | <- Looks like a flag doesn't it? :D
      //   \ |
      //     C
      //     |
      //     D
      const a = signal(2);
      const b = signal(() => a() - 1);
      const c = signal(() => a() + b());
      const d = spy(() => "d: " + c());
      const e = signal(d);
      // Trigger read
      assertEquals(e(), "d: 3"), assertSpyCalls(d, 1);
      d.calls.length = 0, a(4), e(), assertSpyCalls(d, 1);
    });
    await step("only update every signal once", () => {
      // (diamond graph)
      // In this scenario "D" should only update once when "A" receives
      // an update. This is sometimes referred to as the "diamond" scenario.
      //     A
      //   /   \
      //  B     C
      //   \   /
      //     D
      const a = signal("a");
      const b = signal(() => a());
      const c = signal(() => a());
      const d = spy(() => b() + " " + c());
      const e = signal(d);
      assertEquals(e(), "a a"), assertSpyCalls(d, 1);
      a("aa"), assertEquals(e(), "aa aa"), assertSpyCalls(d, 2);
    });
    await step("only update every signal once", () => {
      // (diamond graph + tail)
      // "E" will be likely updated twice if our mark+sweep logic is buggy.
      //     A
      //   /   \
      //  B     C
      //   \   /
      //     D
      //     |
      //     E
      const a = signal("a");
      const b = signal(() => a());
      const c = signal(() => a());
      const d = signal(() => b() + " " + c());
      const e = spy(() => d());
      const f = signal(e);
      assertEquals(f(), "a a"), assertSpyCalls(e, 1);
      a("aa"), assertEquals(f(), "aa aa"), assertSpyCalls(e, 2);
    });
    await step("bail out if result is the same", () => {
      // Bail out if value of "B" never changes
      // A->B->C
      const a = signal("a");
      const b = signal(() => (a(), "foo"));
      const c = spy(() => b());
      const d = signal(c);
      assertEquals(d(), "foo"), assertSpyCalls(c, 1);
      a("aa"), assertEquals(d(), "foo"), assertSpyCalls(c, 1);
    });
    await step("only update every signal once", () => {
      // (jagged diamond graph + tails)
      // "F" and "G" will be likely updated twice if our mark+sweep logic is buggy.
      //     A
      //   /   \
      //  B     C
      //  |     |
      //  |     D
      //   \   /
      //     E
      //   /   \
      //  F     G
      const a = signal("a");
      const b = signal(() => a());
      const c = signal(() => a());
      const d = signal(() => c());
      const e: Spy[] = [];
      const f: Spy<any, [], string> = spy(() => (e.push(f), b() + " " + d()));
      const g = signal(f);
      const h: Spy<any, [], string> = spy(() => (e.push(h), g()));
      const i = signal(h);
      const j: Spy<any, [], string> = spy(() => (e.push(j), g()));
      const k = signal(j);
      assertEquals(i(), "a a"), assertSpyCalls(h, 1);
      assertEquals(k(), "a a"), assertSpyCalls(j, 1);
      e.length = 0;
      f.calls.length = h.calls.length = j.calls.length = 0, a("b");
      assertEquals(g(), "b b"), assertSpyCalls(f, 1);
      assertEquals(i(), "b b"), assertSpyCalls(h, 1);
      assertEquals(k(), "b b"), assertSpyCalls(j, 1);
      e.length = 0;
      f.calls.length = h.calls.length = j.calls.length = 0, a("c");
      assertEquals(g(), "c c"), assertSpyCalls(f, 1);
      assertEquals(i(), "c c"), assertSpyCalls(h, 1);
      assertEquals(k(), "c c"), assertSpyCalls(j, 1);
      // top to bottom
      assertLess(e.indexOf(f), e.indexOf(h));
      // left to right
      assertLess(e.indexOf(h), e.indexOf(j));
    });
    await step("only subscribe to signals listened to", () => {
      //    *A
      //   /   \
      // *B     C <- we don't listen to C
      const a = signal("a");
      const b = signal(() => a());
      const c = spy(() => a());
      signal(c), assertEquals(b(), "a"), assertSpyCalls(c, 0);
      a("aa"), assertEquals(b(), "aa"), assertSpyCalls(c, 0);
    });
    await step("only subscribe to signals listened to II", () => {
      // Here both "B" and "C" are active in the beginning, but
      // "B" becomes inactive later. At that point it should
      // not receive any updates anymore.
      //    *A
      //   /   \
      // *B     D <- we don't listen to C
      //  |
      // *C
      const a = signal("a");
      const b = spy(() => a());
      const c = signal(b);
      const d = spy(() => c());
      const e = signal(d);
      const f = signal(() => a());
      let g = "";
      const h = effect(() => g = e());
      assertEquals(g, "a"), assertEquals(f(), "a");
      b.calls.length = d.calls.length = 0, h(), a("aa");
      assertSpyCalls(b, 0), assertSpyCalls(d, 0), assertEquals(f(), "aa");
    });
    await step("ensure subs update even if one dep unmarks it", () => {
      // In this scenario "C" always returns the same value. When "A"
      // changes, "B" will update, then "C" at which point its update
      // to "D" will be unmarked. But "D" must still update because
      // "B" marked it. If "D" isn't updated, then we have a bug.
      //     A
      //   /   \
      //  B     *C <- returns same value every time
      //   \   /
      //     D
      const a = signal("a");
      const b = signal(() => a());
      const c = signal(() => (a(), "c"));
      const d = spy(() => b() + " " + c());
      const e = signal(d);
      assertEquals(e(), "a c");
      d.calls.length = 0, a("aa"), e();
      assertSpyCall(d, 0, { returned: "aa c" });
    });
    await step("ensure subs update even if two deps unmark it", () => {
      // In this scenario both "C" and "D" always return the same
      // value. But "E" must still update because "A" marked it.
      // If "E" isn't updated, then we have a bug.
      //     A
      //   / | \
      //  B *C *D
      //   \ | /
      //     E
      const a = signal("a");
      const b = signal(() => a());
      const c = signal(() => (a(), "c"));
      const d = signal(() => (a(), "d"));
      const e = spy(() => b() + " " + c() + " " + d());
      const f = signal(e);
      assertEquals(f(), "a c d");
      e.calls.length = 0, a("aa"), f();
      assertSpyCall(e, 0, { returned: "aa c d" });
    });
    await step("support lazy branches", () => {
      const a = signal(0);
      const b = signal(() => a());
      const c = signal(() => (a() > 0 ? a() : b()));
      assertEquals(c(), 0);
      a(1), assertEquals(c(), 1);
      a(0), assertEquals(c(), 0);
    });
    await step("not update a sub if all deps unmark it", () => {
      // In this scenario "B" and "C" always return the same value. When "A"
      // changes, "D" should not update.
      //     A
      //   /   \
      // *B     *C
      //   \   /
      //     D
      const a = signal("a");
      const b = signal(() => (a(), "b"));
      const c = signal(() => (a(), "c"));
      const d = spy(() => b() + " " + c());
      const e = signal(d);
      assertEquals(e(), "b c");
      d.calls.length = 0, a("aa"), assertSpyCalls(d, 0);
    });
  });
  await step("error handling", async ({ step }) => {
    await step("keep graph consistent on errors during activation", () => {
      const a = signal(0);
      const b = signal(() => {
        throw 0;
      });
      const c = signal(() => a());
      assertThrows(b);
      a(1), assertEquals(c(), 1);
    });
    await step("keep graph consistent on errors in signals", () => {
      const a = signal(0);
      const b = signal(() => {
        if (a() === 1) throw 0;
        return a();
      });
      const c = signal(() => b());
      assertEquals(c(), 0);
      a(1), assertThrows(b);
      a(2), assertEquals(c(), 2);
    });
  });
  await step("untrack", async ({ step }) => {
    await step("pause tracking in signal", () => {
      let a = 0;
      const b = signal(0);
      const c = signal(() => {
        ++a;
        const d = set_actor(null), e = b();
        return set_actor(d), e;
      });
      assertEquals(c(), 0), assertEquals(a, 1);
      b(1), b(2), b(3), assertEquals(c(), 0), assertEquals(a, 1);
    });
    await step("pause tracking in effect", () => {
      let a = 0;
      const b = signal(0);
      const c = signal(0);
      effect(() => {
        ++a;
        if (c()) {
          const d = set_actor(null);
          b(), set_actor(d);
        }
      });
      assertEquals(a, 1);
      c(1), assertEquals(a, 2);
      b(1), b(2), b(3), assertEquals(a, 2);
      c(2), assertEquals(a, 3);
      b(4), b(5), b(6), assertEquals(a, 3);
      c(0), assertEquals(a, 4);
      b(7), b(8), b(9), assertEquals(a, 4);
    });
    await step("pause tracking in effect scope", () => {
      let a = 0;
      const b = signal(0);
      scoper(() =>
        effect(() => {
          ++a;
          const c = set_actor(null);
          b(), set_actor(c);
        })
      );
      assertEquals(a, 1);
      b(1), b(2), b(3), assertEquals(a, 1);
    });
  });
});
Deno.test("reactively", async ({ step }) => {
  await step("core", async ({ step }) => {
    await step("two signals", () => {
      const a = signal(7), b = signal(1);
      let c = 0;
      const d = signal(() => (++c, a() * b()));
      a(2), assertEquals(d(), 2);
      b(3), assertEquals(d(), 6);
      assertEquals(c, 2), d(), assertEquals(c, 2);
    });
    await step("dependent computed", () => {
      const a = signal(7), b = signal(1);
      let c = 0;
      const d = signal(() => (++c, a() * b()));
      let e = 0;
      const f = signal(() => (++e, d() + 1));
      assertEquals(f(), 8), assertEquals(c, 1), assertEquals(e, 1);
      a(3), assertEquals(f(), 4), assertEquals(c, 2), assertEquals(e, 2);
    });
    await step("equality check", () => {
      let a = 0;
      const b = signal(7), c = signal(() => (++a, b() + 10));
      c(), c(), assertEquals(a, 1);
      b(7), assertEquals(a, 1);
    });
    await step("dynamic computed", () => {
      const a = signal(1), b = signal(2);
      let c = 0, d = 0, e = 0;
      const f = signal(() => (++c, a()));
      const g = signal(() => (++d, b()));
      const h = signal(() => (++e, f() || g()));
      assertEquals(h(), 1), a(2), b(3), assertEquals(h(), 2);
      assertEquals(c, 2), assertEquals(d, 0), assertEquals(e, 2);
      a(0), assertEquals(h(), 3);
      assertEquals(c, 3), assertEquals(d, 1), assertEquals(e, 3);
      b(4), assertEquals(h(), 4);
      assertEquals(c, 3), assertEquals(d, 2), assertEquals(e, 4);
    });
    await step("boolean equality check", () => {
      const a = signal(0), b = signal(() => a() > 0);
      let c = 0;
      const d = signal(() => (++c, b() ? 1 : 0));
      assertEquals(d(), 0), assertEquals(c, 1);
      a(1), assertEquals(d(), 1), assertEquals(c, 2);
      a(2), assertEquals(d(), 1), assertEquals(c, 2);
    });
    await step("diamond computeds", () => {
      const a = signal(1), b = signal(() => a());
      const c = signal(() => b() * 2), d = signal(() => b() * 3);
      let e = 0;
      const f = signal(() => (++e, c() + d()));
      assertEquals(f(), 5), assertEquals(e, 1);
      a(2), assertEquals(f(), 10), assertEquals(e, 2);
      a(3), assertEquals(f(), 15), assertEquals(e, 3);
    });
    await step("set inside reaction", () => {
      const a = signal(1), b = signal(() => a(2)), c = signal(() => a() + 100);
      b(), assertEquals(c(), 102);
    });
  });
  await step("async", async ({ step }) => {
    const sleep = ($: number) =>
      new Promise((resolve) => setTimeout(resolve, $));
    await step("async modify", async () => {
      const a = signal(1), b = signal(() => a() + 10);
      await sleep(10).then(() => a(2));
      assertEquals(b(), 12);
    });
    await step("async modify in reaction before await", async () => {
      const a = signal(1), b = signal(() => (a(2), sleep(10)));
      const c = signal(() => a() + 100);
      await b(), assertEquals(c(), 102);
    });
    await step("async modify in reaction after await", async () => {
      const a = signal(1), b = signal(async () => (await sleep(10), a(2)));
      const c = signal(() => a() + 100);
      await b(), assertEquals(c(), 102);
    });
  });
  await step("dynamic", async ({ step }) => {
    await step("dynamic sources recalculate correctly", () => {
      const a = signal(false), b = signal(2);
      let c = 0;
      const d = signal(() => (++c, a() || b()));
      d(), assertEquals(c, 1);
      a(true), d(), assertEquals(c, 2);
      b(4), d(), assertEquals(c, 2);
    });
    await step("dynamic sources don't re-execute parent unnecessarily", () => {
      const a = signal(2), b = signal(() => a() + 1);
      let c = 0;
      const d = signal(() => (++c, a() + 10));
      const e = signal(() => {
        let f = b();
        if (f & 1) f += d();
        return f;
      });
      assertEquals(e(), 15), assertEquals(c, 1);
      a(3), assertEquals(e(), 4), assertEquals(c, 1);
    });
    await step("dynamic source disappears entirely", () => {
      const a = signal(1);
      let b = false, c = 0;
      const d = signal(() => {
        ++c;
        if (b) return 0;
        const e = a();
        if (e > 2) b = true;
        return e;
      });
      assertEquals(d(), 1), assertEquals(c, 1);
      a(3), assertEquals(d(), 3), assertEquals(c, 2);
      a(1), assertEquals(d(), 0), assertEquals(c, 3);
      a(0), assertEquals(d(), 0), assertEquals(c, 3);
    });
  });
});
