// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { queryParameters, ssp } from "sveltekit-search-params";
import { DEFAULT_EQ_ID, DEFAULT_METRIC_ID } from "$utils/consts";

/**
 * v2 query-param schema for the single-page tool (see .agent/docs/v2-dev-plan.md §3.2).
 * Slug-less: the geography level moves from the route param into the `level` query param.
 * No validation here — validation effects live in ToolState so they can consult loaded
 * metadata.
 */
export const constructQueryParams = () => {
  return queryParameters(
    {
      level: ssp.string("states"), // dash-slug: states | counties | school-districts | tracts
      geoid1: ssp.string(""), // "" = national view
      geoid2: false, // comparison geography, optional
      eqid: ssp.number(DEFAULT_EQ_ID),
      // a requested default, not a hard one: ToolState validates it against the current
      // EQ/level/geography and falls back to its own initialMetric when it doesn't apply
      metric: ssp.number(DEFAULT_METRIC_ID),
      timeframe: ssp.string("recent"),
      disagg: ssp.string("none") // "none" or a disaggregate prefix (e.g. "d1")
    },
    {
      pushHistory: false
    }
  );
};

export const buildQueryString = (/** @type {Object<string, *>} */ params) => {
  return (
    Object.keys(params)
      // iterate over keys and filter out any that are false, undefined, or null
      .filter((key) => params[key] !== false && params[key] !== undefined && params[key] !== null)
      // map over the remaining keys and encode them
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      // join with ampersands
      .join("&")
  );
};
