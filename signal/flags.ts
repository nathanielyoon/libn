/** State flags, some composite. */
export const enum Flag {
  CLEAR = 0,
  BEGIN = 1 << 0, // can begin a chain of updates
  WATCH = 1 << 1, // should notify
  DIRTY = 1 << 2, // gotta re-run
  READY = 1 << 3, // maybe re-run
  CHECK = 1 << 4, // may recur
  RECUR = 1 << 5, // guard against re-marking nodes
  QUEUE = 1 << 6, // in the to-run queue
  TRIED = Flag.BEGIN | Flag.WATCH, // connected to
  START = Flag.BEGIN | Flag.DIRTY, // was mutated
  CAUSE = Flag.BEGIN | Flag.READY, // origin of change (signal)
  INNER = Flag.BEGIN | Flag.CHECK, // started to track (derive)
  OUTER = Flag.WATCH | Flag.CHECK, // started to track (effect)
  SETUP = Flag.DIRTY | Flag.READY, // "checked and cleared"
  KNOWN = Flag.CHECK | Flag.RECUR | Flag.SETUP, // seen before
}
/** Reactive node types. */
export const enum Kind {
  SIGNAL,
  DERIVE,
  EFFECT,
  SCOPER,
}
