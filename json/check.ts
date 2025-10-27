import { B16 } from "@libn/base/b16";
import { B32 } from "@libn/base/b32";
import { H32 } from "@libn/base/h32";
import { B64 } from "@libn/base/b64";
import { U64 } from "@libn/base/u64";
import type { Result } from "@libn/fp";
import { hasOwn } from "./lib.ts";
import { enToken, type Pointer } from "./pointer.ts";
import type { Instance, Schema, Str } from "./schema.ts";

const no = (
  $: `${Schema extends infer A ? A extends A ? keyof A : never : never}${any}`,
) => `(yield[\`\${S}/${$}\`,I]);`;
/** String format patterns. */
export const FORMAT: { [_ in NonNullable<Str["format"]>]: RegExp } =
  /* @__PURE__ */ (() => {
    const date =
      /^(?:(?:(?:(?:(?:[02468][048])|(?:[13579][26]))00)|(?:[0-9][0-9](?:(?:0[48])|(?:[2468][048])|(?:[13579][26]))))[-]02[-]29)|(?:\d{4}[-](?:(?:(?:0[13578]|1[02])[-](?:0[1-9]|[12]\d|3[01]))|(?:(?:0[469]|11)[-](?:0[1-9]|[12]\d|30))|(?:02[-](?:0[1-9]|1[0-9]|2[0-8]))))$/;
    const time =
      /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}(?:Z|[+-](?:[01]\d|2[0-3]):[0-5][0-9])$/;
    return {
      date,
      time,
      "date-time": RegExp(
        `${date.source.slice(0, -1)}T${time.source.slice(1)}$`,
      ),
      email:
        /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
      uri: /^[^\s#/:?]+:(?:\/\/[^\s\/?#]*)?[^\s#?]*(?:\?[^\s#]*)?(?:#\S*)?$/,
      uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
    };
  })();
/** Binary encoding patterns. */
export const ENCODING: { [_ in NonNullable<Str["contentEncoding"]>]: RegExp } =
  { base16: B16, base32: B32, base32hex: H32, base64: B64, base64url: U64 };
const body = ($: Schema) => {
  if (hasOwn($, "oneOf")) {
    let to = "const s=`${S}/oneOf`;switch(typeof I){", z = 0;
    do {
      const at = $.oneOf[z];
      to += `case "${
        at.type === "integer" ? "number" : at.type
      }":{const S=\`\${S}/${z}\`;${body(at)}break;}`;
    } while (++z < $.oneOf.length);
    return `${to}default:${no("oneOf")}}`;
  } else if ($.type === "object") {
    const keys = Object.keys($.properties);
    let to =
      'if(typeof I==="object"&&I&&!Array.isArray(I)){const s=`${S}/properties`,v=V,i=I,o=O={},k=new Set(Object.keys(i));';
    if ($.minProperties !== undefined && $.minProperties > 0) {
      to += `k.size<${$.minProperties}&&${no("minProperties")}`;
    }
    if ($.maxProperties !== undefined && $.maxProperties > 0) {
      to += `k.size>${$.maxProperties}&&${no("maxProperties")}`;
    }
    let z = 0;
    do {
      const raw = JSON.stringify(keys[z]), inline = enToken(raw.slice(1, -1));
      to +=
        `if(Object.hasOwn(i,${raw})){k.delete(${raw});const S=\`\${s}/${inline}\`,V=\`\${v}/${inline}\`,I=i[${raw}];let O;${
          body($.properties[keys[z]])
        }o[${raw}]=O}`;
      const required = $.required.indexOf(keys[z]);
      if (required !== -1) to += `else${no(`required/${z}`)}`;
    } while (++z < keys.length);
    return `${to}k.size&&${no("additionalProperties")}}else${no("type")}`;
  } else if ($.type === "array") {
    let to = "if(Array.isArray(I)){";
    if ($.minItems !== undefined && $.minItems > 0) {
      to += `I.length<${$.minItems}&&${no("minItems")}`;
    }
    if ($.maxItems !== undefined && $.maxItems > 0) {
      to += `I.length>${$.maxItems}&&${no("maxItems")}`;
    }
    if ($.uniqueItems) to += `const k=new Set();`;
    to +=
      `for(let s=\`\${S}/items\`,v=V,i=I,o=O=Array(i.length),z=0;z<i.length;++z){const S=s,V=\`\${v}/\${z}\`,I=i[z];let O;${
        body($.items)
      }${$.uniqueItems ? "k.add(JSON.stringify(o[z]=O))" : "o[z]=O"}}`;
    if ($.uniqueItems) to += `o.length===k.size||${no("uniqueItems")}`;
    return `${to}}else${no("type")}`;
  } else if ($.type === "null") return `if(I===null)O=I;else${no("type")}`;
  else if ($.const !== undefined) {
    return `if(I===${JSON.stringify($.const)})O=I;else${no("const")}`;
  } else if ($.enum) {
    let to = "switch(I){", z = 0;
    do to += `case ${JSON.stringify($.enum[z])}:`; while (++z < $.enum.length);
    return `${to}O=I;break;default:${no("enum")}}`;
  } else if ($.type === "boolean") {
    return `if(typeof I==="boolean")O=I;else${no("type")}`;
  } else if ($.type === "string") {
    let to = 'if(typeof I==="string"){';
    if ($.minLength !== undefined && $.minLength > 0) {
      to += `I.length<${$.minLength}&&${no("minLength")}`;
    }
    if ($.maxLength !== undefined) {
      to += `I.length<${$.maxLength}&&${no("maxLength")}`;
    }
    if ($.pattern) {
      try {
        to += `${RegExp($.pattern)}.test(I)||${no("pattern")}`;
      } catch { /* empty */ }
    }
    if ($.format) to += `${FORMAT[$.format]}.test(I)||${no("format")}`;
    if ($.contentEncoding) {
      to += `${ENCODING[$.contentEncoding]}.test(I)||${no("contentEncoding")}`;
    }
    return `${to}O=I}else${no("type")}`;
  } else {
    let to = `if(Number.is${$.type === "integer" ? "Integer" : "Finite"}(I)){`;
    if ($.minimum !== undefined) to += `I<${$.minimum}&&${no("minimum")}`;
    if ($.maximum !== undefined) to += `I>${$.maximum}&&${no("maximum")}`;
    if ($.exclusiveMinimum !== undefined) {
      to += `I>${$.exclusiveMinimum}||${no("exclusiveMinimum")}`;
    }
    if ($.exclusiveMaximum !== undefined) {
      to += `I<${$.exclusiveMaximum}||${no("exclusiveMaximum")}`;
    }
    if ($.multipleOf) to += `I%${$.multipleOf}&&${no("multipleOf")}`;
    return `${to}O=I}else${no("type")}`;
  }
};
/** Pointer-generating validator. */
export type Check<A extends Schema> = ($: unknown) => Generator<
  Pointer<A>,
  Instance<A>
>;
/** Compiles a schema to a validator. */
export const compile = <const A extends Schema>($: A): Check<A> =>
  Function(`return function*(I){const S="",V="";let O;${body($)}return O}`)();
/** Extracts an instance or errors from a validator. */
export const unwrap = <A extends Schema>(
  check: Check<A>,
  unknown: unknown,
): Result<Pointer<A>[], Instance<A>> => {
  const iterator = check(unknown), cause = [];
  let next = iterator.next();
  while (!next.done) cause.push(next.value), next = iterator.next();
  return cause.length
    ? { state: false, value: cause }
    : { state: true, value: next.value };
};
/** Uses a validator as a type predicate. */
export const is = <A extends Schema>(
  check: Check<A>,
  unknown: unknown,
): unknown is Instance<A> => check(unknown).next().done ?? false;
/** Uses a validator as a type asserter. */
export function assert<A extends Schema>(
  check: Check<A>,
  unknown: unknown,
): asserts unknown is Instance<A> {
  const cause = [...check(unknown)];
  if (cause.length) throw Error(`${cause.length}`, { cause });
}
