/** State flags, some composite. */
export const enum Flag {
  CLEAR = 0,
  BEGIN = 1 << 0, // can begin a chain of updates
  WATCH = 1 << 1, // should notify
  DIRTY = 1 << 2, // gotta re-run
  READY = 1 << 3, // maybe re-run
  CHECK = 1 << 4, // may recur
  RECUR = 1 << 5, // guard against re-marking nodes
  QUEUE = 1 << 6, // in the to-run queue
  TRIED = Flag.BEGIN | Flag.WATCH, // connected to
  START = Flag.BEGIN | Flag.DIRTY, // was mutated
  CAUSE = Flag.BEGIN | Flag.READY, // origin of change (signal)
  INNER = Flag.BEGIN | Flag.CHECK, // started to track (derive)
  OUTER = Flag.WATCH | Flag.CHECK, // started to track (effect)
  SETUP = Flag.DIRTY | Flag.READY, // "checked and cleared"
  KNOWN = Flag.CHECK | Flag.RECUR | Flag.SETUP, // seen before
}
/** Reactive node types. */
export const enum Kind {
  SIGNAL,
  DERIVE,
  EFFECT,
  SCOPER,
}
/** Equality check. */
export type Is<A, B extends A> = (prev: A, next: B) => boolean;
/** Connection between two reactive nodes. */
export type Link =
  & { step: number; dep: Node; sub: Node }
  & { [_ in `${"dep" | "sub"}_${"prev" | "next"}`]: Link | null };
/** @internal */
interface Linked<A extends Kind> {
  kind: A;
  flags: Flag;
  head: Link | null;
  deps: Link | null;
  subs: Link | null;
  tail: Link | null;
}
/** @internal */
interface Source<A extends Kind, B, C> extends Linked<A> {
  next: B;
  prev: C;
  is: Is<C, C>;
}
/** @internal */
interface Target<A extends Kind> extends Linked<A> {
  run: () => void;
}
/** Mutable data source. */
export interface Signal<A = any> extends Source<Kind.SIGNAL, A, A> {}
/** Computed derivation. */
export interface Derive<A = any> extends Source<Kind.DERIVE, ($?: A) => A, A> {}
/** Side-effectual sink. */
export interface Effect extends Target<Kind.EFFECT> {}
/** Effects group owner. */
export interface Scoper extends Target<Kind.SCOPER> {}
/** Reactive node. */
export type Node = Signal | Derive | Effect | Scoper;
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
