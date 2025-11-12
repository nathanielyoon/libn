# @libn/utf

Process UTF-8 and UTF-16.

## default

Escape strings before including them in
[HTML](https://dev.mozilla.org/docs/Glossary/Character_reference) or
[regex](https://dev.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape).

```ts
import { unhtml, unrexp } from "@libn/utf";
import { assertMatch } from "@std/assert";

assertMatch(unhtml("<script>alert(1)</script>"), /^[^<>]*$/);
assertMatch("(?:[\n])", RegExp(unrexp("(?:[\n])")));
```

Restrict strings to [RFC 9839](https://www.rfc-editor.org/rfc/rfc9839.txt)
Unicode Assignables subset, or at least replace lone surrogates.

```ts
import { uncode, unlone } from "@libn/utf";
import { assertEquals } from "@std/assert";

const string = "\ud800\0";
assertEquals(uncode(string), "\ufffd\ufffd");
assertEquals(unlone(string), "\ufffd\0");
```

Remove nonstandard
[breaks](https://dev.mozilla.org/docs/Web/JavaScript/Reference/Lexical_grammar#line_terminators)
and [diacritics](https://wikipedia.org/wiki/Diacritic).

```ts
import { unline, unmark } from "@libn/utf";
import { assertEquals } from "@std/assert";

const string = "\r\n\xf1";
assertEquals(unline(string), "\n\xf1");
assertEquals(unmark(string), "\r\nn");
```

[Case fold](https://www.unicode.org/Public/UNIDATA/CaseFolding.txt) strings to
compare them case-insensitively.

```ts
import { uncase } from "@libn/utf";
import { assertEquals, assertNotEquals } from "@std/assert";

const one = "FUSS", two = "Fu\xdf";
assertNotEquals(one, two);
assertEquals(uncase(one), uncase(two));
```
