/** @module process */
import { fail, pass, type Yieldable } from "@libn/result";

/** Creates a self-disposing temporary directory and returns a path builder. */
export const tmp = async (options?: Deno.MakeTempOptions): Promise<
  & (<A extends string>(path: A) => `${string}/${A}`)
  & { directory: string; [Symbol.asyncDispose]: () => Promise<void> }
> => {
  const directory = await Deno.makeTempDir(options);
  return Object.assign(
    <A extends string>(path: A) => `${directory}/${path}` as const,
    {
      directory,
      [Symbol.asyncDispose]: () => Deno.remove(directory, { recursive: true }),
    },
  );
};
/** @internal */
export type Output = Yieldable<
  { code: number; stderr: Uint8Array<ArrayBuffer> },
  Uint8Array<ArrayBuffer>
>;
const result = ($: Deno.CommandOutput) =>
  $.success ? pass($.stdout) : fail({ code: $.code, stderr: $.stderr });
/** Directly calls a command. */
export const run = async (
  command: string | URL,
  args: string[],
  options?: Omit<Deno.CommandOptions, "args">,
): Promise<Output> =>
  result(await new Deno.Command(command, { args, ...options }).output());
/** Spawns a command and pipes in stdin. */
export const spawn = async (
  command: string | URL,
  stdin: Uint8Array,
  options?: Omit<Deno.CommandOptions, `std${"in" | "out" | "err"}`>,
): Promise<Output> => {
  const process = new Deno.Command(command, {
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
    ...options,
  }).spawn();
  const writer = process.stdin.getWriter();
  await writer.ready, await writer.write(stdin);
  writer.releaseLock(), await process.stdin.close();
  return result(await process.output());
};
