const IN = /["&<>]/g, OUT = Array<string>(63).fill("");
OUT[34] = "&quot;", OUT[38] = "&amp;", OUT[60] = "&lt;", OUT[62] = "&gt;";
/** Escapes a string. */
export const escape = ($: string): string => {
  if (!IN.test($)) return $;
  let b = "", c = 0;
  do b += $.slice(c, c = IN.lastIndex - 1) +
    OUT[$.charCodeAt(c++)]; while (IN.test($));
  return b + $.slice(c);
};
