import cacheMap from "./cacheMap";

export default class GeoNames {
  geoLookup = new Map();

  /**
   * @param {"states" | "counties" | "tracts"} geoLevel
   */
  constructor(geoLevel) {
    this.geoLevel = geoLevel;
    this.ready = false;
  }

  async fetchData() {
    const lookupData = await cacheMap.fetchData("metadata", this.geoLevel);
    if (lookupData && lookupData.length > 0) {
      for (let item of lookupData) {
        this.geoLookup.set(item.geoid, item.name);
      }
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
      default:
        return id.toString();
    }
  }
  /**
   * @param {number} id
   * @returns {Promise<{geoid: string, name: string}>}
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
