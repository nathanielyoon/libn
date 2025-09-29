import fc from "fast-check";
import { DOMParser, Element } from "@b-fuze/deno-dom/native";

/** Arbitrary for a few tags. */
export const fc_tag: fc.Arbitrary<"b" | "u" | "s"> = fc.constantFrom(
  "b",
  "u",
  "s",
);
/** Arbitrary for a single lowercase letter. */
export const fc_letter: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 1,
  unit: fc.integer({ min: 97, max: 122 }).map(String.fromCharCode),
});
Deno.test.beforeAll(() => {
  globalThis.document = new DOMParser().parseFromString("", "text/html") as any;
  globalThis.Element = Element as any;
});
