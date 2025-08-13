import fc from "npm:fast-check@^4.2.0";

const get = ($: string) => fetch(`https://${$}`);
/** Fetchs JSON data. */
export const get_json = <A = any>(url: string) =>
  get(url).then<A>(($) => $.json());
/** Fetches text data. */
export const get_text = (url: string | number, start?: number, end?: number) =>
  get(typeof url === "string" ? url : `www.rfc-editor.org/rfc/rfc${url}.txt`)
    .then(($) => $.text()).then(($) => $.slice(start, end));
/** Writes JSON to a relative path. */
export const write = (meta: ImportMeta, keys?: string[]) => ($: any) =>
  Deno.writeTextFile(
    meta.url.replace(
      /^file:\/\/(.+?)\/([^/]+)\.test\.ts$/,
      "$1/vectors/$2.json",
    ),
    JSON.stringify(
      keys?.reduce((all, key, z) => ({ ...all, [key]: $[z] }), {}) ?? $,
    ),
  );
/** Default number arbitrary. */
export const fc_number = ($?: fc.DoubleConstraints) =>
  fc.double({ noDefaultInfinity: true, noNaN: true, ...$ });
/** Default string arbitrary. */
export const fc_string = ($?: fc.StringConstraints) =>
  fc.string({ unit: "grapheme", size: "medium", ...$ });
/** Default binary arbitrary. */
export const fc_binary = ($?: fc.IntArrayConstraints) =>
  fc.uint8Array({ size: "large", ...$ });
