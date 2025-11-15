# @libn/result

Functional result handling.

## default

Handle errors like
[Rust's std::result](https://doc.rust-lang.org/std/result/#the-question-mark-operator-).

```ts ignore
import { safe } from "@libn/result";

// Refactor this:
const parse = (
  json: string,
  reviver?: (this: any, key: string, value: any) => any,
) => {
  try {
    return JSON.parse(json, reviver);
  } catch (thrown) {
    if (thrown instanceof SyntaxError) {
      console.error(thrown);
      return;
    } else throw thrown;
  }
};

// To this:
const parse = safe(JSON.parse, ($) => console.error($.message));
```

```ts ignore
import { exec, some } from "@libn/result";

// Refactor this:
const respond = async (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const token = /^Bearer (.+)$/.exec(header);
  if (!token) return null;
  const validatedBody = validateBody(token, await request.text());
  if (!validatedBody) return null;
  return validatedBody;
};

// To this:
const respond = exec(async function* (request: Request) {
  const header = yield* some(request.headers.get("authorization"));
  const token = yield* some(/^Bearer (.+)$/.exec(header));
  return yield* some(validateBody(token, await request.text()));
});
```

```ts ignore
import { fail, join, pass } from "@libn/result";

// Refactor this:
const validate = (username: string, password: string) => {
  const tooShort = password.length < 256 && "Password is too short";
  const tooLong = password.length > 20 && "Password is too long";
  const hasUsername = password.includes(username) && "Password has username";
  if (tooShort || tooLong || hasUsername) {
    return { valid: false, rules: [tooShort, tooLong, hasUsername] };
  } else return { valid: true };
};

// To this:
const validate = (username: string, password: string) =>
  join([
    password.length < 256 ? fail("Password is too short") : pass(),
    password.length > 20 ? fail("Password is too long") : pass(),
    password.includes(username) ? fail("Password has username") : pass(),
  ]);
```
