import { lowerCamel, upperCamel } from "@libn/words";
import { assertEquals } from "@std/assert";

/** Custom lint plugin. */
const plugin: Deno.lint.Plugin = { name: "libn", rules: {} };
export default plugin;
const rule = (name: string, create: Deno.lint.Rule["create"]) => {
  plugin.rules[name] = { create };
  return (
    raw: TemplateStringsArray,
    ...$: [
      bad: string,
      message: string,
      ...fix: [] | [string, Deno.lint.Range?],
    ][]
  ) =>
    Deno.test(name, () => {
      let source = raw[0];
      const diagnostics = Array($.length);
      for (let z = 0; z < $.length; ++z) {
        const [bad, message, fix, to] = $[z];
        const range: Deno.lint.Range = [source.length, (source += bad).length];
        diagnostics[z] = {
          id: `libn/${name}`,
          range,
          message,
          fix: fix !== undefined ? [{ range: to ?? range, text: fix }] : [],
          hint: undefined,
        };
        source += raw[z + 1];
      }
      assertEquals(Deno.lint.runPlugin(plugin, "main.ts", source), diagnostics);
    });
};

rule("error-messages", (ctx) => {
  const visit = (node: Deno.lint.NewExpression | Deno.lint.CallExpression) => {
    if (
      node.callee.type !== "Identifier" ||
      !/^(?:[A-Z].*)?Error$/.test(node.callee.name)
    ) return;
    const message = node.arguments[0];
    if (message?.type !== "Literal") return;
    const value = message.value;
    if (typeof value !== "string") return;
    const fix = ($: string) => (fixer: Deno.lint.Fixer) =>
      fixer.replaceText(
        message,
        message.raw[0] + $ + message.raw[message.raw.length - 1],
      );
    /^[a-z]/.test(value) && ctx.report({
      node: message,
      message: "Error message starts with a lowercase character.",
      fix: fix(value[0].toUpperCase() + value.slice(1)),
    });
    /\.$/.test(value) && ctx.report({
      node: message,
      message: "Error message ends with a period.",
      fix: fix(value.slice(0, -1)),
    });
    /\. /.test(value) && ctx.report({
      node: message,
      message: "Error message contains periods.",
      fix: fix(value.replaceAll(".", ":")),
    });
    /[A-Z]'[A-Z]|[A-Za-z]'[a-z]/.test(value) && ctx.report({
      node: message,
      message: "Error message uses contractions.",
    });
  };
  return { CallExpression: visit, NewExpression: visit };
})`
new Error("Cannot parse input");
new Error("Cannot parse input x");
new Error('Cannot parse input "hello, world"');
new Error("Cannot parse input x: value is empty");
const classes = { Error: Error };
new classes.Error();
new Class("cannot parse input.");
new Error(message);
new WrongParamTypeForAnError(true);
checkError("hi");
Error(${[
  '"cannot parse input"',
  "Error message starts with a lowercase character.",
  '"Cannot parse input"',
]});
new TypeError(${[
  '"Cannot parse input."',
  "Error message ends with a period.",
  '"Cannot parse input"',
]});
RangeError(${[
  '"Cannot parse input x. value is empty"',
  "Error message contains periods.",
  '"Cannot parse input x: value is empty"',
]});
new CustomError(${[
  '"Can\'t parse input"',
  "Error message uses contractions.",
]});`;

rule("naming-convention", (ctx) => {
  const [isLowerCamel, isUpperCamel, isUpperSnake] = [
    /^[$_]?[a-z][\da-z]*(?:[A-Z][\da-z]*)*_?$/,
    /^[$_]?(?=.*[\da-z])(?:[A-Z][\da-z]*)+_?$/,
    /^[$_]?[A-Z][\dA-Z]*(?:_[\dA-Z]+)*_?$/,
  ].map(($) => RegExp.prototype.test.bind($));
  const toUpperCamel =
    (kind: string) => ({ id }: { id: Deno.lint.Identifier | null }) =>
      id?.name && !isUpperCamel(id?.name) && ctx.report({
        node: id,
        message: `${kind} name '${id?.name}' is not UpperCamel case.`,
        fix: (fixer) => fixer.replaceText(id, upperCamel(id?.name)),
      });
  const toLowerCamel =
    <A extends string>(kind: string, key: A) =>
    ({ [key]: id }: {
      [_ in A]: Deno.lint.Expression | Deno.lint.PrivateIdentifier | null;
    }) =>
      (id?.type === "Identifier" || id?.type === "PrivateIdentifier") &&
      !isLowerCamel(id.name) && ctx.report({
        node: id,
        message: `${kind} name '${id.name}' is not lowerCamel case.`,
        fix: (fixer) => fixer.replaceText(id, lowerCamel(id.name)),
      });
  return {
    FunctionDeclaration: toLowerCamel("Function", "id"),
    FunctionExpression: toLowerCamel("Function", "id"),
    MethodDefinition: toLowerCamel("Method", "key"),
    PropertyDefinition: toLowerCamel("Property", "key"),
    TSTypeAliasDeclaration: toUpperCamel("Type"),
    TSInterfaceDeclaration: toUpperCamel("Interface"),
    TSEnumDeclaration: toUpperCamel("Enum"),
    ClassDeclaration: toUpperCamel("Class"),
    VariableDeclaration: ({ declarations }) => {
      for (const { id } of declarations) {
        if (id.type !== "Identifier") return;
        const name = id.name;
        name && !isLowerCamel(name) && !isUpperCamel(name) &&
          !isUpperSnake(name) && !/^[$_]$/.test(name) && ctx.report({
            node: id,
            message:
              `Variable name '${name}' is not lowerCamel, UpperCamel, or UPPER_SNAKE case.`,
          });
      }
    },
  };
})`
function lowerCamelFunction0(this) {}
function* ${[
  "UpperCamelFunction",
  "Function name 'UpperCamelFunction' is not lowerCamel case.",
  "upperCamelFunction",
]}(this: any) {}
const lower = function ${[
  "lower_snake_function_2",
  "Function name 'lower_snake_function_2' is not lowerCamel case.",
  "lowerSnakeFunction2",
]}(this: any) {}
class UpperCamelClass0 {
  lowerCamelProperty0;
  lowerCamelMethod0() {}
}
class ${[
  "lowerCamelClass",
  "Class name 'lowerCamelClass' is not UpperCamel case.",
  "LowerCamelClass",
]} {
  ${[
  "UpperCamelProperty",
  "Property name 'UpperCamelProperty' is not lowerCamel case.",
  "upperCamelProperty",
]};
  ${[
  "UPPER",
  "Method name 'UPPER' is not lowerCamel case.",
  "upper",
]}() {}
}
interface UpperCamelInterface {}
interface ${[
  "lowerCamelInterface",
  "Interface name 'lowerCamelInterface' is not UpperCamel case.",
  "LowerCamelInterface",
]} {}
type UpperCamelType0 = {};
type Type = {};
type ${[
  "type",
  "Type name 'type' is not UpperCamel case.",
  "Type",
]} = {};
enum Upper0CamelEnum {}
enum ${[
  "UP",
  "Enum name 'UP' is not UpperCamel case.",
  "Up",
]} {}
const c = 0;
const C1 = 1, C_2 = 2;
let lets, LETS;
var variable, variableDeclaration;
const ${[
  "__",
  "Variable name '__' is not lowerCamel, UpperCamel, or UPPER_SNAKE case.",
]} = 0;
let ${[
  "A_b",
  "Variable name 'A_b' is not lowerCamel, UpperCamel, or UPPER_SNAKE case.",
]}, ${[
  "a_B",
  "Variable name 'a_B' is not lowerCamel, UpperCamel, or UPPER_SNAKE case.",
]}, ${[
  "a_b",
  "Variable name 'a_b' is not lowerCamel, UpperCamel, or UPPER_SNAKE case.",
]};
var ${[
  "_1",
  "Variable name '_1' is not lowerCamel, UpperCamel, or UPPER_SNAKE case.",
]};
`;

rule("prefer-arrow", (ctx) => {
  const check = (
    node: Deno.lint.FunctionDeclaration | Deno.lint.FunctionExpression,
  ) =>
    node.generator ||
    node.returnType?.typeAnnotation?.type === "TSTypePredicate" ||
    /\b(?:this|yield|new\.target|arguments)\b/.test(
      ctx.sourceCode.getText(node),
    );
  return ({
    FunctionDeclaration: (node) =>
      !check(node) && ctx.report({
        node,
        message: "Function declaration has no arrow-incompatible syntax.",
      }),
    ":not(MethodDefinition) > FunctionExpression": (node) =>
      !check(node) && !node.id?.name && ctx.report({
        node,
        message: "Function expression has no arrow-incompatible syntax.",
      }),
  });
})`
class Class {
  method() {}
}
function* generator() {
  yield 0;
}
${[
  "function notGenerator() {}",
  "Function declaration has no arrow-incompatible syntax.",
]}
const asserter = function (param: unknown): asserts param {}
const noPredicate = ${[
  "function (param: unknown) {}",
  "Function expression has no arrow-incompatible syntax.",
]};
const thisParameter = function (this: void) {}
const thisInBody = function () {
  this;
}
const constructable = function () {
  return new.target;
}
function hasArguments() {
  return arguments.length;
}
const named = function named() {}
const unnamed = ${[
  "function () {}",
  "Function expression has no arrow-incompatible syntax.",
]}
`;

rule("no-async-promise-executor", (ctx) => ({
  NewExpression: (node) => {
    node.callee.type === "Identifier" && node.callee.name === "Promise" &&
      node.arguments[0]?.["async" as keyof Deno.lint.Expression] && ctx.report({
        node,
        message: "Promise executor function is async.",
      });
  },
}))`
new Promise((resolve) => resolve());
${[
  "new Promise(async (resolve) => resolve(await Promise.resolve(0)))",
  "Promise executor function is async.",
]};
${[
  "new Promise(async function executor(resolve) { resolve(await Promise.resolve(0)); })",
  "Promise executor function is async.",
]}`;

rule("no-useless-string-escape", (ctx) => {
  const report = (index: number, $: string) =>
    ctx.report({
      range: [index, index + 1 + $.length],
      message: `'\\${$}' is unnecessarily backslash-escaped.`,
      fix: (fixer) => fixer.replaceTextRange([index, index + 1 + $.length], $),
    });
  const check = (
    node: Deno.lint.TemplateElement | Deno.lint.Literal,
    text: string,
  ) => {
    const template = node.type === "TemplateElement";
    for (
      const $ of text.matchAll(RegExp(
        `(?<!\\\\)(?:\\\\\\\\)*\\\\([^\\n\\r${
          template ? "`" : node.raw[0]
        }0\\\\nrvtbfux\\u2028\\u2029])`,
        "g",
      )) ?? []
    ) {
      if (template) {
        if ($[1] === "$") {
          if (text[$.index + 2] === "{") continue;
        } else if ($[1] === "{" && text[$.index - 1] === "$") continue;
      }
      report(node.range[0] + $.index, $[1]);
    }
  };
  return {
    TemplateElement: (node) =>
      node.parent.parent.type !== "TaggedTemplateExpression" &&
      check(node, node.raw),
    Literal: (node) =>
      typeof node.value === "string" &&
      !/^JSX(?:Attribute|Element|Fragment)$/.test(node.parent.type) &&
      check(node, ctx.sourceCode.getText(node)),
  };
})`
"\\"";
"${["\\'", "'\\'' is unnecessarily backslash-escaped.", "'"]}"
"${["\\`", "'\\`' is unnecessarily backslash-escaped.", "`"]}"

'\\''
'${['\\"', "'\\\"' is unnecessarily backslash-escaped.", '"']}'
'${["\\`", "'\\`' is unnecessarily backslash-escaped.", "`"]}'

\`\\\`\`;
\`${['\\"', "'\\\"' is unnecessarily backslash-escaped.", '"']}\`;
\`${["\\'", "'\\'' is unnecessarily backslash-escaped.", "'"]}\`;

\`\\\${$\\{\`;
\`${["\\$", "'\\$' is unnecessarily backslash-escaped.", "$"]}\`;
\`${["\\{", "'\\{' is unnecessarily backslash-escaped.", "{"]}\`;
\`${["\\}", "'\\}' is unnecessarily backslash-escaped.", "}"]}\`;

"\\
\\\r
\\\u2028\\\u2029\\0${[
  "\\\t",
  "'\\\t' is unnecessarily backslash-escaped.",
  "\t",
]}";
'\\n\\r\\v\\t\\b\\f${[
  "\\a",
  "'\\a' is unnecessarily backslash-escaped.",
  "a",
]}';
\`\\x00\\u0000\`;`;

rule("parse-int-radix", (ctx) => {
  const valid = new Set<unknown>(Array(35).keys().map(($) => $ + 2));
  return {
    CallExpression: (node) => {
      switch (node.callee.type) {
        case "Identifier":
          if (node.callee.name !== "parseInt") return;
          break;
        case "MemberExpression":
          if (
            node.callee.object.type !== "Identifier" ||
            node.callee.object.name !== "parseInt"
          ) return;
          break;
        default:
          return;
      }
      switch (node.arguments.length) {
        default:
          ctx.report({
            node,
            message: `Expected 2 arguments, but got ${node.arguments.length}.`,
          });
          break;
        case 1:
          ctx.report({
            node,
            message: "Missing radix argument.",
            fix: (fixer) => fixer.insertTextAfter(node.arguments[0], ", 10"),
          });
          break;
        case 2: {
          const radix = node.arguments[1];
          (radix.type === "Literal" && !valid.has(radix.value) ||
            radix.type === "Identifier" && radix.name === "undefined") &&
            ctx.report({
              node: radix,
              message: "Radix is not an integer from 2-36.",
            });
          break;
        }
      }
    },
  };
})`
parseInt("0", 2);
parseInt("0", 10);
parseInt("0", 16);
parseInt("0", 32);
parseInt("0", 36);

${["parseInt()", "Expected 2 arguments, but got 0."]};
${['parseInt("0", 0, 0)', "Expected 2 arguments, but got 3."]};
${['parseInt("0")', "Missing radix argument.", ", 10", [141, 141]]};
parseInt("0", ${["0", "Radix is not an integer from 2-36."]});`;
