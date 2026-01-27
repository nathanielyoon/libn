import { bind } from "@libn/json/interpret";
import { Tester } from "./lib.ts";

Deno.test("bind : Opt", () => new Tester(bind).testOpt());
Deno.test("bind : Nil", () => new Tester(bind).testNil());
Deno.test("bind : Bit", () => new Tester(bind).testBit());
Deno.test("bind : Int", () => new Tester(bind).testInt());
Deno.test("bind : Num", () => new Tester(bind).testNum());
Deno.test("bind : Str", () => new Tester(bind).testStr());
Deno.test("bind : Arr", () => new Tester(bind).testArr());
Deno.test("bind : Rec", () => new Tester(bind).testRec());
Deno.test("bind : Obj", () => new Tester(bind).testObj());
