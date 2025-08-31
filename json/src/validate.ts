import { no, ok, type Or } from "@nyoon/result";
import type { Base, Data, Fail, Formats, Type } from "./types.ts";

const date = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const time = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;
/** Content encoding patterns. */
export const BASES: { [_ in Base]: RegExp } = {
  base16: /^[\dA-Fa-f]*$/,
  base32: /^[2-7A-Za-z]*$/,
  base32hex: /^[\dA-Va-v]*$/,
  base64: /^[+/\dA-Za-z]*={0,2}$/,
  base64url: /^[\w-]*$/,
};
/** Format patterns. */
export const FORMATS: { [_ in keyof Formats]: RegExp } = {
  date,
  time,
  "date-time": RegExp(`${date.source.slice(0, -1)}T${time.source.slice(1)}$`),
  duration:
    /^-?P(?:\d+Y(?:\d+M)?(?:\d+[DW])?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?|(?:\d+Y)?\d+M(?:\d+[DW])?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?|(?:\d+Y)?(?:\d+M)?\d+[DW](?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?|(?:\d+Y)?(?:\d+M)?(?:\d+[DW])?T\d+H(?:\d+M)?(?:\d+(?:\.\d+)?S)?|(?:\d+Y)?(?:\d+M)?(?:\d+[DW])?T(?:\d+H)?\d+M(?:\d+(?:\.\d+)?S)?|(?:\d+Y)?(?:\d+M)?(?:\d+[DW])?T(?:\d+H)?(?:\d+M)?\d+(?:\.\d+)?S)$/,
  email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
  uri: /^[^#/:?]+:(?:\/\/[^\/?#]*)?[^#?]*(?:\?[^#]*)?(?:#.*)?$/,
  uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
};
const regex = /[$(-+./?[-^{|}]/g;
const NOT = {
  boolean: 'typeof raw!=="boolean"',
  number: "!Number.isFinite(raw)",
  string: `typeof raw!=="string"||raw!==raw.normalize()`,
  array: "!Array.isArray(raw)",
  object: 'typeof raw!=="object"||!raw||Array.isArray(raw)',
};
const add = <A extends Type, B extends keyof A>(
  $: A,
  key: B,
  to: (($: NonNullable<A[B]>) => string) | string,
  end = "",
) =>
  $[key] == null
    ? ""
    : `${
      typeof to === "string" ? `if(${to}${$[key]})` : to($[key])
    }errors.push({path,raw,error:${JSON.stringify([key, $[key]])}});${end}`;
const validate = ($: Type) => {
  let a = add($, "type", ($) => `if(${NOT[$]})`, "else{");
  if ("enum" in $) {
    a += add($, "enum", ($) => {
      let b = "/^(?:", z = 0;
      do b += JSON.stringify($[z]).replace(regex, "\\$&").replace(
        /[\p{C}\p{Zl}\p{Zp}]/gu,
        ($) => `\\u${$.charCodeAt(0).toString(16).padStart(4, "0")}`,
      ); while (++z < $.length && (b += "|"));
      return b + ")$/.test(JSON.stringify(raw))||";
    });
  }
  switch ($.type) {
    case "number":
      a += add($, "minimum", "raw<");
      a += add($, "maximum", "raw>");
      a += add($, "multipleOf", "raw%");
      break;
    case "string":
      a += add($, "minLength", "raw.length<");
      a += add($, "maxLength", "raw.length>");
      a += add($, "contentEncoding", ($) => `${BASES[$]}.test(raw)||`);
      a += add($, "format", ($) => `${FORMATS[$]}.test(raw)||`);
      try {
        a += add($, "pattern", ($) => `${RegExp($)}.test(raw)||`);
      } catch { /* empty */ }
      break;
    case "array":
      a += $.items
        ? `for(let p=path+"/",r=raw,d=data=Array(r.length),z=0;z<r.length;++z){const path=p+z,raw=r[z];let data;${
          validate($.items)
        }d[z]=data}`
        : "data=JSON.parse(JSON.stringify(raw));";
      a += add($, "minItems", "raw.length<");
      a += add($, "maxItems", "raw.length>");
      if ($.uniqueItems) {
        a += add(
          $,
          "uniqueItems",
          () =>
            "for(let s=new Set(),z=0;z<data.length;++z)if(s.size===s.add(JSON.stringify(data[z])).size){",
          "break}",
        );
      }
      break;
    case "object": {
      if (!$.properties) {
        a += "data=JSON.parse(JSON.stringify(raw));";
        break;
      }
      const b = $.additionalProperties === false || "";
      a += `const p=path,r=raw,d=data={}${b && ",s=new Set(Object.keys(r))"};`;
      for (let c = Object.keys($.properties), z = 0; z < c.length; ++z) {
        const d = c[z], e = JSON.stringify(d);
        a += `{const path=p+"/${
          e.replaceAll("~", "~0").replaceAll("/", "~1").slice(1)
        };if(Object.hasOwn(r,${e})){const raw=r[${e}];let data;${
          validate($.properties[d])
        }if(data!==undefined)d[${e}]=data}`;
        if ($.required?.includes(d)) {
          a += `else errors.push({path:p,raw:null,error:["required",${e}]});`;
        }
        a += `${b && `s.delete(${e});`}}`;
      }
      if (b) a += add($, "additionalProperties", () => "s.size&&");
      break;
    }
  }
  return a + "data??=raw}";
};
/** Creates a validating function. */
export const validator = <A extends Type>(
  $: A,
): ($: unknown) => Or<Fail<A>[], Data<A>> =>
  Function(
    "raw",
    `let path="",data;const errors=[];${
      validate($)
    }return errors.length?this.no(errors):this.ok(data)`,
  ).bind({ no, ok });
