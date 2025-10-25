import { assertEquals } from "@std/assert";

const RULES: Deno.lint.Plugin["rules"] = {};
const rules = new Proxy(RULES, {
  get: (target, name: string) => target[name] = {} as Deno.lint.Rule,
});
const assertRule = (
  rule: string,
  source: string,
  expected: (Omit<Deno.lint.Diagnostic, "id"> & { id?: string })[],
) =>
  assertEquals(
    Deno.lint.runPlugin({ name: "libn-test", rules: RULES }, "main.ts", source),
    expected.map(($) => ({
      id: $.id?.replace(/^libn(?=\/)/, "$&-test") ?? `libn-test/${rule}`,
      fix: [],
      ...$,
    })),
  );
export default { name: "libn", rules: RULES } satisfies Deno.lint.Plugin;

// https://docs.deno.com/runtime/contributing/style_guide/#error-messages
rules["error-messages"].create = (ctx) =>
  /test\.ts$/.test(ctx.filename) ? {} : {
    NewExpression(node) {
      if (node.callee.type !== "Identifier") return;
      const name = node.callee.name;
      if (!/Error$/.test(name)) return;
      const message = node.arguments[0];
      if (message?.type !== "Literal") return;
      const value = message.value;
      if (typeof value !== "string") return;
      const fix = ($: string) => (fixer: Deno.lint.Fixer) =>
        fixer.replaceText(
          message,
          message.raw[0] + $ + message.raw[message.raw.length - 1],
        );
      value[0] !== value[0].toUpperCase() && ctx.report({
        node: message,
        message: "Error message starts with a lowercase character.",
        hint:
          "Capitalize the error message. See https://docs.deno.com/runtime/contributing/style_guide/#error-messages for more details.",
        fix: fix(value[0].toUpperCase() + value.slice(1)),
      });
      /\.$/.test(value) && ctx.report({
        node: message,
        message: "Error message ends with a period.",
        hint:
          "Remove the period at the end of the error message. See https://docs.deno.com/runtime/contributing/style_guide/#error-messages for more details.",
        fix: fix(value.slice(0, -1)),
      });
      /\. /.test(value) && ctx.report({
        node: message,
        message: "Error message contains periods.",
        hint:
          "Remove periods in error message and use a colon for additional information. See https://docs.deno.com/runtime/contributing/style_guide/#error-messages for more details.",
      });
      /[A-Z]'[A-Z]|[A-Za-z]'[a-z]/.test(value) && ctx.report({
        node: message,
        message: "Error message uses contractions.",
        hint:
          "Use the full form in error message. See https://docs.deno.com/runtime/contributing/style_guide/#error-messages for more details.",
      });
    },
  };
Deno.test("error-messages", () => {
  assertRule(
    "error-messages",
    `// good
new Error("Cannot parse input");
new Error("Cannot parse input x");
new Error('Cannot parse input "hello, world"');
new Error("Cannot parse input x: value is empty");

// ignored
const classes = { Error: Error }
new classes.Error();
new Class("cannot parse input.");
new Error(message);
new WrongParamTypeForAnError(true);`,
    [],
  );
  assertRule(
    "error-messages",
    `new Error("cannot parse input");
new TypeError("Cannot parse input.");
new SyntaxError("Invalid input x");
new RangeError("Cannot parse input x. value is empty")
new CustomError("Can't parse input");`,
    [{
      message: "Error message starts with a lowercase character.",
      range: [10, 30],
      hint:
        "Capitalize the error message. See https://docs.deno.com/runtime/contributing/style_guide/#error-messages for more details.",
      fix: [{ range: [10, 30], text: '"Cannot parse input"' }],
    }, {
      message: "Error message ends with a period.",
      range: [47, 68],
      hint:
        "Remove the period at the end of the error message. See https://docs.deno.com/runtime/contributing/style_guide/#error-messages for more details.",
      fix: [{ range: [47, 68], text: '"Cannot parse input"' }],
    }, {
      message: "Error message contains periods.",
      range: [122, 160],
      hint:
        "Remove periods in error message and use a colon for additional information. See https://docs.deno.com/runtime/contributing/style_guide/#error-messages for more details.",
    }, {
      message: "Error message uses contractions.",
      range: [178, 197],
      hint:
        "Use the full form in error message. See https://docs.deno.com/runtime/contributing/style_guide/#error-messages for more details.",
    }],
  );
});

// https://typescript-eslint.io/rules/array-type/
rules["array-type"].create = (ctx) => ({
  TSTypeReference: (node) =>
    node.typeName.type === "Identifier" &&
    /^(?:Readonly)?Array$/.test(node.typeName.name) &&
    ctx.report({
      message: "Array type is defined using a generic.",
      node,
      hint: "Use array syntax, e.g. `T[]`.",
    }),
});
Deno.test("array-type", () => {
  assertRule(
    "array-type",
    `const a: any[] = [];
const b = ($: readonly any[]) => {};
const c = <A extends readonly any[]>() => {};
type D = any[];`,
    [],
  );
  assertRule(
    "array-type",
    `const a1: Array<any> = [];
const b = ($: ReadonlyArray<any>) => {};
const c = <A extends Readonly<Array<any>>>() => {};
type D = Array<any>;`,
    ([[10, 20], [41, 59], [98, 108], [129, 139]] satisfies Deno.lint.Range[])
      .map((range) => ({
        message: "Array type is defined using a generic.",
        range,
        hint: "Use array syntax, e.g. `T[]`.",
      })),
  );
});

// https://typescript-eslint.io/rules/no-shadow/
rules["no-shadow"].create = () => ({});

// https://typescript-eslint.io/rules/no-floating-promises/
rules["no-floating-promises"].create = () => ({});

// https://typescript-eslint.io/rules/return-await/
rules["return-await"].create = () => ({});

// https://typescript-eslint.io/rules/switch-exhaustiveness-check/
rules["switch-exhaustiveness-check"].create = () => ({});
