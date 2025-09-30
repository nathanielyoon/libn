import { assertEquals } from "@std/assert";
import { derive, type Getter, type Setter, signal } from "../src/system.ts";

Deno.test("derive : solidjs graph.test.ts", () => {
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
    }, { is: false });
    const b2 = derive(() => {
      a1();
      seq += "b2";
    }, { is: false });
    const c1 = derive(() => {
      b1(), b2();
      seq += "c1";
    }, { is: false });
    c1();
    seq = "";
    a1(true);
    c1();
    assertEquals(seq, "b1b2c1");
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
    assertEquals(gcount, 1);
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
    assertEquals(hcount, 1);
  }
  { // does not trigger downstream computations unless changed
    const s1 = signal(1, { is: false });
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
    assertEquals(order, "c1t1");
    order = "";
    s1(1);
    t2();
    assertEquals(order, "t1");
    order = "";
    s1(2);
    t2();
    assertEquals(order, "t1c1");
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
    assertEquals(order, "c1c2t1");
    order = "";
    s1(1);
    t2();
    t3();
    assertEquals(order, "c1t1c2");
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
    assertEquals(order, "c1c2t1c2_1");
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
      assertEquals(f!(), 5);
      assertEquals(fevals!, 1);
    }
    { // does not update on inactive dependencies
      init();
      e!(5);
      assertEquals(f!(), 1);
      assertEquals(fevals!, 0);
    }
    { // deactivates obsolete dependencies
      init();
      i!(false);
      f!();
      fevals = 0;
      t!(5);
      f!();
      assertEquals(fevals, 0);
    }
    { // activates new dependencies
      init();
      i!(false);
      fevals = 0;
      e!(5);
      f!();
      assertEquals(fevals, 1);
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
      assertEquals(order, "cbd");
      order = "";
      a(-1);
      c();
      e();
      assertEquals(order, "bcd");
      assertEquals(c(), 9);
      order = "";
      a(0);
      c();
      e();
      assertEquals(order, "bcd");
      assertEquals(c(), 1);
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
    assertEquals(count, 2);
    s1(2);
    c3();
    assertEquals(count, 3);
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
    assertEquals(order, "t1c1c2c3");
  }
});
