import type { Flag, Kind } from "./flags.ts";

/** Equality check. */
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
  is: Equals<C, C> | false | undefined;
}
/** @internal */
interface Target<A extends Kind> extends Linked<A> {
  run: () => void;
}
/** Mutable data source. */
export interface Signal<A = any> extends Source<Kind.SIGNAL, A, A> {}
/** Computed derivation. */
export interface Derive<A = any> extends Source<Kind.DERIVE, ($?: A) => A, A> {}
/** Side-effectual reaction. */
export interface Effect extends Target<Kind.EFFECT> {}
/** Grouped effect owner. */
export interface Scoper extends Target<Kind.SCOPER> {}
/** Reactive node. */
export type Node = Signal | Derive | Effect | Scoper;
