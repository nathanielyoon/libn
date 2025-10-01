/** Checks whether one string sorta-includes another. */
export const includes = (source: string, target: string): boolean => {
  const max = source.length, min = target.length;
  if (min > max) return false;
  if (min === max) return source === target;
  top: for (let z = 0, y = 0; z < min; ++z) {
    const next = target.charCodeAt(z);
    while (y < max) if (source.charCodeAt(y++) === next) continue top;
    return false;
  }
  return true;
};
