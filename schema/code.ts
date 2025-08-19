import type { Data, Type } from "./json.ts";

const CODE: { [A in Type as A["type"]]: ($: A) => [number, string, string] } = {
  boolean: () => [
    1,
    '{const i=I[F++];O=i==="false"?false:i==="true"||null;}',
    "O[F++]=`${I}`;",
  ],
  integer: () => [
    1,
    "{const i=I[F++];O=i==null?null:+i}",
    "O[F++]=I==null?null:`${I}`;",
  ],
  number: () => [
    1,
    "{const i=I[F++];O=i==null?null:+i}",
    "O[F++]=I==null?null:`${I}`;",
  ],
  string: () => [1, "O=I[F++];", "O[F++]=I??null;"],
  array: ($) => {
    const a = code($.items);
    switch ($.items.type) {
      case "string":
        if (!("format" in $.items)) break;
      case "boolean":
      case "integer":
      case "number":
        return [
          1,
          `if(I[F]!=null)for(let i=I[F++].split(/,\\s*/),o=O=Array(i.length),z=0;z<i.length;++z){let I=i,F=z,O;${
            a[1]
          }o[z]=O}else ++F;`,
          "O[F++]=I?.join()??null;",
        ];
    }
    const b = a[0] * $.maxItems!;
    return [
      b + 1,
      `{for(let o=O=Array(Math.max(+I[F++]||0,${$.maxItems})),f=F,z=0;z<O.length;++z){let O,F=f+${
        a[0]
      }*z;${a[1]}}F+=${b}}`,
      `{O[F++]=I.length;for(let i=I,f=F,z=0;z<i.length;++z){const I=i[z];let F=f+${
        a[0]
      }*z;${a[2]}}F+=${b}}`,
    ];
  },
  object: ($) => {
    if ("patternProperties" in $) {
      const a = code($.patternProperties[Object.keys($.patternProperties)[0]]);
      const b = (a[0] + 1) * $.maxProperties;
      return [
        b,
        `{for(let o=O={},f=F,z=0;z<${$.maxProperties}&&I[f]!=null;f+=${
          a[0] + 1
        },++z){let O,F=f;const $=I[F++];${a[1]}o[$]=O}F+=${b}}`,
        `{O.fill(null,F,F+${b});for(let i=I,$=Object.keys(i),f=F,z=0;z<$.length;++z){let F=f+${
          a[0]
        }*z;const I=i[O[F++]=$[z]];${a[2]}}F+=${b}}`,
      ];
    }
    let a = 0, b = "", c = "";
    for (let d = Object.keys($.properties), z = 0; z < d.length; ++z) {
      const e = code($.properties[d[z]]), f = JSON.stringify(d[z]);
      a += e[0], b += `{let O;${e[1]}if(O!=null)o[${f}]=O}`;
      c += `{const I=i[${f}];if(I!=null)${e[2]}else F+=${e[0]}}`;
    }
    return [a, `{const o=O={};${b}}`, `{const i=I;${c}}`];
  },
};
const code = ($: Type) => CODE[$.type]($ as never);
/** Creates encoding and decoding functions. */
export const coder = <A extends Type>($: A): {
  size: number;
  encode: ($: (string | null)[]) => unknown;
  decode: ($: Data<A>) => (string | null)[];
} => {
  const a = CODE[$.type]($ as never);
  return {
    size: a[0],
    encode: Function("I", `let F=0,O;${a[1]}return O`) as any,
    decode: Function(
      "I",
      `const O=Array(${a[0]});let F=0;${a[2]}return O`,
    ) as any,
  };
};
