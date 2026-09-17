// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// ArchieML documents compile to parsed objects at build time (rollup-plugin-archieml
// in vite.config.js); this ambient declaration covers direct `$data/archie-ml/*.aml`
// imports for the type checker.
declare module "*.aml" {
  const content: any;
  export default content;
}
