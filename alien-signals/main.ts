/**
 * Reactive data.
 *
 * @example
 * ```ts
 * import * as $ from "@nyoon/lib/alien-signals";
 * import { assertEquals } from "jsr:@std/assert@^1.0.14";
 *
 * const counter = $.signal(0);
 * const doubled = $.signal(() => counter() * 2);
 * const dispose = $.effect(() => assertEquals(doubled(), counter() * 2));
 * counter(1);
 * counter((old) => old + 1);
 * ```
 *
 * @see <https://github.com/stackblitz/alien-signals>
 */

const enum Flag {
  MAYBE = 1 << 0,
  WATCH = 1 << 1,
  CHECK = 1 << 2,
  RECUR = 1 << 3,
  DIRTY = 1 << 4,
  READY = 1 << 5,
  QUEUE = 1 << 6,
  CLEAR = Flag.MAYBE | Flag.DIRTY,
}
const enum Kind {
  SIGNAL,
  CACHED,
  EFFECT,
}
type Link = {
  version: number;
  dep_prev: Link | undefined;
  dep: Node;
  dep_next: Link | undefined;
  sub_prev: Link | undefined;
  sub: Node;
  sub_next: Link | undefined;
};
type Noder<A extends Kind> =
  & { kind: A; flags: Flag }
  & { [_ in "head" | "deps" | "subs" | "tail"]: Link | undefined };
type Signal<A = any> = Noder<Kind.SIGNAL> & { old: A; has: A };
type Derive<A = any> = Noder<Kind.CACHED> & { has?: A; get: (old?: A) => A };
type Effect = Noder<Kind.EFFECT> & { run: () => void };
type Node = Signal | Derive | Effect;
const queue: Node[] = [];
let version = 0, notify = 0, length = 0, active: Node | undefined;
/** Manually sets the current subscriber (exported for testing). */
export const set = (sub?: Node): Node | undefined =>
  ([active, sub] = [sub, active])[1];
const enlink = (dep: Node) => {
  if (!active) return;
  const a = active.head;
  if (a?.dep === dep) return;
  const b = a ? a.dep_next : active.deps;
  if (b?.dep === dep) return b.version = version, active.head = b;
  const c = dep.tail;
  if (c?.version === version && c.sub === active) return;
  const d = active.head = dep.tail = {
    version,
    dep_prev: a,
    dep,
    dep_next: b,
    sub_prev: c,
    sub: active,
    sub_next: undefined,
  };
  if (b) b.dep_prev = d;
  a ? a.dep_next = d : active.deps = d, c ? c.sub_next = d : dep.subs = d;
};
const delink = (link: Link, sub: Node) => {
  const a = link.dep_prev, b = link.dep, c = link.dep_next, d = link.sub_prev;
  c ? c.dep_prev = a : sub.head = a, a ? a.dep_next = c : sub.deps = c;
  let e = link.sub_next;
  if (e ? e.sub_prev = d : b.tail = d) d!.sub_next = e;
  else if (!(b.subs = e) && b.deps) {
    for (b.flags = Flag.CLEAR, e = b.deps; e = delink(e, b););
  }
  return c;
};
const track = (sub: Node) => {
  ++version, sub.head = undefined, sub.flags = sub.flags & ~56 | Flag.CHECK; // 56 = RECUR | DIRTY | READY
};
const close = (sub: Node) => {
  for (let a = sub.head ? sub.head.dep_next : sub.deps; a; a = delink(a, sub));
  sub.flags &= ~Flag.CHECK;
};
const reset = ($: Node) =>
  $.kind === Kind.SIGNAL && ($.flags = Flag.MAYBE, $.old !== ($.old = $.has));
const reget = ($: Node) => {
  if ($.kind !== Kind.CACHED) return false;
  const a = set($);
  try {
    return track($), $.has !== ($.has = $.get($.has));
  } finally {
    set(a), close($);
  }
};
const rerun = ($: Node): Node | number => ($.flags & Flag.QUEUE ||
  ($.flags |= Flag.QUEUE, $.subs ? rerun($.subs.sub) : queue[length++] = $));
const ok = (link: Link, sub: Node) => {
  for (let a = sub.head; a; a = a.dep_prev) if (a === link) return true;
};
const deep = ($: Link) => {
  top: for (let a, b = $.sub_next, c, d;;) {
    if (c = $.sub, d = c.flags, !(d & 60)) c.flags |= Flag.READY; // 60 = CHECK | RECUR | DIRTY | READY
    else if (!(d & 12)) d = 0; // 12 = CHECK | RECUR
    else if (!(d & Flag.CHECK)) c.flags = d & ~Flag.RECUR | Flag.READY;
    else if (d & 48 || !ok($, c)) d = 0; // 48 = DIRTY | READY
    else c.flags |= 40, d &= Flag.MAYBE; // 40 = RECUR | READY
    if (d & Flag.WATCH && rerun(c), d & Flag.MAYBE) {
      c.subs && ($ = c.subs).sub_next && (a = [a, b], b = $.sub_next);
    } else if (!b) {
      while (a) {
        if (([a, $] = a)[1]) {
          b = $.sub_next;
          continue top;
        }
      }
      break;
    } else $ = b, b = $.sub_next;
  }
};
const flat = (link: Link) => {
  do (link.sub.flags & 48) === Flag.READY && // 48 = READY | DIRTY
    (link.sub.flags |= Flag.DIRTY) & Flag.WATCH &&
    rerun(link.sub); while (link = link.sub_next!);
};
const check = ($: Link, sub: Node) => {
  top: for (let a, b = 0, c, d;;) {
    if (c = false, d = $.dep, sub.flags & Flag.DIRTY) c = true;
    else if ((d.flags & Flag.CLEAR) === Flag.CLEAR) {
      if (reset(d) || reget(d)) c = true, d.subs!.sub_next && flat(d.subs!);
    } else if ((d.flags & 33) === 33) { // 33 = MAYBE | READY
      ($.sub_next || $.sub_prev) && (a = [a, $]), ++b, sub = d, $ = d.deps!;
      continue;
    }
    if (c || !$.dep_next) {
      while (b--) {
        (d = sub.subs!).sub_next ? [a, $] = a : $ = d;
        if (!c) sub.flags &= ~Flag.READY;
        else if (reset(sub) || reget(sub)) d.sub_next && flat(d), sub = $.sub;
        else if (sub = $.sub, $.dep_next) {
          $ = $.dep_next;
          continue top;
        } else c = false;
      }
      return c;
    } else $ = $.dep_next;
  }
};
const run = ($: Node, flags: Flag) => {
  if (flags & Flag.DIRTY || flags & Flag.READY && check($.deps!, $)) {
    const a = set($);
    try {
      track($), ($ as Effect).run();
    } finally {
      set(a), close($);
    }
    return;
  } else if (flags & Flag.READY) $.flags = flags & ~Flag.READY;
  for (let a = $.deps; a; a = a.dep_next) {
    a.dep.flags & Flag.QUEUE && run(a.dep, a.dep.flags &= ~Flag.QUEUE);
  }
};
/** Creates a reactive value. */
export const signal = ((initial: any, maybe_initial?: any) => {
  if (typeof initial !== "function") {
    const a: Signal = {
      kind: Kind.SIGNAL,
      flags: Flag.MAYBE,
      head: undefined,
      deps: undefined,
      subs: undefined,
      tail: undefined,
      old: initial,
      has: initial,
    };
    return (...$: [unknown]) => {
      if (!$.length) {
        a.flags & Flag.DIRTY && reset(a) && a.subs && flat(a.subs), enlink(a);
      } else if (
        a.has !== (a.has = typeof $[0] === "function" ? $[0](a.has) : $[0]) &&
        (a.flags = Flag.CLEAR, a.subs)
      ) {
        for (deep(a.subs); notify < length; ++notify) {
          run(queue[notify], queue[notify].flags &= ~Flag.QUEUE);
        }
        queue.length = notify = length = 0;
      }
      return a.has;
    };
  } else {
    const a: Derive = {
      kind: Kind.CACHED,
      flags: Flag.CLEAR,
      head: undefined,
      deps: undefined,
      subs: undefined,
      tail: undefined,
      get: initial, // <https://github.com/microsoft/TypeScript/issues/47599>
      has: maybe_initial,
    };
    return () => {
      if (a.flags & Flag.DIRTY || a.flags & Flag.READY && check(a.deps!, a)) {
        reget(a) && a.subs && flat(a.subs);
      } else if (a.flags & Flag.READY) a.flags &= ~Flag.READY;
      return enlink(a), a.has;
    };
  }
}) as {
  <A>(deriver: (old?: A) => A): () => A;
  <A>(deriver: (old: A) => A, initial: A): () => A;
  <A>(initial: A): { (): A; <const B extends A>($: B | (($: B) => B)): B };
};
/** Creates a side effect and returns a disposer. */
export const effect = (run: () => void): () => void => {
  const a: Effect = {
    kind: Kind.EFFECT,
    flags: Flag.WATCH,
    head: undefined,
    deps: undefined,
    subs: undefined,
    tail: undefined,
    run,
  };
  enlink(a);
  const b = set(a);
  try {
    run();
  } finally {
    set(b);
  }
  return () => {
    for (let c = a.deps; c; c = delink(c, a));
    a.subs && delink(a.subs, a.subs.sub), a.flags &= 0;
  };
};
