/**
 * Reactive state management.
 *
 * @example Push-pull updates
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const count = signal(0), half = derive(() => count() >> 1);
 * let called = 0;
 * effect(() => half() && ++called);
 *
 * assertEquals(called, 0);
 * count(1), assertEquals(called, 0);
 * count(2), assertEquals(called, 1);
 * count(3), assertEquals(called, 1);
 * ```
 *
 * @module signal
 */

import { batch } from "./src/state.ts";
import {
  derive,
  effect,
  type Get,
  scoper,
  type Set,
  signal,
} from "./src/api.ts";

export { batch, derive, effect, type Get, scoper, type Set, signal };
