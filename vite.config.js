import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import archieml from "rollup-plugin-archieml";
import dsv from "@rollup/plugin-dsv";

export default defineConfig({
  plugins: [sveltekit(), archieml(), dsv()],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}", "test/**/*.{test,spec}.{js,ts}"]
  }
});
