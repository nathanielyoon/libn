import { Flag, Kind } from "./flags.ts";

/** Equality check (or directive to assume every value is different). */
export type Equals<A, B extends A> = ((prev: A, next: B) => boolean) | false;
/** Connection between two reactive nodes. */
export type Link =
  & { step: number; dep: Node; sub: Node }
  & { [_ in `${"dep" | "sub"}_${"prev" | "next"}`]: Link | null };
/** @internal */
abstract class Linked<A extends Kind> {
  head: Link | null = null;
  deps: Link | null = null;
  subs: Link | null = null;
  tail: Link | null = null;
  protected constructor(public kind: A, public flags: Flag) {}
}
/** Mutable data source. */
export class Signal<A = any> extends Linked<Kind.SIGNAL> {
  /** Active value. */
  next: A;
  /** Previously set value. */
  prev: A;
  /** Custom equality check. */
  is: Equals<A, A> | undefined;
  /** Initializes a mutable data source structure. */
  constructor(initial: A, options?: { equals?: Equals<A, A> }) {
    super(Kind.SIGNAL, Flag.BEGIN);
    this.next = this.prev = initial, this.is = options?.equals;
  }
}
/** Computed derivation. */
export class Derive<A = any> extends Linked<Kind.DERIVE> {
  /** Value computation. */
  next: ($?: A) => A;
  /** Previously set value. */
  prev: A | undefined;
  /** Custom equality check. */
  is: Equals<A, A> | false | undefined;
  /** Initializes a computed derivation structure. */
  constructor(
    derive: ($?: A) => A,
    options?: { initial?: A; equals?: Equals<A, A> },
  ) {
    super(Kind.DERIVE, Flag.RESET);
    this.next = derive, this.prev = options?.initial, this.is = options?.equals;
  }
}
/** Effect or Scoper. */
export class Target<
  A extends Kind.EFFECT | Kind.SCOPER = Kind.EFFECT | Kind.SCOPER,
> extends Linked<A> {
  /** Effect or group of effects. */
  run: () => void;
  /** Initializes an effects structure. */
  constructor(kind: A, run: () => void) {
    super(kind, Flag.CLEAR);
    this.run = run;
  }
}
/** Reactive node. */
export type Node = Signal | Derive | Target;
