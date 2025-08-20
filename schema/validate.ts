import type { Data, Fail, Intersect, Kind, Type } from "./json.ts";

const add = (key: string, value: unknown) =>
  `E.add({expected:${JSON.stringify([key, value])},received:[P,I]});`;
const enumer = <A>(map: ($: A) => string) => ($: readonly A[]) =>
  `!${RegExp("^(?:" + $.map(map).join("|") + ")$")}.test(JSON.stringify(I))`;
const infix = <A extends { [operation: string]: string }>(operations: A) =>
  (Object.keys(operations) as (keyof A)[]).reduce((to, key) => {
    to[key] = ($: number) => `I${operations[key]}${$}`;
    return to;
  }, {} as { [_ in keyof A]: ($: number) => string });
const date = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const time = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;
const REGEXES = {
  date,
  time,
  "date-time": RegExp(`${date.source.slice(0, -1)}T${time.source.slice(1)}$`),
  email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
  uri: /^[^#/:?]+:(?:\/\/[^\/?#]*)?[^#?]*(?:\?[^#]*)?(?:#.*)?$/,
  uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
  pkey: /^~[-\w]{43}$/,
  skey: /^\.[-\w]{43}$/,
};
const KEYWORDS: {
  [A in Kind]: Type<A> extends infer B ? B extends {} ? Intersect<
        {
          [C in Exclude<keyof B, "title" | "description" | "kind">]-?: (
            $: NonNullable<B[C]>,
          ) => string;
        }
      >
    : never
    : never;
} = {
  bit: { type: () => 'typeof I!=="boolean"', enum: ($) => `I!==${$}` },
  int: {
    type: () => "!Number.isSafeInteger(I)",
    enum: enumer(($) => `${$}`.replaceAll("+", "\\+")),
    ...infix({ minimum: "<", maximum: ">", multipleOf: "%" }),
  },
  num: {
    type: () => "!Number.isFinite(I)",
    enum: enumer(($) => `${$}`.replace(/[+.]/g, "\\$&")),
    ...infix({ minimum: "<", maximum: ">", multipleOf: "%" }),
  },
  str: {
    type: () => 'typeof I!=="string"||I!==I.normalize("NFC")',
    ...infix({ minLength: ".length<", maxLength: ".length>" }),
    format: ($) => `!${REGEXES[$]}.test(I)`,
    pattern: ($) => `!${RegExp($)}.test(I)`,
  },
  txt: {
    type: () => 'typeof I!=="string"||I!==I.normalize("NFC")',
    enum: enumer(($) =>
      JSON.stringify($).replace(/[$(-+./?[-^{|}]/g, "\\$&").replace(
        /[\p{C}\p{Z}]/gu,
        ($) => `\\u${$.charCodeAt(0).toString(16).padStart(4, "0")}`,
      )
    ),
    ...infix({ minLength: ".length<", maxLength: ".length>" }),
    pattern: ($) => `!${RegExp($)}.test(I)`,
  },
  vec: {
    type: () => "!Array.isArray(I)",
    items: ($) =>
      `for(let p=P,i=I,z=0;z<i.length;++z){const P=p+"/"+z,I=i[z];${
        keywords($)
      }}`,
    ...infix({ minItems: ".length<", maxItems: ".length>" }),
    uniqueItems: () => "new Set(I).size!==I.length", // only primitives
  },
  arr: {
    type: () => "!Array.isArray(I)",
    items: ($) =>
      `for(let p=P,i=I,z=0;z<i.length;++z){const P=p+"/"+z,I=i[z];${
        keywords($)
      }}`,
    ...infix({ minItems: ".length<", maxItems: ".length>" }),
  },
  map: {
    type: () => 'typeof I!=="object"||!I||Array.isArray(I)',
    patternProperties: ($) =>
      `for(let p=P,i=I,$=Object.keys(i),z=0;z<$.length;++z)if(/${
        Object.keys($)[0]
      }/.test($[z])){const P=p+"/"+$[z].replaceAll("~","~0").replaceAll("/","~1"),I=i[$[z]];${
        keywords($[Object.keys($)[0]])
      }}else ${add("additionalProperties", false)}`,
    minProperties: ($) => `Object.keys(I).length<${$}`,
    maxProperties: ($) => `Object.keys(I).length>${$}`,
    additionalProperties: () => "", // checked by patternProperties
  },
  obj: {
    type: () => 'typeof I!=="object"||!I||Array.isArray(I)',
    properties: ($) =>
      `{const p=P,i=I,$=new Set(Object.keys(i));${
        Object.keys($).reduce((to, key) => {
          const a = JSON.stringify(key);
          return `${to}{const P=p+${
            a.replaceAll("~", "~0").replaceAll("/", "~1").replace('"', '"/')
          },I=i[${a}];if(I!=null){${keywords($[key])}}$.delete(${a})}`;
        }, "")
      }$.size&&${add("additionalProperties", false)}}`,
    required: ($) =>
      $.reduce(
        (to, key) => `${to}I[${JSON.stringify(key)}]??${add("required", key)}`,
        "",
      ),
    additionalProperties: () => "", // checked by properties
  },
};
const keywords = ($: Type) =>
  Object.keys($).reduce((to, key) => { // @ts-expect-error: union is too narrow
    const a = $[key], b = KEYWORDS[$.kind][key]?.(a);
    return key === "type"
      ? `if(${b})${add(key, a)}else{${to}}`
      : typeof a === "object" && key !== "enum" || !b
      ? to + b
      : `${to}if(${b})${add(key, a)}`;
  }, "");
/** Creates a validating function. */
export const validator = <A extends Type>(
  $: A,
): ($: unknown) => Data<A> | Set<Fail<A>> =>
  Function(
    "I",
    `const E=new Set();let P="";${keywords($)}return E.size?E:I`,
  ) as any;
