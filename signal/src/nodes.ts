import type { Flag, Kind } from "./flags.ts";

/** @internal */
type Noder<A extends Kind> =
  & { kind: A; flags: Flag }
  & { [_ in "head" | "dep" | "sub" | "tail"]: Link | null };
/** Equality check. */
export type Equals<A, B extends A> = ((prev: A, next: B) => boolean) | false;
/** Mutable data source. */
export type Signal<A = any> = Noder<Kind.SIGNAL> & {
  prev: A;
  next: A;
  is: Equals<A, A> | false | undefined;
};
/** Derived computation. */
export type Derive<A = any> = Noder<Kind.DERIVE> & {
  prev: A;
  next: ($?: A) => A;
  is: Equals<A, A> | false | undefined;
};
/** Effectful reaction. */
export type Effect = Noder<Kind.EFFECT> & { run: () => void };
/** Effect scope owner. */
export type Scoper = Noder<Kind.SCOPER> & { run: () => void };
/** Reactive node. */
export type Node = Signal | Derive | Effect | Scoper;
/** Connection between two reactive nodes. */
export type Link =
  & { step: number; dep: Node; sub: Node }
  & { [_ in `${"dep" | "sub"}_${"prev" | "next"}`]: Link | null };
