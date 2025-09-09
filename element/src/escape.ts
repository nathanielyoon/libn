const IN = /["&<>]/g, OUT = Array<string>(63).fill("");
OUT[34] = "&quot;", OUT[38] = "&amp;", OUT[60] = "&lt;", OUT[62] = "&gt;";
/** Escapes a string. */
export const escape = ($: string): string => {
  if (!IN.test($)) return $;
  let escaped = "", z = 0;
  do escaped += $.slice(z, z = IN.lastIndex - 1) +
    OUT[$.charCodeAt(z++)]; while (IN.test($));
  return escaped + $.slice(z);
};
