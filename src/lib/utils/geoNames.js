// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import cacheMap from "./cacheMap";

export default class GeoNames {
  geoLookup = new Map();

  /**
   * @param {"states" | "counties" | "tracts" | "school_districts"} geoLevel
   * @param {{ fetchData: typeof cacheMap.fetchData }} [cache] - injectable for tests
   */
  constructor(geoLevel, cache = cacheMap) {
    this.geoLevel = geoLevel;
    this.ready = false;
    this.cache = cache;
  }

  async fetchData() {
    const lookupData = await this.cache.fetchData("metadata", this.geoLevel);
    // an empty lookup would leave getName() throwing on every map hover, far from the
    // cause — fail here instead, where the caller can render it
    if (!lookupData || lookupData.length === 0) {
      throw new Error(`No geography metadata for ${this.geoLevel}.`);
    }
    for (let item of lookupData) {
      this.geoLookup.set(item.geoid, item.name);
    }
    this.ready = true;
  }

  /**
   * @param {number} id
   * @returns {string}
   */
  formatId(id) {
    switch (this.geoLevel) {
      case "states":
        return id.toString().padStart(2, "0");
      case "counties":
        return id.toString().padStart(5, "0");
      case "tracts":
        return id.toString().padStart(11, "0");
      case "school_districts":
        return id.toString().padStart(7, "0");
      default:
        return id.toString();
    }
  }
  /**
   * Synchronous lookup against the already-loaded metadata; throws if the id is absent.
   * @param {number} id
   * @returns {{geoid: string, name: string}}
   */
  getName(id) {
    const strId = this.formatId(id);
    // check for id in existing lookup data
    if (this.geoLookup.has(strId)) {
      return this.geoLookup.get(strId);
    }
    throw new Error(`GeoName not found for ${id}`);
  }
}
