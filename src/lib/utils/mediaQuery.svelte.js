// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { MediaQuery } from "svelte/reactivity";

export const mobileMediaQuery = new MediaQuery("max-width: 48rem");
export const expandedMobileMediaQuery = new MediaQuery("max-width: 64rem");
// tablet band: too narrow for the full control panel (which returns above 64rem), wide
// enough to spare a gutter for its trigger — the panel column shrinks to a ~100px sticky
// rail beside the tool content instead of stacking above it (mirrored in +page.svelte)
export const gutterMediaQuery = new MediaQuery("(min-width: 33.75rem) and (max-width: 64rem)");
// phone band: the other side of the same 33.75rem split. The map module reshapes here —
// the legend card stops floating at a fixed width and spans the map instead, the map frame
// takes a fixed height, and Mapbox's national fit padding tightens to match (Phase 8).
// A phone column is the only place all three are needed: at ~330px wide the fixed 360px
// card overflows the page, and 60vh strands a correctly-fitted national map in empty ocean.
export const phoneMediaQuery = new MediaQuery("max-width: 33.75rem");
