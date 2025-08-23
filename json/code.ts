import type { Data, Formats, Type } from "./schema.ts";

const fix = (ending = "") => `O=I[F]?.trim().normalize("NFC")${ending}??null;`;
const iso = '{const i=new Date(I[F]||"");O=isNaN(i)?I[F]:i.toISOString()}';
const COERCERS: { [_ in keyof Formats]: string } = {
  date: iso.replace("}", ".slice(0,10)}"),
  time: iso.replace("}", ".slice(11)"),
  "date-time": iso,
  duration: fix(),
  email: fix(),
  uri: fix(),
  uuid: fix(".toLowerCase()"),
};
const coders = ($: Type): [size: number, encode: string, decode: string] => {
  switch ($.kind) {
    case "bit":
      return [
        1,
        "O[F++]=`${I}`;",
        'O=I[F]==="false"?false:I[F]==="true"||null;++F;',
      ];
    case "int":
    case "num":
      return [1, "O[F++]=`${I}`;", "if(I[F]==null)O=null;else O=+I[F];++F;"];
    case "fmt":
      return [1, "O[F++]=I;", COERCERS[$.format] + "++F;"];
    case "bin":
    case "str":
      return [1, "O[F++]=I;", fix()];
    case "ord": {
      const a = $.prefixItems.length;
      let b = 0, c = "", d = `const o=O=Array(${a});`, e, f, g, z = 0;
      do [e, f, g] = coders($.prefixItems[z]),
        b += e,
        c += `{const I=i[${z}];if(I!=null)${f}else F+=${e}}`,
        d += `{let O;${g}if(O!=null)o[${z}]=O}`; while (++z < a);
      return [b, `O.fill(null,F,F+${b});const i=I;${c}`, d];
    }
    case "vec":
      return [
        1,
        'O[F++]=I.join(", ");',
        `if(I[F])for(let i=I[F++].split(", "),o=O=Array(i.length),z=0;z<i.length;++z){let I=i,F=z,O;${
          coders($.items)[2]
        }o[z]=O}else O=I[F++]==null?null:[];`,
      ];
    case "arr": {
      const [a, b, c] = coders($.items), d = a * $.maxItems;
      return [
        d + 1,
        `{O[F++]=\`\${I.length}\`,O.fill(null,F,F+${d});for(let i=I,z=0;z<i.length;++z){const I=i[z];${b}}}`,
        `if(I[F])for(let i=Math.min(+I[F++]||0,${$.maxItems}),o=O=Array(i),z=0;z<i;f+=${a},++z){let O;${c}o[z]=O}else ++F;`,
      ];
    }
    case "map": {
      const [a, b, c] = coders(
        $.patternProperties[Object.keys($.patternProperties)[0]],
      );
      const d = a + 1, e = d + $.maxProperties;
      return [
        e,
        `{O.fill(null,F,F+${e});for(let i=I,$=Object.keys(i);z<$.length;++z){const I=i[O[F++]=$[z]];${b}}}`,
        `for(let o=O={},z=0;z<${$.maxProperties}&&I[F]!=null;++z){const $=I[F++];let O;${c}o[$]=O}`,
      ];
    }
    case "obj": {
      let a = 0, b = "", c = "{const o={};let $=0;";
      for (let d = Object.keys($.properties), z = 0; z < d.length; ++z) {
        const [e, f, g] = coders($.properties[d[z]]), h = JSON.stringify(d[z]);
        a += e, b += `{const I=i[${h}];if(I!=null)${f}else F+=${e}}`;
        c += `{let O;${g}if(O!=null)o[${h}]=O,++$}`;
      }
      return [a, `{O.fill(null,F,F+${a});const i=I;${b}}`, c + "O=$?o:null}"];
    }
  }
};
/** Creates encoding and decoding functions. */
export const coder = <A extends Type>($: A): {
  length: number;
  encode: ($: Data<A>) => (string | null)[];
  decode: ($: (string | null)[]) => unknown;
} => {
  const [a, b, c] = coders($);
  return {
    length: a,
    encode: Function("I", `const O=Array(${a});let F=0;${c}return O`) as any,
    decode: Function("I", `let O,F=0;${b}return O`) as any,
  };
};
