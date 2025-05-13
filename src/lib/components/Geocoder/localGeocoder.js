import createFuzzySearch from "@nozbe/microfuzz";

const localGeocoder = (/** @type {{ features: any; }} */ customData) => {
  /**
   * local geocoder, first comma separates the lines in the result
   * @param {string} query
   * @returns {Array<any>}
   */
  return (query) => {
    const fuzzySearch = createFuzzySearch(customData.features, {
      getText: (item) => [item.properties.title, item.properties.geoid]
    });
    return fuzzySearch(query).map(({item}) => Object.assign({}, item, {place_name: item.properties.title}));
  };
};
export default localGeocoder;
