import adapter from "@sveltejs/adapter-static";

const dev = process.argv.includes("dev");

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: "dist",
      assets: "dist",
      fallback: "index.html",
      precompress: false,
      strict: false
    }),
    alias: {
      "$components/*": "./src/lib/components/*",
      "$data/*": "./src/data/*",
      "$assets/*": "./src/assets/*",
      "$stores/*": "./src/lib/stores/*",
      "$utils/*": "./src/lib/utils/*",
      "$archie/*": "./src/data/archie-ml/*",
      "$icons/*": "./src/lib/components/Icons/*"
    },
    paths: {
      base: dev ? "" : process.env.BASE_PATH,
      relative: false
    }
  }
};

export default config;
