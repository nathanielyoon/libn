{
  const noble = (await import("@noble/hashes/sha2.js")).sha256;
  const stablelib = (await import("@stablelib/sha256")).hash;
  const wasm = (await import("hash-wasm")).sha256;
  const libn = (await import("@libn/hash/sha2")).sha256;
  const data = crypto.getRandomValues(new Uint8Array(32));
  Deno.bench("noble", { group: "sha256" }, () => {
    noble(data);
  });
  Deno.bench("stablelib", { group: "sha256" }, () => {
    stablelib(data);
  });
  Deno.bench("wasm", { group: "sha256" }, async () => {
    await wasm(data);
  });
  Deno.bench("libn", { group: "sha256" }, () => {
    libn(data);
  });
}
{
  const noble = (await import("@noble/hashes/blake2.js")).blake2s;
  const stablelib = (await import("@stablelib/blake2s")).hash;
  const wasm = (await import("hash-wasm")).blake2s;
  const libn = (await import("@libn/hash/blake2")).blake2s;
  const data = crypto.getRandomValues(new Uint8Array(32));
  Deno.bench("noble", { group: "blake2s" }, () => {
    noble(data);
  });
  Deno.bench("stablelib", { group: "blake2s" }, () => {
    stablelib(data);
  });
  Deno.bench("wasm", { group: "blake2s" }, async () => {
    await wasm(data);
  });
  Deno.bench("libn", { group: "blake2s" }, () => {
    libn(data);
  });
}
{
  const noble = (await import("@noble/hashes/blake2.js")).blake2b;
  const stablelib = (await import("@stablelib/blake2b")).hash;
  const wasm = (await import("hash-wasm")).blake2b;
  const libn = (await import("@libn/hash/blake2")).blake2b;
  const data = crypto.getRandomValues(new Uint8Array(32));
  Deno.bench("noble", { group: "blake2b" }, () => {
    noble(data);
  });
  Deno.bench("stablelib", { group: "blake2b" }, () => {
    stablelib(data);
  });
  Deno.bench("wasm", { group: "blake2b" }, async () => {
    await wasm(data);
  });
  Deno.bench("libn", { group: "blake2b" }, () => {
    libn(data);
  });
}
{
  const noble = (await import("@noble/hashes/blake3.js")).blake3;
  const wasm = (await import("hash-wasm")).blake3;
  const libn = (await import("@libn/hash/blake3")).blake3;
  const data = crypto.getRandomValues(new Uint8Array(32));
  Deno.bench("noble", { group: "blake3" }, () => {
    noble(data);
  });
  Deno.bench("wasm", { group: "blake3" }, async () => {
    await wasm(data);
  });
  Deno.bench("libn", { group: "blake3" }, () => {
    libn(data);
  });
}
