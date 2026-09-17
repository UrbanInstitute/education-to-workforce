// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { base } from "$app/paths";
import getStateName from "$utils/getStateName";

/**
 * Sub-state shards, whose records arrive with a bare local name ("Denver County") and need
 * the parent-state fips and composed display names added.
 */
const DECORATED_CATEGORIES = ["counties", "tracts", "school_districts"];

/**
 * Payloads that are a geoid-keyed lookup, so a key the caller asked for and didn't get means
 * the id doesn't exist at that level. Separate from DECORATED_CATEGORIES because states are
 * geoid-keyed but must NOT be decorated: their records already carry a full display name
 * ("Colorado"), and running the decoration over them would produce "Colorado, Colorado".
 */
const GEOID_KEYED_CATEGORIES = [...DECORATED_CATEGORIES, "states"];

/**
 * The tool was asked for a geography that doesn't exist — a mistyped, retired, or wrong-level
 * geoid in a deep link. Distinct from a plain Error because it isn't a failure: the requested
 * URL is one the data never promised, so ToolState drops the selection and falls back to the
 * default view rather than raising the error banner (settled 2026-08-17). Real failures — a
 * transport error, a non-404 status, malformed JSON, or a missing universal file — stay plain
 * Errors and still surface.
 */
export class UnknownGeographyError extends Error {
  name = "UnknownGeographyError";
}

/**
 * Paths composed entirely from the requested geoid: the sub-state geography shards, whose
 * filename comes from the geoid's state/county prefix, and the sub-state context shards. A
 * 404 on one of these describes the geoid, not the deploy. states.json and context/states.json
 * are single universal files whose absence is a real failure, and a map shard's absence is a
 * metric problem (the A12 failure mode) — none of those belong here.
 * @param {string} category
 * @param {string} value
 * @returns {boolean}
 */
const isGeoidDerivedPath = (category, value) =>
  DECORATED_CATEGORIES.includes(category) || (category === "context" && value !== "states");

/**
 * Failure message for a fetch that 404'd or returned a payload missing the requested key.
 * Callers render these inline (ToolState.error) or, for an UnknownGeographyError, log them
 * while dropping the selection; nothing alert()s.
 * @param {string} category
 * @param {string} value
 * @param {number | string | null | undefined} secondaryValue
 * @returns {string}
 */
const errorMessage = (category, value, secondaryValue) => {
  // not GEOID_KEYED_CATEGORIES: states.json is one universal file, so a 404 on it means the
  // file is missing, not that the id has no shard
  if (DECORATED_CATEGORIES.includes(category)) {
    return `No ${category} file matches the id: ${value}. Please use the geography selector(s) to choose a valid geography.`;
  }
  if (category === "map") {
    return `No map file matches the metric id: ${secondaryValue} for ${value}. Please use the metric selector to select a new one.`;
  }
  return `Failed to load ${category} data for ${value}${secondaryValue ? ` (${secondaryValue})` : ""}.`;
};

/**
 * Decorate a geography shard in place with the parent state fips and display names.
 * Tracts read their county name from `c_name`; counties and school districts don't have one.
 * @param {string} category
 * @param {Object<string, *>} data - shard keyed by geoid
 */
const addGeographyNames = (category, data) => {
  Object.keys(data).forEach((geoid) => {
    const d = data[geoid];
    d.init_name = d.name;
    d.s_id = geoid.substring(0, 2);
    const prefix = category === "tracts" ? `Tract ${d.init_name} - ${d.c_name}` : d.init_name;
    d.name = `${prefix}, ${getStateName(d.s_id, "full")}`;
    d.short_name = `${prefix}, ${getStateName(d.s_id, "abbr")}`;
  });
};

/**
 * Geoid-keyed payloads are shared by every geography in the same state/county (and, for
 * states, by the whole country), so a missing key means the requested id doesn't exist at
 * this level. Checked per call rather than per fetch: on a warm cache a stale deep link
 * would otherwise resolve `undefined` and leave the page with no message.
 *
 * Reaching this with a bad state fips used to render a tool with "0 metrics" everywhere and
 * no explanation, because states were the one geoid-keyed level the check skipped.
 * @param {string} category
 * @param {string} value
 * @param {Object<string, *> | undefined} data
 */
const assertGeoidPresent = (category, value, data) => {
  if (!GEOID_KEYED_CATEGORIES.includes(category)) return;
  if (!data || !Object.hasOwn(data, value)) {
    throw new UnknownGeographyError(
      `${value} not found in ${category} dataset. Please use the geography selector(s) to choose a valid geography.`
    );
  }
};

class CacheMapClass {
  /**
   * path → in-flight or settled fetch promise. Promises (not resolved values) are cached so
   * concurrent callers for the same multi-MB shard share one request; rejected entries are
   * evicted so a transient failure doesn't poison the path forever.
   * @type {Map<string, Promise<*>>}
   */
  cacheMap = new Map();

  /**
   * Fetches data path on the geographic level and ID.
   * @param {string} category - "states" | "statesFile" | "counties" | "tracts" | "school_districts" | "map" | "metadata" | "context" | "autocomplete"
   * @param {string} value - The ID of the geography (FIPS code), or the geo level for autocomplete
   * @param {number | string | null} secondaryValue - The secondary value (used for map ID)
   */
  getPath(category, value, secondaryValue = null) {
    switch (category) {
      case "autocomplete":
        return `${base}/data/autocomplete/${value}.json`;
      // Two categories, one file (56 records: 50 states + DC + 5 territories). "states"
      // asks for one state's record and is geoid-checked like any other level; "statesFile"
      // asks for the whole lookup, which ToolState needs for the cards' parent-state
      // reference rows and which no geoid describes. Same path either way, so the promise
      // cache still makes a states-level page load one request, not two.
      case "states":
      case "statesFile":
        return `${base}/data/metrics/states.json`;
      case "map":
        return `${base}/data/map/${value}/map_${value}_m${secondaryValue}.json`;
      case "counties":
        return `${base}/data/metrics/counties/counties_${value.substring(0, 2)}.json`;
      case "tracts":
        return `${base}/data/metrics/tracts/tracts_${value.substring(0, 5)}.json`;
      case "school_districts":
        return `${base}/data/metrics/school_districts/school_districts_${value.substring(0, 2)}.json`;
      case "metadata":
        return `${base}/data/metadata/${value}.json`;
      case "context":
        if (value == "states") {
          return `${base}/data/context/${value}.json`;
        }
        // secondaryValue is the geoid here; callers guard against it being empty
        return `${base}/data/context/${value}/${String(secondaryValue).substring(0, 2)}.json`;
      default:
        return null;
    }
  }

  /**
   * Fetches data (and caches) on the geographic level and ID. Throws on any failure — the
   * caller decides how to surface it (ToolState renders `error` inline; the geocoder falls
   * back to a disabled input).
   * @param {string} category - see getPath
   * @param {string | null} value - The ID of the geography (FIPS code), or the geo level for autocomplete
   * @param {number | string | null | undefined} [secondaryValue = undefined] - The ID of the metric (for "map"), or the geoid (for "context")
   */
  async fetchData(category, value, secondaryValue = undefined) {
    if (!value) return;
    // get path to file based on geoId
    const path = this.getPath(category, value, secondaryValue);
    if (!path) {
      throw new Error(`Unknown data category: ${category}`);
    }

    let pending = this.cacheMap.get(path);
    if (!pending) {
      pending = this.#load(path, category, value, secondaryValue);
      this.cacheMap.set(path, pending);
      // evict the failure so a retry can succeed; the handler also keeps the rejection
      // from surfacing as unhandled when this call is the only awaiter
      pending.catch(() => {
        if (this.cacheMap.get(path) === pending) this.cacheMap.delete(path);
      });
    }

    const data = await pending;
    assertGeoidPresent(category, value, data);
    return data;
  }

  /**
   * One network round-trip per path. Runs exactly once per cached entry, so the in-place
   * geography decoration can't be applied twice to the same shard.
   * @param {string} path
   * @param {string} category
   * @param {string} value
   * @param {number | string | null | undefined} secondaryValue
   * @returns {Promise<*>}
   */
  async #load(path, category, value, secondaryValue) {
    const res = await fetch(path);
    if (!res.ok) {
      const message = errorMessage(category, value, secondaryValue);
      // 404 specifically: a 5xx on a valid geography's shard is an outage, and silently
      // dropping the selection there would hide it
      throw res.status === 404 && isGeoidDerivedPath(category, value)
        ? new UnknownGeographyError(message)
        : new Error(message);
    }

    const data = await res.json();
    if (DECORATED_CATEGORIES.includes(category)) {
      addGeographyNames(category, data);
    }
    return data;
  }
}
const cacheMap = new CacheMapClass();
export default cacheMap;
