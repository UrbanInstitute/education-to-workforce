// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import meta from "$data/archie-ml/meta.aml";
// @ts-ignore
import page from "$archie/page-tool.aml";

// turn on client-side rendering
export const csr = true;
// turn off server-side rendering and prerendering (pre-build)
export const ssr = false;
export const prerender = true;
// add trailing slash
export const trailingSlash = "always";

export const load = async () => {
  return {
    meta,
    nav: {
      allDataText: page.nav.allData,
      aboutText: page.nav.about,
      toolTitle: page.nav.toolTitle,
      downloadLink: page.data_download_link,
      downloadText: page.data_download_text
    }
  };
};
