/** Format patterns. */
export const FORMAT = {
  "date-time":
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/,
  email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
  pkey: /^~[-\w]{43}$/,
  skey: /^\.[-\w]{43}$/,
  uri: /^[^#/:?]+:(?:\/\/[^#/?]*)?[^#?]*(?:\?[^#]*)?(?:#.*)?/,
};
type Meta = {
  boolean: { enum?: readonly [boolean] };
  number: {
    enum?: readonly [number, ...number[]];
    min_value?: number;
    max_value?: number;
    step?: number;
  };
  string: {
    enum?: readonly [string, ...string[]];
    min_length?: number;
    max_length?: number;
    format?: keyof typeof FORMAT;
    pattern?: RegExp;
  };
  array: {
    items?: Type;
    min_items?: number;
    max_items?: number;
    unique_items?: boolean;
  };
  object: { properties?: { [key: string]: Type }; unique_properties?: boolean };
};
/** Type definition. */
export type Type<A extends keyof Meta = keyof Meta> = A extends any
  ? { kind: A; nullable?: boolean } & Meta[A]
  : never;
/** Typed data. */
export type Data<A extends Type> = (
  | (A extends { enum: readonly (infer B)[] } ? B
    : A["kind"] extends "boolean" ? boolean
    : A["kind"] extends "number" ? number
    : A extends { format: infer B extends keyof typeof FORMAT }
      ? B extends "date-time"
        ? `${number}-${number}-${number}T${number}:${number}:${number}${
          | `.${number}`
          | ""}Z`
      : B extends "email" ? `${string}@${string}.${string}`
      : B extends `${infer C}key` ? `${C extends "p" ? "~" : "."}${string}`
      : B extends "uri" ? `${string}:${string}`
      : never
    : A["kind"] extends "string" ? string
    : A extends { items: infer B extends Type } ? readonly Data<B>[]
    : A extends { kind: "array" } ? readonly unknown[]
    : A extends { properties: infer B extends { [key: string]: Type } }
      ? { [C in keyof B]: Data<B[C]> }
    : A extends { kind: "object" } ? { [key: string]: unknown }
    : never)
  | (A["nullable"] extends true ? null : never)
) extends infer B ? B extends any ? B : never : never;
type Esc<A extends PropertyKey, B extends number, C> = C extends
  `${infer D}${A & string}${infer F}` ? `${D}~${B}${Esc<A, B, F>}` : C & string;
/** Error indicators. */
export type Fail<A extends Type, B extends string = ""> = (
  | ({
    [C in keyof A]-?: A[C] extends infer D extends Type
      ? Fail<D, `${B}/${number}`>
      : A[C] extends infer D extends { [key: string]: Type } ? {
          [E in keyof D]: Fail<D[E], `${B}/${Esc<"/", 1, Esc<"~", 0, E>>}`>;
        }[keyof D]
      : { path: B; data: unknown; error: readonly [C, A[C]] };
  }[keyof A])
  | (A["nullable"] extends true ? never
    : { path: B; data: null | undefined; error: readonly ["nullable", false] })
) extends infer C ? C extends {} ? C : never : never;
type With<A extends Type, B extends PropertyKey, C> =
  Omit<A, B> & { [_ in B]-?: C } extends infer D
    ? D extends {} ? { [E in keyof D]: D[E] } : never
    : never;
/** Type builder. */
export type Typer<A extends Type> =
  & {
    [C in keyof Omit<Type<A["kind"]>, keyof A>]-?: Type<A["kind"]>[C] extends
      infer D ? boolean extends D ? () => Typer<With<A, C, true>>
      : Type extends D ? <E extends Type>($: Typer<E>) => Typer<With<A, C, E>>
      : { [key: string]: Type } extends D ? <E extends { [key: string]: Type }>(
          $: { [F in keyof E]: Typer<E[F]> },
        ) => Typer<With<A, C, E>>
      : <const E extends NonNullable<D>>($: E) => Typer<With<A, C, E>>
      : never;
  }
  & { build: () => (($: unknown) => Data<A> | Set<Fail<A>>) & { type: A } };
const push = (key: string, value: unknown) =>
  `E.add({path:P,data:I,error:["${key}",${
    value instanceof RegExp ? value : JSON.stringify(value)
  }]});`;
const builder = <A extends Type["kind"]>(
  kind: A,
  not: {
    [B in Exclude<keyof Type<A>, "nullable">]: B extends "kind" ? string
      : boolean extends Type<A>[B] ? readonly string[]
      : ($: NonNullable<Type<A>[B]>) => readonly string[];
  },
): any => {
  const a: { [_: string]: any } = { kind, nullable: false }, b: string[] = [];
  const c = () =>
    `if(I==null)${
      a.nullable ? "O=null;" : push("nullable", false)
    }else if(${not.kind})${push("kind", a.kind)}else{${b.join("")}}`;
  return Object.assign(
    {
      nullable() {
        return a.nullable = true, this;
      },
      toString: c,
      build: () =>
        Object.assign(
          Function(
            "I",
            `let P="",O,$;const E=new Set();${c()}return E.size?E:O`,
          ),
          { value: a },
        ),
    },
    ...Object.entries(not).map(([key, value]) => ({
      [key]($: any) {
        b.push((Array.isArray(value) ? value : value($))
          .join(push(key, a[key] = $ ?? true)));
        return this;
      },
    })),
  );
};
const enumer = <A>(map: ($: A) => string) => ($: readonly A[]) =>
  [`/^(?:${$.map(map).join("|")})$/.test(JSON.stringify(I))||`, ""] as const;
const operator = (infix: string) => ($: number) => [`I${infix}${$}&&`, ""];
/** Creates a boolean type. */
export const boolean = (): Typer<{ kind: "boolean" }> =>
  builder("boolean", {
    kind: 'typeof (O=I)!=="boolean"',
    enum: ($) => [`I===${$[0]}||`, ""],
  });
/** Creates a number type. */
export const number = (): Typer<{ kind: "number" }> =>
  builder("number", {
    kind: "!Number.isFinite(O=I)",
    enum: enumer(($) => JSON.stringify($).replaceAll("+", "\\+")),
    min_value: operator("<"),
    max_value: operator(">"),
    step: operator("%"),
  });
/** Creates a string type. */
export const string = (): Typer<{ kind: "string" }> =>
  builder("string", {
    kind: 'typeof (O=I)!=="string"||I!==I.normalize()',
    enum: enumer(($) =>
      JSON.stringify($).replace(/[$(-+./?[-^{|}]/g, "\\$&").replace(
        /\p{C}|\p{Z}/gu,
        ($) => `\\u${$.charCodeAt(0).toString(16).padStart(4, "0")}`,
      )
    ),
    min_length: operator(".length<"),
    max_length: operator(".length>"),
    format: ($) => [`${FORMAT[$]}.test(I)||`, ""],
    pattern: ($) => [`${$}.test(I)||`, ""],
  });
/** Creates an array type. */
export const array = (): Typer<{ kind: "array" }> =>
  builder("array", {
    kind:
      "O=I,!Array.isArray(I)&&!(()=>{try{return Array.isArray(I=JSON.parse(I))}catch{}})()",
    items: ($) => [
      `for(let z=0,p=P,i=I,o=O=[];z<i.length;++z){const P=p+"/"+z,I=i[z];let O;${$}o.push(O)}`,
    ],
    min_items: operator(".length<"),
    max_items: operator(".length>"),
    unique_items: [
      "{const i=new Set();for(let z=0;z<O.length;++z)i.add(JSON.stringify(O[z]));if(i.size!==O.length)",
      "}",
    ],
  });
/** Creates an object type. */
export const object = (): Typer<{ kind: "object" }> =>
  builder("object", {
    kind: 'O=I,typeof I!=="object"||!I||Array.isArray(I)',
    properties: ($) => [
      `{const p=P,i=I,o=O={};${
        Object.keys($).reduce((all, key) =>
          `${all}{const P=p+${
            JSON.stringify(
              "/" + key.replaceAll("~", "~0").replaceAll("/", "~1"),
            )
          },I=i[${JSON.stringify(key)}];let O;${$[key]}o[${
            JSON.stringify(key)
          }]=O}`, "")
      }}`,
    ],
    unique_properties: ["new Set($=Object.values(O)).size!==$.length&&", ""],
  });
