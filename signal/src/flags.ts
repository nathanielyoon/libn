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
  GOING = Flag.CHECK | Flag.RECUR, // recursing
  CAUSE = Flag.BEGIN | Flag.READY, // origin of change
  EARLY = Flag.RECUR | Flag.READY, // just getting going
  SETUP = Flag.DIRTY | Flag.READY, // "checked and cleared"
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
