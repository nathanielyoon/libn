import type { Effect, Link, Node, Scoper } from "./node.ts";

/** Creates a link between two nodes. */
export const enlink = (dep: Node, sub: Node | null, step: number): void => {
  if (!sub) return;
  const head = sub.head;
  if (head?.dep === dep) return;
  const next = head ? head.nextDep : sub.deps;
  if (next?.dep === dep) return sub.head = next, next.step = step as never;
  const tail = dep.tail;
  if (tail?.step === step && tail.sub === sub) return;
  const link = sub.head = dep.tail = {
    step,
    prevDep: head,
    dep,
    nextDep: next,
    prevSub: tail,
    sub,
    nextSub: null,
  };
  if (next) next.prevDep = link;
  head ? head.nextDep = link : sub.deps = link;
  tail ? tail.nextSub = link : dep.subs = link;
};
const delink = ($: Link, to: Node) => {
  const head = $.prevDep, next = $.nextDep;
  next ? next.prevDep = head : to.head = head;
  head ? head.nextDep = next : to.deps = next;
  const prev = $.prevSub, tail = $.nextSub, dep = $.dep;
  tail ? tail.prevSub = prev : dep.tail = prev;
  if (prev) prev.nextSub = tail;
  else if (!(dep.subs = tail)) {
    switch (dep.kind) {
      case 1:
        if ($ = dep.deps!) {
          dep.flags = 0b0001001;
          do $ = delink($, dep)!; while ($);
        } // falls through
      case 0:
        break;
      default:
        dispose.call(dep);
    }
  }
  return next;
};
/** Cleans up effects. */
export function dispose(this: Effect | Scoper): void {
  for (let a = this.deps; a; a = delink(a, this));
  this.subs && delink(this.subs, this.subs.sub), this.flags = 0;
}
/** Clears a node from its dependencies. */
export const drop = ($: Node): void => {
  $.flags &= ~0b0010000;
  for (let a = $.head ? $.head.nextDep : $.deps; a; a = delink(a, $));
};
/** Checks a link. */
export const validate = (sub: Node, $: Link): boolean | void => {
  for (let dep = sub.head; dep; dep = dep.prevDep) if (dep === $) return true;
};
