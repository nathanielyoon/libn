/**
 * Vite plugins.
 *
 * @example Inline assets
 * ```ts
 * import { defineConfig } from "rolldown-vite";
 * import { inline } from "@libn/vite";
 *
 * export default defineConfig({
 *   plugins: [inline()],
 * });
 * ```
 *
 * @module vite
 */

import { inline, type Options } from "./src/inline.ts";

export { inline, type Options };
