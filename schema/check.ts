import {
  type Data,
  type Fail,
  FORMAT,
  type Intersect,
  type Type,
} from "./json.ts";

const add = (key: string, value: unknown) =>
  `E.add({where:P,what:I,why:${JSON.stringify([key, value])}});`;
const base = <A extends Type>(not: string, map: ($: Data<A>) => string) => ({
  type: () => not,
  const: ($: Data<A>) => `I!==${JSON.stringify($)}`,
  enum: ($: readonly Data<A>[]) =>
    `!${RegExp("^(?:" + $.map(map).join("|") + ")$")}.test(JSON.stringify(I))`,
});
const infix = <A extends { [operation: string]: string }>(operations: A) =>
  (Object.keys(operations) as (keyof A)[]).reduce((to, key) => {
    to[key] = ($: number) => `I${operations[key]}${$}`;
    return to;
  }, {} as { [_ in keyof A]: ($: number) => string });
const KEYWORDS: {
  [A in Type as A["type"]]: Intersect<
    A extends {} ? { [B in keyof A]-?: ($: NonNullable<A[B]>) => string }
      : never
  >;
} = {
  boolean: base('typeof I!=="boolean"', ($) => `${$}`),
  integer: {
    ...base("!Number.isInteger(I)", ($) => `${$}`.replaceAll("+", "\\+")),
    ...infix({ minimum: "<", maximum: ">", multipleOf: "%" }),
  },
  number: {
    ...base("!Number.isFinite(I)", ($) => `${$}`.replace(/[+.]/g, "\\$&")),
    ...infix({ minimum: "<", maximum: ">", multipleOf: "%" }),
  },
  string: {
    ...base(
      'typeof I!=="string"',
      ($) =>
        JSON.stringify($).replace(/[$(-+./?[-^{|}]/g, "\\$&").replace(
          /[\p{C}\p{Z}]/gu,
          ($) => `\\u${$.charCodeAt(0).toString(16).padStart(4, "0")}`,
        ),
    ),
    ...infix({ minLength: ".length<", maxLength: ".length>" }),
    format: ($) => `!${FORMAT[$]}.test(I)`,
    pattern: ($) => `!${$}.test(I)`,
  },
  array: {
    type: () => "!Array.isArray(I)",
    items: ($) =>
      `for(let p=P,i=I,z=0;z<i.length;++z){const P=p+"/"+z,I=i[z];${all($)}}`,
    ...infix({ minItems: ".length<", maxItems: ".length>" }),
    uniqueItems: () => "new Set(I).size!==I.length", // only primitives
  },
  object: {
    type: () => 'typeof I!=="object"||!I||Array.isArray(I)',
    patternProperties: ($) =>
      `for(let p=P,i=I,$=Object.keys(i),z=0;z<$.length;++z)if(/${
        Object.keys($)[0]
      }/.test($[z])){const P=p+"/"+$[z].replaceAll("~","~0").replaceAll("/","~1"),I=i[$[z]];${
        all($[Object.keys($)[0]])
      }}else ${add("additionalProperties", false)}`,
    minProperties: ($) => `Object.keys(I).length<${$}`,
    maxProperties: ($) => `Object.keys(I).length>${$}`,
    properties: ($) =>
      `{const p=P,i=I,$=new Set(Object.keys(i));${
        Object.keys($).reduce((to, key) => {
          const a = JSON.stringify(key);
          return `${to}{const P=p+${
            a.replaceAll("~", "~0").replaceAll("/", "~1").replace('"', '"/')
          },I=i[${a}];if(I!=null)${all($[key])}$.delete(${a})}`;
        }, "")
      }$.size&&${add("additionalProperties", false)}}`,
    required: ($) =>
      $.reduce(
        (to, key) => `${to}I[${JSON.stringify(key)}]??${add("required", key)}`,
        "",
      ),
    additionalProperties: () => "", // checked by other keywords
  },
};
const all = ($: Type) =>
  Object.keys($).reduce((to, key) => { // @ts-expect-error: union is too narrow
    const a = $[key], b = KEYWORDS[$.type][key](a);
    return key === "type"
      ? `${b}else{${to}}`
      : typeof a !== "object" || key === "enum"
      ? `${to}if(${b})${add(key, a)}`
      : to + b;
  }, "");
export const checker = <A extends Type>(
  $: A,
): ($: unknown) => Data<A> | Fail<A> =>
  Function("I", `const E=new Set();let P="";${all($)}return E.size?E:I`) as any;
