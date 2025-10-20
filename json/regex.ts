import { B16, B32, B64, H32, U64 } from "@libn/base";

/** String format types. */
export type Format = {
  "date-time": `${Format["date"]}T${Format["time"]}`;
  date: `${number}-${number}-${number}`;
  time: `${number}:${number}:${number}.${number}Z`;
  email: `${string}@${string}.${string}`;
  uri: `${string}:${string}`;
  uuid: `${string}-${string}-${string}-${string}-${string}`;
};
/** String format patterns. */
export const FORMAT: { [_ in keyof Format]: RegExp } = /* @__PURE__ */ (() => {
  const date =
    /^(?:(?:(?:(?:(?:[02468][048])|(?:[13579][26]))00)|(?:[0-9][0-9](?:(?:0[48])|(?:[2468][048])|(?:[13579][26]))))[-]02[-]29)|(?:\d{4}[-](?:(?:(?:0[13578]|1[02])[-](?:0[1-9]|[12]\d|3[01]))|(?:(?:0[469]|11)[-](?:0[1-9]|[12]\d|30))|(?:02[-](?:0[1-9]|1[0-9]|2[0-8]))))$/;
  const time =
    /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}(?:Z|[+-](?:[01]\d|2[0-3]):[0-5][0-9])$/;
  return {
    date,
    time,
    "date-time": RegExp(`${date.source.slice(0, -1)}T${time.source.slice(1)}$`),
    email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
    uri: /^[^\s#/:?]+:(?:\/\/[^\s\/?#]*)?[^\s#?]*(?:\?[^\s#]*)?(?:#\S*)?$/,
    uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
  };
})();
/** @internal */
type Split<A extends string, B extends string = never> = A extends
  `${infer C}${infer D}` ? Split<D, B | C> : Uppercase<B> | Lowercase<B>;
/** @internal */
type Alpha = Split<"ABCDEFGHIJKLMNOPQRSTUVWXYZ">;
/** @internal */
type Digit = `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;
/** Content encoding types. */
export type Encoding = {
  base16: "" | `${Digit | Split<"ABCDEF">}${string}`;
  base32: "" | `${Exclude<Digit, `${0 | 1 | 8 | 9}`> | Alpha}${string}`;
  base32hex: "" | `${Exclude<Alpha, Split<"WXYZ">>}${string}`;
  base64: "" | `${Alpha | Digit | "+" | "/"}${string}`;
  base64url: "" | `${Alpha | Digit | "-" | "_"}${string}`;
};
/** Content encoding patterns. */
export const ENCODING: { [_ in keyof Encoding]: RegExp } = {
  base16: B16,
  base32: B32,
  base32hex: H32,
  base64: B64,
  base64url: U64,
};
