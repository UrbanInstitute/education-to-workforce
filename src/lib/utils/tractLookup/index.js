import { feature } from "topojson-client";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import state_info from "./state_info.csv";
import county_info from "./county_info.csv";
import { getAbsoluteUrl } from "$utils/urls";

const STATE_NAMES_TO_ID = state_info.reduce((acc, next) => {
  return acc.set(next.name, next.geoid);
}, new Map());

const COUNTY_NAMES_TO_ID = county_info.reduce((acc, next) => {
  const { name, geoid, st_id } = next;
  if (!acc.has(st_id)) {
    acc.set(st_id, new Map());
  }
  acc.get(st_id).set(name, geoid);
  return acc;
}, new Map());

// stores fetched tract boundaries
const tractBoundaryCache = new Map();

function getStateId(stateName) {
  return STATE_NAMES_TO_ID.get(stateName);
}

function getCountyId(countyName, stateId) {
  return COUNTY_NAMES_TO_ID.get(stateId)?.get(countyName);
}

function getCountyFromResult(result) {
  let resultCounty;
  let resultState;
  for (let ctx of result.context) {
    if (ctx.id.includes("region")) {
      resultState = ctx.text;
    }
    // if the region (aka state) is DC, force the county to DC since mapbox doesn't return a district (aka county) for DC
    if (resultState === "District of Columbia") {
      resultCounty = "District of Columbia";
      break;
    }

    // if the region (aka state) is CT, force the county to CT since mapbox uses old counties and not new planning regions
    if (resultState === "Connecticut") {
      resultCounty = "Connecticut";
      break;
    }

    if (ctx.id.includes("district")) {
      resultCounty = ctx.text;
    }
  }
  if (!resultCounty || !resultState) {
    console.error("Could not find county or state in result");
    return;
  }
  const stateId = getStateId(resultState);
  if (!stateId) {
    console.error(`Could not find state ID for ${resultState}`);
    return;
  }
  // if CT, manually force county to "09" since file name is "09_tracts.json"
  const countyId = resultCounty === "Connecticut" ? "09" : getCountyId(resultCounty, stateId);
  if (!countyId) {
    console.error(`Could not find county ID for ${resultCounty}, ${resultState}`);
    return;
  }
  return countyId;
}

async function fetchCountyTracts(countyId) {
  if (!tractBoundaryCache.has(countyId)) {
    const tractsUrl = getAbsoluteUrl(`data/tracts-topo/${countyId}_tracts.json`);
    const response = await fetch(tractsUrl);
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    const geoJson = toGeoJson(data);
    tractBoundaryCache.set(countyId, geoJson);
  }
  return tractBoundaryCache.get(countyId);
}

function toGeoJson(inputTopojson, object = "tracts") {
  /** @type {ReturnType<typeof feature<import("geojson").FeatureCollection>>} */
  return feature(inputTopojson, object);
}

/**
 * @param {number[]} latLon
 * @param {string} countyId
 * @returns {Promise<string | undefined>}
 */
async function getTractFromLocation(latLon, countyId) {
  // get tract boundaries for the county we need
  const tractBounds = await fetchCountyTracts(countyId);
  if (!tractBounds) {
    console.error(`Could not fetch tracts for county ${countyId}`);
    return;
  }
  // loop through the tracts and find one that contains the point
  for (let tract of tractBounds.features) {
    // check if point is inside current tract
    if (booleanPointInPolygon(latLon, tract)) {
      return tract.properties.GEOID;
    }
  }
  console.warn("no tracts found");
  return;
}

/**
 * @param {import("@mapbox/mapbox-gl-geocoder").Result} result
 * @returns {Promise<string | undefined>}
 */
export async function getTractFromResult(result) {
  const county = getCountyFromResult(result);
  if (!county) return;
  return await getTractFromLocation(result.center, county);
}
