import { base } from "$app/paths";
import getStateName from "$utils/getStateName";
import stateMetricData from "$data/metrics/states.json";

class CacheMapClass {
  cacheMap = new Map();

  /**
   * Fetches data path on the geographic level and ID.
   * @param {string} category - The category of data, can be "states" | "counties" | "tracts" | "autocomplete"
   * @param {string} value - The ID of the geography (FIPS code), or the geo level for autocomplete
   * @param {number | string | null} secondaryValue - The secondary value (used for map ID)
   */
  getPath(category, value, secondaryValue = null) {
    switch (category) {
      case "autocomplete":
        return `${base}/data/autocomplete/${value}.json`;
      case "map":
        return `${base}/data/map/${value}/map_${value}_m${secondaryValue}.json`;
      case "counties":
        return `${base}/data/metrics/counties/counties_${value.substring(0, 2)}.json`;
      case "tracts":
        return `${base}/data/metrics/tracts/tracts_${value.substring(0, 5)}.json`;
      case "metadata":
        return `${base}/data/metadata/${value}.json`;
      case "context":
        if (value == "states") {
          return `${base}/data/context/${value}.json`;
        }
        return `${base}/data/context/${value}/${secondaryValue.substring(0, 2)}.json`;
      default:
        return null;
    }
  }

  /**
   * Fetches data (and caches) on the geographic level and ID.
   * @param {string} category - The category of data, can be "states", "counties" or "tracts" or "autocomplete"
   * @param {string | null} value - The ID of the geography (FIPS code), or the geo level for autocomplete
   * @param {number | undefined} [secondaryValue = undefined] - The ID of the metric (only used for "map")
   */
  async fetchData(category, value, secondaryValue = undefined) {
    if (!value) return;
    if (category == "states") {
      return stateMetricData;
    }
    // get path to file based on geoId
    const path = this.getPath(category, value, secondaryValue);

    // if exists in cache, return from cache
    if (this.cacheMap.has(path)) {
      import.meta.env.MODE === "development" && console.log("get data from cache");
      return this.cacheMap.get(path);
    }

    // fetch and store in cache
    if (path) {
      import.meta.env.MODE === "development" && console.log("get data from fetch");
      const res = await fetch(path);

      // if file doesn't exist, throw error
      if (!res.ok) {
        // geography specific error messages
        if (["counties", "tracts"].includes(category)) {
          alert(
            `${window.location.href}\n\nNo ${category} file matches the id: ${value + (secondaryValue ? ` (metric: ${secondaryValue})` : null)}. Please use the geography selector(s) to choose a valid geography.`
          );
        }

        // map specific error message
        if (category === "map") {
          alert(
            `${window.location.href}\n\nNo map file matches the metric id: ${secondaryValue} for ${value}. Please use the metric selector to select a new one.`
          );
        }
      } else {
        let data = await res.json();
        // if object doesn't have the value, throw error
        if (["counties", "tracts"].includes(category) && !data.hasOwnProperty(value)) {
          alert(
            `${window.location.href}\n\n${value} not found in ${category} dataset. Please use the geography selector(s) to choose a valid geography.`
          );
        } else {
          // add names for counties
          if (category === "counties") {
            Object.keys(data).forEach((geoid) => {
              data[geoid].init_name = data[geoid].name;
              data[geoid].s_id = geoid.substring(0, 2);
              data[geoid].name =
                `${data[geoid].init_name}, ${getStateName(data[geoid].s_id, "full")}`;
              data[geoid].short_name =
                `${data[geoid].init_name}, ${getStateName(data[geoid].s_id, "abbr")}`;
            });
            // add names for tracts
          } else if (category === "tracts") {
            Object.keys(data).forEach((geoid) => {
              data[geoid].init_name = data[geoid].name;
              data[geoid].s_id = geoid.substring(0, 2);
              data[geoid].name =
                `Tract ${data[geoid].init_name} - ${data[geoid].c_name}, ${getStateName(data[geoid].s_id, "full")}`;
              data[geoid].short_name =
                `Tract ${data[geoid].init_name} - ${data[geoid].c_name}, ${getStateName(data[geoid].s_id, "abbr")}`;
            });
          }

          // set cache and return
          this.cacheMap.set(path, data);
          return data;
        }
      }
    }
  }
}
const cacheMap = new CacheMapClass();
export default cacheMap;
