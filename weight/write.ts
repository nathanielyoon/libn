import { save } from "@libn/lib";

await Promise.all([
  ...["", "test/test_"].map(($) =>
    fetch(
      `https://raw.githubusercontent.com/bmc/munkres/99a5c54672ea03d0b4a1f7b168cd587325bc068e/${$}munkres.py`,
    ).then(($) => $.text())
  ),
  fetch(
    "https://jorisvr.nl/files/graphmatching/20130407/mwmatching.py",
  ).then(async ($) => (await $.text()).slice(35659)),
]).then(([munkres, test_munkres, mwmatching]) => ({
  assign: {
    munkres: [
      ...munkres.slice(17105, 17980).match(/(?<=\().+?(?=\))/gs)!,
      ...test_munkres.matchAll(
        /matrix = (\[[\s,-.\d[\]]+?\])\s+cost = _get_cost\(matrix\)\s+assert cost == (?:pytest\.approx\()?(\d+(?:\.\d+)?)/gs,
      ).take(7).map(($) => $.slice(1)),
    ].map(($) => {
      const [weights, total] = JSON.parse(`[${$}]`);
      return { weights, total };
    }),
  },
  blossom: {
    mwmatching: mwmatching.replace("math.pi", `${Math.PI}`)
      .replace("math.exp(1)", `${Math.exp(1)}`)
      .replace("math.sqrt(2.0)", `${Math.SQRT2}`)
      .matchAll(/\((\[[^\]]+\])(?:, (True|False))?\), (\[[^\]]+\])/g)
      .toArray()
      .map(($) => ({
        edges: JSON.parse($[1].replaceAll("(", "[").replaceAll(")", "]")),
        max: $[2] === "True",
        matching: JSON.parse($[3]),
      })),
  },
})).then(save(import.meta));
