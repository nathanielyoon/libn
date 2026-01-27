import type { Check } from "@libn/json/check";
import type {
  Arr,
  Bit,
  Int,
  Nil,
  Num,
  Obj,
  Opt,
  Rec,
  Schema,
  Str,
} from "@libn/json/schema";
import { BASES, bisect, escape, FORMATS, hasOwn, isObject } from "./lib.ts";

const nil: Check<Nil> = function* (this: Nil, $: any) {
  if ($ === null) return $;
  return yield* call("/oneOf/1", "", this.oneOf[1], $);
};
const opt: Check<Opt> = function* (this: Opt, $: any) {
  if (!this.enum.includes($)) yield "~/enum";
  return $;
};
const bit: Check<Bit> = function* (this: Bit, $: any) {
  if (typeof $ !== "boolean") yield "~/type";
  return $;
};
const numeric = function* (this: Int | Num, $: number) {
  if ($ < this.minimum!) yield "~/minimum";
  if ($ > this.maximum!) yield "~/maximum";
  if ($ <= this.exclusiveMinimum!) yield "~/exclusiveMinimum";
  if ($ >= this.exclusiveMaximum!) yield "~/exclusiveMaximum";
  if ($ % this.multipleOf!) yield "~/multipleOf";
};
const int: Check<Int> = function* (this: Int, $: any) {
  if (!Number.isInteger($)) yield "~/type";
  else yield* numeric.call(this, $);
  return $;
};
const num: Check<Num> = function* (this: Num, $: any) {
  if (!Number.isFinite($)) yield "~/type";
  else yield* numeric.call(this, $);
  return $;
};
const str: Check<Str> = function* str(this: Str, $: any) {
  if (typeof $ !== "string") yield "~/type";
  else {
    if ($.length < this.minLength!) yield "~/minLength";
    if ($.length > this.maxLength!) yield "~/maxLength";
    try {
      if (this.pattern && !RegExp(this.pattern).test($)) yield "~/pattern";
    } catch { /* empty */ }
    if (this.format && !FORMATS[this.format].test($)) yield "~/format";
    if (this.contentEncoding && !BASES[this.contentEncoding].test($)) {
      yield "~/contentEncoding";
    }
  }
  return $;
};
const arr: Check<Arr> = function* (this: Arr, $: any) {
  if (!Array.isArray($)) yield "~/type";
  else {
    if ($.length < this.minItems!) yield "~/minItems";
    if ($.length > this.maxItems!) yield "~/maxItems";
    const out = Array($.length);
    for (let z = 0; z < $.length; ++z) {
      out[z] = yield* call("/items", `/${z}`, this.items, $[z]);
    }
    if (this.uniqueItems) {
      const set = new Set<string>();
      for (let z = 0; z < out.length; ++z) set.add(JSON.stringify(out[z]));
      if (set.size < out.length) yield "~/uniqueItems";
    }
    return out;
  }
  return $;
};
const { compare } = Intl.Collator("en");
const rec: Check<Rec> = function* (this: Rec, $: any) {
  if (!isObject($)) yield "~/type";
  else {
    const keys = Object.keys($).sort(compare);
    if (keys.length < this.minProperties!) yield "~/minProperties";
    if (keys.length > this.maxProperties!) yield "~/maxProperties";
    const out: { [_: string]: unknown } = {};
    for (const key of keys) {
      const token = escape(key);
      if (this.propertyNames) {
        yield* call("/propertyNames", token, this.propertyNames, key);
      }
      out[key] = yield* call(
        "/additionalProperties",
        token,
        this.additionalProperties,
        $[key],
      );
    }
    return out;
  }
  return $;
};
const obj: Check<Obj> = function* (this: Obj, $: any) {
  if (!isObject($)) yield "~/type";
  else {
    const keys = new Set(Object.keys($).sort(compare));
    if (keys.size < this.minProperties!) yield "~/minProperties";
    if (keys.size > this.maxProperties!) yield "~/maxProperties";
    const out: { [_: string]: unknown } = {};
    for (const key of Object.keys(this.properties).sort(compare)) {
      if (hasOwn($, key)) {
        keys.delete(key);
        const token = escape(key);
        out[key] = yield* call(
          `/properties${token}`,
          token,
          this.properties[key],
          $[key],
        );
      } else if (this.required.includes(key)) {
        yield `${escape(key)}~/required/${this.required.indexOf(key)}`;
      }
    }
    if (keys.size) {
      for (const key of keys) yield `${escape(key)}~/additionalProperties`;
    }
    return out;
  }
  return $;
};
function* call(type: string, data: string, schema: Schema, $: unknown) {
  let check;
  if (hasOwn(schema, "oneOf")) check = nil;
  else if (hasOwn(schema, "enum")) check = opt;
  else {switch (schema.type) {
      case "boolean":
        check = bit;
        break;
      case "integer":
        check = int;
        break;
      case "number":
        check = num;
        break;
      case "string":
        check = str;
        break;
      case "array":
        check = arr;
        break;
      case "object":
        check = schema.additionalProperties ? rec : obj;
        break;
    }}
  const iterator = check.call(schema, $);
  let next = iterator.next();
  while (!next.done) {
    const mid = bisect(next.value) + 1;
    yield data + next.value.slice(0, mid) + type + next.value.slice(mid);
    next = iterator.next();
  }
  return next.value as any;
}
/** Binds checks to a schema. */
export const bind = <A extends Schema>(schema: A): Check<A> =>
  call.bind(null, "", "", schema);
