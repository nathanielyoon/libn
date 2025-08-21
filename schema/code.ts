import type { Data, Formats, Kind, Type } from "./json.ts";

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
  pkey: fix('.replace(/^(?![.~])/, "~")'),
  skey: fix('.replace(/^(?![.~])/, ".")'),
};
const CODERS: { [A in Kind]: ($: Type<A>) => [number, string, string] } = {
  bit: () => [
    1,
    'O=I[F]==="false"?false:I[F]==="true"||null;++F;',
    "O[F++]=`${I}`;",
  ],
  int: () => [1, "if(I[F]==null)O=null;else O=+I[F];++F;", "O[F++]=`${I}`;"],
  num: () => [1, "if(I[F]==null)O=null;else O=+I[F];++F;", "O[F++]=`${I}`;"],
  str: ($) => [1, COERCERS[$.format] + "++F;", "O[F++]=I;"],
  txt: () => [1, 'O=I[F++]?.normalize("NFC");', "O[F++]=I;"],
  vec: ($) => [
    1,
    `if(I[F])for(let i=I[F++].split(", "),o=O=Array(i.length),z=0;z<i.length;++z){let I=i,O,F=z;${
      coders($.items)[1]
    }o[z]=O}else O=I[F++]==null?null:[];`,
    'O[F++]=I.join(", ");',
  ],
  arr: ($) => {
    const [a, b, c] = coders($.items), d = a * $.maxItems;
    return [
      d + 1,
      `{if(I[F])for(let i=Math.min(+I[F++]||0,${$.maxItems}),o=O=Array(i),f=F,z=0;z<i;f+=${a},++z){let O,F=f;${b}o[z]=O}else ++F;F+=${d}}`,
      `{O[F++]=\`\${I.length}\`,O.fill(null,F,F+${d});for(let i=I,f=F,z=0;z<i.length;f+=${a},++z){const I=i[z];let F=f;${c}}F+=${d}}`,
    ];
  },
  map: ($) => {
    const [a, b, c] = coders(
      $.patternProperties[Object.keys($.patternProperties)[0]],
    );
    const d = a + 1, e = d * $.maxProperties;
    return [
      e,
      `{for(let o=O={},f=F,z=0;z<${$.maxProperties}&&I[f]!=null;f+=${d},++z){let O,F=f;const $=I[F++];${b}o[$]=O}F+=${e}}`,
      `{O.fill(null,F,F+${e});for(let i=I,$=Object.keys(i),f=F,z=0;z<$.length;f+=${d},++z){let F=f;const I=i[O[F++]=$[z]];${c}}F+=${e}}`,
    ];
  },
  obj: ($) => {
    let a = 0, b = "", c = "";
    for (let d = Object.keys($.properties), z = 0; z < d.length; ++z) {
      const [e, f, g] = coders($.properties[d[z]]), h = JSON.stringify(d[z]);
      a += e, b += `{let O;${f}if(O!=null)o[${h}]=O,++$}`;
      c += `{const I=i[${h}];if(I!=null)${g}else F+=${e}}`;
    }
    return [
      a,
      `{const o={};let $=0;${b}O=$?o:null}`,
      `{O.fill(null,F,F+${a});const i=I;${c}}`,
    ];
  },
};
const coders = ($: Type) => CODERS[$.kind]($ as never);
/** Creates encoding and decoding functions. */
export const coder = <A extends Type>($: A): {
  length: number;
  decode: ($: (string | null)[]) => unknown;
  encode: ($: Data<A>) => (string | null)[];
} => {
  const [a, b, c] = coders($);
  return {
    length: a,
    decode: Function("I", `let O,F=0;${b}return O`) as any,
    encode: Function("I", `const O=Array(${a});let F=0;${c}return O`) as any,
  };
};
