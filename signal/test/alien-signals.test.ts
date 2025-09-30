import { assertEquals } from "@std/assert";
import {
  batch,
  derive,
  effect,
  scoper,
  set_active,
  signal,
} from "../src/system.ts";

Deno.test("derive :: alien-signals computed", () => {
  { // should correctly propagate changes through derive signals
    const src = signal(0);
    const c1 = derive(() => src() % 2);
    const c2 = derive(() => c1());
    const c3 = derive(() => c2());
    c3();
    src(1); // c1 -> dirty, c2 -> toCheckDirty, c3 -> toCheckDirty
    c2(); // c1 -> none, c2 -> none
    src(3); // c1 -> dirty, c2 -> toCheckDirty
    assertEquals(c3(), 1);
  }
  { // should propagate updated source value through chained computations
    const src = signal(0);
    const a = derive(() => src());
    const b = derive(() => a() % 2);
    const c = derive(() => src());
    const d = derive(() => b() + c());
    assertEquals(d(), 0);
    src(2);
    assertEquals(d(), 2);
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
    assertEquals(d(), false);
    a(true);
    assertEquals(d(), true);
  }
  { // should not update if the signal value is reverted
    let times = 0;
    const src = signal(0);
    const c1 = derive(() => {
      times++;
      return src();
    });
    c1();
    assertEquals(times, 1);
    src(1);
    src(0);
    c1();
    assertEquals(times, 1);
  }
});
Deno.test("effect :: alien-signals effect", () => {
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
    assertEquals(bRunTimes, 1);
    a(2);
    assertEquals(bRunTimes, 2);
    stopEffect();
    a(3);
    assertEquals(bRunTimes, 2);
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
    assertEquals(order, ["first inner", "last inner"]);
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
    assertEquals(order, ["first inner", "last inner"]);
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
    assertEquals(logs, ["bb", "aa-0", "aa-1", "bb"]);
  }
  { // should duplicate subscribers do not affect the notify order
    const src1 = signal(0);
    const src2 = signal(0);
    const order: string[] = [];
    effect(() => {
      order.push("a");
      const currentSub = set_active(null);
      const isOne = src2() === 1;
      set_active(currentSub);
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
    assertEquals(order, ["a", "b"]);
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
      assertEquals(order, ["a", "b"]);
      order.length = 0;
      b(1);
      a(1);
      assertEquals(order, ["b", "a"]);
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
    assertEquals(triggers, 1);
    a(true);
    assertEquals(triggers, 2);
  }
});
Deno.test("scoper :: alien-signals effectScope", () => {
  { // should not trigger after stop
    const count = signal(1);
    let triggers = 0;
    const stopScope = scoper(() => {
      effect(() => {
        triggers++;
        count();
      });
      assertEquals(triggers, 1);
      count(2);
      assertEquals(triggers, 2);
    });
    count(3);
    assertEquals(triggers, 3);
    stopScope();
    count(4);
    assertEquals(triggers, 3);
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
      assertEquals(triggers, 1);
      source(2);
      assertEquals(triggers, 2);
      dispose();
      source(3);
      assertEquals(triggers, 2);
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
    assertEquals(triggers, 1);
    source(2);
    assertEquals(triggers, 2);
  }
});
Deno.test("derive : alien-signals issue_48.spec.ts", () => {
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
    const currentSub = set_active(null);
    try {
      return callback();
    } finally {
      set_active(currentSub);
    }
  }
});
Deno.test("derive/effect/scoper : alien-signals untrack.spec.ts", () => {
  { // should pause tracking in derive
    const src = signal(0);
    let deriveTriggerTimes = 0;
    const c = derive(() => {
      deriveTriggerTimes++;
      const currentSub = set_active(null);
      const value = src();
      set_active(currentSub);
      return value;
    });
    assertEquals(c(), 0);
    assertEquals(deriveTriggerTimes, 1);
    src(1), src(2), src(3);
    assertEquals(c(), 0);
    assertEquals(deriveTriggerTimes, 1);
  }
  { // should pause tracking in effect
    const src = signal(0);
    const is = signal(0);
    let effectTriggerTimes = 0;
    effect(() => {
      effectTriggerTimes++;
      if (is()) {
        const currentSub = set_active(null);
        src();
        set_active(currentSub);
      }
    });
    assertEquals(effectTriggerTimes, 1);
    is(1);
    assertEquals(effectTriggerTimes, 2);
    src(1), src(2), src(3);
    assertEquals(effectTriggerTimes, 2);
    is(2);
    assertEquals(effectTriggerTimes, 3);
    src(4), src(5), src(6);
    assertEquals(effectTriggerTimes, 3);
    is(0);
    assertEquals(effectTriggerTimes, 4);
    src(7), src(8), src(9);
    assertEquals(effectTriggerTimes, 4);
  }
  { // should pause tracking in effect scope
    const src = signal(0);
    let effectTriggerTimes = 0;
    scoper(() => {
      effect(() => {
        effectTriggerTimes++;
        const currentSub = set_active(null);
        src();
        set_active(currentSub);
      });
    });
    assertEquals(effectTriggerTimes, 1);
    src(1), src(2), src(3);
    assertEquals(effectTriggerTimes, 1);
  }
});
