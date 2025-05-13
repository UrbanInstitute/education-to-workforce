import { urbanColors } from "@urbaninstitute/dataviz-components/utils";

// constants for page 1 geocoder initial object
export const INIT_GEOCODER_OBJ = {
  properties: { geoid: "init", title: "init" },
  place_name: "init"
};

// geography level slug entries
export const SLUG_ENTRIES = [{ slug: "tracts" }, { slug: "counties" }, { slug: "states" }];

// BasicDropdown default width
export const DROPDOWN_WIDTH = 213;

// mapbox basemaps
export const MAPBOX_BASEMAP = "mapbox://styles/urbaninstitute/cm7nhwev5011c01qsd7wtdnv1";

export const MAPBOX_TILESETS = {
  states: "mapbox://urbaninstitute.9pj77bf7",
  counties: "mapbox://urbaninstitute.8nypu5zw",
  tracts: "mapbox://urbaninstitute.d3d336rn",
  tracts_simplified: "mapbox://urbaninstitute.dji1casd"
};

export const MAPBOX_SOURCE_LAYERS = {
  states: "states",
  counties: "counties",
  tracts: "tracts",
  tracts_simplified: "tracts_simplified",
};

export const COLOR_RANGE = [
  urbanColors.blue_shade_lightest,
  urbanColors.blue_shade_light,
  urbanColors.blue,
  urbanColors.blue_shade_darker,
  urbanColors.black
];
