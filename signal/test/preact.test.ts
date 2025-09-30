import { assertEquals, assertLess, assertThrows, fail } from "@std/assert";
import { batch, derive, effect, signal } from "../src/system.ts";
import {
  assertSpyCall,
  assertSpyCalls,
  type Spy,
  spy,
} from "@std/testing/mock";

Deno.test("signal : preact signal", () => {
  { // should return value
    const v = [1, 2];
    const s = signal(v);
    assertEquals(s(), v);
  }
  { // should notify other listeners of changes after one listener is disposed
    const s = signal(0);
    const spy1 = spy(() => {
      s();
    });
    const spy2 = spy(() => {
      s();
    });
    const spy3 = spy(() => {
      s();
    });
    effect(spy1);
    const dispose = effect(spy2);
    effect(spy3);
    assertSpyCalls(spy1, 1);
    assertSpyCalls(spy2, 1);
    assertSpyCalls(spy3, 1);
    dispose();
    s(1);
    assertSpyCalls(spy1, 2);
    assertSpyCalls(spy2, 1);
    assertSpyCalls(spy3, 2);
  }
});
Deno.test("effect : preact effect", () => {
  { // should run the callback immediately
    const s = signal(123);
    const $spy = spy(() => {
      s();
    });
    effect($spy);
    assertSpyCalls($spy, 1);
  }
  { // should subscribe to signals
    const s = signal(123);
    const $spy = spy(() => {
      s();
    });
    effect($spy);
    $spy.calls.length = 0;
    s(42);
    assertSpyCalls($spy, 1);
  }
  { // should subscribe to multiple signals
    const a = signal("a");
    const b = signal("b");
    const $spy = spy(() => {
      a();
      b();
    });
    effect($spy);
    $spy.calls.length = 0;
    a("aa");
    b("bb");
    assertSpyCalls($spy, 2);
  }
  { // should dispose of subscriptions
    const a = signal("a");
    const b = signal("b");
    const $spy = spy(() => {
      a() + " " + b();
    });
    const dispose = effect($spy);
    $spy.calls.length = 0;
    dispose();
    assertSpyCalls($spy, 0);
    a("aa");
    b("bb");
    assertSpyCalls($spy, 0);
  }
  { // should dispose of subscriptions
    const a = signal("a");
    const b = signal("b");
    const $spy = spy(() => {
      a() + " " + b();
    });
    const dispose = effect(() => {
      $spy();
      if (a() === "aa") dispose();
    });
    assertSpyCalls($spy, 1);
    a("aa");
    assertSpyCalls($spy, 2);
    a("aaa");
    assertSpyCalls($spy, 2);
  }
  { // should dispose of subscriptions when called twice
    const a = signal("a");
    const b = signal("b");
    const $spy = spy(() => {
      a() + " " + b();
    });
    const dispose = effect(() => {
      $spy();
      if (a() === "aa") dispose();
    });
    assertSpyCalls($spy, 1);
    a("aa");
    assertSpyCalls($spy, 2);
    dispose();
    a("aaa");
    assertSpyCalls($spy, 2);
  }
  { // should unsubscribe from signal
    const s = signal(123);
    const $spy = spy(() => {
      s();
    });
    const unsub = effect($spy);
    $spy.calls.length = 0;
    unsub();
    s(42);
    assertSpyCalls($spy, 0);
  }
  { // should conditionally unsubscribe from signals
    const a = signal("a");
    const b = signal("b");
    const cond = signal(true);
    const $spy = spy(() => {
      cond() ? a() : b();
    });
    effect($spy);
    assertSpyCalls($spy, 1);
    b("bb");
    assertSpyCalls($spy, 1);
    cond(false);
    assertSpyCalls($spy, 2);
    $spy.calls.length = 0;
    a("aaa");
    assertSpyCalls($spy, 0);
  }
  { // should not recompute if the effect has been notified about changes, but no direct dependency has actually changed
    const s = signal(0);
    const c = derive(() => {
      s();
      return 0;
    });
    const $spy = spy(() => {
      c();
    });
    effect($spy);
    assertSpyCalls($spy, 1);
    $spy.calls.length = 0;
    s(1);
    assertSpyCalls($spy, 0);
  }
  { // should not recompute dependencies unnecessarily
    const $spy = spy();
    const a = signal(0);
    const b = signal(0);
    const c = derive(() => {
      b();
      $spy();
    });
    effect(() => {
      if (a() === 0) c();
    });
    assertSpyCalls($spy, 1);
    batch(() => {
      b(1);
      a(1);
    });
    assertSpyCalls($spy, 1);
  }
  { // should not recompute dependencies out of order
    const a = signal(1);
    const b = signal(1);
    const c = signal(1);
    const $spy = spy(() => c());
    const d = derive($spy);
    effect(() => {
      if (a() > 0) {
        b();
        d();
      } else b();
    });
    $spy.calls.length = 0;
    batch(() => {
      a(2);
      b(2);
      c(2);
    });
    assertSpyCalls($spy, 1);
    $spy.calls.length = 0;
    batch(() => {
      a(-1);
      b(-1);
      c(-1);
    });
    assertSpyCalls($spy, 0);
    $spy.calls.length = 0;
  }
  { // should recompute if a dependency changes during computation after becoming a dependency
    const a = signal(0);
    const $spy = spy(() => {
      if (a() === 0) a(($) => $ + 1);
    });
    effect($spy);
    assertSpyCalls($spy, 2);
  }
  { // should allow disposing the effect multiple times
    const dispose = effect(() => undefined);
    dispose();
    assertThrows(() => {
      try {
        dispose();
      } catch {
        return;
      }
      throw 0;
    });
  }
  { // should allow disposing a running effect
    const a = signal(0);
    const $spy = spy();
    const dispose = effect(() => {
      if (a() === 1) {
        dispose();
        $spy();
      }
    });
    assertSpyCalls($spy, 0);
    a(1);
    assertSpyCalls($spy, 1);
    a(2);
    assertSpyCalls($spy, 1);
  }
  { // should not run if it's first been triggered and then disposed in a batch
    const a = signal(0);
    const $spy = spy(() => {
      a();
    });
    const dispose = effect($spy);
    $spy.calls.length = 0;
    batch(() => {
      a(1);
      dispose();
    });
    assertSpyCalls($spy, 0);
  }
  { // should not run if it's been triggered, disposed and then triggered again in a batch
    const a = signal(0);
    const $spy = spy(() => {
      a();
    });
    const dispose = effect($spy);
    $spy.calls.length = 0;
    batch(() => {
      a(1);
      dispose();
      a(2);
    });
    assertSpyCalls($spy, 0);
  }
  { // should not rerun parent effect if a nested child effect's signal's value changes
    const parentSignal = signal(0);
    const childSignal = signal(0);
    const parentEffect = spy(() => {
      parentSignal();
    });
    const childEffect = spy(() => {
      childSignal();
    });
    effect(() => {
      parentEffect();
      effect(childEffect);
    });
    assertSpyCalls(parentEffect, 1);
    assertSpyCalls(childEffect, 1);
    childSignal(1);
    assertSpyCalls(parentEffect, 1);
    assertSpyCalls(childEffect, 2);
    parentSignal(1);
    assertSpyCalls(parentEffect, 2);
    assertSpyCalls(childEffect, 3);
  }
});
Deno.test("derive : preact computed", () => {
  { // should return value
    const a = signal("a");
    const b = signal("b");
    const c = derive(() => a() + b());
    assertEquals(c(), "ab");
  }
  { // should return updated value
    const a = signal("a");
    const b = signal("b");
    const c = derive(() => a() + b());
    assertEquals(c(), "ab");
    a("aa");
    assertEquals(c(), "aab");
  }
  { // should be lazily computed on demand
    const a = signal("a");
    const b = signal("b");
    const $spy = spy(() => a() + b());
    const c = derive($spy);
    assertSpyCalls($spy, 0);
    c();
    assertSpyCalls($spy, 1);
    a("x");
    b("y");
    assertSpyCalls($spy, 1);
    c();
    assertSpyCalls($spy, 2);
  }
  { // should be computed only when a dependency has changed at some point
    const a = signal("a");
    const $spy = spy(() => {
      return a();
    });
    const c = derive($spy);
    c();
    assertSpyCalls($spy, 1);
    a("a");
    c();
    assertSpyCalls($spy, 1);
  }
  { // should conditionally unsubscribe from signals
    const a = signal("a");
    const b = signal("b");
    const cond = signal(true);
    const $spy = spy(() => {
      return cond() ? a() : b();
    });
    const c = derive($spy);
    assertEquals(c(), "a");
    assertSpyCalls($spy, 1);
    b("bb");
    assertEquals(c(), "a");
    assertSpyCalls($spy, 1);
    cond(false);
    assertEquals(c(), "bb");
    assertSpyCalls($spy, 2);
    $spy.calls.length = 0;
    a("aaa");
    assertEquals(c(), "bb");
    assertSpyCalls($spy, 0);
  }
  { // should consider undefined value separate from uninitialized value
    const a = signal(0);
    const $spy = spy(() => undefined);
    const c = derive($spy);
    assertEquals(c(), undefined);
    a(1);
    assertEquals(c(), undefined);
    assertSpyCalls($spy, 1);
  }
  { // should not leak errors raised by dependencies
    const a = signal(0);
    const b = derive(() => {
      a();
      throw new Error("error");
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
  { // should propagate notifications even right after first subscription
    const a = signal(0);
    const b = derive(() => a());
    const c = derive(() => b());
    c();
    const $spy = spy(() => {
      c();
    });
    effect($spy);
    assertSpyCalls($spy, 1);
    $spy.calls.length = 0;
    a(1);
    assertSpyCalls($spy, 1);
  }
  { // should get marked as outdated right after first subscription
    const s = signal(0);
    const c = derive(() => s());
    c();
    s(1);
    effect(() => {
      c();
    });
    assertEquals(c(), 1);
  }
  { // should propagate notification to other listeners after one listener is disposed
    const s = signal(0);
    const c = derive(() => s());
    const spy1 = spy(() => {
      c();
    });
    const spy2 = spy(() => {
      c();
    });
    const spy3 = spy(() => {
      c();
    });
    effect(spy1);
    const dispose = effect(spy2);
    effect(spy3);
    assertSpyCalls(spy1, 1);
    assertSpyCalls(spy2, 1);
    assertSpyCalls(spy3, 1);
    dispose();
    s(1);
    assertSpyCalls(spy1, 2);
    assertSpyCalls(spy2, 1);
    assertSpyCalls(spy3, 2);
  }
  { // should not recompute dependencies out of order
    const a = signal(1);
    const b = signal(1);
    const c = signal(1);
    const $spy = spy(() => c());
    const d = derive($spy);
    const e = derive(() => {
      if (a() > 0) {
        b();
        d();
      } else {
        b();
      }
    });
    e();
    $spy.calls.length = 0;
    a(2);
    b(2);
    c(2);
    e();
    assertSpyCalls($spy, 1);
    $spy.calls.length = 0;
    a(-1);
    b(-1);
    c(-1);
    e();
    assertSpyCalls($spy, 0);
    $spy.calls.length = 0;
  }
  { // should not recompute dependencies unnecessarily
    const $spy = spy();
    const a = signal(0);
    const b = signal(0);
    const c = derive(() => {
      b();
      $spy();
    });
    const d = derive(() => {
      if (a() === 0) {
        c();
      }
    });
    d();
    assertSpyCalls($spy, 1);
    batch(() => {
      b(1);
      a(1);
    });
    d();
    assertSpyCalls($spy, 1);
  }
  { // should run computeds once for multiple dep changes
    const a = signal("a");
    const b = signal("b");
    const compute = spy(() => {
      return a() + b();
    });
    const c = derive(compute);
    assertEquals(c(), "ab");
    assertSpyCalls(compute, 1);
    compute.calls.length = 0;
    a("aa");
    b("bb");
    c();
    assertSpyCalls(compute, 1);
  }
  { // should drop A->B->A updates
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
    const compute = spy(() => "d: " + c());
    const d = derive(compute);
    // Trigger read
    assertEquals(d(), "d: 3");
    assertSpyCalls(compute, 1);
    compute.calls.length = 0;
    a(4);
    d();
    assertSpyCalls(compute, 1);
  }
  { // should only update every signal once (diamond graph)
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
    const $spy = spy(() => b() + " " + c());
    const d = derive($spy);
    assertEquals(d(), "a a");
    assertSpyCalls($spy, 1);
    a("aa");
    assertEquals(d(), "aa aa");
    assertSpyCalls($spy, 2);
  }
  { // should only update every signal once (diamond graph + tail)
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
    const $spy = spy(() => d());
    const e = derive($spy);
    assertEquals(e(), "a a");
    assertSpyCalls($spy, 1);
    a("aa");
    assertEquals(e(), "aa aa");
    assertSpyCalls($spy, 2);
  }
  { // should bail out if result is the same
    // Bail out if value of "B" never changes
    // A->B->C
    const a = signal("a");
    const b = derive(() => {
      a();
      return "foo";
    });
    const $spy = spy(() => b());
    const c = derive($spy);
    assertEquals(c(), "foo");
    assertSpyCalls($spy, 1);
    a("aa");
    assertEquals(c(), "foo");
    assertSpyCalls($spy, 1);
  }
  { // should only update every signal once (jagged diamond graph + tails)
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
    const order: Spy[] = [];
    const eSpy: Spy<any, [], string> = spy(
      () => (order.push(eSpy), b() + " " + d()),
    );
    const e = derive(eSpy);
    const fSpy: Spy<any, [], string> = spy(() => (order.push(fSpy), e()));
    const f = derive(fSpy);
    const gSpy: Spy<any, [], string> = spy(() => (order.push(gSpy), e()));
    const g = derive(gSpy);
    assertEquals(f(), "a a");
    assertSpyCalls(fSpy, 1);
    assertEquals(g(), "a a");
    assertSpyCalls(gSpy, 1);
    order.length = 0;
    eSpy.calls.length = 0;
    fSpy.calls.length = 0;
    gSpy.calls.length = 0;
    a("b");
    assertEquals(e(), "b b");
    assertSpyCalls(eSpy, 1);
    assertEquals(f(), "b b");
    assertSpyCalls(fSpy, 1);
    assertEquals(g(), "b b");
    assertSpyCalls(gSpy, 1);
    order.length = 0;
    eSpy.calls.length = 0;
    fSpy.calls.length = 0;
    gSpy.calls.length = 0;
    a("c");
    assertEquals(e(), "c c");
    assertSpyCalls(eSpy, 1);
    assertEquals(f(), "c c");
    assertSpyCalls(fSpy, 1);
    assertEquals(g(), "c c");
    assertSpyCalls(gSpy, 1);
    // top to bottom
    assertLess(order.indexOf(eSpy), order.indexOf(fSpy));
    // left to right
    assertLess(order.indexOf(fSpy), order.indexOf(gSpy));
  }
  { // should only subscribe to signals listened to
    //    *A
    //   /   \
    // *B     C <- we don't listen to C
    const a = signal("a");
    const b = derive(() => a());
    const $spy = spy(() => a());
    derive($spy);
    assertEquals(b(), "a");
    assertSpyCalls($spy, 0);
    a("aa");
    assertEquals(b(), "aa");
    assertSpyCalls($spy, 0);
  }
  { // should only subscribe to signals listened to
    // Here both "B" and "C" are active in the beginning, but
    // "B" becomes inactive later. At that point it should
    // not receive any updates anymore.
    //    *A
    //   /   \
    // *B     D <- we don't listen to C
    //  |
    // *C
    const a = signal("a");
    const spyB = spy(() => a());
    const b = derive(spyB);
    const spyC = spy(() => b());
    const c = derive(spyC);
    const d = derive(() => a());
    let result = "";
    const unsub = effect(() => {
      result = c();
    });
    assertEquals(result, "a");
    assertEquals(d(), "a");
    spyB.calls.length = 0;
    spyC.calls.length = 0;
    unsub();
    a("aa");
    assertSpyCalls(spyB, 0);
    assertSpyCalls(spyC, 0);
    assertEquals(d(), "aa");
  }
  { // should ensure subs update even if one dep unmarks it
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
    const c = derive(() => {
      a();
      return "c";
    });
    const $spy = spy(() => b() + " " + c());
    const d = derive($spy);
    assertEquals(d(), "a c");
    $spy.calls.length = 0;
    a("aa");
    d();
    assertSpyCall($spy, 0, { returned: "aa c" });
  }
  { // should ensure subs update even if two deps unmark it
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
    const c = derive(() => {
      a();
      return "c";
    });
    const d = derive(() => {
      a();
      return "d";
    });
    const $spy = spy(() => b() + " " + c() + " " + d());
    const e = derive($spy);
    assertEquals(e(), "a c d");
    $spy.calls.length = 0;
    a("aa");
    e();
    assertSpyCall($spy, 0, { returned: "aa c d" });
  }
  // { // should throw when writing to computeds
  //   const a = signal("a");
  //   const b = derive(() => a());
  //   const fn = () => ((b as Signal).value = "aa");
  //   assertThrows(fn);
  // }
  { // should keep graph consistent on errors during activation
    const a = signal(0);
    const b = derive(() => {
      throw new Error("fail");
    });
    const c = derive(() => a());
    assertThrows(() => b());
    a(1);
    assertEquals(c(), 1);
  }
  { // should keep graph consistent on errors in computeds
    const a = signal(0);
    const b = derive(() => {
      if (a() === 1) throw new Error("fail");
      return a();
    });
    const c = derive(() => b());
    assertEquals(c(), 0);
    a(1);
    assertThrows(() => b());
    a(2);
    assertEquals(c(), 2);
  }
  { // should support lazy branches
    const a = signal(0);
    const b = derive(() => a());
    const c = derive(() => (a() > 0 ? a() : b()));
    assertEquals(c(), 0);
    a(1);
    assertEquals(c(), 1);
    a(0);
    assertEquals(c(), 0);
  }
  { // should not update a sub if all deps unmark it
    // In this scenario "B" and "C" always return the same value. When "A"
    // changes, "D" should not update.
    //     A
    //   /   \
    // *B     *C
    //   \   /
    //     D
    const a = signal("a");
    const b = derive(() => {
      a();
      return "b";
    });
    const c = derive(() => {
      a();
      return "c";
    });
    const $spy = spy(() => b() + " " + c());
    const d = derive($spy);
    assertEquals(d(), "b c");
    $spy.calls.length = 0;
    a("aa");
    assertSpyCalls($spy, 0);
  }
});
Deno.test("batch : preact batch/transaction", () => {
  { // should return the value from the callback
    assertEquals(batch(() => 1), 1);
  }
  { // should throw errors thrown from the callback
    assertThrows(() =>
      batch(() => {
        throw Error("hello");
      })
    );
  }
  { // should throw non-errors thrown from the callback
    try {
      batch(() => {
        throw undefined;
      });
      fail();
    } catch (err) {
      assertEquals(err, undefined);
    }
  }
  { // should delay writes
    const a = signal("a");
    const b = signal("b");
    const $spy = spy(() => {
      a() + " " + b();
    });
    effect($spy);
    $spy.calls.length = 0;
    batch(() => {
      a("aa");
      b("bb");
    });
    assertSpyCalls($spy, 1);
  }
  { // should delay writes until outermost batch is complete
    const a = signal("a");
    const b = signal("b");
    const $spy = spy(() => {
      a() + ", " + b();
    });
    effect($spy);
    $spy.calls.length = 0;
    batch(() => {
      batch(() => {
        a(($) => $ + " inner");
        b(($) => $ + " inner");
      });
      a(($) => $ + " outer");
      b(($) => $ + " outer");
    });
    // If the inner batch() would have flushed the update
    // this $spy would've been called twice.
    assertSpyCalls($spy, 1);
  }
  { // should read signals written to
    const a = signal("a");
    let result = "";
    batch(() => {
      a("aa");
      result = a();
    });
    assertEquals(result, "aa");
  }
  { // should read computed signals with updated source signals
    // A->B->C->D->E
    const a = signal("a");
    const b = derive(() => a());
    const spyC = spy(() => b());
    const c = derive(spyC);
    const spyD = spy(() => c());
    const d = derive(spyD);
    const spyE = spy(() => d());
    const e = derive(spyE);
    spyC.calls.length = 0;
    spyD.calls.length = 0;
    spyE.calls.length = 0;
    let result = "";
    batch(() => {
      a("aa");
      result = c();
      // Since "D" isn't accessed during batching, we should not
      // update it, only after batching has completed
      assertSpyCalls(spyD, 0);
    });
    assertEquals(result, "aa");
    assertEquals(d(), "aa");
    assertEquals(e(), "aa");
    assertSpyCalls(spyC, 1);
    assertSpyCalls(spyD, 1);
    assertSpyCalls(spyE, 1);
  }
  { // should not block writes after batching completed
    // If no further writes after batch() are possible, than we
    // didn't restore state properly. Most likely "pending" still
    // holds elements that are already processed.
    const a = signal("a");
    const b = signal("b");
    const c = signal("c");
    const d = derive(() => a() + " " + b() + " " + c());
    let result;
    effect(() => {
      result = d();
    });
    batch(() => {
      a("aa");
      b("bb");
    });
    c("cc");
    assertEquals(result, "aa bb cc");
  }
  { // should not lead to stale signals with .value in batch
    const invokes: number[][] = [];
    const counter = signal(0);
    const double = derive(() => counter() * 2);
    const triple = derive(() => counter() * 3);
    effect(() => {
      invokes.push([double(), triple()]);
    });
    assertEquals(invokes, [[0, 0]]);
    batch(() => {
      counter(1);
      assertEquals(double(), 2);
    });
    assertEquals(invokes[1], [2, 3]);
  }
  { // should run pending effects even if the callback throws
    const a = signal(0);
    const b = signal(1);
    const spy1 = spy(() => {
      a();
    });
    const spy2 = spy(() => {
      b();
    });
    effect(spy1);
    effect(spy2);
    spy1.calls.length = 0;
    spy2.calls.length = 0;
    assertThrows(() =>
      batch(() => {
        a(($) => $ + 1);
        b(($) => $ + 1);
        throw Error("hello");
      })
    );
    assertSpyCalls(spy1, 1);
    assertSpyCalls(spy2, 1);
  }
  { // should run effect's first run immediately even inside a batch
    let callCount = 0;
    const $spy = spy();
    batch(() => {
      effect($spy);
      callCount = $spy.calls.length;
    });
    assertEquals(callCount, 1);
  }
});
