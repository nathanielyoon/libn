import {
  type Derive,
  dispose,
  Equals,
  Flag,
  Kind,
  link,
  type Source,
} from "./internal.ts";
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

function sourcer(this: Source, ...$: [unknown]) {
  if ($.length) {
    const is = typeof $[0] === "function" ? $[0](this.is) : $[0];
    switch (this.equals) {
      case undefined:
        if (is === this.is) return is;
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
/** Combined getter/setter for a reactive value. */
export type Signal<A> = { (): A; <const B extends A>($: B | (($: B) => B)): B };
/** Creates a reactive value. */
export const signal =
  ((is: any, $?: any) =>
    typeof is !== "function"
      ? sourcer.bind(node(Kind.SOURCE, Flag.BEGIN, { was: is, is, equals: $ }))
      : deriver.bind(node(Kind.DERIVE, Flag.RESET, { was: $, is }))) as {
      <A>(deriver: (was: A) => A, initial: A): () => A;
      // Omitting the initial value limits type inference for the deriver's
      // parameter (see <https://github.com/microsoft/TypeScript/issues/47599>).
      <A>(deriver: (was: A | undefined) => A): () => A;
      <A>(initial: A, equals?: Equals<A> | false): Signal<A>;
      <A>(_?: A, equals?: Equals<A | undefined> | false): Signal<A | undefined>;
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
