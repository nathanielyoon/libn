type Html = keyof HTMLElementTagNameMap;
type Svg = keyof SVGElementTagNameMap;
type Trim<A extends string> = A extends `${any}${" " | ">"}${infer B}` ? Trim<B>
  : A extends `${infer B}${"#" | "." | "[" | ":"}${any}` ? Trim<B>
  : A extends Html ? HTMLElementTagNameMap[A]
  : A extends Svg ? SVGElementTagNameMap[A]
  : never;
type TrimSvgFirst<A extends string> = A extends `${any}${" " | ">"}${infer B}`
  ? TrimSvgFirst<B>
  : A extends `${infer B}${"#" | "." | "[" | ":"}${any}` ? TrimSvgFirst<B>
  : A extends Svg ? SVGElementTagNameMap[A]
  : A extends Html ? HTMLElementTagNameMap[A]
  : never;
/** Query-selects an element. */
export const qs =
  (($: string, parent = document.body) => parent.querySelector($)) as {
    <A extends Svg>(tag: A, parent: SVGElement): SVGElementTagNameMap[A] | null;
    <A extends Html>(tag: A, parent?: Element): HTMLElementTagNameMap[A] | null;
    <A extends Svg>(tag: A, parent?: Element): SVGElementTagNameMap[A] | null;
    <A extends string>(selector: A, parent: SVGElement): TrimSvgFirst<A> | null;
    <A extends string>(selector: A, parent?: Element): Trim<A> | null;
    <A extends Element>(selector: string, parent?: Element): A | null;
  };
/** Query-selects all elements. */
export const qa =
  (($: string, parent = document.body) => [...parent.querySelectorAll($)]) as {
    <A extends Svg>(tag: A, parent: SVGElement): SVGElementTagNameMap[A][];
    <A extends Html>(tag: A, parent?: Element): HTMLElementTagNameMap[A][];
    <A extends Svg>(tag: A, parent?: Element): SVGElementTagNameMap[A][];
    <A extends string>(selector: A, parent: SVGElement): TrimSvgFirst<A>[];
    <A extends string>(selector: A, parent?: Element): Trim<A>[];
    <A extends Element>(selector: string, parent?: Element): A[];
  };
