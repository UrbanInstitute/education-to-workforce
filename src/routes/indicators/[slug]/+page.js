// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { SLUG_ENTRIES } from "$utils/consts";

// redirect stub: keep the old paths prerendered for direct hits; the page
// component forwards to the single-page tool client-side (dev-plan §3.1)

/** @type {import('./$types').EntryGenerator} */
export function entries() {
  return SLUG_ENTRIES;
}
