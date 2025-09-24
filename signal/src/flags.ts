/** State flags, some composite. */
export const enum Flag {
  CLEAR = 0,
  BEGIN = 1 << 0, // is mutable from outside (i.e. can begin a chain of updates)
  WATCH = 1 << 1, // only set for effects
  CHECK = 1 << 2, // for recursed
  RECUR = 1 << 3,
  GOING = Flag.CHECK | Flag.RECUR, // recursing
  DIRTY = 1 << 4,
  RESET = Flag.BEGIN | Flag.DIRTY, // was mutated
  READY = 1 << 5, // update pending
  START = Flag.BEGIN | Flag.READY, // origin of change
  EARLY = Flag.RECUR | Flag.READY, // just getting going
  SETUP = Flag.DIRTY | Flag.READY, // "checked and cleared"
  KNOWN = Flag.GOING | Flag.SETUP, // seen before
  QUEUE = 1 << 6,
  FRESH = ~(Flag.RECUR | Flag.SETUP), // when starting to follow
}
/** Reactive node types. */
export const enum Kind {
  SIGNAL,
  DERIVE,
  EFFECT,
  SCOPER,
}
