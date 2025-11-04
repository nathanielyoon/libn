/** @module check */
import { B16 } from "@libn/base/b16";
import { B32 } from "@libn/base/b32";
import { H32 } from "@libn/base/h32";
import { B64 } from "@libn/base/b64";
import { U64 } from "@libn/base/u64";
import type { Result } from "@libn/fp";
import { hasOwn, type Merge } from "./lib.ts";
import { enToken, type Pointer } from "./pointer.ts";
import type { Instance, Schema, Str } from "./schema.ts";

/** @internal */
type Patterns<A extends string | undefined> = Merge<
  { [_ in A as A extends undefined ? never : A]: RegExp }
>;
/** String format patterns. */
export const FORMATS: Patterns<Str["format"]> = /* @__PURE__ */ (() => {
  const date =
    /^(?:(?:(?:(?:(?:[02468][048])|(?:[13579][26]))00)|(?:[0-9][0-9](?:(?:0[48])|(?:[2468][048])|(?:[13579][26]))))[-]02[-]29)|(?:\d{4}[-](?:(?:(?:0[13578]|1[02])[-](?:0[1-9]|[12]\d|3[01]))|(?:(?:0[469]|11)[-](?:0[1-9]|[12]\d|30))|(?:02[-](?:0[1-9]|1[0-9]|2[0-8]))))$/;
  const time =
    /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}(?:Z|[+-](?:[01]\d|2[0-3]):[0-5][0-9])$/;
  return {
    date,
    time,
    "date-time": RegExp(`${date.source.slice(0, -1)}T${time.source.slice(1)}$`),
    email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
    uri: /^[^\s#/:?]+:(?:\/\/[^\s\/?#]*)?[^\s#?]*(?:\?[^\s#]*)?(?:#\S*)?$/,
    uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
  };
})();
/** Binary encoding patterns. */
export const BASES: Patterns<Str["contentEncoding"]> = {
  base16: B16,
  base32: B32,
  base32hex: H32,
  base64: B64,
  base64url: U64,
};
const no = (
  $: `${Schema extends infer A ? A extends A ? keyof A : never : never}${any}`,
) => `(yield\`\${S}/${$}~\${V}\`);`;
const TYPE = {
  null: "I===null",
  boolean: 'typeof I==="boolean"',
  integer: "Number.isInteger(I)",
  number: "Number.isFinite(I)",
  string: 'typeof I==="string"',
  array: "Array.isArray(I)",
  object: 'typeof I==="object"&&I&&!Array.isArray(I)',
} satisfies { [_ in Extract<Schema["type"], string>]: string };
const body = ($: Schema): string => {
  if (typeof $.type !== "string") {
    return `{const s=S;if(I===null)O=I;else{const S=\`\${s}/oneOf/1\`;${
      body($.oneOf[1])
    }}}`;
  }
  let to = `if(${TYPE[$.type]}){`;
  if (hasOwn($, "const")) {
    to += `if(I===${JSON.stringify($.const)})O=I;else${no("const")}`;
  } else if (hasOwn($, "enum")) {
    to += "switch(I){";
    let z = 0;
    do to += `case ${JSON.stringify($.enum[z])}:`; while (++z < $.enum.length);
    to += `O=I;break;default:${no("enum")}}`;
  } else {
    switch ($.type) {
      case "null":
      case "boolean":
        to += "O=I";
        break;
      case "integer":
      case "number":
        if ($.minimum !== undefined) to += `I<${$.minimum}&&${no("minimum")}`;
        if ($.maximum !== undefined) to += `I>${$.maximum}&&${no("maximum")}`;
        if ($.exclusiveMinimum !== undefined) {
          to += `I>${$.exclusiveMinimum}||${no("exclusiveMinimum")}`;
        }
        if ($.exclusiveMaximum !== undefined) {
          to += `I<${$.exclusiveMaximum}||${no("exclusiveMaximum")}`;
        }
        if ($.multipleOf) to += `I%${$.multipleOf}&&${no("multipleOf")}`;
        to += "O=I";
        break;
      case "string":
        if ($.minLength! > 0) {
          to += `I.length<${$.minLength}&&${no("minLength")}`;
        }
        if ($.maxLength !== undefined) {
          to += `I.length>${$.maxLength}&&${no("maxLength")}`;
        }
        if ($.pattern) {
          try {
            to += `${RegExp($.pattern)}.test(I)||${no("pattern")}`;
          } catch { /* empty */ }
        }
        if ($.format) to += `${FORMATS[$.format]}.test(I)||${no("format")}`;
        if ($.contentEncoding) {
          to += `${BASES[$.contentEncoding]}.test(I)||${no("contentEncoding")}`;
        }
        to += "O=I";
        break;
      case "array": {
        if ($.minItems! > 0) to += `I.length<${$.minItems}&&${no("minItems")}`;
        if ($.maxItems !== undefined) {
          to += `I.length>${$.maxItems}&&${no("maxItems")}`;
        }
        let unique;
        if ($.uniqueItems) {
          to += "const k=new Set();", unique = "k.add(JSON.stringify(O));";
        } else unique = "";
        if ($.items) {
          to +=
            `const s=\`\${S}/items\`,v=V,i=I,o=O=Array(i.length);for(let z=0;z<i.length;++z){const S=s,V=\`\${v}/\${z}\`,I=i[z];let O;${
              body($.items)
            }${unique}o[z]=O}`;
        } else {
          to +=
            `const s=\`\${S}/prefixItems\`,v=V,i=I,o=O=Array(i.length);switch(i.length){default:${
              no("items")
            }`;
          for (let z = $.prefixItems.length; z;) {
            to +=
              `case ${z--}:{const S=\`\${s}/${z}\`,V=\`\${v}/${z}\`,I=i[${z}];let O;${
                body($.prefixItems[z])
              }${unique}o[${z}]=O}`;
          }
          to += "case 0:}";
        }
        if ($.uniqueItems) to += `o.length===k.size||${no("uniqueItems")}`;
        break;
      }
      case "object":
        if ($.oneOf) {
          const key = $.required[0];
          to += `const s=S;switch(I[${JSON.stringify(key)}]){`;
          for (let z = 0; z < $.oneOf.length; ++z) {
            const option = $.oneOf[z], property = option.properties[key];
            if (property?.type === "string" && property.const !== undefined) {
              to += `case${
                JSON.stringify(property.const)
              }:{const S=\`\${s}/oneOf/${z}\`;${body(option)}break}`;
            }
          }
          to += `case undefined:${no("required/0")}break;default:${
            no("oneOf")
          }}`;
        } else if ($.additionalProperties) {
          to += "const s=S,v=V,i=I,o=O={},k=Object.keys(i).sort();";
          if ($.minProperties! > 0) {
            to += `k.length<${$.minProperties}&&${no("minProperties")}`;
          }
          if ($.maxProperties !== undefined) {
            to += `k.length>${$.maxProperties}&&${no("maxProperties")}`;
          }
          to +=
            `for(let z=0;z<k.length;++z){const K=k[z],V=\`\${v}/\${K.replaceAll("~","~0").replaceAll("/","~1")}\`;`;
          if ($.propertyNames) {
            to += `{const S=\`\${s}/propertyNames\`,I=K;let O;${
              body($.propertyNames)
            }}`;
          }
          to += `const S=\`\${s}/additionalProperties\`,I=i[K];let O;${
            body($.additionalProperties)
          }o[K]=O}`;
        } else {
          const keys = Object.keys($.properties).sort();
          to +=
            "const s=`${S}/properties`,v=V,i=I,o=O={},k=new Set(Object.keys(i));";
          let z = 0;
          do {
            const key = JSON.stringify(keys[z]);
            const token = enToken(key.slice(1, -1));
            to +=
              `if(Object.hasOwn(i,${key})){k.delete(${key});const S=\`\${s}/${token}\`,V=\`\${v}/${token}\`,I=i[${key}];let O;${
                body($.properties[keys[z]])
              }o[${key}]=O}`;
            const required = $.required.indexOf(keys[z]);
            if (required !== -1) to += `else${no(`required/${required}`)}`;
          } while (++z < keys.length);
          to += `k.size&&${no("additionalProperties")}`;
        }
        break;
    }
  }
  return `${to}}else${no("type")}`;
};
/** Pointer-generating validator. */
export type Check<A extends Schema> = ($: unknown) => Generator<
  Pointer<A>,
  Instance<A>
>;
/** Compiles a schema to a validator. */
export const compile = <const A extends Schema>($: A): Check<A> =>
  Function(`return function*(I){const S="",V="";let O;${body($)}return O}`)();
/** Uses a validator as a type parser. */
export const parse = <A extends Schema>(
  check: Check<A>,
  unknown: unknown,
): Result<Pointer<A>[], Instance<A>> => {
  const iterator = check(unknown), cause: Pointer<A>[] = [];
  let next = iterator.next();
  while (!next.done) cause.push(next.value), next = iterator.next();
  if (cause.length) return { state: false, value: cause };
  else return { state: true, value: next.value };
};
/** Uses a validator as a type predicate. */
export const is = <A extends Schema>(
  check: Check<A>,
  unknown: unknown,
): unknown is Instance<A> => check(unknown).next().done!;
/** Uses a validator as a type asserter. */
export function assert<A extends Schema>(
  check: Check<A>,
  unknown: unknown,
): asserts unknown is Instance<A> {
  const cause = [...check(unknown)];
  if (cause.length) throw Error(`${cause.length}`, { cause });
}
