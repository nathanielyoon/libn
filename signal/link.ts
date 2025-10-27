import { Flag, Kind } from "./flags.ts";
import type { Effect, Link, Node, Scoper } from "./node.ts";

/** Creates a link between two nodes. */
export const enlink = (dep: Node, sub: Node | null, step: number): void => {
  if (!sub) return;
  const head = sub.head;
  if (head?.dep === dep) return;
  const next = head ? head.dep_next : sub.deps;
  if (next?.dep === dep) return sub.head = next, next.step = step as never;
  const tail = dep.tail;
  if (tail?.step === step && tail.sub === sub) return;
  const link = sub.head = dep.tail = {
    step,
    dep_prev: head,
    dep,
    dep_next: next,
    sub_prev: tail,
    sub,
    sub_next: null,
  };
  if (next) next.dep_prev = link;
  head ? head.dep_next = link : sub.deps = link;
  tail ? tail.sub_next = link : dep.subs = link;
};
const delink = ($: Link, to: Node) => {
  const head = $.dep_prev, next = $.dep_next;
  next ? next.dep_prev = head : to.head = head;
  head ? head.dep_next = next : to.deps = next;
  const prev = $.sub_prev, tail = $.sub_next, dep = $.dep;
  tail ? tail.sub_prev = prev : dep.tail = prev;
  if (prev) prev.sub_next = tail;
  else if (!(dep.subs = tail)) {
    switch (dep.kind) {
      case Kind.DERIVE:
        if ($ = dep.deps!) {
          dep.flags = Flag.START;
          do $ = delink($, dep)!; while ($);
        } // falls through
      case Kind.SIGNAL:
        break;
      default:
        dispose(dep);
    }
  }
  return next;
};
/** Cleans up effects. */
export const dispose = ($: Effect | Scoper): void => {
  for (let a = $.deps; a; a = delink(a, $));
  $.subs && delink($.subs, $.subs.sub), $.flags = Flag.CLEAR;
};
/** Clears a node from its dependencies. */
export const drop = ($: Node): void => {
  $.flags &= ~Flag.CHECK;
  for (let a = $.head ? $.head.dep_next : $.deps; a; a = delink(a, $));
};
/** Checks a link. */
export const validate = (sub: Node, $: Link): boolean | void => {
  for (let dep = sub.head; dep; dep = dep.dep_prev) if (dep === $) return true;
};
