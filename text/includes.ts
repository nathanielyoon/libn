import { enPoint } from "./lib.ts";

/** Checks whether one string sorta-includes another. */
export const includes = (source: string, target: string): boolean => {
  const a = [...source], b = [...target], max = a.length, min = b.length;
  if (min > max) return false;
  if (min === max) return source === target;
  top: for (let z = 0, y = 0; z < min; ++z) {
    for (const next = enPoint.call(b[z]); y < max; ++y) {
      if (enPoint.call(a[y]) === next) continue top;
    }
    return false;
  }
  return true;
};
