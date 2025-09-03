import type { Html, MathMl, Svg } from "./types.ts";

type Trim<A extends string> = A extends `${any}${" " | ">"}${infer B}` ? Trim<B>
  : A extends `${infer B}${"#" | "." | "[" | ":"}${any}` ? Trim<B>
  : A extends keyof Html ? Html[A]
  : A extends keyof Svg ? Svg[A]
  : A extends keyof MathMl ? MathMl[A]
  : never;
/** Query-selects an element. */
export const qs =
  (($: string, parent = document.body) => parent.querySelector($)) as {
    <A extends keyof Html>(tag: A, parent?: Element): Html[A] | null;
    <A extends keyof Svg>(tag: A, parent?: Element): Svg[A] | null;
    <A extends keyof MathMl>(tag: A, parent?: Element): MathMl[A] | null;
    <A extends string>(selector: A, parent?: Element): Trim<A> | null;
    <A extends Element>(selector: string, parent?: Element): A | null;
  };
/** Query-selects all elements. */
export const qa =
  (($: string, parent = document.body) => [...parent.querySelectorAll($)]) as {
    <A extends keyof Html>(tag: A, parent?: Element): Html[A][];
    <A extends keyof Svg>(tag: A, parent?: Element): Svg[A][];
    <A extends keyof MathMl>(tag: A, parent?: Element): MathMl[A][];
    <A extends string>(selector: A, parent?: Element): Trim<A>[];
    <A extends Element>(selector: string, parent?: Element): A[];
  };
