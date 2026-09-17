// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// CSV files compile to arrays of row objects at build time (@rollup/plugin-dsv in
// vite.config.js); this ambient declaration covers direct `*.csv` imports for the
// type checker.
declare module "*.csv" {
  const content: Record<string, string>[];
  export default content;
}
