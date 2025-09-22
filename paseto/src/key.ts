/** @internal */
const USE = /* @__PURE__ */ Symbol("use");
/** Key usage values, with additional distinction between keys in a pair. */
export type Use = "local" | "secret" | "public";
/** Typed key. */
export type Key<A extends Use> = Uint8Array<ArrayBuffer> & { [USE]: A };
/** Types a key. */
export const set_use = <A extends Use>(use: A, key: Uint8Array): Key<A> =>
  Object.defineProperty<any>(key, USE, { value: use, enumerable: true });
const is = <A extends Use>(use: A) => ($: Uint8Array): $ is Key<A> =>
  $.length === 32 && Object.hasOwn($, USE) && $[USE as any] as any === use;
/** Checks for local-use keys. */
export const is_local: ($: Uint8Array) => $ is Key<"local"> =
  /* @__PURE__ */ is("local");
/** Checks for secret public-use keys. */
export const is_secret: ($: Uint8Array) => $ is Key<"secret"> =
  /* @__PURE__ */ is("secret");
/** Checks for public public-use keys. */
export const is_public: ($: Uint8Array) => $ is Key<"public"> =
  /* @__PURE__ */ is("public");
