import { unrexp } from "@libn/text/normalize";
import { isArray, type Json, type Type } from "./lib.ts";
import { enToken, type Pointer } from "./pointer.ts";
import { ENCODING, FORMAT } from "./regex.ts";
import type { Instance, Schema } from "./schema.ts";

const is = /* @__PURE__ */ [
  "boolean",
  "integer",
  "number",
  "string",
  "array",
  "object",
].reduce(
  (to, type) => ({ ...to, [type]: ($: Schema) => $.type[0][0] === type[0] }),
  {} as {
    [A in keyof Type]: ($: unknown) => $ is { type: A | readonly [A, "null"] };
  },
);
const wrap = (
  $: TemplateStringsArray,
  condition: boolean | number | string | RegExp,
  word: Schema extends infer A ? A extends A ? keyof A & string : never : never,
) => `${$[0]}${condition}${$[1]}(yield\`\${S}/${word}~\${I}\`);${$[2]}`;
const regex = (pattern: string) => {
  try {
    return RegExp(pattern);
  } catch {
    return /a\bc/; // never-matching pattern
  }
};
const body = ($: Schema) => {
  if ("enum" in $) {
    if (!is.string($)) {
      return wrap`${
        [...new Set<Json>($.enum)].reduce<string>((body, option) =>
          `${body}case ${JSON.stringify(option)}:`, "switch(U){")
      }break;default:${"enum"}}`;
    }
    let union = "/^(?:";
    for (const option of $.enum) union += unrexp(JSON.stringify(option)) + "|";
    return wrap`${union.slice(0, -1)}$/.test(U)||${"enum"}`;
  }
  let all = "if(";
  if (is.boolean($)) all += 'typeof U!=="boolean")';
  else if (is.integer($) || is.number($)) {
    all += `Number.is${is.integer($) ? "SafeInteger" : "Finite"}(U)){`;
    if ($.minimum !== undefined) all += wrap`U<${$.minimum}&&${"minimum"}`;
    if ($.maximum !== undefined) all += wrap`U>${$.maximum}&&${"minimum"}`;
    if ($.exclusiveMinimum !== undefined) {
      all += wrap`U>${$.exclusiveMinimum}||${"exclusiveMinimum"}`;
    }
    if ($.exclusiveMaximum !== undefined) {
      all += wrap`U>${$.exclusiveMaximum}||${"exclusiveMaximum"}`;
    }
    // Check for truthiness here because a value of `0` would add a branch for
    // `U % 0`, which is always falsy.
    if ($.multipleOf) all += wrap`U%${$.multipleOf}&&${"multipleOf"}`;
    all += "}else";
  } else if (is.string($)) {
    all += 'typeof U==="string"){';
    if ($.minLength && $.minLength > 0) {
      all += wrap`U.length<${$.minLength}&&${"minLength"}`;
    }
    if ($.maxLength !== undefined) {
      all += wrap`U.length>${$.maxLength}&&${"maxLength"}`;
    }
    if ($.pattern !== undefined) {
      all += wrap`${regex($.pattern)}.test(U)||${"pattern"}`;
    }
    if ($.format) {
      all += wrap`${FORMAT[$.format]}.test(U)||${"format"}`;
    } else if ($.contentEncoding) {
      all += wrap`${ENCODING[$.contentEncoding]}.test(U)||${"contentEncoding"}`;
    }
    all += "}else";
  } else if (is.array($)) {
    all += "Array.isArray(U)){";
    if ($.minItems && $.minItems > 0) {
      all += wrap`U.length<${$.minItems}&&${"minItems"}`;
    }
    if ($.maxItems !== undefined) {
      all += wrap`U.length>${$.maxItems}&&${"maxItems"}`;
    }
    if ($.items) {
      all +=
        `for(let s=S,i=I,u=U,z=0;z<u.length;++z){const S=\`\${s}/\${z}\`,I=\`\${i}/\${z}\`,U=u[z];${
          body($.items)
        }}`;
    } else {
      all += "const s=S,i=I,u=U;";
      for (let z = 0; z < $.prefixItems.length; ++z) {
        all += `{const S=\`\${s}/${z}\`,I=\`\${i}/${z}\`,U=u[${z}];${
          body($.prefixItems[z])
        }}`;
      }
    }
    all += "}else";
  } else if (is.object($)) {
    all +=
      'typeof U==="object"&&U!==null&&!Array.isArray(U)){const s=S,i=I,u=U,k=Object.keys(u),a=new Set(k);';
    if ($.minProperties && $.minProperties > 0) {
      all += wrap`k.length<${$.minProperties}&&${"minProperties"}`;
    }
    if ($.maxProperties && $.maxProperties) {
      all += wrap`k.length<${$.maxProperties}&&${"maxProperties"}`;
    }
    if ($.patternProperties) {
      all +=
        'for(let z=0;z<k.length;++z){const K=k[z],I=`${i}/${k[z].replaceAll("~","~0").replaceAll("/","~1")}`,U=u[K];';
      for (const [key, value] of Object.entries($.patternProperties)) {
        all += `if(${regex(key)}.test(K)){const S=\`\${s}/${
          enToken(JSON.stringify(key).slice(1, -1))
        }\`;${body(value)}a.delete(K)}`;
      }
      all += "}";
    } else {
      for (const [key, value] of Object.entries($.properties)) {
        const string = JSON.stringify(key), path = enToken(string.slice(1, -1));
        all +=
          `if(Object.hasOwn(u,${string})){const S=\`\${s}/properties/${path}\`,I=\`\${i}/${path}\`,U=u[${string}];${
            body(value)
          }a.delete(${string})}else yield\`\${s}/required/${
            $.required.indexOf(key)
          }~\${i}/${path}\`;`;
      }
    }
    all += wrap`${"a.size"}&&${"additionalProperties"}}else`;
  }
  return all + wrap`${isArray($.type) ? " U===null||" : ""}${"type"}`;
};
/** Compiles a checking generator function from a schema. */
export const compile = <A extends Schema>(schema: A): ($: unknown) => Generator<
  Pointer<A>,
  Instance<A>
> => Function(`return function*(U){const S="",I="";${body(schema)}return U}`)();
