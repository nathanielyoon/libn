import { no, ok, type Or } from "../result.ts";
import type { Data, Fail, Type } from "./schema.ts";

const date = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const time = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;
const regex = /[$(-+./?[-^{|}]/g;
const FORMATS = {
  date,
  time,
  "date-time": RegExp(`${date.source.slice(0, -1)}T${time.source.slice(1)}$`),
  email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
  uri: /^[^#/:?]+:(?:\/\/[^\/?#]*)?[^#?]*(?:\?[^#]*)?(?:#.*)?$/,
  uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
};
const NOT = {
  boolean: 'typeof (data=raw)!=="boolean"',
  number: "!Number.isFinite(data=raw)",
  string: `typeof raw!=="string"||raw!==(data=raw).normalize()`,
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
      a += add($, "format", ($) => `${FORMATS[$]}.test(raw)||`);
      try {
        a += add($, "pattern", ($) => `${RegExp($)}.test(raw)||`);
      } catch { /* empty */ }
      break;
    case "array":
      a +=
        `for(let p=path+"/",r=raw,d=data=Array(r.length),z=0;z<r.length;++z){const path=p+z,raw=r[z];let data;${
          validate($.items)
        }d[z]=data}`;
      a += add($, "minItems", "raw.length<");
      a += add($, "maxItems", "raw.length>");
      a += add(
        $,
        "uniqueItems",
        ($) =>
          $
            ? "for(let s=new Set(),z=0;z<data.length;++z)if(s.size===s.add(JSON.stringify(data[z])).size){"
            : "",
        "break}",
      );
      break;
    case "object": {
      const b = $.additionalProperties === false || "";
      a += `const p=path,r=raw,d=data={}${b && ",s=new Set(Object.keys(r))"};`;
      for (let c = Object.keys($.properties), z = 0; z < c.length; ++z) {
        const d = c[z], e = JSON.stringify(d);
        a += `{const path=p+"/${
          e.replaceAll("~", "~0").replaceAll("/", "~1").slice(1)
        },raw=r[${e}];let data;if(raw!==undefined)${validate($.properties[d])}${
          $.required.includes(d) ? `else(errors.required??=[]).push(${e});` : ""
        }if(data!==undefined)d[${e}]=data}${b && `s.delete(${e});`}`;
      }
      if (b) a += add($, "additionalProperties", () => "s.size&&");
      break;
    }
  }
  return a + "}";
};
/** Creates a validating function. */
export const validator = <A extends Type>(
  $: A,
): ($: unknown) => Or<Fail<A>[], Data<A>> =>
  Function(
    "raw",
    `const errors=[];let path="",data;${
      validate($)
    }return errors.length?this.no(errors):this.ok(data)`,
  ).bind({ no, ok });
