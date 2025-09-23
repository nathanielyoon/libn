/**
 * Reactive state management.
 *
 * @example Push-pull updates
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const count = signal(0), half = signal(() => count() >> 1);
 * let called = 0;
 * effect(() => half() && ++called);
 *
 * assertEquals(called, 0);
 * count(1), assertEquals(called, 0);
 * count(2), assertEquals(called, 1);
 * count(3), assertEquals(called, 1);
 * ```
 *
 * @module signal
 */

const enum Flag {
  CLEAR = 0,
  BEGIN = 1 << 0, // is mutable from outside (i.e. can begin a chain of updates)
  WATCH = 1 << 1, // only set for effects
  CHECK = 1 << 2, // for recursed
  RECUR = 1 << 3,
  GOING = Flag.CHECK | Flag.RECUR, // recursing
  DIRTY = 1 << 4,
  RESET = Flag.BEGIN | Flag.DIRTY, // was mutated
  READY = 1 << 5, // update pending
  START = Flag.BEGIN | Flag.READY, // origin of change
  EARLY = Flag.RECUR | Flag.READY, // just getting going
  SETUP = Flag.DIRTY | Flag.READY, // "checked and cleared"
  KNOWN = Flag.GOING | Flag.SETUP, // seen before
  QUEUE = 1 << 6,
  FRESH = ~(Flag.RECUR | Flag.SETUP), // when starting to follow
}
const enum Kind {
  SOURCE, // mutable data source
  DERIVE, // derived computation
  EFFECT, // side effect reactor
  SCOPER, // effects scope owner
}
type Noder<A extends Kind> =
  & { kind: A; flags: Flag }
  & { [_ in "head" | "dep" | "sub" | "tail"]: Link | null };
type Source<A = any> = Noder<Kind.SOURCE> & { was: A; is: A };
type Derive<A = any> = Noder<Kind.DERIVE> & { was?: A; is: ($?: A) => A };
type Effect = Noder<Kind.EFFECT> & { is: () => void };
type Scoper = Noder<Kind.SCOPER>;
type Node = Source | Derive | Effect | Scoper;
type Link =
  & { step: number; dep: Node; sub: Node }
  & { [_ in `${"dep" | "sub"}_${"prev" | "next"}`]: Link | null };
// This can only have `Effect`s and `Scoper`s, since those are always run (as
// opposed to when something reads their "value" - they have none). Typing it
// broadly is wrong, but elides wronger-feeling explicit casts when pushing.
const queue: (Node | null)[] = [];
// Global (increasing) version counter and batch depth tracker.
let step = 0, depth = 0;
// Active subscribers (and helper to swap variables).
let actor: Node | null = null, scope: Scoper | null = null, swapper;
const flush = () => {
  for (let a; a = queue.shift(); run(a, a.flags &= ~Flag.QUEUE));
};
/** Pauses updates, executes a function, then resumes. */
export const batch = <A>($: () => A): A => {
  try {
    return ++depth, $();
  } finally {
    --depth || flush();
  }
};
/** Manually sets the current subscriber. */
export const set_actor = ($: Node | null): Node | null => (
  swapper = actor, actor = $, swapper
);
const link = (dep: Node, sub: Node | null) => {
  if (!sub) return;
  const a = sub.head;
  if (a?.dep === dep) return;
  const b = a ? a.dep_next : sub.dep;
  if (b?.dep === dep) return (sub.head = b).step = step;
  const c = dep.tail;
  if (c?.step === step && c.sub === sub) return;
  const d = sub.head = dep.tail = {
    step,
    dep_prev: a,
    dep,
    dep_next: b,
    sub_prev: c,
    sub,
    sub_next: null,
  };
  if (b) b.dep_prev = d;
  a ? a.dep_next = d : sub.dep = d, c ? c.sub_next = d : dep.sub = d;
};
const chop = (sub: Node, $: Link) => {
  const a = $.dep_prev, b = $.dep, c = $.dep_next, d = $.sub_prev;
  (c ? c.dep_prev = a : sub.head = a) ? a!.dep_next = c : sub.dep = c;
  let e = $.sub_next;
  if (e ? e.sub_prev = d : b.tail = d) d!.sub_next = e;
  else if (!(b.sub = e)) {
    if (b.kind === Kind.DERIVE) {
      for (b.flags = Flag.RESET, e = b.dep; e; e = chop(b, e));
    } else b.kind === Kind.SOURCE || dispose.call(b);
  }
  return c;
};
const follow = ($: Node) => {
  ++step, $.head = null, $.flags = $.flags & Flag.FRESH | Flag.CHECK;
};
const ignore = ($: Node) => {
  for (let a = $.head ? $.head.dep_next : $.dep; a; a = chop($, a));
  $.flags &= ~Flag.CHECK;
};
const reuse = ($: Node) =>
  $.kind === Kind.SOURCE && ($.flags = Flag.BEGIN, $.was !== ($.was = $.is));
const reget = ($: Node) => {
  if ($.kind !== Kind.DERIVE) return false;
  const a = set_actor($);
  try {
    return follow($), $.was !== ($.was = $.is($.was));
  } finally {
    actor = a, ignore($);
  }
};
const rerun = ($: Node): number => ($.flags & Flag.QUEUE ||
  ($.flags |= Flag.QUEUE, $.sub ? rerun($.sub.sub) : queue.push($)));
const flat = ($: Link) => {
  do if (($.sub.flags & Flag.SETUP) === Flag.READY) {
    ($.sub.flags |= Flag.DIRTY) & Flag.WATCH && rerun($.sub);
  } while ($ = $.sub_next!);
};
const check = (sub: Node, $: Link) => {
  for (let a: (Link | null)[] = [], b = 0, c = false, d, e;;) {
    if (d = $.dep, sub.flags & Flag.DIRTY) c = true;
    else if ((d.flags & Flag.RESET) === Flag.RESET) {
      if (reuse(d) || reget(d)) c = true, d.sub!.sub_next && flat(d.sub!);
    } else if ((d.flags & Flag.START) === Flag.START) {
      ($.sub_next || $.sub_prev) && a.push($), ++b, sub = d, $ = d.dep!;
      continue;
    }
    mid: if (c || !$.dep_next) {
      while (b--) {
        e = sub.sub!, $ = e.sub_next ? a.pop()! : e;
        if (!c) sub.flags &= ~Flag.READY;
        else if (reuse(sub) || reget(sub)) e.sub_next && flat(e), sub = $.sub;
        else if (sub = $.sub, $.dep_next) break mid;
        else c = false;
      }
      return c;
    }
    $ = $.dep_next;
  }
};
const run = ($: Node, flags: Flag) => {
  if (flags & Flag.DIRTY || flags & Flag.READY && check($, $.dep!)) {
    const a = set_actor($);
    try {
      follow($), ($ as Effect).is();
    } finally {
      actor = a, ignore($);
    }
  } else {
    flags & Flag.READY && ($.flags = flags & ~Flag.READY);
    for (let a = $.dep; a; a = a.dep_next) {
      a.dep.flags & Flag.QUEUE && run(a.dep, a.dep.flags &= ~Flag.QUEUE);
    }
  }
};
const valid = ($: Node, link: Link) => {
  for (let a = $.head; a; a = a.dep_prev) if (a === link) return true;
};
function sourcer(this: Source, ...$: [unknown]) {
  if (!$.length) {
    if (this.flags & Flag.DIRTY && reuse(this) && this.sub) flat(this.sub);
    link(this, actor);
  } else if (
    this.is !== (this.is = typeof $[0] === "function" ? $[0](this.is) : $[0]) &&
    (this.flags = Flag.RESET, this.sub)
  ) {
    let sub = this.sub;
    top: for (let a: (Link | null)[] = [], b = sub.sub_next, c, d;;) {
      if (c = sub.sub, d = c.flags, !(d & Flag.KNOWN)) c.flags |= Flag.READY;
      else if (!(d & Flag.GOING)) d = Flag.CLEAR;
      else if (!(d & Flag.CHECK)) c.flags = d & ~Flag.RECUR | Flag.READY;
      else if (d & Flag.SETUP || !valid(c, sub)) d = Flag.CLEAR;
      else c.flags |= Flag.EARLY, d &= Flag.BEGIN;
      if (d & Flag.WATCH && rerun(c), d & Flag.BEGIN) {
        if (c.sub && (sub = c.sub).sub_next) a.push(b), b = sub.sub_next;
      } else if (!b) {
        while (a.length) {
          if (sub = a.pop()!) {
            b = sub.sub_next;
            continue top;
          }
        }
        break;
      } else b = (sub = b).sub_next;
    }
    depth || flush();
  }
  return this.is;
}
function deriver(this: Derive) {
  this.flags & Flag.DIRTY || this.flags & Flag.READY && check(this, this.dep!)
    ? reget(this) && this.sub && flat(this.sub)
    : (this.flags &= ~Flag.READY);
  return link(this, actor ?? scope), this.was;
}
function dispose(this: Effect | Scoper) {
  for (let a = this.dep; a; a = chop(this, a));
  this.sub && chop(this.sub.sub, this.sub), this.flags = Flag.CLEAR;
}
const node = <A extends Kind, B>(kind: A, flags: Flag, rest: B) => (
  { kind, flags, head: null, dep: null, sub: null, tail: null, ...rest }
);
/** Combined getter/setter for a reactive value. */
export type Signal<A> = { (): A; <const B extends A>($: B | (($: B) => B)): B };
/** Creates a reactive value. */
export const signal =
  (($: any, and?: any) =>
    typeof $ === "function"
      ? deriver.bind(node(Kind.DERIVE, Flag.RESET, { was: and, is: $ }))
      : sourcer.bind(node(Kind.SOURCE, Flag.BEGIN, { was: $, is: $ }))) as {
      // Omitting the initial value limits type inference for the deriver's
      // parameter (see <https://github.com/microsoft/TypeScript/issues/47599>).
      <A>(deriver: (was?: A) => A): () => A;
      <A>(deriver: (was: A) => A, initial: A): () => A;
      <A>(initial: A): Signal<A>;
    };
/** Creates a side effect and returns a disposer. */
export const effect = (is: () => void): () => void => {
  const a = node(Kind.EFFECT, Flag.WATCH, { is });
  link(a, actor ?? scope);
  const b = set_actor(a);
  try {
    a.is();
  } finally {
    actor = b;
  }
  return dispose.bind(a);
};
/** Creates a group of effects and returns a disposer. */
export const scoper = (all: () => void): () => void => {
  const a = node(Kind.SCOPER, Flag.CLEAR, {});
  link(a, scope);
  const b = set_actor(null), c = scope;
  try {
    scope = a, all();
  } finally {
    actor = b, scope = c;
  }
  return dispose.bind(a);
};
