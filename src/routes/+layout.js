import meta from "$data/archie-ml/meta.aml";

// turn on client-side rendering
export const csr = true;
// turn off server-side rendering and prerendering (pre-build)
export const ssr = false;
export const prerender = true;
// add trailing slash
export const trailingSlash = "always";

export const load = async () => {
  return {
    meta
  };
};
