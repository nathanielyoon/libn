import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_json, type Json } from "@libn/lib";
import type { Data, Type } from "../src/types.ts";
import { array, boolean, number, object, string } from "../src/build.ts";
import { coder } from "../src/code.ts";
import { BASES, parser } from "../src/parse.ts";
import {
  fc_base,
  fc_enum,
  fc_format,
  fc_formats,
  fc_max,
  fc_object,
  fc_types,
  TYPERS,
  TYPES,
} from "./common.ts";

const test = <A extends Type>(
  $: fc.Arbitrary<[{ type: A }, Data<Type<A["type"]>>]>,
) =>
  fc_assert($)(([typer, value]) => {
    const { length, encode, decode } = coder(typer.type);
    const result = parser(typer.type)(value);
    assert(result.state);
    const encoded = encode(result.value);
    assertEquals(encoded.length, length);
    assertEquals(decode(encoded), value);
  });
Deno.test('coder({ "type": "boolean" }) : arbitrary round-trip', () =>
  test(fc.tuple(fc.constant(boolean()), fc_types.boolean())));
Deno.test('coder({ "type": "number" }) : arbitrary round-trip', () =>
  test(fc.tuple(fc.constant(number()), fc_types.number())));
Deno.test('coder({ "type": "string" }) : arbitrary round-trip', () => {
  test(fc.tuple(fc.constant(string()), fc_types.string()));
  test(fc_format.chain((format) =>
    fc.tuple(
      fc.constant(string().format(format)),
      fc_formats[format],
    )
  ));
});
Deno.test('coder({ "type": "array" }) : arbitrary round-trip', () => {
  test(fc.tuple(fc.constant(array()), fc_types.array()));
  test(fc_format.chain((format) =>
    fc.tuple(
      fc.constant(array().items(string().format(format))),
      fc.array(fc_formats[format]),
    )
  ));
  test(fc_base.chain((base) =>
    fc.tuple(
      fc.constant(array().items(string().contentEncoding(base).minLength(1))),
      fc.array(fc.stringMatching(
        RegExp(`${BASES[base].source.replace("*", "{1,}")}`),
      )),
    )
  ));
  test(
    fc_enum(fc_types.string()).chain(($) =>
      fc.tuple(
        fc.constant(array().items(string().enum($))),
        fc.array(fc.constantFrom(...$)),
      )
    ),
  );
  test(
    fc.constantFrom(...TYPES).chain(($) =>
      fc.tuple(
        fc.constant(array().items(TYPERS[$]() as { type: Type })),
        fc.array(fc_types[$]() as fc.Arbitrary<Json>),
      )
    ),
  );
  test(
    fc.tuple(fc.constantFrom(...TYPES), fc_max).chain(([type, max]) =>
      fc.tuple(
        fc.constant(
          array().items(TYPERS[type]() as { type: Type }).maxItems(max),
        ),
        fc.array(fc_types[type]() as fc.Arbitrary<Json>, { maxLength: max }),
      )
    ),
  );
});
Deno.test('coder({ "type": "object" }) : arbitrary round-trip', () => {
  test(fc.tuple(fc.constant(object()), fc_object(fc_json())));
  test(
    fc.constantFrom(...TYPES).chain(($) =>
      fc.tuple(
        fc.constant(object().properties({ [$]: TYPERS[$]() })),
        fc.record({ [$]: fc_types[$]() }, {
          requiredKeys: [],
        }) as fc.Arbitrary<{ [_: string]: Json }>,
      )
    ),
  );
  test(
    fc.constantFrom(...TYPES).chain(($) =>
      fc.tuple(
        fc.constant(object().properties({ [$]: TYPERS[$]() }).required()),
        fc.record({ [$]: fc_types[$]() }, {
          requiredKeys: [$],
        }) as fc.Arbitrary<{ [_: string]: Json }>,
      )
    ),
  );
});
