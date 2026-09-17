// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { urbanColors } from "@urbaninstitute/dataviz-components/utils";

// geography level slug entries
export const SLUG_ENTRIES = [
  { slug: "tracts" },
  { slug: "counties" },
  { slug: "states" },
  { slug: "school-districts" }
];

// BasicDropdown default width
export const DROPDOWN_WIDTH = 213;

// initial essential question / map metric on a fresh visit (no query params):
// EQ 13 "Are students taking the necessary steps to apply to college after high school
// with sufficient counseling support?" and metric 35 "Share of grade 12 students who
// complete the FAFSA by June 30" (settled in the 2026-09-02 design review). The metric
// is only a *requested* default — ToolState falls back to its own initialMetric when 35
// isn't valid for the current EQ/level/geography.
export const DEFAULT_EQ_ID = 13;
export const DEFAULT_METRIC_ID = 35;

// default map bounds for the national view (no geography selected),
// continental US as [west, south, east, north] — same shape as geoidData.bbox
export const DEFAULT_US_BBOX = [-125.0, 24.4, -66.9, 49.4];

// overall year extent of the published dataset (min/max of years_available across all
// in_tool metrics in metrics.json). Single-year trend charts use this as their x-domain
// so the lone point sits at its true year instead of centering on a degenerate one-year
// domain (settled 2026-07-15). Update at each data refresh (dev-plan Phase 9).
export const FULL_DATA_YEAR_RANGE = [2013, 2022];

// mapbox basemaps
export const MAPBOX_BASEMAP = "mapbox://styles/urbaninstitute/cm7nhwev5011c01qsd7wtdnv1";

/** @type {Record<string, string>} */
export const MAPBOX_TILESETS = {
  states: "mapbox://urbaninstitute.9pj77bf7",
  counties: "mapbox://urbaninstitute.8nypu5zw",
  tracts: "mapbox://urbaninstitute.d3d336rn",
  tracts_simplified: "mapbox://urbaninstitute.dji1casd",
  school_districts: "mapbox://urbaninstitute.8hf1ufxf"
};

/** @type {Record<string, string>} */
export const MAPBOX_SOURCE_LAYERS = {
  states: "states",
  counties: "counties",
  tracts: "tracts",
  tracts_simplified: "tracts_simplified",
  school_districts: "school_districts"
};

export const COLOR_RANGE = [
  urbanColors.blue_shade_lightest,
  urbanColors.blue_shade_light,
  urbanColors.blue,
  urbanColors.blue_shade_dark,
  urbanColors.blue_shade_darker
];

/**
 * Converts URL-friendly slug to internal canonical identifier
 * @param {string} slug - URL slug (e.g., "school-districts")
 * @returns {string} - Internal identifier (e.g., "school_districts")
 */
export const slugToInternal = (slug) => slug.replace(/-/g, "_");

/**
 * Converts internal identifier to URL-friendly slug
 * @param {string} internal - Internal identifier (e.g., "school_districts")
 * @returns {string} - URL slug (e.g., "school-districts")
 */
export const internalToSlug = (internal) => internal.replace(/_/g, "-");

// fips widths per level — the same widths GeoNames.formatId pads to
/** @type {Object<string, number>} */
const GEOID_LENGTHS = {
  states: 2,
  counties: 5,
  school_districts: 7,
  tracts: 11
};

/**
 * Does this geoid belong to this geography level? Levels have distinct fips widths, so a
 * length check is enough to reject a geoid carried over from another level (a stale URL
 * param, or a level switch with a geography selected).
 * @param {string | null | false | undefined} geoid
 * @param {string} level - internal identifier (e.g., "school_districts")
 * @returns {boolean}
 */
export const geoidMatchesLevel = (geoid, level) =>
  typeof geoid === "string" && geoid.length === GEOID_LENGTHS[level];
