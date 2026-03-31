import { urbanColors } from "@urbaninstitute/dataviz-components/utils";

// constants for page 1 geocoder initial object
export const INIT_GEOCODER_OBJ = {
  properties: { geoid: "init", title: "init" },
  place_name: "init"
};

// geography level slug entries
export const SLUG_ENTRIES = [
  { slug: "tracts" },
  { slug: "counties" },
  { slug: "states" },
  { slug: "school-districts" }
];

// BasicDropdown default width
export const DROPDOWN_WIDTH = 213;

// mapbox basemaps
export const MAPBOX_BASEMAP = "mapbox://styles/urbaninstitute/cm7nhwev5011c01qsd7wtdnv1";

export const MAPBOX_TILESETS = {
  states: "mapbox://urbaninstitute.9pj77bf7",
  counties: "mapbox://urbaninstitute.8nypu5zw",
  tracts: "mapbox://urbaninstitute.d3d336rn",
  tracts_simplified: "mapbox://urbaninstitute.dji1casd",
  school_districts: "mapbox://urbaninstitute.8hf1ufxf"
};

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
  urbanColors.blue_shade_darker,
  urbanColors.black
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
