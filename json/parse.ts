import { unrexp } from "@libn/text/normalize";
import type { Or } from "@libn/fp/or";
import { B16, B32, B64, H32, U64 } from "@libn/base";
import type { Base, Data, Fail, Format, Type } from "./schema.ts";
import { flat } from "@libn/json/build";

/** Content encoding patterns. */
export const BASES: { [_ in Base]: RegExp } = {
  base16: B16,
  base32: B32,
  base32hex: H32,
  base64: B64,
  base64url: U64,
};
/** Format patterns. */
export const FORMATS: { [_ in Format]: RegExp } = /* @__PURE__ */ (() => {
  const date = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;
  return {
    date,
    time,
    "date-time": RegExp(`${date.source.slice(0, -1)}T${time.source.slice(1)}$`),
    email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
    uri: /^[^\s#/:?]+:(?:\/\/[^\s\/?#]*)?[^\s#?]*(?:\?[^\s#]*)?(?:#\S*)?$/,
    uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
  };
})();
const NOT = {
  boolean: 'typeof raw!=="boolean"',
  number: "!Number.isFinite(raw)",
  string: `typeof raw!=="string"||raw!==raw.normalize()`,
  array: "!Array.isArray(raw)",
  object: 'typeof raw!=="object"||!raw||Array.isArray(raw)',
};
const add = (key: PropertyKey, value: {}) =>
  `errors.push({path,raw,error:${JSON.stringify([key, value])}});`;
const not = <A extends Type>($: A, key: keyof A, pre?: string, and = "") =>
  // deno-lint-ignore eqeqeq
  $[key] == null ? "" : `${and ? pre : `if(${pre})`}${add(key, $[key])}${and}`;
const parsers = ($: Type): string => {
  let a = not($, "type", `if(${NOT[$.type]})`, "else{"), z;
  if ("enum" in $) {
    a += "if(!/^(?:", z = 0;
    do a += unrexp(JSON.stringify($.enum[z])); while (
      ++z < $.enum.length && (a += "|")
    );
    a += ")$/.test(JSON.stringify(raw)))" + add("enum", $.enum);
  }
  switch ($.type) {
    case "boolean":
      return a + "data=raw}";
    case "number":
      return a + not($, "minimum", `raw<${$.minimum}`) +
        not($, "maximum", `raw>${$.maximum}`) +
        not($, "exclusiveMinimum", `raw<=${$.exclusiveMinimum}`) +
        not($, "exclusiveMaximum", `raw>=${$.exclusiveMaximum}`) +
        not($, "multipleOf", `raw%${$.multipleOf}`, "") + "data=raw}";
    case "string":
      return a + not($, "minLength", `raw.length<${$.minLength}`) +
        not($, "maxLength", `raw.length>${$.maxLength}`) +
        not($, "contentEncoding", `!${BASES[$.contentEncoding!]}.test(raw)`) +
        not($, "format", `!${FORMATS[$.format!]}.test(raw)`) +
        not($, "pattern", `!${RegExp($.pattern!)}.test(raw)`) + "data=raw}";
    case "array":
      return a +
        ($.items
          ? `for(let p=path+"/",r=raw,d=data=Array(r.length),z=0;z<r.length;++z){const path=p+z,raw=r[z];let data;${
            parsers($.items)
          }d[z]=data}`
          : "data=JSON.parse(JSON.stringify(raw));") +
        not($, "minItems", `raw.length<${$.minItems}`) +
        not($, "maxItems", `raw.length>${$.maxItems}`) + ($.uniqueItems
          ? not(
            $,
            "uniqueItems",
            `for(let s=new Set(),z=0;z<data.length;++z)if(s.size===s.add(JSON.stringify(data[z])).size){`,
            "break}}",
          )
          : "}");
    case "object":
      if ($.properties) {
        const b = $.additionalProperties === false || "";
        a += `const p=path,r=raw,d=data={}${
          b && ",s=new Set(Object.keys(r))"
        };`;
        for (let c = Object.keys($.properties), z = 0; z < c.length; ++z) {
          const d = c[z], e = JSON.stringify(d);
          a += `{const path=p+"/${
            e.slice(1).replaceAll("~", "~0").replaceAll("/", "~1")
          };if(Object.hasOwn(r,${e})){const raw=r[${e}];let data;${
            parsers($.properties[d])
          }d[${e}]=data}${
            $.required?.includes(d)
              ? `else{const path=p,raw=null;${add("required", d)}}`
              : ""
          }${b && `s.delete(${e})`}}`;
        }
        a += b && not($, "additionalProperties", "s.size");
      } else {
        a += "data=JSON.parse(JSON.stringify(raw));";
        if ($.required) {
          for (let z = 0; z < $.required.length; ++z) {
            a += `if(!Object.hasOwn(raw,${
              JSON.stringify($.required[z])
            })){const raw=null;${add("required", $.required[z])}}`;
          }
        }
      }
      return a +
        not($, "minProperties", `Object.keys(data).length<${$.minProperties}`) +
        not($, "maxProperties", `Object.keys(data).length>${$.maxProperties}`) +
        "}";
  }
};
/** Creates a parsing function. */
export const parser = <A extends Type>(
  type: A | { type: A },
): ($: unknown) => Or<Fail, Data<A>> =>
  Function(
    "raw",
    `let path="",data;const errors=[];${
      parsers(flat(type))
    }return errors.length?{state:false,value:errors}:{state:true,value:data}`,
  ) as any;
