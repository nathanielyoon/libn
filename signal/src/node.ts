/** State flags, some composite. */
export const enum Flag {
  CLEAR = 0,
  BEGIN = 1 << 0, // can begin a chain of updates
  DIRTY = 1 << 1, // gotta re-run
  READY = 1 << 2, // maybe re-run
  CHECK = 1 << 3, // for recursed
  RECUR = 1 << 4, // guard against re-marking nodes
  QUEUE = 1 << 5, // in the to-run queue
  RESET = Flag.BEGIN | Flag.DIRTY, // was mutated
  CAUSE = Flag.BEGIN | Flag.READY, // origin of change
  SETUP = Flag.DIRTY | Flag.READY, // "checked and cleared"
  GOING = Flag.CHECK | Flag.RECUR, // recursing
  KNOWN = Flag.GOING | Flag.SETUP, // seen before
  FRESH = ~(Flag.RECUR | Flag.SETUP), // when starting to follow
}
/** Reactive node types. */
export const enum Kind {
  SIGNAL,
  DERIVE,
  EFFECT,
  SCOPER,
}
/** Equality check (or directive to assume every value is different). */
export type Equals<A, B extends A> = ((prev: A, next: B) => boolean) | false;
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
  is: Equals<C, C> | undefined;
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
