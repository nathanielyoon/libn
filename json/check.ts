import { B16 } from "@libn/base/b16";
import { B32 } from "@libn/base/b32";
import { B64 } from "@libn/base/b64";
import { H32 } from "@libn/base/h32";
import { U64 } from "@libn/base/u64";
import { Err, type Result } from "@libn/result";
import type { Json } from "@libn/types";
import type { Instance, Schema } from "./schema.ts";

/** Resolves a JSON pointer. */
export const point = ($: Json, pointer: string): Json | undefined => {
  if (!pointer) return $;
  const [head, ...tail] = pointer.split("/");
  if (head) return;
  for (let z = 0; z < tail.length; ++z) {
    if (typeof $ !== "object" || !$) return;
    const token = tail[z].replaceAll("~1", "/").replaceAll("~0", "~");
    if (isArray($)) {
      if (!/^(?:[1-9]\d*|0)$/.test(token)) return;
      $ = $[+token];
    } else $ = $[token];
    if ($ === undefined) return;
  }
  return $;
};
const FORMATS = /* @__PURE__ */ (() => {
  const date =
    /^(?:(?:(?:(?:(?:[02468][048])|(?:[13579][26]))00)|(?:[0-9][0-9](?:(?:0[48])|(?:[2468][048])|(?:[13579][26]))))[-]02[-]29)|(?:\d{4}[-](?:(?:(?:0[13578]|1[02])[-](?:0[1-9]|[12]\d|3[01]))|(?:(?:0[469]|11)[-](?:0[1-9]|[12]\d|30))|(?:02[-](?:0[1-9]|1[0-9]|2[0-8]))))$/;
  const time =
    /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5][0-9])?$/;
  return {
    date,
    time,
    "date-time": RegExp((date.source + time.source).replace("$^", "[ T]")),
    email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
    uri: /^[^\s#/:?]+:(?:\/\/[^\s\/?#]*)?[^\s#?]*(?:\?[^\s#]*)?(?:#\S*)?$/,
    uuid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
  };
})();
const BASES = {
  base16: B16,
  base32: B32,
  base32hex: H32,
  base64: B64,
  base64url: U64,
};
const no = (
  $: `${Schema extends infer A ? A extends A ? keyof A : never : never}${any}`,
) => `(yield\`\${S}/${$}~\${V}\`);`;
const isArray = /* @__PURE__ */
  (() => Array.isArray)() as ($: any) => $ is any[] | readonly any[];
const hasOwn = /* @__PURE__ */ (() => Object.hasOwn)() as <
  A extends PropertyKey,
>($: object, key: A) => $ is { [_ in A]: unknown };
const body = ($: Schema): string => {
  if (hasOwn($, "oneOf")) {
    return `{const s=S;if(I===null)O=I;else{const S=\`\${s}/oneOf/1\`;${
      body($.oneOf[1])
    }}}`;
  } else if (hasOwn($, "enum")) {
    let to = `switch(I){`, z = 0;
    do to += `case ${JSON.stringify($.enum[z])}:`; while (++z < $.enum.length);
    return `${to}O=I;break;default:${no("enum")}}`;
  }
  let to = "if(";
  switch ($.type) {
    case "boolean":
      to += 'typeof I==="boolean"){O=I';
      break;
    case "number":
      to += "Number.isFinite(I)){O=I;";
      if ($.minimum !== undefined) to += `I<${$.minimum}&&${no("minimum")}`;
      if ($.maximum !== undefined) to += `I>${$.maximum}&&${no("maximum")}`;
      if ($.exclusiveMinimum !== undefined) {
        to += `I>${$.exclusiveMinimum}||${no("exclusiveMinimum")}`;
      }
      if ($.exclusiveMaximum !== undefined) {
        to += `I<${$.exclusiveMaximum}||${no("exclusiveMaximum")}`;
      }
      if ($.multipleOf) to += `I%${$.multipleOf}&&${no("multipleOf")}`;
      break;
    case "string":
      to += 'typeof I==="string"){O=I;';
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
      break;
    case "array":
      to += `Array.isArray(I)){${$.uniqueItems ? "const u=new Set();" : ""}`;
      if ($.minItems! > 0) to += `I.length<${$.minItems}&&${no("minItems")}`;
      if ($.maxItems !== undefined) {
        to += `I.length>${$.maxItems}&&${no("maxItems")}`;
      }
      to +=
        `const s=\`\${S}/items\`,v=V,i=I,o=O=Array(i.length);for(let z=0;z<i.length;++z){const S=s,V=\`\${v}/\${z}\`,I=i[z];let O;${
          body($.items)
        }${$.uniqueItems ? "u.add(JSON.stringify(O));" : ""}o[z]=O}`;
      if ($.uniqueItems) to += `o.length===u.size||${no("uniqueItems")}`;
      break;
    case "object":
      to +=
        'typeof I==="object"&&I&&!Array.isArray(I)){const s=`${S}/properties`,v=V,i=I,o=O={},k=new Set(Object.keys(i));';
      for (const key of Object.keys($.properties).sort()) {
        const raw = JSON.stringify(key);
        const en = raw.slice(1, -1).replaceAll("~", "~0").replaceAll("/", "~1");
        to +=
          `if(Object.hasOwn(i,${raw})){k.delete(${raw});const S=\`\${s}/${en}\`,V=\`\${v}/${en}\`,I=i[${raw}];let O;${
            body($.properties[key])
          }o[${raw}]=O}`;
        const required = $.required?.indexOf(key);
        if (required! >= 0) to += `else${no(`required/${required}`)}`;
      }
      to +=
        `if(k.size){const v=V;for(const K of k){const V=\`\${v}/\${K.replaceAll("~", "~0").replaceAll("/", "~1")}\`;${
          no("additionalProperties")
        }}}`;
      break;
  }
  return `${to}}else${no("type")}`;
};
/** Pointer-generating, clone-returning validator. */
export type Check<A extends Schema> = (
  $: unknown,
) => Generator<string, Instance<A>>;
/** Compiles a schema to a validator. */
export const compile = <const A extends Schema>($: A): Check<A> =>
  Function(`return function*(I){const S="",V="";let O;${body($)}return O}`)();
/** Uses a validator as a type predicate. */
export const is = <A extends Schema>(
  check: Check<A>,
  $: unknown,
): $ is Instance<A> => check($).next().done!;
/** Uses a validator as a parser for deep-copied data or error pointers. */
export const to = <A extends Schema>(
  check: Check<A>,
  $: unknown,
): Result<Instance<A>, { type: string; data: string }[]> => {
  const iterator = check($), cause = [];
  let next = iterator.next();
  while (!next.done) {
    const paths = next.value.split(/~(?=\/|$)/);
    cause.push({ type: paths[0], data: paths[1] }), next = iterator.next();
  }
  if (cause.length) return new Err(cause);
  else return { state: true, value: next.value };
};
