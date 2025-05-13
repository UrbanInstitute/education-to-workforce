/**
 * Returns the default geoid for a given geoLevel.
 *
 * @param {"states" | "counties" | "tracts" | string} geoLevel - The geographical level.
 * @returns {string} The default geoid.
 */
const defaultGeoid = (geoLevel) => {
  switch (geoLevel) {
    case "states":
      return "01";
    case "counties":
      return "01001";
    case "tracts":
      return "01001020100"; // retrieved manually
    default:
      return "";
  }
};

export default defaultGeoid;
