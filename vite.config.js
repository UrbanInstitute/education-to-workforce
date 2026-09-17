// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import archieml from "rollup-plugin-archieml";
import dsv from "@rollup/plugin-dsv";

export default defineConfig({
  plugins: [sveltekit(), archieml(), dsv()],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}", "test/**/*.{test,spec}.{js,ts}"],
    // compile Svelte for the client in rune-enabled test files so $effect.root etc.
    // are live instead of server no-ops
    testTransformMode: { web: ["**/*.svelte.test.js"] },
    setupFiles: ["./vitest-setup.js"]
  },
  resolve: process.env.VITEST ? { conditions: ["browser"] } : undefined
});
