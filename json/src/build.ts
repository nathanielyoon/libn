import type { Base, Format, Type } from "./types.ts";

type Un<A extends Type, B extends keyof A> = Omit<A, B> extends infer C
  ? C extends {} ? { [D in keyof C]: C[D] } : never
  : never;
type To<A extends Type, B extends keyof A, C> =
  Omit<A, B> & { [_ in B]-?: C } extends infer D
    ? D extends {} ? { [E in keyof D]: D[E] } : never
    : never;
abstract class Typer<A extends Type, B> {
  constructor(public type: A) {}
  protected abstract get child(): { new (type: A): B };
  protected to<C extends keyof A, D>(key: C, value: D): B {
    if (value === undefined) {
      const { [key]: _, ...type } = this.type;
      return new this.child(type as Un<A, C>);
    }
    return new this.child({ ...this.type, [key]: value } as To<A, C, D>);
  }
}
class Booleaner<A extends Type<"boolean"> = Type<"boolean">>
  extends Typer<A, Booleaner> {
  protected get child(): { new (type: Type<"boolean">): Booleaner } {
    return Booleaner;
  }
  title(): Booleaner<Un<A, "title">>;
  title<const B extends string>($: B): Booleaner<To<A, "title", B>>;
  title($?: string): Booleaner {
    return this.to("title", $);
  }
  description(): Booleaner<Un<A, "description">>;
  description<const B extends string>($: B): Booleaner<To<A, "description", B>>;
  description($?: string): Booleaner {
    return this.to("description", $);
  }
  enum(): Booleaner<Un<A, "enum">>;
  enum<const B extends [boolean]>($: B): Booleaner<To<A, "enum", B>>;
  enum($?: [boolean]): Booleaner {
    return this.to("enum", $);
  }
}
class Numberer<A extends Type<"number"> = Type<"number">>
  extends Typer<A, Numberer> {
  protected get child(): { new (type: Type<"number">): Numberer } {
    return Numberer;
  }
  title(): Numberer<Un<A, "title">>;
  title<const B extends string>(): Numberer<To<A, "title", B>>;
  title($?: string): Numberer {
    return this.to("title", $);
  }
  description(): Numberer<Un<A, "description">>;
  description<const B extends string>(): Numberer<To<A, "description", B>>;
  description($?: string): Numberer {
    return this.to("description", $);
  }
  enum(): Numberer<Un<A, "enum">>;
  enum<const B extends [number, ...number[]]>($: B): Numberer<To<A, "enum", B>>;
  enum($?: number[]): Numberer {
    return this.to("enum", $);
  }
  minimum(): Numberer<Un<A, "minimum">>;
  minimum<const B extends number>($: B): Numberer<To<A, "minimum", B>>;
  minimum($?: number): Numberer {
    return this.to("minimum", $);
  }
  maximum(): Numberer<Un<A, "maximum">>;
  maximum<const B extends number>($: B): Numberer<To<A, "maximum", B>>;
  maximum($?: number): Numberer {
    return this.to("maximum", $);
  }
  exclusiveMinimum(): Numberer<Un<A, "exclusiveMinimum">>;
  exclusiveMinimum<const B extends number>(
    $: B,
  ): Numberer<To<A, "exclusiveMinimum", B>>;
  exclusiveMinimum($?: number): Numberer {
    return this.to("exclusiveMinimum", $);
  }
  exclusiveMaximum(): Numberer<Un<A, "exclusiveMaximum">>;
  exclusiveMaximum<const B extends number>(
    $: B,
  ): Numberer<To<A, "exclusiveMaximum", B>>;
  exclusiveMaximum($?: number): Numberer {
    return this.to("exclusiveMaximum", $);
  }
  multipleOf(): Numberer<Un<A, "multipleOf">>;
  multipleOf<const B extends number>($: B): Numberer<To<A, "multipleOf", B>>;
  multipleOf($?: number): Numberer {
    return this.to("multipleOf", $);
  }
}
class Stringer<A extends Type<"string"> = Type<"string">>
  extends Typer<A, Stringer> {
  protected get child(): { new (type: Type<"string">): Stringer } {
    return Stringer;
  }
  title(): Stringer<Un<A, "title">>;
  title<const B extends string>($: B): Stringer<To<A, "title", B>>;
  title($?: string): Stringer {
    return this.to("title", $);
  }
  description(): Stringer<Un<A, "description">>;
  description<const B extends string>($: B): Stringer<To<A, "description", B>>;
  description($?: string): Stringer {
    return this.to("description", $);
  }
  enum(): Stringer<Un<A, "enum">>;
  enum<const B extends [string, ...string[]]>($: B): Stringer<To<A, "enum", B>>;
  enum($?: string[]): Stringer {
    return this.to("enum", $);
  }
  minLength(): Stringer<Un<A, "minLength">>;
  minLength<const B extends number>($: B): Stringer<To<A, "minLength", B>>;
  minLength($?: number): Stringer {
    return this.to("minLength", $);
  }
  maxLength(): Stringer<Un<A, "maxLength">>;
  maxLength<const B extends number>($: B): Stringer<To<A, "maxLength", B>>;
  maxLength($?: number): Stringer {
    return this.to("maxLength", $);
  }
  contentEncoding(): Stringer<Un<A, "contentEncoding">>;
  contentEncoding<const B extends Base>(
    $: B,
  ): Stringer<To<A, "contentEncoding", B>>;
  contentEncoding($?: Base): Stringer {
    return this.to("contentEncoding", $);
  }
  format(): Stringer<Un<A, "format">>;
  format<const B extends Format>($: B): Stringer<To<A, "format", B>>;
  format($?: Format): Stringer {
    return this.to("format", $);
  }
  pattern(): Stringer<Un<A, "pattern">>;
  pattern<const B extends string>($: B): Stringer<To<A, "pattern", B>>;
  pattern($?: string): Stringer {
    return this.to("pattern", $);
  }
}
class Arrayer<A extends Type<"array"> = Type<"array">>
  extends Typer<A, Arrayer> {
  protected get child(): { new (type: Type<"array">): Arrayer } {
    return Arrayer;
  }
  title(): Arrayer<Un<A, "title">>;
  title<const B extends string>($: B): Arrayer<To<A, "title", B>>;
  title($?: string): Arrayer {
    return this.to("title", $);
  }
  description(): Arrayer<Un<A, "description">>;
  description<const B extends string>($: B): Arrayer<To<A, "description", B>>;
  description($?: string): Arrayer {
    return this.to("description", $);
  }
  items(): Arrayer<Un<A, "items">>;
  items<const B extends Type>($: { type: B }): Arrayer<To<A, "items", B>>;
  items($?: { type: Type }): Arrayer {
    return this.to("items", $?.type);
  }
  minItems(): Arrayer<Un<A, "minItems">>;
  minItems<const B extends number>($: B): Arrayer<To<A, "minItems", B>>;
  minItems($?: number): Arrayer {
    return this.to("minItems", $);
  }
  maxItems(): Arrayer<Un<A, "maxItems">>;
  maxItems<const B extends number>($: B): Arrayer<To<A, "maxItems", B>>;
  maxItems($?: number): Arrayer {
    return this.to("maxItems", $);
  }
  uniqueItems(): Arrayer<To<A, "uniqueItems", true>>;
  uniqueItems<const B extends boolean>($: B): Arrayer<To<A, "uniqueItems", B>>;
  uniqueItems($?: boolean): Arrayer {
    return this.to("uniqueItems", $ ?? true);
  }
}
class Objecter<A extends Type<"object"> = Type<"object">>
  extends Typer<A, Objecter> {
  protected get child(): { new (type: Type<"object">): Objecter } {
    return Objecter;
  }
  title(): Objecter<Un<A, "title">>;
  title<const B extends string>($: B): Objecter<To<A, "title", B>>;
  title($?: string): Objecter {
    return this.to("title", $);
  }
  description(): Objecter<Un<A, "description">>;
  description<const B extends string>($: B): Objecter<To<A, "description", B>>;
  description($?: string): Objecter {
    return this.to("description", $);
  }
  properties(): Objecter<Un<A, "properties">>;
  properties<const B extends { [key: string]: Type }>(
    $: { [C in keyof B]: { type: B[C] } },
  ): Objecter<To<A, "properties", B>>;
  properties($?: { [key: string]: { type: Type } }): Objecter {
    if (!$) return this.to("properties", $);
    const properties: { [key: string]: Type } = {};
    for (let keys = Object.keys($), z = 0; z < keys.length; ++z) {
      properties[keys[z]] = $[keys[z]].type;
    }
    return this.to("properties", properties);
  }
  required(): Objecter<
    To<
      A,
      "required",
      A extends { properties: infer B } ? string extends keyof B ? string[]
        : readonly (keyof B & string)[]
        : readonly []
    >
  >;
  required<
    const B extends A extends { properties: infer C }
      ? readonly (keyof C & string)[]
      : readonly [],
  >($: B): Objecter<To<A, "required", B>>;
  required($?: string[]): Objecter {
    return this.to("required", $ ?? Object.keys(this.type.properties ?? {}));
  }
  minProperties(): Objecter<Un<A, "minProperties">>;
  minProperties<const B extends number>(
    $: B,
  ): Objecter<To<A, "minProperties", B>>;
  minProperties($?: number): Objecter {
    return this.to("minProperties", $);
  }
  maxProperties(): Objecter<Un<A, "maxProperties">>;
  maxProperties<const B extends number>(
    $: B,
  ): Objecter<To<A, "maxProperties", B>>;
  maxProperties($?: number): Objecter {
    return this.to("maxProperties", $);
  }
  additionalProperties(): Objecter<To<A, "additionalProperties", true>>;
  additionalProperties<const B extends boolean>(
    $: B,
  ): Objecter<To<A, "additionalProperties", B>>;
  additionalProperties($?: boolean): Objecter {
    return this.to("additionalProperties", $ ?? true);
  }
}
/** Creates a boolean schema. */
export const boolean = (): Booleaner<{ type: "boolean" }> =>
  new Booleaner({ type: "boolean" });
/** Creates a number schema. */
export const number = (): Numberer<{ type: "number" }> =>
  new Numberer({ type: "number" });
/** Creates a string schema. */
export const string = (): Stringer<{ type: "string" }> =>
  new Stringer({ type: "string" });
/** Creates an array schema. */
export const array = (): Arrayer<{ type: "array" }> =>
  new Arrayer({ type: "array" });
/** Creates an object schema. */
export const object = (): Objecter<{ type: "object" }> =>
  new Objecter({ type: "object" });
