import { Flag, Kind } from "./flags.ts";
import type { Derive, Effect, Link, Node, Scoper, Signal } from "./nodes.ts";

// This can only increase, to track whether a node was visited in a given pass.
let step = 0;
/** Connects two nodes. */
export const link = (dep: Node, sub: Node | null): void => {
  if (!sub) return;
  const a = sub.head;
  if (a?.dep === dep) return;
  const b = a ? a.dep_next : sub.dep;
  if (b?.dep === dep) {
    sub.head = b, b.step = step;
    return;
  }
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
const rest = ($: Node) => {
  for (let a = $.dep; a; a = chop($, a));
};
const chop = (sub: Node, $: Link) => {
  const a = $.dep_prev, b = $.dep, c = $.dep_next, d = $.sub_prev;
  c ? c.dep_prev = a : sub.head = a, a ? a.dep_next = c : sub.dep = c;
  let e = $.sub_next;
  if (e ? e.sub_prev = d : b.tail = d) d!.sub_next = e;
  else if (!(b.sub = e)) {
    if (b.kind === Kind.DERIVE) b.flags = Flag.RESET, rest(b);
    else b.kind === Kind.SIGNAL || dispose.call(b);
  }
  return c;
};
/** Cleans up effects. */
export function dispose(this: Effect | Scoper): void {
  rest(this), this.sub && chop(this.sub.sub, this.sub), this.flags = Flag.CLEAR;
}
/** Starts tracking a node. */
export const follow = ($: Node): void => {
  ++step, $.head = null, $.flags = $.flags & Flag.FRESH | Flag.CHECK;
};
/** Stops tracking a node. */
export const ignore = ($: Node): void => {
  for (let a = $.head ? $.head.dep_next : $.dep; a; a = chop($, a));
  $.flags &= ~Flag.CHECK;
};
/** Checks whether a node's value has changed. */
export const update = <A>($: Signal | Derive, prev: A, next: A): boolean => {
  switch ($.same) {
    case undefined:
      return prev !== next;
    case false:
      return true;
    default:
      return !$.same(prev, next);
  }
};
