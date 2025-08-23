import { no, ok, type Or } from "../fp.ts";
import type { Base, Data, Fail, Formats, Tuple, Type } from "./schema.ts";

const date = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const time = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;
/** Defined patterns. */
export const REGEXES = {
  date,
  time,
  "date-time": RegExp(`${date.source.slice(0, -1)}T${time.source.slice(1)}$`),
  duration:
    /^-?P(?=T?\d)(?:\d+Y)?(?:\d+M)?(?:\d+[DW])?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/,
  email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
  uri: /^[^#/:?]+:(?:\/\/[^\/?#]*)?[^#?]*(?:\?[^#]*)?(?:#.*)?$/,
  uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
  base16: /^[\dA-Fa-f]*$/,
  base32: /^[2-7A-Za-z]*$/,
  base32hex: /^[\dA-Va-v]*$/,
  base64: /^[+\d=A-Za-z]*$/,
  base64url: /^[\w-]*$/,
} satisfies { [_ in keyof Formats | Base]: RegExp };
const GUARDS = {
  boolean: 'typeof I!=="boolean"',
  integer: "!Number.isSafeInteger(I)",
  number: "!Number.isFinite(I)",
  string: 'typeof I!=="string"||I!==I.normalize("NFC")',
  array: "!Array.isArray(I)",
  object: 'typeof I!=="object"||!I||Array.isArray(I)',
} satisfies { [_ in Type["type"]]: string };
const OPERATIONS = [
  ["minLength", "I.length<"],
  ["maxLength", "I.length>"],
  ["minimum", "I<"],
  ["maximum", "I>"],
  ["exclusiveMinimum", "I<="],
  ["exclusiveMaximum", "I>="],
  ["multipleOf", "I%"],
  ["minProperties", "Object.keys(I).length<"],
  ["maxProperties", "Object.keys(I).length>"],
  ["minItems", "I.length<"],
  ["maxItems", "I.length>"],
] satisfies Tuple<
  Type extends infer A
    ? A extends Type
      ? keyof A extends infer B
        ? B extends keyof A ? A[B] extends number | undefined ? [B, string]
          : never
        : never
      : never
    : never
    : never
>;
const add = <A extends {}>(key: string, value: A | undefined, is: string) =>
  value != null ? `${is && `if(${is})`}E.${key}=${JSON.stringify(value)};` : "";
const regex = (pattern: string | RegExp | undefined, test = "I") => {
  try {
    if (pattern) return `!${RegExp(pattern)}.test(${test})`;
  } catch {}
  return "";
};
const enums = <A>(map: ($: A) => string, $: readonly A[] | undefined) =>
  add("enum", $, regex(`^(?:${$?.map(map).join("|")})$`, "JSON.stringify(I)"));
const validators = ($: Type) => {
  let a = "", b, z: number = OPERATIONS.length;
  do b = $[OPERATIONS[--z][0] as keyof typeof $],
    b !== undefined &&
    (a += add(OPERATIONS[z][0], b, OPERATIONS[z][1] + b)); while (z);
  switch ($.kind) {
    case "bit":
      a += add("enum", $.enum, `I!==${$.enum?.[0]}`);
      break;
    case "int":
    case "num":
      a += enums(($) => `${$}`.replace(/[+.]/g, "\\$&"), $.enum);
      break;
    case "fmt":
      a += add("format", $.format, regex(REGEXES[$.format]));
      a += add("pattern", $.pattern, regex($.pattern));
      break;
    case "bin":
      a += add(
        "contentEncoding",
        $.contentEncoding,
        regex(REGEXES[$.contentEncoding]),
      ), a += add("pattern", $.pattern, regex($.pattern));
      break;
    case "str":
      a += enums(($) =>
        JSON.stringify($).replace(/[$(-+./?[-^{|}]/g, "\\$&")
          .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, ($) =>
            `\\u${$.charCodeAt(0).toString(16).padStart(4, "0")}`), $.enum);
      a += add("pattern", $.pattern, regex($.pattern));
      break;
    case "ord":
      a += "const p=P,i=I;";
      do a += `{const P=p+"/${z}",I=i[${z}];${
        validators($.prefixItems[z])
      }}`; while (++z < $.prefixItems.length);
      break;
    case "vec":
    case "arr":
      a += `for(let p=P,i=I,z=0;z<i.length;++z){const P=p+"/"+z,I=i[z];${
        validators($.items)
      }}`;
      "uniqueItems" in $ && $.uniqueItems &&
        (a += add("uniqueItems", $.uniqueItems, "new Set(I).size!==I.length"));
      break;
    case "map":
      [b] = Object.keys($.patternProperties);
      a += `for(let p=P,i=I,$=Object.keys(i),z=0;z<$.length;++z)${
        add("additionalProperties", false, regex(b, "$[z]") || "1")
      }else{const P=p+"/"+$[z].replaceAll("~","~0").replaceAll("/","~1"),I=i[$[z]];${
        validators($.patternProperties[b])
      }}`;
      break;
    case "obj":
      a += "const p=P,i=I;";
      $.additionalProperties === false &&
      (a += `const $=new Set(Object.keys(i));`), z = 0;
      for (let c = Object.keys($.properties); z < c.length; a += "}", ++z) {
        const d = JSON.stringify(c[z]);
        a += `{const P=p+"/${
          d.replaceAll("~", "~0").replaceAll("/", "~1").slice(1)
        },I=i[${d}];if(I!==undefined)${validators($.properties[c[z]])}`;
        $.required.includes(c[z]) &&
          (a += `else (E.required??=[]).push(${d});`);
        $.additionalProperties === false && (a += `$.delete(${d});`);
      }
      $.additionalProperties === false &&
        (a += add("additionalProperties", $.additionalProperties, "$.size"));
      break;
  }
  return `if(${
    GUARDS[$.type]
  })N.push({path:P,value:I,errors:{type:"${$.type}"}});else{const E={};${a}Object.keys(E).length&&N.push({path:P,value:I,errors:E})}`;
};
/** Creates a validating function. */
export const validator = <A extends Type>(
  $: A,
): ($: unknown) => Or<Data<A>, Fail<A>[]> =>
  Function(
    "I",
    `const N=[];let P="";${validators($)}return N.length?this.no(N):this.ok(I)`,
  ).bind({ no, ok });
