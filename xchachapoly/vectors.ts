import { get, set } from "../test.ts";

const [rfc8439, xchachaDraft, donna, wycheproof] = await Promise.all([
  get`www.rfc-editor.org/rfc/rfc8439.txt`,
  get`www.ietf.org/archive/id/draft-irtf-cfrg-xchacha-03.txt`,
  get`/floodyberry/poly1305-donna/e6ad6e091d30d7f4ec2d4f978be1fcfcbce72781/poly1305-donna.c`,
  get`/C2SP/wycheproof/9261e367c14fb762ae28dda9bb5e84b606cdc2fc/testvectors_v1/xchacha20_poly1305_test.json`,
]);

const rfc = (...sources: [from: [number, number], regex: RegExp][]) =>
  sources.flatMap(([from, regex]) =>
    Array.from(
      regex.global
        ? rfc8439.slice(...from).matchAll(regex)
        : [rfc8439.slice(...from).match(regex)!],
      ({ groups: { count, ...rest } = {} }) =>
        Object.keys(rest).reduce((to, key) => ({
          ...to,
          [key]: rest[key].match(
            /(?<=^|[\da-f]{2}[\s:])[\da-f](?:\n {6})?[\da-f](?=[\s).:]|$)|(?<=^|[\s(:])[\da-f]{2}(?=[\s:][\da-f]{2}|$)/gi,
          )?.join("").replace(/\n {6}/g, "") ?? "",
        }), count === undefined ? {} : { count: Number(count) }),
    )
  );
const xchacha = {
  "2.2.1": xchachaDraft.slice(9906, 11288).match(
    /Key = ([\da-f]{2}(?::\s*[\da-f]{2})+).*?Nonce = \(([^)]+)\).*?key:((?:\s+[\da-f]{8})+)/s,
  )!.slice(1).map(($) => $.replace(/[\s\W]+/g, "")),
  "A.3.1": xchachaDraft.slice(30715, 31722).match(
    /(?:[\da-f]{24,}\s*)+/g,
  )!.map(($) => $.replace(/\s+/g, "")),
  "A.3.2.1": xchachaDraft.slice(31876, 34302).match(
    /(?:[\da-f]{24,}\s*)+/g,
  )!.map(($) => $.replace(/\s+/g, "")),
};
await set(import.meta, {
  chacha: rfc([
    [17603, 19535],
    /Key = (?<key>.+?)\..*?Nonce = \((?<iv>.+?)\).*?Count = (?<count>\d+).*?Block:\n(?<state>.+)\n\n/s,
  ], [
    [35223, 36189],
    /Key:\n(?<key>.+?)\n\n.*?Nonce:\n(?<iv>.+?)\n\n(?<count>).*?Output bytes:\n(?<state>.+?)\n\n/s,
  ], [
    [57774, 62180],
    /Key:\n(?<key>.+?)\n\n.*?Nonce:\n(?<iv>.+?)\n\n.*?Counter = (?<count>\d+)\n.*?Keystream:\n(?<state>.+?)\n\n/gs,
  ], [
    [78677, 80251],
    /Key:?\n(?<key>.+?)\n\n.*?nonce:\n(?<iv>.+?)\n\n(?<count>).*?key:\n(?<state>.+?)\n\n/gs,
  ]),
  hchacha: [{
    key: xchacha["2.2.1"][0],
    iv: xchacha["2.2.1"][1],
    subkey: xchacha["2.2.1"][2],
  }],
  xor: rfc([
    [22184, 26014],
    /Key = (?<key>.+?)\..*?Nonce = \((?<iv>.+?)\).*?Counter = (?<count>\d+).*?Plaintext Sunscreen:\n(?<plaintext>.+?)\n\n.*?Ciphertext Sunscreen:\n(?<ciphertext>.+?)\n\n/s,
  ], [
    [62351, 69083],
    /Key:\n(?<key>.+?)\n\n.*?Nonce:\n(?<iv>.+?)\n\n.*?Counter = (?<count>\d+)\n\n.*?Plaintext:\n(?<plaintext>.+?)\n\n.*?Ciphertext:\n(?<ciphertext>.+?)\n\n/gs,
  ]),
  cipher: [{
    plaintext: xchacha["A.3.2.1"][0],
    key: xchacha["A.3.2.1"][1],
    iv: xchacha["A.3.2.1"][2],
    keystream: xchacha["A.3.2.1"][3],
    ciphertext: xchacha["A.3.2.1"][4],
  }],
  poly: [
    ...rfc([
      [30257, 32670],
      /Key Material: (?<key>.+?\n.+?)\n.*?Message to be Authenticated:\n(?<message>.+?)\n\n.*?Tag: (?<tag>.+)/s,
    ], [
      [69083, 75560],
      /Key:\n(?<key>.+?)\n\n.*?Text to MAC:\n(?<message>.+?)\n\n.*?Tag:\n(?<tag>.+?)\n\n/gs,
    ], [
      [75560, 78677],
      /R:\n(?<key>.+?)\s*data:\n(?<message>.+?)\s*tag:\n(?<tag>.+?)\n/gs,
    ]),
    ...Array.from(
      donna.slice(2098, 5823).matchAll(
        /key\[32\] = \{(.+?)\};.+?msg\[\d+\] = \{(.+?)\};.+?mac\[16\] = \{(.+?)\};/gs,
      ).map((match) =>
        match.slice(1).map(($) => $.match(/(?<=0x)[\da-f]{2}\b/g)!.join(""))
      ),
      ([key, message, tag]) => ({ key, message, tag }),
    ),
  ],
  ...[
    {
      key: xchacha["A.3.1"][2],
      iv: xchacha["A.3.1"][3],
      plaintext: xchacha["A.3.1"][0],
      ad: xchacha["A.3.1"][1],
      ciphertext: xchacha["A.3.1"][5],
      tag: xchacha["A.3.1"][6],
      result: true,
    },
    ...JSON.parse(wycheproof).testGroups.flatMap((group: {
      ivSize: number;
      tests: {
        key: string;
        iv: string;
        aad: string;
        msg: string;
        ct: string;
        tag: string;
        result: "valid" | "invalid";
      }[];
    }) =>
      group.ivSize !== 192 ? [] : group.tests.map(($) => ({
        key: $.key,
        iv: $.iv,
        plaintext: $.msg,
        ad: $.aad,
        ciphertext: $.ct,
        tag: $.tag,
        result: $.result === "valid",
      }))
    ),
  ].reduce((to, { result, ...rest }) => {
    result && to.xchachaPoly.push(rest);
    to.polyXchacha.push({ result, ...rest });
    return to;
  }, { xchachaPoly: [] as {}[], polyXchacha: [] as {}[] }),
}, "637ef79d94da5499980f227261ef778ccb4d96d984810680f987c64a1b26c162");
