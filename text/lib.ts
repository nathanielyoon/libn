/** Code point getter. */
export const enPoint: (this: string, index?: number) => number = /* @__PURE__ */
  (() =>
    String.prototype.codePointAt as (this: string, index?: number) => number)();
/** Code point setter. */
export const dePoint: (...codePoints: number[]) => string =
  /* @__PURE__ */ (() => String.fromCodePoint)();
