// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import stateLookupData from "$data/state-lookup.json";

/**
 * Gets the abbreviated or full name of a state based on the provided geoid.
 * @param {string} geoid - The geographic ID of the state.
 * @param {"abbr" | "full"} format - The format of the state name to return ("abbr" for abbreviation, "full" for full name).
 * @returns {string | null} - The state name in the requested format, or null if not found.
 */
function getStateName(geoid, format = "abbr") {
  // @ts-ignore
  const state = stateLookupData[geoid];
  if (!state) {
    return null;
  }
  return format === "abbr" ? state.abbr : state.full;
}

export default getStateName;
