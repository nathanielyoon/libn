import type { Data, Type } from "./types.ts";

const fix = "raw=row[at++]?.trim().normalize()??null;";
const iso =
  '{const i=new Date(row[at++]||"");raw=isNaN(i)?row[at-1]:i.toISOString()}';
const FORMATS = {
  date: iso.slice(0, -1) + ".slice(0,10)}",
  time: iso.slice(0, -1) + ".slice(11)}",
  "date-time": iso,
  duration: fix,
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
        de: 'raw=row[at++]==="false"?false:row[at-1]==="true"||null;',
      };
    case "number":
      return {
        length: 1,
        en: "row[at++]=`${data}`;",
        de: "if(row[at]==null)++at,raw=null;else raw=+row[at++];",
      };
    case "string":
      return {
        length: 1,
        en: "row[at++]=data;",
        de: $.format ? FORMATS[$.format] : "raw=row[at++]??null;",
      };
    case "array": {
      if ($.items && $.maxItems !== undefined) {
        const { length, en, de } = coders($.items), a = length * $.maxItems + 1;
        return {
          length: a,
          en:
            `{row[at++]=\`\${data.length}\`;for(let d=data,a=at,z=0;z<d.length;a+=${length},++z){const data=d[z];let at=a;${en}}at+=${a}}`,
          de:
            `{if(row[at])for(let r=raw=Array(Math.min(+row[at++]||0,${$.maxItems})),z=0;z<r.length;++z){let raw;${de}r[z]=raw}else raw=row[at++]==null?null:[]}`,
        };
      }
      break;
    }
    case "object":
      if ($.properties && $.required?.length) {
        let a = 0, b = "{const d=data;", c = "{const r={};let c=0;";
        for (let d = Object.keys($.properties), z = 0; z < d.length; ++z) {
          const { length, en, de } = coders($.properties[d[z]]);
          const e = JSON.stringify([d[z]]);
          a += length;
          b += `{const data=d${e};if(data!==undefined)${en}else at+=${length}}`;
          c += `{let raw;${de}if(raw!==null)r${e}=raw,++c}`;
        }
        return { length: a, en: b + "}", de: c + "raw=c?r:null}" };
      }
      break;
  }
  return {
    length: 1,
    en: "row[at++]=JSON.stringify(data);",
    de: "try{raw=JSON.parse(row[at++])}catch{}",
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
