// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";

// dev-only visual QA harness: never prerendered, and redirects home in a production
// build if reached via the SPA fallback
export const prerender = false;

export function load() {
  if (!import.meta.env.DEV) {
    redirect(307, `${base}/`);
  }
}
