/** Node variant - Signal (0), Derive (1), Effect (2), or Scoper (3). */
export type Kind = 0 | 1 | 2 | 3;
/** Equality check. */
export type Is<A, B extends A> = (prev: A, next: B) => boolean;
/** Connection between two reactive nodes. */
export type Link =
  & { step: number; dep: Node; sub: Node }
  & { [_ in `${"prev" | "next"}${"Dep" | "Sub"}`]: Link | null };
/** @internal */
interface Linked<A extends Kind> {
  kind: A;
  /**
   * Flags (as binary number literals) indicate the following:
   * 0b0000000
   *   |||||||_ May be updated from outside
   *   ||||||__ Track to notify when updating
   *   |||||___ Could change, check it
   *   ||||____ Changed, should re-run
   *   |||_____ Could recurse, check it
   *   ||______ Recursed, don't go in again
   *   |_______ In the to-run queue
   */
  flags: number;
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
export interface Signal<A = any> extends Source<0, A, A> {}
/** Computed derivation. */
export interface Derive<A = any> extends Source<1, ($?: A) => A, A> {}
/** Side-effectual sink. */
export interface Effect extends Target<2> {}
/** Effects group owner. */
export interface Scoper extends Target<3> {}
/** Reactive node. */
export type Node = Signal | Derive | Effect | Scoper;
