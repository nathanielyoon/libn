/** @internal */
type Html = HTMLElementTagNameMap;
/** @internal */
type Svg = SVGElementTagNameMap;
/** @internal */
type List<A extends string, B extends string = never> = A extends
  `${infer C},${infer D}` ? List<D, B | C> : A | B;
/** @internal */
type Trim<A extends string> = A extends
  `${string}${" " | ">" | "~" | "+" | "|"}${infer B}` ? Trim<B>
  : A extends `${infer B}${"#" | "." | "[" | ":"}${string}` ? Trim<B>
  : A;
/** @internal */
type Either<A, B, C extends string> = C extends keyof A ? A[C]
  : C extends keyof B ? B[C]
  : Element;
/** Query-selects an element. */
export const qs =
  (($: string, parent = document.body) => parent.querySelector($)) as {
    <A extends keyof Html>(tag: A, parent?: HTMLElement): Html[A] | null;
    <A extends keyof Svg>(tag: A, parent?: SVGElement): Svg[A] | null;
    <A extends string>(
      selector: A,
      parent?: HTMLElement,
    ): Either<Html, Svg, Trim<List<A>>> | null;
    <A extends string>(
      selector: A,
      parent?: SVGElement,
    ): Either<Svg, Html, Trim<List<A>>> | null;
    <A extends Element>(selector: string, parent?: Element): A | null;
  };
/** Query-selects all elements. */
export const qa =
  (($: string, parent = document.body) => [...parent.querySelectorAll($)]) as {
    <A extends keyof Html>(tag: A, parent?: HTMLElement): Html[A][];
    <A extends keyof Svg>(tag: A, parent?: SVGElement): Svg[A][];
    <A extends string>(
      selector: A,
      parent?: HTMLElement,
    ): Either<Html, Svg, Trim<List<A>>>[];
    <A extends string>(
      selector: A,
      parent?: SVGElement,
    ): Either<Svg, Html, Trim<List<A>>>[];
    <A extends Element>(selector: string, parent?: Element): A[];
  };
