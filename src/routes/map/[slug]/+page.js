// import usaData from "$data/usa.json";
// import stateData from "$data/states.json";
// other metadata stuff about the EQs, indicators, metrics, etc.
import national from "$data/metrics/national.json";
import states from "$data/metrics/states.json";
// @ts-ignore
import page from "$archie/page-3.aml";
// @ts-ignore
import timeframeData from "$archie/timeframe.aml";
import { SLUG_ENTRIES } from "$utils/consts";

import indicators from "$data/metadata/indicators.json";
import metrics from "$data/metadata/metrics.json";
import GeoNames from "$utils/geoNames";

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
  const geoNames = new GeoNames(params.slug);
  // make sure geoNames fetches necessary metadata
  await geoNames.fetchData();
  return {
    national: national["00"],
    states,
    archie: { page, timeframeData },
    slug: params.slug,
    metadata: { indicators, metrics },
    geoNames
  };
}

/** @type {import('./$types').EntryGenerator} */
export function entries() {
  return SLUG_ENTRIES;
}
