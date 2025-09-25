import { Flag } from "./flags.ts";
import type { Derive, Node, Scoper, Signal } from "./interface.ts";
import { follow, ignore } from "./link.ts";

let actor: Node | null = null, scope: Scoper | null = null, swapper;
/** Manually gets the current subscriber. */
export const get_actor = (): Node | null => actor;
/** Manually sets the current subscriber. */
export const set_actor = ($: Node | null): Node | null => (
  swapper = actor, actor = $, swapper
);
/** Manually gets the current context. */
export const get_scope = (): Scoper | null => scope;
/** Manually sets the current context. */
export const set_scope = ($: Scoper | null): Scoper | null => (
  swapper = scope, scope = $, swapper
);
/** Checks whether a value differs. */
export const reuse = <A>($: Signal | Derive, prev: A, next: A): boolean => {
  switch ($.is) {
    case undefined:
      return prev !== next;
    case false:
      return true;
    default:
      return !$.is(prev, next);
  }
};
/** Updates a source. */
export const reset = ($: Signal): boolean => (
  $.flags = Flag.BEGIN, reuse($, $.prev, $.prev = $.next)
);
/** Updates a computation. */
export const reget = ($: Derive): boolean => {
  const a = set_actor($);
  try {
    return follow($), reuse($, $.prev, $.prev = $.next($.prev));
  } finally {
    actor = a, ignore($);
  }
};
