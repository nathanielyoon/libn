/** Tag name. */
export type Tag = keyof HTMLElementTagNameMap;
/** Modifiable HTML attributes. */
export type Writable<A extends Tag> = HTMLElementTagNameMap[A] extends infer B
  ? B extends HTMLElement ? Pick<
      B,
      keyof {
        [C in keyof B]: (<D>() => D extends { [_ in C]: B[C] } ? 1 : 0) extends
          (<D>() => D extends { -readonly [_ in C]: B[C] } ? 1 : 0) ? C : never;
      }
    >
  : never
  : never;
