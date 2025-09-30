import { assertEquals } from "@std/assert";
import { derive, signal } from "../src/system.ts";

Deno.test("derive : reactively async.test.ts", async () => {
  { // async modify
    const a = signal(1);
    const b = derive(() => a() + 10);
    await new Promise(($) => setTimeout($, 10)).then(() => a(2));
    assertEquals(b(), 12);
  }
  { // async modify in reaction before await
    const s = signal(1);
    const a = derive(async () => {
      s(2);
      await new Promise(($) => setTimeout($, 10));
    });
    const l = derive(() => s() + 100);

    a();
    assertEquals(l(), 102);
  }
  { // async modify in reaction after await
    const s = signal(1);
    const a = derive(async () => {
      await new Promise(($) => setTimeout($, 10));
      s(2);
    });
    const l = derive(() => s() + 100);
    await a();
    assertEquals(l(), 102);
  }
});
Deno.test("derive : reactively core.test.ts", () => {
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
    assertEquals(c(), 2);
    b(3);
    assertEquals(c(), 6);
    assertEquals(callCount, 2);
    c();
    assertEquals(callCount, 2);
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
    assertEquals(d(), 8);
    assertEquals(callCount1, 1);
    assertEquals(callCount2, 1);
    a(3);
    assertEquals(d(), 4);
    assertEquals(callCount1, 2);
    assertEquals(callCount2, 2);
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
    assertEquals(callCount, 1);
    a(7);
    assertEquals(callCount, 1); // unchanged, equality check
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
    assertEquals(cAB(), 1);
    a(2);
    b(3);
    assertEquals(cAB(), 2);
    assertEquals(callCountA, 2);
    assertEquals(callCountAB, 2);
    assertEquals(callCountB, 0);
    a(0);
    assertEquals(cAB(), 3);
    assertEquals(callCountA, 3);
    assertEquals(callCountAB, 3);
    assertEquals(callCountB, 1);
    b(4);
    assertEquals(cAB(), 4);
    assertEquals(callCountA, 3);
    assertEquals(callCountAB, 4);
    assertEquals(callCountB, 2);
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
    assertEquals(c(), 0);
    assertEquals(callCount, 1);
    a(1);
    assertEquals(c(), 1);
    assertEquals(callCount, 2);
    a(2);
    assertEquals(c(), 1);
    assertEquals(callCount, 2); // unchanged, oughtn't run because bool didn't change
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
    assertEquals(d(), 5);
    assertEquals(callCount, 1);
    s(2);
    assertEquals(d(), 10);
    assertEquals(callCount, 2);
    s(3);
    assertEquals(d(), 15);
    assertEquals(callCount, 3);
  }
  { // set inside reaction
    //  s
    //  |
    //  l  a (sets s)
    const s = signal(1);
    const a = derive(() => s(2));
    const l = derive(() => s() + 100);
    a();
    assertEquals(l(), 102);
  }
});
Deno.test("derive : reactively dynamic.test.ts", () => {
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
    assertEquals(count, 1);
    a(true);
    c();
    assertEquals(count, 2);
    b(4);
    c();
    assertEquals(count, 2);
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
    assertEquals(l(), 15);
    assertEquals(bCount, 1);
    s(3);
    assertEquals(l(), 4);
    assertEquals(bCount, 1);
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
    assertEquals(c(), 1);
    assertEquals(count, 1);
    s(3);
    assertEquals(c(), 3);
    assertEquals(count, 2);
    s(1); // we've now locked into 'done' state
    assertEquals(c(), 0);
    assertEquals(count, 3);
    // we're still locked into 'done' state, and count no longer advances
    // in fact, c() will never execute again..
    s(0);
    assertEquals(c(), 0);
    assertEquals(count, 3);
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
