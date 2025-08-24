import { no, ok, type Or } from "../fp.ts";
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
  boolean: 'typeof raw!=="boolean"',
  number: "!Number.isFinite(raw)",
  string: `typeof raw!=="string"||raw!==raw.normalize()`,
  array: "!Array.isArray(raw)",
  object: 'typeof raw!=="object"||!raw||Array.isArray(raw)',
};
const add = <A>(key: string, $: A, to: ($: NonNullable<A>) => {}, and = ";") =>
  $ == null ? "" : `${to?.($) ?? ""}(errors.${key}=${JSON.stringify($)})${and}`;
const validate = ($: Type) => {
  let a = "const errors={};";
  if ("enum" in $) {
    a += add("enum", $.enum, ($) => {
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
      a += add("minimum", $.minimum, ($) => `raw<${$}&&`);
      a += add("maximum", $.maximum, ($) => `raw>${$}&&`);
      a += add("multipleOf", $.multipleOf, ($) => `raw%${$}&&`);
      break;
    case "string":
      a += add("minLength", $.minLength, ($) => `raw.length<${$}&&`);
      a += add("maxLength", $.maxLength, ($) => `raw.length>${$}&&`);
      a += add("format", $.format, ($) => `${FORMATS[$]}.test(raw)||`);
      try {
        a += add("pattern", $.pattern, ($) => `${RegExp($)}.test(raw)||`);
      } catch { /* empty */ }
      break;
    case "array":
      a +=
        `for(let p=path+"/",r=raw,d=data=Array(r.length),z=0;z<r.length;++z){const path=p+z,raw=r[z];let data;${
          validate($.items)
        }d[z]=data}`;
      a += add("minItems", $.minItems, ($) => `raw.length<${$}&&`);
      a += add("maxItems", $.maxItems, ($) => `raw.length>${$}&&`);
      a += add(
        "uniqueItems",
        $.uniqueItems || null,
        () =>
          "for(let s=new Set(),z=0;z<data.length;++z)if(s.size===s.add(JSON.stringify(data[z])).size){",
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
      a += add("additionalProperties", b || null, () => "s.size&&");
      break;
    }
  }
  return `if(${
    NOT[$.type]
  })fail.push({path,raw,errors:{type:"${$.type}"}});else{${a}if(Object.keys(errors).length)fail.push({path,raw,errors});else data??=raw}`;
};
/** Creates a validating function. */
export const validator = <A extends Type>(
  $: A,
): ($: unknown) => Or<Fail<A>[], Data<A>> =>
  Function(
    "raw",
    `const fail=[];let path="",data;${
      validate($)
    }return fail.length?this.no(fail):this.ok(data)`,
  ).bind({ no, ok });
