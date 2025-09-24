import { Flag, Kind } from "./flags.ts";
import type { Derive, Equals, Signal } from "./nodes.ts";
import { dispose, link } from "./link.ts";
import {
  actor,
  check,
  deep,
  flat,
  reget,
  reuse,
  scope,
  set_actor,
  set_scope,
} from "./state.ts";

function sourcer(this: Signal, ...$: [unknown]) {
  if ($.length) {
    const is = typeof $[0] === "function" ? $[0](this.is) : $[0];
    switch (this.equals) {
      case undefined:
        if (is === this.is) return is; // falls through
      case false:
        break;
      default:
        if (this.equals(is, this.is)) return is;
    }
    this.is = is, this.flags = Flag.RESET, this.sub && deep(this.sub);
  } else {
    if (this.flags & Flag.DIRTY && reuse(this) && this.sub) flat(this.sub);
    link(this, actor);
  }
  return this.is;
}
function deriver(this: Derive) {
  this.flags & Flag.DIRTY || this.flags & Flag.READY && check(this, this.dep!)
    ? reget(this) && this.sub && flat(this.sub)
    : (this.flags &= ~Flag.READY);
  return link(this, scope ?? actor), this.was;
}
const node = <A extends Kind, B>(kind: A, flags: Flag, rest: B) => (
  { kind, flags, head: null, dep: null, sub: null, tail: null, ...rest }
);
/** Reactive getter. */
export type Get<A> = () => A;
/** Reactive setter. */
export type Set<A> = <const B extends A>($: B | (($: A) => B)) => B;
/** Creates a reactive value. */
export const signal = ((is: any, $?: any) =>
  sourcer.bind(
    node(Kind.SIGNAL, Flag.BEGIN, { was: is, is, equals: $ }),
  )) as {
    <A>(initial: A, equals?: Equals<A> | false): Get<A> & Set<A>;
    <A>(
      _?: A,
      equals?: Equals<A | undefined> | false,
    ): Get<A | undefined> & Set<A | undefined>;
  };
export const derive =
  ((is: any, $?: any) =>
    deriver.bind(node(Kind.DERIVE, Flag.RESET, { was: $, is }))) as {
      <A>(deriver: (was: A) => A, initial: A): () => A;
      // Omitting the initial value limits type inference for the deriver's
      // parameter (see <https://github.com/microsoft/TypeScript/issues/47599>).
      <A>(deriver: (was: A | undefined) => A): () => A;
    };
/** Creates a side effect and returns a disposer. */
export const effect = (is: () => void): () => void => {
  const a = node(Kind.EFFECT, Flag.WATCH, { is });
  link(a, scope ?? actor);
  const b = set_actor(a);
  try {
    a.is();
  } finally {
    set_actor(b);
  }
  return dispose.bind(a);
};
/** Creates a group of effects and returns a disposer. */
export const scoper = (all: () => void): () => void => {
  const a = node(Kind.SCOPER, Flag.CLEAR, {});
  link(a, scope);
  const b = set_actor(null), c = set_scope(a);
  try {
    all();
  } finally {
    set_actor(b), set_scope(c);
  }
  return dispose.bind(a);
};
