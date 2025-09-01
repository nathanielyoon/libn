import { assertEquals } from "@std/assert";
import { state } from "./mod.ts";

const sleep = ($: number) => new Promise((resolve) => setTimeout(resolve, $));
Deno.test("reactively tests", async ({ step }) => {
  await step("core", async ({ step }) => {
    await step("two signals", () => {
      const a = state(7), b = state(1);
      let c = 0;
      const d = state(() => (++c, a() * b()));
      a(2), assertEquals(d(), 2);
      b(3), assertEquals(d(), 6);
      assertEquals(c, 2), d(), assertEquals(c, 2);
    });
    await step("dependent computed", () => {
      const a = state(7), b = state(1);
      let c = 0;
      const d = state(() => (++c, a() * b()));
      let e = 0;
      const f = state(() => (++e, d() + 1));
      assertEquals(f(), 8), assertEquals(c, 1), assertEquals(e, 1);
      a(3), assertEquals(f(), 4), assertEquals(c, 2), assertEquals(e, 2);
    });
    await step("equality check", () => {
      let a = 0;
      const b = state(7), c = state(() => (++a, b() + 10));
      c(), c(), assertEquals(a, 1);
      b(7), assertEquals(a, 1);
    });
    await step("dynamic computed", () => {
      const a = state(1), b = state(2);
      let c = 0, d = 0, e = 0;
      const f = state(() => (++c, a()));
      const g = state(() => (++d, b()));
      const h = state(() => (++e, f() || g()));
      assertEquals(h(), 1), a(2), b(3), assertEquals(h(), 2);
      assertEquals(c, 2), assertEquals(d, 0), assertEquals(e, 2);
      a(0), assertEquals(h(), 3);
      assertEquals(c, 3), assertEquals(d, 1), assertEquals(e, 3);
      b(4), assertEquals(h(), 4);
      assertEquals(c, 3), assertEquals(d, 2), assertEquals(e, 4);
    });
    await step("boolean equality check", () => {
      const a = state(0), b = state(() => a() > 0);
      let c = 0;
      const d = state(() => (++c, b() ? 1 : 0));
      assertEquals(d(), 0), assertEquals(c, 1);
      a(1), assertEquals(d(), 1), assertEquals(c, 2);
      a(2), assertEquals(d(), 1), assertEquals(c, 2);
    });
    await step("diamond computeds", () => {
      const a = state(1);
      const b = state(a), c = state(() => b() * 2), d = state(() => b() * 3);
      let e = 0;
      const f = state(() => (++e, c() + d()));
      assertEquals(f(), 5), assertEquals(e, 1);
      a(2), assertEquals(f(), 10), assertEquals(e, 2);
      a(3), assertEquals(f(), 15), assertEquals(e, 3);
    });
    await step("set inside reaction", () => {
      const a = state(1), b = state(() => a(2)), c = state(() => a() + 100);
      b(), assertEquals(c(), 102);
    });
  });
  await step("async", async ({ step }) => {
    await step("async modify", async () => {
      const a = state(1), b = state(() => a() + 10);
      await sleep(10).then(() => a(2));
      assertEquals(b(), 12);
    });
    await step("async modify in reaction before await", async () => {
      const a = state(1), b = state(() => (a(2), sleep(10)));
      const c = state(() => a() + 100);
      await b(), assertEquals(c(), 102);
    });
    await step("async modify in reaction after await", async () => {
      const a = state(1), b = state(async () => (await sleep(10), a(2)));
      const c = state(() => a() + 100);
      await b(), assertEquals(c(), 102);
    });
  });
  await step("dynamic", async ({ step }) => {
    await step("dynamic sources recalculate correctly", () => {
      const a = state(false), b = state(2);
      let c = 0;
      const d = state(() => (++c, a() || b()));
      d(), assertEquals(c, 1);
      a(true), d(), assertEquals(c, 2);
      b(4), d(), assertEquals(c, 2);
    });
    await step("dynamic sources don't re-execute parent unnecessarily", () => {
      const a = state(2), b = state(() => a() + 1);
      let c = 0;
      const d = state(() => (++c, a() + 10));
      const e = state(() => {
        let f = b();
        if (f & 1) f += d();
        return f;
      });
      assertEquals(e(), 15), assertEquals(c, 1);
      a(3), assertEquals(e(), 4), assertEquals(c, 1);
    });
    await step("dynamic source disappears entirely", () => {
      const a = state(1);
      let b = false, c = 0;
      const d = state(() => {
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
    // Test with no assertions.
    0 && await step("small dynamic graph with signal grandparents", () => {
      const a = state(3), b = state(0), c = state(0);
      const d = state(() => {
        const e = c();
        a();
        if (!e) return b();
        else return e;
      });
      const e = state(() => {
        const f = d();
        a();
        if (!f) return b();
        else return f;
      });
      e(), b(1), e(), c(1), e();
    });
  });
  await step("reactively", async ({ step }) => {
    await step("setting a memo to a different memo", () => {
      const a = state(1), b = state(() => a() * 2), c = state(() => b());
      assertEquals(c(), 2);
      b(() => a() * 3), assertEquals(c(), 3);
    });
    await step("setting a memo to a signal", () => {
      const a = state(1), b = state(() => a() * 2), c = state(() => b());
      assertEquals(c(), 2);
      b(8), assertEquals(c(), 8), a(0), assertEquals(c(), 8);
    });
    await step("setting a signal to a memo", () => {
      const a = state(1), b = state(2), c = state(() => b());
      assertEquals(c(), 2);
      b(() => a() * 4), assertEquals(c(), 4), a(3), assertEquals(c(), 12);
    });
  });
});
