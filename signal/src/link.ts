import {
  type Effect,
  Flag,
  Kind,
  type Link,
  type Node,
  type Scoper,
} from "./node.ts";

let step = 0; // to track whether a node was visited in a given pass
/** Connects two nodes. */
export const link = (dep: Node, sub: Node | null): void => {
  if (!sub) return;
  const a = sub.head;
  if (a?.dep === dep) return;
  const b = a ? a.dep_next : sub.deps;
  if (b?.dep === dep) return sub.head = b, b.step = step as any; // void
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
  a ? a.dep_next = d : sub.deps = d, c ? c.sub_next = d : dep.subs = d;
};
const chop = (sub: Node, $: Link) => {
  const a = $.dep_next, b = $.dep_prev;
  a ? a.dep_prev = b : sub.head = b, b ? b.dep_next = a : sub.deps = a;
  const c = $.sub_next, d = $.sub_prev, e = $.dep;
  if (c ? c.sub_prev = d : e.tail = d) d!.sub_next = c;
  else if (!(e.subs = c)) {
    if (e.kind === Kind.DERIVE) e.flags = Flag.RESET, rest(e);
    else e.kind === Kind.SIGNAL || dispose(e);
  }
  return a;
};
const rest = ($: Node) => {
  for (let a = $.deps; a; a = chop($, a));
};
/** Cleans up effects. */
export const dispose = ($: Effect | Scoper): void => {
  rest($), $.subs && chop($.subs.sub, $.subs), $.flags = Flag.CLEAR;
};
/** Starts tracking a node. */
export const follow = ($: Node): void => {
  ++step, $.head = null, $.flags = $.flags & Flag.FRESH | Flag.CHECK;
};
/** Stops tracking a node. */
export const ignore = ($: Node): void => {
  for (let a = $.head ? $.head.dep_next : $.deps; a; a = chop($, a));
  $.flags &= ~Flag.CHECK;
};
