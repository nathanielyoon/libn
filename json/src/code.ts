import type { Data, Type } from "./types.ts";

const fix = "raw=row[at++]?.trim().normalize()??null;";
const iso =
  '{const r=new Date(row[at++]||"");raw=isNaN(r)?row[at-1]:r.toISOString()}';
const FORMATS = {
  date: iso.slice(0, -1) + ".slice(0,10)}",
  time: iso.slice(0, -1) + ".slice(11)}",
  "date-time": iso,
  email: fix,
  uri: fix,
  uuid: fix.slice(0, -7) + ".toLowerCase()??null;",
};
const coders = ($: Type): { length: number; en: string; de: string } => {
  switch ($.type) {
    case "boolean":
      return {
        length: 1,
        en: "row[at++]=`${data}`;",
        de: 'raw=row[at]==="false"?!++at:row[at++]==="true"||row[at-1];',
      };
    case "number":
      return {
        length: 1,
        en: "row[at++]=`${data}`;",
        de:
          "if(row[at]==null)++at,raw=null;else{const r=+row[at++];raw=isNaN(r)?row[at-1]:r}",
      };
    case "string":
      return {
        length: 1,
        en: "row[at++]=data;",
        de: $.format ? FORMATS[$.format] : "raw=row[at++]??null;",
      };
    case "array": {
      if (
        $.items?.type === "boolean" || $.items?.type === "number" ||
        $.items?.type === "string" && ($.items.format ||
            $.items.contentEncoding && $.items.minLength! >= 1 ||
            $.items.enum?.every(RegExp.prototype.test.bind(/^[^,]+$/)))
      ) {
        return {
          length: 1,
          en: 'row[at++]=data.join(", ");',
          de:
            `if(row[at])for(let r=raw=row[at++].split(", "),z=0;z<r.length;++z){const row=r;let at=z,raw;${
              coders($.items).de
            }if(raw!=null)r[z]=raw}else raw=row[at++]==null?null:[];`,
        };
      }
      if ($.items && $.maxItems !== undefined) {
        const { length, en, de } = coders($.items), a = length * $.maxItems + 1;
        return {
          length: a,
          en:
            `{row[at++]=\`\${data.length}\`;for(let d=data,a=at,z=0;z<d.length;++z){const data=d[z];let at=a;${en}a=at}at+=${a}}`,
          de:
            `{if(row[at])for(let r=raw=Array(Math.min(+row[at++]||0,${$.maxItems})),a=at,z=0;z<r.length;++z){let at=a,raw;${de}a=at,r[z]=raw}else raw=row[at++]==null?null:[];at+=${a}}`,
        };
      }
      break;
    }
    case "object":
      if ($.properties && $.required?.length) {
        let a = 0, b = "{const d=data;", c = "{const r={};let c=false;";
        for (let d = Object.keys($.properties), z = 0; z < d.length; ++z) {
          const { length, en, de } = coders($.properties[d[z]]);
          const e = JSON.stringify([d[z]]);
          a += length;
          b += `{const data=d${e};if(data!==undefined)${en}else at+=${length}}`;
          c += `{let raw;${de}if(raw!==null)r${e}=raw,c=true}`;
        }
        return { length: a, en: b + "}", de: c + "raw=c?r:null}" };
      }
      break;
  }
  return {
    length: 1,
    en: "row[at++]=JSON.stringify(data);",
    de: "try{raw=JSON.parse(row[at++])}catch{raw=null}",
  };
};
/** Creates encoding and decoding functions. */
export const coder = <A extends Type>($: A): {
  length: number;
  encode: (data: Data<A>) => (string | null)[];
  decode: (row: (string | null)[]) => unknown;
} => {
  const { length, en, de } = coders($);
  return {
    length,
    encode: Function(
      "data",
      `const row=Array(${length}).fill(null);let at=0;${en}return row`,
    ) as any,
    decode: Function("row", `let at=0,raw;${de}return raw`) as any,
  };
};
