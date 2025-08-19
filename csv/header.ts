import type { Row } from "./main.ts";

/** Encodes array of objects -> array of rows (with header). */
export const en_header = <A>(
  rows: { [_: string]: string | A }[],
  header: string[] = Object.keys(rows[0] ?? {}),
): Row<A>[] => {
  const a = Function(
    "$",
    `return[${header.map(($) => `$[${JSON.stringify($)}]`)}]`,
  );
  const b = Array(rows.length);
  for (let z = 0; z < rows.length; ++z) b[z] = a(rows[z]);
  if (b.length || header.length) b.unshift(header);
  return b;
};
/** Decodes array of rows (with header) -> array of objects. */
export const de_header = <A>(rows: Row<A>[]): { [_: string]: string | A }[] => {
  const a = Function(
    "$",
    `return{${
      rows[0].map(($, z) =>
        `${JSON.stringify($ === "__proto__" ? [$] : $)}:$[${z}]`
      )
    }}`,
  );
  const b = Array(rows.length - 1);
  for (let z = 0; z < b.length;) b[z] = a(rows[++z]);
  return b;
};
