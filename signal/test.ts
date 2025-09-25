import { assert, assertEquals, assertLess, assertThrows } from "@std/assert";
import {
  assertSpyCall,
  assertSpyCalls,
  type Spy,
  spy,
} from "@std/testing/mock";
import { bundle } from "@libn/lib";
import { set_actor } from "./src/state.ts";
import {
  batch,
  derive,
  effect,
  type Getter,
  scoper,
  type Setter,
  signal,
} from "./src/use.ts";

Deno.test("mod", async ({ step }) => {
  await step("derive : alien-signals signal tests", () => {
    { // correctly propagate changes through signal signals
      const a = signal(0);
      const b = derive(() => a() % 2);
      const c = derive(() => b());
      const d = derive(() => c());
      d();
      a(1); // c1 -> dirty, c2 -> toCheckDirty, c3 -> toCheckDirty
      c(); // c1 -> none, c2 -> none
      a(3); // c1 -> dirty, c2 -> toCheckDirty
      assertEquals(d(), 1);
    }
    { // propagate updated source through chained computations
      const a = signal(0);
      const b = derive(() => a());
      const c = derive(() => b() % 2);
      const d = derive(() => a());
      const e = derive(() => c() + d());
      assertEquals(e(), 0);
      a(2), assertEquals(e(), 2);
    }
    { // handle flags are indirectly updated during checkDirty
      const a = signal(false);
      const b = derive(() => a());
      const c = derive(() => (b(), 0));
      const d = derive(() => (c(), b()));
      assertEquals(d(), false);
      a(true), assertEquals(d(), true);
    }
    { // not update if the signal value is reverted
      let a = 0;
      const b = signal(0);
      const c = derive(() => (a++, b()));
      c(), assertEquals(a, 1);
      b(1), b(0), c(), assertEquals(a, 1);
    }
  });
  await step("effect : alien-signals effect tests", () => {
    { // clear subscriptions when untracked by all subscribers
      let a = 0;
      const b = signal(1);
      const c = derive(() => (a++, b() * 2));
      const d = effect(() => c());
      assertEquals(a, 1);
      b(2), assertEquals(a, 2);
      d(), b(3), assertEquals(a, 2);
    }
    { // not run untracked inner effect
      const a = signal(3);
      const b = derive(() => a() > 0);
      effect(() =>
        b() && effect(() => {
          if (!a()) assert(0);
        })
      );
      a(2), a(1), a(0);
    }
    { // run outer effect first
      const a = signal(1);
      const b = signal(1);
      effect(() =>
        a() && effect(() => {
          if (b(), !a()) assert(0);
        })
      );
      batch(() => (b(0), a(0)));
    }
    { // not trigger inner effect when resolve maybe dirty
      const a = signal(0);
      const b = derive(() => a() % 2);
      let c = 0;
      effect(() =>
        effect(() => {
          if (b(), ++c >= 2) assert(0);
        })
      ), a(2);
    }
    { // trigger inner effects in sequence
      const a = signal(0);
      const b = signal(0);
      const c = derive(() => a() - b());
      const d: string[] = [];
      effect(() => {
        c();
        effect(() => (d.push("first inner"), a()));
        effect(() => (d.push("last inner"), a(), b()));
      });
      d.length = 0;
      batch(() => (b(1), a(1)));
      assertEquals(d, ["first inner", "last inner"]);
    }
    { // trigger inner effects in sequence in effect scope
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
    }
    { // custom effect support batch
      const batch_effect = ($: () => void) => batch(() => effect($));
      const a: string[] = [];
      const b = signal(0);
      const c = signal(0);
      const d = derive(() => (a.push("aa-0"), b() || c(1), a.push("aa-1")));
      const e = derive(() => (a.push("bb"), c()));
      batch_effect(() => e());
      batch_effect(() => d());
      assertEquals(a, ["bb", "aa-0", "aa-1", "bb"]);
    }
    { // duplicate subscribers do not affect the notify order
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
    }
    { // handle side effect with inner effects
      const a = signal(0);
      const b = signal(0);
      const c: string[] = [];
      effect(() => {
        effect(() => (a(), c.push("a")));
        effect(() => (b(), c.push("b")));
        assertEquals(c, ["a", "b"]);
        c.length = 0, b(1), a(1), assertEquals(c, ["b", "a"]);
      });
    }
    { // handle flags are indirectly updated during checkDirty
      const a = signal(false);
      const b = derive(() => a());
      const c = derive(() => (b(), 0));
      const d = derive(() => (c(), b()));
      let e = 0;
      effect(() => (d(), ++e));
      assertEquals(e, 1);
      a(true), assertEquals(e, 2);
    }
  });
  await step("scoper : alien-signals scoper tests", () => {
    { // not trigger after stop
      const a = signal(1);
      let b = 0;
      const c = scoper(() => {
        effect(() => (b++, a())), assertEquals(b, 1);
        a(2), assertEquals(b, 2);
      });
      a(3), assertEquals(b, 3);
      c(), a(4), assertEquals(b, 3);
    }
    { // dispose inner effects if created in an effect
      const a = signal(1);
      let b = 0;
      effect(() => {
        const c = scoper(() => effect(() => (a(), b++)));
        assertEquals(b, 1);
        a(2), assertEquals(b, 2);
        c(), a(3), assertEquals(b, 2);
      });
    }
  });
  await step("effect : alien-signals issue 48", () => {
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
      const tracked = derive(() => {
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
  await step("derive : alien-signals graph tests", () => {
    { // drop A->B->A updates
      //     A
      //   / |
      //  B  | <- Looks like a flag doesn't it? :D
      //   \ |
      //     C
      //     |
      //     D
      const a = signal(2);
      const b = derive(() => a() - 1);
      const c = derive(() => a() + b());
      const d = spy(() => "d: " + c());
      const e = derive(d);
      // Trigger read
      assertEquals(e(), "d: 3"), assertSpyCalls(d, 1);
      d.calls.length = 0, a(4), e(), assertSpyCalls(d, 1);
    }
    { // only update every signal once (diamond graph)
      // In this scenario "D" should only update once when "A" receives
      // an update. This is sometimes referred to as the "diamond" scenario.
      //     A
      //   /   \
      //  B     C
      //   \   /
      //     D
      const a = signal("a");
      const b = derive(() => a());
      const c = derive(() => a());
      const d = spy(() => b() + " " + c());
      const e = derive(d);
      assertEquals(e(), "a a"), assertSpyCalls(d, 1);
      a("aa"), assertEquals(e(), "aa aa"), assertSpyCalls(d, 2);
    }
    { // only update every signal once (diamond graph + tail)
      // "E" will be likely updated twice if our mark+sweep logic is buggy.
      //     A
      //   /   \
      //  B     C
      //   \   /
      //     D
      //     |
      //     E
      const a = signal("a");
      const b = derive(() => a());
      const c = derive(() => a());
      const d = derive(() => b() + " " + c());
      const e = spy(() => d());
      const f = derive(e);
      assertEquals(f(), "a a"), assertSpyCalls(e, 1);
      a("aa"), assertEquals(f(), "aa aa"), assertSpyCalls(e, 2);
    }
    { // bail out if result is the same
      // Bail out if value of "B" never changes
      // A->B->C
      const a = signal("a");
      const b = derive(() => (a(), "foo"));
      const c = spy(() => b());
      const d = derive(c);
      assertEquals(d(), "foo"), assertSpyCalls(c, 1);
      a("aa"), assertEquals(d(), "foo"), assertSpyCalls(c, 1);
    }
    { // only update every signal once (jagged diamond graph + tails)
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
      const b = derive(() => a());
      const c = derive(() => a());
      const d = derive(() => c());
      const e: Spy[] = [];
      const f: Spy<any, [], string> = spy(() => (e.push(f), b() + " " + d()));
      const g = derive(f);
      const h: Spy<any, [], string> = spy(() => (e.push(h), g()));
      const i = derive(h);
      const j: Spy<any, [], string> = spy(() => (e.push(j), g()));
      const k = derive(j);
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
    }
    { // only subscribe to signals listened to
      //    *A
      //   /   \
      // *B     C <- we don't listen to C
      const a = signal("a");
      const b = derive(() => a());
      const c = spy(() => a());
      signal(c), assertEquals(b(), "a"), assertSpyCalls(c, 0);
      a("aa"), assertEquals(b(), "aa"), assertSpyCalls(c, 0);
    }
    { // only subscribe to signals listened to II
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
      const c = derive(b);
      const d = spy(() => c());
      const e = derive(d);
      const f = derive(() => a());
      let g = "";
      const h = effect(() => g = e());
      assertEquals(g, "a"), assertEquals(f(), "a");
      b.calls.length = d.calls.length = 0, h(), a("aa");
      assertSpyCalls(b, 0), assertSpyCalls(d, 0), assertEquals(f(), "aa");
    }
    { // ensure subs update even if one dep unmarks it
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
      const b = derive(() => a());
      const c = derive(() => (a(), "c"));
      const d = spy(() => b() + " " + c());
      const e = derive(d);
      assertEquals(e(), "a c");
      d.calls.length = 0, a("aa"), e();
      assertSpyCall(d, 0, { returned: "aa c" });
    }
    { // ensure subs update even if two deps unmark it
      // In this scenario both "C" and "D" always return the same
      // value. But "E" must still update because "A" marked it.
      // If "E" isn't updated, then we have a bug.
      //     A
      //   / | \
      //  B *C *D
      //   \ | /
      //     E
      const a = signal("a");
      const b = derive(() => a());
      const c = derive(() => (a(), "c"));
      const d = derive(() => (a(), "d"));
      const e = spy(() => b() + " " + c() + " " + d());
      const f = derive(e);
      assertEquals(f(), "a c d");
      e.calls.length = 0, a("aa"), f();
      assertSpyCall(e, 0, { returned: "aa c d" });
    }
    { // support lazy branches
      const a = signal(0);
      const b = derive(() => a());
      const c = derive(() => (a() > 0 ? a() : b()));
      assertEquals(c(), 0);
      a(1), assertEquals(c(), 1);
      a(0), assertEquals(c(), 0);
    }
    { // not update a sub if all deps unmark it
      // In this scenario "B" and "C" always return the same value. When "A"
      // changes, "D" should not update.
      //     A
      //   /   \
      // *B     *C
      //   \   /
      //     D
      const a = signal("a");
      const b = derive(() => (a(), "b"));
      const c = derive(() => (a(), "c"));
      const d = spy(() => b() + " " + c());
      const e = derive(d);
      assertEquals(e(), "b c");
      d.calls.length = 0, a("aa"), assertSpyCalls(d, 0);
    }
  });
  await step("signal/derive : alien-signals error handling tests", () => {
    { // keep graph consistent on errors during activation
      const a = signal(0);
      const b = derive(() => {
        throw 0;
      });
      const c = derive(() => a());
      assertThrows(b);
      a(1), assertEquals(c(), 1);
    }
    { // keep graph consistent on errors in signals
      const a = signal(0);
      const b = derive(() => {
        if (a() === 1) throw 0;
        return a();
      });
      const c = derive(() => b());
      assertEquals(c(), 0);
      a(1), assertThrows(b);
      a(2), assertEquals(c(), 2);
    }
  });
  await step("set_actor : alien-signals untrack tests", () => {
    { // pause tracking in signal
      let a = 0;
      const b = signal(0);
      const c = derive(() => {
        ++a;
        const d = set_actor(null), e = b();
        return set_actor(d), e;
      });
      assertEquals(c(), 0), assertEquals(a, 1);
      b(1), b(2), b(3), assertEquals(c(), 0), assertEquals(a, 1);
    }
    { // pause tracking in effect
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
    }
    { // pause tracking in effect scope
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
    }
  });
  await step("derive : reactively core tests", () => {
    { // two signals
      const a = signal(7), b = signal(1);
      let c = 0;
      const d = derive(() => (++c, a() * b()));
      a(2), assertEquals(d(), 2);
      b(3), assertEquals(d(), 6);
      assertEquals(c, 2), d(), assertEquals(c, 2);
    }
    { // dependent computed
      const a = signal(7), b = signal(1);
      let c = 0;
      const d = derive(() => (++c, a() * b()));
      let e = 0;
      const f = derive(() => (++e, d() + 1));
      assertEquals(f(), 8), assertEquals(c, 1), assertEquals(e, 1);
      a(3), assertEquals(f(), 4), assertEquals(c, 2), assertEquals(e, 2);
    }
    { // equality check
      let a = 0;
      const b = signal(7), c = derive(() => (++a, b() + 10));
      c(), c(), assertEquals(a, 1);
      b(7), assertEquals(a, 1);
    }
    { // dynamic computed
      const a = signal(1), b = signal(2);
      let c = 0, d = 0, e = 0;
      const f = derive(() => (++c, a()));
      const g = derive(() => (++d, b()));
      const h = derive(() => (++e, f() || g()));
      assertEquals(h(), 1), a(2), b(3), assertEquals(h(), 2);
      assertEquals(c, 2), assertEquals(d, 0), assertEquals(e, 2);
      a(0), assertEquals(h(), 3);
      assertEquals(c, 3), assertEquals(d, 1), assertEquals(e, 3);
      b(4), assertEquals(h(), 4);
      assertEquals(c, 3), assertEquals(d, 2), assertEquals(e, 4);
    }
    { // boolean equality check
      const a = signal(0), b = derive(() => a() > 0);
      let c = 0;
      const d = derive(() => (++c, b() ? 1 : 0));
      assertEquals(d(), 0), assertEquals(c, 1);
      a(1), assertEquals(d(), 1), assertEquals(c, 2);
      a(2), assertEquals(d(), 1), assertEquals(c, 2);
    }
    { // diamond computeds
      const a = signal(1), b = derive(() => a());
      const c = derive(() => b() * 2), d = derive(() => b() * 3);
      let e = 0;
      const f = derive(() => (++e, c() + d()));
      assertEquals(f(), 5), assertEquals(e, 1);
      a(2), assertEquals(f(), 10), assertEquals(e, 2);
      a(3), assertEquals(f(), 15), assertEquals(e, 3);
    }
    { // set inside reaction
      const a = signal(1), b = derive(() => a(2)), c = derive(() => a() + 100);
      b(), assertEquals(c(), 102);
    }
  });
  await step("derive : reactively async tests", async () => {
    const sleep = ($: number) =>
      new Promise((resolve) => setTimeout(resolve, $));
    { // async modify
      const a = signal(1), b = derive(() => a() + 10);
      await sleep(10).then(() => a(2));
      assertEquals(b(), 12);
    }
    { // async modify in reaction before await
      const a = signal(1), b = derive(() => (a(2), sleep(10)));
      const c = derive(() => a() + 100);
      await b(), assertEquals(c(), 102);
    }
    { // async modify in reaction after await
      const a = signal(1), b = derive(async () => (await sleep(10), a(2)));
      const c = derive(() => a() + 100);
      await b(), assertEquals(c(), 102);
    }
  });
  await step("derive : reactively dynamic tests", () => {
    { // dynamic sources recalculate correctly
      const a = signal(false), b = signal(2);
      let c = 0;
      const d = derive(() => (++c, a() || b()));
      d(), assertEquals(c, 1);
      a(true), d(), assertEquals(c, 2);
      b(4), d(), assertEquals(c, 2);
    }
    { // dynamic sources don't re-execute parent unnecessarily
      const a = signal(2), b = derive(() => a() + 1);
      let c = 0;
      const d = derive(() => (++c, a() + 10));
      const e = derive(() => {
        let f = b();
        if (f & 1) f += d();
        return f;
      });
      assertEquals(e(), 15), assertEquals(c, 1);
      a(3), assertEquals(e(), 4), assertEquals(c, 1);
    }
    { // dynamic source disappears entirely
      const a = signal(1);
      let b = false, c = 0;
      const d = derive(() => {
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
    }
  });
  await step("signal : preact signal tests", () => {
    { // return value
      const a = [1, 2];
      const b = signal(a);
      assertEquals(b(), a);
    }
    { // notify other listeners of changes after one is disposed
      const a = signal(0);
      const b = spy(() => a());
      const c = spy(() => a());
      const d = spy(() => a());
      effect(b);
      const e = effect(c);
      effect(d);
      assertSpyCalls(b, 1);
      assertSpyCalls(c, 1);
      assertSpyCalls(d, 1);
      e();
      a(1);
      assertSpyCalls(b, 2);
      assertSpyCalls(c, 1);
      assertSpyCalls(d, 2);
    }
  });
  await step("effect : preact effect tests", () => {
    { // run the callback immediately
      const a = signal(123);
      const b = spy(() => a());
      effect(b);
      assertSpyCalls(b, 1);
    }
    { // subscribe to signals
      const a = signal(123);
      const b = spy(() => a());
      effect(b);
      b.calls.length = 0;
      a(42);
      assertSpyCalls(b, 1);
    }
    { // subscribe to multiple signals
      const a = signal("a");
      const b = signal("b");
      const c = spy(() => (a(), b()));
      effect(c);
      c.calls.length = 0;
      a("aa");
      b("bb");
      assertSpyCalls(c, 2);
    }
    { // dispose of subscriptions
      const a = signal("a");
      const b = signal("b");
      const c = spy(() => a() + " " + b());
      const d = effect(c);
      c.calls.length = 0;
      d();
      assertSpyCalls(c, 0);
      a("aa");
      b("bb");
      assertSpyCalls(c, 0);
    }
    { // dispose of subscriptions
      const a = signal("a");
      const b = signal("b");
      const c = spy(() => a() + " " + b());
      const d = effect(() => (c(), a() === "aa" && d()));
      assertSpyCalls(c, 1);
      a("aa");
      assertSpyCalls(c, 2);
      a("aaa");
      assertSpyCalls(c, 2);
    }
    { // dispose of subscriptions when called twice
      const a = signal("a");
      const b = signal("b");
      const c = spy(() => a() + " " + b());
      const d = effect(() => (c(), a() === "aa" && d()));
      assertSpyCalls(c, 1);
      a("aa");
      assertSpyCalls(c, 2);
      d();
      a("aaa");
      assertSpyCalls(c, 2);
    }
    { // unsubscribe from signal
      const a = signal(123);
      const b = spy(() => a());
      const c = effect(b);
      b.calls.length = 0;
      c();
      a(42);
      assertSpyCalls(b, 0);
    }
    { // conditionally unsubscribe from signals
      const a = signal("a");
      const b = signal("b");
      const c = signal(true);
      const d = spy(() => c() ? a() : b());
      effect(d);
      assertSpyCalls(d, 1);
      b("bb");
      assertSpyCalls(d, 1);
      c(false);
      assertSpyCalls(d, 2);
      d.calls.length = 0;
      a("aaa");
      assertSpyCalls(d, 0);
    }
    { // not recompute if the effect has been notified about changes, but no direct dependency has actually changed
      const a = signal(0);
      const b = derive(() => (a(), 0));
      const c = spy(() => b());
      effect(c);
      assertSpyCalls(c, 1);
      c.calls.length = 0;
      a(1);
      assertSpyCalls(c, 0);
    }
    { // not recompute dependencies unnecessarily
      const a = spy();
      const b = signal(0);
      const c = signal(0);
      const d = derive(() => (c(), a()));
      effect(() => b() || d());
      assertSpyCalls(a, 1);
      batch(() => (c(1), b(1)));
      assertSpyCalls(a, 1);
    }
    { // not recompute dependencies out of order
      const a = signal(1);
      const b = signal(1);
      const c = signal(1);
      const d = spy(() => c());
      const e = derive(d);
      effect(() => a() > 0 ? (b(), e()) : b());
      d.calls.length = 0;
      batch(() => (a(2), b(2), c(2)));
      assertSpyCalls(d, 1);
      d.calls.length = 0;
      batch(() => (a(-1), b(-1), c(-1)));
      assertSpyCalls(d, 0);
      d.calls.length = 0;
    }
    { // recompute if a dependency changes during computation after becoming a dependency
      const a = signal(0);
      const b = spy(() => a() || a(($) => $ + 1));
      effect(b);
      assertSpyCalls(b, 2);
    }
    { // allow disposing the effect multiple times
      const a = effect(() => {});
      a();
      assertThrows(() => {
        try {
          a();
        } catch {
          return;
        }
        throw 0;
      });
    }
    { // allow disposing a running effect
      const a = signal(0);
      const b = spy();
      const c = effect(() => a() === 1 && (c(), b()));
      assertSpyCalls(b, 0);
      a(1);
      assertSpyCalls(b, 1);
      a(2);
      assertSpyCalls(b, 1);
    }
    { // not run if it's first been triggered and then disposed in a batch
      const a = signal(0);
      const b = spy(() => a());
      const c = effect(b);
      b.calls.length = 0;
      batch(() => (a(1), c()));
      assertSpyCalls(b, 0);
    }
    { // not run if it's been triggered, disposed and then triggered again in a batch
      const a = signal(0);
      const b = spy(() => a());
      const c = effect(b);
      b.calls.length = 0;
      batch(() => (a(1), c(), a(2)));
      assertSpyCalls(b, 0);
    }
    { // not rerun parent effect if a nested child effect's signal's value changes
      const a = signal(0);
      const b = signal(0);
      const c = spy(() => a());
      const d = spy(() => b());
      effect(() => (c(), effect(d)));
      assertSpyCalls(c, 1);
      assertSpyCalls(d, 1);
      b(1);
      assertSpyCalls(c, 1);
      assertSpyCalls(d, 2);
      a(1);
      assertSpyCalls(c, 2);
      assertSpyCalls(d, 3);
    }
  });
  await step("derive : preact computed tests", () => {
    { // return value
      const a = signal("a");
      const b = signal("b");
      const c = derive(() => a() + b());
      assertEquals(c(), "ab");
    }
    { // return updated value
      const a = signal("a");
      const b = signal("b");
      const c = derive(() => a() + b());
      assertEquals(c(), "ab");
      a("aa");
      assertEquals(c(), "aab");
    }
    { // be lazily computed on demand
      const a = signal("a");
      const b = signal("b");
      const c = spy(() => a() + b());
      const d = derive(c);
      assertSpyCalls(c, 0);
      d();
      assertSpyCalls(c, 1);
      a("x");
      b("y");
      assertSpyCalls(c, 1);
      d();
      assertSpyCalls(c, 2);
    }
    { // be computed only when a dependency has changed at some point
      const a = signal("a");
      const b = spy(() => a());
      const c = derive(b);
      c();
      assertSpyCalls(b, 1);
      a("a");
      c();
      assertSpyCalls(b, 1);
    }
    { // conditionally unsubscribe from signals
      const a = signal("a");
      const b = signal("b");
      const c = signal(true);
      const d = spy(() => c() ? a() : b());
      const e = derive(d);
      assertEquals(e(), "a");
      assertSpyCalls(d, 1);
      b("bb");
      assertEquals(e(), "a");
      assertSpyCalls(d, 1);
      c(false);
      assertEquals(e(), "bb");
      assertSpyCalls(d, 2);
      d.calls.length = 0;
      a("aaa");
      assertEquals(e(), "bb");
      assertSpyCalls(d, 0);
    }
    { // consider undefined value separate from uninitialized value
      const a = signal(0);
      const b = spy(() => undefined);
      const c = derive(b);
      assertEquals(c(), undefined);
      a(1);
      assertEquals(c(), undefined);
      assertSpyCalls(b, 1);
    }
    { // not leak errors raised by dependencies
      const a = signal(0);
      const b = derive(() => {
        a();
        throw 0;
      });
      const c = derive(() => {
        try {
          b();
        } catch {
          return "ok";
        }
      });
      assertEquals(c(), "ok");
      a(1);
      assertEquals(c(), "ok");
    }
    { // propagate notifications even right after first subscription
      const a = signal(0);
      const b = derive(() => a());
      const c = derive(() => b());
      c();
      const d = spy(() => c());
      effect(d);
      assertSpyCalls(d, 1);
      d.calls.length = 0;
      a(1);
      assertSpyCalls(d, 1);
    }
    { // get marked as outdated right after first subscription
      const a = signal(0);
      const b = derive(() => a());
      b();
      a(1);
      effect(() => b());
      assertEquals(b(), 1);
    }
    { // propagate notification to other listeners after one listener is disposed
      const a = signal(0);
      const b = derive(() => a());
      const c = spy(() => b());
      const d = spy(() => b());
      const e = spy(() => b());
      effect(c);
      const f = effect(d);
      effect(e);
      assertSpyCalls(c, 1);
      assertSpyCalls(d, 1);
      assertSpyCalls(e, 1);
      f();
      a(1);
      assertSpyCalls(c, 2);
      assertSpyCalls(d, 1);
      assertSpyCalls(e, 2);
    }
    { // not recompute dependencies out of order
      const a = signal(1);
      const b = signal(1);
      const c = signal(1);
      const d = spy(() => c());
      const e = derive(d);
      const f = derive(() => a() > 0 ? (b(), e()) : b());
      f();
      d.calls.length = 0;
      a(2);
      b(2);
      c(2);
      f();
      assertSpyCalls(d, 1);
      d.calls.length = 0;
      a(-1);
      b(-1);
      c(-1);
      f();
      assertSpyCalls(d, 0);
      d.calls.length = 0;
    }
    { // not recompute dependencies unnecessarily
      const a = spy();
      const b = signal(0);
      const c = signal(0);
      const d = derive(() => (c(), a()));
      const e = derive(() => b() || d());
      e();
      assertSpyCalls(a, 1);
      batch(() => (c(1), b(1)));
      e();
      assertSpyCalls(a, 1);
    }
    { // graph updates
      { // run computeds once for multiple dep changes
        const a = signal("a");
        const b = signal("b");
        const c = spy(() => a() + b());
        const d = derive(c);
        assertEquals(d(), "ab");
        assertSpyCalls(c, 1);
        c.calls.length = 0;
        a("aa");
        b("bb");
        d();
        assertSpyCalls(c, 1);
      }
      { // drop A->B->A updates
        //     A
        //   / |
        //  B  | <- Looks like a flag doesn't it? :D
        //   \ |
        //     C
        //     |
        //     D
        const a = signal(2);
        const b = derive(() => a() - 1);
        const c = derive(() => a() + b());
        const d = spy(() => "d: " + c());
        const e = derive(d);
        // Trigger read
        assertEquals(e(), "d: 3");
        assertSpyCalls(d, 1);
        d.calls.length = 0;
        a(4);
        e();
        assertSpyCalls(d, 1);
      }
      { // only update every signal once (diamond graph)
        // In this scenario "D" should only update once when "A" receives
        // an update. This is sometimes referred to as the "diamond" scenario.
        //     A
        //   /   \
        //  B     C
        //   \   /
        //     D
        const a = signal("a");
        const b = derive(() => a());
        const c = derive(() => a());
        const d = spy(() => b() + " " + c());
        const e = derive(d);
        assertEquals(e(), "a a");
        assertSpyCalls(d, 1);
        a("aa");
        assertEquals(e(), "aa aa");
        assertSpyCalls(d, 2);
      }
      { // only update every signal once (diamond graph + tail)
        // "E" will be likely updated twice if our mark+sweep logic is buggy.
        //     A
        //   /   \
        //  B     C
        //   \   /
        //     D
        //     |
        //     E
        const a = signal("a");
        const b = derive(() => a());
        const c = derive(() => a());
        const d = derive(() => b() + " " + c());
        const e = spy(() => d());
        const f = derive(e);
        assertEquals(f(), "a a");
        assertSpyCalls(e, 1);
        a("aa");
        assertEquals(f(), "aa aa");
        assertSpyCalls(e, 2);
      }
      { // bail out if result is the same
        // Bail out if value of "B" never changes
        // A->B->C
        const a = signal("a");
        const b = derive(() => (a(), "foo"));
        const c = spy(() => b());
        const d = derive(c);
        assertEquals(d(), "foo");
        assertSpyCalls(c, 1);
        a("aa");
        assertEquals(d(), "foo");
        assertSpyCalls(c, 1);
      }
      { // only update every signal once (jagged diamond graph + tails)
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
        const b = derive(() => a());
        const c = derive(() => a());
        const d = derive(() => c());
        const e: Spy[] = [];
        const f: Spy<any, [], string> = spy(
          () => (e.push(f), b() + " " + d()),
        );
        const g = derive(f);
        const h: Spy<any, [], string> = spy(() => (e.push(h), g()));
        const i = derive(h);
        const j: Spy<any, [], string> = spy(() => (e.push(j), g()));
        const k = derive(j);
        assertEquals(i(), "a a");
        assertSpyCalls(h, 1);
        assertEquals(k(), "a a");
        assertSpyCalls(j, 1);
        e.length = 0;
        f.calls.length = 0;
        h.calls.length = 0;
        j.calls.length = 0, a("b");
        assertEquals(g(), "b b");
        assertSpyCalls(f, 1);
        assertEquals(i(), "b b");
        assertSpyCalls(h, 1);
        assertEquals(k(), "b b");
        assertSpyCalls(j, 1);
        e.length = 0;
        f.calls.length = 0;
        h.calls.length = 0;
        j.calls.length = 0, a("c");
        assertEquals(g(), "c c");
        assertSpyCalls(f, 1);
        assertEquals(i(), "c c");
        assertSpyCalls(h, 1);
        assertEquals(k(), "c c");
        assertSpyCalls(j, 1);
        // top to bottom
        assertLess(e.indexOf(f), e.indexOf(h));
        // left to right
        assertLess(e.indexOf(h), e.indexOf(j));
      }
      { // only subscribe to signals listened to
        //    *A
        //   /   \
        // *B     C <- we don't listen to C
        const a = signal("a");
        const b = derive(() => a());
        const c = spy(() => a());
        signal(c);
        assertEquals(b(), "a");
        assertSpyCalls(c, 0);
        a("aa");
        assertEquals(b(), "aa");
        assertSpyCalls(c, 0);
      }
      { // only subscribe to signals listened to
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
        const c = derive(b);
        const d = spy(() => c());
        const e = derive(d);
        const f = derive(() => a());
        let g = "";
        const h = effect(() => g = e());
        assertEquals(g, "a");
        assertEquals(f(), "a");
        b.calls.length = 0;
        d.calls.length = 0;
        h();
        a("aa");
        assertSpyCalls(b, 0);
        assertSpyCalls(d, 0);
        assertEquals(f(), "aa");
      }
      { // ensure subs update even if one dep unmarks it
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
        const b = derive(() => a());
        const c = derive(() => (a(), "c"));
        const d = spy(() => b() + " " + c());
        const e = derive(d);
        assertEquals(e(), "a c");
        d.calls.length = 0;
        a("aa");
        e();
        assertSpyCall(d, 0, { returned: "aa c" });
      }
      { // ensure subs update even if two deps unmark it
        // In this scenario both "C" and "D" always return the same
        // value. But "E" must still update because "A"  marked it.
        // If "E" isn't updated, then we have a bug.
        //     A
        //   / | \
        //  B *C *D
        //   \ | /
        //     E
        const a = signal("a");
        const b = derive(() => a());
        const c = derive(() => (a(), "c"));
        const d = derive(() => (a(), "d"));
        const e = spy(() => b() + " " + c() + " " + d());
        const f = derive(e);
        assertEquals(f(), "a c d");
        e.calls.length = 0;
        a("aa");
        f();
        assertSpyCall(e, 0, { returned: "aa c d" });
      }
    }
    { // error handling
      { // keep graph consistent on errors during activation
        const a = signal(0);
        const b = derive(() => {
          throw 0;
        });
        const c = derive(() => a());
        assertThrows(b);
        a(1);
        assertEquals(c(), 1);
      }

      { // keep graph consistent on errors in computeds
        const a = signal(0);
        const b = derive(() => {
          if (a() === 1) throw 0;
          return a();
        });
        const c = derive(() => b());
        assertEquals(c(), 0);
        a(1);
        assertThrows(b);
        a(2);
        assertEquals(c(), 2);
      }

      { // support lazy branches
        const a = signal(0);
        const b = derive(() => a());
        const c = derive(() => (a() > 0 ? a() : b()));
        assertEquals(c(), 0);
        a(1);
        assertEquals(c(), 1);
        a(0);
        assertEquals(c(), 0);
      }
      { // not update a sub if all deps unmark it
        // In this scenario "B" and "C" always return the same value. When "A"
        // changes, "D" should not update.
        //     A
        //   /   \
        // *B     *C
        //   \   /
        //     D
        const a = signal("a");
        const b = derive(() => (a(), "b"));
        const c = derive(() => (a(), "c"));
        const d = spy(() => b() + " " + c());
        const e = derive(d);
        assertEquals(e(), "b c");
        d.calls.length = 0;
        a("aa");
        assertSpyCalls(d, 0);
      }
    }
  });
  await step("batch : preact batch tests", () => {
    { // return the value from the callback
      assertEquals(batch(() => 1), 1);
    }
    { // throw errors thrown from the callback
      assertThrows(() =>
        batch(() => {
          throw 0;
        })
      );
    }
    { // throw non-errors thrown from the callback
      try {
        batch(() => {
          throw 1;
        });
        throw 0;
      } catch ($) {
        assertEquals($, 1);
      }
    }
    { // delay writes
      const a = signal("a");
      const b = signal("b");
      const c = spy(() => a() + " " + b());
      effect(c);
      c.calls.length = 0;
      batch(() => (a("aa"), b("bb")));
      assertSpyCalls(c, 1);
    }
    { // delay writes until outermost batch is complete
      const a = signal("a");
      const b = signal("b");
      const c = spy(() => a() + ", " + b());
      effect(c);
      c.calls.length = 0;
      batch(() => {
        batch(() => (a(($) => $ + " inner"), b(($) => $ + " inner")));
        a(($) => $ + " outer"), b(($) => $ + " outer");
      });
      // If the inner batch() would have flushed the update
      // this spyer would've been called twice.
      assertSpyCalls(c, 1);
    }
    { // read signals written to
      const a = signal("a");
      let b = "";
      batch(() => (a("aa"), b = a()));
      assertEquals(b, "aa");
    }
    { // read computed signals with updated source signals
      // A->B->C->D->E
      const a = signal("a");
      const b = derive(() => a());
      const c = spy(() => b());
      const d = derive(c);
      const e = spy(() => d());
      const f = derive(e);
      const g = spy(() => f());
      const h = derive(g);
      c.calls.length = 0;
      e.calls.length = 0;
      g.calls.length = 0;
      let i = "";
      batch(() => {
        a("aa");
        i = d();
        // Since "D" isn't accessed during batching, we should not
        // update it, only after batching has completed
        assertSpyCalls(e, 0);
      });
      assertEquals(i, "aa");
      assertEquals(f(), "aa");
      assertEquals(h(), "aa");
      assertSpyCalls(c, 1);
      assertSpyCalls(e, 1);
      assertSpyCalls(g, 1);
    }
    { // not block writes after batching completed
      // If no further writes after batch() are possible, than we
      // didn't restore state properly. Most likely "pending" still
      // holds elements that are already processed.
      const a = signal("a");
      const b = signal("b");
      const c = signal("c");
      const d = derive(() => a() + " " + b() + " " + c());
      let e;
      effect(() => e = d());
      batch(() => (a("aa"), b("bb")));
      c("cc");
      assertEquals(e, "aa bb cc");
    }
    { // not lead to stale signals with () in batch
      const a: number[][] = [];
      const b = signal(0);
      const c = derive(() => b() * 2);
      const d = derive(() => b() * 3);
      effect(() => a.push([c(), d()]));
      assertEquals(a, [[0, 0]]);
      batch(() => (b(1), assertEquals(c(), 2)));
      assertEquals(a[1], [2, 3]);
    }
    { // run pending effects even if the callback throws
      const a = signal(0);
      const b = signal(1);
      const c = spy(() => a());
      const d = spy(() => b());
      effect(c);
      effect(d);
      c.calls.length = 0;
      d.calls.length = 0;
      assertThrows(() =>
        batch(() => {
          a(($) => $ + 1), b(($) => $ + 1);
          throw 0;
        })
      );
      assertSpyCalls(c, 1);
      assertSpyCalls(d, 1);
    }
    { // run effect's first run immediately even inside a batch
      let a = 0;
      const b = spy();
      batch(() => (effect(b), a = b.calls.length));
      assertEquals(a, 1);
    }
  });
  await step("derive : solid-signals graph tests", () => {
    { // should drop X->B->X updates
      //     X
      //   / |
      //  A  | <- Looks like a flag doesn't it? :D
      //   \ |
      //     B
      //     |
      //     C
      const a = signal(2);
      const b = derive(() => a() - 1);
      const c = derive(() => a() + b());
      const d = spy(() => "c: " + c());
      const e = derive(d);
      assertEquals(e(), "c: 3");
      assertSpyCalls(d, 1);
      d.calls.length = 0;
      a(4);
      e();
      assertSpyCalls(d, 1);
    }
    { // should only update every signal once (diamond graph)
      // In this scenario "C" should only update once when "X" receive an update. This is sometimes
      // referred to as the "diamond" scenario.
      //     X
      //   /   \
      //  A     B
      //   \   /
      //     C
      const a = signal("a");
      const b = derive(() => a());
      const c = derive(() => a());
      const d = spy(() => b() + " " + c());
      const e = derive(d);
      assertEquals(e(), "a a");
      assertSpyCalls(d, 1);
      a("aa");
      assertEquals(e(), "aa aa");
      assertSpyCalls(d, 2);
    }
    { // should only update every signal once (diamond graph + tail)
      // "D" will be likely updated twice if our mark+sweep logic is buggy.
      //     X
      //   /   \
      //  A     B
      //   \   /
      //     C
      //     |
      //     D
      const a = signal("a");
      const b = derive(() => a());
      const c = derive(() => a());
      const d = derive(() => b() + " " + c());
      const e = spy(() => d());
      const f = derive(e);
      assertEquals(f(), "a a");
      assertSpyCalls(e, 1);
      a("aa");
      assertEquals(f(), "aa aa");
      assertSpyCalls(e, 2);
    }
    { // should bail out if result is the same
      // Bail out if value of "A" never changes
      // X->A->B
      const a = signal("a");
      const b = derive(() => {
        a();
        return "foo";
      });
      const c = spy(() => b());
      const d = derive(c);
      assertEquals(d(), "foo");
      assertSpyCalls(c, 1);
      a("aa");
      assertEquals(d(), "foo");
      assertSpyCalls(c, 1);
    }
    { // should only update every signal once (jagged diamond graph + tails)
      // "E" and "F" will be likely updated >3 if our mark+sweep logic is buggy.
      //     X
      //   /   \
      //  A     B
      //  |     |
      //  |     C
      //   \   /
      //     D
      //   /   \
      //  E     F
      const a = signal("a");
      const b = derive(() => a());
      const c = derive(() => a());
      const d = derive(() => c());
      const e = spy(() => b() + " " + d());
      const f = derive(e);
      const g = spy(() => f());
      const h = derive(g);
      const i = spy(() => f());
      const j = derive(i);
      assertEquals(h(), "a a");
      assertSpyCalls(g, 1);
      assertEquals(j(), "a a");
      assertSpyCalls(i, 1);
      a("b");
      assertEquals(f(), "b b");
      assertSpyCalls(e, 2);
      assertEquals(h(), "b b");
      assertSpyCalls(g, 2);
      assertEquals(j(), "b b");
      assertSpyCalls(i, 2);
      a("c");
      assertEquals(f(), "c c");
      assertSpyCalls(e, 3);
      assertEquals(h(), "c c");
      assertSpyCalls(g, 3);
      assertEquals(j(), "c c");
      assertSpyCalls(i, 3);
    }
    { // should ensure subs update even if one dep is static
      //     X
      //   /   \
      //  A     *B <- returns same value every time
      //   \   /
      //     C
      const a = signal("a");
      const b = derive(() => a());
      const c = derive(() => {
        a();
        return "c";
      });
      const d = spy(() => b() + " " + c());
      const e = derive(d);
      assertEquals(e(), "a c");
      a("aa");
      assertEquals(e(), "aa c");
      assertSpyCalls(d, 2);
    }
    { // should ensure subs update even if two deps mark it clean
      // In this scenario both "B" and "C" always return the same value. But "D" must still update
      // because "X" marked it. If "D" isn't updated, then we have a bug.
      //     X
      //   / | \
      //  A *B *C
      //   \ | /
      //     D
      const a = signal("a");
      const b = derive(() => a());
      const c = derive(() => {
        a();
        return "c";
      });
      const d = derive(() => {
        a();
        return "d";
      });
      const e = spy(() => b() + " " + c() + " " + d());
      const f = derive(e);
      assertEquals(f(), "a c d");
      a("aa");
      assertEquals(f(), "aa c d");
      assertSpyCalls(e, 2);
    }
    { // propagates in topological order
      //
      //     c1
      //    /  \
      //   /    \
      //  b1     b2
      //   \    /
      //    \  /
      //     a1
      //
      let a = "";
      const b = signal(false),
        c = derive(() => {
          b();
          a += "b1";
        }, { equals: false }),
        d = derive(() => {
          b();
          a += "b2";
        }, { equals: false }),
        e = derive(() => {
          c(), d();
          a += "c1";
        }, { equals: false });
      e();
      a = "";
      b(true);
      e();
      assertEquals(a, "b1b2c1");
    }
    { // only propagates once with linear convergences
      //         d
      //         |
      // +---+---+---+---+
      // v   v   v   v   v
      // f1  f2  f3  f4  f5
      // |   |   |   |   |
      // +---+---+---+---+
      //         v
      //         g
      const a = signal(0),
        b = derive(() => a()),
        c = derive(() => a()),
        d = derive(() => a()),
        e = derive(() => a()),
        f = derive(() => a());
      let g = 0;
      const h = derive(() => {
        g++;
        return b() + c() + d() + e() + f();
      });
      h();
      g = 0;
      a(1);
      h();
      assertEquals(g, 1);
    }
    { // only propagates once with exponential convergence
      //     d
      //     |
      // +---+---+
      // v   v   v
      // f1  f2 f3
      //   \ | /
      //     O
      //   / | \
      // v   v   v
      // g1  g2  g3
      // +---+---+
      //     v
      //     h
      const a = signal(0),
        b = derive(() => {
          return a();
        }),
        c = derive(() => {
          return a();
        }),
        d = derive(() => {
          return a();
        }),
        e = derive(() => {
          return b() + c() + d();
        }),
        f = derive(() => {
          return b() + c() + d();
        }),
        g = derive(() => {
          return b() + c() + d();
        });
      let h = 0;
      const i = derive(() => {
        h++;
        return e() + f() + g();
      });
      i();
      h = 0;
      a(1);
      i();
      assertEquals(h, 1);
    }
    { // does not trigger downstream computations unless changed
      const a = signal(1, { equals: false });
      let b = "";
      const c = derive(() => {
        b += "t1";
        return a();
      });
      const t2 = derive(() => {
        b += "c1";
        c();
      });
      t2();
      assertEquals(b, "c1t1");
      b = "";
      a(1);
      t2();
      assertEquals(b, "t1");
      b = "";
      a(2);
      t2();
      assertEquals(b, "t1c1");
    }
    { // applies updates to changed dependees in same order as derive
      const a = signal(0);
      let b = "";
      const c = derive(() => {
        b += "t1";
        return a() === 0;
      });
      const d = derive(() => {
        b += "c1";
        return a();
      });
      const e = derive(() => {
        b += "c2";
        return c();
      });
      d();
      e();
      assertEquals(b, "c1c2t1");
      b = "";
      a(1);
      d();
      e();
      assertEquals(b, "c1t1c2");
    }
    { // updates downstream pending computations
      const a = signal(0);
      const b = signal(0);
      let c = "";
      const d = derive(() => {
        c += "t1";
        return a() === 0;
      });
      const e = derive(() => {
        c += "c1";
        return a();
      });
      const f = derive(() => {
        c += "c2";
        d();
        return derive(() => {
          c += "c2_1";
          return b();
        });
      });
      c = "";
      a(1);
      e();
      f()();
      assertEquals(c, "c1c2t1c2_1");
    }
    { // with changing dependencies
      let a: Getter<boolean> & Setter<boolean>;
      let b: Getter<number> & Setter<number>;
      let c: Getter<number> & Setter<number>;
      let d: number;
      let e: Getter<number>;
      const init = () => {
        a = signal<boolean>(true);
        b = signal(1);
        c = signal(2);
        d = 0;
        e = derive(() => {
          d++;
          return a() ? b() : c();
        });
        e();
        d = 0;
      };
      { // updates on active dependencies
        init();
        b!(5);
        assertEquals(e!(), 5);
        assertEquals(d!, 1);
      }
      { // does not update on inactive dependencies
        init();
        c!(5);
        assertEquals(e!(), 1);
        assertEquals(d!, 0);
      }
      { // deactivates obsolete dependencies
        init();
        a!(false);
        e!();
        d = 0;
        b!(5);
        e!();
        assertEquals(d, 0);
      }
      { // activates new dependencies
        init();
        a!(false);
        d = 0;
        c!(5);
        e!();
        assertEquals(d, 1);
      }
      { // ensures that new dependencies are updated before dependee
        let a = "";
        const b = signal(0),
          c = derive(() => {
            a += "b";
            return b() + 1;
          }),
          d = derive(() => {
            a += "c";
            const check = c();
            if (check) {
              return check;
            }
            return f();
          }),
          e = derive(() => {
            return b();
          }),
          f = derive(() => {
            a += "d";
            return e() + 10;
          });
        d();
        f();
        assertEquals(a, "cbd");
        a = "";
        b(-1);
        d();
        f();
        assertEquals(a, "bcd");
        assertEquals(d(), 9);
        a = "";
        b(0);
        d();
        f();
        assertEquals(a, "bcd");
        assertEquals(d(), 1);
      }
      { // does not update subsequent pending computations after stale invocations
        const a = signal(1);
        const b = signal(false);
        let c = 0;
        /*
                  s1
                  |
              +---+---+
             t1 t2 c1 t3
              \       /
                 c3
           [PN,PN,STL,void]
      */
        const d = derive(() => a() > 0);
        const e = derive(() => a() > 0);
        const f = derive(() => a());
        const g = derive(() => {
          const h = a();
          const i = b();
          return h && i;
        });
        const h = derive(() => {
          d();
          e();
          f();
          g();
          c++;
        });
        h();
        b(true);
        h();
        assertEquals(c, 2);
        a(2);
        h();
        assertEquals(c, 3);
      }
    }
    { // correctly marks downstream computations as stale on change
      const a = signal(1);
      let b = "";
      const c = derive(() => {
        b += "t1";
        return a();
      });
      const d = derive(() => {
        b += "c1";
        return c();
      });
      const e = derive(() => {
        b += "c2";
        return d();
      });
      const f = derive(() => {
        b += "c3";
        return e();
      });
      f();
      b = "";
      a(2);
      f();
      assertEquals(b, "t1c1c2c3");
    }
  });
  await step("signal/derive : custom equality", () => {
    const a = signal([0], { equals: false });
    const b = derive(() => [a()[0] + 1], {
      equals: (prev, next) => prev?.[0] === next[0],
    });
    const c = derive(() => [b()[0] + 1], {
      equals: (prev, next) => prev?.length === next.length,
    });
    const d = derive(() => c()[0]);
    let e = 0, f = 0;
    effect(() => (a(), ++e));
    effect(() => (d(), ++f));
    assertEquals(c(), [2]), assertEquals(d(), 2);
    assertEquals(e, 1), assertEquals(f, 1);
    a(a());
    assertEquals(c(), [2]), assertEquals(d(), 2);
    assertEquals(e, 2), assertEquals(f, 1);
    a(([$]) => [$ + 1]);
    assertEquals(c(), [3]), assertEquals(d(), 2);
    assertEquals(e, 3), assertEquals(f, 1);
  });
  await step("effect : dispose when nested", () => {
    const a = signal(0);
    effect(() => {
      effect(() => {
        if (a() === 1) assert(0);
      })();
    });
    a(1);
  });
  await step("bundle : pure", async () => {
    assertEquals(await bundle(import.meta), "");
  });
});
