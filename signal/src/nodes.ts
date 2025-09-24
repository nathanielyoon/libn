import type { Flag, Kind } from "./flags.ts";

/** @internal */
type Noder<A extends Kind> =
  & { kind: A; flags: Flag }
  & { [_ in "head" | "dep" | "sub" | "tail"]: Link | null };
/** Equality check. */
export type Equals<A> = (prev: A, next: A) => boolean;
/** Mutable data source. */
export type Signal<A = any> = Noder<Kind.SIGNAL> & {
  was: A;
  is: A;
  equals?: Equals<A> | false;
};
/** Derived computation. */
export type Derive<A = any> = Noder<Kind.DERIVE> & { was: A; is: ($?: A) => A };
/** Effectful reaction. */
export type Effect = Noder<Kind.EFFECT> & { is: () => void };
/** Effect scope owner. */
export type Scoper = Noder<Kind.SCOPER>;
/** Reactive node. */
export type Node = Signal | Derive | Effect | Scoper;
/** Connection between two reactive nodes. */
export type Link =
  & { step: number; dep: Node; sub: Node }
  & { [_ in `${"dep" | "sub"}_${"prev" | "next"}`]: Link | null };
