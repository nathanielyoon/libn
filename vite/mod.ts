/**
 * Vite plugins.
 *
 * @example Inline assets
 * ```ts
 * import { defineConfig } from "rolldown-vite";
 *
 * export default defineConfig({
 *   plugins: [inline()],
 * });
 * ```
 *
 * @module vite
 */

import { inline, type InlineOptions } from "./src/inline.ts";

export { inline, type InlineOptions };
