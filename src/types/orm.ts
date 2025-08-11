import { Data, Type } from "./json.ts";
import { en_b16, en_bin } from "@nyoon/lib/base";

type Row = Type<"object"> & {
  nullable?: false;
  properties: {
    [key: string]:
      | Type<"boolean" | "number" | "string">
      | Type<"array"> & {
        nullable?: false;
        items: Row["properties"][string] & { nullable?: false };
        max_items: number;
      }
      | Row;
  };
};
type Rower =
  | Type<"boolean" | "number" | "string">
  | Type<"array"> & {
    nullable?: false;
    items: Rower & { nullable?: false };
    max_items: number;
  }
  | Type<"object"> & {
    nullable?: false;
    properties: { [key: string]: Rower };
  };
type Rowed = { [pointer: string]: Type<"boolean" | "number" | "string"> };
const point = (prefix: string, key: string) =>
  `${prefix}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
const flatten = (key: string, type: Rower): Rowed =>
  type.kind === "array"
    ? Array.from(
      { length: type.max_items },
      (_, z) => flatten(`${key}/${z}`, type.items),
    ).reduce((all, $) => ({ ...all, ...$ }), {})
    : type.kind === "object"
    ? Object.keys(type.properties).reduce(
      (all, $) => ({ ...all, ...flatten(point(key, $), type.properties[$]) }),
      {},
    )
    : { [key]: type };
const unflat = (row: Rowed) => Object.keys(row);
const sql = (
  template: TemplateStringsArray,
  ...$: ({ [_: string]: any } | string | (null | boolean | number | string)[])[]
) =>
  $.reduce<string>(
    (statement, use, z) =>
      `${statement}${
        Array.isArray(use)
          ? use.map((value) =>
            typeof value === "string"
              ? `'${value.replaceAll("'", "''")}'`
              : `${value}`.toUpperCase()
          )
          : typeof use === "string"
          ? use
          : Object.keys(use).map((key) =>
            `${key.replaceAll('"', '""') || '""'}${use[key] || ""}`
          )
      }`,
    template[0],
  );
