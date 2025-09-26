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
  const a = $.dep, b = $.dep_next, c = $.dep_prev, d = $.sub_next;
  b ? b.dep_prev = c : sub.head = c, c ? c.dep_next = b : sub.deps = b;
  let e = $.sub_prev;
  if (d ? d.sub_prev = e : a.tail = e) e!.sub_next = d;
  else if (!(a.subs = d)) {
    switch (a.kind) {
      case Kind.DERIVE:
        if (e = a.deps) {
          a.flags = Flag.START;
          do e = chop(a, e); while (e);
        } // falls through
      case Kind.SIGNAL:
        break;
      default:
        dispose(a);
    }
  }
  return b;
};
/** Cleans up effects. */
export const dispose = ($: Effect | Scoper): void => {
  for (let a = $.deps; a; a = chop($, a));
  $.subs && chop($.subs.sub, $.subs), $.flags = Flag.CLEAR;
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
