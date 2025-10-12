import { expect } from "@std/expect/expect";
import {
  assertSpyCall,
  assertSpyCalls,
  type Spy,
  spy,
} from "@std/testing/mock";
import {
  activate,
  batch,
  derive,
  effect,
  type Getter,
  scoper,
  type Setter,
  signal,
} from "@libn/signal/system";
import { fail } from "@std/assert/fail";

Deno.test("spec", async (t) => {
  await t.step("alien-signals computed", () => {
    { // should correctly propagate changes through derive signals
      const src = signal(0);
      const c1 = derive(() => src() % 2);
      const c2 = derive(() => c1());
      const c3 = derive(() => c2());
      c3();
      src(1); // c1 -> dirty, c2 -> toCheckDirty, c3 -> toCheckDirty
      c2(); // c1 -> none, c2 -> none
      src(3); // c1 -> dirty, c2 -> toCheckDirty
      expect(c3()).toStrictEqual(1);
    }
    { // should propagate updated source value through chained computations
      const src = signal(0);
      const a = derive(() => src());
      const b = derive(() => a() % 2);
      const c = derive(() => src());
      const d = derive(() => b() + c());
      expect(d()).toStrictEqual(0);
      src(2);
      expect(d()).toStrictEqual(2);
    }
    { // should handle flags are indirectly updated during checkDirty
      const a = signal(false);
      const b = derive(() => a());
      const c = derive(() => {
        b();
        return 0;
      });
      const d = derive(() => {
        c();
        return b();
      });
      expect(d()).toStrictEqual(false);
      a(true);
      expect(d()).toStrictEqual(true);
    }
    { // should not update if the signal value is reverted
      let times = 0;
      const src = signal(0);
      const c1 = derive(() => {
        times++;
        return src();
      });
      c1();
      expect(times).toStrictEqual(1);
      src(1);
      src(0);
      c1();
      expect(times).toStrictEqual(1);
    }
  });
  await t.step("alien-signals effect", () => {
    { // should clear subscriptions when untracked by all subscribers
      let bRunTimes = 0;
      const a = signal(1);
      const b = derive(() => {
        bRunTimes++;
        return a() * 2;
      });
      const stopEffect = effect(() => {
        b();
      });
      expect(bRunTimes).toStrictEqual(1);
      a(2);
      expect(bRunTimes).toStrictEqual(2);
      stopEffect();
      a(3);
      expect(bRunTimes).toStrictEqual(2);
    }
    { // should not run untracked inner effect
      const a = signal(3);
      const b = derive(() => a() > 0);
      effect(() => {
        if (b()) {
          effect(() => {
            if (a() === 0) throw new Error("bad");
          });
        }
      });
      a(2);
      a(1);
      a(0);
    }
    { // should run outer effect first
      const a = signal(1);
      const b = signal(1);
      effect(() => {
        if (a()) {
          effect(() => {
            b();
            if (a() === 0) throw new Error("bad");
          });
        }
      });
      batch(() => {
        b(0);
        a(0);
      });
    }
    { // should not trigger inner effect when resolve maybe dirty
      const a = signal(0);
      const b = derive(() => a() % 2);
      let innerTriggerTimes = 0;
      effect(() => {
        effect(() => {
          b();
          innerTriggerTimes++;
          if (innerTriggerTimes >= 2) throw new Error("bad");
        });
      });
      a(2);
    }
    { // should trigger inner effects in sequence
      const a = signal(0);
      const b = signal(0);
      const c = derive(() => a() - b());
      const order: string[] = [];
      effect(() => {
        c();
        effect(() => {
          order.push("first inner");
          a();
        });
        effect(() => {
          order.push("last inner");
          a();
          b();
        });
      });
      order.length = 0;
      batch(() => {
        b(1);
        a(1);
      });
      expect(order).toStrictEqual(["first inner", "last inner"]);
    }
    { // should trigger inner effects in sequence in effect scope
      const a = signal(0);
      const b = signal(0);
      const order: string[] = [];
      scoper(() => {
        effect(() => {
          order.push("first inner");
          a();
        });
        effect(() => {
          order.push("last inner");
          a();
          b();
        });
      });
      order.length = 0;
      batch(() => {
        b(1);
        a(1);
      });
      expect(order).toStrictEqual(["first inner", "last inner"]);
    }
    { // should custom effect support batch
      const batchEffect = (fn: () => void) => effect(() => batch(fn));
      const logs: string[] = [];
      const a = signal(0);
      const b = signal(0);
      const aa = derive(() => {
        logs.push("aa-0");
        if (!a()) b(1);
        logs.push("aa-1");
      });
      const bb = derive(() => {
        logs.push("bb");
        return b();
      });
      batchEffect(() => {
        bb();
      });
      batchEffect(() => {
        aa();
      });
      expect(logs).toStrictEqual(["bb", "aa-0", "aa-1", "bb"]);
    }
    { // should duplicate subscribers do not affect the notify order
      const src1 = signal(0);
      const src2 = signal(0);
      const order: string[] = [];
      effect(() => {
        order.push("a");
        const currentSub = activate(null);
        const isOne = src2() === 1;
        activate(currentSub);
        if (isOne) src1();
        src2();
        src1();
      });
      effect(() => {
        order.push("b");
        src1();
      });
      src2(1); // src1.subs: a -> b -> a
      order.length = 0;
      src1(src1() + 1);
      expect(order).toStrictEqual(["a", "b"]);
    }
    { // should handle side effect with inner effects
      const a = signal(0);
      const b = signal(0);
      const order: string[] = [];
      effect(() => {
        effect(() => {
          a();
          order.push("a");
        });
        effect(() => {
          b();
          order.push("b");
        });
        expect(order).toStrictEqual(["a", "b"]);
        order.length = 0;
        b(1);
        a(1);
        expect(order).toStrictEqual(["b", "a"]);
      });
    }
    { // should handle flags are indirectly updated during checkDirty
      const a = signal(false);
      const b = derive(() => a());
      const c = derive(() => {
        b();
        return 0;
      });
      const d = derive(() => {
        c();
        return b();
      });
      let triggers = 0;
      effect(() => {
        d();
        triggers++;
      });
      expect(triggers).toStrictEqual(1);
      a(true);
      expect(triggers).toStrictEqual(2);
    }
  });
  await t.step("alien-signals effectScope", () => {
    { // should not trigger after stop
      const count = signal(1);
      let triggers = 0;
      const stopScope = scoper(() => {
        effect(() => {
          triggers++;
          count();
        });
        expect(triggers).toStrictEqual(1);
        count(2);
        expect(triggers).toStrictEqual(2);
      });
      count(3);
      expect(triggers).toStrictEqual(3);
      stopScope();
      count(4);
      expect(triggers).toStrictEqual(3);
    }
    { // should dispose inner effects if created in an effect
      const source = signal(1);
      let triggers = 0;
      effect(() => {
        const dispose = scoper(() => {
          effect(() => {
            source();
            triggers++;
          });
        });
        expect(triggers).toStrictEqual(1);
        source(2);
        expect(triggers).toStrictEqual(2);
        dispose();
        source(3);
        expect(triggers).toStrictEqual(2);
      });
    }
    { // should track signal updates in an inner scope when accessed by an outer effect
      const source = signal(1);
      let triggers = 0;
      effect(() => {
        scoper(() => {
          source();
        });
        triggers++;
      });
      expect(triggers).toStrictEqual(1);
      source(2);
      expect(triggers).toStrictEqual(2);
    }
  });
  await t.step("alien-signals issue_48", () => {
    const source = signal(0);
    let disposeInner: () => void;
    reaction(
      () => source(),
      (val) => {
        if (val === 1) {
          disposeInner = reaction(
            () => source(),
            () => {},
          );
        } else if (val === 2) {
          disposeInner!();
        }
      },
    );
    source(1);
    source(2);
    source(3);
    interface ReactionOptions<T = unknown, F extends boolean = boolean> {
      fireImmediately?: F;
      equals?: F extends true ? (a: T, b: T | undefined) => boolean
        : (a: T, b: T) => boolean;
      onError?: (error: unknown) => void;
      scheduler?: (fn: () => void) => void;
      once?: boolean;
    }
    function reaction<T>(
      dataFn: () => T,
      effectFn: (newValue: T, oldValue: T | undefined) => void,
      options: ReactionOptions<T> = {},
    ): () => void {
      const {
        scheduler = (fn) => fn(),
        equals = Object.is,
        onError,
        once = false,
        fireImmediately = false,
      } = options;
      let prevValue: T | undefined;
      let version = 0;
      const tracked = derive(() => {
        try {
          return dataFn();
        } catch (error) {
          untracked(() => onError?.(error));
          return prevValue!;
        }
      });
      const dispose = effect(() => {
        const current = tracked();
        if (!fireImmediately && !version) {
          prevValue = current;
        }
        version++;
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
      return dispose;
    }
    function untracked<T>(callback: () => T): T {
      const currentSub = activate(null);
      try {
        return callback();
      } finally {
        activate(currentSub);
      }
    }
  });
  await t.step("alien-signals untrack", () => {
    { // should pause tracking in derive
      const src = signal(0);
      let deriveTriggerTimes = 0;
      const c = derive(() => {
        deriveTriggerTimes++;
        const currentSub = activate(null);
        const value = src();
        activate(currentSub);
        return value;
      });
      expect(c()).toStrictEqual(0);
      expect(deriveTriggerTimes).toStrictEqual(1);
      src(1), src(2), src(3);
      expect(c()).toStrictEqual(0);
      expect(deriveTriggerTimes).toStrictEqual(1);
    }
    { // should pause tracking in effect
      const src = signal(0);
      const is = signal(0);
      let effectTriggerTimes = 0;
      effect(() => {
        effectTriggerTimes++;
        if (is()) {
          const currentSub = activate(null);
          src();
          activate(currentSub);
        }
      });
      expect(effectTriggerTimes).toStrictEqual(1);
      is(1);
      expect(effectTriggerTimes).toStrictEqual(2);
      src(1), src(2), src(3);
      expect(effectTriggerTimes).toStrictEqual(2);
      is(2);
      expect(effectTriggerTimes).toStrictEqual(3);
      src(4), src(5), src(6);
      expect(effectTriggerTimes).toStrictEqual(3);
      is(0);
      expect(effectTriggerTimes).toStrictEqual(4);
      src(7), src(8), src(9);
      expect(effectTriggerTimes).toStrictEqual(4);
    }
    { // should pause tracking in effect scope
      const src = signal(0);
      let effectTriggerTimes = 0;
      scoper(() => {
        effect(() => {
          effectTriggerTimes++;
          const currentSub = activate(null);
          src();
          activate(currentSub);
        });
      });
      expect(effectTriggerTimes).toStrictEqual(1);
      src(1), src(2), src(3);
      expect(effectTriggerTimes).toStrictEqual(1);
    }
  });
  await t.step("preact signal", () => {
    { // should return value
      const v = [1, 2];
      const s = signal(v);
      expect(s()).toStrictEqual(v);
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
  await t.step("preact effect", () => {
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
      expect(() => dispose()).not.toThrow();
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
  await t.step("preact computed", () => {
    { // should return value
      const a = signal("a");
      const b = signal("b");
      const c = derive(() => a() + b());
      expect(c()).toStrictEqual("ab");
    }
    { // should return updated value
      const a = signal("a");
      const b = signal("b");
      const c = derive(() => a() + b());
      expect(c()).toStrictEqual("ab");
      a("aa");
      expect(c()).toStrictEqual("aab");
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
      expect(c()).toStrictEqual("a");
      assertSpyCalls($spy, 1);
      b("bb");
      expect(c()).toStrictEqual("a");
      assertSpyCalls($spy, 1);
      cond(false);
      expect(c()).toStrictEqual("bb");
      assertSpyCalls($spy, 2);
      $spy.calls.length = 0;
      a("aaa");
      expect(c()).toStrictEqual("bb");
      assertSpyCalls($spy, 0);
    }
    { // should consider undefined value separate from uninitialized value
      const a = signal(0);
      const $spy = spy(() => undefined);
      const c = derive($spy);
      expect(c()).toStrictEqual(undefined);
      a(1);
      expect(c()).toStrictEqual(undefined);
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
      expect(c()).toStrictEqual("ok");
      a(1);
      expect(c()).toStrictEqual("ok");
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
      expect(c()).toStrictEqual(1);
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
      expect(c()).toStrictEqual("ab");
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
      expect(d()).toStrictEqual("d: 3");
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
      expect(d()).toStrictEqual("a a");
      assertSpyCalls($spy, 1);
      a("aa");
      expect(d()).toStrictEqual("aa aa");
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
      expect(e()).toStrictEqual("a a");
      assertSpyCalls($spy, 1);
      a("aa");
      expect(e()).toStrictEqual("aa aa");
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
      expect(c()).toStrictEqual("foo");
      assertSpyCalls($spy, 1);
      a("aa");
      expect(c()).toStrictEqual("foo");
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
      expect(f()).toStrictEqual("a a");
      assertSpyCalls(fSpy, 1);
      expect(g()).toStrictEqual("a a");
      assertSpyCalls(gSpy, 1);
      order.length = 0;
      eSpy.calls.length = 0;
      fSpy.calls.length = 0;
      gSpy.calls.length = 0;
      a("b");
      expect(e()).toStrictEqual("b b");
      assertSpyCalls(eSpy, 1);
      expect(f()).toStrictEqual("b b");
      assertSpyCalls(fSpy, 1);
      expect(g()).toStrictEqual("b b");
      assertSpyCalls(gSpy, 1);
      order.length = 0;
      eSpy.calls.length = 0;
      fSpy.calls.length = 0;
      gSpy.calls.length = 0;
      a("c");
      expect(e()).toStrictEqual("c c");
      assertSpyCalls(eSpy, 1);
      expect(f()).toStrictEqual("c c");
      assertSpyCalls(fSpy, 1);
      expect(g()).toStrictEqual("c c");
      assertSpyCalls(gSpy, 1);
      // top to bottom
      expect(order.indexOf(eSpy)).toBeLessThan(order.indexOf(fSpy));
      // left to right
      expect(order.indexOf(fSpy)).toBeLessThan(order.indexOf(gSpy));
    }
    { // should only subscribe to signals listened to
      //    *A
      //   /   \
      // *B     C <- we don't listen to C
      const a = signal("a");
      const b = derive(() => a());
      const $spy = spy(() => a());
      derive($spy);
      expect(b()).toStrictEqual("a");
      assertSpyCalls($spy, 0);
      a("aa");
      expect(b()).toStrictEqual("aa");
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
      expect(result).toStrictEqual("a");
      expect(d()).toStrictEqual("a");
      spyB.calls.length = 0;
      spyC.calls.length = 0;
      unsub();
      a("aa");
      assertSpyCalls(spyB, 0);
      assertSpyCalls(spyC, 0);
      expect(d()).toStrictEqual("aa");
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
      expect(d()).toStrictEqual("a c");
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
      expect(e()).toStrictEqual("a c d");
      $spy.calls.length = 0;
      a("aa");
      e();
      assertSpyCall($spy, 0, { returned: "aa c d" });
    }
    // { // should throw when writing to computeds
    //   const a = signal("a");
    //   const b = derive(() => a());
    //   const fn = () => ((b as Signal).value = "aa");
    //   expect(fn).toThrow();
    // }
    { // should keep graph consistent on errors during activation
      const a = signal(0);
      const b = derive(() => {
        throw new Error("fail");
      });
      const c = derive(() => a());
      expect(() => b()).toThrow("fail");
      a(1);
      expect(c()).toStrictEqual(1);
    }
    { // should keep graph consistent on errors in computeds
      const a = signal(0);
      const b = derive(() => {
        if (a() === 1) throw new Error("fail");
        return a();
      });
      const c = derive(() => b());
      expect(c()).toStrictEqual(0);
      a(1);
      expect(() => b()).toThrow("fail");
      a(2);
      expect(c()).toStrictEqual(2);
    }
    { // should support lazy branches
      const a = signal(0);
      const b = derive(() => a());
      const c = derive(() => (a() > 0 ? a() : b()));
      expect(c()).toStrictEqual(0);
      a(1);
      expect(c()).toStrictEqual(1);
      a(0);
      expect(c()).toStrictEqual(0);
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
      expect(d()).toStrictEqual("b c");
      $spy.calls.length = 0;
      a("aa");
      assertSpyCalls($spy, 0);
    }
  });
  await t.step("preact batch/transaction", () => {
    { // should return the value from the callback
      expect(batch(() => 1)).toStrictEqual(1);
    }
    { // should throw errors thrown from the callback
      expect(() =>
        batch(() => {
          throw Error("hello");
        })
      ).toThrow("hello");
    }
    { // should throw non-errors thrown from the callback
      try {
        batch(() => {
          throw undefined;
        });
        fail();
      } catch (err) {
        expect(err).toStrictEqual(undefined);
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
      expect(result).toStrictEqual("aa");
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
      expect(result).toStrictEqual("aa");
      expect(d()).toStrictEqual("aa");
      expect(e()).toStrictEqual("aa");
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
      expect(result).toStrictEqual("aa bb cc");
    }
    { // should not lead to stale signals with .value in batch
      const invokes: number[][] = [];
      const counter = signal(0);
      const double = derive(() => counter() * 2);
      const triple = derive(() => counter() * 3);
      effect(() => {
        invokes.push([double(), triple()]);
      });
      expect(invokes).toStrictEqual([[0, 0]]);
      batch(() => {
        counter(1);
        expect(double()).toStrictEqual(2);
      });
      expect(invokes[1]).toStrictEqual([2, 3]);
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
      expect(() =>
        batch(() => {
          a(($) => $ + 1);
          b(($) => $ + 1);
          throw Error("hello");
        })
      ).toThrow("hello");
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
      expect(callCount).toStrictEqual(1);
    }
  });
  await t.step("reactively async", async () => {
    { // async modify
      const a = signal(1);
      const b = derive(() => a() + 10);
      await new Promise(($) => setTimeout($, 10)).then(() => a(2));
      expect(b()).toStrictEqual(12);
    }
    { // async modify in reaction before await
      const s = signal(1);
      const a = derive(async () => {
        s(2);
        await new Promise(($) => setTimeout($, 10));
      });
      const l = derive(() => s() + 100);
      a();
      expect(l()).toStrictEqual(102);
    }
    { // async modify in reaction after await
      const s = signal(1);
      const a = derive(async () => {
        await new Promise(($) => setTimeout($, 10));
        s(2);
      });
      const l = derive(() => s() + 100);
      await a();
      expect(l()).toStrictEqual(102);
    }
  });
  await t.step("reactively core", () => {
    { // two signals
      //  a  b
      //  | /
      //  c
      const a = signal(7);
      const b = signal(1);
      let callCount = 0;
      const c = derive(() => {
        callCount++;
        return a() * b();
      });
      a(2);
      expect(c()).toStrictEqual(2);
      b(3);
      expect(c()).toStrictEqual(6);
      expect(callCount).toStrictEqual(2);
      c();
      expect(callCount).toStrictEqual(2);
    }
    { // dependent computed
      //  a  b
      //  | /
      //  c
      //  |
      //  d
      const a = signal(7);
      const b = signal(1);
      let callCount1 = 0;
      const c = derive(() => {
        callCount1++;
        return a() * b();
      });
      let callCount2 = 0;
      const d = derive(() => {
        callCount2++;
        return c() + 1;
      });
      expect(d()).toStrictEqual(8);
      expect(callCount1).toStrictEqual(1);
      expect(callCount2).toStrictEqual(1);
      a(3);
      expect(d()).toStrictEqual(4);
      expect(callCount1).toStrictEqual(2);
      expect(callCount2).toStrictEqual(2);
    }
    { // equality check
      //  a
      //  |
      //  c
      let callCount = 0;
      const a = signal(7);
      const c = derive(() => {
        callCount++;
        return a() + 10;
      });
      c();
      c();
      expect(callCount).toStrictEqual(1);
      a(7);
      expect(callCount).toStrictEqual(1); // unchanged, equality check
    }
    { // dynamic computed
      //  a     b
      //  |     |
      //  cA   cB
      //  |   / (dynamically depends on cB)
      //  cAB
      const a = signal(1);
      const b = signal(2);
      let callCountA = 0;
      let callCountB = 0;
      let callCountAB = 0;
      const cA = derive(() => {
        callCountA++;
        return a();
      });
      const cB = derive(() => {
        callCountB++;
        return b();
      });
      const cAB = derive(() => {
        callCountAB++;
        return cA() || cB();
      });
      expect(cAB()).toStrictEqual(1);
      a(2);
      b(3);
      expect(cAB()).toStrictEqual(2);
      expect(callCountA).toStrictEqual(2);
      expect(callCountAB).toStrictEqual(2);
      expect(callCountB).toStrictEqual(0);
      a(0);
      expect(cAB()).toStrictEqual(3);
      expect(callCountA).toStrictEqual(3);
      expect(callCountAB).toStrictEqual(3);
      expect(callCountB).toStrictEqual(1);
      b(4);
      expect(cAB()).toStrictEqual(4);
      expect(callCountA).toStrictEqual(3);
      expect(callCountAB).toStrictEqual(4);
      expect(callCountB).toStrictEqual(2);
    }
    { // boolean equality check
      //   a
      //   |
      //   b (=)
      //   |
      //   c
      const a = signal(0);
      const b = derive(() => a() > 0);
      let callCount = 0;
      const c = derive(() => {
        callCount++;
        return b() ? 1 : 0;
      });
      expect(c()).toStrictEqual(0);
      expect(callCount).toStrictEqual(1);
      a(1);
      expect(c()).toStrictEqual(1);
      expect(callCount).toStrictEqual(2);
      a(2);
      expect(c()).toStrictEqual(1);
      expect(callCount).toStrictEqual(2); // unchanged, oughtn't run because bool didn't change
    }
    { // diamond computeds
      //  s
      //  |
      //  a
      //  | \
      //  b  c
      //   \ |
      //     d
      const s = signal(1);
      const a = derive(() => s());
      const b = derive(() => a() * 2);
      const c = derive(() => a() * 3);
      let callCount = 0;
      const d = derive(() => {
        callCount++;
        return b() + c();
      });
      expect(d()).toStrictEqual(5);
      expect(callCount).toStrictEqual(1);
      s(2);
      expect(d()).toStrictEqual(10);
      expect(callCount).toStrictEqual(2);
      s(3);
      expect(d()).toStrictEqual(15);
      expect(callCount).toStrictEqual(3);
    }
    { // set inside reaction
      //  s
      //  |
      //  l  a (sets s)
      const s = signal(1);
      const a = derive(() => s(2));
      const l = derive(() => s() + 100);
      a();
      expect(l()).toStrictEqual(102);
    }
  });
  await t.step("reactively dynamic", () => {
    { // dynamic sources recalculate correctly
      //  a  b          a
      //  | /     or    |
      //  c             c
      const a = signal(false);
      const b = signal(2);
      let count = 0;
      const c = derive(() => {
        count++;
        a() || b();
      });
      c();
      expect(count).toStrictEqual(1);
      a(true);
      c();
      expect(count).toStrictEqual(2);
      b(4);
      c();
      expect(count).toStrictEqual(2);
    }
    { // dynamic sources don't re-execute a parent unnecessarily
      // dependency is dynamic: sometimes l depends on b, sometimes not.
      //    s          s
      //   / \        / \
      //  a   b  or  a   b
      //   \ /        \
      //    l          l
      const s = signal(2);
      const a = derive(() => s() + 1);
      let bCount = 0;
      const b = derive(() => {
        // b depends on s, so b's always dirty when s changes, but b may be unneeded.
        bCount++;
        return s() + 10;
      });
      const l = derive(() => {
        let result = a();
        if (result & 0x1) {
          result += b(); // only execute b if a is odd
        }
        return result;
      });
      expect(l()).toStrictEqual(15);
      expect(bCount).toStrictEqual(1);
      s(3);
      expect(l()).toStrictEqual(4);
      expect(bCount).toStrictEqual(1);
    }
    { // dynamic source disappears entirely
      //  s
      //  |
      //  l
      const s = signal(1);
      let done = false;
      let count = 0;
      const c = derive(() => {
        count++;
        if (done) {
          return 0;
        } else {
          const value = s();
          if (value > 2) {
            done = true; // break the link between s and c
          }
          return value;
        }
      });
      expect(c()).toStrictEqual(1);
      expect(count).toStrictEqual(1);
      s(3);
      expect(c()).toStrictEqual(3);
      expect(count).toStrictEqual(2);
      s(1); // we've now locked into 'done' state
      expect(c()).toStrictEqual(0);
      expect(count).toStrictEqual(3);
      // we're still locked into 'done' state, and count no longer advances
      // in fact, c() will never execute again..
      s(0);
      expect(c()).toStrictEqual(0);
      expect(count).toStrictEqual(3);
    }
    { // small dynamic graph with signal grandparents
      const z = signal(3);
      const x = signal(0);
      const y = signal(0);
      const i = derive(() => {
        const a = y();
        z();
        if (!a) {
          return x();
        } else {
          return a;
        }
      });
      const j = derive(() => {
        const a = i();
        z();
        if (!a) {
          return x();
        } else {
          return a;
        }
      });
      j();
      x(1);
      j();
      y(1);
      j();
    }
  });
  await t.step("solidjs graph", () => {
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
      let seq = "";
      const a1 = signal(false);
      const b1 = derive(() => {
        a1();
        seq += "b1";
      }, { is: () => false });
      const b2 = derive(() => {
        a1();
        seq += "b2";
      }, { is: () => false });
      const c1 = derive(() => {
        b1(), b2();
        seq += "c1";
      }, { is: () => false });
      c1();
      seq = "";
      a1(true);
      c1();
      expect(seq).toStrictEqual("b1b2c1");
    }
    { // only propagates once with linear convergences
      //          d
      //          |
      //  +---+---+---+---+
      //  v   v   v   v   v
      //  f1  f2  f3  f4  f5
      //  |   |   |   |   |
      //  +---+---+---+---+
      //          v
      //          g
      const d = signal(0);
      const f1 = derive(() => d());
      const f2 = derive(() => d());
      const f3 = derive(() => d());
      const f4 = derive(() => d());
      const f5 = derive(() => d());
      let gcount = 0;
      const g = derive(() => {
        gcount++;
        return f1() + f2() + f3() + f4() + f5();
      });
      g();
      gcount = 0;
      d(1);
      g();
      expect(gcount).toStrictEqual(1);
    }
    { // only propagates once with exponential convergence
      //      d
      //      |
      //  +---+---+
      //  v   v   v
      //  f1  f2 f3
      //    \ | /
      //      O
      //    / | \
      //  v   v   v
      //  g1  g2  g3
      //  +---+---+
      //      v
      //      h
      const d = signal(0),
        f1 = derive(() => {
          return d();
        }),
        f2 = derive(() => {
          return d();
        }),
        f3 = derive(() => {
          return d();
        }),
        g1 = derive(() => {
          return f1() + f2() + f3();
        }),
        g2 = derive(() => {
          return f1() + f2() + f3();
        }),
        g3 = derive(() => {
          return f1() + f2() + f3();
        });
      let hcount = 0;
      const h = derive(() => {
        hcount++;
        return g1() + g2() + g3();
      });
      h();
      hcount = 0;
      d(1);
      h();
      expect(hcount).toStrictEqual(1);
    }
    { // does not trigger downstream computations unless changed
      const s1 = signal(1, { is: () => false });
      let order = "";
      const t1 = derive(() => {
        order += "t1";
        return s1();
      });
      const t2 = derive(() => {
        order += "c1";
        t1();
      });
      t2();
      expect(order).toStrictEqual("c1t1");
      order = "";
      s1(1);
      t2();
      expect(order).toStrictEqual("t1");
      order = "";
      s1(2);
      t2();
      expect(order).toStrictEqual("t1c1");
    }
    { // applies updates to changed dependees in same order as derive
      const s1 = signal(0);
      let order = "";
      const t1 = derive(() => {
        order += "t1";
        return s1() === 0;
      });
      const t2 = derive(() => {
        order += "c1";
        return s1();
      });
      const t3 = derive(() => {
        order += "c2";
        return t1();
      });
      t2();
      t3();
      expect(order).toStrictEqual("c1c2t1");
      order = "";
      s1(1);
      t2();
      t3();
      expect(order).toStrictEqual("c1t1c2");
    }
    { // updates downstream pending computations
      const s1 = signal(0);
      const s2 = signal(0);
      let order = "";
      const t1 = derive(() => {
        order += "t1";
        return s1() === 0;
      });
      const t2 = derive(() => {
        order += "c1";
        return s1();
      });
      const t3 = derive(() => {
        order += "c2";
        t1();
        return derive(() => {
          order += "c2_1";
          return s2();
        });
      });
      order = "";
      s1(1);
      t2();
      t3()();
      expect(order).toStrictEqual("c1c2t1c2_1");
    }
    { // with changing dependencies
      let i: Getter<boolean> & Setter<boolean>;
      let t: Getter<number> & Setter<number>;
      let e: Getter<number> & Setter<number>;
      let fevals: number;
      let f: () => number;
      const init = () => {
        i = signal<boolean>(true);
        t = signal(1);
        e = signal(2);
        fevals = 0;
        f = derive(() => {
          fevals++;
          return i() ? t() : e();
        });
        f();
        fevals = 0;
      };
      { // updates on active dependencies
        init();
        t!(5);
        expect(f!()).toStrictEqual(5);
        expect(fevals!).toStrictEqual(1);
      }
      { // does not update on inactive dependencies
        init();
        e!(5);
        expect(f!()).toStrictEqual(1);
        expect(fevals!).toStrictEqual(0);
      }
      { // deactivates obsolete dependencies
        init();
        i!(false);
        f!();
        fevals = 0;
        t!(5);
        f!();
        expect(fevals).toStrictEqual(0);
      }
      { // activates new dependencies
        init();
        i!(false);
        fevals = 0;
        e!(5);
        f!();
        expect(fevals).toStrictEqual(1);
      }
      { // ensures that new dependencies are updated before dependee
        let order = "";
        const a = signal(0);
        const b = derive(() => {
          order += "b";
          return a() + 1;
        });
        const c = derive(() => {
          order += "c";
          const check = b();
          if (check) {
            return check;
          }
          return e();
        });
        const d = derive(() => {
          return a();
        });
        const e = derive(() => {
          order += "d";
          return d() + 10;
        });
        c();
        e();
        expect(order).toStrictEqual("cbd");
        order = "";
        a(-1);
        c();
        e();
        expect(order).toStrictEqual("bcd");
        expect(c()).toStrictEqual(9);
        order = "";
        a(0);
        c();
        e();
        expect(order).toStrictEqual("bcd");
        expect(c()).toStrictEqual(1);
      }
    }
    { // does not update subsequent pending computations after stale invocations
      //         s1
      //         |
      //     +---+---+
      //    t1 t2 c1 t3
      //     \       /
      //        c3
      //  [PN,PN,STL,void]
      const s1 = signal(1);
      const s2 = signal(false);
      let count = 0;
      const t1 = derive(() => s1() > 0);
      const t2 = derive(() => s1() > 0);
      const c1 = derive(() => s1());
      const t3 = derive(() => {
        const a = s1();
        const b = s2();
        return a && b;
      });
      const c3 = derive(() => {
        t1();
        t2();
        c1();
        t3();
        count++;
      });
      c3();
      s2(true);
      c3();
      expect(count).toStrictEqual(2);
      s1(2);
      c3();
      expect(count).toStrictEqual(3);
    }
    { // correctly marks downstream computations as stale on change
      const s1 = signal(1);
      let order = "";
      const t1 = derive(() => {
        order += "t1";
        return s1();
      });
      const c1 = derive(() => {
        order += "c1";
        return t1();
      });
      const c2 = derive(() => {
        order += "c2";
        return c1();
      });
      const c3 = derive(() => {
        order += "c3";
        return c2();
      });
      c3();
      order = "";
      s1(2);
      c3();
      expect(order).toStrictEqual("t1c1c2c3");
    }
  });
});
Deno.test("signal() supports custom equality", () => {
  const never = signal([0], { is: () => false });
  let count1 = 0;
  effect(() => (never(), ++count1));
  never(never()), never([0]), never([]);
  expect(count1).toStrictEqual(4);
  const index = signal([0], { is: (prev, next) => prev[0] === next[0] });
  let count2 = 0;
  effect(() => (index(), ++count2));
  index(index()), index([0]), index([]);
  expect(count2).toStrictEqual(2);
});
Deno.test("derive() supports custom equality", () => {
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
  expect(sized()).toStrictEqual([2]);
  expect(value()).toStrictEqual(2);
  expect(sets).toStrictEqual(1);
  expect(gets).toStrictEqual(1);
  never(never());
  expect(sized()).toStrictEqual([2]);
  expect(value()).toStrictEqual(2);
  expect(sets).toStrictEqual(2);
  expect(gets).toStrictEqual(1);
  never(([$]) => [$ + 1]);
  expect(sized()).toStrictEqual([3]);
  expect(value()).toStrictEqual(2);
  expect(sets).toStrictEqual(3);
  expect(gets).toStrictEqual(1);
});
Deno.test("effect() disposes when nested", () => {
  const outer = signal(0);
  effect(() => effect(() => expect(outer()).not.toStrictEqual(1))());
  outer(1);
});
Deno.test("derive() catches inner recursion", () => {
  const inner = signal(0);
  const outer = derive(() => inner(inner() + 1));
  expect(outer()).toStrictEqual(1);
  inner(1);
  expect(outer()).toStrictEqual(2);
});
Deno.test("derive() catches outer recursion", () => {
  let monotonic = 0;
  const one = signal(0);
  const two = signal(0);
  const both = derive(() => (two(), one(++monotonic)));
  const just = derive(() => (one(), one(++monotonic)));
  effect(() => (both(), just()));
  const each = derive(() => (both(), two(++monotonic)));
  const over = derive(() => (each(), two(++monotonic)));
  effect(() => (each(), over()));
  expect(over()).toStrictEqual(9);
  one(100);
  expect(over()).toStrictEqual(9);
});
Deno.test("derive() breaks invalid links", () => {
  const set = signal(0);
  const get = derive(() => (set(0), set()));
  expect(get()).toStrictEqual(0);
  set(1);
  expect(get()).toStrictEqual(0);
});
Deno.test("derive() throws in certain circular cases", () => {
  expect(() => {
    let monotonic = 0;
    const one = signal(++monotonic);
    const two = signal(++monotonic);
    const oneTwo = derive(() => (one(), two(++monotonic)));
    const twoOne = derive(() => (two(), one(++monotonic)));
    effect(() => oneTwo());
    effect(() => twoOne());
    effect(() => (oneTwo(), twoOne()));
  }).toThrow();
  expect(() => {
    const one = signal(0);
    const two = signal(0);
    const read = derive(() => one(one() + two()));
    effect(() => (one(), two(), read()));
    two(1);
  }).toThrow();
});
